import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { notFound } from "../utils/httpError";

export const employeesRouter = Router();
employeesRouter.use(requireAuth);

const employeeSchema = z.object({
  personnelNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional().nullable(),
  hireDate: z.string(),
  exitDate: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]).optional(),
  monthlyGrossCents: z.number().int().optional().nullable(),
  iban: z.string().optional().nullable(),
  taxIdNumber: z.string().optional().nullable(),
  socialSecurityNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

function toDate(v?: string | null) {
  return v ? new Date(v) : null;
}

employeesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const employees = await prisma.employee.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    res.json(employees);
  })
);

employeesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!employee) throw notFound("Employee");
    res.json(employee);
  })
);

employeesRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = employeeSchema.parse(req.body);
    const employee = await prisma.employee.create({
      data: {
        ...data,
        dateOfBirth: toDate(data.dateOfBirth),
        hireDate: new Date(data.hireDate),
        exitDate: toDate(data.exitDate),
        companyId: req.auth!.companyId,
      },
    });
    res.status(201).json(employee);
  })
);

employeesRouter.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = employeeSchema.partial().parse(req.body);
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Employee");
    const employee = await prisma.employee.update({
      where: { id: existing.id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth !== undefined ? toDate(data.dateOfBirth) : undefined,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
        exitDate: data.exitDate !== undefined ? toDate(data.exitDate) : undefined,
      },
    });
    res.json(employee);
  })
);

employeesRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Employee");
    await prisma.employee.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
