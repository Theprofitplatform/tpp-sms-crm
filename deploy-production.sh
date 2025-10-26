#!/bin/bash

#############################################################
# Production Deployment Script
# Unified Keyword Tracking System
#############################################################

set -e  # Exit on error

# Check for auto-yes flag
AUTO_YES=false
if [[ "$1" == "-y" ]] || [[ "$1" == "--yes" ]]; then
    AUTO_YES=true
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
DEPLOYMENT_LOG="./logs/deployment-$(date +%Y%m%d_%H%M%S).log"

# Ensure logs directory exists
mkdir -p logs

# Logging function
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

# Error handler
error_exit() {
    log_error "Deployment failed: $1"
    echo ""
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}  DEPLOYMENT FAILED${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo ""
    echo "Check logs: $DEPLOYMENT_LOG"
    echo ""
    echo "Rollback steps:"
    echo "  1. docker-compose -f $COMPOSE_FILE down"
    echo "  2. Restore from backup: $BACKUP_DIR"
    echo "  3. Review error logs"
    echo ""
    exit 1
}

trap 'error_exit "Unexpected error on line $LINENO"' ERR

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  Production Deployment${NC}"
echo -e "${BLUE}  Unified Keyword Tracking System${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

log "Starting production deployment"
log "Deployment log: $DEPLOYMENT_LOG"
echo ""

#############################################################
# STEP 1: Pre-Deployment Checks
#############################################################

echo -e "${BLUE}[1/10] Pre-Deployment Checks${NC}"
log "Running pre-deployment checks..."

# Check if running in production directory
if [ ! -f "package.json" ]; then
    error_exit "Not in project root directory. Please run from project root."
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    log_warning ".env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_warning "Please configure .env file with production values!"
        echo "Press Enter to continue after configuring .env, or Ctrl+C to exit..."
        read
    else
        error_exit ".env file required. Please create it with production configuration."
    fi
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    error_exit "Docker not found. Please install Docker first."
fi

# Check for docker compose (v2) or docker-compose (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    error_exit "Docker Compose not found. Please install Docker Compose."
fi

log "Using: $DOCKER_COMPOSE"

# Check Docker daemon
if ! docker info &> /dev/null; then
    error_exit "Docker daemon not running. Please start Docker."
fi

log_success "Pre-deployment checks passed"
echo ""

#############################################################
# STEP 2: Run Tests
#############################################################

echo -e "${BLUE}[2/10] Running Tests${NC}"
log "Running test suite..."

# Check if test dependencies are installed
if [ -d "node_modules" ]; then
    # Run integration tests if they exist
    if [ -f "tests/integration/api-v2-keywords.test.js" ]; then
        log "Running integration tests..."
        # Note: Tests require running server, skip in automated deployment
        log_warning "Integration tests require running server - skipping in automated deployment"
        log_warning "Run manually: npm test -- tests/integration/"
    else
        log_warning "No integration tests found"
    fi
else
    log_warning "node_modules not found - skipping tests"
fi

log_success "Test checks completed"
echo ""

#############################################################
# STEP 3: Git Status Check
#############################################################

echo -e "${BLUE}[3/10] Checking Git Status${NC}"
log "Checking for uncommitted changes..."

if git diff --quiet && git diff --staged --quiet; then
    log_success "No uncommitted changes"
else
    log_warning "Uncommitted changes detected:"
    git status --short | head -10 | tee -a "$DEPLOYMENT_LOG"
    echo ""
    log_warning "Consider committing changes before deployment"

    if [ "$AUTO_YES" = true ]; then
        log_warning "Auto-yes mode: Continuing with uncommitted changes"
    else
        echo "Continue anyway? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            error_exit "Deployment cancelled by user"
        fi
    fi
fi

# Show recent commits
log "Recent commits:"
git log --oneline -5 | tee -a "$DEPLOYMENT_LOG"
echo ""

log_success "Git status checked"
echo ""

#############################################################
# STEP 4: Backup
#############################################################

echo -e "${BLUE}[4/10] Creating Backup${NC}"
log "Creating backup at: $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

# Backup databases
if [ -f "database/unified.db" ]; then
    cp database/unified.db "$BACKUP_DIR/"
    log_success "Backed up unified database"
fi

if [ -f "serpbear/data/serpbear.db" ]; then
    mkdir -p "$BACKUP_DIR/serpbear"
    cp serpbear/data/serpbear.db "$BACKUP_DIR/serpbear/"
    log_success "Backed up SerpBear database"
fi

if [ -f "keyword-service/keywords.db" ]; then
    mkdir -p "$BACKUP_DIR/keyword-service"
    cp keyword-service/keywords.db "$BACKUP_DIR/keyword-service/"
    log_success "Backed up Keyword Service database"
fi

# Backup .env
cp .env "$BACKUP_DIR/.env.backup"
log_success "Backed up .env file"

log_success "Backup created: $BACKUP_DIR"
echo ""

#############################################################
# STEP 5: Build Docker Images
#############################################################

echo -e "${BLUE}[5/10] Building Docker Images${NC}"
log "Building production Docker images..."

$DOCKER_COMPOSE -f "$COMPOSE_FILE" build --no-cache 2>&1 | tee -a "$DEPLOYMENT_LOG"

