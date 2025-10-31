# 🚀 Production Deployment Guide

**SEO Automation Platform - Production Deployment**

---

## 📋 Pre-Deployment Checklist

### ✅ System Ready Status

Your platform has completed:
- ✅ Phase 2: Security Hardening (JWT, rate limiting, Helmet)
- ✅ Phase 3: Production Configuration (email, GSC, backups, monitoring)
- ✅ Phase 4: Process Management (PM2 clustering, auto-restart)
- ✅ Phase 5: Input Validation (19 schemas, XSS protection)
- ✅ Phase 6: Auto-Fix Testing (17 engines verified)
- ✅ Phase 7: Automated Testing (60+ tests)
- ✅ Phase 8: Security Audit (95% score, 0 critical issues)

**Total Progress:** 8/20 phases (40%) - **All Core Features Complete**

---

## 🎯 Deployment Options

### Option 1: VPS Deployment (Recommended)
**Best for:** Full control, scalability, custom domains
**Providers:** DigitalOcean, Linode, AWS EC2, Vultr
**Cost:** $10-20/month
**Time:** 30-60 minutes

### Option 2: Platform as a Service (Easiest)
**Best for:** Quick deployment, managed infrastructure
**Providers:** Heroku, Railway, Render, Fly.io
**Cost:** $5-15/month
**Time:** 15-30 minutes

### Option 3: Self-Hosted (Local/Office Server)
**Best for:** Internal use, data privacy, no monthly cost
**Requirements:** Linux server, static IP
**Cost:** Hardware only
**Time:** 45-90 minutes

---

## 🚀 Option 1: VPS Deployment (Detailed)

### Step 1: Provision VPS

**Recommended Specs:**
- **OS:** Ubuntu 22.04 LTS
- **RAM:** 2GB minimum (4GB recommended)
- **Storage:** 50GB SSD
- **CPU:** 2 cores
- **Bandwidth:** Unlimited or 2TB+

**Providers:**
```bash
# DigitalOcean Droplet
- $12/month: 2GB RAM, 1 CPU, 50GB SSD
- Location: Choose nearest to your clients

# Linode
- $12/month: 2GB RAM, 1 CPU, 50GB SSD
- Easy setup, good documentation

# Vultr
- $10/month: 2GB RAM, 1 CPU, 55GB SSD
- Global locations

# AWS EC2 (t3.small)
- ~$15/month: 2GB RAM, 2 CPUs
- Free tier available (12 months)
```

### Step 2: Initial Server Setup

**Connect to your server:**
```bash
ssh root@your-server-ip
```

**Update system:**
```bash
apt update && apt upgrade -y
```

**Create deployment user:**
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

**Install Node.js 20:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

**Install PM2 globally:**
```bash
sudo npm install -g pm2
pm2 --version
```

**Install Git:**
```bash
sudo apt install -y git
```

**Install build essentials:**
```bash
sudo apt install -y build-essential python3
```

### Step 3: Clone and Setup Application

**Clone repository (or upload files):**
```bash
cd ~
git clone YOUR_REPO_URL seo-automation
# OR upload via scp/sftp
```

**Install dependencies:**
```bash
cd ~/seo-automation
npm install --production
```

**Set up production environment:**
```bash
# Copy .env template
cp .env .env.production

# Edit production config
nano .env.production
```

**Production .env configuration:**
```env
# Environment
NODE_ENV=production

# Server
PORT=3000
HOST=0.0.0.0

# Security - CHANGE THESE!
JWT_SECRET=<generate-64-char-random-string>

# API Keys (if using AI features)
ANTHROPIC_API_KEY=<your-key-or-leave-empty>
OPENAI_API_KEY=<your-key-or-leave-empty>

# Email (choose one)
# Option 1: Gmail
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=<16-char-app-password>

# Option 2: SendGrid
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-sendgrid-api-key>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=SEO Automation

# Option 3: AWS SES
EMAIL_PROVIDER=aws-ses
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# Features
RANK_TRACKING_ENABLED=true
LOCAL_SEO_ENABLED=true
EMAIL_NOTIFICATIONS_ENABLED=true

# Database
DATABASE_PATH=./data/seo-automation.db
BACKUP_PATH=./backups

# Google Search Console (optional)
GOOGLE_APPLICATION_CREDENTIALS=./config/gsc-service-account.json
```

