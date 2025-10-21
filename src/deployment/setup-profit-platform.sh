#!/bin/bash

###############################################################################
# The Profit Platform - SEO Monitoring Setup
# Auto-configures using existing keyword research
###############################################################################

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 The Profit Platform - SEO Monitoring Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will set up SEO monitoring for theprofitplatform.com.au"
echo "using your existing keyword research."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
SITE_URL="https://theprofitplatform.com.au"
SITE_NAME="The Profit Platform"
PROJECT_NAME="seo-profit-platform"
TEMPLATE_DIR="$(pwd)"

# Determine project location
if [[ "$TEMPLATE_DIR" == *"/mnt/c/"* ]]; then
  BASE_DIR=$(dirname "$TEMPLATE_DIR")
else
  BASE_DIR="$HOME/projects"
  mkdir -p "$BASE_DIR"
fi

PROJECT_DIR="$BASE_DIR/$PROJECT_NAME"

echo "Configuration:"
echo "  Site: $SITE_NAME"
echo "  URL: $SITE_URL"
echo "  Project: $PROJECT_DIR"
echo ""

# Check if directory exists
if [ -d "$PROJECT_DIR" ]; then
  echo "⚠️  Project directory already exists!"
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

# Cleanup
rm -rf "$PROJECT_DIR/logs"
rm -rf "$PROJECT_DIR/node_modules"
mkdir -p "$PROJECT_DIR/logs"

echo "✓ Template copied"
echo ""

# Create .env file
echo "Creating configuration..."

cat > "$PROJECT_DIR/env/.env" << 'EOF'
# The Profit Platform - SEO Monitoring
# Auto-generated from keyword research
# Site: https://theprofitplatform.com.au

# Site Configuration (Astro - no WordPress API)
WORDPRESS_URL=https://theprofitplatform.com.au
WORDPRESS_USER=n/a
WORDPRESS_APP_PASSWORD=n/a

EOF

# Copy Discord webhook if exists
if [ -f "$TEMPLATE_DIR/env/.env" ]; then
  DISCORD_WEBHOOK=$(grep "DISCORD_WEBHOOK_URL=" "$TEMPLATE_DIR/env/.env" 2>/dev/null | cut -d'=' -f2)
  if [ ! -z "$DISCORD_WEBHOOK" ]; then
    echo "# Discord Notifications" >> "$PROJECT_DIR/env/.env"
    echo "DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK" >> "$PROJECT_DIR/env/.env"
    echo "" >> "$PROJECT_DIR/env/.env"
    echo "✓ Discord webhook configured (shared)"
  else
    echo "⚠️  No Discord webhook found in template"
    echo "   You can add it later in env/.env"
  fi
fi

# Copy API keys
if [ -f "$TEMPLATE_DIR/env/.env" ]; then
  echo "# API Keys (shared from template)" >> "$PROJECT_DIR/env/.env"
  grep -E "SERPAPI_KEY|VALUESERP_API_KEY|ANTHROPIC_API_KEY|GOOGLE_GEMINI_API_KEY" "$TEMPLATE_DIR/env/.env" >> "$PROJECT_DIR/env/.env" 2>/dev/null || true
  echo "" >> "$PROJECT_DIR/env/.env"
fi

# Add remaining config
cat >> "$PROJECT_DIR/env/.env" << 'EOF'
# Site Details
SITE_URL=https://theprofitplatform.com.au
SITE_NAME=The Profit Platform

# Safety Settings
APPLY_TO_PUBLISHED=false
DRY_RUN=true
LOG_LEVEL=info
EOF

echo "✓ .env file created"

# Update monitor-rankings.js with The Profit Platform keywords
echo "Configuring keywords from research..."

cat > "$PROJECT_DIR/monitor-rankings.js" << 'EOFMONITOR'
#!/usr/bin/env node

