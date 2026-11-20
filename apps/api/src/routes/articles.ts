import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { notFound } from "../utils/httpError";

export const articlesRouter = Router();
articlesRouter.use(requireAuth);

const articleSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  unit: z.string().optional(),
  salesPriceCents: z.number().int().optional().nullable(),
  purchasePriceCents: z.number().int().optional().nullable(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  stockQuantity: z.number().optional(),
});

articlesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const articles = await prisma.article.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { name: "asc" },
    });
    res.json(articles);
  })
);

articlesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!article) throw notFound("Article");
    res.json(article);
  })
);

articlesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = articleSchema.parse(req.body);
    const article = await prisma.article.create({
      data: { ...data, companyId: req.auth!.companyId },
    });
    res.status(201).json(article);
  })
);

articlesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = articleSchema.partial().parse(req.body);
    const existing = await prisma.article.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Article");
    const article = await prisma.article.update({ where: { id: existing.id }, data });
    res.json(article);
  })
);

articlesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.article.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Article");
    await prisma.article.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
