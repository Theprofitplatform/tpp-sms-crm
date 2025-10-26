#!/bin/bash
# Investigation script for failed tests

BASE_URL="http://localhost:4000"

echo "Investigating API failures..."
echo ""

# Get token first
echo "1. Getting admin token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost.com","password":"Admin123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token obtained: ${TOKEN:0:30}..."
echo ""

# Test client creation
echo "2. Testing Client Creation:"
echo "Request:"
echo '{"name":"Test Client","website":"https://testclient.com","email":"client@testclient.com","phone":"555-1234","status":"active"}'
echo ""
echo "Response:"
curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client","website":"https://testclient.com","email":"client@testclient.com","phone":"555-1234","status":"active"}' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client","website":"https://testclient.com","email":"client@testclient.com","phone":"555-1234","status":"active"}'
echo ""
echo ""

# Test white-label config
echo "3. Testing White-Label Config:"
echo "Response:"
curl -s -X GET "$BASE_URL/api/whitelabel/active" | jq '.' 2>/dev/null || curl -s -X GET "$BASE_URL/api/whitelabel/active"
echo ""
echo ""

# Test lead capture
echo "4. Testing Lead Capture:"
echo "Request:"
echo '{"name":"Test Lead","email":"lead@example.com","phone":"555-9876","website":"https://leadwebsite.com","source":"Integration Test"}'
echo ""
echo "Response:"
curl -s -X POST "$BASE_URL/api/leads" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","email":"lead@example.com","phone":"555-9876","website":"https://leadwebsite.com","source":"Integration Test"}' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/api/leads" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","email":"lead@example.com","phone":"555-9876","website":"https://leadwebsite.com","source":"Integration Test"}'
echo ""
echo ""

# Test email campaigns
echo "5. Testing Email Campaigns:"
echo "Response:"
curl -s -X GET "$BASE_URL/api/campaigns" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || curl -s -X GET "$BASE_URL/api/campaigns" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Test email queue
echo "6. Testing Email Queue:"
echo "Response:"
curl -s -X GET "$BASE_URL/api/emails/queue" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || curl -s -X GET "$BASE_URL/api/emails/queue" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Test reports
echo "7. Testing Reports:"
echo "Response:"
curl -s -X GET "$BASE_URL/api/reports" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || curl -s -X GET "$BASE_URL/api/reports" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Check server logs for errors
echo "8. Recent Server Logs (last 50 lines):"
tail -50 /tmp/seo-server-4000.log | grep -i "error\|fail\|exception" || echo "No errors found in recent logs"
echo ""
