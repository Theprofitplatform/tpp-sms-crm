# 🌐 Coolify Domain Configuration - Step-by-Step Guide

**Time Required**: 15 minutes
**Difficulty**: Easy
**What You'll Configure**: 3 domains with SSL certificates

---

## 📋 Prerequisites

✅ All services running (Plausible, Ghost, SerpBear)
✅ Access to Coolify: https://coolify.theprofitplatform.com.au
✅ DNS records pointing to: 31.97.222.218

---

## 🎯 Quick Overview

You'll add 3 domains to Coolify:
1. **analytics.theprofitplatform.com.au** (Plausible)
2. **blog.theprofitplatform.com.au** (Ghost)
3. **ranks.theprofitplatform.com.au** (SerpBear)

---

## 🚀 Step-by-Step Instructions

### STEP 1: Open Coolify Dashboard

1. Open browser and go to: https://coolify.theprofitplatform.com.au
2. Login with your Coolify credentials
3. Navigate to your server dashboard

---

### STEP 2: Configure Plausible Analytics Domain

**Domain**: analytics.theprofitplatform.com.au
**Target**: localhost:8100

#### Click-by-Click Instructions:

1. **In Coolify Dashboard**:
   - Click on "Proxy" or "Domains" section (left sidebar)
   - Click "Add Domain" or "New Proxy Configuration"

2. **Fill in the form**:
   ```
   Domain Name:    analytics.theprofitplatform.com.au
   Scheme:         HTTP
   Target Host:    localhost
   Target Port:    8100
   ```

3. **SSL Configuration**:
   - ✅ Enable SSL/TLS
   - ✅ Use Let's Encrypt
   - ✅ Force HTTPS redirect
   - Auto-renew: ✅ Enabled

4. **Additional Settings** (if available):
   - HTTP/2: ✅ Enabled
   - HSTS: ✅ Enabled
   - Websockets: ❌ Not needed

5. **Click "Save" or "Create"**

6. **Wait 1-2 minutes**:
   - Coolify will request SSL certificate from Let's Encrypt
   - Certificate will be automatically installed
   - Green check mark will appear when ready

7. **Verify**:
   - Open: https://analytics.theprofitplatform.com.au
   - Should see Plausible registration page
   - SSL padlock should be green in browser

---

### STEP 3: Configure Ghost CMS Domain

**Domain**: blog.theprofitplatform.com.au
**Target**: localhost:2368

#### Click-by-Click Instructions:

1. **In Coolify Dashboard**:
   - Click "Add Domain" again (same section)

2. **Fill in the form**:
   ```
   Domain Name:    blog.theprofitplatform.com.au
   Scheme:         HTTP
   Target Host:    localhost
   Target Port:    2368
   ```

3. **SSL Configuration**:
   - ✅ Enable SSL/TLS
   - ✅ Use Let's Encrypt
   - ✅ Force HTTPS redirect
   - Auto-renew: ✅ Enabled

4. **Click "Save" or "Create"**

5. **Wait 1-2 minutes**:
   - SSL certificate will be generated
   - Wait for green check mark

6. **Verify**:
   - Open: https://blog.theprofitplatform.com.au
   - Should redirect to Ghost welcome page
   - SSL should be active

---

### STEP 4: Configure SerpBear Domain

**Domain**: ranks.theprofitplatform.com.au
**Target**: localhost:3001

#### Click-by-Click Instructions:

1. **In Coolify Dashboard**:
   - Click "Add Domain" again

2. **Fill in the form**:
   ```
   Domain Name:    ranks.theprofitplatform.com.au
   Scheme:         HTTP
   Target Host:    localhost
   Target Port:    3001
   ```

3. **SSL Configuration**:
   - ✅ Enable SSL/TLS
   - ✅ Use Let's Encrypt
   - ✅ Force HTTPS redirect
   - Auto-renew: ✅ Enabled

4. **Click "Save" or "Create"**

