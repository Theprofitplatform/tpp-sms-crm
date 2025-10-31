# ✅ Deployment Checklist

**Use this checklist for deploying to TPP VPS**

---

## 📋 Pre-Deployment

### Local Environment
- [ ] All code changes committed
- [ ] Tests passing locally (`npm test`)
- [ ] No console errors in development
- [ ] `.env.example` updated if needed
- [ ] Documentation updated if needed

### VPS Access
- [ ] Can connect: `ssh tpp-vps`
- [ ] VPS is responding: `ssh tpp-vps 'uptime'`
- [ ] Project directory exists: `ssh tpp-vps 'ls ~/projects/seo-expert'`

### Prerequisites Check
```bash
# Run this to verify everything is ready
ssh tpp-vps << 'EOF'
  echo "=== Pre-Deployment Check ==="
  echo -n "PostgreSQL: "; pg_isready && echo "✓" || echo "✗"
  echo -n "Redis: "; redis-cli ping > /dev/null 2>&1 && echo "✓" || echo "✗"
  echo -n "Docker: "; docker --version > /dev/null 2>&1 && echo "✓" || echo "✗"
  echo -n "Nginx: "; systemctl is-active nginx && echo "✓" || echo "✗"
  echo -n "Port 3007: "; ! ss -tuln | grep -q :3007 && echo "✓ Available" || echo "⚠ In use"
EOF
```

---

## 🚀 Deployment

### Method 1: Automated Script (Recommended)
- [ ] Run: `./deploy-to-tpp-vps.sh`
- [ ] Follow prompts
- [ ] Note any errors

### Method 2: NPM Scripts
- [ ] Run: `npm run vps:deploy`
- [ ] Verify: `npm run vps:health`

### Method 3: Helper Commands
```bash
source vps-helpers.sh
- [ ] Run: `vps-deploy`
- [ ] Verify: `vps-health`
```

---

## ✅ Post-Deployment Verification

### 1. Service Health
```bash
npm run vps:health
```
**Expected:** `✓ SEO Expert healthy`

- [ ] Health check passed

### 2. All SEO Services
```bash
source vps-helpers.sh && vps-health
```
**Expected:**
```
  SerpBear (3006): ✓
  SEO Analyst (5002): ✓
  SEO Expert (3007): ✓
  PostgreSQL: ✓
  Redis: ✓
```

- [ ] All services healthy

### 3. Container Status
```bash
npm run vps:status
```

- [ ] Container running
- [ ] Container healthy (if applicable)

### 4. Logs Check
```bash
npm run vps:logs
```

- [ ] No critical errors in logs
- [ ] Service started successfully
- [ ] Database connected

### 5. API Endpoints
```bash
# From VPS
ssh tpp-vps << 'EOF'
  echo "Testing endpoints..."
  curl -sf http://localhost:3007/health && echo "✓ Health" || echo "✗ Health"
  curl -sf http://localhost:3007/api/v2/keywords && echo "✓ Keywords API" || echo "✗ Keywords API"
EOF
```

- [ ] Health endpoint responding
- [ ] API endpoints accessible

### 6. Database Connection
```bash
ssh tpp-vps 'psql -U seo_user -d seo_expert -c "SELECT count(*) FROM domains;" 2>/dev/null || echo "Check DB setup"'
```

- [ ] Database accessible
- [ ] Tables exist

### 7. Integration Check
```bash
# Check all SEO services are accessible
ssh tpp-vps << 'EOF'
  echo "Integration check..."
  curl -sf http://localhost:3006/api/domains > /dev/null && echo "✓ SerpBear API" || echo "✗ SerpBear"
  curl -sf http://localhost:5002/health > /dev/null && echo "✓ SEO Analyst" || echo "✗ SEO Analyst"
  curl -sf http://localhost:3007/health > /dev/null && echo "✓ SEO Expert" || echo "✗ SEO Expert"
EOF
```

- [ ] Can access SerpBear
- [ ] Can access SEO Analyst
- [ ] Can access SEO Expert
- [ ] All services responding

---

## 🌐 Domain Configuration (Optional)

### If Setting Up Public Domain

- [ ] Nginx config created
- [ ] SSL certificate obtained
- [ ] Domain DNS pointing to VPS
- [ ] HTTPS working

