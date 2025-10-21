# cPanel Deployment Guide - Schema Fixer v1.1.0

**Target:** 100% Schema.org Validation
**Current:** 95% (3 warnings)
**Time Required:** 5 minutes

---

## 🔑 cPanel Access Credentials

```
cPanel URL:  https://your-domain.com:2083
Username:    your_cpanel_username
Password:    your_cpanel_password
```

**⚠️ SECURITY NOTE:** Never commit real credentials to git. Store them in:
- Environment variables (`.env` file - git-ignored)
- Secure password manager
- CI/CD secrets (GitHub Secrets, etc.)

**Server Info:**
- Web Server: LiteSpeed
- WordPress Root: /home/instanta/public_html
- Cache Plugin: LiteSpeed Cache (active)

---

## ⚡ Deployment Steps

### STEP 1: Login to cPanel

1. Open in browser: `https://your-domain.com:2083`
2. Enter username: `your_cpanel_username`
3. Enter password: `your_cpanel_password`
4. Click "Log in"

### STEP 2: Navigate to Plugin Directory

1. In cPanel dashboard, find and click: **"File Manager"**
2. In File Manager, navigate to: `public_html/wp-content/plugins/instant-auto-traders-schema-fixer/`
3. You should see the file: `schema-fixer.php`

### STEP 3: Backup Current Plugin

