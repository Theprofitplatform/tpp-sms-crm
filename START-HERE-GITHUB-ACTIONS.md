# 🚀 Start Here: GitHub Actions CI/CD

## ⚡ TL;DR (Too Long; Didn't Read)

**What**: Automatic deployment to your VPS whenever you push to GitHub

**Why**: Save 5-10 hours per month, reduce deployment risks, professional workflow

**Setup time**: 10 minutes

**Daily usage**: Just `git push origin main` - that's it!

---

## 🎯 Quick Navigation

**Choose your path**:

### Option 1: I Want to Set It Up Now (10 min)
👉 Read: **`GITHUB-ACTIONS-SETUP.md`**
- Step-by-step setup guide
- GitHub Secrets configuration
- First deployment test

### Option 2: I Want the Quick Version (2 min)
👉 Read this page + **`GITHUB-ACTIONS-QUICK-REFERENCE.md`**
- One-page cheat sheet
- Common commands
- Quick troubleshooting

### Option 3: I Want to Understand What Was Done
👉 Read: **`GITHUB-ACTIONS-IMPLEMENTATION-COMPLETE.md`**
- Complete implementation overview
- Why these choices
- Benefits and workflow

### Option 4: I Just Want Commands
👉 Read: **`GITHUB-ACTIONS-QUICK-REFERENCE.md`** (skip to commands section)
- All commands in one place
- Copy-paste ready

---

## 📦 What You Get

### Before (Manual Deployment)
```bash
ssh tpp-vps
cd ~/projects/seo-expert
git pull
npm ci --omit=dev --ignore-scripts
pm2 restart seo-expert
# Cross fingers 🤞
# Time: 5-10 minutes
```

### After (Automatic Deployment)
```bash
git push origin main
# ✨ Everything happens automatically!
# Time: 0 minutes (runs while you work)
```

---

## 🔧 One-Time Setup (Do This Once)

### Step 1: Add 3 GitHub Secrets (5 minutes)

Go to: **Your GitHub Repo → Settings → Secrets and variables → Actions**

Add these secrets:

1. **`TPP_VPS_SSH_KEY`**
   ```bash
   cat ~/.ssh/id_rsa
   # Copy entire output (including BEGIN/END lines)
   ```

2. **`TPP_VPS_HOST`**
   ```bash
   ssh tpp-vps 'hostname -I | cut -d" " -f1'
   # Copy the IP address
   ```

3. **`TPP_VPS_USER`**
   ```bash
   ssh tpp-vps 'whoami'
   # Copy the username (probably: avi)
   ```

**Need detailed help?** → See `GITHUB-ACTIONS-SETUP.md`

### Step 2: Test It (3 minutes)

```bash
# Make a test change
echo "# Testing GitHub Actions" >> TEST.md

# Commit and push
git add TEST.md
git commit -m "test: verify GitHub Actions deployment"
git push origin main

# Watch it deploy!
# Go to: https://github.com/YOUR_USERNAME/seo-expert/actions
```

### Step 3: Verify (2 minutes)

```bash
# Check service status
npm run vps:status

# Or test the URL
curl https://seo-expert.theprofitplatform.com.au
```

**Done!** 🎉 You now have automatic deployments.

---

## 📖 Daily Workflow

### Making Changes

```bash
# 1. Make changes locally
vim dashboard-server.js

# 2. Commit
git add .
git commit -m "feat: add new feature"

# 3. Push (triggers automatic deployment)
git push origin main

# 4. Done! ✨
# Watch deployment at:
# https://github.com/YOUR_USERNAME/seo-expert/actions
```

### Checking Status

```bash
# Quick status check
npm run vps:status

# View logs
npm run vps:logs

# View GitHub Actions
npm run actions:status
```

### If Deployment Fails

```bash
# Option 1: Revert the commit
git revert HEAD
git push origin main

# Option 2: Check what went wrong
npm run vps:logs

# Option 3: Restart manually
npm run vps:restart
```

