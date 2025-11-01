# 📚 SEO Expert Platform - Operations Guide

**Version**: 2.0.0
**Last Updated**: 2025-11-01

---

## 🎯 Quick Start

### Daily Operations

```bash
# Check system health
npx pm2 status
curl http://localhost:9000/api/v2/health

# View recent logs
npx pm2 logs seo-dashboard --lines 50

# Check resource usage
npx pm2 monit
```

### Weekly Tasks

```bash
# Verify backups are running
ls -lh backups/database/ | tail -10

# Test backup restore (staging environment)
node scripts/backup-database.js
gunzip backups/database/backup_LATEST.db.gz
# Verify integrity

# Review error logs
npx pm2 logs seo-dashboard --err --lines 100

# Update dependencies (if needed)
npm outdated
```

---

## 🔧 Common Operations

### Starting/Stopping Services

```bash
# Start all services
npx pm2 start ecosystem.config.cjs --env production

# Stop all services
npx pm2 stop all

# Restart specific service
npx pm2 restart seo-dashboard

# Reload (zero-downtime restart)
npx pm2 reload seo-dashboard

# Delete all processes
npx pm2 delete all
```

### Viewing Logs

```bash
# Real-time logs (all services)
npx pm2 logs

# Real-time logs (specific service)
npx pm2 logs seo-dashboard

# Last 100 lines
npx pm2 logs seo-dashboard --lines 100

# Error logs only
npx pm2 logs seo-dashboard --err

# Flush logs
npx pm2 flush
```

### Database Operations

```bash
# Backup database
node scripts/backup-database.js

# View backups
ls -lh backups/database/

# Restore database (CAREFUL!)
gunzip backups/database/backup_TIMESTAMP.db.gz
cp backups/database/backup_TIMESTAMP.db data/seo-automation.db
npx pm2 restart seo-dashboard

# Check database size
ls -lh data/seo-automation.db

# Vacuum database (optimize)
sqlite3 data/seo-automation.db "VACUUM;"
```

### Monitoring

```bash
# PM2 status dashboard
npx pm2 status

# Resource monitoring
npx pm2 monit

# PM2 web dashboard
npx pm2 web
# Access at http://localhost:9615

# Check Cloudflare Tunnel
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

---

## 🚨 Troubleshooting

### Issue: Service Not Responding (HTTP 502/503)

**Symptoms**: Public URL returns 502 Bad Gateway

**Diagnosis**:
```bash
# 1. Check if PM2 is running
npx pm2 status
# Should show: seo-dashboard - online

# 2. Check if local endpoint works
curl http://localhost:9000/api/v2/health
# Should return JSON with success: true

# 3. Check Cloudflare Tunnel
sudo systemctl status cloudflared
# Should show: active (running)
```

**Resolution**:
```bash
# If PM2 is down:
npx pm2 restart seo-dashboard

# If Cloudflare Tunnel is down:
sudo systemctl restart cloudflared

# If port is in use:
lsof -i :9000
kill -9 <PID>
npx pm2 restart seo-dashboard
```

---

### Issue: High Memory Usage

**Symptoms**: PM2 shows high memory (>500MB)

**Diagnosis**:
```bash
# Check current memory
npx pm2 status
npx pm2 monit

# Check for memory leaks
npx pm2 logs seo-dashboard | grep -i memory
```

**Resolution**:
```bash
# Restart service (clears memory)
npx pm2 restart seo-dashboard

# If persists, reload with zero downtime
npx pm2 reload seo-dashboard

