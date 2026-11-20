import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Supplier } from "../types";
import { Button, Card, Field, Input, Modal, PageHeader, Table } from "../components/ui";

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", vatId: "" });

  function load() {
    setLoading(true);
    api.get<Supplier[]>("/suppliers").then(setSuppliers).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onSave() {
    await api.post("/suppliers", { name: form.name, email: form.email || null, vatId: form.vatId || null });
    setModalOpen(false);
    setForm({ name: "", email: "", vatId: "" });
    load();
  }

  return (
    <div>
      <PageHeader title="Lieferanten" actions={<Button onClick={() => setModalOpen(true)}>+ Lieferant</Button>} />
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : suppliers.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Lieferanten angelegt.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">E-Mail</th>
                <th className="pb-2">USt-IdNr.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 font-medium">{s.name}</td>
                  <td className="py-2.5 text-slate-500">{s.email ?? "–"}</td>
                  <td className="py-2.5 text-slate-500">{s.vatId ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neuer Lieferant">
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="E-Mail">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="USt-IdNr.">
            <Input value={form.vatId} onChange={(e) => setForm({ ...form, vatId: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={!form.name}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
