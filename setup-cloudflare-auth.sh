#!/bin/bash

# Cloudflare Authentication Setup Script
# Guides you through setting up API token for automated deployment

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Cloudflare API Token Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if already authenticated
if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    echo "✅ CLOUDFLARE_API_TOKEN is already set!"
    echo ""
    echo "Testing authentication..."
    if wrangler whoami 2>&1 | grep -q "You are logged in"; then
        echo "✅ Authentication working!"
        echo ""
        read -p "Do you want to deploy now? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./deploy-to-cloudflare.sh --production
        fi
        exit 0
    else
        echo "⚠️  Token set but not working. Please get a new token."
    fi
fi

echo "❌ CLOUDFLARE_API_TOKEN not found"
echo ""
echo "📋 To set up automated deployment, you need a Cloudflare API token."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📖 Instructions:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
echo "2. Click 'Create Token'"
echo "3. Use template: 'Edit Cloudflare Workers'"
echo "4. Or create custom with permissions:"
echo "   - Account → Cloudflare Pages → Edit"
echo "   - Zone → Zone → Read"
echo "   - Zone → DNS → Edit"
echo ""
echo "5. Copy your token (shown only once!)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Have you created your token? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "👉 Create your token first, then run this script again:"
    echo "   ./setup-cloudflare-auth.sh"
    echo ""
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Enter Your Cloudflare API Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Paste your token (it won't be displayed):"
read -s CLOUDFLARE_TOKEN
echo ""

if [ -z "$CLOUDFLARE_TOKEN" ]; then
    echo "❌ No token entered. Exiting."
    exit 1
fi

echo ""
echo "Testing token..."

# Test the token
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_TOKEN"

if wrangler whoami 2>&1 | grep -q "You are logged in"; then
    echo "✅ Token valid!"
    echo ""

    # Save to .bashrc
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💾 Save Token for Persistence?"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "This will add the token to ~/.bashrc so it persists across sessions."
    echo "This is needed for PM2 automation to work."
    echo ""
    read -p "Save token to ~/.bashrc? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove any existing CLOUDFLARE_API_TOKEN lines
        sed -i '/CLOUDFLARE_API_TOKEN/d' ~/.bashrc

        # Add new token
        echo "" >> ~/.bashrc
        echo "# Cloudflare API Token for automated deployment" >> ~/.bashrc
        echo "export CLOUDFLARE_API_TOKEN=\"$CLOUDFLARE_TOKEN\"" >> ~/.bashrc

        echo "✅ Token saved to ~/.bashrc"
        echo ""
        echo "Run 'source ~/.bashrc' or start a new terminal session to load it."
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 Deploy Now?"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    read -p "Deploy to Cloudflare Pages now? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        ./deploy-to-cloudflare.sh --production
    else
        echo ""
        echo "✅ Setup complete!"
        echo ""
        echo "To deploy manually, run:"
        echo "  ./deploy-to-cloudflare.sh --production"
        echo ""
    fi
else
    echo "❌ Token invalid or permissions insufficient."
    echo ""
    echo "Please check:"
    echo "1. Token was copied correctly"
    echo "2. Token has required permissions:"
    echo "   - Account → Cloudflare Pages → Edit"
    echo "   - Zone → Zone → Read"
    echo ""
    exit 1
fi
