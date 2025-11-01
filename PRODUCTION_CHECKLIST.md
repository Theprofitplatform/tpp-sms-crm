# 🚀 Production Deployment Checklist - SEO Expert Platform

**Version**: 2.0.0  
**Last Updated**: 2025-11-01

---

## ⚠️ CRITICAL - DO NOT DEPLOY WITHOUT THESE

### 🔐 Security (MUST COMPLETE ALL)

- [ ] **Authentication & Authorization**
  - [ ] Implement user authentication (JWT, session-based)
  - [ ] Add role-based access control (RBAC)
  - [ ] Secure all API endpoints
  - [ ] Add API key authentication for Otto features
  - [ ] Implement password hashing (bcrypt)
  - [ ] Add 2FA for admin accounts

- [ ] **Server Hardening**
  ```bash
  # SSH Hardening
  - [ ] Disable password authentication
  - [ ] Use SSH keys only
  - [ ] Change default SSH port
  - [ ] Install fail2ban
  sudo apt install fail2ban
  sudo systemctl enable fail2ban
  
  # Firewall
  - [ ] Configure ufw/iptables
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow ssh
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  
  # Auto-security updates
  - [ ] Enable unattended-upgrades
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  ```

- [ ] **Application Security**
  - [ ] Set .env file permissions to 600
  - [ ] Enable helmet security headers (verify)
  - [ ] Configure CORS properly
  - [ ] Enable rate limiting (verify existing config)
  - [ ] Add input validation on all endpoints
  - [ ] Implement SQL injection protection
  - [ ] Add XSS protection
  - [ ] Configure Content Security Policy (CSP)
  - [ ] Add CSRF tokens for forms

- [ ] **Database Security**
  - [ ] Encrypt database at rest
  - [ ] Use prepared statements (already done)
  - [ ] Restrict database file permissions (600)
  - [ ] Regular security audits

- [ ] **Secrets Management**
  - [ ] Never commit .env to git (verify .gitignore)
  - [ ] Use environment variables for all secrets
  - [ ] Rotate API keys regularly
  - [ ] Document secret rotation procedure

---

## 🏗️ Infrastructure Setup

### Domain & DNS
- [ ] Purchase/configure domain name
- [ ] Point A record to server IP
- [ ] Configure www redirect
- [ ] Set up CAA records for SSL
- [ ] Wait for DNS propagation (24-48h)

### SSL Certificate
```bash
- [ ] Install certbot
sudo apt install certbot python3-certbot-nginx

- [ ] Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

- [ ] Test auto-renewal
sudo certbot renew --dry-run

- [ ] Set up auto-renewal cron
# Already done by certbot, verify:
systemctl status certbot.timer
```

### Nginx Reverse Proxy
```bash
- [ ] Install nginx
sudo apt install nginx

- [ ] Create configuration file
sudo nano /etc/nginx/sites-available/seo-expert

# Add this configuration:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Max request size
    client_max_body_size 10M;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript;
    
    # Reverse proxy
    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:9000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

- [ ] Enable configuration
sudo ln -s /etc/nginx/sites-available/seo-expert /etc/nginx/sites-enabled/

- [ ] Test configuration
sudo nginx -t

- [ ] Reload nginx
sudo systemctl reload nginx
```

---

## 💾 Database Backup Strategy

### Automated Backups
```bash
- [ ] Create backup script
sudo nano /usr/local/bin/backup-seo-db.sh

#!/bin/bash
BACKUP_DIR="/var/backups/seo-expert"
DB_FILE="/var/www/seo-expert/data/seo-automation.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sqlite3 $DB_FILE ".backup $BACKUP_DIR/backup_$TIMESTAMP.db"

# Compress
gzip $BACKUP_DIR/backup_$TIMESTAMP.db

# Delete old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "$(date): Backup completed - backup_$TIMESTAMP.db.gz" >> $BACKUP_DIR/backup.log

# Optional: Upload to S3/cloud storage
# aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.db.gz s3://your-bucket/backups/

- [ ] Make executable
sudo chmod +x /usr/local/bin/backup-seo-db.sh

- [ ] Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-seo-db.sh

- [ ] Test backup script
sudo /usr/local/bin/backup-seo-db.sh
ls -lh /var/backups/seo-expert/

- [ ] Document restore procedure
# To restore:
gunzip /var/backups/seo-expert/backup_TIMESTAMP.db.gz
sqlite3 /path/to/seo-automation.db < /var/backups/seo-expert/backup_TIMESTAMP.db
```

