#!/bin/bash
set -e

# VPS Deployment Script for SMS CRM Platform
# Usage: ./deploy-vps.sh tpp-vps

VPS_HOST="$1"
PROJECT_NAME="tpp-sms-crm"

if [ -z "$VPS_HOST" ]; then
    echo "Usage: ./deploy-vps.sh <vps-host>"
    echo "Example: ./deploy-vps.sh tpp-vps"
    exit 1
fi

echo "🚀 Deploying SMS CRM Platform to $VPS_HOST"
echo "================================================"

# Step 1: Check SSH connection and get user/home
echo "📡 Testing SSH connection..."
if ! ssh -q "$VPS_HOST" exit 2>/dev/null; then
    echo "❌ Cannot connect to $VPS_HOST"
    echo "Please check:"
    echo "  - VPS is running"
    echo "  - SSH key is configured"
    echo "  - Host is in ~/.ssh/config or use: tpp-vps"
    exit 1
fi

echo "✅ SSH connection successful"

# Get remote user and home directory
VPS_USER=$(ssh "$VPS_HOST" 'whoami')
VPS_HOME=$(ssh "$VPS_HOST" 'echo $HOME')
REMOTE_PATH="$VPS_HOME/projects/tpp-sms-crm"

echo "📋 Remote user: $VPS_USER"
echo "📋 Remote path: $REMOTE_PATH"

# Step 2: Prepare VPS
echo "📦 Preparing VPS..."
ssh "$VPS_HOST" << 'ENDSSH'
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com | sudo sh
        sudo systemctl enable docker
        sudo systemctl start docker
        sudo usermod -aG docker $USER
    fi

    # Install Node.js 20 if not present
    if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
        echo "Installing Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
        sudo apt-get install -y nodejs
    fi

    # Install pnpm
    if ! command -v pnpm &> /dev/null; then
        echo "Installing pnpm..."
        sudo npm install -g pnpm@8.15.0
    fi

    # Create projects directory
    mkdir -p $HOME/projects

    echo "✅ VPS prepared"
ENDSSH

# Step 3: Copy project files
echo "📤 Copying project files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.next' \
    --exclude 'build' \
    --exclude '.git' \
    --exclude 'postgres_data' \
    --exclude 'redis_data' \
    ./ "$VPS_HOST:$REMOTE_PATH/"

echo "✅ Files copied"

# Step 4: Setup on VPS
echo "⚙️  Setting up project on VPS..."
ssh "$VPS_HOST" << ENDSSH
    cd $REMOTE_PATH

    # Install dependencies
    echo "Installing dependencies..."
    pnpm install

    # Build lib
    echo "Building shared library..."
    pnpm --filter @sms-crm/lib build

    # Start Docker containers
    echo "Starting PostgreSQL and Redis..."
    docker compose -f infra/docker-compose.yml up -d postgres redis

    # Wait for database
    sleep 10

    # Run migrations
    echo "Running database migrations..."
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smscrm" \
    pnpm --filter @sms-crm/lib migrate

    # Seed database
    echo "Seeding database..."
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smscrm" \
    pnpm --filter @sms-crm/lib seed

    echo "✅ Setup complete"
ENDSSH

# Step 5: Create systemd services
echo "🔧 Creating systemd services..."
ssh "$VPS_HOST" "REMOTE_PATH=$REMOTE_PATH VPS_USER=$VPS_USER bash -s" << 'ENDSSH'
    # API Service
    sudo tee /etc/systemd/system/tpp-sms-crm-api.service > /dev/null << EOF
[Unit]
Description=TPP SMS CRM API Service
After=network.target docker.service

[Service]
Type=simple
User=$VPS_USER
WorkingDirectory=$REMOTE_PATH
Environment="DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smscrm"
Environment="REDIS_URL=redis://localhost:6379"
Environment="REDIS_HOST=localhost"
Environment="REDIS_PORT=6379"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/pnpm dev:api
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Worker Service
    sudo tee /etc/systemd/system/tpp-sms-crm-worker.service << 'EOF'
[Unit]
Description=TPP SMS CRM Worker Service
After=network.target docker.service

[Service]
Type=simple
User=$VPS_USER
WorkingDirectory=$REMOTE_PATH
Environment="DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smscrm"
Environment="REDIS_URL=redis://localhost:6379"
Environment="REDIS_HOST=localhost"
Environment="REDIS_PORT=6379"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/pnpm dev:worker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Web Service
    sudo tee /etc/systemd/system/tpp-sms-crm-web.service << 'EOF'
[Unit]
Description=TPP SMS CRM Web Service
After=network.target

[Service]
Type=simple
User=$VPS_USER
WorkingDirectory=$REMOTE_PATH
Environment="NEXT_PUBLIC_API_URL=http://localhost:3000"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/pnpm dev:web
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    sudo systemctl daemon-reload

    # Enable and start services
    sudo systemctl enable tpp-sms-crm-api tpp-sms-crm-worker tpp-sms-crm-web
    sudo systemctl start tpp-sms-crm-api tpp-sms-crm-worker tpp-sms-crm-web

    echo "✅ Services created and started"
ENDSSH

# Step 6: Setup nginx
echo "🌐 Setting up Nginx..."
ssh "$VPS_HOST" << 'ENDSSH'
    if ! command -v nginx &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y nginx
    fi

    sudo tee /etc/nginx/sites-available/sms-crm << 'EOF'
server {
    listen 80;
    server_name _;

    # API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Web UI
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/sms-crm /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx

    echo "✅ Nginx configured"
ENDSSH

echo ""
echo "================================================"
echo "🎉 Deployment Complete!"
echo "================================================"
echo ""
echo "Services running on $VPS_HOST:"
echo "  - Web UI: http://$VPS_HOST"
echo "  - API: http://$VPS_HOST/api/health"
echo ""
echo "To check service status:"
echo "  ssh $VPS_HOST 'systemctl status tpp-sms-crm-*'"
echo ""
echo "To view logs:"
echo "  ssh $VPS_HOST 'journalctl -u tpp-sms-crm-api -f'"
echo "  ssh $VPS_HOST 'journalctl -u tpp-sms-crm-worker -f'"
echo "  ssh $VPS_HOST 'journalctl -u tpp-sms-crm-web -f'"
echo ""
echo "To update Twilio credentials:"
echo "  ssh $VPS_HOST 'cd /root/projects/tpp-sms-crm && vi .env'"
echo "  Then restart services: systemctl restart tpp-sms-crm-*"
echo ""
