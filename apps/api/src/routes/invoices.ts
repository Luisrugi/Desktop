import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { badRequest, notFound } from "../utils/httpError";
import { renderInvoicePdf } from "../pdf/invoicePdf";
import { renderXRechnungXml } from "../xinvoice/xrechnung";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

function computeTotals(items: Array<{ quantity: number; unitPriceCents: number; taxRatePercent: number }>) {
  let totalNetCents = 0;
  let totalTaxCents = 0;
  for (const item of items) {
    const lineNet = Math.round(item.quantity * item.unitPriceCents);
    const lineTax = Math.round(lineNet * (item.taxRatePercent / 100));
    totalNetCents += lineNet;
    totalTaxCents += lineTax;
  }
  return { totalNetCents, totalTaxCents, totalGrossCents: totalNetCents + totalTaxCents };
}

async function nextInvoiceNumber(companyId: string) {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { companyId, invoiceNumber: { startsWith: `RE-${year}-` } },
  });
  return `RE-${year}-${String(count + 1).padStart(4, "0")}`;
}

invoicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { companyId: req.auth!.companyId },
      include: { items: true, client: true },
      orderBy: { issueDate: "desc" },
    });
    res.json(
      invoices.map((inv) => ({ ...inv, ...computeTotals(inv.items) }))
    );
  })
);

invoicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
      include: { items: true, client: true },
    });
    if (!invoice) throw notFound("Invoice");
    res.json({ ...invoice, ...computeTotals(invoice.items) });
  })
);

const manualItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int(),
  taxRatePercent: z.number().min(0).max(100).default(19),
});

const createSchema = z.object({
  clientId: z.string(),
  dueInDays: z.number().int().positive().default(14),
  notes: z.string().optional().nullable(),
  items: z.array(manualItemSchema).min(1),
});

invoicesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, companyId: req.auth!.companyId },
    });
    if (!client) throw notFound("Client");

    const invoiceNumber = await nextInvoiceNumber(req.auth!.companyId);
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + data.dueInDays * 86400000);

    const invoice = await prisma.invoice.create({
      data: {
        companyId: req.auth!.companyId,
        clientId: client.id,
        invoiceNumber,
        issueDate,
        dueDate,
        notes: data.notes ?? null,
        items: { create: data.items },
      },
      include: { items: true, client: true },
    });

    res.status(201).json({ ...invoice, ...computeTotals(invoice.items) });
  })
);

// Generate an invoice from un-invoiced, billable time entries of a project
const fromTimeEntriesSchema = z.object({
  projectId: z.string(),
  dueInDays: z.number().int().positive().default(14),
  notes: z.string().optional().nullable(),
});

invoicesRouter.post(
  "/generate-from-time-entries",
  asyncHandler(async (req, res) => {
    const data = fromTimeEntriesSchema.parse(req.body);

    const project = await prisma.project.findFirst({
      where: { id: data.projectId, companyId: req.auth!.companyId },
      include: { client: true },
    });
    if (!project) throw notFound("Project");

    const entries = await prisma.timeEntry.findMany({
      where: {
        projectId: project.id,
        billable: true,
        invoiceItemId: null,
        endTime: { not: null },
      },
    });
    if (entries.length === 0) {
      throw badRequest("No un-invoiced billable time entries found for this project");
    }

    const rateCents = project.hourlyRateCents ?? project.client.defaultHourlyRateCents ?? 0;
    if (rateCents <= 0) {
      throw badRequest("Project (or client default) has no hourly rate configured");
    }

    const invoiceNumber = await nextInvoiceNumber(req.auth!.companyId);
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + data.dueInDays * 86400000);

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          companyId: req.auth!.companyId,
          clientId: project.clientId,
          invoiceNumber,
          issueDate,
          dueDate,
          notes: data.notes ?? null,
        },
      });

      for (const entry of entries) {
        const hours = (entry.durationMinutes ?? 0) / 60;
        const item = await tx.invoiceItem.create({
          data: {
            invoiceId: created.id,
            description: `${project.name}: ${entry.description ?? "Zeiterfassung"} (${(entry.durationMinutes ?? 0)} Min.)`,
            quantity: Math.round(hours * 100) / 100,
            unitPriceCents: rateCents,
            taxRatePercent: 19,
          },
        });
        await tx.timeEntry.update({
          where: { id: entry.id },
          data: { invoiceItemId: item.id },
        });
      }

      return tx.invoice.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: true, client: true },
      });
    });

    res.status(201).json({ ...invoice, ...computeTotals(invoice.items) });
  })
);

const statusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]),
});

invoicesRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const data = statusSchema.parse(req.body);
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Invoice");
    const invoice = await prisma.invoice.update({
      where: { id: existing.id },
      data: { status: data.status },
    });
    res.json(invoice);
  })
);

invoicesRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
      include: { items: true, client: true, company: true },
    });
    if (!invoice) throw notFound("Invoice");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.invoiceNumber}.pdf"`
    );
    const totals = computeTotals(invoice.items);
    renderInvoicePdf(res, { ...invoice, ...totals });
  })
);

invoicesRouter.get(
  "/:id/xrechnung",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
      include: { items: true, client: true, company: true },
    });
    if (!invoice) throw notFound("Invoice");

    const totals = computeTotals(invoice.items);
    const xml = renderXRechnungXml({ ...invoice, ...totals });

    res.setHeader("Content-Type", "application/xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.invoiceNumber}-xrechnung.xml"`
    );
    res.send(xml);
  })
);

invoicesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Invoice");
    await prisma.timeEntry.updateMany({
      where: { invoiceItem: { invoiceId: existing.id } },
      data: { invoiceItemId: null },
    });
    await prisma.invoice.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);
