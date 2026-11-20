import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { badRequest, notFound } from "../utils/httpError";

export const bankTransactionsRouter = Router();
bankTransactionsRouter.use(requireAuth);

bankTransactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const transactions = await prisma.bankTransaction.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { bookingDate: "desc" },
    });
    res.json(transactions);
  })
);

// Simple CSV import. Expected header: date;amount;counterparty;purpose
// date: YYYY-MM-DD, amount: decimal with '.' or ',' as separator (positive = incoming payment)
const importSchema = z.object({ csvContent: z.string().min(1) });

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw badRequest("CSV has no data rows");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
  const dateIdx = header.indexOf("date");
  const amountIdx = header.indexOf("amount");
  const counterpartyIdx = header.indexOf("counterparty");
  const purposeIdx = header.indexOf("purpose");
  if (dateIdx === -1 || amountIdx === -1) {
    throw badRequest("CSV must contain at least 'date' and 'amount' columns");
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter);
    const amountRaw = cols[amountIdx]?.trim().replace(",", ".") ?? "0";
    return {
      bookingDate: new Date(cols[dateIdx]?.trim()),
      amountCents: Math.round(parseFloat(amountRaw) * 100),
      counterparty: counterpartyIdx >= 0 ? cols[counterpartyIdx]?.trim() ?? null : null,
      purpose: purposeIdx >= 0 ? cols[purposeIdx]?.trim() ?? null : null,
    };
  });
}

bankTransactionsRouter.post(
  "/import",
  asyncHandler(async (req, res) => {
    const data = importSchema.parse(req.body);
    const rows = parseCsv(data.csvContent);
    const importBatchId = randomUUID();

    const created = await prisma.$transaction(
      rows.map((row) =>
        prisma.bankTransaction.create({
          data: { ...row, companyId: req.auth!.companyId, importBatchId },
        })
      )
    );

    res.status(201).json({ importBatchId, count: created.length, transactions: created });
  })
);

// Try to auto-match unmatched incoming transactions against open/sent invoices
// by exact gross amount, optionally confirmed by invoice number appearing in purpose.
bankTransactionsRouter.post(
  "/auto-match",
  asyncHandler(async (req, res) => {
    const companyId = req.auth!.companyId;
    const unmatched = await prisma.bankTransaction.findMany({
      where: { companyId, matched: false, amountCents: { gt: 0 } },
    });
    const openInvoices = await prisma.invoice.findMany({
      where: { companyId, status: { in: ["SENT", "OVERDUE"] } },
      include: { items: true },
    });

    const results: Array<{ transactionId: string; invoiceId: string | null }> = [];

    for (const tx of unmatched) {
      const match = openInvoices.find((inv) => {
        const gross = inv.items.reduce((sum, it) => {
          const net = Math.round(it.quantity * it.unitPriceCents);
          return sum + net + Math.round(net * (it.taxRatePercent / 100));
        }, 0);
        const amountMatches = gross === tx.amountCents;
        const referenceMatches = tx.purpose?.includes(inv.invoiceNumber) ?? false;
        return amountMatches && (referenceMatches || true);
      });

      if (match) {
        await prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { matched: true, matchedInvoiceId: match.id },
        });
        await prisma.invoice.update({ where: { id: match.id }, data: { status: "PAID" } });
        results.push({ transactionId: tx.id, invoiceId: match.id });
      } else {
        results.push({ transactionId: tx.id, invoiceId: null });
      }
    }

    res.json({ matched: results.filter((r) => r.invoiceId).length, results });
  })
);

bankTransactionsRouter.patch(
  "/:id/match",
  asyncHandler(async (req, res) => {
    const schema = z.object({ invoiceId: z.string() });
    const data = schema.parse(req.body);
    const tx = await prisma.bankTransaction.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!tx) throw notFound("Bank transaction");
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, companyId: req.auth!.companyId },
    });
    if (!invoice) throw notFound("Invoice");

    const updated = await prisma.bankTransaction.update({
      where: { id: tx.id },
      data: { matched: true, matchedInvoiceId: invoice.id },
    });
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
    res.json(updated);
  })
);
