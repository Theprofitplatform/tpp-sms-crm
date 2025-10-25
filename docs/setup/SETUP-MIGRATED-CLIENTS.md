# Setup Instructions for Migrated Clients

## 🎯 Migration Complete!

Your 4 clients from SEOAnalyst have been migrated to SEO-Expert.

## 📋 Clients Migrated


### Hot Tyres
- **Client ID:** hottyres
- **Website:** https://www.hottyres.com.au
- **Template:** `clients/hottyres.env.template`
- **Status:** ⚠️ Pending WordPress credentials


### The Profit Platform
- **Client ID:** theprofitplatform
- **Website:** https://theprofitplatform.com.au
- **Template:** `clients/theprofitplatform.env.template`
- **Status:** ⚠️ Pending WordPress credentials


### Instant Auto Traders
- **Client ID:** instantautotraders
- **Website:** https://instantautotraders.com.au
- **Template:** `clients/instantautotraders.env.template`
- **Status:** ⚠️ Pending WordPress credentials


### SADC Disability Services
- **Client ID:** sadcdisabilityservices
- **Website:** https://sadcdisabilityservices.com.au
- **Template:** `clients/sadcdisabilityservices.env.template`
- **Status:** ⚠️ Pending WordPress credentials


## 🚀 Next Steps

### For Each Client:

1. **Rename template file:**
   ```bash
   cd ~/projects/seo-expert/clients
   mv [clientid].env.template [clientid].env
   ```

2. **Get WordPress Application Password:**
   - Log into WordPress admin
   - Go to Users → Your Profile
   - Scroll to Application Passwords
   - Create: SEO Automation System
   - Copy the password

3. **Edit the .env file:**
   ```bash
   nano clients/[clientid].env
   ```
   
   Update these lines:
   - `WORDPRESS_USER=admin` (use your actual username)
   - `WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx` (paste the password)

4. **Test authentication:**
   ```bash
   node test-all-clients.js
   ```

5. **Run first audit:**
   ```bash
   node audit-all-clients.js
   ```

## ⚡ Quick Setup Commands

```bash
# Setup client 1
cd ~/projects/seo-expert/clients
mv hottyres.env.template hottyres.env
nano hottyres.env
# Add WordPress credentials, save

# Setup client 2
mv theprofitplatform.env.template theprofitplatform.env
nano theprofitplatform.env
# Add WordPress credentials, save

# Setup client 3
mv instantautotraders.env.template instantautotraders.env
nano instantautotraders.env
# Add WordPress credentials, save

# Setup client 4
mv sadcdisabilityservices.env.template sadcdisabilityservices.env
nano sadcdisabilityservices.env
# Add WordPress credentials, save

# Test all
cd ~/projects/seo-expert
node test-all-clients.js

# Run first batch audit
node audit-all-clients.js
```

## 📊 After Setup

Once all clients are configured:

- ✅ Daily SEO audits (midnight)
- ✅ Health checks (every 6 hours)
- ✅ Reports (1 AM daily)
- ✅ All automated via PM2

View status:
```bash
pm2 status
```

View logs:
```bash
pm2 logs seo-audit-all
```

## 🎯 Integration Complete

You now have:
- ✅ SEOAnalyst: Analytics & reporting
- ✅ SEO-Expert: WordPress optimization
- ✅ Same 4 clients in both systems
- ✅ Unified SEO management

Total setup time: ~30 minutes
Weekly management: ~5 minutes
Revenue potential: 5K-36K/year
