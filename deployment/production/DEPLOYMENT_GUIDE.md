# Production Deployment Guide

Complete guide for deploying the unified keyword tracking system to production.

## Pre-Deployment Checklist

### 1. Environment Preparation
- [ ] Production server provisioned
- [ ] Domain name configured
- [ ] SSL certificates obtained
- [ ] Database server ready (PostgreSQL recommended)
- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed
- [ ] Docker & Docker Compose installed

### 2. Security
- [ ] JWT secret key generated
- [ ] API keys secured in environment variables
- [ ] Database credentials encrypted
- [ ] Firewall rules configured
- [ ] HTTPS enforced
- [ ] Rate limiting configured

### 3. Code & Dependencies
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Dependencies audited (`npm audit`, `pip check`)
- [ ] Environment variables documented
- [ ] Backup strategy defined

---

## Deployment Steps

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.9+
sudo apt install -y python3 python3-pip python3-venv

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose
```

### Step 2: Database Setup

```bash
# Create production database
sudo -u postgres psql

CREATE DATABASE seo_unified_prod;
CREATE USER seo_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE seo_unified_prod TO seo_user;
\q

# Initialize schema
psql -U seo_user -d seo_unified_prod -f database/unified-schema.sql
```

### Step 3: Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/seo-platform.git /var/www/seo-platform
cd /var/www/seo-platform

# Install dependencies
npm install --production
cd keyword-service && pip3 install -r requirements.txt
cd ../dashboard && npm install --production

# Build frontend
cd dashboard && npm run build
```

### Step 4: Environment Configuration

```bash
# Create .env file
cat > .env << 'EOF'
# Server
NODE_ENV=production
PORT=9000

# Database
DATABASE_URL=postgresql://seo_user:PASSWORD@localhost:5432/seo_unified_prod
SERPBEAR_DB_PATH=/var/www/seo-platform/serpbear/data/serpbear.db
KEYWORD_SERVICE_DB_PATH=/var/www/seo-platform/keyword-service/keywords.db

# Security
JWT_SECRET=GENERATE_STRONG_SECRET_HERE
API_KEY_SALT=GENERATE_STRONG_SALT_HERE

# External APIs
SERPAPI_KEY=your_serpapi_key
GOOGLE_ADS_CLIENT_ID=your_google_ads_id
GOOGLE_ADS_CLIENT_SECRET=your_google_ads_secret

# Sync Configuration
SYNC_INTERVAL=*/5 * * * *  # Every 5 minutes
ENABLE_AUTO_SYNC=true

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
EOF

# Secure the file
chmod 600 .env
```

### Step 5: Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'dashboard-server',
      script: './dashboard-server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 9000
      },
      error_file: './logs/dashboard-error.log',
      out_file: './logs/dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'keyword-service',
      script: 'python3',
      args: 'api_server.py',
      cwd: './keyword-service',
      instances: 1,
      env: {
        FLASK_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/keyword-service-error.log',
      out_file: './logs/keyword-service-out.log'
    },
    {
      name: 'sync-service',
      script: './src/services/sync-runner.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/sync-error.log',
      out_file: './logs/sync-out.log'
    }
  ]
};
EOF

# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the instructions output by the command above
```

### Step 6: Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo cat > /etc/nginx/sites-available/seo-platform << 'EOF'
upstream dashboard_backend {
    least_conn;
    server localhost:9000;
}

upstream keyword_service {
    server localhost:5000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/json application/javascript;

    # Frontend (React build)
    location / {
        root /var/www/seo-platform/dashboard/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://dashboard_backend;
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

        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
    }

    # Logs
    access_log /var/log/nginx/seo-platform-access.log;
    error_log /var/log/nginx/seo-platform-error.log;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/seo-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is setup automatically
# Test renewal:
sudo certbot renew --dry-run
```

### Step 8: Database Migrations

```bash
# Run migrations
cd /var/www/seo-platform
node run-migration.js

# Verify schema
psql -U seo_user -d seo_unified_prod -c "\dt"
```

### Step 9: Initial Data Sync

```bash
# Trigger initial sync
curl -X POST http://localhost:9000/api/v2/sync/trigger

# Monitor sync status
curl http://localhost:9000/api/v2/sync/status
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Status
pm2 status

# Metrics
pm2 metrics
```

### Application Logs

