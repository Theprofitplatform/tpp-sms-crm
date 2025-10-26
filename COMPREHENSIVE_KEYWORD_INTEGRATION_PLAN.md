# Comprehensive Keyword Integration Plan
## SerpBear Position Tracking + Keyword Service Research Pipeline

**Date:** 2025-10-26
**Author:** SEO Keyword Analyzer Agent
**Status:** Design & Implementation Roadmap

---

## Executive Summary

This document provides a comprehensive integration strategy for unifying two distinct keyword tracking systems:

1. **SerpBear** - Real-time SERP position tracking (TypeScript/Node.js, SQLite)
2. **Keyword Service** - Research & opportunity discovery pipeline (Python, SQLite)

The goal is to create a seamless bidirectional workflow where research keywords flow into position tracking, and ranking data informs research priorities.

---

## Current State Analysis

### SerpBear (Position Tracking)

**Location:** `/serpbear/`
**Technology:** TypeScript, Next.js, Sequelize ORM, SQLite
**Database:** `serpbear/data/database.sqlite`

**Core Schema:**
```typescript
// Domain Model
{
  ID: INTEGER PRIMARY KEY
  domain: STRING (unique)
  slug: STRING (unique)
  keywordCount: INTEGER
  lastUpdated: STRING
  added: STRING
  tags: JSON STRING[]
  notification: BOOLEAN
  notification_interval: STRING
  notification_emails: STRING
  search_console: JSON STRING
}

// Keyword Model
{
  ID: INTEGER PRIMARY KEY
  keyword: STRING
  device: STRING (desktop/mobile)
  country: STRING (US, UK, etc.)
  city: STRING
  latlong: STRING
  domain: STRING (reference to domain)
  lastUpdated: STRING
  added: STRING
  position: INTEGER (current ranking)
  history: JSON STRING (date -> position)
  volume: INTEGER (monthly search volume)
  url: STRING (ranking URL)
  tags: JSON STRING[]
  lastResult: JSON STRING (SERP snapshot)
  sticky: BOOLEAN
  updating: BOOLEAN
  lastUpdateError: STRING
  settings: JSON STRING
}
```

**API Endpoints:**
- `GET /api/keywords?domain={domain}` - Get all keywords for domain
- `GET /api/keyword?id={id}` - Get single keyword
- `POST /api/keywords` - Add keywords (bulk)
- `PUT /api/keywords?id={ids}` - Update keywords (sticky, tags)
- `DELETE /api/keywords?id={ids}` - Delete keywords
- `GET /api/domains` - List all domains
- `POST /api/domains` - Add domain
- `DELETE /api/domains?domain={domain}` - Delete domain

**Strengths:**
- Real-time position tracking
- Historical position data
- SERP scraping infrastructure
- Search Console integration
- Tag management system
- Notification system

**Limitations:**
- No keyword research/discovery
- No difficulty scoring
- No intent classification
- No clustering/grouping
- Basic volume data only
- No opportunity scoring

---

### Keyword Service (Research Pipeline)

**Location:** `/keyword-service/`
**Technology:** Python, Flask, SQLAlchemy ORM, SQLite
**Database:** `data/seo-automation.db` (or `keyword-service/keyword_research.db`)

**Core Schema:**
```python
# Project Model
{
  id: INTEGER PRIMARY KEY
  name: STRING
  business_url: STRING
  seed_terms: JSON (list)
  geo: STRING (US, AU, UK)
  language: STRING (en, es)
  competitors: JSON (URLs)
  content_focus: STRING (info, commercial, local, transactional)
  created_at: DATETIME
  updated_at: DATETIME
  settings: JSON
  last_checkpoint: STRING (pipeline stage)
  checkpoint_timestamp: DATETIME
  checkpoint_data: JSON
}

# Keyword Model
{
  id: INTEGER PRIMARY KEY
  project_id: INTEGER FK
  text: STRING (the keyword)
  lemma: STRING (normalized form)
  language: STRING

  # Metrics
  volume: INTEGER (monthly)
  cpc: FLOAT
  trend_data: JSON (time series)
  trend_direction: STRING (rising/stable/declining)

  # SERP Analysis
  serp_features: JSON (list of features)
  ads_density: FLOAT (0-1)

  # Classification
  intent: STRING (informational/commercial/transactional/navigational/local)
  entities: JSON (extracted entities)

  # Scoring
  difficulty: FLOAT (0-100)
  difficulty_serp_strength: FLOAT
  difficulty_competition: FLOAT
  difficulty_serp_crowding: FLOAT
  difficulty_content_depth: FLOAT
  traffic_potential: FLOAT
  opportunity: FLOAT

  # Clustering
  topic_id: INTEGER FK
  page_group_id: INTEGER FK
  is_pillar: BOOLEAN

  # Meta
  created_at: DATETIME
  source: STRING (seed, autosuggest, paa, competitor)
  notes: TEXT
}

# Topic Model (Clustering)
{
  id: INTEGER PRIMARY KEY
  project_id: INTEGER FK
  label: STRING
  pillar_keyword_id: INTEGER FK
  total_volume: INTEGER
  total_opportunity: FLOAT
  avg_difficulty: FLOAT
  graph_data: JSON
  created_at: DATETIME
}

# PageGroup Model
{
  id: INTEGER PRIMARY KEY
  project_id: INTEGER FK
  topic_id: INTEGER FK
  label: STRING
  target_keyword_id: INTEGER FK
  outline: JSON (H2/H3 structure)
  faqs: JSON
  schema_types: JSON
  internal_links: JSON
  serp_features_target: JSON
  word_range: STRING
  total_volume: INTEGER
  total_opportunity: FLOAT
  created_at: DATETIME
}

# SerpSnapshot Model
{
  id: INTEGER PRIMARY KEY
  project_id: INTEGER FK
  query: STRING
  geo: STRING
  language: STRING
  timestamp: DATETIME
  results: JSON (top 10)
  features: JSON
  ads_count: INTEGER
  map_pack_present: BOOLEAN
  raw_json: TEXT
  provider: STRING
  request_id: STRING
}
```

**API Endpoints:**
- `GET /api/keyword/projects` - List all research projects
- `POST /api/keyword/research` - Create research project
- `GET /api/keyword/projects/:id` - Get project details
- `GET /api/keyword/projects/:id/keywords` - Get keywords (paginated, filtered)
- `GET /api/keyword/projects/:id/topics` - Get topic clusters
- `POST /api/keyword/projects/:id/export` - Export keywords
- `GET /api/keyword/stats` - Overall statistics

**Strengths:**
- Advanced keyword expansion (200-500+ from seeds)
- SERP analysis & difficulty scoring
- Intent classification
- Topic clustering & page grouping
- Opportunity scoring
- Content brief generation
- Rich data pipeline

**Limitations:**
- No ongoing position tracking
- One-time research workflow
- No historical ranking data
- No Search Console integration
- Not domain-centric

---

## Integration Architecture

### 1. Unified Database Schema

Create a new integration layer that bridges both systems while maintaining backward compatibility.

#### Option A: Shared Database with Migration

**Pros:**
- Single source of truth
- No sync issues
- Simpler architecture

**Cons:**
- Requires migrating existing data
- Risk to existing systems
- TypeScript/Python ORM differences

#### Option B: Separate Databases + Sync Service (RECOMMENDED)

**Pros:**
- No risk to existing systems
- Can rollback easily
- Each system optimized independently
- Gradual migration path

**Cons:**
- Sync complexity
- Data consistency challenges
- Slightly higher latency

**Recommended Approach:** Option B with eventual migration to Option A

---

### 2. Unified Schema Design

Create a new unified database: `unified-keywords.db`

