# Troubleshooting 502 Bad Gateway Error

**Error**: Bad gateway Error code 502
**URL**: https://seodashboard.theprofitplatform.com.au
**Date**: 2025-10-31

---

## 🔍 What 502 Means

**502 Bad Gateway** = Cloudflare can reach your server, but your application isn't responding.

**Possible Causes**:
1. ❌ PM2 process is stopped/crashed
2. ❌ Application is listening on wrong port
3. ❌ Cloudflare tunnel is down
4. ❌ Cloudflare tunnel pointing to wrong port
5. ❌ Database locked or corrupted
6. ❌ Out of memory (process killed)

---

## 🚨 Quick Diagnostic

Run this command to get full diagnosis:

```bash
ssh tpp-vps << 'DIAGNOSTIC'
  echo "================================"
  echo "502 ERROR DIAGNOSTIC"
  echo "================================"

  echo -e "\n1️⃣ PM2 PROCESS STATUS:"
  pm2 list

  echo -e "\n2️⃣ PM2 LOGS (Last 20 lines):"
  pm2 logs --nostream --lines 20

  echo -e "\n3️⃣ APPLICATION HEALTH CHECK:"
  curl -v http://localhost:3000/health 2>&1 | grep -E "Connected|HTTP|status"

  echo -e "\n4️⃣ CHECK PORTS:"
  sudo lsof -i :3000 || echo "Port 3000 not in use"
  sudo lsof -i :9000 || echo "Port 9000 not in use"

  echo -e "\n5️⃣ CLOUDFLARE TUNNEL STATUS:"
  sudo systemctl status cloudflared --no-pager | grep -A 5 "Active"

  echo -e "\n6️⃣ CLOUDFLARE TUNNEL LOGS:"
  sudo journalctl -u cloudflared --no-pager --lines 10

  echo -e "\n7️⃣ MEMORY USAGE:"
  free -h

  echo -e "\n8️⃣ DISK SPACE:"
  df -h /home

  echo -e "\n================================"
  echo "DIAGNOSTIC COMPLETE"
  echo "================================"
DIAGNOSTIC
```

---

## 🔧 Fix #1: Restart Everything

```bash
ssh tpp-vps << 'FIX1'
  echo "🔄 Restarting all services..."

  # Stop everything
  pm2 stop all
  sudo systemctl stop cloudflared

  # Wait a bit
  sleep 3

  # Start PM2 services
  cd ~/projects/seo-expert
  pm2 start ecosystem.config.js
  pm2 save

  # Start Cloudflare tunnel
  sudo systemctl start cloudflared

  # Wait for services to start
  sleep 10

  echo "✅ Services restarted"

  # Test
  echo "🧪 Testing..."
  curl -sf http://localhost:3000/health && echo "✅ App is responding!" || echo "❌ App still down"

  sudo systemctl is-active cloudflared && echo "✅ Cloudflare tunnel is running!" || echo "❌ Tunnel still down"
FIX1
```

---

## 🔧 Fix #2: Check Application Port

Your app should be on port **3000** or **9000**. Let's verify:

```bash
ssh tpp-vps << 'FIX2'
  echo "📍 Checking application configuration..."

  cd ~/projects/seo-expert

  # Check .env file
  if [ -f .env ]; then
    echo "PORT from .env:"
    grep "^PORT=" .env || echo "PORT not set in .env"
  else
    echo "⚠️  No .env file found"
  fi

  # Check ecosystem.config.js
  echo -e "\nPORT from ecosystem.config.js:"
  grep "PORT" ecosystem.config.js | head -5

  # Check what's actually listening
  echo -e "\nPorts in use:"
  sudo netstat -tlnp | grep node || echo "No node processes listening"
FIX2
```

**Expected**: Port should be **3000** or **9000**

If wrong port, fix it:

```bash
ssh tpp-vps << 'FIX_PORT'
  cd ~/projects/seo-expert

  # Update .env
  echo "PORT=3000" >> .env

  # Restart
  pm2 restart all

  sleep 5

  # Test
  curl -sf http://localhost:3000/health && echo "✅ Working on port 3000!"
FIX_PORT
```

---

## 🔧 Fix #3: Check Cloudflare Tunnel Configuration

Cloudflare tunnel should point to `localhost:3000` (or 9000).

```bash
ssh tpp-vps << 'FIX3'
  echo "🔍 Checking Cloudflare tunnel config..."

  # Find cloudflared config
  if [ -f /etc/cloudflared/config.yml ]; then
    echo "Config file: /etc/cloudflared/config.yml"
    sudo cat /etc/cloudflared/config.yml | grep -A 5 "ingress"
  else
    echo "⚠️  No config file found (might be using token-based setup)"
  fi

  # Check environment
  echo -e "\n🔐 Cloudflare tunnel token:"
  sudo systemctl cat cloudflared | grep "TUNNEL_TOKEN" || echo "No token found"

  # Check logs for connection info
  echo -e "\n📋 Recent tunnel logs:"
  sudo journalctl -u cloudflared --no-pager --lines 20 | grep -E "Started|Registered|ingress|localhost"
FIX3
```

