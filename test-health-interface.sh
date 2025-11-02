#!/bin/bash

echo "🧪 Testing Health Check Interface"
echo "=================================="
echo ""

# Check if API server is running
echo "1. Checking if API server is running..."
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "   ✅ API server is running on port 4000"
else
    echo "   ❌ API server is not running"
    echo "   Please start it with: npm start"
    exit 1
fi

echo ""
echo "2. Testing API health endpoint..."
HEALTH_STATUS=$(curl -s http://localhost:4000/api/v2/health | jq -r '.status' 2>/dev/null)
if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "degraded" ]; then
    echo "   ✅ Health endpoint working - Status: $HEALTH_STATUS"
else
    echo "   ⚠️  Health endpoint returned: $HEALTH_STATUS"
fi

echo ""
echo "3. Testing static file serving..."
if curl -s http://localhost:4000/health.html | grep -q "System Health Monitor"; then
    echo "   ✅ Simple interface is accessible!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 SUCCESS! Everything is working!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📱 Access the simple interface at:"
    echo "   👉 http://localhost:4000/health.html"
    echo ""
    echo "🔗 Or use these alternatives:"
    echo "   • React Dashboard: http://localhost:5173 (if running)"
    echo "   • CLI: npm run health"
    echo "   • API: curl http://localhost:4000/api/v2/health | jq"
    echo ""
    echo "💡 Tip: Bookmark http://localhost:4000/health.html for quick access!"
    echo ""
else
    echo "   ❌ Cannot access health.html"
    echo ""
    echo "🔧 To fix this, please restart the server:"
    echo "   1. Stop the current server (Ctrl+C if running in terminal)"
    echo "   2. Run: npm start"
    echo "   3. Then try: curl http://localhost:4000/health.html"
    echo ""
fi
