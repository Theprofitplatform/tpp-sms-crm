#!/bin/bash
set -e

# Database restore script

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will replace the current database with the backup."
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "Restoring from $BACKUP_FILE..."

# Drop and recreate database
psql -h ${POSTGRES_HOST:-localhost} \
     -U ${POSTGRES_USER:-postgres} \
     -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-smscrm};"

psql -h ${POSTGRES_HOST:-localhost} \
     -U ${POSTGRES_USER:-postgres} \
     -c "CREATE DATABASE ${POSTGRES_DB:-smscrm};"

# Restore from backup
gunzip -c $BACKUP_FILE | psql -h ${POSTGRES_HOST:-localhost} \
                              -U ${POSTGRES_USER:-postgres} \
                              -d ${POSTGRES_DB:-smscrm}

echo "Restore completed successfully"
