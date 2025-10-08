# Main Website Repository Cleanup Guide

## Overview

This guide provides instructions for cleaning up the SMS CRM code from the main website repository after the successful migration to the new dedicated repository.

## Repository Information

- **SMS CRM Repository**: https://github.com/Theprofitplatform/tpp-sms-crm
- **Main Website Repository**: [Your main website repository URL]

## Cleanup Steps

### 1. Backup Important Files

Before cleaning up, ensure you have backups of:
- Any environment files (`.env`, `.env.production`)
- Database backup files
- Any custom configurations
- Documentation files you want to keep

### 2. Remove SMS CRM Directories

Remove the following directories from the main website repository:

```bash
# Remove SMS CRM application directories
rm -rf apps/api/
rm -rf apps/web/
rm -rf worker/shortener/
rm -rf packages/lib/

# Remove infrastructure files
rm -rf infra/

# Remove test files
rm -f test-*.js
rm -f test-*.sh
rm -f test-*.csv
rm -f test-*.sql

# Remove deployment scripts
rm -f deploy-vps.sh
rm -f start-dev.sh
```

### 3. Update Package.json

Remove SMS CRM dependencies and scripts from the main `package.json`:

```json
{
  "scripts": {
    // Remove SMS CRM specific scripts:
    // "dev:api", "dev:web", "dev:worker",
    // "build:api", "build:web", "build:worker",
    // "migrate", "migrate:generate", "seed"
  }
}
```

### 4. Remove Documentation Files

Remove SMS CRM specific documentation:

```bash
# Remove migration and deployment documentation
rm -f REPOSITORY_MIGRATION.md
rm -f DEPLOYMENT_SUMMARY.md
rm -f IMPLEMENTATION_SUMMARY.md
rm -f VPS_DEPLOYMENT.md
rm -f PROJECT_STATUS_REPORT.md
rm -f SESSION_SUMMARY.md
rm -f SETUP_STATUS.md
rm -f CONTINUATION_PLAN.md
rm -f PRODUCTION_READINESS_PLAN.md
rm -f EXECUTIVE_SUMMARY.md
rm -f CRITICAL_ANALYSIS.md
rm -f COMPREHENSIVE_STATUS_REPORT.md
rm -f REALISTIC_PATH_FORWARD.md
rm -f THE_PLAN.md
rm -f START_HERE.md
rm -f README_FIRST.md
rm -f QUICK_START_CHECKLIST.md
rm -f QUICK_REFERENCE.txt
rm -f GITHUB_ISSUES_TEMPLATE.md
rm -f AUTH_FLOW_TEST_GUIDE.md
rm -f CLOUDFLARE_DEPLOYMENT.md

# Remove Claude-specific files
rm -f AGENTS.md
rm -f claude_code_work_orders_v_1_no_code_prompts.md
```

### 5. Update README.md

Update the main website repository's README.md to:
- Remove references to SMS CRM features
- Update installation and setup instructions
- Focus only on the main website functionality

### 6. Clean Up Environment Files

Remove SMS CRM specific environment variables from `.env.example`:

```bash
# Remove SMS CRM environment variables like:
# DATABASE_URL, REDIS_URL, TWILIO_ACCOUNT_SID, etc.
# SHORT_DOMAIN, SHORT_LINK_SECRET, etc.
```

### 7. Update Git Configuration

If you want to keep the git history clean, you can:

```bash
# Commit the cleanup changes
git add .
git commit -m "cleanup: remove SMS CRM code after migration to dedicated repository"

# Or if you want to rewrite history (advanced):
# git filter-branch --tree-filter 'rm -rf apps/api apps/web worker/shortener packages/lib infra' HEAD
```

### 8. Verify Cleanup

After cleanup, verify that:
- The main website still builds and runs correctly
- All SMS CRM code has been removed
- Only website-specific functionality remains
- Dependencies are appropriate for the main website

## Post-Cleanup Verification

1. **Build Test**: Ensure the main website builds successfully
2. **Deployment Test**: Verify deployment still works for the website
3. **Functionality Test**: Test all website features still work
4. **Dependency Check**: Verify no unnecessary dependencies remain

## Notes

- **Keep Database Containers**: If you're using the same VPS, keep PostgreSQL and Redis containers running as they may be used by other services
- **Environment Variables**: Keep any environment variables that are used by the main website
- **Backup First**: Always backup before performing major cleanup operations
- **Test Thoroughly**: Test the main website thoroughly after cleanup

## Support

If you encounter issues during cleanup, refer to the SMS CRM repository documentation or contact the platform team.

---

**Cleanup Date**: October 8, 2025
**SMS CRM Repository**: https://github.com/Theprofitplatform/tpp-sms-crm
**Status**: ✅ Cleanup Guide Created