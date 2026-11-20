import { useEffect, useState } from "react";
import { api, downloadFile } from "../api/client";
import type { Employee } from "../types";
import { Badge, Button, Card, PageHeader, Table, euro } from "../components/ui";

interface PayrollRun {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  grossAmountCents: number;
  bonusCents: number;
  deductionCents: number;
  employee: Employee;
}

export function Payroll() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  function load() {
    setLoading(true);
    api
      .get<PayrollRun[]>(`/payroll?year=${year}&month=${month}`)
      .then(setRuns)
      .finally(() => setLoading(false));
  }
  useEffect(load, [year, month]);

  async function generate() {
    await api.post("/payroll/generate-month", { periodYear: year, periodMonth: month });
    load();
  }

  async function finalize(id: string) {
    await api.patch(`/payroll/${id}/status`, { status: "FINALIZED" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Lohn- & Gehaltsabrechnung"
        actions={
          <>
            <Button variant="secondary" onClick={generate}>
              Monatslauf erzeugen
            </Button>
            <Button onClick={() => downloadFile(`/payroll/export?year=${year}&month=${month}`, `lohn-export-${year}-${month}.csv`)}>
              CSV-Export für Steuerberater
            </Button>
          </>
        }
      />
      <p className="mb-4 text-sm text-amber-600">
        Hinweis: Es wird keine Lohnsteuer/Sozialversicherung berechnet – nur Brutto/Zuschläge/Abzüge erfasst und als
        CSV für Steuerberater/DATEV exportiert.
      </p>
      <div className="mb-4 flex gap-3">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-slate-500">Noch kein Abrechnungslauf für diesen Monat.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Mitarbeiter</th>
                <th className="pb-2">Brutto</th>
                <th className="pb-2">Zuschläge</th>
                <th className="pb-2">Abzüge</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 font-medium">
                    {r.employee.firstName} {r.employee.lastName}
                  </td>
                  <td className="py-2.5">{euro(r.grossAmountCents)}</td>
                  <td className="py-2.5">{euro(r.bonusCents)}</td>
                  <td className="py-2.5">{euro(r.deductionCents)}</td>
                  <td className="py-2.5">
                    <Badge tone={r.status === "FINALIZED" ? "green" : "amber"}>{r.status}</Badge>
                  </td>
                  <td className="py-2.5 text-right">
                    {r.status === "DRAFT" && (
                      <Button variant="ghost" onClick={() => finalize(r.id)}>
                        Abschließen
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