**Need help?** → See `GITHUB-ACTIONS-QUICK-REFERENCE.md`

---

## 🎯 What Happens Automatically

When you push to `main`:

```
Push Code → Run Tests → Create Backup → Deploy → Health Check → Notify
   ⏱️ 30s     ⏱️ 30s       ⏱️ 10s      ⏱️ 45s     ⏱️ 15s      ⏱️ 5s

Total: ~2-3 minutes (happens automatically)
```

**Features**:
- ✅ Tests run first (deployment stops if tests fail)
- ✅ Automatic code backup (last 5 kept)
- ✅ Automatic database backup (last 10 kept)
- ✅ Health check after deployment
- ✅ Cloudflare Tunnel verification
- ✅ Deployment summary with stats
- ✅ Discord notifications (optional)
- ✅ Easy rollback

---

## 🆘 Emergency Rollback

### Option 1: Git Revert (Easiest)
```bash
git revert HEAD
git push origin main
# Deploys previous working version
```

### Option 2: SSH Rollback
```bash
ssh tpp-vps
cd ~/projects/seo-expert
ls ~/backups/seo-expert/backup-*.tar.gz | head -1
pm2 stop seo-expert
tar -xzf ~/backups/seo-expert/backup-YYYYMMDD-HHMMSS.tar.gz
npm ci --omit=dev --ignore-scripts
pm2 restart seo-expert
```

---

## 📚 Documentation Map

**All documentation files**:

```
├── START-HERE-GITHUB-ACTIONS.md          ← You are here
│   └── Quick overview + setup links
│
├── GITHUB-ACTIONS-SETUP.md               ← Detailed setup guide
│   └── Step-by-step instructions
│   └── GitHub Secrets configuration
│   └── Testing and verification
│   └── Troubleshooting
│
├── GITHUB-ACTIONS-QUICK-REFERENCE.md     ← Daily cheat sheet
│   └── One-page command reference
│   └── Common workflows
│   └── Quick troubleshooting
│
├── GITHUB-ACTIONS-IMPLEMENTATION-COMPLETE.md  ← Full implementation details
│   └── What was created and why
│   └── Benefits analysis
│   └── Workflow diagrams
│
├── ALTERNATIVE-DEPLOYMENT-OPTIONS.md     ← Why not Cloudflare Workers?
│   └── Comparison of all options
│   └── Pros and cons analysis
│
└── DEPLOYMENT-OPTIONS-COMPARISON.md      ← Cloudflare Tunnel analysis
    └── Why use Cloudflare Tunnel
    └── Nginx comparison
```

**Quick links**:
- **Setup**: → `GITHUB-ACTIONS-SETUP.md`
- **Daily use**: → `GITHUB-ACTIONS-QUICK-REFERENCE.md`
- **Understanding**: → `GITHUB-ACTIONS-IMPLEMENTATION-COMPLETE.md`
- **Commands**: → `GITHUB-ACTIONS-QUICK-REFERENCE.md` (commands section)

---

## 💡 Key Concepts

### What is CI/CD?

**CI** = Continuous Integration
- Automatically test code when pushed
- Catch bugs early
- Maintain code quality

**CD** = Continuous Deployment
- Automatically deploy tested code
- Consistent deployments
- Zero manual steps

### Why Use It?

**Time Savings**:
- Manual: 5-10 min per deployment
- Automatic: 0 min (happens in background)
- **Savings**: 5-10 hours/month

**Risk Reduction**:
- Tests run automatically
- Backups created automatically
- Easy rollback if issues
- Consistent process every time

**Professional Workflow**:
- Same as Google, Facebook, Netflix
- Industry standard
- Team collaboration ready

---

## 🎓 NPM Scripts Reference