```bash
# Test HTTPS (if configured)
curl -I https://seodashboard.theprofitplatform.com.au
```

---

## 📊 Monitoring Setup

### Add to Monitoring

- [ ] Prometheus scraping new endpoint
- [ ] Grafana dashboard updated
- [ ] Alerts configured (if needed)

```bash
# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "seo-expert")'
```

---

## 💾 Backup & Recovery

### Initial Backup
```bash
source vps-helpers.sh && vps-db-backup
```

- [ ] Database backup created
- [ ] Backup location noted: `~/backups/seo-expert-YYYYMMDD.sql`

### Test Recovery (Optional)
```bash
# Test that backup can be restored (dry run)
ssh tpp-vps 'ls -lh ~/backups/seo-expert-*.sql | tail -1'
```

- [ ] Backup file exists
- [ ] Backup file has data (> 1KB)

---

## 📚 Documentation Update

- [ ] Update README if needed
- [ ] Document any custom configuration
- [ ] Note any issues encountered
- [ ] Update team if applicable

---

## 🔍 Smoke Tests

### Basic Functionality
- [ ] Can view dashboard (if UI exists)
- [ ] Can create a keyword
- [ ] Can view keywords list
- [ ] Can update keyword
- [ ] Can delete keyword

### Integration Tests
- [ ] Can fetch SerpBear data (if integrated)
- [ ] Can access SEO Analyst reports (if integrated)
- [ ] Cross-service data sharing works

---

## 📈 Performance Check

```bash
source vps-helpers.sh && vps-status
```

Review:
- [ ] CPU load acceptable (< 2.0)
- [ ] Memory usage reasonable (< 80%)
- [ ] Disk space sufficient (> 10% free)
- [ ] No memory leaks in container

---

## 🔄 Rollback Plan (If Issues)

### If Deployment Failed

**Stop new service:**
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose down'
```

**Check what's wrong:**
```bash
npm run vps:logs
```

**Rollback to previous version:**
```bash
ssh tpp-vps << 'EOF'
  cd ~/projects/seo-expert
  git log --oneline -5  # See recent commits
  git checkout <previous-commit>
  docker-compose restart
EOF
```

**Or restore from backup:**
```bash
ssh tpp-vps 'ls ~/backups/seo-expert-*.sql | tail -1'
# Restore that backup
```

---

## ✅ Final Checklist

- [ ] All pre-deployment checks passed
- [ ] Deployment completed successfully
- [ ] All post-deployment verifications passed
- [ ] All services healthy
- [ ] No errors in logs
- [ ] Database connected
- [ ] Integration working
- [ ] Backup created
- [ ] Monitoring active
- [ ] Team notified (if applicable)

---

## 📝 Deployment Notes

**Date:** _____________
**Deployed by:** _____________
**Version/Commit:** _____________
**Issues encountered:** _____________
**Resolution:** _____________
**Rollback needed:** ☐ Yes ☐ No

---

## 🎯 Success Criteria

✅ **Deployment is successful when:**

1. `npm run vps:health` returns ✓
2. All services in `vps-health` show ✓
3. No errors in `npm run vps:logs`
4. Container status shows "healthy" or "running"
5. Database connection working
6. API endpoints responding
7. Integration with other services working

---

## 🆘 Quick Troubleshooting

### Service not starting?
```bash
npm run vps:logs | grep -i error
```

### Database connection issues?
```bash
ssh tpp-vps 'pg_isready && psql -U seo_user -d seo_expert -c "SELECT 1;"'
```

### Port already in use?
```bash
ssh tpp-vps 'ss -tuln | grep 3007'
```

### Out of memory?
```bash
ssh tpp-vps 'free -h && docker stats --no-stream'
```

### Need to restart everything?
```bash
npm run vps:restart
sleep 5
npm run vps:health
```

---

## 📞 Support Resources

- **Documentation:** `README-VPS-INTEGRATION.md`
- **Quick Reference:** `VPS-REFERENCE-CARD.md`
- **Helper Commands:** `source vps-helpers.sh && vps-help`
- **Detailed Guide:** `VPS_INTEGRATION_GUIDE.md`

---

**✨ Deployment Complete! All checks passed!** 🎉
