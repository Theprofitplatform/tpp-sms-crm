#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Stopping SEO Services...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Stop Python service
if [ -f "python-service.pid" ]; then
    PID=$(cat python-service.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${BLUE}Stopping Python Keyword Service (PID: $PID)...${NC}"
        kill $PID
        echo -e "${GREEN}✓ Python service stopped${NC}"
    else
        echo -e "${RED}Python service not running${NC}"
    fi
    rm python-service.pid
fi

# Stop Node.js server
if [ -f "node-server.pid" ]; then
    PID=$(cat node-server.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${BLUE}Stopping Node.js Server (PID: $PID)...${NC}"
        kill $PID
        echo -e "${GREEN}✓ Node.js server stopped${NC}"
    else
        echo -e "${RED}Node.js server not running${NC}"
    fi
    rm node-server.pid
fi

# Kill any remaining processes on the ports
echo ""
echo -e "${BLUE}Cleaning up ports...${NC}"

# Kill processes on port 4000
lsof -ti:4000 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Port 4000 freed${NC}" || echo -e "${GREEN}Port 4000 already free${NC}"

# Kill processes on port 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Port 5000 freed${NC}" || echo -e "${GREEN}Port 5000 already free${NC}"

# Kill processes on port 9000
lsof -ti:9000 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Port 9000 freed${NC}" || echo -e "${GREEN}Port 9000 already free${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ All Services Stopped!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
