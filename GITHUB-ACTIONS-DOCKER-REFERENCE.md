# ⚡ GitHub Actions Docker Deployment - Quick Reference

## 🚀 One-Time Setup (10 minutes)

### 1. Add GitHub Secrets

Go to: `GitHub Repository → Settings → Secrets and variables → Actions`

Add these secrets:

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `VPS_SSH_KEY` | Your SSH private key | `cat ~/.ssh/tpp_vps` |

**Optional (with fallback defaults)**:
| Secret Name | Default Value | Purpose |
|-------------|---------------|---------|
| `VPS_HOST` | `31.97.222.218` | VPS IP address |
| `VPS_USER` | `avi` | SSH username |
| `DISCORD_WEBHOOK_URL` | None | Deployment notifications |

### 2. Verify VPS .env File

SSH into your VPS and ensure the `.env` file exists:

```bash
ssh tpp-vps
cat /home/avi/seo-automation/.env
```

Required variables:
```env
# Database
POSTGRES_DB=seo_unified_prod
POSTGRES_USER=seo_user
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD

# Cloudflare Tunnel (optional)
CLOUDFLARE_TUNNEL_TOKEN=your_token_here

# JWT Secret
JWT_SECRET=YOUR_SECURE_RANDOM_STRING
```

### 3. Test It

```bash
# Make a small change
echo "# Testing Docker CI/CD" >> TEST.md

# Commit and push
git add TEST.md
git commit -m "test: verify Docker deployment"
git push origin main

# Watch it deploy! 🚀
# Go to: https://github.com/YOUR_USERNAME/seo-expert/actions
```

---

## 📝 Daily Workflow

### Standard Development Flow

```bash
# 1. Make changes locally
vim src/api/v2/keywords.js

# 2. Test locally (recommended)
npm test

# 3. Commit
git add .
git commit -m "feat: add keyword clustering endpoint"

# 4. Push to trigger deployment
git push origin main

# ✨ Automated deployment happens:
#    → Run 801 tests
#    → Build optimized Docker image
#    → Backup database
#    → Run migrations
#    → Deploy containers
#    → Health check
#    → Send notifications
```

**That's it!** No SSH, no manual deployment needed.

---

## 🔍 Monitoring

### Check Deployment Status

**Option 1: GitHub UI**
```
https://github.com/YOUR_USERNAME/seo-expert/actions
```
- 🟢 Success = Deployed
- 🔴 Failed = Check logs
- 🟡 In Progress = Wait

**Option 2: Command Line**
```bash
# Check all services
ssh tpp-vps
cd /home/avi/seo-automation/current
docker compose -f docker-compose.prod.yml ps

# Check specific service logs
docker compose -f docker-compose.prod.yml logs dashboard --tail=50
docker compose -f docker-compose.prod.yml logs postgres --tail=50

# Test API health
curl http://localhost:9000/api/v2/health | jq

# Check database
docker exec keyword-tracker-db psql -U seo_user -d seo_unified_prod -c "\dt"
```

**Option 3: Discord** (if configured)
- Get automatic success/failure notifications

---

## 🆘 If Deployment Fails

### Step 1: Check the Logs

1. Go to Actions tab
2. Click the failed workflow run
3. Click on the "Deploy to VPS" job
4. Read the error message

### Step 2: Common Issues & Fixes

**Issue: "Permission denied (publickey)"**
```bash
# Fix: Re-add your SSH key to GitHub Secrets
cat ~/.ssh/tpp_vps  # Copy entire output
# Paste into GitHub Secrets → VPS_SSH_KEY
```

**Issue: "Tests failed"**
```bash
# Fix: Run tests locally and fix them
npm test

# OR skip tests temporarily (not recommended):
git commit -m "fix: something [skip ci]"
```

**Issue: "Docker build failed"**
```bash
# Fix: Check Docker build logs in Actions
# Common causes:
# - Missing dependencies in package.json
# - Syntax errors in code
# - npm ci failures

# Test Docker build locally:
docker compose -f docker-compose.prod.yml build dashboard
```

**Issue: "Database migration failed"**
```bash
# Check migration logs
ssh tpp-vps
cd /home/avi/seo-automation/current
docker compose -f docker-compose.prod.yml logs postgres

# Check if schema file is valid
docker exec keyword-tracker-db psql -U seo_user -d seo_unified_prod -c "\dt"

# Manual migration if needed
docker cp database/postgresql-schema.sql keyword-tracker-db:/tmp/
docker exec keyword-tracker-db psql -U seo_user -d seo_unified_prod -f /tmp/postgresql-schema.sql
```

**Issue: "Health check failed"**
```bash
# SSH and check container status
ssh tpp-vps
cd /home/avi/seo-automation/current
docker compose -f docker-compose.prod.yml ps

# Check dashboard logs
docker compose -f docker-compose.prod.yml logs dashboard --tail=100

# Restart services if needed
docker compose -f docker-compose.prod.yml restart dashboard
```

