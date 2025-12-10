# Security Remediation - Quick Start Guide

**Date:** 2025-12-10
**Status:** 3 CRITICAL + 2 HIGH issues found
**Remediation Script:** `/home/avi/scripts/security-remediate-20251210.sh`

---

## IMMEDIATE ACTION REQUIRED - DO NOT DELAY

You have critical security issues that must be fixed:

### CRITICAL Issue #1: PostgreSQL Down
```
Error: Invalid data directory permissions
Impact: Database completely non-functional
Fix Time: 2 minutes
```

### CRITICAL Issue #2: Root SSH Login Enabled
```
Risk: Direct root compromise via password guessing
Impact: Highest privilege account exposed
Fix Time: 5 minutes
```

### HIGH Issue #3: Exposed Auth Credentials
```
Files: /etc/nginx/.htpasswd*
Risk: Basic auth passwords world-readable
Fix Time: 1 minute
```

---

## Quick Fix - Copy & Paste Commands

### Option 1: Automated Remediation (RECOMMENDED)

Run the complete automated remediation script:

```bash
sudo bash /home/avi/scripts/security-remediate-20251210.sh
```

**This script will:**
- Fix PostgreSQL data directory permissions
- Disable SSH root login and password authentication
- Secure .htpasswd file permissions
- Disable CUPS service
- Install and configure Fail2Ban
- Set up audit logging
- Fix SSH key file permissions
- Verify all changes

**Duration:** ~3-5 minutes
**Impact:** Requires SSH key authentication after completion

---

### Option 2: Manual Fixes (If script fails)

#### Step 1: Fix PostgreSQL (CRITICAL - 2 minutes)
```bash
sudo chmod 0700 /var/lib/postgresql/16/main
sudo chown postgres:postgres /var/lib/postgresql/16/main
sudo systemctl restart postgresql@16-main
```

**Verify:**
```bash
sudo systemctl is-active postgresql@16-main
```

---

#### Step 2: Harden SSH (CRITICAL - 5 minutes)
```bash
# Backup first
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d)

# Apply hardening
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^X11Forwarding yes/X11Forwarding no/' /etc/ssh/sshd_config

# Validate and restart
sudo sshd -t
sudo systemctl restart ssh
```

**Verify:**
```bash
sudo sshd -T | grep -E "PermitRootLogin|PasswordAuthentication"
```

---

#### Step 3: Fix .htpasswd Permissions (HIGH - 1 minute)
```bash
sudo chmod 0600 /etc/nginx/.htpasswd
sudo chmod 0600 /etc/nginx/.htpasswd-supabase
sudo chmod 0600 /etc/nginx/.htpasswd.backup
sudo chown root:root /etc/nginx/.htpasswd*

# Verify
sudo ls -la /etc/nginx/.htpasswd*
```

---

#### Step 4: Disable CUPS (HIGH - 1 minute)
```bash
sudo systemctl disable cups
sudo systemctl stop cups
sudo ufw delete allow 631
```

**Verify:**
```bash
sudo systemctl is-active cups
```

---

### Option 3: Individual Remediations (Manual)

See the detailed security audit report for complete information on each issue:
`/home/avi/docs/audit-reports/security-audit-20251210.md`

---

## IMPORTANT WARNINGS

### SSH Changes
**WARNING:** After applying SSH fixes, you will NO LONGER be able to login with passwords or as root.

**You MUST have:**
1. Valid SSH key in `/home/avi/.ssh/id_rsa`
2. Public key in `/home/avi/.ssh/authorized_keys`

**Test SSH key works BEFORE applying changes:**
```bash
ssh -i ~/.ssh/id_rsa -T git@github.com  # Test if you have GitHub
# OR
ssh -v localhost  # Test local connection
```

---

## Rollback Procedures

If something breaks during remediation:

### Rollback SSH Changes
```bash
# If backup exists
sudo cp /etc/ssh/sshd_config.backup.YYYYMMDD /etc/ssh/sshd_config
sudo sshd -t
sudo systemctl restart ssh
```

### Rollback APT Changes
```bash
sudo cp /etc/apt/sources.list.d/ubuntu-mirrors.list.backup.pre-audit \
        /etc/apt/sources.list.d/ubuntu-mirrors.list
sudo apt update
```

---

## Post-Remediation Checklist

After running the remediation script:

- [ ] SSH access still works with key authentication
- [ ] PostgreSQL service is running: `sudo systemctl is-active postgresql@16-main`
- [ ] Fail2Ban is running: `sudo systemctl is-active fail2ban`
- [ ] auditd is running: `sudo systemctl is-active auditd`
- [ ] CUPS is stopped: `sudo systemctl is-active cups` (should show "inactive")
- [ ] No password SSH access: `ssh -o PasswordAuthentication=yes localhost` (should fail)

---

## Monitoring After Remediation

### Check Fail2Ban
```bash
sudo fail2ban-client status sshd
# Shows banned IPs from failed attempts
```

### Check Audit Logs
```bash
sudo ausearch -k sudo_calls | tail -10
# Shows all sudo usage
```

### Check SSH Access Log
```bash
sudo tail -20 /var/log/auth.log
# Shows all SSH authentication attempts
```

---

## Support & Documentation

**Full Audit Report:**
`/home/avi/docs/audit-reports/security-audit-20251210.md`

**Remediation Script:**
`/home/avi/scripts/security-remediate-20251210.sh`

**Remediation Log:**
`/var/log/security-remediate-*.log` (created when script runs)

---

## Next Steps (Within 7 Days)

1. Review the full security audit report
2. Address MEDIUM severity findings
3. Set up automated security scanning
4. Implement CIS Benchmark compliance
5. Schedule next audit for 2025-12-17

---

## Timeline

**Recommended Implementation Schedule:**

```
Immediate (NOW - 1 hour):
├── Fix PostgreSQL permissions
├── Harden SSH configuration
├── Secure .htpasswd files
└── Disable CUPS

Within 24 hours:
├── Fix APT sources
├── Install Fail2Ban
├── Setup auditd
└── Fix SSH key permissions

Within 1 week:
├── Audit Docker containers
├── Review application security
├── Implement additional hardening
└── Schedule follow-up audit
```

---

**Report Generated:** 2025-12-10 02:04 UTC
**Audit Version:** 1.0
**Next Audit Recommended:** 2025-12-17

For questions or issues, review the detailed audit report.
