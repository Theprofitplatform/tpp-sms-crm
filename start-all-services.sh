#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   SEO Automation Platform - Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running in WSL or Linux
if grep -qi microsoft /proc/version; then
    echo -e "${YELLOW}Running in WSL environment${NC}"
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Port $1 is available${NC}"
        return 0
    fi
}

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python 3 is not installed. Please install Python 3.8+${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Python 3 is installed${NC}"
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js is not installed. Please install Node.js 16+${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Node.js is installed${NC}"
fi

echo ""
echo -e "${BLUE}Checking ports...${NC}"

# Check required ports
check_port 4000  # Node.js server
check_port 5000  # Python keyword service
check_port 9000  # Dashboard

echo ""

# Start Python Keyword Research Service
echo -e "${BLUE}Starting Python Keyword Research Service...${NC}"
cd keyword-service

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate venv and install dependencies
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

# Check if requirements are installed
if ! python -c "import flask" 2>/dev/null; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install -r requirements.txt
    python -m spacy download en_core_web_sm
fi

# Start Python service in background
echo -e "${GREEN}Starting Python service on port 5000...${NC}"
nohup python api_server.py > ../python-service.log 2>&1 &
PYTHON_PID=$!
echo $PYTHON_PID > ../python-service.pid
echo -e "${GREEN}✓ Python service started (PID: $PYTHON_PID)${NC}"

# Wait a moment for service to start
sleep 2

# Go back to root
cd ..

# Start Node.js Server
echo -e "${BLUE}Starting Node.js Server...${NC}"
nohup node dashboard-server.js > node-server.log 2>&1 &
NODE_PID=$!
echo $NODE_PID > node-server.pid
echo -e "${GREEN}✓ Node.js server started (PID: $NODE_PID)${NC}"

# Wait a moment
sleep 2

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ All Services Started!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 Access Points:${NC}"
echo -e "   Dashboard:        ${GREEN}http://localhost:9000/unified/${NC}"
echo -e "   Node.js API:      ${GREEN}http://localhost:4000${NC}"
echo -e "   Keyword API:      ${GREEN}http://localhost:5000${NC}"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   Python Service:   ./python-service.log"
echo -e "   Node.js Server:   ./node-server.log"
echo ""
echo -e "${BLUE}🛑 To stop services:${NC}"
echo -e "   Run: ${YELLOW}./stop-all-services.sh${NC}"
echo -e "   Or manually: ${YELLOW}kill \$(cat python-service.pid node-server.pid)${NC}"
echo ""