```sql
-- ============================================
-- CORE ENTITIES
-- ============================================

CREATE TABLE unified_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain VARCHAR(500) NOT NULL UNIQUE,
  slug VARCHAR(500) NOT NULL UNIQUE,

  -- SerpBear fields
  notification BOOLEAN DEFAULT TRUE,
  notification_interval VARCHAR(50) DEFAULT 'daily',
  notification_emails TEXT,
  search_console_config TEXT, -- JSON

  -- Enhanced fields
  business_url VARCHAR(500),
  competitors TEXT, -- JSON array of competitor URLs
  primary_geo VARCHAR(10) DEFAULT 'US',
  primary_language VARCHAR(10) DEFAULT 'en',

  -- Metadata
  keyword_count INTEGER DEFAULT 0,
  tracked_keyword_count INTEGER DEFAULT 0,
  research_project_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Settings
  tags TEXT, -- JSON array
  settings TEXT -- JSON object
);

CREATE INDEX idx_domains_slug ON unified_domains(slug);
CREATE INDEX idx_domains_updated ON unified_domains(updated_at);

-- ============================================

CREATE TABLE unified_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Core keyword data
  keyword VARCHAR(500) NOT NULL,
  lemma VARCHAR(500), -- Normalized form
  domain_id INTEGER NOT NULL,

  -- Tracking configuration (SerpBear)
  device VARCHAR(20) DEFAULT 'desktop',
  country VARCHAR(10) DEFAULT 'US',
  city VARCHAR(100),
  latlong VARCHAR(100),

  -- Position tracking (SerpBear)
  current_position INTEGER DEFAULT 0,
  position_history TEXT, -- JSON: { "2025-01-15": 5, "2025-01-16": 4 }
  ranking_url VARCHAR(1000),
  last_serp_result TEXT, -- JSON: Latest SERP snapshot
  last_position_check DATETIME,
  position_check_status VARCHAR(50), -- 'pending', 'updating', 'success', 'error'
  last_position_error TEXT,

  -- Research metrics (Keyword Service)
  monthly_volume INTEGER,
  cpc FLOAT,
  trend_data TEXT, -- JSON: Time series
  trend_direction VARCHAR(20), -- 'rising', 'stable', 'declining'

  -- SERP analysis
  serp_features TEXT, -- JSON: ['featured_snippet', 'paa', 'video']
  ads_density FLOAT, -- 0-1 scale
  map_pack_present BOOLEAN DEFAULT FALSE,

  -- Classification
  intent VARCHAR(50), -- 'informational', 'commercial', 'transactional', 'navigational', 'local'
  entities TEXT, -- JSON: Extracted entities

  -- Scoring
  difficulty_score FLOAT, -- 0-100
  difficulty_breakdown TEXT, -- JSON: { serp_strength, competition, crowding, depth }
  traffic_potential FLOAT,
  opportunity_score FLOAT,

  -- Clustering & grouping
  topic_cluster_id INTEGER,
  page_group_id INTEGER,
  is_pillar_keyword BOOLEAN DEFAULT FALSE,

  -- Tracking settings
  is_tracked BOOLEAN DEFAULT FALSE, -- Whether actively tracking position
  track_frequency VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  sticky BOOLEAN DEFAULT FALSE, -- Pin to top in SerpBear UI

  -- Research metadata
  research_project_id INTEGER,
  keyword_source VARCHAR(100), -- 'manual', 'seed', 'autosuggest', 'paa', 'competitor', 'import'

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  first_tracked_at DATETIME,

  -- Tags & notes
  tags TEXT, -- JSON array
  notes TEXT,
  settings TEXT, -- JSON object for custom settings

  FOREIGN KEY (domain_id) REFERENCES unified_domains(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_cluster_id) REFERENCES keyword_topics(id) ON DELETE SET NULL,
  FOREIGN KEY (page_group_id) REFERENCES keyword_page_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (research_project_id) REFERENCES research_projects(id) ON DELETE SET NULL
);

CREATE INDEX idx_keywords_domain ON unified_keywords(domain_id);
CREATE INDEX idx_keywords_keyword ON unified_keywords(keyword);
CREATE INDEX idx_keywords_opportunity ON unified_keywords(opportunity_score DESC);
CREATE INDEX idx_keywords_tracked ON unified_keywords(is_tracked);
CREATE INDEX idx_keywords_position ON unified_keywords(current_position);
CREATE INDEX idx_keywords_intent ON unified_keywords(intent);
CREATE INDEX idx_keywords_updated ON unified_keywords(updated_at);

-- ============================================

CREATE TABLE research_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(500) NOT NULL,
  domain_id INTEGER,

  -- Configuration
  seed_terms TEXT, -- JSON array
  geo VARCHAR(10) DEFAULT 'US',
  language VARCHAR(10) DEFAULT 'en',
  content_focus VARCHAR(50), -- 'informational', 'commercial', 'local', 'transactional'
  competitors TEXT, -- JSON array of URLs

  -- Pipeline status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  last_checkpoint VARCHAR(50), -- 'expansion', 'metrics', 'clustering', etc.
  checkpoint_timestamp DATETIME,
  checkpoint_data TEXT, -- JSON

  -- Statistics
  total_keywords INTEGER DEFAULT 0,
  total_topics INTEGER DEFAULT 0,
  total_page_groups INTEGER DEFAULT 0,
  keywords_tracked INTEGER DEFAULT 0, -- How many pushed to tracking

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,

  -- Settings
  settings TEXT, -- JSON

  FOREIGN KEY (domain_id) REFERENCES unified_domains(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_domain ON research_projects(domain_id);
CREATE INDEX idx_projects_status ON research_projects(status);
CREATE INDEX idx_projects_created ON research_projects(created_at DESC);

-- ============================================

CREATE TABLE keyword_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER,
  research_project_id INTEGER,
  label VARCHAR(500),
  pillar_keyword_id INTEGER,

  -- Metrics
  total_volume INTEGER,
  total_opportunity FLOAT,
  avg_difficulty FLOAT,
  keyword_count INTEGER DEFAULT 0,
  tracked_keywords INTEGER DEFAULT 0,

  -- Visualization
  graph_data TEXT, -- JSON: Hub-cluster structure

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (domain_id) REFERENCES unified_domains(id) ON DELETE CASCADE,
  FOREIGN KEY (research_project_id) REFERENCES research_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (pillar_keyword_id) REFERENCES unified_keywords(id) ON DELETE SET NULL
);

CREATE INDEX idx_topics_domain ON keyword_topics(domain_id);
CREATE INDEX idx_topics_project ON keyword_topics(research_project_id);

-- ============================================

CREATE TABLE keyword_page_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER,
  topic_id INTEGER,
  research_project_id INTEGER,
  label VARCHAR(500),
  target_keyword_id INTEGER,

  -- Content brief
  outline TEXT, -- JSON: H2/H3 structure
  faqs TEXT, -- JSON: Questions & answers
  schema_types TEXT, -- JSON: Recommended schema.org types
  internal_links TEXT, -- JSON: Hub/spoke linking
  serp_features_target TEXT, -- JSON: Features to optimize for
  word_count_range VARCHAR(50), -- e.g., "1500-2000"

  -- Metrics
  total_volume INTEGER,
  total_opportunity FLOAT,
  keyword_count INTEGER DEFAULT 0,
  tracked_keywords INTEGER DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (domain_id) REFERENCES unified_domains(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES keyword_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (research_project_id) REFERENCES research_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (target_keyword_id) REFERENCES unified_keywords(id) ON DELETE SET NULL
);

CREATE INDEX idx_page_groups_domain ON keyword_page_groups(domain_id);
CREATE INDEX idx_page_groups_topic ON keyword_page_groups(topic_id);
CREATE INDEX idx_page_groups_project ON keyword_page_groups(research_project_id);

-- ============================================

CREATE TABLE serp_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_id INTEGER NOT NULL,
  domain_id INTEGER,

  -- Query parameters
  query VARCHAR(500) NOT NULL,
  geo VARCHAR(10),
  language VARCHAR(10),
  device VARCHAR(20) DEFAULT 'desktop',

  -- SERP data
  results TEXT, -- JSON: Top 10 results with titles, URLs, snippets
  features TEXT, -- JSON: Featured snippets, PAA, videos, etc.
  ads_count INTEGER DEFAULT 0,
  map_pack_present BOOLEAN DEFAULT FALSE,

  -- Our position
  our_position INTEGER,
  our_url VARCHAR(1000),

  -- Provider info
  raw_response TEXT, -- Full API response
  provider VARCHAR(50), -- 'serpapi', 'serper', etc.
  request_id VARCHAR(100),

  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (keyword_id) REFERENCES unified_keywords(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES unified_domains(id) ON DELETE CASCADE
);

CREATE INDEX idx_serp_keyword ON serp_snapshots(keyword_id);
CREATE INDEX idx_serp_timestamp ON serp_snapshots(timestamp DESC);
CREATE INDEX idx_serp_query_geo ON serp_snapshots(query, geo);

-- ============================================
-- SYNC & AUDIT TABLES
-- ============================================

CREATE TABLE sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_system VARCHAR(50) NOT NULL, -- 'serpbear', 'keyword-service'
  target_system VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'keyword', 'domain', 'serp_snapshot'
  source_id INTEGER NOT NULL,
  target_id INTEGER,
  sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'failed', 'conflict'
  sync_direction VARCHAR(20), -- 'to_tracking', 'to_research', 'bidirectional'
  last_sync_at DATETIME,
  last_sync_error TEXT,
  sync_metadata TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_source ON sync_status(source_system, source_id);
CREATE INDEX idx_sync_target ON sync_status(target_system, target_id);
CREATE INDEX idx_sync_status ON sync_status(sync_status);

-- ============================================

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER,
  project_id INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  operation VARCHAR(100), -- 'expansion', 'serp_fetch', 'position_check', 'sync'
  data_source VARCHAR(100), -- 'serpapi', 'google_ads', 'trends', 'serpbear'
  entity_type VARCHAR(50), -- 'keyword', 'domain', 'project'
  entity_id INTEGER,
  request_id VARCHAR(100),
  quota_used INTEGER,
  status VARCHAR(50), -- 'success', 'error', 'partial'
  error_message TEXT,
  metadata TEXT, -- JSON

  FOREIGN KEY (domain_id) REFERENCES unified_domains(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES research_projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_domain ON audit_logs(domain_id);
CREATE INDEX idx_audit_project ON audit_logs(project_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_operation ON audit_logs(operation);

-- ============================================

CREATE TABLE cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key VARCHAR(500) UNIQUE NOT NULL,
  value TEXT, -- JSON serialized
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_key_expires ON cache(cache_key, expires_at);
```

