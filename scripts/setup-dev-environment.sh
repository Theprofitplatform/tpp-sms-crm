#!/bin/bash

# Development Environment Setup Script
# Sets up the complete unified keyword tracking system

set -e  # Exit on error

echo "🚀 Setting up Unified Keyword Tracking System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python not found. Please install Python 3.9+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"

echo "  → Installing main dependencies..."
npm install

echo "  → Installing keyword service dependencies..."
cd keyword-service
pip3 install -r requirements.txt
cd ..

echo "  → Installing dashboard dependencies..."
cd dashboard
npm install
cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Setup directories
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p database
mkdir -p logs
mkdir -p serpbear/data
mkdir -p keyword-service/data
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Setup environment file
echo -e "${BLUE}Creating .env file...${NC}"

if [ -f .env ]; then
    echo "  .env already exists, backing up to .env.backup"
    cp .env .env.backup
fi

cat > .env << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=9000

# Database Configuration
DATABASE_URL=sqlite:./database/unified.db
SERPBEAR_DB_PATH=./serpbear/data/serpbear.db
KEYWORD_SERVICE_DB_PATH=./keyword-service/keywords.db

# Sync Configuration
SYNC_INTERVAL=*/5 * * * *
ENABLE_AUTO_SYNC=true

# Logging
LOG_LEVEL=info
ENABLE_METRICS=true

# External APIs (optional - add your keys)
SERPAPI_KEY=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=

# Security (change these in production)
JWT_SECRET=dev-secret-change-in-production
API_KEY_SALT=dev-salt-change-in-production
EOF

echo -e "${GREEN}✓ .env file created${NC}"
echo ""

# Initialize database
echo -e "${BLUE}Initializing database...${NC}"

if [ -f run-migration.js ]; then
    node run-migration.js
    echo -e "${GREEN}✓ Database initialized${NC}"
else
    echo -e "${RED}Warning: run-migration.js not found, skipping database init${NC}"
fi
echo ""

# Build dashboard
echo -e "${BLUE}Building dashboard...${NC}"
cd dashboard
if [ -f package.json ]; then
    npm run build
    echo -e "${GREEN}✓ Dashboard built${NC}"
else
    echo -e "${RED}Warning: dashboard package.json not found${NC}"
fi
cd ..
echo ""

# Create start script
echo -e "${BLUE}Creating start script...${NC}"
cat > start-dev.sh << 'EOF'
#!/bin/bash

# Start all services for development

echo "🚀 Starting all services..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start dashboard server
echo "Starting dashboard server on port 9000..."
node dashboard-server.js &

# Start keyword service
echo "Starting keyword service on port 5000..."
cd keyword-service && python3 api_server.py &
cd ..

# Start sync service (if exists)
if [ -f src/services/sync-runner.js ]; then
    echo "Starting sync service..."
    node src/services/sync-runner.js &
fi

echo ""
echo "✅ All services started!"
echo ""
echo "Access the dashboard at: http://localhost:9000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background jobs
wait
EOF

chmod +x start-dev.sh
echo -e "${GREEN}✓ Start script created${NC}"
echo ""

# Setup complete
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}    ✅ Development environment setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Review .env file and add API keys if needed"
echo "  2. Start all services:"
echo -e "     ${BLUE}./start-dev.sh${NC}"
echo ""
echo "  3. Open browser to:"
echo -e "     ${BLUE}http://localhost:9000${NC}"
echo ""
echo "  4. Navigate to 'Unified Keywords' in the sidebar"
echo ""
echo "For more info, see: QUICK_START_INTEGRATED_SYSTEM.md"
echo ""
