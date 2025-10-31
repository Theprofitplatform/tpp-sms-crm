#!/bin/bash

###############################################################################
# Database Backup Script
#
# Automatically backs up all databases with rotation
#
# Usage:
#   ./scripts/backup-database.sh
#   ./scripts/backup-database.sh --retention 30
###############################################################################

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${1:-30}
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[ERROR] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "======================================"
log "Starting database backup"
log "======================================"

# Backup SQLite database
SQLITE_DB="./data/seo-automation.db"
if [ -f "$SQLITE_DB" ]; then
    log "Backing up SQLite database..."
    
    # Create backup with timestamp
    SQLITE_BACKUP="${BACKUP_DIR}/sqlite-backup-${TIMESTAMP}.db"
    
    # Use SQLite backup command for consistency
    if command -v sqlite3 &> /dev/null; then
        sqlite3 "$SQLITE_DB" ".backup '${SQLITE_BACKUP}'"
        log "✅ SQLite backup created: $(basename $SQLITE_BACKUP)"
        
        # Get file size
        SIZE=$(du -h "$SQLITE_BACKUP" | cut -f1)
        log "   Size: $SIZE"
    else
        # Fallback to simple copy
        cp "$SQLITE_DB" "$SQLITE_BACKUP"
        log "✅ SQLite backup created (copy): $(basename $SQLITE_BACKUP)"
    fi
    
    # Compress backup
    gzip "$SQLITE_BACKUP"
    log "✅ Compressed: $(basename ${SQLITE_BACKUP}.gz)"
else
    warn "SQLite database not found: $SQLITE_DB"
fi

# Backup PostgreSQL (if running in Docker)
if command -v docker &> /dev/null; then
    POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.ID}}" 2>/dev/null || true)
    
    if [ -n "$POSTGRES_CONTAINER" ]; then
        log "Backing up PostgreSQL database..."
        
        POSTGRES_BACKUP="${BACKUP_DIR}/postgres-backup-${TIMESTAMP}.sql"
        
        # Get database credentials from .env
        if [ -f ".env" ]; then
            export $(grep -v '^#' .env | grep -E 'POSTGRES_' | xargs)
        fi
        
        POSTGRES_USER="${POSTGRES_USER:-seo_user}"
        POSTGRES_DB="${POSTGRES_DB:-seo_unified_prod}"
        
        docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$POSTGRES_BACKUP"
        
        if [ -f "$POSTGRES_BACKUP" ]; then
            SIZE=$(du -h "$POSTGRES_BACKUP" | cut -f1)
            log "✅ PostgreSQL backup created: $(basename $POSTGRES_BACKUP)"
            log "   Size: $SIZE"
            
            # Compress
            gzip "$POSTGRES_BACKUP"
            log "✅ Compressed: $(basename ${POSTGRES_BACKUP}.gz)"
        else
            error "PostgreSQL backup failed"
        fi
    fi
fi

# Backup important configuration files
log "Backing up configuration files..."
CONFIG_BACKUP="${BACKUP_DIR}/config-backup-${TIMESTAMP}.tar.gz"

tar -czf "$CONFIG_BACKUP" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='backups' \
    clients/*.env 2>/dev/null || true \
    data/gsc-settings.json 2>/dev/null || true \
    config/settings.json 2>/dev/null || true \
    .env 2>/dev/null || true

if [ -f "$CONFIG_BACKUP" ]; then
    SIZE=$(du -h "$CONFIG_BACKUP" | cut -f1)
    log "✅ Configuration backup: $(basename $CONFIG_BACKUP)"
    log "   Size: $SIZE"
fi

# Clean up old backups
log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."

# Count backups before cleanup
BEFORE_COUNT=$(find "$BACKUP_DIR" -name "*-backup-*.gz" -o -name "*-backup-*.tar.gz" | wc -l)

# Delete old backups
find "$BACKUP_DIR" -name "*-backup-*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

AFTER_COUNT=$(find "$BACKUP_DIR" -name "*-backup-*.gz" -o -name "*-backup-*.tar.gz" | wc -l)
DELETED=$((BEFORE_COUNT - AFTER_COUNT))

if [ $DELETED -gt 0 ]; then
    log "✅ Deleted $DELETED old backup(s)"
else
    log "ℹ️  No old backups to delete"
fi

# Summary
log "======================================"
log "Backup completed successfully!"
log "======================================"
log "Backup directory: $BACKUP_DIR"
log "Retention: $RETENTION_DAYS days"
log "Current backups: $AFTER_COUNT"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "N/A")
log "Total backup size: $TOTAL_SIZE"

# List recent backups
log ""
log "Recent backups:"
ls -lht "$BACKUP_DIR"/*-backup-*.gz 2>/dev/null | head -5 | while read -r line; do
    log "  $(echo $line | awk '{print $9, $5}')"
done

exit 0
