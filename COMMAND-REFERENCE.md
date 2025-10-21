# 📋 COMMAND REFERENCE - Quick Cheat Sheet

**Your complete command reference for daily operations**

---

## 🚀 MOST USED COMMANDS (Weekly Workflow)

### Monday Morning - Optimize All Clients (15 min)
```bash
# Optimize all active clients in one command
node client-manager.js optimize-all
```

### Check Client Status Before Operations
```bash
# See overview of all clients
node client-status.js
```

### Test Authentication (Before First Run)
```bash
# Test all client credentials
node test-all-clients.js
```

---

## 📊 MULTI-CLIENT OPERATIONS

### View Clients
```bash
# List all clients with details
node client-manager.js list

# Quick status dashboard with configuration check
node client-status.js
```

### Batch Operations
```bash
# Optimize ALL active clients (weekly job)
node client-manager.js optimize-all

# Audit ALL active clients
node audit-all-clients.js

# Test authentication for ALL clients
node test-all-clients.js
```

### Single Client Operations
```bash
# Optimize specific client
node client-manager.js optimize [client-id]

# Audit specific client
node client-manager.js audit [client-id]

# Examples:
node client-manager.js optimize instantautotraders
node client-manager.js audit theprofitplatform
```

---

## 🔧 TESTING & SETUP

### Authentication Testing
```bash
# Test current .env credentials
node test-auth.js

# Test all clients credentials
node test-all-clients.js

# Test specific client (manual swap)
cp clients/[client-id].env config/env/.env
node test-auth.js
cp config/env/.env.backup config/env/.env
```

### Quick Demo/Test
```bash
# Quick 5-post audit (demo mode)
node quick-audit.js

# Full optimization on current site
node auto-fix-all.js

# Generate HTML report for current site
node generate-full-report.js
```

---

## 📂 FILE MANAGEMENT

### View Reports
```bash
# List all client reports
ls -la logs/clients/

# List specific client reports
ls -la logs/clients/[client-id]/

# Open latest report in browser
explorer.exe logs/clients/[client-id]/seo-audit-report-*.html
```

### Client Configuration
```bash
# View client registry
cat clients/clients-config.json

# Edit client registry
nano clients/clients-config.json

# View/edit client credentials
cat clients/[client-id].env
nano clients/[client-id].env

# Create new client env file from template
cp clients/example-client.env clients/[client-id].env
```

### View Documentation
```bash
# Navigation hub
cat START-HERE.md

# Master guide
cat YOUR-COMPLETE-SYSTEM-GUIDE.md

# Quick reference
cat MULTI-CLIENT-SUMMARY.md

# Command reference (this file)
cat COMMAND-REFERENCE.md
```

---

## ➕ ADDING NEW CLIENTS

### Step 1: Add to Registry
```bash
nano clients/clients-config.json
```

Add entry:
```json
"client-id": {
  "name": "Client Business Name",
  "url": "https://clientwebsite.com",
  "contact": "client@email.com",
  "wordpress_user": "admin",
  "package": "professional",
  "status": "pending-setup",
  "started": "2025-10-21",
  "notes": "Any notes"
}
```

### Step 2: Create Credentials File
```bash
cp clients/example-client.env clients/client-id.env
nano clients/client-id.env
```

Fill in:
- WORDPRESS_URL
- WORDPRESS_USER
- WORDPRESS_APP_PASSWORD

### Step 3: Test Authentication
```bash
# Swap env temporarily
cp clients/client-id.env config/env/.env

# Test
node test-auth.js

# Restore
cp config/env/.env.backup config/env/.env
```

### Step 4: Run First Operations
```bash
# Baseline audit
node client-manager.js audit client-id

# First optimization
node client-manager.js optimize client-id
```

### Step 5: Activate Client
```bash
nano clients/clients-config.json
```

Change status to "active":
```json
"status": "active"
```

---

## 📅 WEEKLY WORKFLOW COMMANDS

### Monday 9:00 AM - Batch Optimization
```bash
# Check status first
node client-status.js

# Run optimizations for all active clients
node client-manager.js optimize-all
```

