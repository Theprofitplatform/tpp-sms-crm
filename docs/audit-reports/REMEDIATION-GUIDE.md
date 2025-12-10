# Nginx Audit Remediation Guide
**Detailed Step-by-Step Instructions for All 25 Issues**

## Table of Contents
1. [Critical Fixes (Do First)](#critical-fixes)
2. [High Priority Fixes (Next 2-4 hours)](#high-priority-fixes)
3. [Medium Priority Fixes](#medium-priority-fixes)
4. [Verification & Testing](#verification)

---

## Critical Fixes

### Fix 1: Certificate Permission Error (BLOCKING)

**Error Message:**
```
[emerg] cannot load certificate key "/etc/letsencrypt/live/any.theprofitplatform.com.au/privkey.pem":
BIO_new_file() failed (SSL: error:8000000D:system library::Permission denied)
```

**Step-by-step:**

```bash
# 1. Check current permissions
sudo ls -la /etc/letsencrypt/live/

# 2. Fix ownership
sudo chown -R root:root /etc/letsencrypt

# 3. Fix directory permissions
sudo chmod 755 /etc/letsencrypt
sudo chmod 755 /etc/letsencrypt/live
sudo chmod 755 /etc/letsencrypt/archive

# 4. Fix individual certificate permissions
sudo chmod 644 /etc/letsencrypt/live/*/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/*/privkey.pem
sudo chmod 644 /etc/letsencrypt/live/*/chain.pem

# 5. Verify nginx can read them
sudo nginx -t

# 6. If still failing, check specific domain
sudo ls -la /etc/letsencrypt/live/any.theprofitplatform.com.au/
```

**If certificate directory is missing:**
```bash
# Renew certificate for the domain
sudo certbot certonly --nginx -d any.theprofitplatform.com.au
```

---

### Fix 2: Remove Broken Configuration Symlink

**Problem:** `any.theprofitplatform.com.au` references missing certificate

```bash
# 1. Verify the symlink exists
ls -la /etc/nginx/sites-enabled/any.theprofitplatform.com.au

# 2. Remove it
sudo rm /etc/nginx/sites-enabled/any.theprofitplatform.com.au

# 3. If you need this domain, create proper config
# Copy from a working site and update
sudo cp /etc/nginx/sites-available/chat.theprofitplatform.com.au \
        /etc/nginx/sites-available/any.theprofitplatform.com.au

# 4. Edit and customize
sudo nano /etc/nginx/sites-available/any.theprofitplatform.com.au
# Change: chat.theprofitplatform.com.au -> any.theprofitplatform.com.au

# 5. Create symlink if keeping
sudo ln -s /etc/nginx/sites-available/any.theprofitplatform.com.au \
           /etc/nginx/sites-enabled/any.theprofitplatform.com.au
```

---

### Fix 3: Standardize File Permissions

**Problem:** Inconsistent permissions (0605, 0644, 0667)

```bash
# 1. Check current permissions
sudo ls -l /etc/nginx/sites-enabled/*.au | head -10

# 2. Standardize all to 644 (rw-r--r--)
sudo find /etc/nginx/sites-enabled -type f ! -type l -exec chmod 644 {} \;

# 3. Verify
sudo ls -l /etc/nginx/sites-enabled/ | grep -v "^l"
# All should show: -rw-r--r-- 1 root root

# 4. Check for world-writable files (dangerous)
sudo find /etc/nginx/sites-enabled -type f -perm /002 -ls

# 5. Fix if found
sudo chmod 644 /etc/nginx/sites-enabled/dashboard.theprofitplatform.com.au
```

---

### Fix 4: Disable Server Tokens

**Problem:** Nginx version exposed in headers (information disclosure)

```bash
# 1. Check current setting
grep "server_tokens" /etc/nginx/nginx.conf

# 2. Enable server_tokens off
sudo sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf

# 3. Verify change
grep "server_tokens" /etc/nginx/nginx.conf
# Should show: server_tokens off;

# 4. Test
sudo nginx -t

# 5. Reload
sudo systemctl reload nginx

# 6. Test the change
curl -I https://theprofitplatform.com.au | grep -i server
# Should NOT show version number
```

---

### Fix 5: Update SSL Protocols in Main Config

**Problem:** Allows deprecated TLSv1.0 and TLSv1.1

```bash
# 1. Locate the line
grep -n "ssl_protocols" /etc/nginx/nginx.conf

# 2. Edit the file
sudo nano /etc/nginx/nginx.conf
# Find line ~37: ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;

# 3. Change it to
ssl_protocols TLSv1.2 TLSv1.3;

# 4. Or use sed to automate
sudo sed -i 's/ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;/ssl_protocols TLSv1.2 TLSv1.3;/' \
    /etc/nginx/nginx.conf

# 5. Verify
grep "ssl_protocols" /etc/nginx/nginx.conf

# 6. Test
sudo nginx -t

# 7. Reload
sudo systemctl reload nginx
```

---

### Critical Fixes Summary

```bash
#!/bin/bash
# Run all critical fixes at once
echo "Running Critical Fixes..."

# 1. Certificate permissions
sudo chown -R root:root /etc/letsencrypt
sudo chmod 755 /etc/letsencrypt/{live,archive}
sudo chmod 644 /etc/letsencrypt/live/*/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/*/privkey.pem

# 2. Remove broken symlink
sudo rm -f /etc/nginx/sites-enabled/any.theprofitplatform.com.au

# 3. Fix file permissions
sudo find /etc/nginx/sites-enabled -type f ! -type l -exec chmod 644 {} \;

# 4. Disable server_tokens
sudo sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf

# 5. Fix SSL protocols
sudo sed -i 's/ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;/ssl_protocols TLSv1.2 TLSv1.3;/' \
    /etc/nginx/nginx.conf

# 6. Test
sudo nginx -t

# 7. Reload
sudo systemctl reload nginx

echo "Critical fixes complete!"
```

---

## High Priority Fixes

### Fix 6: Add HSTS Headers to 30+ Sites

**Problem:** No protection against SSL stripping attacks

**Step 1: Create reusable snippet**

```bash
# Create the snippet file
sudo tee /etc/nginx/snippets/hsts-header.conf > /dev/null <<'EOF'
# Strict-Transport-Security - prevents SSL stripping
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
EOF

# Verify
cat /etc/nginx/snippets/hsts-header.conf
```

**Step 2: Update each HTTPS server block**

For each site in `/etc/nginx/sites-enabled/`, add to the HTTPS server block:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # Add this line:
    include /etc/nginx/snippets/hsts-header.conf;

    # Rest of config...
}
```

**Step 3: Script to add HSTS to all sites**

```bash
#!/bin/bash
# Add HSTS to all HTTPS server blocks that don't have it

SNIPPET="include /etc/nginx/snippets/hsts-header.conf;"
SITES_DIR="/etc/nginx/sites-enabled"

for site in $SITES_DIR/*.au; do
    if [ -f "$site" ] && ! grep -q "hsts-header" "$site"; then
        echo "Processing: $site"

        # Find first listen 443 ssl line and add snippet after it
        sudo sed -i '/listen 443 ssl/a \    include /etc/nginx/snippets/hsts-header.conf;' "$site"
    fi
done

# Test
sudo nginx -t
sudo systemctl reload nginx
```

---

### Fix 7: Configure Rate Limiting

**Problem:** No DDoS/abuse protection

**Step 1: Update nginx.conf**

```bash
# Edit main config
sudo nano /etc/nginx/nginx.conf

# Add this in the http {} block after the existing limit_req_zone directives:
```

```nginx
http {
    # Existing zones
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=1r/s;
    limit_req_zone $binary_remote_addr zone=filemanager:10m rate=10r/s;

    # New zones to add
    limit_req_zone $binary_remote_addr zone=api_standard:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=api_strict:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=public:10m rate=60r/m;
    limit_req_zone $binary_remote_addr zone=websocket:10m rate=2r/m;

    # Rest of http block...
}
```

**Step 2: Apply rate limiting to API site**

```bash
# Edit api.theprofitplatform.com.au
sudo nano /etc/nginx/sites-enabled/api.theprofitplatform.com.au
```

Add rate limiting to the server block:

```nginx
server {
    server_name api.theprofitplatform.com.au;

    # Rate limiting configuration
    limit_req_status 429;  # Return 429 Too Many Requests

    location / {
        limit_req zone=api_standard burst=20 nodelay;
        proxy_pass http://10.0.11.4:3000;
        # ... rest of proxy config
    }

    location /api/ {
        limit_req zone=api_standard burst=20 nodelay;
        proxy_pass http://10.0.11.4:3000;
        # ... rest of proxy config
    }
}
```

**Step 3: Verify and reload**

```bash
sudo nginx -t
sudo systemctl reload nginx

# Monitor rate limiting (check logs)
sudo tail -f /var/log/nginx/api.theprofitplatform.com.au.error.log
```

---

### Fix 8: Create Reusable Security Snippets

**Step 1: Create secure headers snippet**

```bash
sudo tee /etc/nginx/snippets/secure-headers.conf > /dev/null <<'EOF'
# Security headers - include in all HTTPS server blocks

# Prevent MIME-type sniffing
add_header X-Content-Type-Options nosniff always;

# Prevent clickjacking attacks
add_header X-Frame-Options "SAMEORIGIN" always;

# Legacy XSS protection (for old browsers)
add_header X-XSS-Protection "1; mode=block" always;

# Referrer policy - balances privacy and functionality
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Restrict browser features
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;

# HSTS - enforce HTTPS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
EOF
```

**Step 2: Create SSL configuration snippet**

```bash
sudo tee /etc/nginx/snippets/ssl-params.conf > /dev/null <<'EOF'
# SSL/TLS configuration
# Apply to all HTTPS server blocks

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;

# Modern cipher suites (from Mozilla SSL Configuration Generator)
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
EOF
```

**Step 3: Apply snippets to sites**

```bash
# Edit a site
sudo nano /etc/nginx/sites-enabled/clients.theprofitplatform.com.au
```

Update the HTTPS server block:

```nginx
server {
    listen 443 ssl http2;
    server_name clients.theprofitplatform.com.au;

    # SSL configuration (replace old ssl_* directives)
    include /etc/nginx/snippets/ssl-params.conf;
    ssl_certificate /etc/letsencrypt/live/theprofitplatform.com.au-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/theprofitplatform.com.au-0001/privkey.pem;

    # Security headers
    include /etc/nginx/snippets/secure-headers.conf;

    # Rest of configuration...
}
```

---

### Fix 9: Fix Duplicate MIME Type

**File:** `/etc/nginx/sites-enabled/photo.theprofitplatform.com.au`

```bash
# 1. Locate the line
sudo grep -n "gzip_types" /etc/nginx/sites-enabled/photo.theprofitplatform.com.au

# 2. View the problematic section
sudo sed -n '85,87p' /etc/nginx/sites-enabled/photo.theprofitplatform.com.au

# 3. Fix it
sudo nano /etc/nginx/sites-enabled/photo.theprofitplatform.com.au
# Find line with duplicate text/javascript
# Replace entire gzip_types section with:
```

```nginx
gzip_types text/plain
           text/css
           text/xml
           text/javascript
           application/json
           application/javascript
           application/xml+rss
           application/rss+xml
           application/atom+xml
           image/svg+xml
           application/vnd.ms-fontobject
           application/x-font-ttf
           font/opentype;
```

```bash
# 4. Test
sudo nginx -t

# 5. Reload
sudo systemctl reload nginx
```

---

## Medium Priority Fixes

### Fix 10: Update CSP Headers

**Problem:** CSP too permissive with unsafe-inline

**Current (dashboard.theprofitplatform.com.au:45):**
```nginx
add_header Content-Security-Policy "default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline'; ...";
```

**Improved for React apps:**
```nginx
add_header Content-Security-Policy "default-src 'self';
    script-src 'self' 'wasm-unsafe-eval';
    style-src 'self' 'nonce-${CSP_NONCE}';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;" always;
```

**Implementation:**

```bash
# Create CSP snippet
sudo tee /etc/nginx/snippets/csp-react.conf > /dev/null <<'EOF'
# Content Security Policy for React applications
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'nonce-randomCSP'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
EOF

# Add to React sites
for site in /etc/nginx/sites-enabled/{clients,dashboard,chat}.theprofitplatform.com.au; do
    echo "include /etc/nginx/snippets/csp-react.conf;" | \
    sudo tee -a "$site" > /dev/null
done
```

---

### Fix 11: Add Permissions-Policy Header

**Problem:** No browser feature restrictions

```bash
# Add to all sites
HEADER='add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=()" always;'

for site in /etc/nginx/sites-enabled/*.au; do
    if [ -f "$site" ] && grep -q "listen 443"; then
        # Find the last add_header line and add after it
        sudo sed -i '/add_header.*always;/a \    '"$HEADER" "$site"
    fi
done
```

---

### Fix 12: Implement Log Rotation

**Check if logrotate is configured:**

```bash
# Check existing logrotate config
sudo cat /etc/logrotate.d/nginx

# If missing, create it
sudo tee /etc/logrotate.d/nginx > /dev/null <<'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    prerotate {
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    }
    postrotate {
        [ ! -f /var/run/nginx.pid ] || kill -USR1 `cat /var/run/nginx.pid`
    }
    endscript
}
EOF

# Test it
sudo logrotate -d /etc/logrotate.d/nginx
```

---

## Verification & Testing

### Verification Checklist

```bash
#!/bin/bash
echo "=== NGINX AUDIT VERIFICATION ==="

echo "1. Configuration Test"
sudo nginx -t

echo -e "\n2. Certificate Permissions"
ls -la /etc/letsencrypt/live/theprofitplatform.com.au*/privkey.pem

echo -e "\n3. Server Tokens Disabled"
curl -I https://theprofitplatform.com.au 2>/dev/null | grep -i server

echo -e "\n4. Security Headers"
curl -I https://theprofitplatform.com.au 2>/dev/null | grep -E "Strict|X-Frame|X-Content|Referrer|Permissions"

echo -e "\n5. SSL/TLS Version"
echo | openssl s_client -connect theprofitplatform.com.au:443 2>/dev/null | grep "Protocol"

echo -e "\n6. Nginx Service Status"
sudo systemctl status nginx --no-pager | grep Active

echo -e "\n7. File Permissions Check"
sudo find /etc/nginx/sites-enabled -type f ! -type l ! -perm 644 -ls

echo "=== VERIFICATION COMPLETE ==="
```

### Testing Commands

```bash
# Test specific domain
curl -I https://chat.theprofitplatform.com.au
curl -I https://api.theprofitplatform.com.au
curl -I https://n8n.theprofitplatform.com.au

# Check HSTS header
curl -I https://theprofitplatform.com.au | grep -i strict

# Monitor error log while testing
sudo tail -f /var/log/nginx/error.log &
# Make requests in another terminal
curl -I https://yoursite.com

# Check rate limiting (should return 429 after limit)
ab -n 500 -c 100 https://api.theprofitplatform.com.au/
```

### SSL Labs Test

1. Visit: https://www.ssllabs.com/ssltest/
2. Enter: `theprofitplatform.com.au`
3. Check rating (target: A or A+)
4. Review specific findings
5. Address any red flags

---

## Rollback Procedure

If something breaks:

```bash
# 1. Stop nginx
sudo systemctl stop nginx

# 2. Restore from backup (created before fixes)
sudo rm -rf /etc/nginx
sudo cp -r ~/backup/nginx-backup /etc/nginx

# 3. Test
sudo nginx -t

# 4. Restart
sudo systemctl start nginx

# 5. Verify
curl -I https://theprofitplatform.com.au
```

---

## Success Criteria

After all fixes, you should see:

- [ ] `nginx -t` completes with 0 errors
- [ ] All security headers present on HTTPS sites
- [ ] HSTS header on all 40+ sites
- [ ] Rate limiting active and functioning
- [ ] File permissions standardized (644 for configs)
- [ ] Nginx version hidden (server_tokens off)
- [ ] SSL Labs test returns A or A+ rating
- [ ] All sites respond normally
- [ ] Error logs show no permission issues
- [ ] Certificate renewal works automatically

---

## Timeline Recommendation

**Day 1 (2-3 hours):**
- Run Phase 1 critical fixes
- Test and verify

**Day 2-3 (4-6 hours):**
- Implement rate limiting
- Add HSTS headers to all sites
- Create and apply security snippets

**Day 4 (2-4 hours):**
- Fix remaining medium priority issues
- Comprehensive testing

**Week 2:**
- Monitor logs
- Adjust rate limits based on legitimate traffic
- Optimize performance

---

## Questions & Troubleshooting

**Q: Do I need to restart nginx or just reload?**
A: Use reload - it's faster and doesn't drop connections:
```bash
sudo systemctl reload nginx
```

**Q: What if HSTS breaks something?**
A: Start with max-age=86400 (1 day) instead of 31536000 (1 year):
```nginx
add_header Strict-Transport-Security "max-age=86400; includeSubDomains" always;
```

**Q: How do I test rate limiting?**
A: Use ab (ApacheBench):
```bash
ab -n 200 -c 10 https://api.theprofitplatform.com.au/
# Should see some 429 errors if rate limit is 100r/m
```

**Q: Should I update the main nginx.conf?**
A: Yes - it sets the baseline for all sites. Individual sites can override.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-10
**Status:** Ready for Implementation
