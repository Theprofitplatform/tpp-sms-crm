#!/bin/bash

###############################################################################
# SEO Automation Setup Wizard
# Creates a new SEO monitoring setup for any WordPress site
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 SEO Automation Setup Wizard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This wizard will help you set up automated SEO monitoring"
echo "for a new WordPress site in just a few minutes!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get current directory (template source)
TEMPLATE_DIR="$(pwd)"

# ============================================================================
# Step 1: WordPress Site Details
# ============================================================================

echo -e "${BLUE}Step 1: WordPress Site Details${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "WordPress Site URL (e.g., https://example.com): " SITE_URL

# Clean URL
SITE_URL=$(echo "$SITE_URL" | sed 's:/*$::')

read -p "Site Name (e.g., Example Business): " SITE_NAME

# Generate project name from URL
PROJECT_NAME=$(echo "$SITE_URL" | sed 's/https\?:\/\///' | sed 's/www\.//' | sed 's/[^a-zA-Z0-9]/-/g' | sed 's/-*$//')

echo ""
echo -e "${GREEN}✓${NC} Site: $SITE_NAME"
echo -e "${GREEN}✓${NC} URL: $SITE_URL"
echo -e "${GREEN}✓${NC} Project name: $PROJECT_NAME"
echo ""

# ============================================================================
# Step 2: WordPress Credentials
# ============================================================================

echo -e "${BLUE}Step 2: WordPress Credentials${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You need a WordPress Application Password (not your regular password)."
echo ""
echo "How to create one:"
echo "1. Log into WordPress admin"
echo "2. Go to Users → Profile"
echo "3. Scroll to 'Application Passwords'"
echo "4. Enter name (e.g., 'SEO Automation')"
echo "5. Click 'Add New Application Password'"
echo "6. Copy the generated password"
echo ""

read -p "WordPress Username: " WP_USER
read -sp "WordPress Application Password: " WP_PASS
echo ""
echo ""
echo -e "${GREEN}✓${NC} WordPress credentials saved"
echo ""

# ============================================================================
# Step 3: Discord Webhook (Optional)
# ============================================================================

echo -e "${BLUE}Step 3: Discord Notifications${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Do you want to use a separate Discord channel for this site?"
echo ""
echo "Options:"
echo "  1) Use same Discord webhook as template (share notifications)"
echo "  2) Use a different Discord webhook (separate channel)"
echo "  3) Skip Discord notifications"
echo ""

read -p "Choice (1/2/3): " DISCORD_CHOICE

DISCORD_WEBHOOK=""

case $DISCORD_CHOICE in
  1)
    # Copy from template
    if [ -f "$TEMPLATE_DIR/env/.env" ]; then
      DISCORD_WEBHOOK=$(grep "DISCORD_WEBHOOK_URL=" "$TEMPLATE_DIR/env/.env" | cut -d'=' -f2)
      echo -e "${GREEN}✓${NC} Using shared Discord webhook"
    else
      echo -e "${YELLOW}⚠${NC} Template .env not found, will need to add webhook manually"
    fi
    ;;
  2)
    echo ""
    echo "How to create a Discord webhook:"
    echo "1. Open Discord server"
    echo "2. Server Settings → Integrations → Webhooks"
    echo "3. Click 'New Webhook'"
    echo "4. Name it (e.g., 'SEO - $SITE_NAME')"
    echo "5. Select channel"
    echo "6. Copy webhook URL"
    echo ""
    read -p "Discord Webhook URL: " DISCORD_WEBHOOK
    echo -e "${GREEN}✓${NC} Discord webhook saved"
    ;;
  3)
    echo -e "${YELLOW}⚠${NC} Discord notifications disabled"
    ;;
esac

echo ""

# ============================================================================
# Step 4: Keywords to Track
# ============================================================================

echo -e "${BLUE}Step 4: Keywords to Track${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Enter 5-10 keywords you want to track rankings for."
echo "Examples: 'buy shoes online', 'best running shoes', etc."
echo ""
echo "Enter keywords (one per line). Press Ctrl+D when done:"
echo ""

# Read keywords
KEYWORDS_ARRAY=()
while IFS= read -r line; do
  if [ ! -z "$line" ]; then
    KEYWORDS_ARRAY+=("$line")
  fi
done

# Convert to JavaScript array format
KEYWORDS_JS=""
for keyword in "${KEYWORDS_ARRAY[@]}"; do
  KEYWORDS_JS+="      '$keyword',\n"
done

# Remove trailing comma
KEYWORDS_JS=$(echo -e "$KEYWORDS_JS" | sed '$ s/,$//')

echo ""
echo -e "${GREEN}✓${NC} ${#KEYWORDS_ARRAY[@]} keywords added"
echo ""

