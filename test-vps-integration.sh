#!/bin/bash

##############################################################################
# VPS Integration Test Script
# Tests all aspects of the TPP VPS integration
##############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

VPS="tpp-vps"
TESTS_PASSED=0
TESTS_FAILED=0

##############################################################################
# Test Functions
##############################################################################

print_test() {
    echo -e "\n${BLUE}Testing:${NC} $1"
}

pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

##############################################################################
# Tests
##############################################################################

test_ssh_connection() {
    print_test "SSH Connection to tpp-vps"
    if ssh "$VPS" 'echo "Connected"' &>/dev/null; then
        pass "Can connect to $VPS via SSH"
    else
        fail "Cannot connect to $VPS via SSH"
        return 1
    fi
}

test_vps_uptime() {
    print_test "VPS Uptime and Stability"
    local uptime_info=$(ssh "$VPS" 'uptime -p' 2>/dev/null)
    if [ $? -eq 0 ]; then
        pass "VPS uptime: $uptime_info"
    else
        fail "Could not get VPS uptime"
    fi
}

test_project_exists() {
    print_test "Project Directory Exists"
    if ssh "$VPS" 'test -d ~/projects/seo-expert' &>/dev/null; then
        pass "Project directory exists at ~/projects/seo-expert"
    else
        fail "Project directory not found"
    fi
}

test_dependencies() {
    print_test "Required Dependencies"

    # Node.js
    if ssh "$VPS" 'which node' &>/dev/null; then
        local node_ver=$(ssh "$VPS" 'node --version' 2>/dev/null)
        pass "Node.js installed: $node_ver"
    else
        fail "Node.js not found"
    fi

    # Docker
    if ssh "$VPS" 'which docker' &>/dev/null; then
        local docker_ver=$(ssh "$VPS" 'docker --version' 2>/dev/null | cut -d' ' -f3)
        pass "Docker installed: $docker_ver"
    else
        fail "Docker not found"
    fi

    # Docker Compose
    if ssh "$VPS" 'which docker-compose' &>/dev/null; then
        pass "Docker Compose installed"
    else
        fail "Docker Compose not found"
    fi
}

test_databases() {
    print_test "Database Services"

    # PostgreSQL
    if ssh "$VPS" 'pg_isready' &>/dev/null; then
        pass "PostgreSQL is running and accepting connections"
    else
        fail "PostgreSQL is not accessible"
    fi

    # Redis
    if ssh "$VPS" 'redis-cli ping' &>/dev/null; then
        pass "Redis is running and responding"
    else
        fail "Redis is not accessible"
    fi
}

test_existing_services() {
    print_test "Existing SEO Services"

    # SerpBear
    if ssh "$VPS" 'curl -sf http://localhost:3006/api/domains' &>/dev/null; then
        pass "SerpBear is running and accessible (port 3006)"
    else
        fail "SerpBear is not accessible"
    fi

    # SEO Analyst
    if ssh "$VPS" 'curl -sf http://localhost:5002/health' &>/dev/null; then
        pass "SEO Analyst is running and accessible (port 5002)"
    else
        fail "SEO Analyst is not accessible"
    fi
}

test_port_availability() {
    print_test "Port 3007 Availability"
    if ! ssh "$VPS" 'ss -tuln | grep -q :3007' &>/dev/null; then
        pass "Port 3007 is available for SEO Expert"
    else
        fail "Port 3007 is already in use"
    fi
}

test_nginx() {
    print_test "Nginx Configuration"
    if ssh "$VPS" 'systemctl is-active nginx' &>/dev/null; then
        pass "Nginx is running"
    else
        fail "Nginx is not running"
    fi
}

test_ssl_certificates() {
    print_test "SSL Certificates"
    if ssh "$VPS" 'sudo test -f /etc/letsencrypt/live/seo.theprofitplatform.com.au/fullchain.pem' &>/dev/null; then
        pass "SSL certificates are configured"
    else
        fail "SSL certificates not found"
    fi
}

test_system_resources() {
    print_test "System Resources"

    # Memory
    local mem_available=$(ssh "$VPS" 'free -g | grep Mem | awk "{print \$7}"' 2>/dev/null)
    if [ "$mem_available" -gt 5 ]; then
        pass "Sufficient memory available: ${mem_available}GB"
    else
        fail "Low memory: ${mem_available}GB available"
    fi

    # Disk Space
    local disk_free=$(ssh "$VPS" 'df -h / | tail -1 | awk "{print \$4}"' 2>/dev/null)
    pass "Disk space available: $disk_free"

    # CPU Load
    local load_avg=$(ssh "$VPS" 'uptime | awk -F"load average: " "{print \$2}" | cut -d"," -f1' 2>/dev/null)
    pass "CPU load average: $load_avg"
}

