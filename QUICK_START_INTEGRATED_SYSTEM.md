# Quick Start Guide - Unified Keyword Tracking System

## What This System Does

This integrated platform combines:
- **SerpBear** (SERP position tracking)
- **Keyword Service** (research & planning)
- **Unified Dashboard** (single interface for everything)

All three systems sync automatically every 5 minutes to keep data consistent.

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL (production) or SQLite (development)
- npm or yarn

---

## Quick Start (Development)

### 1. Install Dependencies

```bash
# Install main dependencies
npm install

# Install keyword service dependencies
cd keyword-service
pip install -r requirements.txt
cd ..

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

### 2. Setup Database

```bash
# Initialize unified database
node run-migration.js

# This creates the unified schema and sets up sync tables
```

### 3. Configure Environment

Create `.env` file in project root:

```bash
# Server Configuration
NODE_ENV=development
PORT=9000

# Database Paths
DATABASE_URL=sqlite:./database/unified.db
SERPBEAR_DB_PATH=./serpbear/data/serpbear.db
KEYWORD_SERVICE_DB_PATH=./keyword-service/keywords.db

# Sync Settings
SYNC_INTERVAL=*/5 * * * *  # Every 5 minutes
ENABLE_AUTO_SYNC=true

# API Keys (optional for enhanced features)
SERPAPI_KEY=your_key_here
GOOGLE_ADS_CLIENT_ID=your_id_here
```

### 4. Start All Services

```bash
# Option A: Start all services with one command
./start-all-services.sh

# Option B: Start services individually
# Terminal 1: Dashboard server
node dashboard-server.js

# Terminal 2: Keyword service
cd keyword-service && python api_server.py

# Terminal 3: SerpBear (if using)
cd serpbear && npm start
```

### 5. Access the Dashboard

Open browser to: **http://localhost:9000**

Click on **"Unified Keywords"** in the sidebar to see the integrated view.

---

## First Steps in the UI

### View All Keywords
1. Navigate to **Research > Unified Keywords**
2. See all keywords from both systems in one table
3. Use filters to find specific keywords:
   - Filter by domain
   - Filter by intent (informational, commercial, transactional)
   - Filter by opportunity score
   - Toggle between tracking/research keywords

### Create a Research Project
1. Go to **Research > Keyword Research**
2. Click **"New Project"**
3. Enter project details:
   - Name: "Blog Content Q1 2025"
   - Seed keywords: "SEO tools, rank tracking"
   - Geography: US
   - Language: English
   - Focus: Informational
4. Click **"Start Research"**
5. System will generate keyword suggestions automatically

### Track High-Opportunity Keywords
1. View your research project
2. Sort by **"Opportunity Score"** (descending)
3. Click **"Track"** on keywords with score > 70
4. Keywords are automatically added to position tracking
5. Check back daily to see ranking progress

### Monitor Sync Status
1. Top of Unified Keywords page shows sync status
2. Green = synced recently
3. Yellow = sync in progress
4. Red = sync errors
5. Click **"Trigger Sync"** to manually sync now

---

## Using the API

All functionality is available via REST API v2.

### Base URL
```
http://localhost:9000/api/v2
```

### Common Endpoints

#### List Keywords
```bash
curl http://localhost:9000/api/v2/keywords?page=1&per_page=50

# With filters
curl "http://localhost:9000/api/v2/keywords?intent=commercial&opportunity_score_min=70"
```

#### Create Keyword
```bash
curl -X POST http://localhost:9000/api/v2/keywords \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "best seo tools 2025",
    "domain": "example.com",
    "device": "desktop",
    "country": "US"
  }'
```

#### Add to Tracking
```bash
curl -X POST http://localhost:9000/api/v2/keywords/123/track \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

#### Get Sync Status
```bash
curl http://localhost:9000/api/v2/sync/status
```

#### Trigger Manual Sync
```bash
curl -X POST http://localhost:9000/api/v2/sync/trigger
```

#### Create Research Project
```bash
curl -X POST http://localhost:9000/api/v2/research/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 Content Strategy",
    "seeds": ["seo", "keyword research"],
    "geo": "US",
    "language": "en",
    "focus": "informational"
  }'
```

See `API_V2_DOCUMENTATION.md` for complete API reference.

---

## Common Workflows

### Workflow 1: Content Planning
1. Create research project with seed topics
2. Review suggested keywords
3. Filter by:
   - Search volume > 500
   - Difficulty < 40
   - Intent = informational
4. Export top 20 keywords
5. Add to tracking to monitor progress

