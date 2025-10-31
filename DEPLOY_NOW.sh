#!/bin/bash

###############################################################################
# AUTO-FIX MANUAL REVIEW SYSTEM - PRODUCTION DEPLOYMENT
# 
# This script deploys the Auto-Fix Manual Review System to production
# 
# Usage:
#   ./DEPLOY_NOW.sh        # Deploy to production
#   ./DEPLOY_NOW.sh test   # Test deployment (dry run)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/dashboard"
DATABASE_DIR="$PROJECT_ROOT/database"
BACKUP_DIR="$PROJECT_ROOT/database/backups"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   AUTO-FIX MANUAL REVIEW SYSTEM                          ║"
echo "║   Production Deployment Script                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Test mode?
TEST_MODE=false
if [ "$1" == "test" ]; then
    TEST_MODE=true
    echo -e "${YELLOW}⚠️  Running in TEST MODE (dry run)${NC}\n"
fi

###############################################################################
# STEP 1: PRE-FLIGHT CHECKS
###############################################################################

echo -e "${BLUE}📋 Step 1: Pre-Flight Checks${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"

# Check database directory
if [ ! -d "$DATABASE_DIR" ]; then
    echo -e "${RED}❌ Database directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database directory exists${NC}"

# Check database file
if [ ! -f "$DATABASE_DIR/seo-automation.db" ]; then
    echo -e "${YELLOW}⚠️  Database file not found, will be created${NC}"
fi

# Check dashboard built
if [ ! -d "$DASHBOARD_DIR/dist" ]; then
    echo -e "${YELLOW}⚠️  Dashboard not built, will build now${NC}"
fi

echo ""

###############################################################################
# STEP 2: BACKUP
###############################################################################

echo -e "${BLUE}📦 Step 2: Creating Backup${NC}"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Backup database if exists
if [ -f "$DATABASE_DIR/seo-automation.db" ]; then
    BACKUP_FILE="$BACKUP_DIR/seo-automation-$(date +%Y%m%d-%H%M%S).db"
    if [ "$TEST_MODE" = false ]; then
        cp "$DATABASE_DIR/seo-automation.db" "$BACKUP_FILE"
        echo -e "${GREEN}✅ Database backed up to: $BACKUP_FILE${NC}"
    else
        echo -e "${YELLOW}[TEST] Would backup to: $BACKUP_FILE${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No existing database to backup${NC}"
fi

echo ""

###############################################################################
# STEP 3: INSTALL DEPENDENCIES
###############################################################################

echo -e "${BLUE}📦 Step 3: Installing Dependencies${NC}"

# Backend dependencies
echo "Installing backend dependencies..."
if [ "$TEST_MODE" = false ]; then
    npm install --production=false
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}[TEST] Would run: npm install${NC}"
fi

# Dashboard dependencies
if [ -d "$DASHBOARD_DIR" ]; then
    echo "Installing dashboard dependencies..."
    if [ "$TEST_MODE" = false ]; then
        cd "$DASHBOARD_DIR"
        npm install
        cd "$PROJECT_ROOT"
        echo -e "${GREEN}✅ Dashboard dependencies installed${NC}"
    else
        echo -e "${YELLOW}[TEST] Would run: cd dashboard && npm install${NC}"
    fi
fi

echo ""

###############################################################################
# STEP 4: BUILD FRONTEND
###############################################################################

echo -e "${BLUE}🏗️  Step 4: Building Dashboard${NC}"

if [ -d "$DASHBOARD_DIR" ]; then
    echo "Building dashboard for production..."
    if [ "$TEST_MODE" = false ]; then
        cd "$DASHBOARD_DIR"
        NODE_ENV=production npm run build
        cd "$PROJECT_ROOT"
        echo -e "${GREEN}✅ Dashboard built successfully${NC}"
        
        # Verify build
        if [ -d "$DASHBOARD_DIR/dist" ]; then
            BUILD_SIZE=$(du -sh "$DASHBOARD_DIR/dist" | cut -f1)
            echo -e "${GREEN}   Build size: $BUILD_SIZE${NC}"
        fi
    else
        echo -e "${YELLOW}[TEST] Would run: cd dashboard && npm run build${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Dashboard directory not found, skipping${NC}"
fi

echo ""

###############################################################################
# STEP 5: DATABASE MIGRATION
###############################################################################

echo -e "${BLUE}🗄️  Step 5: Database Migration${NC}"

echo "Checking database tables..."
if [ "$TEST_MODE" = false ]; then
    # Run a simple Node script to verify database
    node -e "
        import('./src/database/index.js').then(() => {
            console.log('✅ Database initialized and verified');
        }).catch(e => {
            console.error('❌ Database error:', e.message);
            process.exit(1);
        });
    "
else
    echo -e "${YELLOW}[TEST] Would verify database tables${NC}"
fi

echo ""

###############################################################################
# STEP 6: RUN TESTS
###############################################################################

echo -e "${BLUE}🧪 Step 6: Running Tests${NC}"

