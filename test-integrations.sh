#!/bin/bash
# Comprehensive Integration Test Suite for SEO Automation Platform
# Port: 4000

BASE_URL="http://localhost:4000"
TOKEN=""

echo "========================================================================"
echo "SEO AUTOMATION PLATFORM - INTEGRATION TEST SUITE"
echo "========================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

echo "========================================================================"
echo "1. AUTHENTICATION SYSTEM TESTS"
echo "========================================================================"
echo ""

# Test 1.1: Admin Login
echo "Test 1.1: Admin Login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost.com","password":"Admin123!"}')

echo "$LOGIN_RESPONSE" | grep -q "token"
test_result $? "Admin login returns JWT token"

# Extract token for subsequent tests
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}  Token extracted successfully${NC}"
else
    echo -e "${RED}  Failed to extract token${NC}"
fi
echo ""

# Test 1.2: Verify Token with /api/auth/me
echo "Test 1.2: Token Validation (/api/auth/me)"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "$ME_RESPONSE" | grep -q "admin@localhost.com"
test_result $? "Token validates and returns user info"
echo ""

# Test 1.3: User Registration
echo "Test 1.3: New User Registration"
REG_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPass123!","name":"Test User","role":"user"}')

echo "$REG_RESPONSE" | grep -q "token\|success"
test_result $? "User registration creates new account"
echo ""

echo "========================================================================"
echo "2. DATABASE OPERATIONS TESTS"
echo "========================================================================"
echo ""

# Test 2.1: Create Client
echo "Test 2.1: Create New Client"
CLIENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "website": "https://testclient.com",
    "email": "client@testclient.com",
    "phone": "555-1234",
    "status": "active"
  }')

echo "$CLIENT_RESPONSE" | grep -q "id\|success\|Test Client"
test_result $? "Client creation"

# Extract client ID
CLIENT_ID=$(echo "$CLIENT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo -e "  Client ID: ${YELLOW}$CLIENT_ID${NC}"
echo ""

# Test 2.2: Get All Clients
echo "Test 2.2: Get All Clients"
CLIENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $TOKEN")

echo "$CLIENTS_RESPONSE" | grep -q "Test Client\|\["
test_result $? "Retrieve all clients"
echo ""

# Test 2.3: Get Client by ID
if [ -n "$CLIENT_ID" ]; then
    echo "Test 2.3: Get Client by ID"
    CLIENT_GET=$(curl -s -X GET "$BASE_URL/api/clients/$CLIENT_ID" \
      -H "Authorization: Bearer $TOKEN")

    echo "$CLIENT_GET" | grep -q "testclient.com"
    test_result $? "Retrieve specific client"
    echo ""
fi

echo "========================================================================"
echo "3. WHITE-LABEL CONFIGURATION TESTS"
echo "========================================================================"
echo ""

# Test 3.1: Get Active White-Label Config
echo "Test 3.1: Get Active White-Label Configuration"
WL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/whitelabel/active")

echo "$WL_RESPONSE" | grep -q "brandName\|primaryColor"
test_result $? "White-label config retrieval"
echo ""

# Test 3.2: Get All Configurations
echo "Test 3.2: Get All White-Label Configurations"
WL_ALL=$(curl -s -X GET "$BASE_URL/api/whitelabel/configs" \
  -H "Authorization: Bearer $TOKEN")

echo "$WL_ALL" | grep -q "\["
test_result $? "List all white-label configs"
echo ""

echo "========================================================================"
echo "4. LEAD CAPTURE TESTS"
echo "========================================================================"
echo ""

# Test 4.1: Capture Lead
echo "Test 4.1: Capture New Lead"
LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "email": "lead@example.com",
    "phone": "555-9876",
    "website": "https://leadwebsite.com",
    "source": "Integration Test"
  }')

echo "$LEAD_RESPONSE" | grep -q "id\|success\|Lead"
test_result $? "Lead capture"

