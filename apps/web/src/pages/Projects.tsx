import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Client, Project } from "../types";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table } from "../components/ui";

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", clientId: "", hourlyRateCents: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.get<Project[]>("/projects"), api.get<Client[]>("/clients")])
      .then(([p, c]) => {
        setProjects(p);
        setClients(c);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSave() {
    setSaving(true);
    try {
      await api.post("/projects", {
        name: form.name,
        clientId: form.clientId,
        hourlyRateCents: form.hourlyRateCents ? Math.round(Number(form.hourlyRateCents) * 100) : null,
      });
      setModalOpen(false);
      setForm({ name: "", clientId: "", hourlyRateCents: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Projekte"
        actions={
          <Button onClick={() => setModalOpen(true)} disabled={clients.length === 0}>
            + Neues Projekt
          </Button>
        }
      />
      {clients.length === 0 && !loading && (
        <p className="mb-4 text-sm text-amber-600">Lege zuerst einen Kunden an, bevor du ein Projekt erstellst.</p>
      )}
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Projekte angelegt.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Projekt</th>
                <th className="pb-2">Kunde</th>
                <th className="pb-2">Stundensatz</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 font-medium">{p.name}</td>
                  <td className="py-2.5 text-slate-500">{p.client?.name ?? "–"}</td>
                  <td className="py-2.5 text-slate-500">
                    {p.hourlyRateCents != null ? `${(p.hourlyRateCents / 100).toFixed(2)} €/h` : "–"}
                  </td>
                  <td className="py-2.5">
                    <Badge tone={p.isActive ? "green" : "slate"}>{p.isActive ? "Aktiv" : "Inaktiv"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neues Projekt">
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Kunde">
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">– auswählen –</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stundensatz (€)">
            <Input
              type="number"
              value={form.hourlyRateCents}
              onChange={(e) => setForm({ ...form, hourlyRateCents: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={saving || !form.name || !form.clientId}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
