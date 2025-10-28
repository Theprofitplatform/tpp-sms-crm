#!/bin/bash
###############################################################################
# SEO Dashboard - Automated Deployment Script
# Location: /home/avi/seo-automation/deploy.sh
#
# Usage: ./deploy.sh
# 
# This script handles complete deployment including:
# - Code updates from GitHub
# - Container rebuild
# - Health verification
# - Automatic rollback on failure
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/home/avi/seo-automation/current"
BACKUP_DIR="/home/avi/seo-automation/backup"
LOG_FILE="/home/avi/seo-automation/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log "🚀 Starting deployment..."
log "Log file: $LOG_FILE"

# Step 1: Backup current deployment
log "📦 Creating backup of current deployment..."
if [ -d "$DEPLOY_DIR" ]; then
    rm -rf "$BACKUP_DIR"
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
    log "✅ Backup created at $BACKUP_DIR"
else
    warning "No existing deployment to backup"
fi

# Step 2: Pull latest code
log "📥 Pulling latest code from GitHub..."
cd "$DEPLOY_DIR"
git fetch origin main
git reset --hard origin/main
log "✅ Code updated to latest version"

# Step 3: Build dashboard
log "🎨 Building React dashboard..."
cd "$DEPLOY_DIR/dashboard"
npm ci --silent 2>&1 | tee -a "$LOG_FILE"
npm run build --silent 2>&1 | tee -a "$LOG_FILE"
log "✅ Dashboard built successfully"

# Step 4: Stop existing containers
log "🛑 Stopping existing containers..."
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml down 2>&1 | tee -a "$LOG_FILE"
log "✅ Containers stopped"

# Step 5: Clean up Docker resources
log "🧹 Cleaning up Docker resources..."
docker network prune -f 2>&1 | tee -a "$LOG_FILE"
log "✅ Docker cleanup complete"

# Step 6: Start containers with all profiles
log "🚀 Starting containers (Cloudflare + Watchdog)..."
docker compose -f docker-compose.prod.yml --profile with-cloudflare --profile with-watchdog up -d 2>&1 | tee -a "$LOG_FILE"
log "✅ Containers started"

# Step 7: Wait for services to be healthy
log "⏳ Waiting for services to be healthy (60 seconds)..."
sleep 60

# Step 8: Verify deployment
log "🏥 Verifying deployment health..."

# Check container status
CONTAINERS_UP=$(docker ps --filter "name=keyword-tracker" --format "{{.Names}}" | wc -l)
if [ "$CONTAINERS_UP" -lt 4 ]; then
    error "Not all containers are running! Expected at least 4, got $CONTAINERS_UP"
    error "Rolling back..."
    
    # Rollback
    docker compose -f docker-compose.prod.yml down
    rm -rf "$DEPLOY_DIR"
    mv "$BACKUP_DIR" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    docker compose -f docker-compose.prod.yml --profile with-cloudflare --profile with-watchdog up -d
    
    error "❌ Deployment failed and rolled back"
    exit 1
fi

# Check dashboard health (internal)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/api/v2/health)
if [ "$HTTP_CODE" != "200" ]; then
    error "Dashboard health check failed! HTTP $HTTP_CODE"
    error "❌ Deployment may have issues"
    exit 1
fi

log "✅ Dashboard is healthy (HTTP $HTTP_CODE)"

# Check public URL
log "🌐 Testing public URL..."
sleep 10
PUBLIC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://seodashboard.theprofitplatform.com.au/api/v2/health)
if [ "$PUBLIC_HTTP" == "200" ]; then
    log "✅ Public URL is accessible (HTTP $PUBLIC_HTTP)"
else
    warning "Public URL returned HTTP $PUBLIC_HTTP (may need a moment for Cloudflare)"
fi

# Step 9: Show final status
log ""
log "========================================="
log "     🎉 DEPLOYMENT SUCCESSFUL! 🎉"
log "========================================="
log ""
log "📊 Container Status:"
docker ps --filter "name=keyword-tracker" --format "table {{.Names}}\t{{.Status}}" | tee -a "$LOG_FILE"

log ""
log "🔗 URLs:"
log "  - Internal: http://localhost:9000"
log "  - Public: https://seodashboard.theprofitplatform.com.au"

log ""
log "📝 Log file: $LOG_FILE"
log ""
log "✅ Deployment completed successfully!"
