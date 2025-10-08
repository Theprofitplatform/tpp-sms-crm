# VPS Deployment Guide

## Prerequisites

1. **VPS Requirements:**
   - Ubuntu 20.04+ or Debian 11+
   - 4GB RAM minimum (8GB recommended)
   - 20GB disk space
   - Root or sudo access

2. **Local Requirements:**
   - SSH access configured to VPS
   - `tpp-vps` in your `~/.ssh/config` (or use IP address)

3. **Twilio Account:**
   - Account SID
   - Auth Token
   - AU phone number

## Quick Deploy (Automated)

Run the deployment script from your local machine:

```bash
cd "/projects/sms-crm"
./deploy-vps.sh tpp-vps
```

This will:
- Install Docker, Node.js, pnpm
- Copy all project files
- Install dependencies
- Start PostgreSQL & Redis
- Run migrations and seed
- Create systemd services
- Configure Nginx
- Start all services

## Manual Deployment

If you prefer manual control:

### Step 1: Prepare VPS

SSH into your VPS:
```bash
ssh tpp-vps
```

Install dependencies:
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@8.15.0

# Install nginx
apt-get install -y nginx

# Create project directory
mkdir -p /root/projects/sms-crm
```

### Step 2: Copy Project Files

From your local machine:
```bash
cd "/projects/sms-crm"

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.next' \
    --exclude '.git' \
    ./ tpp-vps:/root/projects/sms-crm/
```

### Step 3: Setup Environment

SSH back into VPS:
```bash
ssh tpp-vps
cd /root/projects/sms-crm
```

Create `.env` file:
```bash
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smscrm
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=smscrm

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API
PORT=3000
API_BASE_URL=http://your-domain.com/api
CORS_ORIGIN=http://your-domain.com
COOKIE_SECRET=CHANGE_THIS_SECRET_$(openssl rand -base64 32)

# Worker
WORKER_PORT=3002

# Shortener
SHORTENER_PORT=3003
SHORT_DOMAIN=your-short-domain.com
SHORT_LINK_SECRET=CHANGE_THIS_SECRET_$(openssl rand -base64 32)

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+61400000000

# Web
NEXT_PUBLIC_API_URL=http://your-domain.com/api
WEB_URL=http://your-domain.com

# Logging
LOG_LEVEL=info
NODE_ENV=production
EOF
```

### Step 4: Install and Build

```bash
# Install dependencies
pnpm install

# Install date-fns with correct version
pnpm add date-fns@2.30.0 date-fns-tz@2.0.0 --filter @sms-crm/lib

# Build shared library
pnpm --filter @sms-crm/lib build
```

### Step 5: Start Database

```bash
# Edit docker-compose to use standard ports
sed -i 's/5433:5432/5432:5432/g' infra/docker-compose.yml
sed -i 's/6380:6379/6379:6379/g' infra/docker-compose.yml

# Start containers
docker compose -f infra/docker-compose.yml up -d postgres redis

# Wait for database to be ready
sleep 10

# Run migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smscrm" \
pnpm --filter @sms-crm/lib migrate