# ============================================================================
# Step 5: API Keys (Optional)
# ============================================================================

echo -e "${BLUE}Step 5: API Keys${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Do you want to use the same API keys as the template?"
echo "(SerpApi, Claude, Gemini, etc.)"
echo ""
read -p "Use shared API keys? (Y/n): " USE_SHARED_KEYS

USE_SHARED_KEYS=${USE_SHARED_KEYS:-Y}

echo ""

# ============================================================================
# Step 6: Create Project
# ============================================================================

echo -e "${BLUE}Step 6: Creating Project${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine project location
if [[ "$TEMPLATE_DIR" == *"/mnt/c/"* ]]; then
  # Windows WSL path
  BASE_DIR=$(dirname "$TEMPLATE_DIR")
else
  # Linux path
  BASE_DIR="$HOME/projects"
  mkdir -p "$BASE_DIR"
fi

PROJECT_DIR="$BASE_DIR/seo-$PROJECT_NAME"

echo "Project will be created at: $PROJECT_DIR"
echo ""

# Check if directory exists
if [ -d "$PROJECT_DIR" ]; then
  echo -e "${YELLOW}⚠${NC} Directory already exists!"
  read -p "Overwrite? (y/N): " OVERWRITE
  if [[ ! $OVERWRITE =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
  rm -rf "$PROJECT_DIR"
fi

# Copy template
echo "Copying template files..."
cp -r "$TEMPLATE_DIR" "$PROJECT_DIR"

# Remove logs and node_modules
rm -rf "$PROJECT_DIR/logs"
rm -rf "$PROJECT_DIR/node_modules"
mkdir -p "$PROJECT_DIR/logs"

echo -e "${GREEN}✓${NC} Template copied"

# ============================================================================
# Step 7: Generate Configuration
# ============================================================================

echo ""
echo "Generating configuration..."
echo ""

# Create .env file
cat > "$PROJECT_DIR/env/.env" << EOF
# Auto-generated: $(date)
# Site: $SITE_NAME

# WordPress Configuration
WORDPRESS_URL=$SITE_URL
WORDPRESS_USER=$WP_USER
WORDPRESS_APP_PASSWORD=$WP_PASS

EOF

# Add Discord webhook if provided
if [ ! -z "$DISCORD_WEBHOOK" ]; then
  echo "# Notifications" >> "$PROJECT_DIR/env/.env"
  echo "DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK" >> "$PROJECT_DIR/env/.env"
  echo "" >> "$PROJECT_DIR/env/.env"
fi

# Copy API keys if using shared
if [[ $USE_SHARED_KEYS =~ ^[Yy]$ ]]; then
  if [ -f "$TEMPLATE_DIR/env/.env" ]; then
    echo "# API Keys (shared from template)" >> "$PROJECT_DIR/env/.env"
    grep -E "SERPAPI_KEY|VALUESERP_API_KEY|BING_WEBMASTER_API_KEY|ANTHROPIC_API_KEY|GOOGLE_GEMINI_API_KEY|OPENAI_API_KEY" "$TEMPLATE_DIR/env/.env" >> "$PROJECT_DIR/env/.env"
    echo "" >> "$PROJECT_DIR/env/.env"
  fi
fi

# Add site details
cat >> "$PROJECT_DIR/env/.env" << EOF
# Site Details
SITE_URL=$SITE_URL
SITE_NAME=$SITE_NAME

# Safety Settings
APPLY_TO_PUBLISHED=false
DRY_RUN=true
LOG_LEVEL=info
EOF

echo -e "${GREEN}✓${NC} .env file created"

# Update monitor-rankings.js with custom keywords and URL
if [ ${#KEYWORDS_ARRAY[@]} -gt 0 ]; then
  cat > "$PROJECT_DIR/monitor-rankings.js.tmp" << 'EOFMONITOR'
#!/usr/bin/env node

/**
 * Automated Ranking Monitor
 * Tracks keyword rankings daily and alerts on changes
 */

import { competitorAnalyzer } from './tasks/competitor-analysis.js';
import { logger } from './tasks/logger.js';
import { discordNotifier } from './tasks/discord-notifier.js';
import { config } from './env/config.js';
import fs from 'fs';
import path from 'path';

// Validate configuration on startup
config.validateMonitoring();

class RankingMonitor {
  constructor() {
    this.siteUrl = 'SITE_URL_PLACEHOLDER';
    this.keywords = [
KEYWORDS_PLACEHOLDER
    ];
    this.historyFile = 'logs/ranking-history.json';
    this.history = this.loadHistory();
  }
EOFMONITOR

  # Replace placeholders
  sed "s|SITE_URL_PLACEHOLDER|$SITE_URL|g" "$PROJECT_DIR/monitor-rankings.js.tmp" > "$PROJECT_DIR/monitor-rankings.js.tmp2"
  sed "s|KEYWORDS_PLACEHOLDER|$KEYWORDS_JS|g" "$PROJECT_DIR/monitor-rankings.js.tmp2" > "$PROJECT_DIR/monitor-rankings.js.tmp3"

  # Append the rest of the original file (skip first 20 lines)
  tail -n +21 "$TEMPLATE_DIR/monitor-rankings.js" >> "$PROJECT_DIR/monitor-rankings.js.tmp3"

  mv "$PROJECT_DIR/monitor-rankings.js.tmp3" "$PROJECT_DIR/monitor-rankings.js"
  rm -f "$PROJECT_DIR/monitor-rankings.js.tmp" "$PROJECT_DIR/monitor-rankings.js.tmp2"

  chmod +x "$PROJECT_DIR/monitor-rankings.js"

  echo -e "${GREEN}✓${NC} monitor-rankings.js configured"
fi

# Update daily-report.js with site URL
sed -i "s|this.siteUrl = '.*'|this.siteUrl = '$SITE_URL'|g" "$PROJECT_DIR/daily-report.js"
echo -e "${GREEN}✓${NC} daily-report.js configured"

# Update discord-notifier.js with site name
sed -i "s|InstantAutoTraders.com.au|$SITE_NAME|g" "$PROJECT_DIR/tasks/discord-notifier.js"
echo -e "${GREEN}✓${NC} discord-notifier.js configured"

# Create README for this project
cat > "$PROJECT_DIR/README-THIS-SITE.md" << EOF
# SEO Automation - $SITE_NAME

**Site:** $SITE_URL
**Created:** $(date)
**Project:** $PROJECT_NAME

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Test Discord notification
npm run discord:test

# Test WordPress connection
npm run test:apis

# Check rankings
npm run monitor

# Generate report
npm run report
\`\`\`

## Deploy to VPS

\`\`\`bash
./setup-vps-automation.sh
\`\`\`

## Keywords Being Tracked

EOF

for keyword in "${KEYWORDS_ARRAY[@]}"; do
  echo "- $keyword" >> "$PROJECT_DIR/README-THIS-SITE.md"
done

cat >> "$PROJECT_DIR/README-THIS-SITE.md" << EOF

## Configuration

- WordPress URL: $SITE_URL
- WordPress User: $WP_USER
- Keywords: ${#KEYWORDS_ARRAY[@]} keywords
- Discord: $([ ! -z "$DISCORD_WEBHOOK" ] && echo "Configured ✅" || echo "Not configured")

## Next Steps

1. Test locally: \`npm run discord:test\`
2. Check rankings: \`npm run monitor\`
3. Deploy to VPS: \`./setup-vps-automation.sh\`

See DEPLOYMENT-SUCCESSFUL.md after deployment for full details.
EOF

echo -e "${GREEN}✓${NC} README created"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✓ Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Project created at: $PROJECT_DIR"
echo ""
echo "What was configured:"
echo -e "  ${GREEN}✓${NC} WordPress: $SITE_URL"
echo -e "  ${GREEN}✓${NC} Keywords: ${#KEYWORDS_ARRAY[@]} keywords"
echo -e "  ${GREEN}✓${NC} Discord: $([ ! -z "$DISCORD_WEBHOOK" ] && echo "Configured" || echo "Not configured")"
echo -e "  ${GREEN}✓${NC} API Keys: $([ $USE_SHARED_KEYS =~ ^[Yy]$ ] && echo "Shared from template" || echo "Need to add manually")"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Install dependencies:"
echo "   cd \"$PROJECT_DIR\""
echo "   npm install"
echo ""
echo "2. Test configuration:"
echo "   npm run discord:test"
echo "   npm run monitor"
echo ""
echo "3. Deploy to VPS:"
echo "   ./setup-vps-automation.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask if user wants to install dependencies now
read -p "Install dependencies now? (Y/n): " INSTALL_NOW
INSTALL_NOW=${INSTALL_NOW:-Y}

if [[ $INSTALL_NOW =~ ^[Yy]$ ]]; then
  echo ""
  echo "Installing dependencies..."
  cd "$PROJECT_DIR"
  npm install
  echo ""
  echo -e "${GREEN}✓${NC} Dependencies installed!"
  echo ""

  # Ask if user wants to test
  read -p "Test Discord notification now? (Y/n): " TEST_NOW
  TEST_NOW=${TEST_NOW:-Y}

  if [[ $TEST_NOW =~ ^[Yy]$ ]]; then
    echo ""
    npm run discord:test
  fi
fi

echo ""
echo -e "${GREEN}🎉 All done! Your new SEO monitoring is ready!${NC}"
echo ""
echo "Project location: $PROJECT_DIR"
echo ""
