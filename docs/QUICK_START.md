# Quick Start Guide - SEO Automation Platform

**Get up and running in 15 minutes!**

This is the fastest path to deploying the SEO Automation Platform. For comprehensive instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## Prerequisites

- Ubuntu 20.04+ server with SSH access
- Node.js 18+ installed
- Discord account (for notifications)
- Gmail account (for email sending)

---

## 1. Install Dependencies (2 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Verify
node --version  # Should be v18+
npm --version   # Should be v9+
```

---

## 2. Clone and Setup (3 minutes)

```bash
# Clone repository
git clone https://github.com/Theprofitplatform/seoexpert.git
cd seoexpert

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

---

## 3. Configure Environment (5 minutes)

Edit `.env` with your values:

```bash
nano .env
```

**Minimum Required Configuration:**

```env
# Server
NODE_ENV=production
PORT=3000
DASHBOARD_URL=http://your-server-ip:3000

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Company
BUSINESS_ADDRESS=123 Your St, City, State ZIP

# Security
JWT_SECRET=change-this-to-random-32-chars
SESSION_SECRET=change-this-to-random-32-chars

# Discord (get from Discord channel settings → Integrations → Webhooks)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
DISCORD_NOTIFICATIONS_ENABLED=true

# Automation
RANK_TRACKING_ENABLED=false
LOCAL_SEO_ENABLED=false
```

**Note:** Leave rank tracking and local SEO disabled until you configure Google Search Console API.

---

## 4. Generate Secure Secrets (1 minute)

```bash
# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Generate session secret
echo "SESSION_SECRET=$(openssl rand -base64 32)"

# Copy these values to your .env file
```

---

## 5. Set Up Discord Webhook (2 minutes)

1. Open Discord
2. Go to your server → Create channel "automation-alerts"
3. Click gear icon → Integrations → Webhooks
4. Click "New Webhook"
5. Name it "SEO Bot", copy webhook URL
6. Paste URL into `.env` as `DISCORD_WEBHOOK_URL`

**Test it:**

```bash
source .env
curl -X POST -H "Content-Type: application/json" \
  -d '{"content": "✅ SEO Automation Connected!"}' \
  $DISCORD_WEBHOOK_URL
```

You should see a message in Discord!

---

## 6. Set Up Gmail App Password (2 minutes)

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Select "Mail" → "Other" → Name it "SEO Platform"
5. Copy the 16-character password
6. Paste into `.env` as `SMTP_PASS`

---

## 7. Start the Application (1 minute)

```bash
# Start with PM2
pm2 start dashboard-server.js --name seo-automation

# Check status
pm2 status

# View logs
pm2 logs seo-automation
```

---

## 8. Verify It's Working (2 minutes)

```bash
# Health check
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

**Test in browser:**

Open `http://your-server-ip:3000` and you should see the dashboard!

---

## 9. Enable Auto-Start on Reboot (1 minute)

```bash
# Generate startup script
pm2 startup

# Run the command it outputs (copy/paste)
# Then save the process list
pm2 save
```

---

## 10. Set Up Daily Backups (1 minute)

```bash
# Create backup directory
mkdir -p ~/backups

# Add to crontab
crontab -e
```

Add this line:

```
0 2 * * * cp ~/seoexpert/data/seo-automation.db ~/backups/seo-backup-$(date +\%Y\%m\%d).db && find ~/backups -name "seo-backup-*.db" -mtime +30 -delete
```

---

## ✅ You're Done!

Your SEO Automation Platform is now running!

### Next Steps:

1. **Add Your First Client**
   ```bash
   curl -X POST http://localhost:3000/api/clients \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Client Name",
       "domain": "https://client-site.com",
       "status": "active"
     }'
   ```

2. **Initialize Email Campaigns**
   ```bash
   curl -X POST http://localhost:3000/api/email/campaigns/initialize
   ```

3. **Test Lead Capture**
   ```bash
   curl -X POST http://localhost:3000/api/leads/capture \
     -H "Content-Type: application/json" \
     -d '{
       "businessName": "Test Business",
       "website": "https://test.com",
       "name": "John Doe",
       "email": "test@example.com",
       "industry": "Technology"
     }'
   ```

   Check Discord - you should see a new lead notification!

4. **Generate a Test PDF Report**
   ```bash
   curl -X POST http://localhost:3000/api/reports/generate/CLIENT_ID \
     -H "Content-Type: application/json" \
     -d '{"period": "October 2025", "reportType": "monthly"}'
   ```

---

## Useful Commands

```bash
# View logs
pm2 logs seo-automation

# Restart app
pm2 restart seo-automation

# Stop app
pm2 stop seo-automation

# Monitor resources
pm2 monit

# Check automation schedule
curl http://localhost:3000/api/automation/schedule
```

---

## Optional: Enable Rank Tracking & Local SEO

After setting up Google Search Console API (see full deployment guide):

1. Edit `.env`:
   ```env
   RANK_TRACKING_ENABLED=true
   RANK_TRACKING_SCHEDULE=0 6 * * *
   LOCAL_SEO_ENABLED=true
   LOCAL_SEO_SCHEDULE=0 7 * * *
   ```

2. Restart:
   ```bash
   pm2 restart seo-automation
   ```

---

## Optional: Production Setup with SSL

### Install Nginx

```bash
sudo apt install nginx -y
```

### Install SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/default
```

Replace contents with:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

Now access via `https://yourdomain.com`

---

## Troubleshooting

**App won't start:**
```bash
pm2 logs seo-automation --lines 50
# Check for errors in logs
```

**Discord not working:**
```bash
# Test webhook
curl -X POST -H "Content-Type: application/json" \
  -d '{"content": "Test"}' $DISCORD_WEBHOOK_URL
```

**Emails not sending:**
```bash
# Verify SMTP settings
grep SMTP .env

# Test connection (install nodemailer if needed)
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: '$SMTP_HOST',
  port: $SMTP_PORT,
  auth: { user: '$SMTP_USER', pass: '$SMTP_PASS' }
});
transport.verify().then(() => console.log('✅ SMTP OK')).catch(console.error);
"
```

**Need more help?**
See the full [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for comprehensive instructions.

---

## What You've Deployed

✅ **Full SEO Automation Platform** with:
- Lead capture with Discord alerts
- Automated email campaigns (CAN-SPAM compliant)
- PDF report generation
- Multi-client management
- White-label branding
- Complete API (93 endpoints)
- 99.87% test coverage (801 tests)

**Optional features** (require additional setup):
- Automated rank tracking (daily)
- Local SEO automation (daily)
- Google Search Console integration

---

## Resources

- **API Docs:** `docs/API.md`
- **Full Deployment Guide:** `docs/DEPLOYMENT_GUIDE.md`
- **Phase 1 Features:** `docs/PHASE1_COMPLETION_STATUS.md`
- **Dashboard:** `http://your-server:3000`

---

**🎉 Congratulations! Your SEO Automation Platform is live!**

**Deployment Time:** ~15 minutes
**Next:** Start adding clients and capturing leads!
