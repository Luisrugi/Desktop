#!/usr/bin/env bash
# Einmalige Einrichtung beim Erstellen des Codespaces:
# Abhängigkeiten installieren, .env-Dateien anlegen, Datenbank migrieren und Demo-Daten einspielen.
set -euo pipefail

sudo corepack enable || npm install -g pnpm

# Nur API, Web und Shared – die Tauri-Desktop-App braucht GUI-Bibliotheken.
pnpm install --filter "@timetrack/api..." --filter "@timetrack/web..."

[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
# Im Codespace läuft die API über den Vite-Proxy unter /api (gleicher Origin wie die Web-App).
[ -f apps/web/.env ] || echo "VITE_API_BASE_URL=/api" > apps/web/.env

pnpm --filter @timetrack/api prisma:generate
pnpm --filter @timetrack/api exec prisma migrate deploy
pnpm --filter @timetrack/api db:seed
