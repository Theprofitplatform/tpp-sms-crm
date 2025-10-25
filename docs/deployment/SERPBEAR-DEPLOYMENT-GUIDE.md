# SerpBear VPS + Cloudflare Tunnel Deployment Guide

Complete guide to deploying SerpBear on your VPS with Cloudflare Tunnel for secure public access.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ VPS with SSH access (you have: `tpp-vps`)
- ✅ Docker and Docker Compose installed on VPS
- ✅ Cloudflare account with domain
- ✅ Domain DNS managed by Cloudflare
- ✅ Port 3001 available on VPS

---

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)

Run the deployment script:

```bash
chmod +x deploy-serpbear-vps.sh
./deploy-serpbear-vps.sh
```

The script will:
1. ✅ Sync SerpBear files to VPS
2. ✅ Build Docker image
3. ✅ Configure environment
4. ✅ Deploy container
5. ✅ Guide you through Cloudflare Tunnel setup

### Option 2: Manual Deployment

If you prefer manual control, follow the detailed steps below.

---

## 📝 Step-by-Step Manual Deployment

### Step 1: Prepare Local Environment

1. **Update production environment file:**

```bash
cd serpbear
nano .env.production
```

Update these values:
```env
USER_NAME=admin
PASSWORD=YOUR_SECURE_PASSWORD_HERE
SECRET=GENERATE_RANDOM_64_CHAR_STRING
APIKEY=YOUR_RANDOM_API_KEY
NEXT_PUBLIC_APP_URL=https://serpbear.theprofitplatform.com.au
```

Generate secure values:
```bash
# Generate SECRET (64+ characters)
openssl rand -hex 32

# Generate APIKEY
openssl rand -hex 16
```

---

### Step 2: Sync Files to VPS

```bash
# Create directory on VPS
ssh tpp-vps "mkdir -p ~/projects/serpbear"

# Sync files
rsync -avz --progress \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='data' \
    --exclude='.next' \
    ./serpbear/ tpp-vps:~/projects/serpbear/
```

---

### Step 3: Build and Deploy on VPS

SSH into your VPS:
```bash
ssh tpp-vps
cd ~/projects/serpbear
```

Build Docker image:
```bash
docker build -t serpbear:production .
```

Start with Docker Compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Check status:
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🌐 Cloudflare Tunnel Setup

### Why Cloudflare Tunnel?

- ✅ No need to open ports on VPS
- ✅ Free SSL/TLS encryption
- ✅ DDoS protection
- ✅ No firewall configuration needed
- ✅ Works behind NAT

---

### Install Cloudflared on VPS

SSH into VPS:
```bash
ssh tpp-vps
```

Download and install:
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

Verify installation:
```bash
cloudflared --version
```

---

### Authenticate Cloudflared

Run authentication:
```bash
cloudflared tunnel login
```

This opens a browser window. Steps:
1. Log in to your Cloudflare account
2. Select domain: **theprofitplatform.com.au**
3. Click **Authorize**
4. Return to terminal

A certificate is saved to: `~/.cloudflared/cert.pem`

---

### Create Tunnel

Create a new tunnel named "serpbear":
```bash
cloudflared tunnel create serpbear
```

This creates:
- Tunnel ID (copy this!)
- Credentials file: `~/.cloudflared/<TUNNEL_ID>.json`

Example output:
```
Created tunnel serpbear with id: abc123-def456-ghi789
```

**Save the Tunnel ID!** You'll need it next.

---

### Configure DNS

Route your subdomain to the tunnel:
```bash
cloudflared tunnel route dns serpbear serpbear.theprofitplatform.com.au
```

This automatically creates a CNAME record in Cloudflare DNS:
- **Name:** serpbear
- **Target:** <TUNNEL_ID>.cfargotunnel.com

---

### Create Tunnel Configuration

Create config file:
```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add configuration (replace `<TUNNEL_ID>` with your actual ID):
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/YOUR_USERNAME/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: serpbear.theprofitplatform.com.au
    service: http://localhost:3001
  - service: http_status:404
```

