#!/bin/bash

# Send Audit Reports
# Interactive script to send SEO audit reports via Discord or Email

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Send SEO Audit Reports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if reports exist
REPORT_COUNT=$(ls -1 logs/clients/*/audit-2025-10-21.html 2>/dev/null | wc -l)

if [ "$REPORT_COUNT" -eq 0 ]; then
  echo "❌ No audit reports found for today"
  echo "   Run: node audit-all-clients.js"
  echo ""
  exit 1
fi

echo "✅ Found $REPORT_COUNT audit report(s) ready to send"
echo ""

# Ask user preference
echo "Choose delivery method:"
echo ""
echo "  1) Discord (requires webhook URL)"
echo "  2) Email (requires SMTP setup)"
echo "  3) Show report summary only"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📱 Discord Webhook Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "To get your Discord webhook URL:"
    echo "  1. Go to your Discord server"
    echo "  2. Right-click the channel → Edit Channel"
    echo "  3. Go to Integrations → Webhooks → New Webhook"
    echo "  4. Copy the webhook URL"
    echo ""
    read -p "Enter your Discord webhook URL: " webhook_url

    if [ -z "$webhook_url" ]; then
      echo "❌ No webhook URL provided"
      exit 1
    fi

    echo ""
    echo "📤 Sending to Discord..."
    node send-audit-discord.js "$webhook_url" 2025-10-21
    ;;

  2)
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📧 Email Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check if SMTP is configured
    if [ ! -f ".env.email" ]; then
      echo "⚙️  SMTP not configured yet"
      echo ""
      echo "For Gmail:"
      echo "  1. Enable 2-factor authentication"
      echo "  2. Generate App Password: https://myaccount.google.com/apppasswords"
      echo "  3. Create .env.email with:"
      echo ""
      echo "     SMTP_HOST=smtp.gmail.com"
      echo "     SMTP_PORT=587"
      echo "     SMTP_USER=your-email@gmail.com"
      echo "     SMTP_PASS=your-app-password"
      echo "     FROM_EMAIL=seo-expert@theprofitplatform.com.au"
      echo ""

      read -p "Have you configured .env.email? (y/n): " configured
      if [ "$configured" != "y" ]; then
        echo ""
        echo "📝 Please configure .env.email first, then run this script again"
        echo ""
        exit 1
      fi
    fi

    # Check if nodemailer is installed
    if ! npm list nodemailer &>/dev/null; then
      echo "📦 Installing nodemailer..."
      npm install nodemailer
    fi

    read -p "Enter recipient email address: " email

    if [ -z "$email" ]; then
      echo "❌ No email address provided"
      exit 1
    fi

    echo ""
    echo "📤 Sending to $email..."
    node send-audit-email.js "$email" 2025-10-21
    ;;

  3)
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Audit Report Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    for report in logs/clients/*/audit-2025-10-21.json; do
      if [ -f "$report" ]; then
        client=$(basename $(dirname "$report"))
        score=$(jq -r '.summary.averageScore' "$report")
        issues=$(jq -r '.summary.totalIssues' "$report")
        posts=$(jq -r '.summary.postsAnalyzed' "$report")

        if [ "$score" -ge 90 ]; then
          emoji="🟢"
        elif [ "$score" -ge 70 ]; then
          emoji="🟡"
        else
          emoji="🔴"
        fi

        echo "$emoji $client: $score/100 ($issues issues, $posts posts)"
      fi
    done

    echo ""
    echo "📄 Detailed reports:"
    ls -1 logs/clients/*/audit-2025-10-21.html | while read file; do
      echo "   $file"
    done
    echo ""
    ;;

  *)
    echo ""
    echo "❌ Invalid choice"
    echo ""
    exit 1
    ;;
esac

echo ""
