# 🚀 GitHub Actions CI/CD Setup

## ✅ What's Been Set Up

I've created a **GitHub Actions workflow** that automatically deploys your SEO Expert platform to TPP VPS whenever you push to the `main` branch.

**Workflow file**: `.github/workflows/deploy-tpp-vps.yml`

---

## 🎯 What It Does

When you push code to `main`, the workflow automatically:

1. ✅ **Runs tests** - Ensures code quality before deployment
2. ✅ **Connects to TPP VPS** - Uses SSH to securely connect
3. ✅ **Creates backup** - Backs up current code and database
4. ✅ **Pulls latest code** - Gets your changes from GitHub
5. ✅ **Installs dependencies** - Runs `npm ci` with proper flags
6. ✅ **Restarts PM2 service** - Deploys using PM2 (not Docker)
7. ✅ **Verifies health** - Checks if service is running
8. ✅ **Checks Cloudflare Tunnel** - Ensures external access works
9. ✅ **Notifies you** - Optional Discord notifications

**Deployment time**: ~2-3 minutes

---

## 🔐 Required GitHub Secrets

You need to add 3 secrets to your GitHub repository:

### Step 1: Get Your SSH Key

On your local machine:

```bash
# If you already have SSH access to tpp-vps, find your key:
cat ~/.ssh/id_rsa

# OR if you use a specific key for tpp-vps:
cat ~/.ssh/tpp_vps_key

# Copy the ENTIRE output (including -----BEGIN and -----END lines)
```

**Expected format**:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAw... (many lines)
...
-----END OPENSSH PRIVATE KEY-----
```

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

Add these 3 secrets:

#### Secret 1: `TPP_VPS_SSH_KEY`
- **Name**: `TPP_VPS_SSH_KEY`
- **Value**: Your entire SSH private key (from Step 1)

#### Secret 2: `TPP_VPS_HOST`
- **Name**: `TPP_VPS_HOST`
- **Value**: Your VPS IP address or hostname

To get it:
```bash
# From your local machine:
ssh tpp-vps 'hostname -I | cut -d" " -f1'

# OR check your SSH config:
cat ~/.ssh/config | grep -A5 "Host tpp-vps"
```

Common values:
- IP address: `31.97.222.218` (or similar)
- OR hostname: `srv982719.hstgr.cloud` (or similar)

#### Secret 3: `TPP_VPS_USER`
- **Name**: `TPP_VPS_USER`
- **Value**: Your SSH username (probably `avi`)

To confirm:
```bash
ssh tpp-vps 'whoami'
```

### Step 3: Optional Discord Notifications

If you want Discord notifications on deployments:

#### Secret 4 (Optional): `DISCORD_WEBHOOK_URL`
- **Name**: `DISCORD_WEBHOOK_URL`
- **Value**: Your Discord webhook URL

To create a Discord webhook:
1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Name it "SEO Expert Deployments"
5. Choose a channel
6. Copy the webhook URL

**Example format**:
```
https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

---

## 🧪 Testing the Workflow

### Option 1: Push to Main (Automatic)

```bash
# Make a small change
echo "# Testing GitHub Actions" >> TEST.md
git add TEST.md
git commit -m "test: verify GitHub Actions deployment"
git push origin main

# The workflow will trigger automatically!
```

### Option 2: Manual Trigger

1. Go to GitHub repository
2. Click **Actions** tab
3. Click **Deploy to TPP VPS (PM2)** workflow
4. Click **Run workflow** dropdown
5. Click **Run workflow** button

---

## 📊 Monitoring Deployments

### View Workflow Status

1. Go to GitHub repository
2. Click **Actions** tab
3. See all workflow runs with status:
   - 🟢 Green checkmark = Success
   - 🔴 Red X = Failed
   - 🟡 Yellow circle = In progress

### View Deployment Logs

Click on any workflow run to see detailed logs:
- Test results
- Deployment steps
- Health check results
- PM2 status
- Any errors

### Check Live Status

After deployment completes, verify:

```bash
# From your local machine:
ssh tpp-vps 'pm2 status seo-expert'

# Or check the public URL:
curl -I https://seo-expert.theprofitplatform.com.au
```

---

## 🔄 How It Works

### Automatic Deployment Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. You push code to main branch                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. GitHub Actions triggered automatically           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. Run Tests (npm test)                             │
│    └─ If tests fail, deployment stops here ❌       │
└──────────────────┬──────────────────────────────────┘
                   │ Tests passed ✅
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. SSH to TPP VPS                                   │
│    └─ Uses your SSH key from GitHub Secrets        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 5. Backup current code and database                │
│    └─ Keeps last 5 backups + 10 DB backups         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 6. Pull latest code from GitHub                    │
│    └─ git fetch origin main                        │
│    └─ git reset --hard origin/main                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 7. Install dependencies                             │
│    └─ npm ci --omit=dev --ignore-scripts           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 8. Restart PM2 service                              │
│    └─ pm2 restart seo-expert                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 9. Health check                                     │
│    └─ curl http://localhost:3000                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 10. Verify Cloudflare Tunnel                       │
│     └─ systemctl status cloudflared                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 11. Deployment Summary                              │
│     • PM2 status                                    │
│     • Memory usage                                  │
│     • Public URL                                    │
│     • Integration status                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 12. Notify (Discord/GitHub)                         │
│     └─ ✅ Success or ❌ Failure message             │
└─────────────────────────────────────────────────────┘
```

---

## 🆘 Rollback Feature

If a deployment goes wrong, you can rollback:

### Option 1: Automatic Git Rollback

```bash
# Revert the commit
git revert HEAD

