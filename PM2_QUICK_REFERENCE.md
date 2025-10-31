# PM2 Quick Reference Guide

## 🚀 Essential Commands

### Local Development

```bash
# Start all services
npm run pm2:start

# Monitor processes (interactive dashboard)
npm run pm2:monit

# View logs (all services)
npm run pm2:logs

# Check status
npm run pm2:status

# Restart all services
npm run pm2:restart

# Stop all services
npm run pm2:stop

# Save PM2 configuration
npm run pm2:save
```

### Remote VPS Management

```bash
# Quick health check
npm run vps:health

# View recent logs
npm run vps:logs

# Check detailed status
npm run vps:status

# Restart application
npm run vps:restart

# Interactive monitoring
npm run vps:monitor

# SSH into server
npm run vps:connect

# Create manual backup
npm run vps:backup

# Update and restart
npm run vps:update
```

### GitHub Actions

```bash
# View deployment status
npm run actions:status
# Opens: https://github.com/Theprofitplatform/seoexpert/actions

# View recent workflow runs (requires gh CLI)
npm run actions:logs
```

---

## 📊 PM2 Process Management

### View Process Details

```bash
# List all processes
pm2 list

# Detailed info for specific process
pm2 show seo-dashboard

# Monitor CPU/Memory in real-time
pm2 monit
```

### Log Management

```bash
# View all logs
pm2 logs

# View specific service logs
pm2 logs seo-dashboard

# View last 100 lines
pm2 logs seo-dashboard --lines 100

# View only errors
pm2 logs seo-dashboard --err

# Follow logs in real-time
pm2 logs seo-dashboard -f

# Clear all logs
pm2 flush
```

### Process Control

```bash
# Restart specific service (brief downtime)
pm2 restart seo-dashboard

# Reload specific service (zero downtime)
pm2 reload seo-dashboard

# Stop specific service
pm2 stop seo-dashboard

# Start specific service
pm2 start ecosystem.config.js --only seo-dashboard

# Delete process from PM2
pm2 delete seo-dashboard

# Restart all services
pm2 restart all
```

---

## 🔧 Advanced Operations

### Scaling

```bash
# Scale to 4 instances (cluster mode)
pm2 scale seo-dashboard 4

# Scale down to 1 instance
pm2 scale seo-dashboard 1

# View cluster details
pm2 show seo-dashboard
```

### Memory Management

```bash
# Restart process if memory exceeds 500MB (set in ecosystem.config.js)
max_memory_restart: '500M'

# Manual memory check
pm2 show seo-dashboard | grep memory
```

### Auto-Restart on System Reboot

```bash
# Generate startup script (run once)
pm2 startup

# Save current process list
pm2 save

# Disable auto-restart
pm2 unstartup
```

---

## 🗄️ Database Operations

### Backup Databases

```bash
# Automatic backup during deployment
# Location: ~/backups/seo-expert/database/

# Manual backup via npm script
npm run vps:backup

# SSH and backup manually
ssh tpp-vps
cd ~/projects/seo-expert
cp database/seo-expert.db ~/backups/manual/seo-expert-$(date +%Y%m%d).db
```

### Restore Database

```bash
# SSH into server
ssh tpp-vps

# Stop services
cd ~/projects/seo-expert
pm2 stop seo-expert

# Restore from backup
cp ~/backups/seo-expert/database/seo-expert-TIMESTAMP.db database/seo-expert.db

# Restart services
pm2 restart seo-expert
```

---

## 🔍 Troubleshooting

### Service Won't Start

```bash
# Check for errors
pm2 logs seo-expert --err --lines 50

# Check port conflicts
lsof -i :3000

# Kill conflicting process
kill -9 <PID>

# Restart service
pm2 restart seo-expert
```

### High Memory Usage

```bash
# Check memory usage
pm2 show seo-dashboard

# Reduce instances if needed (edit ecosystem.config.js)
instances: 1  # Instead of 2

# Reload configuration
pm2 reload ecosystem.config.js
```

### Database Locked

```bash
# Stop all services accessing DB
pm2 stop all

# Wait 5 seconds
sleep 5

# Restart services
pm2 restart all
```

### View Process Errors

```bash
# Error logs only
pm2 logs --err

# Last 100 error lines
pm2 logs seo-expert --err --lines 100

# Save errors to file
pm2 logs seo-expert --err --lines 1000 --nostream > errors.log
```

---

## 🌐 Deployment Workflow

### Automatic Deployment (Recommended)

