import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    const rangeStart = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const rangeEnd = to ? new Date(to) : new Date();

    const entries = await prisma.timeEntry.findMany({
      where: {
        user: { companyId: req.auth!.companyId },
        startTime: { gte: rangeStart },
        endTime: { lte: rangeEnd, not: null },
      },
      include: { project: true },
    });

    const byProjectMap = new Map<
      string,
      { projectId: string; projectName: string; minutes: number; billableMinutes: number; revenueCents: number }
    >();

    let totalMinutes = 0;
    let billableMinutes = 0;
    let revenueCents = 0;

    for (const entry of entries) {
      const minutes = entry.durationMinutes ?? 0;
      totalMinutes += minutes;
      const rate = entry.project.hourlyRateCents ?? 0;
      const entryRevenue = entry.billable ? Math.round((minutes / 60) * rate) : 0;
      if (entry.billable) {
        billableMinutes += minutes;
        revenueCents += entryRevenue;
      }

      const bucket = byProjectMap.get(entry.projectId) ?? {
        projectId: entry.projectId,
        projectName: entry.project.name,
        minutes: 0,
        billableMinutes: 0,
        revenueCents: 0,
      };
      bucket.minutes += minutes;
      if (entry.billable) {
        bucket.billableMinutes += minutes;
        bucket.revenueCents += entryRevenue;
      }
      byProjectMap.set(entry.projectId, bucket);
    }

    res.json({
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      totalMinutes,
      billableMinutes,
      revenueCents,
      byProject: Array.from(byProjectMap.values()),
    });
  })
);

// Controlling: revenue vs. purchase cost per month (einfache Deckungsbeitragsrechnung)
reportsRouter.get(
  "/controlling",
  asyncHandler(async (req, res) => {
    const companyId = req.auth!.companyId;

    const invoices = await prisma.invoice.findMany({
      where: { companyId, status: { in: ["SENT", "PAID"] } },
      include: { items: true },
    });
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: { companyId, status: { in: ["OPEN", "PAID"] } },
    });

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const months = new Map<string, { revenueCents: number; costCents: number }>();

    for (const inv of invoices) {
      const key = monthKey(inv.issueDate);
      const net = inv.items.reduce((sum, it) => sum + Math.round(it.quantity * it.unitPriceCents), 0);
      const bucket = months.get(key) ?? { revenueCents: 0, costCents: 0 };
      bucket.revenueCents += net;
      months.set(key, bucket);
    }

    for (const pinv of purchaseInvoices) {
      const key = monthKey(pinv.invoiceDate);
      const bucket = months.get(key) ?? { revenueCents: 0, costCents: 0 };
      bucket.costCents += pinv.totalNetCents;
      months.set(key, bucket);
    }

    const result = Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        revenueCents: v.revenueCents,
        costCents: v.costCents,
        marginCents: v.revenueCents - v.costCents,
      }));

    res.json(result);
  })
);
