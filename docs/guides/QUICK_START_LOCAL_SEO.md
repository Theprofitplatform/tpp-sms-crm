# Quick Start Guide - Local SEO Platform V3.1

**Get up and running in 5 minutes!**

---

## 🚀 Start the System

### 1. Start Backend Server

```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
node dashboard-server.js
```

**Expected Output:**
```
✅ Server running at: http://localhost:9000
✅ Local SEO: 11 modules + scheduler + notifications
✅ Local SEO Scheduler: Automated audits ready
```

### 2. Start Frontend (Optional - New Terminal)

```bash
cd dashboard
npm run dev
```

**Access:** http://localhost:5173

---

## 🎯 Common Tasks

### Run a Basic Audit

```bash
# Start audit (runs in background)
curl -X POST http://localhost:9000/api/local-seo/audit/instantautotraders

# Wait 15 seconds, then get report
sleep 15
curl http://localhost:9000/api/local-seo/report/instantautotraders | jq '.'
```

### Run Advanced Audit (All Features)

```bash
# Start advanced audit
curl -X POST http://localhost:9000/api/local-seo/audit-advanced/instantautotraders

# Wait 30 seconds, then get report
sleep 30
curl http://localhost:9000/api/local-seo/report/instantautotraders | jq '.report.score'
```

### Get All Client Scores

```bash
curl http://localhost:9000/api/local-seo/scores | jq '.clients[] | {id, score, lastRun}'
```

### Bulk Audit Multiple Clients

```bash
curl -X POST http://localhost:9000/api/local-seo/bulk-audit \
  -H "Content-Type: application/json" \
  -d '{"clientIds": ["instantautotraders", "hottyres"], "advanced": false}'
```

---

## 📅 Schedule Automated Audits

### Daily Audit at 2:00 AM

```bash
curl -X POST http://localhost:9000/api/local-seo/schedule/instantautotraders \
  -H "Content-Type: application/json" \
  -d '{"frequency": "daily", "hour": 2, "minute": 0}'
```

### Weekly Audit (Monday at 3:00 AM)

```bash
curl -X POST http://localhost:9000/api/local-seo/schedule/hottyres \
  -H "Content-Type: application/json" \
  -d '{"frequency": "weekly", "hour": 3, "minute": 0, "dayOfWeek": 1}'
```

### View Scheduled Jobs

```bash
curl http://localhost:9000/api/local-seo/schedule | jq '.jobs'
```

### Unschedule Audits

```bash
# Unschedule specific frequency
curl -X DELETE "http://localhost:9000/api/local-seo/schedule/instantautotraders?frequency=daily"

# Unschedule all
curl -X DELETE http://localhost:9000/api/local-seo/schedule/instantautotraders
```

---

## 📊 Check Status & Statistics

### Scheduler Statistics

```bash
curl http://localhost:9000/api/local-seo/schedule/stats | jq '.statistics'
```

### Historical Trends (Last 30 Days)

```bash
curl "http://localhost:9000/api/local-seo/history/instantautotraders?days=30" | jq '.data.trends'
```

### Keyword Positions

```bash
curl http://localhost:9000/api/local-seo/keywords/instantautotraders | jq '.data.summary'
```

### Social Media Audit

```bash
curl http://localhost:9000/api/local-seo/social/instantautotraders | jq '.data.summary'
```

### GMB Optimization Score

```bash
curl http://localhost:9000/api/local-seo/gmb/instantautotraders | jq '.data.overallScore'
```

---

## 📁 Find Your Data

### Audit Reports
```bash
ls -lh "logs/local-seo/instantautotraders/"
```

### Notification Logs
```bash
ls -lh "logs/notifications/"
cat "logs/notifications/notifications-$(date +%Y-%m-%d).json"
```

### Historical Database
```bash
sqlite3 data/local-seo-history.db "SELECT * FROM metrics LIMIT 5;"
```

---

## 🔧 Troubleshooting

### Server Not Starting?

```bash
# Check if port is in use
netstat -tlnp | grep 9000

# Kill existing process
pkill -9 -f dashboard-server

# Restart
node dashboard-server.js
```

### Audits Not Completing?

```bash
# Check server logs
tail -f dashboard-server.log | grep "Local SEO"

# Verify client exists
curl http://localhost:9000/api/clients | jq '.clients[] | .id'
```

### Schedule Not Running?

```bash
# Check scheduled jobs
curl http://localhost:9000/api/local-seo/schedule

# Check scheduler stats
curl http://localhost:9000/api/local-seo/schedule/stats
```

---

## 🎓 Learn More

- **Complete Guide:** `LOCAL_SEO_V3_COMPLETE.md`
- **API Reference:** `LOCAL_SEO_API_REFERENCE.md`
- **Automation Guide:** `LOCAL_SEO_AUTOMATION_GUIDE.md`
- **Full Documentation:** `COMPLETE_SYSTEM_SUMMARY.md`

---

## 💡 Pro Tips

### 1. Test Before Production
```bash
# Run manual audit first to verify
curl -X POST http://localhost:9000/api/local-seo/audit/yourclient
```

### 2. Monitor First Week
```bash
# Check scheduler stats daily
curl http://localhost:9000/api/local-seo/schedule/stats
```

### 3. Stagger Schedule Times
```bash
# Don't schedule all at same time
# Client 1: 2:00 AM
# Client 2: 2:15 AM
# Client 3: 2:30 AM
```

### 4. Check Notifications
```bash
# Review notification logs
tail -f logs/notifications/notifications-*.json
```

---

## ✅ Quick Checklist

- [ ] Server running on port 9000
- [ ] Run test audit manually
- [ ] Schedule automated audits
- [ ] Verify notifications logging
- [ ] Check audit reports in logs/
- [ ] Monitor scheduler stats

---

**Status:** 🚀 Ready to use!  
**Support:** See documentation files for details  
**Version:** 3.1 Enterprise Edition
