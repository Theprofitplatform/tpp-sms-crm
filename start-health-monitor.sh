#!/bin/bash

echo "🚀 Starting Health Check System"
echo "================================"
echo ""

# Kill any existing server
echo "1. Checking for existing server..."
if pgrep -f "node src/index.js" > /dev/null; then
    echo "   ⚠️  Stopping existing server..."
    pkill -f "node src/index.js"
    sleep 2
fi

echo "   ✅ Ready to start"
echo ""

# Start the server
echo "2. Starting API server..."
cd "/mnt/c/Users/abhis/projects/seo expert"
nohup npm start > /dev/null 2>&1 &
SERVER_PID=$!

echo "   ⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "   ✅ API server started successfully (PID: $SERVER_PID)"
else
    echo "   ❌ Server failed to start"
    echo "   Try running manually: npm start"
    exit 1
fi

echo ""
echo "3. Testing health check interface..."
sleep 2

if curl -s http://localhost:4000/health.html | grep -q "System Health Monitor" 2>/dev/null; then
    echo "   ✅ Simple interface is accessible!"
else
    echo "   ⚠️  Interface may need a moment to load..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Health Check System is RUNNING!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 ACCESS OPTIONS:"
echo ""
echo "   1️⃣  SIMPLE INTERFACE (Recommended)"
echo "      👉 http://localhost:4000/health.html"
echo "      • No build required"
echo "      • Auto-refresh every 5s"
echo "      • Mobile friendly"
echo ""
echo "   2️⃣  COMMAND LINE"
echo "      npm run health              # Quick check"
echo "      npm run health:verbose      # Detailed info"
echo "      npm run health:watch        # Continuous"
echo ""
echo "   3️⃣  HTTP API"
echo "      curl http://localhost:4000/api/v2/health | jq"
echo ""
echo "   4️⃣  REACT DASHBOARD"
echo "      cd dashboard && npm run dev"
echo "      Then: http://localhost:5173 → System > Health Check"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 QUICK TEST:"
echo "   Run: npm run health"
echo ""
echo "🛑 TO STOP:"
echo "   pkill -f 'node src/index.js'"
echo ""
echo "📖 DOCUMENTATION:"
echo "   See: GET_STARTED_HEALTH_CHECK.md"
echo ""

# Open browser (optional - commented out)
# echo "Opening browser..."
# if command -v xdg-open > /dev/null; then
#     xdg-open http://localhost:4000/health.html
# elif command -v open > /dev/null; then
#     open http://localhost:4000/health.html
# fi
