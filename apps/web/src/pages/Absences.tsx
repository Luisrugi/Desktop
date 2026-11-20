import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Absence, AbsenceType, Employee } from "../types";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, formatDate } from "../components/ui";

const TYPE_LABEL: Record<AbsenceType, string> = {
  URLAUB: "Urlaub",
  KRANK: "Krankheit",
  KIND_KRANK: "Kind krank",
  SONDERURLAUB: "Sonderurlaub",
  UNBEZAHLT: "Unbezahlt",
  MUTTERSCHUTZ: "Mutterschutz",
  ELTERNZEIT: "Elternzeit",
  BILDUNGSURLAUB: "Bildungsurlaub",
  DIENSTREISE: "Dienstreise",
  HOMEOFFICE: "Homeoffice",
};

export function Absences() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    type: "URLAUB" as AbsenceType,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });

  function load() {
    setLoading(true);
    Promise.all([api.get<Absence[]>("/absences"), api.get<Employee[]>("/employees")])
      .then(([a, e]) => {
        setAbsences(a);
        setEmployees(e);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSave() {
    setError(null);
    try {
      await api.post("/absences", form);
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function decide(id: string, status: "GENEHMIGT" | "ABGELEHNT") {
    await api.patch(`/absences/${id}/decision`, { status });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Abwesenheiten"
        actions={
          <Button onClick={() => setModalOpen(true)} disabled={employees.length === 0}>
            + Abwesenheit beantragen
          </Button>
        }
      />
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : absences.length === 0 ? (
          <p className="text-sm text-slate-500">Keine Abwesenheiten erfasst.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Mitarbeiter</th>
                <th className="pb-2">Typ</th>
                <th className="pb-2">Von</th>
                <th className="pb-2">Bis</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {absences.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 font-medium">
                    {a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : "–"}
                  </td>
                  <td className="py-2.5">{TYPE_LABEL[a.type]}</td>
                  <td className="py-2.5 text-slate-500">{formatDate(a.startDate)}</td>
                  <td className="py-2.5 text-slate-500">{formatDate(a.endDate)}</td>
                  <td className="py-2.5">
                    <Badge
                      tone={
                        a.status === "GENEHMIGT" ? "green" : a.status === "ABGELEHNT" ? "red" : a.status === "STORNIERT" ? "slate" : "amber"
                      }
                    >
                      {a.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right">
                    {a.status === "BEANTRAGT" && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" onClick={() => decide(a.id, "GENEHMIGT")}>
                          Genehmigen
                        </Button>
                        <Button variant="ghost" onClick={() => decide(a.id, "ABGELEHNT")}>
                          Ablehnen
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Abwesenheit beantragen">
        <div className="space-y-3">
          <Field label="Mitarbeiter">
            <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">– auswählen –</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Typ">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AbsenceType })}>
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-3">
            <Field label="Von">
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="Bis">
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={!form.employeeId}>
              Beantragen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
