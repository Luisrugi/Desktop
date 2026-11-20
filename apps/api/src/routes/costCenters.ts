import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notFound } from "../utils/httpError";

export const costCentersRouter = Router();
costCentersRouter.use(requireAuth);

const schema = z.object({ code: z.string().min(1), name: z.string().min(1) });

costCentersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const costCenters = await prisma.costCenter.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { code: "asc" },
    });
    res.json(costCenters);
  })
);

costCentersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const costCenter = await prisma.costCenter.create({
      data: { ...data, companyId: req.auth!.companyId },
    });
    res.status(201).json(costCenter);
  })
);

costCentersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.costCenter.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Cost center");
    await prisma.costCenter.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

// Kosten/Ertrag je Kostenstelle für einen Zeitraum
costCentersRouter.get(
  "/:id/report",
  asyncHandler(async (req, res) => {
    const costCenter = await prisma.costCenter.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
      include: { projects: { include: { timeEntries: true } }, employees: true },
    });
    if (!costCenter) throw notFound("Cost center");

    const revenueCents = costCenter.projects.reduce((sum, project) => {
      const rate = project.hourlyRateCents ?? 0;
      const minutes = project.timeEntries
        .filter((e) => e.billable)
        .reduce((m, e) => m + (e.durationMinutes ?? 0), 0);
      return sum + Math.round((minutes / 60) * rate);
    }, 0);

    const payrollCostCents = await prisma.payrollRun.aggregate({
      where: { employeeId: { in: costCenter.employees.map((e) => e.id) } },
      _sum: { grossAmountCents: true, bonusCents: true },
    });

    res.json({
      costCenterId: costCenter.id,
      revenueCents,
      personnelCostCents:
        (payrollCostCents._sum.grossAmountCents ?? 0) + (payrollCostCents._sum.bonusCents ?? 0),
    });
  })
);
