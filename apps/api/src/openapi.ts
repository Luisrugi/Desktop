// Minimal OpenAPI description. Expand per-route as the API stabilizes.
// Served at GET /docs (Swagger UI) so third parties can discover the public API.
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "TimeTrack Suite API",
    version: "0.1.0",
    description:
      "REST API für Zeiterfassung, Rechnungswesen, Personalwesen, Einkauf, Buchhaltung und Controlling. Alle Endpunkte (außer /api/auth/register und /api/auth/login) erfordern einen Bearer-Token (JWT) im Authorization-Header.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        summary: "Neue Firma + Admin-Nutzer anlegen",
        security: [],
        responses: { "201": { description: "Created" } },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login, liefert JWT",
        security: [],
        responses: { "200": { description: "OK" } },
      },
    },
    "/clients": { get: { summary: "Kunden auflisten" }, post: { summary: "Kunde anlegen" } },
    "/projects": { get: { summary: "Projekte auflisten" }, post: { summary: "Projekt anlegen" } },
    "/time-entries": { get: { summary: "Zeiteinträge auflisten" }, post: { summary: "Manuellen Zeiteintrag anlegen" } },
    "/time-entries/start": { post: { summary: "Timer starten" } },
    "/invoices": { get: { summary: "Rechnungen auflisten" }, post: { summary: "Rechnung manuell erstellen" } },
    "/invoices/generate-from-time-entries": { post: { summary: "Rechnung aus Zeiteinträgen generieren" } },
    "/invoices/{id}/pdf": { get: { summary: "Rechnung als PDF herunterladen" } },
    "/invoices/{id}/xrechnung": { get: { summary: "Rechnung als XRechnung-XML herunterladen" } },
    "/employees": { get: { summary: "Mitarbeiter auflisten" }, post: { summary: "Mitarbeiter anlegen" } },
    "/absences": { get: { summary: "Abwesenheiten auflisten" }, post: { summary: "Abwesenheit beantragen" } },
    "/suppliers": { get: { summary: "Lieferanten auflisten" } },
    "/articles": { get: { summary: "Artikel auflisten" } },
    "/purchase-orders": { get: { summary: "Bestellungen auflisten" } },
    "/accounting/open-items": { get: { summary: "Offene-Posten-Liste" } },
    "/accounting/journal-entries/export/datev": { get: { summary: "DATEV-Export der Buchungssätze" } },
    "/bank-transactions/import": { post: { summary: "Bank-CSV importieren" } },
    "/payroll/export": { get: { summary: "Lohn-CSV-Export für Steuerberater/DATEV" } },
    "/billing/plans": { get: { summary: "Verfügbare Pakete auflisten" } },
    "/reports/summary": { get: { summary: "Zeiterfassungs-Report" } },
    "/reports/controlling": { get: { summary: "Umsatz/Kosten pro Monat" } },
  },
};
