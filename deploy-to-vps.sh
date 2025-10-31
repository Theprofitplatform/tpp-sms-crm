#!/bin/bash

###############################################################################
# Deploy to tpp-vps
# 
# Deploys SEO Automation Platform to production VPS
###############################################################################

set -e

SERVER="tpp-vps"
REMOTE_DIR="~/seo-platform-production"
LOCAL_DIR="."

echo "🚀 Deploying to $SERVER..."
echo ""

# Step 1: Create directory structure
echo "📁 Creating directory structure..."
ssh $SERVER "mkdir -p $REMOTE_DIR/{data,backups,logs,clients,config}"

# Step 2: Upload application files
echo "📤 Uploading application files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'data/' \
    --exclude 'backups/' \
    --exclude 'logs/' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude 'coverage/' \
    --exclude 'test-results/' \
    --exclude 'playwright-report/' \
    $LOCAL_DIR/ $SERVER:$REMOTE_DIR/

# Step 3: Upload .env if it exists
if [ -f ".env" ]; then
    echo "📤 Uploading .env file..."
    scp .env $SERVER:$REMOTE_DIR/.env
fi

# Step 4: Install dependencies
echo "📦 Installing dependencies..."
ssh $SERVER "cd $REMOTE_DIR && npm install --production"

# Step 5: Initialize database
echo "💾 Initializing database..."
ssh $SERVER "cd $REMOTE_DIR && node -e \"import('./src/database/index.js').then(m => m.initializeDatabase())\""

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Configure .env on server"
echo "  2. Start PM2 services"
echo "  3. Configure Nginx"
echo ""
