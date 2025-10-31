# Keyword Research Integration Guide

## Overview

The SEO Automation Platform now includes comprehensive keyword research functionality powered by a Python microservice integrated with the existing Node.js system.

## Architecture

```
┌──────────────────────────────────────────────────┐
│   Unified Dashboard (http://localhost:9000)      │
│   - SEO Automations                              │
│   - Keyword Research (NEW)                       │
│   - Analytics & Reports                          │
└────────────────┬─────────────────────────────────┘
                 │
          ┌──────▼───────┐
          │  Node.js     │
          │  API Server  │  (Port 4000)
          │  (Bridge)    │
          └──┬────────┬──┘
             │        │
             │    ┌───▼──────────────────────┐
             │    │ Python Keyword Research  │
             │    │ Microservice (Flask)     │  (Port 5000)
             │    └──────────────────────────┘
             │
        ┌────▼─────────┐
        │  SQLite DB   │
        └──────────────┘
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd keyword-service

# Create virtual environment
python3 -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

### 2. Configure API Keys

Copy the example env file and add your API keys:

```bash
cd keyword-service
cp .env.example .env
```

Required API keys in `.env`:
- `SERPAPI_API_KEY` - Get from https://serpapi.com (Required for SERP data)

Optional (for enhanced features):
- Google Ads API credentials
- Google Sheets API credentials
- Notion API key

### 3. Initialize Database

```bash
cd keyword-service
python cli.py init
```

### 4. Start Services

You need to start BOTH services:

**Terminal 1 - Node.js Server:**
```bash
cd "seo expert"
node dashboard-server.js
```

**Terminal 2 - Python Keyword Service:**
```bash
cd keyword-service
source venv/bin/activate  # or venv\Scripts\activate on Windows
python api_server.py
```

## API Endpoints

### Keyword Research Microservice (Port 5000)

```
GET  /health
     Check service health

GET  /api/keyword/projects
     List all keyword research projects

POST /api/keyword/research
     Body: {
       name: string,
       seeds: string (comma-separated),
       geo?: string (default: "US"),
       language?: string (default: "en"),
       focus?: string (default: "informational")
     }
     Create new keyword research project

GET  /api/keyword/projects/:id
     Get project details

GET  /api/keyword/projects/:id/keywords?page=1&per_page=50
     Query params:
       - intent: filter by intent type
       - min_volume: minimum search volume
       - max_difficulty: maximum difficulty score
     Get keywords with pagination

GET  /api/keyword/projects/:id/topics
     Get topic clusters

POST /api/keyword/projects/:id/export
     Export keywords to CSV

GET  /api/keyword/stats
     Get overall statistics
```

### Node.js Bridge (Port 4000)

The Node.js server proxies requests to the Python service:

```
/api/keyword/*  → Proxied to http://localhost:5000/api/keyword/*
```

## Using the Keyword Research Tool

### Via UI (Dashboard)

1. Open http://localhost:9000/unified/
2. Click "Keyword Research" in the sidebar
3. Click "New Research Project"
4. Enter:
   - Project name
   - Seed keywords (comma-separated)
   - Geographic target
   - Language
   - Focus (informational/commercial/transactional)
5. Click "Start Research"
6. View results in the dashboard

### Via CLI

```bash
cd keyword-service
source venv/bin/activate

# Create project
python cli.py create \
  --name "My SEO Project" \
  --seeds "seo tools,keyword research,content planning" \
  --geo US \
  --language en \
  --focus informational

# List projects
python cli.py list

# View report
python cli.py report 1

# Export to CSV
python cli.py export 1 --format csv --output keywords.csv
```

### Via API

```bash
# Create research project
curl -X POST http://localhost:5000/api/keyword/research \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "seeds": "seo,keyword research,content marketing",
    "geo": "US",
    "language": "en",
    "focus": "informational"
  }'

# Get projects
curl http://localhost:5000/api/keyword/projects

# Get keywords
curl "http://localhost:5000/api/keyword/projects/1/keywords?page=1&per_page=50"
```

## Features

### 1. Keyword Expansion
- Generates 200-500+ related keywords from 3 seed keywords
- Uses Google Autocomplete, PAA, Related Searches
- Intent modifiers (how to, best, buy, etc.)

### 2. SERP Analysis
- Fetches real-time SERP data
- Analyzes top 10 results
- Extracts SERP features
- Identifies ranking difficulty

### 3. Smart Clustering
- Topic clustering (broader themes)
- Page grouping (single-page targets)
- Semantic similarity using embeddings

### 4. Scoring System
- **Difficulty Score** (0-100):
  - SERP strength analysis
  - Competition level
  - SERP feature crowding
  - Content depth requirements

- **Opportunity Score**:
  - Traffic potential
  - CPC value
  - Intent alignment
  - Competition vs reward ratio

### 5. Content Briefs
- H1/H2/H3 outline suggestions
- FAQ sections from PAA
- Entity extraction
- Schema recommendations
- Internal linking strategy

### 6. Export Options
- CSV
- Google Sheets
- Notion
- WordPress (planned)

## Troubleshooting

### Python Service Won't Start

```bash
# Check if Python 3.8+ is installed
python3 --version

# Reinstall dependencies
cd keyword-service
pip install -r requirements.txt

# Check for missing spaCy model
python -m spacy download en_core_web_sm
```

### Rate Limit Errors

Edit `keyword-service/.env`:
```
SERP_API_RPM=20  # Reduce if hitting limits
```

### Low Keyword Count

- Use more diverse seed keywords
- Enable additional expansion in `.env`:
  ```
  ENABLE_COMPETITOR_GAP=true
  ENABLE_YOUTUBE_SUGGESTIONS=true
  ```

### Port Conflicts

If port 5000 is in use, change in `keyword-service/api_server.py`:
```python
app.run(host='0.0.0.0', port=5001, debug=True)
```

And update Node.js proxy in `dashboard-server.js`.

## Development

### Running Tests

```bash
cd keyword-service
source venv/bin/activate

# Unit tests only
pytest

# With integration tests (requires API keys)
pytest --run-integration

# Specific test file
pytest tests/test_clustering.py
```

### Adding New Features

See `keyword-service/CLAUDE.md` for detailed development guide.

## Production Deployment

### Recommended Setup

1. **Use PostgreSQL** instead of SQLite:
   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/keywords
   ```

2. **Use Production WSGI Server**:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 api_server:app
   ```

3. **Set up Process Manager** (PM2/systemd):
   ```bash
   pm2 start api_server.py --interpreter python3
   ```

4. **Configure Nginx** as reverse proxy

5. **Enable HTTPS**

6. **Set Environment Variables**:
   ```
   FLASK_ENV=production
   DEBUG=False
   ```

## API Rate Limits

Free tier limits (SerpAPI):
- 100 searches/month
- Upgrade for higher limits

Adjust rate limits in `.env`:
```
SERP_API_RPM=20
AUTOSUGGEST_RPM=10
GOOGLE_ADS_RPM=15
```

## Support

For issues or questions:
1. Check `keyword-service/CLAUDE.md` for detailed docs
2. Review logs in `keyword-service/` directory
3. Check database: `keyword_research.db`
