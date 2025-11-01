# 🚀 VPS Deployment Guide - SEO Expert Platform

**VPS IP**: 31.97.222.218
**Domain**: seodashboard.theprofitplatform.com.au
**Cloudflare Tunnel**: tpp-backend (3a5acac1-b2a8-40a8-9fc7-0f79c5fe12df)

---

## 📋 Current Status

### ✅ Local Development
- Dashboard running on localhost:9000
- All 21 tests passing
- Health endpoint working: http://localhost:9000/api/v2/health

### ⚠️ Production VPS
- Cloudflare Tunnel configured but not routing to dashboard (502 error)
- Need to deploy code and start PM2 on VPS

---

## 🚀 Deployment Steps

### 1. Connect to VPS

```bash
ssh avi@31.97.222.218
```

### 2. Navigate to Project Directory

```bash
# Assuming project is in /var/www/seo-expert
# If not, clone the repository first
cd /var/www/seo-expert

# Or clone if needed:
# git clone <your-repo-url> /var/www/seo-expert
# cd /var/www/seo-expert
```

### 3. Pull Latest Code

```bash
git fetch --all
git checkout main
git pull origin main
```

### 4. Install Dependencies

```bash
# Root dependencies
npm ci --omit=dev

# Dashboard dependencies
cd dashboard
npm ci --omit=dev
cd ..
```

### 5. Build Dashboard

```bash
cd dashboard
npm run build
cd ..
```

### 6. Set Up Environment Variables

```bash
# Create .env file (if not exists)
nano .env

# Add required variables:
NODE_ENV=production
PORT=9000

# Optional: For AI schema generation
# ANTHROPIC_API_KEY=your_key_here
```

### 7. Start with PM2

```bash
# Start the dashboard
npx pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
npx pm2 save

# Set up PM2 to start on boot (run the command it outputs)
npx pm2 startup
# Copy and run the sudo command it shows
```

### 8. Set Up Log Rotation

```bash
# Install PM2 log rotation
npx pm2 install pm2-logrotate

# Configure
npx pm2 set pm2-logrotate:max_size 10M
npx pm2 set pm2-logrotate:retain 30
npx pm2 set pm2-logrotate:compress true
```

### 9. Set Up Automated Backups

```bash
# Make backup script executable
chmod +x scripts/backup-database.js

# Test backup
node scripts/backup-database.js

# Set up cron job (runs daily at 2 AM)
chmod +x scripts/setup-backup-cron.sh
./scripts/setup-backup-cron.sh
```

### 10. Verify Cloudflare Tunnel

```bash
# Check if cloudflared is running
sudo systemctl status cloudflared

# Check tunnel configuration
sudo journalctl -u cloudflared --no-pager | tail -20

# If not configured, use the GitHub Actions workflow or update manually
```

### 11. Test Deployment

```bash
# Test local endpoint
curl http://localhost:9000/api/v2/health

# Should return:
# {"success":true,"version":"2.0.0","timestamp":"...","uptime":...}

# Test public endpoint (from your local machine)
curl https://seodashboard.theprofitplatform.com.au/api/v2/health
```

---

## 🔧 Cloudflare Tunnel Configuration

### Option A: Use GitHub Actions Workflow (Recommended)

1. Go to your GitHub repository
2. Navigate to: Actions → "Update Cloudflare Tunnel Configuration"
3. Click "Run workflow"
4. Wait ~2 minutes for completion
5. Test: `curl https://seodashboard.theprofitplatform.com.au/api/v2/health`

### Option B: Manual Configuration via Cloudflare Dashboard

1. Go to: https://one.dash.cloudflare.com
2. Navigate to: Zero Trust → Access → Tunnels
3. Find tunnel: tpp-backend (3a5acac1-b2a8-40a8-9fc7-0f79c5fe12df)
4. Add route:
   - Subdomain: seodashboard
   - Domain: theprofitplatform.com.au
   - Service: http://localhost:9000
5. Save and wait for propagation (~2 minutes)

### Option C: Manual Configuration via CLI (On VPS)

