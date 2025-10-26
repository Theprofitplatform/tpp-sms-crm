# System Architecture - Visual Guide

Complete visual documentation of the unified keyword tracking system.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     USER BROWSER                        │
│                 http://localhost:9000                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              UNIFIED DASHBOARD (React)                  │
│  ┌──────────────┬──────────────┬───────────────────┐   │
│  │  Keywords    │   Research   │   Sync Status     │   │
│  │  Management  │   Projects   │   Monitoring      │   │
│  └──────────────┴──────────────┴───────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓ REST API
┌─────────────────────────────────────────────────────────┐
│         DASHBOARD SERVER (Node.js/Express)              │
│  ┌──────────────────────────────────────────────────┐  │
│  │              API v2 Layer                        │  │
│  │  ┌────────────┬──────────────┬──────────────┐   │  │
│  │  │  Keywords  │   Research   │     Sync     │   │  │
│  │  │ 8 endpoints│  7 endpoints │  4 endpoints │   │  │
│  │  └────────────┴──────────────┴──────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Authentication • Rate Limiting • Validation            │
└─────────────────────────────────────────────────────────┘
            ↓              ↓              ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Unified DB  │  │  SerpBear DB │  │ Keyword      │
│  (Master)    │  │  (Legacy)    │  │ Service DB   │
│              │  │              │  │ (Legacy)     │
│  PostgreSQL  │  │   SQLite     │  │   SQLite     │
│  or SQLite   │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
      ↕                  ↕                  ↕
      └──────────────────┴──────────────────┘
              SYNC SERVICE (Every 5 min)
          Bidirectional Data Synchronization
```

---

## 🔄 Data Flow - Research to Tracking

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Create Research Project                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User Input:                                            │
│  • Project name: "Q1 2025 Blog Content"                │
│  • Seed keywords: ["seo tools", "rank tracking"]       │
│  • Geography: US                                        │
│  • Language: English                                    │
│  • Focus: Informational                                │
│                                                         │
│  POST /api/v2/research/projects                        │
│         ↓                                               │
│  Creates project in unified_db.research_projects       │
│  Triggers keyword expansion pipeline                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 2: Keyword Expansion                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Keyword Service Pipeline:                             │
│  1. Take seed keywords                                  │
│  2. Use Google Ads API for expansion                   │
│  3. Generate 100+ related keywords                     │
│  4. Fetch metrics (volume, CPC, difficulty)            │
│  5. Calculate opportunity scores                        │
│  6. Classify intents                                    │
│  7. Cluster into topics                                 │
│                                                         │
│  Stores in: unified_keywords table                      │
│         ↓                                               │
│  ~100 keywords with full research data                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 3: Review Opportunities                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Dashboard shows:                                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Keyword            | Vol   | Diff | Opp Score    │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ best seo tools     | 5,400 | 35   | 92  ⭐⭐⭐   │ │
│  │ seo rank tracker   | 2,900 | 28   | 88  ⭐⭐⭐   │ │
│  │ free seo checker   | 8,100 | 42   | 85  ⭐⭐⭐   │ │
│  │ keyword research   | 14,000| 55   | 72  ⭐⭐     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Filter: Opportunity Score > 70                         │
│  Sort: Opportunity Score DESC                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 4: Track Top Opportunities                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User clicks: "Track Top 20 Keywords"                  │
│                                                         │
│  POST /api/v2/research/projects/123/track-opportunities│
│         ↓                                               │
│  For each top keyword:                                  │
│  1. POST /api/v2/keywords/:id/track                    │
│  2. Set is_tracking = true                             │
│  3. Add to SerpBear queue                              │
│  4. Schedule daily position checks                      │
│                                                         │
│  Sync Service:                                          │
│  • Updates SerpBear database                            │
│  • Creates tracking records                             │
│  • Schedules first position check                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 5: Monitor Progress                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Daily Position Updates:                                │
│  1. SerpBear checks positions (daily)                  │
│  2. Sync service pulls new data (every 5 min)          │
│  3. Updates unified_keywords table                      │
│  4. Dashboard shows real-time data                      │
│                                                         │
│  Dashboard View:                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Keyword            | Position | Change | Trend   │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ best seo tools     | #12      | +3     | ↑↑      │ │
│  │ seo rank tracker   | #8       | +1     | ↑       │ │
│  │ free seo checker   | #15      | -2     | ↓       │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Sync Service Flow

```
┌────────────────────────────────────────────────────────┐
│           SYNC SERVICE (Every 5 minutes)               │
└────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
┌───────────────────┐         ┌───────────────────┐
│  PHASE 1:         │         │  PHASE 2:         │
│  Pull from Legacy │         │  Push to Legacy   │
└───────────────────┘         └───────────────────┘
        ↓                               ↓
