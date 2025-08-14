Runbook

- Local: pnpm i; pnpm dev (requires Postgres/Redis via docker-compose).
- Env: set DATABASE_URL, REDIS_URL, AI_API_KEY, VAPID keys.
- Alerts: if AI /healthz fails, disable routing feature flag, route to triage.


