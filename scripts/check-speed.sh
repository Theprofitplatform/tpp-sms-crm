#!/bin/bash

# Quick Page Speed Check Script
# Tests key pages and reports scores

echo "════════════════════════════════════════════════════════════════"
echo "  PAGE SPEED DIAGNOSTIC - Instant Auto Traders"
echo "════════════════════════════════════════════════════════════════"
echo ""

SITE="https://instantautotraders.com.au"
TEST_URLS=(
    "$SITE/"
    "$SITE/2025/10/13/sell-your-car-online/"
    "$SITE/2025/07/28/used-car-buyer-nsw/"
)

echo "Testing $(echo ${#TEST_URLS[@]}) URLs..."
echo ""

# Function to test URL
test_url() {
    local url=$1
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Testing: $url"
    echo ""

    # Measure load time with curl
    echo "⏱️  Measuring load time..."
    LOAD_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$url")

    echo "   Load Time: ${LOAD_TIME} seconds"

    # Interpret results
    if (( $(echo "$LOAD_TIME < 2.0" | bc -l) )); then
        echo "   Status: ✅ EXCELLENT (Fast)"
    elif (( $(echo "$LOAD_TIME < 4.0" | bc -l) )); then
        echo "   Status: ⚠️  NEEDS WORK (Acceptable)"
    else
        echo "   Status: 🔴 CRITICAL (Too Slow)"
    fi

    echo ""
    echo "For detailed PageSpeed Insights:"
    echo "https://pagespeed.web.dev/analysis?url=$(echo $url | sed 's/:/%3A/g' | sed 's/\//%2F/g')"
    echo ""
}

# Test each URL
for url in "${TEST_URLS[@]}"; do
    test_url "$url"
done

echo "════════════════════════════════════════════════════════════════"
echo "  ANALYSIS COMPLETE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 INTERPRETATION:"
echo ""
echo "✅ EXCELLENT (< 2 sec):   No action needed"
echo "⚠️  NEEDS WORK (2-4 sec):  Optimize within 7 days"
echo "🔴 CRITICAL (> 4 sec):     FIX IMMEDIATELY - Major ranking penalty"
echo ""
echo "🔗 DETAILED TESTING:"
echo "   Visit: https://pagespeed.web.dev/"
echo "   Check both Mobile and Desktop scores"
echo "   Focus on Core Web Vitals (LCP, CLS, INP)"
echo ""
echo "⚡ QUICK FIXES IF SLOW:"
echo "   1. Install WP Rocket plugin (\$49)"
echo "   2. Enable Cloudflare CDN (free)"
echo "   3. Compress images with Imagify"
echo "   4. Enable lazy loading"
echo ""
echo "Priority: If ANY URL shows 🔴 CRITICAL, fix page speed BEFORE"
echo "          doing anything else (schema, content, links, etc.)"
echo ""
echo "════════════════════════════════════════════════════════════════"
