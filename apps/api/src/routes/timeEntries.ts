import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { badRequest, notFound } from "../utils/httpError";

export const timeEntriesRouter = Router();
timeEntriesRouter.use(requireAuth);

function diffMinutes(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

timeEntriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { projectId, from, to, running } = req.query as Record<string, string | undefined>;
    const entries = await prisma.timeEntry.findMany({
      where: {
        user: { companyId: req.auth!.companyId },
        userId: req.auth!.role === "ADMIN" ? undefined : req.auth!.userId,
        projectId: projectId || undefined,
        endTime: running === "true" ? null : undefined,
        startTime: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { project: { include: { client: true } } },
      orderBy: { startTime: "desc" },
    });
    res.json(entries);
  })
);

// Start a running timer
timeEntriesRouter.post(
  "/start",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      projectId: z.string(),
      description: z.string().optional().nullable(),
      billable: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const project = await prisma.project.findFirst({
      where: { id: data.projectId, companyId: req.auth!.companyId },
    });
    if (!project) throw notFound("Project");

    const alreadyRunning = await prisma.timeEntry.findFirst({
      where: { userId: req.auth!.userId, endTime: null },
    });
    if (alreadyRunning) {
      throw badRequest("A timer is already running. Stop it before starting a new one.");
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId: req.auth!.userId,
        projectId: data.projectId,
        description: data.description ?? null,
        billable: data.billable ?? true,
        startTime: new Date(),
      },
    });
    res.status(201).json(entry);
  })
);

// Stop a running timer
timeEntriesRouter.post(
  "/:id/stop",
  asyncHandler(async (req, res) => {
    const entry = await prisma.timeEntry.findFirst({
      where: { id: req.params.id, userId: req.auth!.userId },
    });
    if (!entry) throw notFound("Time entry");
    if (entry.endTime) throw badRequest("Time entry already stopped");

    const endTime = new Date();
    const updated = await prisma.timeEntry.update({
      where: { id: entry.id },
      data: { endTime, durationMinutes: diffMinutes(entry.startTime, endTime) },
    });
    res.json(updated);
  })
);

// Manual entry (no running timer)
const manualSchema = z.object({
  projectId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  description: z.string().optional().nullable(),
  billable: z.boolean().optional(),
});

timeEntriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = manualSchema.parse(req.body);
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, companyId: req.auth!.companyId },
    });
    if (!project) throw notFound("Project");

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (endTime <= startTime) throw badRequest("endTime must be after startTime");

    const entry = await prisma.timeEntry.create({
      data: {
        userId: req.auth!.userId,
        projectId: data.projectId,
        description: data.description ?? null,
        billable: data.billable ?? true,
        startTime,
        endTime,
        durationMinutes: diffMinutes(startTime, endTime),
      },
    });
    res.status(201).json(entry);
  })
);

timeEntriesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = manualSchema.partial().parse(req.body);
    const existing = await prisma.timeEntry.findFirst({
      where: { id: req.params.id, userId: req.auth!.userId },
    });
    if (!existing) throw notFound("Time entry");
    if (existing.invoiceItemId) {
      throw badRequest("Cannot edit a time entry that is already invoiced");
    }

    const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;

    const updated = await prisma.timeEntry.update({
      where: { id: existing.id },
      data: {
        projectId: data.projectId ?? existing.projectId,
        description: data.description ?? existing.description,
        billable: data.billable ?? existing.billable,
        startTime,
        endTime,
        durationMinutes: endTime ? diffMinutes(startTime, endTime) : null,
      },
    });
    res.json(updated);
  })
);

timeEntriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.timeEntry.findFirst({
      where: { id: req.params.id, userId: req.auth!.userId },
    });
    if (!existing) throw notFound("Time entry");
    if (existing.invoiceItemId) {
      throw badRequest("Cannot delete a time entry that is already invoiced");
    }
    await prisma.timeEntry.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
