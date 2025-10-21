#!/bin/bash

# SEOAnalyst + SEO-Expert Integration Completion Script
# This script helps you quickly setup all 4 clients

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 SEOAnalyst + SEO-Expert Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will help you setup WordPress credentials for:"
echo "  1. 🔥 Hot Tyres"
echo "  2. 💰 The Profit Platform"
echo "  3. 🚗 Instant Auto Traders"
echo "  4. 🤝 SADC Disability Services"
echo ""
echo "You'll need a WordPress Application Password for each client."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to show how to get app password
show_password_instructions() {
    local site=$1
    echo ""
    echo "📝 How to get WordPress App Password for $site:"
    echo ""
    echo "  1. Open: https://$site/wp-admin"
    echo "  2. Go to: Users → Your Profile"
    echo "  3. Scroll to: Application Passwords section"
    echo "  4. Application Name: SEO Automation System"
    echo "  5. Click: Add New Application Password"
    echo "  6. COPY the password (format: xxxx xxxx xxxx xxxx)"
    echo ""
}

# Function to setup a client
setup_client() {
    local client_id=$1
    local client_name=$2
    local site_url=$3

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Setting up: $client_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check if .env file already exists
    if [ -f "clients/${client_id}.env" ]; then
        echo "⚠️  clients/${client_id}.env already exists"
        read -p "Overwrite? (y/N): " overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            echo "Skipped $client_name"
            return
        fi
    fi

    # Copy template
    if [ ! -f "clients/${client_id}.env.template" ]; then
        echo "❌ Template not found: clients/${client_id}.env.template"
        return
    fi

    cp "clients/${client_id}.env.template" "clients/${client_id}.env"

    show_password_instructions "$site_url"

    # Get WordPress username
    read -p "WordPress Username (default: admin): " wp_user
    wp_user=${wp_user:-admin}

    # Get WordPress password
    read -p "WordPress App Password (xxxx xxxx xxxx xxxx): " wp_pass

    if [ -z "$wp_pass" ]; then
        echo "❌ No password entered. Skipping $client_name"
        rm "clients/${client_id}.env"
        return
    fi

    # Update .env file
    sed -i "s/WORDPRESS_USER=.*/WORDPRESS_USER=$wp_user/" "clients/${client_id}.env"
    sed -i "s/WORDPRESS_APP_PASSWORD=.*/WORDPRESS_APP_PASSWORD=$wp_pass/" "clients/${client_id}.env"

    echo "✅ $client_name configured!"
    echo "   File: clients/${client_id}.env"
    echo ""
}

# Main setup process
echo "Let's setup your 4 clients..."
echo ""
read -p "Ready to start? (Y/n): " ready

if [[ $ready =~ ^[Nn]$ ]]; then
    echo "Setup cancelled. Run this script again when ready."
    exit 0
fi

# Setup each client
setup_client "hottyres" "Hot Tyres" "www.hottyres.com.au"
setup_client "theprofitplatform" "The Profit Platform" "theprofitplatform.com.au"
setup_client "instantautotraders" "Instant Auto Traders" "instantautotraders.com.au"
setup_client "sadcdisabilityservices" "SADC Disability Services" "sadcdisabilityservices.com.au"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Client setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "1. Test all clients:"
echo "   node test-all-clients.js"
echo ""
echo "2. Run first audit:"
echo "   node audit-all-clients.js"
echo ""
echo "3. Check client status:"
echo "   node client-status.js"
echo ""
echo "4. View PM2 automation:"
echo "   pm2 status"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
