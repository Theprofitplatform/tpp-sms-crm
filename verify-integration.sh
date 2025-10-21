#!/bin/bash

# Integration Verification Script
# Checks that everything is properly configured

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Integration Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_total=0

# Function to check something
check() {
    local description=$1
    local command=$2

    ((checks_total++))

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $description"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        return 1
    fi
}

# Function to check file exists
check_file() {
    local description=$1
    local file=$2

    ((checks_total++))

    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        return 1
    fi
}

# Function to check if file has content
check_file_content() {
    local description=$1
    local file=$2
    local pattern=$3

    ((checks_total++))

    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✅${NC} $description"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        return 1
    fi
}

echo "Checking SEO-Expert Configuration..."
echo ""

# Check directories
check "Project directory exists" "[ -d /home/avi/projects/seo-expert ]"
check "Clients directory exists" "[ -d clients ]"
check "Logs directory exists" "[ -d logs ]"
check "Source directory exists" "[ -d src ]"

echo ""
echo "Checking Client Configuration Files..."
echo ""

# Check client config
check_file "clients-config.json exists" "clients/clients-config.json"
check_file_content "Hot Tyres in config" "clients/clients-config.json" "hottyres"
check_file_content "The Profit Platform in config" "clients/clients-config.json" "theprofitplatform"
check_file_content "Instant Auto Traders in config" "clients/clients-config.json" "instantautotraders"
check_file_content "SADC Disability in config" "clients/clients-config.json" "sadcdisabilityservices"

echo ""
echo "Checking Client Environment Files..."
echo ""

# Check .env files
check_file "Hot Tyres .env file" "clients/hottyres.env"
check_file "The Profit Platform .env file" "clients/theprofitplatform.env"
check_file "Instant Auto Traders .env file" "clients/instantautotraders.env"
check_file "SADC Disability .env file" "clients/sadcdisabilityservices.env"

echo ""
echo "Checking Client Credentials..."
echo ""

# Check if credentials are filled in
for client in hottyres theprofitplatform instantautotraders sadcdisabilityservices; do
    if [ -f "clients/${client}.env" ]; then
        if grep -q "WORDPRESS_APP_PASSWORD=.\+" "clients/${client}.env" && \
           ! grep -q "WORDPRESS_APP_PASSWORD=$" "clients/${client}.env"; then
            echo -e "${GREEN}✅${NC} $client has WordPress password"
            ((checks_passed++))
        else
            echo -e "${YELLOW}⚠️${NC}  $client missing WordPress password"
        fi
        ((checks_total++))
    fi
done

echo ""
echo "Checking Node.js Environment..."
echo ""

# Check Node.js
check "Node.js installed" "command -v node"
check "npm installed" "command -v npm"
check "package.json exists" "[ -f package.json ]"
check "node_modules exists" "[ -d node_modules ]"

echo ""
echo "Checking PM2 Configuration..."
echo ""

# Check PM2
check "PM2 installed" "command -v pm2"
check "PM2 ecosystem config exists" "[ -f ecosystem.config.cjs ]"

echo ""
echo "Checking Scripts..."
echo ""

# Check key scripts
check_file "test-all-clients.js exists" "test-all-clients.js"
check_file "audit-all-clients.js exists" "audit-all-clients.js"
check_file "client-status.js exists" "client-status.js"
check_file "setup-client.js exists" "setup-client.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $checks_passed/$checks_total checks passed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $checks_passed -eq $checks_total ]; then
    echo -e "${GREEN}🎉 All checks passed! Integration is complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: node test-all-clients.js"
    echo "  2. Run: node audit-all-clients.js"
    echo "  3. Check: pm2 status"
    exit 0
elif [ $checks_passed -ge $((checks_total * 3 / 4)) ]; then
    echo -e "${YELLOW}⚠️  Almost there! A few checks failed.${NC}"
    echo ""
    echo "To complete setup:"
    echo "  1. Run: ./complete-integration.sh"
    echo "  2. Add WordPress credentials for missing clients"
    exit 1
else
    echo -e "${RED}❌ Several checks failed. Setup incomplete.${NC}"
    echo ""
    echo "To setup:"
    echo "  1. Read: cat SETUP-NOW.md"
    echo "  2. Run: ./complete-integration.sh"
    exit 2
fi
