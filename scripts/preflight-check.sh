#!/bin/bash
#
# Pre-flight Check Script
# Run this BEFORE deploying to verify everything is ready
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "================================================"
echo "✈️  Pre-flight Deployment Check"
echo "================================================"
echo ""

# Check 1: Git status
echo "1. Checking git status..."
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
else
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    git status --short
    WARNINGS=$((WARNINGS + 1))
fi

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
    echo -e "${GREEN}✅ On main branch${NC}"
else
    echo -e "${YELLOW}⚠️  Not on main branch (current: $CURRENT_BRANCH)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 2: Run tests
echo ""
echo "2. Running tests..."
if node test-otto-features.js > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All tests passing${NC}"
else
    echo -e "${RED}❌ Tests failing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Build dashboard
echo ""
echo "3. Testing dashboard build..."
cd dashboard
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dashboard builds successfully${NC}"
else
    echo -e "${RED}❌ Dashboard build failed${NC}"
    ERRORS=$((ERRORS + 1))
fi
cd ..

# Check 4: Verify PM2 config
echo ""
echo "4. Checking PM2 configuration..."
if [ -f "ecosystem.config.cjs" ]; then
    echo -e "${GREEN}✅ ecosystem.config.cjs exists${NC}"
else
    echo -e "${RED}❌ ecosystem.config.cjs not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 5: Verify deployment scripts
echo ""
echo "5. Checking deployment scripts..."
if [ -f "deploy-manual.sh" ] && [ -x "deploy-manual.sh" ]; then
    echo -e "${GREEN}✅ deploy-manual.sh exists and is executable${NC}"
else
    echo -e "${YELLOW}⚠️  deploy-manual.sh missing or not executable${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "scripts/backup-database.js" ]; then
    echo -e "${GREEN}✅ backup-database.js exists${NC}"
else
    echo -e "${RED}❌ backup-database.js not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "scripts/setup-monitoring.sh" ] && [ -x "scripts/setup-monitoring.sh" ]; then
    echo -e "${GREEN}✅ setup-monitoring.sh exists and is executable${NC}"
else
    echo -e "${YELLOW}⚠️  setup-monitoring.sh missing or not executable${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 6: Verify documentation
echo ""
echo "6. Checking documentation..."
DOCS=("OPERATIONS_GUIDE.md" "VPS_DEPLOYMENT_GUIDE.md" "DEPLOYMENT_SUMMARY.md")
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ $doc exists${NC}"
    else
        echo -e "${YELLOW}⚠️  $doc not found${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Check 7: Verify required dependencies
echo ""
echo "7. Checking dependencies..."
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Root dependencies installed${NC}"
else
    echo -e "${RED}❌ Root dependencies not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "dashboard/package.json" ] && [ -d "dashboard/node_modules" ]; then
    echo -e "${GREEN}✅ Dashboard dependencies installed${NC}"
else
    echo -e "${RED}❌ Dashboard dependencies not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 8: Check local service
echo ""
echo "8. Checking local service..."
if npx pm2 list | grep -q "seo-dashboard"; then
    if npx pm2 list | grep "seo-dashboard" | grep -q "online"; then
        echo -e "${GREEN}✅ Local service is running${NC}"

        # Test health endpoint
        if curl -f http://localhost:9000/api/v2/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health endpoint responding${NC}"
        else
            echo -e "${RED}❌ Health endpoint not responding${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Local service exists but not online${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Local service not running${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 9: Verify GitHub workflows
echo ""
echo "9. Checking GitHub workflows..."
if [ -f ".github/workflows/deploy-to-vps.yml" ]; then
    echo -e "${GREEN}✅ deploy-to-vps.yml exists${NC}"
else
    echo -e "${YELLOW}⚠️  deploy-to-vps.yml not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f ".github/workflows/update-cloudflare-tunnel.yml" ]; then
    echo -e "${GREEN}✅ update-cloudflare-tunnel.yml exists${NC}"
else
    echo -e "${YELLOW}⚠️  update-cloudflare-tunnel.yml not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 10: Check for sensitive files
echo ""
echo "10. Checking for sensitive files..."
if [ -f ".env" ]; then
    if grep -q ".env" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✅ .env in .gitignore${NC}"
    else
        echo -e "${RED}❌ .env exists but NOT in .gitignore!${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 11: Verify API routes
echo ""
echo "11. Checking API routes..."
if curl -s http://localhost:9000/api/v2/pixel/status/test-client | grep -q "success"; then
    echo -e "${GREEN}✅ Pixel API working${NC}"
else
    echo -e "${RED}❌ Pixel API not responding${NC}"
    ERRORS=$((ERRORS + 1))
fi

if curl -s http://localhost:9000/api/v2/schema/opportunities/test-domain | grep -q "success"; then
    echo -e "${GREEN}✅ Schema API working${NC}"
else
    echo -e "${RED}❌ Schema API not responding${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "================================================"
echo "📊 Pre-flight Check Summary"
echo "================================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Commit and push any changes"
    echo "2. Deploy using one of these methods:"
    echo "   a) GitHub Actions: Go to Actions → 'Deploy to VPS' → Run workflow"
    echo "   b) Manual: SSH to VPS and run ./deploy-manual.sh"
    echo "3. Verify deployment at https://seodashboard.theprofitplatform.com.au"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  CHECKS PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Warnings: $WARNINGS"
    echo ""
    echo "You can proceed with deployment, but review warnings above."
    exit 0
else
    echo -e "${RED}❌ CHECKS FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Please fix errors before deploying."
    exit 1
fi
