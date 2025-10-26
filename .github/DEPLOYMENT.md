# GitHub Actions Deployment Guide

## Overview

This repository uses GitHub Actions for automated CI/CD to deploy to your VPS at **31.97.222.218**.

## Workflows

### 1. **test.yml** - Pull Request Testing
- Runs on all PRs and non-main branches
- Tests on Node.js 18 and 20
- Runs linter and security audits
- Tests Docker build

### 2. **deploy-production.yml** - Production Deployment
- Runs on push to `main` branch
- Can be manually triggered via GitHub UI
- Steps:
  1. ✅ Run all 801 tests
  2. 📦 Create optimized deployment archive (excludes 5.8GB of unnecessary files)
  3. 🚀 Deploy to VPS via SSH
  4. 💾 Backup database (keeps last 7 backups)
  5. 🗄️  Run database migrations (PostgreSQL schema)
  6. 🏥 Verify health checks
  7. 🧹 Clean up old Docker images
  8. 📢 Send deployment notifications (Discord/Slack if configured)

## Setup Instructions

### 1. Add Required Secrets to GitHub

Go to your repository → Settings → Secrets and variables → Actions, and add:

**Required:**
- `VPS_SSH_KEY` - Your VPS SSH private key

**Optional (for notifications):**
- `VPS_HOST` - VPS hostname (default: 31.97.222.218)
- `VPS_USER` - VPS username (default: avi)
- `DISCORD_WEBHOOK_URL` - Discord webhook for deployment notifications

### 2. Add SSH Key to GitHub Secrets

```bash
# On your local machine, copy the VPS SSH private key
cat ~/.ssh/tpp_vps | pbcopy  # macOS
# or
cat ~/.ssh/tpp_vps | clip    # Windows
# or
cat ~/.ssh/tpp_vps           # Linux (copy manually)
```

**In GitHub:**
1. Go to your repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `VPS_SSH_KEY`
5. Value: Paste the private key content
6. Click "Add secret"

### 2. Ensure .env File on VPS

SSH into your VPS and create/verify the .env file:

```bash
ssh tpp-vps
cd /home/avi/seo-automation
nano .env
```

Add your environment variables:
```env
# Database
POSTGRES_DB=seo_unified_prod
POSTGRES_USER=seo_user
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here

# API Keys (optional)
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
SERPAPI_KEY=
```

### 3. Deploy

**Automatic deployment:**
```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

**Manual deployment:**
1. Go to GitHub Actions tab
2. Select "Deploy to Production VPS"
3. Click "Run workflow"
4. Select branch (main)
5. Click "Run workflow"

## Monitoring Deployment

### Watch GitHub Actions
1. Go to your repository on GitHub
2. Click "Actions" tab
3. Watch the deployment progress in real-time

### Check VPS Status
```bash
# SSH into VPS
ssh tpp-vps

# Check containers
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f dashboard

# Check API health
curl http://localhost:9000/api/v2/health | jq '.'
```

## Rollback

### Automatic Rollback (via GitHub Actions)

1. Go to GitHub Actions
2. Select "Deploy to Production VPS" workflow
3. Click "Run workflow"
4. Select "rollback" from the dropdown (when available)
5. The system will restore the previous backup

### Manual Rollback (via SSH)
```bash
ssh tpp-vps
cd /home/avi/seo-automation
docker compose -f current/docker-compose.prod.yml down
rm -rf current
cp -r backup current
cd current
docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d
```

## Deployment Architecture

```
┌─────────────┐
│   GitHub    │
│  Repository │
└──────┬──────┘
       │ git push main
       ↓
┌─────────────────┐
│ GitHub Actions  │
│  • Run tests    │
│  • Build images │
└────────┬────────┘
         │ SSH deploy
         ↓
┌──────────────────────────────┐
│  VPS (31.97.222.218)         │
│  /home/avi/seo-automation/   │
│  ├── current/ (active)       │
│  ├── backup/ (rollback)      │
│  └── .env (config)           │
│                              │
│  Docker Compose:             │
│  ├── Dashboard (port 9000)   │
│  ├── PostgreSQL              │
│  ├── Keyword Service         │
│  └── Cloudflare Tunnel       │
└──────────────────────────────┘
         │
         │ Cloudflare Tunnel
         ↓
┌─────────────────┐
│   Public URLs   │
│  your-domain    │
└─────────────────┘
```

## Troubleshooting

### Deployment Failed

**Check logs:**
```bash
ssh tpp-vps
cd /home/avi/seo-automation/current
docker compose -f docker-compose.prod.yml logs --tail=100
```

**Common issues:**
1. **Port 9000 in use**: Check what's using it: `sudo lsof -i :9000`
2. **Out of disk space**: Clean up: `docker system prune -af`
3. **Environment variables missing**: Check `.env` file exists

### Tests Failing

Run tests locally first:
```bash
npm test
```

Fix issues before pushing to main.

### SSH Key Issues

Verify SSH key is added to GitHub Secrets and can connect:
```bash
ssh -i ~/.ssh/tpp_vps avi@31.97.222.218 "echo 'Connection successful'"
```

## Best Practices

1. **Always test locally** before pushing to main
2. **Use feature branches** and create PRs
3. **Monitor the first deployment** after setup
4. **Keep .env file secure** (never commit it)
5. **Check logs** after each deployment
6. **Use rollback** if issues arise

## Next Steps

### Initial Setup Checklist

1. [ ] Add GitHub Secret `VPS_SSH_KEY`
2. [ ] (Optional) Add `VPS_HOST` and `VPS_USER` secrets
3. [ ] (Optional) Add `DISCORD_WEBHOOK_URL` for notifications
4. [ ] Verify `.env` file on VPS with production credentials
5. [ ] Push to main to trigger first deployment
6. [ ] Monitor deployment in GitHub Actions
7. [ ] Verify services are running on VPS
8. [ ] Test Cloudflare Tunnel access
9. [ ] Test rollback procedure (optional but recommended)

### Post-Deployment Verification

```bash
# SSH into VPS
ssh tpp-vps

# Check all services are running
docker compose -f /home/avi/seo-automation/current/docker-compose.prod.yml ps

# Check database tables exist
docker exec keyword-tracker-db psql -U seo_user -d seo_unified_prod -c "\dt"

# Verify API health
curl http://localhost:9000/api/v2/health | jq

# Check recent logs
docker compose -f /home/avi/seo-automation/current/docker-compose.prod.yml logs --tail=50 dashboard
```

---

**Need help?** Check the GitHub Actions logs or SSH into the VPS to debug.
