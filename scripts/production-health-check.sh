#!/bin/bash

#
# PRODUCTION HEALTH CHECK SCRIPT
#
# Comprehensive health monitoring for pixel enhancements
# Can be run manually or via cron for continuous monitoring
#

PRODUCTION_URL="https://seodashboard.theprofitplatform.com.au"
VPS_HOST="avi@31.97.222.218"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "  🏥 Production Health Check - Pixel Enhancements"
echo "  Time: $TIMESTAMP"
echo "════════════════════════════════════════════════════════════════════"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# Check 1: Health Endpoint
echo -n "1. Health Endpoint... "
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$PRODUCTION_URL/api/v2/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
  VERSION=$(echo "$HEALTH_RESPONSE" | head -n -1 | jq -r '.version' 2>/dev/null)
  echo -e "${GREEN}✅ OK${NC} (v$VERSION)"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $HTTP_CODE)"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

# Check 2: Database Tables
echo -n "2. Database Tables... "
TABLES_CHECK=$(ssh $VPS_HOST "cd /var/www/seo-expert && node -e '
import Database from \"better-sqlite3\";
const db = new Database(\"./data/seo-automation.db\");
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type=\\\"table\\\" AND name IN (\\\"seo_issues\\\", \\\"pixel_analytics\\\", \\\"pixel_health\\\")\").all();
console.log(tables.length);
db.close();
'" 2>/dev/null)

if [ "$TABLES_CHECK" = "3" ]; then
  echo -e "${GREEN}✅ OK${NC} (3/3 tables exist)"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${RED}❌ FAIL${NC} ($TABLES_CHECK/3 tables found)"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

# Check 3: PM2 Service
echo -n "3. PM2 Service Status... "
PM2_STATUS=$(ssh $VPS_HOST "npx pm2 jlist" 2>/dev/null | jq -r '.[] | select(.name=="seo-dashboard") | .pm2_env.status')
if [ "$PM2_STATUS" = "online" ]; then
  UPTIME=$(ssh $VPS_HOST "npx pm2 jlist" 2>/dev/null | jq -r '.[] | select(.name=="seo-dashboard") | .pm2_env.pm_uptime')
  UPTIME_HUMAN=$(date -d @$(($UPTIME/1000)) +'%H:%M:%S' 2>/dev/null || echo "N/A")
  echo -e "${GREEN}✅ OK${NC} (uptime: $UPTIME_HUMAN)"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${RED}❌ FAIL${NC} (status: $PM2_STATUS)"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

# Check 4: Recent Errors in Logs
echo -n "4. Recent Error Logs... "
ERROR_COUNT=$(ssh $VPS_HOST "npx pm2 logs seo-dashboard --err --lines 50 --nostream 2>/dev/null | grep -c 'Error'" 2>/dev/null || echo "0")
if [ "$ERROR_COUNT" -lt 5 ]; then
  echo -e "${GREEN}✅ OK${NC} ($ERROR_COUNT errors in last 50 lines)"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${YELLOW}⚠️  WARNING${NC} ($ERROR_COUNT errors found)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 5: Pixel Endpoints
echo ""
echo "Testing Pixel Enhancement Endpoints:"

test_endpoint() {
  local name="$1"
  local endpoint="$2"

  echo -n "  • $name... "
  RESPONSE=$(curl -s -w "\n%{http_code}" "$PRODUCTION_URL$endpoint")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    return 0
  else
    echo -e "${RED}❌ HTTP $HTTP_CODE${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    return 1
  fi
}

# Test sample endpoints (using existing pixel if available)
SAMPLE_PIXEL=$(curl -s "$PRODUCTION_URL/api/v2/pixel/status/test-client-001" 2>/dev/null | jq -r '.data[0].id' 2>/dev/null)

if [ -n "$SAMPLE_PIXEL" ] && [ "$SAMPLE_PIXEL" != "null" ]; then
  test_endpoint "Get Issues" "/api/v2/pixel/issues/$SAMPLE_PIXEL"
  test_endpoint "Issue Summary" "/api/v2/pixel/issues/$SAMPLE_PIXEL/summary"
  test_endpoint "Analytics" "/api/v2/pixel/analytics/$SAMPLE_PIXEL?days=7"
  test_endpoint "Health Status" "/api/v2/pixel/health/$SAMPLE_PIXEL"
else
  echo -e "  ${YELLOW}⚠️  No test pixel found, skipping endpoint tests${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 6: Database Size
echo ""
echo -n "6. Database Size... "
DB_SIZE=$(ssh $VPS_HOST "du -h /var/www/seo-expert/data/seo-automation.db" 2>/dev/null | awk '{print $1}')
if [ -n "$DB_SIZE" ]; then
  echo -e "${GREEN}✅ OK${NC} ($DB_SIZE)"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${YELLOW}⚠️  WARNING${NC} (could not check)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 7: Disk Space
echo -n "7. Disk Space... "
DISK_USAGE=$(ssh $VPS_HOST "df -h /var/www/seo-expert | tail -1" 2>/dev/null | awk '{print $5}' | tr -d '%')
if [ -n "$DISK_USAGE" ]; then
  if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✅ OK${NC} (${DISK_USAGE}% used)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${YELLOW}⚠️  WARNING${NC} (${DISK_USAGE}% used - cleanup recommended)"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo -e "${YELLOW}⚠️  WARNING${NC} (could not check)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 8: Data Collection Stats
echo -n "8. Data Collection... "
ISSUES_COUNT=$(ssh $VPS_HOST "cd /var/www/seo-expert && node -e '
import Database from \"better-sqlite3\";
const db = new Database(\"./data/seo-automation.db\");
const count = db.prepare(\"SELECT COUNT(*) as count FROM seo_issues\").get();
console.log(count.count);
db.close();
'" 2>/dev/null)

if [ -n "$ISSUES_COUNT" ]; then
  echo -e "${GREEN}✅ OK${NC} ($ISSUES_COUNT issues tracked)"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${YELLOW}⚠️  WARNING${NC} (could not check)"
  WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "  📊 Health Check Summary"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}✅ Passed:${NC}   $CHECKS_PASSED"
echo -e "  ${RED}❌ Failed:${NC}   $CHECKS_FAILED"
echo -e "  ${YELLOW}⚠️  Warnings:${NC} $WARNINGS"
echo ""

TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED + WARNINGS))
SUCCESS_RATE=$(echo "scale=1; $CHECKS_PASSED * 100 / $TOTAL_CHECKS" | bc)

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "  Overall Status: ${GREEN}✅ HEALTHY${NC} (${SUCCESS_RATE}%)"
  echo ""

  if [ $WARNINGS -gt 0 ]; then
    echo "  Note: $WARNINGS warning(s) detected but system is operational"
  fi

  exit 0
else
  echo -e "  Overall Status: ${RED}❌ UNHEALTHY${NC}"
  echo ""
  echo "  ⚠️  Critical issues detected. Please investigate:"
  echo "     • Check PM2 logs: ssh $VPS_HOST 'npx pm2 logs seo-dashboard'"
  echo "     • Verify service status: ssh $VPS_HOST 'npx pm2 status'"
  echo "     • Check database: ssh $VPS_HOST 'cd /var/www/seo-expert && node scripts/troubleshoot.js'"
  echo ""
  exit 1
fi
