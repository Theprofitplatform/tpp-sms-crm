# Docker Disk Usage Audit Report
**Generated:** 2025-12-10
**Host:** Linux VPS (31.97.222.218)

---

## Executive Summary

Your Docker infrastructure is currently consuming significant disk resources with a **100% reclaimable image footprint**. All 41 active containers are currently running, but there are substantial optimization opportunities.

### Key Metrics
- **Total Docker Disk Usage:** ~49.11 GB
  - Images: 19.94 GB (100% reclaimable)
  - Containers: 15.55 GB (0% reclaimable - all running)
  - Volumes: 14.62 GB (23% reclaimable - 3.4 GB)
  - Build Cache: 0 B

- **Container Status:** 41/41 running (0 stopped)
- **Dangling Images:** 1 image not tagged
- **Total Volumes:** 58 volumes (16 in use, 42 potentially unused)

---

## 1. Image Analysis

### Largest Images (Top 20)

| Rank | Repository | Tag | Size | Created | Status |
|------|------------|-----|------|---------|--------|
| 1 | ghcr.io/browserless/chromium | latest | 3.25 GB | 2025-11-19 | Active |
| 2 | myoung34/github-runner | latest | 2.36 GB | 2025-11-22 | Active |
| 3 | supabase/postgres | 15.8.1.048 | 1.91 GB | 2025-03-06 | Active |
| 4 | eo444kos48oss40ksck0w8ow-api | latest | 1.85 GB | 2025-11-24 | Active |
| 5 | seo-automation | latest | 1.1 GB | 2025-11-29 | Active |
| 6 | supabase/supavisor | 2.5.1 | 1.04 GB | 2025-04-17 | Active |
| 7 | eo444kos48oss40ksck0w8ow-scheduler | latest | 1.03 GB | 2025-11-24 | Active |
| 8 | docker.n8n.io/n8nio/n8n | 1.114.4 | 975 MB | 2025-10-07 | Active |
| 9 | supabase/studio | 2025.06.02-sha-8f2993d | 766 MB | 2025-06-02 | Active |
| 10 | supabase/edge-runtime | v1.67.4 | 651 MB | 2025-03-24 | Active |

### Dangling Images

**1 Dangling Image Found:**
- Image ID: `708514cec931`
- Repository: `qdrant/qdrant`
- Tag: `<none>`
- Size: 198 MB
- Created: 2025-11-17 12:08:08 UTC
- **Reclaimable:** Yes (no containers using it)

### Image Statistics

```
Total Images:        36
Active/Running:      36
Unused/Dangling:     1
Total Size:          19.94 GB
Reclaimable:         198 MB (dangling image)
```

### Old Images (60+ days)

The following images haven't been used in 60+ days:

| Image | Last Used | Days Ago | Size | Recommendation |
|-------|-----------|----------|------|-----------------|
| supabase/logflare | 2023-08-08 | 854+ | 433 MB | Remove if not needed |
| timberio/vector | 2023-03-06 | 1009+ | 124 MB | Remove if not needed |
| mockserver/mockserver | 2023-02-21 | 1023+ | 276 MB | Remove if not needed |
| kong | 2022-10-06 | 1160+ | 139 MB | Remove if not needed |
| darthsim/imgproxy | 2022-10-07 | 1160+ | 173 MB | Remove if not needed |

---

## 2. Volume Analysis

### Active Volumes (16 in use)

Mounted by running containers:

| Volume Name | Size | Associated Container | Status |
|-------------|------|----------------------|--------|
| coolify-db | ~300 MB | coolify-db | In Use |
| coolify-redis | ~100 MB | coolify-redis | In Use |
| rk8g00g8kkgs08c8gggwgo80_n8n-data | ~500 MB | n8n-* | In Use |
| rk8g00g8kkgs08c8gggwgo80_postgresql-data | ~800 MB | postgresql-rk8n | In Use |
| rk8g00g8kkgs08c8gggwgo80_redis-data | ~200 MB | redis-rk8n | In Use |
| w84occs4w0wks4cc4kc8o484_supabase-db-data | ~1.2 GB | supabase-db-* | In Use |
| w84occs4w0wks4cc4kc8o484_supabase-db-config | ~50 MB | supabase-db-* | In Use |
| vs4o4ogkcgwgwo8kgksg4koo_runner-primary-data | ~1.5 GB | runner-primary-* | In Use |
| vs4o4ogkcgwgwo8kgksg4koo_runner-automation-data | ~1.2 GB | runner-automation-* | In Use |
| vs4o4ogkcgwgwo8kgksg4koo_runner-testing-data | ~1.0 GB | runner-testing-* | In Use |
| vs4o4ogkcgwgwo8kgksg4koo_runner-1-data | ~800 MB | runner-1-* | In Use |
| vs4o4ogkcgwgwo8kgksg4koo_runner-5-data | ~600 MB | runner-5-* | In Use |
| j4kss8084c008sskcko8oks0_qdrant-storage | ~200 MB | qdrant-* | In Use |
| lgocksosco0o8o44s4g8wc0g_uptime-kuma | ~100 MB | uptime-kuma-* | In Use |
| pk0kkg0oww8kc8ocgcg0o0sg_glitchtip-postgres-data | ~400 MB | postgres-pk0kk* | In Use |
| pk0kkg0oww8kc8ocgcg0o0sg_uploads | ~150 MB | web-pk0kk*, worker-pk0kk* | In Use |

### Unused/Orphaned Volumes (42 potential candidates)

**Important:** The following volumes are NOT currently mounted by any container. Verify their importance before deletion:

```
56f972e099ac27434e8a95f0a0f2ff9b57175e6b41b4860c9fed3ad1c2cbb47e (Redis)
agentzero_grafana-data
agentzero_postgres-data
agentzero_prometheus-data
agentzero_redis-data
current_keyword_service_data
current_postgres_data
current_serpbear_data
ghost-cms_ghost-content
ghost-cms_ghost-db-data
glitchtip-deploy_postgres-data
glitchtip-deploy_redis-data
glitchtip-deploy_uploads
grafana-data
hive_postgres-data
hive_redis-data
i4owwg0s484gss4kkgc4o4s4_ghost-content-data
i4owwg0s484gss4kkgc4o4s4_ghost-mysql-data
infra_postgres_data
infra_redis_data
lk8ko4ks0ss44os84gw0skg0_postgresql-data
mobile_postgres_data
mobile_redis_data
monitoring_alertmanager_data
monitoring_grafana_data
monitoring_loki_data
monitoring_prometheus_data
plausible-analytics_plausible-db-data
plausible-analytics_plausible-event-data
prometheus-data
rep_postgres_data
rep_redis_data
serpbear_serpbear-data
ultimate_postgres-data
ultimate_redis-data
vo4gogcckccoo0kskw4w4kwk_uptime-kuka
whisper_minio_data
whisper_postgres_data
whisper_redis_data
coolify-mcp-node-modules
coolify-mcp-qdrant-data
```

**Estimated Reclaimable from Unused Volumes:** 3.4 GB (as reported by `docker system df`)

### Volume Strategy Recommendations

1. **Backup Before Deletion:** For unused volumes, check if they contain important data
2. **Categorize:** Group by project/service for bulk decisions
3. **Archive:** Consider exporting volume data before deletion for archival

---

## 3. Container Analysis

### Running Containers (41/41)

All containers are currently running. Key deployments:

**Coolify Stack** (4 containers)
- coolify (main)
- coolify-db
- coolify-realtime
- coolify-sentinel

**Supabase Stack** (15 containers)
- supabase-db-* (4 auth/storage/db containers)
- supabase-kong
- supabase-rest
- supabase-meta
- supabase-studio
- supabase-edge-functions
- realtime-dev
- imgproxy
- supabase-minio

**n8n Stack** (4 containers)
- n8n (main)
- n8n-worker
- postgresql
- redis

**GitHub Runners** (3 containers)
- runner-primary
- runner-automation
- runner-testing

**Others** (15 containers)
- SEO automation
- Browserless chromium
- Uptime Kuma
- Qdrant vector DB
- Multiple project deployments

### Stopped/Exited Containers

**Status:** None. All 41 containers are in running state.

**Disk Impact:** 0 B reclaimable (all containers are active)

---

## 4. Build Cache Analysis

**Docker Build Cache Usage:** 0 B

No reclaimable build cache found. This is optimal.

---

## 5. Disk Space Summary

### Current Breakdown

```
Type              Total      Reclaimable    %
──────────────────────────────────────────
Images            19.94 GB   198 MB         1%
Containers        15.55 GB   0 B            0%
Volumes           14.62 GB   3.4 GB         23%
Build Cache       0 B        0 B            0%
──────────────────────────────────────────
TOTAL             50.11 GB   3.598 GB       7.2%
```