┌───────────────────┐         ┌───────────────────┐
│ SerpBear → Unified│         │ Unified → SerpBear│
├───────────────────┤         ├───────────────────┤
│ Read:             │         │ Write:            │
│ • keyword table   │         │ • New keywords    │
│ • domain table    │         │ • Updated URLs    │
│                   │         │ • Changed domains │
│ Extract:          │         └───────────────────┘
│ • keyword text    │                   ↓
│ • position        │         ┌───────────────────┐
│ • url             │         │ Unified → Keyword │
│ • last_updated    │         │     Service       │
│                   │         ├───────────────────┤
│ Transform:        │         │ Write:            │
│ • Map IDs         │         │ • New keywords    │
│ • Parse JSON      │         │ • Research data   │
│ • Deduplicate     │         │ • Project links   │
│                   │         └───────────────────┘
│ Load:             │
│ • unified_keywords│
│ • Update positions│
└───────────────────┘
        ↓
┌───────────────────┐
│ Keyword Service   │
│   → Unified       │
├───────────────────┤
│ Read:             │
│ • keywords table  │
│ • projects table  │
│                   │
│ Extract:          │
│ • keyword text    │
│ • search_volume   │
│ • difficulty      │
│ • intent          │
│ • opportunity     │
│                   │
│ Transform:        │
│ • Calculate scores│
│ • Classify intent │
│ • Map projects    │
│                   │
│ Load:             │
│ • unified_keywords│
│ • Enrich metadata │
└───────────────────┘
        ↓
┌───────────────────────────────────────────┐
│  CONFLICT RESOLUTION                      │
├───────────────────────────────────────────┤
│                                           │
│  Rule 1: Position Data                   │
│  Source: SerpBear (always)               │
│  Fields: position, url, last_tracked_at  │
│                                           │
│  Rule 2: Research Data                   │
│  Source: Keyword Service (always)        │
│  Fields: volume, cpc, difficulty, intent │
│                                           │
│  Rule 3: User Edits                      │
│  Source: Unified DB (always)             │
│  Fields: sticky, tags, notes             │
│                                           │
│  Rule 4: Timestamps                      │
│  Logic: Most recent wins                 │
│                                           │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│  SYNC STATUS UPDATE                       │
├───────────────────────────────────────────┤
│                                           │
│  Record in sync_status table:            │
│  • sync_id                                │
│  • start_time                             │
│  • end_time                               │
│  • status (success/failed)                │
│  • records_synced                         │
│  • errors (if any)                        │
│                                           │
│  Update sync statistics:                  │
│  • last_sync_time                         │
│  • total_syncs                            │
│  • total_errors                           │
│  • avg_duration                           │
│                                           │
└───────────────────────────────────────────┘
```

---

## 📊 Database Relationships

```
┌────────────────────────────────────────────────────────────────┐
│                     UNIFIED DATABASE SCHEMA                    │
└────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│    domains      │
│─────────────────│
│ id (PK)         │───┐
│ domain          │   │
│ created_at      │   │
└─────────────────┘   │
                      │ FK: domain_id
┌─────────────────┐   │
│ research_       │   │
│   projects      │   │
│─────────────────│   │
│ id (PK)         │───┤
│ name            │   │
│ seed_terms      │   │
│ status          │   │
│ created_at      │   │
└─────────────────┘   │
                      │ FK: research_project_id
┌─────────────────┐   │
│    topics       │   │
│─────────────────│   │
│ id (PK)         │───┤
│ name            │   │
│ project_id (FK) │   │
│ created_at      │   │
└─────────────────┘   │
                      │ FK: topic_id
