#!/bin/bash

##############################################################################
# TPP VPS Deployment Script
# Deploys SEO Expert platform to tpp-vps with full integration
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="tpp-vps"
VPS_PROJECT_DIR="~/projects/seo-expert"
APP_PORT="3007"
DOMAIN="seo-expert.theprofitplatform.com.au"

##############################################################################
# Helper Functions
##############################################################################

print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

check_ssh() {
    print_step "Checking SSH connection to tpp-vps..."
    if ssh -o ConnectTimeout=5 "$VPS_HOST" "echo 'Connected'" &>/dev/null; then
        print_success "SSH connection successful"
        return 0
    else
        print_error "Cannot connect to $VPS_HOST"
        echo "Please ensure:"
        echo "  1. SSH config has 'tpp-vps' alias configured"
        echo "  2. SSH keys are set up"
        echo "  3. VPS is accessible"
        return 1
    fi
}

##############################################################################
# Main Deployment Steps
##############################################################################

deploy_local_prep() {
    print_step "Step 1: Preparing local environment..."

    # Check git status
    if [[ -n $(git status -s) ]]; then
        print_warning "You have uncommitted changes"
        read -p "Do you want to commit them? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            read -p "Enter commit message: " commit_msg
            git commit -m "$commit_msg"
            print_success "Changes committed"
        fi
    fi

    # Check current branch
    current_branch=$(git branch --show-current)
    print_success "Current branch: $current_branch"

    # Push to remote
    read -p "Push to remote? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin "$current_branch"
        print_success "Pushed to origin/$current_branch"
    fi
}

deploy_vps_update() {
    print_step "Step 2: Updating code on TPP VPS..."

    ssh "$VPS_HOST" << 'ENDSSH'
        set -e
        cd ~/projects/seo-expert

        echo "Current branch: $(git branch --show-current)"
        echo "Pulling latest changes..."
        git fetch origin
        git pull origin $(git branch --show-current)

        echo "Installing dependencies..."
        npm ci --production

        echo "✓ Code updated successfully"
ENDSSH

    print_success "VPS code updated"
}

deploy_env_setup() {
    print_step "Step 3: Setting up environment..."

    # Check if .env exists on VPS
    if ssh "$VPS_HOST" "test -f $VPS_PROJECT_DIR/.env"; then
        print_warning ".env file already exists on VPS"
        read -p "Do you want to update it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_success "Keeping existing .env"
            return 0
        fi
    fi

    print_warning "Setting up environment variables..."
    echo "Please provide the following:"
    read -p "Database password: " -s db_pass
    echo
    read -p "JWT secret: " -s jwt_secret
    echo

    ssh "$VPS_HOST" "cat > $VPS_PROJECT_DIR/.env" << EOF
NODE_ENV=production
PORT=$APP_PORT

# Database
DATABASE_URL=postgresql://seo_user:${db_pass}@localhost:5432/seo_expert

# Redis
REDIS_URL=redis://localhost:6379

# API
API_BASE_URL=https://api.theprofitplatform.com.au
API_VERSION=v2

# Security
JWT_SECRET=${jwt_secret}
SESSION_SECRET=$(openssl rand -hex 32)

# Integration
SERPBEAR_URL=http://localhost:3006
SEO_ANALYST_URL=http://localhost:5002

# Features
ENABLE_API_V2=true
ENABLE_DASHBOARD=true
ENABLE_MONITORING=true
EOF

    ssh "$VPS_HOST" "chmod 600 $VPS_PROJECT_DIR/.env"
    print_success "Environment configured"
}

deploy_database() {
    print_step "Step 4: Setting up database..."

    ssh "$VPS_HOST" << 'ENDSSH'
        set -e

        # Check if database exists
        if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw seo_expert; then
            echo "✓ Database 'seo_expert' already exists"
        else
            echo "Creating database..."
            sudo -u postgres psql -c "CREATE DATABASE seo_expert;"
            sudo -u postgres psql -c "CREATE USER seo_user WITH PASSWORD 'change_me';"
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE seo_expert TO seo_user;"
            echo "✓ Database created"
        fi

        # Initialize database
        cd ~/projects/seo-expert
        if [ -f "database/init.sql" ]; then
            echo "Running database migrations..."
            psql -U seo_user -d seo_expert < database/init.sql 2>/dev/null || echo "Already initialized"
        fi
ENDSSH

    print_success "Database configured"
}

deploy_service() {
    print_step "Step 5: Deploying application..."

    # Ask deployment method
    echo "Choose deployment method:"
    echo "1) Docker Compose (recommended)"
    echo "2) PM2"
    read -p "Enter choice (1 or 2): " -n 1 -r deploy_method
    echo

    if [[ $deploy_method == "1" ]]; then
        deploy_docker
    else
        deploy_pm2
    fi
}

deploy_docker() {
    print_step "Deploying with Docker Compose..."

    ssh "$VPS_HOST" << 'ENDSSH'
        set -e
        cd ~/projects/seo-expert

        # Stop existing containers
        if [ -f "docker-compose.yml" ]; then
            echo "Stopping existing containers..."
            docker-compose down 2>/dev/null || true
        fi

        # Start services
        echo "Starting services..."
        docker-compose up -d

        # Wait for services to be ready
        echo "Waiting for services to start..."
        sleep 5

        # Check status
        docker-compose ps

        echo "✓ Docker deployment complete"
ENDSSH

    print_success "Docker deployment successful"
}

