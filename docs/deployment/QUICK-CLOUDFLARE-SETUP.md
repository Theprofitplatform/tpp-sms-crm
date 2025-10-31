# ⚡ Quick Cloudflare Tunnel Setup

## 🎯 Goal
Get your Docker deployment accessible at: **https://seodashboard.theprofitplatform.com.au**

---

## ✅ What's Already Done

1. ✅ Docker containers are running on VPS (31.97.222.218)
2. ✅ Dashboard is accessible internally at http://localhost:9000
3. ✅ `docker-compose.prod.yml` is configured for Cloudflare Tunnel
4. ⚠️  **Missing**: Cloudflare Tunnel Token

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Your Tunnel Token (2 min)

**Go to Cloudflare Zero Trust Dashboard:**
👉 **https://one.dash.cloudflare.com/**

1. Select your Cloudflare account
2. Navigate to: **Zero Trust** → **Networks** → **Tunnels**
3. You should see existing tunnels (you have services at `serpbear.theprofitplatform.com.au`, etc.)
4. Click on your existing tunnel **OR** create a new one:
   - Click **"Create a tunnel"**
   - Choose **"Cloudflared"**
   - Name it: `tpp-services` or similar
   - Click **"Save tunnel"**

5. **Copy the tunnel token** - it looks like:
   ```
   eyJhIjoiMTIzNDU2Nzg5MGFiY2RlZiIsInQiOiJhYmNkZWYxMjM0NTY3ODkwIiwicyI6ImFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwIn0=
   ```

### Step 2: Add Public Hostname (1 min)

Still in Cloudflare dashboard:

1. Go to **"Public Hostname"** tab
2. Click **"Add a public hostname"**
3. Configure:
   - **Subdomain**: `seo-expert`
   - **Domain**: `theprofitplatform.com.au`
   - **Type**: `HTTP`
   - **URL**: `localhost:9000`
4. Click **"Save"**

Your public URL will be: `https://seodashboard.theprofitplatform.com.au`

### Step 3: Apply Token to VPS (2 min)

**Option A: Using SSH (Recommended)**

```bash
# 1. Connect to VPS
ssh avi@31.97.222.218

# 2. Navigate to deployment
cd /home/avi/seo-automation/current

# 3. Edit .env file
nano .env

# 4. Add this line (paste your actual token):
CLOUDFLARE_TUNNEL_TOKEN=your-token-here

# 5. Save and exit (Ctrl+X, then Y, then Enter)

# 6. Restart services with Cloudflare
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d

# 7. Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs cloudflared --tail 20
```

**Option B: Using Automated Script**

```bash
# From your local machine, run:
ssh avi@31.97.222.218 'bash -s' < setup-cloudflare-tunnel.sh
```

This script will:
- Guide you through entering the token
- Update the .env file
- Restart services
- Verify everything is working

**Option C: Using GitHub Secrets (for future deployments)**

1. Go to: https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `CLOUDFLARE_TUNNEL_TOKEN`
4. Value: (paste your token)
5. Click **"Add secret"**

Then update the deployment workflow to include this token in the .env file.

---

## 🔍 Verify It's Working

**Test 1: Check Docker Containers**
```bash
ssh avi@31.97.222.218
cd /home/avi/seo-automation/current
docker compose -f docker-compose.prod.yml ps
```

You should see all 5 containers running:
- ✅ keyword-tracker-db
- ✅ keyword-tracker-dashboard
- ✅ keyword-tracker-service
- ✅ keyword-tracker-sync
- ✅ keyword-tracker-cloudflared ← **This one is important!**

**Test 2: Check Cloudflared Logs**
```bash
docker compose -f docker-compose.prod.yml logs cloudflared --tail 50
```

Look for:
```
✅ "Registered tunnel connection"
✅ "Connection established"
✅ "Tunnel connected"
```

**Test 3: Test Public URL**
```bash
curl https://seodashboard.theprofitplatform.com.au/api/v2/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T...",
  "services": {
    "database": "connected",
    "api": "running"
  }
}
```

