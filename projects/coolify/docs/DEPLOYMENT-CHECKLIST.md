# Deployment Checklist

> Automated checklist for Coolify MCP Server deployments
> Run: `./scripts/pre-deploy-check.sh`

---

## Pre-Deployment

### Environment
- [ ] `.env` file exists and configured
- [ ] `COOLIFY_BASE_URL` set correctly
- [ ] `COOLIFY_TOKEN` is valid (not expired)
- [ ] No secrets in source code
- [ ] Node.js version >= 18

### Code Quality
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatting OK (`npm run format --check`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] No type errors

### Testing
- [ ] Unit tests pass (`npm run test:unit`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] Coverage >= 70%
- [ ] Security tests pass

### Security
- [ ] `npm audit` - no critical vulnerabilities
- [ ] `.env` not tracked in git
- [ ] No secrets in systemd service file
- [ ] API token rotated recently (recommended: every 90 days)

---

## Deployment Steps

### 1. Prepare
```bash
cd /home/avi/projects/coolify/coolify-mcp

# Run pre-deploy checks
./scripts/pre-deploy-check.sh

# If checks pass, proceed
```

### 2. Pull & Build
```bash
git pull origin main
npm ci
npm run build
```

### 3. Deploy
```bash
# Restart service
sudo systemctl restart coolify-mcp

# Check status
sudo systemctl status coolify-mcp
```

### 4. Verify
```bash
# Check logs
sudo journalctl -u coolify-mcp -n 50 --no-pager

# Run health check
node health-check-coolify.js
```

---

## Post-Deployment

### Immediate (0-5 min)
- [ ] Service is running (`systemctl status`)
- [ ] No errors in logs
- [ ] Health check passes

### Short-term (5-15 min)
- [ ] API connectivity verified
- [ ] Tool executions working
- [ ] No error spikes in monitoring

### Documentation
- [ ] Update CHANGELOG if needed
- [ ] Tag release if applicable
- [ ] Notify team of deployment

---

## Rollback Procedure

If issues are found:

```bash
# Quick rollback to previous commit
cd /home/avi/projects/coolify/coolify-mcp
git checkout HEAD~1
npm run build
sudo systemctl restart coolify-mcp

# Verify
sudo systemctl status coolify-mcp
```

See [ROLLBACK-PROCEDURES.md](./ROLLBACK-PROCEDURES.md) for detailed procedures.

---

## Automated Check Command

```bash
# Run all pre-deployment checks
./scripts/pre-deploy-check.sh

# Exit codes:
#   0 = All checks passed, safe to deploy
#   1 = Critical issues, do NOT deploy
#   2 = Warnings found, deploy with caution
```
