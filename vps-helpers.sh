#!/bin/bash

##############################################################################
# TPP VPS Helper Commands
# Quick commands for managing SEO services on tpp-vps
##############################################################################

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

VPS="tpp-vps"
PROJECT_DIR="~/projects/seo-expert"

##############################################################################
# Health Checks
##############################################################################

vps-health() {
    echo -e "${BLUE}=== SEO Services Health Check ===${NC}"
    ssh "$VPS" << 'EOF'
        echo "Checking services..."
        echo -n "  SerpBear (3006): "
        curl -sf http://localhost:3006/api/domains > /dev/null && echo "✓" || echo "✗"

        echo -n "  SEO Analyst (5002): "
        curl -sf http://localhost:5002/health > /dev/null && echo "✓" || echo "✗"

        echo -n "  SEO Expert (3007): "
        curl -sf http://localhost:3007/health > /dev/null && echo "✓" || echo "✗"

        echo -n "  PostgreSQL: "
        pg_isready -q && echo "✓" || echo "✗"

        echo -n "  Redis: "
        redis-cli ping > /dev/null 2>&1 && echo "✓" || echo "✗"
EOF
}

##############################################################################
# Logs
##############################################################################

vps-logs() {
    echo -e "${BLUE}=== Viewing logs for $1 ===${NC}"
    case $1 in
        serpbear)
            ssh "$VPS" 'docker logs serpbear-production --tail 50 -f'
            ;;
        analyst|seo-analyst)
            ssh "$VPS" 'journalctl -u seo-analyst.service -f'
            ;;
        expert|seo-expert)
            ssh "$VPS" "cd $PROJECT_DIR && docker-compose logs -f"
            ;;
        all)
            ssh "$VPS" "cd $PROJECT_DIR && docker-compose logs --tail 20"
            ssh "$VPS" 'docker logs serpbear-production --tail 20'
            ssh "$VPS" 'journalctl -u seo-analyst.service -n 20'
            ;;
        *)
            echo "Usage: vps-logs [serpbear|analyst|expert|all]"
            ;;
    esac
}

##############################################################################
# Restart Services
##############################################################################

vps-restart() {
    echo -e "${YELLOW}=== Restarting $1 ===${NC}"
    case $1 in
        serpbear)
            ssh "$VPS" 'docker restart serpbear-production'
            ;;
        analyst|seo-analyst)
            ssh "$VPS" 'sudo systemctl restart seo-analyst.service'
            ;;
        expert|seo-expert)
            ssh "$VPS" "cd $PROJECT_DIR && docker-compose restart"
            ;;
        all)
            echo "Restarting all SEO services..."
            ssh "$VPS" 'docker restart serpbear-production'
            ssh "$VPS" 'sudo systemctl restart seo-analyst.service'
            ssh "$VPS" "cd $PROJECT_DIR && docker-compose restart"
            ;;
        *)
            echo "Usage: vps-restart [serpbear|analyst|expert|all]"
            ;;
    esac
    echo -e "${GREEN}✓ Restart complete${NC}"
}

##############################################################################
# Status
##############################################################################

vps-status() {
    echo -e "${BLUE}=== TPP VPS Status ===${NC}"
    ssh "$VPS" << 'EOF'
        echo ""
        echo "=== System ==="
        uptime
        echo ""

        echo "=== Memory ==="
        free -h | grep -E "Mem|Swap"
        echo ""

        echo "=== Disk ==="
        df -h / | tail -1
        echo ""

        echo "=== Docker Containers ==="
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAMES|serpbear|seo"
        echo ""

        echo "=== Services ==="
        systemctl status seo-analyst.service --no-pager | grep -E "Active|Main PID|Memory"
        echo ""

        echo "=== Nginx ==="
        systemctl is-active nginx && echo "Nginx: ✓ Running" || echo "Nginx: ✗ Stopped"
        echo ""

        echo "=== Databases ==="
        systemctl is-active postgresql@16-main && echo "PostgreSQL: ✓ Running" || echo "PostgreSQL: ✗ Stopped"
        systemctl is-active redis-server && echo "Redis: ✓ Running" || echo "Redis: ✗ Stopped"
EOF
}

##############################################################################
# Deploy/Update
##############################################################################

