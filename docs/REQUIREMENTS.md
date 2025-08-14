Production chat platform requirements

Scope
- apps/web end user chat
- apps/admin full admin UI
- services/api Fastify with Socket.IO, REST with Zod, rate limits, notifications queue, feature flags, /healthz
- services/ai-bot classify, healthz, metrics, OpenAI adapter, thresholds and idempotency
- services/directory-sync Slack directory sync only
- Prisma on Supabase Postgres, Redis for queues and limits
- NextAuth email magic link
- Web push VAPID
- Tests Vitest, Playwright, k6
- CI/CD GitHub Actions, Vercel for apps

Admin UI
- Routes: /admin, /admin/dashboard, /admin/bot, /admin/prompts, /admin/datasets, /admin/routing, /admin/notifications, /admin/directory, /admin/decisions, /admin/flags, /admin/qa, /admin/audit, /admin/settings
- App Router with server actions and Zod validation
- Tailwind, accessible UI, real time via Socket.IO
- Performance: LCP < 2.5 s, first load JS < 300 KB

AI bot
- POST /classify timeout 2000 ms, concurrency cap 64 with Retry-After, idempotency by Idempotency-Key and messageId for 10 min, thresholds T_ROUTE 0.72 T_UNKNOWN 0.35, test and shadow modes
- GET /healthz with smokeEval and testsetPassRate cached 5 min, non-2xx on dependency failure
- GET /metrics counters bot_requests_total bot_success_total bot_timeout_total bot_error_total bot_unknown_total, histogram bot_latency_ms 50 100 250 500 1000 1500 2000, gauges bot_inflight eval_accuracy
- Persist RouteDecision with id conversationId messageId intent confidence destinationType destinationId modelVersion promptId thresholdRoute thresholdUnknown mode reason isShadow createdAt
- Datasets: services/ai-bot/testdata/testset.json and smoke50.json
- Quality: offline accuracy >= 92% and unknown precision >= 95%

DB and providers
- prisma/schema.prisma uses env DATABASE_URL and DIRECT_URL
- scripts/migrate.sh uses DIRECT_URL and runs prisma migrate deploy
- ai-bot reads AI_PROVIDER OPENAI_API_KEY AI_API_BASE
- apps use only NEXT_PUBLIC_* in browser

Quality gates
- CI green for lint typecheck unit integration build
- Coverage >= 80% repo and >= 90% for key packages
- Playwright E2E green on staging for admin and web
- k6 thresholds on staging met
- Lighthouse on staging >= 90 for admin and web

Staging to production
- Deploy to staging, run E2E, k6, Lighthouse, fix until green
- Manual approval
- Deploy to production and run production smoke and Lighthouse
- Post live links and artifacts

