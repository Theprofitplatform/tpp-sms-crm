#!/bin/bash
#
# SEO Platform - Master Automation Runner
# Runs health check, backup, and displays status
#
# Usage: ./run-all-automation.sh [health|backup|maintenance|status]
#

set -euo pipefail

SCRIPT_DIR="/home/avi/projects/coolify/scripts"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

show_banner() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          SEO Platform - Automation Manager                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_status() {
    echo -e "${BLUE}📊 System Status${NC}\n"

    echo -e "${BLUE}Containers:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | \
        grep -E "plausible|ghost|NAMES" || echo "No containers found"
    echo ""

    echo -e "${BLUE}Services:${NC}"
    echo -n "  Plausible (8100): "
    curl -s -o /dev/null -w "%{http_code}" http://localhost:8100 | grep -q "302" && \
        echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Down${NC}"

    echo -n "  Ghost (2368):     "
    curl -s -o /dev/null -w "%{http_code}" http://localhost:2368 | grep -q "301" && \
        echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Down${NC}"

    echo -n "  SerpBear (3001):  "
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "302" && \
        echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Down${NC}"
    echo ""

    echo -e "${BLUE}Resources:${NC}"
    echo "  Disk:   $(df -h / | awk 'NR==2 {print $5" used of "$2}')"
    echo "  Memory: $(free -h | awk 'NR==2 {printf "%s used of %s\n", $3, $2}')"
    echo ""

    if [ -d "/home/avi/backups/seo-platform" ]; then
        BACKUP_COUNT=$(find /home/avi/backups/seo-platform -name "*.tar.gz" 2>/dev/null | wc -l || echo "0")
        LATEST_BACKUP=$(find /home/avi/backups/seo-platform -name "*.tar.gz" 2>/dev/null | sort | tail -1 || echo "None")
        echo -e "${BLUE}Backups:${NC}"
        echo "  Total: ${BACKUP_COUNT}"
        if [ "${LATEST_BACKUP}" != "None" ]; then
            BACKUP_AGE=$(stat -c %y "${LATEST_BACKUP}" | cut -d' ' -f1)
            BACKUP_SIZE=$(du -h "${LATEST_BACKUP}" | cut -f1)
            echo "  Latest: ${BACKUP_AGE} (${BACKUP_SIZE})"
        fi
        echo ""
    fi
}

run_health_check() {
    echo -e "${BLUE}🏥 Running Health Check${NC}\n"
    if [ -f "${SCRIPT_DIR}/health-check.sh" ]; then
        "${SCRIPT_DIR}/health-check.sh"
    else
        echo -e "${RED}✗${NC} Health check script not found"
        exit 1
    fi
}

run_backup() {
    echo -e "${BLUE}💾 Running Backup${NC}\n"
    if [ -f "${SCRIPT_DIR}/backup-seo-platform.sh" ]; then
        "${SCRIPT_DIR}/backup-seo-platform.sh"
    else
        echo -e "${RED}✗${NC} Backup script not found"
        exit 1
    fi
}

run_maintenance() {
    echo -e "${BLUE}🔧 Running Maintenance${NC}\n"
    if [ -f "${SCRIPT_DIR}/maintenance.sh" ]; then
        "${SCRIPT_DIR}/maintenance.sh"
    else
        echo -e "${RED}✗${NC} Maintenance script not found"
        exit 1
    fi
}

show_menu() {
    echo -e "${BLUE}Available Commands:${NC}"
    echo "  status      - Show system status"
    echo "  health      - Run health check"
    echo "  backup      - Run backup now"
    echo "  maintenance - Run maintenance"
    echo "  setup-cron  - Setup automated cron jobs"
    echo "  logs        - View recent logs"
    echo ""
    echo "Usage: $0 [command]"
}

view_logs() {
    echo -e "${BLUE}📋 Recent Logs${NC}\n"

    if [ -f "/home/avi/logs/health.log" ]; then
        echo -e "${BLUE}Last Health Check:${NC}"
        tail -20 /home/avi/logs/health.log
        echo ""
    fi

    if [ -f "/home/avi/logs/backup.log" ]; then
        echo -e "${BLUE}Last Backup:${NC}"
        tail -10 /home/avi/logs/backup.log
        echo ""
    fi
}

# Main
show_banner

COMMAND="${1:-status}"

case "${COMMAND}" in
    status)
        show_status
        ;;
    health)
        run_health_check
        ;;
    backup)
        run_backup
        ;;
    maintenance)
        run_maintenance
        ;;
    setup-cron)
        if [ -f "${SCRIPT_DIR}/setup-cron.sh" ]; then
            "${SCRIPT_DIR}/setup-cron.sh"
        else
            echo -e "${RED}✗${NC} Cron setup script not found"
            exit 1
        fi
        ;;
    logs)
        view_logs
        ;;
    *)
        show_menu
        exit 1
        ;;
esac
