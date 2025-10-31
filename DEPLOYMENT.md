# SEO Expert Platform - Production Deployment Guide

## 🚀 Quick Start

**Primary Deployment Method**: PM2 on TPP VPS

**Production URL**: https://seodashboard.theprofitplatform.com.au

**Deployment**: Automatic on push to `main` branch via GitHub Actions

---

## 📋 Deployment Architecture

### System Overview

```
GitHub (main branch)
    ↓ (git push)
GitHub Actions Workflow
    ↓ (SSH deployment)
TPP VPS (tpp-vps)
    ↓ (PM2 process manager)
Node.js Application
    ↓ (Cloudflare Tunnel)
Public Internet (HTTPS)
```

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Application Server** | Node.js + Express | Main dashboard and API |
| **Process Manager** | PM2 | Process management, clustering, monitoring |
| **Database** | SQLite | Data persistence (3 databases) |
| **Reverse Proxy** | Cloudflare Tunnel | HTTPS termination, security |
| **Deployment** | GitHub Actions | CI/CD automation |
| **Monitoring** | PM2 + Health Checks | Uptime and performance monitoring |

### Server Details

- **Host**: TPP VPS (tpp-vps)
- **User**: avi
- **Path**: `~/projects/seo-expert`
- **Port**: 3000 (internal)
- **Public URL**: https://seodashboard.theprofitplatform.com.au

---

## 🔄 Deployment Workflow

### Automatic Deployment

**Trigger**: Every push to `main` branch

**Process**:
1. Code pushed to `main` branch
2. GitHub Actions workflow triggered (`.github/workflows/deploy-tpp-vps.yml`)
3. Tests run (must pass)
4. Code deployed via SSH to TPP VPS
5. Dependencies installed (`npm ci`)
6. Database backed up
7. PM2 processes restarted
8. Health check performed
9. Cloudflare tunnel verified
10. Deployment summary displayed

**Timeline**: ~2-3 minutes

### Manual Deployment

**Option 1: Via GitHub Actions UI**
```bash
# Go to: https://github.com/Theprofitplatform/seoexpert/actions/workflows/deploy-tpp-vps.yml
# Click "Run workflow" → Select branch "main" → Click "Run workflow"
```

**Option 2: Via SSH**
```bash
# SSH into server
ssh tpp-vps

# Navigate to project
cd ~/projects/seo-expert

# Pull latest code
git pull origin main

# Install dependencies
npm ci --omit=dev --ignore-scripts

# Restart PM2
pm2 restart seo-expert

# Verify
pm2 logs seo-expert --lines 20
curl http://localhost:3000/health
```

**Option 3: Via PM2 Deploy Command**
```bash
# From your local machine
pm2 deploy ecosystem.config.js production
```

---

## 📦 PM2 Configuration

### Services Managed by PM2

**File**: `ecosystem.config.js`

| Service | Instances | Purpose | Schedule |
|---------|-----------|---------|----------|
| **seo-dashboard** | 2 (cluster) | Main dashboard server | Always running |
| **keyword-service** | 1 | Python keyword service | Always running |
| **audit-scheduler** | 1 | Daily SEO audits | Cron: 2 AM daily |
| **rank-tracker** | 1 | Position tracking | Cron: 6 AM daily |
| **local-seo-scheduler** | 1 | Local SEO tasks | Cron: 7 AM daily |
| **email-processor** | 1 | Email queue processor | Cron: Every 15 min |

### PM2 Commands

```bash
# Start all services
pm2 start ecosystem.config.js

# Stop all services
pm2 stop all

# Restart all services
pm2 restart all

# Restart specific service
pm2 restart seo-dashboard

# View logs
pm2 logs
pm2 logs seo-dashboard --lines 50

# Monitor processes
pm2 monit

# View process status
pm2 status
pm2 show seo-dashboard

# Save PM2 configuration (auto-start on reboot)
pm2 save
pm2 startup
```

---

## 🗄️ Database Management

### Database Files

| Database | Path | Purpose | Size |
|----------|------|---------|------|
| **Main** | `database/seo-expert.db` | Core application data | ~50MB |
| **SerpBear** | `serpbear/data/serpbear.db` | Keyword rankings | ~20MB |
| **Keywords** | `keyword-service/keywords.db` | Keyword research | ~10MB |

### Backup Strategy

**Automatic Backups** (during deployment):
```bash
# Database backups created at:
~/backups/seo-expert/database/

# Retention: Last 10 backups kept
# Format: seo-expert-YYYYMMDD-HHMMSS.db
```

**Manual Backup**:
```bash
# Backup all databases
cd ~/projects/seo-expert
mkdir -p ~/backups/manual
cp database/seo-expert.db ~/backups/manual/seo-expert-$(date +%Y%m%d-%H%M%S).db
cp serpbear/data/serpbear.db ~/backups/manual/serpbear-$(date +%Y%m%d-%H%M%S).db
cp keyword-service/keywords.db ~/backups/manual/keywords-$(date +%Y%m%d-%H%M%S).db
```

**Restore from Backup**:
```bash
# Stop services
pm2 stop seo-expert

# Restore database
cp ~/backups/seo-expert/database/seo-expert-TIMESTAMP.db database/seo-expert.db

# Restart services
pm2 restart seo-expert
```

---

## 🔒 Security & Secrets

### GitHub Secrets (Required)

Configure these in GitHub repository settings:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `TPP_VPS_SSH_KEY` | SSH private key for TPP VPS | `-----BEGIN OPENSSH PRIVATE KEY-----` |
| `TPP_VPS_HOST` | VPS hostname | `tpp-vps` |
| `TPP_VPS_USER` | SSH username | `avi` |
| `DISCORD_WEBHOOK_URL` | Optional: Discord notifications | `https://discord.com/api/webhooks/...` |