### Monday 2:00 PM - Review Reports
```bash
# List all recent reports
ls -la logs/clients/*/

# Open specific client report
explorer.exe logs/clients/instantautotraders/seo-audit-report-*.html
explorer.exe logs/clients/theprofitplatform/seo-audit-report-*.html
explorer.exe logs/clients/client-1/seo-audit-report-*.html
```

### Thursday - Check-in
```bash
# Quick status check
node client-status.js

# Re-audit if needed
node audit-all-clients.js
```

---

## 🔍 TROUBLESHOOTING COMMANDS

### Authentication Issues
```bash
# Test all clients
node test-all-clients.js

# Test specific client
cp clients/[client-id].env config/env/.env
node test-auth.js
```

### Check Configuration
```bash
# View client status and configuration issues
node client-status.js

# Check if env file exists
ls -la clients/[client-id].env

# View env file contents
cat clients/[client-id].env
```

### View Logs
```bash
# View latest logs
ls -la logs/

# View specific client logs
ls -la logs/clients/[client-id]/

# View error logs if any
cat logs/error-*.log
```

### WordPress Site Issues
```bash
# Verify site is online
curl -I https://clientwebsite.com

# Check REST API endpoint
curl https://clientwebsite.com/wp-json/wp/v2/posts?per_page=1
```

---

## 📊 REPORTING COMMANDS

### Generate Reports
```bash
# Audit all clients (generates reports)
node audit-all-clients.js

# Audit specific client
node client-manager.js audit [client-id]

# Generate HTML report for current site
node generate-full-report.js
```

### View Reports
```bash
# List all reports
find logs/clients -name "*.html"

# Open all client reports
for dir in logs/clients/*/; do
  explorer.exe "$dir"
done

# Open specific client reports
explorer.exe logs/clients/instantautotraders/
explorer.exe logs/clients/theprofitplatform/
```

---

## 🛠️ UTILITY COMMANDS

### Backup & Restore
```bash
# Backup current env
cp config/env/.env config/env/.env.backup

# Restore env
cp config/env/.env.backup config/env/.env

# Backup client registry
cp clients/clients-config.json clients/clients-config.json.backup
```

### Git Operations
```bash
# Check status
git status

# Commit changes
git add .
git commit -m "Update client configurations"

# View recent commits
git log --oneline -10

# View changes
git diff
```

### Cleanup
```bash
# Remove old reports (older than 30 days)
find logs/clients -name "*.html" -mtime +30 -delete

# Remove old logs
find logs -name "*.log" -mtime +30 -delete
```

---

## 💼 CLIENT MANAGEMENT TASKS

### Update Client Status
```bash
nano clients/clients-config.json
```

Status options:
- `"active"` - Client is active, will be included in batch operations
- `"pending-setup"` - Client added but credentials not configured
- `"inactive"` - Client paused or cancelled
- `"paused"` - Temporarily paused

### Update Client Package
```bash
nano clients/clients-config.json
```

Package options:
- `"starter"` - $297/month
- `"professional"` - $597/month
- `"enterprise"` - $1,497/month
- `"internal"` - Your own sites

### Add Client Notes
```bash
nano clients/clients-config.json
```

Add notes field:
```json
"notes": "Important information about this client"
```

---

## 🚀 AUTOMATION SETUP

### Weekly Automation (Windows Task Scheduler)

Create batch file: `run-weekly-optimization.bat`
```batch
cd C:\Users\abhis\projects\seo expert
wsl node client-manager.js optimize-all
```

Schedule in Task Scheduler:
- Trigger: Weekly, Monday, 9:00 AM
- Action: Run batch file
- Settings: Wake computer to run

### Alternative: Manual Weekly Run
```bash
# Monday morning routine
cd "/mnt/c/Users/abhis/projects/seo expert"
node client-status.js
node client-manager.js optimize-all
ls -la logs/clients/*/
```

---

## 📋 QUICK REFERENCE BY TASK

### "I want to see all my clients"
```bash
node client-status.js
# or
node client-manager.js list
```

