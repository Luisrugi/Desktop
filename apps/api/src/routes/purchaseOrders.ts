import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { badRequest, notFound } from "../utils/httpError";

export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(requireAuth);

async function nextOrderNumber(companyId: string) {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({
    where: { companyId, orderNumber: { startsWith: `BE-${year}-` } },
  });
  return `BE-${year}-${String(count + 1).padStart(4, "0")}`;
}

const itemSchema = z.object({
  articleId: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int(),
});

const createSchema = z.object({
  supplierId: z.string(),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

purchaseOrdersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await prisma.purchaseOrder.findMany({
      where: { companyId: req.auth!.companyId },
      include: { items: { include: { article: true } }, supplier: true },
      orderBy: { orderDate: "desc" },
    });
    res.json(orders);
  })
);

purchaseOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
      include: { items: { include: { article: true } }, supplier: true },
    });
    if (!order) throw notFound("Purchase order");
    res.json(order);
  })
);

purchaseOrdersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, companyId: req.auth!.companyId },
    });
    if (!supplier) throw notFound("Supplier");

    const orderNumber = await nextOrderNumber(req.auth!.companyId);
    const order = await prisma.purchaseOrder.create({
      data: {
        companyId: req.auth!.companyId,
        supplierId: supplier.id,
        orderNumber,
        orderDate: new Date(),
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        notes: data.notes ?? null,
        items: { create: data.items },
      },
      include: { items: { include: { article: true } }, supplier: true },
    });
    res.status(201).json(order);
  })
);

const statusSchema = z.object({
  status: z.enum(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]),
});

purchaseOrdersRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const data = statusSchema.parse(req.body);
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
      include: { items: true },
    });
    if (!existing) throw notFound("Purchase order");

    if (data.status === "RECEIVED") {
      await prisma.$transaction(async (tx) => {
        for (const item of existing.items) {
          await tx.article.update({
            where: { id: item.articleId },
            data: { stockQuantity: { increment: item.quantity - item.receivedQty } },
          });
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { receivedQty: item.quantity },
          });
        }
        await tx.purchaseOrder.update({ where: { id: existing.id }, data: { status: "RECEIVED" } });
      });
      return res.json({ ...existing, status: "RECEIVED" });
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: existing.id },
      data: { status: data.status },
    });
    res.json(order);
  })
);

purchaseOrdersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Purchase order");
    if (existing.status === "RECEIVED") {
      throw badRequest("Cannot delete a received purchase order");
    }
    await prisma.purchaseOrder.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