# Seed database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smscrm" \
pnpm --filter @sms-crm/lib seed
```

### Step 6: Create Systemd Services

```bash
# API Service
cat > /etc/systemd/system/sms-crm-api.service << 'EOF'
[Unit]
Description=SMS CRM API Service
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/projects/sms-crm
EnvironmentFile=/root/projects/sms-crm/.env
ExecStart=/usr/bin/pnpm dev:api
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Worker Service
cat > /etc/systemd/system/sms-crm-worker.service << 'EOF'
[Unit]
Description=SMS CRM Worker Service
After=network.target docker.service sms-crm-api.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/projects/sms-crm
EnvironmentFile=/root/projects/sms-crm/.env
ExecStart=/usr/bin/pnpm dev:worker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Web Service
cat > /etc/systemd/system/sms-crm-web.service << 'EOF'
[Unit]
Description=SMS CRM Web Service
After=network.target sms-crm-api.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/projects/sms-crm
EnvironmentFile=/root/projects/sms-crm/.env
ExecStart=/usr/bin/pnpm dev:web
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload and enable
systemctl daemon-reload
systemctl enable sms-crm-api sms-crm-worker sms-crm-web
systemctl start sms-crm-api sms-crm-worker sms-crm-web
```

### Step 7: Configure Nginx

```bash
cat > /etc/nginx/sites-available/sms-crm << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;

    # API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhooks (direct access, no /api prefix)
    location /webhooks/ {
        proxy_pass http://localhost:3000/webhooks/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Web UI
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/sms-crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

### Step 8: Setup SSL (Optional but Recommended)

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d your-domain.com

# Auto-renew
systemctl enable certbot.timer
```

## Post-Deployment

### Check Service Status

```bash
systemctl status sms-crm-api
systemctl status sms-crm-worker
systemctl status sms-crm-web
```

### View Logs

```bash
# API logs
journalctl -u sms-crm-api -f

# Worker logs
journalctl -u sms-crm-worker -f

# Web logs
journalctl -u sms-crm-web -f

# All services
journalctl -u 'sms-crm-*' -f
```

### Test Services

```bash
# Test API
curl http://localhost:3000/health

# Test from outside
curl http://your-domain.com/api/health

# Test Web UI
curl -I http://localhost:3001
```

## Twilio Configuration

### Set Webhook URL

1. Log in to [Twilio Console](https://console.twilio.com)
2. Go to Phone Numbers → Active Numbers
3. Select your AU number
4. Under "Messaging", set:
   - **Webhook URL**: `https://your-domain.com/webhooks/provider`
   - **HTTP Method**: POST
5. Save

### Test Webhook

Send a test SMS to your Twilio number and check logs:
```bash
journalctl -u sms-crm-api -f | grep webhook
```

## Maintenance

### Update Code

From local machine:
```bash
cd "/projects/sms-crm"
rsync -avz --exclude 'node_modules' ./ tpp-vps:/root/projects/sms-crm/
ssh tpp-vps 'cd /root/projects/sms-crm && pnpm install && pnpm --filter @sms-crm/lib build && systemctl restart sms-crm-*'
```

### Restart Services

```bash
systemctl restart sms-crm-api
systemctl restart sms-crm-worker
systemctl restart sms-crm-web

# Or all at once
systemctl restart 'sms-crm-*'
```

### Database Backup

```bash
cd /root/projects/sms-crm
./scripts/backup.sh
```

Backups stored in `/backups/` with 7-day retention.

### View Database

```bash
export PGPASSWORD=postgres
psql -h localhost -U postgres -d smscrm
```

## Firewall

```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow SSH
ufw allow 22/tcp

# Enable firewall
ufw enable
```

## Monitoring

### Setup Alerts

Add to crontab:
```bash
crontab -e

# Health check every 5 minutes
*/5 * * * * /root/projects/sms-crm/scripts/health-check.sh || echo "Services down!" | mail -s "SMS CRM Alert" your@email.com

# Backup daily at 2 AM
0 2 * * * /root/projects/sms-crm/scripts/backup.sh
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
journalctl -xe

# Check Docker
docker ps
docker logs infra-postgres-1
docker logs infra-redis-1

# Check port conflicts
netstat -tlnp | grep -E ':(3000|3001|3002|5432|6379)'
```

### Database Connection Issues

```bash
# Test connection
export PGPASSWORD=postgres
psql -h localhost -U postgres -d smscrm -c "SELECT COUNT(*) FROM tenants;"

# Restart Postgres
docker restart infra-postgres-1
```

### High Memory Usage

```bash
# Check processes
htop

# Limit Node.js memory
# Edit service files, add to [Service]:
Environment="NODE_OPTIONS=--max-old-space-size=2048"

systemctl daemon-reload
systemctl restart 'sms-crm-*'
```

## URLs After Deployment

- **Web UI**: http://your-domain.com
- **API**: http://your-domain.com/api
- **API Health**: http://your-domain.com/api/health
- **Twilio Webhook**: https://your-domain.com/webhooks/provider

## Default Credentials

- **Admin**: admin@example.com (magic link auth)
- **Database**: postgres / postgres
- **Tenant ID**: 00000000-0000-0000-0000-000000000001

## Next Steps

1. Test CSV import
2. Create a test campaign
3. Send test messages
4. Configure short link domain
5. Review `infra/CUTOVER.md` for Go-Live checklist

---

**Support**: Check `README.md` and `infra/OPERATIONS.md` for detailed documentation.