┌─────────────────┐   │
│  page_groups    │   │
│─────────────────│   │
│ id (PK)         │───┤
│ target_url      │   │
│ topic_id (FK)   │   │
│ content_brief   │   │
│ created_at      │   │
└─────────────────┘   │
                      │ FK: page_group_id
                      ↓
        ┌──────────────────────────────┐
        │    unified_keywords          │
        │──────────────────────────────│
        │ id (PK)                      │
        │ keyword (indexed)            │
        │ lemma                        │
        │ language                     │
        │                              │
        │ domain_id (FK)               │
        │ research_project_id (FK)     │
        │ topic_id (FK)                │
        │ page_group_id (FK)           │
        │                              │
        │ -- Position Tracking --      │
        │ device                       │
        │ country                      │
        │ position                     │
        │ position_history (JSON)      │
        │ url                          │
        │ last_tracked_at              │
        │                              │
        │ -- Research Data --          │
        │ search_volume                │
        │ cpc                          │
        │ intent                       │
        │ difficulty                   │
        │ opportunity_score            │
        │ traffic_potential            │
        │                              │
        │ -- SERP Features --          │
        │ serp_features (JSON)         │
        │                              │
        │ -- Metadata --               │
        │ sticky                       │
        │ tags (JSON)                  │
        │ notes                        │
        │ created_at                   │
        │ updated_at                   │
        └──────────────────────────────┘
                      │
                      ↓
        ┌──────────────────────────────┐
        │      serp_snapshots          │
        │──────────────────────────────│
        │ id (PK)                      │
        │ keyword_id (FK)              │
        │ snapshot_date                │
        │ serp_data (JSON)             │
        │ created_at                   │
        └──────────────────────────────┘

┌─────────────────┐
│  sync_status    │
│─────────────────│
│ id (PK)         │
│ sync_type       │
│ started_at      │
│ completed_at    │
│ status          │
│ records_synced  │
│ errors (JSON)   │
└─────────────────┘

┌─────────────────┐
│  audit_logs     │
│─────────────────│
│ id (PK)         │
│ entity_type     │
│ entity_id       │
│ action          │
│ changes (JSON)  │
│ user_id         │
│ created_at      │
└─────────────────┘

┌─────────────────┐
│     cache       │
│─────────────────│
│ cache_key (PK)  │
│ cache_value     │
│ expires_at      │
│ created_at      │
└─────────────────┘
```

---

## 🎨 UI Component Tree

```
App
├── Sidebar
│   ├── Dashboard (icon: Home)
│   ├── Keywords (icon: Search)
│   │   ├── Keyword Research
│   │   └── Unified Keywords ← NEW
│   ├── Research (icon: Database)
│   └── Settings (icon: Settings)
│
└── MainContent
    └── UnifiedKeywordsPage ← NEW
        │
        ├── StatsGrid
        │   ├── StatsCard (Total Keywords)
        │   ├── StatsCard (Tracking)
        │   ├── StatsCard (Research Projects)
        │   └── StatsCard (Opportunities)
        │
        ├── SyncStatusCard
        │   ├── Status Badge
        │   ├── Last Sync Time
        │   ├── Sync Statistics
        │   └── Manual Trigger Button
        │
        ├── FiltersCard
        │   ├── Domain Filter
        │   ├── Intent Filter
        │   ├── Opportunity Filter
        │   └── Search Input
        │
        ├── Tabs
        │   ├── TabsList
        │   │   ├── All Keywords
        │   │   ├── Tracking
        │   │   ├── Research
        │   │   └── Opportunities
        │   │
        │   └── TabsContent
        │       └── KeywordsTable
        │           ├── TableHeader
        │           │   ├── Keyword
        │           │   ├── Domain
        │           │   ├── Position
        │           │   ├── Volume
        │           │   ├── Intent
        │           │   ├── Opportunity
        │           │   └── Actions
        │           │
        │           └── TableBody
        │               └── KeywordRow (foreach keyword)
        │                   ├── KeywordCell
        │                   ├── DomainBadge
        │                   ├── PositionCell
        │                   ├── VolumeCell
        │                   ├── IntentBadge
        │                   ├── OpportunityScore
        │                   └── ActionButtons
        │                       ├── Track Button
        │                       ├── Enrich Button
        │                       ├── Edit Button
        │                       └── Delete Button
        │
        ├── KeywordDetailsDialog (modal)
        │   ├── DialogHeader
        │   │   └── Keyword Title
        │   │
        │   └── DialogContent
        │       ├── DetailsSection
        │       │   ├── Search Volume
        │       │   ├── CPC
        │       │   ├── Difficulty
        │       │   └── Opportunity Score
        │       │
        │       ├── PositionSection
        │       │   ├── Current Position
        │       │   ├── Position History Chart
        │       │   └── Last Checked
        │       │
        │       ├── SERPFeaturesSection
        │       │   └── Features List
        │       │
        │       └── ActionsSection
        │           ├── Track Button
        │           ├── Enrich Button
        │           └── Export Button
        │
        └── ResearchProjectsSection
            └── ProjectCard (foreach project)
                ├── Project Name
                ├── Seed Keywords
                ├── Status Badge
                ├── Keyword Count
                └── Action Buttons
                    ├── View Keywords
                    ├── Track Opportunities
                    └── Export
