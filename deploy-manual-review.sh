#!/bin/bash

################################################################################
# Production Deployment Script - Manual Review System
#
# Usage:
#   chmod +x deploy-manual-review.sh
#   ./deploy-manual-review.sh                 # Full deployment
#   ./deploy-manual-review.sh --check-only    # Pre-flight checks only
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECK_ONLY=false

for arg in "$@"; do
  case $arg in
    --check-only) CHECK_ONLY=true ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Manual Review System - Production Deployment             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 Phase 1: Pre-Flight Checks${NC}"
echo ""

# Check Node.js
echo -n "Checking Node.js version... "
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$NODE_MAJOR" -ge 18 ]; then
  echo -e "${GREEN}✓${NC} v$NODE_VERSION"
else
  echo -e "${RED}✗${NC} Requires >= 18.0.0"
  exit 1
fi

# Check npm
echo -n "Checking npm... "
npm --version > /dev/null && echo -e "${GREEN}✓${NC} $(npm --version)"

# Run health check
echo ""
echo "Running health check..."
node scripts/health-check.js && echo -e "${GREEN}✓${NC} Health check passed" || (echo -e "${RED}✗${NC} Failed" && exit 1)

echo ""
echo -e "${GREEN}✓ Pre-flight checks completed!${NC}"
echo ""

[ "$CHECK_ONLY" = true ] && exit 0

echo -e "${YELLOW}🔧 Phase 2: Environment Setup${NC}"
echo ""

mkdir -p logs data reports backups
echo -e "${GREEN}✓${NC} Directories created"

echo ""
echo -e "${YELLOW}🚀 Phase 3: Install PM2${NC}"
echo ""

if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
  echo -e "${GREEN}✓${NC} PM2 installed"
else
  echo -e "${GREEN}✓${NC} PM2 already installed"
fi

echo ""
echo -e "${YELLOW}📦 Phase 4: Deploy Application${NC}"
echo ""

pm2 stop seo-expert-api 2>/dev/null || true
pm2 delete seo-expert-api 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cleaned up old processes"

pm2 start ecosystem.config.js --env production
pm2 save
echo -e "${GREEN}✓${NC} Application started"

echo ""
pm2 list

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 Deployment Complete! 🎉                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📊 Commands:"
echo "  pm2 logs seo-expert-api    # View logs"
echo "  pm2 monit                  # Monitor"
echo "  pm2 restart all            # Restart"
echo ""
echo "📚 Documentation: MANUAL_REVIEW_README.md"
echo ""
echo -e "${GREEN}✅ Ready for production!${NC}"
echo ""
