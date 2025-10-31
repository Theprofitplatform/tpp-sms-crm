# Migration Guide - Unified Keyword Tracking System

This guide helps existing SerpBear and Keyword Service users migrate to the unified system.

---

## 🎯 Migration Overview

### What's Changing

**Before:**
```
SerpBear (standalone)     Keyword Service (standalone)
    ↓                              ↓
Separate databases         Separate databases
Manual data export         No integration
```

**After:**
```
        Unified System
              ↓
   Automatic Sync Every 5 min
         /          \
   SerpBear    Keyword Service
   (Legacy)       (Legacy)
```

### What Stays The Same

✅ **Your existing data is preserved**
✅ **Legacy systems continue to work**
✅ **No data loss during migration**
✅ **You can still use SerpBear directly**
✅ **Keyword Service API remains functional**

---

## 📋 Pre-Migration Checklist

Before starting migration:

- [ ] Backup all databases
  ```bash
  # Backup SerpBear database
  cp serpbear/data/serpbear.db serpbear/data/serpbear.db.backup

  # Backup Keyword Service database
  cp keyword-service/keywords.db keyword-service/keywords.db.backup
  ```

- [ ] Check current data volume
  ```bash
  # SerpBear keywords
  sqlite3 serpbear/data/serpbear.db "SELECT COUNT(*) FROM keyword;"

  # Keyword Service keywords
  sqlite3 keyword-service/keywords.db "SELECT COUNT(*) FROM keywords;"
  ```

- [ ] Verify disk space (need ~3x current database size)
  ```bash
  df -h .
  ```

- [ ] Test on development/staging first
- [ ] Document custom configurations
- [ ] Note any third-party integrations

---

## 🚀 Migration Steps

### Step 1: Install Unified System

```bash
# Clone or update repository
git pull origin main

# Install dependencies
npm install
cd keyword-service && pip install -r requirements.txt
cd ../dashboard && npm install
cd ..
```

### Step 2: Configure Environment

Create `.env` file:

```bash
cat > .env << 'EOF'
# Server
NODE_ENV=production
PORT=9000

# Database Paths (point to your existing databases)
DATABASE_URL=sqlite:./database/unified.db
SERPBEAR_DB_PATH=./serpbear/data/serpbear.db
KEYWORD_SERVICE_DB_PATH=./keyword-service/keywords.db

# Sync Configuration
SYNC_INTERVAL=*/5 * * * *  # Every 5 minutes
ENABLE_AUTO_SYNC=true

# Your existing API keys
SERPAPI_KEY=your_existing_key
GOOGLE_ADS_CLIENT_ID=your_existing_id
GOOGLE_ADS_CLIENT_SECRET=your_existing_secret
EOF
```

### Step 3: Initialize Unified Database

```bash
# Create unified database schema
node run-migration.js
```

This creates the new `database/unified.db` file without touching your existing databases.

### Step 4: Run Initial Sync

```bash
# Start dashboard server
node dashboard-server.js &

# Wait for server to start (5 seconds)
sleep 5

# Trigger initial sync
curl -X POST http://localhost:9000/api/v2/sync/trigger
```

Monitor sync progress:
```bash
# Watch sync status
watch -n 5 "curl -s http://localhost:9000/api/v2/sync/status | jq"
```

### Step 5: Verify Data Migration

```bash
# Check unified database
sqlite3 database/unified.db "SELECT COUNT(*) FROM unified_keywords;"

# Should match total from both legacy systems
# (SerpBear keywords + Keyword Service keywords)

# View sample data
sqlite3 database/unified.db "SELECT keyword, search_volume, position FROM unified_keywords LIMIT 10;"
```

### Step 6: Test Unified Dashboard

```bash
# Open dashboard
open http://localhost:9000

# Navigate to: Research > Unified Keywords
# Verify all your keywords are visible
```

### Step 7: Configure Auto-Sync

The sync service runs automatically every 5 minutes. To change the interval:

```bash
# Edit .env
SYNC_INTERVAL=*/10 * * * *  # Every 10 minutes
# or
SYNC_INTERVAL=0 */1 * * *   # Every hour
```

### Step 8: Production Deployment

```bash
# Option 1: PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Option 2: Docker
docker-compose up -d

# Option 3: Systemd
# See deployment/production/DEPLOYMENT_GUIDE.md
```

---

## 🔄 Data Mapping

### How Your Data Is Mapped

#### From SerpBear

| SerpBear Field | Unified Field | Notes |
|----------------|---------------|-------|
| keyword | keyword | Direct mapping |
| domain | domain_id | Linked to domains table |
| device | device | desktop/mobile |
| country | country | Country code |
| position | position | Current SERP position |
| lastResult | position_history | JSON array |
| URL | url | Ranking URL |
| lastUpdated | last_tracked_at | Timestamp |

