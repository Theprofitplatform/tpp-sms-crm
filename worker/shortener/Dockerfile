FROM node:20-alpine AS base
RUN npm install -g pnpm@8.15.0

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/lib/package.json ./packages/lib/
COPY worker/shortener/package.json ./worker/shortener/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Skip TypeScript compilation in Docker - already built locally
# RUN pnpm --filter @sms-crm/lib build
# RUN pnpm --filter @sms-crm/worker build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy locally built dist folders
COPY packages/lib/dist ./packages/lib/dist
COPY packages/lib/package.json ./packages/lib/
COPY worker/shortener/dist ./worker/shortener/dist
COPY worker/shortener/package.json ./worker/shortener/
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3002
CMD ["node", "worker/shortener/dist/index.js"]
