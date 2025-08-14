## Runbook

- Local dev: `pnpm dev` (requires Docker for Postgres/Redis or set DATABASE_URL to Supabase)
- DB reset: `pnpm db:reset`
- E2E: `pnpm e2e`
- Load: `k6 run infra/k6/load.js`
- Deploy: tag `vX.Y.Z` to trigger staging then manual approval for production.
Runbook

- Local: pnpm i; pnpm dev (requires Postgres/Redis via docker-compose).
- Env: set DATABASE_URL, REDIS_URL, AI_API_KEY, VAPID keys.
- Alerts: if AI /healthz fails, disable routing feature flag, route to triage.


