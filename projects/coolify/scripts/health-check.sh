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

# Check MCP service
check_mcp_service() {
    if systemctl is-active --quiet "$MCP_SERVICE" 2>/dev/null; then
        echo "[$(date)] MCP Service: OK"
        return 0
    else
        send_alert "MCP service is not running!"
        return 1
    fi
}

# Check Coolify API
check_coolify_api() {
    if curl -s -f "${COOLIFY_URL}/api/v1/healthcheck" > /dev/null 2>&1; then
        echo "[$(date)] Coolify API: OK"
        return 0
    else
        send_alert "Coolify API not responding at ${COOLIFY_URL}"
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
