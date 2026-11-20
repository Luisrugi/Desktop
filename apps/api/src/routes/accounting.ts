import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { badRequest, notFound } from "../utils/httpError";

export const accountingRouter = Router();
accountingRouter.use(requireAuth);

const accountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
});

accountingRouter.get(
  "/accounts",
  asyncHandler(async (req, res) => {
    const accounts = await prisma.account.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { code: "asc" },
    });
    res.json(accounts);
  })
);

accountingRouter.post(
  "/accounts",
  asyncHandler(async (req, res) => {
    const data = accountSchema.parse(req.body);
    const account = await prisma.account.create({
      data: { ...data, companyId: req.auth!.companyId },
    });
    res.status(201).json(account);
  })
);

accountingRouter.delete(
  "/accounts/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Account");
    await prisma.account.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

const journalEntrySchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  debitAccountId: z.string(),
  creditAccountId: z.string(),
  reference: z.string().optional().nullable(),
});

accountingRouter.get(
  "/journal-entries",
  asyncHandler(async (req, res) => {
    const entries = await prisma.journalEntry.findMany({
      where: { companyId: req.auth!.companyId },
      include: { debitAccount: true, creditAccount: true },
      orderBy: { date: "desc" },
    });
    res.json(entries);
  })
);

accountingRouter.post(
  "/journal-entries",
  asyncHandler(async (req, res) => {
    const data = journalEntrySchema.parse(req.body);
    const [debitAccount, creditAccount] = await Promise.all([
      prisma.account.findFirst({ where: { id: data.debitAccountId, companyId: req.auth!.companyId } }),
      prisma.account.findFirst({ where: { id: data.creditAccountId, companyId: req.auth!.companyId } }),
    ]);
    if (!debitAccount) throw notFound("Debit account");
    if (!creditAccount) throw notFound("Credit account");

    const entry = await prisma.journalEntry.create({
      data: {
        companyId: req.auth!.companyId,
        date: new Date(data.date),
        description: data.description,
        amountCents: data.amountCents,
        debitAccountId: data.debitAccountId,
        creditAccountId: data.creditAccountId,
        reference: data.reference ?? null,
      },
    });
    res.status(201).json(entry);
  })
);

accountingRouter.delete(
  "/journal-entries/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, companyId: req.auth!.companyId },
    });
    if (!existing) throw notFound("Journal entry");
    await prisma.journalEntry.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

function grossCents(items: Array<{ quantity: number; unitPriceCents: number; taxRatePercent: number }>) {
  return items.reduce((sum, it) => {
    const net = Math.round(it.quantity * it.unitPriceCents);
    return sum + net + Math.round(net * (it.taxRatePercent / 100));
  }, 0);
}

// Offene-Posten-Liste: unbezahlte Ausgangsrechnungen (Debitoren) und Eingangsrechnungen (Kreditoren)
accountingRouter.get(
  "/open-items",
  asyncHandler(async (req, res) => {
    const companyId = req.auth!.companyId;
    const now = new Date();

    const debitors = await prisma.invoice.findMany({
      where: { companyId, status: { in: ["SENT", "OVERDUE"] } },
      include: { items: true, client: true },
    });
    const creditors = await prisma.purchaseInvoice.findMany({
      where: { companyId, status: { in: ["OPEN", "OVERDUE"] } },
      include: { supplier: true },
    });

    res.json({
      debitors: debitors.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        dueDate: inv.dueDate,
        amountCents: grossCents(inv.items),
        daysOverdue: Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000)),
        reminderLevel: inv.reminderLevel,
      })),
      creditors: creditors.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        supplierName: inv.supplier.name,
        dueDate: inv.dueDate,
        amountCents: inv.totalGrossCents,
        daysOverdue: Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000)),
      })),
    });
  })
);

// Mahnwesen: überfällige, unbezahlte Rechnungen eine Mahnstufe weiterschalten
accountingRouter.post(
  "/dunning/run",
  asyncHandler(async (req, res) => {
    const companyId = req.auth!.companyId;
    const now = new Date();

    const overdue = await prisma.invoice.findMany({
      where: { companyId, status: { in: ["SENT", "OVERDUE"] }, dueDate: { lt: now } },
    });

    const updated = await Promise.all(
      overdue.map((inv) =>
        prisma.invoice.update({
          where: { id: inv.id },
          data: {
            status: "OVERDUE",
            reminderLevel: Math.min(3, inv.reminderLevel + 1),
            lastReminderAt: now,
          },
        })
      )
    );

    res.json({ remindersSent: updated.length, invoices: updated });
  })
);

// DATEV-ASCII-ähnlicher Export der Buchungssätze (vereinfacht, zur Übergabe an den Steuerberater)
accountingRouter.get(
  "/journal-entries/export/datev",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    if (!from || !to) throw badRequest("from and to query params (YYYY-MM-DD) are required");

    const entries = await prisma.journalEntry.findMany({
      where: {
        companyId: req.auth!.companyId,
        date: { gte: new Date(from), lte: new Date(to) },
      },
      include: { debitAccount: true, creditAccount: true },
      orderBy: { date: "asc" },
    });

    const header =
      "Umsatz;Soll/Haben-Kennzeichen;Konto;Gegenkonto;Belegdatum;Buchungstext;Belegfeld1\n";
    const rows = entries
      .map((e) =>
        [
          (e.amountCents / 100).toFixed(2).replace(".", ","),
          "S",
          e.debitAccount.code,
          e.creditAccount.code,
          e.date.toLocaleDateString("de-DE"),
          e.description.replace(/;/g, ","),
          e.reference ?? "",
        ].join(";")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="datev-export-${from}-${to}.csv"`);
    res.send(header + rows);
  })
);

// Simple Standardkontenrahmen (SKR03-ähnlich, vereinfacht) zum Schnellstart anlegen
accountingRouter.post(
  "/accounts/seed-defaults",
  asyncHandler(async (req, res) => {
    const defaults: Array<{ code: string; name: string; type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" }> = [
      { code: "1200", name: "Bank", type: "ASSET" },
      { code: "1400", name: "Forderungen aus Lieferungen und Leistungen", type: "ASSET" },
      { code: "1600", name: "Verbindlichkeiten aus Lieferungen und Leistungen", type: "LIABILITY" },
      { code: "8400", name: "Erlöse 19% USt.", type: "REVENUE" },
      { code: "3300", name: "Wareneingang 19% Vorsteuer", type: "EXPENSE" },
      { code: "4100", name: "Gehälter", type: "EXPENSE" },
    ];
    const created = await Promise.all(
      defaults.map((acc) =>
        prisma.account.upsert({
          where: { companyId_code: { companyId: req.auth!.companyId, code: acc.code } },
          update: {},
          create: { ...acc, companyId: req.auth!.companyId },
        })
      )
    );
    res.status(201).json(created);
  })
);
