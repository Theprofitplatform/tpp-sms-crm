# Cloudflare Tunnel Setup Guide

## 🎯 Goal
Configure Cloudflare Tunnel to expose your Docker deployment at: https://seodashboard.theprofitplatform.com.au

---

## 📋 Step-by-Step Instructions

### Step 1: Access Cloudflare Zero Trust Dashboard

1. Go to: **https://one.dash.cloudflare.com/**
2. Select your Cloudflare account
3. Navigate to: **Zero Trust** → **Networks** → **Tunnels**

---

### Step 2: Create or Find Your Tunnel

**Option A: If you already have a tunnel** (recommended)
- You mentioned having existing services:
  - `seo.theprofitplatform.com.au`
  - `serpbear.theprofitplatform.com.au`
  - `api.theprofitplatform.com.au`
- These likely use an existing tunnel
- Click on that tunnel name to open it

**Option B: Create a new tunnel** (if needed)
1. Click **"Create a tunnel"**
2. Choose **"Cloudflared"**
3. Name it: `seo-expert-tunnel` (or any name you prefer)
4. Click **"Save tunnel"**

---

### Step 3: Get Your Tunnel Token

After opening/creating the tunnel:

1. You'll see a command like:
   ```bash
   cloudflared service install <TUNNEL-TOKEN>
   ```

2. **Copy the entire token** - it looks like:
   ```
   eyJhIjoiMTIzNDU2Nzg5MGFiY2RlZiIsInQiOiJhYmNkZWYxMjM0NTY3ODkwIiwicyI6ImFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwIn0=
   ```

3. **IMPORTANT**: Save this token - we'll need it in Step 5

---

### Step 4: Configure Public Hostname

Still in the Cloudflare Tunnel dashboard:

1. Go to the **"Public Hostname"** tab
2. Click **"Add a public hostname"**

**Configure the hostname:**

| Field | Value |
|-------|-------|
| **Subdomain** | `seo-expert` |
| **Domain** | `theprofitplatform.com.au` |
| **Type** | HTTP |
| **URL** | `localhost:9000` |

**Full URL will be**: `https://seodashboard.theprofitplatform.com.au`

**Advanced settings** (optional but recommended):
- **HTTP Host Header**: Leave blank or set to `seodashboard.theprofitplatform.com.au`
- **Origin Server Name**: Leave blank
- **TLS settings**: Default is fine

3. Click **"Save hostname"**

**Note**: If you want to add more hostnames (like just `seo.theprofitplatform.com.au`), repeat this step with different subdomains pointing to the same `localhost:9000`.

---

### Step 5: Add Token to VPS

Now we need to add the tunnel token to your VPS environment:

**Open terminal and SSH to your VPS:**

```bash
ssh avi@31.97.222.218
```

**Navigate to deployment directory:**

```bash
cd /home/avi/seo-automation/current
```

**Edit the .env file:**

```bash
nano .env
```

**Add or update this line:**

```bash
CLOUDFLARE_TUNNEL_TOKEN=your-token-from-step-3
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter`

---

### Step 6: Restart Services with Cloudflare Tunnel

**Stop current services:**

```bash
docker compose -f docker-compose.prod.yml down
```

**Start services with Cloudflare profile:**

```bash
docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d
```

**Check if all containers are running:**

```bash
docker compose -f docker-compose.prod.yml ps
```

You should see:
- ✅ keyword-tracker-db (running)
- ✅ keyword-tracker-dashboard (running)
- ✅ keyword-tracker-service (running)
- ✅ keyword-tracker-sync (running)
- ✅ keyword-tracker-cloudflared (running) ← This is important!

**Check Cloudflared logs:**

```bash
docker compose -f docker-compose.prod.yml logs cloudflared
```

You should see:
```
Registered tunnel connection
Connection established
```

---

### Step 7: Verify It's Working

**Test the public URL:**

```bash
curl https://seodashboard.theprofitplatform.com.au/api/v2/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T10:15:00.000Z",
  "services": {
    "database": "connected",
    "api": "running"
  }
}
```

**Or open in browser:**
- https://seodashboard.theprofitplatform.com.au/

---

## 🔍 Troubleshooting

### Issue: Cloudflared container not starting

**Check logs:**
```bash
docker logs keyword-tracker-cloudflared
```

**Common issues:**
- ❌ Invalid token → Check token is correct
- ❌ Token expired → Generate new token from Cloudflare
- ❌ Network issue → Check internet connectivity

### Issue: 502 Bad Gateway

**Possible causes:**
1. Dashboard service not running
   ```bash
   docker compose -f docker-compose.prod.yml restart dashboard
   ```

2. Wrong port in tunnel config
   - Should be `localhost:9000`
   - Check in Cloudflare dashboard

3. Cloudflared can't reach dashboard
   - They should be on same Docker network
   - Check with: `docker network inspect current_keyword-network`

### Issue: DNS not resolving

**Wait time:**
- DNS propagation can take 1-5 minutes
- Clear your DNS cache:
  ```bash
  # Windows
  ipconfig /flushdns

  # Mac/Linux
  sudo systemd-resolve --flush-caches
  ```

**Check DNS:**
```bash
nslookup seodashboard.theprofitplatform.com.au
```

---

## 📊 Quick Reference

**Cloudflare Dashboard:**
- https://one.dash.cloudflare.com/ → Zero Trust → Networks → Tunnels

**VPS Commands:**
```bash
# SSH to VPS
ssh avi@31.97.222.218

# Navigate to project
cd /home/avi/seo-automation/current

# Restart with tunnel
docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs cloudflared
docker compose -f docker-compose.prod.yml logs dashboard
```

**Public URLs:**
- Dashboard: https://seodashboard.theprofitplatform.com.au/
- API Health: https://seodashboard.theprofitplatform.com.au/api/v2/health
- API Base: https://seodashboard.theprofitplatform.com.au/api/v2/

---

## 🎉 Success Checklist

- [ ] Accessed Cloudflare Zero Trust dashboard
- [ ] Found/created tunnel
- [ ] Copied tunnel token
- [ ] Added public hostname: `seodashboard.theprofitplatform.com.au → localhost:9000`
- [ ] Added token to VPS `.env` file
- [ ] Restarted services with `--profile with-cloudflare`
- [ ] Cloudflared container is running
- [ ] Public URL is accessible
- [ ] API health check returns 200 OK

---

## 💡 Pro Tips

1. **Use existing tunnel**: If you already have services running on Cloudflare Tunnel, use the same tunnel and just add a new hostname. No need to create a new tunnel.

2. **Multiple domains**: You can point multiple domains to the same service:
   - `seodashboard.theprofitplatform.com.au → localhost:9000`
   - `seo.theprofitplatform.com.au → localhost:9000`

3. **Environment variable in GitHub**: After getting the token working, add it to your GitHub secrets:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=your-token
   ```
   This way future deployments will automatically have the token.

4. **Health check**: The deployment workflow checks `http://localhost:9000/api/v2/health` internally. The tunnel exposes this externally.

5. **Docker network**: Cloudflared container uses `keyword-network` to communicate with other containers. Don't change this.

---

## ❓ Need Help?

If you get stuck:

1. **Check Cloudflare tunnel status** in the dashboard
2. **Check Docker logs** for cloudflared container
3. **Verify .env file** has the correct token
4. **Test internal connectivity**: `curl http://localhost:9000/api/v2/health` from VPS
5. **Check DNS**: `nslookup seodashboard.theprofitplatform.com.au`

---

**Ready? Let's start with Step 1!** 🚀

Go to: https://one.dash.cloudflare.com/ and let me know once you have the tunnel token.
