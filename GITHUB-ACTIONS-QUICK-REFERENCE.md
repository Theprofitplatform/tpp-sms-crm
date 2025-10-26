# ⚡ GitHub Actions Quick Reference

## 🚀 One-Time Setup (10 minutes)

### 1. Add GitHub Secrets

Go to: `GitHub Repository → Settings → Secrets and variables → Actions`

Add these 3 secrets:

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `TPP_VPS_SSH_KEY` | Your SSH private key | `cat ~/.ssh/id_rsa` |
| `TPP_VPS_HOST` | VPS IP or hostname | `ssh tpp-vps 'hostname -I'` |
| `TPP_VPS_USER` | SSH username | `ssh tpp-vps 'whoami'` |

**Optional**:
| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `DISCORD_WEBHOOK_URL` | Discord webhook | Discord Server → Settings → Integrations |

### 2. Test It

```bash
# Make a small change
echo "# Testing CI/CD" >> TEST.md

# Commit and push
git add TEST.md
git commit -m "test: verify GitHub Actions"
git push origin main

# Watch it deploy! 🚀
# Go to: https://github.com/YOUR_USERNAME/seo-expert/actions
```

---

## 📝 Daily Workflow

### Standard Development Flow

```bash
# 1. Make changes locally
vim src/my-feature.js

# 2. Test locally (optional)
npm test

# 3. Commit
git add .
git commit -m "feat: add my awesome feature"

# 4. Push to trigger deployment
git push origin main

# ✨ Deployment happens automatically!
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
# Check service status on VPS
ssh tpp-vps 'pm2 status seo-expert'

# Check logs
ssh tpp-vps 'pm2 logs seo-expert --lines 50'

# Test endpoint
curl https://seo-expert.theprofitplatform.com.au
```

**Option 3: Discord** (if configured)
- Get automatic notifications in your Discord channel

---

## 🆘 If Deployment Fails

### Step 1: Check the Logs

1. Go to Actions tab
2. Click the failed workflow run
3. Click on the "Deploy to TPP VPS" job
4. Read the error message

### Step 2: Common Issues & Fixes

**Issue: "Permission denied (publickey)"**
```bash
# Fix: Re-add your SSH key to GitHub Secrets
cat ~/.ssh/id_rsa  # Copy entire output
# Paste into GitHub Secrets → TPP_VPS_SSH_KEY
```

**Issue: "Tests failed"**
```bash
# Fix: Run tests locally and fix them
npm test

# OR skip tests temporarily (not recommended):
git commit -m "fix: something [skip ci]"
```

**Issue: "Health check failed"**
```bash
# Fix: SSH and check logs
ssh tpp-vps 'pm2 logs seo-expert --lines 100'

# Restart manually if needed
ssh tpp-vps 'pm2 restart seo-expert'
```

**Issue: "Database error"**
```bash
# Check database backups
ssh tpp-vps 'ls -lh ~/backups/seo-expert/database/'

# Restore if needed (see Rollback section)
```

---

## ⏮️ Rollback (If Something Breaks)

### Option 1: Git Revert (Easiest)

```bash
# Revert the last commit
git revert HEAD

# Push to trigger automatic redeployment
git push origin main

# GitHub Actions will deploy the working version
```

### Option 2: Manual Rollback via SSH

```bash
# SSH to VPS
ssh tpp-vps

# Go to project directory
cd ~/projects/seo-expert

# Find latest backup
ls -lh ~/backups/seo-expert/backup-*.tar.gz | head -1

# Stop service
pm2 stop seo-expert

# Extract backup (use actual filename from ls output)
tar -xzf ~/backups/seo-expert/backup-20250126-143022.tar.gz

# Reinstall and restart
npm ci --omit=dev --ignore-scripts
pm2 restart seo-expert

# Verify
pm2 show seo-expert
```

### Option 3: Rollback Workflow (GitHub UI)

1. Go to Actions tab
2. Click "Deploy to TPP VPS (PM2)"
3. Click "Run workflow"
4. Select "rollback" job
5. Click "Run workflow"

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
# Check PM2 status
ssh tpp-vps 'pm2 status'

# View logs
ssh tpp-vps 'pm2 logs seo-expert --lines 50'

# Check memory usage
ssh tpp-vps 'pm2 show seo-expert'

# Check Cloudflare Tunnel
ssh tpp-vps 'systemctl status cloudflared'
```

### Maintenance
```bash
# View backups
ssh tpp-vps 'ls -lh ~/backups/seo-expert/'

# View database backups
ssh tpp-vps 'ls -lh ~/backups/seo-expert/database/'

# Clean old logs
ssh tpp-vps 'pm2 flush seo-expert'

