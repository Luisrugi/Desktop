import { useEffect, useState } from "react";
import { api, downloadFile } from "../api/client";
import type { Client, Invoice, Project } from "../types";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, euro, formatDate } from "../components/ui";

const STATUS_TONE: Record<Invoice["status"], "slate" | "green" | "red" | "amber" | "blue"> = {
  DRAFT: "slate",
  SENT: "blue",
  PAID: "green",
  OVERDUE: "red",
  CANCELLED: "slate",
};

const STATUS_LABEL: Record<Invoice["status"], string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
};

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualModal, setManualModal] = useState(false);
  const [genModal, setGenModal] = useState(false);
  const [manualForm, setManualForm] = useState({ clientId: "", description: "", quantity: "1", unitPriceCents: "" });
  const [genForm, setGenForm] = useState({ projectId: "" });
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([api.get<Invoice[]>("/invoices"), api.get<Client[]>("/clients"), api.get<Project[]>("/projects")])
      .then(([i, c, p]) => {
        setInvoices(i);
        setClients(c);
        setProjects(p);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createManual() {
    setError(null);
    try {
      await api.post("/invoices", {
        clientId: manualForm.clientId,
        items: [
          {
            description: manualForm.description,
            quantity: Number(manualForm.quantity),
            unitPriceCents: Math.round(Number(manualForm.unitPriceCents) * 100),
            taxRatePercent: 19,
          },
        ],
      });
      setManualModal(false);
      setManualForm({ clientId: "", description: "", quantity: "1", unitPriceCents: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function generateFromTime() {
    setError(null);
    try {
      await api.post("/invoices/generate-from-time-entries", { projectId: genForm.projectId });
      setGenModal(false);
      setGenForm({ projectId: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function setStatus(id: string, status: Invoice["status"]) {
    await api.patch(`/invoices/${id}/status`, { status });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Rechnungen"
        actions={
          <>
            <Button variant="secondary" onClick={() => setGenModal(true)}>
              Aus Zeiterfassung generieren
            </Button>
            <Button onClick={() => setManualModal(true)}>+ Neue Rechnung</Button>
          </>
        }
      />
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Rechnungen.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Nr.</th>
                <th className="pb-2">Kunde</th>
                <th className="pb-2">Datum</th>
                <th className="pb-2">Fällig</th>
                <th className="pb-2">Betrag</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-2.5 font-medium">{inv.invoiceNumber}</td>
                  <td className="py-2.5">{inv.client?.name}</td>
                  <td className="py-2.5 text-slate-500">{formatDate(inv.issueDate)}</td>
                  <td className="py-2.5 text-slate-500">{formatDate(inv.dueDate)}</td>
                  <td className="py-2.5">{euro(inv.totalGrossCents)}</td>
                  <td className="py-2.5">
                    <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" onClick={() => downloadFile(`/invoices/${inv.id}/pdf`, `${inv.invoiceNumber}.pdf`)}>
                        PDF
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => downloadFile(`/invoices/${inv.id}/xrechnung`, `${inv.invoiceNumber}-xrechnung.xml`)}
                      >
                        XRechnung
                      </Button>
                      {inv.status === "DRAFT" && (
                        <Button variant="ghost" onClick={() => setStatus(inv.id, "SENT")}>
                          Versenden
                        </Button>
                      )}
                      {(inv.status === "SENT" || inv.status === "OVERDUE") && (
                        <Button variant="ghost" onClick={() => setStatus(inv.id, "PAID")}>
                          Als bezahlt markieren
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={manualModal} onClose={() => setManualModal(false)} title="Neue Rechnung">
        <div className="space-y-3">
          <Field label="Kunde">
            <Select value={manualForm.clientId} onChange={(e) => setManualForm({ ...manualForm, clientId: e.target.value })}>
              <option value="">– auswählen –</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Beschreibung">
            <Input value={manualForm.description} onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })} />
          </Field>
          <div className="flex gap-3">
            <Field label="Menge">
              <Input type="number" value={manualForm.quantity} onChange={(e) => setManualForm({ ...manualForm, quantity: e.target.value })} />
            </Field>
            <Field label="Preis (€, netto)">
              <Input
                type="number"
                value={manualForm.unitPriceCents}
                onChange={(e) => setManualForm({ ...manualForm, unitPriceCents: e.target.value })}
              />
            </Field>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setManualModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={createManual} disabled={!manualForm.clientId || !manualForm.description || !manualForm.unitPriceCents}>
              Erstellen
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={genModal} onClose={() => setGenModal(false)} title="Rechnung aus Zeiterfassung generieren">
        <div className="space-y-3">
          <Field label="Projekt">
            <Select value={genForm.projectId} onChange={(e) => setGenForm({ projectId: e.target.value })}>
              <option value="">– auswählen –</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-slate-500">
            Es werden alle noch nicht abgerechneten, abrechenbaren Zeiteinträge dieses Projekts zu einer Rechnung zusammengefasst.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setGenModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={generateFromTime} disabled={!genForm.projectId}>
              Generieren
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
