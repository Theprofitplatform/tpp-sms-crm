#!/bin/bash

# SerpBear VPS Management Script
# Quick commands to manage your SerpBear deployment

VPS_HOST="tpp-vps"
VPS_PATH="~/projects/serpbear"

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_NC='\033[0m'

print_header() {
    echo -e "${COLOR_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_NC}"
    echo -e "${COLOR_BLUE}$1${COLOR_NC}"
    echo -e "${COLOR_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_NC}"
}

print_success() {
    echo -e "${COLOR_GREEN}✓ $1${COLOR_NC}"
}

print_info() {
    echo -e "${COLOR_BLUE}ℹ $1${COLOR_NC}"
}

cmd_status() {
    print_header "📊 SerpBear Status"
    ssh "$VPS_HOST" << 'ENDSSH'
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "Container Stats:"
docker stats --no-stream serpbear-production
ENDSSH
}

cmd_logs() {
    print_header "📜 SerpBear Logs (Ctrl+C to exit)"
    ssh "$VPS_HOST" "cd $VPS_PATH && docker-compose -f docker-compose.prod.yml logs -f --tail=50"
}

cmd_logs_static() {
    print_header "📜 Recent Logs"
    ssh "$VPS_HOST" "cd $VPS_PATH && docker-compose -f docker-compose.prod.yml logs --tail=100"
}

cmd_restart() {
    print_header "🔄 Restarting SerpBear"
    ssh "$VPS_HOST" "cd $VPS_PATH && docker-compose -f docker-compose.prod.yml restart"
    print_success "SerpBear restarted"
}

cmd_stop() {
    print_header "🛑 Stopping SerpBear"
    ssh "$VPS_HOST" "cd $VPS_PATH && docker-compose -f docker-compose.prod.yml down"
    print_success "SerpBear stopped"
}

cmd_start() {
    print_header "▶️  Starting SerpBear"
    ssh "$VPS_HOST" "cd $VPS_PATH && docker-compose -f docker-compose.prod.yml up -d"
    print_success "SerpBear started"
}

cmd_update() {
    print_header "🔄 Updating SerpBear"
    
    print_info "Syncing files..."
    rsync -avz --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='data' \
        --exclude='.next' \
        --exclude='coverage' \
        ./serpbear/ "$VPS_HOST:$VPS_PATH/"
    
    print_info "Rebuilding Docker image..."
    ssh "$VPS_HOST" << 'ENDSSH'
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
ENDSSH
    
    print_success "Update complete!"
}

cmd_backup() {
    print_header "💾 Backing Up SerpBear Data"
    
    BACKUP_DIR="./backups/serpbear"
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    print_info "Downloading database..."
    ssh "$VPS_HOST" "cd $VPS_PATH && docker exec serpbear-production tar -czf /tmp/serpbear-backup.tar.gz /app/data"
    ssh "$VPS_HOST" "docker cp serpbear-production:/tmp/serpbear-backup.tar.gz /tmp/"
    scp "$VPS_HOST:/tmp/serpbear-backup.tar.gz" "$BACKUP_DIR/serpbear-data-$TIMESTAMP.tar.gz"
    
    print_success "Backup saved to: $BACKUP_DIR/serpbear-data-$TIMESTAMP.tar.gz"
}

cmd_restore() {
    if [ -z "$2" ]; then
        echo "Usage: $0 restore <backup-file>"
        echo ""
        echo "Available backups:"
        ls -lh backups/serpbear/ 2>/dev/null || echo "No backups found"
        exit 1
    fi
    
    BACKUP_FILE="$2"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    print_header "♻️  Restoring SerpBear Data"
    
    print_info "Uploading backup to VPS..."
    scp "$BACKUP_FILE" "$VPS_HOST:/tmp/serpbear-restore.tar.gz"
    
    print_info "Restoring data..."
    ssh "$VPS_HOST" << 'ENDSSH'
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml stop
docker cp /tmp/serpbear-restore.tar.gz serpbear-production:/tmp/
docker exec serpbear-production tar -xzf /tmp/serpbear-restore.tar.gz -C /
docker-compose -f docker-compose.prod.yml start
ENDSSH
    
    print_success "Restore complete!"
}

cmd_shell() {
    print_header "🖥️  SerpBear Container Shell"
    ssh -t "$VPS_HOST" "docker exec -it serpbear-production sh"
}

cmd_ssh() {
    print_header "🔐 SSH to VPS"
    ssh "$VPS_HOST" "cd $VPS_PATH && bash"
}

cmd_health() {
    print_header "🏥 Health Check"
    ssh "$VPS_HOST" << 'ENDSSH'
cd ~/projects/serpbear

# Container health
CONTAINER_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' serpbear-production 2>/dev/null || echo "not-running")
echo "Container Health: $CONTAINER_HEALTH"

# API health check
HTTP_STATUS=$(docker exec serpbear-production wget -qO- http://localhost:3000/api/health 2>/dev/null | grep -c "ok" || echo "0")
if [ "$HTTP_STATUS" -gt 0 ]; then
    echo "API Health: ✓ Healthy"
else
    echo "API Health: ✗ Unhealthy"
fi

# Disk usage
echo ""
echo "Disk Usage:"
docker exec serpbear-production du -sh /app/data 2>/dev/null || echo "N/A"
ENDSSH
}

cmd_tunnel_status() {
    print_header "🌐 Cloudflare Tunnel Status"
    ssh "$VPS_HOST" "sudo systemctl status cloudflared 2>/dev/null || echo 'Cloudflared not configured as service'"
}

cmd_help() {
    cat << 'EOF'
🐻 SerpBear VPS Management Script

Usage: ./manage-serpbear.sh [command]

MONITORING:
  status              Show container status and stats
  logs                View live logs (Ctrl+C to exit)
  logs-static         View recent logs (non-streaming)
  health              Run health check
  tunnel-status       Check Cloudflare Tunnel status

CONTROL:
  restart             Restart SerpBear container
  stop                Stop SerpBear container
  start               Start SerpBear container
  update              Sync files, rebuild, and restart

DATA MANAGEMENT:
  backup              Create backup of SerpBear data
  restore <file>      Restore from backup file

DEBUGGING:
  shell               Open shell in SerpBear container
  ssh                 SSH into VPS

HELP:
  help                Show this help message

Examples:
  ./manage-serpbear.sh status
  ./manage-serpbear.sh logs
  ./manage-serpbear.sh backup
  ./manage-serpbear.sh restore backups/serpbear/serpbear-data-20241023_120000.tar.gz

Access URLs:
  Local (on VPS):     http://localhost:3006
  Public:             https://serpbear.theprofitplatform.com.au

EOF
}

# Main
case "${1:-}" in
    status)
        cmd_status
        ;;
    logs)
        cmd_logs
        ;;
    logs-static)
        cmd_logs_static
        ;;
    restart)
        cmd_restart
        ;;
    stop)
        cmd_stop
        ;;
    start)
        cmd_start
        ;;
    update)
        cmd_update
        ;;
    backup)
        cmd_backup
        ;;
    restore)
        cmd_restore "$@"
        ;;
    shell)
        cmd_shell
        ;;
    ssh)
        cmd_ssh
        ;;
    health)
        cmd_health
        ;;
    tunnel-status)
        cmd_tunnel_status
        ;;
    help|--help|-h)
        cmd_help
        ;;
    "")
        echo "Error: No command specified"
        echo ""
        cmd_help
        exit 1
        ;;
    *)
        echo "Error: Unknown command: $1"
        echo ""
        cmd_help
        exit 1
        ;;
esac
