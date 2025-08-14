FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile=false
WORKDIR /app/apps/admin
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/apps/admin/.next /app/.next
COPY --from=base /app/apps/admin/package.json /app/package.json
COPY --from=base /app/node_modules /app/node_modules
EXPOSE 3001
CMD ["pnpm", "start"]