**Test 4: Open in Browser**

Visit: **https://seodashboard.theprofitplatform.com.au**

You should see your dashboard!

---

## 🐛 Troubleshooting

### Issue: Cloudflared container not starting

**Check logs:**
```bash
docker compose -f docker-compose.prod.yml logs cloudflared
```

**Common fixes:**
1. **Invalid token** → Double-check token in .env
2. **Token expired** → Generate new token from Cloudflare
3. **Networking issue** → Restart Docker: `sudo systemctl restart docker`

### Issue: Still getting 502 Bad Gateway

**Possible causes:**

1. **Dashboard not running**
   ```bash
   docker compose -f docker-compose.prod.yml logs dashboard
   docker compose -f docker-compose.prod.yml restart dashboard
   ```

2. **Wrong port in Cloudflare**
   - Go back to Cloudflare dashboard
   - Check Public Hostname points to `localhost:9000`

3. **Network isolation**
   ```bash
   docker network inspect current_keyword-network
   # Ensure both dashboard and cloudflared are on this network
   ```

### Issue: DNS not resolving

**Wait 1-5 minutes** for DNS propagation

**Clear DNS cache:**
```bash
# Windows
ipconfig /flushdns

# Mac
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches
```

**Verify DNS:**
```bash
nslookup seodashboard.theprofitplatform.com.au
```

---

## 📊 Quick Commands Reference

```bash
# Connect to VPS
ssh avi@31.97.222.218

# Navigate to project
cd /home/avi/seo-automation/current

# Check services
docker compose -f docker-compose.prod.yml ps

# Restart with Cloudflare
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d

# View logs
docker compose -f docker-compose.prod.yml logs cloudflared
docker compose -f docker-compose.prod.yml logs dashboard

# Test API internally
curl http://localhost:9000/api/v2/health

# Test API publicly
curl https://seodashboard.theprofitplatform.com.au/api/v2/health
```

---

## ⏱️ Time Estimate

- **Step 1** (Get token): 2 minutes
- **Step 2** (Add hostname): 1 minute
- **Step 3** (Apply token): 2 minutes
- **Verification**: 2 minutes

**Total**: ~7 minutes

---

## 💡 Pro Tips

1. **Use existing tunnel** - If you have other services (serpbear, etc.) using Cloudflare Tunnel, use the SAME tunnel. Just add a new hostname.

2. **Save the token** - Store it securely in a password manager AND in GitHub secrets for future deployments.

3. **Multiple domains** - You can add multiple hostnames pointing to the same service:
   - `seodashboard.theprofitplatform.com.au → localhost:9000`
   - `seo.theprofitplatform.com.au → localhost:9000`

4. **Monitoring** - Set up uptime monitoring (UptimeRobot, Pingdom) for your public URL.

---

## ❓ Need Help?

If you get stuck:

1. **Check Cloudflare dashboard** - See if tunnel shows as "Healthy"
2. **Check Docker logs** - `docker compose logs cloudflared`
3. **Verify .env** - `cat .env | grep CLOUDFLARE`
4. **Test internal** - `curl http://localhost:9000/api/v2/health`
5. **Check DNS** - `nslookup seodashboard.theprofitplatform.com.au`

---

## ✅ Success Checklist

- [ ] Got Cloudflare Tunnel token from dashboard
- [ ] Added public hostname in Cloudflare (seodashboard.theprofitplatform.com.au → localhost:9000)
- [ ] Added token to VPS .env file
- [ ] Restarted services with `--profile with-cloudflare`
- [ ] All 5 Docker containers running (including cloudflared)
- [ ] Cloudflared logs show "Connection established"
- [ ] Public URL returns 200 OK
- [ ] Can access dashboard in browser

---

**Ready to start?** Begin with Step 1! 🚀

Need the token? Go here: **https://one.dash.cloudflare.com/** → Zero Trust → Networks → Tunnels
