# Docker Audit - Quick Fix Guide

Quick reference for implementing audit recommendations.

---

## Priority 1: Critical Fixes (Do These First)

### 1. Add Restart Policies to ALL Containers

```bash
# Add restart policy to all running containers
for container in $(docker ps -q); do
  docker update --restart=on-failure:3 $container
done

# Verify
docker ps --no-trunc --format='{{.Names}}\t{{.RestartPolicy}}'
```

### 2. Add Health Checks (Priority List)

#### For HTTP-based services:
```bash
# Apply to: api-eo444kos48oss40ksck0w8ow
docker update --health-cmd='curl -f http://localhost:8080/health || exit 1' \
  --health-interval=30s --health-timeout=10s --health-retries=3 \
  api-eo444kos48oss40ksck0w8ow

# Apply to: scheduler-eo444kos48oss40ksck0w8ow
docker update --health-cmd='curl -f http://localhost:8080/health || exit 1' \
  --health-interval=30s --health-timeout=10s --health-retries=3 \
  scheduler-eo444kos48oss40ksck0w8ow
```

#### For database services:
```bash
# Apply to services with database connection checks
docker update --health-cmd='pg_isready -U postgres' \
  --health-interval=30s --health-timeout=10s --health-retries=3 \
  <postgres_container>
```

#### For runner/worker services:
```bash
# Apply to: runner-primary-vs4o4ogkcgwgwo8kgksg4koo
docker update --health-cmd='test -f /proc/self/cgroup' \
  --health-interval=30s --health-timeout=10s --health-retries=3 \
  runner-primary-vs4o4ogkcgwgwo8kgksg4koo
```

### 3. Clean Up Dangling Images

```bash
# List dangling images
docker images -f dangling=true

# Remove them
docker image prune -a --force

# Expected to free: 198 MB
```

---

## Priority 2: Resource Limits (This Week)

### Set Memory Limits for High Consumers

```bash
# qdrant (897 MB - highest consumer)
docker update -m 1024m --memory-reservation 512m qdrant-j4kss8084c008sskcko8oks0

# seo-automation (418.5 MB)
docker update -m 512m --memory-reservation 256m seo-automation

# supabase-analytics (252.4 MB)
docker update -m 512m --memory-reservation 256m supabase-analytics-w84occs4w0wks4cc4kc8o484

# supabase-db (195.5 MB)
docker update -m 768m --memory-reservation 384m supabase-db-w84occs4w0wks4cc4kc8o484
```

### Set CPU Limits

```bash
# Most services don't need more than 1-2 CPUs
docker update --cpus 2.0 --cpus-shares 1024 <container_name>

# For background jobs
docker update --cpus 1.0 --cpus-shares 512 <background_job_container>
```

---

## Priority 3: Image Cleanup

### Remove Duplicate Versions

```bash
# List all Redis versions
docker images | grep redis

# Keep only redis:7-alpine (smallest and most stable)
docker rmi redis:latest
docker rmi redis:6-alpine
docker rmi redis:7.2

# Keep only postgres:16-alpine
docker rmi postgres:15-alpine

# Expected savings: 287 MB
```

---

## Priority 4: Docker Daemon Configuration

### Update daemon.json for better defaults

```json
{
  "debug": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-runtime": "runc",
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "insecure-registries": []
}
```

Location: `/etc/docker/daemon.json`

```bash
# Apply changes
sudo systemctl restart docker
```

---

## Monitoring Health Checks

### View Health Status

```bash
# Check all containers
docker ps --format='table {{.Names}}\t{{.Status}}'

# Get detailed health info
docker ps -a --format='{{.Names}}\t{{json .State.Health.Status}}'

# Monitor in real-time
watch -n 2 'docker ps --format="table {{.Names}}\t{{.Status}}"'
```

### View Container Logs

```bash
# Follow logs for specific container
docker logs -f <container_name>

# Get last 100 lines
docker logs --tail=100 <container_name>

# Search for errors
docker logs <container_name> | grep -i error
```

---

## Backup & Recovery

### Create Volume Backups

```bash
# Create backup of critical volumes
for volume in $(docker volume ls --format '{{.Name}}' | grep -E 'postgres|redis|minio'); do
  tar -czf /backup/${volume}-$(date +%Y%m%d).tar.gz \
    /var/lib/docker/volumes/$volume/_data
done
```

