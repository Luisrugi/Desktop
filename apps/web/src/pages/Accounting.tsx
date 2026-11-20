import { useEffect, useState } from "react";
import { api, downloadFile } from "../api/client";
import { Badge, Button, Card, PageHeader, Table, euro, formatDate } from "../components/ui";

interface OpenItemsResponse {
  debitors: Array<{ id: string; invoiceNumber: string; clientName: string; dueDate: string; amountCents: number; daysOverdue: number; reminderLevel: number }>;
  creditors: Array<{ id: string; invoiceNumber: string; supplierName: string; dueDate: string; amountCents: number; daysOverdue: number }>;
}

export function Accounting() {
  const [openItems, setOpenItems] = useState<OpenItemsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [datevFrom, setDatevFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [datevTo, setDatevTo] = useState(new Date().toISOString().slice(0, 10));

  function load() {
    setLoading(true);
    api
      .get<OpenItemsResponse>("/accounting/open-items")
      .then(setOpenItems)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function runDunning() {
    await api.post("/accounting/dunning/run");
    load();
  }

  async function seedAccounts() {
    await api.post("/accounting/accounts/seed-defaults");
    alert("Standardkonten angelegt.");
  }

  return (
    <div>
      <PageHeader
        title="Buchhaltung"
        actions={
          <>
            <Button variant="secondary" onClick={seedAccounts}>
              Standardkonten anlegen
            </Button>
            <Button variant="secondary" onClick={runDunning}>
              Mahnlauf starten
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500">Offene Forderungen (Debitoren)</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Lädt…</p>
          ) : !openItems || openItems.debitors.length === 0 ? (
            <p className="text-sm text-slate-500">Keine offenen Forderungen.</p>
          ) : (
            <Table>
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Rechnung</th>
                  <th className="pb-2">Kunde</th>
                  <th className="pb-2">Fällig</th>
                  <th className="pb-2">Betrag</th>
                  <th className="pb-2">Mahnstufe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {openItems.debitors.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2">{d.invoiceNumber}</td>
                    <td className="py-2">{d.clientName}</td>
                    <td className="py-2 text-slate-500">{formatDate(d.dueDate)}</td>
                    <td className="py-2">{euro(d.amountCents)}</td>
                    <td className="py-2">
                      {d.reminderLevel > 0 ? <Badge tone="red">Mahnung {d.reminderLevel}</Badge> : <Badge>–</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-500">Offene Verbindlichkeiten (Kreditoren)</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Lädt…</p>
          ) : !openItems || openItems.creditors.length === 0 ? (
            <p className="text-sm text-slate-500">Keine offenen Verbindlichkeiten.</p>
          ) : (
            <Table>
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Rechnung</th>
                  <th className="pb-2">Lieferant</th>
                  <th className="pb-2">Fällig</th>
                  <th className="pb-2">Betrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {openItems.creditors.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2">{c.invoiceNumber}</td>
                    <td className="py-2">{c.supplierName}</td>
                    <td className="py-2 text-slate-500">{formatDate(c.dueDate)}</td>
                    <td className="py-2">{euro(c.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-500">DATEV-Export (Buchungssätze für den Steuerberater)</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Von</label>
            <input type="date" value={datevFrom} onChange={(e) => setDatevFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Bis</label>
            <input type="date" value={datevTo} onChange={(e) => setDatevTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          </div>
          <Button
            onClick={() =>
              downloadFile(
                `/accounting/journal-entries/export/datev?from=${datevFrom}&to=${datevTo}`,
                `datev-export-${datevFrom}-${datevTo}.csv`
              )
            }
          >
            CSV exportieren
          </Button>
        </div>
      </Card>
    </div>
  );
}
