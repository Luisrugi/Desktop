import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Client } from "../types";
import { Button, Card, Field, Input, Modal, PageHeader, Table } from "../components/ui";

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", city: "", defaultHourlyRateCents: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<Client[]>("/clients")
      .then(setClients)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSave() {
    setSaving(true);
    try {
      await api.post("/clients", {
        name: form.name,
        email: form.email || null,
        city: form.city || null,
        defaultHourlyRateCents: form.defaultHourlyRateCents ? Math.round(Number(form.defaultHourlyRateCents) * 100) : null,
      });
      setModalOpen(false);
      setForm({ name: "", email: "", city: "", defaultHourlyRateCents: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Kunde wirklich löschen?")) return;
    await api.delete(`/clients/${id}`);
    load();
  }

  return (
    <div>
      <PageHeader title="Kunden" actions={<Button onClick={() => setModalOpen(true)}>+ Neuer Kunde</Button>} />
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Kunden angelegt.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">E-Mail</th>
                <th className="pb-2">Stadt</th>
                <th className="pb-2">Stundensatz</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-slate-500">{c.email ?? "–"}</td>
                  <td className="py-2.5 text-slate-500">{c.city ?? "–"}</td>
                  <td className="py-2.5 text-slate-500">
                    {c.defaultHourlyRateCents != null ? `${(c.defaultHourlyRateCents / 100).toFixed(2)} €/h` : "–"}
                  </td>
                  <td className="py-2.5 text-right">
                    <Button variant="ghost" onClick={() => onDelete(c.id)}>
                      Löschen
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neuer Kunde">
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="E-Mail">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Stadt">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Standard-Stundensatz (€)">
            <Input
              type="number"
              value={form.defaultHourlyRateCents}
              onChange={(e) => setForm({ ...form, defaultHourlyRateCents: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={saving || !form.name}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
