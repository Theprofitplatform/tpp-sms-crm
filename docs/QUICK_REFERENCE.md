# Quick Reference Guide

Fast reference for common tasks and commands.

## 🚀 Getting Started

```bash
# Install
npm install

# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Run tests
npm test
```

## 📧 Email Commands

```bash
# Initialize email campaigns
curl -X POST http://localhost:3000/api/email/initialize

# Process email queue
curl -X POST http://localhost:3000/api/email/process-queue

# Check queue status
curl http://localhost:3000/api/email/queue

# Get email statistics
curl http://localhost:3000/api/email/stats
```

## 👥 Lead Management

```bash
# Capture a lead
curl -X POST http://localhost:3000/api/leads/capture \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business",
    "website": "https://test.com",
    "name": "John Doe",
    "email": "john@test.com",
    "phone": "(555) 123-4567",
    "industry": "Technology"
  }'

# Get all leads
curl http://localhost:3000/api/leads

# Get lead statistics
curl http://localhost:3000/api/leads/stats

# Update lead status
curl -X PUT http://localhost:3000/api/leads/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "contacted"}'
```

## 🎨 White-Label Configuration

```bash
# Create configuration
curl -X POST http://localhost:3000/api/white-label/config \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "my-brand",
    "isActive": true,
    "companyName": "My Company",
    "emailFromName": "My Company",
    "emailFromEmail": "hello@mycompany.com",
    "primaryColor": "#667eea"
  }'

# Get active configuration
curl http://localhost:3000/api/white-label/config

# Activate configuration
curl -X POST http://localhost:3000/api/white-label/config/1/activate
```

## 👤 User Management

```bash
# Register admin user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "admin",
    "email": "admin@company.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePass123!"
  }'
```

## 💾 Database Management

```bash
# Backup database
cp data/seo-automation.db backups/backup-$(date +%Y%m%d).db

# Check database size
du -h data/seo-automation.db

# View database
sqlite3 data/seo-automation.db

# Count leads
sqlite3 data/seo-automation.db "SELECT COUNT(*) FROM leads"

# Count emails sent
sqlite3 data/seo-automation.db "SELECT COUNT(*) FROM email_queue WHERE status='sent'"
```

## 🔧 Server Management

### PM2 Commands
```bash
# Start application
pm2 start dashboard-server.js --name seoapp

# View status
pm2 status

# View logs
pm2 logs seoapp

# Restart
pm2 restart seoapp

# Stop
pm2 stop seoapp

# Delete from PM2
pm2 delete seoapp

# Monitor resources
pm2 monit
```

### Systemd Commands
```bash
# Start service
sudo systemctl start seoapp

# Stop service
sudo systemctl stop seoapp

# Restart service
sudo systemctl restart seoapp

# View status
sudo systemctl status seoapp

# View logs
sudo journalctl -u seoapp -f

# Enable on boot
sudo systemctl enable seoapp
```

## 🌐 Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View error log
sudo tail -f /var/log/nginx/error.log

# View access log
sudo tail -f /var/log/nginx/access.log
```

## 🔐 SSL/TLS Management

```bash
# Obtain certificate (first time)
sudo certbot --nginx -d app.yourdomain.com

# Renew certificates (automatic via cron)
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# List certificates
sudo certbot certificates
```

## 📊 Monitoring Commands

```bash
# Check application health
curl http://localhost:3000/api/health

# Check disk usage
df -h

# Check RAM usage
free -h

# Check CPU usage
top

# Check process
ps aux | grep node

# Check port
lsof -i :3000

# Check network connections
netstat -tlnp
```

## 🔍 Debugging

```bash
# View all logs (PM2)
pm2 logs --lines 100

# View error logs only
pm2 logs --err --lines 50

# Search logs for errors
grep -i error logs/app.log

# Check environment variables
printenv | grep SMTP

# Test SMTP connection
telnet smtp.gmail.com 587

