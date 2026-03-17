# Production Deployment Checklist ✅

Use this checklist before deploying the manual review system to production.

---

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Node.js version 16+ installed
- [ ] npm packages installed (`npm install`)
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Client configurations created (`clients/` directory)

### 2. System Health
```bash
# Run health check
node scripts/health-check.js

# Should show all green checkmarks
```

- [ ] All core files present
- [ ] Database accessible
- [ ] API server starts without errors
- [ ] WordPress API credentials valid

### 3. Testing
```bash
# Run test suite
node test-manual-review-workflow.js

# Should complete without errors
```

- [ ] Test script passes
- [ ] Can detect issues
- [ ] Can create proposals
- [ ] Can approve proposals
- [ ] Can apply fixes

### 4. Security
- [ ] API authentication enabled (if required)
- [ ] WordPress credentials stored securely (env vars, not hardcoded)
- [ ] Database access restricted
- [ ] HTTPS enabled for production API
- [ ] CORS configured properly
- [ ] Rate limiting enabled (optional)

### 5. Database
- [ ] Proposal tables exist (`autofix_proposals`, `autofix_review_sessions`)
- [ ] Indexes created for performance
- [ ] Backup strategy in place
- [ ] Old proposal cleanup scheduled
- [ ] Database connection pooling configured

### 6. API Configuration
- [ ] Port configured correctly (default: 4000)
- [ ] Base URL set for production
- [ ] Error logging enabled
- [ ] Request logging enabled (optional)
- [ ] Timeout values appropriate

### 7. WordPress Integration
- [ ] WordPress REST API enabled
- [ ] Application passwords created for automation user
- [ ] Test connection to WordPress API
- [ ] Backup plugin installed on WordPress
- [ ] WordPress user has necessary permissions

---

## 🚀 Deployment Steps

### Step 1: Backup Everything
```bash
# Backup database
sqlite3 database.db ".backup database-backup-$(date +%Y%m%d).db"

# Backup WordPress (via hosting control panel or plugin)
```

- [ ] Database backed up
- [ ] WordPress site backed up
- [ ] Client configurations backed up
- [ ] Backup verified and accessible

### Step 2: Deploy Code
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build if needed
npm run build
```

- [ ] Code deployed to server
- [ ] Dependencies installed
- [ ] Build completed successfully
- [ ] File permissions correct

### Step 3: Start Services
```bash
# Start API server
npm start

# Or with PM2 (recommended)
pm2 start npm --name "autofix-api" -- start
pm2 save
```

- [ ] API server started
- [ ] Process monitoring enabled (PM2/systemd)
- [ ] Auto-restart configured
- [ ] Logs accessible

### Step 4: Verify Deployment
```bash
# Health check
node scripts/health-check.js

# Test API
curl http://localhost:4000/api/autofix/statistics
```

- [ ] Health check passes
- [ ] API responds correctly
- [ ] Database connection works
- [ ] WordPress API accessible

### Step 5: Run Initial Test
```bash
# Test on staging client first
curl -X POST http://localhost:4000/api/autofix/detect \
  -H "Content-Type: application/json" \
  -d '{"engineId": "nap-fixer", "clientId": "staging-client"}'
```

- [ ] Detection works on staging
- [ ] Proposals created successfully
- [ ] Can approve proposals
- [ ] Can apply fixes
- [ ] Changes verified on staging site

---

## 🔒 Security Hardening

### Environment Variables
```bash
# .env file (DO NOT commit to git)
WORDPRESS_URL=https://example.com
WORDPRESS_USER=automation
WORDPRESS_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
DATABASE_PATH=./database.db
API_PORT=4000
NODE_ENV=production
```

- [ ] Sensitive data in environment variables
- [ ] .env file in .gitignore
- [ ] Environment variables loaded correctly
- [ ] No credentials in code

### File Permissions
```bash
# Restrict database access
chmod 600 database.db

# Restrict client configs
chmod 600 clients/*.env
```

- [ ] Database file restricted (600)
- [ ] Client configs restricted (600)
- [ ] Logs directory writable
- [ ] Application files readable

### API Security
- [ ] Authentication middleware enabled
- [ ] Request validation enabled
- [ ] SQL injection prevention (using prepared statements)
- [ ] XSS prevention (sanitizing inputs)
- [ ] CSRF protection (if needed)
- [ ] Rate limiting configured

---

## 📊 Monitoring Setup

### Health Monitoring
```bash
# Setup cron job for health checks
# Add to crontab: crontab -e
0 */6 * * * cd /path/to/project && node scripts/health-check.js >> logs/health.log 2>&1
```

- [ ] Health check cron job scheduled
- [ ] Logs directory created
- [ ] Log rotation configured
- [ ] Disk space monitoring

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs autofix-api
```

- [ ] Process monitoring enabled
- [ ] CPU/memory usage tracked
- [ ] Restart on failure configured
- [ ] Log aggregation setup

### Database Monitoring
```bash
# Check database size
du -h database.db

# Check table counts
sqlite3 database.db "SELECT COUNT(*) FROM autofix_proposals;"
```

- [ ] Database size monitoring
- [ ] Proposal count tracking
- [ ] Old proposal cleanup scheduled
- [ ] Database performance acceptable

---

## 🧹 Maintenance Setup

### Daily Tasks (Automated)
```bash
# Cleanup old proposals (7+ days)
# Add to crontab
0 2 * * * curl -X POST http://localhost:4000/api/autofix/expire-old
```

