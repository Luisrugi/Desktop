import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ReportSummary } from "../types";
import { Card, PageHeader, Table, euro } from "../components/ui";

interface ControllingRow {
  month: string;
  revenueCents: number;
  costCents: number;
  marginCents: number;
}

export function Reports() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [controlling, setControlling] = useState<ControllingRow[]>([]);

  useEffect(() => {
    api.get<ReportSummary>("/reports/summary").then(setSummary);
    api.get<ControllingRow[]>("/reports/controlling").then(setControlling).catch(() => setControlling([]));
  }, []);

  return (
    <div>
      <PageHeader title="Reports & Controlling" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500">Zeiterfassung nach Projekt</h3>
          {summary && summary.byProject.length > 0 ? (
            <Table>
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Projekt</th>
                  <th className="pb-2">Stunden</th>
                  <th className="pb-2">Umsatz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.byProject.map((p) => (
                  <tr key={p.projectId}>
                    <td className="py-2">{p.projectName}</td>
                    <td className="py-2">{(p.minutes / 60).toFixed(1)}h</td>
                    <td className="py-2">{euro(p.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Noch keine Daten.</p>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500">Umsatz vs. Kosten je Monat (Controlling)</h3>
          {controlling.length > 0 ? (
            <Table>
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Monat</th>
                  <th className="pb-2">Umsatz</th>
                  <th className="pb-2">Kosten</th>
                  <th className="pb-2">Deckungsbeitrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {controlling.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2">{row.month}</td>
                    <td className="py-2">{euro(row.revenueCents)}</td>
                    <td className="py-2">{euro(row.costCents)}</td>
                    <td className={`py-2 font-medium ${row.marginCents >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {euro(row.marginCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Noch keine Buchungen vorhanden.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
