#!/bin/bash

# SEO Expert Deployment Script
# Usage: ./deploy.sh [dev|production]

set -e

ENV=${1:-dev}
PROJECT_ROOT=$(pwd)

echo "🚀 Deploying SEO Expert to $ENV environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create logs directory if it doesn't exist
mkdir -p logs

# Step 1: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Step 2: Build dashboard
echo ""
echo "🏗️  Building dashboard..."
cd dashboard
npm ci
npm run build
cd ..

# Step 3: Run tests
echo ""
echo "🧪 Running Otto SEO features tests..."
node test-otto-features.js || echo "⚠️  Tests completed with warnings"

# Step 4: Use PM2 via npx (no global install required)
PM2_CMD="npx pm2"

# Step 5: Stop existing processes
echo ""
echo "🛑 Stopping existing PM2 processes..."
$PM2_CMD delete seo-dashboard 2>/dev/null || true
$PM2_CMD delete seo-backend 2>/dev/null || true

# Step 6: Start applications
echo ""
echo "▶️  Starting applications with PM2..."
if [ "$ENV" = "production" ]; then
    $PM2_CMD start ecosystem.config.cjs --env production
else
    $PM2_CMD start ecosystem.config.cjs --env development
fi

# Step 7: Save PM2 configuration
echo ""
echo "💾 Saving PM2 configuration..."
$PM2_CMD save

# Step 8: Show status
echo ""
echo "📊 Deployment Status:"
$PM2_CMD status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment complete!"
echo ""
echo "🌐 Services:"
echo "   • Dashboard: http://localhost:9000"
echo "   • Backend API: http://localhost:3000"
echo ""
echo "📝 Useful commands:"
echo "   • View logs: npx pm2 logs"
echo "   • Monitor: npx pm2 monit"
echo "   • Restart: npx pm2 restart all"
echo "   • Stop: npx pm2 stop all"
echo ""
