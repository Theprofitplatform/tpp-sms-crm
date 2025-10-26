# Keyword Integration System Architecture

## High-Level System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                                │
│                    http://localhost:9000/unified/                           │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Keyword    │  │   Position   │  │ Opportunity  │  │   Content    │  │
│  │   Research   │  │   Tracking   │  │  Dashboard   │  │    Briefs    │  │
│  │    Page      │  │     Page     │  │              │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │                  │
          └──────────────────┴──────────────────┴──────────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │   UNIFIED API v2        │
                         │  (dashboard-server.js)  │
                         │   Port 9000             │
                         └────────┬────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          │                       │                       │
┌─────────▼──────────┐  ┌─────────▼──────────┐  ┌─────────▼──────────┐
│   KEYWORD SYNC     │  │  ENRICHMENT        │  │  TRACKING QUEUE    │
│   SERVICE          │  │  SERVICE           │  │  SERVICE           │
│                    │  │                    │  │                    │
│ • Bidirectional    │  │ • On-demand SERP   │  │ • Position checks  │
│   sync             │  │   analysis         │  │ • Queue management │
│ • Conflict         │  │ • Difficulty calc  │  │ • Rate limiting    │
│   resolution       │  │ • Intent classify  │  │                    │
│ • Every 5 min      │  │ • Volume lookup    │  │                    │
└─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘
          │                       │                       │
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    UNIFIED DATABASE       │
                    │  unified-keywords.db      │
                    │                           │
                    │  • unified_domains        │
                    │  • unified_keywords       │
                    │  • research_projects      │
                    │  • keyword_topics         │
                    │  • keyword_page_groups    │
                    │  • serp_snapshots         │
                    │  • sync_status            │
                    │  • audit_logs             │
                    └─────────┬─────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────▼──────────┐  ┌─────▼──────────┐  ┌────▼──────────────┐
│  SerpBear DB       │  │ Keyword Svc DB │  │  External APIs    │
│  (Read-Only)       │  │ (Read-Only)    │  │                   │
│                    │  │                │  │ • SerpAPI         │
│ database.sqlite    │  │ keyword_       │  │ • Google Ads      │
│                    │  │   research.db  │  │ • Google Trends   │
│ Legacy position    │  │                │  │ • Autosuggest     │
│ tracking system    │  │ Research       │  │                   │
└────────────────────┘  │ pipeline data  │  └───────────────────┘
                        └────────────────┘
