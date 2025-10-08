#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Cloudflare deployment...${NC}\n"

# Check if Wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Wrangler not found. Using local installation..."
    export PATH="$PWD/node_modules/.bin:$PATH"
fi

echo -e "${GREEN}✓${NC} Wrangler is available"

# Login to Cloudflare
echo -e "\n${BLUE}🔐 Logging into Cloudflare...${NC}"
wrangler login

echo -e "${GREEN}✓${NC} Logged into Cloudflare"

# Create D1 database for shortener
echo -e "\n${BLUE}🗄️  Creating D1 database for shortener...${NC}"
cd ../worker/shortener-cloudflare

# Create database
wrangler d1 create sms-crm-shortener

# Get database ID and update wrangler.toml
echo -e "${YELLOW}⚠${NC}  Please update the database_id in worker/shortener-cloudflare/wrangler.toml with the ID above"

# Apply schema
echo -e "\n${BLUE}📋 Applying database schema...${NC}"
wrangler d1 execute sms-crm-shortener --file=./schema.sql

echo -e "${GREEN}✓${NC} Database schema applied"

# Deploy shortener worker
echo -e "\n${BLUE}🚀 Deploying shortener worker...${NC}"
wrangler deploy

echo -e "${GREEN}✓${NC} Shortener worker deployed"

# Setup Cloudflare Pages
echo -e "\n${BLUE}🌐 Setting up Cloudflare Pages...${NC}"
cd ../../apps/web

echo -e "${YELLOW}⚠${NC}  Manual steps for Cloudflare Pages:"
echo -e "1. Go to Cloudflare Dashboard → Pages"
echo -e "2. Connect your GitHub repository"
echo -e "3. Set build directory to 'apps/web'"
echo -e "4. Add environment variables:"
echo -e "   - NEXT_PUBLIC_API_URL: https://api.yourdomain.com"
echo -e "   - NODE_ENV: production"

# Setup DNS and routing
echo -e "\n${BLUE}🌍 Setting up DNS and routing...${NC}"
echo -e "${YELLOW}⚠${NC}  Manual DNS configuration:"
echo -e "1. Point your domain to Cloudflare nameservers"
echo -e "2. Add DNS records:"
echo -e "   - A     api.yourdomain.com    YOUR_VPS_IP"
echo -e "   - CNAME app.yourdomain.com    (Cloudflare Pages URL)"
echo -e "   - CNAME links.yourdomain.com  (Worker URL)"

# Setup WAF and security
echo -e "\n${BLUE}🛡️  Setting up security...${NC}"
echo -e "${YELLOW}⚠${NC}  Enable in Cloudflare Dashboard:"
echo -e "- SSL/TLS: Full (strict)"
echo -e "- WAF Managed Rules"
echo -e "- Bot Fight Mode"
echo -e "- Rate Limiting"

echo -e "\n${GREEN}✅ Cloudflare setup completed!${NC}"
echo -e "\n${BLUE}📋 Next steps:${NC}"
echo -e "1. Complete the manual steps above"
echo -e "2. Update GitHub secrets with Cloudflare credentials"
echo -e "3. Test the deployment workflow"
echo -e "4. Monitor performance and security settings"