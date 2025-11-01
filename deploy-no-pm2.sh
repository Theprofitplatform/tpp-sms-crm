#!/bin/bash

################################################################################
# Production Deployment Script - Manual Review System (No PM2)
# For environments where PM2 cannot be installed
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Manual Review System - Production Deployment (No PM2)    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 Phase 1: Pre-Flight Checks${NC}"
echo ""

echo -n "Checking Node.js version... "
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$NODE_MAJOR" -ge 18 ]; then
  echo -e "${GREEN}✓${NC} v$NODE_VERSION"
else
  echo -e "${RED}✗${NC} Requires >= 18.0.0"
  exit 1
fi

echo -n "Checking npm... "
npm --version > /dev/null && echo -e "${GREEN}✓${NC} $(npm --version)"

echo ""
echo "Running health check..."
node scripts/health-check.js && echo -e "${GREEN}✓${NC} Health check passed" || (echo -e "${RED}✗${NC} Failed" && exit 1)

echo ""
echo -e "${GREEN}✓ Pre-flight checks completed!${NC}"
echo ""

echo -e "${YELLOW}🔧 Phase 2: Environment Setup${NC}"
echo ""

mkdir -p logs data reports backups
echo -e "${GREEN}✓${NC} Directories created"

# Update NODE_ENV to production
if grep -q "NODE_ENV=" .env; then
  sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
  echo -e "${GREEN}✓${NC} NODE_ENV set to production"
else
  echo "NODE_ENV=production" >> .env
  echo -e "${GREEN}✓${NC} NODE_ENV added and set to production"
fi

echo ""
echo -e "${GREEN}✓ Environment setup completed!${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 Deployment Complete! 🎉                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📊 To start the server:"
echo ""
echo "  # Option 1: Simple start"
echo "  npm start"
echo ""
echo "  # Option 2: Production mode"
echo "  NODE_ENV=production node src/index.js"
echo ""
echo "  # Option 3: Background with nohup"
echo "  nohup npm start > logs/server.log 2>&1 &"
echo ""
echo "📚 Documentation: MANUAL_REVIEW_README.md"
echo ""
echo -e "${GREEN}✅ Ready to start!${NC}"
echo ""
