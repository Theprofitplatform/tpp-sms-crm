#!/bin/bash

# Quick Audit Script
# Usage: ./scripts/quick-audit.sh [number_of_posts]

POSTS=${1:-5}

echo "╔═══════════════════════════════════════════════╗"
echo "║   WordPress SEO Quick Audit                  ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "Auditing first $POSTS posts..."
echo ""

cd "$(dirname "$0")/.." || exit 1

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f "env/.env" ]; then
    echo "⚠️  Warning: env/.env not found"
    echo "Copy env/.env.example to env/.env and configure it first"
    exit 1
fi

# Run audit
node index.js --mode=audit --max-posts="$POSTS"

# Open report if generated
LATEST_REPORT=$(ls -t logs/audit-report-*.html 2>/dev/null | head -1)

if [ -f "$LATEST_REPORT" ]; then
    echo ""
    echo "📊 Report generated: $LATEST_REPORT"
    echo ""
    read -p "Open report in browser? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "$LATEST_REPORT"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "$LATEST_REPORT"
        elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
            start "$LATEST_REPORT"
        fi
    fi
fi
