# Cloudflare Tunnel Setup for SerpBear

## 🎉 SerpBear is Deployed and Running!

Your SerpBear instance is successfully deployed on VPS:
- **Container Status:** ✅ Healthy
- **Internal Port:** 3006
- **Health Check:** ✅ Passing

---

## 🌐 Now: Setup Cloudflare Tunnel

Cloudflare Tunnel will expose SerpBear securely without opening firewall ports.

---

## Quick Setup (5-10 minutes)

### Step 1: Install cloudflared on VPS

```bash
ssh tpp-vps
```

Download and install:
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
cloudflared --version
```

---

### Step 2: Authenticate

```bash
cloudflared tunnel login
```

This opens a browser window:
1. Log in to Cloudflare
2. Select domain: **theprofitplatform.com.au**
3. Click **Authorize**

A certificate is saved to `~/.cloudflared/cert.pem`

---

### Step 3: Create Tunnel

```bash
cloudflared tunnel create serpbear
```

**Save the Tunnel ID!** It looks like: `abc123-def456-ghi789`

The credentials file is saved to: `~/.cloudflared/<TUNNEL_ID>.json`

---

### Step 4: Route DNS

```bash
cloudflared tunnel route dns serpbear serpbear.theprofitplatform.com.au
```

This creates a CNAME record in Cloudflare DNS automatically.

---

### Step 5: Create Configuration File

```bash
nano ~/.cloudflared/config.yml
```

**Paste this configuration** (replace `<TUNNEL_ID>` and `<USERNAME>`):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/<USERNAME>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: serpbear.theprofitplatform.com.au
    service: http://localhost:3006
  - service: http_status:404
```

**Important:**
- Replace `<TUNNEL_ID>` with your actual tunnel ID from Step 3
- Replace `<USERNAME>` with `avi` (your VPS username)
- Port is **3006** (not 3001)

Save and exit (Ctrl+X, Y, Enter)

---

### Step 6: Test the Tunnel

Test manually first:
```bash
cloudflared tunnel run serpbear
```

In another terminal or browser, visit:
```
https://serpbear.theprofitplatform.com.au
```

If you see the SerpBear login page, it works! Press Ctrl+C to stop the test.

---

### Step 7: Install as Service

Make it run automatically:

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

Check status:
```bash
sudo systemctl status cloudflared
```

Should show: `active (running)`

---

## ✅ Verify Everything Works

1. **Check Tunnel Status:**
```bash
sudo systemctl status cloudflared
```

2. **Visit Your SerpBear:**
```
https://serpbear.theprofitplatform.com.au
```

3. **Login:**
- Username: `admin`
- Password: `coNNRIEIkVm6Ylq21xYlFJu9fIs=`

---

## 🔧 Troubleshooting

### Tunnel not working?

Check logs:
```bash
sudo journalctl -u cloudflared -f
```

Check tunnel info:
```bash
cloudflared tunnel info serpbear
```

### Can't access publicly?

1. **Check DNS:**
```bash
nslookup serpbear.theprofitplatform.com.au
```
Should return: `<TUNNEL_ID>.cfargotunnel.com`

2. **Check Cloudflare Dashboard:**
   - Go to DNS settings
   - Verify CNAME record exists
   - Ensure proxy is enabled (orange cloud ☁️)

3. **Check config file:**
```bash
cat ~/.cloudflared/config.yml
```
Verify tunnel ID and port (3006) are correct.

### Container not responding?

Check container status:
```bash
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

Restart if needed:
```bash
docker-compose -f docker-compose.prod.yml restart
```

---

## 📊 Management Commands

### View Logs
```bash
# Tunnel logs
sudo journalctl -u cloudflared -f

# SerpBear logs
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Services
```bash
# Restart tunnel
sudo systemctl restart cloudflared

# Restart SerpBear
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml restart
```

### Stop/Start
```bash
# Stop tunnel
sudo systemctl stop cloudflared

# Start tunnel
sudo systemctl start cloudflared

# Stop SerpBear
docker-compose -f docker-compose.prod.yml down

# Start SerpBear
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🎯 After Setup is Complete

### 1. Change Default Password
1. Login to https://serpbear.theprofitplatform.com.au
2. Go to Settings (gear icon)
3. Change admin password to something secure
4. Save changes

### 2. Add Your First Domain
1. Click "Add Domain"
2. Enter: `instantautotraders.com.au`
3. Save

### 3. Add Keywords to Track
1. Click on your domain
2. Click "Add Keyword"
3. Enter keywords (one per line)
4. Save

### 4. Configure Scraper
1. Go to Settings → Scraper Settings
2. Select: **ScrapingRobot**
3. API Key: `c2b7240d-27e2-4b39-916e-aa7513495d2c`
4. Save

### 5. (Optional) Setup Integrations
Follow the guide: `SERPBEAR-INTEGRATION-GUIDE.md`
- Google Search Console (real traffic data)
- Google Ads (keyword research)

---

## 📚 Documentation

- **Deployment Guide:** `SERPBEAR-DEPLOYMENT-GUIDE.md`
- **Integration Guide:** `SERPBEAR-INTEGRATION-GUIDE.md`
- **Quick Start:** `SERPBEAR-QUICK-START.md`
- **Official Docs:** https://docs.serpbear.com/

---

## 🎉 Summary

✅ **SerpBear deployed** on VPS (port 3006)  
✅ **Container running** and healthy  
✅ **API responding** correctly  
⏳ **Cloudflare Tunnel** - ready to set up (follow steps above)

---

**Next:** SSH into VPS and run the commands above to set up Cloudflare Tunnel.

```bash
ssh tpp-vps
```

Then follow **Step 1-7** above.

**Questions?** Check troubleshooting section or the full deployment guide.
