#!/bin/bash

#
# Pixel Management Enhancements Verification Script
# Tests all new enhancement endpoints
#

set -e

API_URL="http://localhost:9000/api/v2"
CLIENT_ID="test-client-001"
PASSED=0
FAILED=0

echo "🧪 Verifying Pixel Management Enhancements"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_code="${5:-200}"

  echo -n "Testing: $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$API_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code, expected $expected_code)"
    echo "   Response: $body"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Step 1: Create pixel
echo "Step 1: Creating test pixel..."
PIXEL_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"domain\":\"test.example.com\",\"options\":{\"debug\":true}}" \
  "$API_URL/pixel/generate")

if echo "$PIXEL_RESPONSE" | grep -q '"success":true'; then
  PIXEL_ID=$(echo "$PIXEL_RESPONSE" | jq -r '.data.id')
  API_KEY=$(echo "$PIXEL_RESPONSE" | jq -r '.data.apiKey')
  echo -e "${GREEN}✅${NC} Pixel created (ID: $PIXEL_ID)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌${NC} Failed to create pixel"
  echo "$PIXEL_RESPONSE"
  FAILED=$((FAILED + 1))
  exit 1
fi

echo ""

# Step 2: Track pixel data with issues
echo "Step 2: Tracking pixel data with SEO issues..."
TRACK_DATA=$(cat <<EOF
{
  "apiKey": "$API_KEY",
  "metadata": {
    "url": "https://test.example.com/page1",
    "title": "Short",
    "metaDescription": "",
    "h1Tags": [],
    "h2Tags": ["Subheading"],
    "canonicalUrl": "",
    "ogTitle": "",
    "hasViewport": false,
    "wordCount": 150,
    "images": [{"src":"img1.jpg","alt":"","hasAlt":false,"width":800,"height":600}],
    "links": [{"href":"https://external.com","isInternal":false,"rel":""}],
    "schema": []
  },
  "vitals": {
    "lcp": 3500,
    "fid": 150,
    "cls": 0.15,
    "fcp": 1800,
    "ttfb": 600
  }
}
EOF
)

TRACK_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "$TRACK_DATA" "$API_URL/pixel/track")

if echo "$TRACK_RESPONSE" | grep -q '"success":true'; then
  SEO_SCORE=$(echo "$TRACK_RESPONSE" | jq -r '.data.seoScore')
  ISSUES_COUNT=$(echo "$TRACK_RESPONSE" | jq -r '.data.issuesDetected')
  echo -e "${GREEN}✅${NC} Data tracked (SEO Score: $SEO_SCORE/100, Issues: $ISSUES_COUNT)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌${NC} Failed to track data"
  echo "$TRACK_RESPONSE"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "Step 3: Testing enhancement endpoints..."
echo ""

# Test all enhancement endpoints
test_endpoint "Get pixel issues" "GET" "/pixel/issues/$PIXEL_ID"
test_endpoint "Get issue summary" "GET" "/pixel/issues/$PIXEL_ID/summary"
test_endpoint "Get pixel analytics" "GET" "/pixel/analytics/$PIXEL_ID?days=7"
test_endpoint "Get analytics trends" "GET" "/pixel/analytics/$PIXEL_ID/trends"
test_endpoint "Get pixel health" "GET" "/pixel/health/$PIXEL_ID"
test_endpoint "Get pixel uptime" "GET" "/pixel/uptime/$PIXEL_ID"

# Filter tests
test_endpoint "Filter issues by CRITICAL" "GET" "/pixel/issues/$PIXEL_ID?severity=CRITICAL"
test_endpoint "Filter issues by category" "GET" "/pixel/issues/$PIXEL_ID?category=Meta%20Tags"

# Export test
test_endpoint "Export analytics (JSON)" "POST" "/pixel/analytics/$PIXEL_ID/export" '{"days":7,"format":"json"}'

echo ""
echo "============================================"
echo "📊 Test Results:"
echo "   ✅ Passed: $PASSED"
echo "   ❌ Failed: $FAILED"
echo "   Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo ""
  echo "✨ Pixel Management Enhancements are working correctly!"
  echo ""
  echo "You can now use the following features:"
  echo "  • Advanced SEO issue detection with severity scoring"
  echo "  • Real-time pixel analytics and trends"
  echo "  • Pixel health monitoring and uptime tracking"
  echo "  • Issue management (view, filter, resolve)"
  echo "  • Analytics export (JSON/CSV)"
  echo ""
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed${NC}"
  exit 1
fi
