# 🚀 START DEPLOYMENT - Manual Review System

**Production deployment guide for the Manual Review System**

---

## ⚡ FASTEST: Automated Deployment

```bash
# Make script executable
chmod +x deploy-manual-review.sh

# Run deployment
./deploy-manual-review.sh
```

This automated script will:
1. ✅ Run pre-flight checks
2. ✅ Setup environment
3. ✅ Install PM2
4. ✅ Deploy application
5. ✅ Verify deployment
6. ✅ Show management commands

**Estimated time:** 15 minutes (mostly waiting for GitHub Actions)

---

## 📋 MANUAL: Step-by-Step

### Step 1: Deploy via GitHub Actions (10 min)

1. Go to: **https://github.com/Theprofitplatform/seoexpert/actions**
2. Click: **"Deploy to VPS"** workflow
3. Click: **"Run workflow"** button
4. Select: **production**
5. Click: **"Run workflow"** green button
6. Wait for: ✅ Green checkmark

### Step 2: Run Migration (1 min)

```bash
ssh avi@31.97.222.218 "cd /var/www/seo-expert && node scripts/migrate-pixel-enhancements.js"
```

Expected output:
```
✅ seo_issues table created
✅ pixel_analytics table created
✅ pixel_health table created
```

### Step 3: Verify (3 min)

```bash
bash verify-pixel-enhancements.sh
```

Expected: **11/11 tests passing**

---

## ✅ What Gets Deployed

- **Advanced SEO Issue Detector** (20+ issue types)
- **Real-time Analytics** (daily metrics, trends)
- **Health Monitoring** (24/7 uptime tracking)
- **11 New API Endpoints** (issue management, analytics)
- **3 Database Tables** (seo_issues, pixel_analytics, pixel_health)
- **UI Components** (already built and ready)

---

## 📊 Post-Deployment

### Verify It Worked

```bash
# Test health endpoint
curl https://seodashboard.theprofitplatform.com.au/api/v2/health

# Run full health check
bash scripts/production-health-check.sh
```

### Monitor Logs

```bash
ssh avi@31.97.222.218 "npx pm2 logs seo-dashboard --lines 50"
```

### Check PM2 Status

```bash
ssh avi@31.97.222.218 "npx pm2 status"
```

---

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| **GitHub Actions** | https://github.com/Theprofitplatform/seoexpert/actions |
| **Production Dashboard** | https://seodashboard.theprofitplatform.com.au |
| **Health Check** | https://seodashboard.theprofitplatform.com.au/api/v2/health |
| **API Documentation** | https://seodashboard.theprofitplatform.com.au/api/v2 |

---

## 📚 Documentation

- **Complete Guide:** `PIXEL_ENHANCEMENTS_DEPLOY.md` (800+ lines)
- **Platform Overview:** `PLATFORM_STATUS.md`
- **Session Summary:** `PIXEL_ENHANCEMENTS_SUMMARY.md`
- **This Guide:** `START_DEPLOYMENT.md` (you are here)

---

## 🆘 If Something Goes Wrong

### Rollback Plan

```bash
ssh avi@31.97.222.218
cd /var/www/seo-expert
git reset --hard cbcd0fb
npx pm2 restart seo-dashboard
```

### Check Logs

```bash
ssh avi@31.97.222.218 "npx pm2 logs seo-dashboard --err --lines 100"
```

### Get Help

1. Check `PIXEL_ENHANCEMENTS_DEPLOY.md` troubleshooting section
2. Run `bash scripts/production-health-check.sh`
3. Review PM2 logs for errors

---

## 🎯 Ready?

**Option 1 (Fastest):** Run `bash one-click-deploy.sh`

**Option 2 (Manual):** Follow steps above

---

**Everything is tested, documented, and ready to go! 🚀**

