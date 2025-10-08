# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack Summary

### Core Framework
- **Fastify** - API server (apps/api)
- **Next.js** - Web frontend (apps/web)
- **Drizzle ORM** - Database layer
- **TypeScript** - Language throughout

### Infrastructure
- **PostgreSQL** - Main database
- **Redis** - Sessions, rate limiting, queues
- **Docker** - Containerization
- **pnpm** - Package manager with workspaces

### Key Dependencies
- **date-fns** + **date-fns-tz** - Date handling
- **Zod** - Validation
- **BullMQ** - Job queues
- **Twilio** - SMS provider
- **Vitest** - Testing framework

### Deployment
- **Cloudflare Pages** - Web frontend (https://sms.theprofitplatform.com.au/)
- **VPS** - API & services (tpp-vps)
- **Docker Compose** - Production deployment

### Current Status
- ✅ **10 tests passing** (Vitest working)
- ✅ **API server running** successfully
- ✅ **Web app deployed** to Cloudflare Pages
- ✅ **Contact upload** functionality working
- ❌ **369+ linting issues** (to be addressed)

## Essential Commands

### Development
```bash
pnpm install                    # Bootstrap workspace
pnpm run dev:api               # Start API server in watch mode
pnpm run dev:web               # Start web client in watch mode
pnpm run dev:worker            # Start shortener worker in watch mode
pnpm run lint                  # Run ESLint/Prettier
pnpm run lint --fix            # Auto-fix linting issues
pnpm run test                  # Run Vitest suite
pnpm run test --coverage       # Run tests with coverage
pnpm run test:db               # Run DB migration tests
```

### Docker
```bash
# Development environment with all services
docker compose -f infra/docker-compose.yml up --build

# Production environment
docker compose -f infra/docker-compose.prod.yml up -d
```

### Database
```bash
# Apply migrations (from packages/lib or apps/api)
pnpm run migrate

# Generate new migration
pnpm run migrate:generate
```

## Architecture Overview

### Monorepo Structure
- **apps/api** - REST API server with health endpoints, campaign management, webhook handlers
- **apps/web** - Admin UI for CSV imports, campaign creation, reporting dashboards
- **worker/shortener** - Async message queue worker for SMS sending and link shortening
- **packages/lib** - Shared TypeScript utilities, types, and Drizzle ORM schema
- **infra/** - Dockerfiles, docker-compose configs, migrations, runbooks
- **postman/** - API collection for testing endpoints

### Core Data Flow
1. **Import**: CSV → dry-run preview → commit with upsert → lineage tracking
2. **Campaign**: Create → queue with gate checks (DNC, budget, quiet hours, rate limits) → send via worker
3. **Events**: Provider webhooks → signature verification → tenant mapping → state transitions (SENT → DELIVERED → CLICKED)
4. **Short Links**: Generate unique token per contact/campaign → edge redirect → bot-filtered click tracking

### Key Components
- **Postgres** - Relational data: tenants, contacts, campaigns, send_jobs, events, short_links, DNC lists, suppression rules
- **Redis** - Rate limiting counters, warm-up curves, worker queue
- **Drizzle ORM** - Type-safe migrations and queries
- **Health Endpoints** - `/health` routes in api and worker return `{ok: true, ts: timestamp}`

### Gate Enforcement Order (Campaign Queueing)
1. Campaign pause flag
2. Daily/monthly budget caps
3. Do-Not-Contact (DNC) list
4. Suppression window (cooldown periods)
5. Quiet hours (9PM - 9AM local time)
6. Per-tenant rate limits
7. Per-number warm-up curve

### Critical Idempotency Keys
- **send_jobs**: `(tenant_id, campaign_id, contact_id)` - prevents duplicate sends
- **webhook_events**: `provider_event_id` - replay protection
- **short_links**: `token` - unique redirect tokens
- **contacts**: `(tenant_id, phone_e164)` - prevents duplicate contacts
- **import_batches**: Track lineage for audit trail

### Security & Validation
- Webhook signature verification mandatory (reject stale/forged payloads)
- CSRF protection on admin routes
- Magic link auth with session TTL
- No PII in short link tokens
- Tenant isolation via sending_numbers mapping

### Work Order Context
This codebase follows a 10-phase build plan (Work Orders A-J in `claude_code_work_orders_v_1_no_code_prompts.md`):
- A: Monorepo scaffold
- B: Data model and migrations
- C: CSV import flows
- D: Campaign send engine
- E: Short links and click integrity
- F: Webhooks and STOP routing
- G: Reporting and timelines
- H: Budgets, caps, kill switch
- I: Auth and RBAC
- J: Ops and backups

When implementing features, reference the corresponding work order for acceptance criteria and constraints.

## Testing Protocols
- Unit tests colocated with code as `*.spec.ts`
- Integration tests use Postgres/Redis containers
- DB migration tests verify idempotency and constraint enforcement
- Import flow tests validate 10k rows under 60 seconds
- Webhook tests verify signature rejection and tenant isolation

## Common Patterns
- File naming: `lowercase-with-hyphens.service.ts`
- TypeScript: Strict mode, Node 20, prefer interfaces over types for public APIs
- Commits: Conventional Commits format (`feat:`, `fix:`, `refactor:`)
- Environment: Copy `.env.example` to `.env.local`, never commit secrets
- Rate Limiting: Check Redis counters before send, respect warm-up curves
- Error Handling: 5xx triggers retry, 4xx marks FAILED immediately
- rember it setup in my VPS. ssh tpp-vps under projects folder