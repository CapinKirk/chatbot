FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile=false
WORKDIR /app/apps/web
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/apps/web/.next /app/.next
COPY --from=base /app/apps/web/package.json /app/package.json
COPY --from=base /app/node_modules /app/node_modules
EXPOSE 3000
CMD ["pnpm", "start"]

