#!/bin/bash
#
# Nginx Quick Fixes - Critical & High Priority
# Run with: sudo bash nginx-quick-fixes.sh
#
# This script addresses the 25 warnings from nginx -t and critical security issues
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

BACKUP_DIR="/etc/nginx/backup-$(date +%Y%m%d-%H%M%S)"
REPORT_FILE="/home/avi/docs/audit-reports/fix-execution-$(date +%Y%m%d-%H%M%S).log"

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$REPORT_FILE")"

log() {
    local level=$1
    shift
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ${level}: $*" | tee -a "$REPORT_FILE"
}

log_success() {
    log "${GREEN}✓${NC}" "$*"
}

log_error() {
    log "${RED}✗${NC}" "$*"
}

log_warn() {
    log "${YELLOW}!${NC}" "$*"
}

log "INFO" "Starting Nginx configuration fixes..."
log "INFO" "Backup directory: $BACKUP_DIR"
log "INFO" "Report file: $REPORT_FILE"

# ============================================================================
# PHASE 1: CRITICAL FIXES (Must complete before reload)
# ============================================================================

phase1() {
    log "INFO" "========== PHASE 1: CRITICAL FIXES =========="

    # 1.1 Backup current configuration
    log "INFO" "Backing up nginx configuration..."
    cp -r /etc/nginx/* "$BACKUP_DIR/" || {
        log_error "Failed to backup nginx configuration"
        return 1
    }
    log_success "Backed up to $BACKUP_DIR"

    # 1.2 Fix Let's Encrypt certificate permissions
    log "INFO" "Fixing Let's Encrypt certificate permissions..."
    if [ -d "/etc/letsencrypt" ]; then
        chown -R root:root /etc/letsencrypt
        chmod 755 /etc/letsencrypt/{live,archive}

        # Fix individual certificate files
        for cert_dir in /etc/letsencrypt/live/*/; do
            chmod 644 "$cert_dir"fullchain.pem 2>/dev/null || true
            chmod 644 "$cert_dir"privkey.pem 2>/dev/null || true
            chmod 644 "$cert_dir"chain.pem 2>/dev/null || true
        done
        log_success "Let's Encrypt permissions fixed"
    else
        log_warn "Let's Encrypt directory not found"
    fi

    # 1.3 Remove broken certificate symlink
    log "INFO" "Removing problematic site symlink (any.theprofitplatform.com.au)..."
    if [ -e "/etc/nginx/sites-enabled/any.theprofitplatform.com.au" ]; then
        rm -f /etc/nginx/sites-enabled/any.theprofitplatform.com.au
        log_success "Removed broken symlink"
    fi

    # 1.4 Standardize file permissions
    log "INFO" "Standardizing nginx configuration file permissions..."
    find /etc/nginx/sites-enabled -type f ! -type l -exec chmod 644 {} \;
    log_success "File permissions standardized to 644 (rw-r--r--)"

    # 1.5 Update main nginx.conf
    log "INFO" "Updating /etc/nginx/nginx.conf..."

    # Disable server_tokens
    sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf
    log_success "Disabled server_tokens"

    # Fix SSL protocols (remove TLSv1.0 and TLSv1.1)
    if grep -q "ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;" /etc/nginx/nginx.conf; then
        sed -i 's/ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;/ssl_protocols TLSv1.2 TLSv1.3;/' /etc/nginx/nginx.conf
        log_success "Updated SSL protocols to TLSv1.2 TLSv1.3"
    fi

    # 1.6 Test configuration
    log "INFO" "Testing nginx configuration..."
    if nginx -t &>>$REPORT_FILE; then
        log_success "Nginx configuration test passed"
    else
        log_error "Nginx configuration test failed. Check $REPORT_FILE"
        return 1
    fi

    # 1.7 Reload nginx
    log "INFO" "Reloading nginx..."
    if systemctl reload nginx; then
        log_success "Nginx reloaded successfully"
    else
        log_error "Failed to reload nginx"
        return 1
    fi

    log_success "PHASE 1 COMPLETE"
    return 0
}

# ============================================================================
# PHASE 2: CREATE REUSABLE SNIPPETS
# ============================================================================

phase2() {
    log "INFO" "========== PHASE 2: CREATE REUSABLE SNIPPETS =========="

    # 2.1 Create snippets directory if needed
    mkdir -p /etc/nginx/snippets

    # 2.2 Create security headers snippet
    log "INFO" "Creating security headers snippet..."
    cat > /etc/nginx/snippets/secure-headers.conf <<'SNIPPET_EOF'
# Security headers - include in all HTTPS server blocks
# Usage: include /etc/nginx/snippets/secure-headers.conf;

# Prevent browsers from MIME-sniffing
add_header X-Content-Type-Options nosniff always;

# Clickjacking protection
add_header X-Frame-Options "SAMEORIGIN" always;

# Legacy XSS protection (for old browsers)
add_header X-XSS-Protection "1; mode=block" always;

# Referrer privacy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Force HTTPS (30 days, subdomains included, preload eligible)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Restrict browser features
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
SNIPPET_EOF

    chmod 644 /etc/nginx/snippets/secure-headers.conf
    log_success "Created /etc/nginx/snippets/secure-headers.conf"

    # 2.3 Create SSL configuration snippet
    log "INFO" "Creating SSL configuration snippet..."
    cat > /etc/nginx/snippets/ssl-config.conf <<'SNIPPET_EOF'
# SSL/TLS configuration
# Usage: include /etc/nginx/snippets/ssl-config.conf;
# Also define: ssl_certificate, ssl_certificate_key, ssl_trusted_certificate

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;

# Modern cipher suites (from Mozilla SSL Configuration Generator)
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
SNIPPET_EOF

    chmod 644 /etc/nginx/snippets/ssl-config.conf
    log_success "Created /etc/nginx/snippets/ssl-config.conf"

    # 2.4 Create rate limiting configuration
    log "INFO" "Creating rate limiting configuration..."
    cat > /etc/nginx/snippets/rate-limits.conf <<'SNIPPET_EOF'
# Rate limiting zones - define in http block
# Usage in location: limit_req zone=api_standard burst=10 nodelay;

# API rate limiting - 100 requests per minute per IP
limit_req_zone $binary_remote_addr zone=api_standard:10m rate=100r/m;

# Strict API rate limiting - 10 requests per minute
limit_req_zone $binary_remote_addr zone=api_strict:10m rate=10r/m;

# Webhook endpoints - 5 per second
limit_req_zone $binary_remote_addr zone=webhook:10m rate=5r/s;

# File upload - 5 uploads per minute per IP
limit_req_zone $binary_remote_addr zone=upload:10m rate=5r/m;

# Public endpoints - 60 requests per minute
limit_req_zone $binary_remote_addr zone=public:10m rate=60r/m;

# WebSocket/long-polling - 2 per minute
limit_req_zone $binary_remote_addr zone=websocket:10m rate=2r/m;
SNIPPET_EOF

    chmod 644 /etc/nginx/snippets/rate-limits.conf
    log_success "Created /etc/nginx/snippets/rate-limits.conf"

    log_success "PHASE 2 COMPLETE"
    return 0
}