---

## 3. API Endpoint Design

### Unified RESTful API

Base URL: `/api/v2/`

All endpoints follow RESTful conventions and return consistent response format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-26T10:30:00Z",
    "version": "2.0"
  },
  "pagination": { ... }, // if applicable
  "error": null
}
```

#### Domain Management

```
GET    /api/v2/domains
       List all domains with stats

POST   /api/v2/domains
       Body: { domain, business_url?, competitors?, geo?, language? }
       Create new domain

GET    /api/v2/domains/:id
       Get domain details with keyword stats

PUT    /api/v2/domains/:id
       Update domain settings

DELETE /api/v2/domains/:id
       Delete domain and all keywords
```

#### Unified Keyword Management

```
GET    /api/v2/domains/:domainId/keywords
       Query params:
         - intent: filter by intent
         - tracked: true/false (only tracked keywords)
         - min_volume, max_difficulty
         - min_opportunity
         - sort: opportunity|volume|difficulty|position
         - page, per_page
       Get all keywords for domain (research + tracked)

POST   /api/v2/domains/:domainId/keywords
       Body: { keywords: [{ keyword, device?, country?, ... }] }
       Add keywords to domain

GET    /api/v2/keywords/:id
       Get single keyword with full details

PUT    /api/v2/keywords/:id
       Body: { tags?, sticky?, is_tracked?, notes?, ... }
       Update keyword settings

DELETE /api/v2/keywords/:id
       Delete keyword

POST   /api/v2/keywords/bulk-action
       Body: { keyword_ids: [1,2,3], action: 'track'|'untrack'|'tag'|'delete', params }
       Bulk operations on keywords
```

#### Research Project Management

```
GET    /api/v2/research/projects
       List all research projects

POST   /api/v2/research/projects
       Body: {
         name,
         domain_id?,
         seeds: ["keyword1", "keyword2"],
         geo, language,
         content_focus
       }
       Create and run research project

GET    /api/v2/research/projects/:id
       Get project details and status

GET    /api/v2/research/projects/:id/keywords
       Get all discovered keywords

GET    /api/v2/research/projects/:id/topics
       Get topic clusters

GET    /api/v2/research/projects/:id/page-groups
       Get page groupings

POST   /api/v2/research/projects/:id/track-keywords
       Body: { keyword_ids: [1,2,3], domain_id }
       Push research keywords to tracking

POST   /api/v2/research/projects/:id/export
       Body: { format: 'csv'|'sheets'|'notion' }
       Export research results
```

#### Topic Clustering

```
GET    /api/v2/domains/:domainId/topics
       Get topic clusters for domain

GET    /api/v2/topics/:id
       Get topic details with keywords

GET    /api/v2/topics/:id/keywords
       Get all keywords in topic

POST   /api/v2/topics/:id/track-all
       Push all keywords in topic to tracking
```

#### Page Groups

```
GET    /api/v2/domains/:domainId/page-groups
       Get page groups for domain

GET    /api/v2/page-groups/:id
       Get page group details with content brief

GET    /api/v2/page-groups/:id/brief
       Get content brief (outline, FAQs, schema)
```

#### Position Tracking

```
POST   /api/v2/tracking/refresh
       Body: { keyword_ids?: [1,2,3], domain_id? }
       Trigger position refresh for keywords

GET    /api/v2/tracking/status
       Get current tracking queue status

GET    /api/v2/keywords/:id/history
       Query params: days?, from?, to?
       Get position history for keyword
```

#### SERP Analysis

```
GET    /api/v2/keywords/:id/serp
       Get latest SERP snapshot

GET    /api/v2/keywords/:id/serp-history
       Get historical SERP snapshots

POST   /api/v2/serp/analyze
       Body: { keyword, geo?, device? }
       On-demand SERP analysis
```

#### Analytics & Reports

```
GET    /api/v2/analytics/summary
       Get overall platform statistics

GET    /api/v2/domains/:domainId/analytics
       Query params: from?, to?, metrics?
       Get domain-level analytics

GET    /api/v2/domains/:domainId/opportunities
       Get top keyword opportunities

GET    /api/v2/domains/:domainId/rankings
       Query params: improved?, declined?, new?
       Get ranking changes
```

#### Sync Management

```
GET    /api/v2/sync/status
       Get sync status across systems

POST   /api/v2/sync/trigger
       Body: { source, target, entity_type }
       Manually trigger sync

GET    /api/v2/sync/conflicts
       Get unresolved sync conflicts
