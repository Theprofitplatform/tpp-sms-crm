# Production Deployment Guide

Complete guide for deploying the SEO Automation Platform to production.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Server Requirements](#server-requirements)
- [Deployment Options](#deployment-options)
- [Production Configuration](#production-configuration)
- [SMTP & Email Setup](#smtp--email-setup)
- [Domain & DNS Setup](#domain--dns-setup)
- [SSL/TLS Certificate](#ssltls-certificate)
- [Process Management](#process-management)
- [Monitoring & Logging](#monitoring--logging)
- [Backup Strategy](#backup-strategy)
- [Security Hardening](#security-hardening)

## Pre-Deployment Checklist

- [ ] Server provisioned (VPS, dedicated, or cloud instance)
- [ ] Domain name purchased and configured
- [ ] SMTP credentials obtained (Gmail, SendGrid, etc.)
- [ ] SSL certificate ready (Let's Encrypt recommended)
- [ ] Environment variables configured
- [ ] Database backed up
- [ ] Tests passing (npm test)
- [ ] Security audit completed

## Server Requirements

### Recommended Production Specs

- **OS**: Ubuntu 22.04 LTS
- **RAM**: 2GB minimum, 4GB+ recommended
- **CPU**: 2 cores minimum
- **Disk**: 20GB SSD
- **Bandwidth**: 100GB/month
- **Node.js**: 20.x LTS

### Server Providers

- **DigitalOcean**: $12/month (2GB RAM, 1 CPU)
- **Linode**: $12/month (2GB RAM, 1 CPU)
- **AWS EC2**: t3.small ($17/month)
- **Google Cloud**: e2-small ($13/month)
- **Hetzner**: €4.51/month (2GB RAM, 1 CPU)

## Deployment Options

### Option 1: Manual Deployment (Ubuntu)

#### Step 1: Connect to Server

```bash
ssh root@your-server-ip
```

#### Step 2: Update System

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx
```

#### Step 3: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
node --version  # Verify v20.x
```

#### Step 4: Create Application User

```bash
adduser seoapp
usermod -aG sudo seoapp
su - seoapp
```

#### Step 5: Clone Repository

```bash
cd ~
git clone https://github.com/yourcompany/seoexpert.git
cd seoexpert
```

#### Step 6: Install Dependencies

```bash
npm ci --production
```

#### Step 7: Configure Environment

```bash
cp .env.example .env
nano .env  # Edit with production values
```

#### Step 8: Start Application

```bash
npm start
```

### Option 2: Docker Deployment

#### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "dashboard-server.js"]
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

#### Deploy

```bash
docker-compose up -d
```

### Option 3: Platform as a Service

#### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-seo-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set PORT=3000
heroku config:set SMTP_HOST=smtp.sendgrid.net
# ... set all other variables

# Deploy
git push heroku main
```

#### Render.com

1. Connect GitHub repository
2. Select "Web Service"
3. Configure environment variables
4. Deploy automatically on push

#### Railway

1. Connect GitHub repository
2. Add environment variables
3. Deploy with one click

## Production Configuration

### Environment Variables

Create `.env.production`:

```env
# Server
NODE_ENV=production
PORT=3000

# Email (Use production SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-production-api-key

FROM_EMAIL=hello@yourdomain.com
FROM_NAME=Your Company
REPLY_TO_EMAIL=support@yourdomain.com
COMPANY_NAME=Your Company

# URLs (Use production domain)
DASHBOARD_URL=https://app.yourdomain.com

# Security
JWT_SECRET=your-super-secret-production-key-change-this
JWT_EXPIRES_IN=7d

# Database
DATABASE_PATH=/var/lib/seoapp/seo-automation.db
```

### File Permissions

```bash
# Data directory
mkdir -p /var/lib/seoapp
chown -R seoapp:seoapp /var/lib/seoapp
chmod 750 /var/lib/seoapp

# Application directory
chown -R seoapp:seoapp /home/seoapp/seoexpert
chmod 750 /home/seoapp/seoexpert
```

## SMTP & Email Setup

### SendGrid (Recommended for Production)

1. Sign up at https://sendgrid.com/
2. Verify sender identity:
   - Go to Settings → Sender Authentication
   - Add your domain
   - Follow DNS verification steps
3. Create API key:
   - Go to Settings → API Keys
   - Create key with "Mail Send" permission
4. Configure in `.env`:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key-here
```

### AWS SES

1. Sign up for AWS SES
2. Verify domain in SES console
3. Request production access (remove sandbox)
4. Create SMTP credentials
5. Configure DNS (SPF, DKIM, DMARC)

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

### Email Best Practices

1. **SPF Record**: Add to DNS
```
v=spf1 include:sendgrid.net ~all
```

2. **DKIM**: Configure via your email provider

3. **DMARC**: Add to DNS
```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

4. **Warm Up Domain**: Gradually increase sending volume
   - Day 1-7: Send 10-20 emails/day
   - Week 2-4: Increase by 20% weekly
   - Month 2+: Full volume

## Domain & DNS Setup

### DNS Configuration

**A Record** (for yourdomain.com):
```
Type: A
Name: @
Value: your-server-ip
TTL: 3600
```

**A Record** (for app.yourdomain.com):
```
Type: A
Name: app
Value: your-server-ip
TTL: 3600
```

**CNAME Record** (for www):
```
Type: CNAME
Name: www
Value: yourdomain.com
TTL: 3600
```

### Nginx Configuration

Create `/etc/nginx/sites-available/seoapp`:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/seoapp /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## SSL/TLS Certificate

### Let's Encrypt (Free)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d app.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
certbot renew --dry-run
```

### Nginx HTTPS Configuration (Auto-configured by Certbot)

```nginx
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        # ... proxy headers
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Process Management

### PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dashboard-server.js --name seoapp

# Configure auto-restart on boot
pm2 startup
pm2 save

# Useful commands
pm2 status
pm2 logs seoapp
pm2 restart seoapp
pm2 stop seoapp
pm2 delete seoapp
```

### Systemd Service

Create `/etc/systemd/system/seoapp.service`:

```ini
[Unit]
Description=SEO Automation Platform
After=network.target

[Service]
Type=simple
User=seoapp
WorkingDirectory=/home/seoapp/seoexpert
ExecStart=/usr/bin/node dashboard-server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable seoapp
systemctl start seoapp
systemctl status seoapp
```

## Monitoring & Logging

### Application Logs

```bash
# View PM2 logs
pm2 logs seoapp

# View systemd logs
journalctl -u seoapp -f

# Custom logging (add to application)
# Install Winston
npm install winston

# Configure in dashboard-server.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Server Monitoring

```bash
# Install monitoring tools
apt install htop iotop nethogs

# Monitor resources
htop           # CPU/RAM usage
iotop          # Disk I/O
nethogs        # Network usage
```

### Uptime Monitoring

Use external services:
- **UptimeRobot**: https://uptimerobot.com/ (free)
- **Pingdom**: https://www.pingdom.com/
- **StatusCake**: https://www.statuscake.com/

## Backup Strategy

### Database Backup

Create backup script `/home/seoapp/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/home/seoapp/backups"
DB_PATH="/var/lib/seoapp/seo-automation.db"

mkdir -p $BACKUP_DIR

# Backup database
cp $DB_PATH $BACKUP_DIR/seo-automation-$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -name "seo-automation-*.db" -mtime +30 -delete

# Optional: Upload to S3
# aws s3 cp $BACKUP_DIR/seo-automation-$DATE.db s3://your-bucket/backups/
```

Make executable and add to cron:
```bash
chmod +x /home/seoapp/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/seoapp/backup.sh
```

### Automated Backups

```bash
# Install s3cmd for AWS S3
apt install s3cmd
s3cmd --configure

# Or use rclone for multiple cloud providers
curl https://rclone.org/install.sh | sudo bash
rclone config
```

## Security Hardening

### Firewall

```bash
# Install UFW
apt install ufw

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
ufw status
```

### Fail2Ban

```bash
# Install Fail2Ban
apt install fail2ban

# Configure
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
nano /etc/fail2ban/jail.local

# Start service
systemctl enable fail2ban
systemctl start fail2ban
```

### Security Headers (Nginx)

Add to nginx configuration:

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### Regular Updates

```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js dependencies
cd /home/seoapp/seoexpert
npm update
npm audit fix

# Restart application
pm2 restart seoapp
```

## Post-Deployment Checklist

- [ ] Application accessible via HTTPS
- [ ] SSL certificate valid
- [ ] Email sending working
- [ ] Database backups configured
- [ ] Monitoring active
- [ ] Firewall configured
- [ ] DNS records propagated
- [ ] Admin account created
- [ ] White-label configuration set
- [ ] Test lead capture flow
- [ ] Test email campaigns
- [ ] Load testing completed

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs seoapp --lines 100

# Check port
lsof -i :3000

# Check environment
printenv | grep NODE_ENV
```

### SMTP Errors

```bash
# Test SMTP connection
telnet smtp.sendgrid.net 587

# Check credentials
curl -X POST http://localhost:3000/api/email/initialize
```

### Database Locked

```bash
# Stop application
pm2 stop seoapp

# Remove lock files
rm /var/lib/seoapp/seo-automation.db-shm
rm /var/lib/seoapp/seo-automation.db-wal

# Restart
pm2 start seoapp
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (Nginx, HAProxy)
- Deploy multiple application instances
- Shared database (migrate to PostgreSQL/MySQL)
- Session management (Redis)

### Vertical Scaling

- Upgrade server resources
- Optimize database queries
- Implement caching (Redis)
- CDN for static assets

## Support

Need help with deployment?

- Check [SETUP.md](SETUP.md) for basic configuration
- Review [API.md](API.md) for endpoint reference
- Contact: support@yourcompany.com

---

**Production deployment complete!** 🚀 Your SEO platform is live!
