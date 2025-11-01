#!/bin/bash

# Setup Database Backup Cron Job
# This script sets up a daily backup at 2 AM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-database.js"

echo "🔧 Setting up automated backup cron job..."
echo ""

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "❌ Error: Backup script not found at $BACKUP_SCRIPT"
  exit 1
fi

# Display current crontab
echo "📋 Current crontab:"
crontab -l 2>/dev/null || echo "  (empty)"
echo ""

# Create cron entry
CRON_ENTRY="0 2 * * * cd \"$PROJECT_DIR\" && node \"$BACKUP_SCRIPT\" >> \"$PROJECT_DIR/logs/backup.log\" 2>&1"

# Check if entry already exists
if crontab -l 2>/dev/null | grep -q "backup-database.js"; then
  echo "⚠️  Backup cron job already exists. Remove it first if you want to update."
  echo ""
  echo "To remove:"
  echo "  crontab -e"
  echo "  # Delete the line containing 'backup-database.js'"
  exit 0
fi

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Add to crontab
echo "➕ Adding cron job..."
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "📅 Schedule: Daily at 2:00 AM"
echo "📁 Backup location: $PROJECT_DIR/backups/database/"
echo "📝 Log location: $PROJECT_DIR/logs/backup.log"
echo ""
echo "To view crontab:"
echo "  crontab -l"
echo ""
echo "To edit crontab:"
echo "  crontab -e"
echo ""
echo "To test backup manually:"
echo "  node $BACKUP_SCRIPT"
echo ""