# Test database connection
sqlite3 data/seo-automation.db "SELECT 1"
```

## 📁 File Locations

```
/home/user/seoexpert/               # Application root
├── data/seo-automation.db          # Database
├── logs/                           # Application logs
├── backups/                        # Database backups
├── public/                         # Static files
│   ├── admin/                      # Admin panel
│   ├── portal/                     # Client portal
│   └── leadmagnet/                 # Lead capture
├── src/                            # Source code
│   ├── automation/                 # Email automation
│   ├── database/                   # Database layer
│   └── white-label/                # White-label service
└── docs/                           # Documentation
```

## 🎯 Common Workflows

### Setup New Instance
```bash
git clone <repo>
cd seoexpert
npm install
cp .env.example .env
nano .env  # Configure
npm start
```

### Deploy Update
```bash
git pull
npm install
pm2 restart seoapp
pm2 logs seoapp
```

### Backup Before Update
```bash
cp data/seo-automation.db backups/pre-update-$(date +%Y%m%d).db
git pull
npm install
pm2 restart seoapp
```

### Troubleshoot Email Issues
```bash
# Check SMTP config
cat .env | grep SMTP

# Check email queue
curl http://localhost:3000/api/email/queue

# Process queue manually
curl -X POST http://localhost:3000/api/email/process-queue

# Check logs
pm2 logs seoapp | grep -i email
```

### Reset Database
```bash
pm2 stop seoapp
mv data/seo-automation.db backups/old-$(date +%Y%m%d).db
pm2 start seoapp
# Database will be recreated automatically
```

## 🔑 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `user@gmail.com` |
| `SMTP_PASS` | SMTP password | `app-password` |
| `FROM_EMAIL` | Sender email | `hello@company.com` |
| `FROM_NAME` | Sender name | `Company Name` |
| `DASHBOARD_URL` | Base URL | `https://app.company.com` |
| `JWT_SECRET` | JWT secret key | `random-secret-key` |
| `DATABASE_PATH` | DB file path | `./data/seo-automation.db` |

## 📱 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Lead Magnet | `http://localhost:3000/leadmagnet/` | Lead capture form |
| Client Portal | `http://localhost:3000/portal/` | Client dashboard |
| Admin Panel | `http://localhost:3000/admin/` | Admin dashboard |
| API Docs | `http://localhost:3000/api/health` | Health check |

## 🎨 Email Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | Lead name | `John Doe` |
| `{{businessName}}` | Business name | `Acme Corp` |
| `{{website}}` | Website URL | `acmecorp.com` |
| `{{seoScore}}` | Audit score | `68` |
| `{{totalClicks}}` | GSC clicks | `1,250` |
| `{{totalImpressions}}` | GSC impressions | `45,000` |
| `{{avgPosition}}` | Avg position | `8.5` |
| `{{companyName}}` | Your company | `Your Company` |
| `{{dashboardLink}}` | Portal URL | `https://...` |

## 🚨 Emergency Procedures

### Application Not Responding
```bash
pm2 restart seoapp
pm2 logs seoapp --err
```

### Database Locked
```bash
pm2 stop seoapp
rm data/seo-automation.db-shm
rm data/seo-automation.db-wal
pm2 start seoapp
```

### High Memory Usage
```bash
pm2 restart seoapp
pm2 monit  # Monitor resources
```

### SSL Certificate Expired
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Emails Not Sending
```bash
# Check queue
curl http://localhost:3000/api/email/queue

# Process manually
curl -X POST http://localhost:3000/api/email/process-queue

# Check SMTP
cat .env | grep SMTP
telnet smtp.gmail.com 587
```

## 📞 Support

- **Documentation**: `/docs/`
- **API Reference**: `/docs/API.md`
- **Setup Guide**: `/docs/SETUP.md`
- **Deployment**: `/docs/DEPLOYMENT.md`
- **Issues**: GitHub Issues

---

**Pro Tip**: Bookmark this page for quick access to common commands!