```bash
# Push to main branch
git push origin main

# GitHub Actions automatically:
# 1. Runs tests
# 2. Deploys to TPP VPS
# 3. Restarts PM2 services
# 4. Verifies health

# Monitor deployment
npm run actions:status
```

### Manual Deployment

```bash
# Option 1: Quick update via npm
npm run vps:update

# Option 2: SSH and manual control
ssh tpp-vps
cd ~/projects/seo-expert
git pull origin main
npm ci --omit=dev --ignore-scripts
pm2 restart seo-expert

# Option 3: PM2 deploy command
pm2 deploy ecosystem.config.js production
```

---

## 📈 Monitoring & Health

### Health Check

```bash
# Quick health check
npm run vps:health

# Detailed health check via curl
curl http://localhost:3000/health

# From remote machine
curl https://seodashboard.theprofitplatform.com.au/health
```

### Performance Monitoring

```bash
# Real-time monitoring
npm run pm2:monit

# Or on VPS
npm run vps:monitor

# Check uptime
pm2 show seo-expert | grep uptime

# View restart count
pm2 show seo-expert | grep restart
```

### Log Analysis

```bash
# Search logs for errors
pm2 logs seo-expert --lines 500 --nostream | grep -i error

# Count errors in last 1000 lines
pm2 logs seo-expert --lines 1000 --nostream | grep -c ERROR

# View logs by timestamp
pm2 logs seo-expert --lines 100 --timestamp
```

---

## 🔒 Security & Maintenance

### Update Dependencies

```bash
# On VPS
ssh tpp-vps
cd ~/projects/seo-expert

# Update packages
npm update

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Restart services
pm2 restart seo-expert
```

### Disk Space Management

```bash
# Check disk usage
df -h

# Check log file sizes
du -sh ~/projects/seo-expert/logs/*

# Clear PM2 logs if needed
pm2 flush

# Clean old backups (keeps last 10)
cd ~/backups/seo-expert/database
ls -t seo-expert-*.db | tail -n +11 | xargs rm
```

---

## 📝 Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# PM2 aliases
alias pm2-dash='pm2 monit'
alias pm2-restart='pm2 restart all'
alias pm2-logs='pm2 logs --lines 50'
alias pm2-status='pm2 status'

# SEO Expert specific
alias seo-logs='pm2 logs seo-expert --lines 50'
alias seo-restart='pm2 restart seo-expert'
alias seo-status='pm2 show seo-expert'
alias seo-health='curl -sf http://localhost:3000/health && echo "✓ Healthy" || echo "✗ Unhealthy"'
```

---

## 🆘 Emergency Procedures

### Complete System Recovery

```bash
# 1. SSH into server
ssh tpp-vps

# 2. Stop all PM2 processes
pm2 stop all

# 3. Kill PM2 daemon
pm2 kill

# 4. Navigate to project
cd ~/projects/seo-expert

# 5. Pull latest working code
git fetch origin
git reset --hard origin/main

# 6. Restore database backup
cp ~/backups/seo-expert/database/seo-expert-LATEST.db database/seo-expert.db

# 7. Reinstall dependencies
rm -rf node_modules
npm ci --omit=dev --ignore-scripts

# 8. Start PM2
pm2 start ecosystem.config.js

# 9. Save configuration
pm2 save

# 10. Verify
curl http://localhost:3000/health
pm2 logs seo-expert --lines 20
```

### Rollback to Previous Deployment

```bash
# Via GitHub Actions (automatic backup restoration)
# Go to: https://github.com/Theprofitplatform/seoexpert/actions/workflows/deploy-tpp-vps.yml
# Click "Run workflow" → Select "rollback" job

# Or manually:
ssh tpp-vps
cd ~/backups/seo-expert
LATEST_BACKUP=$(ls -t backup-*.tar.gz | head -1)
cd ~/projects/seo-expert
pm2 stop seo-expert
tar -xzf ~/backups/seo-expert/$LATEST_BACKUP
npm ci --omit=dev --ignore-scripts
pm2 restart seo-expert
```

---

## 📞 Support Resources

- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **GitHub Actions**: https://github.com/Theprofitplatform/seoexpert/actions
- **Full Deployment Guide**: See `DEPLOYMENT.md`
- **Issue Tracker**: https://github.com/Theprofitplatform/seoexpert/issues

---

**Last Updated**: 2025-10-31
**Deployment Method**: PM2 on TPP VPS
**Status**: Production Ready ✅