**Important:** Update:
- `<TUNNEL_ID>` with your actual tunnel ID
- `/home/YOUR_USERNAME/` with your actual username

---

### Test Tunnel

Test the tunnel manually:
```bash
cloudflared tunnel run serpbear
```

Visit: https://serpbear.theprofitplatform.com.au

If it works, press Ctrl+C to stop the test.

---

### Install Tunnel as Service

Install as systemd service:
```bash
sudo cloudflared service install
```

Start service:
```bash
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

Check status:
```bash
sudo systemctl status cloudflared
```

View logs:
```bash
sudo journalctl -u cloudflared -f
```

---

## ✅ Verify Deployment

### 1. Check Container Health

```bash
./manage-serpbear.sh health
```

Expected output:
```
Container Health: healthy
API Health: ✓ Healthy
Disk Usage: 12M    /app/data
```

---

### 2. Check Tunnel Status

```bash
./manage-serpbear.sh tunnel-status
```

Should show: `active (running)`

---

### 3. Test Access

**Public URL:**
```
https://serpbear.theprofitplatform.com.au
```

**Login:**
- Username: `admin`
- Password: (from your .env.production)

---

## 🔧 Management Commands

### Quick Commands

```bash
# Status and monitoring
./manage-serpbear.sh status
./manage-serpbear.sh logs
./manage-serpbear.sh health

# Control
./manage-serpbear.sh restart
./manage-serpbear.sh stop
./manage-serpbear.sh start

# Updates
./manage-serpbear.sh update

# Backups
./manage-serpbear.sh backup
./manage-serpbear.sh restore backups/serpbear/backup-file.tar.gz

# Debugging
./manage-serpbear.sh shell
./manage-serpbear.sh ssh
```

---

### Docker Compose Commands (on VPS)

```bash
cd ~/projects/serpbear

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Start
docker-compose -f docker-compose.prod.yml up -d

# Rebuild
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔄 Updating SerpBear

### Method 1: Using Management Script

```bash
./manage-serpbear.sh update
```

This will:
1. Sync latest files to VPS
2. Rebuild Docker image
3. Restart container

---

### Method 2: Manual Update

```bash
# Sync files
rsync -avz --exclude='node_modules' --exclude='.git' \
    ./serpbear/ tpp-vps:~/projects/serpbear/

# SSH and rebuild
ssh tpp-vps
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

---

## 💾 Backup and Restore

### Create Backup

```bash
./manage-serpbear.sh backup
```

Backup saved to: `backups/serpbear/serpbear-data-TIMESTAMP.tar.gz`

---

### Restore from Backup

```bash
./manage-serpbear.sh restore backups/serpbear/serpbear-data-20241023_120000.tar.gz
```

---

### Manual Backup (on VPS)

```bash
# Create backup
docker exec serpbear-production tar -czf /tmp/backup.tar.gz /app/data

# Copy from container
docker cp serpbear-production:/tmp/backup.tar.gz ~/serpbear-backup.tar.gz

# Download to local
scp tpp-vps:~/serpbear-backup.tar.gz ./backups/
```

---

## 🔐 Security Best Practices

### 1. Change Default Password

After first login:
1. Go to Settings (gear icon)
2. Scroll to "Change Password"
3. Set a strong password
4. Save changes

---

### 2. Update Environment Secrets

Generate new secure values:
```bash
# New SECRET
openssl rand -hex 32

# New APIKEY
openssl rand -hex 16
```

Update on VPS:
```bash
ssh tpp-vps
cd ~/projects/serpbear
nano .env.production
```

Restart:
```bash
docker-compose -f docker-compose.prod.yml restart
```

---

### 3. Firewall Configuration

Since using Cloudflare Tunnel, you don't need to open port 3001 publicly.

If you have UFW enabled:
```bash
# Allow SSH only
sudo ufw allow 22/tcp

