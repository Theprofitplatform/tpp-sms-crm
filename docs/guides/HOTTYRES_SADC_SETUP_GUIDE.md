# Hot Tyres & SADC Setup Guide
## WordPress Credentials Configuration

**Date:** October 29, 2025
**Status:** Credentials Required for Local Development

---

## Current Situation

Both **Hot Tyres** and **SADC Disability Services** are:
- ✅ Configured in `clients/clients-config.json`
- ✅ Working in GitHub Actions (verified Oct 24, 2025)
- ✅ Credentials stored as GitHub Secrets
- ⚠️ **NOT configured locally** (need WordPress application passwords)

---

## Client Information

### Hot Tyres
- **ID:** hottyres
- **Name:** Hot Tyres  
- **URL:** https://www.hottyres.com.au
- **WordPress Admin:** https://www.hottyres.com.au/wp-admin
- **Contact:** client@hottyres.com.au
- **User:** admin
- **Password:** ⚠️ Needs configuration (exists as GitHub Secret: `HOTTYRES_WP_PASSWORD`)

### SADC Disability Services
- **ID:** sadcdisabilityservices
- **Name:** SADC Disability Services
- **URL:** https://sadcdisabilityservices.com.au
- **WordPress Admin:** https://sadcdisabilityservices.com.au/wp-admin
- **Contact:** client@sadcdisabilityservices.com.au
- **User:** admin
- **Password:** ⚠️ Needs configuration (exists as GitHub Secret: `SADC_WP_PASSWORD`)

---

## Option 1: Use Existing GitHub Secrets (Recommended)

### Step 1: Retrieve Passwords from GitHub

The passwords are already configured as GitHub Secrets. To access them:

```bash
# If you have GitHub CLI installed:
gh secret list --repo YOUR_USERNAME/seo-expert

# To retrieve the actual values, you'll need to either:
# 1. Check your password manager where you stored them
# 2. Have admin access to GitHub repo settings
# 3. Generate new application passwords (Option 2)
```

### Step 2: Add to Local .env File

Once you have the passwords, add them to your local `.env`:

```bash
# Hot Tyres
HOTTYRES_WP_USER=admin
HOTTYRES_WP_PASSWORD=<paste-password-here>

# SADC Disability Services  
SADC_WP_USER=admin
SADC_WP_PASSWORD=<paste-password-here>
```

### Step 3: Create Individual Client .env Files

```bash
cd "/mnt/c/Users/abhis/projects/seo expert"

# Hot Tyres
cat > clients/hottyres.env << 'EOF'
WORDPRESS_URL=https://www.hottyres.com.au
WORDPRESS_USER=admin
WORDPRESS_APP_PASSWORD=<paste-password-here>
WORDPRESS_SITE_ID=hottyres
WORDPRESS_SITE_NAME=Hot Tyres
GSC_PROPERTY=https://www.hottyres.com.au/
EOF

# SADC
cat > clients/sadcdisabilityservices.env << 'EOF'
WORDPRESS_URL=https://sadcdisabilityservices.com.au
WORDPRESS_USER=admin
WORDPRESS_APP_PASSWORD=<paste-password-here>
WORDPRESS_SITE_ID=sadcdisabilityservices
WORDPRESS_SITE_NAME=SADC Disability Services
GSC_PROPERTY=https://sadcdisabilityservices.com.au/
EOF
```

---

## Option 2: Generate New Application Passwords

If you don't have access to the existing GitHub Secrets, generate new ones:

### For Hot Tyres

1. **Login to WordPress:**
   ```
   https://www.hottyres.com.au/wp-admin
   ```

2. **Navigate to Application Passwords:**
   - Click "Users" → "Profile"
   - Scroll to "Application Passwords" section

3. **Create New Password:**
   - Name: "SEO Automation Platform"
   - Click "Add New Application Password"
   - **Copy the generated password immediately** (shown only once)

4. **Update Local .env:**
   ```bash
   HOTTYRES_WP_PASSWORD=<paste-generated-password>
   ```

5. **Update GitHub Secret:**
   - Go to GitHub repository → Settings → Secrets
   - Edit `HOTTYRES_WP_PASSWORD`
   - Paste the new password

### For SADC

Repeat the same process:

1. **Login:**
   ```
   https://sadcdisabilityservices.com.au/wp-admin
   ```

2. **Generate application password**

3. **Update local .env:**
   ```bash
   SADC_WP_PASSWORD=<paste-generated-password>
   ```

4. **Update GitHub Secret: `SADC_WP_PASSWORD`**

---

## Verification Steps

After configuring credentials, verify the setup:

### 1. Restart Dashboard Server

```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
pkill -f dashboard-server.js
sleep 2
node dashboard-server.js &
```

### 2. Check Client Status

```bash
curl http://localhost:9000/api/dashboard | python3 -m json.tool
```

Look for:
```json
{
  "id": "hottyres",
  "envConfigured": true,  // Should be true
  "envExists": true       // Should be true
},
{
  "id": "sadcdisabilityservices", 
  "envConfigured": true,  // Should be true
  "envExists": true       // Should be true
}
```

### 3. Test WordPress Connection

Try fetching posts:

```bash
# Hot Tyres
curl -X POST http://localhost:9000/api/ai-optimizer/optimize \
  -H "Content-Type: application/json" \
  -d '{"clientId":"hottyres","contentType":"post"}'

# SADC
curl -X POST http://localhost:9000/api/ai-optimizer/optimize \
  -H "Content-Type: application/json" \
  -d '{"clientId":"sadcdisabilityservices","contentType":"post"}'
```

If successful, you'll see:
```json
{
  "success": true,
  "message": "Optimization started",
  "jobId": "opt_..."
}
```

---

## Running Initial Audits