**Generate secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_SECRET in .env.production
```

### Step 4: Initialize Database

**Create data directory:**
```bash
mkdir -p ~/seo-automation/data
mkdir -p ~/seo-automation/backups
mkdir -p ~/seo-automation/logs
```

**Initialize database:**
```bash
cd ~/seo-automation
NODE_ENV=production node -e "import('./src/database/index.js').then(m => m.initializeDatabase())"
```

**Create admin user:**
```bash
node scripts/create-admin-user.js
# Follow prompts to create admin account
```

**Add real clients:**
```bash
node scripts/add-real-clients.js
```

### Step 5: Configure PM2

**Start all services:**
```bash
NODE_ENV=production pm2 start ecosystem.config.js
```

**Check status:**
```bash
pm2 status
pm2 logs
```

**Save PM2 configuration:**
```bash
pm2 save
```

**Setup PM2 startup script:**
```bash
pm2 startup
# Copy and run the command it outputs
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

**Verify PM2 autostart:**
```bash
pm2 list
sudo systemctl status pm2-deploy
```

### Step 6: Configure Firewall

**Install UFW:**
```bash
sudo apt install -y ufw
```

**Configure firewall rules:**
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow application port
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### Step 7: Set Up Reverse Proxy (Nginx)

**Install Nginx:**
```bash
sudo apt install -y nginx
```

**Create Nginx configuration:**
```bash
sudo nano /etc/nginx/sites-available/seo-automation
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js app
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
    }

    # Serve static files directly
    location /static {
        alias /home/deploy/seo-automation/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/seo-automation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Configure Domain DNS

**Point your domain to server:**
```
A Record:
Name: @ (or your subdomain)
Value: YOUR_SERVER_IP
TTL: 300

A Record (www):
Name: www
Value: YOUR_SERVER_IP
TTL: 300
```

**Wait for DNS propagation:**
```bash
# Check DNS
nslookup yourdomain.com
dig yourdomain.com
```

### Step 9: SSL Certificate (Let's Encrypt)

**Install Certbot:**
```bash
sudo apt install -y certbot python3-certbot-nginx
```

**Get SSL certificate:**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Follow prompts:**
- Enter email address
- Agree to terms
- Choose redirect HTTP to HTTPS (recommended)

**Test auto-renewal:**
```bash
sudo certbot renew --dry-run
```

**Certificate auto-renews every 90 days automatically**

### Step 10: Verify Deployment

**Check services:**
```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status pm2-deploy
```

**Check logs:**
```bash
pm2 logs dashboard --lines 50
pm2 logs keywords-service --lines 50
```

**Test application:**
```bash
# Health check
curl http://localhost:3000/health

# Dashboard
curl http://localhost:3000/

# API
curl http://localhost:3000/api/health
```

**Access dashboard:**
```
https://yourdomain.com
```

**Login with admin credentials** you created earlier.

---

## 🚀 Option 2: Platform as a Service (PaaS)

### Heroku Deployment

**1. Install Heroku CLI:**
```bash
npm install -g heroku
heroku login
```

**2. Create Heroku app:**
```bash
cd ~/seo-automation
heroku create your-app-name
```

**3. Add buildpacks:**
```bash
heroku buildpacks:add heroku/nodejs
```

**4. Set environment variables:**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
heroku config:set PORT=3000
# Add other env vars as needed
```

**5. Deploy:**
```bash
git push heroku main
```

**6. Scale dynos:**
```bash
heroku ps:scale web=1
```

**7. View logs:**
```bash
heroku logs --tail
```

### Railway Deployment

**1. Install Railway CLI:**
```bash
npm install -g @railway/cli
railway login
```

**2. Initialize project:**
```bash
cd ~/seo-automation
railway init
```

**3. Deploy:**
```bash
railway up
```

**4. Add environment variables in Railway dashboard**

### Render Deployment