**Issue: "Container keeps restarting"**
```bash
# Check why it's failing
docker logs keyword-tracker-dashboard --tail=100

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Port conflicts
# - Application startup errors

# Check environment
docker exec keyword-tracker-dashboard env | grep -E "(DATABASE|PORT|NODE_ENV)"
```

---

## ⏮️ Rollback (If Something Breaks)

### Option 1: Automatic Rollback (GitHub UI)

1. Go to Actions tab
2. Click "Deploy to Production VPS"
3. Click "Run workflow"
4. Select workflow_dispatch event
5. Workflow will restore backup automatically

### Option 2: Manual Rollback via SSH

```bash
# SSH to VPS
ssh tpp-vps
cd /home/avi/seo-automation

# Check if backup exists
ls -lh backup/

# Stop current containers
cd current
docker compose -f docker-compose.prod.yml down

# Restore backup
cd ..
rm -rf current
cp -r backup current

# Restart with backup
cd current
docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d

# Verify services
docker compose -f docker-compose.prod.yml ps
curl http://localhost:9000/api/v2/health
```

### Option 3: Database-Only Rollback

```bash
# List database backups
ssh tpp-vps
ls -lh /home/avi/seo-automation/backups/db_backup_*.sql

# Restore specific backup
DB_BACKUP="db_backup_20251026_120000.sql"
docker exec keyword-tracker-db psql -U seo_user -d seo_unified_prod < backups/$DB_BACKUP

# Verify
docker exec keyword-tracker-db psql -U seo_user -d seo_unified_prod -c "\dt"
```

---

## 🎯 Quick Commands

### Deployment
```bash
# Standard deployment (automatic on push to main)
git push origin main

# Deploy without tests (not recommended)
git commit -m "fix: something [skip ci]"
git push origin main

# Manual trigger: Use GitHub Actions UI → Run workflow
```

### Monitoring
```bash
# Check all containers
ssh tpp-vps 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml ps'

# View dashboard logs
ssh tpp-vps 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml logs dashboard --tail=50'

# Check database
ssh tpp-vps 'docker exec keyword-tracker-db psql -U seo_user -d seo_unified_prod -c "SELECT COUNT(*) FROM unified_keywords;"'

# Check resource usage
ssh tpp-vps 'docker stats --no-stream'
```

### Maintenance
```bash
# View backups
ssh tpp-vps 'ls -lh /home/avi/seo-automation/backups/'

# Clean up old Docker images
ssh tpp-vps 'docker image prune -af --filter "until=7d"'

# View Docker disk usage
ssh tpp-vps 'docker system df'

# Restart specific service
ssh tpp-vps 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml restart dashboard'

# Full restart
ssh tpp-vps 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml restart'
```

---

## 📊 Workflow Timeline

**Typical Docker deployment timeline**:
```
00:00 - Push to GitHub
00:05 - Tests start (801 tests run)
01:00 - Tests complete ✅
01:05 - Create deployment archive
01:15 - Upload to VPS
01:20 - Extract code
01:25 - Create backups (code + database)
01:30 - Build Docker image (cached: 15s, fresh: 90s)
02:30 - Start database
02:40 - Run migrations
02:50 - Start all containers
03:00 - Health check
03:15 - Deployment complete ✅

Total: ~3-4 minutes (first deploy), ~2 minutes (cached)
```

---

## 🎓 Understanding the Docker Workflow

### What Happens Automatically

1. **Tests Run First**
   - All 801 unit tests
   - If tests fail, deployment stops
   - Prevents broken code from going live

2. **Backups Created**
   - Code backup (last deployment)
   - Database backup (last 7 kept)
   - Easy rollback if needed

3. **Docker Build**
   - Optimized multi-stage Dockerfile
   - Layer caching for speed
   - Production-only dependencies
   - Native module compilation (better-sqlite3)

4. **Database Migration**
   - PostgreSQL schema applied automatically
   - IF NOT EXISTS prevents conflicts
   - Triggers and views created
   - Foreign keys validated

5. **Safe Deployment**
   - Database starts first
   - Migrations run before app starts
   - Health checks verify API
   - Old containers replaced atomically

6. **Verification**
   - Health endpoint checked
   - Docker ps shows all services
   - API returns 200 OK
   - Database tables verified

7. **Notification**
   - GitHub UI shows status
   - Discord notification (if configured)
   - Email from GitHub (if enabled)

### Services Deployed

