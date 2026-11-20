import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ReportSummary } from "../types";
import { Card, PageHeader, euro } from "../components/ui";

interface OpenItems {
  debitors: Array<{ amountCents: number }>;
  creditors: Array<{ amountCents: number }>;
}

export function Dashboard() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [openItems, setOpenItems] = useState<OpenItems | null>(null);

  useEffect(() => {
    api.get<ReportSummary>("/reports/summary").then(setSummary);
    api.get<OpenItems>("/accounting/open-items").then(setOpenItems).catch(() => setOpenItems(null));
  }, []);

  const openDebitSum = openItems?.debitors.reduce((s, d) => s + d.amountCents, 0) ?? 0;

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs uppercase text-slate-400">Erfasste Zeit (Jahr)</div>
          <div className="mt-1 text-2xl font-semibold">
            {summary ? `${Math.floor(summary.totalMinutes / 60)}h ${summary.totalMinutes % 60}min` : "–"}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-400">Abrechenbarer Umsatz (Jahr)</div>
          <div className="mt-1 text-2xl font-semibold">{summary ? euro(summary.revenueCents) : "–"}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-400">Offene Forderungen</div>
          <div className="mt-1 text-2xl font-semibold">{euro(openDebitSum)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-400">Offene Posten (Anzahl)</div>
          <div className="mt-1 text-2xl font-semibold">{openItems ? openItems.debitors.length + openItems.creditors.length : "–"}</div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500">Umsatz nach Projekt</h3>
          {summary && summary.byProject.length > 0 ? (
            <ul className="space-y-2">
              {summary.byProject.map((p) => (
                <li key={p.projectId} className="flex justify-between text-sm">
                  <span>{p.projectName}</span>
                  <span className="font-medium">{euro(p.revenueCents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Noch keine Daten.</p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500">Schnellzugriff</h3>
          <div className="flex flex-col gap-2 text-sm">
            <Link className="text-brand-600 hover:underline" to="/time-tracking">
              → Zeit erfassen
            </Link>
            <Link className="text-brand-600 hover:underline" to="/invoices">
              → Rechnung erstellen
            </Link>
            <Link className="text-brand-600 hover:underline" to="/absences">
              → Abwesenheit beantragen
            </Link>
            <Link className="text-brand-600 hover:underline" to="/accounting">
              → Offene Posten prüfen
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
