#!/bin/bash
# Cloudflare Tunnel Setup Script for VPS
# Run this on your VPS: ssh avi@31.97.222.218 < setup-cloudflare-tunnel.sh

set -e

echo "🚀 Setting up Cloudflare Tunnel on VPS..."
echo ""

# Navigate to deployment directory
cd /home/avi/seo-automation/current || {
    echo "❌ Deployment directory not found!"
    echo "Please run the deployment first"
    exit 1
}

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found, creating from example..."
    cp .env.example .env 2>/dev/null || touch .env
fi

# Check if token already exists
if grep -q "^CLOUDFLARE_TUNNEL_TOKEN=" .env && [ -n "$(grep "^CLOUDFLARE_TUNNEL_TOKEN=" .env | cut -d'=' -f2)" ]; then
    echo "✅ Cloudflare tunnel token already configured"
    CURRENT_TOKEN=$(grep "^CLOUDFLARE_TUNNEL_TOKEN=" .env | cut -d'=' -f2)
    echo "Current token (first 50 chars): ${CURRENT_TOKEN:0:50}..."

    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing token"
        TOKEN_CONFIGURED=true
    fi
fi

# Get token if not configured
if [ -z "$TOKEN_CONFIGURED" ]; then
    echo ""
    echo "📋 To get your Cloudflare Tunnel token:"
    echo "1. Go to: https://one.dash.cloudflare.com/"
    echo "2. Navigate to: Zero Trust → Networks → Tunnels"
    echo "3. Find/Create your tunnel"
    echo "4. Copy the tunnel token"
    echo ""
    echo "The token looks like: eyJhIjoiXXXX...XXXXX"
    echo ""
    read -p "Enter your Cloudflare Tunnel Token: " TUNNEL_TOKEN

    if [ -z "$TUNNEL_TOKEN" ]; then
        echo "❌ No token provided, exiting"
        exit 1
    fi

    # Backup existing .env
    cp .env .env.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

    # Add or update token in .env
    if grep -q "^CLOUDFLARE_TUNNEL_TOKEN=" .env; then
        # Update existing
        sed -i "s|^CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN|" .env
    else
        # Add new
        echo "" >> .env
        echo "# Cloudflare Tunnel" >> .env
        echo "CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN" >> .env
    fi

    echo "✅ Token added to .env"
fi

echo ""
echo "🔍 Current Docker containers:"
docker compose -f docker-compose.prod.yml ps

echo ""
read -p "Do you want to restart services with Cloudflare Tunnel? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo ""
    echo "🛑 Stopping current services..."
    docker compose -f docker-compose.prod.yml down

    echo ""
    echo "🚀 Starting services with Cloudflare Tunnel..."
    docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d

    echo ""
    echo "⏳ Waiting for services to start..."
    sleep 15

    echo ""
    echo "📊 Service status:"
    docker compose -f docker-compose.prod.yml ps

    echo ""
    echo "🔍 Checking Cloudflared logs..."
    docker compose -f docker-compose.prod.yml logs cloudflared --tail 20

    echo ""
    echo "🏥 Testing API health..."
    sleep 5
    if curl -sf http://localhost:9000/api/v2/health > /dev/null 2>&1; then
        echo "✅ API is responding!"
        curl -s http://localhost:9000/api/v2/health | jq . 2>/dev/null || curl -s http://localhost:9000/api/v2/health
    else
        echo "⚠️  API not responding yet, check logs with:"
        echo "docker compose -f docker-compose.prod.yml logs dashboard"
    fi

    echo ""
    echo "✨ Setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Verify Cloudflare Tunnel is connected in Cloudflare dashboard"
    echo "2. Test public URL: https://seo-expert.theprofitplatform.com.au"
    echo "3. Check logs if needed: docker compose -f docker-compose.prod.yml logs cloudflared"
else
    echo ""
    echo "ℹ️  Services not restarted. To restart manually:"
    echo "docker compose -f docker-compose.prod.yml down"
    echo "docker compose -f docker-compose.prod.yml --profile with-cloudflare up -d"
fi

echo ""
echo "📋 Useful commands:"
echo "- View all logs: docker compose -f docker-compose.prod.yml logs"
echo "- View Cloudflared logs: docker compose -f docker-compose.prod.yml logs cloudflared"
echo "- View dashboard logs: docker compose -f docker-compose.prod.yml logs dashboard"
echo "- Restart services: docker compose -f docker-compose.prod.yml restart"
echo "- Stop services: docker compose -f docker-compose.prod.yml down"
