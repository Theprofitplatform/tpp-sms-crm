# Keyword Integration Quick Start Guide

This is a condensed, actionable guide to implement the keyword integration. For full details, see `COMPREHENSIVE_KEYWORD_INTEGRATION_PLAN.md`.

---

## Phase 1: Setup Unified Database (Day 1-2)

### 1. Create Unified Database Schema

```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
mkdir -p database/models/{typescript,python}
mkdir -p database/migrations
```

Copy the unified schema from the comprehensive plan into:
- `/database/unified-schema.sql`

### 2. Install Dependencies

```bash
# Node.js dependencies
npm install sequelize sequelize-typescript sqlite3

# Python dependencies (in keyword-service)
cd keyword-service
pip install sqlalchemy
```

### 3. Run Initial Migration

```bash
# Create the unified database
sqlite3 data/unified-keywords.db < database/unified-schema.sql
```

---

## Phase 2: Implement Sync Service (Day 3-5)

### 1. Create Sync Service

File: `/src/services/keyword-sync-service.js`

Core responsibilities:
- Sync domains: SerpBear → Unified
- Sync keywords: SerpBear → Unified (position data)
- Sync research: Keyword Service → Unified (metrics)
- Handle conflicts

### 2. Test Sync

```bash
# Manual sync test
node src/services/keyword-sync-service.js --test

# Check sync status
sqlite3 data/unified-keywords.db "SELECT COUNT(*) FROM unified_keywords;"
```

---

## Phase 3: Create Unified API (Day 6-8)

### 1. Implement API Endpoints

File: `/src/api/v2/keywords.js`

Key endpoints:
```javascript
GET    /api/v2/domains/:id/keywords
POST   /api/v2/domains/:id/keywords
GET    /api/v2/keywords/:id
PUT    /api/v2/keywords/:id
POST   /api/v2/keywords/bulk-action
```

### 2. Add to Dashboard Server

Update `dashboard-server.js`:

```javascript
import keywordsRouter from './src/api/v2/keywords.js';
import domainsRouter from './src/api/v2/domains.js';
import researchRouter from './src/api/v2/research.js';

app.use('/api/v2', keywordsRouter);
app.use('/api/v2', domainsRouter);
app.use('/api/v2', researchRouter);
```

---

## Phase 4: Key Integration Workflows

### Workflow 1: Research → Tracking

**Endpoint:** `POST /api/v2/research/projects/:id/track-keywords`

**Request:**
```json
{
  "keyword_ids": [101, 102, 103],
  "domain_id": 5,
  "settings": {
    "device": "desktop",
    "country": "US",
    "frequency": "daily"
  }
}
```

**Implementation:**
```javascript
async function trackResearchKeywords(req, res) {
  const { keyword_ids, domain_id, settings } = req.body;

  // Update keywords
  await Keyword.update({
    is_tracked: true,
    domain_id,
    device: settings.device || 'desktop',
    country: settings.country || 'US',
    track_frequency: settings.frequency || 'daily',
    first_tracked_at: new Date()
  }, {
    where: { id: keyword_ids }
  });

  // Queue position checks
  await queuePositionChecks(keyword_ids);

  return res.json({ success: true, tracked: keyword_ids.length });
}
```

---

### Workflow 2: Enrich Tracked Keywords

**Endpoint:** `POST /api/v2/keywords/enrich`

**Request:**
```json
{
  "keyword_ids": [1, 2, 3]
}
```

**Implementation:**
```javascript
async function enrichKeywords(req, res) {
  const { keyword_ids } = req.body;

  for (const id of keyword_ids) {
    const keyword = await Keyword.findByPk(id);

    // Call Python service for research
    const research = await axios.post('http://localhost:5000/api/enrich', {
      keyword: keyword.keyword,
      geo: keyword.country
    });

    // Update with research data
    await keyword.update({
      difficulty_score: research.data.difficulty,
      opportunity_score: research.data.opportunity,
      intent: research.data.intent,
      monthly_volume: research.data.volume,
      serp_features: JSON.stringify(research.data.serp_features)
    });
  }

  return res.json({ success: true, enriched: keyword_ids.length });
}
```

---

## Phase 5: Dashboard UI Updates (Day 9-12)

### 1. Create Unified Keyword Table Component

File: `/dashboard/src/components/UnifiedKeywordTable.tsx`

Features:
- Display both tracked and research keywords
- Filter by intent, volume, difficulty, opportunity
- Bulk actions: track, enrich, tag, delete
- Sort by opportunity, position, volume
- Track status indicator

### 2. Add Research Dashboard

File: `/dashboard/src/pages/KeywordOpportunities.tsx`

Shows:
- Top opportunities (high opportunity, not tracked)
- Suggested keywords to track
- Topic clusters
- Content briefs

---

## Testing Checklist

### Unit Tests

```bash
npm test tests/unit/sync-service.test.js
npm test tests/unit/api-keywords.test.js
```