### Workflow 2: Competitive Tracking
1. Add competitor domains
2. Track their ranking keywords
3. Identify gap opportunities (they rank, you don't)
4. Create content targeting those gaps
5. Track your progress

### Workflow 3: Monitor Existing Rankings
1. Import your current content URLs
2. Identify which keywords each page ranks for
3. Track position changes daily
4. Get alerts for significant drops
5. Optimize content based on SERP changes

---

## Understanding Sync

### How Sync Works

```
Every 5 minutes:

1. SerpBear → Unified DB
   - Read position data
   - Update position, url, last_tracked_at

2. Keyword Service → Unified DB
   - Read research data
   - Update search_volume, intent, opportunity_score

3. Unified DB → Both Systems
   - New keywords added from UI → Both systems
   - Updates propagate bidirectionally
```

### What Gets Synced

| Data Type | Source | Target | Frequency |
|-----------|--------|--------|-----------|
| Position rankings | SerpBear | Unified DB | 5 min |
| Search volume | Keyword Service | Unified DB | 5 min |
| Keyword metadata | Unified DB | Both | 5 min |
| New keywords | Any | All | 5 min |

### Conflict Resolution

- **Position data**: SerpBear wins (most recent)
- **Research data**: Keyword Service wins (most accurate)
- **User edits**: Unified DB wins (manual changes preserved)

---

## Troubleshooting

### Services Won't Start

```bash
# Check if ports are in use
sudo netstat -tlnp | grep -E ':(9000|5000|3000)'

# Kill existing processes if needed
pkill -f dashboard-server
pkill -f api_server
```

### Database Errors

```bash
# Reset unified database (WARNING: deletes data)
rm database/unified.db
node run-migration.js

# Check database integrity
sqlite3 database/unified.db "PRAGMA integrity_check;"
```

### Sync Not Working

```bash
# Check sync status
curl http://localhost:9000/api/v2/sync/status

# View sync logs
tail -f logs/sync-service.log

# Manually trigger sync
curl -X POST http://localhost:9000/api/v2/sync/trigger
```

### No Keywords Showing

```bash
# Verify data exists in source systems
sqlite3 serpbear/data/serpbear.db "SELECT COUNT(*) FROM keyword;"
sqlite3 keyword-service/keywords.db "SELECT COUNT(*) FROM keywords;"

# Trigger sync to pull data
curl -X POST http://localhost:9000/api/v2/sync/trigger

# Check unified database
sqlite3 database/unified.db "SELECT COUNT(*) FROM unified_keywords;"
```

---

## Running Tests

### Integration Tests

```bash
# Run all integration tests
npm test -- tests/integration/

# Run specific test suite
npm test -- tests/integration/api-v2-keywords.test.js

# With verbose output
npm test -- tests/integration/ --reporter spec
```

### Manual API Testing

```bash
# Install test dependencies
npm install --save-dev mocha chai supertest

# Run tests
npm test
```

---

## Development Tips

### Watch Mode
```bash
# Auto-restart dashboard server on changes
npx nodemon dashboard-server.js

# Auto-restart keyword service on changes
cd keyword-service
pip install watchdog
watchmedo auto-restart -p "*.py" python api_server.py
```

### Database Migrations
```bash
# Create migration
node scripts/create-migration.js add_new_field

# Run migrations
node run-migration.js
```

### View Logs
```bash
# Dashboard logs
tail -f logs/dashboard-server.log

# Sync logs
tail -f logs/sync-service.log

# All logs
tail -f logs/*.log
```

---

## Production Deployment

For production deployment, see: **`deployment/production/DEPLOYMENT_GUIDE.md`**

Quick production setup:
```bash
# 1. Setup server
./deployment/production/setup-server.sh

# 2. Deploy application
./deployment/production/deploy-app.sh

# 3. Start with PM2
pm2 start ecosystem.config.js

# 4. Setup Nginx + SSL
./deployment/production/setup-nginx.sh
```

---

## Custom Slash Commands

This project has custom Claude Code commands:

- `/check-health` - Check all services status
- `/run-tests` - Run complete test suite
- `/deploy` - Deploy with Docker
- `/new-feature` - Scaffold new feature
- `/analyze-keywords` - Analyze keyword performance
- `/review-code` - Comprehensive code review
- `/setup-dev` - Setup dev environment from scratch

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Unified Dashboard (React)             │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │ Keywords │ │ Research  │ │ Sync Status  │  │
│  └──────────┘ └───────────┘ └──────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓ HTTP
┌─────────────────────────────────────────────────┐
│         Dashboard Server (Node.js/Express)      │
│              API v2 Endpoints                   │
└─────────────────────────────────────────────────┘
         ↓                    ↓                ↓
┌────────────────┐  ┌──────────────┐  ┌──────────────┐
│  Unified DB    │  │  SerpBear DB │  │ Keyword DB   │
│  (PostgreSQL)  │  │  (SQLite)    │  │ (SQLite)     │
└────────────────┘  └──────────────┘  └──────────────┘
         ↑                    ↑                ↑
         └────────────────────┴────────────────┘
              Bidirectional Sync (Every 5 min)
```

---

## Key Features

### ✅ Unified Keyword Management
- Single table combining tracking + research data
- No duplicate keywords
- Automatic sync between systems

### ✅ Research Workflow
- Create projects with seed keywords
- Automatic keyword expansion
- Opportunity scoring
- One-click tracking

### ✅ Position Tracking
- Daily position checks
- Historical data
- SERP features
- Multi-device/geo support

### ✅ Smart Sync
- Automatic bidirectional sync
- Conflict resolution
- Error handling
- Manual trigger option

### ✅ Complete API
- 19 REST endpoints
- Filtering & pagination
- Bulk operations
- Webhook support

---

## Next Steps

1. **Import your data**: Add existing domains and keywords
2. **Create first project**: Start with a research project
3. **Track top keywords**: Monitor your most important terms
4. **Setup automation**: Configure webhooks for alerts
5. **Explore API**: Integrate with your existing tools

---

## Support & Documentation

- **API Docs**: `API_V2_DOCUMENTATION.md`
- **Deployment**: `deployment/production/DEPLOYMENT_GUIDE.md`
- **Integration Details**: `KEYWORD_INTEGRATION_COMPLETE.md`
- **Feature Guide**: `COMPLETE_FEATURES_GUIDE.md`

---

## Version

**System Version**: 2.0
**Last Updated**: 2025-10-26
**Status**: ✅ Production Ready

---

**You're ready to go!** Start the services and open http://localhost:9000 to begin.
