FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

# Copy monorepo and install deps
COPY . .
RUN pnpm install --frozen-lockfile=false

# Build API
WORKDIR /app/services/api
RUN pnpm build

# Generate Prisma client (schema is at repo root prisma/)
WORKDIR /app
RUN pnpm -C prisma dlx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/services/api/dist /app/dist
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/package.json /app/package.json
COPY --from=base /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=base /app/prisma /app/prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]

