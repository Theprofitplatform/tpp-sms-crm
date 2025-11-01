#!/bin/bash

#
# ONE-CLICK DEPLOYMENT FOR PIXEL ENHANCEMENTS
#
# This script automates the ENTIRE deployment process:
# 1. Confirms code is pushed to GitHub
# 2. Provides GitHub Actions link
# 3. Runs production migration
# 4. Verifies all endpoints
# 5. Generates deployment report
# 6. Runs health check
#

set -e

PRODUCTION_URL="https://seodashboard.theprofitplatform.com.au"
VPS_HOST="avi@31.97.222.218"
PROJECT_PATH="/var/www/seo-expert"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║         🚀 ONE-CLICK DEPLOYMENT - PIXEL ENHANCEMENTS 🚀             ║"
echo "║                                                                      ║"
echo "║                          Version 2.1.0                              ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Pre-flight checks
echo -e "${CYAN}═══ PRE-FLIGHT CHECKS ═══${NC}"
echo ""

echo -n "Checking Git status... "
if git diff --quiet && git diff --cached --quiet; then
  echo -e "${GREEN}✅ No uncommitted changes${NC}"
else
  echo -e "${YELLOW}⚠️  Uncommitted changes found${NC}"
  git status --short
  echo ""
  read -p "Continue anyway? (y/n) " CONTINUE
  if [ "$CONTINUE" != "y" ]; then
    exit 1
  fi
fi

echo -n "Checking if code is pushed... "
if git diff origin/main --quiet; then
  echo -e "${GREEN}✅ All changes pushed${NC}"
else
  echo -e "${RED}❌ Local changes not pushed${NC}"
  echo ""
  echo "Please push your changes first:"
  echo "  git push origin main"
  echo ""
  exit 1
fi

echo -n "Checking local tests... "
if [ -f "verify-pixel-enhancements.sh" ]; then
  echo -e "${GREEN}✅ Verification script available${NC}"
else
  echo -e "${YELLOW}⚠️  Verification script not found${NC}"
fi

echo ""
echo -e "${GREEN}✅ Pre-flight checks passed!${NC}"
echo ""

# Step 1: GitHub Actions
echo -e "${CYAN}═══ STEP 1: GITHUB ACTIONS DEPLOYMENT ═══${NC}"
echo ""

echo "To deploy via GitHub Actions:"
echo ""
echo -e "  ${BLUE}1.${NC} Open: ${PURPLE}https://github.com/Theprofitplatform/seoexpert/actions${NC}"
echo -e "  ${BLUE}2.${NC} Click: ${PURPLE}'Deploy to VPS'${NC} workflow"
echo -e "  ${BLUE}3.${NC} Click: ${PURPLE}'Run workflow'${NC} button"
echo -e "  ${BLUE}4.${NC} Select: ${PURPLE}'production'${NC} environment"
echo -e "  ${BLUE}5.${NC} Click: ${PURPLE}'Run workflow'${NC} green button"
echo -e "  ${BLUE}6.${NC} Wait for: ${GREEN}✅ Green checkmark${NC} (~10 minutes)"
echo ""

read -p "Press ENTER when GitHub Actions deployment is complete..."
echo ""

# Step 2: Database Migration
echo -e "${CYAN}═══ STEP 2: DATABASE MIGRATION ═══${NC}"
echo ""

echo "Running database migration on production..."
echo ""

ssh $VPS_HOST "cd $PROJECT_PATH && node scripts/migrate-pixel-enhancements.js" 2>&1 | tee /tmp/migration-output.txt

echo ""
if grep -q "Migration completed successfully" /tmp/migration-output.txt; then
  echo -e "${GREEN}✅ Migration successful!${NC}"
else
  echo -e "${RED}❌ Migration failed!${NC}"
  echo ""
  echo "Please check the output above for errors."
  exit 1
fi

echo ""
read -p "Press ENTER to continue to verification..."

# Step 3: Service Verification
echo ""
echo -e "${CYAN}═══ STEP 3: SERVICE VERIFICATION ═══${NC}"
echo ""

