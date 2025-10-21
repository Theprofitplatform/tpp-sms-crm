#!/bin/bash

# VPS Setup Guide for SEO Expert Automation
# Run this on tpp-vps after files are transferred

echo "======================================"
echo "SEO Expert Automation - VPS Setup"
echo "======================================"
echo ""

cd ~/projects/seo-expert

# 1. Create clients directory if it doesn't exist
echo "1. Creating clients directory..."
mkdir -p clients
echo "✓ Done"
echo ""

# 2. Check if client env files exist
echo "2. Checking for client environment files..."
if [ ! -f "clients/instantautotraders.env" ]; then
    echo "⚠ clients/instantautotraders.env not found"
    echo ""
    echo "Creating template..."
    cat > clients/instantautotraders.env << 'ENVEOF'
# Instant Auto Traders - WordPress Credentials
WP_URL=https://instantautotraders.com.au
WP_USERNAME=your_admin_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WP_SITE_ID=instantautotraders
WP_SITE_NAME=Instant Auto Traders

# Discord Webhook for Notifications
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
ENVEOF
    echo "✓ Template created at clients/instantautotraders.env"
    echo "  Edit this file with your actual credentials"
else
    echo "✓ clients/instantautotraders.env exists"
fi
echo ""

# 3. Verify PM2 status
echo "3. Checking PM2 processes..."
pm2 status
echo ""

# 4. View recent logs
echo "4. Recent automation logs..."
pm2 logs --lines 5 --nostream
echo ""

# 5. Next steps
echo "======================================"
echo "Next Steps:"
echo "======================================"
echo ""
echo "1. Edit client environment files:"
echo "   nano clients/instantautotraders.env"
echo ""
echo "2. Add WordPress credentials:"
echo "   - WP_USERNAME: Your WordPress admin username"
echo "   - WP_APP_PASSWORD: Generate from WordPress admin"
echo "     (Users → Profile → Application Passwords)"
echo ""
echo "3. Add Discord webhook (optional):"
echo "   - Create webhook in Discord server settings"
echo "   - Paste URL in DISCORD_WEBHOOK_URL"
echo ""
echo "4. Test authentication:"
echo "   node test-all-clients.js"
echo ""
echo "5. View automation schedules:"
echo "   - seo-audit-all: Daily at 00:00"
echo "   - client-status-check: Every 6 hours"
echo "   - generate-reports: Daily at 01:00"
echo ""
echo "6. PM2 Management Commands:"
echo "   pm2 status          # View all processes"
echo "   pm2 logs            # View real-time logs"
echo "   pm2 restart all     # Restart all processes"
echo "   pm2 stop all        # Stop all processes"
echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