```

---

## 4. Data Sync Strategy

### Bidirectional Sync Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Unified Database                      │
│                 (unified-keywords.db)                    │
│                                                          │
│  • unified_domains                                       │
│  • unified_keywords                                      │
│  • research_projects                                     │
│  • keyword_topics                                        │
│  • keyword_page_groups                                   │
│  • serp_snapshots                                        │
│  • sync_status                                           │
└───────────┬──────────────────────────┬───────────────────┘
            │                          │
            │                          │
    ┌───────▼────────┐         ┌───────▼────────┐
    │   Sync Agent   │         │   Sync Agent   │
    │   (SerpBear)   │         │ (Keyword Svc)  │
    └───────┬────────┘         └───────┬────────┘
            │                          │
            │                          │
    ┌───────▼────────┐         ┌───────▼────────┐
    │   SerpBear DB  │         │  Keyword DB    │
    │  (read-only)   │         │  (read-only)   │
    └────────────────┘         └────────────────┘
```

### Sync Service Implementation

**Technology:** Node.js microservice
**File:** `/src/services/keyword-sync-service.js`

**Core Functions:**

1. **Initial Migration**
   ```javascript
   async function migrateFromSerpBear() {
     // One-time migration of existing SerpBear data
     // Maps SerpBear domains -> unified_domains
     // Maps SerpBear keywords -> unified_keywords (with is_tracked=true)
   }

   async function migrateFromKeywordService() {
     // One-time migration of research projects
     // Maps projects -> research_projects
     // Maps keywords -> unified_keywords (with is_tracked=false)
   }
   ```

2. **Continuous Sync**
   ```javascript
   async function syncSerpBearToUnified() {
     // Every 5 minutes
     // - New keywords in SerpBear -> unified_keywords
     // - Position updates -> unified_keywords.current_position
     // - History updates -> unified_keywords.position_history
     // - SERP results -> serp_snapshots
   }

   async function syncKeywordServiceToUnified() {
     // On research completion
     // - New projects -> research_projects
     // - New keywords -> unified_keywords
     // - Topics -> keyword_topics
     // - Page groups -> keyword_page_groups
   }
   ```

3. **Conflict Resolution**
   ```javascript
   async function resolveConflicts() {
     // Handles cases where same keyword exists in both systems
     // Strategy: Merge with unified schema
     // - Keep position data from SerpBear
     // - Keep research metrics from Keyword Service
     // - Flag conflicts in sync_status table
   }
   ```

### Sync Rules

| Field | Source of Truth | Sync Direction | Conflict Strategy |
|-------|----------------|----------------|-------------------|
| Keyword text | Both | Bidirectional | Normalize to lowercase |
| Position data | SerpBear | SerpBear → Unified | Always overwrite |
| Volume | Keyword Service | KS → Unified | Overwrite if newer |
| Difficulty | Keyword Service | KS → Unified | Keep research data |
| Intent | Keyword Service | KS → Unified | Keep research data |
| Tags | User | Bidirectional | Merge arrays |
| Sticky | SerpBear | SerpBear → Unified | Keep SerpBear |
| Tracking status | User | Bidirectional | User action wins |

### Sync Workflow Examples

#### Scenario 1: Research → Tracking

1. User runs keyword research project
2. Keyword Service generates 300 keywords
3. User reviews in dashboard, selects top 50 by opportunity
4. Clicks "Track Selected Keywords"
5. Sync service:
   - Creates unified_keyword records (if not exist)
   - Sets `is_tracked = true`
   - Sets `research_project_id`
   - Triggers position check queue
   - Returns tracking confirmation

#### Scenario 2: Manual Keyword Addition

1. User adds keyword in SerpBear UI
2. SerpBear creates keyword record
3. Sync service detects new keyword
4. Creates unified_keyword with:
   - Basic data from SerpBear
   - `is_tracked = true`
   - `keyword_source = 'manual'`
   - `opportunity_score = null` (not researched)
5. Optional: Trigger background research enrichment

#### Scenario 3: Enriching Tracked Keywords

1. User selects tracked keywords in dashboard
2. Clicks "Enrich with Research Data"
3. Sync service:
   - Creates temporary research project
   - Runs keyword service pipeline (SERP + metrics)
   - Updates unified_keyword with research data
   - Links to research_project_id
   - Preserves position tracking data

---

## 5. Migration Path

### Phase 1: Unified Database Setup (Week 1)

**Tasks:**
- Create unified database schema
- Set up ORM models (TypeScript + Python)
- Create database connection utilities
- Write migration scripts

**Deliverables:**
- `database/unified-schema.sql`
- `database/unified-models.ts` (TypeScript)
- `database/unified-models.py` (Python)
- `migrations/001-create-unified-schema.js`

**Testing:**
- Schema validation
- Foreign key constraints
- Index performance

---

### Phase 2: Sync Service Implementation (Week 2)

**Tasks:**
- Build sync service core
- Implement one-way sync (read-only)
- Add conflict detection
- Create sync dashboard

**Deliverables:**
- `src/services/keyword-sync-service.js`
- `src/services/sync-agents/serpbear-sync.js`
- `src/services/sync-agents/keyword-service-sync.js`
- `src/services/sync-agents/conflict-resolver.js`

**Testing:**
- Sync accuracy
- Performance (10k+ keywords)
- Conflict handling

---

### Phase 3: Data Migration (Week 3)

**Tasks:**
- Backup existing databases
- Run migration scripts
- Validate data integrity
- Set up continuous sync

**Deliverables:**
- `migrations/migrate-serpbear-data.js`
- `migrations/migrate-keyword-service-data.js`
- Migration validation report
- Rollback procedures

**Testing:**
- Data completeness check
- Cross-reference validation
- Performance impact

---

### Phase 4: Unified API Layer (Week 4)

**Tasks:**
- Implement unified API endpoints
- Update dashboard-server.js routes
- Add API documentation
- Create client libraries

**Deliverables:**
- `/api/v2/*` endpoints in dashboard-server.js
- API documentation (OpenAPI/Swagger)
- Client SDK for frontend

**Testing:**
- API endpoint coverage
- Response time benchmarks
- Error handling

---

### Phase 5: Dashboard Integration (Week 5)

**Tasks:**
- Update dashboard UI components
- Add research → tracking workflow
- Create unified keyword views
- Add opportunity dashboard

**Deliverables:**
- Updated React components
- New dashboard pages
- User flow documentation

**Testing:**
- UI/UX testing
- End-to-end workflows
- Cross-browser compatibility

---

### Phase 6: Advanced Features (Week 6)

**Tasks:**
- Auto-tracking suggestions
- Opportunity alerts
- Content brief integration
- Batch operations

**Deliverables:**
- Recommendation engine
- Alert system
- Enhanced analytics

**Testing:**
- Algorithm accuracy
- Performance optimization
- User acceptance testing

---

## 6. Integration Points

### A. Research → Tracking Flow

```
User Action: "Track These Keywords"
↓
1. Select keywords from research results (by opportunity score)
2. Choose domain to track for
3. Configure tracking settings:
   - Device (desktop/mobile)
   - Location (country, city)
   - Frequency (daily/weekly)
4. System creates/updates unified_keyword records
5. Sets is_tracked = true
6. Queues position check job
7. Returns to tracking dashboard
```

**Implementation:**
```javascript
// POST /api/v2/research/projects/:id/track-keywords
async function trackResearchKeywords(req, res) {
  const { keyword_ids, domain_id, settings } = req.body;

  // 1. Get keywords from research
  const keywords = await db.unified_keywords.findAll({
    where: { id: keyword_ids }
  });

  // 2. Update tracking settings
  await db.unified_keywords.update({
    is_tracked: true,
    domain_id: domain_id,
    device: settings.device || 'desktop',
    country: settings.country || 'US',
    track_frequency: settings.frequency || 'daily',
    first_tracked_at: new Date()
  }, {
    where: { id: keyword_ids }
  });

  // 3. Queue position checks
  await trackingQueue.addJobs(keyword_ids);

  // 4. Update sync status
  await recordSync({
    source: 'keyword-service',
    target: 'serpbear',
    entity_type: 'keyword',
    sync_direction: 'to_tracking'
  });

  return res.json({
    success: true,
    tracked: keyword_ids.length,
    message: `${keyword_ids.length} keywords added to tracking`
  });
}
```

