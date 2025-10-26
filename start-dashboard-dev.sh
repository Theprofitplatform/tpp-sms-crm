#!/bin/bash

# Quick Start for Development Dashboard
# Runs in development mode (no build required)

set -e

echo "🚀 Starting React Dashboard (Development Mode)..."

cd dashboard

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "========================================="
echo "✅ Dashboard Starting!"
echo "========================================="
echo ""
echo "📍 URL: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start dev server
npm run dev
