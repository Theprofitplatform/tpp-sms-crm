# Production Deployment Guide

Quick reference for deploying the unified keyword tracking system to production.

---

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# 1. Configure environment
cp .env.production.example .env
nano .env  # Update all CHANGE_THIS values

# 2. Run deployment script
./deploy-production.sh
```

That's it! The script handles everything:
- Pre-deployment checks
- Building Docker images
- Database migrations
- Service startup
- Health verification
- Deployment report

---

### Option 2: Manual Deployment

```bash
# 1. Setup environment
cp .env.production.example .env
# Edit .env with production values

# 2. Build images
docker-compose -f docker-compose.prod.yml build

# 3. Start services
docker-compose -f docker-compose.prod.yml up -d

# 4. Check status
docker-compose -f docker-compose.prod.yml ps

# 5. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## ⚙️ Pre-Deployment Checklist

### Required Configuration

- [ ] **`.env` file configured** with production values
- [ ] **JWT_SECRET** set to random value
  ```bash
  openssl rand -base64 32
  ```
- [ ] **POSTGRES_PASSWORD** set to strong password
- [ ] **API keys** configured (SERPAPI_KEY, Google Ads)
- [ ] **Docker** and **docker-compose** installed
- [ ] **Ports** 9000, 5000, 5432 available

### Optional Configuration

- [ ] SSL certificates in `deployment/nginx/ssl/`
- [ ] Nginx configuration in `deployment/nginx/nginx.conf`
- [ ] Monitoring (Sentry DSN, Slack webhook)
- [ ] S3 backup configuration

---

## 📦 What Gets Deployed

### Services

1. **PostgreSQL Database** (Port 5432)
   - Production database
   - Persistent volume
   - Automatic backups

2. **Dashboard Server** (Port 9000)
   - Node.js/Express API
   - React frontend (built)
   - Auto-restart enabled

3. **Keyword Service** (Port 5000)
   - Python/Flask API
   - Keyword research pipeline
   - Auto-restart enabled

4. **Sync Service**
   - Bidirectional sync (every 5 min)
   - Background process
   - Automatic error recovery

5. **Nginx** (Optional, Ports 80/443)
   - Reverse proxy
   - SSL termination
   - Static file serving

---

## 🔧 Configuration Details

### Minimum Required .env Variables

```bash
# Essential
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname
JWT_SECRET=your_random_secret
POSTGRES_PASSWORD=strong_password

# API Keys (at least one recommended)
SERPAPI_KEY=your_key
```

### Full Production .env

See `.env.production.example` for all available options.

---

## 🔍 Verification Steps

### 1. Check Services Running

```bash
docker-compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                        STATUS              PORTS
keyword-tracker-dashboard   Up (healthy)        0.0.0.0:9000->9000/tcp
keyword-tracker-service     Up (healthy)        0.0.0.0:5000->5000/tcp
keyword-tracker-db          Up (healthy)        5432/tcp
keyword-tracker-sync        Up
```

### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:9000/api/v2/health

# Keywords endpoint
curl http://localhost:9000/api/v2/keywords

# Stats endpoint
curl http://localhost:9000/api/v2/keywords/stats

# Sync status
curl http://localhost:9000/api/v2/sync/status
```

### 3. Access Dashboard

Open browser: **http://localhost:9000**

Navigate to: **Research > Unified Keywords**

### 4. Check Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs

# Specific service
docker-compose -f docker-compose.prod.yml logs dashboard

# Follow logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📊 Monitoring

### Health Monitoring

```bash
# Automated health check
./scripts/health-check.sh

# Manual check
curl http://localhost:9000/api/v2/health | jq
```

### Performance Monitoring

```bash
# Run benchmark
node examples/performance-benchmark.js

# Check resource usage
docker stats
```

### Sync Monitoring

```bash
# Check sync status
curl http://localhost:9000/api/v2/sync/status | jq

# View sync history
curl http://localhost:9000/api/v2/sync/history | jq
```

---

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Or use deployment script
./deploy-production.sh
```

### Database Backup

```bash
# Manual backup
docker exec keyword-tracker-db pg_dump -U seo_user seo_unified_prod > backup.sql

# Automated backup (included in deploy script)
# Backups stored in: ./backups/
```

### View Container Logs