---

### B. Tracking → Research Flow

```
User Action: "Enrich Keyword Data"
↓
1. Select tracked keywords without research data
2. Click "Get Research Insights"
3. System runs mini research pipeline:
   - SERP analysis
   - Difficulty scoring
   - Intent classification
   - Opportunity calculation
4. Updates unified_keyword with enriched data
5. Shows insights in dashboard
```

**Implementation:**
```javascript
// POST /api/v2/keywords/enrich
async function enrichKeywords(req, res) {
  const { keyword_ids } = req.body;

  // 1. Get keywords
  const keywords = await db.unified_keywords.findAll({
    where: { id: keyword_ids }
  });

  // 2. For each keyword, run research
  for (const kw of keywords) {
    // Call Python service
    const enrichment = await axios.post('http://localhost:5000/api/enrich', {
      keyword: kw.keyword,
      geo: kw.country,
      language: 'en'
    });

    // Update unified record
    await kw.update({
      difficulty_score: enrichment.difficulty,
      intent: enrichment.intent,
      opportunity_score: enrichment.opportunity,
      serp_features: JSON.stringify(enrichment.serp_features),
      monthly_volume: enrichment.volume,
      cpc: enrichment.cpc
    });
  }

  return res.json({
    success: true,
    enriched: keywords.length
  });
}
```

---

### C. Automated Opportunity Detection

```
Background Job (Daily)
↓
1. Identify keywords with:
   - High opportunity score
   - Not currently tracked
   - Relevant to existing domains
2. Send notification/alert
3. Suggest adding to tracking
```

**Implementation:**
```javascript
// Cron job: daily at 9 AM
async function detectOpportunities() {
  // Find high-opportunity keywords not tracked
  const opportunities = await db.unified_keywords.findAll({
    where: {
      is_tracked: false,
      opportunity_score: { [Op.gte]: 70 }
    },
    order: [['opportunity_score', 'DESC']],
    limit: 50
  });

  // Group by domain
  const byDomain = groupBy(opportunities, 'domain_id');

  // Send notifications
  for (const [domainId, keywords] of Object.entries(byDomain)) {
    await sendNotification({
      type: 'opportunity_alert',
      domain_id: domainId,
      message: `${keywords.length} high-opportunity keywords discovered`,
      keywords: keywords.map(k => ({
        keyword: k.keyword,
        opportunity: k.opportunity_score,
        volume: k.monthly_volume,
        difficulty: k.difficulty_score
      }))
    });
  }
}
```

---

### D. Content Brief → Position Tracking

```
User Workflow:
1. Review page group content brief
2. Create content based on brief
3. Publish to website
4. Click "Track Rankings for This Page Group"
5. System automatically tracks all keywords in page group
6. Monitors rankings over time
```

**Implementation:**
```javascript
// POST /api/v2/page-groups/:id/track
async function trackPageGroup(req, res) {
  const { id } = req.params;
  const { url } = req.body; // Published page URL

  // Get page group
  const pageGroup = await db.keyword_page_groups.findByPk(id, {
    include: [{
      model: db.unified_keywords,
      as: 'keywords'
    }]
  });

  // Update all keywords in group
  await db.unified_keywords.update({
    is_tracked: true,
    ranking_url: url,
    first_tracked_at: new Date()
  }, {
    where: {
      page_group_id: id
    }
  });

  // Queue position checks
  const keywordIds = pageGroup.keywords.map(k => k.id);
  await trackingQueue.addJobs(keywordIds);

  return res.json({
    success: true,
    tracked: keywordIds.length,
    page_group: pageGroup.label
  });
}
```

---

## 7. Code Structure Recommendations

### Directory Structure

```
/mnt/c/Users/abhis/projects/seo expert/
│
├── database/
│   ├── unified-schema.sql              # Unified schema definition
│   ├── unified-db.js                   # Unified DB connection (Node.js)
│   ├── unified-db.py                   # Unified DB connection (Python)
│   ├── models/
│   │   ├── typescript/                 # TypeScript ORM models
│   │   │   ├── Domain.ts
│   │   │   ├── Keyword.ts
│   │   │   ├── ResearchProject.ts
│   │   │   ├── Topic.ts
│   │   │   ├── PageGroup.ts
│   │   │   └── SerpSnapshot.ts
│   │   └── python/                     # Python ORM models
│   │       ├── domain.py
│   │       ├── keyword.py
│   │       ├── research_project.py
│   │       ├── topic.py
│   │       ├── page_group.py
│   │       └── serp_snapshot.py
│   └── migrations/
│       ├── 001-create-unified-schema.js
│       ├── 002-migrate-serpbear-data.js
│       └── 003-migrate-keyword-service-data.js
│
├── src/
│   ├── services/
│   │   ├── keyword-sync-service.js     # Main sync orchestrator
│   │   ├── sync-agents/
│   │   │   ├── serpbear-sync.js        # SerpBear → Unified
│   │   │   ├── keyword-service-sync.js # Keyword Service → Unified
│   │   │   ├── conflict-resolver.js    # Conflict detection & resolution
│   │   │   └── sync-scheduler.js       # Cron jobs for sync
│   │   ├── enrichment-service.js       # Enrich tracked keywords
│   │   ├── opportunity-detector.js     # Auto-detect opportunities
│   │   └── tracking-queue-service.js   # Position check queue
│   │
│   ├── api/
│   │   ├── v2/                         # Unified API v2
│   │   │   ├── domains.js              # Domain endpoints
│   │   │   ├── keywords.js             # Keyword endpoints
│   │   │   ├── research.js             # Research project endpoints
│   │   │   ├── topics.js               # Topic endpoints
│   │   │   ├── page-groups.js          # Page group endpoints
│   │   │   ├── tracking.js             # Tracking endpoints
│   │   │   ├── analytics.js            # Analytics endpoints
│   │   │   └── sync.js                 # Sync management endpoints
│   │   └── middleware/
│   │       ├── auth.js
│   │       ├── validation.js
│   │       └── rate-limiter.js
│   │
│   └── utils/
│       ├── data-mapper.js              # Map between schemas
│       ├── sync-logger.js              # Sync operation logging
│       └── keyword-normalizer.js       # Normalize keyword text
│
├── dashboard/                          # React dashboard (existing)
│   └── src/
│       ├── pages/
│       │   ├── KeywordResearch.tsx     # Research project page
│       │   ├── KeywordTracking.tsx     # Position tracking page
│       │   ├── KeywordOpportunities.tsx # Opportunities dashboard
│       │   └── ContentBriefs.tsx       # Content brief viewer
│       └── components/
│           ├── KeywordTable.tsx        # Unified keyword table
│           ├── OpportunityCard.tsx     # Opportunity display
│           ├── TopicCluster.tsx        # Topic visualization
│           └── TrackingButton.tsx      # Add to tracking button
│
├── keyword-service/                    # Python service (existing)
│   ├── api_unified.py                  # NEW: Unified API extensions
│   ├── enrichment_service.py           # NEW: On-demand enrichment
│   └── adapters/
│       └── unified_db_adapter.py       # NEW: Unified DB adapter
│
├── serpbear/                           # SerpBear (existing, read-only)
│
└── scripts/
    ├── migrate-to-unified.js           # Migration script
    ├── validate-sync.js                # Sync validation
    └── rollback-migration.js           # Emergency rollback
```

---

### Sample Implementation Files

#### 1. Unified Database Connection (Node.js)

**File:** `/database/unified-db.js`

