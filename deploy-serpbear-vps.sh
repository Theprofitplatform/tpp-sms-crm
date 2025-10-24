#!/bin/bash

# Deploy SerpBear to VPS with Cloudflare Tunnel
# Usage: ./deploy-serpbear-vps.sh

set -euo pipefail

VPS_HOST="tpp-vps"
VPS_PATH="~/projects/serpbear"
LOCAL_SERPBEAR="./serpbear"

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_NC='\033[0m'

print_header() {
    echo -e "${COLOR_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_NC}"
    echo -e "${COLOR_BLUE}$1${COLOR_NC}"
    echo -e "${COLOR_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_NC}"
    echo ""
}

print_success() {
    echo -e "${COLOR_GREEN}✓ $1${COLOR_NC}"
}

print_warning() {
    echo -e "${COLOR_YELLOW}⚠ $1${COLOR_NC}"
}

print_error() {
    echo -e "${COLOR_RED}✗ $1${COLOR_NC}"
}

print_info() {
    echo -e "${COLOR_BLUE}ℹ $1${COLOR_NC}"
}

# Pre-flight checks
preflight_checks() {
    print_header "🔍 Pre-flight Checks"
    
    # Check if serpbear directory exists locally
    if [ ! -d "$LOCAL_SERPBEAR" ]; then
        print_error "SerpBear directory not found at $LOCAL_SERPBEAR"
        exit 1
    fi
    print_success "SerpBear directory found"
    
    # Check if .env.production exists
    if [ ! -f "$LOCAL_SERPBEAR/.env.production" ]; then
        print_warning ".env.production not found, will use .env.example"
    else
        print_success "Production environment file found"
    fi
    
    # Check SSH connection
    if ! ssh -o ConnectTimeout=5 "$VPS_HOST" "echo 'Connected'" &> /dev/null; then
        print_error "Cannot connect to VPS at $VPS_HOST"
        echo ""
        echo "Make sure you have SSH access configured:"
        echo "  ssh-copy-id $VPS_HOST"
        exit 1
    fi
    print_success "SSH connection to VPS verified"
    
    echo ""
}

# Step 1: Sync files to VPS
sync_files() {
    print_header "📦 Step 1: Syncing Files to VPS"
    
    print_info "Creating directory on VPS..."
    ssh "$VPS_HOST" "mkdir -p $VPS_PATH"
    
    print_info "Syncing SerpBear files..."
    rsync -avz --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='data' \
        --exclude='.next' \
        --exclude='coverage' \
        --exclude='*.log' \
        "$LOCAL_SERPBEAR/" "$VPS_HOST:$VPS_PATH/"
    
    print_success "Files synced to VPS"
    echo ""
}

# Step 2: Build Docker image on VPS
build_docker() {
    print_header "🐳 Step 2: Building Docker Image"
    
    print_info "Building SerpBear Docker image on VPS..."
    ssh "$VPS_HOST" << 'ENDSSH'
cd ~/projects/serpbear
docker build -t serpbear:production .
ENDSSH
    
    print_success "Docker image built successfully"
    echo ""
}

# Step 3: Configure environment
configure_env() {
    print_header "⚙️  Step 3: Configuring Environment"
    
    print_info "Checking environment configuration..."
    
    # Check if .env.production exists on VPS
    ENV_EXISTS=$(ssh "$VPS_HOST" "[ -f $VPS_PATH/.env.production ] && echo 'yes' || echo 'no'")
    
    if [ "$ENV_EXISTS" = "no" ]; then
        print_warning "No .env.production found on VPS"
        echo ""
        echo "Please edit the environment file:"
        echo "  ssh $VPS_HOST"
        echo "  cd $VPS_PATH"
        echo "  nano .env.production"
        echo ""
        echo "Update these values:"
        echo "  - PASSWORD (change from default)"
        echo "  - SECRET (generate random 64+ char string)"
        echo "  - APIKEY (generate random key)"
        echo "  - NEXT_PUBLIC_APP_URL (your Cloudflare Tunnel URL)"
        echo ""
        read -p "Press Enter after you've configured .env.production..."
    else
        print_success "Environment file exists"
    fi
    
    echo ""
}

# Step 4: Deploy with Docker Compose
deploy_docker() {
    print_header "🚀 Step 4: Deploying SerpBear"
    
    print_info "Starting SerpBear with Docker Compose..."
    ssh "$VPS_HOST" << 'ENDSSH'
cd ~/projects/serpbear

# Stop existing container if running
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Start new container
docker-compose -f docker-compose.prod.yml up -d

# Wait for container to be healthy
echo "Waiting for SerpBear to start..."
sleep 10

# Check container status
docker-compose -f docker-compose.prod.yml ps
ENDSSH
    
    print_success "SerpBear container started"
    echo ""
}

