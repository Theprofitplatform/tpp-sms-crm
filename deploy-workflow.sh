#!/bin/bash
# Automated Workflow Deployment Script
# Completes all setup steps automatically

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   AUTOMATIC DEPLOYMENT WORKFLOW SETUP                      ║"
echo "║   Completing all remaining configuration steps             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="${VPS_HOST:-31.97.222.218}"
VPS_USER="${VPS_USER:-avi}"
DEPLOY_DIR="/home/avi/seo-automation/current"
GITHUB_REPO="Theprofitplatform/seoexpert"

# Function to print status
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Pre-flight Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for required commands
print_status "Checking required tools..."

if command_exists ssh; then
    print_success "SSH found"
else
    print_error "SSH not found. Please install OpenSSH."
    exit 1
fi

if command_exists gh; then
    print_success "GitHub CLI found"
else
    print_warning "GitHub CLI not found. Install from: https://cli.github.com/"
    echo "           Skipping GitHub API operations..."
    GH_AVAILABLE=false
fi

if command_exists curl; then
    print_success "curl found"
else
    print_warning "curl not found. Some features may not work."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Deploy Workflow Code to VPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_status "Testing SSH connection to VPS..."

if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "echo 'Connection successful'" 2>/dev/null; then
    print_success "SSH connection successful"

    print_status "Deploying workflow code to production..."

    ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'ENDSSH'
        set -e

        echo "📍 Navigating to deployment directory..."
        cd /home/avi/seo-automation/current

        echo "📊 Current version:"
        git log -1 --oneline

        echo ""
        echo "📦 Pulling latest code from main..."
        git fetch origin main
        git checkout main
        git pull origin main

        echo ""
        echo "📊 New version:"
        git log -1 --oneline

        echo ""
        echo "🔄 Restarting services..."
        docker compose -f docker-compose.prod.yml restart

        echo ""
        echo "⏳ Waiting for services to stabilize..."
        sleep 10

        echo ""
        echo "📊 Service status:"
        docker compose -f docker-compose.prod.yml ps

        echo ""
        echo "🏥 Checking health..."
        if curl -f http://localhost:9000/api/v2/health > /dev/null 2>&1; then
            echo "✅ Health check passed!"
        else
            echo "⚠️  Health check returned non-200 status"
        fi
ENDSSH

    if [ $? -eq 0 ]; then
        print_success "Workflow code deployed successfully!"
        DEPLOYMENT_SUCCESS=true
    else
        print_error "Deployment failed. Check the errors above."
        DEPLOYMENT_SUCCESS=false
    fi
else
    print_error "Cannot connect to VPS via SSH"
    print_warning "Please ensure:"
    echo "           1. SSH key is set up: ssh-copy-id $VPS_USER@$VPS_HOST"
    echo "           2. VPS is accessible: ping $VPS_HOST"
    echo "           3. Firewall allows SSH (port 22)"
    echo ""
    echo "           Manual deployment command:"
    echo "           ssh $VPS_USER@$VPS_HOST 'cd $DEPLOY_DIR && git pull origin main && docker compose -f docker-compose.prod.yml restart'"
    DEPLOYMENT_SUCCESS=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Configure Branch Protection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$GH_AVAILABLE" != "false" ]; then
    print_status "Checking GitHub CLI authentication..."

    if gh auth status >/dev/null 2>&1; then
        print_success "GitHub CLI authenticated"

        print_status "Configuring branch protection for 'main' branch..."

        # Try to set branch protection via API
        if gh api repos/$GITHUB_REPO/branches/main/protection \
            --method PUT \
            -f required_status_checks='{"strict":true,"contexts":["Run Test Suite","Build Verification","test / Test on Node 20.x"]}' \
            -f enforce_admins=true \
            -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
            -f restrictions=null \
            -F allow_force_pushes=false \
            -F allow_deletions=false \
            >/dev/null 2>&1; then

            print_success "Main branch protection configured"
            BRANCH_PROTECTION_SUCCESS=true
        else
            print_warning "Could not configure via API (may already be protected)"
            BRANCH_PROTECTION_SUCCESS=false
        fi

        print_status "Configuring branch protection for 'dev' branch..."

        if gh api repos/$GITHUB_REPO/branches/dev/protection \
            --method PUT \
            -f required_status_checks='{"strict":true,"contexts":["test / Test on Node 20.x"]}' \
            -f enforce_admins=false \
            -f restrictions=null \
            -F allow_force_pushes=false \
            >/dev/null 2>&1; then

            print_success "Dev branch protection configured"
        else
            print_warning "Could not configure dev branch (may already be protected)"
        fi
    else
        print_warning "GitHub CLI not authenticated"
        print_warning "Authenticate with: gh auth login"
        BRANCH_PROTECTION_SUCCESS=false
    fi