### Environment Variables

**Server Location**: `~/projects/seo-expert/.env`

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_PATH=./database/seo-expert.db

# JWT Secret (for authentication)
JWT_SECRET=your-secure-secret-here

# WordPress Integration
WORDPRESS_URLS=https://example.com,https://example2.com
WORDPRESS_CREDENTIALS=user:pass,user2:pass2

# Google Search Console (optional)
GSC_CLIENT_ID=your-client-id
GSC_CLIENT_SECRET=your-client-secret

# SerpAPI (optional)
SERPAPI_KEY=your-serpapi-key

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🏥 Health Checks & Monitoring

### Health Check Endpoint

```bash
# Check application health
curl http://localhost:3000/health

# Response (healthy):
{
  "status": "healthy",
  "timestamp": "2025-10-31T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

### Monitoring Commands

```bash
# PM2 process monitoring
pm2 monit

# View resource usage
pm2 show seo-dashboard

# Check logs for errors
pm2 logs seo-expert --err --lines 50

# Check Cloudflare tunnel
sudo systemctl status cloudflared

# Check disk space
df -h

# Check memory usage
free -h
```

### Troubleshooting

**Service Not Responding**:
```bash
# Check if PM2 process is running
pm2 status

# View recent logs
pm2 logs seo-expert --lines 100

# Restart service
pm2 restart seo-expert

# If still failing, check for port conflicts
lsof -i :3000
```

**Database Locked**:
```bash
# Check for hung processes
pm2 status

# Restart all services
pm2 restart all

# Last resort: reboot
sudo reboot
```

**Out of Memory**:
```bash
# Check memory usage
free -h
pm2 show seo-dashboard

# Reduce PM2 instances if needed (ecosystem.config.js)
# Change: instances: 2 → instances: 1
pm2 reload ecosystem.config.js
```

---

## 🚨 Rollback Procedure

### Automatic Rollback

GitHub Actions workflow includes rollback capability:

```bash
# Go to: https://github.com/Theprofitplatform/seoexpert/actions/workflows/deploy-tpp-vps.yml
# Click "Run workflow"
# Select "rollback" job
```

### Manual Rollback

```bash
# SSH into server
ssh tpp-vps

# Navigate to project
cd ~/projects/seo-expert

# Find latest backup
ls -lt ~/backups/seo-expert/backup-*.tar.gz | head -1

# Stop service
pm2 stop seo-expert

# Restore backup
LATEST_BACKUP=$(ls -t ~/backups/seo-expert/backup-*.tar.gz | head -1)
tar -xzf "$LATEST_BACKUP"

# Restore database
LATEST_DB=$(ls -t ~/backups/seo-expert/database/seo-expert-*.db | head -1)
cp "$LATEST_DB" database/seo-expert.db

# Reinstall dependencies
npm ci --omit=dev --ignore-scripts

# Restart service
pm2 restart seo-expert

# Verify
curl http://localhost:3000/health
pm2 logs seo-expert --lines 20
```

---

## 📊 Performance Optimization

### PM2 Cluster Mode

Dashboard runs in cluster mode with 2 instances for load balancing:

```javascript
// ecosystem.config.js
{
  name: 'seo-dashboard',
  instances: 2,           // 2 instances
  exec_mode: 'cluster',   // Cluster mode
  max_memory_restart: '500M'  // Restart if exceeds 500MB
}
```

### Zero-Downtime Restarts

```bash
# Reload (zero downtime)
pm2 reload seo-expert

# vs Restart (brief downtime)
pm2 restart seo-expert
```

### Log Rotation

PM2 automatically rotates logs to prevent disk space issues:

```bash
# Install PM2 log rotation
pm2 install pm2-logrotate

# Configure (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔗 Integration Points

### Cloudflare Tunnel

**Service**: `cloudflared` (systemd service)

```bash
# Check status
sudo systemctl status cloudflared

# Restart tunnel
sudo systemctl restart cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

### SerpBear Integration

**Service**: `serpbear` (subprocess)
**Port**: 3006 (internal)
**Database**: `serpbear/data/serpbear.db`

### Keyword Service Integration

**Service**: `keyword-service` (Python Flask)
**Port**: 5000 (internal)
**Database**: `keyword-service/keywords.db`

---

## 📖 Additional Resources

### Related Documentation

- **Architecture**: `docs/deployment/DEPLOYMENT_ARCHITECTURE.md`
- **Troubleshooting**: `docs/guides/TROUBLESHOOTING.md`
- **API Documentation**: `docs/api/API_V2_DOCUMENTATION.md`

### Useful Links

- **GitHub Actions**: https://github.com/Theprofitplatform/seoexpert/actions
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Cloudflare Tunnel**: https://one.dash.cloudflare.com/

---

## 📝 Deployment Checklist

Before deploying major changes:

- [ ] All tests passing locally (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Database migrations tested
- [ ] Environment variables updated (if needed)
- [ ] Backup created manually (if high-risk change)
- [ ] Team notified of deployment
- [ ] Monitoring ready (watch logs during deployment)
- [ ] Rollback plan prepared

---

## 🆘 Emergency Contacts

**Issues**: Open issue at https://github.com/Theprofitplatform/seoexpert/issues

**Server Access**: Contact VPS administrator for SSH key access

**Cloudflare**: Access via Cloudflare dashboard for tunnel issues

---

**Last Updated**: 2025-10-31
**Deployment Method**: PM2 (Single VPS)
**Status**: Active & Stable ✅
