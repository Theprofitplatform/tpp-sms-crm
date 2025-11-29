#!/bin/bash
# Coolify MCP Server - Pre-Deployment Checklist
# Run this script before any deployment to verify readiness
#
# Usage: ./scripts/pre-deploy-check.sh
# Exit codes:
#   0 - All checks passed, safe to deploy
#   1 - Critical issues found, do not deploy
#   2 - Warnings found, deploy with caution

set -euo pipefail

# Configuration
PROJECT_DIR="/home/avi/projects/coolify/coolify-mcp"
REQUIRED_NODE_VERSION="18"
REQUIRED_COVERAGE=70

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""
}

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "  ${BLUE}ℹ${NC} $1"
}

# Navigate to project directory
cd "$PROJECT_DIR"

print_header "Pre-Deployment Checklist"
echo "Project: $PROJECT_DIR"
echo "Time: $(date)"
echo ""

# ═══════════════════════════════════════════
# SECTION 1: Environment Checks
# ═══════════════════════════════════════════
print_header "1. Environment Checks"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "$NODE_VERSION" -ge "$REQUIRED_NODE_VERSION" ]]; then
    check_pass "Node.js version: $(node -v)"
else
    check_fail "Node.js version $(node -v) is below required v${REQUIRED_NODE_VERSION}"
fi

# Check npm version
if command -v npm &> /dev/null; then
    check_pass "npm version: $(npm -v)"
else
    check_fail "npm not found"
fi

# Check .env file exists
if [[ -f ".env" ]]; then
    check_pass ".env file exists"

    # Check required variables
    if grep -q "COOLIFY_BASE_URL=" .env && grep -q "COOLIFY_TOKEN=" .env; then
        check_pass "Required environment variables present"
    else
        check_fail "Missing required environment variables (COOLIFY_BASE_URL or COOLIFY_TOKEN)"
    fi
else
    check_fail ".env file not found"
fi

# Check for secrets in code
if grep -r "COOLIFY_TOKEN=" src/ 2>/dev/null | grep -v ".env"; then
    check_fail "Hardcoded secrets found in source code!"
else
    check_pass "No hardcoded secrets in source code"
fi

# ═══════════════════════════════════════════
# SECTION 2: Code Quality Checks
# ═══════════════════════════════════════════
print_header "2. Code Quality Checks"

# Lint check
echo "  Running ESLint..."
if npm run lint --silent 2>/dev/null; then
    check_pass "ESLint: No issues"
else
    check_warn "ESLint: Issues found (run 'npm run lint' for details)"
fi

# Format check
echo "  Checking code formatting..."
if npm run format -- --check --silent 2>/dev/null; then
    check_pass "Prettier: Code is formatted"
else
    check_warn "Prettier: Formatting issues (run 'npm run format' to fix)"
fi

# TypeScript compilation
echo "  Compiling TypeScript..."
if npm run build --silent 2>/dev/null; then
    check_pass "TypeScript: Compilation successful"
else
    check_fail "TypeScript: Compilation failed"
fi

# ═══════════════════════════════════════════
# SECTION 3: Test Suite
# ═══════════════════════════════════════════
print_header "3. Test Suite"

# Run unit tests
echo "  Running unit tests..."
if npm run test:unit --silent 2>/dev/null; then
    check_pass "Unit tests: Passed"
else
    check_fail "Unit tests: Failed"
fi

# Check test coverage (if available)
if [[ -f "coverage/coverage-summary.json" ]]; then
    COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*' | head -1)
    check_info "Coverage report available"
else
    check_warn "No coverage report found (run 'npm run test:coverage')"
fi

# ═══════════════════════════════════════════
# SECTION 4: Security Checks
# ═══════════════════════════════════════════
print_header "4. Security Checks"

# npm audit
echo "  Running npm audit..."
AUDIT_RESULT=$(npm audit --json 2>/dev/null || echo '{"vulnerabilities":{}}')
CRITICAL=$(echo "$AUDIT_RESULT" | grep -o '"critical":[0-9]*' | cut -d':' -f2 || echo "0")
HIGH=$(echo "$AUDIT_RESULT" | grep -o '"high":[0-9]*' | cut -d':' -f2 || echo "0")

if [[ "$CRITICAL" -gt 0 ]]; then
    check_fail "npm audit: $CRITICAL critical vulnerabilities"
elif [[ "$HIGH" -gt 0 ]]; then
    check_warn "npm audit: $HIGH high vulnerabilities"
else
    check_pass "npm audit: No critical/high vulnerabilities"
fi

# Check for .env in git
if git ls-files --error-unmatch .env 2>/dev/null; then
    check_fail ".env file is tracked by git!"
else
    check_pass ".env is not tracked by git"
fi

# Check systemd service for secrets
if [[ -f "/etc/systemd/system/coolify-mcp.service" ]]; then
    if grep -qi "COOLIFY_TOKEN=" /etc/systemd/system/coolify-mcp.service 2>/dev/null; then
        check_fail "API token exposed in systemd service file!"
    else
        check_pass "No secrets in systemd service file"
    fi
fi

# ═══════════════════════════════════════════
# SECTION 5: Build Artifacts
# ═══════════════════════════════════════════
print_header "5. Build Artifacts"

# Check build directory
if [[ -d "build" ]]; then
    BUILD_FILES=$(find build -name "*.js" | wc -l)
    check_pass "Build directory exists ($BUILD_FILES JS files)"
else
    check_fail "Build directory not found"
fi

# Check package.json version
VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
check_info "Package version: $VERSION"

# Check git status
GIT_STATUS=$(git status --porcelain)
if [[ -z "$GIT_STATUS" ]]; then
    check_pass "Git: Working directory clean"
else
    CHANGES=$(echo "$GIT_STATUS" | wc -l)
    check_warn "Git: $CHANGES uncommitted changes"
fi

# Current branch
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" == "main" ]] || [[ "$BRANCH" == "master" ]]; then
    check_pass "Git branch: $BRANCH"
else
    check_warn "Git branch: $BRANCH (not main/master)"
fi

# ═══════════════════════════════════════════
# SECTION 6: External Connectivity
# ═══════════════════════════════════════════
print_header "6. External Connectivity"

# Load environment
source .env 2>/dev/null || true

# Check Coolify API
if [[ -n "${COOLIFY_BASE_URL:-}" ]]; then
    echo "  Testing Coolify API..."
    if curl -s -f "${COOLIFY_BASE_URL}/api/v1/healthcheck" > /dev/null 2>&1; then
        check_pass "Coolify API: Reachable"
    else
        check_warn "Coolify API: Not reachable (may be network issue)"
    fi
else
    check_warn "COOLIFY_BASE_URL not set, skipping API check"
fi

# ═══════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════
print_header "Summary"

echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}═══════════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ DEPLOYMENT BLOCKED - Fix $FAILED issue(s)${NC}"
    echo -e "${RED}═══════════════════════════════════════════${NC}"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  ⚠ PROCEED WITH CAUTION - $WARNINGS warning(s)${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    exit 2
else
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ ALL CHECKS PASSED - Safe to deploy!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    exit 0
fi
