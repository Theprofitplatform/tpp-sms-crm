#!/bin/bash

echo "🔄 Restarting Dashboard Server..."
echo ""

# Find and kill dashboard-server.js processes
PIDS=$(pgrep -f "dashboard-server.js")

if [ -n "$PIDS" ]; then
    echo "Found running processes: $PIDS"
    for PID in $PIDS; do
        echo "Killing process $PID..."
        kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null || echo "  (Could not kill $PID - may need sudo)"
    done
    sleep 2
fi

# Check if port is still in use
if lsof -Pi :9000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 9000 still in use. Trying force kill..."
    PORT_PID=$(lsof -Pi :9000 -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        kill -9 $PORT_PID 2>/dev/null || echo "  (Need sudo to kill $PORT_PID)"
    fi
    sleep 2
fi

# Start fresh
echo ""
echo "Starting new server..."
cd "/mnt/c/Users/abhis/projects/seo expert"
node dashboard-server.js > /tmp/dashboard-current.log 2>&1 &
NEW_PID=$!

sleep 3

# Verify
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "✅ Server started successfully (PID: $NEW_PID)"
    echo "📊 Dashboard: http://localhost:9000"
    echo "🚀 React Dev:  http://localhost:5173"
    echo ""
    echo "Testing API..."
    if curl -s http://localhost:9000/api/dashboard > /dev/null 2>&1; then
        echo "✅ API responding"
    else
        echo "⚠️  API not responding yet"
    fi
else
    echo "❌ Server failed to start. Check logs:"
    echo "   tail -50 /tmp/dashboard-current.log"
fi
