import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { badRequest, notFound } from "../utils/httpError";

// Hinweis: Diese Routen berechnen KEINE Lohnsteuer oder Sozialversicherungsbeiträge.
// Sie erfassen Brutto/Zuschläge/Abzüge als Grundlage für den Export an Steuerberater/DATEV.
export const payrollRouter = Router();
payrollRouter.use(requireAuth);

const runSchema = z.object({
  employeeId: z.string(),
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  grossAmountCents: z.number().int(),
  bonusCents: z.number().int().optional(),
  deductionCents: z.number().int().optional(),
  notes: z.string().optional().nullable(),
});

payrollRouter.get(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { year, month } = req.query as Record<string, string | undefined>;
    const runs = await prisma.payrollRun.findMany({
      where: {
        companyId: req.auth!.companyId,
        periodYear: year ? Number(year) : undefined,
        periodMonth: month ? Number(month) : undefined,
      },
      include: { employee: true },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });
    res.json(runs);
  })
);

payrollRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = runSchema.parse(req.body);
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, companyId: req.auth!.companyId },
    });
    if (!employee) throw notFound("Employee");

    const run = await prisma.payrollRun.create({
      data: {
        companyId: req.auth!.companyId,
        employeeId: employee.id,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        grossAmountCents: data.grossAmountCents,
        bonusCents: data.bonusCents ?? 0,
        deductionCents: data.deductionCents ?? 0,
        notes: data.notes ?? null,
      },
    });
    res.status(201).json(run);
  })
);

// Monatslauf: legt für alle aktiven Mitarbeiter automatisch einen Entwurf an
// basierend auf monthlyGrossCents aus dem Mitarbeiterstamm.
payrollRouter.post(
  "/generate-month",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const schema = z.object({ periodYear: z.number().int(), periodMonth: z.number().int().min(1).max(12) });
    const data = schema.parse(req.body);

    const employees = await prisma.employee.findMany({
      where: { companyId: req.auth!.companyId, status: "ACTIVE" },
    });

    const created = [];
    for (const emp of employees) {
      const existing = await prisma.payrollRun.findUnique({
        where: {
          employeeId_periodYear_periodMonth: {
            employeeId: emp.id,
            periodYear: data.periodYear,
            periodMonth: data.periodMonth,
          },
        },
      });
      if (existing) continue;
      const run = await prisma.payrollRun.create({
        data: {
          companyId: req.auth!.companyId,
          employeeId: emp.id,
          periodYear: data.periodYear,
          periodMonth: data.periodMonth,
          grossAmountCents: emp.monthlyGrossCents ?? 0,
        },
      });
      created.push(run);
    }
    res.status(201).json({ created: created.length, runs: created });
  })
);

const statusSchema = z.object({ status: z.enum(["DRAFT", "FINALIZED", "EXPORTED"]) });

payrollRouter.patch(
  "/:id/status",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = statusSchema.parse(req.body);
    const existing = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Payroll run");
    const run = await prisma.payrollRun.update({ where: { id: existing.id }, data: { status: data.status } });
    res.json(run);
  })
);

// CSV-Export für Steuerberater / DATEV-Lohnimport (vereinfachtes Format)
payrollRouter.get(
  "/export",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { year, month } = req.query as Record<string, string | undefined>;
    if (!year || !month) throw badRequest("year and month query params are required");

    const runs = await prisma.payrollRun.findMany({
      where: {
        companyId: req.auth!.companyId,
        periodYear: Number(year),
        periodMonth: Number(month),
      },
      include: { employee: true },
    });

    const header = "Personalnummer;Name;Bruttogehalt;Zuschlaege;Abzuege;IBAN;SteuerID;Sozialversicherungsnummer\n";
    const rows = runs
      .map((r) =>
        [
          r.employee.personnelNumber,
          `${r.employee.firstName} ${r.employee.lastName}`,
          (r.grossAmountCents / 100).toFixed(2),
          (r.bonusCents / 100).toFixed(2),
          (r.deductionCents / 100).toFixed(2),
          r.employee.iban ?? "",
          r.employee.taxIdNumber ?? "",
          r.employee.socialSecurityNo ?? "",
        ].join(";")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="lohn-export-${year}-${month}.csv"`);
    res.send(header + rows);
  })
);
