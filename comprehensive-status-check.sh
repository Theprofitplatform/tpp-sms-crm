#!/bin/bash

# Comprehensive SEO-Expert System Status Check
# Verifies all components of the SEO automation system

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SEO-EXPERT COMPREHENSIVE SYSTEM STATUS CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
date
echo ""

PASS=0
FAIL=0
WARN=0

# Function to check status
check() {
  if [ $1 -eq 0 ]; then
    echo "  ✅ $2"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $2"
    FAIL=$((FAIL + 1))
  fi
}

warn() {
  echo "  ⚠️  $1"
  WARN=$((WARN + 1))
}

info() {
  echo "  ℹ️  $1"
}

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  SYSTEM PREREQUISITES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  check 0 "Node.js installed: $NODE_VERSION"
else
  check 1 "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  check 0 "npm installed: v$NPM_VERSION"
else
  check 1 "npm not found"
fi

# Check PM2
if command -v pm2 &> /dev/null; then
  PM2_VERSION=$(pm2 --version)
  check 0 "PM2 installed: v$PM2_VERSION"
else
  check 1 "PM2 not found"
fi

# Check package.json exists
if [ -f "package.json" ]; then
  check 0 "package.json exists"
else
  check 1 "package.json not found"
fi

# Check node_modules
if [ -d "node_modules" ]; then
  MODULE_COUNT=$(ls -1 node_modules | wc -l)
  check 0 "node_modules installed ($MODULE_COUNT packages)"
else
  check 1 "node_modules not found - run: npm install"
fi

echo ""

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  CLIENT CONFIGURATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check clients-config.json
if [ -f "clients/clients-config.json" ]; then
  check 0 "clients-config.json exists"

  # Count clients
  CLIENT_COUNT=$(jq 'length' clients/clients-config.json)
  info "Total clients configured: $CLIENT_COUNT"

  # List clients
  echo ""
  echo "  Client Details:"
  jq -r 'to_entries[] | "    • \(.value.name) (\(.key)): \(.value.status) - \(.value.package)"' clients/clients-config.json
else
  check 1 "clients-config.json not found"
fi

echo ""

# Check each client .env file
echo "  Client .env Files:"
for client in instantautotraders hottyres sadcdisabilityservices theprofitplatform; do
  if [ -f "clients/$client.env" ]; then
    # Check if has WordPress password
    if grep -q "WORDPRESS_APP_PASSWORD=.*[A-Za-z0-9]" "clients/$client.env" 2>/dev/null; then
      check 0 "$client.env exists with WordPress password"
    else
      warn "$client.env exists but missing WordPress password"
    fi

    # Check Discord webhook
    if grep -q "DISCORD_WEBHOOK_URL=https://" "clients/$client.env" 2>/dev/null; then
      info "$client.env has Discord webhook configured"
    fi
  else
    check 1 "$client.env not found"
  fi
done

echo ""

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  WORDPRESS CONNECTIVITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "  Testing WordPress connections..."
echo ""

# Run the comprehensive test
if [ -f "test-all-clients.js" ]; then
  node test-all-clients.js 2>&1 | grep -E "Testing|✅|❌|━"
else
  warn "test-all-clients.js not found"
fi

echo ""

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  PM2 AUTOMATION STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if PM2 is running
if pm2 list &>/dev/null; then
  check 0 "PM2 daemon is running"

  echo ""
  echo "  PM2 Process Status:"

  # Check seo-audit-all
  if pm2 describe seo-audit-all &>/dev/null; then
    STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="seo-audit-all") | .pm2_env.status')
    CRON=$(pm2 describe seo-audit-all 2>/dev/null | grep "cron restart" | awk '{print $4}')

    if [ "$STATUS" == "online" ] || [ "$STATUS" == "stopped" ]; then
      check 0 "seo-audit-all configured (status: $STATUS, cron: $CRON)"
    else
      warn "seo-audit-all exists but status: $STATUS"
    fi
  else
    check 1 "seo-audit-all not configured in PM2"
  fi

  # Check client-status-check
  if pm2 describe client-status-check &>/dev/null; then
    STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="client-status-check") | .pm2_env.status')
    CRON=$(pm2 describe client-status-check 2>/dev/null | grep "cron restart" | awk '{print $4}')

    if [ "$STATUS" == "online" ] || [ "$STATUS" == "stopped" ]; then
      check 0 "client-status-check configured (status: $STATUS, cron: $CRON)"
    else
      warn "client-status-check exists but status: $STATUS"
    fi
  else
    warn "client-status-check not configured in PM2"
  fi

  # Check generate-reports
  if pm2 describe generate-reports &>/dev/null; then
    STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="generate-reports") | .pm2_env.status')
    CRON=$(pm2 describe generate-reports 2>/dev/null | grep "cron restart" | awk '{print $4}')

    if [ "$STATUS" == "online" ] || [ "$STATUS" == "stopped" ]; then
      info "generate-reports configured (status: $STATUS, cron: $CRON)"
    else
      warn "generate-reports exists but status: $STATUS"
    fi
  else
    warn "generate-reports not configured in PM2"
  fi

else
  check 1 "PM2 daemon not running"
fi

echo ""

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  AUDIT REPORTS & LOGS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check logs directory
if [ -d "logs" ]; then
  check 0 "logs/ directory exists"
else
  check 1 "logs/ directory not found"
fi

# Check for today's audit reports
TODAY=$(date +%Y-%m-%d)
echo ""
echo "  Today's Audit Reports ($TODAY):"

