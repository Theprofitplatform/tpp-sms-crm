#!/bin/bash

# Simple Dev Deployment (No Docker Required)
# Builds and serves the React dashboard

set -e

echo "🚀 Deploying React Dashboard to Development (Simple Mode)..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Build the dashboard
echo -e "${BLUE}🔨 Building React dashboard...${NC}"
cd dashboard
npm install
npm run build
echo -e "${GREEN}✓ Dashboard built successfully${NC}"

# Step 2: Serve the build
echo -e "${BLUE}🌐 Starting production server...${NC}"

# Check if 'serve' is installed
if ! command -v serve &> /dev/null; then
    echo -e "${YELLOW}Installing 'serve' package...${NC}"
    npm install -g serve
fi

cd dist

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📍 Dashboard URL:${NC} http://localhost:8080"
echo ""
echo -e "Starting server..."
echo ""

# Serve on port 8080
serve -s . -p 8080