# Restart service manually
ssh tpp-vps 'pm2 restart seo-expert'
```

---

## 🔐 Security Best Practices

✅ **DO**:
- Keep your SSH private key secret
- Use strong passwords for GitHub
- Enable 2FA on GitHub
- Review deployment logs
- Test changes locally before pushing

❌ **DON'T**:
- Share your SSH private key
- Commit secrets to git
- Push directly to main without testing
- Ignore failed deployment notifications
- Skip tests without good reason

---

## 📊 Workflow Timeline

**Typical deployment timeline**:
```
00:00 - Push to GitHub
00:05 - Tests start (30-60 seconds)
00:45 - Deployment starts
01:00 - Code downloaded to VPS
01:15 - Dependencies installed
01:45 - PM2 service restarted
02:00 - Health check passed
02:15 - Deployment complete ✅

Total: ~2-3 minutes
```

---

## 🎓 Understanding the Workflow

### What Happens Automatically

1. **Tests Run First**
   - Ensures code quality
   - If tests fail, deployment stops
   - Prevents broken code from going live

2. **Backups Created**
   - Code backup (last 5 kept)
   - Database backup (last 10 kept)
   - Easy rollback if needed

3. **Safe Deployment**
   - Pulls latest code
   - Installs dependencies
   - Restarts service
   - Verifies health

4. **Verification**
   - Health endpoint checked
   - PM2 status verified
   - Cloudflare Tunnel checked

5. **Notification**
   - GitHub UI shows status
   - Discord notification (if configured)
   - Email from GitHub (if enabled)

### Why This Is Better Than Manual

**Before** (Manual):
- ❌ Inconsistent deployments
- ❌ Forget to test
- ❌ No automatic backups
- ❌ Human errors
- ❌ Time consuming (5-10 min)
- ❌ No audit trail

**After** (GitHub Actions):
- ✅ Consistent deployments
- ✅ Tests always run
- ✅ Automatic backups
- ✅ Automated process
- ✅ Fast (2-3 min)
- ✅ Full audit trail

---

## 🔧 Customization

### Deploy on Tag Instead of Push

Edit `.github/workflows/deploy-tpp-vps.yml`:

```yaml
on:
  push:
    tags:
      - 'v*'  # Deploy when you push v1.0.0, v1.0.1, etc.
```

Then deploy with:
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Add Slack Notifications

Add to workflow:
```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Skip Deployment for Docs

```bash
# These won't trigger deployment:
git commit -m "docs: update README [skip ci]"
git commit -m "chore: update dependencies [skip ci]"
git commit -m "style: format code [skip ci]"
```

---

## 📞 Getting Help

**Check deployment logs**:
```
https://github.com/YOUR_USERNAME/seo-expert/actions
```

**Check service status**:
```bash
ssh tpp-vps 'pm2 show seo-expert'
```

**View detailed docs**:
- `GITHUB-ACTIONS-SETUP.md` - Full setup guide
- `VPS-REFERENCE-CARD.md` - VPS management
- `ALTERNATIVE-DEPLOYMENT-OPTIONS.md` - Why GitHub Actions?

**Test SSH connection**:
```bash
ssh tpp-vps 'echo "Connection works!"'
```

---

## ✅ Checklist

### First Deployment
- [ ] Added all 3 required GitHub Secrets
- [ ] Tested SSH connection manually
- [ ] Made a test commit
- [ ] Watched deployment in Actions tab
- [ ] Verified service is running
- [ ] Tested public URL

### Every Deployment
- [ ] Tested changes locally
- [ ] Committed with meaningful message
- [ ] Pushed to main
- [ ] Checked Actions tab for status
- [ ] Verified deployment succeeded
- [ ] Tested public URL (if needed)

### If Problems
- [ ] Read error message in Actions tab
- [ ] Check PM2 logs on VPS
- [ ] Review recent changes
- [ ] Consider rollback
- [ ] Fix issue locally
- [ ] Deploy again

---

## 🎉 Success Indicators

**Deployment is successful when**:
- ✅ GitHub Actions shows green checkmark
- ✅ PM2 shows "online" status
- ✅ Health endpoint responds
- ✅ Public URL loads correctly
- ✅ No errors in PM2 logs
- ✅ Cloudflare Tunnel is active

**Example successful deployment**:
```bash
$ ssh tpp-vps 'pm2 show seo-expert'
┌─────────────┬──────────┬──────────┐
│ status      │ online   │          │
│ uptime      │ 5m       │          │
│ memory      │ 76.5 MB  │          │
│ cpu         │ 0.1%     │          │
└─────────────┴──────────┴──────────┘

$ curl -I https://seo-expert.theprofitplatform.com.au
HTTP/2 200
✅ All good!
```

---

**Remember**: Once set up, deployments are completely automatic. Just push to main! 🚀
