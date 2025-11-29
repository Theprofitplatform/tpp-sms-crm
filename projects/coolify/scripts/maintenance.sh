#!/bin/bash
#
# SEO Platform Maintenance Script
# Updates Docker images, cleans up old data, optimizes databases
#
# Usage: ./maintenance.sh
# Cron: 0 3 * * 0 /home/avi/projects/coolify/scripts/maintenance.sh (weekly)
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       SEO Platform - Weekly Maintenance                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Date:${NC} $(date)\n"

# Update Plausible
echo -e "${BLUE}ℹ${NC} Updating Plausible Analytics..."
cd /home/avi/plausible-analytics
docker-compose pull
docker-compose up -d
echo -e "${GREEN}✓${NC} Plausible updated"
echo ""

# Update Ghost
echo -e "${BLUE}ℹ${NC} Updating Ghost CMS..."
cd /home/avi/ghost-cms
docker-compose pull
docker-compose up -d
echo -e "${GREEN}✓${NC} Ghost updated"
echo ""

# Clean Docker
echo -e "${BLUE}ℹ${NC} Cleaning Docker system..."
docker system prune -f
echo -e "${GREEN}✓${NC} Docker cleaned"
echo ""

# Optimize Plausible PostgreSQL
echo -e "${BLUE}ℹ${NC} Optimizing Plausible PostgreSQL..."
docker exec plausible_db vacuumdb -U postgres -d plausible_db -z
echo -e "${GREEN}✓${NC} Plausible database optimized"
echo ""

# Optimize Ghost MySQL
echo -e "${BLUE}ℹ${NC} Optimizing Ghost MySQL..."
docker exec ghost_db mysqlcheck -u root -o ghost --all-databases > /dev/null 2>&1 || true
echo -e "${GREEN}✓${NC} Ghost database optimized"
echo ""

# Check disk usage
echo -e "${BLUE}ℹ${NC} Disk Usage:"
df -h / | awk 'NR==2 {print "  Total: "$2", Used: "$3" ("$5"), Available: "$4}'
echo ""

# Check log sizes
echo -e "${BLUE}ℹ${NC} Checking log sizes..."
LOG_SIZE=$(du -sh /var/lib/docker/containers 2>/dev/null | cut -f1 || echo "N/A")
echo -e "  Docker logs: ${LOG_SIZE}"
echo ""

# Rotate logs (if larger than 100MB)
echo -e "${BLUE}ℹ${NC} Rotating large logs..."
find /var/lib/docker/containers -name "*.log" -size +100M -exec truncate -s 0 {} \; 2>/dev/null || true
echo -e "${GREEN}✓${NC} Logs rotated"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Maintenance Completed Successfully!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Run health check
if [ -f "/home/avi/projects/coolify/scripts/health-check.sh" ]; then
    echo -e "${BLUE}ℹ${NC} Running health check..."
    /home/avi/projects/coolify/scripts/health-check.sh
fi
