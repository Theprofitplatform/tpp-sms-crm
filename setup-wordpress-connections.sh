#!/bin/bash

echo "=== WordPress Connection Setup ==="
echo ""

CLIENTS_DIR="/mnt/c/Users/abhis/projects/seo expert/clients"
CONFIG_ENV="/mnt/c/Users/abhis/projects/seo expert/config/env/.env"

# Read credentials from config/env/.env
IAT_USER=$(grep "IAT_WP_USER=" "$CONFIG_ENV" | cut -d'=' -f2)
IAT_PASS=$(grep "IAT_WP_PASSWORD=" "$CONFIG_ENV" | cut -d'=' -f2)
HOTTYRES_USER=$(grep "HOTTYRES_WP_USER=" "$CONFIG_ENV" | cut -d'=' -f2)
HOTTYRES_PASS=$(grep "HOTTYRES_WP_PASSWORD=" "$CONFIG_ENV" | cut -d'=' -f2)
SADC_USER=$(grep "SADC_WP_USER=" "$CONFIG_ENV" | cut -d'=' -f2)
SADC_PASS=$(grep "SADC_WP_PASSWORD=" "$CONFIG_ENV" | cut -d'=' -f2)

# Create Instant Auto Traders .env
echo "1. Creating instantautotraders.env..."
if [ -n "$IAT_USER" ] && [ "$IAT_PASS" != "your-wordpress-app-password-here" ]; then
    cat > "$CLIENTS_DIR/instantautotraders.env" << EOF
WORDPRESS_URL=https://instantautotraders.com.au
WORDPRESS_USER=$IAT_USER
WORDPRESS_APP_PASSWORD=$IAT_PASS
EOF
    echo "   ✅ Created with credentials from config/env/.env"
else
    echo "   ❌ Credentials not found in config/env/.env"
fi
echo ""

# Check Hot Tyres credentials
echo "2. Checking hottyres.env..."
if [ -n "$HOTTYRES_PASS" ] && [ "$HOTTYRES_PASS" != "your-wordpress-app-password-here" ]; then
    cat > "$CLIENTS_DIR/hottyres.env" << EOF
WORDPRESS_URL=https://www.hottyres.com.au
WORDPRESS_USER=$HOTTYRES_USER
WORDPRESS_APP_PASSWORD=$HOTTYRES_PASS
EOF
    echo "   ✅ Created with credentials from config/env/.env"
else
    echo "   ⚠️  Placeholder password detected - real credentials needed"
    echo "   → Get password from WordPress admin"
fi
echo ""

# Check SADC credentials
echo "3. Checking sadcdisabilityservices.env..."
if [ -n "$SADC_PASS" ] && [ "$SADC_PASS" != "your-wordpress-app-password-here" ]; then
    cat > "$CLIENTS_DIR/sadcdisabilityservices.env" << EOF
WORDPRESS_URL=https://sadcdisabilityservices.com.au
WORDPRESS_USER=$SADC_USER
WORDPRESS_APP_PASSWORD=$SADC_PASS
EOF
    echo "   ✅ Created with credentials from config/env/.env"
else
    echo "   ⚠️  Placeholder password detected - real credentials needed"
    echo "   → Get password from WordPress admin"
fi
echo ""

# List created files
echo "4. Checking created .env files..."
ls -lh "$CLIENTS_DIR"/*.env 2>/dev/null | grep -v template || echo "   No .env files found"
echo ""

# Test the API
echo "5. Testing WordPress API..."
if command -v jq &> /dev/null; then
    curl -s http://localhost:9000/api/wordpress/sites | jq .
else
    curl -s http://localhost:9000/api/wordpress/sites
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Open http://localhost:9000"
echo "2. Go to WordPress Manager"
echo "3. You should see connected sites"
echo ""
echo "If sites don't appear:"
echo "- Restart dashboard server: pkill -f dashboard-server && sleep 2 && node dashboard-server.js &"
