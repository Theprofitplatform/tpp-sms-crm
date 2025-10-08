# GitHub Issues Template for Production Readiness

Copy and paste these issues into your GitHub repository to track the 4-week plan.

---

## Label Definitions

Create these labels first:
- `priority: critical` - Red - Must fix before launch
- `priority: high` - Orange - Important for launch
- `priority: medium` - Yellow - Nice to have
- `priority: low` - Green - Post-launch
- `type: bug` - Red - Something broken
- `type: feature` - Blue - New functionality
- `type: test` - Purple - Testing related
- `type: docs` - Green - Documentation
- `type: security` - Red - Security related
- `type: devops` - Orange - Infrastructure
- `week: 1` through `week: 4` - Gray - Timeline

---

## Week 1 Issues

### Issue #1: Fix Redis Session Management
**Labels:** `priority: critical`, `type: bug`, `week: 1`

**Description:**
Session service is currently disabled due to Redis connection issues. This blocks all authentication functionality.

**Tasks:**
- [ ] Start Redis server on port 6380
- [ ] Verify Redis connection with `redis-cli -p 6380 ping`
- [ ] Uncomment session setup in `apps/api/src/index.ts:38`
- [ ] Test session creation, retrieval, and destruction
- [ ] Add retry logic for Redis connection failures
- [ ] Update health check to report Redis status
- [ ] Document Redis setup in GETTING_STARTED.md

**Acceptance Criteria:**
- Redis running and connected
- Sessions work end-to-end (create → retrieve → destroy)
- Health check shows Redis status
- Documentation updated

**Estimated:** 4 hours

---

### Issue #2: Database Setup & Migration Testing
**Labels:** `priority: critical`, `type: devops`, `week: 1`

**Description:**
Verify migrations work correctly and create comprehensive seed data for testing.

**Tasks:**
- [ ] Run migrations on fresh database
- [ ] Test migration rollbacks
- [ ] Create seed script with realistic data (3 tenants, 1000 contacts, 5 campaigns)
- [ ] Performance test queries with seeded data
- [ ] Document migration procedures

**Acceptance Criteria:**
- Clean migration workflow documented
- Rollback procedures tested
- Seed data script working
- Performance acceptable with 1000+ contacts

**Estimated:** 6 hours

---

### Issue #3: Set Up Testing Infrastructure
**Labels:** `priority: critical`, `type: test`, `week: 1`

**Description:**
Build comprehensive testing infrastructure with Vitest, including unit and integration tests.

**Tasks:**
- [ ] Configure Vitest with coverage reporting
- [ ] Create test database Docker container
- [ ] Write API endpoint tests (auth, campaigns, imports, tenants)
- [ ] Write service unit tests (gate-checker, budget, webhook-security)
- [ ] Add tests to CI pipeline
- [ ] Achieve 60%+ code coverage

**Acceptance Criteria:**
- Test suite running in CI
- 60%+ code coverage
- All tests passing
- Mock external services (Twilio)

**Estimated:** 10 hours

**Files to Create:**
- `vitest.config.ts`
- `apps/api/src/routes/__tests__/auth.test.ts`
- `apps/api/src/routes/__tests__/campaigns.test.ts`
- `apps/api/src/routes/__tests__/imports.test.ts`
- `apps/api/src/services/__tests__/gate-checker.test.ts`

---

### Issue #4: Security Hardening - Production Secrets
**Labels:** `priority: critical`, `type: security`, `week: 1`

**Description:**
Replace all development secrets with production-grade values.

**Tasks:**
- [ ] Generate 64-char SESSION_SECRET
- [ ] Generate 64-char COOKIE_SECRET
- [ ] Generate 64-char WEBHOOK_SECRET
- [ ] Generate 64-char SHORT_LINK_SECRET
- [ ] Create secret rotation script (`scripts/rotate-secrets.sh`)
- [ ] Document rotation procedure
- [ ] Add security headers review
- [ ] Implement API key authentication

**Acceptance Criteria:**
- All production secrets configured
- Secret rotation script working
- Documentation updated
- API key auth implemented

**Estimated:** 8 hours

---

