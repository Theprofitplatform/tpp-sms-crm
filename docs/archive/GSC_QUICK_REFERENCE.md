# 🚀 GSC Production - Quick Reference

## ✅ Status: OPERATIONAL

**Last Verified:** 2025-11-01 13:33 UTC

---

## 🔍 Quick Health Check

```bash
# One-liner production health check
curl -sf https://seodashboard.theprofitplatform.com.au/api/v2/health && echo "✅ OK" || echo "❌ DOWN"
```

---

## 📡 Production Endpoints

| Endpoint | URL |
|----------|-----|
| Health | https://seodashboard.theprofitplatform.com.au/api/v2/health |
| Dashboard | https://seodashboard.theprofitplatform.com.au/api/dashboard |
| Settings | https://seodashboard.theprofitplatform.com.au/api/settings |
| GSC Status | https://seodashboard.theprofitplatform.com.au/api/settings (check `.integrations.gsc`) |

---

## 🔑 Service Account

```
Email: seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com
Project: robotic-goal-456009-r2
Scope: webmasters.readonly
```

### Files on VPS

- Config: `/home/avi/projects/seo-expert/config/google/service-account.json`
- Settings: `/home/avi/projects/seo-expert/data/gsc-settings.json`
- Test Script: `/home/avi/projects/seo-expert/test-gsc.mjs`

---

## 🛠️ Common Commands

### SSH & Check Status

```bash
# SSH into VPS
ssh tpp-vps

# Check PM2
pm2 list

# Check GSC settings
cat /home/avi/projects/seo-expert/data/gsc-settings.json | jq '.connected'

# Test GSC connection
cd /home/avi/projects/seo-expert && node test-gsc.mjs
```

### Restart Services

```bash
# Restart dashboard
pm2 restart seo-dashboard

# Reload without downtime
pm2 reload seo-dashboard

# View logs
pm2 logs seo-dashboard --lines 50
```

### Verify GSC Connection

```bash
# From local machine
curl -sf https://seodashboard.theprofitplatform.com.au/api/settings | \
  jq -r '"GSC Connected: " + (.integrations.gsc.connected|tostring)'

# On VPS
ssh tpp-vps "cd /home/avi/projects/seo-expert && node test-gsc.mjs"
```

---

## 🐛 Quick Troubleshooting

### GSC Not Connected?

```bash
ssh tpp-vps
cd /home/avi/projects/seo-expert

# Check files exist
ls -la data/gsc-settings.json
ls -la config/google/service-account.json

# Test connection
node test-gsc.mjs

# Restart
pm2 restart seo-dashboard
```

### Service Down?

```bash
# Check if running
pm2 list | grep seo-dashboard

# Check port
netstat -tlnp | grep 9000

# Check Cloudflare tunnel
systemctl status cloudflared

# Nuclear option: restart everything
pm2 restart all && sudo systemctl restart cloudflared
```

---

## 📊 Expected Data

**Property:** sc-domain:theprofitplatform.com.au

**Sample Output:**
```json
{
  "keys": ["the profit platform"],
  "clicks": 1,
  "impressions": 7,
  "ctr": 0.142,
  "position": 1.86
}
```

---

## 🔐 Add Service Account to New Property

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select property
3. Settings → Users and permissions
4. Click "Add user"
5. Enter: `seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com`
6. Select: **Owner** or **Full**
7. Click "Add"

---

## 📁 Important Files

### Production VPS (`/home/avi/projects/seo-expert`)

```
config/google/service-account.json   # Google credentials
data/gsc-settings.json               # GSC configuration
data/seo-automation.db               # Analytics database
dashboard-server.js                  # Main application
test-gsc.mjs                         # Connection test
```

### Configuration

```json
// data/gsc-settings.json
{
  "propertyType": "domain",
  "propertyUrl": "theprofitplatform.com.au",
  "clientEmail": "seo-analyst-automation@...",
  "connected": true
}
```

---

## 🔄 PM2 Process Info

```
App: seo-dashboard
Version: 2.0.0
Mode: cluster (2 instances)
Port: 9000
Status: online
Script: dashboard-server.js
```

---

## 🌐 Cloudflare Tunnel

```
Tunnel ID: 3a5acac1-b2a8-40a8-9fc7-0f79c5fe12df

Routes:
- seodashboard.theprofitplatform.com.au → localhost:9000 ✅
- seo-expert.theprofitplatform.com.au   → localhost:3000 ❌
- serpbear.theprofitplatform.com.au     → localhost:3006 ❌
```

---

## ✅ Verification Checklist

- [x] Service account deployed
- [x] GSC settings configured
- [x] Connection tested successfully
- [x] Production endpoints responding
- [x] PM2 processes running
- [x] Cloudflare tunnel active
- [x] Real data retrieved from Google

---

## 📞 Support

**Documentation:** See `GSC_DEPLOYMENT_COMPLETE.md`

**Quick Links:**
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Search Console](https://search.google.com/search-console)
- [PM2 Docs](https://pm2.keymetrics.io/docs/)

---

Last Updated: 2025-11-01