#### From Keyword Service

| Keyword Service Field | Unified Field | Notes |
|-----------------------|---------------|-------|
| keyword | keyword | Direct mapping |
| search_volume | search_volume | Monthly searches |
| cpc | cpc | Cost per click |
| competition | difficulty | 0-100 scale |
| intent | intent | informational/commercial/etc |
| opportunity_score | opportunity_score | Calculated metric |
| project_id | research_project_id | Project association |

#### Deduplication Logic

When the same keyword exists in both systems:

1. **Matching criteria**: keyword text + domain (case-insensitive)
2. **Position data**: From SerpBear (source of truth)
3. **Research data**: From Keyword Service (source of truth)
4. **Result**: Single merged record with data from both sources

Example:
```
SerpBear:          "SEO tools" → position: 15, url: example.com/seo
Keyword Service:   "seo tools" → volume: 5400, difficulty: 35

Unified Result:    "seo tools" → position: 15, url: example.com/seo,
                                 volume: 5400, difficulty: 35
```

---

## 🔍 Verification Checklist

After migration, verify:

### Data Integrity

```bash
# Check record counts
echo "SerpBear:"
sqlite3 serpbear/data/serpbear.db "SELECT COUNT(*) FROM keyword;"

echo "Keyword Service:"
sqlite3 keyword-service/keywords.db "SELECT COUNT(*) FROM keywords;"

echo "Unified (should be >= both):"
sqlite3 database/unified.db "SELECT COUNT(*) FROM unified_keywords;"

# Check for orphaned records
sqlite3 database/unified.db "
  SELECT COUNT(*)
  FROM unified_keywords
  WHERE domain_id IS NULL AND research_project_id IS NULL;
"
# Should be 0
```

### Sync Status

```bash
curl http://localhost:9000/api/v2/sync/status | jq
```

Expected output:
```json
{
  "success": true,
  "status": {
    "isSyncing": false,
    "lastSyncTime": "2025-10-26T10:30:00Z",
    "stats": {
      "totalRecords": 1234,
      "totalErrors": 0
    }
  }
}
```

### API Functionality

```bash
# Test keywords endpoint
curl http://localhost:9000/api/v2/keywords?per_page=5 | jq

# Test stats endpoint
curl http://localhost:9000/api/v2/keywords/stats | jq

# Test research endpoint
curl http://localhost:9000/api/v2/research/projects | jq
```

---

## 🛠️ Troubleshooting

### Issue: Sync Fails

**Symptoms**: Sync status shows errors

**Solution**:
```bash
# Check logs
tail -f logs/sync-service.log

# Common issues:
# 1. Database locked
pkill -f dashboard-server
node dashboard-server.js

# 2. Insufficient permissions
chmod 666 database/*.db

# 3. Schema mismatch
node run-migration.js
```

### Issue: Missing Keywords

**Symptoms**: Some keywords don't appear in unified view

**Solution**:
```bash
# Check if keywords exist in source databases
sqlite3 serpbear/data/serpbear.db "SELECT * FROM keyword WHERE keyword LIKE '%missing%';"

# Trigger manual sync
curl -X POST http://localhost:9000/api/v2/sync/trigger

# Check sync errors
curl http://localhost:9000/api/v2/sync/status | jq '.status.stats.errors'
```

### Issue: Duplicate Keywords

**Symptoms**: Same keyword appears multiple times

**Solution**:
```bash
# Find duplicates
sqlite3 database/unified.db "
  SELECT keyword, COUNT(*)
  FROM unified_keywords
  GROUP BY LOWER(keyword), domain_id
  HAVING COUNT(*) > 1;
"

# Remove duplicates (keeps most recent)
sqlite3 database/unified.db "
  DELETE FROM unified_keywords
  WHERE id NOT IN (
    SELECT MAX(id)
    FROM unified_keywords
    GROUP BY LOWER(keyword), domain_id
  );
"
```

### Issue: Performance Degradation

**Symptoms**: Slow API responses after migration

**Solution**:
```bash
# Add indexes
sqlite3 database/unified.db "
  CREATE INDEX IF NOT EXISTS idx_keywords_domain ON unified_keywords(domain_id);
  CREATE INDEX IF NOT EXISTS idx_keywords_project ON unified_keywords(research_project_id);
  CREATE INDEX IF NOT EXISTS idx_keywords_opportunity ON unified_keywords(opportunity_score);
"

# Vacuum database
sqlite3 database/unified.db "VACUUM;"

# Analyze for query optimization
sqlite3 database/unified.db "ANALYZE;"
```

---

## 🔄 Rollback Plan

If you need to rollback:

### Quick Rollback