vps-update() {
    echo -e "${YELLOW}=== Updating SEO Expert on VPS ===${NC}"
    ssh "$VPS" << EOF
        cd $PROJECT_DIR
        echo "Pulling latest code..."
        git pull

        echo "Installing dependencies..."
        npm ci --production

        echo "Restarting service..."
        docker-compose restart

        echo "Checking health..."
        sleep 3
        curl -sf http://localhost:3007/health && echo "✓ Service healthy" || echo "✗ Health check failed"
EOF
}

vps-deploy() {
    echo -e "${YELLOW}=== Full deployment to VPS ===${NC}"
    ./deploy-to-tpp-vps.sh
}

##############################################################################
# Database
##############################################################################

vps-db-backup() {
    echo -e "${BLUE}=== Creating database backup ===${NC}"
    ssh "$VPS" << 'EOF'
        BACKUP_FILE=~/backups/seo-expert-$(date +%Y%m%d-%H%M%S).sql
        mkdir -p ~/backups
        pg_dump -U seo_user seo_expert > $BACKUP_FILE
        echo "✓ Backup created: $BACKUP_FILE"
        ls -lh $BACKUP_FILE
EOF
}

vps-db-connect() {
    echo -e "${BLUE}=== Connecting to database ===${NC}"
    ssh -t "$VPS" 'psql -U seo_user -d seo_expert'
}

##############################################################################
# Quick Connect
##############################################################################

vps-connect() {
    echo -e "${BLUE}=== Connecting to TPP VPS ===${NC}"
    ssh "$VPS"
}

vps-shell() {
    echo -e "${BLUE}=== Opening shell in SEO Expert container ===${NC}"
    ssh -t "$VPS" "cd $PROJECT_DIR && docker-compose exec seo-expert sh"
}

##############################################################################
# Resource Monitoring
##############################################################################

vps-monitor() {
    echo -e "${BLUE}=== Real-time Resource Monitor ===${NC}"
    ssh "$VPS" << 'EOF'
        echo "Press Ctrl+C to exit"
        while true; do
            clear
            echo "=== TPP VPS - $(date) ==="
            echo ""
            echo "CPU & Load:"
            uptime
            echo ""
            echo "Memory:"
            free -h | grep -E "Mem|Swap"
            echo ""
            echo "Disk:"
            df -h / | tail -1
            echo ""
            echo "Top Processes:"
            ps aux --sort=-%mem | head -6
            echo ""
            echo "Docker Stats:"
            docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -6
            sleep 2
        done
EOF
}

##############################################################################
# Help
##############################################################################

vps-help() {
    cat << EOF
${BLUE}=== TPP VPS Helper Commands ===${NC}

${GREEN}Health & Status:${NC}
  vps-health          Check all SEO services health
  vps-status          Show complete system status
  vps-monitor         Real-time resource monitoring

${GREEN}Logs:${NC}
  vps-logs serpbear   View SerpBear logs
  vps-logs analyst    View SEO Analyst logs
  vps-logs expert     View SEO Expert logs
  vps-logs all        View all logs

${GREEN}Service Management:${NC}
  vps-restart serpbear    Restart SerpBear
  vps-restart analyst     Restart SEO Analyst
  vps-restart expert      Restart SEO Expert
  vps-restart all         Restart all services

${GREEN}Deploy & Update:${NC}
  vps-deploy          Full deployment (guided)
  vps-update          Quick update (pull + restart)

${GREEN}Database:${NC}
  vps-db-backup       Create database backup
  vps-db-connect      Connect to PostgreSQL

${GREEN}Access:${NC}
  vps-connect         SSH to VPS
  vps-shell           Shell in SEO Expert container

${GREEN}Other:${NC}
  vps-help            Show this help

${YELLOW}Example Usage:${NC}
  source vps-helpers.sh   # Load commands
  vps-health              # Check services
  vps-logs expert         # View logs
  vps-restart expert      # Restart service

EOF
}

##############################################################################
# Auto-load message
##############################################################################

echo -e "${GREEN}✓ VPS Helper Commands Loaded${NC}"
echo -e "Type ${BLUE}vps-help${NC} for available commands"
echo ""

# Export functions
export -f vps-health vps-logs vps-restart vps-status vps-update vps-deploy
export -f vps-db-backup vps-db-connect vps-connect vps-shell vps-monitor vps-help
