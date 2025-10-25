# Cloudflare Pages + VPS Automation - Complete Setup Guide

## 🎯 Overview

Your SEO automation system now deploys to Cloudflare Pages automatically!

**Live Dashboard:** https://seo-reports-4d9.pages.dev

## 📊 Current Status

### ✅ Completed
- [x] Cloudflare Pages project created (`seo-reports`)
- [x] Dashboard deployed and live
- [x] VPS scripts synced (web-dist, deploy scripts)
- [x] PM2 automation configured
- [x] 4 client configurations ready
- [x] Local Wrangler authenticated

### ⚠️ Pending
- [ ] VPS Cloudflare authentication (required for automation)
- [ ] PM2 processes started
- [ ] Custom domain setup (optional)

## 🔐 Step 1: Set Up VPS Cloudflare Authentication

**Required for automated deployments!**

### Option A: Automatic Setup (Recommended)

```bash
ssh tpp-vps
cd ~/projects/seo-expert
./setup-cloudflare-auth.sh
```

Follow the interactive prompts to:
1. Create a Cloudflare API token
2. Test the token
3. Save it permanently

### Option B: Manual Setup

1. **Create API Token:**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use template: "Edit Cloudflare Workers"
   - Or create custom with permissions:
     - Account → Cloudflare Pages → Edit ✅
     - Zone → Zone → Read ✅
     - Zone → DNS → Edit ✅

2. **Add to VPS:**
   ```bash
   ssh tpp-vps
   export CLOUDFLARE_API_TOKEN="your-token-here"
   echo 'export CLOUDFLARE_API_TOKEN="your-token-here"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Verify:**
   ```bash
   wrangler whoami
   ```

## 🚀 Step 2: Start PM2 Automation

Once Cloudflare is authenticated:

```bash
ssh tpp-vps
cd ~/projects/seo-expert
pm2 restart all
pm2 save
```

This starts 3 automated processes:

| Process | Schedule | Action |
|---------|----------|--------|
| `seo-audit-all` | Daily at 00:00 | Run audits + deploy to Cloudflare |
| `client-status-check` | Every 6 hours | Check client health |
| `generate-reports` | Daily at 01:00 | Generate comprehensive reports |

## 🧪 Step 3: Test the Workflow

### Quick Test (Local)
```bash
./test-vps-workflow.sh
```

### Manual Test on VPS
```bash
ssh tpp-vps
cd ~/projects/seo-expert

# Test client authentication
node test-all-clients.js

# Run a test audit
node audit-all-clients.js

# Deploy to Cloudflare
./deploy-to-cloudflare.sh --production
```

## 📱 Monitoring & Management

### Using vps-manage.sh (from local)

```bash
# View all process status
./vps-manage.sh status

# View live logs
./vps-manage.sh logs

# View specific logs
./vps-manage.sh logs-audit
./vps-manage.sh logs-status
./vps-manage.sh logs-reports

# Run manual audit
./vps-manage.sh audit-now

# Restart automations
./vps-manage.sh restart
```

### Direct PM2 Commands (on VPS)

```bash
ssh tpp-vps

# View status
pm2 status

# View logs
pm2 logs seo-audit-all --lines 50
pm2 logs --lines 100

# Restart specific process
pm2 restart seo-audit-all

# Stop/Start all
pm2 stop all
pm2 start all
```

## 🌐 Step 4: Add Custom Domain (Optional)

Make your reports accessible at `seo.theprofitplatform.com.au`:

1. **Go to Cloudflare Dashboard:**
   - https://dash.cloudflare.com/8fc18f5691f32fccc13eb17e85a0ae10/pages/view/seo-reports

2. **Add Custom Domain:**
   - Click "Custom domains"
   - Enter: `seo.theprofitplatform.com.au`
   - Cloudflare automatically configures DNS
   - Wait 1-5 minutes for SSL provisioning

3. **Verify:**
   - Visit: https://seo.theprofitplatform.com.au

## 📊 Automation Flow

```
Midnight (00:00)
    ↓
SEO Audit Runs (audit-all-clients.js)
    ↓
4 Clients Audited:
  • instantautotraders.com.au
  • hottyres.com.au
  • sadcdisabilityservices.com.au
  • theprofitplatform.com.au
    ↓
Reports Generated (HTML)
    ↓
Prepare Web Distribution (prepare-web-dist.sh)
    ↓
Deploy to Cloudflare Pages
    ↓
Live at: https://seo-reports-4d9.pages.dev
    ↓
Discord Notifications Sent 📬
```

## 🔍 Troubleshooting

### "Project not found" Error
```bash
# Create the project on VPS
ssh tpp-vps
wrangler pages project create seo-reports --production-branch=main
```

### "Not authenticated" Error
```bash
# Set up authentication
ssh tpp-vps
cd ~/projects/seo-expert
./setup-cloudflare-auth.sh
```

### PM2 Process Stopped
```bash
ssh tpp-vps
pm2 restart seo-audit-all
pm2 save
```

### No Reports Appearing
```bash
# Check if audits ran
ssh tpp-vps
ls -la ~/projects/seo-expert/logs/clients/*/

# Check PM2 logs
pm2 logs seo-audit-all --lines 100
```

## 📝 File Structure

```
~/projects/seo-expert/
├── web-dist/                          # Cloudflare deployment directory
│   ├── index.html                     # Dashboard landing page
│   ├── _headers                       # Cloudflare headers config
│   └── _redirects                     # URL redirects
├── deploy-to-cloudflare.sh            # Deployment script
├── setup-cloudflare-auth.sh           # Auth setup helper
├── ecosystem.config.cjs               # PM2 automation config
├── clients/                           # Client configurations
│   ├── instantautotraders.env
│   ├── hottyres.env
│   ├── sadcdisabilityservices.env
│   └── theprofitplatform.env
└── logs/clients/                      # Generated reports
    ├── instantautotraders/
    ├── hottyres/
    ├── sadcdisabilityservices/
    └── theprofitplatform/
```

## 🎯 Success Checklist

- [ ] VPS Cloudflare authenticated (`wrangler whoami` works)
- [ ] PM2 processes running (`pm2 status` shows online)
- [ ] Clients configured (4 .env files exist)
- [ ] Test audit successful (`node audit-all-clients.js`)
- [ ] Test deployment works (`./deploy-to-cloudflare.sh --production`)
- [ ] Dashboard accessible (https://seo-reports-4d9.pages.dev)
- [ ] Discord notifications working
- [ ] Custom domain added (optional)

## 🚀 Quick Start Summary

```bash
# 1. Set up Cloudflare on VPS
ssh tpp-vps
cd ~/projects/seo-expert
./setup-cloudflare-auth.sh

# 2. Start automation
pm2 restart all
pm2 save

# 3. Monitor
exit  # back to local
./vps-manage.sh status
./vps-manage.sh logs

# 4. Done! Reports deploy automatically at midnight
```

## 📞 Support URLs

- **Dashboard:** https://dash.cloudflare.com/8fc18f5691f32fccc13eb17e85a0ae10/pages/view/seo-reports
- **API Tokens:** https://dash.cloudflare.com/profile/api-tokens
- **Live Site:** https://seo-reports-4d9.pages.dev
- **Wrangler Docs:** https://developers.cloudflare.com/pages/

---

**Last Updated:** October 21, 2025
**Status:** Deployment successful, awaiting VPS authentication