deploy_pm2() {
    print_step "Deploying with PM2..."

    ssh "$VPS_HOST" << 'ENDSSH'
        set -e
        cd ~/projects/seo-expert

        # Check if PM2 is installed
        if ! command -v pm2 &> /dev/null; then
            echo "Installing PM2..."
            sudo npm install -g pm2
        fi

        # Stop existing process
        pm2 stop seo-expert 2>/dev/null || true
        pm2 delete seo-expert 2>/dev/null || true

        # Start application
        echo "Starting application with PM2..."
        pm2 start ecosystem.config.cjs

        # Save PM2 configuration
        pm2 save

        # Check status
        pm2 status

        echo "✓ PM2 deployment complete"
ENDSSH

    print_success "PM2 deployment successful"
}

deploy_nginx() {
    print_step "Step 6: Configuring Nginx..."

    # Check if nginx config exists
    if ssh "$VPS_HOST" "test -f /etc/nginx/sites-available/$DOMAIN"; then
        print_success "Nginx configuration already exists"
        read -p "Do you want to update it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    print_warning "Creating Nginx configuration..."
    ssh "$VPS_HOST" "sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null" << 'EOF'
# SEO Expert Unified Dashboard
server {
    listen 80;
    listen [::]:80;
    server_name seo-expert.theprofitplatform.com.au;

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seo-expert.theprofitplatform.com.au;

    # SSL will be configured by certbot

    location / {
        proxy_pass http://127.0.0.1:3007;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v2/ {
        proxy_pass http://127.0.0.1:3007;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    access_log /var/log/nginx/seo-expert-access.log;
    error_log /var/log/nginx/seo-expert-error.log;
}
EOF

    # Enable site
    ssh "$VPS_HOST" "sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN"

    # Test and reload
    ssh "$VPS_HOST" "sudo nginx -t && sudo systemctl reload nginx"

    print_success "Nginx configured"

    # Offer to setup SSL
    read -p "Setup SSL with certbot? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ssh "$VPS_HOST" "sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || echo 'SSL setup may need manual configuration'"
    fi
}

deploy_verify() {
    print_step "Step 7: Verifying deployment..."

    echo "Checking service health..."

    # Check if service is running
    if ssh "$VPS_HOST" "curl -sf http://localhost:$APP_PORT/health > /dev/null"; then
        print_success "Service is healthy (http://localhost:$APP_PORT/health)"
    else
        print_error "Service health check failed"
        echo "Checking logs..."
        ssh "$VPS_HOST" "cd $VPS_PROJECT_DIR && (docker-compose logs --tail 20 2>/dev/null || pm2 logs --lines 20)"
        return 1
    fi

    # Check all SEO services
    echo ""
    echo "SEO Services Status:"
    ssh "$VPS_HOST" << 'ENDSSH'
        echo -n "  SerpBear (3006): "
        curl -sf http://localhost:3006/api/domains > /dev/null && echo "✓" || echo "✗"

        echo -n "  SEO Analyst (5002): "
        curl -sf http://localhost:5002/health > /dev/null && echo "✓" || echo "✗"

        echo -n "  SEO Expert (3007): "
        curl -sf http://localhost:3007/health > /dev/null && echo "✓" || echo "✗"
ENDSSH

    print_success "Deployment verification complete"
}

deploy_summary() {
    print_step "Deployment Summary"

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  🎉 SEO Expert Platform Deployed Successfully!"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "  📍 VPS: $VPS_HOST"
    echo "  📂 Path: $VPS_PROJECT_DIR"
    echo "  🌐 Port: $APP_PORT"
    echo ""
    echo "  🔗 Access URLs:"
    echo "    • Dashboard: https://$DOMAIN"
    echo "    • API v2: https://$DOMAIN/api/v2"
    echo "    • Health: https://$DOMAIN/health"
    echo ""
    echo "  🔧 Integrated Services:"
    echo "    • SerpBear: http://localhost:3006"
    echo "    • SEO Analyst: http://localhost:5002"
    echo "    • SEO Expert: http://localhost:$APP_PORT"
    echo ""
    echo "  📊 Management Commands:"
    echo "    • View logs: ssh $VPS_HOST 'cd $VPS_PROJECT_DIR && docker-compose logs -f'"
    echo "    • Restart: ssh $VPS_HOST 'cd $VPS_PROJECT_DIR && docker-compose restart'"
    echo "    • Status: ssh $VPS_HOST 'cd $VPS_PROJECT_DIR && docker-compose ps'"
    echo ""
    echo "  📚 Documentation:"
    echo "    • Integration Guide: .claude/skills/vps/VPS_INTEGRATION_GUIDE.md"
    echo "    • VPS Skill: .claude/skills/vps/SKILL.md"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo ""
}

##############################################################################
# Main Execution
##############################################################################

main() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  🚀 TPP VPS Deployment Script"
    echo "  SEO Expert Platform"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    # Check prerequisites
    check_ssh || exit 1

    # Confirm deployment
    print_warning "This will deploy SEO Expert to $VPS_HOST on port $APP_PORT"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 0
    fi

    # Execute deployment steps
    deploy_local_prep
    deploy_vps_update
    deploy_env_setup
    deploy_database
    deploy_service
    deploy_nginx
    deploy_verify
    deploy_summary

    print_success "All done! 🎉"
}

# Run main function
main "$@"