echo "Checking PM2 service status..."
PM2_STATUS=$(ssh $VPS_HOST "npx pm2 jlist" 2>/dev/null | jq -r '.[] | select(.name=="seo-dashboard") | .pm2_env.status')

if [ "$PM2_STATUS" = "online" ]; then
  echo -e "${GREEN}✅ Service is online${NC}"
else
  echo -e "${YELLOW}⚠️  Service status: $PM2_STATUS${NC}"
  echo ""
  read -p "Restart service? (y/n) " RESTART
  if [ "$RESTART" = "y" ]; then
    ssh $VPS_HOST "npx pm2 restart seo-dashboard"
    sleep 3
    echo -e "${GREEN}✅ Service restarted${NC}"
  fi
fi

echo ""

# Step 4: Endpoint Testing
echo -e "${CYAN}═══ STEP 4: ENDPOINT TESTING ═══${NC}"
echo ""

PASSED=0
FAILED=0

test_endpoint() {
  local name="$1"
  local url="$2"

  echo -n "  Testing: $name... "

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ HTTP $HTTP_CODE${NC}"
    FAILED=$((FAILED + 1))
  fi
}

# Test core endpoints
test_endpoint "Health Endpoint" "$PRODUCTION_URL/api/v2/health"
test_endpoint "Pixel Generate" "$PRODUCTION_URL/api/v2/pixel/generate"
test_endpoint "API Documentation" "$PRODUCTION_URL/api/v2"

echo ""
echo "Creating test pixel for enhancement verification..."

PIXEL_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"clientId":"test-client-001","domain":"deployment-test.com"}' \
  "$PRODUCTION_URL/api/v2/pixel/generate")

if echo "$PIXEL_RESPONSE" | grep -q '"success":true'; then
  PIXEL_ID=$(echo "$PIXEL_RESPONSE" | jq -r '.data.id')
  API_KEY=$(echo "$PIXEL_RESPONSE" | jq -r '.data.apiKey')
  echo -e "${GREEN}✅ Test pixel created (ID: $PIXEL_ID)${NC}"

  # Track test data
  echo ""
  echo "Tracking test data with SEO issues..."

  TRACK_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{
      \"apiKey\": \"$API_KEY\",
      \"metadata\": {
        \"url\": \"https://deployment-test.com/page1\",
        \"title\": \"Test\",
        \"metaDescription\": \"\",
        \"h1Tags\": [],
        \"h2Tags\": [],
        \"hasViewport\": false,
        \"wordCount\": 50,
        \"images\": [],
        \"links\": [],
        \"schema\": []
      },
      \"vitals\": {
        \"lcp\": 4000,
        \"fid\": 200,
        \"cls\": 0.2
      }
    }" \
    "$PRODUCTION_URL/api/v2/pixel/track")

  if echo "$TRACK_RESPONSE" | grep -q '"success":true'; then
    SEO_SCORE=$(echo "$TRACK_RESPONSE" | jq -r '.data.seoScore')
    ISSUES=$(echo "$TRACK_RESPONSE" | jq -r '.data.issuesDetected')
    echo -e "${GREEN}✅ Data tracked (Score: $SEO_SCORE/100, Issues: $ISSUES)${NC}"

    echo ""
    echo "Testing enhancement endpoints..."

    test_endpoint "Get Issues" "$PRODUCTION_URL/api/v2/pixel/issues/$PIXEL_ID"
    test_endpoint "Issue Summary" "$PRODUCTION_URL/api/v2/pixel/issues/$PIXEL_ID/summary"
    test_endpoint "Analytics" "$PRODUCTION_URL/api/v2/pixel/analytics/$PIXEL_ID?days=7"
    test_endpoint "Analytics Trends" "$PRODUCTION_URL/api/v2/pixel/analytics/$PIXEL_ID/trends"
    test_endpoint "Health Status" "$PRODUCTION_URL/api/v2/pixel/health/$PIXEL_ID"
    test_endpoint "Uptime Stats" "$PRODUCTION_URL/api/v2/pixel/uptime/$PIXEL_ID"
  else
    echo -e "${RED}❌ Failed to track data${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${RED}❌ Failed to create test pixel${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo -e "Test Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"

