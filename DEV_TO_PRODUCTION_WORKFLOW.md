# Dev to Production Deployment Workflow

Complete guide for the automatic deployment workflow from development to production.

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow Diagram](#workflow-diagram)
3. [Branch Strategy](#branch-strategy)
4. [Daily Development Workflow](#daily-development-workflow)
5. [Deployment Process](#deployment-process)
6. [Safety Gates](#safety-gates)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Our deployment workflow automates the path from development to production while maintaining quality and safety through automated testing and checks.

### Key Features

- ✅ Automatic testing on every push
- ✅ Pull request-based workflow for code review
- ✅ Automatic deployment to production on merge
- ✅ Health checks and monitoring
- ✅ Quick rollback capability
- ✅ Deployment notifications

### Infrastructure

- **Development Branch**: `dev`
- **Production Branch**: `main`
- **Deployment Target**: Docker VPS (31.97.222.218)
- **CI/CD Platform**: GitHub Actions

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT WORKFLOW                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Developer  │
│  Local Work  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  1. Work on Feature Branch or Dev Branch     │
│     - Make changes                           │
│     - Test locally                           │
│     - Commit changes                         │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  2. Push to Dev Branch                       │
│     git push origin dev                      │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  3. Automatic Tests Run (GitHub Actions)     │
│     ✓ Unit tests                             │
│     ✓ Integration tests                      │
│     ✓ Security audit                         │
└──────┬───────────────────────────────────────┘
       │
       ├─ Tests Failed ──► Fix issues, push again
       │
       ▼ Tests Passed
┌──────────────────────────────────────────────┐
│  4. Create Pull Request (dev → main)         │
│     - Describe changes                       │
│     - Link related issues                    │
│     - Request review                         │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  5. PR Checks Run Automatically              │
│     ✓ Run test suite                         │
│     ✓ Code quality checks                    │
│     ✓ Security audit                         │
│     ✓ Build verification                     │
│     ✓ Generate PR summary                    │
└──────┬───────────────────────────────────────┘
       │
       ├─ Checks Failed ──► Fix issues, push to dev
       │
       ▼ All Checks Passed
┌──────────────────────────────────────────────┐
│  6. Code Review (Optional but Recommended)   │
│     - Team member reviews code               │
│     - Suggests improvements                  │
│     - Approves PR                            │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  7. Merge PR to Main                         │
│     - Click "Merge pull request"             │
│     - Confirm merge                          │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────────┐
│                  AUTOMATIC DEPLOYMENT                       │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  8. Deployment Workflow Triggered            │
│     - Triggered by push to main              │
│     - Runs on GitHub Actions                 │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  9. Pre-Deployment Tests                     │
│     ✓ Run full test suite                   │
│     ✓ Security checks                        │
└──────┬───────────────────────────────────────┘
       │
       ├─ Tests Failed ──► Deployment aborted
       │                   Notify team
       │
       ▼ Tests Passed
┌──────────────────────────────────────────────┐
│  10. Deploy to Production VPS                │
│      - Create deployment archive             │
│      - Upload to VPS                         │
│      - Backup current version                │
│      - Backup database                       │
│      - Extract new code                      │
│      - Build React dashboard                 │
│      - Build Docker images                   │
│      - Run database migrations               │
│      - Start containers                      │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  11. Health Checks                           │
│      - Wait for services to start            │
│      - Check API health endpoint             │
│      - Verify all containers running         │
└──────┬───────────────────────────────────────┘
       │
       ├─ Health Failed ──► Auto-rollback triggered
       │                     Notify team
       │
       ▼ Health Passed
┌──────────────────────────────────────────────┐
│  12. Deployment Complete!                    │
│      ✅ Notify team (Discord/Slack)          │
│      ✅ Production updated                   │
│      ✅ Monitoring active                    │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  13. Post-Deployment                         │
│      - Monitor health endpoints              │
│      - Check logs for errors                 │
│      - Verify functionality                  │
└──────────────────────────────────────────────┘
```

---

## Branch Strategy

### Branches

| Branch | Purpose | Protection | Auto-Deploy |
|--------|---------|------------|-------------|
| `main` | Production code | ✅ Protected | ✅ Yes (Docker VPS) |
| `dev` | Development code | ⚠️ Light protection | ❌ No |
| `feature/*` | Feature development | ❌ None | ❌ No |
| `fix/*` | Bug fixes | ❌ None | ❌ No |

### Branch Lifecycle

```
feature/new-feature
  └─► dev (via PR or direct push)
       └─► main (via PR only)
            └─► Production (automatic)
```

---

## Daily Development Workflow

### Option 1: Work Directly on Dev (Recommended for Small Changes)

```bash
# 1. Switch to dev branch
git checkout dev
git pull origin dev

# 2. Make your changes
# ... edit files ...

# 3. Commit changes
git add .
git commit -m "feat: add new feature"

# 4. Push to dev
git push origin dev
# ✅ Tests run automatically

# 5. Create PR to main (when ready for production)
gh pr create --base main --head dev --title "Deploy: New feature" --body "Description of changes"

# 6. After PR approval, merge to main
# ✅ Automatic deployment to production begins!
```

### Option 2: Work on Feature Branch (Recommended for Large Changes)

```bash
# 1. Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/my-new-feature

# 2. Make your changes
# ... edit files ...

# 3. Commit changes
git add .
git commit -m "feat: add my new feature"

# 4. Push feature branch
git push origin feature/my-new-feature

# 5. Create PR to dev
gh pr create --base dev --head feature/my-new-feature --title "Feature: My new feature"

# 6. After review, merge to dev
# ✅ Tests run on dev

# 7. When dev is stable, create PR to main
git checkout dev
git pull origin dev
gh pr create --base main --head dev --title "Deploy: New features batch"

# 8. Merge to main
# ✅ Automatic deployment to production begins!
```

---

## Deployment Process

### What Happens During Deployment

#### Phase 1: Pre-Deployment (2 min)
- ✅ Tests run on merged code
- ✅ Create deployment archive
- ✅ Upload to VPS via SSH

#### Phase 2: Backup (1 min)
- 📦 Backup current deployment
- 💾 Backup PostgreSQL database
- 📁 Keep last 7 backups

#### Phase 3: Build (3 min)
- 🔨 Build React dashboard (`npm run build`)
- 🐳 Build Docker images
- 📦 Optimize images

#### Phase 4: Database (1 min)
- 🗄️ Run database migrations
- ✅ Verify schema updates

#### Phase 5: Deployment (2 min)
- 🚀 Start PostgreSQL
- ⏳ Wait for DB health check
- 🚀 Start dashboard service
- 🚀 Start keyword service
- 🚀 Start Cloudflare tunnel

#### Phase 6: Verification (1 min)
- 🏥 Run health checks
- ✅ Verify API endpoints
- ✅ Check container status

#### Phase 7: Cleanup (30 sec)
- 🧹 Remove old Docker images
- 📊 Log deployment info

**Total Time**: ~5-10 minutes

### Monitoring Deployment

#### Via GitHub Actions UI

1. Go to: https://github.com/Theprofitplatform/seoexpert/actions
2. Click on the latest "Deploy to Production VPS" workflow
3. Watch real-time logs

#### Via GitHub CLI

```bash
# Watch the latest workflow run
gh run watch

# List recent runs
gh run list --workflow=deploy-production.yml

# View specific run
gh run view <run-id> --log
```

#### Via Discord/Slack

- Receive notifications when deployment starts
- Get success/failure notifications
- See deployment details (commit, author, time)

---

## Safety Gates

### Gate 1: Dev Branch Tests
**Trigger**: Push to dev branch
**Checks**:
- ✅ Unit tests
- ✅ Integration tests
- ✅ Linting (if configured)

**Action**: If failed, fix and push again

### Gate 2: PR Checks
**Trigger**: Create PR from dev to main
**Checks**:
- ✅ Full test suite
- ✅ Code quality analysis
- ✅ Security audit
- ✅ Docker build verification
- ✅ PR summary generation

**Action**: If failed, push fixes to dev

### Gate 3: Pre-Deployment Tests
**Trigger**: Merge to main
**Checks**:
- ✅ Full test suite
- ✅ All dependencies installed

**Action**: If failed, deployment aborted

### Gate 4: Health Checks
**Trigger**: After deployment
**Checks**:
- ✅ API health endpoint responds
- ✅ All containers running
- ✅ Database connectivity

**Action**: If failed, automatic rollback

---

## Rollback Procedures

### Automatic Rollback

Happens automatically if health checks fail after deployment.

### Manual Rollback

#### Method 1: Via GitHub Actions UI

1. Go to: https://github.com/Theprofitplatform/seoexpert/actions/workflows/deploy-production.yml
2. Click **Run workflow**
3. Select `main` branch
4. Click **Run workflow**
5. The workflow will detect manual trigger and offer rollback option

#### Method 2: Via GitHub CLI

```bash
# Trigger rollback workflow
gh workflow run deploy-production.yml --ref main
```

#### Method 3: Via SSH (Direct VPS Access)

```bash
# SSH into VPS
ssh avi@31.97.222.218

# Navigate to deployment directory
cd /home/avi/seo-automation

# Restore backup
cd current
docker compose -f docker-compose.prod.yml down
cd ..
rm -rf current
cp -r backup current
cd current
docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d

echo "✅ Rollback completed!"
```

#### Method 4: Via Deployment Script

```bash
# On VPS
cd /home/avi/seo-automation
./scripts/rollback.sh  # If script exists
```

### Database Rollback

```bash
# SSH into VPS
ssh avi@31.97.222.218

# Navigate to backups
cd /home/avi/seo-automation/backups

# List available backups
ls -lht db_backup_*.sql

# Restore specific backup
DB_BACKUP="db_backup_20251029_153000.sql"
docker compose -f /home/avi/seo-automation/current/docker-compose.prod.yml exec -T postgres psql -U seo_user -d seo_unified_prod < $DB_BACKUP

echo "✅ Database restored!"
```

---

## Troubleshooting

### Issue: Tests Failing on Dev

**Symptoms**: Push to dev fails tests

**Solutions**:
```bash
# Run tests locally first
npm test

# Check specific test failures
npm test -- --verbose

# Fix issues and push again
git add .
git commit -m "fix: resolve test failures"
git push origin dev
```

### Issue: PR Checks Not Running

**Symptoms**: PR created but no checks appear

**Solutions**:
1. Wait 30-60 seconds for checks to start
2. Check GitHub Actions tab for workflow runs
3. Verify `.github/workflows/pr-checks.yml` exists
4. Check branch protection settings

### Issue: Deployment Stuck

**Symptoms**: Deployment running for >15 minutes

**Solutions**:
```bash
# Check VPS status
ssh avi@31.97.222.218 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml ps'

# Check deployment logs
gh run view --log

# If stuck, cancel and retry
gh run cancel <run-id>
gh workflow run deploy-production.yml
```

### Issue: Health Checks Failing

**Symptoms**: Deployment fails at health check step

**Solutions**:
```bash
# SSH into VPS
ssh avi@31.97.222.218

# Check container status
cd /home/avi/seo-automation/current
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs dashboard
docker compose -f docker-compose.prod.yml logs postgres

# Test health endpoint manually
curl http://localhost:9000/api/v2/health

# Restart services if needed
docker compose -f docker-compose.prod.yml restart dashboard
```

### Issue: Database Migration Failed

**Symptoms**: Deployment fails during migration

**Solutions**:
```bash
# SSH into VPS
ssh avi@31.97.222.218

# Check PostgreSQL logs
cd /home/avi/seo-automation/current
docker compose -f docker-compose.prod.yml logs postgres

# Access PostgreSQL directly
docker compose -f docker-compose.prod.yml exec postgres psql -U seo_user -d seo_unified_prod

# Check schema version
\dt

# Manual migration (if needed)
docker compose -f docker-compose.prod.yml exec -T postgres psql -U seo_user -d seo_unified_prod -f /docker-entrypoint-initdb.d/postgresql-schema.sql
```

---

## Best Practices

### Commit Messages

Use conventional commits:

```bash
# Features
git commit -m "feat: add user authentication"

# Bug fixes
git commit -m "fix: resolve login issue"

# Performance
git commit -m "perf: optimize database queries"

# Refactoring
git commit -m "refactor: restructure API routes"

# Documentation
git commit -m "docs: update deployment guide"

# Tests
git commit -m "test: add integration tests for API"
```

### Pull Request Guidelines

**Good PR**:
```markdown
## Summary
Add automatic keyword tracking feature

## Changes
- Created keyword tracking service
- Added PostgreSQL schema for keywords
- Implemented API endpoints
- Added unit tests

## Testing
- ✅ All tests passing
- ✅ Tested locally with Docker
- ✅ Database migrations verified

## Screenshots
[Add screenshots if UI changes]

## Checklist
- [x] Tests added/updated
- [x] Documentation updated
- [x] No breaking changes
- [x] Database migrations tested
```

### Deployment Checklist

Before merging to main:

- [ ] All tests passing on dev
- [ ] Code reviewed by team member (if applicable)
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] Breaking changes communicated
- [ ] Rollback plan ready

---

## Quick Reference Commands

```bash
# Daily workflow
git checkout dev && git pull
# ... make changes ...
git add . && git commit -m "feat: description"
git push origin dev
gh pr create --base main --head dev

# Check deployment status
gh run list --workflow=deploy-production.yml
gh run watch

# Rollback
gh workflow run deploy-production.yml --ref main

# Check VPS status
ssh avi@31.97.222.218 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml ps'

# View logs
ssh avi@31.97.222.218 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml logs --tail=50 dashboard'
```

---

## Additional Resources

- **Branch Protection Setup**: `.github/BRANCH_PROTECTION_SETUP.md`
- **Deployment Notifications**: `.github/DEPLOYMENT_NOTIFICATIONS_SETUP.md`
- **Deployment Infrastructure**: `DEPLOYMENT_INFRASTRUCTURE_SUMMARY.md`
- **Quick Start Guide**: `DEPLOYMENT_QUICK_START.md`

---

## Support

**Questions?** Check the documentation or review workflow files:
- `.github/workflows/deploy-production.yml` - Production deployment
- `.github/workflows/pr-checks.yml` - PR checks
- `.github/workflows/test.yml` - Testing workflow

**Issues?** Create a GitHub issue or check the Actions logs for detailed information.

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
**Maintained By**: Development Team
