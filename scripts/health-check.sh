#!/bin/bash

# Health Check Script
# Verifies all services are running and healthy

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Health Check - Unified Keyword Tracking System${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Check Dashboard Server
echo -e "${BLUE}[1/6] Checking Dashboard Server (port 9000)...${NC}"
if curl -s -f http://localhost:9000/api/v2/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Dashboard server is healthy${NC}"
else
    echo -e "  ${RED}✗ Dashboard server is not responding${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Keyword Service
echo -e "${BLUE}[2/6] Checking Keyword Service (port 5000)...${NC}"
if curl -s -f http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Keyword service is healthy${NC}"
else
    echo -e "  ${YELLOW}⚠ Keyword service is not responding${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check Unified Database
echo -e "${BLUE}[3/6] Checking Unified Database...${NC}"
if [ -f database/unified.db ]; then
    if sqlite3 database/unified.db "SELECT COUNT(*) FROM unified_keywords;" > /dev/null 2>&1; then
        KEYWORD_COUNT=$(sqlite3 database/unified.db "SELECT COUNT(*) FROM unified_keywords;")
        echo -e "  ${GREEN}✓ Unified database is healthy${NC}"
        echo -e "    → Keywords: ${KEYWORD_COUNT}"
    else
        echo -e "  ${RED}✗ Unified database schema is invalid${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "  ${RED}✗ Unified database not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check SerpBear Database
echo -e "${BLUE}[4/6] Checking SerpBear Database...${NC}"
if [ -f serpbear/data/serpbear.db ]; then
    if sqlite3 serpbear/data/serpbear.db "SELECT COUNT(*) FROM keyword;" > /dev/null 2>&1; then
        SERPBEAR_KEYWORDS=$(sqlite3 serpbear/data/serpbear.db "SELECT COUNT(*) FROM keyword;")
        echo -e "  ${GREEN}✓ SerpBear database is healthy${NC}"
        echo -e "    → Keywords: ${SERPBEAR_KEYWORDS}"
    else
        echo -e "  ${YELLOW}⚠ SerpBear database schema is invalid${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "  ${YELLOW}⚠ SerpBear database not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check Keyword Service Database
echo -e "${BLUE}[5/6] Checking Keyword Service Database...${NC}"
if [ -f keyword-service/keywords.db ]; then
    if sqlite3 keyword-service/keywords.db "SELECT COUNT(*) FROM keywords;" > /dev/null 2>&1; then
        KW_SERVICE_KEYWORDS=$(sqlite3 keyword-service/keywords.db "SELECT COUNT(*) FROM keywords;")
        echo -e "  ${GREEN}✓ Keyword service database is healthy${NC}"
        echo -e "    → Keywords: ${KW_SERVICE_KEYWORDS}"
    else
        echo -e "  ${YELLOW}⚠ Keyword service database schema is invalid${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "  ${YELLOW}⚠ Keyword service database not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check Sync Status
echo -e "${BLUE}[6/6] Checking Sync Status...${NC}"
if curl -s -f http://localhost:9000/api/v2/sync/status > /dev/null 2>&1; then
    SYNC_STATUS=$(curl -s http://localhost:9000/api/v2/sync/status)
    IS_SYNCING=$(echo $SYNC_STATUS | grep -o '"isSyncing":[^,]*' | cut -d: -f2)
    LAST_SYNC=$(echo $SYNC_STATUS | grep -o '"lastSyncTime":"[^"]*"' | cut -d: -f2- | tr -d '"')

    echo -e "  ${GREEN}✓ Sync service is responding${NC}"
    echo -e "    → Last sync: ${LAST_SYNC}"
    echo -e "    → Currently syncing: ${IS_SYNCING}"
else
    echo -e "  ${YELLOW}⚠ Could not get sync status${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# API Endpoint Tests
echo -e "${BLUE}Testing API Endpoints...${NC}"

# Test keywords endpoint
if curl -s -f http://localhost:9000/api/v2/keywords > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ GET /api/v2/keywords${NC}"
else
    echo -e "  ${RED}✗ GET /api/v2/keywords${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test stats endpoint
if curl -s -f http://localhost:9000/api/v2/keywords/stats > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ GET /api/v2/keywords/stats${NC}"
else
    echo -e "  ${RED}✗ GET /api/v2/keywords/stats${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test research endpoint
if curl -s -f http://localhost:9000/api/v2/research/projects > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ GET /api/v2/research/projects${NC}"
else
    echo -e "  ${RED}✗ GET /api/v2/research/projects${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# System Resources
echo -e "${BLUE}System Resources...${NC}"

# Check disk space
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | tr -d '%')
if [ $DISK_USAGE -lt 80 ]; then
    echo -e "  ${GREEN}✓ Disk usage: ${DISK_USAGE}%${NC}"
else
    echo -e "  ${YELLOW}⚠ Disk usage: ${DISK_USAGE}% (getting high)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check if Node processes are running
NODE_PROCS=$(ps aux | grep -c "node dashboard-server" || echo "0")
if [ $NODE_PROCS -gt 0 ]; then
    echo -e "  ${GREEN}✓ Node.js processes: ${NODE_PROCS}${NC}"
else
    echo -e "  ${RED}✗ No Node.js dashboard processes found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check if Python processes are running
PYTHON_PROCS=$(ps aux | grep -c "python.*api_server" || echo "0")
if [ $PYTHON_PROCS -gt 0 ]; then
    echo -e "  ${GREEN}✓ Python processes: ${PYTHON_PROCS}${NC}"
else
    echo -e "  ${YELLOW}⚠ No Python keyword service processes found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Log file check
echo -e "${BLUE}Checking Logs...${NC}"
if [ -d logs ]; then
    # Check for recent errors in logs
    if [ -f logs/dashboard-server.log ]; then
        ERROR_COUNT=$(grep -c "ERROR" logs/dashboard-server.log 2>/dev/null || echo "0")
        if [ $ERROR_COUNT -eq 0 ]; then
            echo -e "  ${GREEN}✓ No errors in dashboard logs${NC}"
        else
            echo -e "  ${YELLOW}⚠ Found ${ERROR_COUNT} errors in dashboard logs${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi

    if [ -f logs/sync-service.log ]; then
        SYNC_ERRORS=$(grep -c "ERROR" logs/sync-service.log 2>/dev/null || echo "0")
        if [ $SYNC_ERRORS -eq 0 ]; then
            echo -e "  ${GREEN}✓ No errors in sync logs${NC}"
        else
            echo -e "  ${YELLOW}⚠ Found ${SYNC_ERRORS} errors in sync logs${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
else
    echo -e "  ${YELLOW}⚠ Logs directory not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Health Check Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All systems healthy!${NC}"
    echo ""
    EXIT_CODE=0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ System operational with ${WARNINGS} warning(s)${NC}"
    echo ""
    EXIT_CODE=0
else
    echo -e "${RED}❌ System unhealthy - ${ERRORS} critical error(s), ${WARNINGS} warning(s)${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check if all services are running: ps aux | grep -E 'dashboard-server|api_server'"
    echo "  2. View logs: tail -f logs/*.log"
    echo "  3. Restart services: ./start-dev.sh"
    echo "  4. Check database: sqlite3 database/unified.db '.tables'"
    echo ""
    EXIT_CODE=1
fi

echo "Dashboard: http://localhost:9000"
echo "API Docs: http://localhost:9000/api/v2/docs"
echo ""

exit $EXIT_CODE
