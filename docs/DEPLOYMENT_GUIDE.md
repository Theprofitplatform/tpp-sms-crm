# SEO Automation Platform - Deployment Guide

**Version:** 2.0.0 (Phase 1 Automation)
**Last Updated:** October 25, 2025
**Target Environment:** Production Server (Ubuntu 20.04+ / Node.js 18+)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Installation Steps](#installation-steps)
4. [Environment Configuration](#environment-configuration)
5. [Discord Setup](#discord-setup)
6. [Database Setup](#database-setup)
7. [SMTP Email Configuration](#smtp-email-configuration)
8. [Google Search Console Setup](#google-search-console-setup)
9. [Starting the Application](#starting-the-application)
10. [Verification & Testing](#verification--testing)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)
13. [Security Hardening](#security-hardening)

---

## Prerequisites

### Required Software

- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Git:** Latest version
- **Process Manager:** PM2 (recommended) or systemd
- **Reverse Proxy:** Nginx or Apache (for production)

### Required Accounts

- **Discord:** Account with webhook creation permissions
- **Gmail/SMTP:** For email sending capabilities
- **Google Search Console:** API access for rank tracking
- **Domain:** For production deployment

### Server Access

- SSH access to production server
- Sudo privileges for installation
- Firewall configuration access

---

## Server Requirements

### Minimum Specifications

- **CPU:** 2 cores
- **RAM:** 2GB
- **Storage:** 10GB SSD
- **Network:** 1Gbps
- **OS:** Ubuntu 20.04 LTS or higher

### Recommended Specifications (50+ clients)

- **CPU:** 4 cores
- **RAM:** 4GB
- **Storage:** 20GB SSD
- **Network:** 1Gbps
- **OS:** Ubuntu 22.04 LTS

### Ports to Open

- **3000:** Application server (internal)
- **80:** HTTP (Nginx)
- **443:** HTTPS (Nginx with SSL)

---

## Installation Steps

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 18.x

```bash
# Install Node.js from NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x or higher
npm --version   # Should be v9.x or higher
```

### 3. Install PM2 Process Manager

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 4. Create Application User

```bash
# Create dedicated user for security
sudo useradd -m -s /bin/bash seoapp
sudo su - seoapp
```

### 5. Clone Repository

```bash
cd /home/seoapp
git clone https://github.com/Theprofitplatform/seoexpert.git
cd seoexpert

# Checkout your branch (if not on main)
git checkout claude/check-project-status-011CUSDG25766qPWaUqHM1K3
```

### 6. Install Dependencies

```bash
npm install --production

# Verify no critical vulnerabilities
npm audit
```

---

## Environment Configuration

### 1. Create .env File

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

### 2. Configure Essential Variables

Edit `.env` with your production values:

```env
# =================================
# SERVER CONFIGURATION
# =================================
NODE_ENV=production
PORT=3000
DASHBOARD_URL=https://yourdomain.com

# =================================
# WORDPRESS CONNECTION
# =================================
WORDPRESS_URL=https://client-site.com
WORDPRESS_USER=your_username
WORDPRESS_APP_PASSWORD=your_app_password_here

# =================================
# EMAIL CONFIGURATION
# =================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Company Name
REPLY_TO_EMAIL=support@yourdomain.com

# Business address for CAN-SPAM compliance
BUSINESS_ADDRESS=123 Business St, Suite 100, City, State 12345

# =================================
# GOOGLE SEARCH CONSOLE
# =================================
GSC_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"

# =================================
# AI SERVICES (Optional)
# =================================
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# =================================
# SECURITY
# =================================
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
SESSION_SECRET=$(openssl rand -base64 32)

# =================================
# DATABASE
# =================================
DATABASE_PATH=./data/seo-automation.db

# =================================
# PHASE 1 AUTOMATION FEATURES
# =================================

# Discord Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
DISCORD_NOTIFICATIONS_ENABLED=true

# Automation Schedule (cron format: minute hour day month weekday)
RANK_TRACKING_ENABLED=true
RANK_TRACKING_SCHEDULE=0 6 * * *
LOCAL_SEO_ENABLED=true
LOCAL_SEO_SCHEDULE=0 7 * * *
LOCAL_SEO_AUTO_FIX=true
EMAIL_QUEUE_SCHEDULE=*/15 * * * *

# PDF Reports
PDF_STORAGE_PATH=./data/reports
PDF_MAX_SIZE_MB=10
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32

# Add these to your .env file
```

### 4. Set File Permissions

```bash
chmod 600 .env  # Only owner can read/write
```

---

## Discord Setup

### 1. Create Discord Server (if you don't have one)

1. Open Discord
2. Click the "+" button in the server list
3. Select "Create My Own"
4. Name it "SEO Automation Alerts" (or your preference)

### 2. Create Channel for Notifications

1. Right-click your server
2. Select "Create Channel"
3. Name it "automation-alerts"
4. Set permissions (make it read-only for most users)

### 3. Create Webhook

1. Go to channel settings (gear icon next to #automation-alerts)
2. Click "Integrations" → "Webhooks"
3. Click "New Webhook"
4. Name it "SEO Automation Bot"
5. Optionally upload an avatar
6. Click "Copy Webhook URL"
7. Paste URL into `.env` as `DISCORD_WEBHOOK_URL`

### 4. Test Webhook

```bash
# Test Discord webhook from command line
curl -X POST -H "Content-Type: application/json" \
  -d '{"content": "SEO Automation Platform Connected! 🚀"}' \
  $DISCORD_WEBHOOK_URL
```

You should see a message appear in your Discord channel.

---

## Database Setup

### 1. Create Data Directories

```bash
mkdir -p data/reports
mkdir -p logs/uploads
mkdir -p logs/clients
mkdir -p logs/local-seo

# Set permissions
chmod 755 data
chmod 755 data/reports
chmod 755 logs
```

### 2. Initialize Database

The database will auto-create on first run, but you can initialize it:

```bash
node -e "import('./src/database/index.js').then(db => console.log('Database initialized'))"
```

### 3. Verify Database Structure

```bash
sqlite3 data/seo-automation.db ".tables"
```

Expected output should include:
- `clients`
- `leads`
- `email_campaigns`
- `email_queue`
- `keyword_performance`
- `local_seo_scores`
- `reports_generated`
- And more...

### 4. Create Admin User (Optional)

```bash
# Run the server temporarily
node dashboard-server.js

# In another terminal, create admin user via API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!",
    "name": "Admin User"
  }'
```

---

## SMTP Email Configuration

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2FA on your Google Account**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "SEO Automation Platform"
   - Copy the 16-character password
   - Use this as `SMTP_PASS` in `.env`

3. **Configure .env**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com

2. **Create API Key**
   - Go to Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the key

3. **Configure .env**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=SG.your-api-key-here
   ```

### Option 3: AWS SES (Enterprise)

1. **Set up AWS SES**
   - Verify domain in AWS SES console
   - Request production access (move out of sandbox)
   - Create SMTP credentials

2. **Configure .env**
   ```env
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   ```

### Test Email Sending

```bash
# Start server
node dashboard-server.js

# Test email via API
curl -X POST http://localhost:3000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "body": "This is a test email from SEO Automation Platform"
  }'
```

---

## Google Search Console Setup

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create new project: "SEO Automation Platform"
3. Note the project ID

### 2. Enable Google Search Console API

1. Go to "APIs & Services" → "Library"
2. Search for "Google Search Console API"
3. Click "Enable"

### 3. Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Name: "seo-automation-gsc"
4. Grant role: "Project" → "Viewer"
5. Click "Done"

### 4. Generate Service Account Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Download the JSON file

### 5. Configure .env with Service Account

Open the downloaded JSON file and extract:
- `client_email`: Copy to `GSC_CLIENT_EMAIL` in `.env`
- `private_key`: Copy to `GSC_PRIVATE_KEY` in `.env`

**Important:** Keep the `\n` characters in the private key!

```env
GSC_CLIENT_EMAIL=seo-automation-gsc@project-id.iam.gserviceaccount.com
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### 6. Grant Service Account Access to GSC Properties

For each client website:

1. Go to https://search.google.com/search-console
2. Select the property
3. Go to Settings → Users and permissions
4. Click "Add user"
5. Enter the service account email: `seo-automation-gsc@project-id.iam.gserviceaccount.com`
6. Set permission to "Full" or "Owner"
7. Click "Add"

### 7. Test GSC Connection

```bash
# Test GSC API access
node -e "
import('./src/automation/google-search-console.js').then(module => {
  const gsc = new module.GoogleSearchConsole();
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];

  return gsc.getSearchAnalytics('https://example.com', {
    startDate,
    endDate,
    dimensions: ['query']
  });
}).then(data => {
  console.log('GSC API Test Successful!');
  console.log('Rows returned:', data.rows?.length || 0);
}).catch(err => {
  console.error('GSC API Test Failed:', err.message);
});
"
```

---

## Starting the Application

### Option 1: Using PM2 (Recommended)

#### 1. Create PM2 Ecosystem File

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'seo-automation',
    script: './dashboard-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
EOF
```

#### 2. Start Application

```bash
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs seo-automation
```

#### 3. Setup Auto-Start on Reboot

```bash
# Generate startup script
pm2 startup

# Copy and run the command it outputs (as sudo)

# Save current process list
pm2 save
```

#### 4. Useful PM2 Commands

```bash
# Restart app
pm2 restart seo-automation

# Stop app
pm2 stop seo-automation

# View logs (live)
pm2 logs seo-automation

# View logs (last 200 lines)
pm2 logs seo-automation --lines 200

# Monitor CPU/Memory
pm2 monit

# Delete app from PM2
pm2 delete seo-automation
```

### Option 2: Using systemd

#### 1. Create systemd Service File

```bash
sudo nano /etc/systemd/system/seo-automation.service
```

Add the following:

```ini
[Unit]
Description=SEO Automation Platform
After=network.target

[Service]
Type=simple
User=seoapp
WorkingDirectory=/home/seoapp/seoexpert
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /home/seoapp/seoexpert/dashboard-server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/home/seoapp/seoexpert/logs/app.log
StandardError=append:/home/seoapp/seoexpert/logs/error.log

[Install]
WantedBy=multi-user.target
```

#### 2. Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start seo-automation

# Enable auto-start on boot
sudo systemctl enable seo-automation

# Check status
sudo systemctl status seo-automation

# View logs
sudo journalctl -u seo-automation -f
```

### Option 3: Using Docker (Advanced)

#### 1. Create Dockerfile

```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "dashboard-server.js"]
EOF
```

#### 2. Create docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  seo-automation:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./.env:/app/.env:ro
    environment:
      - NODE_ENV=production
EOF
```

#### 3. Start with Docker Compose

```bash
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Verification & Testing

### 1. Health Check

```bash
# Check if server is running
curl http://localhost:3000/api/health

# Expected output:
{
  "status": "ok",
  "timestamp": "2025-10-25T...",
  "uptime": 123.45
}
```

### 2. Test Discord Notifications

```bash
# Trigger test notification (if you added this endpoint)
curl -X POST http://localhost:3000/api/test/discord

# Check Discord channel for message
```

### 3. Test Email Campaign

```bash
# Initialize default campaigns
curl -X POST http://localhost:3000/api/email/campaigns/initialize
```

### 4. Test Rank Tracking

```bash
# Add a test client first (if not exists)
# Then trigger rank tracking
curl -X POST http://localhost:3000/api/automation/rank-tracking/run
```

### 5. Test Local SEO Automation

```bash
curl -X POST http://localhost:3000/api/automation/local-seo/run
```

### 6. Test PDF Generation

```bash
curl -X POST http://localhost:3000/api/reports/generate/CLIENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "period": "October 2025",
    "reportType": "monthly"
  }'
```

### 7. Check Automation Schedule

```bash
curl http://localhost:3000/api/automation/schedule

# Expected output:
{
  "success": true,
  "scheduler": {
    "isRunning": true,
    "enabled": true,
    "schedule": "0 6 * * *"
  },
  "environment": {
    "rankTrackingEnabled": true,
    "localSeoEnabled": true,
    "discordEnabled": true
  }
}
```

---

## Monitoring & Maintenance

### 1. Log Monitoring

#### View Application Logs

```bash
# PM2 logs
pm2 logs seo-automation

# Or systemd logs
sudo journalctl -u seo-automation -f

# Or direct file logs
tail -f logs/pm2-out.log
tail -f logs/pm2-error.log
```

#### Set Up Log Rotation

```bash
sudo nano /etc/logrotate.d/seo-automation
```

Add:

```
/home/seoapp/seoexpert/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0644 seoapp seoapp
}
```

### 2. Database Backup

#### Automated Daily Backups

```bash
# Create backup script
cat > /home/seoapp/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/seoapp/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp /home/seoapp/seoexpert/data/seo-automation.db $BACKUP_DIR/seo-automation-$DATE.db
# Keep only last 30 days
find $BACKUP_DIR -name "seo-automation-*.db" -mtime +30 -delete
EOF

chmod +x /home/seoapp/backup-db.sh

# Add to crontab
crontab -e
```

Add line:
```
0 2 * * * /home/seoapp/backup-db.sh
```

### 3. Monitoring with PM2

```bash
# Install PM2 Plus (optional, for advanced monitoring)
pm2 link <secret_key> <public_key>

# Monitor in terminal
pm2 monit
```

### 4. Disk Space Monitoring

```bash
# Check disk usage
df -h

# Check specific directories
du -sh /home/seoapp/seoexpert/data
du -sh /home/seoapp/seoexpert/logs

# Clean old PDF reports (optional)
find /home/seoapp/seoexpert/data/reports -name "*.pdf" -mtime +90 -delete
```

### 5. Performance Monitoring

Create monitoring script:

```bash
cat > /home/seoapp/monitor.sh << 'EOF'
#!/bin/bash
echo "=== SEO Automation Status ==="
echo "Server Uptime: $(uptime)"
echo ""
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== Disk Usage ==="
df -h /home/seoapp
echo ""
echo "=== Memory Usage ==="
free -h
echo ""
echo "=== Database Size ==="
ls -lh /home/seoapp/seoexpert/data/seo-automation.db
echo ""
echo "=== Recent Logs (last 10 lines) ==="
pm2 logs seo-automation --lines 10 --nostream
EOF

chmod +x /home/seoapp/monitor.sh
```

Run: `./monitor.sh`

---

## Troubleshooting

### Issue 1: Server Won't Start

**Symptoms:** PM2 shows "errored" status

**Solutions:**

```bash
# Check logs for errors
pm2 logs seo-automation --lines 100

# Common issues:
# 1. Port already in use
sudo lsof -i :3000
# Kill the process using the port

# 2. Missing .env file
ls -la .env
# Create from .env.example

# 3. Permission issues
sudo chown -R seoapp:seoapp /home/seoapp/seoexpert
```

### Issue 2: Discord Notifications Not Working

**Symptoms:** No messages appearing in Discord

**Solutions:**

```bash
# 1. Test webhook directly
curl -X POST -H "Content-Type: application/json" \
  -d '{"content": "Test"}' \
  $DISCORD_WEBHOOK_URL

# 2. Check .env configuration
grep DISCORD .env

# 3. Verify DISCORD_NOTIFICATIONS_ENABLED=true
```

### Issue 3: Emails Not Sending

**Symptoms:** Emails stuck in queue

**Solutions:**

```bash
# 1. Check SMTP credentials
node -e "console.log(require('dotenv').config()); console.log(process.env.SMTP_USER)"

# 2. Test SMTP connection
npm install -g nodemailer
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transport.verify().then(console.log).catch(console.error);
"

# 3. Check email queue
sqlite3 data/seo-automation.db "SELECT * FROM email_queue WHERE status='pending' LIMIT 10;"
```

### Issue 4: Rank Tracking Failing

**Symptoms:** No rank data being collected

**Solutions:**

```bash
# 1. Verify GSC credentials
node -e "console.log('GSC Email:', process.env.GSC_CLIENT_EMAIL)"

# 2. Check GSC service account permissions
# Go to Google Search Console and verify service account has access

# 3. Test GSC API manually
# See "Google Search Console Setup" section

# 4. Check scheduler status
curl http://localhost:3000/api/automation/schedule
```

### Issue 5: High Memory Usage

**Symptoms:** PM2 shows high memory usage

**Solutions:**

```bash
# 1. Check current memory
pm2 status

# 2. Restart application
pm2 restart seo-automation

# 3. Increase max memory restart
pm2 start ecosystem.config.js --update-env --max-memory-restart 2G

# 4. Check for memory leaks in logs
pm2 logs seo-automation | grep -i "memory"
```

### Issue 6: Cron Jobs Not Running

**Symptoms:** Automated tasks not executing

**Solutions:**

```bash
# 1. Check if schedulers are enabled
curl http://localhost:3000/api/automation/schedule

# 2. Verify environment variables
grep "_ENABLED" .env

# 3. Check server timezone
timedatectl

# 4. Manually trigger to test
curl -X POST http://localhost:3000/api/automation/rank-tracking/run
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (for Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to app port
sudo ufw deny 3000/tcp

# Check status
sudo ufw status
```

### 2. Install and Configure Nginx

#### Install Nginx

```bash
sudo apt install nginx -y
```

#### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/seo-automation
```

Add:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (add after obtaining certificates)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /var/log/nginx/seo-automation-access.log;
    error_log /var/log/nginx/seo-automation-error.log;

    # Reverse proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /public {
        alias /home/seoapp/seoexpert/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # PDF reports (protected)
    location /api/reports {
        proxy_pass http://localhost:3000;
        # Add authentication here if needed
    }
}
```

#### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/seo-automation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
# Test renewal
sudo certbot renew --dry-run
```

### 4. Rate Limiting

Add to Nginx configuration (inside `server` block):

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3000;
    # ... other proxy settings
}
```

### 5. Secure Environment Variables

```bash
# Ensure .env is not readable by others
chmod 600 /home/seoapp/seoexpert/.env

# Add .env to .gitignore
echo ".env" >> .gitignore

# Never commit .env to version control
git update-index --assume-unchanged .env
```

### 6. Regular Security Updates

```bash
# Create update script
cat > /home/seoapp/update-system.sh << 'EOF'
#!/bin/bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
npm audit fix
pm2 restart seo-automation
EOF

chmod +x /home/seoapp/update-system.sh

# Schedule monthly updates (first Sunday at 3 AM)
sudo crontab -e
```

Add:
```
0 3 1-7 * 0 /home/seoapp/update-system.sh
```

---

## Post-Deployment Checklist

### Required Tasks

- [ ] Server provisioned and accessible via SSH
- [ ] Node.js 18+ installed
- [ ] Repository cloned and dependencies installed
- [ ] `.env` file created with all required variables
- [ ] Discord webhook configured and tested
- [ ] SMTP credentials configured and tested
- [ ] Google Search Console API set up
- [ ] Database initialized
- [ ] Application started with PM2 or systemd
- [ ] Health check endpoint responding
- [ ] Automation schedulers verified as running
- [ ] Nginx reverse proxy configured (if using)
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Firewall rules configured
- [ ] Backup cron job set up
- [ ] Log rotation configured
- [ ] Monitoring set up

### Optional Enhancements

- [ ] Custom domain pointed to server
- [ ] CDN configured (CloudFlare)
- [ ] Database replication set up
- [ ] Monitoring dashboard (PM2 Plus, DataDog, etc.)
- [ ] Error tracking (Sentry)
- [ ] Analytics (Plausible, Google Analytics)
- [ ] Status page (StatusPage.io)

---

## Support & Resources

### Documentation

- **API Documentation:** `/docs/API.md`
- **Phase 1 Features:** `/docs/PHASE1_COMPLETION_STATUS.md`
- **Architecture:** `/docs/ARCHITECTURE.md`

### Logs Location

- **Application Logs:** `/home/seoapp/seoexpert/logs/`
- **PM2 Logs:** `/home/seoapp/.pm2/logs/`
- **Nginx Logs:** `/var/log/nginx/`
- **System Logs:** `/var/log/syslog`

### Useful Commands Reference

```bash
# Application Management
pm2 restart seo-automation       # Restart app
pm2 logs seo-automation          # View logs
pm2 monit                        # Monitor resources

# System Monitoring
htop                             # System resources
df -h                            # Disk space
free -h                          # Memory usage
netstat -tulpn | grep :3000      # Port usage

# Database Management
sqlite3 data/seo-automation.db   # Open database
.tables                          # List tables
.schema tablename                # View table structure

# Nginx Management
sudo nginx -t                    # Test configuration
sudo systemctl restart nginx     # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # View errors
```

---

## Deployment Complete! 🚀

Your SEO Automation Platform is now deployed and ready for production use.

**Next Steps:**
1. Add your first client
2. Configure their WordPress credentials
3. Run initial audits
4. Monitor Discord for automation alerts
5. Review daily automation reports

**Questions or Issues?**
- Check the troubleshooting section above
- Review application logs
- Consult the API documentation

---

**Last Updated:** October 25, 2025
**Version:** 2.0.0 (Phase 1 Automation)
