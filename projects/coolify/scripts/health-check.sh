#!/bin/bash
# Quick Health Check for Coolify MCP Server
#
# Usage: ./scripts/health-check.sh
# Cron:  */5 * * * * /home/avi/projects/coolify/scripts/health-check.sh

set -euo pipefail

# Configuration
COOLIFY_URL="${COOLIFY_BASE_URL:-https://coolify.theprofitplatform.com.au}"
MCP_SERVICE="coolify-mcp"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

# Send alert
send_alert() {
    local message="$1"
    echo "[$(date)] ALERT: $message"

    if [[ -n "$DISCORD_WEBHOOK" ]]; then
        curl -s -X POST "$DISCORD_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"🔴 **Health Check Failed**: $message\"}" \
            > /dev/null 2>&1 || true
    fi
}

# Check MCP service (Note: MCP servers are on-demand, not persistent daemons)
check_mcp_service() {
    # MCP servers run via stdio and exit after initialization
    # Check if the build exists and is executable instead
    local mcp_build="/home/avi/projects/coolify/coolify-mcp/build/index.js"
    if [[ -f "$mcp_build" ]]; then
        echo "[$(date)] MCP Server Build: OK"
        return 0
    else
        send_alert "MCP server build not found at $mcp_build"
        return 1
    fi
}

# Check Coolify API
check_coolify_api() {
    # Use /api/v1/version endpoint as healthcheck (healthcheck returns 404)
    local response=$(curl -s -w "%{http_code}" "${COOLIFY_URL}/api/v1/version" 2>/dev/null)
    local http_code="${response: -3}"

    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "401" ]]; then
        # 200 = OK, 401 = API is up but needs auth (still healthy)
        echo "[$(date)] Coolify API: OK (HTTP $http_code)"
        return 0
    else
        send_alert "Coolify API not responding at ${COOLIFY_URL} (HTTP $http_code)"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
    if [[ "$usage" -lt 90 ]]; then
        echo "[$(date)] Disk Space: OK (${usage}%)"
        return 0
    else
        send_alert "Disk space critical: ${usage}% used!"
        return 1
    fi
}

# Main
main() {
    local failures=0

    check_mcp_service || ((failures++))
    check_coolify_api || ((failures++))
    check_disk_space || ((failures++))

    if [[ $failures -eq 0 ]]; then
        echo "[$(date)] All health checks passed"
    else
        echo "[$(date)] Health check completed with $failures failure(s)"
    fi

    return $failures
}

main "$@"
