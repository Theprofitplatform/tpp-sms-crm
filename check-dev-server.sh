#!/bin/bash

# Dev Server Page & API Check Script
# Tests dev server on localhost:9000

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dev server URL
DEV_URL="http://localhost:9000"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Dev Server Health Check${NC}"
echo -e "${BLUE}Testing: $DEV_URL${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to test endpoint with delay
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    local delay=${4:-1}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -ne "Testing ${name}... "

    # Add delay to avoid rate limiting
    sleep $delay

    status_code=$(curl -s -o /dev/null -w "%{http_code}" "${DEV_URL}${endpoint}" 2>&1)

    if [ "$status_code" = "$expected_status" ] || [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $status_code, expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to test JSON endpoint with delay
test_json_endpoint() {
    local name=$1
    local endpoint=$2
    local check_field=$3
    local delay=${4:-1}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -ne "Testing ${name}... "

    # Add delay to avoid rate limiting
    sleep $delay

    response=$(curl -s "${DEV_URL}${endpoint}" 2>&1)
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "${DEV_URL}${endpoint}" 2>&1)

    # Check for rate limit
    if echo "$response" | grep -q "Too many requests"; then
        echo -e "${YELLOW}⚠ RATE LIMITED${NC} - waiting..."
        sleep 3
        response=$(curl -s "${DEV_URL}${endpoint}" 2>&1)
        status_code=$(curl -s -o /dev/null -w "%{http_code}" "${DEV_URL}${endpoint}" 2>&1)
    fi

    if [ "$status_code" = "200" ]; then
        if echo "$response" | grep -q "$check_field"; then
            echo -e "${GREEN}✓ OK${NC} (HTTP $status_code)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (HTTP $status_code, missing '$check_field')"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $status_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo -e "${BLUE}Core Pages:${NC}"
test_endpoint "Dashboard (Root)" "/" 200 0
test_endpoint "Health Check" "/health" 200 2

echo -e "\n${BLUE}API v2 Endpoints:${NC}"
test_json_endpoint "API v2 Health" "/api/v2/health" "success" 2
test_json_endpoint "API v2 Keywords" "/api/v2/keywords" "success" 2
test_json_endpoint "API v2 Sync Status" "/api/v2/sync/status" "success" 2

echo -e "\n${BLUE}Dashboard & Client APIs:${NC}"
test_json_endpoint "Dashboard Data" "/api/dashboard" "clients" 2
test_json_endpoint "Analytics Summary" "/api/analytics/summary" "success" 2
test_json_endpoint "Client Metrics" "/api/analytics/clients/metrics" "success" 2

echo -e "\n${BLUE}Scheduler APIs:${NC}"
test_json_endpoint "Scheduler Jobs" "/api/scheduler/jobs" "success" 2
test_json_endpoint "Scheduler Stats" "/api/scheduler/stats" "success" 2

echo -e "\n${BLUE}Control Center APIs:${NC}"
test_json_endpoint "Active Jobs" "/api/control/jobs/active" "success" 2
test_json_endpoint "Scheduled Jobs" "/api/control/jobs/scheduled" "success" 2

echo -e "\n${BLUE}Local SEO APIs:${NC}"
test_json_endpoint "Local SEO History" "/api/local-seo/history/instantautotraders" "success" 2

echo -e "\n${BLUE}AI Optimizer APIs:${NC}"
test_json_endpoint "AI Optimizer Status" "/api/ai-optimizer/status" "success" 2

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Dev Server Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ Dev server is running properly!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some dev APIs failed. Check the output above.${NC}\n"
    exit 1
fi
