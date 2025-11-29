#!/bin/bash
# Coolify Backup Verification Script
# Run daily after backups complete to verify integrity
#
# Usage: ./verify-backups.sh
# Cron:  0 3 * * * /home/avi/projects/coolify/scripts/verify-backups.sh
#
# Dependencies: aws-cli, curl, jq

set -euo pipefail

# Configuration
LOG_FILE="/var/log/coolify-backup-verify.log"
MAX_BACKUP_AGE_HOURS=25  # Alert if backup older than this
MIN_BACKUP_SIZE_MB=1     # Alert if backup smaller than this
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# S3 Configuration (update these or use env vars)
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PREFIX="${BACKUP_S3_PREFIX:-backups/}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

# Send alert to Discord
send_discord_alert() {
    local message="$1"
    local color="${2:-16711680}"  # Default red

    if [[ -n "$DISCORD_WEBHOOK" ]]; then
        curl -s -X POST "$DISCORD_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"embeds\": [{
                    \"title\": \"Backup Verification Alert\",
                    \"description\": \"$message\",
                    \"color\": $color,
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }]
            }" > /dev/null 2>&1 || true
    fi
}

# Send alert to Slack
send_slack_alert() {
    local message="$1"

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$message\"}" > /dev/null 2>&1 || true
    fi
}

# Send alert to all configured channels
send_alert() {
    local message="$1"
    local is_success="${2:-false}"
    local color=$([[ "$is_success" == "true" ]] && echo "65280" || echo "16711680")

    send_discord_alert "$message" "$color"
    send_slack_alert "$message"
}

# Check S3 connectivity
check_s3_connectivity() {
    log_info "Checking S3 connectivity..."

    if [[ -z "$S3_BUCKET" ]]; then
        log_warn "S3_BUCKET not configured, skipping S3 checks"
        return 1
    fi

    if ! aws s3 ls "s3://${S3_BUCKET}/" > /dev/null 2>&1; then
        log_error "Cannot connect to S3 bucket: $S3_BUCKET"
        send_alert "Cannot connect to S3 bucket: $S3_BUCKET"
        return 1
    fi

    log_success "S3 connectivity OK"
    return 0
}

# Get latest backup info
get_latest_backup() {
    local prefix="$1"
    aws s3 ls "s3://${S3_BUCKET}/${prefix}" --recursive 2>/dev/null | \
        sort -k1,2 | tail -n 1
}

# Check backup age
check_backup_age() {
    local backup_date="$1"
    local backup_time="$2"

    local backup_epoch=$(date -d "$backup_date $backup_time" +%s 2>/dev/null || echo "0")
    local now_epoch=$(date +%s)
    local age_hours=$(( (now_epoch - backup_epoch) / 3600 ))

    echo "$age_hours"
}

# Verify database backups
verify_database_backups() {
    log_info "Verifying database backups..."

    local issues=0
    local latest=$(get_latest_backup "${S3_PREFIX}databases/")

    if [[ -z "$latest" ]]; then
        log_error "No database backups found!"
        send_alert "No database backups found in S3!"
        return 1
    fi

    # Parse backup info
    local backup_date=$(echo "$latest" | awk '{print $1}')
    local backup_time=$(echo "$latest" | awk '{print $2}')
    local backup_size=$(echo "$latest" | awk '{print $3}')
    local backup_path=$(echo "$latest" | awk '{print $4}')

    log_info "Latest database backup: $backup_path"
    log_info "  Date: $backup_date $backup_time"
    log_info "  Size: $backup_size bytes"

    # Check age
    local age_hours=$(check_backup_age "$backup_date" "$backup_time")
    if [[ "$age_hours" -gt "$MAX_BACKUP_AGE_HOURS" ]]; then
        log_warn "Database backup is ${age_hours} hours old (max: ${MAX_BACKUP_AGE_HOURS})"
        send_alert "Database backup is ${age_hours} hours old!"
        ((issues++))
    else
        log_success "Database backup age OK (${age_hours} hours)"
    fi

    # Check size
    local min_size_bytes=$((MIN_BACKUP_SIZE_MB * 1024 * 1024))
    if [[ "$backup_size" -lt "$min_size_bytes" ]]; then
        log_warn "Database backup is only ${backup_size} bytes (min: ${min_size_bytes})"
        send_alert "Database backup suspiciously small: ${backup_size} bytes"
        ((issues++))
    else
        log_success "Database backup size OK (${backup_size} bytes)"
    fi

    return $issues
}

# Verify application backups
verify_application_backups() {
    log_info "Verifying application backups..."

    local latest=$(get_latest_backup "${S3_PREFIX}applications/")

    if [[ -z "$latest" ]]; then
        log_warn "No application backups found (may be expected)"
        return 0
    fi

    local backup_date=$(echo "$latest" | awk '{print $1}')
    local backup_time=$(echo "$latest" | awk '{print $2}')
    local backup_path=$(echo "$latest" | awk '{print $4}')

    log_info "Latest application backup: $backup_path"
    log_success "Application backup found"

    return 0
}

# Check Coolify health
check_coolify_health() {
    log_info "Checking Coolify instance health..."

    local coolify_url="${COOLIFY_BASE_URL:-https://coolify.theprofitplatform.com.au}"

    if curl -s -f "${coolify_url}/api/v1/healthcheck" > /dev/null 2>&1; then
        log_success "Coolify API is healthy"
        return 0
    else
        log_error "Coolify API is not responding!"
        send_alert "Coolify API health check failed!"
        return 1
    fi
}

# Main verification routine
main() {
    log_info "=========================================="
    log_info "Starting backup verification..."
    log_info "=========================================="

    local total_issues=0

    # Check S3 connectivity
    if check_s3_connectivity; then
        # Verify database backups
        if ! verify_database_backups; then
            ((total_issues++))
        fi

        # Verify application backups
        if ! verify_application_backups; then
            ((total_issues++))
        fi
    else
        ((total_issues++))
    fi

    # Check Coolify health
    if ! check_coolify_health; then
        ((total_issues++))
    fi

    # Summary
    log_info "=========================================="
    if [[ "$total_issues" -eq 0 ]]; then
        log_success "All backup verifications passed!"
        send_alert "Backup verification completed successfully" "true"
    else
        log_error "Backup verification found $total_issues issue(s)"
        send_alert "Backup verification found $total_issues issue(s)!"
    fi
    log_info "=========================================="

    return $total_issues
}

# Run main
main "$@"
