# 🚀 Quick Deployment Reference Card

**Save this for quick reference during deployment**

---

## ✅ Step 1: Add SSH Key to GitHub (2 min)

```bash
# Get your SSH key:
./scripts/get-ssh-key-for-github.sh
```

**Then:**
1. Go to: https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions
2. Click "New repository secret"
3. Name: `VPS_SSH_KEY`
4. Value: (paste SSH key)
5. Click "Add secret"

---

## ✅ Step 2: Deploy via GitHub Actions (10 min)

1. Go to: https://github.com/Theprofitplatform/seoexpert/actions
2. Click "Deploy to VPS" workflow
3. Click "Run workflow" button
4. Select environment: `production`
5. Click "Run workflow"
6. Wait for green ✅ (10 minutes)

---

## ✅ Step 3: Verify Deployment (2 min)

```bash
# Run verification script:
./scripts/verify-deployment.sh

# Or test manually:
curl https://seodashboard.theprofitplatform.com.au/api/v2/health
```

**Expected:** `{"success":true,"version":"2.0.0",...}`

---

## 🆘 Troubleshooting

### 502 Error on Public URL

```bash
# Cloudflare Tunnel needs updating
# Go to GitHub Actions and run:
"Update Cloudflare Tunnel Configuration" workflow
```

### Check PM2 Status

```bash
ssh avi@31.97.222.218 "npx pm2 status"
```

### View Logs

```bash
ssh avi@31.97.222.218 "npx pm2 logs seo-dashboard --lines 50"
```

### Restart Service

```bash
ssh avi@31.97.222.218 "npx pm2 restart seo-dashboard"
```

---

## 📊 Success Criteria

✅ GitHub Actions shows green checkmark
✅ Health endpoint returns HTTP 200
✅ Dashboard loads in browser
✅ PM2 shows "online" status
✅ No errors in logs

---

## 🔗 Quick Links

| Link | URL |
|------|-----|
| GitHub Actions | https://github.com/Theprofitplatform/seoexpert/actions |
| GitHub Secrets | https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions |
| Dashboard | https://seodashboard.theprofitplatform.com.au |
| Health Check | https://seodashboard.theprofitplatform.com.au/api/v2/health |
| Cloudflare | https://one.dash.cloudflare.com |

---

## 📞 Emergency Commands

```bash
# Check everything at once
ssh avi@31.97.222.218 "npx pm2 status && curl http://localhost:9000/api/v2/health"

# Full restart
ssh avi@31.97.222.218 "cd /var/www/seo-expert && npx pm2 restart seo-dashboard"

# View recent errors
ssh avi@31.97.222.218 "npx pm2 logs seo-dashboard --err --lines 20"
```

---

**Print this or keep it open during deployment!**
