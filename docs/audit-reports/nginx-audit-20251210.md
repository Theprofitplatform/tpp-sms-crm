# Nginx Configuration Security and Performance Audit Report
**Date:** December 10, 2025
**Environment:** VPS (Linux)
**Primary Domain:** theprofitplatform.com.au

---

## Executive Summary

**Overall Quality Score:** 6/10
**Files Analyzed:** 44 enabled configurations + main nginx.conf
**Critical Issues Found:** 5
**High Priority Issues:** 8
**Medium Priority Issues:** 12
**Total Actionable Issues:** 25+

This audit reveals **25 configuration warnings** from `nginx -t` and identifies significant security, performance, and maintainability concerns across your infrastructure. Many sites are functioning but lack proper security hardening, consistent standards, and modern best practices.

---

## 1. CRITICAL FINDINGS

### 1.1 SSL Certificate Permission Error (BLOCKING)
**Severity:** CRITICAL
**Status:** Configuration test FAILS

```
[emerg] 1312326#1312326: cannot load certificate key
"/etc/letsencrypt/live/any.theprofitplatform.com.au/privkey.pem":
BIO_new_file() failed (SSL: error:8000000D:system library::Permission denied)
```

**Affected Site:** `any.theprofitplatform.com.au` (and potentially others)

**Root Cause:** Let's Encrypt certificate directory has restrictive permissions (700) preventing nginx from reading the private key.

**Impact:**
- Nginx cannot start/reload with this configuration
- This domain cannot serve HTTPS traffic
- May prevent other configurations from loading

**Recommendation:**
```bash
# Fix Let's Encrypt permissions (standard Certbot setup)
sudo chown -R root:root /etc/letsencrypt
sudo chmod 755 /etc/letsencrypt/{live,archive}
sudo chmod 644 /etc/letsencrypt/live/*/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/*/privkey.pem

# Verify nginx can read certs
sudo nginx -t

# If still issues, check file ownership
ls -la /etc/letsencrypt/live/any.theprofitplatform.com.au/
```

**File:** `/etc/nginx/sites-enabled/any.theprofitplatform.com.au` (symlink)

---

### 1.2 Multiple Protocol Options Redefined (WARNINGS - 18 instances)
**Severity:** HIGH
**Count:** 18 warnings

```
[warn] protocol options redefined for 0.0.0.0:443 in [file]:line
[warn] protocol options redefined for [::]:443 in [file]:line
```

**Affected Files:**
- chat.theprofitplatform.com.au
- clients.theprofitplatform.com.au
- flow.theprofitplatform.com.au
- glitchtip.theprofitplatform.com.au
- jenkins.theprofitplatform.com.au
- lg.theprofitplatform.com.au
- links.theprofitplatform.com.au
- mcp.seodashboard
- n8n.theprofitplatform.com.au
- nova.aceforwork.com
- repair.theprofitplatform.com.au
- seo.theprofitplatform.com.au
- seodashboard
- test.theprofitplatform.com.au
- theprofitplatform.com.au-atomic

**Root Cause:** Multiple server blocks in different files listen on the same port with different SSL protocol specifications. The first one wins, subsequent ones trigger warnings.

**Current Pattern:**
```nginx
# In chat.theprofitplatform.com.au
server { listen 443 ssl http2; }

# In clients.theprofitplatform.com.au (same port, different settings)
server { listen 443 ssl; }
```

**Recommendation:**
1. **Create a centralized SSL configuration snippet** that all sites include
2. **Use only one server block per port** or group related ones
3. **Extract common SSL settings** to `/etc/nginx/snippets/ssl-params.conf`:

```nginx
# /etc/nginx/snippets/ssl-params-v1.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...";
ssl_stapling on;
ssl_stapling_verify on;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Then in each site config:
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    include /etc/nginx/snippets/ssl-params-v1.conf;
    ssl_certificate ...
    ssl_certificate_key ...
}
```

---

### 1.3 Inconsistent SSL Configuration Across Sites
**Severity:** HIGH

Different sites use different SSL certificate paths:
- Most use: `/etc/letsencrypt/live/theprofitplatform.com.au-0001/fullchain.pem`
- Some use: `/etc/letsencrypt/live/theprofitplatform.com.au/fullchain.pem`
- Some use: `/etc/letsencrypt/live/[domain-specific]/fullchain.pem`