**1. Create `render.yaml`:**
```yaml
services:
  - type: web
    name: seo-automation
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
```

**2. Connect GitHub repo in Render dashboard**

**3. Deploy automatically on push**

---

## 🚀 Option 3: Self-Hosted (Local/Office Server)

### Requirements

- **Hardware:** Any PC/Server with 4GB+ RAM
- **OS:** Ubuntu 22.04 or similar Linux
- **Network:** Static IP or Dynamic DNS
- **Access:** Port forwarding on router

### Setup Steps

**1. Install Ubuntu Server on hardware**

**2. Follow VPS steps above (Steps 2-10)**

**3. Configure router port forwarding:**
```
External Port 80 → Internal IP:80 (HTTP)
External Port 443 → Internal IP:443 (HTTPS)
External Port 22 → Internal IP:22 (SSH - optional)
```

**4. Use Dynamic DNS if no static IP:**
- NoIP.com (free)
- DuckDNS.org (free)
- DynDNS (paid)

---

## 📊 Post-Deployment Setup

### 1. Add WordPress Credentials

**For each client, create env file:**
```bash
cd ~/seo-automation/clients
cp instantautotraders.env.template instantautotraders.env
nano instantautotraders.env
```

**Add credentials:**
```env
WORDPRESS_URL=https://instantautotraders.com
WORDPRESS_USER=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx
GSC_PROPERTY=sc-domain:instantautotraders.com
```

**Test connection:**
```bash
node test-auth.js instantautotraders
```

### 2. Configure Email Notifications

**Gmail setup:**
1. Enable 2FA on Google account
2. Generate App Password (16 characters)
3. Add to .env.production

**SendGrid setup:**
1. Create SendGrid account (free tier: 100 emails/day)
2. Generate API key
3. Add to .env.production

**Test email:**
```bash
node scripts/test-email-service.js
```

### 3. Set Up Google Search Console

**Create service account:**
1. Go to Google Cloud Console
2. Create new project
3. Enable Google Search Console API
4. Create service account
5. Download JSON key
6. Upload to `config/gsc-service-account.json`

**Grant access in GSC:**
1. Open Search Console for each property
2. Settings → Users
3. Add service account email as Owner

**Test GSC:**
```bash
node scripts/test-gsc-setup.js
```

### 4. Schedule Automated Tasks

**PM2 handles scheduling automatically via ecosystem.config.js:**
- Daily audit: 2:00 AM
- Rank tracking: 6:00 AM
- Local SEO: 7:00 AM
- Email queue: Every hour

**Verify schedules:**
```bash
pm2 list
pm2 logs audit-scheduler
```

### 5. Configure Backups

**Automated backups already configured:**
```bash
# Daily backup at 2 AM
# 30-day retention
# Location: ./backups/

# Manual backup
./scripts/backup-database.sh

# List backups
ls -lh backups/
```

**Off-site backup (recommended):**
```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure S3
aws configure

# Sync backups to S3
aws s3 sync backups/ s3://your-bucket/seo-backups/
```

---

## 🔍 Production Verification

### Run All Tests

```bash
# Implementation tests
node scripts/test-implementation.js

# Security audit
node scripts/security-audit.js

# Validation tests
node scripts/test-validation.js

# Auto-fix engines
node scripts/test-autofix-engines.js
```

### Expected Results:
- ✅ Implementation: 33+ passing
- ✅ Security: 40/42 passing (95%)
- ✅ Validation: 22/22 passing (100%)
- ✅ Auto-fix: 17/17 engines ready

### Check Service Health

```bash
# PM2 status
pm2 status

# Application health
curl http://localhost:3000/health

# Database size
ls -lh data/seo-automation.db

# Logs
pm2 logs --lines 100
```

### Test User Flows

**1. Admin Login:**
- Visit https://yourdomain.com
- Login with admin credentials
- Verify dashboard loads

**2. Client Management:**
- View clients list
- Check client details
- Verify WordPress connections

**3. SEO Features:**
- Run manual audit
- Check rank tracking
- Test auto-fix (dry-run first)
- View activity logs

**4. Notifications:**
- Trigger test email
- Check email delivery
- Verify templates

---

