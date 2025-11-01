#!/bin/bash
#
# SEO Expert Platform - Manual Deployment Script
# Run this script ON THE VPS after SSHing in
#
# Usage: ./deploy-manual.sh [production|development]
#

set -e  # Exit on error

# Configuration
ENV=${1:-production}
PROJECT_DIR="/var/www/seo-expert"
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"  # UPDATE THIS

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "================================================"
echo "🚀 SEO Expert Platform - Manual Deployment"
echo "================================================"
echo ""
echo "Environment: $ENV"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Check if running on VPS
echo "📍 Checking location..."
HOSTNAME=$(hostname)
echo "   Hostname: $HOSTNAME"

# Check Node.js
echo ""
echo "🔍 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "   Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm $NPM_VERSION${NC}"

# Check if project directory exists
echo ""
echo "📁 Checking project directory..."
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Project directory not found${NC}"
    echo "   Creating directory: $PROJECT_DIR"
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:$USER "$PROJECT_DIR"

    echo "   Cloning repository..."
    echo -e "${YELLOW}⚠️  Update REPO_URL in this script first!${NC}"
    # git clone "$REPO_URL" "$PROJECT_DIR"
    echo -e "${RED}   Please clone your repository manually:${NC}"
    echo "   git clone <your-repo-url> $PROJECT_DIR"
    exit 1
fi

# Navigate to project
cd "$PROJECT_DIR"
echo -e "${GREEN}✅ In project directory: $(pwd)${NC}"

# Check if git repo
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not a git repository${NC}"
    echo "   Initialize with: git init && git remote add origin <your-repo-url>"
    exit 1
fi

# Pull latest code
echo ""
echo "📥 Pulling latest code..."
git fetch --all
git checkout main
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"

# Show current commit
CURRENT_COMMIT=$(git log -1 --oneline)
echo "   Current commit: $CURRENT_COMMIT"

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm ci --omit=dev
echo -e "${GREEN}✅ Root dependencies installed${NC}"

# Install dashboard dependencies
echo ""
echo "📦 Installing dashboard dependencies..."
cd dashboard
npm ci --omit=dev
echo -e "${GREEN}✅ Dashboard dependencies installed${NC}"

# Build dashboard
echo ""
echo "🏗️  Building dashboard..."
npm run build
echo -e "${GREEN}✅ Dashboard built${NC}"

# Return to root
cd ..

# Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p data logs backups/database
echo -e "${GREEN}✅ Directories created${NC}"

# Check if .env exists
echo ""
echo "🔐 Checking environment variables..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "   Creating basic .env file..."
    cat > .env << EOF
NODE_ENV=$ENV
PORT=9000

# Optional: Uncomment and add your Anthropic API key for AI schema generation
# ANTHROPIC_API_KEY=your_key_here
EOF
    echo -e "${GREEN}✅ .env created (please review and update)${NC}"
else
    echo -e "${GREEN}✅ .env exists${NC}"
fi

# Check PM2
echo ""
echo "🔍 Checking PM2..."
if ! npx pm2 --version &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found, will use npx${NC}"
fi

# Stop existing PM2 process (if any)
echo ""
echo "🛑 Stopping existing processes..."
npx pm2 stop seo-dashboard 2>/dev/null || echo "   No existing process to stop"

# Start with PM2
echo ""
echo "🚀 Starting application with PM2..."
npx pm2 start ecosystem.config.cjs --env $ENV
echo -e "${GREEN}✅ Application started${NC}"

# Save PM2 configuration
echo ""
echo "💾 Saving PM2 configuration..."
npx pm2 save
echo -e "${GREEN}✅ PM2 configuration saved${NC}"

# Setup PM2 startup (if not already)
echo ""
echo "🔧 Setting up PM2 startup..."
echo "   Run the following command if prompted:"
npx pm2 startup 2>/dev/null || echo "   (may already be configured)"

# Wait for service to start
echo ""
echo "⏳ Waiting for service to start..."
sleep 5

# Health check
echo ""
echo "🏥 Running health check..."
if curl -f http://localhost:9000/api/v2/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    HEALTH_RESPONSE=$(curl -s http://localhost:9000/api/v2/health)
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "   Checking logs..."
    npx pm2 logs seo-dashboard --lines 20 --nostream
    exit 1
fi

# Show PM2 status
echo ""
echo "📊 PM2 Status:"
npx pm2 status

# Setup monitoring (if first time)
echo ""
echo "📊 Setting up monitoring..."
if [ -f "scripts/setup-monitoring.sh" ]; then
    chmod +x scripts/setup-monitoring.sh
    ./scripts/setup-monitoring.sh
else
    echo -e "${YELLOW}⚠️  Monitoring setup script not found${NC}"
fi

# Setup backups (if first time)
echo ""
echo "💾 Setting up backups..."
if [ -f "scripts/setup-backup-cron.sh" ]; then
    chmod +x scripts/setup-backup-cron.sh
    ./scripts/setup-backup-cron.sh
else
    echo -e "${YELLOW}⚠️  Backup setup script not found${NC}"
fi

# Final verification
echo ""
echo "================================================"
echo "🎉 Deployment Complete!"
echo "================================================"
echo ""
echo "✅ Application Status:"
npx pm2 status | grep seo-dashboard
echo ""
echo "📊 Quick Commands:"
echo "   View logs:    npx pm2 logs seo-dashboard"
echo "   Monitor:      npx pm2 monit"
echo "   Restart:      npx pm2 restart seo-dashboard"
echo "   Stop:         npx pm2 stop seo-dashboard"
echo ""
echo "🔗 Endpoints:"
echo "   Local:  http://localhost:9000/api/v2/health"
echo "   Public: https://seodashboard.theprofitplatform.com.au/api/v2/health"
echo ""
echo "⚠️  If public endpoint returns 502:"
echo "   1. Update Cloudflare Tunnel configuration"
echo "   2. Run GitHub Actions workflow: 'Update Cloudflare Tunnel Configuration'"
echo "   3. Or update manually in Cloudflare Dashboard"
echo ""
echo "📚 Documentation:"
echo "   Operations: cat OPERATIONS_GUIDE.md"
echo "   Deployment: cat VPS_DEPLOYMENT_GUIDE.md"
echo ""
echo "================================================"
