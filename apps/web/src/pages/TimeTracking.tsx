import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Project, TimeEntry } from "../types";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Table } from "../components/ui";

function formatDuration(minutes: number | null) {
  if (minutes == null) return "läuft…";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export function TimeTracking() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState("");
  const [description, setDescription] = useState("");
  const [elapsed, setElapsed] = useState(0);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<TimeEntry[]>("/time-entries"),
      api.get<Project[]>("/projects"),
      api.get<TimeEntry[]>("/time-entries?running=true"),
    ])
      .then(([all, projs, runningEntries]) => {
        setEntries(all);
        setProjects(projs);
        setRunning(runningEntries[0] ?? null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(running.startTime).getTime()) / 60000));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [running]);

  async function startTimer() {
    if (!selectedProject) return;
    await api.post("/time-entries/start", { projectId: selectedProject, description: description || null });
    setDescription("");
    load();
  }

  async function stopTimer() {
    if (!running) return;
    await api.post(`/time-entries/${running.id}/stop`);
    load();
  }

  return (
    <div>
      <PageHeader title="Zeiterfassung" />

      <Card className="mb-6">
        {running ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Läuft seit {new Date(running.startTime).toLocaleTimeString("de-DE")}</div>
              <div className="text-lg font-semibold">{running.project?.name} · {formatDuration(elapsed)}</div>
              {running.description && <div className="text-sm text-slate-500">{running.description}</div>}
            </div>
            <Button variant="danger" onClick={stopTimer}>
              Stoppen
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Field label="Projekt">
                <Select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                  <option value="">– auswählen –</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="min-w-[240px] flex-1">
              <Field label="Beschreibung (optional)">
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>
            <Button onClick={startTimer} disabled={!selectedProject}>
              ▶ Timer starten
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-500">Letzte Einträge</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Datum</th>
                <th className="pb-2">Projekt</th>
                <th className="pb-2">Beschreibung</th>
                <th className="pb-2">Dauer</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="py-2.5">{new Date(e.startTime).toLocaleDateString("de-DE")}</td>
                  <td className="py-2.5 font-medium">{e.project?.name}</td>
                  <td className="py-2.5 text-slate-500">{e.description ?? "–"}</td>
                  <td className="py-2.5">{formatDuration(e.durationMinutes)}</td>
                  <td className="py-2.5">
                    {e.invoiceItemId ? (
                      <Badge tone="blue">Abgerechnet</Badge>
                    ) : e.billable ? (
                      <Badge tone="green">Abrechenbar</Badge>
                    ) : (
                      <Badge>Intern</Badge>
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
