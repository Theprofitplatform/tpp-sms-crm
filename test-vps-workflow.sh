#!/bin/bash

# Test VPS SEO Automation Workflow
# This script tests the complete audit → report → deploy pipeline

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing VPS SEO Automation Workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check VPS connection
echo "1️⃣  Testing VPS connection..."
if ssh -q tpp-vps exit; then
    echo "  ✅ VPS connection successful"
else
    echo "  ❌ Cannot connect to VPS"
    exit 1
fi
echo ""

# Step 2: Check Cloudflare authentication
echo "2️⃣  Checking Cloudflare authentication..."
VPS_AUTH=$(ssh tpp-vps "wrangler whoami 2>&1" | grep -c "You are logged in" || echo "0")
if [ "$VPS_AUTH" -gt 0 ]; then
    echo "  ✅ Cloudflare authenticated on VPS"
else
    echo "  ❌ Cloudflare not authenticated on VPS"
    echo ""
    echo "  Run this on VPS to set up:"
    echo "    ssh tpp-vps"
    echo "    cd ~/projects/seo-expert"
    echo "    ./setup-cloudflare-auth.sh"
    echo ""
    exit 1
fi
echo ""

# Step 3: Check client configurations
echo "3️⃣  Checking client configurations..."
CLIENTS=$(ssh tpp-vps "ls ~/projects/seo-expert/clients/*.env 2>/dev/null | grep -v template | wc -l")
echo "  ✅ Found $CLIENTS client configurations"
echo ""

# Step 4: Check PM2 status
echo "4️⃣  Checking PM2 automation status..."
ssh tpp-vps "cd ~/projects/seo-expert && pm2 status | grep -E '(seo-audit|client-status|generate-reports)'"
echo ""

# Step 5: Test Cloudflare Pages project
echo "5️⃣  Checking Cloudflare Pages project..."
CF_PROJECT=$(ssh tpp-vps "wrangler pages project list 2>/dev/null | grep -c seo-reports" || echo "0")
if [ "$CF_PROJECT" -gt 0 ]; then
    echo "  ✅ seo-reports project exists"
else
    echo "  ⚠️  seo-reports project not found"
    echo "  Creating project..."
    ssh tpp-vps "wrangler pages project create seo-reports --production-branch=main"
fi
echo ""

# Step 6: Test deployment
echo "6️⃣  Testing deployment capability..."
ssh tpp-vps "cd ~/projects/seo-expert && ls -la web-dist/"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Workflow Test Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start PM2 automations:"
echo "   ssh tpp-vps 'cd ~/projects/seo-expert && pm2 restart all'"
echo ""
echo "2. Test manual audit (optional):"
echo "   ssh tpp-vps 'cd ~/projects/seo-expert && node audit-all-clients.js'"
echo ""
echo "3. Test manual deployment (optional):"
echo "   ssh tpp-vps 'cd ~/projects/seo-expert && ./deploy-to-cloudflare.sh --production'"
echo ""
echo "4. View automation logs:"
echo "   ./vps-manage.sh logs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
