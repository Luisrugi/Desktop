import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notFound } from "../utils/httpError";

export const purchaseInvoicesRouter = Router();
purchaseInvoicesRouter.use(requireAuth);

const createSchema = z.object({
  supplierId: z.string(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  dueDate: z.string(),
  totalNetCents: z.number().int(),
  totalTaxCents: z.number().int(),
  notes: z.string().optional().nullable(),
});

purchaseInvoicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const invoices = await prisma.purchaseInvoice.findMany({
      where: { companyId: req.auth!.companyId },
      include: { supplier: true },
      orderBy: { invoiceDate: "desc" },
    });
    res.json(invoices);
  })
);

purchaseInvoicesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, companyId: req.auth!.companyId },
    });
    if (!supplier) throw notFound("Supplier");

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        companyId: req.auth!.companyId,
        supplierId: supplier.id,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: new Date(data.dueDate),
        totalNetCents: data.totalNetCents,
        totalTaxCents: data.totalTaxCents,
        totalGrossCents: data.totalNetCents + data.totalTaxCents,
        notes: data.notes ?? null,
      },
    });
    res.status(201).json(invoice);
  })
);

const statusSchema = z.object({ status: z.enum(["OPEN", "PAID", "OVERDUE", "CANCELLED"]) });

purchaseInvoicesRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const data = statusSchema.parse(req.body);
    const existing = await prisma.purchaseInvoice.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Purchase invoice");
    const invoice = await prisma.purchaseInvoice.update({
      where: { id: existing.id },
      data: { status: data.status },
    });
    res.json(invoice);
  })
);

purchaseInvoicesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchaseInvoice.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Purchase invoice");
    await prisma.purchaseInvoice.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
