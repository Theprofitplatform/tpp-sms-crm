# Cloudflare Tunnel Setup Guide

## Overview

The production deployment now uses **Cloudflare Tunnel** instead of nginx for secure, encrypted access to your dashboard without exposing ports or managing SSL certificates.

## Why Cloudflare Tunnel?

- ✅ **No Port Forwarding** - No need to open ports on your firewall
- ✅ **Automatic SSL** - Free SSL certificates managed by Cloudflare
- ✅ **DDoS Protection** - Built-in Cloudflare DDoS protection
- ✅ **Zero Trust Security** - Secure access without VPN
- ✅ **Global CDN** - Fast access from anywhere in the world
- ✅ **Simple Setup** - Just one environment variable

---

## Setup Steps

### 1. Create a Cloudflare Account

1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Sign up for a free account
3. Add your domain to Cloudflare (optional, can use provided subdomain)

### 2. Create a Cloudflare Tunnel

1. Navigate to **Zero Trust Dashboard**:
   - Go to [https://one.dash.cloudflare.com/](https://one.dash.cloudflare.com/)
   - Or click on your account → **Zero Trust**

2. **Create a Tunnel**:
   ```
   Left Menu → Networks → Tunnels → Create a tunnel
   ```

3. **Choose Tunnel Type**:
   - Select **Cloudflared** (recommended)
   - Click **Next**

4. **Name Your Tunnel**:
   ```
   Tunnel Name: seo-automation-dashboard
   ```
   - Click **Save tunnel**

5. **Copy the Tunnel Token**:
   ```
   You'll see a command like:
   cloudflared tunnel run --token eyJhIjoiXXXX...XXXXX"

   Copy the entire token (everything after --token)
   ```

6. **Skip the connector installation** (we'll use Docker)

7. **Configure Public Hostname**:
   - **Subdomain**: `dashboard` (or your choice)
   - **Domain**: Select your domain
   - **Service**:
     - Type: `HTTP`
     - URL: `dashboard:9000` (internal Docker service)
   - Click **Save tunnel**

### 3. Add Tunnel Token to .env

1. Open `.env` file in your project root:
   ```bash
   nano .env
   ```

2. Add your Cloudflare Tunnel token:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiYourActualTokenHere..."
   ```

3. Save and close the file

### 4. Deploy with Cloudflare

Start the production deployment with Cloudflare enabled:

```bash
# Option 1: Manual deployment with Cloudflare
docker-compose -f docker-compose.prod.yml --profile with-cloudflare up -d

# Option 2: Full automated deployment (modify deploy-production.sh)
bash deploy-production.sh --yes
```

---

## Configuration Examples

### Basic Tunnel Configuration

```yaml
# In docker-compose.prod.yml
cloudflared:
  image: cloudflare/cloudflared:latest
  command: tunnel --no-autoupdate run
  environment:
    - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
```

### Public Hostname Examples

#### 1. Dashboard Access
```
Subdomain: dashboard
Domain: yourdomain.com
Service: http://dashboard:9000

Result: https://dashboard.yourdomain.com → Your Dashboard
```

#### 2. API Access
```
Subdomain: api
Domain: yourdomain.com
Service: http://dashboard:9000
Path: /api/v2/*

Result: https://api.yourdomain.com/keywords → API
```

#### 3. Keyword Service
```
Subdomain: keywords
Domain: yourdomain.com
Service: http://keyword-service:5000

Result: https://keywords.yourdomain.com → Keyword Research
```

---

## Advanced Configuration

### Multiple Public Hostnames

You can configure multiple hostnames for the same tunnel:

1. **Dashboard UI**:
   - Subdomain: `dashboard`
   - Service: `http://dashboard:9000`

2. **API Endpoint**:
   - Subdomain: `api`
   - Service: `http://dashboard:9000`
   - Path: `/api/v2/*`

3. **Keyword Research**:
   - Subdomain: `keywords`
   - Service: `http://keyword-service:5000`

### Access Policies (Zero Trust)

Add authentication to your tunnel:

1. Go to **Zero Trust** → **Access** → **Applications**
2. Click **Add an application**
3. Select **Self-hosted**
4. Configure:
   ```
   Application name: SEO Dashboard
   Session Duration: 24 hours
   Application domain: dashboard.yourdomain.com
   ```
5. **Add a policy**:
   - Policy name: `Email authentication`
   - Action: `Allow`
   - Include: `Emails` → Add your email(s)

Now only authorized users can access your dashboard!

### Custom Headers

Add security headers in Cloudflare tunnel config:

1. Go to your tunnel → **Public Hostname**
2. **Additional application settings** → **HTTP Settings**
3. Add headers:
   ```
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   Strict-Transport-Security: max-age=31536000
   ```

---

## Troubleshooting

### Issue: Tunnel not connecting

**Check the tunnel status:**
```bash
# View cloudflared logs
docker logs keyword-tracker-cloudflared

# Check if service is running
docker ps | grep cloudflared
```

**Common fixes:**
1. Verify `CLOUDFLARE_TUNNEL_TOKEN` is correct in `.env`
2. Check tunnel status in Cloudflare dashboard
3. Restart the cloudflared service:
   ```bash
   docker-compose -f docker-compose.prod.yml restart cloudflared
   ```

### Issue: 502 Bad Gateway

**Causes:**
- Dashboard service not running
- Dashboard failed health check
- Wrong service name in tunnel config

**Fix:**
```bash
# Check dashboard health
curl http://localhost:9000/api/v2/health

# View dashboard logs
docker logs keyword-tracker-dashboard

# Restart dashboard
docker-compose -f docker-compose.prod.yml restart dashboard
```

### Issue: Tunnel token not found

**Error:**
```
Error: failed to parse tunnel token: invalid character
```

**Fix:**
1. Token must be the complete base64 string
2. No quotes around the token in `.env`
3. No spaces or newlines in the token

**Correct format:**
```env
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiXXXXX...
```

**Incorrect:**
```env
CLOUDFLARE_TUNNEL_TOKEN="eyJhIjoiXXXXX..."  # ❌ No quotes
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiXXXXX
...  # ❌ No line breaks
```

---

## Migration from Nginx

### Current Nginx Setup

If you're currently using nginx:

```bash
# Stop nginx service
docker-compose -f docker-compose.prod.yml --profile with-nginx down

# Start with Cloudflare
docker-compose -f docker-compose.prod.yml --profile with-cloudflare up -d
```

### Keeping Both (Transitional)

You can run both temporarily:

```bash
# Start both profiles
docker-compose -f docker-compose.prod.yml \
  --profile with-nginx \
  --profile with-cloudflare \
  up -d
```

This allows:
- Local access via nginx: `http://localhost`
- Remote access via Cloudflare: `https://dashboard.yourdomain.com`

---

## Verification

### 1. Check Tunnel Status

**In Cloudflare Dashboard:**
1. Go to **Zero Trust** → **Networks** → **Tunnels**
2. Your tunnel should show **HEALTHY** status
3. Click on the tunnel to see active connections

**Via Docker:**
```bash
# Check cloudflared logs
docker logs keyword-tracker-cloudflared --tail 50

# Should see:
# "Registered tunnel connection"
# "Tunnel started successfully"
```

### 2. Test Public Access

```bash
# Replace with your actual domain
curl https://dashboard.yourdomain.com/api/v2/health

# Should return:
# {"status":"healthy","timestamp":"2025-10-26T..."}
```

### 3. Test Dashboard UI

1. Open browser to: `https://dashboard.yourdomain.com`
2. You should see the React dashboard login page
3. Check browser console for errors (F12)

---

## Performance Comparison

| Feature | Nginx | Cloudflare Tunnel |
|---------|-------|-------------------|
| **Setup Complexity** | Medium | Easy |
| **SSL Certificates** | Manual (Let's Encrypt) | Automatic |
| **Port Forwarding** | Required | Not needed |
| **DDoS Protection** | Self-managed | Built-in |
| **Global CDN** | No | Yes |
| **Load Balancing** | Manual | Automatic |
| **Cost** | Free | Free |
| **Security** | Self-managed | Zero Trust |

---

## Production Checklist

Before going live with Cloudflare Tunnel:

- [ ] Cloudflare account created
- [ ] Domain added to Cloudflare (or using Cloudflare subdomain)
- [ ] Tunnel created in Zero Trust dashboard
- [ ] Tunnel token copied to `.env` file
- [ ] Public hostname configured (e.g., `dashboard.yourdomain.com`)
- [ ] Docker services started with `--profile with-cloudflare`
- [ ] Tunnel status shows **HEALTHY** in dashboard
- [ ] Dashboard accessible via public URL
- [ ] API endpoints responding correctly
- [ ] (Optional) Access policy configured for authentication
- [ ] DNS propagation complete (may take a few minutes)

---

## Resources

- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- **Zero Trust Dashboard**: https://one.dash.cloudflare.com/
- **Cloudflare Status**: https://www.cloudflarestatus.com/
- **Support**: https://community.cloudflare.com/

---

## Quick Reference

### Start Services
```bash
docker-compose -f docker-compose.prod.yml --profile with-cloudflare up -d
```

### View Logs
```bash
docker logs keyword-tracker-cloudflared -f
```

### Restart Tunnel
```bash
docker-compose -f docker-compose.prod.yml restart cloudflared
```

### Stop All Services
```bash
docker-compose -f docker-compose.prod.yml down
```

---

**Need Help?** Check the troubleshooting section above or visit the Cloudflare Community forums.