for client in instantautotraders hottyres sadcdisabilityservices; do
  HTML_REPORT="logs/clients/$client/audit-$TODAY.html"

  if [ -f "$HTML_REPORT" ]; then
    SIZE=$(ls -lh "$HTML_REPORT" | awk '{print $5}')
    LINES=$(wc -l < "$HTML_REPORT")
    check 0 "$client audit report exists ($SIZE, $LINES lines)"
  else
    warn "$client audit report not found for today"
  fi
done

echo ""

# Check for recent reports
echo "  Recent Audit Activity:"
RECENT_AUDITS=$(find logs/clients -name "audit-*.html" -mtime -7 | wc -l)
if [ $RECENT_AUDITS -gt 0 ]; then
  info "Found $RECENT_AUDITS audit report(s) in the last 7 days"
  find logs/clients -name "audit-*.html" -mtime -7 -exec ls -lh {} \; | awk '{print "    •", $9, "("$5")"}'
else
  warn "No recent audit reports found (last 7 days)"
fi

echo ""

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  DISCORD INTEGRATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Discord webhook configuration
WEBHOOK_COUNT=$(grep -h "DISCORD_WEBHOOK_URL=https://" clients/*.env 2>/dev/null | wc -l)

if [ $WEBHOOK_COUNT -eq 4 ]; then
  check 0 "Discord webhooks configured for all 4 clients"
elif [ $WEBHOOK_COUNT -gt 0 ]; then
  warn "Discord webhooks configured for $WEBHOOK_COUNT/4 clients"
else
  check 1 "No Discord webhooks configured"
fi

# Check Discord notification script
if [ -f "send-discord-quick.cjs" ]; then
  check 0 "Discord notification script exists"
else
  warn "send-discord-quick.cjs not found"
fi

echo ""

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  CORE SCRIPTS & FILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "  Essential Scripts:"

# Core audit scripts
[ -f "audit-all-clients.js" ] && check 0 "audit-all-clients.js" || check 1 "audit-all-clients.js missing"
[ -f "audit-client.js" ] && check 0 "audit-client.js" || check 1 "audit-client.js missing"
[ -f "client-manager.js" ] && check 0 "client-manager.js" || check 1 "client-manager.js missing"
[ -f "client-status.js" ] && check 0 "client-status.js" || warn "client-status.js missing"

echo ""
echo "  Test & Utility Scripts:"

# Test scripts
[ -f "test-all-clients.js" ] && check 0 "test-all-clients.js" || warn "test-all-clients.js missing"
[ -f "verify-integration.sh" ] && check 0 "verify-integration.sh" || warn "verify-integration.sh missing"

echo ""
echo "  Configuration Files:"

# Config files
[ -f "ecosystem.config.cjs" ] && check 0 "ecosystem.config.cjs (PM2)" || check 1 "ecosystem.config.cjs missing"
[ -f ".gitignore" ] && check 0 ".gitignore" || warn ".gitignore missing"

echo ""
echo "  Documentation:"

# Docs
[ -f "README.md" ] && check 0 "README.md" || warn "README.md missing"
[ -f "INTEGRATION-COMPLETE.md" ] && check 0 "INTEGRATION-COMPLETE.md" || warn "INTEGRATION-COMPLETE.md missing"

echo ""

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  SECURITY & GIT STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check .gitignore protects secrets
if [ -f ".gitignore" ]; then
  if grep -q "\.env" .gitignore && grep -q "credentials" .gitignore; then
    check 0 ".gitignore protects .env and credentials"
  else
    check 1 ".gitignore does not protect sensitive files"
  fi
fi

# Check git repository
if [ -d ".git" ]; then
  check 0 "Git repository initialized"

  # Check remote
  if git remote -v | grep -q "github.com"; then
    REMOTE=$(git remote get-url origin 2>/dev/null)
    info "Git remote configured: $REMOTE"
  else
    warn "No GitHub remote configured"
  fi

  # Check for uncommitted changes
  if [ -n "$(git status --porcelain)" ]; then
    CHANGED=$(git status --porcelain | wc -l)
    warn "$CHANGED uncommitted change(s)"
  else
    info "Working directory clean"
  fi
else
  warn "Not a git repository"
fi

echo ""

# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL=$((PASS + FAIL + WARN))

echo "  ✅ Passed:   $PASS/$TOTAL"
echo "  ❌ Failed:   $FAIL/$TOTAL"
echo "  ⚠️  Warnings: $WARN/$TOTAL"
echo ""

if [ $FAIL -eq 0 ]; then
  if [ $WARN -eq 0 ]; then
    echo "  🎉 PERFECT! System is fully operational!"
  else
    echo "  ✅ System is operational with minor warnings"
  fi
else
  echo "  ⚠️  System has critical issues that need attention"
fi

echo ""

# Next automated run
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ NEXT SCHEDULED RUNS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Calculate next midnight
NEXT_MIDNIGHT=$(date -d 'tomorrow 00:00' '+%Y-%m-%d %H:%M:%S')
echo "  📊 Daily Audit:        Tonight at 00:00 ($NEXT_MIDNIGHT)"

# Calculate next 6-hour interval
CURRENT_HOUR=$(date +%H)
NEXT_6H=$((((CURRENT_HOUR / 6) + 1) * 6))
if [ $NEXT_6H -ge 24 ]; then
  NEXT_6H_TIME=$(date -d 'tomorrow 00:00' '+%Y-%m-%d %H:%M:%S')
else
  NEXT_6H_TIME=$(date -d "today $NEXT_6H:00" '+%Y-%m-%d %H:%M:%S')
fi
echo "  🏥 Health Check:       Next run at $NEXT_6H_TIME"

echo ""
echo "  View PM2 logs:         pm2 logs seo-audit-all"
echo "  View PM2 status:       pm2 list"
echo "  Manual audit:          node audit-all-clients.js"
echo "  Send to Discord:       node send-discord-quick.cjs <webhook>"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $FAIL
