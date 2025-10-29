#!/bin/bash
# Quick Branch Protection Setup Script
#
# This script helps you set up branch protection rules via GitHub CLI
#
# Prerequisites:
# 1. Install GitHub CLI: https://cli.github.com/
# 2. Authenticate: gh auth login
# 3. Set GITHUB_TOKEN environment variable (optional, gh auth handles this)

set -e

echo "=================================="
echo "Branch Protection Quick Setup"
echo "=================================="
echo ""

# Repository information
REPO_OWNER="Theprofitplatform"
REPO_NAME="seoexpert"

echo "Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "📥 Install from: https://cli.github.com/"
    exit 1
fi

echo "✅ GitHub CLI found"

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "🔐 Run: gh auth login"
    exit 1
fi

echo "✅ Authenticated with GitHub"
echo ""

# Function to set up branch protection
setup_branch_protection() {
    local BRANCH=$1
    local RULES=$2

    echo "Setting up protection for branch: $BRANCH"
    echo "Rules: $RULES"
    echo ""

    # Note: GitHub CLI doesn't have direct branch protection commands yet
    # We need to use the API

    if [ "$BRANCH" = "main" ]; then
        echo "Setting up MAIN branch protection..."

        # Main branch protection (strict)
        gh api repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection \
          --method PUT \
          -f required_status_checks='{"strict":true,"contexts":["Run Test Suite","Build Verification","test / Test on Node 20.x"]}' \
          -f enforce_admins=true \
          -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
          -f restrictions=null \
          -F allow_force_pushes=false \
          -F allow_deletions=false

        echo "✅ Main branch protection configured!"

    elif [ "$BRANCH" = "dev" ]; then
        echo "Setting up DEV branch protection..."

        # Dev branch protection (lighter)
        gh api repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection \
          --method PUT \
          -f required_status_checks='{"strict":true,"contexts":["test / Test on Node 20.x"]}' \
          -f enforce_admins=false \
          -f restrictions=null \
          -F allow_force_pushes=false \
          -F allow_deletions=false

        echo "✅ Dev branch protection configured!"
    fi

    echo ""
}

# Main execution
echo "This script will set up branch protection for:"
echo "  - main (strict: requires PR + reviews + tests)"
echo "  - dev (lighter: requires tests only)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🔧 Configuring branch protection..."
echo ""

# Set up main branch protection
if setup_branch_protection "main" "strict"; then
    echo "✅ Main branch protected"
else
    echo "⚠️  Warning: Could not protect main branch (may already be protected)"
fi

echo ""

# Set up dev branch protection
if setup_branch_protection "dev" "light"; then
    echo "✅ Dev branch protected"
else
    echo "⚠️  Warning: Could not protect dev branch (may already be protected)"
fi

echo ""
echo "=================================="
echo "✅ Branch Protection Setup Complete!"
echo "=================================="
echo ""
echo "Verify at: https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
echo ""
echo "Next steps:"
echo "1. Go to GitHub repository settings"
echo "2. Navigate to Branches"
echo "3. Verify the protection rules are active"
echo "4. Adjust settings if needed"
echo ""
echo "Need help? Read: .github/BRANCH_PROTECTION_SETUP.md"
