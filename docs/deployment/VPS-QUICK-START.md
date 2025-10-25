# VPS Quick Start Guide

## 🚀 Your Automations Are Live!

Your SEO Expert automation is running on **tpp-vps** at `~/projects/seo-expert/`

### ⚡ Quick Commands (From Your Local Machine)

Use the `vps-manage.sh` script to control everything:

```bash
# View status
./vps-manage.sh status

# View live logs
./vps-manage.sh logs

# View specific logs
./vps-manage.sh logs-audit
./vps-manage.sh logs-status
./vps-manage.sh logs-reports

# Restart automations
./vps-manage.sh restart

# Run operations immediately
./vps-manage.sh audit-now
./vps-manage.sh report-now
./vps-manage.sh test

# SSH into VPS
./vps-manage.sh ssh

# Edit client config on VPS
./vps-manage.sh edit-config

# Sync local changes to VPS
./vps-manage.sh sync
```

### 📋 Initial Setup (Do This Once)

**On VPS (via SSH):**
```bash
ssh tpp-vps
cd ~/projects/seo-expert
./vps-setup-guide.sh
nano clients/instantautotraders.env
```

**Add These Credentials:**
```env
WP_URL=https://instantautotraders.com.au
WP_USERNAME=your_admin_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
DISCORD_WEBHOOK_URL=your_discord_webhook_here
```

**Test Authentication:**
```bash
node test-all-clients.js
```

### 📊 Automation Schedules

| Automation | Schedule | What It Does |
|------------|----------|--------------|
| **seo-audit-all** | Daily at 00:00 | Full SEO audits for all clients |
| **client-status-check** | Every 6 hours | Checks WordPress connections |
| **generate-reports** | Daily at 01:00 | Creates comprehensive reports |

### 🔧 Common Tasks

**Check if automations are running:**
```bash
./vps-manage.sh status
```

**View recent audit results:**
```bash
./vps-manage.sh logs-audit
```

**Run an audit immediately (don't wait for schedule):**
```bash
./vps-manage.sh audit-now
```

**Download logs to local machine:**
```bash
./vps-manage.sh download-logs
```

**Made changes locally? Sync to VPS:**
```bash
./vps-manage.sh sync
./vps-manage.sh restart
```

### 🛠️ Troubleshooting

**Automations showing as "stopped"?**
- This is normal! They run on cron schedules and only activate when scheduled.
- Test manually: `./vps-manage.sh audit-now`

**"Environment file not found" error?**
- Create client config: `./vps-manage.sh edit-config`
- Add WordPress credentials
- Test: `./vps-manage.sh test`

**Authentication failures?**
- Generate new WordPress Application Password
- Update config: `./vps-manage.sh edit-config`
- Test again: `./vps-manage.sh test`

### 📁 VPS File Structure

```
~/projects/seo-expert/
├── ecosystem.config.cjs       # PM2 automation config
├── vps-setup-guide.sh         # Initial setup script
├── clients/
│   └── instantautotraders.env # Client credentials (CONFIGURE THIS!)
├── audit-all-clients.js       # Audit automation
├── client-status.js           # Status check automation
├── generate-full-report.js    # Report generation
└── logs/                      # Generated logs
```

### 🎯 What Happens Automatically

**Every Day at Midnight (00:00):**
- Full SEO audit runs for all configured clients
- Checks: titles, meta descriptions, H1 tags, images, schema, performance
- Results logged to: `~/.pm2/logs/seo-audit-all-out.log`

**Every 6 Hours (0:00, 6:00, 12:00, 18:00):**
- Client status check runs
- Verifies WordPress connections
- Checks site health
- Results logged to: `~/.pm2/logs/client-status-check-out.log`

**Every Day at 1:00 AM:**
- Comprehensive reports generated
- Includes all audit data and trends
- Results logged to: `~/.pm2/logs/generate-reports-out.log`

### 📱 Optional: Discord Notifications

Add Discord webhook to get notifications:

1. **Create Webhook:**
   - Open Discord server settings
   - Go to Integrations → Webhooks
   - Create webhook, copy URL

2. **Add to Config:**
   ```bash
   ./vps-manage.sh edit-config
   ```
   Add: `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...`

3. **Test:**
   ```bash
   ./vps-manage.sh audit-now
   ```

### 🔄 Auto-Restart on Reboot

Your automations are configured to automatically start when the VPS reboots:
- Systemd service: `pm2-avi`
- Check status: `systemctl status pm2-avi`

### 📞 Getting Help

**View all available commands:**
```bash
./vps-manage.sh help
```

**View PM2 commands directly on VPS:**
```bash
ssh tpp-vps
pm2 status
pm2 logs
pm2 restart all
```

---

## ✅ You're All Set!

Your SEO automations are running 24/7 on your VPS. Just configure the client credentials once, and everything else is automatic!

**Next Step:** `./vps-manage.sh edit-config` to add WordPress credentials