```bash
# Stop unified system
pm2 stop all  # or kill processes

# Restore backups
cp serpbear/data/serpbear.db.backup serpbear/data/serpbear.db
cp keyword-service/keywords.db.backup keyword-service/keywords.db

# Remove unified database
rm database/unified.db

# Restart legacy systems
cd serpbear && npm start
cd ../keyword-service && python api_server.py
```

### Partial Rollback

Keep unified system but revert data:

```bash
# Stop sync service
pm2 stop sync-service

# Drop unified keywords
sqlite3 database/unified.db "DELETE FROM unified_keywords;"

# Re-run initial sync
curl -X POST http://localhost:9000/api/v2/sync/trigger

# Restart sync service
pm2 restart sync-service
```

---

## 📊 Migration Scenarios

### Scenario 1: Fresh Start (No Existing Data)

```bash
# Skip migration, just setup
./scripts/setup-dev-environment.sh
./start-dev.sh

# Generate sample data for testing
node examples/generate-sample-data.js
```

### Scenario 2: SerpBear Only

```bash
# Point to SerpBear database
DATABASE_URL=sqlite:./database/unified.db
SERPBEAR_DB_PATH=./serpbear/data/serpbear.db
KEYWORD_SERVICE_DB_PATH=  # Leave empty

# Run migration
node run-migration.js
curl -X POST http://localhost:9000/api/v2/sync/trigger
```

### Scenario 3: Keyword Service Only

```bash
# Point to Keyword Service database
DATABASE_URL=sqlite:./database/unified.db
SERPBEAR_DB_PATH=  # Leave empty
KEYWORD_SERVICE_DB_PATH=./keyword-service/keywords.db

# Run migration
node run-migration.js
curl -X POST http://localhost:9000/api/v2/sync/trigger
```

### Scenario 4: Both Systems with Heavy Data

```bash
# For large databases (>10,000 keywords)

# 1. Disable auto-sync during initial load
ENABLE_AUTO_SYNC=false

# 2. Run initial sync in batches
# Modify src/services/keyword-sync-service.js
# Add LIMIT clause to queries

# 3. Monitor progress
tail -f logs/sync-service.log

# 4. Re-enable auto-sync after complete
ENABLE_AUTO_SYNC=true
```

---

## 🎓 Post-Migration Best Practices

### 1. Monitor Sync Health

```bash
# Add to cron
*/30 * * * * curl -s http://localhost:9000/api/v2/sync/status | jq '.status.stats.totalErrors' | grep -v '^0$' && echo "Sync errors detected!"
```

### 2. Regular Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/keyword-tracking"
DATE=$(date +%Y%m%d)

# Backup all databases
cp database/unified.db "$BACKUP_DIR/unified-$DATE.db"
cp serpbear/data/serpbear.db "$BACKUP_DIR/serpbear-$DATE.db"
cp keyword-service/keywords.db "$BACKUP_DIR/keyword-service-$DATE.db"

# Keep only last 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
```

### 3. Performance Monitoring

```bash
# Run weekly performance tests
node examples/performance-benchmark.js > reports/perf-$(date +%Y%m%d).txt
```

### 4. Data Quality Checks

```bash
# Weekly data quality report
sqlite3 database/unified.db << 'EOF'
.mode column
.headers on

SELECT 'Total Keywords' as Metric, COUNT(*) as Value FROM unified_keywords
UNION ALL
SELECT 'Tracking', COUNT(*) FROM unified_keywords WHERE is_tracking = 1
UNION ALL
SELECT 'With Position', COUNT(*) FROM unified_keywords WHERE position IS NOT NULL
UNION ALL
SELECT 'With Volume', COUNT(*) FROM unified_keywords WHERE search_volume > 0
UNION ALL
SELECT 'High Opportunity', COUNT(*) FROM unified_keywords WHERE opportunity_score >= 70;
EOF
```

---

## 📞 Support

### Migration Issues

If you encounter issues during migration:

1. Check logs: `tail -f logs/*.log`
2. Run health check: `./scripts/health-check.sh`
3. Review this guide's troubleshooting section
4. Check GitHub issues
5. Restore from backup if needed

### Reporting Problems

When reporting migration issues, include:

- Migration step where it failed
- Error messages from logs
- Database sizes (row counts)
- Environment (OS, Node version, Python version)
- Output of health check script

---

## ✅ Migration Complete Checklist

After migration:

- [ ] All keywords visible in unified dashboard
- [ ] Sync status shows no errors
- [ ] API endpoints responding correctly
- [ ] Legacy systems still accessible
- [ ] Backups created and verified
- [ ] Auto-sync running every 5 minutes
- [ ] Performance is acceptable (<500ms API responses)
- [ ] Team trained on new interface
- [ ] Documentation updated with your customizations

---

**Migration Version**: 1.0
**Last Updated**: 2025-10-26
**Estimated Time**: 30-60 minutes
**Difficulty**: Medium

---

**Ready to migrate?** Start with Step 1 and follow the checklist! 🚀