test_docker_containers() {
    print_test "Docker Containers"
    local container_count=$(ssh "$VPS" 'docker ps -q | wc -l' 2>/dev/null)
    if [ "$container_count" -gt 0 ]; then
        pass "$container_count Docker containers running"
    else
        fail "No Docker containers running"
    fi
}

test_monitoring() {
    print_test "Monitoring Stack"

    # Prometheus
    if ssh "$VPS" 'curl -sf http://localhost:9090/-/healthy' &>/dev/null; then
        pass "Prometheus is running (port 9090)"
    else
        fail "Prometheus is not accessible"
    fi

    # Grafana
    if ssh "$VPS" 'curl -sf http://localhost:3005/api/health' &>/dev/null; then
        pass "Grafana is running (port 3005)"
    else
        fail "Grafana is not accessible"
    fi
}

test_deployment_scripts() {
    print_test "Deployment Scripts"

    if [ -f "./deploy-to-tpp-vps.sh" ]; then
        pass "Main deployment script exists"
    else
        fail "Main deployment script not found"
    fi

    if [ -x "./deploy-to-tpp-vps.sh" ]; then
        pass "Deployment script is executable"
    else
        fail "Deployment script is not executable"
    fi

    if [ -f "./vps-helpers.sh" ]; then
        pass "Helper commands script exists"
    else
        fail "Helper commands script not found"
    fi
}

test_documentation() {
    print_test "Documentation Files"

    local docs=(
        "README-VPS-INTEGRATION.md"
        "START-VPS-DEPLOYMENT.md"
        "VPS-QUICK-DEPLOY.md"
        "VPS-REFERENCE-CARD.md"
        "VPS-STATUS-REPORT.md"
        "VPS-INTEGRATION-COMPLETE.md"
        "DEPLOYMENT-CHECKLIST.md"
    )

    for doc in "${docs[@]}"; do
        if [ -f "./$doc" ]; then
            pass "Documentation exists: $doc"
        else
            fail "Missing documentation: $doc"
        fi
    done
}

test_npm_scripts() {
    print_test "NPM Scripts for VPS"

    if grep -q "vps:deploy" package.json; then
        pass "npm run vps:deploy configured"
    else
        fail "vps:deploy script not found in package.json"
    fi

    if grep -q "vps:health" package.json; then
        pass "npm run vps:health configured"
    else
        fail "vps:health script not found in package.json"
    fi
}

test_git_status() {
    print_test "Git Repository Status"

    if [ -d ".git" ]; then
        pass "Git repository initialized"

        local branch=$(git branch --show-current 2>/dev/null)
        pass "Current branch: $branch"

        # Check for uncommitted changes
        if [ -n "$(git status -s)" ]; then
            fail "Uncommitted changes present (should commit before deployment)"
        else
            pass "Working tree is clean"
        fi
    else
        fail "Not a git repository"
    fi
}

##############################################################################
# Run All Tests
##############################################################################

main() {
    echo "══════════════════════════════════════════════════════════════"
    echo "  🧪 TPP VPS Integration Test Suite"
    echo "══════════════════════════════════════════════════════════════"
    echo ""

    # Run all tests
    test_ssh_connection
    test_vps_uptime
    test_project_exists
    test_dependencies
    test_databases
    test_existing_services
    test_port_availability
    test_nginx
    test_ssl_certificates
    test_system_resources
    test_docker_containers
    test_monitoring
    test_deployment_scripts
    test_documentation
    test_npm_scripts
    test_git_status

    # Summary
    echo ""
    echo "══════════════════════════════════════════════════════════════"
    echo "  📊 Test Results"
    echo "══════════════════════════════════════════════════════════════"
    echo ""
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed! Ready for deployment!${NC}"
        echo ""
        echo "Deploy with:"
        echo "  ./deploy-to-tpp-vps.sh"
        echo ""
        return 0
    else
        echo -e "${RED}❌ Some tests failed. Review issues before deployment.${NC}"
        echo ""
        return 1
    fi
}

# Run tests
main "$@"