```bash
# All logs
docker-compose -f docker-compose.prod.yml logs

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100

# Follow logs
docker-compose -f docker-compose.prod.yml logs -f dashboard
```

---

## 🛠️ Troubleshooting

### Services Won't Start

```bash
# Check Docker daemon
docker info

# Check ports
sudo netstat -tlnp | grep -E ':(9000|5000|5432)'

# View error logs
docker-compose -f docker-compose.prod.yml logs
```

### Database Connection Error

```bash
# Check database container
docker-compose -f docker-compose.prod.yml ps postgres

# Check connection
docker exec keyword-tracker-db pg_isready -U seo_user

# Reset database (WARNING: data loss)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### API Not Responding

```bash
# Check service health
curl http://localhost:9000/api/v2/health

# Restart service
docker-compose -f docker-compose.prod.yml restart dashboard

# View logs
docker-compose -f docker-compose.prod.yml logs dashboard
```

---

## 🔙 Rollback

### Quick Rollback

```bash
# 1. Stop services
docker-compose -f docker-compose.prod.yml down

# 2. Restore from backup (automatic backup created on deploy)
# Backup location shown in deployment log

# 3. Checkout previous version
git checkout <previous-commit>

# 4. Redeploy
./deploy-production.sh
```

### Emergency Rollback

```bash
# Stop everything
docker-compose -f docker-compose.prod.yml down

# Restore database
docker exec keyword-tracker-db psql -U seo_user seo_unified_prod < ./backups/latest/backup.sql

# Restart
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Security Hardening

### Production Checklist

- [ ] Change default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS (Nginx with SSL)
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up log rotation
- [ ] Configure automated backups
- [ ] Enable monitoring alerts

### SSL Setup (with Nginx)

```bash
# 1. Get SSL certificates (Let's Encrypt)
certbot certonly --standalone -d your-domain.com

# 2. Copy certificates
mkdir -p deployment/nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem deployment/nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem deployment/nginx/ssl/

# 3. Start with Nginx
docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
```

---

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale dashboard service
docker-compose -f docker-compose.prod.yml up -d --scale dashboard=3

# Behind load balancer (Nginx, HAProxy, etc.)
```

### Vertical Scaling

Edit `docker-compose.prod.yml` resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

---

## 🎯 Production Optimization

### Database Optimization

```bash
# Connect to database
docker exec -it keyword-tracker-db psql -U seo_user seo_unified_prod

# Run VACUUM
VACUUM ANALYZE;

# Check indexes
\di

# Add index if needed
CREATE INDEX idx_keywords_opportunity ON unified_keywords(opportunity_score);
```

### Performance Tuning

1. **Enable caching** (Redis)
2. **Add CDN** for static assets
3. **Optimize queries** with indexes
4. **Use connection pooling**
5. **Enable gzip** compression

---

## 📞 Support

### Getting Help

1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Run health check: `./scripts/health-check.sh`
3. Review troubleshooting section above
4. Check GitHub issues
5. Review deployment log in `./logs/deployment-*.log`

### Reporting Issues

Include:
- Deployment log
- Service logs
- Docker compose ps output
- Environment (OS, Docker version)
- Steps to reproduce

---

## ✅ Post-Deployment Checklist

- [ ] All services show "Up (healthy)"
- [ ] Dashboard accessible at http://localhost:9000
- [ ] API endpoints responding
- [ ] Sync service running
- [ ] Health checks passing
- [ ] Logs show no errors
- [ ] Backup created successfully
- [ ] Monitoring configured
- [ ] SSL enabled (if applicable)
- [ ] Team notified of deployment

---

## 🎉 Success!

Your unified keyword tracking system is now running in production!

**Access Points:**
- **Dashboard**: http://localhost:9000
- **API**: http://localhost:9000/api/v2
- **API Docs**: See `API_V2_DOCUMENTATION.md`

**Next Steps:**
1. Create research projects
2. Import existing keywords
3. Set up monitoring alerts
4. Train team members
5. Start tracking keywords!

---

**Deployment Script**: `./deploy-production.sh`
**Docker Compose**: `docker-compose.prod.yml`
**Environment**: `.env` (from `.env.production.example`)
**Logs**: `./logs/deployment-*.log`
**Backups**: `./backups/`

---

For detailed deployment guide, see: `deployment/production/DEPLOYMENT_GUIDE.md`

🚀 **Happy tracking!**
