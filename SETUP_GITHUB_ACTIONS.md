# GitHub Actions Automated Deployment Setup

**Time to complete:** 5 minutes

## Step 1: Add VPS_SSH_KEY to GitHub Secrets

1. **Copy your SSH private key:**
   ```bash
   cat ~/.ssh/tpp_vps
   ```
   Copy the ENTIRE output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

2. **Add to GitHub:**
   - Go to: https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions
   - Click "New repository secret"
   - Name: `VPS_SSH_KEY`
   - Value: Paste the entire private key
   - Click "Add secret"

## Step 2: Verify Setup

All other secrets are optional and have defaults:
- `VPS_HOST` → defaults to `31.97.222.218` ✅
- `VPS_USER` → defaults to `avi` ✅
- `DISCORD_WEBHOOK_URL` → optional (for notifications)

## Step 3: Test Deployment

Once you add the `VPS_SSH_KEY` secret:

```bash
# Make a small change to trigger deployment
echo "# GitHub Actions Deployment Ready" >> SETUP_GITHUB_ACTIONS.md

# Commit and push
git add .
git commit -m "feat: enable automated GitHub Actions deployment"
git push origin main
```

## What Happens Next?

GitHub Actions will automatically:

1. ✅ Run all 801 tests (takes ~1 minute)
2. 📦 Create optimized deployment archive (124.85KB)
3. 🚀 Upload to VPS via SSH
4. 💾 Create database backup
5. 🗄️  Run PostgreSQL migrations
6. 🐳 Build and start Docker containers
7. 🏥 Run health checks
8. 📢 Send notification (if Discord webhook configured)

**Total time:** 3-4 minutes

## Monitor Deployment

Watch it live:
https://github.com/Theprofitplatform/seoexpert/actions

## Troubleshooting

If deployment fails:
1. Check GitHub Actions logs for specific error
2. Verify SSH key was copied correctly (common issue)
3. Check VPS disk space: `ssh tpp-vps 'df -h'`
4. Review logs: `ssh tpp-vps 'cd /home/avi/seo-automation/current && docker compose -f docker-compose.prod.yml logs'`

## Rollback

If something goes wrong:
1. Go to: https://github.com/Theprofitplatform/seoexpert/actions
2. Select "Deploy to Production VPS" workflow
3. Click "Run workflow"
4. System will restore backup automatically

---

**Ready?** Add the VPS_SSH_KEY secret and push to main!
