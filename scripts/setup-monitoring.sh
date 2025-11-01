#!/bin/bash

# SEO Expert Platform - Monitoring Setup
# Sets up basic monitoring for production environment

echo "🔍 SEO Expert Platform - Monitoring Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PM2 is running
echo "1. Checking PM2 status..."
if npx pm2 list | grep -q "seo-dashboard"; then
  echo -e "${GREEN}✅ PM2 is running${NC}"
else
  echo -e "${RED}❌ PM2 is not running or seo-dashboard not found${NC}"
  echo "   Start it with: npx pm2 start ecosystem.config.cjs"
  exit 1
fi

echo ""

# Install PM2 log rotation
echo "2. Setting up PM2 log rotation..."
if npx pm2 list | grep -q "pm2-logrotate"; then
  echo -e "${YELLOW}⚠️  pm2-logrotate already installed${NC}"
else
  npx pm2 install pm2-logrotate
  echo -e "${GREEN}✅ Installed pm2-logrotate${NC}"
fi

# Configure log rotation
echo ""
echo "3. Configuring log rotation..."
npx pm2 set pm2-logrotate:max_size 10M
npx pm2 set pm2-logrotate:retain 30
npx pm2 set pm2-logrotate:compress true
npx pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
echo -e "${GREEN}✅ Log rotation configured (10MB max, 30 files, daily)${NC}"

echo ""
echo "4. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/api/v2/health)
if [ "$HEALTH_RESPONSE" -eq 200 ]; then
  echo -e "${GREEN}✅ Health endpoint responding (HTTP $HEALTH_RESPONSE)${NC}"
else
  echo -e "${RED}❌ Health endpoint not responding properly (HTTP $HEALTH_RESPONSE)${NC}"
fi

echo ""
echo "5. Current PM2 Status:"
npx pm2 status

echo ""
echo "=========================================="
echo "✅ Monitoring setup complete!"
echo ""
echo "📊 Monitoring Options:"
echo ""
echo "1. PM2 Web Dashboard:"
echo "   npx pm2 web"
echo "   Access at: http://localhost:9615"
echo ""
echo "2. PM2 Monitoring (Optional - Requires PM2 Plus account):"
echo "   npx pm2 link <secret> <public>"
echo "   Sign up at: https://pm2.io"
echo ""
echo "3. External Uptime Monitoring (Recommended):"
echo "   UptimeRobot: https://uptimerobot.com"
echo "   Pingdom: https://www.pingdom.com"
echo "   Monitor: https://seodashboard.theprofitplatform.com.au/api/v2/health"
echo ""
echo "4. View Logs:"
echo "   npx pm2 logs seo-dashboard"
echo "   npx pm2 logs seo-dashboard --lines 100"
echo ""
echo "5. Monitor Resources:"
echo "   npx pm2 monit"
echo ""