Once credentials are configured, run initial audits:

### Hot Tyres Audit

```bash
# Using the run-automation script
cd "/mnt/c/Users/abhis/projects/seo expert"
node run-automation.js hottyres

# Or using API
curl -X POST http://localhost:9000/api/automation/audit/hottyres
```

### SADC Audit

```bash
# Using the run-automation script  
node run-automation.js sadc

# Or using API
curl -X POST http://localhost:9000/api/automation/audit/sadcdisabilityservices
```

---

## Expected Results

After successful setup, you should have:

### Hot Tyres
- ✅ WordPress connection working
- ✅ Can fetch posts and pages
- ✅ Initial audit completed
- ✅ Baseline report generated
- ✅ Stats visible in dashboard

### SADC
- ✅ WordPress connection working
- ✅ Can fetch posts and pages  
- ✅ Initial audit completed
- ✅ Baseline report generated
- ✅ Stats visible in dashboard

---

## Troubleshooting

### Issue: "Authentication failed"

**Cause:** Invalid WordPress credentials

**Solution:**
1. Verify you're using application password (not regular password)
2. Check for extra spaces when copying password
3. Ensure user has admin privileges
4. Regenerate application password if needed

### Issue: "envConfigured: false"

**Cause:** Credentials not in .env file or individual client .env missing

**Solution:**
1. Check `.env` has `HOTTYRES_WP_PASSWORD` and `SADC_WP_PASSWORD`
2. Check `clients/hottyres.env` exists
3. Check `clients/sadcdisabilityservices.env` exists
4. Restart dashboard server after adding credentials

### Issue: "Cannot connect to WordPress REST API"

**Cause:** REST API might be disabled or blocked

**Solution:**
1. Check if REST API is accessible:
   ```bash
   curl https://www.hottyres.com.au/wp-json/wp/v2/posts?per_page=1
   curl https://sadcdisabilityservices.com.au/wp-json/wp/v2/posts?per_page=1
   ```
2. If blocked, enable REST API in WordPress settings
3. Check for security plugins blocking API access

---

## Quick Setup Script

Here's a helper script to streamline the setup:

```bash
#!/bin/bash
# setup-hottyres-sadc.sh

echo "Hot Tyres & SADC Setup"
echo "====================="
echo

# Check if passwords are provided
if [ -z "$HOTTYRES_PASSWORD" ] || [ -z "$SADC_PASSWORD" ]; then
    echo "Error: Passwords not provided"
    echo
    echo "Usage:"
    echo "  export HOTTYRES_PASSWORD='your-password'"
    echo "  export SADC_PASSWORD='your-password'"
    echo "  ./setup-hottyres-sadc.sh"
    exit 1
fi

# Update main .env
echo "Updating .env file..."
cd "/mnt/c/Users/abhis/projects/seo expert"

# Add Hot Tyres password
sed -i "s/HOTTYRES_WP_PASSWORD=.*/HOTTYRES_WP_PASSWORD=$HOTTYRES_PASSWORD/" .env

# Add SADC password
sed -i "s/SADC_WP_PASSWORD=.*/SADC_WP_PASSWORD=$SADC_PASSWORD/" .env

# Create client .env files
echo "Creating client .env files..."

cat > clients/hottyres.env << EOF
WORDPRESS_URL=https://www.hottyres.com.au
WORDPRESS_USER=admin
WORDPRESS_APP_PASSWORD=$HOTTYRES_PASSWORD
WORDPRESS_SITE_ID=hottyres
WORDPRESS_SITE_NAME=Hot Tyres
GSC_PROPERTY=https://www.hottyres.com.au/
EOF

cat > clients/sadcdisabilityservices.env << EOF
WORDPRESS_URL=https://sadcdisabilityservices.com.au
WORDPRESS_USER=admin
WORDPRESS_APP_PASSWORD=$SADC_PASSWORD
WORDPRESS_SITE_ID=sadcdisabilityservices
WORDPRESS_SITE_NAME=SADC Disability Services
GSC_PROPERTY=https://sadcdisabilityservices.com.au/
EOF

echo "✅ Setup complete!"
echo
echo "Next steps:"
echo "1. Restart dashboard server: pkill -f dashboard-server.js && node dashboard-server.js &"
echo "2. Run audits: node run-automation.js hottyres"
echo "3. Run audits: node run-automation.js sadc"
```

---

## Files Created/Modified

After setup, these files should exist:

```
/mnt/c/Users/abhis/projects/seo expert/
├── .env (updated with HOTTYRES_WP_PASSWORD and SADC_WP_PASSWORD)
└── clients/
    ├── hottyres.env (new)
    └── sadcdisabilityservices.env (new)
```

---

## Next Steps After Setup

1. **Verify Connections**
   - Check dashboard shows envConfigured: true
   - Test fetching posts from each client

2. **Run Initial Audits**
   - Generate baseline SEO reports
   - Identify initial issues
   - Set optimization priorities

3. **Generate Reports**
   - Create comprehensive SEO reports
   - Share with clients
   - Establish benchmarks

4. **Set Goals**
   - Define SEO objectives for each client
   - Track progress over time
   - Monitor improvements

---

## Summary

**Current Status:**
- ⚠️ Credentials exist in GitHub Secrets but not configured locally
- ⚠️ Need to either retrieve existing passwords or generate new ones
- ⚠️ Once configured, clients will be fully operational

**To Complete Setup:**
1. Get WordPress application passwords (from GitHub Secrets or generate new)
2. Update local `.env` file
3. Create individual client `.env` files
4. Restart dashboard server
5. Run initial audits
6. Verify everything works

**Time Required:** 15-20 minutes per client

---

**Created:** October 29, 2025
**Status:** Configuration Guide
**Action Required:** Add WordPress application passwords to enable local development
