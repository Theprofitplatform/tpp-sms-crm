#!/bin/bash

# Start Dashboard in Production Mode
# Builds and serves optimized version

set -e

echo "🚀 Starting React Dashboard (Production Mode)..."

cd dashboard

echo "🔨 Building for production..."
npm install
npm run build

echo "📦 Installing serve if needed..."
npm install -g serve 2>/dev/null || true

echo ""
echo "========================================="
echo "✅ Dashboard Built & Starting!"
echo "========================================="
echo ""
echo "📍 URL: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Serve the built files
cd dist
serve -s . -p 8080
