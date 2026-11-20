import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { badRequest, notFound } from "../utils/httpError";

export const absencesRouter = Router();
absencesRouter.use(requireAuth);

const ABSENCE_TYPES = [
  "URLAUB",
  "KRANK",
  "KIND_KRANK",
  "SONDERURLAUB",
  "UNBEZAHLT",
  "MUTTERSCHUTZ",
  "ELTERNZEIT",
  "BILDUNGSURLAUB",
  "DIENSTREISE",
  "HOMEOFFICE",
] as const;

const createSchema = z.object({
  employeeId: z.string(),
  type: z.enum(ABSENCE_TYPES),
  startDate: z.string(),
  endDate: z.string(),
  halfDay: z.boolean().optional(),
  note: z.string().optional().nullable(),
});

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

absencesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { employeeId, status } = req.query as Record<string, string | undefined>;
    const absences = await prisma.absence.findMany({
      where: {
        employee: { companyId: req.auth!.companyId },
        employeeId: employeeId || undefined,
        status: status as "BEANTRAGT" | "GENEHMIGT" | "ABGELEHNT" | "STORNIERT" | undefined,
      },
      include: { employee: true },
      orderBy: { startDate: "desc" },
    });
    res.json(absences);
  })
);

absencesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, companyId: req.auth!.companyId },
    });
    if (!employee) throw notFound("Employee");

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate < startDate) throw badRequest("endDate must be on or after startDate");

    const existing = await prisma.absence.findMany({
      where: { employeeId: employee.id, status: { in: ["BEANTRAGT", "GENEHMIGT"] } },
    });
    const conflict = existing.find((a) => overlaps(startDate, endDate, a.startDate, a.endDate));
    if (conflict) {
      throw badRequest(
        `Überschneidung mit bestehender Abwesenheit (${conflict.type}, ${conflict.startDate.toISOString().slice(0, 10)} – ${conflict.endDate.toISOString().slice(0, 10)})`
      );
    }

    const absence = await prisma.absence.create({
      data: {
        employeeId: employee.id,
        type: data.type,
        startDate,
        endDate,
        halfDay: data.halfDay ?? false,
        note: data.note ?? null,
      },
    });
    res.status(201).json(absence);
  })
);

const decisionSchema = z.object({ status: z.enum(["GENEHMIGT", "ABGELEHNT"]) });

absencesRouter.patch(
  "/:id/decision",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = decisionSchema.parse(req.body);
    const existing = await prisma.absence.findFirst({
      where: { id: req.params.id, employee: { companyId: req.auth!.companyId } },
    });
    if (!existing) throw notFound("Absence");

    const absence = await prisma.absence.update({
      where: { id: existing.id },
      data: { status: data.status, approvedById: req.auth!.userId },
    });
    res.json(absence);
  })
);

absencesRouter.patch(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const existing = await prisma.absence.findFirst({
      where: { id: req.params.id, employee: { companyId: req.auth!.companyId } },
    });
    if (!existing) throw notFound("Absence");
    const absence = await prisma.absence.update({
      where: { id: existing.id },
      data: { status: "STORNIERT" },
    });
    res.json(absence);
  })
);

// Einfache Resturlaub-Berechnung: Jahresanspruch (fix 30 Tage, konfigurierbar später) - genommene genehmigte Urlaubstage
absencesRouter.get(
  "/balance/:employeeId",
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.employeeId, companyId: req.auth!.companyId },
    });
    if (!employee) throw notFound("Employee");

    const year = Number((req.query.year as string | undefined) ?? new Date().getFullYear());
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const approvedVacation = await prisma.absence.findMany({
      where: {
        employeeId: employee.id,
        type: "URLAUB",
        status: "GENEHMIGT",
        startDate: { gte: yearStart },
        endDate: { lte: yearEnd },
      },
    });

    const takenDays = approvedVacation.reduce((sum, a) => {
      const days = Math.round((a.endDate.getTime() - a.startDate.getTime()) / 86400000) + 1;
      return sum + (a.halfDay ? days * 0.5 : days);
    }, 0);

    const entitlementDays = 30;
    res.json({ year, entitlementDays, takenDays, remainingDays: entitlementDays - takenDays });
  })
);
