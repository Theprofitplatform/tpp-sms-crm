#!/bin/bash
#
# Startup script for SEO Dashboard services
# Starts both the dashboard server and keyword service
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo "  SEO Dashboard - Service Startup"
echo "=================================================="
echo ""

# Check if services are already running
if lsof -ti:9000 > /dev/null 2>&1; then
    echo "⚠️  Dashboard server already running on port 9000"
    echo "   Kill with: lsof -ti:9000 | xargs kill -9"
else
    echo "🚀 Starting Dashboard Server (port 9000)..."
    nohup node dashboard-server.js > logs/dashboard-$(date +%Y%m%d-%H%M%S).log 2>&1 &
    DASHBOARD_PID=$!
    echo "   ✅ Started with PID: $DASHBOARD_PID"
fi

echo ""

if lsof -ti:5000 > /dev/null 2>&1; then
    echo "⚠️  Keyword service already running on port 5000"
    echo "   Kill with: lsof -ti:5000 | xargs kill -9"
else
    echo "🚀 Starting Keyword Service (port 5000)..."
    nohup ./keyword-service/venv/bin/python keyword-service-simple.py > keyword-simple.log 2>&1 &
    KEYWORD_PID=$!
    echo "   ✅ Started with PID: $KEYWORD_PID"
fi

echo ""
echo "⏳ Waiting for services to start..."
sleep 3

echo ""
echo "📊 Service Status:"
echo "=================================================="

# Check dashboard
if curl -s http://localhost:9000/api/v2/health > /dev/null 2>&1; then
    echo "✅ Dashboard Server: ONLINE"
    echo "   http://localhost:9000"
else
    echo "❌ Dashboard Server: OFFLINE"
fi

# Check keyword service
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Keyword Service: ONLINE"
    echo "   http://localhost:5000"
else
    echo "❌ Keyword Service: OFFLINE"
fi

echo ""
echo "=================================================="
echo "📚 Quick Links:"
echo "   Dashboard: http://localhost:9000"
echo "   API Health: http://localhost:9000/api/v2/health"
echo "   API Docs: http://localhost:9000/api/v2"
echo ""
echo "📝 Logs:"
echo "   Dashboard: logs/dashboard-*.log"
echo "   Keyword: keyword-simple.log"
echo ""
echo "🛑 Stop services:"
echo "   lsof -ti:9000,5000 | xargs kill"
echo "=================================================="