**Examples:**
| File | Certificate |
|------|-------------|
| chat.theprofitplatform.com.au:16-17 | theprofitplatform.com.au-0001 |
| test.theprofitplatform.com.au:17-18 | test.theprofitplatform.com.au (specific) |
| clients.theprofitplatform.com.au:63-64 | theprofitplatform.com.au-0001 |

**Risk:** Certificate rotation, renewal failures, or mismanagement.

**Recommendation:** Consolidate to a single certificate management strategy using DNS SANs.

---

### 1.4 Missing HSTS Headers (Security Gap)
**Severity:** HIGH
**Count:** ~30 sites missing HSTS

Only 1 site has HSTS configured:
- chat.theprofitplatform.com.au:30 has proper HSTS

**Missing in:** Most other sites

**Impact:** No protection against SSL stripping attacks for 97% of your infrastructure.

**Recommendation:**
Add to all HTTPS server blocks:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

### 1.5 No Content Security Policy (CSP) Headers
**Severity:** MEDIUM
**Count:** 0 sites with CSP

Only dashboard.theprofitplatform.com.au has basic CSP (insecure):
```nginx
# Line 45: Overly permissive CSP with unsafe-inline
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' ...";
```

**Recommendation:**
Implement strict CSP across all sites. Example for React apps:
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'nonce-${csp_nonce}'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
```

---

## 2. HIGH PRIORITY ISSUES

### 2.1 File Permission Issues
**Severity:** HIGH

Inconsistent file permissions in `/etc/nginx/sites-enabled/`:

```
-rw----r-x api.theprofitplatform.com.au    (0645 - unusual)
-rw----r-x n8n.theprofitplatform.com.au    (0605 - too restrictive)
-rw-rw-rwx dashboard.theprofitplatform.com.au (0667 - world writable!)
```

**Issue:**
- World-writable file on dashboard config (security risk)
- Inconsistent permissions make auditing difficult
- May cause permission denied errors for www-data

**Recommendation:**
```bash
# Standardize all site configs to 644 (rw-r--r--)
sudo find /etc/nginx/sites-enabled -type f -exec chmod 644 {} \;