```bash
# Create log directory
mkdir -p /var/www/seo-platform/logs

# Rotate logs with logrotate
sudo cat > /etc/logrotate.d/seo-platform << 'EOF'
/var/www/seo-platform/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### Health Checks

```bash
# Create health check script
cat > /var/www/seo-platform/healthcheck.sh << 'EOF'
#!/bin/bash

# Check dashboard server
if ! curl -f http://localhost:9000/api/v2/health > /dev/null 2>&1; then
    echo "Dashboard server unhealthy"
    exit 1
fi

# Check keyword service
if ! curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "Keyword service unhealthy"
    exit 1
fi

# Check database
if ! pg_isready -h localhost -U seo_user -d seo_unified_prod > /dev/null 2>&1; then
    echo "Database unhealthy"
    exit 1
fi

echo "All services healthy"
exit 0
EOF

chmod +x /var/www/seo-platform/healthcheck.sh

# Add to cron for monitoring
crontab -e
# Add line:
# */5 * * * * /var/www/seo-platform/healthcheck.sh || /usr/bin/notify-admin.sh
```

---

## Backup Strategy

### Database Backups

```bash
# Create backup script
cat > /var/www/seo-platform/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/seo-platform"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/seo_unified_prod_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump -U seo_user seo_unified_prod | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /var/www/seo-platform/backup-db.sh

# Schedule daily backups
crontab -e
# Add:
# 0 2 * * * /var/www/seo-platform/backup-db.sh
```

### Application Backups

```bash
# Backup application files
tar -czf /var/backups/seo-platform/app_$(date +%Y%m%d).tar.gz \
  /var/www/seo-platform \
  --exclude=node_modules \
  --exclude=__pycache__ \
  --exclude=.git
```

---

## Scaling Considerations

### Horizontal Scaling

```bash
# Use Docker Swarm or Kubernetes for horizontal scaling
# Example docker-compose.prod.yml:

version: '3.8'
services:
  dashboard:
    image: seo-platform:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
    ports:
      - "9000:9000"

  keyword-service:
    image: keyword-service:latest
    deploy:
      replicas: 2
    ports:
      - "5000:5000"

  postgres:
    image: postgres:15
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  pg_data:
```

### Load Balancing

- Use Nginx upstream for load balancing
- Consider HAProxy for advanced load balancing
- Use Redis for session storage in multi-server setup

---

## Rollback Procedure

```bash
# If deployment fails, rollback:

# 1. Stop new version
pm2 stop all

# 2. Restore previous code
git checkout previous-tag
npm install --production

# 3. Rollback database if needed
psql -U seo_user -d seo_unified_prod < /var/backups/latest_backup.sql

# 4. Restart services
pm2 restart all

# 5. Verify
/var/www/seo-platform/healthcheck.sh
```

---

## Post-Deployment

### Verification Checklist

- [ ] All services running (`pm2 status`)
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Sync service running
- [ ] Frontend loading correctly
- [ ] SSL certificate valid
- [ ] Logs being written
- [ ] Backups configured

### Monitoring Setup

1. Setup uptime monitoring (e.g., UptimeRobot)
2. Configure error tracking (e.g., Sentry)
3. Setup performance monitoring (e.g., New Relic)
4. Configure alerts for critical issues

---

## Troubleshooting

### Services Won't Start
```bash
# Check logs
pm2 logs

# Check ports
sudo netstat -tlnp | grep -E ':(9000|5000)'

# Check permissions
ls -la /var/www/seo-platform
```

### Database Connection Issues
```bash
# Test connection
psql -U seo_user -d seo_unified_prod -c "SELECT 1"

# Check PostgreSQL status
sudo systemctl status postgresql
```

### High Memory Usage
```bash
# Monitor
pm2 monit

# Restart if needed
pm2 restart all
```

---

## Maintenance

### Updates
```bash
# Pull latest code
git pull

# Update dependencies
npm install --production

# Rebuild frontend
cd dashboard && npm run build

# Restart
pm2 restart all
```

### Database Maintenance
```bash
# Vacuum
psql -U seo_user -d seo_unified_prod -c "VACUUM ANALYZE"

# Reindex
psql -U seo_user -d seo_unified_prod -c "REINDEX DATABASE seo_unified_prod"
```

---

## Support

For issues during deployment:
1. Check application logs
2. Check Nginx logs
3. Check database logs
4. Review this guide
5. Contact development team

---

**Deployment Version:** 1.0
**Last Updated:** 2025-10-26
**Maintained By:** DevOps Team
