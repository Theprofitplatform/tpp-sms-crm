#!/bin/bash
#
# Deployment Verification Script
# Run this AFTER deploying to verify everything is working
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║           🔍 SEO Expert Platform - Deployment Verification    ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

DOMAIN="seodashboard.theprofitplatform.com.au"
VPS_HOST="31.97.222.218"
VPS_USER="avi"

# Test 1: DNS Resolution
echo -e "${BLUE}[1/10]${NC} Testing DNS resolution..."
if host "$DOMAIN" > /dev/null 2>&1; then
    IP=$(host "$DOMAIN" | grep "has address" | awk '{print $4}' | head -1)
    echo -e "${GREEN}✅ DNS resolves to: $IP${NC}"
else
    echo -e "${RED}❌ DNS resolution failed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: HTTPS Connectivity
echo ""
echo -e "${BLUE}[2/10]${NC} Testing HTTPS connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --max-time 10 || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    echo -e "${GREEN}✅ HTTPS accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ HTTPS not accessible (HTTP $HTTP_CODE)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 3: Health Endpoint
echo ""
echo -e "${BLUE}[3/10]${NC} Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "https://$DOMAIN/api/v2/health" --max-time 10 || echo "")
if echo "$HEALTH_RESPONSE" | grep -q '"success":true'; then
    VERSION=$(echo "$HEALTH_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    UPTIME=$(echo "$HEALTH_RESPONSE" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ Health endpoint responding${NC}"
    echo "   Version: $VERSION"
    echo "   Uptime: ${UPTIME}s"
else
    echo -e "${RED}❌ Health endpoint not responding correctly${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    ERRORS=$((ERRORS + 1))
fi

# Test 4: Otto Pixel API
echo ""
echo -e "${BLUE}[4/10]${NC} Testing Otto Pixel API..."
PIXEL_RESPONSE=$(curl -s "https://$DOMAIN/api/v2/pixel/status/test-client" --max-time 10 || echo "")
if echo "$PIXEL_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Pixel API responding${NC}"
else
    echo -e "${RED}❌ Pixel API not responding${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 5: Otto Schema API
echo ""
echo -e "${BLUE}[5/10]${NC} Testing Otto Schema API..."
SCHEMA_RESPONSE=$(curl -s "https://$DOMAIN/api/v2/schema/opportunities/test-domain.com" --max-time 10 || echo "")
if echo "$SCHEMA_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Schema API responding${NC}"
else
    echo -e "${RED}❌ Schema API not responding${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 6: Otto SSR API
echo ""
echo -e "${BLUE}[6/10]${NC} Testing Otto SSR API..."
SSR_RESPONSE=$(curl -s "https://$DOMAIN/api/v2/ssr/config" --max-time 10 || echo "")
if echo "$SSR_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ SSR API responding${NC}"
else
    echo -e "${RED}❌ SSR API not responding${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 7: SSL Certificate
echo ""
echo -e "${BLUE}[7/10]${NC} Testing SSL certificate..."
SSL_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
if [ -n "$SSL_INFO" ]; then
    echo -e "${GREEN}✅ SSL certificate valid${NC}"
    echo "$SSL_INFO" | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  Could not verify SSL certificate${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 8: Response Time
echo ""
echo -e "${BLUE}[8/10]${NC} Testing response time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "https://$DOMAIN/api/v2/health" --max-time 10 || echo "0")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)
if (( $(echo "$RESPONSE_TIME < 2" | bc -l) )); then
    echo -e "${GREEN}✅ Response time: ${RESPONSE_MS}ms${NC}"
elif (( $(echo "$RESPONSE_TIME < 5" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Response time: ${RESPONSE_MS}ms (acceptable but could be faster)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${RED}❌ Response time: ${RESPONSE_MS}ms (too slow)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 9: VPS PM2 Status (if SSH available)
echo ""
echo -e "${BLUE}[9/10]${NC} Testing VPS PM2 status..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes "$VPS_USER@$VPS_HOST" "npx pm2 status" > /dev/null 2>&1; then
    PM2_STATUS=$(ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "npx pm2 list | grep seo-dashboard")
    if echo "$PM2_STATUS" | grep -q "online"; then
        echo -e "${GREEN}✅ PM2 process online${NC}"
        echo "$PM2_STATUS" | sed 's/^/   /'
    else
        echo -e "${RED}❌ PM2 process not online${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Cannot verify PM2 status (SSH not available from this location)${NC}"
    echo "   Run manually: ssh $VPS_USER@$VPS_HOST 'npx pm2 status'"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 10: Cloudflare Protection
echo ""
echo -e "${BLUE}[10/10]${NC} Testing Cloudflare protection..."
HEADERS=$(curl -s -I "https://$DOMAIN" --max-time 10)
if echo "$HEADERS" | grep -qi "cloudflare"; then
    CF_RAY=$(echo "$HEADERS" | grep -i "cf-ray" | cut -d':' -f2 | tr -d ' \r')
    echo -e "${GREEN}✅ Cloudflare protection active${NC}"
    echo "   CF-Ray: $CF_RAY"
else
    echo -e "${YELLOW}⚠️  Cloudflare headers not detected${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - DEPLOYMENT SUCCESSFUL!${NC}"
    echo ""
    echo "🎉 Your application is live and fully operational!"
    echo ""
    echo "📊 Next Steps:"
    echo "  1. Set up external monitoring (UptimeRobot)"
    echo "  2. Test Otto features in production"
    echo "  3. Review OPERATIONS_GUIDE.md for daily tasks"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  CHECKS PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Your application is operational but some minor issues were detected."
    echo "Review the warnings above."
    exit 0
else
    echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  1. Check PM2 status: ssh $VPS_USER@$VPS_HOST 'npx pm2 status'"
    echo "  2. Check logs: ssh $VPS_USER@$VPS_HOST 'npx pm2 logs seo-dashboard --lines 50'"
    echo "  3. Restart service: ssh $VPS_USER@$VPS_HOST 'npx pm2 restart seo-dashboard'"
    echo "  4. Verify Cloudflare Tunnel: https://one.dash.cloudflare.com"
    echo ""
    echo "📖 See OPERATIONS_GUIDE.md for detailed troubleshooting steps"
    exit 1
fi
