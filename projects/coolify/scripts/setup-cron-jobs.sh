#!/bin/bash
# Setup Cron Jobs for Coolify MCP Server
#
# Usage: ./scripts/setup-cron-jobs.sh
#
# This script sets up automated tasks:
# - Backup verification (daily at 3 AM)
# - Health checks (every 5 minutes)
# - Log rotation (weekly)

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

SCRIPT_DIR="/home/avi/projects/coolify/scripts"
LOG_DIR="/var/log/coolify"

log_info "Setting up Coolify MCP cron jobs..."

# Create log directory if needed
if [[ ! -d "$LOG_DIR" ]]; then
    sudo mkdir -p "$LOG_DIR"
    sudo chown avi:avi "$LOG_DIR"
    log_info "Created log directory: $LOG_DIR"
fi

# Backup existing crontab
crontab -l > /tmp/current_crontab 2>/dev/null || echo "" > /tmp/current_crontab

# Check if our jobs are already installed
if grep -q "coolify-backup-verify" /tmp/current_crontab; then
    log_warn "Cron jobs already installed. Skipping..."
    rm /tmp/current_crontab
    exit 0
fi

# Add new cron jobs
cat >> /tmp/current_crontab << EOF

# ========================================
# Coolify MCP Server Automated Tasks
# Installed: $(date)
# ========================================

# Backup verification - Daily at 3:00 AM
0 3 * * * ${SCRIPT_DIR}/verify-backups.sh >> ${LOG_DIR}/backup-verify.log 2>&1 # coolify-backup-verify

# Health check - Every 5 minutes
*/5 * * * * ${SCRIPT_DIR}/health-check.sh >> ${LOG_DIR}/health-check.log 2>&1 # coolify-health-check

# Pre-deploy check reminder - Weekdays at 9 AM
0 9 * * 1-5 echo "Remember to run pre-deploy checks before deploying!" | logger -t coolify-mcp # coolify-reminder

# Log rotation - Weekly on Sunday at 2 AM
0 2 * * 0 find ${LOG_DIR} -name "*.log" -mtime +30 -delete # coolify-log-cleanup

EOF

# Install new crontab
crontab /tmp/current_crontab
rm /tmp/current_crontab

log_info "Cron jobs installed successfully!"
echo ""
echo "Installed jobs:"
echo "  - Backup verification: Daily at 3:00 AM"
echo "  - Health checks: Every 5 minutes"
echo "  - Deploy reminder: Weekdays at 9:00 AM"
echo "  - Log cleanup: Weekly on Sunday at 2:00 AM"
echo ""
echo "View crontab: crontab -l"
echo "Logs: ${LOG_DIR}/"
