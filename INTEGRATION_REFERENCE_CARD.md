# Keyword Integration - Quick Reference Card

One-page reference for the unified keyword tracking system integration.

---

## System Components

| Component | Port | Technology | Purpose |
|-----------|------|------------|---------|
| Dashboard Server | 9000 | Node.js/Express | Main API & UI host |
| Keyword Service | 5000 | Python/Flask | Research pipeline |
| Sync Service | - | Node.js | Bidirectional sync |
| SerpBear DB | - | SQLite | Legacy position data (read-only) |
| Keyword Service DB | - | SQLite | Research data (read-only) |
| Unified DB | - | SQLite/PostgreSQL | Single source of truth |

---

## Key Databases

### Legacy Systems (Read-Only)

**SerpBear**: `/serpbear/data/database.sqlite`
- Tables: `domain`, `keyword`
- Used for: Position tracking history
- Status: Read-only after migration

**Keyword Service**: `/keyword-service/keyword_research.db`
- Tables: `projects`, `keywords`, `topics`, `page_groups`, `serp_snapshots`
- Used for: Research data
- Status: Read-only after migration

### Unified System (Read-Write)

**Unified DB**: `/data/unified-keywords.db`
- Tables: `unified_domains`, `unified_keywords`, `research_projects`, `keyword_topics`, `keyword_page_groups`, `serp_snapshots`, `sync_status`, `audit_logs`
- Used for: All operations after migration
- Status: Primary database

---

## API Endpoints (v2)

### Domains
```
GET    /api/v2/domains
POST   /api/v2/domains
GET    /api/v2/domains/:id
PUT    /api/v2/domains/:id
DELETE /api/v2/domains/:id
```

### Keywords
```
GET    /api/v2/domains/:domainId/keywords?intent=&tracked=&sort=opportunity
POST   /api/v2/domains/:domainId/keywords
GET    /api/v2/keywords/:id
PUT    /api/v2/keywords/:id
DELETE /api/v2/keywords/:id
POST   /api/v2/keywords/bulk-action
POST   /api/v2/keywords/enrich
```

### Research
```
GET    /api/v2/research/projects
POST   /api/v2/research/projects
GET    /api/v2/research/projects/:id
GET    /api/v2/research/projects/:id/keywords
POST   /api/v2/research/projects/:id/track-keywords
```

### Topics & Page Groups
```
GET    /api/v2/domains/:domainId/topics
GET    /api/v2/topics/:id/keywords
GET    /api/v2/page-groups/:id/brief
```

### Tracking
```
POST   /api/v2/tracking/refresh
GET    /api/v2/keywords/:id/history
GET    /api/v2/keywords/:id/serp
```

### Sync
```
GET    /api/v2/sync/status
POST   /api/v2/sync/trigger
GET    /api/v2/sync/conflicts
```

---

## Database Schema (Key Tables)

### unified_keywords (Core Table)

```sql
CREATE TABLE unified_keywords (
  id INTEGER PRIMARY KEY,
  keyword VARCHAR(500),
  domain_id INTEGER,

  -- Position Tracking (from SerpBear)
  current_position INTEGER,
  position_history TEXT, -- JSON
  last_position_check DATETIME,

  -- Research Metrics (from Keyword Service)
  monthly_volume INTEGER,
  difficulty_score FLOAT,
  opportunity_score FLOAT,
  intent VARCHAR(50),

  -- Clustering
  topic_cluster_id INTEGER,
  page_group_id INTEGER,

  -- Tracking Settings
  is_tracked BOOLEAN,
  track_frequency VARCHAR(20),

  -- Metadata
  keyword_source VARCHAR(100),
  tags TEXT, -- JSON
  created_at DATETIME,
  updated_at DATETIME
);
```

---

## Common Commands

### Start Services

```bash
# Terminal 1: Dashboard
node dashboard-server.js

# Terminal 2: Keyword Service
cd keyword-service && python api_server.py

# Terminal 3: Sync Service
node src/services/keyword-sync-service.js
```

### Database Queries

```bash
# Check sync status
sqlite3 data/unified-keywords.db "
  SELECT COUNT(*) as total_keywords,
         SUM(CASE WHEN is_tracked = 1 THEN 1 ELSE 0 END) as tracked,
         SUM(CASE WHEN opportunity_score IS NOT NULL THEN 1 ELSE 0 END) as researched
  FROM unified_keywords;
"

# Top opportunities
sqlite3 data/unified-keywords.db "
  SELECT keyword, opportunity_score, difficulty_score, monthly_volume
  FROM unified_keywords
  WHERE is_tracked = 0 AND opportunity_score > 70
  ORDER BY opportunity_score DESC
  LIMIT 20;
"

# Recent sync operations
sqlite3 data/unified-keywords.db "
  SELECT source_system, entity_type, sync_status, COUNT(*) as count
  FROM sync_status
  WHERE last_sync_at > datetime('now', '-1 hour')
  GROUP BY source_system, entity_type, sync_status;
"
```

### Migration Commands

```bash
# Backup databases
cp serpbear/data/database.sqlite backups/serpbear-$(date +%Y%m%d).sqlite
cp data/seo-automation.db backups/keyword-service-$(date +%Y%m%d).db

# Create unified database
sqlite3 data/unified-keywords.db < database/unified-schema.sql

# Run migrations
node database/migrations/001-create-unified-schema.js
node database/migrations/002-migrate-serpbear-data.js
node database/migrations/003-migrate-keyword-service-data.js

# Validate
node scripts/validate-sync.js
```

---

## Key Workflows

### 1. Research → Track

