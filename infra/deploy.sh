#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting deployment process...${NC}\n"

# Load environment variables
if [ -f .env.production ]; then
    echo -e "${GREEN}✓${NC} Loading environment variables from .env.production"
    export $(grep -v '^#' .env.production | xargs)
else
    echo -e "${YELLOW}⚠${NC}  Warning: .env.production not found, using existing environment"
fi

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗${NC} Docker is not running"
    exit 1
fi

# Navigate to infra directory
cd infra

# Create backup of database (optional but recommended)
echo -e "\n${BLUE}📦 Creating database backup...${NC}"
BACKUP_FILE="backups/backup-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p backups
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-smscrm} > "$BACKUP_FILE" 2>/dev/null || echo -e "${YELLOW}⚠${NC}  Backup skipped (database may not be running)"

# Pull latest images (if using a registry)
echo -e "\n${BLUE}📥 Pulling latest images...${NC}"
# Uncomment if you're using a Docker registry
# docker compose -f docker-compose.prod.yml pull

# Build new images with latest code
echo -e "\n${BLUE}🔨 Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

# Stop old containers
echo -e "\n${BLUE}🛑 Stopping old containers...${NC}"
docker compose -f docker-compose.prod.yml down

# Start new containers
echo -e "\n${BLUE}🚀 Starting new containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "\n${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 5

# Run database migrations
echo -e "\n${BLUE}🔄 Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec -T api pnpm run migrate || echo -e "${YELLOW}⚠${NC}  Migration warning (may already be up-to-date)"

# Check service health
echo -e "\n${BLUE}🔍 Checking service health...${NC}"
docker compose -f docker-compose.prod.yml ps

# Cleanup old images
echo -e "\n${BLUE}🧹 Cleaning up old Docker images...${NC}"
docker image prune -f

# Show logs from the last 20 lines
echo -e "\n${BLUE}📋 Recent logs:${NC}"
docker compose -f docker-compose.prod.yml logs --tail=20

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}💡 Tip: Use 'docker compose -f infra/docker-compose.prod.yml logs -f [service]' to view logs${NC}\n"
