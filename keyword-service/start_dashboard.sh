#!/bin/bash

# Start Dashboard Script
# Starts both backend and frontend servers for the Keyword Research Dashboard

echo "=========================================="
echo "🚀 Starting Keyword Research Dashboard"
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run setup first:"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "❌ Frontend dependencies not found!"
    echo "Please run: cd frontend && npm install"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo "Please edit .env and add your API keys, then run this script again."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Start backend server
echo "🔧 Starting backend server..."
source venv/bin/activate
python web_app_enhanced.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server
echo "⚛️  Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a bit for servers to start
sleep 3

echo ""
echo "=========================================="
echo "✅ Dashboard is running!"
echo "=========================================="
echo ""
echo "Backend API:  http://localhost:5000"
echo "Frontend:     http://localhost:4000"
echo ""
echo "Open your browser and go to:"
echo "  👉 http://localhost:4000"
echo ""
echo "Press CTRL+C to stop all servers"
echo "=========================================="
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