```

---

## Data Flow Diagrams

### Flow 1: Keyword Research → Position Tracking

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. USER INITIATES RESEARCH                                              │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. KEYWORD SERVICE (Python)                                             │
│                                                                          │
│    POST /api/keyword/research                                           │
│    {                                                                     │
│      name: "Project X",                                                 │
│      seeds: ["seo tools", "rank tracking"],                            │
│      geo: "US"                                                          │
│    }                                                                     │
│                                                                          │
│    Pipeline Stages:                                                     │
│    ├─ Expansion (200-500 keywords)                                     │
│    ├─ SERP Collection                                                   │
│    ├─ Metrics Enrichment (volume, CPC, trends)                         │
│    ├─ Classification (intent, entities)                                │
│    ├─ Scoring (difficulty, opportunity)                                │
│    └─ Clustering (topics, page groups)                                 │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. SYNC SERVICE                                                         │
│                                                                          │
│    • Detects new research project                                       │
│    • Creates research_project record in unified DB                      │
│    • Syncs all keywords to unified_keywords table                       │
│    • Links to topics and page_groups                                    │
│    • Sets is_tracked = FALSE (research only)                            │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. USER REVIEWS OPPORTUNITIES                                           │
│                                                                          │
│    Dashboard shows:                                                     │
│    • Keyword: "best seo tools"                                          │
│    • Volume: 18,000                                                     │
│    • Difficulty: 65                                                     │
│    • Opportunity: 82 ⭐                                                  │
│    • Intent: Commercial                                                 │
│    • [Track This Keyword] button                                        │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. USER CLICKS "TRACK SELECTED KEYWORDS"                                │
│                                                                          │
│    POST /api/v2/research/projects/123/track-keywords                   │
│    {                                                                     │
│      keyword_ids: [501, 502, 503],                                     │
│      domain_id: 5,                                                      │
│      settings: {                                                        │
│        device: "desktop",                                               │
│        country: "US",                                                   │
│        frequency: "daily"                                               │
│      }                                                                   │
│    }                                                                     │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. UNIFIED API UPDATES KEYWORDS                                         │
│                                                                          │
│    UPDATE unified_keywords SET                                          │
│      is_tracked = TRUE,                                                 │
│      domain_id = 5,                                                     │
│      device = 'desktop',                                                │
│      country = 'US',                                                    │
│      track_frequency = 'daily',                                         │
│      first_tracked_at = NOW()                                           │
│    WHERE id IN (501, 502, 503)                                          │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. TRACKING QUEUE SERVICE                                               │
│                                                                          │
│    • Queues position check jobs for keywords 501, 502, 503             │
│    • Calls SERP scraper to get current positions                        │
│    • Updates current_position field                                     │
│    • Adds to position_history JSON                                      │
│    • Creates serp_snapshots record                                      │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 8. POSITION TRACKING ACTIVE                                             │
│                                                                          │
│    Keywords now appear in:                                              │
│    • Position tracking dashboard                                        │
│    • Daily position checks                                              │
│    • Ranking history charts                                             │
│    • Change notifications                                               │
│                                                                          │
│    Still retain:                                                        │
│    • Research data (difficulty, opportunity)                            │
│    • Topic cluster links                                                │
│    • Page group assignments                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Flow 2: Enriching Existing Tracked Keywords

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. USER HAS TRACKED KEYWORDS (from SerpBear)                            │
│                                                                          │
│    Keywords added manually to SerpBear:                                 │
│    • "wordpress seo"                                                    │
│    • "seo plugins"                                                      │
│    • "yoast vs rank math"                                               │
│                                                                          │
│    These have:                                                          │
│    ✓ Position data                                                      │
│    ✓ Tracking history                                                   │
│    ✗ No research data (difficulty, opportunity, intent)                 │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. SYNC SERVICE IMPORTS TO UNIFIED DB                                   │
│                                                                          │
│    CREATE unified_keywords                                              │
│      keyword = 'wordpress seo',                                         │
│      domain_id = 5,                                                     │
│      current_position = 12,                                             │
│      position_history = '{"2025-10-20": 15, "2025-10-21": 13, ...}',  │
│      is_tracked = TRUE,                                                 │
│      keyword_source = 'serpbear',                                       │
│      // Research fields are NULL                                        │
│      difficulty_score = NULL,                                           │
│      opportunity_score = NULL,                                          │
│      intent = NULL                                                      │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. USER REQUESTS ENRICHMENT                                             │
│                                                                          │
│    In dashboard, user selects keywords and clicks:                      │
│    [Enrich with Research Data]                                          │
│                                                                          │
│    POST /api/v2/keywords/enrich                                         │
│    {                                                                     │
│      keyword_ids: [101, 102, 103]                                       │
│    }                                                                     │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. ENRICHMENT SERVICE                                                   │
│                                                                          │
│    For each keyword:                                                    │
│                                                                          │
│    ┌─────────────────────────────────────────┐                         │
│    │ Call Python Keyword Service             │                         │
│    │                                          │                         │
│    │ POST /api/enrich                         │                         │
│    │ {                                        │                         │
│    │   keyword: "wordpress seo",              │                         │
│    │   geo: "US"                              │                         │
│    │ }                                        │                         │
│    │                                          │                         │
│    │ Python service runs mini-pipeline:       │                         │
│    │ • SERP analysis                          │                         │
│    │ • Difficulty calculation                 │                         │
│    │ • Intent classification                  │                         │
│    │ • Volume lookup                          │                         │
│    │ • Opportunity scoring                    │                         │
│    └─────────────────────────────────────────┘                         │
│                            │                                             │
│                            ▼                                             │
│    ┌─────────────────────────────────────────┐                         │
│    │ Response:                                │                         │
│    │ {                                        │                         │
│    │   difficulty: 58,                        │                         │
│    │   opportunity: 74,                       │                         │
│    │   intent: "informational",               │                         │
│    │   volume: 22000,                         │                         │
│    │   cpc: 3.50,                             │                         │
│    │   serp_features: ["paa", "video"]        │                         │
│    │ }                                        │                         │
│    └─────────────────────────────────────────┘                         │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. UPDATE UNIFIED KEYWORD                                               │
│                                                                          │
│    UPDATE unified_keywords SET                                          │
│      difficulty_score = 58,                                             │
│      opportunity_score = 74,                                            │
│      intent = 'informational',                                          │
│      monthly_volume = 22000,                                            │
│      cpc = 3.50,                                                        │
│      serp_features = '["paa", "video"]',                                │
│      updated_at = NOW()                                                 │
│    WHERE id = 101                                                       │
│                                                                          │
│    ✓ Position data preserved                                            │
│    ✓ Research data added                                                │
│    ✓ Now have complete keyword profile                                  │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. ENHANCED KEYWORD VIEW                                                │
│                                                                          │
│    Keyword: "wordpress seo"                                             │
│    ├─ Position: #12 (↑ from #15)                                       │
│    ├─ Volume: 22,000/mo                                                 │
│    ├─ Difficulty: 58/100                                                │
│    ├─ Opportunity: 74/100 ⭐                                             │
│    ├─ Intent: Informational                                             │
│    ├─ CPC: $3.50                                                        │
│    └─ SERP Features: PAA, Video                                         │
│                                                                          │
│    Now user can make informed decisions:                                │
│    • "Should I invest more in this keyword?"                            │
│    • "What's the ROI potential?"                                        │
│    • "Should I create video content?"                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Flow 3: Continuous Sync Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SYNC SERVICE (runs every 5 minutes)                                     │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Check for changes since last  │
              │ sync (using timestamps)       │
              └───────────┬───────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌────────────────┐ ┌──────────────┐ ┌────────────────┐
│ SerpBear DB    │ │ Keyword      │ │ Unified DB     │
│                │ │ Service DB   │ │                │
│ New/updated:   │ │              │ │ Destination    │
│ • Domains      │ │ New:         │ │                │
│ • Keywords     │ │ • Projects   │ │ All data       │
│ • Positions    │ │ • Keywords   │ │ merged here    │
│ • SERP results │ │ • Topics     │ │                │
└────────┬───────┘ └──────┬───────┘ └────────────────┘
         │                │
         │                │
         ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SYNC LOGIC                                                              │
│                                                                          │
│ 1. DOMAIN SYNC                                                          │
│    IF domain exists in unified:                                         │
│      UPDATE metadata (keyword count, last_updated)                      │
│    ELSE:                                                                 │
│      CREATE new domain record                                           │
│                                                                          │
│ 2. KEYWORD SYNC                                                         │
│    FOR each changed keyword:                                            │
│      IF keyword exists (match on: keyword + domain + device + geo):     │
│        ┌─────────────────────────────────────────────────────┐         │
│        │ MERGE STRATEGY                                       │         │
│        │                                                      │         │
│        │ Position data (from SerpBear):                       │         │
│        │   → Always overwrite (SerpBear is source of truth)   │         │
│        │   → current_position                                 │         │
│        │   → position_history                                 │         │
│        │   → last_serp_result                                 │         │
│        │                                                      │         │
│        │ Research data (from Keyword Service):                │         │
│        │   → Only update if newer                             │         │
│        │   → difficulty_score                                 │         │
│        │   → opportunity_score                                │         │
│        │   → intent                                           │         │
│        │   → volume, cpc                                      │         │
│        │                                                      │         │
│        │ User data (from both):                               │         │
│        │   → Merge tags (union of arrays)                     │         │
│        │   → Keep sticky flag from SerpBear                   │         │
│        │   → Keep notes from both (append)                    │         │
│        └─────────────────────────────────────────────────────┘         │
│      ELSE:                                                               │
│        CREATE new keyword with all available data                       │
│                                                                          │
│ 3. SERP SNAPSHOT SYNC                                                   │
│    Extract SERP data from SerpBear lastResult                           │
│    Create serp_snapshots records                                        │
│                                                                          │
│ 4. RESEARCH PROJECT SYNC                                                │
│    Sync new projects from Keyword Service                               │
│    Link keywords to projects                                            │
│    Sync topics and page_groups                                          │
│                                                                          │
│ 5. RECORD SYNC STATUS                                                   │
│    INSERT INTO sync_status (                                            │
│      source_system, target_system, entity_type,                         │
│      source_id, target_id, sync_status, last_sync_at                    │
│    )                                                                     │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CONFLICT DETECTION                                                      │
│                                                                          │
│ If same keyword modified in both systems:                               │
│   1. Check timestamps                                                   │
│   2. If SerpBear newer: Use position data from SerpBear                 │
│   3. If Keyword Service newer: Use research data from KS                │
│   4. If same timestamp: Log conflict, manual resolution needed          │
│   5. Record in sync_status with sync_status = 'conflict'                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Relationship Diagram

```
┌─────────────────────────┐
│   unified_domains       │
│─────────────────────────│
│ • id                    │
│ • domain                │◄──────┐
│ • business_url          │       │
│ • competitors           │       │
│ • primary_geo           │       │
│ • keyword_count         │       │
│ • settings              │       │
└─────────────────────────┘       │
                                  │
                                  │ FK: domain_id
                                  │
