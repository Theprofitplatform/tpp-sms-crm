#!/bin/bash

# Simple script to help add passwords to client .env files
# This shows you which clients need passwords and helps you add them

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 WordPress Password Setup Helper"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_password() {
    local client=$1
    local file="clients/${client}.env"

    if [ ! -f "$file" ]; then
        echo "❌ $client: .env file missing"
        return 1
    fi

    # Check if password is set (not empty)
    if grep -q "WORDPRESS_APP_PASSWORD=.\+" "$file" && \
       ! grep -q "WORDPRESS_APP_PASSWORD=$" "$file"; then
        echo "✅ $client: Password configured"
        return 0
    else
        echo "⚠️  $client: Password needed"
        return 1
    fi
}

echo "Checking current status..."
echo ""

# Check all clients
check_password "hottyres"
check_password "theprofitplatform"
check_password "instantautotraders"
check_password "sadcdisabilityservices"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 How to Add WordPress Passwords"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For each client that needs a password:"
echo ""
echo "1. Get WordPress App Password:"
echo "   - Login to WordPress admin"
echo "   - Go to: Users → Your Profile"
echo "   - Scroll to: Application Passwords"
echo "   - Name: SEO Automation System"
echo "   - Click: Add New Application Password"
echo "   - Copy password (format: xxxx xxxx xxxx xxxx)"
echo ""
echo "2. Edit the .env file:"
echo "   nano clients/[client].env"
echo ""
echo "3. Find this line:"
echo "   WORDPRESS_APP_PASSWORD="
echo ""
echo "4. Add your password:"
echo "   WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx"
echo ""
echo "5. Save file:"
echo "   Press: Ctrl+X, then Y, then Enter"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Client WordPress Admin URLs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔥 Hot Tyres:"
echo "   https://www.hottyres.com.au/wp-admin"
echo ""
echo "💰 The Profit Platform:"
echo "   https://theprofitplatform.com.au/wp-admin"
echo ""
echo "🚗 Instant Auto Traders:"
echo "   https://instantautotraders.com.au/wp-admin"
echo ""
echo "🤝 SADC Disability Services:"
echo "   https://sadcdisabilityservices.com.au/wp-admin"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ Quick Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Edit a specific client:"
echo "  nano clients/hottyres.env"
echo "  nano clients/theprofitplatform.env"
echo "  nano clients/instantautotraders.env"
echo "  nano clients/sadcdisabilityservices.env"
echo ""
echo "Test after adding passwords:"
echo "  node test-all-clients.js"
echo ""
echo "Check password status again:"
echo "  ./add-passwords.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
