import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notFound } from "../utils/httpError";

export const employeeDocumentsRouter = Router();
employeeDocumentsRouter.use(requireAuth);

const createSchema = z.object({
  employeeId: z.string(),
  type: z.string().min(1),
  title: z.string().min(1),
  fileUrl: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

employeeDocumentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { employeeId } = req.query as Record<string, string | undefined>;
    const documents = await prisma.employeeDocument.findMany({
      where: {
        employee: { companyId: req.auth!.companyId },
        employeeId: employeeId || undefined,
      },
      include: { employee: true },
      orderBy: { expiryDate: "asc" },
    });
    res.json(documents);
  })
);

// Dokumente, die in den nächsten X Tagen ablaufen (Wiedervorlage/Erinnerung)
employeeDocumentsRouter.get(
  "/expiring",
  asyncHandler(async (req, res) => {
    const days = Number((req.query.days as string | undefined) ?? 30);
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 86400000);

    const documents = await prisma.employeeDocument.findMany({
      where: {
        employee: { companyId: req.auth!.companyId },
        expiryDate: { not: null, gte: now, lte: horizon },
      },
      include: { employee: true },
      orderBy: { expiryDate: "asc" },
    });
    res.json(documents);
  })
);

employeeDocumentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, companyId: req.auth!.companyId },
    });
    if (!employee) throw notFound("Employee");

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: employee.id,
        type: data.type,
        title: data.title,
        fileUrl: data.fileUrl ?? null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });
    res.status(201).json(document);
  })
);

employeeDocumentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.employeeDocument.findFirst({
      where: { id: req.params.id, employee: { companyId: req.auth!.companyId } },
    });
    if (!existing) throw notFound("Employee document");
    await prisma.employeeDocument.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
