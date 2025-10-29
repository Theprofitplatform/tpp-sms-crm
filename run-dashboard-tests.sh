#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Dashboard Playwright Tests Runner                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if servers are running
echo "📡 Checking servers..."
if ! curl -s http://localhost:9000 > /dev/null; then
    echo "❌ Dashboard server not running on port 9000"
    echo "   Start it with: node dashboard-server.js"
    exit 1
fi
echo "✅ Dashboard server is running"
echo ""

# Create test results directory
echo "📁 Creating test results directory..."
mkdir -p test-results/screenshots
echo "✅ Directory created"
echo ""

# Check if Playwright is installed
echo "🔍 Checking Playwright installation..."
if ! npm list @playwright/test > /dev/null 2>&1; then
    echo "⚠️  Playwright not found. Installing..."
    npm install --save-dev @playwright/test
    npx playwright install chromium
fi
echo "✅ Playwright ready"
echo ""

# Run tests
echo "🧪 Running Playwright tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx playwright test tests/dashboard-pages.spec.js --reporter=list

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Tests complete!"
echo ""
echo "📊 View results:"
echo "   - Screenshots: test-results/screenshots/"
echo "   - HTML Report: npx playwright show-report"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Tests Finished                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