```

---

## 🔌 API Endpoint Map

```
API v2 Base: /api/v2
│
├── /keywords (Keyword Management)
│   │
│   ├── GET /keywords
│   │   Query Params:
│   │   • page, per_page (pagination)
│   │   • domain (filter)
│   │   • intent (filter)
│   │   • opportunity_score_min/max (range filter)
│   │   • is_tracking (boolean filter)
│   │   • sort_by, sort_order (sorting)
│   │   Response: { keywords: [], pagination: {} }
│   │
│   ├── POST /keywords
│   │   Body: { keyword, domain, device, country }
│   │   Response: { success: true, keyword: {} }
│   │
│   ├── GET /keywords/:id
│   │   Response: { keyword: {}, position_history: [], serp_features: [] }
│   │
│   ├── PUT /keywords/:id
│   │   Body: { sticky, tags, notes, ... }
│   │   Response: { success: true, keyword: {} }
│   │
│   ├── DELETE /keywords/:id
│   │   Response: { success: true }
│   │
│   ├── POST /keywords/:id/track
│   │   Body: { domain }
│   │   Response: { success: true, keyword: { is_tracking: true } }
│   │
│   ├── POST /keywords/:id/enrich
│   │   Triggers research data fetch
│   │   Response: { success: true, enrichment_data: {} }
│   │
│   └── GET /keywords/stats
│       Response: { total, tracking, research, opportunities, by_intent: {} }
│
├── /research (Research Workflow)
│   │
│   ├── GET /research/projects
│   │   Response: { projects: [] }
│   │
│   ├── POST /research/projects
│   │   Body: { name, seeds, geo, language, focus }
│   │   Response: { project: {}, keywords_generated: N }
│   │
│   ├── GET /research/projects/:id
│   │   Response: { project: {}, keywords: [], topics: [] }
│   │
│   ├── POST /research/projects/:id/track-opportunities
│   │   Body: { limit: 20 }
│   │   Response: { tracked_keywords: [] }
│   │
│   ├── GET /research/topics
│   │   Query: ?project_id=X
│   │   Response: { topics: [] }
│   │
│   ├── POST /research/topics
│   │   Body: { name, project_id, keywords }
│   │   Response: { topic: {} }
│   │
│   └── GET /research/page-groups
│       Query: ?topic_id=X
│       Response: { page_groups: [] }
│
└── /sync (Sync Service)
    │
    ├── GET /sync/status
    │   Response: {
    │     isSyncing: false,
    │     lastSyncTime: "2025-10-26T10:30:00Z",
    │     stats: { total_records: 1234, total_errors: 0 },
    │     details: []
    │   }
    │
    ├── POST /sync/trigger
    │   Triggers manual sync
    │   Response: { success: true, sync_id: 123 }
    │
    ├── GET /sync/history
    │   Query: ?page=1&per_page=20
    │   Response: { history: [], pagination: {} }
    │
    └── POST /sync/keywords/bulk
        Body: { source: "serpbear", keyword_ids: [1,2,3] }
        Response: { success: true, synced_count: 3 }
