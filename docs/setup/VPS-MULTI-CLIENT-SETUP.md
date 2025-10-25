# VPS Multi-Client Setup Guide

## Quick Overview

You have **5 sites total** to manage:
1. instantautotraders.com.au (already configured)
2. theprofitplatform.com.au (your site)
3. Client Site 1
4. Client Site 2
5. Client Site 3

**Time:** 30-45 minutes to add all 4 remaining sites
**Result:** Manage all 5 sites with single commands

---

## Method 1: Interactive Wizard (RECOMMENDED)

### For Each Client:

```bash
# SSH to VPS
./vps-manage.sh ssh

# Run wizard
node setup-client.js
```

**The wizard will ask:**
1. Client ID (use lowercase, hyphens): `client1` or `acme-corp`
2. Business Name: `ACME Corporation`
3. WordPress URL: `https://example.com`
4. Admin Username: `admin` or your WP username
5. App Password: Get from WordPress (see below)
6. Contact Email: `client@example.com`

**It automatically:**
- Creates `/clients/[client-id].env`
- Updates `clients-config.json`
- Tests authentication
- Shows you if it worked!

---

## Method 2: Manual Setup (for advanced users)

### Step 1: Create Client .env File

```bash
# SSH to VPS
./vps-manage.sh ssh
cd ~/projects/seo-expert/clients

# Create file for each client
nano client1.env
```

**Template for each .env file:**

```env
# Client 1 Configuration
WORDPRESS_URL=https://client1website.com
WORDPRESS_USER=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_SITE_ID=client1
WORDPRESS_SITE_NAME=Client Business Name

# Optional: Discord notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Package tier (for billing)
PACKAGE_TIER=professional
```

**Save:** Ctrl+X, Y, Enter

### Step 2: Update Central Registry

```bash
# Edit registry
nano clients-config.json
```

**Add each client to the JSON:**

```json
{
  "instantautotraders": {
    "name": "Instant Auto Traders",
    "url": "https://instantautotraders.com.au",
    "contact": "your@email.com",
    "wordpress_user": "Claude",
    "package": "internal",
    "status": "active"
  },
  "theprofitplatform": {
    "name": "The Profit Platform",
    "url": "https://theprofitplatform.com.au",
    "contact": "your@email.com",
    "wordpress_user": "admin",
    "package": "internal",
    "status": "active"
  },
  "client1": {
    "name": "Client 1 Business Name",
    "url": "https://client1.com",
    "contact": "client1@email.com",
    "wordpress_user": "admin",
    "package": "professional",
    "status": "active"
  },
  "client2": {
    "name": "Client 2 Business Name",
    "url": "https://client2.com",
    "contact": "client2@email.com",
    "wordpress_user": "admin",
    "package": "starter",
    "status": "active"
  }
}
```

---

## Get WordPress App Passwords

**For EACH client site:**

1. Log into WordPress admin: `https://their-site.com/wp-admin`
2. Go to: **Users → Your Profile**
3. Scroll to: **Application Passwords** section
4. Name it: `SEO Automation System`
5. Click: **Add New Application Password**
6. **COPY IT IMMEDIATELY** (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
7. Paste into the .env file

**Important:**
- Spaces are OK in the password
- Don't use passwords with special chars: `#^()@`
- User must be Administrator or Editor role

---

## Test Each Client

### Test One Client:

```bash
# SSH to VPS (if not already)
./vps-manage.sh ssh

# Test specific client
node test-all-clients.js
```

**You'll see:**
```
Testing instantautotraders...
✅ Authentication successful
✅ Site accessible
✅ REST API working

Testing client1...
✅ Authentication successful
✅ Site accessible
✅ REST API working

Summary: 2/2 clients passed
```

---

## Batch Operations (Once All Clients Added)

### Test All Clients:
```bash
./vps-manage.sh test
# or on VPS: node test-all-clients.js
```

### Audit All Clients:
```bash
./vps-manage.sh audit-now
# or on VPS: node audit-all-clients.js
```

### View Status Dashboard:
```bash
# From local machine:
ssh tpp-vps "cd ~/projects/seo-expert && node client-status.js"
```

### Generate Reports for All:
```bash
./vps-manage.sh report-now
# or on VPS: node generate-full-report.js
```

---

## Automation Schedule (Runs Automatically)

Once configured, PM2 automatically runs:

| Time | What Runs | What It Does |
|------|-----------|--------------|
| **00:00 (Midnight)** | seo-audit-all | Audits ALL clients automatically |
| **01:00 (1 AM)** | generate-reports | Creates reports for ALL clients |
| **Every 6 hours** | client-status-check | Health check for ALL clients |

**You don't need to do anything!** Just configure once.

---

## Example: Adding 4 Clients

```bash
# SSH to VPS
./vps-manage.sh ssh
cd ~/projects/seo-expert

# Client 1
node setup-client.js
# Follow prompts...

# Client 2
node setup-client.js
# Follow prompts...

# Client 3
node setup-client.js
# Follow prompts...

# Client 4
node setup-client.js
# Follow prompts...

# Test all at once
node test-all-clients.js

# Run first batch audit
node audit-all-clients.js
```

**Total time:** 20-30 minutes for 4 clients

---

## Verify Everything Works

```bash
# View all configured clients
node client-status.js

# Should show:
# ✅ instantautotraders - Active
# ✅ theprofitplatform - Active
# ✅ client1 - Active
# ✅ client2 - Active
# ✅ client3 - Active
# ✅ client4 - Active
```

---

## Common Issues

### "Authentication failed"
**Fix:**
1. Verify WordPress user is Administrator or Editor
2. Regenerate app password
3. Update .env file with new password

### "Environment file not found"
**Fix:**
1. Check filename matches client ID: `clients/client1.env`
2. Verify file exists: `ls -la clients/`

### "Client not in registry"
**Fix:**
1. Add to `clients/clients-config.json`
2. Use exact same client ID in both places

---

## Quick Commands Reference

```bash
# From your local machine:
./vps-manage.sh status        # Check PM2 processes
./vps-manage.sh test           # Test all clients
./vps-manage.sh audit-now      # Audit all clients
./vps-manage.sh logs-audit     # View audit logs
./vps-manage.sh ssh            # SSH to VPS

# On VPS directly:
node client-status.js          # Status dashboard
node test-all-clients.js       # Test all auth
node audit-all-clients.js      # Audit all sites
node generate-full-report.js   # Reports for all
```

---

## Your Workflow

### One-Time Setup (30 min):
1. Add client 1 credentials
2. Test client 1
3. Add client 2 credentials
4. Test client 2
5. Repeat for remaining clients
6. Run batch test: `node test-all-clients.js`

### Weekly Management (5 min):
```bash
# Check status
./vps-manage.sh logs-audit

# That's it! Everything else is automated.
```

---

## What Runs Automatically

**Every Day:**
- ✅ SEO audit for ALL clients (midnight)
- ✅ Reports generated for ALL clients (1 AM)

**Every 6 Hours:**
- ✅ Health checks for ALL clients

**On Reboot:**
- ✅ PM2 auto-starts all processes

**You just:**
- ✅ Check logs once per week
- ✅ Review reports
- ✅ That's it!

---

## Next Steps

1. **Get client credentials ready** (WordPress app passwords)
2. **Run wizard for each client:** `node setup-client.js`
3. **Test batch operations:** `node test-all-clients.js`
4. **Set it and forget it** - automation handles the rest!

---

**Time Investment:** 30-45 minutes once
**Weekly Time:** 5 minutes
**Result:** Professional SEO management for unlimited clients

**Revenue Potential:** $10K-143K/year

Let's go! 🚀