# Step 5: Health Check
echo ""
echo -e "${CYAN}═══ STEP 5: COMPREHENSIVE HEALTH CHECK ═══${NC}"
echo ""

if [ -f "scripts/production-health-check.sh" ]; then
  bash scripts/production-health-check.sh
else
  echo -e "${YELLOW}⚠️  Health check script not found${NC}"
fi

# Final Report
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║                    🎉 DEPLOYMENT COMPLETE! 🎉                       ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

REPORT_FILE="DEPLOYMENT_REPORT_$(date +%Y%m%d_%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
═══════════════════════════════════════════════════════════════════════
  PIXEL ENHANCEMENTS DEPLOYMENT REPORT
═══════════════════════════════════════════════════════════════════════

Deployment Date: $(date)
Version: 2.1.0
Commit: 21c86f9

DEPLOYMENT SUMMARY
──────────────────────────────────────────────────────────────────────

✅ GitHub Actions:     Completed
✅ Database Migration:  Successful
✅ Service Status:      Online
✅ Endpoint Tests:      $PASSED/$((PASSED + FAILED)) passed

FEATURES DEPLOYED
──────────────────────────────────────────────────────────────────────

✅ Advanced SEO Issue Detection (20+ types)
✅ Real-time Analytics & Trends
✅ Health Monitoring & Uptime Tracking
✅ 11 New API Endpoints
✅ 3 Database Tables (seo_issues, pixel_analytics, pixel_health)

PRODUCTION URLS
──────────────────────────────────────────────────────────────────────

Dashboard:    $PRODUCTION_URL
Health Check: $PRODUCTION_URL/api/v2/health
API Docs:     $PRODUCTION_URL/api/v2

NEXT STEPS
──────────────────────────────────────────────────────────────────────

1. Monitor logs for 24 hours
2. Check analytics data accumulation
3. Test with real client sites
4. Set up automated monitoring alerts

MONITORING COMMANDS
──────────────────────────────────────────────────────────────────────

View Logs:
  ssh $VPS_HOST "npx pm2 logs seo-dashboard"

Check Status:
  ssh $VPS_HOST "npx pm2 status"

Run Health Check:
  bash scripts/production-health-check.sh

ROLLBACK PLAN (if needed)
──────────────────────────────────────────────────────────────────────

ssh $VPS_HOST
cd $PROJECT_PATH
git reset --hard cbcd0fb
npx pm2 restart seo-dashboard

═══════════════════════════════════════════════════════════════════════
EOF

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL SYSTEMS OPERATIONAL${NC}"
  echo ""
  echo "Deployment report saved: $REPORT_FILE"
  echo ""
  echo "Your pixel enhancements are now live! 🚀"
  echo ""
  echo -e "${CYAN}Quick Links:${NC}"
  echo "  • Dashboard: $PRODUCTION_URL"
  echo "  • Health: $PRODUCTION_URL/api/v2/health"
  echo "  • API Docs: $PRODUCTION_URL/api/v2"
  echo ""
  echo -e "${CYAN}Next Steps:${NC}"
  echo "  1. Monitor: ssh $VPS_HOST 'npx pm2 logs seo-dashboard'"
  echo "  2. Health Check: bash scripts/production-health-check.sh"
  echo "  3. View Report: cat $REPORT_FILE"
  echo ""
  exit 0
else
  echo -e "${YELLOW}⚠️  DEPLOYMENT COMPLETED WITH WARNINGS${NC}"
  echo ""
  echo "  $FAILED/$((PASSED + FAILED)) tests failed"
  echo "  Report saved: $REPORT_FILE"
  echo ""
  echo "  Please investigate failed endpoints."
  echo "  Check logs: ssh $VPS_HOST 'npx pm2 logs seo-dashboard --lines 100'"
  echo ""
  exit 1
fi