┌─────────────────────────┐       │
│  research_projects      │       │
│─────────────────────────│       │
│ • id                    │       │
│ • name                  │       │
│ • domain_id             ├───────┤
│ • seed_terms            │       │
│ • status                │       │
│ • total_keywords        │       │
└────────┬────────────────┘       │
         │                        │
         │ FK: project_id         │
         │                        │
         ▼                        │
┌─────────────────────────┐       │
│   keyword_topics        │       │
│─────────────────────────│       │
│ • id                    │       │
│ • project_id            ├───────┤
│ • domain_id             ├───────┤
│ • label                 │       │
│ • pillar_keyword_id     │◄──┐   │
│ • total_volume          │   │   │
│ • keyword_count         │   │   │
└────────┬────────────────┘   │   │
         │                    │   │
         │ FK: topic_id       │   │
         │                    │   │
         ▼                    │   │
┌─────────────────────────┐   │   │
│  keyword_page_groups    │   │   │
│─────────────────────────│   │   │
│ • id                    │   │   │
│ • domain_id             ├───┼───┤
│ • topic_id              ├───┘   │
│ • target_keyword_id     │◄──┐   │
│ • outline               │   │   │
│ • faqs                  │   │   │
│ • schema_types          │   │   │
└────────┬────────────────┘   │   │
         │                    │   │
         │ FK: page_group_id  │   │
         │                    │   │
         ▼                    │   │
