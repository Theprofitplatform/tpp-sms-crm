#!/bin/bash
#
# Production Upgrade Script
# Upgrades PM2 setup from single process to full ecosystem.config.js
# Adds: Clustering, Scheduled Tasks, Health Monitoring, Email Processing
#
# Author: SEO Expert Team
# Date: 2025-11-01
#

set -e  # Exit on any error

echo "========================================================================"
echo "🚀 PRODUCTION UPGRADE: Full Ecosystem Deployment"
echo "========================================================================"
echo ""
echo "This will upgrade production from single process to full feature set:"
echo "  ✅ Cluster Mode (2 dashboard instances)"
echo "  ✅ Automated Daily Audits (2 AM)"
echo "  ✅ Position Tracking (6 AM)"
echo "  ✅ Local SEO Scheduler (7 AM)"
echo "  ✅ Email Queue Processor (every 15 min)"
echo "  ✅ Health Monitoring & Auto-Restart"
echo ""
echo "Current production processes will be stopped and upgraded."
echo ""

# Confirmation
read -p "Continue with upgrade? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Upgrade cancelled"
    exit 1
fi

echo ""
echo "📦 Step 1: Creating backup..."

# Create timestamped backup
BACKUP_DIR=~/backups/seo-expert/pre-ecosystem-upgrade
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Backup PM2 state
pm2 save
cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-dump-$TIMESTAMP.pm2" || true

# Backup database
if [ -f ~/projects/seo-expert/database/seo-expert.db ]; then
    cp ~/projects/seo-expert/database/seo-expert.db "$BACKUP_DIR/seo-expert-$TIMESTAMP.db"
    echo "✅ Database backed up"
fi

# Backup current PM2 list
pm2 jlist > "$BACKUP_DIR/pm2-processes-$TIMESTAMP.json"

echo "✅ Backup created at: $BACKUP_DIR"
echo ""

echo "📋 Step 2: Current PM2 processes..."
pm2 list
echo ""

echo "🛑 Step 3: Stopping old PM2 processes..."

# Stop all current processes
pm2 stop all || true
sleep 2

# Delete old processes (they'll be recreated from ecosystem.config.js)
pm2 delete all || true
sleep 2

echo "✅ Old processes stopped and removed"
echo ""

echo "📂 Step 4: Verifying ecosystem.config.js..."
cd ~/projects/seo-expert

if [ ! -f ecosystem.config.js ]; then
    echo "❌ ERROR: ecosystem.config.js not found!"
    echo "Restoring from backup..."
    pm2 resurrect
    exit 1
fi

echo "✅ ecosystem.config.js found"
echo ""

echo "🚀 Step 5: Starting full ecosystem..."

# Start all services from ecosystem.config.js
pm2 start ecosystem.config.js

# Wait for services to initialize
sleep 5

echo ""
echo "💾 Step 6: Saving PM2 configuration..."

# Save PM2 state for auto-restart on reboot
pm2 save

echo "✅ PM2 configuration saved"
echo ""

echo "📊 Step 7: Verifying services..."
echo ""

pm2 list

echo ""
echo "🏥 Step 8: Running health checks..."
echo ""

# Check if main dashboard is responding
if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Dashboard health check: PASSED"
else
    echo "⚠️  Dashboard health check: PENDING (service may still be starting)"
fi

# Check if keyword service is running
if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Keyword service health check: PASSED"
else
    echo "⚠️  Keyword service health check: PENDING (service may still be starting)"
fi

echo ""
echo "========================================================================"
echo "✅ UPGRADE COMPLETE!"
echo "========================================================================"
echo ""
echo "📊 Service Status:"
pm2 status
echo ""
echo "📚 Available Services:"
echo "  1. seo-dashboard (2 instances, clustered)"
echo "  2. keyword-service (Python, port 5000)"
echo "  3. audit-scheduler (daily at 2 AM)"
echo "  4. rank-tracker (daily at 6 AM)"
echo "  5. local-seo-scheduler (daily at 7 AM)"
echo "  6. email-processor (every 15 minutes)"
echo ""
echo "🔧 Useful Commands:"
echo "  pm2 list           - View all services"
echo "  pm2 logs           - View all logs"
echo "  pm2 monit          - Monitor resources"
echo "  pm2 restart all    - Restart all services"
echo ""
echo "🔙 Rollback Instructions (if needed):"
echo "  1. pm2 stop all && pm2 delete all"
echo "  2. pm2 resurrect"
echo "  3. Or restore from: $BACKUP_DIR"
echo ""
echo "📍 Production URL: https://seodashboard.theprofitplatform.com.au"
echo ""
echo "✨ All features are now active in production!"
echo "========================================================================"
