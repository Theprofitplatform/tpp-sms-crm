# Operations Runbook

## Service Management

### Starting Services

**Development:**
```bash
docker compose -f infra/docker-compose.yml up -d
pnpm dev:api
pnpm dev:worker
pnpm dev:web
```

**Production:**
```bash
docker compose -f infra/docker-compose.prod.yml up -d
```

### Stopping Services

```bash
docker compose -f infra/docker-compose.yml down
# or for production:
docker compose -f infra/docker-compose.prod.yml down
```

### Viewing Logs

```bash
# All services
docker compose -f infra/docker-compose.yml logs -f

# Specific service
docker compose -f infra/docker-compose.yml logs -f api
docker compose -f infra/docker-compose.yml logs -f worker

# Last 100 lines
docker compose -f infra/docker-compose.yml logs --tail=100 api
```

## Kill Switch (Emergency Stop)

### Pause All Sending

```bash
curl -X POST http://localhost:3000/tenants/00000000-0000-0000-0000-000000000001/pause \
  -H "Cookie: session_id=YOUR_SESSION"
```

Or via admin UI: Settings → Kill Switch → Pause Sending

**Effect:** All new sends blocked within 60 seconds. Queued jobs remain queued but will not process.

### Resume Sending

```bash
curl -X POST http://localhost:3000/tenants/00000000-0000-0000-0000-000000000001/resume \
  -H "Cookie: session_id=YOUR_SESSION"
```

## Database Operations

### Backups

**Automated:** Runs daily via cron at 2 AM, 7-day retention

**Manual Backup:**
```bash
./scripts/backup.sh
```

**Verify Backup:**
```bash
ls -lh /backups/
```

### Restore

**From Backup:**
```bash
./scripts/restore.sh /backups/smscrm_20241107_120000.sql.gz
```

**WARNING:** This replaces the entire database. Service downtime required.

### Migrations

**Apply New Migrations:**
```bash
pnpm migrate
# or in Docker:
docker compose exec api pnpm migrate
```

**Generate Migration:**
```bash
pnpm migrate:generate
```

## Common Issues

### Issue: Messages Not Sending

**Symptoms:** Send jobs stuck in "queued" status

**Diagnosis:**
1. Check worker is running: `curl http://localhost:3002/health`
2. Check Redis connection: `redis-cli ping`
3. Check queue: `redis-cli LLEN bull:send-messages:wait`

**Resolution:**
1. Restart worker: `docker compose restart worker`
2. Check Twilio credentials in .env
3. Check worker logs for errors: `docker compose logs worker`

### Issue: Webhook Not Processing

**Symptoms:** Status updates not reflected, STOP not working

**Diagnosis:**
1. Check webhook signature verification
2. Check receiving number mapping: `SELECT * FROM sending_numbers;`
3. Check webhook_events for duplicates

**Resolution:**
1. Verify Twilio webhook URL configured correctly
2. Ensure receiving number exists in sending_numbers table
3. Check API logs: `docker compose logs api | grep webhook`

### Issue: DNC Not Blocking

**Symptoms:** Contacts on DNC list still receiving messages

**Diagnosis:**
1. Check DNC entry exists: `SELECT * FROM do_not_contact WHERE phone_e164 = '+61...';`
2. Check gate enforcement logs

**Resolution:**
1. Verify phone normalization (must be E.164 format)
2. Restart worker to clear any cached data
3. Check gate checker logic

### Issue: Budget Exceeded But Still Sending

**Symptoms:** Spend over budget, messages still going out

**Diagnosis:**
1. Check budget table: `SELECT * FROM budgets WHERE tenant_id = '...';`
2. Check tenant settings: `SELECT daily_budget_cents FROM tenants WHERE id = '...';`

**Resolution:**
1. Use kill switch to stop immediately
2. Update budget: `UPDATE tenants SET daily_budget_cents = X WHERE id = '...';`
3. Reset spend if needed: `UPDATE budgets SET daily_spent_cents = 0 WHERE tenant_id = '...';`

### Issue: High Failure Rate

**Symptoms:** >5% delivery failures

**Diagnosis:**
1. Check failure reasons: `SELECT failure_reason, COUNT(*) FROM send_jobs WHERE status='failed' GROUP BY failure_reason;`
2. Check provider status: Twilio dashboard
3. Check phone number validation

**Resolution:**
1. If "Invalid phone": Improve import validation
2. If "Provider error": Check Twilio account status
3. If "Consent": Review consent requirements

### Issue: Quiet Hours Not Enforced

**Symptoms:** Messages sending during 9PM-9AM

**Diagnosis:**
1. Check tenant timezone: `SELECT timezone FROM tenants WHERE id = '...';`
2. Check contact timezone: `SELECT timezone FROM contacts WHERE id = '...';`
3. Check quiet hours settings on campaign

**Resolution:**
1. Update timezone if incorrect
2. Verify quiet hours logic in gate checker
3. Check server time: `date`

