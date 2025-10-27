# 🔧 Fix Cloudflare Tunnel Configuration

## ✅ Good News!

Everything is working perfectly:
- ✅ All Docker containers running
- ✅ Cloudflare Tunnel connected
- ✅ Dashboard healthy

## 🔴 One Small Configuration Issue

The Cloudflare hostname is configured to route to `http://localhost:9000`, but in Docker, the cloudflared container can't reach other containers via `localhost`.

**Current (wrong)**: `http://localhost:9000`
**Should be**: `http://dashboard:9000`

---

## 🚀 Quick Fix (2 minutes)

### Go to Cloudflare Dashboard

**👉 https://one.dash.cloudflare.com/**

### Navigate to Your Tunnel

1. Click: **Zero Trust** → **Networks** → **Tunnels**
2. Click on your tunnel (you'll see it's connected with 4 connections)
3. Go to **"Public Hostname"** tab
4. Find the entry for: `seodashboard.theprofitplatform.com.au`
5. Click **"Edit"** (pencil icon)

### Update the Configuration

Change:
- **Service Type**: Keep as `HTTP`
- **URL**: Change from `localhost:9000` to `dashboard:9000`

Click **"Save"**

---

## 📸 Visual Guide

### Before:
```
Service: HTTP
URL: localhost:9000  ← This is the problem
```

### After:
```
Service: HTTP
URL: dashboard:9000  ← This will work!
```

---

## ✅ Test After Changing

**Wait 10 seconds** then test:

```bash
curl https://seodashboard.theprofitplatform.com.au/api/v2/health
```

Or open in browser: **https://seodashboard.theprofitplatform.com.au**

---

## 🤔 Why This Fix Works

In Docker networking:
- `localhost` inside a container refers to that specific container only
- `dashboard` is the Docker service name and acts as the hostname
- Containers on the same network can reach each other by service name

So:
- `http://localhost:9000` - cloudflared can't reach this ❌
- `http://dashboard:9000` - cloudflared CAN reach this ✅

---

## 📊 Current Status

**Your Containers** (all healthy):
```
keyword-tracker-cloudflared  ✅ Running & Connected
keyword-tracker-dashboard    ✅ Healthy (port 9000)
keyword-tracker-db           ✅ Running
keyword-tracker-service      ✅ Running
keyword-tracker-sync         ✅ Running (restarting due to DB sync)
```

**Cloudflare Tunnel** (connected):
```
✅ 4 tunnel connections established
✅ Configuration loaded
✅ Routing: seodashboard.theprofitplatform.com.au
❌ Target: localhost:9000 (needs to be dashboard:9000)
```

---

## ⏱️ Time Estimate

- Navigate to Cloudflare: 30 seconds
- Find tunnel & hostname: 30 seconds
- Edit configuration: 30 seconds
- Test: 30 seconds

**Total**: 2 minutes

---

## 🎯 Alternative Quick Test

If you want to verify the dashboard is working internally:

```bash
ssh avi@31.97.222.218
curl http://localhost:9000/api/v2/health
```

This should return a healthy response, confirming the dashboard itself is working fine - it's just the Cloudflare routing that needs the fix.

---

**Ready?** Go to Cloudflare and change `localhost:9000` to `dashboard:9000`!

Then test: **https://seodashboard.theprofitplatform.com.au** 🚀
