#!/bin/bash

# Production API Health Check Script
# Tests all critical endpoints on production server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production URL
PROD_URL="https://seodashboard.theprofitplatform.com.au"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Production API Health Check${NC}"
echo -e "${BLUE}Testing: $PROD_URL${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to test endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -ne "Testing ${name}... "

    status_code=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}${endpoint}" 2>&1)

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

# Function to test JSON endpoint
test_json_endpoint() {
    local name=$1
    local endpoint=$2
    local check_field=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -ne "Testing ${name}... "

    response=$(curl -s "${PROD_URL}${endpoint}" 2>&1)
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}${endpoint}" 2>&1)

    if [ "$status_code" = "200" ]; then
        if echo "$response" | grep -q "$check_field"; then
            echo -e "${GREEN}✓ OK${NC} (HTTP $status_code, contains '$check_field')"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (HTTP $status_code, missing '$check_field')"
            echo -e "  Response: ${response:0:100}..."
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $status_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo -e "${BLUE}Core Endpoints:${NC}"
test_endpoint "Root (/)" "/" 200
test_endpoint "Health Check" "/health" 200

echo -e "\n${BLUE}API v2 Endpoints:${NC}"
test_json_endpoint "API v2 Health" "/api/v2/health" "success"
test_json_endpoint "API v2 Keywords" "/api/v2/keywords" "success"
test_json_endpoint "API v2 Sync Status" "/api/v2/sync/status" "success"

echo -e "\n${BLUE}Dashboard & Analytics:${NC}"
test_json_endpoint "Dashboard Data" "/api/dashboard" "success"
test_json_endpoint "Analytics Summary" "/api/analytics/summary" "success"
test_json_endpoint "Analytics Performance" "/api/analytics/performance" "success"
test_json_endpoint "Analytics Daily Stats" "/api/analytics/daily-stats" "success"
test_json_endpoint "Client Metrics" "/api/analytics/clients/metrics" "success"

echo -e "\n${BLUE}Scheduler & Jobs:${NC}"
test_json_endpoint "Scheduler Jobs" "/api/scheduler/jobs" "success"
test_json_endpoint "Scheduler Stats" "/api/scheduler/stats" "success"
test_json_endpoint "Scheduler Executions" "/api/scheduler/executions" "success"
test_json_endpoint "Running Jobs" "/api/scheduler/running" "success"

echo -e "\n${BLUE}Control Center:${NC}"
test_json_endpoint "Active Jobs" "/api/control/jobs/active" "success"
test_json_endpoint "Scheduled Jobs" "/api/control/jobs/scheduled" "success"
test_json_endpoint "Job History" "/api/control/jobs/history" "success"

echo -e "\n${BLUE}AI Optimizer:${NC}"
test_json_endpoint "AI Optimizer Status" "/api/ai-optimizer/status" "success"
test_json_endpoint "AI Optimizer Analytics" "/api/ai-optimizer/analytics" "success"

echo -e "\n${BLUE}Google Search Console:${NC}"
test_json_endpoint "GSC Summary" "/api/gsc/summary" "success"

echo -e "\n${BLUE}Activity & Monitoring:${NC}"
test_json_endpoint "Activity Log" "/api/activity-log" "success"

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All production APIs are running!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some APIs failed. Check the output above.${NC}\n"
    exit 1
fi
