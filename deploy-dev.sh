#!/bin/bash

# Deploy React Dashboard to Development Environment
# Usage: ./deploy-dev.sh

set -e

echo "🚀 Deploying React Dashboard to Development..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }
echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Step 2: Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.react-dashboard.yml down || true
echo -e "${GREEN}✓ Containers stopped${NC}"

# Step 3: Build the React dashboard
echo -e "${BLUE}🔨 Building React dashboard...${NC}"
cd dashboard
npm install
npm run build
cd ..
echo -e "${GREEN}✓ React dashboard built${NC}"

# Step 4: Build Docker images
echo -e "${BLUE}🐳 Building Docker images...${NC}"
docker-compose -f docker-compose.react-dashboard.yml build --no-cache
echo -e "${GREEN}✓ Docker images built${NC}"

# Step 5: Start containers
echo -e "${BLUE}🚀 Starting containers...${NC}"
docker-compose -f docker-compose.react-dashboard.yml up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Step 6: Wait for health checks
echo -e "${BLUE}🏥 Waiting for health checks...${NC}"
sleep 10

# Step 7: Check container status
echo -e "${BLUE}📊 Checking container status...${NC}"
docker-compose -f docker-compose.react-dashboard.yml ps

# Step 8: Show logs
echo -e "${BLUE}📝 Container logs:${NC}"
docker-compose -f docker-compose.react-dashboard.yml logs --tail=20

# Step 9: Deployment complete
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📍 Dashboard URL:${NC} http://localhost:8080"
echo -e "${YELLOW}📍 Backend API:${NC} http://localhost:9000"
echo ""
echo -e "Run ${BLUE}docker-compose -f docker-compose.react-dashboard.yml logs -f${NC} to view logs"
echo -e "Run ${BLUE}docker-compose -f docker-compose.react-dashboard.yml down${NC} to stop"
echo ""
