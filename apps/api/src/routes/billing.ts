import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { notFound } from "../utils/httpError";

// Hinweis: Enthält noch keine echte Stripe-Zahlungsabwicklung (kein API-Key vorhanden).
// Struktur ist Stripe-ready: sobald ein Stripe-Key vorhanden ist, ersetzt man
// subscribeDirectly() durch einen echten Checkout-Session-Aufruf + Webhook-Handler.
export const billingRouter = Router();
billingRouter.use(requireAuth);

billingRouter.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const plans = await prisma.plan.findMany({ orderBy: { priceMonthlyCents: "asc" } });
    res.json(plans.map((p) => ({ ...p, features: JSON.parse(p.featuresJson) })));
  })
);

billingRouter.get(
  "/subscription",
  asyncHandler(async (req, res) => {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: req.auth!.companyId },
      include: { plan: true },
    });
    if (!subscription) return res.json(null);
    res.json({ ...subscription, plan: { ...subscription.plan, features: JSON.parse(subscription.plan.featuresJson) } });
  })
);

const subscribeSchema = z.object({ tier: z.enum(["STARTER", "BUSINESS", "ENTERPRISE"]) });

billingRouter.post(
  "/subscribe",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = subscribeSchema.parse(req.body);
    const plan = await prisma.plan.findUnique({ where: { tier: data.tier } });
    if (!plan) throw notFound("Plan");

    // Platzhalter bis echte Stripe-Integration angebunden ist (siehe Hinweis oben).
    const subscription = await prisma.subscription.upsert({
      where: { companyId: req.auth!.companyId },
      update: { planId: plan.id, status: "ACTIVE" },
      create: { companyId: req.auth!.companyId, planId: plan.id, status: "ACTIVE" },
    });
    res.status(201).json(subscription);
  })
);

billingRouter.post(
  "/cancel",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: req.auth!.companyId },
    });
    if (!subscription) throw notFound("Subscription");
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    });
    res.json(updated);
  })
);
