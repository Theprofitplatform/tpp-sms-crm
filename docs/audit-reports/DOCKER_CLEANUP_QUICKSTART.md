# Docker Cleanup - Quick Start Guide

## Overview

Complete Docker disk usage audit generated **2025-12-10** for your infrastructure at **31.97.222.218**.

**Current Status:**
- Total Docker Usage: **50.11 GB**
- Reclaimable: **3.6 GB** (7.2% of total)
- Running Containers: **41/41** (all active)
- Dangling Images: **1** (198 MB)
- Unused Volumes: **42** (3.4 GB)

---

## What's Taking Up Space?

### Top 5 Largest Images
1. **ghcr.io/browserless/chromium** - 3.25 GB (active)
2. **myoung34/github-runner** - 2.36 GB (active)
3. **supabase/postgres** - 1.91 GB (active)
4. **eo444kos48oss40ksck0w8ow-api** - 1.85 GB (active)
5. **seo-automation** - 1.1 GB (active)

### Cleanup Opportunities

| Item | Size | Risk | Action |
|------|------|------|--------|
| Dangling qdrant image | 198 MB | Very Low | Remove now |
| Unused volumes | 3.4 GB | Medium | Backup then remove |
| Old unused images | 1.1 GB | Medium-High | Review first |
| Custom image optimization | 2+ GB | High | Requires rebuilds |

---

## Immediate Actions (Today)

### 1. Review Full Report
```bash
cat /home/avi/docs/audit-reports/docker-cleanup-20251210.md
```

### 2. Run Dry-Run Analysis (Safe - No Changes)
```bash
/home/avi/scripts/docker-cleanup-safe.sh --dry-run
```

This will show:
- What would be deleted
- Space that would be reclaimed
- No actual changes to your system

### 3. See All Available Commands
```bash
/home/avi/scripts/docker-cleanup-commands.sh
```

---

## Step-by-Step Cleanup

### Phase 1: Conservative Cleanup (198 MB, Very Safe)

**Risk Level:** Very Low
**Time to Execute:** 2 minutes
**Downtime:** None

Remove only the dangling image (not used by anything):

```bash
# See what will be deleted (safe)
docker images -f "dangling=true"

# Remove it
docker image prune -f --filter "dangling=true"

# Verify cleanup
docker system df
```

**Expected Result:** Free 198 MB immediately

### Phase 2: Volume Analysis (Plan, Don't Delete Yet)

**Risk Level:** Low (just analysis)
**Time to Execute:** 5 minutes
**Downtime:** None

Identify which volumes are truly unused:

```bash
# List all volumes with their status
docker volume ls

# Check which are mounted by containers
docker ps -a --format "{{.Names}}" | xargs -I {} \
  docker inspect {} --format "{{.Name}}: {{range .Mounts}}{{.Name}},{{end}}"
```

**Decision:** Review if these volumes are needed:
- `ghost-cms_*` - Old Ghost CMS (removable if not using)
- `monitoring_*` - Old monitoring stack
- `whisper_*` - Old whisper deployment
- `plausible-analytics_*` - Old analytics stack

### Phase 3: Backup Critical Volumes

**Risk Level:** None (only creates backups)
**Time to Execute:** 10-30 minutes
**Downtime:** None

Backup any volumes you might need:

```bash
# Create backup directory
mkdir -p /home/avi/backups/docker-volumes

# Backup single volume
docker run --rm \
  -v <volume_name>:/volume \
  -v /home/avi/backups:/backup \
  alpine tar czf /backup/<volume_name>.tar.gz -C /volume .

# Example for Ghost CMS data
docker run --rm \
  -v ghost-cms_ghost-content:/volume \
  -v /home/avi/backups:/backup \
  alpine tar czf /backup/ghost-cms_ghost-content.tar.gz -C /volume .
```

### Phase 4: Remove Unused Volumes

**Risk Level:** Medium (can be restored from backup)
**Time to Execute:** 5 minutes per volume
**Downtime:** None (unless volume is in use)

After backing up:

```bash
# Remove single volume
docker volume rm <volume_name>

# Example
docker volume rm ghost-cms_ghost-content

# Or remove multiple
docker volume rm ghost-cms_ghost-content ghost-cms_ghost-db-data
```

**Expected Result:** Free 3.4 GB

---

## Automated Setup (Optional)

### Enable Weekly Automatic Cleanup

```bash
# Setup cron job (requires sudo)
sudo /home/avi/scripts/setup-docker-cleanup-cron.sh
```

This will:
- Remove dangling images automatically
- Run every Sunday at 2 AM
- Log results to `/var/log/docker-cleanup-cron.log`

Monitor the logs:
```bash
tail -f /var/log/docker-cleanup-cron.log
```

---

## Safety Checklist

Before running ANY cleanup commands:

- [ ] Read the full audit report
- [ ] Run the dry-run script first
- [ ] Understand the risk level
- [ ] Backup critical volumes
- [ ] Plan during low-traffic time
- [ ] Have rollback plan ready
- [ ] Can restart containers if needed