5. **Wait 1-2 minutes**:
   - SSL certificate will be generated

6. **Verify**:
   - Open: https://ranks.theprofitplatform.com.au
   - Should see SerpBear login page
   - SSL should be active

---

## ✅ Verification Checklist

After configuring all domains, verify each one:

### Plausible Analytics
- [ ] https://analytics.theprofitplatform.com.au opens
- [ ] SSL certificate is valid (green padlock)
- [ ] Redirects from HTTP to HTTPS
- [ ] Shows Plausible registration/login page

### Ghost CMS
- [ ] https://blog.theprofitplatform.com.au opens
- [ ] SSL certificate is valid (green padlock)
- [ ] Redirects from HTTP to HTTPS
- [ ] Shows Ghost welcome or ghost/admin page

### SerpBear
- [ ] https://ranks.theprofitplatform.com.au opens
- [ ] SSL certificate is valid (green padlock)
- [ ] Redirects from HTTP to HTTPS
- [ ] Shows SerpBear login page

---

## 🔧 Troubleshooting

### Issue: SSL Certificate Not Generated

**Symptoms**: No green padlock, certificate error

**Solutions**:
1. Wait 2-3 minutes (Let's Encrypt can be slow)
2. Check DNS is correctly pointing to 31.97.222.218:
   ```bash
   dig analytics.theprofitplatform.com.au
   ```
3. In Coolify, click "Regenerate Certificate"
4. Check Coolify logs for errors

### Issue: Domain Shows 502 Bad Gateway

**Symptoms**: "502 Bad Gateway" error

**Solutions**:
1. Verify service is running:
   ```bash
   docker ps | grep -E "plausible|ghost"
   ```
2. Check correct port mapping:
   - Plausible: 8100
   - Ghost: 2368
   - SerpBear: 3001
3. Verify target is `localhost` not `127.0.0.1`

### Issue: Domain Shows 404 Not Found

**Symptoms**: Coolify works but shows 404

**Solutions**:
1. Double-check target port is correct
2. Test locally first:
   ```bash
   curl -I http://localhost:8100  # Plausible
   curl -I http://localhost:2368  # Ghost
   curl -I http://localhost:3001  # SerpBear
   ```
3. Restart Coolify proxy

### Issue: HTTP Not Redirecting to HTTPS

**Symptoms**: Can access via HTTP, but doesn't auto-redirect

**Solutions**:
1. Verify "Force HTTPS redirect" is enabled in Coolify
2. Clear browser cache
3. Wait a few minutes for configuration to propagate

---

## 📱 Mobile/Alternative Access

If you need to configure from mobile or have issues with Coolify UI:

### Option 1: Use Coolify CLI (if available)
```bash
coolify proxy add analytics.theprofitplatform.com.au localhost:8100 --ssl
coolify proxy add blog.theprofitplatform.com.au localhost:2368 --ssl
coolify proxy add ranks.theprofitplatform.com.au localhost:3001 --ssl
```

### Option 2: Manual Nginx Configuration (Advanced)
If Coolify proxy isn't working, you can configure Nginx directly.
See: `/home/avi/projects/coolify/docs/manual-nginx-config.md`

---

## 🎉 Success!

Once all 3 domains are configured and SSL certificates are active, you'll have:

✅ https://analytics.theprofitplatform.com.au (Plausible)
✅ https://blog.theprofitplatform.com.au (Ghost)
✅ https://ranks.theprofitplatform.com.au (SerpBear)

**Next Step**: Create admin accounts in each service!

---

## ⏭️ Next: Admin Account Setup

1. **Plausible**: Visit analytics URL → Register first admin
2. **Ghost**: Visit blog URL/ghost → Create admin account
3. **SerpBear**: Visit ranks URL → Login with admin/0123456789

Full instructions: `ADMIN-ACCOUNT-SETUP-GUIDE.md`

---

**Need Help?** Check the troubleshooting section above or review `COMPLETE-SEO-PLATFORM-GUIDE.md`
