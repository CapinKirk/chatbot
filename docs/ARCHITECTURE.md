High-level architecture

- Web (Next.js) connects to API (Fastify + Socket.IO) for realtime chat.
- AI-bot is an HTTP service that classifies text and returns routing suggestions.
- Directory-sync keeps a read-only user directory from Slack.
- API persists to Postgres via Prisma and enqueues Web Push jobs via Redis/BullMQ.