# Step 5: Setup Cloudflare Tunnel
setup_tunnel() {
    print_header "🌐 Step 5: Cloudflare Tunnel Setup"
    
    echo "To expose SerpBear through Cloudflare Tunnel:"
    echo ""
    echo "Option A: Using Cloudflared (Recommended)"
    echo "----------------------------------------"
    echo "1. Install cloudflared on VPS:"
    echo "   ssh $VPS_HOST"
    echo "   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
    echo "   sudo dpkg -i cloudflared-linux-amd64.deb"
    echo ""
    echo "2. Authenticate cloudflared:"
    echo "   cloudflared tunnel login"
    echo ""
    echo "3. Create a tunnel:"
    echo "   cloudflared tunnel create serpbear"
    echo ""
    echo "4. Route traffic to local service:"
    echo "   cloudflared tunnel route dns serpbear serpbear.theprofitplatform.com.au"
    echo ""
    echo "5. Create config file (~/.cloudflared/config.yml):"
    echo "   tunnel: <YOUR_TUNNEL_ID>"
    echo "   credentials-file: /home/user/.cloudflared/<TUNNEL_ID>.json"
    echo "   ingress:"
    echo "     - hostname: serpbear.theprofitplatform.com.au"
    echo "       service: http://localhost:3001"
    echo "     - service: http_status:404"
    echo ""
    echo "6. Run tunnel as service:"
    echo "   cloudflared service install"
    echo "   sudo systemctl start cloudflared"
    echo "   sudo systemctl enable cloudflared"
    echo ""
    echo "Option B: Nginx + Cloudflare Proxy (Alternative)"
    echo "-----------------------------------------------"
    echo "1. Install Nginx on VPS"
    echo "2. Configure reverse proxy to localhost:3001"
    echo "3. Point DNS A record to VPS IP"
    echo "4. Enable Cloudflare proxy (orange cloud)"
    echo ""
    
    read -p "Have you set up the Cloudflare Tunnel? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Remember to set up the tunnel to access SerpBear publicly"
    fi
    echo ""
}

# Step 6: Final verification
verify_deployment() {
    print_header "✅ Step 6: Verification"
    
    print_info "Checking container health..."
    ssh "$VPS_HOST" << 'ENDSSH'
cd ~/projects/serpbear
docker-compose -f docker-compose.prod.yml logs --tail=20
ENDSSH
    
    echo ""
    print_success "Deployment Complete!"
    echo ""
}

# Display summary
show_summary() {
    print_header "📋 Deployment Summary"
    
    echo "✅ SerpBear is now running on your VPS!"
    echo ""
    echo "📍 Local access (on VPS):"
    echo "   http://localhost:3001"
    echo ""
    echo "🌐 Public access (after Cloudflare Tunnel setup):"
    echo "   https://serpbear.theprofitplatform.com.au"
    echo ""
    echo "📊 Management Commands:"
    echo "   View logs:     ssh $VPS_HOST 'cd $VPS_PATH && docker-compose -f docker-compose.prod.yml logs -f'"
    echo "   Restart:       ssh $VPS_HOST 'cd $VPS_PATH && docker-compose -f docker-compose.prod.yml restart'"
    echo "   Stop:          ssh $VPS_HOST 'cd $VPS_PATH && docker-compose -f docker-compose.prod.yml down'"
    echo "   Start:         ssh $VPS_HOST 'cd $VPS_PATH && docker-compose -f docker-compose.prod.yml up -d'"
    echo ""
    echo "🔐 Default credentials (CHANGE THESE!):"
    echo "   Username: admin"
    echo "   Password: (from your .env.production file)"
    echo ""
    echo "📚 Next Steps:"
    echo "   1. Set up Cloudflare Tunnel (see above)"
    echo "   2. Change default password in settings"
    echo "   3. Configure Google Search Console integration"
    echo "   4. Configure Google Ads integration"
    echo "   5. Add your domains and keywords"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
    clear
    print_header "🚀 SerpBear VPS Deployment Script"
    
    preflight_checks
    
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    sync_files
    build_docker
    configure_env
    deploy_docker
    setup_tunnel
    verify_deployment
    show_summary
}

# Run main function
main