```bash
# SSH to VPS
ssh avi@31.97.222.218

# Update tunnel configuration
# (Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN)

# Restart cloudflared to pick up changes
sudo systemctl restart cloudflared

# Verify
curl https://seodashboard.theprofitplatform.com.au/api/v2/health
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] PM2 process running: `npx pm2 status`
- [ ] Health endpoint local: `curl http://localhost:9000/api/v2/health`
- [ ] Health endpoint public: `curl https://seodashboard.theprofitplatform.com.au/api/v2/health`
- [ ] Dashboard UI accessible: https://seodashboard.theprofitplatform.com.au
- [ ] Cloudflared running: `sudo systemctl status cloudflared`
- [ ] Logs rotating: `npx pm2 logs --lines 10`
- [ ] Backups scheduled: `crontab -l | grep backup`
- [ ] Database exists: `ls -lh data/seo-automation.db`

---

## 🔍 Troubleshooting

### Issue: 502 Bad Gateway on Public URL

**Cause**: Cloudflare Tunnel not routing to localhost:9000

**Fix**:
```bash
# Check if PM2 is running on VPS
npx pm2 status

# Check if cloudflared is running
sudo systemctl status cloudflared

# Restart cloudflared
sudo systemctl restart cloudflared

# Check tunnel logs
sudo journalctl -u cloudflared -f
```

### Issue: PM2 Process Not Starting

**Cause**: Port 9000 already in use or dependency issues

**Fix**:
```bash
# Check what's using port 9000
lsof -i :9000

# Kill if needed
kill -9 <PID>

# Restart PM2
npx pm2 delete all
npx pm2 start ecosystem.config.cjs --env production
```

### Issue: Dashboard Returns 404 for Otto Routes

**Cause**: Old code version without Otto route fix

**Fix**:
```bash
# Pull latest code
git pull origin main

# Rebuild dashboard
cd dashboard && npm run build && cd ..

# Restart PM2
npx pm2 restart all
```

---

## 📊 Monitoring Commands

```bash
# View PM2 status
npx pm2 status

# View logs (real-time)
npx pm2 logs seo-dashboard

# View last 100 log lines
npx pm2 logs seo-dashboard --lines 100

# Monitor resources
npx pm2 monit

# Check health
curl http://localhost:9000/api/v2/health
curl https://seodashboard.theprofitplatform.com.au/api/v2/health

# View backups
ls -lh backups/database/

# Test backup
node scripts/backup-database.js
```

---

## 🔄 Update Deployment (Future Updates)

```bash
# SSH to VPS
ssh avi@31.97.222.218
cd /var/www/seo-expert

# Pull latest code
git pull origin main

# Install dependencies
npm ci --omit=dev
cd dashboard && npm ci --omit=dev && npm run build && cd ..

# Reload PM2 (zero downtime)
npx pm2 reload ecosystem.config.cjs --env production

# Verify
curl http://localhost:9000/api/v2/health
```

---

## 🆘 Emergency Rollback

```bash
# If deployment fails, rollback to previous version
git log --oneline -5  # Find previous commit hash
git checkout <previous-commit-hash>

# Rebuild
npm ci --omit=dev
cd dashboard && npm ci --omit=dev && npm run build && cd ..

# Restart
npx pm2 restart all
```

---

## 📞 Quick Reference

| Service | Command | Expected Output |
|---------|---------|-----------------|
| PM2 Status | `npx pm2 status` | seo-dashboard: online |
| Health Check | `curl localhost:9000/api/v2/health` | HTTP 200, JSON response |
| Public URL | `curl https://seodashboard.theprofitplatform.com.au/api/v2/health` | HTTP 200, JSON response |
| Cloudflared | `sudo systemctl status cloudflared` | active (running) |
| Logs | `npx pm2 logs --lines 20` | Recent log entries |
| Backups | `ls backups/database/` | *.db.gz files |

---

## 🎯 Next Steps After Deployment

1. Set up external monitoring (UptimeRobot)
2. Configure alerts for downtime
3. Test Otto features in production
4. Create operational runbook
5. Schedule weekly backup restore tests

---

**Last Updated**: 2025-11-01
