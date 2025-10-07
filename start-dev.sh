#!/bin/bash
set -e

# Start Dev Services Script
echo "🚀 Starting SMS CRM Development Environment"
echo "============================================"

# Load environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/smscrm"
export REDIS_URL="redis://localhost:6380"
export REDIS_HOST="localhost"
export REDIS_PORT="6380"
export NEXT_PUBLIC_API_URL="http://localhost:3000"

# Check if Docker containers are running
echo "📦 Checking Docker containers..."
if ! docker ps | grep -q "infra-postgres-1"; then
    echo "Starting PostgreSQL and Redis..."
    docker compose -f infra/docker-compose.yml up -d postgres redis
    sleep 5
fi

# Build lib if needed
if [ ! -d "packages/lib/dist" ]; then
    echo "🔨 Building shared library..."
    pnpm --filter @sms-crm/lib build
fi

echo ""
echo "✅ Ready to start services!"
echo ""
echo "Open 3 terminals and run:"
echo ""
echo "Terminal 1 (API):"
echo "  cd /mnt/c/Users/abhis/projects/ghl\\ copy && source ./start-dev.sh && pnpm dev:api"
echo ""
echo "Terminal 2 (Worker):"
echo "  cd /mnt/c/Users/abhis/projects/ghl\\ copy && source ./start-dev.sh && pnpm dev:worker"
echo ""
echo "Terminal 3 (Web):"
echo "  cd /mnt/c/Users/abhis/projects/ghl\\ copy && pnpm dev:web"
echo ""
echo "Or run in single terminal with tmux/screen (not recommended for dev)"
echo ""