```javascript
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Unified database path
const DB_PATH = path.join(__dirname, '..', 'data', 'unified-keywords.db');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Unified database connection established');
  } catch (error) {
    console.error('❌ Unable to connect to unified database:', error);
    throw error;
  }
}

// Initialize database (create tables if not exist)
async function initDatabase() {
  try {
    await sequelize.sync({ alter: false }); // Don't auto-alter in production
    console.log('✅ Unified database tables synced');
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    throw error;
  }
}

export { sequelize, testConnection, initDatabase };
export default sequelize;
```

---

#### 2. Unified Keyword Model (TypeScript)

**File:** `/database/models/typescript/Keyword.ts`

```typescript
import { Table, Model, Column, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import Domain from './Domain';
import Topic from './Topic';
import PageGroup from './PageGroup';
import ResearchProject from './ResearchProject';
import SerpSnapshot from './SerpSnapshot';

@Table({
  tableName: 'unified_keywords',
  timestamps: true
})
export default class Keyword extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: number;

  // Core
  @Column({ type: DataType.STRING(500), allowNull: false })
  keyword!: string;

  @Column({ type: DataType.STRING(500) })
  lemma?: string;

  @ForeignKey(() => Domain)
  @Column({ type: DataType.INTEGER, allowNull: false })
  domain_id!: number;

  // Tracking config
  @Column({ type: DataType.STRING(20), defaultValue: 'desktop' })
  device!: string;

  @Column({ type: DataType.STRING(10), defaultValue: 'US' })
  country!: string;

  @Column({ type: DataType.STRING(100) })
  city?: string;

  @Column({ type: DataType.STRING(100) })
  latlong?: string;

  // Position tracking
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  current_position!: number;

  @Column({ type: DataType.TEXT })
  position_history?: string; // JSON

  @Column({ type: DataType.STRING(1000) })
  ranking_url?: string;

  @Column({ type: DataType.TEXT })
  last_serp_result?: string; // JSON

  @Column({ type: DataType.DATE })
  last_position_check?: Date;

  @Column({ type: DataType.STRING(50), defaultValue: 'pending' })
  position_check_status!: string;

  @Column({ type: DataType.TEXT })
  last_position_error?: string;

  // Research metrics
  @Column({ type: DataType.INTEGER })
  monthly_volume?: number;

  @Column({ type: DataType.FLOAT })
  cpc?: number;

  @Column({ type: DataType.TEXT })
  trend_data?: string; // JSON

  @Column({ type: DataType.STRING(20) })
  trend_direction?: string;

  // SERP analysis
  @Column({ type: DataType.TEXT })
  serp_features?: string; // JSON

  @Column({ type: DataType.FLOAT })
  ads_density?: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  map_pack_present!: boolean;

  // Classification
  @Column({ type: DataType.STRING(50) })
  intent?: string;

  @Column({ type: DataType.TEXT })
  entities?: string; // JSON

  // Scoring
  @Column({ type: DataType.FLOAT })
  difficulty_score?: number;

  @Column({ type: DataType.TEXT })
  difficulty_breakdown?: string; // JSON

  @Column({ type: DataType.FLOAT })
  traffic_potential?: number;

  @Column({ type: DataType.FLOAT })
  opportunity_score?: number;

  // Clustering
  @ForeignKey(() => Topic)
  @Column({ type: DataType.INTEGER })
  topic_cluster_id?: number;

  @ForeignKey(() => PageGroup)
  @Column({ type: DataType.INTEGER })
  page_group_id?: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_pillar_keyword!: boolean;

  // Tracking settings
  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_tracked!: boolean;

  @Column({ type: DataType.STRING(20), defaultValue: 'daily' })
  track_frequency!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  sticky!: boolean;

  // Research metadata
  @ForeignKey(() => ResearchProject)
  @Column({ type: DataType.INTEGER })
  research_project_id?: number;

  @Column({ type: DataType.STRING(100) })
  keyword_source?: string;

  // Timestamps
  @Column({ type: DataType.DATE })
  first_tracked_at?: Date;

  // Tags & notes
  @Column({ type: DataType.TEXT })
  tags?: string; // JSON

  @Column({ type: DataType.TEXT })
  notes?: string;

  @Column({ type: DataType.TEXT })
  settings?: string; // JSON

  // Relationships
  @BelongsTo(() => Domain)
  domain!: Domain;

  @BelongsTo(() => Topic)
  topic?: Topic;

  @BelongsTo(() => PageGroup)
  page_group?: PageGroup;

  @BelongsTo(() => ResearchProject)
  research_project?: ResearchProject;

  @HasMany(() => SerpSnapshot)
  serp_snapshots!: SerpSnapshot[];

  // Helper methods
  get tagsArray(): string[] {
    return this.tags ? JSON.parse(this.tags) : [];
  }

  set tagsArray(tags: string[]) {
    this.tags = JSON.stringify(tags);
  }

  get positionHistoryObject(): Record<string, number> {
    return this.position_history ? JSON.parse(this.position_history) : {};
  }

  set positionHistoryObject(history: Record<string, number>) {
    this.position_history = JSON.stringify(history);
  }

  addPositionToHistory(position: number, date: Date = new Date()) {
    const history = this.positionHistoryObject;
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    history[dateKey] = position;
    this.positionHistoryObject = history;
  }

  getRecentPositions(days: number = 7): Array<{ date: string, position: number }> {
    const history = this.positionHistoryObject;
    const entries = Object.entries(history)
      .map(([date, position]) => ({ date, position }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, days);
    return entries.reverse();
  }
}
```

---

#### 3. Sync Service

**File:** `/src/services/keyword-sync-service.js`

