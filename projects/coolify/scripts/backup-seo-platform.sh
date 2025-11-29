#!/bin/bash
#
# SEO Platform Automated Backup Script
# Backs up all databases, configurations, and credentials
#
# Usage: ./backup-seo-platform.sh
# Cron: 0 2 * * * /home/avi/projects/coolify/scripts/backup-seo-platform.sh
#

set -euo pipefail

# Configuration
BACKUP_DIR="/home/avi/backups/seo-platform"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${DATE}"
RETENTION_DAYS=30

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       SEO Platform - Automated Backup                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_PATH}"
echo -e "${GREEN}✓${NC} Created backup directory: ${BACKUP_PATH}"

# Backup Plausible
echo -e "\n${BLUE}ℹ${NC} Backing up Plausible Analytics..."
mkdir -p "${BACKUP_PATH}/plausible"

# Plausible credentials
cp /home/avi/plausible-analytics/.credentials "${BACKUP_PATH}/plausible/"
echo -e "${GREEN}✓${NC} Plausible credentials backed up"

# Plausible PostgreSQL database
docker exec plausible_db pg_dump -U postgres plausible_db > "${BACKUP_PATH}/plausible/database.sql"
echo -e "${GREEN}✓${NC} Plausible PostgreSQL database backed up"

# Plausible ClickHouse data (optional - large)
# docker exec plausible_events_db clickhouse-client --query "SELECT * FROM plausible_events_db FORMAT CSV" > "${BACKUP_PATH}/plausible/events.csv"

# Plausible docker-compose
cp /home/avi/plausible-analytics/docker-compose.yml "${BACKUP_PATH}/plausible/"
echo -e "${GREEN}✓${NC} Plausible configuration backed up"

# Backup Ghost
echo -e "\n${BLUE}ℹ${NC} Backing up Ghost CMS..."
mkdir -p "${BACKUP_PATH}/ghost"

# Ghost credentials
cp /home/avi/ghost-cms/.credentials "${BACKUP_PATH}/ghost/"
echo -e "${GREEN}✓${NC} Ghost credentials backed up"

# Ghost MySQL database
GHOST_DB_PASSWORD=$(grep MYSQL_PASSWORD /home/avi/ghost-cms/.credentials | cut -d= -f2)
docker exec ghost_db mysqldump -u root -p"${GHOST_DB_PASSWORD}" ghost > "${BACKUP_PATH}/ghost/database.sql"
echo -e "${GREEN}✓${NC} Ghost MySQL database backed up"

# Ghost content (images, themes, etc)
docker cp ghost:/var/lib/ghost/content "${BACKUP_PATH}/ghost/"
echo -e "${GREEN}✓${NC} Ghost content backed up"

# Ghost docker-compose
cp /home/avi/ghost-cms/docker-compose.yml "${BACKUP_PATH}/ghost/"
echo -e "${GREEN}✓${NC} Ghost configuration backed up"

# Backup SerpBear
echo -e "\n${BLUE}ℹ${NC} Backing up SerpBear..."
mkdir -p "${BACKUP_PATH}/serpbear"

# SerpBear env and data
cp /home/avi/projects/serpbear/.env "${BACKUP_PATH}/serpbear/"
cp -r /home/avi/projects/serpbear/data "${BACKUP_PATH}/serpbear/" 2>/dev/null || true
echo -e "${GREEN}✓${NC} SerpBear configuration and data backed up"

# Create backup manifest
cat > "${BACKUP_PATH}/BACKUP_INFO.txt" << EOF
SEO Platform Backup
===================
Date: $(date)
Backup Path: ${BACKUP_PATH}

Contents:
- Plausible Analytics (PostgreSQL database + config)
- Ghost CMS (MySQL database + content + config)
- SerpBear (configuration + data)

Services Status:
$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "plausible|ghost")

Backup Size: $(du -sh ${BACKUP_PATH} | cut -f1)
EOF

echo -e "${GREEN}✓${NC} Backup manifest created"

# Compress backup
echo -e "\n${BLUE}ℹ${NC} Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${DATE}.tar.gz" "${DATE}/"
rm -rf "${DATE}/"
echo -e "${GREEN}✓${NC} Backup compressed: ${DATE}.tar.gz"

# Calculate final size
BACKUP_SIZE=$(du -sh "${DATE}.tar.gz" | cut -f1)
echo -e "${GREEN}✓${NC} Final backup size: ${BACKUP_SIZE}"

# Clean old backups
echo -e "\n${BLUE}ℹ${NC} Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
REMAINING=$(find "${BACKUP_DIR}" -name "*.tar.gz" | wc -l)
echo -e "${GREEN}✓${NC} Remaining backups: ${REMAINING}"

# Summary
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Backup Completed Successfully!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "\n${BLUE}Backup Location:${NC} ${BACKUP_DIR}/${DATE}.tar.gz"
echo -e "${BLUE}Backup Size:${NC} ${BACKUP_SIZE}"
echo -e "${BLUE}Total Backups:${NC} ${REMAINING}"
echo ""

# Optional: Send notification (uncomment if you have mail configured)
# echo "SEO Platform backup completed: ${BACKUP_SIZE}" | mail -s "Backup Success" admin@theprofitplatform.com.au