```bash
# VPS Management
npm run vps:status        # Show PM2 process details
npm run vps:logs          # View PM2 logs (last 50 lines)
npm run vps:restart       # Restart PM2 service
npm run vps:health        # Check health endpoint
npm run vps:connect       # SSH to VPS
npm run vps:monitor       # Real-time PM2 monitoring
npm run vps:backup        # Create manual backup
npm run vps:update        # Quick update (pull + restart)
npm run vps:deploy        # Full deployment script

# GitHub Actions
npm run actions:status    # View GitHub Actions status
npm run actions:logs      # View recent workflow runs
```

---

## ✅ Success Checklist

### Setup Complete When:
- [ ] Added TPP_VPS_SSH_KEY to GitHub Secrets
- [ ] Added TPP_VPS_HOST to GitHub Secrets
- [ ] Added TPP_VPS_USER to GitHub Secrets
- [ ] Made test commit
- [ ] Watched deployment in Actions tab
- [ ] Verified service running on VPS
- [ ] Tested public URL

### Using It Daily:
- [ ] Push code to trigger deployment
- [ ] Check Actions tab for status
- [ ] Verify deployment succeeded
- [ ] Know how to rollback if needed

---

## 🎉 You're Ready!

**What you have now**:
- ✅ Professional CI/CD pipeline
- ✅ Automatic testing
- ✅ Automatic deployment
- ✅ Automatic backups
- ✅ Easy rollback
- ✅ Full documentation

**What you need to do**:
1. Add 3 GitHub Secrets (10 minutes)
2. Test with small commit (3 minutes)
3. Start using it daily (just push code!)

**Time investment**: 13 minutes
**Time saved**: 5-10 hours per month
**ROI**: Massive! 🚀

---

## 🔗 Quick Links

**Setup**:
- Detailed guide: `GITHUB-ACTIONS-SETUP.md`
- Quick reference: `GITHUB-ACTIONS-QUICK-REFERENCE.md`

**Understanding**:
- Implementation details: `GITHUB-ACTIONS-IMPLEMENTATION-COMPLETE.md`
- Why this approach: `ALTERNATIVE-DEPLOYMENT-OPTIONS.md`

**GitHub**:
- Your Actions: `https://github.com/YOUR_USERNAME/seo-expert/actions`
- Repository Settings: `https://github.com/YOUR_USERNAME/seo-expert/settings`
- Secrets: `https://github.com/YOUR_USERNAME/seo-expert/settings/secrets/actions`

**Service**:
- Public URL: `https://seo-expert.theprofitplatform.com.au`
- Internal URL: `http://localhost:3000` (on VPS)

---

## 📞 Need Help?

**Quick fixes**:
```bash
# Can't connect to VPS?
ssh tpp-vps 'echo "Connection works!"'

# Deployment failed?
npm run actions:logs

# Service not running?
npm run vps:restart

# Need logs?
npm run vps:logs
```

**Documentation**:
- Setup issues: `GITHUB-ACTIONS-SETUP.md`
- Daily usage: `GITHUB-ACTIONS-QUICK-REFERENCE.md`
- Understanding workflow: `GITHUB-ACTIONS-IMPLEMENTATION-COMPLETE.md`

---

## 🎯 Next Steps

### Right Now (10 min)
1. Add the 3 GitHub Secrets
2. Test deployment
3. Bookmark `GITHUB-ACTIONS-QUICK-REFERENCE.md`

### This Week
1. Use it for real deployments
2. Practice checking status
3. Get comfortable with workflow

### Later (Optional)
1. Add Discord notifications
2. Customize workflow
3. Add more tests
4. Share with team

---

**Ready to start?** → Open `GITHUB-ACTIONS-SETUP.md` and follow the setup steps!

**Just want to use it?** → Add the 3 secrets, push code, done!

**Want to understand first?** → Read `GITHUB-ACTIONS-IMPLEMENTATION-COMPLETE.md`

🚀 **Your choice - all paths lead to automated deployments!**