┌──────────────────────────────────┐
│     unified_keywords         │   │
│──────────────────────────────│   │
│ • id                         │───┤ FK: pillar/target
│ • keyword                    │   │
│ • domain_id                  ├───┘
│ • device, country, city      │
│                              │
│ Position Tracking:           │
│ • current_position           │
│ • position_history (JSON)    │
│ • ranking_url                │
│ • last_position_check        │
│                              │
│ Research Data:               │
│ • monthly_volume             │
│ • difficulty_score           │
│ • opportunity_score          │
│ • intent                     │
│ • serp_features (JSON)       │
│                              │
│ Clustering:                  │
│ • topic_cluster_id           ├──┐
│ • page_group_id              ├──┤
│ • is_pillar_keyword          │  │
│                              │  │
│ Tracking Settings:           │  │
│ • is_tracked                 │  │
│ • track_frequency            │  │
│ • sticky                     │  │
│                              │  │
│ Metadata:                    │  │
│ • research_project_id        ├──┤
│ • keyword_source             │  │
│ • tags (JSON)                │  │
│ • notes                      │  │
└──────────┬───────────────────┘  │
           │                      │
           │                      │
           │ FK: keyword_id       │
           │                      │
           ▼                      │
┌─────────────────────────┐       │
│   serp_snapshots        │       │
│─────────────────────────│       │
│ • id                    │       │
│ • keyword_id            ├───────┘
│ • domain_id             │
│ • query                 │
│ • geo, device           │
│ • results (JSON)        │
│ • features (JSON)       │
│ • our_position          │
│ • timestamp             │
│ • provider              │
└─────────────────────────┘


