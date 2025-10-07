# Cutover Plan

## Pre-Cutover (T-7 days)

### Infrastructure Setup
- [ ] VPS provisioned (minimum 4GB RAM, 2 CPUs)
- [ ] Docker and docker-compose installed
- [ ] Domain DNS configured (API, Web, Short links)
- [ ] SSL certificates obtained (Let's Encrypt)
- [ ] Firewall rules configured (80, 443, SSH only)

### Service Configuration
- [ ] Twilio account created and verified
- [ ] Twilio phone number purchased (AU)
- [ ] Twilio API credentials generated
- [ ] Webhook URL configured in Twilio console
- [ ] Short link domain registered and pointed

### Security
- [ ] Strong passwords generated for all secrets
- [ ] .env.prod file created with production values
- [ ] Database credentials secured
- [ ] API keys stored in secure vault
- [ ] SSH key-only access configured

## Pre-Cutover (T-3 days)

### Deployment
- [ ] Code deployed to VPS
- [ ] Docker images built
- [ ] All services started
- [ ] Health checks passing
- [ ] Logs accessible

### Database
- [ ] Migrations applied successfully
- [ ] Seed data loaded (primary tenant, templates)
- [ ] Admin user created
- [ ] Sending number configured and activated
- [ ] Budget limits set ($100/day, $2000/month)

### Testing
- [ ] Magic link login works
- [ ] CSV import dry-run successful
- [ ] CSV import commit successful (10 test contacts)
- [ ] Campaign creation works
- [ ] Message preview calculates parts correctly
- [ ] Template variables render correctly

## Cutover Day (T-0)

### Go/No-Go Decision (09:00 AM)

**GO Criteria:**
- [ ] All services healthy
- [ ] Database backed up
- [ ] Test campaign queued successfully
- [ ] Twilio credentials verified
- [ ] Webhook receiving test events

**NO-GO Criteria:**
- Any service health check failing
- Database migration issues
- Twilio authentication failures
- Webhook signature verification failing

### Pilot Send (10:00 AM)

- [ ] Import 20 pilot contacts (staff/test numbers)
- [ ] Create pilot campaign with 1 template
- [ ] Queue campaign (verify gates pass)
- [ ] Verify 20 jobs created
- [ ] Monitor sends in real-time

### Verification (10:15 AM)

- [ ] ≥19/20 messages sent (95% success rate)
- [ ] Delivery confirmations received within 5 min
- [ ] Short links clickable
- [ ] Clicks recorded in database
- [ ] No duplicate sends
- [ ] Opt-out line present in all messages

### STOP Flow Test (10:30 AM)

- [ ] Reply STOP from test number
- [ ] Verify webhook received
- [ ] Verify DNC entry created
- [ ] Verify contact blocked from new campaign
- [ ] Verify STOP recorded in events table
- [ ] DNC reflected within 60 seconds

### Budget Test (11:00 AM)

- [ ] Verify spend recorded in budgets table
- [ ] Set low budget (e.g., $1)
- [ ] Queue new campaign
- [ ] Verify blocked by budget gate
- [ ] Reset budget to production value

### Kill Switch Test (11:15 AM)

- [ ] Pause tenant via admin UI
- [ ] Queue new campaign
- [ ] Verify sends blocked
- [ ] Resume tenant
- [ ] Verify sends resume

### Quiet Hours Test (11:30 AM)

- [ ] Temporarily set quiet hours to current time
- [ ] Queue campaign
- [ ] Verify jobs delayed
- [ ] Reset quiet hours to 21:00-09:00

### Monitoring Setup (12:00 PM)

- [ ] Backup cron job configured (daily 2 AM)
- [ ] Test backup script runs successfully
- [ ] Test restore script (on test DB)
- [ ] Health check monitoring enabled
- [ ] Alert rules configured
- [ ] Notification channels tested

### Documentation (12:30 PM)

- [ ] Admin login credentials shared with team
- [ ] Webhook URL confirmed in Twilio
- [ ] Emergency contacts updated
- [ ] Escalation path documented
- [ ] Runbook accessible to ops team

## Post-Cutover (T+1 to T+6)

### Day 1 (Monitoring)
- [ ] All health checks green
- [ ] No failed sends
- [ ] No webhook errors
- [ ] Budget tracking accurate
- [ ] Backup completed overnight

### Day 2-5 (Gradual Scale)
- [ ] Import additional contacts (100/day)
- [ ] Send 1-2 small campaigns (50-100 contacts)
- [ ] Monitor delivery rates
- [ ] Check opt-out rates
- [ ] Review campaign reports

### Day 6 (Success Criteria)
- [ ] ≥95% delivery rate maintained
- [ ] STOP flow working reliably
- [ ] Click tracking accurate (human-filtered)
- [ ] No duplicate sends observed
- [ ] Quiet hours respected
- [ ] Budget tracking correct
- [ ] No unplanned downtime

## Rollback Plan

### Trigger Conditions
- Delivery rate < 85% for 30 minutes
- Database corruption
- Security breach
- Critical bug discovered

### Rollback Steps
1. Enable kill switch immediately
2. Stop all services: `docker compose down`
3. Restore previous database backup
4. Deploy previous code version
5. Test health checks
6. Resume if healthy, else investigate

### Communication
- Notify stakeholders immediately
- Document rollback reason
- Schedule post-mortem within 24 hours

## Support

### Week 1 Support Plan
- Engineering on-call 24/7
- Daily standups to review metrics
- Slack channel for immediate issues
- Weekly review of logs and performance

### Success Metrics
- **Delivery Rate:** ≥95%
- **Opt-Out Rate:** <2%
- **Failed Sends:** <5%
- **Uptime:** 99.9%
- **Budget Accuracy:** ±1%

## Sign-Off

- [ ] Technical Lead: _______________
- [ ] Operations Lead: _______________
- [ ] Product Owner: _______________
- [ ] Date: _______________
