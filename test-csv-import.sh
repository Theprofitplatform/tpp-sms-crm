#!/bin/bash

# Test script for CSV import functionality
# This script tests the complete CSV import flow

API_BASE="https://sms.theprofitplatform.com.au/api"
EMAIL="admin@example.com"
CSV_FILE="test-contacts-consent.csv"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📊 Testing CSV Import Functionality${NC}\n"

# Step 1: Request magic link
echo -e "${YELLOW}Step 1:${NC} Requesting magic link..."
response=$(curl -s -X POST "$API_BASE/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

echo "  Response: $response"

# Get token from logs
echo -e "\n${YELLOW}Step 2:${NC} Getting magic link token from logs..."
token=$(ssh tpp-vps 'journalctl -u sms-crm-api -n 5 | grep "Magic link" | tail -1 | grep -o "token":\"[^\"]*\" | cut -d\" -f3')

if [ -z "$token" ]; then
    echo -e "  ${RED}❌ Could not extract token from logs${NC}"
    echo -e "  ${YELLOW}Manual step:${NC} Check logs: ssh tpp-vps 'journalctl -u sms-crm-api -n 10 | grep \"Magic link\"'"
    exit 1
fi

echo -e "  ${GREEN}✅ Token found:${NC} $token"

# Step 3: Verify token and get session
echo -e "\n${YELLOW}Step 3:${NC} Verifying token and creating session..."
response=$(curl -s -c cookies.txt "$API_BASE/auth/verify/$token")

echo "  Response: $response"

# Check if we got a session cookie
if grep -q "session" cookies.txt; then
    echo -e "  ${GREEN}✅ Session created successfully${NC}"
else
    echo -e "  ${RED}❌ Failed to create session${NC}"
    exit 1
fi

# Step 4: Test CSV import dry-run
echo -e "\n${YELLOW}Step 4:${NC} Testing CSV import dry-run..."
response=$(curl -s -b cookies.txt -X POST "$API_BASE/contacts/dry-run" \
  -F "file=@$CSV_FILE")

echo "  Response: $response"

if echo "$response" | grep -q "summary"; then
    echo -e "  ${GREEN}✅ CSV dry-run successful${NC}"
else
    echo -e "  ${RED}❌ CSV dry-run failed${NC}"
fi

# Step 5: Test CSV import commit
echo -e "\n${YELLOW}Step 5:${NC} Testing CSV import commit..."
response=$(curl -s -b cookies.txt -X POST "$API_BASE/contacts/commit" \
  -F "file=@$CSV_FILE")

echo "  Response: $response"

if echo "$response" | grep -q "batchId"; then
    echo -e "  ${GREEN}✅ CSV import commit successful${NC}"

    # Extract batch ID
    batch_id=$(echo "$response" | grep -o '"batchId":"[^"]*"' | cut -d'"' -f4)
    echo -e "  ${GREEN}✅ Batch ID:${NC} $batch_id"
else
    echo -e "  ${RED}❌ CSV import commit failed${NC}"
fi

# Clean up
rm -f cookies.txt

echo -e "\n${GREEN}✅ CSV import functionality test completed${NC}"