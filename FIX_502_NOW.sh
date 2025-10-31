#!/bin/bash
###############################################################################
# Emergency 502 Fix Script
# Fixes database, builds dashboard, cleans disk, restarts services
###############################################################################

set -e

echo "🚑 EMERGENCY 502 FIX"
echo "===================="
echo ""

ssh tpp-vps << 'EMERGENCY_FIX'
  cd ~/projects/seo-expert

  echo "1️⃣ Stopping services..."
  pm2 stop all

  echo ""
  echo "2️⃣ Cleaning disk space (94.5% full!)..."

  # Clean PM2 logs
  pm2 flush
  echo "   ✓ PM2 logs cleared"

  # Clean application logs
  find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
  echo "   ✓ Old app logs cleaned"

  # Clean old backups
  find ~/backups -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true
  echo "   ✓ Old backups cleaned"

  # Clean apt cache
  sudo apt-get clean
  echo "   ✓ APT cache cleaned"

  # Clean old journal logs
  sudo journalctl --vacuum-time=7d
  echo "   ✓ Journal logs cleaned"

  echo ""
  df -h / | grep -v Filesystem

  echo ""
  echo "3️⃣ Fixing database (adding missing table)..."

  # Create scraper_settings table
  sqlite3 database/seo-expert.db << 'SQL'
CREATE TABLE IF NOT EXISTS scraper_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add default settings
INSERT OR IGNORE INTO scraper_settings (key, value) VALUES ('enabled', 'true');
INSERT OR IGNORE INTO scraper_settings (key, value) VALUES ('interval', '3600000');
INSERT OR IGNORE INTO scraper_settings (key, value) VALUES ('max_concurrent', '5');

.quit
SQL

  echo "   ✓ scraper_settings table created"

  echo ""
  echo "4️⃣ Building React dashboard..."

  cd dashboard

  # Install dashboard dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo "   Installing dashboard dependencies..."
    npm ci --silent
  fi

  # Build dashboard
  npm run build
  echo "   ✓ Dashboard built to dist/"

  cd ..

  echo ""
  echo "5️⃣ Fixing port configuration..."

  # Ensure PORT is set to 9000 (current setup)
  if [ -f .env ]; then
    sed -i '/^PORT=/d' .env
  fi
  echo "PORT=9000" >> .env
  echo "   ✓ Port set to 9000"

  echo ""
  echo "6️⃣ Restarting services..."

  pm2 restart all
  pm2 save

  echo "   ✓ Services restarted"

  echo ""
  echo "7️⃣ Restarting Cloudflare tunnel..."

  sudo systemctl restart cloudflared
  echo "   ✓ Cloudflare tunnel restarted"

  echo ""
  echo "⏳ Waiting 15 seconds for services to stabilize..."
  sleep 15

  echo ""
  echo "8️⃣ VERIFICATION:"
  echo "===================="

  echo -e "\n📊 PM2 Status:"
  pm2 status

  echo -e "\n🏥 Health Check:"
  curl -sf http://localhost:9000/health && echo "✅ App responding!" || echo "❌ Still down"

  echo -e "\n🔍 Cloudflare Tunnel:"
  sudo systemctl status cloudflared --no-pager | grep Active

  echo -e "\n💾 Disk Space:"
  df -h / | grep -v Filesystem

  echo ""
  echo "✅ EMERGENCY FIX COMPLETE"
  echo ""
  echo "Test URL: https://seodashboard.theprofitplatform.com.au"
  echo ""
EMERGENCY_FIX

echo ""
echo "✅ Fix script completed!"
echo ""
echo "Test the site now:"
echo "curl -I https://seodashboard.theprofitplatform.com.au/health"
echo ""
