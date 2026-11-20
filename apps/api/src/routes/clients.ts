import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notFound } from "../utils/httpError";

export const clientsRouter = Router();
clientsRouter.use(requireAuth);

const clientSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  vatId: z.string().optional().nullable(),
  defaultHourlyRateCents: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

clientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clients = await prisma.client.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { name: "asc" },
    });
    res.json(clients);
  })
);

clientsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!client) throw notFound("Client");
    res.json(client);
  })
);

clientsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: { ...data, companyId: req.auth!.companyId },
    });
    res.status(201).json(client);
  })
);

clientsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = clientSchema.partial().parse(req.body);
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Client");
    const client = await prisma.client.update({
      where: { id: existing.id },
      data,
    });
    res.json(client);
  })
);

clientsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Client");
    await prisma.client.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
