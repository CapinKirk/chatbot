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


