FROM node:20-alpine AS base
RUN npm install -g pnpm@8.15.0

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --no-frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web ./apps/web
RUN pnpm --filter @sms-crm/web install --no-frozen-lockfile
RUN pnpm --filter @sms-crm/web build

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

COPY --from=builder /app/apps/web/out ./
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
