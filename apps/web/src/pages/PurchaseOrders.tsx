import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Article, Supplier } from "../types";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, euro, formatDate } from "../components/ui";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  supplier: Supplier;
  items: Array<{ id: string; quantity: number; unitPriceCents: number; article: Article }>;
}

export function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ supplierId: "", articleId: "", quantity: "1", unitPriceCents: "" });

  function load() {
    setLoading(true);
    Promise.all([
      api.get<PurchaseOrder[]>("/purchase-orders"),
      api.get<Supplier[]>("/suppliers"),
      api.get<Article[]>("/articles"),
    ])
      .then(([o, s, a]) => {
        setOrders(o);
        setSuppliers(s);
        setArticles(a);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onSave() {
    await api.post("/purchase-orders", {
      supplierId: form.supplierId,
      items: [{ articleId: form.articleId, quantity: Number(form.quantity), unitPriceCents: Math.round(Number(form.unitPriceCents) * 100) }],
    });
    setModalOpen(false);
    load();
  }

  async function setStatus(id: string, status: string) {
    await api.patch(`/purchase-orders/${id}/status`, { status });
    load();
  }

  function orderTotal(o: PurchaseOrder) {
    return o.items.reduce((sum, it) => sum + Math.round(it.quantity * it.unitPriceCents), 0);
  }

  return (
    <div>
      <PageHeader
        title="Bestellungen"
        actions={
          <Button onClick={() => setModalOpen(true)} disabled={suppliers.length === 0 || articles.length === 0}>
            + Bestellung
          </Button>
        }
      />
      {(suppliers.length === 0 || articles.length === 0) && !loading && (
        <p className="mb-4 text-sm text-amber-600">Lege zuerst Lieferanten und Artikel an.</p>
      )}
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Bestellungen.</p>
        ) : (
          <Table>
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Nr.</th>
                <th className="pb-2">Lieferant</th>
                <th className="pb-2">Datum</th>
                <th className="pb-2">Summe</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2.5 font-medium">{o.orderNumber}</td>
                  <td className="py-2.5">{o.supplier.name}</td>
                  <td className="py-2.5 text-slate-500">{formatDate(o.orderDate)}</td>
                  <td className="py-2.5">{euro(orderTotal(o))}</td>
                  <td className="py-2.5">
                    <Badge tone={o.status === "RECEIVED" ? "green" : o.status === "CANCELLED" ? "red" : "blue"}>{o.status}</Badge>
                  </td>
                  <td className="py-2.5 text-right">
                    {o.status === "DRAFT" && (
                      <Button variant="ghost" onClick={() => setStatus(o.id, "ORDERED")}>
                        Bestellen
                      </Button>
                    )}
                    {o.status === "ORDERED" && (
                      <Button variant="ghost" onClick={() => setStatus(o.id, "RECEIVED")}>
                        Wareneingang buchen
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neue Bestellung">
        <div className="space-y-3">
          <Field label="Lieferant">
            <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">– auswählen –</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Artikel">
            <Select value={form.articleId} onChange={(e) => setForm({ ...form, articleId: e.target.value })}>
              <option value="">– auswählen –</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-3">
            <Field label="Menge">
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Preis/Stk (€)">
              <Input type="number" value={form.unitPriceCents} onChange={(e) => setForm({ ...form, unitPriceCents: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={!form.supplierId || !form.articleId || !form.unitPriceCents}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
