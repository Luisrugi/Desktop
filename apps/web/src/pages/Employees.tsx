import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Employee } from "../types";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Table } from "../components/ui";

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    personnelNumber: "",
    firstName: "",
    lastName: "",
    hireDate: new Date().toISOString().slice(0, 10),
    position: "",
    monthlyGrossCents: "",
  });

  function load() {
    setLoading(true);
    api
      .get<Employee[]>("/employees")
      .then(setEmployees)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSave() {
    await api.post("/employees", {
      ...form,
      position: form.position || null,
      monthlyGrossCents: form.monthlyGrossCents ? Math.round(Number(form.monthlyGrossCents) * 100) : null,
    });
    setModalOpen(false);
    load();
  }

  return (
    <div>
      <PageHeader title="Mitarbeiter" actions={<Button onClick={() => setModalOpen(true)}>+ Mitarbeiter</Button>} />
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Mitarbeiter angelegt.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Pers.-Nr.</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Position</th>
                <th className="pb-2">Brutto/Monat</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="py-2.5 font-mono text-xs">{e.personnelNumber}</td>
                  <td className="py-2.5 font-medium">
                    {e.firstName} {e.lastName}
                  </td>
                  <td className="py-2.5 text-slate-500">{e.position ?? "–"}</td>
                  <td className="py-2.5 text-slate-500">
                    {e.monthlyGrossCents != null ? `${(e.monthlyGrossCents / 100).toFixed(2)} €` : "–"}
                  </td>
                  <td className="py-2.5">
                    <Badge tone={e.status === "ACTIVE" ? "green" : "slate"}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neuer Mitarbeiter">
        <div className="space-y-3">
          <Field label="Personalnummer">
            <Input value={form.personnelNumber} onChange={(e) => setForm({ ...form, personnelNumber: e.target.value })} />
          </Field>
          <div className="flex gap-3">
            <Field label="Vorname">
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </Field>
            <Field label="Nachname">
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </Field>
          </div>
          <Field label="Eintrittsdatum">
            <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
          </Field>
          <Field label="Position">
            <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </Field>
          <Field label="Bruttogehalt/Monat (€)">
            <Input
              type="number"
              value={form.monthlyGrossCents}
              onChange={(e) => setForm({ ...form, monthlyGrossCents: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={!form.personnelNumber || !form.firstName || !form.lastName}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