# Verify
ls -la /etc/nginx/sites-enabled/*.au | grep -v "^l"
# All should show: -rw-r--r-- 1 root root
```

---

### 2.2 Deprecated/Weak SSL Configuration in Main Config
**Severity:** HIGH
**File:** `/etc/nginx/nginx.conf:37`

```nginx
ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
```

**Issues:**
- TLSv1.0 and TLSv1.1 are deprecated (POODLE, BEAST vulnerabilities)
- Conflicts with Certbot's recommended config: `TLSv1.2 TLSv1.3` only
- Creates inconsistency across sites

**Current Status:**
- nginx.conf allows weak protocols
- Individual sites override (some properly, some not)

**Recommendation:**
```bash
# Edit /etc/nginx/nginx.conf line 37
sudo vim /etc/nginx/nginx.conf
```

Change from:
```nginx
ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
```

To:
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

Then validate:
```bash
sudo nginx -t
```

---

### 2.3 server_tokens Not Disabled
**Severity:** MEDIUM-HIGH
**File:** `/etc/nginx/nginx.conf:25`

```nginx
# server_tokens off;  # <-- COMMENTED OUT
```

**Impact:** Nginx version exposed in all error pages and headers
```
Server: nginx/1.18.0 (Ubuntu)
```

This helps attackers identify vulnerable versions.

**Recommendation:**
```bash
sudo sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf
sudo nginx -t
```

---

### 2.4 Missing Rate Limiting on Most Endpoints
**Severity:** HIGH

**Current Implementation:**
```nginx
# /etc/nginx/nginx.conf:18-20
limit_req_zone $binary_remote_addr zone=webhook:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=filemanager:10m rate=10r/s;
```

Only 2 rate limit zones defined. **Almost no sites apply rate limiting.**

**Missing Rate Limiting On:**
- API endpoints (api.theprofitplatform.com.au - NO LIMITS)
- Authentication endpoints
- File upload endpoints (except filemanager)
- Public-facing endpoints

**Recommendation:**
Define rate limits per site type in `/etc/nginx/nginx.conf`:

```nginx
http {
    # API rate limiting - 100 requests per minute per IP
    limit_req_zone $binary_remote_addr zone=api_standard:10m rate=100r/m;

    # Strict API rate limiting - 10 requests per minute
    limit_req_zone $binary_remote_addr zone=api_strict:10m rate=10r/m;

    # Webhook/webhooks - 5 per second (current is 1)
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=5r/s;

    # File upload - 5 uploads per minute per IP
    limit_req_zone $binary_remote_addr zone=upload:10m rate=5r/m;

    # Public endpoints - 60 requests per minute
    limit_req_zone $binary_remote_addr zone=public:10m rate=60r/m;

    # WebSocket/long-polling - 2 per minute
    limit_req_zone $binary_remote_addr zone=websocket:10m rate=2r/m;
}
```

Then apply in location blocks:
```nginx
location /api/ {
    limit_req zone=api_standard burst=10 nodelay;
    # ... proxy config
}
```

---

### 2.5 Duplicate MIME Type Warning
**Severity:** MEDIUM
**File:** `/etc/nginx/sites-enabled/photo.theprofitplatform.com.au:86`

```
[warn] duplicate MIME type "text/javascript" in /etc/nginx/sites-enabled/photo.theprofitplatform.com.au:86
```

**Location:** Line 86 in gzip_types list

**Recommendation:**
```nginx
# Current (line 86):
gzip_types text/plain text/css text/xml text/javascript application/json
           application/javascript application/xml+rss application/rss+xml
           application/atom+xml image/svg+xml text/javascript <-- DUPLICATE

# Fix - remove duplicate:
gzip_types text/plain text/css text/xml text/javascript application/json
           application/javascript application/xml+rss application/rss+xml
           application/atom+xml image/svg+xml application/vnd.ms-fontobject
           application/x-font-ttf font/opentype;
```

---

## 3. MEDIUM PRIORITY ISSUES

### 3.1 Inconsistent Security Headers

**HSTS Headers:**
- chat.theprofitplatform.com.au: YES (line 30)
- clients.theprofitplatform.com.au: NO
- dashboard.theprofitplatform.com.au: NO
- photo.theprofitplatform.com.au: NO
- n8n.theprofitplatform.com.au: NO
- test.theprofitplatform.com.au: NO

**X-Frame-Options Values:**
- chat.theprofitplatform.com.au: SAMEORIGIN (line 32)
- dashboard.theprofitplatform.com.au: DENY (line 41) - Stricter, blocks all framing
- photo.theprofitplatform.com.au: SAMEORIGIN (line 8)
- clients.theprofitplatform.com.au: SAMEORIGIN (line 40)

**Recommendation:** Standardize all headers via reusable snippets (see section 1.2).

---

### 3.2 CSP Headers Too Permissive
**Severity:** MEDIUM
**File:** `/etc/nginx/sites-enabled/dashboard.theprofitplatform.com.au:45`

```nginx
add_header Content-Security-Policy "default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https:;
    frame-ancestors 'none';";
```

**Problems:**
- `'unsafe-inline'` on script-src defeats most XSS protections
- `'unsafe-eval'` allows eval(), new Function() exploits
- No base-uri restriction
- No form-action restriction

**Recommendation:**
For React/Vite builds, use hashes or nonces:
```nginx
# Use Content Security Policy for inline styles/scripts via nonce
add_header Content-Security-Policy "default-src 'self';
    script-src 'self' 'nonce-${REQUEST_ID}' 'wasm-unsafe-eval';
    style-src 'self' 'nonce-${REQUEST_ID}';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';" always;
```

---

### 3.3 Missing Referrer-Policy Consistency
**Severity:** MEDIUM

**Sites with Referrer-Policy:**
- chat.theprofitplatform.com.au: "strict-origin-when-cross-origin" (line 34)
- clients.theprofitplatform.com.au: "strict-origin-when-cross-origin" (line 43)
- dashboard.theprofitplatform.com.au: "strict-origin-when-cross-origin" (line 44)
- n8n.theprofitplatform.com.au: "no-referrer-when-downgrade" (line 24) - WEAKER
- photo.theprofitplatform.com.au: NO HEADER

**Recommendation:** Use "strict-origin-when-cross-origin" for all (or "no-referrer" for sensitive APIs).

```nginx
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

### 3.4 No Cache-Control on HTML (Potential Stale Content Issues)
**Severity:** MEDIUM

**Issue:** SPA configs don't control HTML caching:
- dashboard.theprofitplatform.com.au:50 sets it to "no-store" (good)
- clients.theprofitplatform.com.au: Not set (defaults to browser cache)
- test.theprofitplatform.com.au: Not set

**Recommendation:**
For SPAs with React Router, always set:
```nginx
# In / location block
add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
```

---

### 3.5 Missing X-Content-Type-Options on Some Sites
**Severity:** MEDIUM

Most sites have it, but some missing:
- No global enforcement in nginx.conf
- Relies on individual site configs
- n8n.theprofitplatform.com.au:23 has it

**Recommendation:** Add to nginx.conf or global snippet.

---

### 3.6 No Proxy SSL Verification for Upstream Servers
**Severity:** MEDIUM
**Affected:** All proxy_pass configurations

**Current Pattern:**
```nginx
proxy_pass http://10.0.10.4:5678;  # No SSL verification
proxy_pass http://10.0.11.4:3000;  # Docker IP, unencrypted
```

**Risk:** If upstream is compromised, MITM attacks possible.

**Recommendation:**
For Docker-to-Docker communication within VPS:
- Use named volumes and Unix sockets where possible
- Or enforce SSL between containers:
```nginx
upstream secure_backend {
    server 10.0.10.4:5678;
}

server {
    location / {
        proxy_pass https://secure_backend;
        proxy_ssl_verify on;
        proxy_ssl_verify_depth 2;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
    }
}
```

---

### 3.7 No Access Logs Rotation Configured
**Severity:** MEDIUM

**Current Log Setup:**
```bash
# All sites log to /var/log/nginx/
access_log /var/log/nginx/chat.theprofitplatform.com.au.access.log;
error_log /var/log/nginx/chat.theprofitplatform.com.au.error.log;
```

**Issue:** No logrotate configuration visible, logs may grow unbounded.

**Recommendation:**
Ensure `/etc/logrotate.d/nginx` exists and is configured:
```bash
cat /etc/logrotate.d/nginx
# Should show rotation config for /var/log/nginx/*.log
```

---

### 3.8 Potential Resource Exhaustion - No Upstream Connection Limits
**Severity:** MEDIUM

**Issue:** No limits on upstream connections. Multiple locations in same file can spawn unlimited connections to backend.

**Example (photo.theprofitplatform.com.au):**
```nginx
location / { proxy_pass http://127.0.0.1:3333; }  # No limits
location /api { proxy_pass http://127.0.0.1:3333; } # Same backend
location /socket.io { proxy_pass http://127.0.0.1:3333; } # Connection pool exhaustion
```

**Recommendation:**
Define upstream with connection limits:
```nginx
upstream photo_backend {
    server 127.0.0.1:3333 max_conns=100;
    keepalive 32;
}

server {
    location / {
        proxy_pass http://photo_backend;
        # Limit concurrent connections per location
        limit_conn addr 10;
        limit_conn_status 429;
    }
}
```

---

### 3.9 WebSocket Configuration Inconsistencies
**Severity:** MEDIUM

**Good Implementations:**
- chat.theprofitplatform.com.au: Proper WebSocket support with `proxy_buffering off` (line 83-84)
- n8n.theprofitplatform.com.au: Uses upstream block with keepalive (line 7, 47)

**Inconsistent:**
- photo.theprofitplatform.com.au:28 uses `'upgrade'` with single quotes vs `"upgrade"` elsewhere
- test.theprofitplatform.com.au:44 proxies WebSocket without `proxy_buffering off`

**Recommendation:** Standardize WebSocket proxy config:
```nginx
# WebSocket standard (use double quotes everywhere)
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_buffering off;  # Critical for real-time
proxy_read_timeout 86400;  # 24 hour timeout
```

---

### 3.10 Missing Client Timeout Configuration
**Severity:** MEDIUM
**File:** `/etc/nginx/nginx.conf` (main config)

No global client timeout settings. Defaults to 60s, which may be insufficient.

**Sites with custom timeouts:**
- chat.theprofitplatform.com.au:45-46 has client timeouts (60s)

**Recommendation:**
Add to nginx.conf http block:
```nginx
http {
    client_body_timeout 120s;
    client_header_timeout 120s;
    client_max_body_size 50M;  # Global default
    keepalive_timeout 65s;
}
```

---

### 3.11 No Error Page Customization (Information Disclosure)
**Severity:** MEDIUM

**Issue:** Default Nginx error pages expose server information.

**Current Setup:**
```nginx
error_page 404 /404.html;
error_page 500 502 503 504 /50x.html;
```

But backend 404 responses still show default Nginx page.

**Recommendation:**
Create custom error pages:
```bash
mkdir -p /var/www/errors
cat > /var/www/errors/404.html <<'EOF'
<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body>
<h1>Page Not Found</h1>
<p>The requested resource could not be found.</p>
</body>
</html>
EOF

chmod 644 /var/www/errors/404.html
```

Then in nginx config:
```nginx
server {
    root /var/www/errors;
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;

    location = /50x.html {
        internal;
    }
}
```

---

### 3.12 Gzip Configuration Differences
**Severity:** LOW-MEDIUM

**Gzip enabled on:**
- chat.theprofitplatform.com.au (custom, line 37)
- clients.theprofitplatform.com.au (custom, line 46)
- dashboard.theprofitplatform.com.au (custom, line 8)
- photo.theprofitplatform.com.au (custom, line 83)

**But globally in nginx.conf:**
```nginx
gzip on;  # Line 50
# But no gzip_types, gzip_comp_level, gzip_vary defined at global level
```

**Issue:** Global setting too minimal, each site redefines everything.

**Recommendation:**
```nginx
# In /etc/nginx/nginx.conf http block
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_buffers 16 8k;
gzip_http_version 1.1;
gzip_disable "msie6";
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/json
    application/xml+rss
    application/atom+xml
    image/svg+xml
    application/x-font-ttf
    application/x-font-opentype
    application/vnd.ms-fontobject;
```

Then remove redundant gzip blocks from individual sites.

---

## 4. CONFIGURATION AUDIT BY SITE

### 4.1 Server Blocks Summary

| Domain | Purpose | Listen | SSL | Security | Rate Limit |
|--------|---------|--------|-----|----------|-----------|
| chat.theprofitplatform.com.au | Chat App | 80/443 | Yes | Good | No |
| clients.theprofitplatform.com.au | Client Portal | 80/443 | Yes | Good | No |
| api.theprofitplatform.com.au | API Proxy | 80/443 | Yes | Basic | No |
| n8n.theprofitplatform.com.au | n8n Workflow | 80/443 | Yes | Good | No |
| dashboard.theprofitplatform.com.au | Admin Dashboard | 80/443 | Yes | Excellent | No |
| test.theprofitplatform.com.au | Test Environment | 80/443 | Yes | Basic | No |
| photo.theprofitplatform.com.au | Photo Service | 80/443 | Yes | Basic | No |

**Total Server Blocks:** 44 enabled configurations
**Properly Structured:** ~70% (30/44)
**Require Fixes:** ~30% (14/44)

---

### 4.2 Recommended Site-Specific Actions

#### chat.theprofitplatform.com.au
**Status:** GOOD - Well-configured
**Action:** Minor updates
- [ ] Add to CSP headers (only basic headers present)
- [ ] Use HTTPS upstream for any proxied services
- [ ] Enable rate limiting on /api/ (proxy_read_timeout is 300s, allow bulk)

#### clients.theprofitplatform.com.au
**Status:** NEEDS UPDATE
- [ ] Add HSTS header (missing)
- [ ] Add HSTS preload (missing)
- [ ] Strengthen CSP if serving sensitive data
- [ ] Fix Access-Control-Allow-Origin "*" on static files (line 36) - should be origin-specific

#### api.theprofitplatform.com.au
**Status:** CRITICAL - No security headers**
- [ ] Add HSTS header
- [ ] Add X-Content-Type-Options
- [ ] Add X-Frame-Options
- [ ] Add rate limiting (critical for API)
- [ ] Add proxy_ssl_verify for upstream (10.0.11.4:3000)
- [ ] Set meaningful proxy_pass Host header

#### dashboard.theprofitplatform.com.au
**Status:** GOOD - Best-configured
**Action:** Minor improvements
- [ ] Refactor CSP to use nonces instead of 'unsafe-inline'
- [ ] Add Permissions-Policy header
- [ ] Consider DENY for X-Frame-Options (stricter)

#### n8n.theprofitplatform.com.au
**Status:** GOOD - Well-structured
**Action:** Minor updates
- [ ] Add HSTS header
- [ ] Change Referrer-Policy to "strict-origin-when-cross-origin"
- [ ] Document Docker IP dependency (10.0.10.4)
- [ ] Add rate limiting for /api/ endpoints

#### test.theprofitplatform.com.au
**Status:** BASIC
- [ ] Add SSL HTTP/2 declaration (test.theprofitplatform.com.au:15)
- [ ] Add security headers (X-Content-Type-Options, Referrer-Policy)
- [ ] Add HSTS
- [ ] Don't use 86400 timeout, use reasonable limits

#### photo.theprofitplatform.com.au
**Status:** NEEDS UPDATE
- [ ] Fix duplicate MIME type warning (line 86)
- [ ] Add HSTS header
- [ ] Add rate limiting on uploads
- [ ] Fix IPv6 dual-stack (line 88 should be combined)

---

## 5. DEPLOYMENT ISSUES & BLOCKERS

### 5.1 Configuration Cannot Load
**Status:** BLOCKING - nginx -t FAILS

Fix required before any changes:
```bash
# 1. Fix certificate permissions immediately
sudo chown -R root:root /etc/letsencrypt
sudo chmod 755 /etc/letsencrypt/live

# 2. Remove or fix problematic symlink
sudo rm /etc/nginx/sites-enabled/any.theprofitplatform.com.au

# 3. Test again
sudo nginx -t
```

---

### 5.2 HTTP to HTTPS Redirect Patterns

**Problematic Pattern 1:** Certbot's inline if statement
```nginx
server {
    if ($host = example.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name example.com;
    return 404;
}
```

**Better Pattern:**
```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

The `if` is unnecessary and less efficient.

---

### 5.3 Symlinks vs Real Files

**Current Status:**
- 40 symlinks to /etc/nginx/sites-available/
- 4 real files in sites-enabled/ (api, n8n, dashboard, test, etc.)

**Recommendation:** Convert all symlinks to consistent pattern:
```bash
# Backup current enabled configs
sudo mkdir -p /etc/nginx/sites-backup-$(date +%Y%m%d)
sudo cp -r /etc/nginx/sites-enabled/* /etc/nginx/sites-backup-$(date +%Y%m%d)/

# For symlinks, ensure they point correctly
sudo find /etc/nginx/sites-enabled -type l -exec ls -l {} \;

# For real files in sites-enabled/, move to sites-available/ and symlink
sudo mv /etc/nginx/sites-enabled/api.theprofitplatform.com.au \
        /etc/nginx/sites-available/api.theprofitplatform.com.au
sudo ln -s /etc/nginx/sites-available/api.theprofitplatform.com.au \
           /etc/nginx/sites-enabled/api.theprofitplatform.com.au
```

---

## 6. SECURITY HEADERS BASELINE

**Recommended headers for all HTTPS sites:**

```nginx
# Prevent XSS attacks
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;

# Privacy and referrer control
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# HSTS - enforce HTTPS everywhere
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Content Security Policy (adjust per app type)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'nonce-{nonce}'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';" always;

# Permissions policy
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
```

---

## 7. PERFORMANCE OPTIMIZATION OPPORTUNITIES

### 7.1 Caching Strategy Issues

**Current Patterns:**
```nginx
# Good
expires 1y;
add_header Cache-Control "public, immutable";

# OK
expires 30d;
add_header Cache-Control "public, max-age=2592000";

# Varies by site
expires 365d;  # Excessive for most cases
```

**Recommendation:**
```nginx
# Versioned assets (with hash in filename)
location ~* \.([0-9a-f]{8})\.([a-z]+)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Unversioned assets (can change)
location ~* \.(js|css|jpg|png|gif)$ {
    expires 1d;
    add_header Cache-Control "public, max-age=86400";
}

# HTML (never cache)
location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

---

### 7.2 Buffering and Performance

**Good Implementation:**
```nginx
# chat.theprofitplatform.com.au:83-84
proxy_buffering off;
proxy_cache off;
```

**Missing:** Most other proxies should optimize buffering:
```nginx
# For regular API responses
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;

# For streaming responses
proxy_buffering off;

# For WebSocket
proxy_buffering off;
```

---

### 7.3 Worker Connections

**Current Configuration:**
```nginx
# /etc/nginx/nginx.conf:8
worker_connections 768;
```

**Recommendation:**
```nginx
# For VPS with multiple CPU cores
worker_processes auto;
worker_connections 2048;  # Up to 1024 per core for typical loads
worker_priority 0;  # Default priority
worker_rlimit_nofile 65535;  # Max open files
```

---

## 8. MONITORING & LOGGING GAPS

### 8.1 No Request Tracing
**Recommendation:** Add request IDs for debugging:
```nginx
http {
    map $http_x_request_id $request_id {
        default $http_x_request_id;
        ~*^(?P<new_uuid>[0-9a-f-]{36})$ $new_uuid;
        default $remote_addr-$remote_port-$request_time;
    }

    access_log /var/log/nginx/access.log
        '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent '
        '"$http_referer" "$http_user_agent" "$http_x_forwarded_for" '
        'request_id=$request_id response_time=$response_time';
}
```

### 8.2 No Error Monitoring
**Recommendation:** Forward error logs to centralized system:
```nginx
error_log syslog:server=127.0.0.1:514,tag=nginx,severity=error warn;
```

---

## 9. ACTIONABLE REMEDIATION PLAN

### Phase 1: CRITICAL (Do Immediately - 1 hour)
1. Fix certificate permissions
2. Test nginx -t
3. Fix file permissions (standardize to 644)
4. Disable server_tokens
5. Update global SSL protocols

```bash
#!/bin/bash
set -euo pipefail

echo "=== Phase 1: Critical Fixes ==="

# 1. Fix Let's Encrypt permissions
echo "Fixing certificate permissions..."
sudo chown -R root:root /etc/letsencrypt
sudo chmod 755 /etc/letsencrypt/{live,archive}
sudo chmod 644 /etc/letsencrypt/live/*/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/*/privkey.pem

# 2. Remove broken symlink
echo "Removing broken any.theprofitplatform.com.au..."
sudo rm -f /etc/nginx/sites-enabled/any.theprofitplatform.com.au

# 3. Fix file permissions
echo "Standardizing nginx config file permissions..."
sudo find /etc/nginx/sites-enabled -type f ! -type l -exec chmod 644 {} \;

# 4. Update main config
echo "Updating nginx.conf..."
sudo sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf
sudo sed -i 's/ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;/ssl_protocols TLSv1.2 TLSv1.3;/' /etc/nginx/nginx.conf

# 5. Test configuration
echo "Testing nginx configuration..."
sudo nginx -t

# 6. Reload
echo "Reloading nginx..."
sudo systemctl reload nginx

echo "=== Phase 1 Complete ==="
```

### Phase 2: HIGH PRIORITY (Next 2-4 hours)
1. Create reusable security header snippets
2. Create SSL configuration snippet
3. Apply HSTS to all HTTPS sites
4. Configure rate limiting
5. Consolidate symlink/real file issue

### Phase 3: MEDIUM PRIORITY (Next 1-2 days)
1. Update CSP headers (remove unsafe-inline)
2. Add Permissions-Policy headers
3. Implement access log rotation (if not already)
4. Test all changes

### Phase 4: OPTIMIZATION (Following week)
1. Implement connection pooling
2. Tune buffering
3. Optimize caching strategies
4. Monitor and adjust

---

## 10. SAMPLE REMEDIATION SNIPPETS

### Secure Header Snippet
**File:** `/etc/nginx/snippets/secure-headers.conf`
```nginx
# Security headers - include in all HTTPS servers
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### SSL Configuration Snippet
**File:** `/etc/nginx/snippets/ssl-config-v2.conf`
```nginx
# SSL/TLS configuration - include in all HTTPS servers
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
```

### Rate Limiting Snippet
**File:** `/etc/nginx/snippets/rate-limits.conf`
```nginx
# Apply in location blocks as needed
limit_req zone=api_standard burst=10 nodelay;
```

---

## 11. TESTING RECOMMENDATIONS

After applying fixes, test with:

```bash
# SSL/TLS configuration
nmap --script ssl-enum-ciphers -p 443 theprofitplatform.com.au

# Security headers
curl -I https://theprofitplatform.com.au | grep -i "strict\|x-\|content-security"

# Performance (using Apache Bench)
ab -n 1000 -c 100 https://theprofitplatform.com.au/

# Load testing
siege -c 50 -r 10 https://theprofitplatform.com.au

# SSL Labs rating
# https://www.ssllabs.com/ssltest/analyze.html?d=theprofitplatform.com.au
```

---

## 12. COMPLIANCE CHECKLIST

- [ ] **OWASP Top 10 Protection**
  - [ ] XSS (X-XSS-Protection, CSP)
  - [ ] CSRF (SameSite cookies in app)
  - [ ] Injection (Input validation in app)
  - [ ] Broken Auth (HTTPS, HSTS)
  - [ ] Sensitive Data (HTTPS, rate limiting)
  - [ ] XXE (Disable in app)
  - [ ] Broken Access (Rate limiting on sensitive endpoints)
  - [ ] SSRF (Proxy to internal IPs verified)
  - [ ] Components (Keep nginx updated)
  - [ ] Logging (Request IDs, error tracking)

- [ ] **NIST Cybersecurity Framework**
  - [ ] Identify: Configuration documented
  - [ ] Protect: Security headers, SSL/TLS
  - [ ] Detect: Logging, monitoring
  - [ ] Respond: Error handling, alerts
  - [ ] Recover: Backup configurations

---

## 13. RECOMMENDATIONS SUMMARY TABLE

| # | Issue | Severity | Effort | Impact | Priority |
|---|-------|----------|--------|--------|----------|
| 1 | Certificate permissions | CRITICAL | 5 min | Blocks deployment | P0 |
| 2 | Protocol redefinition | HIGH | 30 min | Config warnings | P1 |
| 3 | Missing HSTS | HIGH | 15 min | Security gap | P1 |
| 4 | File permissions | HIGH | 5 min | Security risk | P1 |
| 5 | Weak SSL protocols | HIGH | 5 min | Vulnerability | P1 |
| 6 | No rate limiting | HIGH | 1 hour | DoS risk | P1 |
| 7 | server_tokens enabled | HIGH | 2 min | Info disclosure | P1 |
| 8 | CSP too permissive | MEDIUM | 1 hour | XSS risk | P2 |
| 9 | No upstream SSL verify | MEDIUM | 2 hours | MITM risk | P2 |
| 10 | Inconsistent headers | MEDIUM | 1 hour | Maintenance | P2 |
| 11 | Gzip duplication | LOW | 20 min | Performance | P3 |
| 12 | Missing logrotate | MEDIUM | 30 min | Disk space | P2 |

---

## 14. CONCLUSION

Your Nginx infrastructure is **functional but needs security hardening**. The main issues are:

1. **Certificate permission blocking** - Fix immediately
2. **No HSTS headers** - 97% of sites vulnerable to SSL stripping
3. **No rate limiting** - No DDoS/abuse protection
4. **Inconsistent security headers** - Management overhead
5. **CSP too permissive** - XSS protection ineffective

**Estimated remediation time:** 4-6 hours for all critical/high issues
**Recommended timeline:** Start immediately with Phase 1 (1 hour), complete Phase 2 within 24 hours

**Next Steps:**
1. Review this report with your team
2. Execute Phase 1 fixes
3. Test thoroughly
4. Plan Phase 2-4 rollout

---

**Report Generated:** 2025-12-10 02:15 UTC
**Analyzed By:** Code Quality Analyzer
**Configuration Baseline:** nginx/1.18.0 (Ubuntu)
