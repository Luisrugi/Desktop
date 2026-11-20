# Invest-Checker

Ein kleines, lokales Python-Tool, das eine Watchlist aus Aktien/ETFs/Fonds
lädt und daraus einfache, nachvollziehbare Signale berechnet: Trend
(gleitende Durchschnitte), Momentum (RSI), Schwankungsbreite (Volatilität)
sowie – wenn verfügbar – ein paar Kennzahlen (KGV, Dividendenrendite).

## Wichtiger Hinweis

**Das ist keine Anlageberatung.** Die Signale basieren auf simplen,
offen einsehbaren Regeln (z.B. "Kurs über 200-Tage-Durchschnitt" oder
"RSI über 70 = überkauft"). Sie sagen nichts über die Zukunft voraus und
sind kein Kauf- oder Verkaufssignal. Nutze das Tool höchstens als einen
von mehreren Anhaltspunkten für eigene Recherche – nicht als
Entscheidungsgrundlage für Geldanlagen.

## Installation

```bash
pip3 install -r requirements.txt
```

## Watchlist bearbeiten

Trage deine Werte in `watchlist.txt` ein (ein Ticker pro Zeile, Symbol wie
bei Yahoo Finance, z.B. `AAPL`, `SAP.DE`, `VWCE.DE`). Zeilen mit `#` sind
Kommentare.

## Ausführen

```bash
python3 main.py
```

Das Skript lädt die Kursdaten der letzten 12 Monate, zeigt eine Tabelle im
Terminal an und speichert zusätzlich einen Markdown-Report unter
`reports/report_<Datum>_<Zeit>.md`.

## Was wird berechnet?

- **Trend**: Vergleich des aktuellen Kurses mit dem 50- und 200-Tage-
  Durchschnitt. "Aufwärtstrend" = Kurs über beiden Durchschnitten und
  50-Tage über 200-Tage; "Abwärtstrend" = das Gegenteil; sonst "Neutral".
- **RSI (14 Tage)**: klassischer Momentum-Indikator. Werte über 70 werden
  als "überkauft" markiert, unter 30 als "überverkauft" – beides ist ein
  Hinweis auf eine starke kurzfristige Bewegung, keine Kauf-/Verkaufs-
  empfehlung.
- **Volatilität**: annualisierte Standardabweichung der täglichen
  Renditen der letzten 30 Tage – grobes Maß für das Schwankungsrisiko.
- **KGV / Dividendenrendite**: zusätzliche Kennzahlen von Yahoo Finance,
  nur informativ. Diese Felder können wegen Rate-Limits der Yahoo-API
  gelegentlich leer ("-") bleiben – das ist kein Fehler im Skript.

## Regelmäßig automatisch laufen lassen

Lokal (z.B. auf deinem eigenen Rechner/Server) z.B. per Cronjob täglich
um 18 Uhr:

```
0 18 * * * cd /pfad/zum/projekt && python3 main.py >> cron.log 2>&1
```

In dieser Cloud-Session läuft das Skript nur, wenn du es manuell startest
oder über einen geplanten Task (Scheduled Task) in Claude Code auslöst.

## Datenquelle & Grenzen

Kursdaten kommen über die Python-Bibliothek `yfinance` von Yahoo Finance
(kostenlos, ohne API-Key). Die Daten sind nicht für produktiven/
kommerziellen Einsatz gedacht, können leicht verzögert sein und Yahoo
kann den Zugriff jederzeit ändern oder einschränken. Für eine
zuverlässigere/aktuellere Datenbasis müsste man auf eine kostenpflichtige
API (z.B. Twelve Data, Alpha Vantage, IEX) umsteigen.

## Eigene Erweiterungen

Die Logik liegt vollständig in `main.py` (Funktionen `compute_rsi`,
`analyze_ticker`, `build_table`). Eigene Regeln (z.B. andere Zeiträume,
zusätzliche Indikatoren wie MACD oder Bollinger-Bänder) lassen sich dort
ergänzen.
