#!/usr/bin/env bash
# Startet API und Web-App bei jedem Start des Codespaces im Hintergrund.
# Logs: /tmp/api.log und /tmp/web.log
cd "$(dirname "$0")/.."
nohup pnpm dev:api > /tmp/api.log 2>&1 &
nohup pnpm --filter @timetrack/web dev --host > /tmp/web.log 2>&1 &
