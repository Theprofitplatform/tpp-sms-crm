#!/bin/bash

# Quick Setup Script - Creates all .env files at once
# You can then edit them with your actual passwords

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Quick Client Setup - Creating .env Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# Create .env files from templates
echo "Creating .env files from templates..."
echo ""

# Hot Tyres
if [ ! -f "clients/hottyres.env" ]; then
    cp clients/hottyres.env.template clients/hottyres.env
    echo "✅ Created: clients/hottyres.env"
else
    echo "⚠️  Already exists: clients/hottyres.env"
fi

# The Profit Platform (already exists, just verify)
if [ ! -f "clients/theprofitplatform.env" ]; then
    cp clients/theprofitplatform.env.template clients/theprofitplatform.env
    echo "✅ Created: clients/theprofitplatform.env"
else
    echo "✅ Already exists: clients/theprofitplatform.env"
fi

# Instant Auto Traders
if [ ! -f "clients/instantautotraders.env" ]; then
    cp clients/instantautotraders.env.template clients/instantautotraders.env
    echo "✅ Created: clients/instantautotraders.env"
else
    echo "⚠️  Already exists: clients/instantautotraders.env"
fi

# SADC Disability Services
if [ ! -f "clients/sadcdisabilityservices.env" ]; then
    cp clients/sadcdisabilityservices.env.template clients/sadcdisabilityservices.env
    echo "✅ Created: clients/sadcdisabilityservices.env"
else
    echo "⚠️  Already exists: clients/sadcdisabilityservices.env"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All .env files created!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Now you need to add WordPress Application Passwords:"
echo ""
echo "For each client, get the password from WordPress:"
echo "  1. Login: https://[site].com/wp-admin"
echo "  2. Go to: Users → Your Profile"
echo "  3. Scroll to: Application Passwords"
echo "  4. Name: SEO Automation System"
echo "  5. Click: Add New Application Password"
echo "  6. Copy the password (xxxx xxxx xxxx xxxx)"
echo ""
echo "Then add to .env files:"
echo ""
echo "  nano clients/hottyres.env"
echo "  # Update: WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx"
echo "  # Save: Ctrl+X, Y, Enter"
echo ""
echo "Repeat for all 4 clients:"
echo "  ✏️  clients/hottyres.env"
echo "  ✏️  clients/theprofitplatform.env"
echo "  ✏️  clients/instantautotraders.env"
echo "  ✏️  clients/sadcdisabilityservices.env"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ Quick Workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Get all 4 WordPress passwords first (open 4 tabs)"
echo ""
echo "2. Edit each file and paste passwords:"
echo "   for client in hottyres theprofitplatform instantautotraders sadcdisabilityservices; do"
echo "     nano clients/\$client.env"
echo "   done"
echo ""
echo "3. Test all clients:"
echo "   node test-all-clients.js"
echo ""
echo "4. Run first audit:"
echo "   node audit-all-clients.js"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
