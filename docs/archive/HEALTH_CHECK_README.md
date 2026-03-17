# 🏥 Health Check System

## Quick Access

- **📘 Quick Start**: See `HEALTH_CHECK_QUICK_START.md` for immediate usage
- **📚 Full Guide**: See `HEALTH_CHECK_GUIDE.md` for complete documentation
- **📋 Implementation**: See `HEALTH_CHECK_IMPLEMENTATION_SUMMARY.md` for technical details

## 3-Minute Quick Start

### Option 1: Dashboard UI ⭐ Recommended
```bash
# Terminal 1
npm start

# Terminal 2
cd dashboard && npm run dev

# Open: http://localhost:5173
# Navigate to: System > Health Check
```

### Option 2: Command Line
```bash
npm run health              # Quick check
npm run health:verbose      # Detailed info
npm run health:watch        # Monitor continuously
```

### Option 3: HTTP API
```bash
curl http://localhost:4000/api/v2/health | jq
```

## What It Does

✅ Monitors all services (API, Dashboard, Database, Redis, etc.)
✅ Tracks system metrics (Memory, CPU, Process)
✅ Real-time auto-refresh every 5 seconds
✅ Color-coded status indicators
✅ Works in dev AND production

## Status Indicators

- 🟢 **HEALTHY** - All systems go
- 🟡 **DEGRADED** - Some optional services down, core works
- 🔴 **UNHEALTHY** - Critical services need attention

## Example Output

```
🏥 SEO Expert Platform - System Health Check

Overall Status: HEALTHY
Environment: development
Uptime: 45 minutes

Critical Services:
  ✅ API Server (5ms)
  ✅ Database (2ms)
  ✅ Dashboard (8ms)
  ✅ File System

Optional Services:
  ✅ Google Search Console
  ⚠️ Redis (not configured)

✅ All systems operational!
Services: 6/8 up
```

## Files

| File | Purpose |
|------|---------|
| `src/monitoring/comprehensive-health.js` | Backend service |
| `dashboard/src/pages/HealthCheckPage.jsx` | Dashboard UI |
| `scripts/health-check.js` | CLI tool |
| `/api/v2/health` | HTTP endpoint |

## Learn More

- **Quick Start**: `HEALTH_CHECK_QUICK_START.md`
- **Full Guide**: `HEALTH_CHECK_GUIDE.md`
- **Technical Details**: `HEALTH_CHECK_IMPLEMENTATION_SUMMARY.md`

---

🚀 **Get Started**: Run `npm run health` to check your system now!
