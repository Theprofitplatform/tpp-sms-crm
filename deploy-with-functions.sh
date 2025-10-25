#!/bin/bash

# Deploy SEO Dashboard to Cloudflare Pages with Functions
# This script creates a clean deployment package

echo "🚀 Preparing deployment package..."

# Create temporary deployment directory
rm -rf .deploy-temp
mkdir -p .deploy-temp

# Copy web-dist contents to root of deployment
echo "📦 Copying web-dist files..."
cp -r web-dist/* .deploy-temp/

# Copy functions directory
echo "⚡ Copying Functions..."
cp -r functions .deploy-temp/

# Deploy to Cloudflare Pages
echo "🌐 Deploying to Cloudflare Pages..."
cd .deploy-temp
wrangler pages deploy . --project-name=seo-reports --commit-dirty=true

# Clean up
cd ..
echo "🧹 Cleaning up..."
rm -rf .deploy-temp

echo "✅ Deployment complete!"
echo ""
echo "Your dashboard is now live with CSV upload functionality!"
echo "Visit: https://seo.theprofitplatform.com.au"
