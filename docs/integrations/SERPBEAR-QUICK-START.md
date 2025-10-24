# 🚀 SerpBear Deployment - Quick Start

## ⚡ 3-Step Deployment

### Step 1: Configure Environment (2 minutes)

Update production credentials:
```bash
cd serpbear
nano .env.production
```

**Required changes:**
```env
PASSWORD=YOUR_SECURE_PASSWORD_HERE       # Change this!
SECRET=<64-char-random-string>           # Generate with: openssl rand -hex 32
APIKEY=<random-api-key>                  # Generate with: openssl rand -hex 16
NEXT_PUBLIC_APP_URL=https://serpbear.theprofitplatform.com.au
```

---

### Step 2: Deploy to VPS (5-10 minutes)

Run the automated deployment:
```bash
./deploy-serpbear-vps.sh
```

The script will:
1. ✅ Sync files to VPS
2. ✅ Build Docker image
3. ✅ Deploy container
4. ✅ Verify installation

---

### Step 3: Setup Cloudflare Tunnel (5 minutes)

SSH into VPS:
```bash
ssh tpp-vps
```

Install cloudflared:
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

Authenticate and create tunnel:
```bash
cloudflared tunnel login
cloudflared tunnel create serpbear
cloudflared tunnel route dns serpbear serpbear.theprofitplatform.com.au
```

Create config file:
```bash
nano ~/.cloudflared/config.yml
```

Add (replace `<TUNNEL_ID>`):
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/YOUR_USERNAME/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: serpbear.theprofitplatform.com.au
    service: http://localhost:3001
  - service: http_status:404
```

Start as service:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## ✅ Verify It's Working

Visit: **https://serpbear.theprofitplatform.com.au**

Login:
- Username: `admin`
- Password: (from your .env.production)

---

## 🎯 Common Management Tasks

```bash
# Check status
./manage-serpbear.sh status

# View logs
./manage-serpbear.sh logs

# Restart
./manage-serpbear.sh restart

# Create backup
./manage-serpbear.sh backup

# Update SerpBear
./manage-serpbear.sh update
```

---

## 🔧 First Steps After Login

1. **Change Password:**
   - Settings → Change Password

2. **Add First Domain:**
   - Click "Add Domain"
   - Enter: `instantautotraders.com.au`

3. **Add Keywords:**
   - Click on domain
   - Click "Add Keyword"
   - Enter keywords to track

4. **Configure Scraper:**
   - Settings → Scraper Settings
   - Select: ScrapingRobot
   - API Key: c2b7240d-27e2-4b39-916e-aa7513495d2c

5. **Setup Integrations (Optional):**
   - See: `SERPBEAR-INTEGRATION-GUIDE.md`
   - Google Search Console
   - Google Ads

---

## 📚 Full Documentation

- **Complete Deployment Guide:** `SERPBEAR-DEPLOYMENT-GUIDE.md`
- **Integration Guide:** `SERPBEAR-INTEGRATION-GUIDE.md`
- **Official Docs:** https://docs.serpbear.com/

---

## 🆘 Need Help?

**Container not starting?**
```bash
ssh tpp-vps
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml logs
```

**Tunnel not working?**
```bash
ssh tpp-vps
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

**Can't access publicly?**
1. Check DNS: `nslookup serpbear.theprofitplatform.com.au`
2. Check tunnel: `cloudflared tunnel info serpbear`
3. Check container: `./manage-serpbear.sh health`

---

## 🎉 What You Get

✅ **Unlimited keyword tracking** for all your domains  
✅ **Position tracking** across Google search results  
✅ **Email notifications** for ranking changes  
✅ **Google Search Console** integration (actual traffic data)  
✅ **Keyword research** with Google Ads integration  
✅ **5,000 free SERP lookups/month** with ScrapingRobot  
✅ **Secure access** via Cloudflare Tunnel  
✅ **Automatic SSL/TLS** encryption  
✅ **DDoS protection** from Cloudflare  

---

**Ready to deploy?** Run: `./deploy-serpbear-vps.sh`