**What to look for**:
- `ingress` should point to `http://localhost:3000`
- Or tunnel token should be correct

**If wrong, update in Cloudflare Dashboard**:
1. Go to: https://one.dash.cloudflare.com/
2. Navigate to **Zero Trust** → **Access** → **Tunnels**
3. Find your tunnel: `seodashboard.theprofitplatform.com.au`
4. Edit **Public Hostname**
5. Verify: **Service** = `http://localhost:3000`

---

## 🔧 Fix #4: Database Issues

If database is locked, app won't start:

```bash
ssh tpp-vps << 'FIX4'
  cd ~/projects/seo-expert

  echo "🗄️ Checking databases..."

  # Check if databases exist
  ls -lh database/*.db 2>/dev/null || echo "No databases found in database/"

  # Check for lock files
  echo -e "\n🔒 Checking for lock files:"
  find . -name "*.db-*" -o -name "*.lock" 2>/dev/null || echo "No lock files"

  # Try to access main database
  echo -e "\n🧪 Testing database access:"
  sqlite3 database/seo-expert.db "SELECT COUNT(*) FROM sqlite_master;" 2>&1 || echo "Database access failed"

  # If locked, remove lock files
  if [ $? -ne 0 ]; then
    echo "⚠️  Database might be locked, removing lock files..."
    find . -name "*.db-shm" -delete
    find . -name "*.db-wal" -delete
    echo "✅ Lock files removed"
  fi
FIX4
```

---

## 🔧 Fix #5: Check Application Logs

See what error the app is throwing:

```bash
ssh tpp-vps << 'FIX5'
  cd ~/projects/seo-expert

  echo "📋 PM2 Error Logs:"
  pm2 logs --err --lines 50 --nostream

  echo -e "\n📋 Application Log Files:"
  tail -n 50 logs/*.log 2>/dev/null | head -100
FIX5
```

Common errors:
- `EADDRINUSE` → Port already in use (kill old process)
- `ECONNREFUSED` → Database not accessible
- `MODULE_NOT_FOUND` → Dependencies not installed

---

## 🔧 Fix #6: Nuclear Option (Full Reset)

If nothing works, full reset:

```bash
ssh tpp-vps << 'NUCLEAR'
  cd ~/projects/seo-expert

  echo "🔥 NUCLEAR RESET - Full service restart..."

  # Stop everything
  pm2 delete all || true
  pm2 kill
  sudo systemctl stop cloudflared

  # Clean up
  rm -f database/*.db-shm database/*.db-wal
  rm -f *.log

  # Pull latest code
  git fetch origin
  git reset --hard origin/main

  # Reinstall dependencies
  npm ci --omit=dev --ignore-scripts

  # Start PM2
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup

  # Start Cloudflare
  sudo systemctl start cloudflared

  # Wait
  echo "⏳ Waiting 30 seconds for services to stabilize..."
  sleep 30

  # Test
  echo "🧪 Testing services..."
  pm2 status
  curl -sf http://localhost:3000/health && echo "✅ App is UP!" || echo "❌ App still down"
  sudo systemctl status cloudflared --no-pager | grep Active

  echo "✅ Nuclear reset complete"
NUCLEAR
```

---

## 🎯 Most Likely Cause

Based on the error, most likely causes (in order):

1. **PM2 process crashed** → Fix #1 (restart)
2. **Wrong port** → Fix #2 (check port config)
3. **Cloudflare tunnel down** → Fix #3 (restart tunnel)
4. **Database locked** → Fix #4 (remove locks)
5. **Application error** → Fix #5 (check logs)

---

## ✅ How to Verify It's Fixed

After any fix, run this:

```bash
# Test from your local machine
curl -I https://seodashboard.theprofitplatform.com.au/health

# Should return:
# HTTP/2 200
# ...
```

Or open in browser: https://seodashboard.theprofitplatform.com.au

---

## 📞 Still Not Working?

1. **Run full diagnostic** (first command in this doc)
2. **Share output** with me
3. **Check Cloudflare dashboard** for tunnel status
4. **Consider redeploying** via GitHub Actions

---

## 🚀 Redeploy via GitHub Actions

If all else fails, trigger a fresh deployment:

```bash
# From your local machine
git push origin main

# Or manually trigger
# Go to: https://github.com/Theprofitplatform/seoexpert/actions/workflows/deploy-tpp-vps.yml
# Click "Run workflow"
```

This will:
- ✅ Pull latest code
- ✅ Install dependencies
- ✅ Restart PM2 services
- ✅ Verify health

---

**Created**: 2025-10-31
**URL**: https://seodashboard.theprofitplatform.com.au
**Error**: 502 Bad Gateway
