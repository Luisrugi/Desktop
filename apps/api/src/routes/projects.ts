import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notFound } from "../utils/httpError";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const projectSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  hourlyRateCents: z.number().int().optional().nullable(),
  budgetMinutes: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const projects = await prisma.project.findMany({
      where: { companyId: req.auth!.companyId },
      include: { client: true },
      orderBy: { name: "asc" },
    });
    res.json(projects);
  })
);

projectsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
      include: { client: true },
    });
    if (!project) throw notFound("Project");
    res.json(project);
  })
);

projectsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = projectSchema.parse(req.body);
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, companyId: req.auth!.companyId },
    });
    if (!client) throw notFound("Client");

    const project = await prisma.project.create({
      data: { ...data, companyId: req.auth!.companyId },
    });
    res.status(201).json(project);
  })
);

projectsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = projectSchema.partial().parse(req.body);
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Project");
    const project = await prisma.project.update({
      where: { id: existing.id },
      data,
    });
    res.json(project);
  })
);

projectsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Project");
    await prisma.project.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
