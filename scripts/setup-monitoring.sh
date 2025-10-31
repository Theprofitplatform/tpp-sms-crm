#!/bin/bash

###############################################################################
# Setup Monitoring & Cron Jobs
#
# Configures automated tasks for:
# - Database backups
# - Health checks
# - Email reports
# - Rank tracking
#
# Usage:
#   ./scripts/setup-monitoring.sh
###############################################################################

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "=============================================="
echo "  Monitoring & Automation Setup"
echo "=============================================="
echo -e "${NC}"

# Get the absolute path to the project
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${YELLOW}Project directory: $PROJECT_DIR${NC}\n"

# Check if running on Windows (WSL)
if grep -qi microsoft /proc/version 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Running on WSL (Windows Subsystem for Linux)${NC}"
    echo "Cron might not work in WSL by default."
    echo "Consider using Windows Task Scheduler instead."
    echo ""
    read -p "Continue with cron setup anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Create cron jobs
echo -e "${GREEN}Setting up cron jobs...${NC}\n"

# Backup current crontab
crontab -l > /tmp/crontab.backup 2>/dev/null || echo "# New crontab" > /tmp/crontab.backup

# Remove old SEO automation jobs if they exist
grep -v "# SEO Automation" /tmp/crontab.backup > /tmp/crontab.new || true

# Add header
echo "" >> /tmp/crontab.new
echo "# =============================================" >> /tmp/crontab.new
echo "# SEO Automation Platform - Automated Tasks" >> /tmp/crontab.new
echo "# =============================================" >> /tmp/crontab.new
echo "" >> /tmp/crontab.new

# Daily database backup (2 AM)
echo "# Database backup - Daily at 2:00 AM" >> /tmp/crontab.new
echo "0 2 * * * cd $PROJECT_DIR && ./scripts/backup-database.sh >> logs/backup-cron.log 2>&1 # SEO Automation" >> /tmp/crontab.new
echo "" >> /tmp/crontab.new

# Health check every 15 minutes
echo "# Health check - Every 15 minutes" >> /tmp/crontab.new
echo "*/15 * * * * cd $PROJECT_DIR && curl -sf http://localhost:9000/api/v2/health > /dev/null || echo \"\$(date): Health check failed\" >> logs/health-cron.log # SEO Automation" >> /tmp/crontab.new
echo "" >> /tmp/crontab.new

# Weekly report (Sunday at 8 AM)
echo "# Weekly report - Every Sunday at 8:00 AM" >> /tmp/crontab.new
echo "0 8 * * 0 cd $PROJECT_DIR && node scripts/send-weekly-reports.js >> logs/reports-cron.log 2>&1 # SEO Automation" >> /tmp/crontab.new
echo "" >> /tmp/crontab.new

# Install new crontab
crontab /tmp/crontab.new

echo -e "${GREEN}✅ Cron jobs configured:${NC}"
echo ""
echo "1. Database Backup: Daily at 2:00 AM"
echo "2. Health Check: Every 15 minutes"
echo "3. Weekly Reports: Sundays at 8:00 AM"
echo ""

# Create log directory
mkdir -p "$PROJECT_DIR/logs"
touch "$PROJECT_DIR/logs/backup-cron.log"
touch "$PROJECT_DIR/logs/health-cron.log"
touch "$PROJECT_DIR/logs/reports-cron.log"

echo -e "${GREEN}✅ Log files created in logs/directory${NC}\n"

# Display current crontab
echo -e "${BLUE}Current cron jobs:${NC}"
crontab -l | grep "SEO Automation" | grep -v "^#"

echo ""
echo -e "${GREEN}======================================"
echo "  Monitoring Setup Complete!"
echo "======================================${NC}"
echo ""
echo "📊 Monitoring Features:"
echo "  - Automated daily backups"
echo "  - Health checks every 15 min"
echo "  - Weekly email reports"
echo ""
echo "📝 View cron jobs: crontab -l"
echo "📝 Edit cron jobs: crontab -e"
echo "📝 View logs: tail -f logs/*.log"
echo ""
echo "🔗 External Monitoring (Recommended):"
echo "  1. UptimeRobot: https://uptimerobot.com"
echo "     - Monitor: http://31.97.222.218:9000/api/v2/health"
echo "     - Check every 5 minutes"
echo ""
echo "  2. Healthchecks.io: https://healthchecks.io"
echo "     - Add cron monitoring URLs"
echo "     - Get alerts if jobs fail"
echo ""