```yaml
services:
  postgres:          # PostgreSQL 15 database
    Port: 5432       # Internal only
    Volume: postgres_data
    Health: pg_isready

  dashboard:         # Node.js/Express API
    Port: 9000       # Exposed
    Health: /api/v2/health
    Depends: postgres, keyword-service

  keyword-service:   # Python CLI tool
    Command: tail -f /dev/null
    Purpose: Manual keyword operations

  sync-service:      # Data synchronization
    Status: Disabled (needs sqlite3 dependency)
    Purpose: Sync between legacy DBs

  cloudflared:       # Cloudflare Tunnel (optional)
    Profile: with-cloudflare
    Purpose: Public access without port exposure
```

---

## 🔐 Security Best Practices

✅ **DO**:
- Keep your SSH private key secret
- Use strong passwords for database
- Enable 2FA on GitHub
- Review deployment logs
- Test changes locally before pushing
- Rotate JWT_SECRET periodically
- Keep database backups encrypted

❌ **DON'T**:
- Share your SSH private key
- Commit secrets to git (.env files)
- Push directly to main without testing
- Ignore failed deployment notifications
- Skip tests without good reason
- Use default passwords in production
- Expose database port publicly

---

## ✅ Checklist

### First Deployment
- [ ] Added VPS_SSH_KEY to GitHub Secrets
- [ ] Created .env file on VPS with production credentials
- [ ] Tested SSH connection manually
- [ ] Made a test commit
- [ ] Watched deployment in Actions tab
- [ ] Verified all containers are running
- [ ] Tested API: `curl http://localhost:9000/api/v2/health`
- [ ] Verified database: 9 tables created

### Every Deployment
- [ ] Tested changes locally
- [ ] All 801 tests passing
- [ ] Committed with meaningful message
- [ ] Pushed to main
- [ ] Checked Actions tab for status
- [ ] Verified deployment succeeded
- [ ] Tested API endpoints (if needed)

### If Problems
- [ ] Read error message in Actions tab
- [ ] Check Docker logs on VPS
- [ ] Review recent changes
- [ ] Consider rollback
- [ ] Fix issue locally
- [ ] Deploy again

---

## 🎉 Success Indicators

**Deployment is successful when**:
- ✅ GitHub Actions shows green checkmark
- ✅ All Docker containers show "healthy" or "Up"
- ✅ Health endpoint responds with `{"success":true}`
- ✅ Database has 9 tables + 3 views
- ✅ No errors in container logs
- ✅ API returns data correctly

**Example successful deployment**:
```bash
$ ssh tpp-vps 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml ps'
NAME                          STATUS
keyword-tracker-cloudflared   Up (healthy)
keyword-tracker-dashboard     Up (healthy)
keyword-tracker-db            Up (healthy)
keyword-tracker-service       Up (healthy)

$ curl http://localhost:9000/api/v2/health
{
  "success": true,
  "version": "2.0.0",
  "uptime": 1234.56,
  "services": {
    "api": "healthy"
  }
}

$ docker exec keyword-tracker-db psql -U seo_user -d seo_unified_prod -c "\dt"
         List of relations
 Schema |       Name        | Type
--------+-------------------+-------
 public | domains           | table
 public | research_projects | table
 public | unified_keywords  | table
 public | topics            | table
 public | page_groups       | table
 public | serp_snapshots    | table
 public | sync_status       | table
 public | audit_logs        | table
 public | cache             | table
(9 rows)

✅ All good!
```

---

## 🆚 Docker vs PM2 Comparison

### When to Use Docker (Current Setup ✅)
- Multi-service applications
- Need database with migrations
- Want environment isolation
- Complex dependency chains
- Team collaboration (consistent environments)
- Scalability requirements

### When to Use PM2 (Previous Setup)
- Simple Node.js applications
- Single process applications
- Minimal resource usage
- Quick prototypes
- No database requirements

**For this project, Docker is the right choice** because you have:
- PostgreSQL database
- Multiple services (dashboard, keyword-service, sync)
- Complex dependencies (better-sqlite3, native modules)
- Production requirements (backups, migrations, health checks)

---

## 📞 Getting Help

**Check deployment logs**:
```
https://github.com/YOUR_USERNAME/seo-expert/actions
```

**Check service status**:
```bash
ssh tpp-vps 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml ps'
```

**View detailed docs**:
- `.github/DEPLOYMENT.md` - Full deployment guide
- `DEPLOYMENT_FIXES_COMPLETE.md` - All fixes implemented
- `database/postgresql-schema.sql` - Database schema

**Test SSH connection**:
```bash
ssh tpp-vps 'echo "Connection works!"'
```

**Test Docker on VPS**:
```bash
ssh tpp-vps 'docker --version && docker compose version'
```

---

**Remember**: Once set up, deployments are completely automatic. Just push to main! 🚀

**Deployment flow**:
```
git push → Tests → Build → Backup → Migrate → Deploy → Health Check → ✅
```