### Conservative Cleanup Plan (Guaranteed Safe)

**Target:** 198 MB - 500 MB savings (minimal risk)

1. Remove dangling image (qdrant/qdrant untagged): **198 MB**
2. Review and backup unused volumes before deletion

**Command:**
```bash
docker image prune -f --filter "dangling=true"
```

### Aggressive Cleanup Plan (Medium Risk)

**Target:** 1 GB+ savings (requires verification)

1. Remove dangling image: **198 MB**
2. Remove old Supabase images not in use: **500-700 MB**
3. Prune unused volumes with backup: **3.4 GB**

**Steps:**
```bash
# 1. Remove dangling images
docker image prune -f --filter "dangling=true"

# 2. Remove specific old images (if not needed for rollback)
docker rmi -f 989590782684  # supabase/logflare
docker rmi -f f0494e814793  # timberio/vector
docker rmi -f 9510f048cd04  # mockserver/mockserver

# 3. Backup unused volume data (optional but recommended)
docker run --rm -v <volume_name>:/data -v $(pwd):/backup \
  alpine tar czf /backup/<volume_name>.tar.gz /data

# 4. Remove unused volumes
docker volume rm <volume_name_1> <volume_name_2> ...
```

### Maximum Cleanup Plan (High Risk - Not Recommended)

**Target:** 5+ GB savings (requires extensive verification)

Would require removing images/volumes from inactive projects:
- Ghost CMS volumes
- Old Glitchtip deployments
- Monitoring stacks
- Legacy services

**Risk Level:** HIGH - Only if you're certain these services won't be needed

---

## 6. Optimization Recommendations

### Immediate Actions (No Risk)

1. **Enable Image Pruning Cron Job**
   ```bash
   # Add to crontab (weekly)
   0 2 * * 0 docker image prune -f --filter "until=720h"
   ```

2. **Set Image Pull Policy**
   - Use specific tags, not `latest`
   - Regularly update base images (e.g., `postgres:15-alpine-3.18`)

3. **Implement Image Cleanup Workflow**
   - Keep only last 2 versions of images
   - Remove images older than 180 days if unused

### Medium-Term Improvements

1. **Volume Consolidation**
   - Merge similar database volumes
   - Use named volumes instead of anonymous ones

2. **Multi-Stage Builds**
   - Reduce image size for custom images:
     - seo-automation: 1.1 GB → potentially 300-500 MB
     - eo444kos48oss40ksck0w8ow-api: 1.85 GB → potentially 800 MB
     - eo444kos48oss40ksck0w8ow-scheduler: 1.03 GB → potentially 300-400 MB

3. **Base Image Optimization**
   - Replace ubuntu-based images with alpine where possible
   - Examples:
     - ghcr.io/browserless/chromium (3.25 GB) - consider headless browser alternatives

### Long-Term Strategy

1. **Registry Cleanup**
   - Implement Nexus/Harbor registry with retention policies
   - Automatically delete old image tags

2. **Monitoring**
   - Track disk usage trends
   - Alert when disk usage exceeds 80%

3. **Container Architecture Review**
   - Consider serverless alternatives for infrequent tasks
   - Implement container recycling policies

---

## 7. Safe Cleanup Commands Reference

### Dry Run Commands (No Changes)

```bash
# Show what would be pruned (images)
docker image prune --dry-run -f

# Show what would be pruned (volumes)
docker volume ls -f "dangling=true"

# Check specific image usage
docker image inspect <IMAGE_ID> | grep -A 5 RefCount
```

### One-by-One Removal (Safest)

```bash
# Remove dangling image
docker image rm 708514cec931

# Remove specific volume (after backup)
docker volume rm <volume_name>

# Remove old image with tag
docker image rm supabase/logflare:1.4.0
```

### Bulk Removal (With Verification)

```bash
# Remove all dangling images
docker image prune -f --filter "dangling=true"

# Remove all unused volumes
docker volume prune -f

# Remove images not used in 30 days
docker image prune -f --filter "until=720h"
```

### Backup Before Deletion

```bash
# Backup volume to file
docker run --rm -v <volume_name>:/data -v /path/to/backup:/backup \
  alpine tar czf /backup/<volume_name>.tar.gz /data

# Restore from backup
docker run --rm -v <volume_name>:/data -v /path/to/backup:/backup \
  alpine tar xzf /backup/<volume_name>.tar.gz -C /data

# Export image to file
docker save <image_id> | gzip > /path/to/backup/<image_name>.tar.gz

# Reload image from file
docker load < /path/to/backup/<image_name>.tar.gz
```

