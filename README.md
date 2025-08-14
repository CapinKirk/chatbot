## Chat Refactor Vertical Slice

Monorepo with web, admin, api, ai-bot, and directory-sync services.

Quick start:

1. Copy `.env.example` to `.env` and fill keys.
2. Docker: `docker compose -f infra/docker/docker-compose.yml up -d --build`
3. Dev (local processes): `pnpm dev`
4. Reset DB: `pnpm db:reset`

Scripts:
- `pnpm dev`, `pnpm test`, `pnpm e2e`, `pnpm load`

# chatbot