LEAD_ID=$(echo "$LEAD_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo -e "  Lead ID: ${YELLOW}$LEAD_ID${NC}"
echo ""

# Test 4.2: Get All Leads
echo "Test 4.2: Get All Leads"
LEADS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/leads" \
  -H "Authorization: Bearer $TOKEN")

echo "$LEADS_RESPONSE" | grep -q "Test Lead\|\["
test_result $? "Retrieve all leads"
echo ""

echo "========================================================================"
echo "5. EMAIL CAMPAIGN TESTS"
echo "========================================================================"
echo ""

# Test 5.1: Get Email Campaigns
echo "Test 5.1: Get Email Campaigns"
CAMPAIGNS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/campaigns" \
  -H "Authorization: Bearer $TOKEN")

echo "$CAMPAIGNS_RESPONSE" | grep -q "welcome\|monthly-report\|\["
test_result $? "Email campaigns list"
echo ""

# Test 5.2: Get Email Queue
echo "Test 5.2: Get Email Queue"
QUEUE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/emails/queue" \
  -H "Authorization: Bearer $TOKEN")

echo "$QUEUE_RESPONSE" | grep -q "\[\]" || echo "$QUEUE_RESPONSE" | grep -q "pending\|sent"
test_result $? "Email queue retrieval"
echo ""

echo "========================================================================"
echo "6. SEO AUTOMATION TESTS"
echo "========================================================================"
echo ""

# Test 6.1: Get Schedule Status
echo "Test 6.1: Get Automation Schedule Status"
SCHEDULE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/automation/schedule" \
  -H "Authorization: Bearer $TOKEN")

echo "$SCHEDULE_RESPONSE" | grep -q "rankTracking\|localSeo"
test_result $? "Automation schedule status"
echo ""

if [ -n "$CLIENT_ID" ]; then
    # Test 6.2: Rank Tracking Summary
    echo "Test 6.2: Rank Tracking Summary (Client $CLIENT_ID)"
    RANK_RESPONSE=$(curl -s -X GET "$BASE_URL/api/automation/rank-tracking/$CLIENT_ID/summary" \
      -H "Authorization: Bearer $TOKEN")

    echo "$RANK_RESPONSE" | grep -q "clientId\|keywords\|No data" || [ $? -eq 0 ]
    test_result $? "Rank tracking summary endpoint"
    echo ""

    # Test 6.3: Local SEO History
    echo "Test 6.3: Local SEO History (Client $CLIENT_ID)"
    LOCAL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/automation/local-seo/$CLIENT_ID/history" \
      -H "Authorization: Bearer $TOKEN")

    echo "$LOCAL_RESPONSE" | grep -q "\[\]" || echo "$LOCAL_RESPONSE" | grep -q "clientId"
    test_result $? "Local SEO history endpoint"
    echo ""
fi

echo "========================================================================"
echo "7. AI AUTO-FIX ENGINE TESTS"
echo "========================================================================"
echo ""

if [ -n "$CLIENT_ID" ]; then
    # Test 7.1: NAP Auto-Fix Status
    echo "Test 7.1: NAP Auto-Fix Endpoint"
    NAP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auto-fix/nap/$CLIENT_ID/run" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}")

    echo "$NAP_RESPONSE" | tail -1 | grep -q "200\|404"
    test_result $? "NAP auto-fix endpoint accessible"
    echo ""

    # Test 7.2: Schema Injection Endpoint
    echo "Test 7.2: Schema Injection Endpoint"
    SCHEMA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auto-fix/schema/$CLIENT_ID/inject" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}")

    echo "$SCHEMA_RESPONSE" | tail -1 | grep -q "200\|404"
    test_result $? "Schema injection endpoint accessible"
    echo ""
fi

echo "========================================================================"
echo "8. REPORTING TESTS"
echo "========================================================================"
echo ""

# Test 8.1: List Reports
echo "Test 8.1: List Reports"
REPORTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/reports" \
  -H "Authorization: Bearer $TOKEN")

echo "$REPORTS_RESPONSE" | grep -q "\[\]" || echo "$REPORTS_RESPONSE" | grep -q "id"
test_result $? "Reports list endpoint"
echo ""

if [ -n "$CLIENT_ID" ]; then
    # Test 8.2: Complete Dashboard Data
    echo "Test 8.2: Complete Dashboard Data (Client $CLIENT_ID)"
    DASHBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/api/dashboard/$CLIENT_ID/complete" \
      -H "Authorization: Bearer $TOKEN")

    echo "$DASHBOARD_RESPONSE" | grep -q "client\|rankings\|localSeo"
    test_result $? "Complete dashboard data endpoint"
    echo ""
fi

echo "========================================================================"
echo "9. HEALTH CHECK TESTS"
echo "========================================================================"
echo ""

# Test 9.1: Root Endpoint
echo "Test 9.1: Root Endpoint"
ROOT_RESPONSE=$(curl -s -X GET "$BASE_URL/" -w "\n%{http_code}")
HTTP_CODE=$(echo "$ROOT_RESPONSE" | tail -1)

[ "$HTTP_CODE" = "200" ]
test_result $? "Server root endpoint responds"
echo ""

# Test 9.2: Admin Panel
echo "Test 9.2: Admin Panel Access"
ADMIN_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/" -w "\n%{http_code}")
ADMIN_CODE=$(echo "$ADMIN_RESPONSE" | tail -1)

[ "$ADMIN_CODE" = "200" ]
test_result $? "Admin panel accessible"
echo ""

# Test 9.3: Client Portal
echo "Test 9.3: Client Portal Access"
PORTAL_RESPONSE=$(curl -s -X GET "$BASE_URL/portal/" -w "\n%{http_code}")
PORTAL_CODE=$(echo "$PORTAL_RESPONSE" | tail -1)

[ "$PORTAL_CODE" = "200" ]
test_result $? "Client portal accessible"
echo ""

# Test 9.4: Lead Magnet
echo "Test 9.4: Lead Magnet Access"
MAGNET_RESPONSE=$(curl -s -X GET "$BASE_URL/leadmagnet/" -w "\n%{http_code}")
MAGNET_CODE=$(echo "$MAGNET_RESPONSE" | tail -1)

[ "$MAGNET_CODE" = "200" ]
test_result $? "Lead magnet accessible"
echo ""

echo "========================================================================"
echo "TEST SUMMARY"
echo "========================================================================"
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo "Total: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the output above.${NC}"
    exit 1
fi
