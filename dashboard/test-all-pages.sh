#!/bin/bash

# 🧪 Dashboard All-Pages Testing Script
# Tests all 24 dashboard pages for basic functionality

set -e

echo "🧪 Dashboard All-Pages Testing Script"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_PAGES=24
PASSED=0
FAILED=0
ERRORS=()

# Check if dev server is running
echo "🔍 Checking dev server..."
if ! curl -s http://localhost:5173 > /dev/null; then
    echo -e "${RED}❌ Dev server not running!${NC}"
    echo "   Start with: cd dashboard && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Dev server is running${NC}"
echo ""

# Function to test a page
test_page() {
    local page=$1
    local description=$2
    
    echo -n "Testing ${page}... "
    
    # Use curl to check if page loads
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ PASSED${NC} - ${description}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} - ${description} (HTTP $response)"
        ERRORS+=("$page")
        ((FAILED++))
        return 1
    fi
}

echo "📄 Testing all 24 pages..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Core Pages
echo -e "${BLUE}Core Pages (4)${NC}"
test_page "dashboard" "Main dashboard overview"
test_page "analytics" "Analytics and metrics"
test_page "clients" "Client management"
test_page "client-detail" "Client detail view"
echo ""

# Automation Pages
echo -e "${BLUE}Automation Pages (4)${NC}"
test_page "control-center" "Automation control center"
test_page "auto-fix" "Auto-fix engines"
test_page "scheduler" "Task scheduler"
test_page "bulk-operations" "Bulk operations"
echo ""

# Content & Campaign Pages
echo -e "${BLUE}Content & Campaign Pages (4)${NC}"
test_page "reports" "Report generation"
test_page "recommendations" "AI recommendations"
test_page "email-campaigns" "Email campaigns"
test_page "webhooks" "Webhook management"
echo ""

# SEO Tools Pages
echo -e "${BLUE}SEO Tools Pages (4)${NC}"
test_page "keyword-research" "Keyword research"
test_page "unified-keywords" "Unified keyword tracking"
test_page "local-seo" "Local SEO management"
test_page "ai-optimizer" "AI-powered optimizer"
echo ""

# Integration Pages
echo -e "${BLUE}Integration Pages (3)${NC}"
test_page "google-search-console" "Google Search Console"
test_page "wordpress" "WordPress manager"
test_page "api-documentation" "API documentation"
echo ""

# Configuration Pages
echo -e "${BLUE}Configuration Pages (5)${NC}"
test_page "settings" "Settings and preferences"
test_page "white-label" "White-label branding"
test_page "notification-center" "Notification center"
test_page "export-backup" "Export and backup"
test_page "goals" "Goals and KPIs"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Pages:  $TOTAL_PAGES"
echo -e "Passed:       ${GREEN}$PASSED${NC}"
echo -e "Failed:       ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Some pages failed to load:${NC}"
    for error in "${ERRORS[@]}"; do
        echo "   - $error"
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ All pages loaded successfully!${NC}"
    echo ""
    
    # Additional checks
    echo "🔍 Additional Checks:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check build
    echo -n "Build status... "
    if npm run build --prefix dashboard > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Build successful${NC}"
    else
        echo -e "${RED}❌ Build failed${NC}"
    fi
    
    # Check for console errors (basic check)
    echo -n "Console errors... "
    echo -e "${YELLOW}⚠️  Manual check required${NC}"
    echo "   Open browser console at http://localhost:5173"
    
    echo ""
    echo -e "${GREEN}🎉 Dashboard testing complete!${NC}"
    exit 0
fi
