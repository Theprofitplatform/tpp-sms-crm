#!/bin/bash

# SEO Expert Database Backup Script
# Usage: ./scripts/backup-database.sh

set -e

# Configuration
BACKUP_DIR="./backups/database"
DB_FILE="./data/seo-automation.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "🔄 Starting database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Error: Database file not found at $DB_FILE"
    exit 1
fi

# Backup database
echo "📦 Backing up database..."
sqlite3 "$DB_FILE" ".backup $BACKUP_DIR/backup_$TIMESTAMP.db"

# Compress
echo "🗜️  Compressing backup..."
gzip "$BACKUP_DIR/backup_$TIMESTAMP.db"

# Calculate size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/backup_$TIMESTAMP.db.gz" | cut -f1)

echo "✅ Backup completed: backup_$TIMESTAMP.db.gz ($BACKUP_SIZE)"

# Delete old backups
echo "🧹 Cleaning old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.gz" | wc -l)
echo "📊 Total backups: $BACKUP_COUNT"

# Log
echo "$(date): Backup completed - backup_$TIMESTAMP.db.gz ($BACKUP_SIZE)" >> "$BACKUP_DIR/backup.log"

echo ""
echo "✅ Backup complete!"
echo "📁 Location: $BACKUP_DIR/backup_$TIMESTAMP.db.gz"
echo ""
echo "To restore:"
echo "  gunzip $BACKUP_DIR/backup_$TIMESTAMP.db.gz"
echo "  cp $BACKUP_DIR/backup_$TIMESTAMP.db $DB_FILE"
