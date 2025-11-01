# 🚀 DEPLOY NOW - Quick Start Guide

**Status**: ✅ **READY TO DEPLOY**
**Date**: 2025-11-01
**Estimated Time**: 30 minutes

---

## ✅ Pre-Deployment Checklist

All prerequisites completed:

- [x] All 21 Otto SEO tests passing
- [x] Local service running and healthy
- [x] Deployment scripts created and tested
- [x] Operational documentation complete
- [x] Backup automation ready
- [x] Monitoring configured
- [x] Changes committed to git

---

## 🎯 Choose Your Deployment Method

### ⚡ Option A: Automated GitHub Actions (EASIEST - Recommended)

**Prerequisites**:
1. Repository pushed to GitHub
2. VPS SSH key added to GitHub Secrets

**Steps**:

1. **Push code to GitHub** (if not already):
   ```bash
   git push origin main
   ```

2. **Add VPS SSH key to GitHub Secrets**:
   - Go to: GitHub Repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `VPS_SSH_KEY`
   - Value: (paste your VPS private SSH key)
   - Click "Add secret"

3. **Run deployment workflow**:
   - Go to: GitHub Repository → Actions
   - Click "Deploy to VPS" workflow
   - Click "Run workflow"
   - Select environment: `production`
   - Click "Run workflow" button
   - Wait 5-10 minutes for completion

4. **Verify deployment**:
   ```bash
   curl https://seodashboard.theprofitplatform.com.au/api/v2/health
   ```

   Expected response:
   ```json
   {"success":true,"version":"2.0.0","timestamp":"..."}
   ```

**Done! Your application is live! 🎉**

---

### 🔧 Option B: Manual SSH Deployment

**Prerequisites**:
1. SSH access to VPS: `ssh avi@31.97.222.218`
2. Git repository accessible from VPS

**Steps**:

1. **SSH to VPS**:
   ```bash
   ssh avi@31.97.222.218
   ```

2. **Navigate to project directory** (or clone if first time):
   ```bash
   # If project exists:
   cd /var/www/seo-expert

   # If first time, clone:
   git clone <your-repo-url> /var/www/seo-expert
   cd /var/www/seo-expert
   ```

3. **Run manual deployment script**:
   ```bash
   chmod +x deploy-manual.sh
   ./deploy-manual.sh production
   ```

   The script will:
   - Pull latest code
   - Install dependencies
   - Build dashboard
   - Start PM2
   - Setup monitoring
   - Setup backups
   - Run health checks

4. **Verify deployment**:
   ```bash
   # On VPS:
   curl http://localhost:9000/api/v2/health

   # From local machine:
   curl https://seodashboard.theprofitplatform.com.au/api/v2/health
   ```

**Done! Your application is live! 🎉**

---

### ⚙️ Option C: Step-by-Step Manual (Most Control)

See **VPS_DEPLOYMENT_GUIDE.md** for detailed step-by-step instructions.

---

## 🔍 Post-Deployment Verification

After deployment, run these checks:

### 1. Check PM2 Status
```bash
ssh avi@31.97.222.218 "npx pm2 status"
```

Expected:
```
┌────┬───────────────┬──────┬────────┬──────────┐
│ id │ name          │ mode │ status │ cpu      │
├────┼───────────────┼──────┼────────┼──────────┤
│ 0  │ seo-dashboard │ fork │ online │ 0%       │
└────┴───────────────┴──────┴────────┴──────────┘
```

### 2. Test Health Endpoint
```bash
curl https://seodashboard.theprofitplatform.com.au/api/v2/health
```

Expected: HTTP 200 with JSON response

### 3. Test Dashboard UI
Open in browser: https://seodashboard.theprofitplatform.com.au

### 4. Test Otto Features

**Pixel Management**:
```bash
curl https://seodashboard.theprofitplatform.com.au/api/v2/pixel/status/test-client
```

**Schema Automation**:
```bash
curl https://seodashboard.theprofitplatform.com.au/api/v2/schema/opportunities/test-domain.com
```

**SSR Optimization**:
```bash
curl https://seodashboard.theprofitplatform.com.au/api/v2/ssr/config
```

