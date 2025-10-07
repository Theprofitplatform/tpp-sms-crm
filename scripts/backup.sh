#!/bin/bash
set -e

# Database backup script with 7-day retention

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smscrm_$DATE.sql.gz"

echo "Starting backup at $DATE..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h ${POSTGRES_HOST:-localhost} \
        -U ${POSTGRES_USER:-postgres} \
        -d ${POSTGRES_DB:-smscrm} \
        | gzip > $BACKUP_FILE

echo "Backup completed: $BACKUP_FILE"

# Delete backups older than 7 days
find $BACKUP_DIR -name "smscrm_*.sql.gz" -mtime +7 -delete

echo "Old backups cleaned up"
echo "Backup size: $(du -h $BACKUP_FILE | cut -f1)"