### Backup Verification
```bash
- [ ] Weekly backup restore test
- [ ] Verify backup integrity
- [ ] Test point-in-time recovery
- [ ] Document recovery time objective (RTO)
- [ ] Document recovery point objective (RPO)
```

---

## 🔄 PM2 Production Setup

```bash
- [ ] Configure PM2 ecosystem for production
# Already done: ecosystem.config.cjs

- [ ] Start production processes
npx pm2 start ecosystem.config.cjs --env production

- [ ] Save PM2 configuration
npx pm2 save

- [ ] Generate PM2 startup script
npx pm2 startup
# IMPORTANT: Copy and run the command it outputs!

- [ ] Test startup script
sudo reboot
# After reboot:
npx pm2 status
# Should show services running

- [ ] Install PM2 log rotation
npx pm2 install pm2-logrotate

- [ ] Configure log rotation
npx pm2 set pm2-logrotate:max_size 10M
npx pm2 set pm2-logrotate:retain 30
npx pm2 set pm2-logrotate:compress true

- [ ] Set up PM2 monitoring (optional but recommended)
npx pm2 link <secret_key> <public_key>
```

---

## 📊 Monitoring & Alerting

### Uptime Monitoring
- [ ] Set up UptimeRobot or Pingdom
  - [ ] Monitor https://yourdomain.com
  - [ ] Monitor https://yourdomain.com/api/v2/health
  - [ ] Set check interval: 5 minutes
  - [ ] Configure email alerts
  - [ ] Configure SMS alerts for critical

### Error Tracking
- [ ] Install Sentry (recommended)
```bash
npm install @sentry/node
# Add to dashboard-server.js
```
- [ ] Configure error reporting
- [ ] Set up error alerting
- [ ] Create on-call rotation

### Application Monitoring
- [ ] PM2 monitoring dashboard
  ```bash
  npx pm2 web
  # Access at http://localhost:9615
  ```
- [ ] Set up custom health checks
- [ ] Monitor API response times
- [ ] Monitor database query performance
- [ ] Set up resource alerts (CPU, memory, disk)

### Log Management
```bash
- [ ] Configure log retention
- [ ] Set up log rotation (already done with PM2)
- [ ] Optional: Centralized logging (ELK, Loki)
- [ ] Set up log alerts for errors
```

---

## 🧪 Pre-Deployment Testing

### Load Testing
```bash
- [ ] Install Apache Bench
sudo apt install apache2-utils

- [ ] Test dashboard load
ab -n 1000 -c 10 https://yourdomain.com/

- [ ] Test API endpoints
ab -n 500 -c 5 https://yourdomain.com/api/dashboard

- [ ] Test Otto APIs
ab -n 200 -c 5 -p pixel.json -T application/json \
   https://yourdomain.com/api/v2/pixel/generate

- [ ] Verify acceptable response times (< 200ms)
- [ ] Check for memory leaks during load
- [ ] Test database performance under load
```

### Security Testing
```bash
- [ ] Run OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://yourdomain.com

- [ ] Check for exposed secrets
- [ ] Test authentication bypass attempts
- [ ] Verify rate limiting works
- [ ] Test SQL injection protection
- [ ] Test XSS protection
- [ ] Review security headers
curl -I https://yourdomain.com
```

### Functional Testing
```bash
- [ ] Run Otto features test suite
node test-otto-features.js

- [ ] Test all UI pages load
- [ ] Test critical user journeys
- [ ] Test on multiple browsers
- [ ] Test mobile responsiveness
- [ ] Test WebSocket connections
- [ ] Verify database migrations
```

---

## 🚀 Deployment Process

### Pre-Deployment
```bash
- [ ] Announce maintenance window (if needed)
- [ ] Create git tag for release
git tag -a v2.0.0 -m "Production release with Otto features"
git push origin v2.0.0

- [ ] Create database backup
./backup-seo-db.sh

- [ ] Document rollback procedure
- [ ] Have team on standby
```

