FROM node:20-alpine AS base
RUN npm install -g pnpm@8.15.0

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web ./apps/web
RUN pnpm --filter @sms-crm/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3001
CMD ["node", "apps/web/server.js"]
