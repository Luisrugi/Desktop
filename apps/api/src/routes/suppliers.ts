import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notFound } from "../utils/httpError";

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);

const supplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  vatId: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

suppliersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { name: "asc" },
    });
    res.json(suppliers);
  })
);

suppliersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!supplier) throw notFound("Supplier");
    res.json(supplier);
  })
);

suppliersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: { ...data, companyId: req.auth!.companyId },
    });
    res.status(201).json(supplier);
  })
);

suppliersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = supplierSchema.partial().parse(req.body);
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Supplier");
    const supplier = await prisma.supplier.update({ where: { id: existing.id }, data });
    res.json(supplier);
  })
);

suppliersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Supplier");
    await prisma.supplier.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