```

---

## 🚀 Deployment Architecture

### Development
```
┌──────────────────────────────────────┐
│        Developer Machine             │
│                                      │
│  Terminal 1: node dashboard-server.js│
│  Terminal 2: python api_server.py   │
│  Terminal 3: npm run dev (dashboard) │
│                                      │
│  SQLite databases (local files)     │
└──────────────────────────────────────┘
```

### Production (Docker)
```
┌────────────────────────────────────────────────────┐
│              Docker Host Server                    │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Nginx Reverse Proxy (Port 80/443)          │ │
│  │  • SSL Termination                           │ │
│  │  • Gzip Compression                          │ │
│  │  • Rate Limiting                             │ │
│  └──────────────────────────────────────────────┘ │
│                   ↓                                │
│  ┌──────────────────────────────────────────────┐ │
│  │  Dashboard Container (Port 9000)            │ │
│  │  • Node.js/Express                          │ │
│  │  • PM2 Cluster (2 instances)                │ │
│  └──────────────────────────────────────────────┘ │
│                   ↓                                │
│  ┌──────────────────────────────────────────────┐ │
│  │  Keyword Service Container (Port 5000)      │ │
│  │  • Python/Flask                             │ │
│  └──────────────────────────────────────────────┘ │
│                   ↓                                │
│  ┌──────────────────────────────────────────────┐ │
│  │  PostgreSQL Container (Port 5432)           │ │
│  │  • Persistent volume                        │ │
│  │  • Daily backups                            │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Sync Service Container                     │ │
│  │  • Cron job (every 5 min)                   │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### Production (PM2)
```
┌────────────────────────────────────────────────────┐
│              Production Server                     │
│                                                    │
│  Nginx → http://localhost:9000                    │
│    ↓                                               │
│  PM2 Process Manager                              │
│  ├── dashboard-server (cluster: 2 instances)     │
│  ├── keyword-service (instances: 1)              │
│  └── sync-service (instances: 1)                 │
│                                                    │
│  PostgreSQL Database                              │
│  └── Automated backups (daily)                   │
└────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Examples

### Example 1: User Creates Keyword
```
User → Dashboard UI
  ↓ POST /api/v2/keywords
  ↓ { keyword: "seo tools", domain: "example.com" }
Dashboard Server
  ↓ Validate input
  ↓ Insert into unified_keywords
Unified Database
  ↓ (wait for next sync)
Sync Service (every 5 min)
  ↓ Detect new keyword
  ↓ Insert into SerpBear DB
  ↓ Insert into Keyword Service DB
Legacy Systems
  ✓ Keyword available in all systems
```

### Example 2: SerpBear Updates Position
```
SerpBear
  ↓ Daily position check
  ↓ Updates position in keyword table
SerpBear Database
  ↓ (wait for next sync)
Sync Service
  ↓ Detect position change
  ↓ Read from SerpBear
  ↓ Update unified_keywords
Unified Database
  ↓ Real-time update
Dashboard UI
  ✓ Shows new position
```

### Example 3: Research Project Workflow
```
User → "Create Project"
  ↓ POST /api/v2/research/projects
  ↓ { name: "Blog Q1", seeds: ["seo"] }
Dashboard Server
  ↓ Create project record
  ↓ Call Keyword Service API
Keyword Service
  ↓ Expand seeds via Google Ads API
  ↓ Generate 100+ keywords
  ↓ Calculate metrics
  ↓ Save to keywords table
Keyword Service DB
  ↓ (wait for sync)
Sync Service
  ↓ Pull research data
  ↓ Merge into unified_keywords
Unified Database
  ↓ Update dashboard
Dashboard UI
  ✓ Shows 100+ keywords with scores
```

---

## 🎯 Key Insights

### Why This Architecture Works

1. **Separation of Concerns**
   - UI: User interaction
   - API: Business logic
   - Sync: Data consistency
   - Databases: Persistence

2. **Scalability**
   - API can scale horizontally (PM2 cluster)
   - Database can be PostgreSQL cluster
   - Sync service runs independently

3. **Resilience**
   - Legacy systems remain functional
   - Can fall back if unified system fails
   - Sync service has error recovery

4. **Performance**
   - Caching layer (cache table)
   - Indexed queries
   - API pagination
   - Async operations

5. **Maintainability**
   - Clear component boundaries
   - Well-documented APIs
   - Comprehensive tests
   - Deployment automation

---

**Status**: ✅ Complete

**Version**: 2.0

**Last Updated**: 2025-10-26

**Architecture Type**: Microservices with Unified Data Layer