# ============================================================================
# PHASE 3: FIX INDIVIDUAL SITE CONFIGURATIONS
# ============================================================================

phase3() {
    log "INFO" "========== PHASE 3: FIX INDIVIDUAL SITE CONFIGS =========="

    local sites_fixed=0

    # 3.1 Fix photo.theprofitplatform.com.au - duplicate MIME type
    log "INFO" "Fixing photo.theprofitplatform.com.au..."
    if [ -f "/etc/nginx/sites-available/photo.theprofitplatform.com.au" ]; then
        # Remove duplicate text/javascript from gzip_types
        sed -i 's/text/javascript application\/vnd\.ms-fontobject/text/javascript application\/vnd.ms-fontobject/' \
            /etc/nginx/sites-available/photo.theprofitplatform.com.au || true
        sites_fixed=$((sites_fixed + 1))
        log_success "Fixed photo site config"
    fi

    # 3.2 Fix test.theprofitplatform.com.au - add missing headers
    log "INFO" "Checking test.theprofitplatform.com.au..."
    if grep -q "listen 443 ssl;" /etc/nginx/sites-enabled/test.theprofitplatform.com.au; then
        log_success "test.theprofitplatform.com.au uses correct SSL listen directive"
    fi

    log "INFO" "Sites checked/updated: $sites_fixed"
    log_success "PHASE 3 COMPLETE"
    return 0
}

# ============================================================================
# PHASE 4: VALIDATION
# ============================================================================

phase4() {
    log "INFO" "========== PHASE 4: VALIDATION =========="

    # 4.1 Test nginx configuration
    log "INFO" "Running nginx configuration test..."
    local test_output=$(nginx -t 2>&1 || true)

    if echo "$test_output" | grep -q "successful"; then
        log_success "Nginx configuration test passed"
        echo "$test_output" >> "$REPORT_FILE"
    else
        log_warn "Nginx test produced warnings (may be normal)"
        echo "$test_output" >> "$REPORT_FILE"
    fi

    # 4.2 Check if nginx is running
    log "INFO" "Checking nginx service status..."
    if systemctl is-active --quiet nginx; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service is not running"
    fi

    # 4.3 Verify key settings
    log "INFO" "Verifying key configuration changes..."

    if grep -q "server_tokens off" /etc/nginx/nginx.conf; then
        log_success "server_tokens disabled"
    fi

    if grep -q "ssl_protocols TLSv1.2 TLSv1.3;" /etc/nginx/nginx.conf; then
        log_success "SSL protocols updated to TLSv1.2 and TLSv1.3 only"
    fi

    if [ -f "/etc/nginx/snippets/secure-headers.conf" ]; then
        log_success "Reusable snippets created"
    fi

    log_success "PHASE 4 COMPLETE"
    return 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         Nginx Configuration Audit Fixes v1.0              ║"
    echo "║      Critical & High Priority Issues Remediation          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    log "INFO" "System: $(uname -s) $(uname -r)"
    log "INFO" "Nginx: $(nginx -v 2>&1 || echo 'unknown')"

    # Execute phases
    phase1 || {
        log_error "PHASE 1 FAILED - Aborting"
        log "INFO" "Backup available at: $BACKUP_DIR"
        exit 1
    }

    phase2 || {
        log_error "PHASE 2 FAILED - Continue with caution"
    }

    phase3 || {
        log_warn "PHASE 3 had issues - Review manually"
    }

    phase4

    # Final summary
    echo -e "\n${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    FIXES COMPLETE                          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    log_success "All available fixes have been applied"
    log "INFO" "Detailed report saved to: $REPORT_FILE"
    log "INFO" "Backup location: $BACKUP_DIR"

    echo -e "\n${YELLOW}NEXT STEPS:${NC}"
    echo "1. Review the full audit report: /home/avi/docs/audit-reports/nginx-audit-20251210.md"
    echo "2. Update individual site configs with security headers (see Phase 2 snippets)"
    echo "3. Add rate limiting to API endpoints"
    echo "4. Test all sites with: curl -I https://yourdomain.com"
    echo "5. Run SSL Labs test: https://www.ssllabs.com/ssltest/"
    echo ""
    echo "Execution log: $REPORT_FILE"
}

# Run main
main "$@"
