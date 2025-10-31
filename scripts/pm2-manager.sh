#!/bin/bash

###############################################################################
# PM2 Process Manager
#
# Convenient wrapper for PM2 operations
#
# Usage:
#   ./scripts/pm2-manager.sh start      # Start all services
#   ./scripts/pm2-manager.sh stop       # Stop all services
#   ./scripts/pm2-manager.sh restart    # Restart all services
#   ./scripts/pm2-manager.sh status     # Show status
#   ./scripts/pm2-manager.sh logs       # View logs
#   ./scripts/pm2-manager.sh monit      # Monitor processes
###############################################################################

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

show_usage() {
    echo -e "${BLUE}PM2 Process Manager${NC}"
    echo ""
    echo "Usage: $0 {start|stop|restart|reload|status|logs|monit|delete|save|startup}"
    echo ""
    echo "Commands:"
    echo "  start     - Start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  reload    - Zero-downtime reload"
    echo "  status    - Show process status"
    echo "  logs      - View logs (tail)"
    echo "  monit     - Real-time monitoring"
    echo "  delete    - Delete all processes"
    echo "  save      - Save current process list"
    echo "  startup   - Configure startup script"
    echo ""
}

if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

COMMAND=$1

case "$COMMAND" in
    start)
        echo -e "${GREEN}🚀 Starting PM2 processes...${NC}"
        pm2 start ecosystem.config.js
        echo ""
        pm2 status
        echo -e "\n${GREEN}✅ Services started${NC}"
        echo -e "${YELLOW}💡 View logs: npm run pm2:logs${NC}"
        echo -e "${YELLOW}💡 Monitor: npm run pm2:monit${NC}"
        ;;
        
    stop)
        echo -e "${YELLOW}⏸️  Stopping all processes...${NC}"
        pm2 stop all
        pm2 status
        echo -e "\n${GREEN}✅ All processes stopped${NC}"
        ;;
        
    restart)
        echo -e "${GREEN}🔄 Restarting all processes...${NC}"
        pm2 restart all
        pm2 status
        echo -e "\n${GREEN}✅ All processes restarted${NC}"
        ;;
        
    reload)
        echo -e "${GREEN}🔄 Reloading all processes (zero-downtime)...${NC}"
        pm2 reload all
        pm2 status
        echo -e "\n${GREEN}✅ All processes reloaded${NC}"
        ;;
        
    status)
        pm2 status
        echo ""
        pm2 describe seo-dashboard 2>/dev/null || true
        ;;
        
    logs)
        echo -e "${BLUE}📜 Viewing logs (Ctrl+C to exit)...${NC}\n"
        pm2 logs
        ;;
        
    monit)
        echo -e "${BLUE}📊 Real-time monitoring (Ctrl+C to exit)...${NC}\n"
        pm2 monit
        ;;
        
    delete)
        echo -e "${RED}🗑️  Deleting all processes...${NC}"
        read -p "Are you sure? (yes/no): " -r
        if [[ $REPLY == "yes" ]]; then
            pm2 delete all
            echo -e "\n${GREEN}✅ All processes deleted${NC}"
        else
            echo "Cancelled"
        fi
        ;;
        
    save)
        echo -e "${GREEN}💾 Saving PM2 process list...${NC}"
        pm2 save
        echo -e "${GREEN}✅ Process list saved${NC}"
        ;;
        
    startup)
        echo -e "${GREEN}⚙️  Configuring PM2 startup script...${NC}\n"
        pm2 startup
        echo ""
        echo -e "${YELLOW}⚠️  Run the command above with sudo${NC}"
        echo -e "${YELLOW}⚠️  Then run: pm2 save${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}\n"
        show_usage
        exit 1
        ;;
esac
