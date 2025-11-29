#!/bin/bash
#
# Setup Cron Jobs for SEO Platform Automation
# Configures automated backups, health checks, and maintenance
#
# Usage: ./setup-cron.sh
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          SEO Platform - Cron Setup                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Backup existing crontab
echo -e "${BLUE}ℹ${NC} Backing up existing crontab..."
crontab -l > /tmp/crontab.backup 2>/dev/null || echo "# No existing crontab" > /tmp/crontab.backup
echo -e "${GREEN}✓${NC} Crontab backed up to /tmp/crontab.backup"

# Create new crontab
cat > /tmp/seo-platform-cron << 'EOF'
# SEO Platform Automated Tasks
# Generated: $(date)

# Daily backup at 2:00 AM
0 2 * * * /home/avi/projects/coolify/scripts/backup-seo-platform.sh >> /home/avi/logs/backup.log 2>&1

# Health check every 5 minutes
*/5 * * * * /home/avi/projects/coolify/scripts/health-check.sh >> /home/avi/logs/health.log 2>&1

# Weekly maintenance on Sunday at 3:00 AM
0 3 * * 0 /home/avi/projects/coolify/scripts/maintenance.sh >> /home/avi/logs/maintenance.log 2>&1

# Monthly log rotation on 1st of month at 4:00 AM
0 4 1 * * find /home/avi/logs -name "*.log" -mtime +30 -delete

EOF

# Show what will be added
echo -e "\n${BLUE}The following cron jobs will be added:${NC}"
echo -e "${YELLOW}"
cat /tmp/seo-platform-cron
echo -e "${NC}"

# Ask for confirmation
read -p "Do you want to add these cron jobs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Merge and install
    cat /tmp/crontab.backup /tmp/seo-platform-cron | crontab -
    echo -e "${GREEN}✓${NC} Cron jobs installed successfully!"

    echo -e "\n${BLUE}Active cron jobs:${NC}"
    crontab -l | grep -v "^#" | grep -v "^$"

    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              Cron Setup Complete!                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Automated tasks:${NC}"
    echo -e "  • Daily backups at 2:00 AM"
    echo -e "  • Health checks every 5 minutes"
    echo -e "  • Weekly maintenance on Sundays at 3:00 AM"
    echo -e "  • Monthly log cleanup"
    echo ""
    echo -e "${BLUE}Logs location:${NC} /home/avi/logs/"
else
    echo -e "${YELLOW}⚠${NC} Cron setup cancelled"
    exit 1
fi

# Clean up
rm /tmp/seo-platform-cron