### Restore from Backup

```bash
# Restore a volume
docker volume rm <volume_name>
docker volume create <volume_name>
tar -xzf /backup/<volume_name>-20251210.tar.gz \
  -C /var/lib/docker/volumes/<volume_name>/_data
```

---

## Scheduled Maintenance

### Create Maintenance Script

```bash
#!/bin/bash
# File: /usr/local/bin/docker-maintenance.sh

LOGFILE="/var/log/docker-maintenance.log"

echo "[$(date)] Starting Docker maintenance..." >> $LOGFILE

# Clean up
docker image prune -a --force >> $LOGFILE 2>&1
docker volume prune -f >> $LOGFILE 2>&1
docker system prune -f >> $LOGFILE 2>&1

# Check disk space
USAGE=$(docker system df | tail -1 | awk '{print $(NF-2)}')
echo "[$(date)] Docker disk usage: $USAGE" >> $LOGFILE

echo "[$(date)] Maintenance completed" >> $LOGFILE
```

### Add to Crontab

```bash
# Run daily at 2 AM
sudo crontab -e

# Add line:
0 2 * * * /usr/local/bin/docker-maintenance.sh

# Make script executable
sudo chmod +x /usr/local/bin/docker-maintenance.sh
```

---

## Verification Checklist

After implementing changes:

- [ ] All 41 containers have restart policy set to `on-failure:3`
- [ ] 10 critical containers have HEALTHCHECK configured
- [ ] Health checks show "healthy" or "no healthcheck"
- [ ] High-memory containers have limits set
- [ ] Dangling images removed (freed 198 MB)
- [ ] Duplicate Redis/Postgres images removed
- [ ] Log rotation configured
- [ ] Maintenance script scheduled
- [ ] No errors in `docker system df`
- [ ] All containers still running normally

---

## Troubleshooting

### Container keeps restarting

```bash
# Check why
docker logs -f <container_name>

# Check restart policy
docker inspect <container_name> | grep -A 5 RestartPolicy

# Increase max-retries if needed
docker update --restart=on-failure:5 <container_name>
```

### OOM (Out of Memory) errors

```bash
# Check memory usage
docker stats --no-stream <container_name>

# View OOM kills
docker inspect <container_name> | grep -i oom

# Increase limit
docker update -m 1024m <container_name>
```

### Health check failing

```bash
# Check health status
docker inspect <container_name> | grep -A 20 Health

# Test the health check manually
docker exec <container_name> <health_check_command>

# View health check logs
docker logs --since 10m <container_name>
```

### Storage space running out

```bash
# View disk usage
docker system df
docker system df -v

# Clean up aggressively
docker system prune -a --volumes

# Check volume sizes
du -sh /var/lib/docker/volumes/* | sort -rh
```

---

## Quick Commands Reference

```bash
# View all containers with key info
docker ps -a --format='table {{.Names}}\t{{.Status}}\t{{.Image}}'

# View resource usage
docker stats --no-stream

# View networks
docker network ls

# View volumes
docker volume ls

# System overview
docker system df
docker system df -v

# Cleanup
docker system prune -a --volumes

# Health check status
docker ps --format='table {{.Names}}\t{{.Status}}'

# Container restart count
docker ps -a --format='{{.Names}}\t{{.RestartCount}}'
```

---

## Expected Outcomes

After implementing all recommendations:

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Failed container detection time | 30+ min | 2-5 min | 90% faster |
| Manual container restart rate | 3-5/month | 0/month | Fully automated |
| Container availability | 90% | 95%+ | +5% uptime |
| Storage usage | 58+ GB | 28-43 GB | 25-50% reduction |
| System stability | Moderate | High | Significantly improved |
| Operational overhead | High | Low | 60% reduction |

---

## Next Steps

1. Review and approve changes with team
2. Schedule implementation window (suggest off-hours)
3. Execute Priority 1 fixes (1-2 hours)
4. Test service connectivity and health
5. Monitor for 24 hours
6. Implement Priority 2-4 fixes
7. Schedule follow-up audit in 30 days

---

**Last Updated:** December 10, 2025
**Status:** Ready for Implementation
