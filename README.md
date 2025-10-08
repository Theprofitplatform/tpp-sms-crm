# TPP SMS CRM Platform

SMS CRM Platform for The Profit Platform - Multi-tenant SMS campaign management built for Australian compliance and deliverability.

## Features

- **Contact Management**: CSV import with dry-run preview, consent tracking, DNC lists
- **Campaign System**: Template rotation, gate enforcement (7-step), quiet hours, rate limiting
- **Compliance**: AU SPAM Act compliant, STOP/START flows, opt-out line in every message
- **Deliverability**: Warmup curves (50/100/200/300), per-tenant & per-number rate limits
- **Short Links**: Private domain, bot-filtered click tracking, 60-day TTL
- **Reporting**: Campaign analytics, contact timelines, human-filtered CTR
- **Budget Controls**: Daily/monthly caps, kill switch, cost tracking
- **Security**: Webhook signature verification, magic link auth, RBAC

## Technology Stack

- **Backend**: Node.js 20, TypeScript, Fastify
- **Database**: PostgreSQL 16, Drizzle ORM
- **Queue**: BullMQ, Redis
- **Frontend**: Next.js 14, React, TailwindCSS
- **Infra**: Docker, docker-compose, pnpm workspaces

## Quick Start

### Development

1. **Prerequisites**
   ```bash
   node >= 20
   pnpm >= 8
   Docker & docker-compose
   ```

2. **Clone and Install**
   ```bash
   git clone https://github.com/Theprofitplatform/tpp-sms-crm.git
   cd tpp-sms-crm
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Twilio credentials
   ```

4. **Start Infrastructure**
   ```bash
   docker compose -f infra/docker-compose.yml up -d postgres redis
   ```

5. **Run Migrations & Seed**
   ```bash
   pnpm migrate
   pnpm seed
   ```

6. **Start Services**
   ```bash
   # Terminal 1: API
   pnpm dev:api

   # Terminal 2: Worker
   pnpm dev:worker

   # Terminal 3: Web
   pnpm dev:web
   ```

7. **Access**
   - Web UI: http://localhost:3001
   - API: http://localhost:3000
   - Worker Health: http://localhost:3002/health

### Production

1. **Environment**
   ```bash
   cp .env.example .env.prod
   # Configure production values
   ```

2. **Deploy**
   ```bash
   docker compose -f infra/docker-compose.prod.yml up -d --build
   ```

3. **Run Migrations**
   ```bash
   docker compose -f infra/docker-compose.prod.yml exec api pnpm migrate
   docker compose -f infra/docker-compose.prod.yml exec api pnpm seed
   ```

## Gate Enforcement Order

All messages pass through 7 gates before sending:

1. **Campaign Pause**: Tenant kill switch
2. **Budget Caps**: Daily/monthly limits
3. **DNC List**: Do Not Contact check
4. **Suppression Window**: 90-day cooldown
5. **Quiet Hours**: 9PM-9AM local time
6. **Rate Limits**: Per-tenant throttling
7. **Warmup**: Number-level daily caps

## Key Commands

```bash
# Development
pnpm dev:api          # Start API server
pnpm dev:worker       # Start worker
pnpm dev:web          # Start web UI

# Build
pnpm build            # Build all packages
pnpm typecheck        # Type check
pnpm lint             # Lint code
pnpm test             # Run tests

# Database
pnpm migrate          # Apply migrations
pnpm migrate:generate # Generate new migration
pnpm seed             # Seed database

# Operations
./scripts/backup.sh   # Database backup
./scripts/restore.sh  # Database restore
./scripts/health-check.sh  # Check all services
```

## Architecture

### Monorepo Structure
```
apps/
  api/          - REST API (Fastify)
  web/          - Admin UI (Next.js)
packages/
  lib/          - Shared utilities, DB schema
worker/
  shortener/    - Queue worker & link redirector
infra/          - Docker, compose, scripts
postman/        - API collection
```

### Critical Idempotency Keys

- **contacts**: `(tenant_id, phone_e164)`
- **send_jobs**: `(tenant_id, campaign_id, contact_id)`
- **short_links**: `token`
- **webhook_events**: `provider_event_id`
- **do_not_contact**: `(tenant_id, phone_e164)`

## Webhook Configuration

### Twilio Setup

1. Configure webhook URL: `https://your-domain.com/webhooks/provider`
2. Set HTTP POST method
3. Twilio will send status updates and inbound messages
4. Signature verification is enforced

### Supported Events

- **Status**: QUEUED, SENT, DELIVERED, FAILED
- **Inbound**: STOP/START keywords, REPLIED
- **State Machine**: QUEUED → SENT → DELIVERED | FAILED

## Short Link Domain

1. Configure DNS A/CNAME record pointing to shortener service
2. Set `SHORT_DOMAIN` in .env
3. Generate secret: `openssl rand -base64 32`
4. Set `SHORT_LINK_SECRET` in .env

## Backups

Automated daily backups with 7-day retention:

```bash
# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh /backups/smscrm_20241107_120000.sql.gz
```

## Monitoring

Health endpoints available at:
- API: `GET /health`
- Worker: `GET /health` (port 3002)
- Shortener: `GET /health` (port 3003)

Run health check:
```bash
./scripts/health-check.sh
```

## Cutover Checklist

- [ ] Database migrations applied
- [ ] Seed data loaded (primary tenant, templates, admin user)
- [ ] Twilio credentials configured
- [ ] Webhook URL configured in Twilio
- [ ] Short link domain DNS configured
- [ ] Sending number added and activated
- [ ] Daily/monthly budgets set
- [ ] Test import: 10 contacts with valid consent
- [ ] Test campaign: Queue and send 1 message
- [ ] Verify DLR webhook received
- [ ] Test STOP flow
- [ ] Test click tracking
- [ ] Backup script tested
- [ ] Restore script tested
- [ ] Health checks passing

## Pilot Success Criteria (Day 6)

- [ ] ≥95% delivery rate on 20 test messages
- [ ] STOP reflected in DNC within 60 seconds
- [ ] Click tracking recording (human-filtered)
- [ ] No duplicates sent
- [ ] Quiet hours enforced correctly
- [ ] Budget tracking accurate

## License

Proprietary - All Rights Reserved

## Support

For issues and questions, contact the platform team.