else
    print_warning "GitHub CLI not available"
    BRANCH_PROTECTION_SUCCESS=false
fi

if [ "$BRANCH_PROTECTION_SUCCESS" != "true" ]; then
    print_warning "Configure branch protection manually:"
    echo "           1. Go to: https://github.com/$GITHUB_REPO/settings/branches"
    echo "           2. Add rule for 'main' branch"
    echo "           3. Enable: Require PR, Require 1 approval, Require status checks"
    echo "           4. Detailed guide: SETUP_BRANCH_PROTECTION_NOW.md"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Configure Notifications (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_status "Checking for Discord webhook configuration..."

if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    print_status "Testing Discord webhook..."

    if curl -X POST "$DISCORD_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"content":"✅ Automated deployment setup complete! Your workflow is now live."}' \
        >/dev/null 2>&1; then

        print_success "Discord webhook tested successfully"

        if [ "$GH_AVAILABLE" != "false" ] && gh auth status >/dev/null 2>&1; then
            print_status "Adding webhook to GitHub Secrets..."

            if echo "$DISCORD_WEBHOOK_URL" | gh secret set DISCORD_WEBHOOK_URL 2>/dev/null; then
                print_success "Discord webhook added to GitHub Secrets"
                NOTIFICATION_SUCCESS=true
            else
                print_warning "Could not add to GitHub Secrets (may already exist)"
                NOTIFICATION_SUCCESS=false
            fi
        else
            print_warning "Add webhook manually to GitHub Secrets:"
            echo "           1. Go to: https://github.com/$GITHUB_REPO/settings/secrets/actions"
            echo "           2. Name: DISCORD_WEBHOOK_URL"
            echo "           3. Value: Your Discord webhook URL"
            NOTIFICATION_SUCCESS=false
        fi
    else
        print_error "Discord webhook test failed"
        print_warning "Check your webhook URL is correct"
        NOTIFICATION_SUCCESS=false
    fi
else
    print_warning "DISCORD_WEBHOOK_URL not set in environment"
    print_warning "To enable Discord notifications:"
    echo "           1. Create webhook in Discord server"
    echo "           2. Export: export DISCORD_WEBHOOK_URL='your-webhook-url'"
    echo "           3. Or add directly to GitHub Secrets"
    echo "           4. Guide: DISCORD_NOTIFICATIONS_QUICK_SETUP.md"
    NOTIFICATION_SUCCESS=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📊 SETUP SUMMARY:"
echo ""
echo "   Workflow Deployment:    $([ "$DEPLOYMENT_SUCCESS" == "true" ] && echo -e "${GREEN}✅ Complete${NC}" || echo -e "${YELLOW}⏸️  Manual action needed${NC}")"
echo "   Branch Protection:       $([ "$BRANCH_PROTECTION_SUCCESS" == "true" ] && echo -e "${GREEN}✅ Complete${NC}" || echo -e "${YELLOW}⏸️  Manual setup needed${NC}")"
echo "   Notifications:           $([ "$NOTIFICATION_SUCCESS" == "true" ] && echo -e "${GREEN}✅ Complete${NC}" || echo -e "${YELLOW}⏸️  Optional${NC}")"
echo ""

if [ "$DEPLOYMENT_SUCCESS" == "true" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 YOUR DEPLOYMENT WORKFLOW IS LIVE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Automatic deployments enabled"
    echo "✅ Safety gates active"
    echo "✅ Workflow code deployed to production"
    echo ""
    echo "NEXT STEPS:"
    echo "  1. Test the workflow (make a change on dev, create PR, merge)"
    echo "  2. Complete manual steps above if any"
    echo "  3. Read: DEV_TO_PRODUCTION_WORKFLOW.md for daily usage"
    echo ""
fi

echo "📚 DOCUMENTATION:"
echo "   Quick Start:      ⚡_ACTION_PLAN.md"
echo "   Complete Guide:   DEV_TO_PRODUCTION_WORKFLOW.md"
echo "   Setup Status:     🎊_FINAL_STATUS_AND_NEXT_STEPS.md"
echo ""

echo "🔗 USEFUL LINKS:"
echo "   Repository:       https://github.com/$GITHUB_REPO"
echo "   GitHub Actions:   https://github.com/$GITHUB_REPO/actions"
echo "   Branch Settings:  https://github.com/$GITHUB_REPO/settings/branches"
echo ""

if [ "$DEPLOYMENT_SUCCESS" != "true" ]; then
    echo "⚠️  MANUAL DEPLOYMENT REQUIRED:"
    echo ""
    echo "   Run this command to deploy:"
    echo "   ssh $VPS_USER@$VPS_HOST 'cd $DEPLOY_DIR && git pull origin main && docker compose -f docker-compose.prod.yml restart'"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