# Push to trigger automatic redeployment
git push origin main

# GitHub Actions will deploy the reverted version
```

### Option 2: Manual Rollback via GitHub Actions

1. Go to GitHub → **Actions** tab
2. Click **Deploy to TPP VPS (PM2)** workflow
3. Click **Run workflow** dropdown
4. Select the **rollback** job
5. Click **Run workflow**

This will restore the most recent backup.

### Option 3: SSH Rollback

```bash
# SSH to VPS
ssh tpp-vps

# Go to project directory
cd ~/projects/seo-expert

# List backups
ls -lh ~/backups/seo-expert/backup-*.tar.gz

# Stop service
pm2 stop seo-expert

# Extract backup (use actual filename)
tar -xzf ~/backups/seo-expert/backup-20250126-143022.tar.gz

# Reinstall dependencies
npm ci --omit=dev --ignore-scripts

# Restart service
pm2 restart seo-expert

# Verify
pm2 show seo-expert
curl http://localhost:3000
```

---

## 🔧 Customization

### Change Deployment Trigger

Edit `.github/workflows/deploy-tpp-vps.yml`:

```yaml
# Deploy only on tags
on:
  push:
    tags:
      - 'v*'

# OR deploy on specific branches
on:
  push:
    branches:
      - main
      - production
      - staging

# OR schedule deployments
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

### Skip Tests (Not Recommended)

```yaml
# Comment out or remove the test job
jobs:
  # test:
  #   name: Run Tests
  #   ...

  deploy:
    # Remove this line:
    # needs: test
```

### Add More Health Checks

```yaml
- name: Custom health checks
  run: |
    ssh tpp-vps << 'ENDSSH'
      # Check database connection
      curl http://localhost:3000/api/v2/health

      # Check SerpBear integration
      curl http://localhost:3006/api/health

      # Check disk space
      df -h | grep sda

      # Check memory
      free -h
    ENDSSH
```

---

## 📊 Benefits of This Setup

### Before GitHub Actions:
```bash
# Manual deployment (error-prone):
ssh tpp-vps
cd ~/projects/seo-expert
git pull
npm ci
pm2 restart seo-expert
# Hope nothing breaks! 🤞
```

### After GitHub Actions:
```bash
# Automated deployment:
git push origin main
# Everything happens automatically! ✨
# Tests run first ✅
# Backups created ✅
# Service restarted ✅
# Health verified ✅
# You get notified ✅
```

**Time saved**: ~5-10 minutes per deployment

**Risk reduced**: Automatic backups + health checks + rollback capability

**Professional workflow**: Like big tech companies (Google, Facebook, etc.)

---

## 🎯 Quick Reference

### First-Time Setup Checklist

- [ ] Add `TPP_VPS_SSH_KEY` to GitHub Secrets
- [ ] Add `TPP_VPS_HOST` to GitHub Secrets
- [ ] Add `TPP_VPS_USER` to GitHub Secrets
- [ ] (Optional) Add `DISCORD_WEBHOOK_URL` to GitHub Secrets
- [ ] Test with a small commit
- [ ] Verify deployment in Actions tab
- [ ] Check service on VPS: `ssh tpp-vps 'pm2 status'`
- [ ] Test public URL: `https://seo-expert.theprofitplatform.com.au`

### Daily Usage

```bash
# 1. Make changes locally
vim dashboard-server.js

# 2. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin main

# 3. Watch GitHub Actions deploy automatically!
# Go to: https://github.com/YOUR_USERNAME/seo-expert/actions

# 4. Verify deployment
curl https://seo-expert.theprofitplatform.com.au
```

### Troubleshooting

**Q: Deployment failed with "Permission denied (publickey)"**
- Check if `TPP_VPS_SSH_KEY` is correctly set in GitHub Secrets
- Ensure you copied the ENTIRE private key including BEGIN/END lines
- Verify the key has access to the VPS: `ssh -i ~/.ssh/your_key tpp-vps`

**Q: Tests are failing**
- Check the Actions tab for test output
- Run tests locally: `npm test`
- You can temporarily skip tests (not recommended) or fix the tests

**Q: Health check failed after deployment**
- SSH to VPS: `ssh tpp-vps`
- Check PM2 logs: `pm2 logs seo-expert`
- Check if service is running: `pm2 status`
- Manually restart: `pm2 restart seo-expert`

**Q: I want to deploy without triggering CI/CD**
- Add `[skip ci]` to your commit message:
  ```bash
  git commit -m "docs: update README [skip ci]"
  ```

---

## 🎉 You're All Set!

Your GitHub Actions CI/CD pipeline is ready!

**Next steps**:
1. Add the 3 required GitHub Secrets
2. Make a test commit
3. Watch it deploy automatically
4. Enjoy professional automated deployments! 🚀

**Need help?** Check the Actions tab for detailed logs of every deployment.

---

**Summary**:
- ✅ Automatic deployment on push to main
- ✅ Tests run before deployment
- ✅ Automatic backups (code + database)
- ✅ Health checks after deployment
- ✅ Easy rollback capability
- ✅ Discord notifications (optional)
- ✅ Professional workflow
- ✅ Zero manual SSH needed

**Time to set up**: 10 minutes
**Time saved per deployment**: 5-10 minutes
**Risk reduction**: Massive (backups + tests + verification)

🎯 **Professional DevOps workflow achieved!**