### "I want to optimize all clients"
```bash
node client-manager.js optimize-all
```

### "I want to add a new client"
```bash
# 1. Add to registry
nano clients/clients-config.json

# 2. Create env file
cp clients/example-client.env clients/new-client.env
nano clients/new-client.env

# 3. Test
node test-all-clients.js

# 4. Audit
node client-manager.js audit new-client
```

### "I want to test if credentials work"
```bash
node test-all-clients.js
```

### "I want to see reports"
```bash
ls -la logs/clients/*/
explorer.exe logs/clients/[client-id]/
```

### "Something broke, how do I troubleshoot?"
```bash
# Check status
node client-status.js

# Test auth
node test-all-clients.js

# View recent errors
cat logs/error-*.log
```

---

## 💡 PRO TIPS

### Efficiency
- Run `node client-status.js` before any batch operation
- Use `test-all-clients.js` before first optimization
- Keep a terminal window open in project directory
- Create shell aliases for common commands

### Shell Aliases (Optional)
Add to `.bashrc` or `.bash_profile`:
```bash
alias seo-cd='cd "/mnt/c/Users/abhis/projects/seo expert"'
alias seo-status='node client-status.js'
alias seo-optimize='node client-manager.js optimize-all'
alias seo-test='node test-all-clients.js'
alias seo-audit='node audit-all-clients.js'
```

### Safety
- Always run `test-all-clients.js` after adding credentials
- Review `client-status.js` before batch operations
- Keep `.env.backup` file updated
- Commit client-config.json changes to git

### Monitoring
- Check `client-status.js` weekly
- Review reports after each optimization
- Track client score improvements
- Document issues in client notes

---

## 📞 HELP RESOURCES

### Quick Help
```bash
# View available commands
node client-manager.js --help

# View documentation
cat START-HERE.md
```

### Detailed Guides
- `START-HERE.md` - Navigation hub
- `YOUR-COMPLETE-SYSTEM-GUIDE.md` - Complete reference
- `ADD-SECOND-SITE-WALKTHROUGH.md` - Step-by-step tutorial
- `MIGRATE-EXISTING-CLIENTS.md` - Migration guide
- `MULTI-CLIENT-SUMMARY.md` - Quick reference
- `COMMAND-REFERENCE.md` - This file

### Troubleshooting
- Check `client-status.js` for configuration issues
- Run `test-all-clients.js` for auth problems
- Review logs in `logs/` directory
- Verify WordPress sites are accessible
- Regenerate app passwords if needed

---

## 🎯 COMMON COMMAND SEQUENCES

### Weekly Routine (Monday Morning)
```bash
node client-status.js
node client-manager.js optimize-all
ls -la logs/clients/*/
# Email reports to clients
```

### Add New Client (Complete Setup)
```bash
# 1. Add to registry
nano clients/clients-config.json

# 2. Create env file
cp clients/example-client.env clients/new-client.env
nano clients/new-client.env

# 3. Test auth
cp clients/new-client.env config/env/.env
node test-auth.js
cp config/env/.env.backup config/env/.env

# 4. Run baseline audit
node client-manager.js audit new-client

# 5. Run first optimization
node client-manager.js optimize new-client

# 6. Activate in registry
nano clients/clients-config.json
# Change status to "active"

# 7. Verify
node client-status.js
```

### Monthly Review (First Monday)
```bash
# Re-audit all clients
node audit-all-clients.js

# View all reports
for dir in logs/clients/*/; do
  echo "Opening $dir"
  explorer.exe "$dir"
done

# Generate summary for clients
# Email monthly reports
```

### Troubleshoot Failed Client
```bash
# Check status
node client-status.js

# Test that specific client
cp clients/failed-client.env config/env/.env
node test-auth.js

# Check logs
cat logs/clients/failed-client/*.log

# Verify credentials
cat clients/failed-client.env

# Restore env
cp config/env/.env.backup config/env/.env
```

---

**🎯 Bookmark this file for quick access to any command!**

**Most used:** `client-status.js` | `optimize-all` | `test-all-clients.js`