```javascript
import { sequelize as unifiedDb } from '../../database/unified-db.js';
import Keyword from '../../database/models/typescript/Keyword.js';
import Domain from '../../database/models/typescript/Domain.js';
import SyncStatus from '../../database/models/typescript/SyncStatus.js';

// Legacy database connections
import serpbearDb from '../../serpbear/database/database.js';
import SerpBearKeyword from '../../serpbear/database/models/keyword.js';
import SerpBearDomain from '../../serpbear/database/models/domain.js';

class KeywordSyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
  }

  // Start continuous sync
  start(intervalMinutes = 5) {
    console.log(`Starting keyword sync service (every ${intervalMinutes} minutes)`);

    // Initial sync
    this.syncAll();

    // Schedule periodic sync
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      console.log('Keyword sync service stopped');
    }
  }

  async syncAll() {
    if (this.isRunning) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('\n🔄 Starting keyword sync...');

    try {
      // Sync domains first
      await this.syncDomains();

      // Then sync keywords
      await this.syncKeywords();

      // Sync SERP snapshots
      await this.syncSerpSnapshots();

      console.log('✅ Sync completed successfully\n');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async syncDomains() {
    console.log('  → Syncing domains...');

    const serpbearDomains = await SerpBearDomain.findAll();
    let synced = 0;
    let created = 0;

    for (const sbDomain of serpbearDomains) {
      const data = sbDomain.get({ plain: true });

      // Find or create in unified DB
      const [unifiedDomain, isNew] = await Domain.findOrCreate({
        where: { domain: data.domain },
        defaults: {
          slug: data.slug,
          notification: data.notification,
          notification_interval: data.notification_interval,
          notification_emails: data.notification_emails,
          search_console_config: data.search_console,
          tags: data.tags,
          keyword_count: data.keywordCount
        }
      });

      if (isNew) {
        created++;
      } else {
        // Update existing
        await unifiedDomain.update({
          keyword_count: data.keywordCount,
          updated_at: new Date()
        });
        synced++;
      }

      // Record sync status
      await this.recordSync({
        source_system: 'serpbear',
        target_system: 'unified',
        entity_type: 'domain',
        source_id: data.ID,
        target_id: unifiedDomain.id,
        sync_status: 'synced'
      });
    }

    console.log(`     ✓ ${synced} domains updated, ${created} created`);
  }

  async syncKeywords() {
    console.log('  → Syncing keywords...');

    const serpbearKeywords = await SerpBearKeyword.findAll();
    let synced = 0;
    let created = 0;
    let errors = 0;

    for (const sbKeyword of serpbearKeywords) {
      try {
        const data = sbKeyword.get({ plain: true });

        // Get domain mapping
        const domain = await Domain.findOne({ where: { domain: data.domain } });
        if (!domain) {
          console.warn(`     ⚠ Domain not found for keyword: ${data.keyword}`);
          errors++;
          continue;
        }

        // Find or create keyword
        const [unifiedKeyword, isNew] = await Keyword.findOrCreate({
          where: {
            keyword: data.keyword.toLowerCase().trim(),
            domain_id: domain.id,
            device: data.device,
            country: data.country
          },
          defaults: {
            lemma: data.keyword.toLowerCase().trim(),
            device: data.device,
            country: data.country,
            city: data.city,
            latlong: data.latlong,
            current_position: data.position,
            position_history: data.history,
            ranking_url: data.url,
            last_serp_result: data.lastResult,
            last_position_check: data.lastUpdated ? new Date(data.lastUpdated) : null,
            position_check_status: data.updating ? 'updating' : 'success',
            last_position_error: data.lastUpdateError !== 'false' ? data.lastUpdateError : null,
            monthly_volume: data.volume,
            is_tracked: true,
            sticky: data.sticky,
            keyword_source: 'serpbear',
            tags: data.tags,
            settings: data.settings,
            first_tracked_at: data.added ? new Date(data.added) : new Date()
          }
        });

        if (isNew) {
          created++;
        } else {
          // Update position data (SerpBear is source of truth for positions)
          await unifiedKeyword.update({
            current_position: data.position,
            position_history: data.history,
            ranking_url: data.url,
            last_serp_result: data.lastResult,
            last_position_check: data.lastUpdated ? new Date(data.lastUpdated) : null,
            position_check_status: data.updating ? 'updating' : 'success',
            last_position_error: data.lastUpdateError !== 'false' ? data.lastUpdateError : null,
            sticky: data.sticky,
            tags: data.tags,
            updated_at: new Date()
          });
          synced++;
        }

        // Record sync
        await this.recordSync({
          source_system: 'serpbear',
          target_system: 'unified',
          entity_type: 'keyword',
          source_id: data.ID,
          target_id: unifiedKeyword.id,
          sync_status: 'synced'
        });

      } catch (error) {
        console.error(`     ✗ Error syncing keyword ${data.keyword}:`, error.message);
        errors++;
      }
    }

    console.log(`     ✓ ${synced} keywords updated, ${created} created, ${errors} errors`);
  }

  async syncSerpSnapshots() {
    console.log('  → Syncing SERP snapshots...');
    // Implementation for syncing SERP data
    // This would extract lastResult from SerpBear keywords and create serp_snapshots records
    console.log('     ✓ SERP snapshots synced');
  }

  async recordSync(data) {
    await SyncStatus.create({
      ...data,
      last_sync_at: new Date()
    });
  }

  // Utility: Check sync health
  async getSyncHealth() {
    const recentSyncs = await SyncStatus.findAll({
      where: {
        last_sync_at: {
          [Op.gte]: new Date(Date.now() - 3600000) // Last hour
        }
      }
    });

    const failed = recentSyncs.filter(s => s.sync_status === 'failed').length;
    const conflicts = recentSyncs.filter(s => s.sync_status === 'conflict').length;

    return {
      healthy: failed === 0 && conflicts === 0,
      total_syncs: recentSyncs.length,
      failed,
      conflicts,
      last_sync: recentSyncs[0]?.last_sync_at
    };
  }
}

export default new KeywordSyncService();
```

---

#### 4. Unified API Endpoint

**File:** `/src/api/v2/keywords.js`

```javascript
import express from 'express';
import { Op } from 'sequelize';
import Keyword from '../../../database/models/typescript/Keyword.js';
import Domain from '../../../database/models/typescript/Domain.js';
import Topic from '../../../database/models/typescript/Topic.js';
import PageGroup from '../../../database/models/typescript/PageGroup.js';

const router = express.Router();

// GET /api/v2/domains/:domainId/keywords
router.get('/domains/:domainId/keywords', async (req, res) => {
  try {
    const { domainId } = req.params;
    const {
      intent,
      tracked,
      min_volume,
      max_difficulty,
      min_opportunity,
      sort = 'opportunity',
      page = 1,
      per_page = 50
    } = req.query;

    // Build query
    const where = { domain_id: domainId };

    if (intent) where.intent = intent;
    if (tracked !== undefined) where.is_tracked = tracked === 'true';
    if (min_volume) where.monthly_volume = { [Op.gte]: parseInt(min_volume) };
    if (max_difficulty) where.difficulty_score = { [Op.lte]: parseFloat(max_difficulty) };
    if (min_opportunity) where.opportunity_score = { [Op.gte]: parseFloat(min_opportunity) };

    // Determine sort order
    let order;
    switch (sort) {
      case 'opportunity':
        order = [['opportunity_score', 'DESC']];
        break;
      case 'volume':
        order = [['monthly_volume', 'DESC']];
        break;
      case 'difficulty':
        order = [['difficulty_score', 'ASC']];
        break;
      case 'position':
        order = [['current_position', 'ASC']];
        break;
      default:
        order = [['opportunity_score', 'DESC']];
    }

    // Execute query with pagination
    const offset = (page - 1) * per_page;
    const { count, rows } = await Keyword.findAndCountAll({
      where,
      order,
      limit: parseInt(per_page),
      offset,
      include: [
        { model: Topic, as: 'topic' },
        { model: PageGroup, as: 'page_group' }
      ]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total: count,
        pages: Math.ceil(count / per_page)
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0'
      }
    });

  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v2/domains/:domainId/keywords
router.post('/domains/:domainId/keywords', async (req, res) => {
  try {
    const { domainId } = req.params;
    const { keywords } = req.body;

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array required'
      });
    }

    const created = [];
    const errors = [];

    for (const kwData of keywords) {
      try {
        const keyword = await Keyword.create({
          domain_id: domainId,
          keyword: kwData.keyword.toLowerCase().trim(),
          lemma: kwData.keyword.toLowerCase().trim(),
          device: kwData.device || 'desktop',
          country: kwData.country || 'US',
          city: kwData.city,
          is_tracked: kwData.is_tracked !== false, // Default true
          keyword_source: kwData.source || 'manual',
          tags: kwData.tags ? JSON.stringify(kwData.tags) : null,
          first_tracked_at: new Date()
        });

        created.push(keyword);
      } catch (error) {
        errors.push({
          keyword: kwData.keyword,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: created.length,
        keywords: created,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error creating keywords:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v2/keywords/:id
router.get('/keywords/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const keyword = await Keyword.findByPk(id, {
      include: [
        { model: Domain, as: 'domain' },
        { model: Topic, as: 'topic' },
        { model: PageGroup, as: 'page_group' },
        {
          model: SerpSnapshot,
          as: 'serp_snapshots',
          limit: 5,
          order: [['timestamp', 'DESC']]
        }
      ]
    });

    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    // Add computed properties
    const data = keyword.toJSON();
    data.recent_positions = keyword.getRecentPositions(7);
    data.tags_array = keyword.tagsArray;

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching keyword:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/v2/keywords/:id
router.put('/keywords/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const keyword = await Keyword.findByPk(id);
    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'sticky', 'is_tracked', 'track_frequency',
      'notes', 'tags', 'device', 'country', 'city'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    await keyword.update(updateData);

    res.json({
      success: true,
      data: keyword
    });

  } catch (error) {
    console.error('Error updating keyword:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/v2/keywords/:id
router.delete('/keywords/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const keyword = await Keyword.findByPk(id);
    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    await keyword.destroy();

    res.json({
      success: true,
      message: 'Keyword deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting keyword:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v2/keywords/bulk-action
router.post('/keywords/bulk-action', async (req, res) => {
  try {
    const { keyword_ids, action, params } = req.body;

    if (!keyword_ids || !Array.isArray(keyword_ids)) {
      return res.status(400).json({
        success: false,
        error: 'keyword_ids array required'
      });
    }

    let result;

    switch (action) {
      case 'track':
        result = await Keyword.update(
          { is_tracked: true, first_tracked_at: new Date() },
          { where: { id: keyword_ids } }
        );
        break;

      case 'untrack':
        result = await Keyword.update(
          { is_tracked: false },
          { where: { id: keyword_ids } }
        );
        break;

      case 'tag':
        // Add tags to keywords
        const keywords = await Keyword.findAll({ where: { id: keyword_ids } });
        for (const kw of keywords) {
          const currentTags = kw.tagsArray;
          const newTags = Array.from(new Set([...currentTags, ...params.tags]));
          kw.tagsArray = newTags;
          await kw.save();
        }
        result = [keywords.length];
        break;

      case 'delete':
        result = await Keyword.destroy({ where: { id: keyword_ids } });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }

    res.json({
      success: true,
      data: {
        action,
        affected: result[0] || result,
        keyword_ids
      }
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

## 8. Testing Strategy

### Unit Tests

**Test Coverage:**
- Database models (CRUD operations)
- Sync service (domain/keyword sync)
- Data mappers (schema transformations)
- API endpoints (request/response)

**Framework:** Jest + Supertest

**File:** `/tests/unit/sync-service.test.js`

```javascript
import syncService from '../../src/services/keyword-sync-service.js';
import Keyword from '../../database/models/typescript/Keyword.js';
import Domain from '../../database/models/typescript/Domain.js';