### Issue #5: Frontend-Backend Integration
**Labels:** `priority: critical`, `type: feature`, `week: 1`

**Description:**
Connect all frontend pages to real API endpoints.

**Tasks:**
- [ ] Create API client utility (`apps/web/src/lib/api-client.ts`)
- [ ] Connect Dashboard to `/reports/dashboard` endpoint
- [ ] Connect Campaigns list with pagination
- [ ] Connect Imports history page
- [ ] Connect Reports page with analytics data
- [ ] Add global error handling with toast notifications
- [ ] Add loading states for all data fetches

**Acceptance Criteria:**
- All pages display real data from API
- Loading states visible
- Errors handled gracefully
- No console errors

**Estimated:** 12 hours

**Files to Create:**
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/hooks/useApi.ts`
- `apps/web/src/components/Toast.tsx`

---

## Week 2 Issues

### Issue #6: Integration & E2E Testing
**Labels:** `priority: high`, `type: test`, `week: 2`

**Description:**
Build comprehensive integration and end-to-end test suite.

**Tasks:**
- [ ] Write integration tests for full campaign flow
- [ ] Write integration tests for import flow
- [ ] Write integration tests for auth flow
- [ ] Install Playwright: `pnpm add -D @playwright/test`
- [ ] Write E2E test for complete user journey
- [ ] Add screenshot regression tests
- [ ] Achieve 80%+ code coverage

**Acceptance Criteria:**
- Integration tests cover critical paths
- E2E tests pass on all browsers
- 80%+ code coverage
- Screenshot tests catching visual regressions

**Estimated:** 12 hours

---

### Issue #7: Add Monitoring & Observability
**Labels:** `priority: high`, `type: devops`, `week: 2`

**Description:**
Implement comprehensive monitoring, error tracking, and logging.

**Tasks:**
- [ ] Add Sentry: `pnpm add @sentry/node @sentry/react`
- [ ] Configure Sentry for API and Web
- [ ] Replace console.log with Pino structured logging
- [ ] Add request ID tracking
- [ ] Add Prometheus metrics endpoint
- [ ] Improve health checks (Postgres, Redis, Twilio)
- [ ] Create health dashboard

**Acceptance Criteria:**
- Errors tracked in Sentry
- Structured logs with request IDs
- Metrics exposed at `/metrics`
- Health checks comprehensive

**Estimated:** 10 hours

---

### Issue #8: API Documentation with Swagger
**Labels:** `priority: high`, `type: docs`, `week: 2`

**Description:**
Create interactive API documentation using OpenAPI/Swagger.

**Tasks:**
- [ ] Install: `pnpm add @fastify/swagger @fastify/swagger-ui`
- [ ] Document all routes with OpenAPI schemas
- [ ] Add request/response examples
- [ ] Generate interactive docs at `/docs`
- [ ] Update Postman collection
- [ ] Write API usage guide (`docs/API_GUIDE.md`)

**Acceptance Criteria:**
- Interactive docs accessible at `/docs`
- All routes documented with examples
- Postman collection updated
- API guide written

**Estimated:** 6 hours

---

### Issue #9: Campaign Management Enhancements
**Labels:** `priority: medium`, `type: feature`, `week: 2`

**Description:**
Add campaign scheduling, templates, and analytics.

**Tasks:**
- [ ] Add campaign scheduling with datetime picker
- [ ] Create template CRUD endpoints
- [ ] Build template picker in campaign form
- [ ] Add template variable preview
- [ ] Create campaign analytics dashboard
- [ ] Add real-time sending progress

**Acceptance Criteria:**
- Can schedule campaigns for future
- Template management working
- Analytics dashboard shows real data

**Estimated:** 8 hours

---

### Issue #10: Contact Management UI
**Labels:** `priority: medium`, `type: feature`, `week: 2`

**Description:**
Build comprehensive contact management interface.

**Tasks:**
- [ ] Create `/contacts` list page
- [ ] Add pagination, search, and filters
- [ ] Build contact detail view with timeline
- [ ] Show campaigns sent to contact
- [ ] Add manual DNC management
- [ ] Add bulk DNC operations

**Acceptance Criteria:**
- Contact list with search working
- Contact detail view complete
- DNC management functional

**Estimated:** 4 hours

---

## Week 3 Issues

### Issue #11: Performance Optimization
**Labels:** `priority: high`, `type: feature`, `week: 3`

**Description:**
Optimize database queries, add caching, and improve response times.

**Tasks:**
- [ ] Analyze slow queries with EXPLAIN ANALYZE
- [ ] Add missing database indexes
- [ ] Optimize N+1 queries
- [ ] Add Redis caching for dashboard stats
- [ ] Implement query result caching
- [ ] Optimize worker message batching
- [ ] Code split frontend bundle

**Acceptance Criteria:**
- API response times < 200ms (p95)
- Frontend load time < 2s
- Worker throughput > 100 msg/sec

**Estimated:** 12 hours

---

### Issue #12: Load Testing
**Labels:** `priority: high`, `type: test`, `week: 3`

**Description:**
Perform load testing to identify bottlenecks and capacity limits.

**Tasks:**
- [ ] Install k6: `pnpm add -D k6`
- [ ] Create test scenarios for API endpoints
- [ ] Test campaign queueing with high load
- [ ] Test import with 10k contacts
- [ ] Test with 10 concurrent users
- [ ] Test with 100 concurrent users
- [ ] Document capacity limits

**Acceptance Criteria:**
- Load test suite created
- Bottlenecks identified and fixed
- Capacity limits documented
- Scaling recommendations written

**Estimated:** 8 hours

---

### Issue #13: Backup & Disaster Recovery
**Labels:** `priority: critical`, `type: devops`, `week: 3`

**Description:**
Implement automated backups and disaster recovery procedures.

**Tasks:**
- [ ] Set up automated daily PostgreSQL backups
- [ ] Configure backup to S3 (or similar)
- [ ] Implement 30-day retention policy
- [ ] Enable backup encryption
- [ ] Test restore procedure
- [ ] Configure Redis persistence (RDB + AOF)
- [ ] Write disaster recovery plan

**Acceptance Criteria:**
- Daily backups automated
- Restore procedures tested and documented
- Redis persistence enabled
- DR plan complete

**Estimated:** 6 hours

---

### Issue #14: Security Audit
**Labels:** `priority: critical`, `type: security`, `week: 3`

**Description:**
Perform comprehensive security audit and fix vulnerabilities.

**Tasks:**
- [ ] Run OWASP Top 10 security review
- [ ] Test for SQL injection vulnerabilities
- [ ] Test for XSS vulnerabilities
- [ ] Verify CSRF protection
- [ ] Run `pnpm audit` and fix vulnerabilities
- [ ] API endpoint fuzzing
- [ ] Test rate limit bypass attempts
- [ ] Create SECURITY.md

**Acceptance Criteria:**
- All critical vulnerabilities fixed
- Security audit report completed
- SECURITY.md published
- No high-severity npm vulnerabilities

**Estimated:** 8 hours

---

### Issue #15: Compliance & Data Privacy
**Labels:** `priority: high`, `type: feature`, `week: 3`

**Description:**
Implement GDPR compliance and data privacy features.

**Tasks:**
- [ ] Add data export endpoint (GDPR right to access)
- [ ] Implement data deletion endpoint (GDPR right to deletion)
- [ ] Create audit logging for all admin actions
- [ ] Build audit log viewer UI
- [ ] Implement data retention policies
- [ ] Create privacy policy
- [ ] Write COMPLIANCE.md

**Acceptance Criteria:**
- GDPR-compliant endpoints working
- Audit logging system active
- Data retention automation working
- Compliance docs published

**Estimated:** 6 hours

---

## Week 4 Issues

### Issue #16: UI/UX Polish
**Labels:** `priority: medium`, `type: feature`, `week: 4`

**Description:**
Polish user interface and improve user experience.

**Tasks:**
- [ ] Consistent spacing and typography
- [ ] Add loading skeletons
- [ ] Improve error messages (user-friendly)
- [ ] Add success confirmations
- [ ] Test mobile responsiveness
- [ ] Fix touch controls for mobile
- [ ] Add ARIA labels for accessibility
- [ ] Add keyboard shortcuts

**Acceptance Criteria:**
- Consistent UI across all pages
- Mobile-responsive on all devices
- WCAG 2.1 AA compliant
- Keyboard navigation working

**Estimated:** 10 hours

---

### Issue #17: Advanced Features
**Labels:** `priority: low`, `type: feature`, `week: 4`

**Description:**
Implement advanced campaign and contact features.

**Tasks:**
- [ ] Build contact segment builder UI
- [ ] Create query builder for segment filters
- [ ] Implement A/B testing for campaigns
- [ ] Add statistical significance calculator
- [ ] Allow tenants to register webhooks
- [ ] Add retry logic for failed webhooks
- [ ] Add CSV export for all data types

**Acceptance Criteria:**
- Segment builder working
- A/B testing functional
- Customer webhooks implemented
- Export features working

**Estimated:** 12 hours

---

### Issue #18: DevOps & CI/CD
**Labels:** `priority: critical`, `type: devops`, `week: 4`

**Description:**
Set up staging environment and production deployment pipeline.

**Tasks:**
- [ ] Deploy staging environment
- [ ] Configure staging database
- [ ] Set up blue-green deployment
- [ ] Create rollback procedures
- [ ] Configure PagerDuty/Opsgenie alerts
- [ ] Alert on error rate spikes
- [ ] Alert on high latency
- [ ] Optimize CI/CD pipeline

**Acceptance Criteria:**
- Staging environment live
- Production deployment automated
- Alerts configured
- Rollback tested

**Estimated:** 8 hours

---

### Issue #19: Documentation
**Labels:** `priority: high`, `type: docs`, `week: 4`

**Description:**
Create comprehensive user, admin, and developer documentation.

**Tasks:**
- [ ] Write user guide (campaigns, imports, reports)
- [ ] Create admin setup guide
- [ ] Write configuration reference
- [ ] Create troubleshooting guide
- [ ] Draw architecture diagram
- [ ] Draw database schema diagram
- [ ] Write operational runbooks
- [ ] Create contributing guide

**Acceptance Criteria:**
- User documentation complete
- Admin guide published
- Developer docs ready
- Runbooks documented

**Estimated:** 6 hours

---

### Issue #20: Final QA & Launch
**Labels:** `priority: critical`, `type: test`, `week: 4`

**Description:**
Final quality assurance and pre-launch verification.

**Tasks:**
- [ ] Run full regression test suite
- [ ] Manual testing of critical paths
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Run load tests
- [ ] Verify response times
- [ ] Final security scan
- [ ] Complete pre-launch checklist

**Acceptance Criteria:**
- All tests passing
- Performance validated
- Security verified
- Launch checklist 100% complete

**Estimated:** 4 hours

---

## Milestones

Create these milestones to track progress:

### Milestone 1: Critical Blockers Resolved (Week 1)
**Due Date:** End of Week 1
**Issues:** #1, #2, #3, #4, #5

### Milestone 2: Essential Features Complete (Week 2)
**Due Date:** End of Week 2
**Issues:** #6, #7, #8, #9, #10

### Milestone 3: Production Ready (Week 3)
**Due Date:** End of Week 3
**Issues:** #11, #12, #13, #14, #15

### Milestone 4: Launch (Week 4)
**Due Date:** End of Week 4
**Issues:** #16, #17, #18, #19, #20

---

## Project Board Columns

Set up a GitHub Projects board with these columns:
1. **Backlog** - All issues not yet started
2. **Week 1** - Issues planned for week 1
3. **Week 2** - Issues planned for week 2
4. **Week 3** - Issues planned for week 3
5. **Week 4** - Issues planned for week 4
6. **In Progress** - Currently being worked on
7. **In Review** - Pending code review
8. **Done** - Completed and merged

---

## Usage Instructions

1. Create all labels listed above
2. Create all 4 milestones with due dates
3. Copy each issue template and create GitHub issues
4. Assign issues to milestones
5. Add appropriate labels to each issue
6. Set up GitHub Projects board
7. Assign issues to team members
8. Track progress daily

**Good luck shipping to production! 🚀**
