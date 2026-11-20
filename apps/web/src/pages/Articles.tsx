import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Article } from "../types";
import { Button, Card, Field, Input, Modal, PageHeader, Table } from "../components/ui";

export function Articles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", salesPriceCents: "", purchasePriceCents: "" });

  function load() {
    setLoading(true);
    api.get<Article[]>("/articles").then(setArticles).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onSave() {
    await api.post("/articles", {
      sku: form.sku,
      name: form.name,
      salesPriceCents: form.salesPriceCents ? Math.round(Number(form.salesPriceCents) * 100) : null,
      purchasePriceCents: form.purchasePriceCents ? Math.round(Number(form.purchasePriceCents) * 100) : null,
    });
    setModalOpen(false);
    setForm({ sku: "", name: "", salesPriceCents: "", purchasePriceCents: "" });
    load();
  }

  return (
    <div>
      <PageHeader title="Artikel" actions={<Button onClick={() => setModalOpen(true)}>+ Artikel</Button>} />
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Artikel angelegt.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">SKU</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">VK-Preis</th>
                <th className="pb-2">EK-Preis</th>
                <th className="pb-2">Bestand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {articles.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 font-mono text-xs">{a.sku}</td>
                  <td className="py-2.5 font-medium">{a.name}</td>
                  <td className="py-2.5 text-slate-500">{a.salesPriceCents != null ? `${(a.salesPriceCents / 100).toFixed(2)} €` : "–"}</td>
                  <td className="py-2.5 text-slate-500">{a.purchasePriceCents != null ? `${(a.purchasePriceCents / 100).toFixed(2)} €` : "–"}</td>
                  <td className="py-2.5 text-slate-500">
                    {a.stockQuantity} {a.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neuer Artikel">
        <div className="space-y-3">
          <Field label="SKU">
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="flex gap-3">
            <Field label="VK-Preis (€)">
              <Input type="number" value={form.salesPriceCents} onChange={(e) => setForm({ ...form, salesPriceCents: e.target.value })} />
            </Field>
            <Field label="EK-Preis (€)">
              <Input type="number" value={form.purchasePriceCents} onChange={(e) => setForm({ ...form, purchasePriceCents: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={!form.sku || !form.name}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