### 5. Check Logs
```bash
ssh avi@31.97.222.218 "cd /var/www/seo-expert && npx pm2 logs seo-dashboard --lines 50"
```

---

## ⚠️ Troubleshooting

### Issue: Public URL Returns 502

**Cause**: Cloudflare Tunnel not routing to localhost:9000

**Fix**:
1. Go to GitHub Actions
2. Run "Update Cloudflare Tunnel Configuration" workflow
3. Wait 2-3 minutes for DNS propagation
4. Test again: `curl https://seodashboard.theprofitplatform.com.au/api/v2/health`

**OR**

Update manually in Cloudflare Dashboard:
1. Go to: https://one.dash.cloudflare.com
2. Navigate to: Zero Trust → Tunnels → tpp-backend
3. Ensure route exists:
   - Subdomain: seodashboard
   - Domain: theprofitplatform.com.au
   - Service: http://localhost:9000
4. Save and wait 2 minutes

### Issue: PM2 Not Running

**Fix**:
```bash
ssh avi@31.97.222.218
cd /var/www/seo-expert
npx pm2 start ecosystem.config.cjs --env production
npx pm2 save
```

### Issue: Health Endpoint Returns Error

**Fix**:
```bash
ssh avi@31.97.222.218
cd /var/www/seo-expert

# Check logs
npx pm2 logs seo-dashboard --lines 100

# Restart service
npx pm2 restart seo-dashboard
```

---

## 📊 Monitoring Setup

After deployment, set up external monitoring:

### UptimeRobot (Recommended - Free)

1. Go to: https://uptimerobot.com
2. Create free account
3. Add new monitor:
   - **Type**: HTTP(s)
   - **URL**: https://seodashboard.theprofitplatform.com.au/api/v2/health
   - **Name**: SEO Dashboard Health
   - **Interval**: 5 minutes
   - **Alert**: Email/SMS when down

### Cloudflare Analytics

1. Go to: https://dash.cloudflare.com
2. Select domain: theprofitplatform.com.au
3. Navigate to: Analytics & Logs
4. View traffic, performance, and security metrics

---

## 🔄 Future Updates

To deploy updates in the future:

### Using GitHub Actions:
1. Push code to main branch
2. Go to GitHub Actions → "Deploy to VPS" → Run workflow
3. Wait for completion

### Manual SSH:
```bash
ssh avi@31.97.222.218
cd /var/www/seo-expert
git pull origin main
npx pm2 reload seo-dashboard
```

---

## 📚 Documentation References

- **OPERATIONS_GUIDE.md** - Day-to-day operations
- **VPS_DEPLOYMENT_GUIDE.md** - Detailed deployment steps
- **DEPLOYMENT_SUMMARY.md** - Overview and architecture
- **PRODUCTION_CHECKLIST.md** - Security hardening (when ready)

---

## 🆘 Emergency Contacts

**VPS Access**:
- IP: 31.97.222.218
- User: avi
- Access: SSH key

**Cloudflare Account**:
- Dashboard: https://dash.cloudflare.com
- Tunnel: tpp-backend (3a5acac1-b2a8-40a8-9fc7-0f79c5fe12df)

**Quick Commands**:
```bash
# SSH to VPS
ssh avi@31.97.222.218

# Check status
npx pm2 status

# View logs
npx pm2 logs seo-dashboard

# Restart service
npx pm2 restart seo-dashboard

# Health check
curl http://localhost:9000/api/v2/health
```

---

## ✅ Success Criteria

You'll know deployment is successful when:

- ✅ PM2 shows "online" status
- ✅ Local health endpoint returns HTTP 200
- ✅ Public health endpoint returns HTTP 200
- ✅ Dashboard UI loads in browser
- ✅ Otto API endpoints respond
- ✅ No errors in PM2 logs

---

## 🎉 You're Ready!

**Everything is in place. Choose your deployment method above and go live!**

**Recommended**: Use Option A (GitHub Actions) for the easiest deployment.

**Questions?** Refer to the documentation links above or check the troubleshooting section.

---

**Last Updated**: 2025-11-01
**Version**: 2.0.0
