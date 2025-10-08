# SMS CRM - Comprehensive Continuation Plan

**Created:** October 8, 2025
**Based On:** PROJECT_STATUS_REPORT.md
**Current Completion:** 82.5%
**Target:** Production-ready platform in 3-4 weeks

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Phase 1: Critical Fixes (Week 1)](#phase-1-critical-fixes-week-1)
3. [Phase 2: Testing & Validation (Week 2)](#phase-2-testing--validation-week-2)
4. [Phase 3: Security & Performance (Week 3)](#phase-3-security--performance-week-3)
5. [Phase 4: Production Readiness (Week 4)](#phase-4-production-readiness-week-4)
6. [Beyond MVP](#beyond-mvp)
7. [Work Order Completion Checklist](#work-order-completion-checklist)
8. [Daily Workflow](#daily-workflow)

---

## 🚀 Quick Start

### Before You Begin

1. **Clean Development Environment**
   ```bash
   # Kill all Node processes
   pkill -f "tsx watch"
   pkill -f "pnpm dev"

   # Verify ports are free
   lsof -ti:3000,3001,3002 || echo "Ports are free ✅"

   # Build shared library
   cd packages/lib && pnpm run build && cd ../..

   # Start services in separate terminals
   pnpm dev:api      # Terminal 1 - Port 3000
   pnpm dev:worker   # Terminal 2 - Port 3002
   pnpm dev:web      # Terminal 3 - Port 3001
   ```

2. **Verify Services**
   ```bash
   curl http://localhost:3000/health
   # Should return: {"ok":true,"ts":"..."}

   curl http://localhost:3002/health
   # Should return: {"ok":true,"ts":"..."}
   ```

3. **Set Up Database**
   ```bash
   # Make sure Postgres and Redis are running
   docker compose -f infra/docker-compose.yml up -d postgres redis

   # Run migrations
   cd packages/lib && pnpm run migrate && cd ../..

   # Optional: Seed data
   cd packages/lib && pnpm run seed && cd ../..
   ```

---

## Phase 1: Critical Fixes (Week 1)

**Goal:** Fix blocking issues that prevent production deployment
**Estimated Effort:** 5 days
**Priority:** 🔴 CRITICAL

### Day 1: Redis Session Management

**Current Issue:** Using insecure base64-encoded cookies
**Target:** Implement Redis-backed sessions with proper security

#### Tasks:
1. **Install Dependencies**
   ```bash
   pnpm add --filter @sms-crm/api redis connect-redis express-session @fastify/cookie @fastify/session
   pnpm add --filter @sms-crm/api -D @types/connect-redis @types/express-session
   ```

2. **Create Session Service**
   - File: `apps/api/src/services/session.service.ts`
   - Implement Redis session store
   - Add session validation
   - Add session cleanup/expiry

3. **Update Auth Middleware**
   - File: `apps/api/src/middleware/auth.ts`
   - Replace base64 decoding with Redis session lookup
   - Add proper error handling
   - Add session refresh logic

4. **Update Environment Variables**
   - Add `SESSION_SECRET` (32+ characters)
   - Add `SESSION_TTL` (e.g., 24h)
   - Add `REDIS_SESSION_PREFIX` (e.g., "sess:")

5. **Test**
   - Login flow creates session in Redis
   - Session persists across requests
   - Logout clears session
   - Expired sessions are rejected

**Deliverable:** Secure session management with Redis backing

---

### Day 2: Rate Limiting Implementation

**Current Issue:** Partially implemented, not enforced
**Target:** Full rate limiting with Redis counters

#### Tasks:
1. **Create Rate Limiter Service**
   - File: `apps/api/src/services/rate-limiter.service.ts`
   - Implement token bucket algorithm
   - Store counters in Redis
   - Support per-tenant and per-number limits

2. **Implement Warm-Up Curves**
   - File: `apps/api/src/services/warmup.service.ts`
   - Calculate daily send limits based on phone age
   - Day 1: 20 messages
   - Day 2-7: +50 per day
   - Day 8+: 1000/day

3. **Integrate with Campaign Queue**
   - File: `worker/shortener/src/index.ts`
   - Check rate limits before sending
   - Respect warm-up curves
   - Handle rate limit errors gracefully

4. **Add Rate Limit API Endpoints**
   - GET `/tenants/:id/rate-limits` - View current limits
   - GET `/sending-numbers/:number/warmup-status` - Check warmup progress

5. **Test**
   - Sending respects per-tenant limits
   - Warm-up curves enforced for new numbers
   - Rate limit errors logged properly
   - Limits reset at correct intervals

**Deliverable:** Working rate limiting system

---

### Day 3: Budget Enforcement

**Current Issue:** Budget tracking exists but not enforced
**Target:** Connect budget checks to campaign queueing

#### Tasks:
1. **Create Budget Service**
   - File: `apps/api/src/services/budget.service.ts`
   - Check daily/monthly spend against limits
   - Deduct costs when queuing messages
   - Handle budget exhaustion

2. **Update Gate Checker**
   - File: `apps/api/src/services/gate-checker.ts`
   - Add budget check to gate sequence
   - Return appropriate error codes
   - Log budget-related skips

3. **Implement Budget Reset Job**
   - File: `worker/shortener/src/jobs/budget-reset.ts`
   - Reset daily counters at midnight (tenant timezone)
   - Reset monthly counters on 1st of month
   - Log reset events

4. **Add Budget Notifications**
   - 80% threshold warning
   - 100% limit reached
   - Store in audit log

5. **Test**
   - Campaign stops when budget exhausted
   - Daily reset happens correctly
   - Monthly reset happens correctly
   - Notifications fire at thresholds

**Deliverable:** Budget enforcement fully working

---

### Day 4: Request Validation & Error Handling

**Current Issue:** Missing input validation, inconsistent errors
**Target:** Standardized validation and error responses

#### Tasks:
1. **Install Zod**
   ```bash
   pnpm add --filter @sms-crm/api zod
   ```

2. **Create Validation Schemas**
   - File: `apps/api/src/schemas/index.ts`
   - Schema for campaign creation
   - Schema for contact import
   - Schema for budget updates
   - Schema for auth requests

3. **Create Validation Middleware**
   - File: `apps/api/src/middleware/validate.ts`
   - Validate request body against schema
   - Return 400 with detailed errors
   - Log validation failures

4. **Standardize Error Responses**
   - File: `apps/api/src/utils/errors.ts`
   - Error classes for common scenarios
   - Consistent error format: `{error, code, details}`
   - Add error handler to Fastify

5. **Apply to All Routes**
   - Add validation to POST/PUT routes
   - Update error handling
   - Test error messages

6. **Test**
   - Invalid requests return 400
   - Error messages are clear
   - Validation errors logged

**Deliverable:** Robust input validation and error handling

---

### Day 5: Webhook Security Hardening

**Current Issue:** Partial replay protection, missing tenant mapping
**Target:** Secure webhook processing

#### Tasks:
1. **Implement Replay Protection**
   - File: `apps/api/src/routes/webhooks.ts`
   - Check webhook timestamp (reject if >5 minutes old)
   - Store processed event IDs in Redis (24h TTL)
   - Reject duplicate event IDs

2. **Fix Tenant Mapping**
   - File: `apps/api/src/services/webhook.service.ts`
   - Look up tenant from receiving phone number
   - Handle unmapped numbers gracefully
   - Log mapping failures

3. **Enhance Signature Verification**
   - Support multiple providers (Twilio, MessageBird, etc.)
   - Verify signature before processing
   - Log failed verifications
   - Rate limit by IP for failed attempts

4. **Add Webhook Retry Logic**
   - File: `worker/shortener/src/jobs/webhook-retry.ts`
   - Retry failed webhooks (exponential backoff)
   - Max 3 retries
   - Dead letter queue for permanent failures

5. **Test**
   - Replayed events rejected
   - Stale events rejected
   - Invalid signatures rejected
   - Tenant mapping works

**Deliverable:** Secure webhook processing

---

## Phase 2: Testing & Validation (Week 2)

**Goal:** Build confidence in critical paths through automated testing
**Estimated Effort:** 7 days
**Priority:** 🟡 HIGH

### Day 6-7: Integration Test Framework

#### Tasks:
1. **Set Up Test Infrastructure**
   ```bash
   pnpm add -D vitest @vitest/ui c8
   pnpm add -D testcontainers
   ```

2. **Create Test Utilities**
   - File: `apps/api/src/test/setup.ts`
   - Start test Postgres/Redis containers
   - Run migrations
   - Seed test data
   - Teardown after tests

3. **Write Integration Tests for Imports**
   - File: `apps/api/src/routes/__tests__/imports.test.ts`
   - Test dry-run with valid CSV
   - Test dry-run with invalid data
   - Test commit creates contacts
   - Test commit rejects DNC numbers
   - Test import batch tracking

4. **Write Integration Tests for Campaigns**
   - File: `apps/api/src/routes/__tests__/campaigns.test.ts`
   - Test campaign creation
   - Test campaign queueing
   - Test gate checks (DNC, budget, rate limits)
   - Test campaign pause/resume

5. **Add Test Scripts**
   ```json
   {
     "test": "vitest",
     "test:ui": "vitest --ui",
     "test:coverage": "vitest --coverage"
   }
   ```

**Deliverable:** Integration test suite with 60%+ coverage of critical paths

---

### Day 8-9: Worker & Webhook Tests

#### Tasks:
1. **Mock Twilio API**
   - File: `worker/shortener/src/test/mocks/twilio.ts`
   - Mock message sending
   - Mock delivery status updates
   - Simulate failures

2. **Write Worker Tests**
   - File: `worker/shortener/src/__tests__/worker.test.ts`
   - Test message processing from queue
   - Test rate limit enforcement
   - Test short link generation
   - Test error handling

3. **Write Webhook Tests**
   - File: `apps/api/src/routes/__tests__/webhooks.test.ts`
   - Test signature verification
   - Test replay protection
   - Test event processing (SENT, DELIVERED, CLICKED)
   - Test STOP keyword handling

4. **Add E2E Test**
   - File: `apps/api/src/__tests__/e2e/send-campaign.test.ts`
   - Create campaign → Queue → Process → Webhook
   - Full happy path
   - Full failure scenarios

**Deliverable:** Comprehensive test coverage for worker and webhooks

---

### Day 10: Load Testing

#### Tasks:
1. **Install k6**
   ```bash
   # On macOS
   brew install k6

   # On Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Create Load Test Scripts**
   - File: `tests/load/import-10k.js`
   - Import 10,000 contacts
   - Target: <60 seconds
   - Check memory usage

3. **Create Campaign Load Test**
   - File: `tests/load/campaign-queue.js`
   - Queue 10,000 messages
   - Target: <30 seconds
   - Check Redis memory

4. **Run Tests**
   ```bash
   k6 run tests/load/import-10k.js
   k6 run tests/load/campaign-queue.js
   ```

5. **Optimize Based on Results**
   - Identify bottlenecks
   - Add database indexes if needed
   - Optimize Redis operations
   - Consider batch operations

**Deliverable:** Performance benchmarks and optimizations

---

### Day 11-12: Bug Fixes & Refinement

#### Tasks:
1. **Fix Issues Found in Testing**
   - Address test failures
   - Fix race conditions
   - Handle edge cases

2. **Code Review & Refactoring**
   - Review all new code
   - Refactor duplicated logic
   - Improve error messages
   - Add missing type definitions

3. **Documentation Updates**
   - Update API documentation
   - Document test patterns
   - Update environment variables list
   - Create testing guide

4. **CI Pipeline Enhancement**
   - File: `.github/workflows/ci.yml`
   - Add test coverage reporting
   - Fail build if coverage <60%
   - Add load test job (manual trigger)

**Deliverable:** Stable, well-tested codebase

---

## Phase 3: Security & Performance (Week 3)

**Goal:** Harden security and optimize performance
**Estimated Effort:** 5 days
**Priority:** 🟡 MEDIUM-HIGH

### Day 13: Security Audit

#### Tasks:
1. **Dependency Audit**
   ```bash
   pnpm audit
   pnpm audit --fix
   ```

2. **Add Security Headers**
   - File: `apps/api/src/middleware/security.ts`
   - helmet.js for secure headers
   - CORS configuration
   - CSP policy
   - Rate limiting on auth endpoints

3. **Secrets Management**
   - Audit all environment variables
   - Ensure no secrets in code
   - Document secret rotation process
   - Add secrets validation on startup

4. **SQL Injection Protection**
   - Audit all database queries
   - Ensure using Drizzle ORM properly
   - No raw string concatenation

5. **Add Security Linting**
   ```bash
   pnpm add -D eslint-plugin-security
   ```

**Deliverable:** Hardened security posture

---

### Day 14: Performance Optimization

#### Tasks:
1. **Add Redis Caching for Short Links**
   - File: `apps/api/src/routes/short-links.ts`
   - Cache token → URL mapping
   - 24-hour TTL
   - Fallback to database

2. **Optimize Database Queries**
   - Add indexes for common queries
   - Use SELECT only needed columns
   - Batch INSERT operations
   - Use prepared statements

3. **Implement Connection Pooling**
   - File: `packages/lib/src/db/client.ts`
   - Configure Postgres pool size
   - Configure Redis connection pool
   - Add connection health checks

4. **Add Query Monitoring**
   - Log slow queries (>100ms)
   - Add query execution time tracking
   - Identify N+1 queries

**Deliverable:** Optimized performance

---

### Day 15: Monitoring & Logging

#### Tasks:
1. **Set Up Structured Logging**
   ```bash
   pnpm add pino pino-pretty
   ```
   - File: `packages/lib/src/utils/logger.ts`
   - JSON structured logs
   - Log levels (debug, info, warn, error)
   - Request ID tracking

2. **Add Application Metrics**
   - Request duration
   - Error rates
   - Queue depth
   - Redis hit/miss ratio

3. **Health Check Enhancements**
   - File: `apps/api/src/routes/health.ts`
   - Check database connectivity
   - Check Redis connectivity
   - Check disk space
   - Return detailed status

4. **Set Up Dead Letter Queue**
   - File: `worker/shortener/src/services/dlq.ts`
   - Move failed jobs to DLQ after max retries
   - Add DLQ monitoring endpoint
   - Add DLQ replay functionality

**Deliverable:** Observable system

---

### Day 16-17: Production Setup

#### Tasks:
1. **Create Production Checklist**
   - File: `infra/PRODUCTION_CHECKLIST.md`
   - Environment variables verified
   - Secrets rotated
   - Backups configured
   - Monitoring enabled

2. **Set Up Staging Environment**
   - Deploy to staging server
   - Run smoke tests
   - Load test on staging
   - Fix any issues

3. **Configure Backups**
   ```bash
   # Add to crontab
   0 2 * * * /path/to/scripts/backup.sh
   ```
   - Automated daily backups
   - Backup retention policy (7 days)
   - Test restore process

4. **Set Up Monitoring (Optional)**
   - Consider services like:
     - UptimeRobot (health checks)
     - Sentry (error tracking)
     - LogTail (log aggregation)
     - Grafana + Prometheus (metrics)

**Deliverable:** Production-ready infrastructure

---

## Phase 4: Production Readiness (Week 4)

**Goal:** Final polish and deployment
**Estimated Effort:** 5 days
**Priority:** 🟢 MEDIUM

### Day 18-19: Final Testing

#### Tasks:
1. **End-to-End Testing on Staging**
   - Full import workflow
   - Complete campaign flow
   - Webhook processing
   - Short link redirects
   - Budget enforcement

2. **User Acceptance Testing**
   - Test all UI flows
   - Test error scenarios
   - Verify error messages
   - Check responsiveness

3. **Security Penetration Testing**
   - Attempt SQL injection
   - Test CSRF protection
   - Test rate limiting
   - Test authentication bypass
   - Test webhook replay attacks

4. **Performance Testing**
   - Re-run load tests
   - Test under sustained load
   - Monitor resource usage
   - Identify any memory leaks

**Deliverable:** Fully tested system

---

### Day 20: Documentation & Training

#### Tasks:
1. **Update All Documentation**
   - README.md
   - API documentation
   - Deployment guides
   - Troubleshooting guide

2. **Create Runbook**
   - File: `infra/RUNBOOK.md`
   - Common operations
   - Emergency procedures
   - Rollback process
   - Support contacts

3. **Create User Guide**
   - File: `docs/USER_GUIDE.md`
   - How to import contacts
   - How to create campaigns
   - How to view reports
   - FAQ section

4. **Video Walkthroughs** (Optional)
   - Record demo of key features
   - Share with stakeholders

**Deliverable:** Comprehensive documentation

---

### Day 21-22: Production Deployment

#### Tasks:
1. **Pre-Deployment Checklist**
   - [ ] All tests passing
   - [ ] Secrets configured
   - [ ] Backups tested
   - [ ] Monitoring enabled
   - [ ] Team notified

2. **Deploy to Production**
   ```bash
   git push origin main
   # Watch GitHub Actions deploy
   ```

3. **Post-Deployment Verification**
   - Check all health endpoints
   - Run smoke tests
   - Monitor logs for errors
   - Verify integrations

4. **Gradual Rollout**
   - Start with small campaign (100 contacts)
   - Monitor for 24 hours
   - Scale up if successful

**Deliverable:** Production deployment! 🎉

---

## Beyond MVP

### Phase 5: Enhancements (Month 2+)

These are nice-to-haves that can be added after initial launch:

#### User Management UI
- User invitation flow
- Role management
- Audit log viewer
- Team management

#### Reporting Dashboards
- Campaign performance charts
- Contact engagement metrics
- Cost analysis
- Delivery rate trends

#### Advanced Features
- A/B testing for message content
- Scheduled campaigns
- Recurring campaigns
- Contact segmentation
- Custom fields for contacts

#### Integrations
- Zapier integration
- API webhooks for customers
- CRM integrations (Salesforce, HubSpot)
- Analytics integrations (Google Analytics, Mixpanel)

#### Performance & Scale
- Message queue sharding
- Database read replicas
- CDN for short link redirects
- Multi-region deployment

---

## Work Order Completion Checklist

Use this to track progress against the original work orders:

### Work Order A: Monorepo Scaffold ✅
- [x] Monorepo layout
- [x] Health endpoints
- [x] Docker setup
- [x] CI/CD workflows
- [x] README

### Work Order B: Data Model ✅
- [x] All tables created
- [x] Migrations
- [x] Constraints
- [x] Seed data
- [x] ERD

### Work Order C: Import Flows ✅
- [x] Dry-run endpoint
- [x] Commit endpoint
- [x] Rejected CSV download
- [x] Admin UI
- [x] Sample CSV download

### Work Order D: Campaigns & Send Engine 🟡
- [x] Campaign API
- [x] Queue implementation
- [x] Worker processing
- [ ] **TODO:** Full gate enforcement testing
- [ ] **TODO:** Rate limit implementation (Day 2)
- [ ] **TODO:** Warm-up curves (Day 2)

### Work Order E: Short Links 🟡
- [x] Token generation
- [x] Click tracking
- [x] Bot filtering
- [ ] **TODO:** Redis caching (Day 14)
- [ ] **TODO:** Advanced bot detection

### Work Order F: Webhooks 🟡
- [x] Signature verification
- [x] Event processing
- [x] STOP handling
- [ ] **TODO:** Replay protection (Day 5)
- [ ] **TODO:** Tenant mapping (Day 5)

### Work Order G: Reporting 🟡
- [x] Performance API
- [x] Timeline API
- [ ] **TODO:** Reporting UI dashboards (Phase 5)

### Work Order H: Budgets & Kill Switch 🟡
- [x] Budget tracking
- [x] Pause/resume
- [x] Kill switch API
- [ ] **TODO:** Budget enforcement (Day 3)
- [ ] **TODO:** Audit log UI (Phase 5)

### Work Order I: Auth & RBAC 🟡
- [x] Magic link auth
- [x] User table
- [ ] **TODO:** Redis sessions (Day 1)
- [ ] **TODO:** Full RBAC
- [ ] **TODO:** User management UI (Phase 5)

### Work Order J: Ops & Backups 🟡
- [x] Health endpoints
- [x] Backup scripts
- [x] Deployment automation
- [ ] **TODO:** Monitoring (Day 15)
- [ ] **TODO:** Log aggregation (Day 15)
- [ ] **TODO:** Scheduled backups (Day 17)

---

## Daily Workflow

### Morning Routine
1. Pull latest changes: `git pull origin main`
2. Check background processes: `ps aux | grep -E "(pnpm|tsx)"`
3. Start dev services if needed
4. Review yesterday's work
5. Pick next task from plan

### Development Cycle
1. Create feature branch: `git checkout -b feature/task-name`
2. Write failing test first (TDD)
3. Implement feature
4. Make test pass
5. Refactor
6. Commit: `git commit -m "feat: description"`
7. Push and create PR: `git push origin feature/task-name`

### End of Day
1. Commit work in progress
2. Update this plan with progress
3. Note any blockers
4. Plan tomorrow's tasks

---

## Progress Tracking

Update this section daily:

### Week 1 Progress
- [ ] Day 1: Redis sessions
- [ ] Day 2: Rate limiting
- [ ] Day 3: Budget enforcement
- [ ] Day 4: Validation & errors
- [ ] Day 5: Webhook security

### Week 2 Progress
- [ ] Day 6-7: Test framework
- [ ] Day 8-9: Worker tests
- [ ] Day 10: Load testing
- [ ] Day 11-12: Bug fixes

### Week 3 Progress
- [ ] Day 13: Security audit
- [ ] Day 14: Performance
- [ ] Day 15: Monitoring
- [ ] Day 16-17: Production setup

### Week 4 Progress
- [ ] Day 18-19: Final testing
- [ ] Day 20: Documentation
- [ ] Day 21-22: Deployment

---

## Getting Help

### Resources
- **Status Report:** `PROJECT_STATUS_REPORT.md`
- **Session Summary:** `SESSION_SUMMARY.md`
- **Deployment Guide:** `infra/DEPLOYMENT.md`
- **Work Orders:** `claude_code_work_orders_v_1_no_code_prompts.md`

### When Stuck
1. Check the status report for context
2. Review relevant work order
3. Check existing similar code
4. Search documentation
5. Ask for help with specific context

### Common Commands
```bash
# Development
pnpm dev:api
pnpm dev:worker
pnpm dev:web

# Testing
pnpm test
pnpm test:coverage

# Build
pnpm run build

# Linting
pnpm run lint
pnpm run lint --fix

# Database
cd packages/lib
pnpm run migrate
pnpm run seed

# Deployment
git push origin main  # Triggers CI/CD
```

---

## Success Criteria

You'll know you're production-ready when:

✅ All tests passing (60%+ coverage)
✅ No critical security vulnerabilities
✅ Rate limiting working correctly
✅ Budget enforcement active
✅ Sessions using Redis
✅ Monitoring and alerting configured
✅ Backup process tested
✅ Load tests passing (10k contacts in <60s)
✅ Staging environment validated
✅ Documentation complete
✅ Team trained on operations

---

## Notes & Observations

Keep a running log of important decisions, blockers, and learnings here:

```
2025-10-08:
- Fixed auth middleware bug in tenants.ts
- Created comprehensive continuation plan
- Identified port conflict issues
- Built shared lib package successfully
```

---

**END OF PLAN**

Review this plan weekly and adjust based on progress and new findings.

Good luck! 🚀