---

## 8. Implementation Checklist

### Before Running Any Cleanup Commands

- [ ] Backup critical volumes
  - [ ] n8n data (rk8g00g8kkgs08c8gggwgo80_n8n-data)
  - [ ] Supabase data (w84occs4w0wks4cc4kc8o484_supabase-db-data)
  - [ ] Runner data (vs4o4ogkcgwgwo8kgksg4koo_runner-*-data)

- [ ] Verify unused volumes aren't needed
  - [ ] Check ghostly services (ghost-cms, whisper, etc.)
  - [ ] Confirm no active projects use old stacks

- [ ] Test in staging first
  - [ ] Don't run cleanup during peak usage
  - [ ] Run early morning or during maintenance window

### Phase 1: Conservative Cleanup (Safe - Do Now)

- [ ] Run: `docker image prune -f --filter "dangling=true"`
- [ ] Verify: `docker system df` shows 198 MB reclaimed
- [ ] Log: Record before/after state

### Phase 2: Volume Cleanup (Medium Risk - Plan First)

- [ ] Identify truly unused volumes (check logs)
- [ ] Backup identified volumes to /home/avi/backups/volumes/
- [ ] Run: `docker volume rm <volumes>`
- [ ] Verify: Check that affected services still run

### Phase 3: Image Optimization (Long-term)

- [ ] Profile custom images (seo-automation, etc.)
- [ ] Implement multi-stage Dockerfile builds
- [ ] Test reduced-size images
- [ ] Update container definitions

---

## 9. Monitoring Setup

### Create Cleanup Automation Script

```bash
#!/bin/bash
# /home/avi/scripts/docker-cleanup.sh
# Run weekly to maintain disk space

set -euo pipefail

LOG_FILE="/var/log/docker-cleanup.log"
BACKUP_DIR="/home/avi/backups/docker-volumes"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Starting Docker cleanup..."
log "Before: $(docker system df | grep -E 'TOTAL|Reclaimable')"

# Remove dangling images
docker image prune -f --filter "dangling=true" >> "$LOG_FILE" 2>&1
log "Removed dangling images"

# Log results
log "After: $(docker system df | grep -E 'TOTAL|Reclaimable')"
log "Cleanup completed successfully"
```

### Setup Cron Job

```bash
# /etc/cron.d/docker-cleanup
# Run weekly on Sunday at 2 AM
0 2 * * 0 root /home/avi/scripts/docker-cleanup.sh
```

### Disk Usage Monitoring

```bash
#!/bin/bash
# Monitor and alert if disk usage is high
USAGE=$(df /var/lib/docker | tail -1 | awk '{print int($5)}')
if [ "$USAGE" -gt 80 ]; then
  echo "Docker disk usage at ${USAGE}%" | \
    mail -s "High Docker Disk Usage Alert" your@email.com
fi
```

---

## 10. Key Findings Summary

### Critical Issues
None currently - all containers are running and active.

### Optimization Opportunities
1. **1 Dangling Image (198 MB)** - Safe to remove immediately
2. **42 Unused Volumes (3.4 GB)** - Need verification before removal
3. **5 Very Old Images (1.1 GB)** - Consider if still needed
4. **Custom Images Bloat** - seo-automation, APIs using 3+ GB combined

### Recommended Priority
1. **Today:** Remove dangling qdrant image (198 MB, 0 risk)
2. **This Week:** Backup and evaluate unused volumes
3. **This Month:** Implement automated cleanup cron
4. **Next Quarter:** Optimize custom image builds

---

## 11. Support & Questions

For safe execution of cleanup commands:

1. **Which volumes can I safely remove?**
   - Check last used time: `docker volume inspect <volume_name>`
   - Verify no containers reference it: `grep -r "<volume_name>" docker-compose.yml`

2. **How do I backup before deletion?**
   - See section 7 "Backup Before Deletion" commands

3. **What if cleanup breaks something?**
   - Volumes are backed up in `/home/avi/backups/docker-volumes/`
   - Use `docker load` to restore backed up images
   - Restart containers: `docker compose up -d`

---

**Report Generated:** 2025-12-10 by Docker Cleanup Audit
**Next Review Recommended:** 2025-12-17 (weekly)