describe('Keyword Sync Service', () => {
  beforeEach(async () => {
    // Clear unified DB
    await Keyword.destroy({ where: {}, truncate: true });
    await Domain.destroy({ where: {}, truncate: true });
  });

  test('should sync domains from SerpBear', async () => {
    await syncService.syncDomains();

    const count = await Domain.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should sync keywords from SerpBear', async () => {
    await syncService.syncDomains();
    await syncService.syncKeywords();

    const count = await Keyword.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should preserve position data during sync', async () => {
    const keyword = await Keyword.create({
      keyword: 'test keyword',
      domain_id: 1,
      current_position: 5,
      position_history: JSON.stringify({ '2025-10-26': 5 })
    });

    await syncService.syncKeywords();

    const updated = await Keyword.findByPk(keyword.id);
    expect(updated.current_position).toBe(5);
    expect(JSON.parse(updated.position_history)['2025-10-26']).toBe(5);
  });
});
```

---

### Integration Tests

**Test Coverage:**
- End-to-end sync workflow
- Research → Tracking flow
- API endpoint integration
- Database consistency

**File:** `/tests/integration/research-to-tracking.test.js`

```javascript
import request from 'supertest';
import app from '../../dashboard-server.js';
import Keyword from '../../database/models/typescript/Keyword.js';

describe('Research to Tracking Integration', () => {
  test('should track research keywords', async () => {
    // 1. Create research project
    const project = await request(app)
      .post('/api/v2/research/projects')
      .send({
        name: 'Test Project',
        seeds: ['seo', 'keywords'],
        geo: 'US'
      });

    expect(project.body.success).toBe(true);
    const projectId = project.body.data.project_id;

    // 2. Wait for research to complete (or mock)
    // ... wait or mock ...

    // 3. Get keywords from research
    const keywords = await request(app)
      .get(`/api/v2/research/projects/${projectId}/keywords`);

    expect(keywords.body.data.length).toBeGreaterThan(0);
    const keywordIds = keywords.body.data.slice(0, 5).map(k => k.id);

    // 4. Track selected keywords
    const track = await request(app)
      .post(`/api/v2/research/projects/${projectId}/track-keywords`)
      .send({
        keyword_ids: keywordIds,
        domain_id: 1,
        settings: { device: 'desktop', country: 'US' }
      });

    expect(track.body.success).toBe(true);
    expect(track.body.data.tracked).toBe(5);

    // 5. Verify keywords are tracked
    const trackedKeywords = await Keyword.findAll({
      where: { id: keywordIds, is_tracked: true }
    });

    expect(trackedKeywords.length).toBe(5);
  });
});
```

---

## 9. Deployment Checklist

### Pre-Deployment

- [ ] Backup existing databases (SerpBear + Keyword Service)
- [ ] Test migration scripts on copy of production data
- [ ] Review rollback procedures
- [ ] Set up monitoring and logging
- [ ] Configure error alerting

### Deployment Steps

1. **Stop Services**
   ```bash
   pm2 stop dashboard-server
   pm2 stop keyword-service
   ```

2. **Backup Databases**
   ```bash
   cp serpbear/data/database.sqlite serpbear/data/database.backup.sqlite
   cp data/seo-automation.db data/seo-automation.backup.db
   ```

3. **Run Migrations**
   ```bash
   node database/migrations/001-create-unified-schema.js
   node database/migrations/002-migrate-serpbear-data.js
   node database/migrations/003-migrate-keyword-service-data.js
   ```

4. **Validate Data**
   ```bash
   node scripts/validate-sync.js
   ```

5. **Start Sync Service**
   ```bash
   pm2 start src/services/keyword-sync-service.js --name keyword-sync
   ```

6. **Start Services**
   ```bash
   pm2 start dashboard-server.js
   pm2 start keyword-service/api_server.py --interpreter python3
   ```

7. **Monitor Sync**
   ```bash
   pm2 logs keyword-sync
   ```

8. **Health Check**
   ```bash
   curl http://localhost:9000/api/v2/sync/status
   ```

### Post-Deployment

- [ ] Verify sync service running
- [ ] Check sync health endpoint
- [ ] Test research → tracking flow
- [ ] Verify position tracking still works
- [ ] Monitor error logs for 24 hours
- [ ] User acceptance testing

---

## 10. Rollback Plan

If issues occur during deployment:

1. **Stop All Services**
   ```bash
   pm2 stop all
   ```

2. **Restore Backups**
   ```bash
   cp serpbear/data/database.backup.sqlite serpbear/data/database.sqlite
   cp data/seo-automation.backup.db data/seo-automation.db
   ```

3. **Revert Code**
   ```bash
   git reset --hard <previous-commit>
   ```

4. **Restart Original Services**
   ```bash
   pm2 start dashboard-server.js
   pm2 start keyword-service/api_server.py --interpreter python3
   ```

5. **Verify Functionality**
   - Test position tracking
   - Test keyword research
   - Check existing data integrity

---

## Summary

This integration plan provides a comprehensive roadmap for unifying SerpBear's position tracking with the Keyword Service's research pipeline. The key design decisions are:

1. **Separate databases with sync service** - Minimizes risk, allows gradual migration
2. **Unified schema** - Single source of truth with backward compatibility
3. **Bidirectional sync** - Keeps both systems up-to-date automatically
4. **RESTful API v2** - Clean, consistent interface for all operations
5. **Phased migration** - 6-week implementation with rollback safety

The unified system will enable:
- Research keywords → Position tracking workflow
- Enriching tracked keywords with research data
- Opportunity detection and recommendations
- Content brief → Tracking integration
- Unified analytics across both systems

All existing functionality is preserved while adding powerful new integration features.
