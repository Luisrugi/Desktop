import PDFDocument from "pdfkit";
import type { Response } from "express";

interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  notes: string | null;
  totalNetCents: number;
  totalTaxCents: number;
  totalGrossCents: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
    taxRatePercent: number;
  }>;
  client: {
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
  };
  company: {
    name: string;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
    taxId: string | null;
    vatId: string | null;
    iban: string | null;
    bic: string | null;
    email: string | null;
  };
}

function euro(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function renderInvoicePdf(res: Response, invoice: InvoicePdfData) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc
    .fontSize(20)
    .text(invoice.company.name, { continued: false })
    .fontSize(10)
    .fillColor("#555")
    .text([invoice.company.addressLine1, [invoice.company.postalCode, invoice.company.city].filter(Boolean).join(" ")].filter(Boolean).join(", "))
    .moveDown(1);

  doc
    .fillColor("#000")
    .fontSize(10)
    .text(invoice.client.name)
    .text(invoice.client.addressLine1 ?? "")
    .text([invoice.client.postalCode, invoice.client.city].filter(Boolean).join(" "))
    .moveDown(2);

  doc.fontSize(16).text(`Rechnung ${invoice.invoiceNumber}`);
  doc
    .fontSize(10)
    .fillColor("#555")
    .text(`Rechnungsdatum: ${invoice.issueDate.toLocaleDateString("de-DE")}`)
    .text(`Fälligkeitsdatum: ${invoice.dueDate.toLocaleDateString("de-DE")}`)
    .moveDown(1);

  const tableTop = doc.y;
  doc.fontSize(10).fillColor("#000");
  doc.text("Beschreibung", 50, tableTop, { width: 230 });
  doc.text("Menge", 290, tableTop, { width: 60, align: "right" });
  doc.text("Preis", 360, tableTop, { width: 80, align: "right" });
  doc.text("USt%", 450, tableTop, { width: 40, align: "right" });
  doc.text("Summe", 490, tableTop, { width: 60, align: "right" });
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor("#ccc").stroke();

  let y = tableTop + 22;
  for (const item of invoice.items) {
    const lineTotal = Math.round(item.quantity * item.unitPriceCents);
    doc.fontSize(9).fillColor("#000");
    doc.text(item.description, 50, y, { width: 230 });
    doc.text(String(item.quantity), 290, y, { width: 60, align: "right" });
    doc.text(euro(item.unitPriceCents), 360, y, { width: 80, align: "right" });
    doc.text(`${item.taxRatePercent}%`, 450, y, { width: 40, align: "right" });
    doc.text(euro(lineTotal), 490, y, { width: 60, align: "right" });
    y += 18;
  }

  y += 10;
  doc.moveTo(350, y).lineTo(550, y).strokeColor("#ccc").stroke();
  y += 8;
  doc.fontSize(10);
  doc.text("Netto", 360, y, { width: 100 });
  doc.text(euro(invoice.totalNetCents), 490, y, { width: 60, align: "right" });
  y += 16;
  doc.text("USt.", 360, y, { width: 100 });
  doc.text(euro(invoice.totalTaxCents), 490, y, { width: 60, align: "right" });
  y += 16;
  doc.fontSize(11).font("Helvetica-Bold");
  doc.text("Gesamt", 360, y, { width: 100 });
  doc.text(euro(invoice.totalGrossCents), 490, y, { width: 60, align: "right" });
  doc.font("Helvetica");

  if (invoice.notes) {
    y += 40;
    doc.fontSize(9).fillColor("#555").text(invoice.notes, 50, y, { width: 500 });
  }

  const bottom = 740;
  doc
    .fontSize(8)
    .fillColor("#777")
    .text(
      [
        invoice.company.taxId ? `Steuernummer: ${invoice.company.taxId}` : null,
        invoice.company.vatId ? `USt-IdNr.: ${invoice.company.vatId}` : null,
        invoice.company.iban ? `IBAN: ${invoice.company.iban}` : null,
        invoice.company.bic ? `BIC: ${invoice.company.bic}` : null,
      ]
        .filter(Boolean)
        .join("   |   "),
      50,
      bottom,
      { width: 500, align: "center" }
    );

  doc.end();
}