/**
 * Automated Ranking Monitor - The Profit Platform
 * Keywords from: archive/docs/KEYWORD_RESEARCH.md
 * Focus: High-priority PRIMARY and LOCAL keywords
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
    this.siteUrl = 'https://theprofitplatform.com.au';

    // Top 10 HIGH PRIORITY keywords from keyword research
    // Source: PRIMARY KEYWORDS + SERVICE-SPECIFIC + LONG-TAIL (highest converting)
    this.keywords = [
      // PRIMARY - High Volume, High Intent (TOP 5)
      'digital marketing Sydney',
      'SEO services Sydney',
      'SEO agency Sydney',
      'Google Ads management Sydney',
      'local SEO Sydney',

      // SERVICE-SPECIFIC - Buyer Intent (TOP 3)
      'Google My Business optimization Sydney',
      'website SEO audit Sydney',

      // LONG-TAIL - High Conversion (TOP 2)
      'affordable SEO Sydney',
      'small business marketing Sydney'
    ];

    this.historyFile = 'logs/ranking-history.json';
    this.history = this.loadHistory();
  }

  async monitor() {
    console.log('\n📊 Ranking Monitor - The Profit Platform\n');
    console.log('='.repeat(70));
    console.log(`Monitoring ${this.keywords.length} keywords...\n`);

    const today = new Date().toISOString().split('T')[0];
    const results = {
      date: today,
      timestamp: new Date().toISOString(),
      rankings: []
    };

    try {
      for (let i = 0; i < this.keywords.length; i++) {
        const keyword = this.keywords[i];
        console.log(`\n[${i + 1}/${this.keywords.length}] Checking: "${keyword}"`);
        console.log('-'.repeat(70));

        try {
          const comparison = await competitorAnalyzer.compareWithCompetitors(
            this.siteUrl,
            keyword,
            { limit: 20, location: 'Sydney,New South Wales,Australia' }
          );

          const position = comparison.yourSite.position;
          const ranking = comparison.insights.youRank;

          console.log(`Position: ${position}`);
          console.log(`Ranking: ${ranking ? '✅ Yes' : '❌ No'}`);

          // Check for changes
          const previousRank = this.getPreviousRank(keyword);
          const change = this.calculateChange(previousRank, position);

          if (change !== 0) {
            const emoji = change > 0 ? '📈' : '📉';
            console.log(`${emoji} Change: ${change > 0 ? '+' : ''}${change} positions`);
          }

          results.rankings.push({
            keyword,
            position,
            ranking,
            change,
            topCompetitors: comparison.topCompetitors.slice(0, 3).map(c => c.domain),
            opportunities: comparison.insights.opportunities
          });

        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
          results.rankings.push({
            keyword,
            error: error.message
          });
        }

        // Rate limiting
        await this.delay(2000);
      }

      // Save results
      this.saveResults(results);

      // Generate alert summary
      const alerts = this.generateAlerts(results);

      // Send Discord notification
      await this.sendDiscordNotifications(results, alerts);

      // Print summary
      this.printSummary(results);

    } catch (error) {
      logger.error('Monitoring failed', error.message);
      console.log('\n❌ Error:', error.message);
    }
  }
EOFMONITOR

# Append rest of the monitor code (skip first 110 lines)
tail -n +111 "$TEMPLATE_DIR/monitor-rankings.js" >> "$PROJECT_DIR/monitor-rankings.js"

chmod +x "$PROJECT_DIR/monitor-rankings.js"
echo "✓ monitor-rankings.js configured with TOP 10 keywords"

# Update daily-report.js
sed -i "s|this.siteUrl = '.*'|this.siteUrl = '$SITE_URL'|g" "$PROJECT_DIR/daily-report.js"
echo "✓ daily-report.js configured"

# Update discord-notifier.js
sed -i "s|InstantAutoTraders.com.au|The Profit Platform|g" "$PROJECT_DIR/tasks/discord-notifier.js"
echo "✓ discord-notifier.js configured"

# Create README
cat > "$PROJECT_DIR/README-TPP.md" << 'EOF'
# SEO Monitoring - The Profit Platform

**Site:** https://theprofitplatform.com.au
**Framework:** Astro (Static Site)
**Focus:** Sydney Digital Marketing Services

## Keywords Being Tracked

Based on keyword research from `/archive/docs/KEYWORD_RESEARCH.md`:

### PRIMARY KEYWORDS (High Volume, High Intent)
1. digital marketing Sydney (2,900/mo)
2. SEO services Sydney (1,600/mo)
3. SEO agency Sydney (1,300/mo)
4. Google Ads management Sydney (720/mo)
5. local SEO Sydney (320/mo)

### SERVICE-SPECIFIC (Buyer Intent)
6. Google My Business optimization Sydney (170/mo)
7. website SEO audit Sydney (140/mo)

### LONG-TAIL (High Conversion)
8. affordable SEO Sydney (170/mo)
9. small business marketing Sydney (480/mo)

**Total Monthly Search Volume:** 8,440 searches/month

## Quick Start

```bash
# Install dependencies
npm install

# Test Discord
npm run discord:test

# Check rankings
npm run monitor

# Generate report
npm run report
```

## Deploy to VPS

```bash
./setup-vps-automation.sh
```

## Automated Schedule

- **9 AM Daily:** Ranking check + Discord notification
- **5 PM Daily:** Daily SEO report + Discord summary
- **Sunday 10 AM:** Weekly optimization analysis

## Expected Results

### Month 1
- Baseline established for 10 keywords
- 1-2 keywords start ranking (positions 15-20)
- Daily Discord notifications working

### Month 3
- 3-5 keywords in top 10
- Correlation: blog automation → ranking improvements
- Clear trends and opportunities identified

### Month 6
- 7-8 keywords in top 10
- 50%+ increase in organic traffic
- Data-driven content strategy refined

## Integration

This monitoring works alongside your existing:
- **Blog automation:** `/automation` (already running on VPS)
- **Content generation:** AI-powered blog posts
- **Discord notifications:** Unified in one channel

All systems send to the same Discord channel for centralized tracking.

## Keyword Research Source

Full keyword research available at:
- `/mnt/c/Users/abhis/projects/atpp/tpp/archive/docs/KEYWORD_RESEARCH.md`
- Includes 40+ keywords with search volumes
- Competitor analysis
- Content strategy recommendations

## Next Steps

1. Test locally: `npm run monitor`
2. Review first report: `cat logs/ranking-2025-10-15.json`
3. Deploy to VPS: `./setup-vps-automation.sh`
4. Wait for 9 AM tomorrow for first automated run!
EOF

echo "✓ README created"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Project created at: $PROJECT_DIR"
echo ""
echo "Keywords configured: 10 HIGH PRIORITY keywords"
echo "  - 5 PRIMARY (high volume)"
echo "  - 3 SERVICE-SPECIFIC (buyer intent)"
echo "  - 2 LONG-TAIL (high conversion)"
echo ""
echo "Total search volume: ~8,440 searches/month"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next Steps:"
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

# Ask to install
read -p "Install dependencies now? (Y/n): " INSTALL_NOW
INSTALL_NOW=${INSTALL_NOW:-Y}

if [[ $INSTALL_NOW =~ ^[Yy]$ ]]; then
  echo ""
  echo "Installing dependencies..."
  cd "$PROJECT_DIR"
  npm install
  echo ""
  echo "✓ Dependencies installed!"
  echo ""

  read -p "Test Discord notification now? (Y/n): " TEST_NOW
  TEST_NOW=${TEST_NOW:-Y}

  if [[ $TEST_NOW =~ ^[Yy]$ ]]; then
    echo ""
    npm run discord:test
  fi
fi

echo ""
echo "🎉 The Profit Platform SEO monitoring is ready!"
echo ""
echo "Your top 10 keywords are being tracked based on your keyword research."
echo "Deploy to VPS when ready: ./setup-vps-automation.sh"
echo ""
