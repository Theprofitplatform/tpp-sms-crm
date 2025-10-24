#!/bin/bash

# Email Notification Setup Script
# Sets up Resend API for comprehensive email notifications

set -e

echo "📧 Email Notification Setup"
echo "================================"
echo ""
echo "This script will configure email notifications for:"
echo "  • Workflow completion alerts"
echo "  • Daily health summaries"
echo "  • Critical error notifications"
echo ""
echo "Email will be sent to: abhishekmaharjan3737@gmail.com"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo ""
    echo "Install it with:"
    echo "  Ubuntu/Debian: sudo apt install gh"
    echo "  macOS: brew install gh"
    echo "  Or visit: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub."
    echo ""
    echo "Run: gh auth login"
    exit 1
fi

echo "✓ GitHub CLI is installed and authenticated"
echo ""

# Step 1: Get Resend API Key
echo "Step 1: Get your Resend API Key"
echo "--------------------------------"
echo ""
echo "1. Go to https://resend.com/signup"
echo "2. Sign up for a free account (100 emails/day free)"
echo "3. Go to API Keys: https://resend.com/api-keys"
echo "4. Create a new API key"
echo "5. Copy the API key"
echo ""
read -p "Enter your Resend API Key (or press Enter to skip): " RESEND_API_KEY

if [ -z "$RESEND_API_KEY" ]; then
    echo ""
    echo "⚠️  Skipping Resend setup."
    echo ""
    echo "To set it up later, run:"
    echo "  gh secret set RESEND_API_KEY --body \"your-api-key\""
    echo ""
    exit 0
fi

# Step 2: Add secret to GitHub
echo ""
echo "Step 2: Adding secret to GitHub..."
echo ""

echo "$RESEND_API_KEY" | gh secret set RESEND_API_KEY

echo "✓ RESEND_API_KEY added to GitHub secrets"
echo ""

# Step 3: Verify secret
echo "Step 3: Verifying setup..."
echo ""

if gh secret list | grep -q "RESEND_API_KEY"; then
    echo "✓ RESEND_API_KEY is configured"
else
    echo "❌ Failed to verify RESEND_API_KEY"
    exit 1
fi

# Step 4: Test email notification (optional)
echo ""
echo "Step 4: Test Email Notification"
echo "--------------------------------"
read -p "Would you like to send a test email now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Sending test email..."

    # Export for local test
    export RESEND_API_KEY="$RESEND_API_KEY"
    export NOTIFICATION_EMAIL="abhishekmaharjan3737@gmail.com"

    # Send test email
    node src/notifications/send-test-email.js

    echo ""
    echo "✅ Test email sent! Check abhishekmaharjan3737@gmail.com"
fi

# Summary
echo ""
echo "✅ Email Notification Setup Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📧 What's Configured:"
echo ""
echo "  1. Workflow Completion Emails"
echo "     • Sent after each GitHub Actions run"
echo "     • Shows client status, duration, success/failure"
echo "     • Links to full reports"
echo ""
echo "  2. Daily Health Summaries"
echo "     • Sent every day at 8:00 AM UTC"
echo "     • GitHub Actions status"
echo "     • Cloudflare API health"
echo "     • Reports generated"
echo "     • System resources"
echo ""
echo "  3. Email Recipient: abhishekmaharjan3737@gmail.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Actions:"
echo ""
echo "  • Workflow emails will be sent automatically on next run"
echo "  • Daily summaries start tomorrow at 8:00 AM UTC"
echo "  • Trigger a test workflow:"
echo "    gh workflow run \"Weekly SEO Automation\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
