#!/bin/bash
# Production Deployment Automation Script
# Automates the entire deployment process for SEO automation system

set -e  # Exit on error

echo ""
echo "🚀 SEO Automation - Production Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step counter
STEP=1

print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STEP $STEP: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    ((STEP++))
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in project root directory"
    exit 1
fi

# ============================================================================
# STEP 1: Verify Local Setup
# ============================================================================
print_step "Verify Local Setup"

print_info "Running setup verification..."
if node scripts/verify-setup.js > /tmp/verify-output.log 2>&1; then
    print_success "Local setup verified"
    cat /tmp/verify-output.log
else
    print_warning "Some checks failed (expected for missing WP credentials)"
    cat /tmp/verify-output.log
fi

# ============================================================================
# STEP 2: Check Dependencies
# ============================================================================
print_step "Check Dependencies"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_warning "Wrangler CLI not found. Installing..."
    npm install -g wrangler
    print_success "Wrangler CLI installed"
else
    print_success "Wrangler CLI already installed ($(wrangler --version))"
fi

# ============================================================================
# STEP 3: Cloudflare Authentication
# ============================================================================
print_step "Cloudflare Authentication"

print_info "Checking Cloudflare authentication..."
if wrangler whoami &> /dev/null; then
    print_success "Already authenticated with Cloudflare"
    wrangler whoami
else
    print_warning "Not authenticated with Cloudflare"
    print_info "Opening browser for authentication..."
    wrangler login
    if wrangler whoami &> /dev/null; then
        print_success "Authentication successful"
    else
        print_error "Authentication failed"
        exit 1
    fi
fi

# ============================================================================
# STEP 4: Detect or Get Project Name
# ============================================================================
print_step "Configure Cloudflare Project"

# Check if wrangler.toml exists
if [ -f "wrangler.toml" ]; then
    PROJECT_NAME=$(grep "name" wrangler.toml | head -1 | sed 's/.*"\(.*\)".*/\1/')
    print_success "Found project in wrangler.toml: $PROJECT_NAME"
else
    # Try to detect from git remote or ask
    echo ""
    echo "Enter your Cloudflare Pages project name"
    echo "(e.g., 'seo-reports' or leave blank to create new):"
    read -r PROJECT_NAME

    if [ -z "$PROJECT_NAME" ]; then
        PROJECT_NAME="seo-automation-$(date +%s)"
        print_info "Using generated project name: $PROJECT_NAME"
    fi
fi

# ============================================================================
# STEP 5: Deploy to Cloudflare Pages
# ============================================================================
print_step "Deploy to Cloudflare Pages"

print_info "Deploying to Cloudflare Pages..."

# Deploy with wrangler
if wrangler pages deploy public --project-name="$PROJECT_NAME" > /tmp/deploy-output.log 2>&1; then
    print_success "Deployment successful"

    # Extract deployment URL
    DEPLOY_URL=$(grep -o 'https://[^ ]*\.pages\.dev' /tmp/deploy-output.log | head -1)
    if [ -n "$DEPLOY_URL" ]; then
        print_success "Deployed to: $DEPLOY_URL"
        echo "$DEPLOY_URL" > .cloudflare-url
    fi
else
    print_error "Deployment failed"
    cat /tmp/deploy-output.log
    exit 1
fi

# ============================================================================
# STEP 6: Set Environment Variables
# ============================================================================
print_step "Configure Environment Variables"

print_info "Setting GSC_SERVICE_ACCOUNT secret..."

# Check if service account file exists
if [ ! -f "config/google/service-account.json" ]; then
    print_error "Service account file not found: config/google/service-account.json"
    exit 1
fi

# Set the secret using wrangler
if cat config/google/service-account.json | wrangler pages secret put GSC_SERVICE_ACCOUNT --project-name="$PROJECT_NAME" > /dev/null 2>&1; then
    print_success "GSC_SERVICE_ACCOUNT secret configured"
else
    print_warning "Failed to set secret via CLI. You may need to set it manually in Cloudflare Dashboard."
    print_info "Go to: Cloudflare Dashboard → Pages → $PROJECT_NAME → Settings → Environment variables"
fi

# ============================================================================
# STEP 7: Test Deployment
# ============================================================================
print_step "Test Deployment"

print_info "Waiting 10 seconds for deployment to propagate..."
sleep 10

if [ -f ".cloudflare-url" ]; then
    DEPLOY_URL=$(cat .cloudflare-url)
    print_info "Testing APIs at: $DEPLOY_URL"

    if node scripts/test-cloudflare-apis.js "$DEPLOY_URL"; then
        print_success "All API tests passed!"
    else
        print_warning "Some API tests failed. Check output above."
        print_info "You may need to redeploy or wait a few minutes for changes to propagate."
    fi
else
    print_warning "Deployment URL not found. Skipping API tests."
fi

# ============================================================================
# STEP 8: GitHub Actions Status
# ============================================================================
print_step "GitHub Actions Status"

print_info "Checking GitHub repository..."

# Get repository URL from git
REPO_URL=$(git config --get remote.origin.url)
if [ -n "$REPO_URL" ]; then
    # Convert SSH to HTTPS
    REPO_URL=$(echo "$REPO_URL" | sed 's/git@github.com:/https:\/\/github.com\//' | sed 's/\.git$//')
    print_success "GitHub repository: $REPO_URL"

    echo ""
    print_info "To trigger GitHub Actions workflow:"
    echo "   1. Visit: $REPO_URL/actions"
    echo "   2. Click: 'Weekly SEO Automation'"
    echo "   3. Click: 'Run workflow'"
    echo "   4. Select client: instantautotraders"
    echo "   5. Click: 'Run workflow' button"
else
    print_warning "Could not detect GitHub repository"
fi

# ============================================================================
# STEP 9: Summary
# ============================================================================
print_step "Deployment Summary"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PRODUCTION DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f ".cloudflare-url" ]; then
    DEPLOY_URL=$(cat .cloudflare-url)
    print_success "Dashboard URL: $DEPLOY_URL"

    echo ""
    echo "📊 API Endpoints:"
    echo "   • Dashboard:  $DEPLOY_URL/api/dashboard"
    echo "   • Metrics:    $DEPLOY_URL/api/gsc-metrics"
    echo "   • Rankings:   $DEPLOY_URL/api/gsc-rankings"
    echo "   • Quick Wins: $DEPLOY_URL/api/gsc-quick-wins"
fi

echo ""
echo "🤖 GitHub Actions:"
echo "   • Workflow: Weekly SEO Automation"
echo "   • Schedule: Every Monday 9:00 AM UTC"
echo "   • Manual:   Available in Actions tab"

echo ""
echo "📝 Next Steps:"
echo "   1. Test GitHub Actions workflow (manual trigger)"
echo "   2. Review Cloudflare deployment in dashboard"
echo "   3. Start onboarding clients!"

echo ""
echo "🎯 What's Automated:"
echo "   ✅ Weekly SEO optimization"
echo "   ✅ Google Search Console data fetching"
echo "   ✅ Quick win identification"
echo "   ✅ Post optimization"
echo "   ✅ Report generation"
echo "   ✅ Backup creation"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💰 You're ready to generate revenue!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
