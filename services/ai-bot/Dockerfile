FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile=false
WORKDIR /app/services/ai-bot
RUN pnpm build || true

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/services/ai-bot /app
COPY --from=base /app/node_modules /app/node_modules
EXPOSE 4100
CMD ["node", "dist/server.js"]