## 📈 Monitoring & Maintenance

### Setup Monitoring

**PM2 Monitoring (built-in):**
```bash
pm2 monitor
```

**External Monitoring (recommended):**

**UptimeRobot (free):**
1. Create account at uptimerobot.com
2. Add HTTP(S) monitor
3. URL: https://yourdomain.com/health
4. Interval: 5 minutes
5. Alert email/SMS on downtime

**Healthchecks.io (free):**
```bash
# Add to cron
0 3 * * * curl https://hc-ping.com/YOUR-UUID
```

### Daily Maintenance

**Check logs:**
```bash
pm2 logs --lines 50
```

**Check disk space:**
```bash
df -h
du -sh ~/seo-automation/data
du -sh ~/seo-automation/backups
```

**Check memory:**
```bash
free -h
pm2 status
```

### Weekly Maintenance

**Update dependencies:**
```bash
cd ~/seo-automation
npm outdated
npm update
npm audit fix
```

**Review backups:**
```bash
ls -lh backups/
# Delete old backups if needed (30-day retention)
```

**Check SSL certificate:**
```bash
sudo certbot certificates
```

### Monthly Maintenance

**Security audit:**
```bash
node scripts/security-audit.js
npm audit
```

**Review activity logs:**
```bash
# Check database
sqlite3 data/seo-automation.db "SELECT COUNT(*) FROM activity_log;"
```

**Update system:**
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 🆘 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs

# Check environment
cat .env.production

# Check database
ls -l data/seo-automation.db

# Restart services
pm2 restart all
```

### Database Errors

```bash
# Check database integrity
sqlite3 data/seo-automation.db "PRAGMA integrity_check;"

# Restore from backup
cp backups/backup-YYYYMMDD.db data/seo-automation.db
pm2 restart all
```

### Connection Issues

```bash
# Check firewall
sudo ufw status

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl restart nginx

# Check DNS
nslookup yourdomain.com

# Check SSL
sudo certbot certificates
```

### High Memory Usage

```bash
# Check processes
pm2 status
free -h

# Restart services
pm2 restart all

# Adjust PM2 memory limits in ecosystem.config.js
```

### Email Not Sending

```bash
# Test email configuration
node scripts/test-email-service.js

# Check credentials
cat .env.production | grep EMAIL

# Check logs
pm2 logs | grep email
```

---

## 📞 Support Resources

### Documentation
- Production Deployment: `PRODUCTION_DEPLOYMENT_GUIDE.md` (this file)
- Phase Completion Docs: `PHASE_[2-8]_COMPLETE.md`
- Security Audit: `scripts/security-audit.js`
- Testing Guide: `PHASE_7_COMPLETE.md`

### Quick Commands
```bash
# Status
pm2 status
sudo systemctl status nginx

# Logs
pm2 logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart
pm2 restart all
sudo systemctl restart nginx

# Health check
curl http://localhost:3000/health
node scripts/test-implementation.js
```

### Getting Help
1. Check logs: `pm2 logs`
2. Run tests: `node scripts/test-implementation.js`
3. Security audit: `node scripts/security-audit.js`
4. Review documentation in repository

---

## 🎉 Deployment Complete!

**Your SEO Automation Platform is now live!**

### What's Deployed:
- ✅ Secure authentication system
- ✅ Client management
- ✅ WordPress integration
- ✅ SEO audit engine
- ✅ Rank tracking
- ✅ Local SEO automation
- ✅ Auto-fix system (17 engines)
- ✅ Email notifications
- ✅ Activity logging
- ✅ Automated backups
- ✅ Health monitoring
- ✅ PM2 process management

### Next Steps:
1. **Login:** https://yourdomain.com
2. **Add clients:** Complete WordPress credentials
3. **Run first audit:** Test on one client
4. **Enable auto-fix:** Start with dry-run
5. **Monitor:** Check daily for first week
6. **Optimize:** Adjust based on usage

### Success Metrics:
- Dashboard accessible ✅
- Admin login working ✅
- Services running ✅
- Backups automated ✅
- SSL configured ✅
- Monitoring active ✅

**Congratulations! 🎊**