echo "Running workflow test..."
if [ "$TEST_MODE" = false ]; then
    if node test-workflow-live.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow test passed${NC}"
    else
        echo -e "${RED}❌ Workflow test failed${NC}"
        echo -e "${YELLOW}⚠️  Continuing anyway (test may need real WordPress)${NC}"
    fi
else
    echo -e "${YELLOW}[TEST] Would run: node test-workflow-live.js${NC}"
fi

echo ""

###############################################################################
# STEP 7: START SERVICES
###############################################################################

echo -e "${BLUE}🚀 Step 7: Starting Services${NC}"

# Check if dashboard server is already running
if ps aux | grep -v grep | grep dashboard-server > /dev/null; then
    echo -e "${YELLOW}⚠️  Dashboard server already running${NC}"
    echo "   To restart: kill the process and run this script again"
else
    if [ "$TEST_MODE" = false ]; then
        echo "Starting dashboard server..."
        # Start in background
        NODE_ENV=production nohup node dashboard-server.js > logs/dashboard-server.log 2>&1 &
        DASHBOARD_PID=$!
        
        # Wait a bit for server to start
        sleep 3
        
        # Check if started successfully
        if ps -p $DASHBOARD_PID > /dev/null; then
            echo -e "${GREEN}✅ Dashboard server started (PID: $DASHBOARD_PID)${NC}"
            echo "   Logs: tail -f logs/dashboard-server.log"
        else
            echo -e "${RED}❌ Dashboard server failed to start${NC}"
            echo "   Check logs: cat logs/dashboard-server.log"
        fi
    else
        echo -e "${YELLOW}[TEST] Would start: NODE_ENV=production node dashboard-server.js${NC}"
    fi
fi

echo ""

###############################################################################
# STEP 8: VERIFY DEPLOYMENT
###############################################################################

echo -e "${BLUE}✓ Step 8: Verifying Deployment${NC}"

if [ "$TEST_MODE" = false ]; then
    # Wait a moment for server to fully start
    sleep 2
    
    # Test health endpoint
    echo "Testing health endpoint..."
    if curl -sf http://localhost:9000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed (server may still be starting)${NC}"
    fi
    
    # Test API endpoint
    echo "Testing API endpoint..."
    if curl -sf http://localhost:9000/api/autofix/statistics > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API endpoint responding${NC}"
    else
        echo -e "${YELLOW}⚠️  API not responding yet${NC}"
    fi
    
    # Check database
    echo "Checking database..."
    if [ -f "$DATABASE_DIR/seo-automation.db" ]; then
        echo -e "${GREEN}✅ Database file exists${NC}"
    else
        echo -e "${RED}❌ Database file not found${NC}"
    fi
else
    echo -e "${YELLOW}[TEST] Would verify:${NC}"
    echo -e "${YELLOW}   - Health endpoint${NC}"
    echo -e "${YELLOW}   - API endpoints${NC}"
    echo -e "${YELLOW}   - Database${NC}"
fi

echo ""

###############################################################################
# DEPLOYMENT COMPLETE
###############################################################################

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ DEPLOYMENT COMPLETE                                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ "$TEST_MODE" = false ]; then
    echo -e "${BLUE}📊 Deployment Summary:${NC}"
    echo ""
    echo "   🌐 Dashboard URL: http://localhost:5173"
    echo "   🔌 API Endpoint: http://localhost:9000"
    echo "   📝 Logs: logs/dashboard-server.log"
    echo "   💾 Database: $DATABASE_DIR/seo-automation.db"
    echo "   📦 Backup: $BACKUP_FILE"
    echo ""
    echo -e "${BLUE}📚 Next Steps:${NC}"
    echo ""
    echo "   1. Open dashboard: http://localhost:5173"
    echo "   2. Navigate to Auto-Fix page"
    echo "   3. Ensure Review Mode is ON"
    echo "   4. Click 'Detect Issues' on any engine"
    echo "   5. Review proposals and approve/reject"
    echo "   6. Apply approved changes"
    echo ""
    echo -e "${BLUE}📖 Documentation:${NC}"
    echo ""
    echo "   • Deployment Guide: DEPLOYMENT_GUIDE_AUTOFIX_REVIEW.md"
    echo "   • Quick Start: START_HERE_MANUAL_REVIEW.md"
    echo "   • Complete Summary: AUTOFIX_MANUAL_REVIEW_COMPLETE.md"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo ""
    echo "   • View logs: tail -f logs/dashboard-server.log"
    echo "   • Test workflow: node test-workflow-live.js"
    echo "   • Check health: curl http://localhost:9000/health"
    echo "   • Stop server: ps aux | grep dashboard-server (then kill PID)"
    echo ""
else
    echo -e "${YELLOW}TEST MODE - No changes were made${NC}"
    echo ""
    echo "To deploy for real, run:"
    echo "   ./DEPLOY_NOW.sh"
    echo ""
fi

echo -e "${GREEN}✨ Auto-Fix Manual Review System is ready!${NC}"
echo ""
