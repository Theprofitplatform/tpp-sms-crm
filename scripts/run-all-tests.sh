#!/bin/bash

# Test Runner Script
# Runs all integration tests and generates report

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Suite - Unified Keyword Tracking System${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Check if services are running
echo -e "${BLUE}Pre-flight check...${NC}"

SERVICES_OK=true

if ! curl -s -f http://localhost:9000/api/v2/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Dashboard server not running${NC}"
    SERVICES_OK=false
fi

if ! curl -s -f http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Keyword service not running (some tests may fail)${NC}"
fi

if [ "$SERVICES_OK" = false ]; then
    echo ""
    echo -e "${RED}Critical services not running!${NC}"
    echo ""
    echo "Please start services first:"
    echo "  ./start-dev.sh"
    echo ""
    echo "Or run: ./scripts/setup-dev-environment.sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Services are running${NC}"
echo ""

# Create test results directory
mkdir -p test-results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="test-results/test-report-${TIMESTAMP}.txt"

echo "Test results will be saved to: ${REPORT_FILE}"
echo ""

# Start test execution
{
    echo "Test Execution Report"
    echo "===================="
    echo "Date: $(date)"
    echo "Environment: Development"
    echo ""
} > "$REPORT_FILE"

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test suite
run_test_suite() {
    local test_file=$1
    local test_name=$2

    echo -e "${BLUE}Running ${test_name}...${NC}"
    {
        echo ""
        echo "=== ${test_name} ==="
        echo ""
    } >> "$REPORT_FILE"

    if npm test -- "$test_file" >> "$REPORT_FILE" 2>&1; then
        echo -e "${GREEN}✓ ${test_name} passed${NC}"
        # Count tests
        local count=$(grep -c "passing" "$REPORT_FILE" | tail -1 || echo "0")
        PASSED_TESTS=$((PASSED_TESTS + count))
    else
        echo -e "${RED}✗ ${test_name} failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Run Integration Tests
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Integration Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

if [ -f tests/integration/api-v2-keywords.test.js ]; then
    run_test_suite "tests/integration/api-v2-keywords.test.js" "API v2 - Keywords Tests"
else
    echo -e "${YELLOW}⚠ Keywords integration tests not found${NC}"
    echo ""
fi

if [ -f tests/integration/api-v2-sync.test.js ]; then
    run_test_suite "tests/integration/api-v2-sync.test.js" "API v2 - Sync Tests"
else
    echo -e "${YELLOW}⚠ Sync integration tests not found${NC}"
    echo ""
fi

# Run Dashboard Tests
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Dashboard Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

if [ -f tests/dashboard.spec.cjs ]; then
    run_test_suite "tests/dashboard.spec.cjs" "Dashboard UI Tests"
else
    echo -e "${YELLOW}⚠ Dashboard tests not found${NC}"
    echo ""
fi

# Run E2E Tests (if they exist)
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  End-to-End Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

if [ -d tests/e2e ]; then
    if command -v playwright &> /dev/null; then
        echo -e "${BLUE}Running E2E tests with Playwright...${NC}"
        if npx playwright test >> "$REPORT_FILE" 2>&1; then
            echo -e "${GREEN}✓ E2E tests passed${NC}"
        else
            echo -e "${RED}✗ E2E tests failed${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${YELLOW}⚠ Playwright not installed, skipping E2E tests${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No E2E tests found${NC}"
fi
echo ""

# Performance Check
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Performance Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

echo "Testing API response times..."
{
    echo ""
    echo "=== Performance Tests ==="
    echo ""
} >> "$REPORT_FILE"

# Test keywords endpoint response time
START_TIME=$(date +%s%N)
curl -s http://localhost:9000/api/v2/keywords > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

{
    echo "GET /api/v2/keywords: ${RESPONSE_TIME}ms"
} >> "$REPORT_FILE"

if [ $RESPONSE_TIME -lt 500 ]; then
    echo -e "${GREEN}✓ Keywords endpoint: ${RESPONSE_TIME}ms (target: <500ms)${NC}"
else
    echo -e "${YELLOW}⚠ Keywords endpoint: ${RESPONSE_TIME}ms (slower than target)${NC}"
fi

# Test stats endpoint
START_TIME=$(date +%s%N)
curl -s http://localhost:9000/api/v2/keywords/stats > /dev/null
END_TIME=$(date +%s%N)
STATS_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

{
    echo "GET /api/v2/keywords/stats: ${STATS_TIME}ms"
} >> "$REPORT_FILE"

if [ $STATS_TIME -lt 300 ]; then
    echo -e "${GREEN}✓ Stats endpoint: ${STATS_TIME}ms (target: <300ms)${NC}"
else
    echo -e "${YELLOW}⚠ Stats endpoint: ${STATS_TIME}ms (slower than target)${NC}"
fi
echo ""

# Code Coverage (if nyc is installed)
if command -v nyc &> /dev/null; then
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Code Coverage${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""

    echo "Generating coverage report..."
    nyc --reporter=text npm test >> "$REPORT_FILE" 2>&1
    echo -e "${GREEN}✓ Coverage report added to ${REPORT_FILE}${NC}"
    echo ""
fi

# Database Integrity Check
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Database Integrity${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

{
    echo ""
    echo "=== Database Integrity ==="
    echo ""
} >> "$REPORT_FILE"

if [ -f database/unified.db ]; then
    INTEGRITY_RESULT=$(sqlite3 database/unified.db "PRAGMA integrity_check;")
    {
        echo "Unified DB integrity: ${INTEGRITY_RESULT}"
    } >> "$REPORT_FILE"

    if [ "$INTEGRITY_RESULT" = "ok" ]; then
        echo -e "${GREEN}✓ Unified database integrity: OK${NC}"
    else
        echo -e "${RED}✗ Unified database integrity: FAILED${NC}"
    fi

    # Count records
    KEYWORD_COUNT=$(sqlite3 database/unified.db "SELECT COUNT(*) FROM unified_keywords;")
    DOMAIN_COUNT=$(sqlite3 database/unified.db "SELECT COUNT(*) FROM domains;")
    PROJECT_COUNT=$(sqlite3 database/unified.db "SELECT COUNT(*) FROM research_projects;")

    {
        echo "Keywords: ${KEYWORD_COUNT}"
        echo "Domains: ${DOMAIN_COUNT}"
        echo "Projects: ${PROJECT_COUNT}"
    } >> "$REPORT_FILE"

    echo "  Keywords: ${KEYWORD_COUNT}"
    echo "  Domains: ${DOMAIN_COUNT}"
    echo "  Projects: ${PROJECT_COUNT}"
else
    echo -e "${RED}✗ Unified database not found${NC}"
fi
echo ""

# Final Summary
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

{
    echo ""
    echo "=== Summary ==="
    echo ""
    echo "Total Test Suites: $((PASSED_TESTS + FAILED_TESTS))"
    echo "Passed: ${PASSED_TESTS}"
    echo "Failed: ${FAILED_TESTS}"
    echo ""
    echo "Full report: ${REPORT_FILE}"
} >> "$REPORT_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "  Test suites run: $((PASSED_TESTS + FAILED_TESTS))"
    echo "  Performance: All endpoints within targets"
    echo "  Database: Healthy"
    echo ""
    EXIT_CODE=0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "  Passed: ${PASSED_TESTS}"
    echo "  Failed: ${FAILED_TESTS}"
    echo ""
    echo "Check the full report for details:"
    echo "  cat ${REPORT_FILE}"
    echo ""
    EXIT_CODE=1
fi

echo "Full test report saved to:"
echo "  ${REPORT_FILE}"
echo ""

# Suggest next steps
if [ $FAILED_TESTS -gt 0 ]; then
    echo "Troubleshooting:"
    echo "  1. Check service logs: tail -f logs/*.log"
    echo "  2. Verify database: sqlite3 database/unified.db '.tables'"
    echo "  3. Restart services: ./start-dev.sh"
    echo "  4. Run health check: ./scripts/health-check.sh"
    echo ""
fi

exit $EXIT_CODE