1. Right-click on: `schema-fixer.php`
2. Select: **"Copy"**
3. In the dialog, change filename to: `schema-fixer-v1.0.0-backup.php`
4. Click **"Copy Files"**
5. ✅ Backup created! (You'll see it in the same directory)

### STEP 4: Upload New Version

1. In the plugin directory, click **"Upload"** button (top toolbar)
2. Click **"Select File"**
3. Navigate to your local project: `src/deployment/schema-fixer-v1.1.0.php`
4. Select and open the file
5. Wait for upload (15.2 KB - should take 2-3 seconds)
6. Close upload window

### STEP 5: Replace Old Plugin with New Version

1. Back in File Manager, you'll now see: `schema-fixer-v1.1.0.php` (newly uploaded)
2. Right-click the OLD file: `schema-fixer.php`
3. Select: **"Delete"**
4. Confirm deletion
5. Right-click the NEW file: `schema-fixer-v1.1.0.php`
6. Select: **"Rename"**
7. Change name to: `schema-fixer.php`
8. Click **"Rename File"**
9. ✅ Plugin replaced!

### STEP 6: Verify File Permissions

1. Right-click `schema-fixer.php`
2. Select: **"Change Permissions"**
3. Ensure checkboxes match:
   - User: ☑ Read, ☑ Write, ☐ Execute
   - Group: ☑ Read, ☐ Write, ☐ Execute
   - World: ☑ Read, ☐ Write, ☐ Execute
4. This should show: **644**
5. Click **"Change Permissions"**

### STEP 7: Clear LiteSpeed Cache

**Option A - Via WordPress (Recommended):**
1. Open new tab: `https://instantautotraders.com.au/wp-admin`
2. Login with WordPress credentials
3. In top admin bar, click: **LiteSpeed Cache → Purge All**
4. Wait for confirmation message

**Option B - Via cPanel:**
1. In cPanel search bar, type: "LiteSpeed"
2. Click: **"LiteSpeed Web Cache Manager"**
3. Find and click: **"Flush All"** button

### STEP 8: Verify Deployment

1. Open homepage: `https://instantautotraders.com.au`
2. Right-click anywhere on page
3. Select: **"View Page Source"** (or press Ctrl+U / Cmd+U)
4. Press Ctrl+F (or Cmd+F) to open search
5. Search for: `Fixed Schema v1.1.0`
6. Look for this line in the HTML:
   ```html
   <!-- Instant Auto Traders - Fixed Schema v1.1.0 -->
   ```

**Results:**
- ✅ **Found v1.1.0:** Deployment successful! Proceed to verification.
- ❌ **Not found or shows v1.0.0:** Clear cache again and wait 2-3 minutes.

---

## 🔍 Post-Deployment Verification

### Automated Command-Line Verification

Run these commands from your terminal:

```bash
# 1. Check plugin version
curl -s https://instantautotraders.com.au | grep "Fixed Schema"
# Expected: <!-- Instant Auto Traders - Fixed Schema v1.1.0 -->

# 2. Count Product schemas on homepage (should be 0)
curl -s https://instantautotraders.com.au | grep -c '"@type":"Product"'
# Expected: 0

# 3. Verify AutomotiveBusiness schema present
curl -s https://instantautotraders.com.au | grep '"@type":"AutomotiveBusiness"'
# Expected: Found (should show the schema)
```

### Google Rich Results Test

1. Visit: https://search.google.com/test/rich-results
2. Enter URL: `https://instantautotraders.com.au`
3. Click **"Test URL"**
4. Wait 30-60 seconds for results

**Expected Results:**
- ✅ Valid schemas detected
- ✅ **0 warnings** (no missing price errors)
- ✅ AutomotiveBusiness schema validated
- ✅ **100% Schema.org validation achieved!**

---

## 📊 What Changed

### Before v1.1.0:
- ❌ 3 schema warnings (missing prices in Product schemas)
- ❌ Product schema used on homepage (incorrect for service business)
- ❌ 95% Schema.org validation

### After v1.1.0:
- ✅ 0 schema warnings
- ✅ AutomotiveBusiness schema on homepage (correct for car buying service)
- ✅ Product schemas removed from homepage (they're for e-commerce)
- ✅ **100% Schema.org validation**

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong:

1. Login to cPanel File Manager
2. Navigate to: `public_html/wp-content/plugins/instant-auto-traders-schema-fixer/`
3. Right-click: `schema-fixer.php`
4. Select: **"Delete"**
5. Right-click: `schema-fixer-v1.0.0-backup.php`
6. Select: **"Rename"**
7. Change to: `schema-fixer.php`
8. Clear LiteSpeed Cache
9. You're back to v1.0.0 (95% validation)

---

## 🆘 Troubleshooting

### Problem: Can't see plugin directory
**Solution:**
- Verify you're in the correct path: `public_html/wp-content/plugins/`
- Check if plugin folder exists: `instant-auto-traders-schema-fixer`
- If not found, plugin may not be installed - check WordPress admin

### Problem: Upload fails
**Solution:**
- Check file size (should be 15.2 KB - within limits)
- Try uploading from cPanel File Manager's upload interface
- Ensure you have write permissions (you're logged in as site owner)

### Problem: Changes not showing after deployment
**Solution:**
1. Clear LiteSpeed Cache again (WordPress admin or cPanel)
2. Hard refresh browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)
3. Try incognito/private browsing mode
4. Check Cloudflare cache if using Cloudflare
5. Wait 3-5 minutes for cache to fully clear

### Problem: Plugin shows as inactive
**Solution:**
1. Login to WordPress: https://instantautotraders.com.au/wp-admin
2. Go to: **Plugins → Installed Plugins**
3. Find: **"Instant Auto Traders - Schema Error Fixer"**
4. If inactive, click **"Activate"**
5. Clear cache and test again

---

## 🎯 Success Checklist

After deployment, verify:

- [ ] Logged into cPanel successfully
- [ ] Backed up old plugin (schema-fixer-v1.0.0-backup.php exists)
- [ ] Uploaded new version (schema-fixer-v1.1.0.php)
- [ ] Replaced old file (schema-fixer.php is v1.1.0)
- [ ] File permissions set to 644
- [ ] LiteSpeed Cache cleared
- [ ] Version v1.1.0 visible in page source
- [ ] Product schemas = 0 on homepage
- [ ] AutomotiveBusiness schema present
- [ ] Google Rich Results Test shows 0 warnings
- [ ] **100% Schema.org validation achieved!**

---

## 📁 File Paths Reference

```
Local source file:
src/deployment/schema-fixer-v1.1.0.php (15.2 KB)

Server paths:
Plugin directory:  /home/instanta/public_html/wp-content/plugins/instant-auto-traders-schema-fixer/
Target file:       /home/instanta/public_html/wp-content/plugins/instant-auto-traders-schema-fixer/schema-fixer.php
Backup file:       /home/instanta/public_html/wp-content/plugins/instant-auto-traders-schema-fixer/schema-fixer-v1.0.0-backup.php
```

---

## 🎓 Technical Details

### What v1.1.0 Does:

1. **Filters Homepage Schemas:** Runs at priority 999 (after other plugins)
2. **Removes Product Schemas:** Only on homepage (is_front_page() check)
3. **Keeps Other Schemas:** AutomotiveBusiness, LocalBusiness, etc. remain
4. **No Price Required:** AutomotiveBusiness doesn't need product prices
5. **Result:** 100% validation, no warnings

### Why This Works:

- **Problem:** Product schemas require price fields
- **Issue:** Instant Auto Traders is a service (not selling products)
- **Solution:** Use AutomotiveBusiness schema (designed for car services)
- **Benefit:** No price fields needed, 100% validation achieved

---

**Deployment Status:** Ready to deploy
**Risk Level:** Low (easy rollback with backup)
**Expected Time:** 5 minutes
**Expected Result:** 100% Schema.org validation 🎯

---

**Last Updated:** October 18, 2025
**Version:** 1.1.0
**Author:** Claude Code
