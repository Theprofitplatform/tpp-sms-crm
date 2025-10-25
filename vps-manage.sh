#!/bin/bash

# VPS Management Script - Control your SEO automations from anywhere
# Usage: ./vps-manage.sh [command]

VPS_HOST="tpp-vps"
VPS_PATH="~/projects/seo-expert"

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_NC='\033[0m' # No Color

print_header() {
    echo -e "${COLOR_BLUE}======================================${COLOR_NC}"
    echo -e "${COLOR_BLUE}$1${COLOR_NC}"
    echo -e "${COLOR_BLUE}======================================${COLOR_NC}"
    echo ""
}

print_success() {
    echo -e "${COLOR_GREEN}✓ $1${COLOR_NC}"
}

print_warning() {
    echo -e "${COLOR_YELLOW}⚠ $1${COLOR_NC}"
}

print_error() {
    echo -e "${COLOR_RED}✗ $1${COLOR_NC}"
}

print_info() {
    echo -e "${COLOR_BLUE}ℹ $1${COLOR_NC}"
}

# Command functions
cmd_status() {
    print_header "PM2 Process Status"
    ssh $VPS_HOST "cd $VPS_PATH && pm2 status"
}

cmd_logs() {
    print_header "Live Logs (Ctrl+C to exit)"
    ssh $VPS_HOST "cd $VPS_PATH && pm2 logs"
}

cmd_logs_audit() {
    print_header "SEO Audit Logs"
    ssh $VPS_HOST "cd $VPS_PATH && pm2 logs seo-audit-all --lines 50 --nostream"
}

cmd_logs_status() {
    print_header "Client Status Check Logs"
    ssh $VPS_HOST "cd $VPS_PATH && pm2 logs client-status-check --lines 50 --nostream"
}

cmd_logs_reports() {
    print_header "Report Generation Logs"
    ssh $VPS_HOST "cd $VPS_PATH && pm2 logs generate-reports --lines 50 --nostream"
}

cmd_restart() {
    print_header "Restarting All Automations"
    ssh $VPS_HOST "cd $VPS_PATH && pm2 restart all"
    print_success "All automations restarted"
}

cmd_stop() {
    print_header "Stopping All Automations"
    ssh $VPS_HOST "cd $VPS_PATH && pm2 stop all"
    print_warning "All automations stopped"
}

cmd_start() {
    print_header "Starting All Automations"
    ssh $VPS_HOST "cd $VPS_PATH && pm2 start ecosystem.config.cjs"
    print_success "All automations started"
}

cmd_test() {
    print_header "Testing Client Authentication"
    ssh $VPS_HOST "cd $VPS_PATH && node test-all-clients.js"
}

cmd_audit_now() {
    print_header "Running SEO Audit Now"
    ssh $VPS_HOST "cd $VPS_PATH && node audit-all-clients.js"
}

cmd_report_now() {
    print_header "Generating Reports Now"
    ssh $VPS_HOST "cd $VPS_PATH && node generate-full-report.js"
}

cmd_sync() {
    print_header "Syncing Local Changes to VPS"
    rsync -avz --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='coverage' \
        --exclude='test-results' \
        --exclude='*.tar.gz' \
        --exclude='*.zip' \
        . $VPS_HOST:$VPS_PATH/
    print_success "Files synced to VPS"
    print_info "Run './vps-manage.sh restart' to apply changes"
}

cmd_ssh() {
    print_header "Connecting to VPS"
    ssh $VPS_HOST "cd $VPS_PATH && bash"
}

cmd_edit_config() {
    print_header "Edit Client Configuration"
    ssh $VPS_HOST "cd $VPS_PATH && nano clients/instantautotraders.env"
}

cmd_download_logs() {
    print_header "Downloading Logs from VPS"
    mkdir -p logs/vps-logs
    ssh $VPS_HOST "cd $VPS_PATH && tar -czf /tmp/seo-logs.tar.gz logs/"
    scp $VPS_HOST:/tmp/seo-logs.tar.gz logs/vps-logs/
    cd logs/vps-logs && tar -xzf seo-logs.tar.gz
    print_success "Logs downloaded to logs/vps-logs/"
}

cmd_help() {
    cat << EOF
VPS Management Script - SEO Expert Automation

Usage: ./vps-manage.sh [command]

Commands:
  status              View PM2 process status
  logs                View live logs (all processes)
  logs-audit          View SEO audit logs
  logs-status         View client status logs
  logs-reports        View report generation logs

  restart             Restart all automations
  stop                Stop all automations
  start               Start all automations

  test                Test client authentication
  audit-now           Run SEO audit immediately
  report-now          Generate reports immediately

  sync                Sync local changes to VPS
  ssh                 SSH into VPS
  edit-config         Edit client configuration on VPS
  download-logs       Download logs from VPS to local

  help                Show this help message

Examples:
  ./vps-manage.sh status
  ./vps-manage.sh logs-audit
  ./vps-manage.sh restart
  ./vps-manage.sh sync

Cron Schedules:
  seo-audit-all:        Daily at 00:00 (midnight)
  client-status-check:  Every 6 hours
  generate-reports:     Daily at 01:00 AM

EOF
}

# Main script logic
case "$1" in
    status)
        cmd_status
        ;;
    logs)
        cmd_logs
        ;;
    logs-audit)
        cmd_logs_audit
        ;;
    logs-status)
        cmd_logs_status
        ;;
    logs-reports)
        cmd_logs_reports
        ;;
    restart)
        cmd_restart
        ;;
    stop)
        cmd_stop
        ;;
    start)
        cmd_start
        ;;
    test)
        cmd_test
        ;;
    audit-now)
        cmd_audit_now
        ;;
    report-now)
        cmd_report_now
        ;;
    sync)
        cmd_sync
        ;;
    ssh)
        cmd_ssh
        ;;
    edit-config)
        cmd_edit_config
        ;;
    download-logs)
        cmd_download_logs
        ;;
    help|--help|-h)
        cmd_help
        ;;
    "")
        print_error "No command specified"
        echo ""
        cmd_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        cmd_help
        exit 1
        ;;
esac