### Deployment Steps
```bash
1. [ ] SSH into production server
   ssh production-server

2. [ ] Navigate to app directory
   cd /var/www/seo-expert

3. [ ] Pull latest code
   git fetch --all
   git checkout main
   git pull origin main

4. [ ] Install dependencies
   npm ci --omit=dev --ignore-scripts

5. [ ] Build dashboard
   cd dashboard
   npm ci --omit=dev --ignore-scripts
   npm run build
   cd ..

6. [ ] Run migrations (if any)
   # Add migration script if needed

7. [ ] Restart services with zero downtime
   npx pm2 reload ecosystem.config.cjs --env production

8. [ ] Verify deployment
   npx pm2 status
   curl https://yourdomain.com/api/v2/health
```

### Post-Deployment
```bash
- [ ] Run smoke tests
  - [ ] Homepage loads
  - [ ] API endpoints respond
  - [ ] Database queries work
  - [ ] Otto features accessible

- [ ] Monitor error logs for 30 minutes
  npx pm2 logs --lines 100

- [ ] Check application metrics
  - [ ] Response times normal
  - [ ] No error spike
  - [ ] Memory usage stable

- [ ] Test critical user paths
  - [ ] User can log in
  - [ ] User can access dashboard
  - [ ] Otto features work

- [ ] Update status page (if applicable)
- [ ] Announce deployment complete
- [ ] Document any issues encountered
```

---

## 🔄 Rollback Plan

```bash
# IF DEPLOYMENT FAILS:

1. [ ] Stop current processes
   npx pm2 stop all

2. [ ] Restore previous code
   git checkout <previous-tag>
   npm ci --omit=dev --ignore-scripts
   cd dashboard && npm ci --omit=dev && npm run build && cd ..

3. [ ] Restore database (if needed)
   gunzip /var/backups/seo-expert/backup_TIMESTAMP.db.gz
   cp /var/backups/seo-expert/backup_TIMESTAMP.db ./data/seo-automation.db

4. [ ] Restart services
   npx pm2 restart all

5. [ ] Verify rollback successful
   curl https://yourdomain.com/api/v2/health

6. [ ] Communicate incident
7. [ ] Create post-mortem document
```

---

## 📈 Performance Optimization

### Database Optimization
```bash
- [ ] Add indexes for frequently queried columns
- [ ] Optimize slow queries
- [ ] Enable WAL mode (already done)
- [ ] Set appropriate cache size
- [ ] Regular VACUUM operations
```

### Caching Strategy
```bash
- [ ] Optional: Install Redis for session/API caching
sudo apt install redis-server
npm install redis

- [ ] Cache API responses where appropriate
- [ ] Implement database query caching
- [ ] Set appropriate cache TTLs
```

### CDN Setup (Optional)
```bash
- [ ] Set up CloudFlare or similar
- [ ] Configure static asset caching
- [ ] Enable image optimization
- [ ] Configure asset compression
```

---

## 📚 Documentation

### Create Runbooks
```bash
- [ ] Common Issues Runbook
  - How to restart services
  - How to check logs
  - How to restore database
  - How to handle high load
  - How to rotate secrets

- [ ] Incident Response Plan
  - Escalation procedures
  - Communication templates
  - Root cause analysis template

- [ ] Maintenance Procedures
  - How to update dependencies
  - How to apply security patches
  - How to scale resources
```

### Update Documentation
```bash
- [ ] Update README with production URLs
- [ ] Document environment variables
- [ ] Create API documentation
- [ ] Document deployment process
- [ ] Create troubleshooting guide
```

---

## ✅ Final Verification Checklist

Before going live:
- [ ] All security items completed
- [ ] SSL certificate installed and valid
- [ ] Backups configured and tested
- [ ] Monitoring configured and alerting
- [ ] Load testing passed
- [ ] Security testing passed
- [ ] Rollback plan documented and tested
- [ ] Team trained on runbooks
- [ ] Support rotation scheduled
- [ ] Status page created (optional)
- [ ] Marketing/users notified of launch

---

## 📞 Emergency Contacts

```bash
- [ ] On-call engineer: 
- [ ] Backup engineer:
- [ ] Database admin:
- [ ] DevOps lead:
- [ ] Hosting provider support:
```

---

**DO NOT deploy to production until ALL critical items are completed.**

**Estimated time to complete**: 2-3 days for first production deployment