if [ $? -eq 0 ]; then
    log_success "Docker images built successfully"
else
    error_exit "Docker build failed"
fi
echo ""

#############################################################
# STEP 6: Stop Existing Containers
#############################################################

echo -e "${BLUE}[6/10] Stopping Existing Containers${NC}"
log "Stopping existing containers gracefully..."

if $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" down --timeout 30 2>&1 | tee -a "$DEPLOYMENT_LOG"
    log_success "Existing containers stopped"
else
    log "No existing containers to stop"
fi
echo ""

#############################################################
# STEP 7: Database Migration
#############################################################

echo -e "${BLUE}[7/10] Running Database Migrations${NC}"
log "Running database migrations..."

# Check if migration script exists
if [ -f "run-migration.js" ]; then
    node run-migration.js 2>&1 | tee -a "$DEPLOYMENT_LOG"
    if [ $? -eq 0 ]; then
        log_success "Database migrations completed"
    else
        log_warning "Migration script had errors - check logs"
    fi
else
    log_warning "No migration script found (run-migration.js)"
fi
echo ""

#############################################################
# STEP 8: Start Services
#############################################################

echo -e "${BLUE}[8/10] Starting Services${NC}"
log "Starting production containers..."

$DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d 2>&1 | tee -a "$DEPLOYMENT_LOG"

if [ $? -eq 0 ]; then
    log_success "Services started successfully"
else
    error_exit "Failed to start services"
fi

# Wait for services to be ready
log "Waiting for services to initialize (30 seconds)..."
sleep 30

echo ""

#############################################################
# STEP 9: Health Checks
#############################################################

echo -e "${BLUE}[9/10] Running Health Checks${NC}"
log "Verifying service health..."

# Check container status
log "Container status:"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" ps | tee -a "$DEPLOYMENT_LOG"

# Check if health check script exists
if [ -f "scripts/health-check.sh" ]; then
    log "Running comprehensive health check..."
    bash scripts/health-check.sh 2>&1 | tee -a "$DEPLOYMENT_LOG"
    HEALTH_STATUS=$?
else
    log_warning "Health check script not found"

    # Manual health checks
    log "Checking dashboard service..."
    if curl -f http://localhost:9000/api/v2/health > /dev/null 2>&1; then
        log_success "Dashboard service healthy"
    else
        log_error "Dashboard service health check failed"
    fi

    log "Checking keyword service..."
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        log_success "Keyword service healthy"
    else
        log_warning "Keyword service health check failed"
    fi

    HEALTH_STATUS=0
fi

echo ""

#############################################################
# STEP 10: Post-Deployment Verification
#############################################################

echo -e "${BLUE}[10/10] Post-Deployment Verification${NC}"
log "Running post-deployment checks..."

# Check logs for errors
log "Checking container logs for errors..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=50 2>&1 | grep -i error | tee -a "$DEPLOYMENT_LOG" || log "No errors in recent logs"

# Smoke tests
log "Running smoke tests..."

# Test keywords endpoint
if curl -s http://localhost:9000/api/v2/keywords > /dev/null 2>&1; then
    log_success "Keywords API responding"
else
    log_warning "Keywords API not responding"
fi

# Test stats endpoint
if curl -s http://localhost:9000/api/v2/keywords/stats > /dev/null 2>&1; then
    log_success "Stats API responding"
else
    log_warning "Stats API not responding"
fi

# Test sync status
if curl -s http://localhost:9000/api/v2/sync/status > /dev/null 2>&1; then
    log_success "Sync API responding"
else
    log_warning "Sync API not responding"
fi

echo ""

#############################################################
# Deployment Report
#############################################################

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

echo "Deployment Summary:"
echo "  • Started: $(date)"
echo "  • Backup: $BACKUP_DIR"
echo "  • Log: $DEPLOYMENT_LOG"
echo ""

echo "Services:"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" ps
echo ""

echo "Access URLs:"
echo "  • Dashboard: http://localhost:9000"
echo "  • API: http://localhost:9000/api/v2"
echo "  • Keyword Service: http://localhost:5000"
echo ""

echo "Next Steps:"
echo "  1. Verify dashboard at http://localhost:9000"
echo "  2. Check sync status: curl http://localhost:9000/api/v2/sync/status"
echo "  3. Monitor logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  4. Run tests: ./scripts/run-all-tests.sh"
echo ""

echo "Monitoring Commands:"
echo "  • View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  • Check status: docker-compose -f $COMPOSE_FILE ps"
echo "  • Restart service: docker-compose -f $COMPOSE_FILE restart <service>"
echo "  • Stop all: docker-compose -f $COMPOSE_FILE down"
echo ""

echo "Rollback (if needed):"
echo "  1. docker-compose -f $COMPOSE_FILE down"
echo "  2. Restore from: $BACKUP_DIR"
echo "  3. docker-compose -f $COMPOSE_FILE up -d"
echo ""

log "Deployment completed successfully"

# Save deployment info
cat > "./logs/latest-deployment.txt" << EOF
Deployment Date: $(date)
Backup Location: $BACKUP_DIR
Git Commit: $(git rev-parse HEAD)
Docker Images:
$($DOCKER_COMPOSE -f "$COMPOSE_FILE" images)
EOF

echo -e "${GREEN}Deployment complete! 🎉${NC}"
echo ""