```javascript
// User action: Track research keywords
POST /api/v2/research/projects/123/track-keywords
{
  "keyword_ids": [501, 502, 503],
  "domain_id": 5,
  "settings": { "device": "desktop", "country": "US" }
}

// System updates:
UPDATE unified_keywords SET
  is_tracked = TRUE,
  domain_id = 5,
  first_tracked_at = NOW()
WHERE id IN (501, 502, 503)

// Queue position checks
// Start daily tracking
```

### 2. Enrich Tracked Keywords

```javascript
// User action: Enrich keywords with research data
POST /api/v2/keywords/enrich
{
  "keyword_ids": [101, 102, 103]
}

// System calls Python service:
POST http://localhost:5000/api/enrich
{ "keyword": "wordpress seo", "geo": "US" }

// Updates unified_keywords:
UPDATE unified_keywords SET
  difficulty_score = 58,
  opportunity_score = 74,
  intent = 'informational',
  monthly_volume = 22000
WHERE id = 101
```

### 3. Auto-Sync (Every 5 min)

```javascript
// Sync service checks for changes
SELECT * FROM keyword
WHERE lastUpdated > last_sync_timestamp

// For each changed keyword:
- Find/create in unified_keywords
- Merge position data from SerpBear
- Preserve research data from Keyword Service
- Record in sync_status
```

---

## Data Flow Rules

| Data Type | Source of Truth | Sync Direction | Notes |
|-----------|----------------|----------------|-------|
| Position | SerpBear | SerpBear → Unified | Always overwrite |
| History | SerpBear | SerpBear → Unified | Merge with existing |
| Volume | Keyword Service | KS → Unified | Only if newer |
| Difficulty | Keyword Service | KS → Unified | Only if newer |
| Opportunity | Keyword Service | KS → Unified | Only if newer |
| Intent | Keyword Service | KS → Unified | Only if newer |
| Tags | User | Bidirectional | Merge arrays |
| Sticky | SerpBear | SerpBear → Unified | Keep SerpBear |
| Tracking Status | User | Bidirectional | User action wins |

---

## Troubleshooting

### Sync Not Working

```bash
# Check sync service
pm2 logs keyword-sync

# Manual sync
node src/services/keyword-sync-service.js --force

# Check sync status
curl http://localhost:9000/api/v2/sync/status
```

### Missing Keywords

```bash
# Verify in source DB
sqlite3 serpbear/data/database.sqlite "SELECT * FROM keyword WHERE keyword='test';"

# Check sync record
sqlite3 data/unified-keywords.db "SELECT * FROM sync_status WHERE source_id = X;"

# Re-sync specific keyword
curl -X POST http://localhost:9000/api/v2/sync/trigger \
  -d '{"source": "serpbear", "entity_type": "keyword", "entity_id": 123}'
```

### Performance Issues

```bash
# Check database size
ls -lh data/unified-keywords.db

# Analyze queries
sqlite3 data/unified-keywords.db "EXPLAIN QUERY PLAN SELECT * FROM unified_keywords WHERE domain_id = 1;"

# Rebuild indexes
sqlite3 data/unified-keywords.db "REINDEX;"

# Vacuum database
sqlite3 data/unified-keywords.db "VACUUM;"
```

---

## Testing Checklist

- [ ] Sync service runs without errors
- [ ] Keywords appear in unified database
- [ ] Position data preserved from SerpBear
- [ ] Research data preserved from Keyword Service
- [ ] Research → Tracking workflow works
- [ ] Enrich keywords workflow works
- [ ] API returns correct data
- [ ] Dashboard displays unified keywords
- [ ] Bulk actions work
- [ ] No data loss during sync
- [ ] Conflicts resolved correctly
- [ ] Performance acceptable (< 200ms API response)

---

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:9000/health
curl http://localhost:5000/health

# Sync health
curl http://localhost:9000/api/v2/sync/status
```

### Metrics to Monitor

- Sync success rate (target: >99%)
- API response time (target: <200ms p95)
- Database query time (target: <50ms p95)
- Queue depth (target: <100)
- Error rate (target: <0.1%)
- Uptime (target: >99.9%)

### Logs to Check

```bash
# Application logs
pm2 logs dashboard-server
pm2 logs keyword-service
pm2 logs keyword-sync

# Sync logs
tail -f logs/sync-service.log

# Error logs
tail -f logs/error.log
```

---

## Production Deployment

### Pre-Deployment

1. Backup all databases
2. Test migration on staging
3. Prepare rollback plan
4. Set up monitoring
5. Schedule maintenance window

### Deployment Steps

1. Stop services: `pm2 stop all`
2. Backup databases
3. Run migrations
4. Validate data
5. Start sync service
6. Start main services
7. Verify health checks
8. Monitor for 24 hours

### Post-Deployment

- Monitor error rates
- Check sync status every hour
- Validate user workflows
- Address any issues immediately
- Document lessons learned

---

## File Locations

```
/mnt/c/Users/abhis/projects/seo expert/
├── database/
│   ├── unified-schema.sql
│   ├── unified-db.js
│   └── models/typescript/
├── src/
│   ├── services/keyword-sync-service.js
│   └── api/v2/
├── dashboard-server.js
├── serpbear/
│   └── data/database.sqlite
├── keyword-service/
│   ├── api_server.py
│   └── keyword_research.db
└── data/
    └── unified-keywords.db
```

---

## Support Resources

- **Full Documentation**: `/COMPREHENSIVE_KEYWORD_INTEGRATION_PLAN.md`
- **Quick Start**: `/INTEGRATION_QUICK_START.md`
- **Architecture**: `/INTEGRATION_ARCHITECTURE_DIAGRAM.md`
- **Executive Summary**: `/KEYWORD_INTEGRATION_EXECUTIVE_SUMMARY.md`

---

**Last Updated:** October 26, 2025
**Version:** 1.0
**Maintained by:** Development Team
