QA test plan

Unit
- Schemas validate classify request/response and RouteDecision
- Redaction utilities remove secrets
- Idempotency cache stores by Idempotency-Key + messageId with 10 min TTL
- Threshold logic routes below T_UNKNOWN to triage and at/above T_ROUTE to destination

Integration
- ai-bot /classify timeout 2000 ms, 429 on concurrency cap, Retry-After-Ms present
- ai-bot /healthz returns status, modelVersion, promptId, smokeEval and non-2xx on failure
- ai-bot /metrics exposes counters, histogram buckets, gauges
- api notifications queue emits web push and socket events
- directory-sync Slack import updates users

E2E (Playwright)
- Admin: dashboard loads with health cards and live updates
- Admin: bot settings edit and save, live preview of a sample classify
- Admin: prompts add version, JSON validation, publish to PROMPT_ID
- Admin: datasets upload testset and smoke50, validate distribution, run evaluator, render metrics and confusion matrix
- Admin: routing change default destinations and thresholds, verify via socket route events
- Admin: notifications rotate keys without downtime, test push and show fallback on denied
- Admin: directory sync run, list and filter users
- Admin: flags set canary percentage and shadow mode
- Admin: QA trigger staging E2E and k6, render artifact links and job status
- Web: start chat, route decision appears, agent auto-ack shows, transcript persists across reload
- Web: deny notifications shows toast and badge, service worker registers and click opens conversation
- Web: reconnect within 3 seconds on socket drop

Load (k6)
- 500 VUs, 5 messages per minute
- API GET P95 < 300 ms, API POST P95 < 600 ms, ai-bot P95 < 1500 ms, push P95 < 2000 ms

Lighthouse
- Admin and Web on staging: performance, accessibility, best practices, SEO >= 90

Production smoke
- healthz endpoints, basic chat, notifications path, metrics scrape
## QA Test Plan

- Magic link login works in admin (MailHog shows email; console logs verification URL in dev).
- Guest can start chat, send a message, receive agent auto-reply; transcript persists after refresh.
- Simulated push (test mode) triggers in-app alert when notifications denied; badge increments.
- Directory sync mock updates users and marks inactive users.
- Socket reconnects within 3 seconds after refresh.
- Health fallback: if ai-bot health fails, API routes to triage and logs alert.
Checklist

- Unit tests >= 80% coverage (critical modules >90%).
- Integration: directory sync status, AI classify, API chat persistence.
- E2E: start chat, bot routes, agent reply simulated, push fallback toast when blocked.
- Security: OAuth scopes asserted, no secrets logged.
- Performance: P95 bot <1.5s, push <2s.


