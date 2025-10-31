# Deployment Quick Start Guide

## Overview
The SEO Expert platform supports multiple deployment targets with automated CI/CD pipelines via GitHub Actions.

## Deployment Targets

### 1. Docker-based Deployment (Main VPS - 31.97.222.218)
- **Type**: Docker Compose orchestration
- **Database**: PostgreSQL in container
- **Entry Point**: dashboard-server.js
- **Port**: 9000
- **Trigger**: Push to main branch → `deploy-production.yml`

### 2. PM2-based Deployment (TPP VPS)
- **Type**: Node.js with PM2 process manager
- **Database**: SQLite (legacy) or PostgreSQL
- **Entry Point**: dashboard-server.js
- **Port**: 3000-3007
- **Trigger**: Push to main branch → `deploy-tpp-vps.yml`

### 3. Cloudflare Pages (Reports)
- **Type**: Static site hosting
- **URL**: https://baa93e95.seo-reports-4d9.pages.dev
- **Purpose**: Report distribution

---

## Quick Start: Making a Deployment

### Option A: Automatic Deployment (Recommended)
```bash
# Just push to main - CI/CD handles the rest
git add .
git commit -m "Your changes"
git push origin main

# Monitor at: https://github.com/YOUR_ORG/seo-expert/actions
```

### Option B: Manual Deployment
```bash
# Deploy to TPP VPS using local script
npm run vps:deploy

# Or use the deployment script directly
./deploy-to-tpp-vps.sh
```

---

## What Happens During Deployment

### 1. Pre-deployment (Automated)
```
✓ Code checkout
✓ Run tests (npm test)
✓ Lint check
✓ Build Docker images (if needed)
```

### 2. Main Deployment
```
✓ Create backup of current deployment
✓ Extract/pull new code
✓ Update environment variables
✓ Build React dashboard
✓ Start database
✓ Run database migrations
✓ Start all services
✓ Health checks
✓ Notify via Discord
```

### 3. Post-deployment
```
✓ Verify API responding
✓ Check container health
✓ Confirm database backup
✓ Log deployment summary
```

---

## Environment Configuration

### Critical Variables
```bash
# Database
POSTGRES_DB=seo_unified_prod
POSTGRES_USER=seo_user
POSTGRES_PASSWORD=<SECURE_PASSWORD>

# API Keys
ANTHROPIC_API_KEY=<your_key>
OPENAI_API_KEY=<your_key>

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=<your_token>

# WordPress Clients (multi-tenant)
IAT_WP_USER=<user>
IAT_WP_PASSWORD=<password>
HOTTYRES_WP_USER=<user>
HOTTYRES_WP_PASSWORD=<password>
SADC_WP_USER=<user>
SADC_WP_PASSWORD=<password>
```

### Where to Set Variables
- **Local Development**: `.env` file
- **VPS Deployment**: `~/.env` on VPS or passed via GitHub Secrets
- **GitHub Actions**: Repository Secrets (Settings → Secrets and variables)

---

## Health Checks

### Verify Deployment Success
```bash
# Check via npm script
npm run vps:health

# Direct API test
curl http://seodashboard.theprofitplatform.com.au/api/v2/health

# View logs
npm run vps:logs

# Process status
npm run vps:status
```

### What to Monitor
```
✓ HTTP 200 response from /api/v2/health
✓ Database connectivity
✓ Cloudflare tunnel active
✓ PM2 process running (if TPP VPS)
✓ No error messages in logs
```

---

## Troubleshooting

### Deployment Failed
1. Check GitHub Actions logs: https://github.com/YOUR_ORG/seo-expert/actions
2. Verify SSH keys configured in GitHub Secrets
3. Check VPS connectivity: `ssh tpp-vps echo "Connected"`
4. View VPS deployment logs: `npm run vps:logs`

### Health Check Failed
```bash
# SSH to VPS
npm run vps:connect

# Check service status
pm2 show seo-expert              # (TPP VPS)
docker compose ps                # (Docker VPS)

# View recent logs
npm run vps:logs
pm2 logs seo-expert --lines 100

# Restart service
npm run vps:restart
```

### Database Issues
```bash
# Check database backup location
# Docker: /home/avi/seo-automation/backups/
# TPP VPS: ~/backups/seo-expert/

# Restore from backup (manual)
psql -U seo_user -d seo_unified_prod < backup_file.sql
```

