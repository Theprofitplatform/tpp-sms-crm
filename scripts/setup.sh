#!/bin/bash

# Setup Script for WordPress SEO Automation
# This script helps you get started quickly

echo "╔═══════════════════════════════════════════════╗"
echo "║   WordPress SEO Automation - Setup           ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.." || exit 1

# Step 1: Install dependencies
echo "📦 Step 1/4: Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 2: Create .env file
if [ -f "env/.env" ]; then
    echo "⚠️  Step 2/4: env/.env already exists"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
    else
        cp env/.env.example env/.env
        echo "✓ Created new env/.env from template"
    fi
else
    cp env/.env.example env/.env
    echo "✓ Step 2/4: Created env/.env from template"
fi
echo ""

# Step 3: Configure
echo "📝 Step 3/4: Configuration"
echo ""
echo "Please edit env/.env with your WordPress credentials:"
echo "  1. WORDPRESS_URL - Your WordPress site URL"
echo "  2. WORDPRESS_USER - Your WordPress username"
echo "  3. WORDPRESS_APP_PASSWORD - Application password"
echo ""
echo "To get an Application Password:"
echo "  1. Login to WordPress admin"
echo "  2. Go to Users → Your Profile"
echo "  3. Scroll to 'Application Passwords'"
echo "  4. Enter name: 'SEO Automation'"
echo "  5. Click 'Add New Application Password'"
echo "  6. Copy the password (format: xxxx-xxxx-xxxx-xxxx)"
echo ""
read -p "Press Enter when you've configured env/.env..."
echo ""

# Step 4: Test connection
echo "🔌 Step 4/4: Testing connection..."
echo ""
npm run test:api

if [ $? -eq 0 ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════╗"
    echo "║   ✓ Setup Complete!                          ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo ""
    echo "Next steps:"
    echo "  1. Run your first audit:"
    echo "     npm run audit"
    echo ""
    echo "  2. Or audit just 5 posts:"
    echo "     node index.js --mode=audit --max-posts=5"
    echo ""
    echo "  3. View reports in:"
    echo "     logs/"
    echo ""
    echo "  4. When ready, enable auto-fix:"
    echo "     npm run fix"
    echo ""
else
    echo ""
    echo "⚠️  Connection test failed!"
    echo "Please check your env/.env configuration and try again."
    exit 1
fi
