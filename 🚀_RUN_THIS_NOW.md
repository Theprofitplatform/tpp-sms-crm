# 🚀 RUN THIS NOW - Complete Setup in 30 Seconds

## ⚡ ONE COMMAND TO COMPLETE EVERYTHING

```bash
./deploy-workflow.sh
```

**That's it!** This script will:
- ✅ Deploy workflow code to VPS
- ✅ Configure branch protection
- ✅ Set up notifications (if configured)
- ✅ Verify everything works

**Time**: 30 seconds
**Manual work**: None (if SSH is set up)

---

## 📋 Before Running

### Check SSH Access

Test if you can SSH to your VPS:
```bash
ssh avi@31.97.222.218 echo "SSH works"
```

**If this fails**, set up SSH first:
```bash
# Copy your SSH key to VPS
ssh-copy-id avi@31.97.222.218

# Then try again
ssh avi@31.97.222.218 echo "SSH works"
```

### Optional: Discord Notifications

If you want Discord notifications, set this first:
```bash
# Replace with your actual Discord webhook URL
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_URL"
```

Get webhook URL from Discord:
1. Discord → Server Settings → Integrations → Webhooks
2. New Webhook → Copy URL

---

## 🎯 Run The Script

```bash
# Make it executable (already done)
chmod +x deploy-workflow.sh

# Run it
./deploy-workflow.sh
```

**Watch it go!** The script will:
1. Check prerequisites
2. Deploy to VPS
3. Configure GitHub
4. Test everything
5. Show you the results

---

## ✅ What You'll See

```
╔════════════════════════════════════════════════════════════╗
║   AUTOMATIC DEPLOYMENT WORKFLOW SETUP                      ║
║   Completing all remaining configuration steps             ║
╚════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Pre-flight Checks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SSH found
✅ GitHub CLI found
✅ curl found

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Deploy Workflow Code to VPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SSH connection successful
✅ Workflow code deployed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: Configure Branch Protection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Main branch protection configured
✅ Dev branch protection configured

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SETUP COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 YOUR DEPLOYMENT WORKFLOW IS LIVE!
```

---

## 🎉 After Running

You'll have:
- ✅ **Automatic deployments** working
- ✅ **Branch protection** configured
- ✅ **Safety gates** active
- ✅ **Documentation** ready

**Test it**:
```bash
# Make a change on dev
git checkout dev
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: automated workflow"
git push origin dev

# Create PR
gh pr create --base main --head dev --title "Test: Workflow"

# Merge and watch automatic deployment!
gh pr merge
gh run watch
```

---

## 🆘 If Script Fails

### SSH Connection Failed

**Problem**: Can't connect to VPS

**Solution**:
```bash
# Set up SSH key
ssh-copy-id avi@31.97.222.218

# Test connection
ssh avi@31.97.222.218 echo "Works"

# Run script again
./deploy-workflow.sh
```

### GitHub CLI Not Authenticated

**Problem**: Can't configure branch protection

**Solution**:
```bash
# Authenticate GitHub CLI
gh auth login

# Follow prompts, then run script again
./deploy-workflow.sh
```

### Manual Fallback

If automation fails, follow manual steps in:
- **⚡_ACTION_PLAN.md** (3 simple steps)
- **SETUP_BRANCH_PROTECTION_NOW.md** (branch protection)

---

## 📊 Status Check

After running, check status:

```bash
# Check VPS deployment
ssh avi@31.97.222.218 'cd /home/avi/seo-automation/current && git log -1 --oneline'

# Check services
ssh avi@31.97.222.218 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml ps'

# Check health
curl http://31.97.222.218:9000/api/v2/health | jq

# Check GitHub Actions
gh run list --limit 3
```

---

## 🎯 Quick Commands

```bash
# Complete setup (everything)
./deploy-workflow.sh

# Manual deployment only
ssh avi@31.97.222.218 'cd /home/avi/seo-automation/current && git pull origin main && docker compose -f docker-compose.prod.yml restart'

# Branch protection only
./BRANCH_PROTECTION_QUICK_SETUP.sh

# Test Discord webhook
curl -X POST "$DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"✅ Test notification"}'
```

---

## 📚 Documentation

After setup, read:
1. **DEV_TO_PRODUCTION_WORKFLOW.md** - Daily workflow
2. **📖_COMPLETE_SUMMARY.md** - Full overview
3. **DEPLOYMENT_QUICK_START.md** - Quick reference

---

## 🚀 READY?

```bash
./deploy-workflow.sh
```

**Time**: 30 seconds
**Difficulty**: None (automated)
**Result**: Fully working deployment system

---

**That's literally all you need to do!** 🎉

The script handles everything automatically. Just run it and you're done.

If you prefer manual steps, see **⚡_ACTION_PLAN.md** instead.

---

**Status**: Ready to run
**Command**: `./deploy-workflow.sh`
**Time**: 30 seconds
**Let's go!** 🚀