┌─────────────────────────┐
│     sync_status         │  (Tracks sync operations)
│─────────────────────────│
│ • source_system         │  'serpbear' | 'keyword-service'
│ • target_system         │  'unified'
│ • entity_type           │  'domain' | 'keyword' | 'project'
│ • source_id             │
│ • target_id             │
│ • sync_status           │  'pending' | 'synced' | 'failed' | 'conflict'
│ • last_sync_at          │
└─────────────────────────┘


┌─────────────────────────┐
│     audit_logs          │  (API call tracking)
│─────────────────────────│
│ • domain_id             │
│ • project_id            │
│ • operation             │  'serp_fetch', 'position_check', 'sync'
│ • data_source           │  'serpapi', 'google_ads', 'serpbear'
│ • quota_used            │
│ • status                │
│ • timestamp             │
└─────────────────────────┘
```

---

## API Request/Response Flow

### Example: Track Research Keywords

```
┌───────────────────────────────────────────────────────────────┐
│ CLIENT REQUEST                                                 │
└───────────────────────────────────────────────────────────────┘

POST /api/v2/research/projects/123/track-keywords
Content-Type: application/json
Authorization: Bearer <token>

{
  "keyword_ids": [501, 502, 503, 504, 505],
  "domain_id": 5,
  "settings": {
    "device": "desktop",
    "country": "US",
    "city": "",
    "frequency": "daily"
  }
}

                    ↓

┌───────────────────────────────────────────────────────────────┐
│ SERVER PROCESSING (dashboard-server.js)                       │
└───────────────────────────────────────────────────────────────┘

1. Validate request
   ├─ Check authentication
   ├─ Validate domain_id exists
   └─ Validate keyword_ids belong to project

2. Update keywords in unified DB
   UPDATE unified_keywords SET
     is_tracked = TRUE,
     domain_id = 5,
     device = 'desktop',
     country = 'US',
     track_frequency = 'daily',
     first_tracked_at = NOW()
   WHERE id IN (501, 502, 503, 504, 505)

3. Queue position checks
   trackingQueue.add({
     keyword_ids: [501, 502, 503, 504, 505],
     priority: 'high'
   })

4. Record audit log
   INSERT INTO audit_logs (
     domain_id, operation, status, timestamp
   ) VALUES (5, 'track_keywords', 'success', NOW())

                    ↓

┌───────────────────────────────────────────────────────────────┐
│ SERVER RESPONSE                                                │
└───────────────────────────────────────────────────────────────┘

HTTP 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "tracked": 5,
    "keyword_ids": [501, 502, 503, 504, 505],
    "domain": {
      "id": 5,
      "domain": "example.com",
      "tracked_keywords": 15
    },
    "queue_status": {
      "position": 3,
      "estimated_completion": "2025-10-26T15:30:00Z"
    }
  },
  "meta": {
    "timestamp": "2025-10-26T15:25:00Z",
    "version": "2.0"
  }
}

                    ↓

┌───────────────────────────────────────────────────────────────┐
│ BACKGROUND PROCESSING                                          │
└───────────────────────────────────────────────────────────────┘

