#!/usr/bin/env python3
"""
Invest-Checker: liest eine Watchlist, lädt Kursdaten und zeigt einfache,
regelbasierte Signale (Trend, Momentum, Kennzahlen) pro Position an.

WICHTIG: Das ist KEINE Anlageberatung. Die Signale sind simple, transparente
Regeln (gleitende Durchschnitte, RSI, Kennzahlen) - keine Prognose und keine
Garantie. Jede Investitionsentscheidung triffst du selbst, ggf. nach
Rücksprache mit einer unabhängigen Finanzberatung.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf
from tabulate import tabulate

WATCHLIST_FILE = Path(__file__).parent / "watchlist.txt"
REPORTS_DIR = Path(__file__).parent / "reports"

HISTORY_PERIOD = "1y"
RSI_WINDOW = 14
SMA_SHORT = 50
SMA_LONG = 200


def read_watchlist(path: Path) -> list[str]:
    tickers = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            tickers.append(line)
    return tickers


def compute_rsi(close: pd.Series, window: int = RSI_WINDOW) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / window, min_periods=window).mean()
    avg_loss = loss.ewm(alpha=1 / window, min_periods=window).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)


def pct_change_over(close: pd.Series, days: int) -> float | None:
    if len(close) <= days:
        return None
    return float((close.iloc[-1] / close.iloc[-1 - days] - 1) * 100)


def annualized_volatility(close: pd.Series, days: int = 30) -> float | None:
    returns = close.pct_change().dropna()
    if len(returns) < days:
        return None
    return float(returns.tail(days).std() * np.sqrt(252) * 100)


@dataclass
class PositionReport:
    ticker: str
    name: str
    price: float | None
    chg_1m: float | None
    chg_3m: float | None
    rsi: float | None
    trend_label: str
    hint: str
    volatility: float | None
    pe_ratio: float | None
    dividend_yield: float | None
    error: str | None = None


def analyze_ticker(ticker: str) -> PositionReport:
    try:
        tk = yf.Ticker(ticker)
        hist = tk.history(period=HISTORY_PERIOD, auto_adjust=True)
        if hist.empty:
            return PositionReport(ticker, ticker, None, None, None, None, "-", "-", None, None, None, "keine Kursdaten")

        close = hist["Close"].dropna()
        price = float(close.iloc[-1])

        sma_short = close.rolling(SMA_SHORT).mean().iloc[-1] if len(close) >= SMA_SHORT else None
        sma_long = close.rolling(SMA_LONG).mean().iloc[-1] if len(close) >= SMA_LONG else None
        rsi = compute_rsi(close).iloc[-1]

        trend_score = 0
        if sma_long is not None and not np.isnan(sma_long):
            trend_score += 1 if price > sma_long else 0
        if sma_short is not None and not np.isnan(sma_short):
            trend_score += 1 if price > sma_short else 0
        if sma_short is not None and sma_long is not None and not np.isnan(sma_short) and not np.isnan(sma_long):
            trend_score += 1 if sma_short > sma_long else 0

        if sma_short is None or sma_long is None or np.isnan(sma_short) or np.isnan(sma_long):
            trend_label = "zu wenig Historie"
        elif trend_score >= 3:
            trend_label = "Aufwärtstrend"
        elif trend_score <= 1:
            trend_label = "Abwärtstrend"
        else:
            trend_label = "Neutral/Gemischt"

        hint = ""
        if rsi >= 70:
            hint = "RSI überkauft"
        elif rsi <= 30:
            hint = "RSI überverkauft"

        vol = annualized_volatility(close)

        pe_ratio = None
        dividend_yield = None
        name = ticker
        try:
            info = tk.get_info()
            name = info.get("shortName") or info.get("longName") or ticker
            pe_ratio = info.get("trailingPE")
            dy = info.get("dividendYield")
            # Aktuelle yfinance-Versionen liefern dividendYield bereits als
            # Prozentwert (z.B. 0.79 = 0.79 %), keine Umrechnung nötig.
            dividend_yield = float(dy) if isinstance(dy, (int, float)) else None
        except Exception:
            pass

        return PositionReport(
            ticker=ticker,
            name=name,
            price=price,
            chg_1m=pct_change_over(close, 21),
            chg_3m=pct_change_over(close, 63),
            rsi=float(rsi),
            trend_label=trend_label,
            hint=hint,
            volatility=vol,
            pe_ratio=pe_ratio,
            dividend_yield=dividend_yield,
        )
    except Exception as exc:  # Netzwerk-/Datenfehler einer Position sollen den Lauf nicht abbrechen
        return PositionReport(ticker, ticker, None, None, None, None, "-", "-", None, None, None, str(exc))


def fmt(value: float | None, suffix: str = "", digits: int = 2) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "-"
    return f"{value:.{digits}f}{suffix}"


def build_table(reports: list[PositionReport]) -> str:
    rows = []
    for r in reports:
        if r.error:
            rows.append([r.ticker, "FEHLER", r.error, "", "", "", "", "", "", ""])
            continue
        rows.append([
            r.ticker,
            r.name,
            fmt(r.price),
            fmt(r.chg_1m, "%"),
            fmt(r.chg_3m, "%"),
            fmt(r.rsi, digits=1),
            r.trend_label,
            r.hint,
            fmt(r.volatility, "%", digits=1),
            fmt(r.pe_ratio),
            fmt(r.dividend_yield, "%"),
        ])
    headers = [
        "Ticker", "Name", "Kurs", "1M %", "3M %", "RSI14",
        "Trend", "Hinweis", "Vola p.a.", "KGV", "Div.-Rendite",
    ]
    return tabulate(rows, headers=headers, tablefmt="github")


DISCLAIMER = (
    "Hinweis: Diese Auswertung basiert auf einfachen, transparenten Regeln "
    "(gleitende Durchschnitte, RSI, Kennzahlen) und ist KEINE Anlageberatung. "
    "Sie trifft keine Kauf-/Verkaufsempfehlung und ersetzt keine individuelle "
    "Beratung. Kursdaten können verzögert oder lückenhaft sein."
)


def main() -> None:
    tickers = read_watchlist(WATCHLIST_FILE)
    if not tickers:
        print(f"Keine Ticker in {WATCHLIST_FILE} gefunden.")
        return

    print(f"Lade Daten für {len(tickers)} Positionen ...")
    reports = [analyze_ticker(t) for t in tickers]

    table = build_table(reports)
    timestamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M")

    output = f"# Invest-Checker Report ({timestamp})\n\n{DISCLAIMER}\n\n{table}\n"

    print()
    print(output)

    REPORTS_DIR.mkdir(exist_ok=True)
    report_path = REPORTS_DIR / f"report_{dt.datetime.now().strftime('%Y%m%d_%H%M')}.md"
    report_path.write_text(output, encoding="utf-8")
    print(f"\nReport gespeichert unter: {report_path}")


if __name__ == "__main__":
    main()