# Block 3001 from public (Cloudflare Tunnel handles access)
sudo ufw deny 3001/tcp
```

---

## 📊 Monitoring

### View Real-time Logs

```bash
./manage-serpbear.sh logs
```

---

### Check Resource Usage

```bash
ssh tpp-vps
docker stats serpbear-production
```

---

### Set Up Alerts (Optional)

Use Cloudflare's Health Checks:

1. Go to Cloudflare Dashboard
2. Navigate to: Traffic → Health Checks
3. Create new health check:
   - URL: https://serpbear.theprofitplatform.com.au/api/health
   - Interval: 5 minutes
4. Set up email/webhook notifications

---

## 🐛 Troubleshooting

### Container Won't Start

Check logs:
```bash
ssh tpp-vps
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml logs
```

Common issues:
- Port 3001 already in use → Change port in docker-compose.prod.yml
- Environment file missing → Check .env.production exists
- Permission issues → Check volume permissions

---

### Tunnel Not Working

Check tunnel status:
```bash
ssh tpp-vps
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

Common issues:
- Config file path wrong → Verify ~/.cloudflared/config.yml
- Credentials file not found → Check tunnel ID matches
- Service not running → `sudo systemctl start cloudflared`

---

### Cannot Access Publicly

1. **Check DNS:**
   ```bash
   nslookup serpbear.theprofitplatform.com.au
   ```
   Should return: `<TUNNEL_ID>.cfargotunnel.com`

2. **Check Cloudflare Dashboard:**
   - Go to DNS settings
   - Verify CNAME record exists
   - Ensure proxy is enabled (orange cloud)

3. **Check Tunnel Status:**
   ```bash
   cloudflared tunnel info serpbear
   ```

---

### Database Issues

Reset database (⚠️ destroys all data):
```bash
ssh tpp-vps
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🌟 Post-Deployment Setup

### 1. Login and Change Password

Visit: https://serpbear.theprofitplatform.com.au

Login with credentials from .env.production, then change password.

---

### 2. Configure Integrations

Follow the integration guide: `SERPBEAR-INTEGRATION-GUIDE.md`

Set up:
- Google Search Console
- Google Ads
- Email notifications (optional)

---

### 3. Add Your First Domain

1. Click "Add Domain"
2. Enter domain: `instantautotraders.com.au`
3. Add keywords to track
4. Configure scraper settings

---

### 4. Schedule Automatic Scraping

SerpBear has built-in cron jobs that run automatically:
- Keyword scraping: Configurable per domain
- Data updates: Every 24 hours

Configure in Settings → General Settings.

---

## 📚 Additional Resources

- [SerpBear Documentation](https://docs.serpbear.com/)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Integration Guide](./SERPBEAR-INTEGRATION-GUIDE.md)

---

## 💡 Tips and Tricks

### Multiple Domains

You can track multiple domains in one SerpBear instance. Just add them via the UI.

---

### API Access

SerpBear has a built-in API. Access it with your APIKEY from .env.production:

```bash
curl -H "Authorization: Bearer YOUR_APIKEY" \
  https://serpbear.theprofitplatform.com.au/api/keywords
```

---

### Email Notifications

To get email alerts when rankings change:

1. Settings → Email Settings
2. Add SMTP details (use Gmail, SendGrid, etc.)
3. Configure notification schedule

---

### CSV Export

Export keyword data:
1. Go to Keywords view
2. Select keywords (or select all)
3. Click Export → CSV

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Deploy | `./deploy-serpbear-vps.sh` |
| Status | `./manage-serpbear.sh status` |
| Logs | `./manage-serpbear.sh logs` |
| Restart | `./manage-serpbear.sh restart` |
| Update | `./manage-serpbear.sh update` |
| Backup | `./manage-serpbear.sh backup` |
| Health | `./manage-serpbear.sh health` |
| SSH | `./manage-serpbear.sh ssh` |

| URL | Purpose |
|-----|---------|
| https://serpbear.theprofitplatform.com.au | Main access |
| https://serpbear.theprofitplatform.com.au/api/health | Health check |

---

**Need Help?** Check the troubleshooting section or open an issue on [SerpBear GitHub](https://github.com/towfiqi/serpbear).