- [ ] Old proposal cleanup scheduled (2 AM daily)
- [ ] Log cleanup scheduled
- [ ] Backup verification scheduled

### Weekly Tasks (Manual)
- [ ] Review error logs
- [ ] Check success rates
- [ ] Review rejected proposals for patterns
- [ ] Update documentation if needed

### Monthly Tasks (Manual)
- [ ] Database optimization
- [ ] Performance review
- [ ] Security audit
- [ ] Update dependencies

---

## 🚨 Rollback Plan

### If Deployment Fails
```bash
# 1. Stop new service
pm2 stop autofix-api

# 2. Restore database backup
cp database-backup-YYYYMMDD.db database.db

# 3. Revert code
git reset --hard <previous-commit>

# 4. Restart old service
pm2 restart autofix-api
```

- [ ] Rollback procedure documented
- [ ] Backups accessible
- [ ] Team knows rollback steps
- [ ] Rollback tested in staging

### If Bad Fixes Applied
```bash
# WordPress has automatic backups via plugin
# Restore from WordPress backup

# Or use proposal rollback (when implemented)
# POST /api/autofix/proposals/:id/rollback
```

- [ ] WordPress backup strategy in place
- [ ] Know how to restore WordPress
- [ ] Can identify bad fixes via logs
- [ ] Can manually revert if needed

---

## 📈 Success Metrics

### Day 1 (Deployment Day)
- [ ] System running without errors
- [ ] Test detection completed successfully
- [ ] Test review completed successfully
- [ ] Test apply completed successfully
- [ ] No WordPress errors

### Week 1
- [ ] 10+ proposals reviewed
- [ ] 5+ fixes applied successfully
- [ ] 0 critical errors
- [ ] Success rate > 90%
- [ ] User feedback positive

### Month 1
- [ ] 100+ proposals reviewed
- [ ] 50+ fixes applied
- [ ] Success rate > 95%
- [ ] Performance acceptable (< 2s per operation)
- [ ] User adoption increasing

---

## 🎯 Go-Live Decision

### Ready to Go-Live If:
- [x] All pre-deployment checks pass
- [x] Staging tests successful
- [x] Team trained on system
- [x] Rollback plan documented
- [x] Monitoring in place
- [x] Success metrics defined

### NOT Ready If:
- [ ] Health check fails
- [ ] Test script errors
- [ ] WordPress API issues
- [ ] No backup strategy
- [ ] No monitoring setup
- [ ] Team not trained

---

## 📞 Support & Escalation

### If Something Goes Wrong

**Level 1 - Self-Service:**
1. Check logs: `pm2 logs autofix-api`
2. Run health check: `node scripts/health-check.js`
3. Review troubleshooting guide: `TROUBLESHOOTING.md`
4. Check API status: `curl http://localhost:4000/api/autofix/statistics`

**Level 2 - Team Lead:**
1. Review error details
2. Check database state
3. Verify WordPress connectivity
4. Consider rollback

**Level 3 - Developer:**
1. Debug code issues
2. Database corruption recovery
3. Integration issues
4. Code fixes needed

### Contact Information
- Primary: [Your Name/Email]
- Backup: [Backup Contact]
- Emergency: [Emergency Contact]
- Documentation: All guides in project root

---

## ✅ Final Pre-Launch Checklist

**Infrastructure:**
- [ ] Server provisioned and accessible
- [ ] DNS configured (if needed)
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Load balancer setup (if needed)

**Application:**
- [ ] Code deployed
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Services started

**Testing:**
- [ ] Health check passes
- [ ] API responds correctly
- [ ] WordPress integration works
- [ ] Test workflow successful
- [ ] UI loads correctly

**Operations:**
- [ ] Monitoring enabled
- [ ] Logging configured
- [ ] Backups automated
- [ ] Alerts configured
- [ ] Documentation updated

**Team:**
- [ ] Team trained
- [ ] Access credentials distributed
- [ ] Runbooks created
- [ ] Support process defined
- [ ] On-call schedule set

---

## 🎉 Post-Deployment

### Immediately After Launch
```bash
# Monitor for 30 minutes
pm2 monit

# Watch logs
tail -f logs/api.log

# Check health every 5 minutes
watch -n 300 'node scripts/health-check.js'
```

- [ ] Monitor for first 30 minutes
- [ ] Watch for errors
- [ ] Verify user activity
- [ ] Check performance metrics
- [ ] Team on standby

### First 24 Hours
- [ ] Monitor error rates
- [ ] Check success rates
- [ ] Review user feedback
- [ ] Verify backups running
- [ ] Check disk space

### First Week
- [ ] Analyze usage patterns
- [ ] Identify improvement areas
- [ ] Update documentation
- [ ] Train additional team members
- [ ] Plan next iteration

---

## 📝 Deployment Log Template

```
Deployment Date: __________
Deployed By: __________
Git Commit: __________
Environment: Production

Pre-Deployment Checklist: ✅/❌
Deployment Steps: ✅/❌
Post-Deployment Verification: ✅/❌

Issues Encountered: __________
Resolution Steps: __________
Rollback Required: Yes/No

Sign-off: __________
```

---

## 🚀 You're Ready for Production!

Once all checkmarks are complete, you're ready to deploy with confidence!

**Remember:**
- Start small (test client first)
- Monitor closely (first 24 hours)
- Have rollback ready
- Document everything
- Communicate with team

**Good luck with your deployment!** 🎉
