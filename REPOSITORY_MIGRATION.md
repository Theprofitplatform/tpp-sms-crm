# Repository Migration Documentation

## Overview

The SMS CRM platform has been successfully migrated from the main website repository to its own dedicated repository: [https://github.com/Theprofitplatform/tpp-sms-crm](https://github.com/Theprofitplatform/tpp-sms-crm)

## Migration Rationale

### Why Separate the Repositories?

1. **Framework Conflicts**: The main website uses Astro framework while the SMS CRM uses Next.js
2. **Independent Development**: Separate teams can work on website and SMS features independently
3. **Deployment Isolation**: Different deployment strategies and infrastructure requirements
4. **Security Boundaries**: Separate access controls and secrets management
5. **Performance**: Smaller, focused repositories with faster CI/CD pipelines

## Migration Steps Completed

### 1. Repository Creation
- Created new GitHub repository: `Theprofitplatform/tpp-sms-crm`
- Set up proper repository settings and branch protection

### 2. Code Migration
- Migrated all SMS CRM code from the main repository
- Maintained monorepo structure with pnpm workspaces
- Updated package.json with new repository information
- Updated README.md with new repository instructions

### 3. Configuration Updates
- Updated deployment scripts to use new repository name
- Updated systemd service names from `sms-crm-*` to `tpp-sms-crm-*`
- Updated remote paths in deployment scripts
- Removed production secrets from documentation files

### 4. Build Verification
- Verified TypeScript compilation for API and worker services
- Confirmed build process works for core services
- Tested deployment scripts with updated configurations

## Current Deployment Status

### VPS Deployment (Active)
- **Location**: `~/projects/sms-crm` (legacy path)
- **Services**: Running successfully with original service names
- **Status**: All services healthy and accessible
- **URL**: https://sms.theprofitplatform.com.au/

### Service Names
- **API**: `sms-crm-api.service` (running on port 3000)
- **Worker**: `sms-crm-worker.service` (running on port 3002)
- **Web**: `sms-crm-web.service` (running on port 3001)

## Future Deployment Updates

### Recommended Actions

1. **Update VPS Deployment** (Optional)
   - Clone new repository to `~/projects/tpp-sms-crm`
   - Update systemd services to use new names
   - Test deployment with updated scripts

2. **DNS/Subdomain Configuration**
   - Current subdomain: `sms.theprofitplatform.com.au`
   - No changes required - existing configuration works

3. **Repository Cleanup**
   - Remove SMS CRM code from main website repository
   - Update documentation in main repository

## Deployment Scripts

### Updated Deployment Script (`deploy-vps.sh`)

Key changes:
- Project name updated to `tpp-sms-crm`
- Systemd service names updated to `tpp-sms-crm-*`
- Remote path updated to `~/projects/tpp-sms-crm`
- All references to old repository name removed

### Usage
```bash
./deploy-vps.sh tpp-vps
```

## Service Management

### Current Services (Legacy Names)
```bash
# Check status
systemctl status sms-crm-api sms-crm-worker sms-crm-web

# View logs
journalctl -u sms-crm-api -f
journalctl -u sms-crm-worker -f
journalctl -u sms-crm-web -f

# Restart services
systemctl restart sms-crm-api sms-crm-worker sms-crm-web
```

### Future Services (New Names)
```bash
# Check status
systemctl status tpp-sms-crm-api tpp-sms-crm-worker tpp-sms-crm-web

# View logs
journalctl -u tpp-sms-crm-api -f
journalctl -u tpp-sms-crm-worker -f
journalctl -u tpp-sms-crm-web -f

# Restart services
systemctl restart tpp-sms-crm-api tpp-sms-crm-worker tpp-sms-crm-web
```

## Collision Prevention Measures

### Port Configuration
- **API**: Port 3000 (systemd service)
- **Worker**: Port 3002 (systemd service)
- **Web**: Port 3001 (systemd service)
- **Docker Containers**: No port mapping conflicts (stopped conflicting containers)

### Service Isolation
- Systemd services run directly on host ports
- Docker containers stopped to prevent resource conflicts
- Database containers (PostgreSQL, Redis) continue running for data persistence
- Clear separation between development (systemd) and production (Docker) deployment methods

### Updated Docker Configuration
- Added explicit port mappings in `docker-compose.prod.yml`
- API: `3000:3000`
- Worker: `3002:3002`
- Shortener: `3003:3003`
- Web: `3001:3000`

## Migration Checklist

- [x] Create new GitHub repository
- [x] Migrate all SMS CRM code
- [x] Update package.json and dependencies
- [x] Update deployment scripts
- [x] Remove production secrets from documentation
- [x] Test build process
- [x] Document migration process
- [x] Prevent API collision issues
- [x] Update Docker configuration with proper port mappings
- [ ] Update VPS deployment (optional)
- [ ] Clean up main repository
- [ ] Update DNS if needed

## Notes

- The current VPS deployment continues to work with the legacy service names
- No immediate action required for production deployment
- Future deployments should use the new repository and updated scripts
- The migration maintains full backward compatibility

## Support

For issues related to the repository migration, contact the platform team.

---

**Migration Date**: October 8, 2025
**Repository**: https://github.com/Theprofitplatform/tpp-sms-crm
**Status**: ✅ Migration Complete