## Monitoring

### Key Metrics

**Sends Per Minute:**
```bash
redis-cli GET "rate:tenant:00000000-0000-0000-0000-000000000001:$(date +%s | awk '{print int($1/60)}')"
```

**Queue Length:**
```bash
redis-cli LLEN bull:send-messages:wait
```

**Delivery Rate (last 1000 messages):**
```sql
SELECT
  status,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM send_jobs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

**Budget Status:**
```sql
SELECT
  t.name,
  b.daily_spent_cents / 100.0 as daily_spent,
  t.daily_budget_cents / 100.0 as daily_budget,
  b.monthly_spent_cents / 100.0 as monthly_spent,
  t.monthly_budget_cents / 100.0 as monthly_budget
FROM tenants t
JOIN budgets b ON b.tenant_id = t.id;
```

### Alert Conditions

**Critical (Page On-Call):**
- Delivery rate < 90% for 10 minutes
- All services down
- Database connection failures
- Queue depth > 10,000 for 5 minutes

**Warning (Slack Notification):**
- Delivery rate < 95% for 10 minutes
- Opt-out rate > 3% in rolling 100 messages
- Webhook lag > 30 seconds for 5 minutes
- Failure rate > 5% for 10 minutes

**Info:**
- Budget approaching 90%
- Daily warmup limit reached
- Import batch completed

## Rollback Procedures

### Code Rollback

```bash
# Stop services
docker compose -f infra/docker-compose.prod.yml down

# Restore previous images
docker pull your-registry/api:previous-tag
docker pull your-registry/worker:previous-tag
docker pull your-registry/web:previous-tag

# Start with previous version
docker compose -f infra/docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Stop services
docker compose -f infra/docker-compose.prod.yml down

# Restore from backup
./scripts/restore.sh /backups/smscrm_YYYYMMDD_HHMMSS.sql.gz

# Start services
docker compose -f infra/docker-compose.prod.yml up -d
```

## Security Response

### Suspected Breach

1. **Immediate:** Enable kill switch to stop all sending
2. **Rotate Secrets:** All API keys, webhook secrets, cookie secrets
3. **Audit:** Check audit_log table for suspicious activity
4. **Review:** webhook_events for unauthorized access
5. **Reset:** All user sessions (clear session table/Redis)

### Webhook Signature Failures

**High Rate of Failures:**
1. Check if Twilio webhook secret changed
2. Verify webhook URL configured correctly
3. Review API logs for signature verification errors
4. Consider temporary whitelist if legitimate traffic

## Scaling

### Horizontal Scaling

**API:**
```yaml
deploy:
  replicas: 3
```

**Worker:**
```yaml
deploy:
  replicas: 2
```

**Database:** Use managed PostgreSQL with read replicas

**Redis:** Use Redis Cluster or managed service

### Vertical Scaling

Monitor resource usage:
```bash
docker stats
```

Increase limits in docker-compose:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

## Maintenance Windows

### Scheduled Maintenance

1. Announce to users (if applicable)
2. Enable kill switch 5 minutes before
3. Drain queues: Wait for queue depth to reach 0
4. Stop services
5. Perform maintenance (migrations, updates)
6. Test in staging
7. Start services
8. Verify health checks
9. Disable kill switch
10. Monitor for 15 minutes

### Zero-Downtime Deployment

1. Deploy new API instances (blue-green)
2. Wait for health checks
3. Switch load balancer traffic
4. Deploy new worker instances
5. Drain old worker queues
6. Terminate old instances

## SLO & SLA

### Service Level Objectives

- **Availability:** 99.9% uptime (43 minutes downtime/month)
- **Message Delivery:** ≥95% delivered within 5 minutes
- **API Response Time:** p95 < 500ms
- **Webhook Processing:** < 30 seconds lag

### Recovery Objectives

- **RPO (Recovery Point Objective):** 24 hours (daily backups)
- **RTO (Recovery Time Objective):** 60 minutes

## On-Call Procedures

### Escalation Path

1. **Level 1:** Operations team (first response)
2. **Level 2:** Engineering team (code issues)
3. **Level 3:** Senior engineering (architecture)

### Incident Response

1. **Acknowledge:** Respond to alert within 5 minutes
2. **Assess:** Determine severity and impact
3. **Mitigate:** Use kill switch if needed
4. **Diagnose:** Use runbook and logs
5. **Resolve:** Apply fix or rollback
6. **Verify:** Run health checks
7. **Document:** Update incident log
8. **Post-Mortem:** Within 48 hours for Critical incidents

## Contact Information

- **Engineering:** engineering@example.com
- **Operations:** ops@example.com
- **Twilio Support:** https://support.twilio.com
- **Database Provider:** provider-support@example.com

## References

- [Twilio Documentation](https://www.twilio.com/docs)
- [BullMQ Documentation](https://docs.bullmq.io)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
