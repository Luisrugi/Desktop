import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Plan } from "../types";
import { Badge, Button, Card, PageHeader } from "../components/ui";

interface Subscription {
  id: string;
  status: string;
  plan: Plan;
}

const FEATURE_LABEL: Record<string, string> = {
  "time-tracking": "Zeiterfassung",
  invoicing: "Rechnungen",
  xinvoicing: "E-Invoicing (XRechnung)",
  purchasing: "Einkauf",
  accounting: "Buchhaltung",
  absences: "Abwesenheiten",
  payroll: "Lohnabrechnung",
  controlling: "Controlling",
  "bank-import": "Bank-Import",
};

export function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.get<Plan[]>("/billing/plans"), api.get<Subscription | null>("/billing/subscription")])
      .then(([p, s]) => {
        setPlans(p);
        setSubscription(s);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function subscribe(tier: Plan["tier"]) {
    await api.post("/billing/subscribe", { tier });
    load();
  }

  return (
    <div>
      <PageHeader title="Paket & Abo" />
      {!loading && !subscription && (
        <p className="mb-4 text-sm text-slate-500">
          Du nutzt aktuell alle Funktionen ohne Einschränkung (kein Paket gewählt). Sobald du ein Paket wählst, greifen
          die Limits/Features des jeweiligen Pakets.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const active = subscription?.plan.tier === plan.tier;
          return (
            <Card key={plan.id} className={active ? "ring-2 ring-brand-500" : ""}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {active && <Badge tone="blue">Aktiv</Badge>}
              </div>
              <div className="mb-4 text-2xl font-bold">
                {plan.priceMonthlyCents === 0 ? "Kostenlos" : `${(plan.priceMonthlyCents / 100).toFixed(0)} €`}
                {plan.priceMonthlyCents > 0 && <span className="text-sm font-normal text-slate-500"> /Monat</span>}
              </div>
              <ul className="mb-4 space-y-1.5 text-sm">
                <li className="text-slate-500">bis {plan.maxUsers} Nutzer</li>
                <li className="text-slate-500">bis {plan.maxEmployees} Mitarbeiter</li>
                {plan.features.map((f) => (
                  <li key={f}>✓ {FEATURE_LABEL[f] ?? f}</li>
                ))}
              </ul>
              <Button className="w-full" variant={active ? "secondary" : "primary"} disabled={active} onClick={() => subscribe(plan.tier)}>
                {active ? "Aktuelles Paket" : "Auswählen"}
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-slate-400">
        Zahlungsabwicklung erfolgt aktuell direkt ohne echten Zahlungsanbieter (kein Stripe-Key konfiguriert). Sobald
        einer vorhanden ist, läuft die Auswahl hier über einen echten Checkout.
      </p>
    </div>
  );
}