---

## Quick Commands Reference

### View Only (100% Safe)
```bash
# Current usage
docker system df

# Dangling images
docker images -f "dangling=true"

# Unused volumes
docker volume ls

# Largest images
docker images --format "table {{.Repository}}\t{{.Size}}" | sort -k2 -h
```

### Cleanup (Be Careful)
```bash
# Remove dangling images (198 MB)
docker image prune -f --filter "dangling=true"

# Remove unused networks (0 B)
docker network prune -f

# Remove unused build cache (0 B)
docker builder prune -f

# Remove specific volume
docker volume rm <volume_name>

# Remove all unused volumes (CAREFUL!)
docker volume prune -f
```

### Backup Before Deleting
```bash
# Backup volume
docker run --rm \
  -v <volume>:/data \
  -v /home/avi/backups:/backup \
  alpine tar czf /backup/<volume>.tar.gz -C /data .

# Restore from backup
docker run --rm \
  -v <volume>:/data \
  -v /home/avi/backups:/backup \
  alpine tar xzf /backup/<volume>.tar.gz -C /data
```

---

## File Locations

All audit tools and reports are organized:

```
/home/avi/
├── docs/audit-reports/
│   ├── docker-cleanup-20251210.md          # Full detailed report
│   └── DOCKER_CLEANUP_QUICKSTART.md        # This file
│
└── scripts/
    ├── docker-cleanup-safe.sh              # Safe cleanup script
    ├── docker-cleanup-commands.sh          # Commands reference
    └── setup-docker-cleanup-cron.sh        # Cron job setup
```

---

## Example: Full Cleanup Walkthrough

### Scenario: Clean up 3.6 GB total (Conservative Approach)

**Step 1: Analyze** (5 min)
```bash
/home/avi/scripts/docker-cleanup-safe.sh --dry-run
```

**Step 2: Remove dangling image** (2 min)
```bash
docker image prune -f --filter "dangling=true"
```
*Frees: 198 MB*

**Step 3: Identify unused volumes** (5 min)
```bash
# Review which are not mounted
docker volume ls
```

**Step 4: Backup volumes** (10 min)
```bash
mkdir -p /home/avi/backups/docker-volumes

# Backup unused volumes one by one
for vol in ghost-cms_ghost-content ghost-cms_ghost-db-data; do
  docker run --rm \
    -v $vol:/volume \
    -v /home/avi/backups:/backup \
    alpine tar czf /backup/$vol.tar.gz -C /volume .
  echo "Backed up: $vol"
done
```

**Step 5: Remove unused volumes** (5 min)
```bash
# Remove one by one to avoid mistakes
docker volume rm ghost-cms_ghost-content
docker volume rm ghost-cms_ghost-db-data
# ... repeat for other unused volumes
```
*Frees: 3.4 GB*

**Step 6: Verify** (2 min)
```bash
docker system df
```
*Total freed: ~3.6 GB*

---

## Troubleshooting

### "Volume is in use" error
```
Solution: Check which container is using it
docker ps -a --format "{{.Names}}" | xargs -I {} \
  docker inspect {} --format "{{.Name}}: {{range .Mounts}}{{.Name}},{{end}}"
```

### "Cannot remove running container"
```
Solution: Stop container first
docker stop <container_name>
docker rm <container_name>
```

### "Image has multiple tags"
```
Solution: Remove tag first, then image
docker rmi <image>:<tag>
docker rmi <image_id>
```

### Accidentally deleted important volume
```
Solution: Restore from backup
docker volume create <volume_name>
docker run --rm \
  -v <volume_name>:/data \
  -v /home/avi/backups:/backup \
  alpine tar xzf /backup/<volume_name>.tar.gz -C /data
```

---

## Next Steps

1. **Today:** Review audit report and run dry-run
2. **Tomorrow:** Execute Phase 1 cleanup (198 MB, very safe)
3. **This Week:** Plan Phase 2-3 (volume analysis & backup)
4. **This Month:** Execute Phase 4 (volume cleanup) with backups
5. **Long-term:** Monitor disk usage and implement cron job

---

## Support

### Full Audit Report
See: `/home/avi/docs/audit-reports/docker-cleanup-20251210.md`

### All Cleanup Commands
See: `/home/avi/scripts/docker-cleanup-commands.sh`

### Manual Cleanup Script
```bash
# Dry run (safe)
/home/avi/scripts/docker-cleanup-safe.sh --dry-run

# Execute (with confirmations)
/home/avi/scripts/docker-cleanup-safe.sh --execute

# Aggressive mode (older images too)
/home/avi/scripts/docker-cleanup-safe.sh --execute --aggressive
```

---

**Report Generated:** 2025-12-10
**Server:** 31.97.222.218 (Linux VPS)
**Audit Tool:** Docker System Analyzer v1.0