### Integration Tests

```bash
npm test tests/integration/research-to-tracking.test.js
npm test tests/integration/sync-workflow.test.js
```

### Manual Testing

- [ ] Sync service runs without errors
- [ ] Keywords appear in unified database
- [ ] Research → Tracking works
- [ ] Position updates still work
- [ ] Enrichment works
- [ ] API returns correct data

---

## Common Commands

### Start Services

```bash
# Terminal 1: Dashboard server
node dashboard-server.js

# Terminal 2: Keyword service
cd keyword-service
python api_server.py

# Terminal 3: Sync service
node src/services/keyword-sync-service.js
```

### Check Sync Status

```bash
# View sync logs
sqlite3 data/unified-keywords.db "SELECT * FROM sync_status ORDER BY last_sync_at DESC LIMIT 10;"

# Count synced keywords
sqlite3 data/unified-keywords.db "SELECT COUNT(*) FROM unified_keywords;"

# Check tracked keywords
sqlite3 data/unified-keywords.db "SELECT COUNT(*) FROM unified_keywords WHERE is_tracked = 1;"
```

### Database Queries

```bash
# Top opportunities
sqlite3 data/unified-keywords.db "
  SELECT keyword, opportunity_score, difficulty_score, monthly_volume, is_tracked
  FROM unified_keywords
  WHERE opportunity_score IS NOT NULL
  ORDER BY opportunity_score DESC
  LIMIT 20;
"

# Tracked keywords with positions
sqlite3 data/unified-keywords.db "
  SELECT keyword, current_position, monthly_volume, opportunity_score
  FROM unified_keywords
  WHERE is_tracked = 1
  ORDER BY opportunity_score DESC
  LIMIT 20;
"
```

---

## Deployment Steps

### Production Deployment

1. **Backup databases**
   ```bash
   cp serpbear/data/database.sqlite backups/serpbear-$(date +%Y%m%d).sqlite
   cp data/seo-automation.db backups/keyword-service-$(date +%Y%m%d).db
   ```

2. **Run migrations**
   ```bash
   node database/migrations/001-create-unified-schema.js
   node database/migrations/002-migrate-serpbear-data.js
   node database/migrations/003-migrate-keyword-service-data.js
   ```

3. **Validate migration**
   ```bash
   node scripts/validate-sync.js
   ```

4. **Start sync service**
   ```bash
   pm2 start src/services/keyword-sync-service.js --name keyword-sync
   pm2 save
   ```

5. **Monitor**
   ```bash
   pm2 logs keyword-sync
   ```

---

## Troubleshooting

### Sync Not Working

```bash
# Check sync service logs
pm2 logs keyword-sync

# Check database connection
sqlite3 data/unified-keywords.db "SELECT 1;"

# Manually trigger sync
node src/services/keyword-sync-service.js --force
```

### Missing Keywords

```bash
# Check if keyword exists in source
sqlite3 serpbear/data/database.sqlite "SELECT * FROM keyword WHERE keyword='your keyword';"

# Check sync status
sqlite3 data/unified-keywords.db "SELECT * FROM sync_status WHERE source_id = X;"
```

### API Errors

```bash
# Check API endpoint
curl http://localhost:9000/api/v2/domains/1/keywords

# Check API logs
pm2 logs dashboard-server
```

---

## Next Steps After Integration

1. **Auto-tracking Suggestions**
   - Implement ML model to suggest keywords to track
   - Based on opportunity score + domain relevance

2. **Content Brief Integration**
   - Link tracked keywords to content briefs
   - Monitor rankings for published content

3. **Advanced Analytics**
   - Opportunity vs. position correlation
   - Difficulty vs. actual ranking data
   - ROI tracking for tracked keywords

4. **Automation**
   - Auto-enrich new tracked keywords
   - Auto-suggest high-opportunity keywords
   - Alert on ranking changes for high-opportunity keywords

---

## File Locations Reference

```
/mnt/c/Users/abhis/projects/seo expert/
│
├── database/
│   ├── unified-schema.sql                    # Database schema
│   ├── unified-db.js                         # DB connection
│   ├── models/typescript/Keyword.ts          # Keyword model
│   └── migrations/                           # Migration scripts
│
├── src/
│   ├── services/keyword-sync-service.js      # Main sync service
│   └── api/v2/keywords.js                    # Unified API endpoints
│
├── dashboard-server.js                       # Main server (add API routes here)
│
├── serpbear/                                 # SerpBear (read-only)
│   └── data/database.sqlite
│
└── keyword-service/                          # Python service (existing)
    └── api_server.py
```

---

## Support & Resources

- Full plan: `/COMPREHENSIVE_KEYWORD_INTEGRATION_PLAN.md`
- SerpBear docs: `/serpbear/README.md`
- Keyword Service docs: `/keyword-service/CLAUDE.md`
- Dashboard docs: `/dashboard/README.md`
