// Generates a UBL 2.1 "XRechnung" XML representation of an invoice (EN 16931 subset).
// NOTE: covers the required core fields for a valid structure; validate against the
// official KoSIT validator (https://www.xoev.de/xrechnung) before production use.

interface XRechnungInput {
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
    postalCode: string | null;
    city: string | null;
    country: string | null;
    vatId: string | null;
  };
  company: {
    name: string;
    addressLine1: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    taxId: string | null;
    vatId: string | null;
    iban: string | null;
    email: string | null;
  };
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function renderXRechnungXml(inv: XRechnungInput): string {
  const countryCode = (c: string | null) => (c && c.length === 2 ? c.toUpperCase() : "DE");

  const lines = inv.items
    .map((item, index) => {
      const lineNet = Math.round(item.quantity * item.unitPriceCents);
      return `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="HUR">${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="EUR">${money(lineNet)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${xmlEscape(item.description)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${item.taxRatePercent}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="EUR">${money(item.unitPriceCents)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
    })
    .join("");

  const taxGroups = new Map<number, number>();
  for (const item of inv.items) {
    const net = Math.round(item.quantity * item.unitPriceCents);
    const tax = Math.round(net * (item.taxRatePercent / 100));
    taxGroups.set(item.taxRatePercent, (taxGroups.get(item.taxRatePercent) ?? 0) + tax);
  }
  const taxSubtotals = Array.from(taxGroups.entries())
    .map(
      ([rate, taxCents]) => `
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="EUR">${money(
          inv.items
            .filter((i) => i.taxRatePercent === rate)
            .reduce((sum, i) => sum + Math.round(i.quantity * i.unitPriceCents), 0)
        )}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="EUR">${money(taxCents)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${rate}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(inv.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${isoDate(inv.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${isoDate(inv.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  ${inv.notes ? `<cbc:Note>${xmlEscape(inv.notes)}</cbc:Note>` : ""}

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${xmlEscape(inv.company.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(inv.company.addressLine1 ?? "")}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(inv.company.city ?? "")}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(inv.company.postalCode ?? "")}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${countryCode(inv.company.country)}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${
        inv.company.vatId
          ? `<cac:PartyTaxScheme><cbc:CompanyID>${xmlEscape(inv.company.vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
          : ""
      }
      <cac:Contact>${inv.company.email ? `<cbc:ElectronicMail>${xmlEscape(inv.company.email)}</cbc:ElectronicMail>` : ""}</cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${xmlEscape(inv.client.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(inv.client.addressLine1 ?? "")}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(inv.client.city ?? "")}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(inv.client.postalCode ?? "")}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${countryCode(inv.client.country)}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${
        inv.client.vatId
          ? `<cac:PartyTaxScheme><cbc:CompanyID>${xmlEscape(inv.client.vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
          : ""
      }
    </cac:Party>
  </cac:AccountingCustomerParty>

  ${
    inv.company.iban
      ? `<cac:PaymentMeans>
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount><cbc:ID>${xmlEscape(inv.company.iban)}</cbc:ID></cac:PayeeFinancialAccount>
  </cac:PaymentMeans>`
      : ""
  }

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${money(inv.totalTaxCents)}</cbc:TaxAmount>
    ${taxSubtotals}
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${money(inv.totalNetCents)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${money(inv.totalNetCents)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${money(inv.totalGrossCents)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${money(inv.totalGrossCents)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}
