# ⚡ FASTEST DEPLOYMENT: cPanel File Upload

**Time Required:** 30 seconds
**No copy-paste needed!**

---

## 🚀 Quick Steps

### 1. Download Plugin File
The file is ready here:
```
src/deployment/schema-fixer.php
```

### 2. Login to cPanel
```
URL: https://your-domain.com:2083
Username: your_cpanel_username
Password: your_cpanel_password
```

**⚠️ Security:** Get credentials from your secure password manager or `.env` file (never commit credentials!)

### 3. Open File Manager
- Click **"File Manager"** in cPanel dashboard

### 4. Navigate to Plugin Directory
Navigate through folders:
```
public_html → wp-content → plugins → instant-auto-traders-schema-fixer
```

### 5. Upload & Replace
1. Click **"Upload"** (top toolbar)
2. Select file: `src/deployment/schema-fixer.php`
3. After upload, close upload window
4. Back in File Manager: **Delete old** `schema-fixer.php`
5. Upload automatically named the file correctly!

### 6. Clear Cache
- WordPress Admin → LiteSpeed Cache → Purge All

### 7. Verify
```bash
curl -s https://instantautotraders.com.au | grep "Fixed Schema"
```
Should show: `<!-- Instant Auto Traders - Fixed Schema v1.1.0 -->`

---

## ✅ Done!

**Total time:** 30 seconds
**Result:** 100% Schema.org validation

---

## 🔄 For Future Updates

This method works for ANY plugin updates:
1. Upload new file via cPanel
2. Replace old file
3. Clear cache
4. Done!

**Much easier than WordPress Plugin Editor!**
