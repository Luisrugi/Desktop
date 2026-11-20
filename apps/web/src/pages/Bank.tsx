import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Badge, Button, Card, PageHeader, Table, euro, formatDate } from "../components/ui";

interface BankTransaction {
  id: string;
  bookingDate: string;
  amountCents: number;
  counterparty: string | null;
  purpose: string | null;
  matched: boolean;
}

export function Bank() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    api.get<BankTransaction[]>("/bank-transactions").then(setTransactions).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onFileSelected(file: File) {
    const text = await file.text();
    await api.post("/bank-transactions/import", { csvContent: text });
    load();
  }

  async function autoMatch() {
    const res = await api.post<{ matched: number }>("/bank-transactions/auto-match");
    alert(`${res.matched} Buchung(en) automatisch zugeordnet.`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Bank"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              CSV importieren
            </Button>
            <Button onClick={autoMatch}>Automatisch abgleichen</Button>
          </>
        }
      />
      <p className="mb-4 text-sm text-slate-500">
        Erwartetes CSV-Format: Spalten <code>date;amount;counterparty;purpose</code> (Semikolon- oder
        Komma-getrennt, Export aus dem Online-Banking als CAMT.053/CSV).
      </p>
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Bankbuchungen importiert.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Datum</th>
                <th className="pb-2">Betrag</th>
                <th className="pb-2">Zahlungspartner</th>
                <th className="pb-2">Verwendungszweck</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5">{formatDate(t.bookingDate)}</td>
                  <td className={`py-2.5 font-medium ${t.amountCents >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {euro(t.amountCents)}
                  </td>
                  <td className="py-2.5">{t.counterparty ?? "–"}</td>
                  <td className="py-2.5 text-slate-500">{t.purpose ?? "–"}</td>
                  <td className="py-2.5">
                    <Badge tone={t.matched ? "green" : "amber"}>{t.matched ? "Zugeordnet" : "Offen"}</Badge>
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
