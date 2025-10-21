#!/bin/bash
# Deploy SEO Reports to Cloudflare Pages
# Domain: seo.theprofitplatform.com.au

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying SEO Reports to Cloudflare Pages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Prepare distribution
echo "1️⃣  Preparing distribution..."
if [ -f "./prepare-web-dist.sh" ]; then
    bash ./prepare-web-dist.sh
    if [ $? -ne 0 ]; then
        echo "❌ Distribution preparation failed"
        exit 1
    fi
else
    echo "❌ prepare-web-dist.sh not found"
    exit 1
fi
echo ""

# Step 2: Check if wrangler is installed
echo "2️⃣  Checking wrangler installation..."
if ! command -v wrangler &> /dev/null; then
    echo "⚠️  Wrangler not found. Installing globally..."
    npm install -g wrangler
    echo "✅ Wrangler installed"
else
    echo "✅ Wrangler already installed ($(wrangler --version))"
fi
echo ""

# Step 3: Deploy to Cloudflare Pages
echo "3️⃣  Deploying to Cloudflare Pages..."
echo ""

# Check if this is first deployment or update
if [ "$#" -eq 0 ] || [ "$1" != "--production" ]; then
    echo "📦 Deploying to preview..."
    wrangler pages deploy web-dist --project-name=seo-reports
else
    echo "🌐 Deploying to production..."
    wrangler pages deploy web-dist --project-name=seo-reports --branch=main
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Deployment Successful!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Your SEO reports are now live on Cloudflare Pages!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Go to Cloudflare Dashboard"
    echo "   2. Navigate to Pages → seo-reports"
    echo "   3. Add custom domain: seo.theprofitplatform.com.au"
    echo "   4. Cloudflare will automatically configure DNS"
    echo ""
    echo "💡 Usage:"
    echo "   Preview:    ./deploy-to-cloudflare.sh"
    echo "   Production: ./deploy-to-cloudflare.sh --production"
    echo ""
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ Deployment Failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check your Cloudflare API token: wrangler whoami"
    echo "   2. Login to Cloudflare: wrangler login"
    echo "   3. Verify wrangler.toml configuration"
    echo ""
    exit 1
fi
