#!/bin/bash

# Cron Job Examples for WordPress SEO Automation
# This file contains example crontab entries

# ============================================
# INSTALLATION INSTRUCTIONS
# ============================================
# 1. Edit your crontab:
#    crontab -e
#
# 2. Copy one of the examples below
#
# 3. Update the path to match your installation
#
# 4. Save and exit
# ============================================

# Get the absolute path to this script's directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Your project directory: $PROJECT_DIR"
echo ""
echo "Copy one of these cron examples:"
echo ""

cat << 'EOF'
# ============================================
# EXAMPLE 1: Daily audit at 2 AM
# ============================================
0 2 * * * cd /path/to/seo-expert && node index.js --mode=audit >> logs/cron.log 2>&1

# ============================================
# EXAMPLE 2: Weekly audit on Monday at 9 AM
# ============================================
0 9 * * 1 cd /path/to/seo-expert && node index.js --mode=audit >> logs/cron.log 2>&1

# ============================================
# EXAMPLE 3: Daily audit + fix at 3 AM
# ============================================
0 3 * * * cd /path/to/seo-expert && node index.js --mode=fix --max-posts=20 >> logs/cron.log 2>&1

# ============================================
# EXAMPLE 4: Audit every 6 hours
# ============================================
0 */6 * * * cd /path/to/seo-expert && node index.js --mode=audit >> logs/cron.log 2>&1

# ============================================
# EXAMPLE 5: Weekly fix on Sunday at 1 AM
# ============================================
0 1 * * 0 cd /path/to/seo-expert && node index.js --mode=fix >> logs/cron.log 2>&1

# ============================================
# EXAMPLE 6: Daily small batch fix
# ============================================
0 4 * * * cd /path/to/seo-expert && node index.js --mode=fix --max-posts=10 >> logs/cron.log 2>&1

# ============================================
# EXAMPLE 7: Email report after audit
# ============================================
0 2 * * * cd /path/to/seo-expert && node index.js --mode=audit && mail -s "SEO Audit Report" your@email.com < logs/audit-summary-$(date +\%Y-\%m-\%d).md

# ============================================
# CRON TIME FORMAT REFERENCE
# ============================================
# * * * * * command
# │ │ │ │ │
# │ │ │ │ └─── Day of week (0-7, 0 or 7 is Sunday)
# │ │ │ └───── Month (1-12)
# │ │ └─────── Day of month (1-31)
# │ └───────── Hour (0-23)
# └─────────── Minute (0-59)

EOF

echo ""
echo "Remember to:"
echo "  1. Replace /path/to/seo-expert with: $PROJECT_DIR"
echo "  2. Ensure env/.env is properly configured"
echo "  3. Test the command manually first"
echo "  4. Check logs/cron.log for output"
