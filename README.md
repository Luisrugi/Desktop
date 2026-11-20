# TimeTrack Suite

Zeiterfassung, Rechnungswesen (inkl. E-Invoicing/XRechnung), Mitarbeiterstamm,
Abwesenheiten, Materialeinkauf, Buchhaltung, Controlling und Lohnabrechnung —
als eine API mit Web-Oberfläche und Desktop-App (gleiche UI).

> Arbeitstitel. Name kann jederzeit geändert werden (betrifft nur README/UI-Titel,
> keine Datenbank-Inhalte).

## Architektur

```
apps/
  api/      Node.js + TypeScript + Express + Prisma (SQLite) – REST-API, JWT-Auth
  web/      React + Vite + TypeScript + Tailwind – Web-Oberfläche
  desktop/  Tauri-Shell, lädt dieselbe Web-UI als installierbare Desktop-App
packages/
  shared/   Gemeinsame TypeScript-Typen (DTOs)
```

Die API ist die einzige Quelle der Wahrheit. Web und Desktop sind beides
reine Clients derselben REST-API — kein Code ist dupliziert.

## Was ist drin

- **Zeiterfassung**: Timer (Start/Stopp), manuelle Einträge, Projekt-Zuordnung
- **Vertrieb/Rechnungen**: Kunden, Projekte, Rechnungen (manuell oder aus
  Zeiteinträgen generiert), PDF-Export, **XRechnung-XML-Export** (EN 16931/UBL)
- **Mitarbeiterstamm & Personalwesen**: Stammdaten, Personalakte-Dokumente mit
  Ablauf-Erinnerung (Führerschein, Zertifikate, …), Kostenstellen
- **Abwesenheiten**: Urlaub/Krankheit/Sonderurlaub etc. mit Genehmigung,
  Überschneidungsprüfung, Resturlaubs-Berechnung
- **Materialeinkauf**: Lieferanten, Artikel, Bestellungen mit Wareneingang,
  Eingangsrechnungen
- **Buchhaltung/Controlling**: Konten, Buchungssätze, offene-Posten-Liste,
  Mahnwesen, DATEV-CSV-Export, Umsatz/Kosten pro Monat
- **Bankanbindung**: CSV/CAMT.053-Import, automatischer Zahlungsabgleich
- **Lohnabrechnung**: Bruttogehalt/Zuschläge/Abzüge erfassen, CSV-Export für
  Steuerberater/DATEV — **ohne** eigene Lohnsteuer-/SV-Berechnung (siehe unten)
- **Pakete/Abo**: Starter/Business/Enterprise-Pläne mit Feature-Gating,
  Billing-Struktur vorbereitet für echte Zahlungsanbieter-Integration

## Bewusste Grenzen (wichtig zu wissen)

- **Keine Lohnsteuer-/Sozialversicherungsberechnung** und keine direkte
  Anbindung an ELStAM/ELSTER/DEÜV/eAU — diese erfordern eine offizielle
  Software-Zertifizierung bei Finanzamt/ITSG/Krankenkassen (monatelanger,
  rechtlicher Prozess für ein Unternehmen). Stattdessen: korrekte
  CSV/DATEV-Exportformate für Steuerberater oder zertifizierte
  Lohnsoftware/DATEV Lohn.
- **Kein echtes Zahlungsgateway** für die Pakete/Abo-Funktion — die
  Struktur ist Stripe-ready (`Plan`/`Subscription`-Modelle), aber ohne
  API-Key noch ohne echten Checkout.
- **XRechnung-Export** deckt die EN-16931-Pflichtfelder in UBL-Struktur ab,
  wurde aber nicht gegen den offiziellen KoSIT-Validator geprüft — vor
  produktivem Einsatz dort validieren: https://www.xoev.de/xrechnung
- **Konzern-Konsolidierung, parallele HGB/IFRS-Bilanzierung, Fuhrpark-Modul**
  sind nicht enthalten — eigene Spezialsysteme, zurückgestellt.

## Setup

Voraussetzungen: Node.js ≥ 20, pnpm.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter @timetrack/api prisma:generate
pnpm --filter @timetrack/api prisma:migrate
pnpm --filter @timetrack/api db:seed
```

Der Seed legt eine Demo-Firma an: Login `admin@demo-gmbh.de` / `demo1234`.

### API starten

```bash
pnpm dev:api
```

Läuft auf http://localhost:4000. API-Dokumentation (Swagger UI): http://localhost:4000/docs

### Web-App starten

```bash
pnpm dev:web
```

Läuft auf http://localhost:5173 und spricht mit der API unter
`VITE_API_BASE_URL` (siehe `apps/web/.env`).

### Desktop-App (Tauri)

```bash
pnpm --filter @timetrack/desktop dev
```

**Voraussetzung**: Tauri-Systemabhängigkeiten müssen lokal installiert sein
(auf Linux u.a. `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`; auf macOS/Windows
die jeweiligen Tauri-Prerequisites). Siehe https://tauri.app/start/prerequisites/
— das wurde in diesem Cloud-Container nicht getestet, da hier keine
GUI-Systembibliotheken verfügbar sind. Die Konfiguration selbst
(`apps/desktop/src-tauri/tauri.conf.json`) lädt dieselbe Web-UI und ist
bereit für einen lokalen Build (`pnpm --filter @timetrack/desktop build`).

## Produktionshinweise

- **Datenbank**: SQLite ist für lokale Entwicklung/Self-Hosting gedacht.
  Für Mehrbenutzerbetrieb in Produktion: `apps/api/prisma/schema.prisma`
  `datasource.provider` auf `postgresql` umstellen und `DATABASE_URL`
  anpassen (Enums sind hier bewusst als `String` modelliert, da SQLite
  keine nativen Enums unterstützt — funktioniert unverändert mit Postgres).
- **JWT_SECRET**: in Produktion durch einen langen, zufälligen Wert ersetzen.
- **E-Mail-Benachrichtigungen, 2FA, granulare Rollen, öffentliche API-Keys/
  Webhooks** sind als sinnvolle nächste Ausbaustufen identifiziert, aber
  noch nicht gebaut.

## Monorepo-Befehle

| Befehl | Beschreibung |
| --- | --- |
| `pnpm dev:api` | API im Watch-Modus starten |
| `pnpm dev:web` | Web-App im Dev-Modus starten |
| `pnpm build:api` | API für Produktion bauen |
| `pnpm build:web` | Web-App für Produktion bauen |
| `pnpm db:migrate` | Neue Prisma-Migration anlegen/anwenden |
| `pnpm db:seed` | Demo-Daten einspielen |