Tracking Queue Service:
├─ Dequeue keyword 501
├─ Call SERP scraper
├─ Find position for domain
├─ Update unified_keywords.current_position
├─ Add to position_history
├─ Create serp_snapshots record
├─ Emit WebSocket update to client
└─ Repeat for 502, 503, 504, 505

Client receives real-time updates:
{
  "event": "position_updated",
  "keyword_id": 501,
  "keyword": "best seo tools",
  "position": 12,
  "previous_position": null
}
```

---

## Deployment Architecture

### Development Environment

```
┌────────────────────────────────────────────────────────┐
│ Developer Machine                                       │
│                                                         │
│  Terminal 1: Dashboard Server                          │
│  $ node dashboard-server.js                            │
│  Port: 9000                                            │
│                                                         │
│  Terminal 2: Keyword Service                           │
│  $ cd keyword-service && python api_server.py          │
│  Port: 5000                                            │
│                                                         │
│  Terminal 3: Sync Service                              │
│  $ node src/services/keyword-sync-service.js           │
│                                                         │
│  Browser:                                              │
│  http://localhost:9000/unified/                        │
│                                                         │
│  Databases (SQLite):                                    │
│  ├─ data/unified-keywords.db                           │
│  ├─ serpbear/data/database.sqlite (read-only)          │
│  └─ keyword-service/keyword_research.db (read-only)    │
└────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌────────────────────────────────────────────────────────────────┐
│ NGINX Reverse Proxy (Port 80/443)                              │
│                                                                 │
│  https://seo-platform.com                                      │
│    ├─ /                    → Dashboard (Port 9000)             │
│    ├─ /api/v2/*            → Dashboard API (Port 9000)         │
│    └─ /api/keyword/*       → Keyword Service (Port 5000)       │
└────────────────┬───────────────────────────────────────────────┘
                 │
    ┌────────────┴──────────────┐
    │                           │
    ▼                           ▼
┌──────────────────┐   ┌──────────────────┐
│ PM2 Process      │   │ PM2 Process      │
│ dashboard-server │   │ keyword-service  │
│ (Node.js)        │   │ (Python/Flask)   │
│ Port: 9000       │   │ Port: 5000       │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    │
         ┌──────────▼───────────┐
         │ PM2 Process          │
         │ sync-service         │
         │ (Node.js)            │
         └──────────┬───────────┘
                    │
         ┌──────────▼───────────┐
         │ PostgreSQL Database  │
         │                      │
         │ • unified_keywords   │
         │ • serpbear (read)    │
         │ • keyword_svc (read) │
         └──────────────────────┘

┌────────────────────────────────────────────┐
│ Monitoring & Logging                        │
│                                             │
│ • PM2 Logs                                  │
│ • Application Logs (Winston/Bunyan)        │
│ • Database Query Logs                      │
│ • Error Tracking (Sentry)                  │
│ • Metrics (Prometheus + Grafana)           │
└────────────────────────────────────────────┘
```

---

## Security & Access Control

```
┌─────────────────────────────────────────────────────────────┐
│ AUTHENTICATION LAYER                                         │
│                                                              │
│  User → JWT Token → API Request                             │
│                                                              │
│  Middleware validates:                                       │
│  ├─ Token signature                                          │
│  ├─ Token expiration                                         │
│  ├─ User permissions                                         │
│  └─ Rate limits                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ AUTHORIZATION LAYER                                          │
│                                                              │
│  Role-based access:                                          │
│  ├─ Admin: Full access to all domains/keywords              │
│  ├─ Manager: Manage assigned domains                        │
│  ├─ Viewer: Read-only access                                │
│  └─ API: Programmatic access (read/write by key)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ DATA ACCESS LAYER                                            │
│                                                              │
│  Row-level security:                                         │
│  • Users can only access domains they own/manage            │
│  • API keys scoped to specific domains                      │
│  • Audit logs for all data access                           │
└─────────────────────────────────────────────────────────────┘
```

---

This architecture enables seamless integration between keyword research and position tracking while maintaining system reliability, data integrity, and scalability.