# Check after restart
npx pm2 monit
```

---

### Issue: Otto Features Returning 404

**Symptoms**: `/api/v2/pixel/*`, `/api/v2/schema/*`, `/api/v2/ssr/*` return 404

**Diagnosis**:
```bash
# Check if routes are loaded
curl http://localhost:9000/api/v2/pixel/status/test-client
# Should return JSON, not 404
```

**Resolution**:
```bash
# Ensure latest code is deployed
git pull origin main
cd dashboard && npm run build && cd ..
npx pm2 restart seo-dashboard

# Verify routes work
curl http://localhost:9000/api/v2/health
```

---

### Issue: Database Locked Error

**Symptoms**: "database is locked" errors in logs

**Diagnosis**:
```bash
# Check for multiple processes accessing DB
lsof data/seo-automation.db
```

**Resolution**:
```bash
# Restart service to clear locks
npx pm2 restart seo-dashboard

# Ensure WAL mode is enabled (should be by default)
sqlite3 data/seo-automation.db "PRAGMA journal_mode;"
# Should return: wal
```

---

### Issue: Backup Failed

**Symptoms**: No recent backups in backups/database/

**Diagnosis**:
```bash
# Check cron job
crontab -l | grep backup

# Run backup manually
node scripts/backup-database.js

# Check for errors
cat logs/backup.log
```

**Resolution**:
```bash
# Test backup script
node scripts/backup-database.js

# If successful, verify cron is set up
./scripts/setup-backup-cron.sh

# Verify cron is running
sudo systemctl status cron
```

---

## 📊 Health Checks

### Application Health

```bash
# Health endpoint
curl http://localhost:9000/api/v2/health

# Expected response:
{
  "success": true,
  "version": "2.0.0",
  "timestamp": "2025-11-01T10:00:00.000Z",
  "uptime": 3600.5,
  "services": {
    "api": "healthy"
  }
}
```

### PM2 Health

```bash
# PM2 status
npx pm2 status

# Expected output:
┌────┬──────────────────┬─────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name             │ mode    │ pid  │ status    │ cpu      │ mem      │
├────┼──────────────────┼─────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ seo-dashboard    │ fork    │ 1234 │ online    │ 0%       │ 180mb    │
└────┴──────────────────┴─────────┴──────┴───────────┴──────────┴──────────┘
```

### Cloudflare Tunnel Health

```bash
# Tunnel status
sudo systemctl status cloudflared

# Expected output:
● cloudflared.service
   Active: active (running)
   ...
```

---

## 🔄 Update Process

### Standard Update (No Schema Changes)

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci --omit=dev
cd dashboard && npm ci --omit=dev && npm run build && cd ..

# 3. Reload PM2 (zero downtime)
npx pm2 reload seo-dashboard

# 4. Verify
curl http://localhost:9000/api/v2/health
npx pm2 logs seo-dashboard --lines 20
```

### Update with Database Changes

```bash
# 1. Backup database first!
node scripts/backup-database.js

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm ci --omit=dev
cd dashboard && npm ci --omit=dev && npm run build && cd ..

# 4. Run migrations (if any)
# node scripts/migrate.js

# 5. Restart PM2
npx pm2 restart seo-dashboard

# 6. Verify
curl http://localhost:9000/api/v2/health
```

---

## 🎯 Performance Optimization

### Database Optimization

```bash
# Vacuum database (reclaim space)
sqlite3 data/seo-automation.db "VACUUM;"

# Analyze database (update statistics)
sqlite3 data/seo-automation.db "ANALYZE;"

# Check database integrity
sqlite3 data/seo-automation.db "PRAGMA integrity_check;"
```

### Log Management

```bash
# Check log sizes
du -sh ~/.pm2/logs/

# Manually rotate logs
npx pm2 flush

# Configure automatic rotation (already done)
npx pm2 set pm2-logrotate:max_size 10M
```

### Resource Limits

```bash
# Increase PM2 max memory restart (if needed)
npx pm2 start ecosystem.config.cjs --max-memory-restart 500M

# Set CPU limit (if needed)
# Edit ecosystem.config.cjs
```

---

## 📈 Monitoring Best Practices

### What to Monitor

1. **Uptime**
   - External monitoring: UptimeRobot, Pingdom
   - Monitor: https://seodashboard.theprofitplatform.com.au/api/v2/health
   - Check interval: 5 minutes
   - Alert on: HTTP != 200

2. **Performance**
   - Response time: < 200ms average
   - CPU usage: < 50% sustained
   - Memory usage: < 500MB
   - Disk usage: < 80%

3. **Errors**
   - Application errors in PM2 logs
   - HTTP 5xx errors
   - Database errors
   - Backup failures

4. **Resources**
   - Disk space for database
   - Disk space for backups
   - Network bandwidth

### Alert Thresholds

```bash
# CPU > 80% for 5 minutes
# Memory > 500MB
# Disk space < 20%
# Backup failure
# Service down for > 2 minutes
# HTTP errors > 10/minute
```

---

## 🔐 Security Operations

### Log Review

```bash
# Check for suspicious activity
npx pm2 logs seo-dashboard | grep -i error
npx pm2 logs seo-dashboard | grep -i unauthorized

# Review access patterns
# (Set up nginx access logs if using nginx)
```

### Update Dependencies

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update packages
npm update
cd dashboard && npm update && cd ..

# Rebuild and test
npm run build
npx pm2 restart seo-dashboard
```

---

## 📞 Emergency Procedures

### Service Down

1. **Immediate Actions**:
   ```bash
   npx pm2 restart seo-dashboard
   sudo systemctl restart cloudflared
   ```

2. **Verify**:
   ```bash
   curl http://localhost:9000/api/v2/health
   curl https://seodashboard.theprofitplatform.com.au/api/v2/health
   ```

3. **If Still Down**:
   ```bash
   # Check logs
   npx pm2 logs seo-dashboard --err --lines 50

   # Check port
   lsof -i :9000

   # Kill and restart
   kill -9 <PID>
   npx pm2 start ecosystem.config.cjs --env production
   ```

### Database Corruption

1. **Stop Service**:
   ```bash
   npx pm2 stop seo-dashboard
   ```

2. **Restore from Backup**:
   ```bash
   ls -lt backups/database/ | head -5
   gunzip backups/database/backup_TIMESTAMP.db.gz
   cp backups/database/backup_TIMESTAMP.db data/seo-automation.db
   ```

3. **Verify Integrity**:
   ```bash
   sqlite3 data/seo-automation.db "PRAGMA integrity_check;"
   ```

4. **Restart**:
   ```bash
   npx pm2 restart seo-dashboard
   ```

---

## 📋 Maintenance Checklist

### Daily
- [ ] Check PM2 status
- [ ] Verify health endpoint
- [ ] Review error logs

### Weekly
- [ ] Verify backups
- [ ] Review resource usage
- [ ] Check for updates
- [ ] Review performance metrics

### Monthly
- [ ] Test backup restore
- [ ] Update dependencies
- [ ] Vacuum database
- [ ] Review and archive old logs
- [ ] Security audit

---

## 🔗 Quick Reference Links

| Resource | URL/Command |
|----------|-------------|
| Dashboard | https://seodashboard.theprofitplatform.com.au |
| Health Check | https://seodashboard.theprofitplatform.com.au/api/v2/health |
| PM2 Docs | https://pm2.keymetrics.io/docs/usage/quick-start/ |
| Cloudflare Tunnel | https://one.dash.cloudflare.com |
| Repository | (your git repository URL) |

---

## 📝 Notes

- Always backup before major changes
- Test updates in staging first (if available)
- Document any custom changes
- Keep this guide updated

---

**For emergencies, refer to VPS_DEPLOYMENT_GUIDE.md for rollback procedures.**
