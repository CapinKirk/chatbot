#!/usr/bin/env bash
set -euo pipefail
: "${DIRECT_URL:?set DIRECT_URL to your direct Postgres URL}"
export DATABASE_URL="${DIRECT_URL}"
pnpm prisma migrate deploy