### Rollback Deployment
```bash
# Via GitHub Actions (manual trigger)
1. Go to Actions tab
2. Select "Deploy to Production VPS" or "Deploy to TPP VPS"
3. Click "Run workflow"
4. Select "Rollback" job
5. Approve rollback

# Manual rollback (emergency)
ssh tpp-vps
cd ~/projects/seo-expert
git reset --hard <previous-commit>
pm2 restart seo-expert
```

---

## Service Architecture

```
┌─────────────────────────────────────────────────┐
│         External Access                          │
│  (seodashboard.theprofitplatform.com.au)          │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │   Cloudflare Tunnel       │
        │  (Secure tunneling)       │
        └─────────────┬─────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    ▼                 ▼                 ▼
┌────────┐      ┌──────────┐      ┌─────────┐
│Dashboard│     │Keyword   │      │SerpBear │
│Server   │     │Service   │      │Tracker  │
│(9000)   │     │(5000)    │      │(3006)   │
└────────┘      └──────────┘      └─────────┘
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
            ┌─────────▼─────────┐
            │   PostgreSQL      │
            │   (5432)          │
            └───────────────────┘
```

---

## Useful Commands

### Deployment
```bash
npm run vps:deploy          # Deploy to TPP VPS
npm run vps:update          # Pull latest & restart
npm run vps:backup          # Manual backup
```

### Monitoring
```bash
npm run vps:health          # Quick health check
npm run vps:logs            # View recent logs
npm run vps:status          # Process details
npm run vps:monitor         # PM2 monitoring
```

### Development
```bash
npm test                    # Run tests
npm run lint                # Code linting
npm run lint:fix            # Auto-fix linting issues
```

### Docker (Local)
```bash
# Start services
docker-compose -f docker-compose.prod.yml up

# With Cloudflare tunnel
docker-compose -f docker-compose.prod.yml --profile with-cloudflare up

# With health watchdog
docker-compose -f docker-compose.prod.yml --profile with-watchdog up

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

## Deployment Files Location

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production container orchestration |
| `Dockerfile.dashboard` | Dashboard container build |
| `.github/workflows/deploy-production.yml` | Main deployment CI/CD |
| `.github/workflows/deploy-tpp-vps.yml` | TPP VPS deployment CI/CD |
| `.env.example` | Environment variable template |
| `.env.production.example` | Production env template |
| `deployment/production/DEPLOYMENT_GUIDE.md` | Detailed deployment guide |
| `deploy-to-tpp-vps.sh` | Manual deployment script |

---

## GitHub Secrets Required

```
VPS_HOST                      31.97.222.218
VPS_USER                      avi
VPS_SSH_KEY                   (private SSH key)

TPP_VPS_HOST                  (hostname)
TPP_VPS_USER                  (ssh user)
TPP_VPS_SSH_KEY               (private SSH key)

CLOUDFLARE_TUNNEL_TOKEN       (tunnel auth)
CLOUDFLARE_API_TOKEN          (API access)

ANTHROPIC_API_KEY             (Claude API)
OPENAI_API_KEY                (OpenAI API)

DISCORD_WEBHOOK_URL           (notifications)

GSC_SERVICE_ACCOUNT           (Google service account JSON)
```

---

## Next Steps

1. **First Deployment**
   - [ ] Configure GitHub Secrets
   - [ ] Set .env variables on VPS
   - [ ] Push to main branch
   - [ ] Monitor GitHub Actions
   - [ ] Verify health endpoints

2. **Ongoing Operations**
   - [ ] Monitor daily health reports
   - [ ] Review deployment logs
   - [ ] Keep dependencies updated
   - [ ] Regular database backups
   - [ ] Performance monitoring

3. **Maintenance**
   - [ ] Update Node.js when needed
   - [ ] Rotate API keys periodically
   - [ ] Test rollback procedure
   - [ ] Review security practices

---

## Documentation

- Full Guide: `DEPLOYMENT_INFRASTRUCTURE_SUMMARY.md`
- Setup Guide: `deployment/production/DEPLOYMENT_GUIDE.md`
- This Guide: `DEPLOYMENT_QUICK_START.md`

For more details, see the main deployment infrastructure summary document.
