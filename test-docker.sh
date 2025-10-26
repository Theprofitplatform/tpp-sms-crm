#!/bin/bash
# Quick Docker test script

echo "🐳 Testing Docker setup for SEO Automation Platform"
echo ""

# Stop local Node.js instance
echo "1️⃣ Stopping local Node.js server..."
pkill -f "node dashboard-server.js"
sleep 2

# Build Docker image
echo ""
echo "2️⃣ Building Docker image (this may take 2-3 minutes)..."
docker build -f Dockerfile.dashboard -t seo-automation-dashboard:test . || exit 1

# Run container
echo ""
echo "3️⃣ Starting Docker container..."
docker run -d \
  --name seo-dashboard-test \
  -p 3001:3000 \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/logs:/app/logs" \
  seo-automation-dashboard:test

# Wait for startup
echo ""
echo "4️⃣ Waiting for server to start..."
sleep 5

# Test
echo ""
echo "5️⃣ Testing server..."
curl -s http://localhost:3001/ | head -10

echo ""
echo ""
echo "✅ Docker test complete!"
echo ""
echo "Access dashboard at: http://localhost:3001/"
echo ""
echo "View logs:"
echo "  docker logs -f seo-dashboard-test"
echo ""
echo "Stop Docker:"
echo "  docker stop seo-dashboard-test"
echo "  docker rm seo-dashboard-test"
echo ""
echo "Restart local Node.js:"
echo "  cd \"/mnt/c/Users/abhis/projects/seo expert\""
echo "  node dashboard-server.js &"
