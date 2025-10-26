# Keyword Research & Content Planning Tool

A comprehensive, production-ready keyword research and content planning system designed for agencies, SEO leads, and content teams.

## 🎯 Overview

This tool automates the entire keyword research workflow from discovery to content calendar:

1. **Keyword Expansion** - Generates profitable, intent-aligned keywords across niches
2. **Metrics Collection** - Fetches search volume, difficulty, SERP features, and trends
3. **Smart Clustering** - Groups keywords into topics and page-level targets
4. **Scoring System** - Calculates difficulty, traffic potential, and opportunity scores
5. **Brief Generation** - Creates detailed content briefs with outlines, FAQs, and schema
6. **Content Calendar** - Outputs prioritized 12-week publishing schedule
7. **Multi-format Export** - CSV, Google Sheets, Notion, and WordPress

## 🚀 Quick Start

### 1. Installation

```bash
# Clone repository
git clone <repo-url>
cd cursorkeyword

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

### 2. Configuration

Copy `.env.example` to `.env` and configure your API keys:

```bash
cp .env.example .env
```

**Required API Keys:**
- `SERPAPI_API_KEY` - For SERP data (get from https://serpapi.com)

**Optional:**
- Google Ads API credentials (for official volume data)
- Google OAuth credentials (for Sheets export)
- Notion API key (for Notion export)

### 3. Initialize Database

```bash
python cli.py init
```

### 4. Create Your First Project

```bash
python cli.py create \
  --name "My First Project" \
  --seeds "seo tools,keyword research,content planning" \
  --geo US \
  --language en \
  --focus informational
```

This will:
- Expand your 3 seeds into 200-500+ related keywords
- Fetch SERP data and metrics for each
- Classify intent and extract entities
- Calculate difficulty and opportunity scores
- Cluster into topics and page groups
- Generate content briefs
- Save everything to SQLite database

## 📚 Usage Guide

### List Projects

```bash
python cli.py list
```

### View Project Report

```bash
python cli.py report <project_id>
```

Shows:
- Total keywords, topics, and page groups
- Aggregate metrics (volume, difficulty, opportunity)
- Intent distribution
- Top 20 opportunities
- Strategic recommendations

### Export Data

**CSV Export:**
```bash
python cli.py export <project_id> --format csv --output keywords.csv
```

Generates 3 files:
- `keywords.csv` - All keywords with metrics
- `briefs.csv` - Content brief summaries
- `calendar.csv` - 12-week content calendar

**Google Sheets:**
```bash
python cli.py export <project_id> --format sheets
```

**Notion:**
```bash
python cli.py export <project_id> --format notion
```

### Generate Content Calendar

```bash
python cli.py calendar <project_id> --weeks 12 --posts-per-week 2
```

## 🏗️ Architecture

```
workspace/
├── cli.py                    # Command-line interface
├── config.py                 # Configuration management
├── database.py               # Database setup and sessions
├── models.py                 # SQLAlchemy models
├── orchestrator.py           # Main workflow orchestrator
├── expansion.py              # Keyword expansion engine
├── reporting.py              # Reports and calendars
│
├── providers/                # Data acquisition
│   ├── autosuggest.py       # Google/Bing/YouTube autosuggest
│   ├── serpapi_client.py    # SERP data provider
│   ├── trends.py            # Google Trends analysis
│   └── base.py              # Rate limiting & caching
│
├── processing/               # Core algorithms
│   ├── normalizer.py        # Deduplication & normalization
│   ├── intent_classifier.py # Intent classification
│   ├── entity_extractor.py  # Entity extraction
│   ├── scoring.py           # Difficulty, CTR, opportunity
│   ├── clustering.py        # Topic & page clustering
│   └── brief_generator.py   # Content brief creation
│
└── exports/                  # Export modules
    ├── csv_export.py
    ├── sheets_export.py
    └── notion_export.py
```

## 🔍 Feature Details

### Keyword Expansion

Expands seeds using:
- **Autosuggest**: Google, Bing, YouTube APIs
- **People Also Ask**: Questions from SERP
- **Related Searches**: SERP-based discovery
- **Intent Modifiers**: "how to", "best", "near me", etc.
- **Competitor Gap**: Extract from competitor pages
- **Geographic**: Service + location combinations

### Intent Classification

Classifies keywords as:
- **Informational**: Guides, tutorials, explanations
- **Commercial**: Reviews, comparisons, "best X"
- **Transactional**: "buy", "price", "discount"
- **Local**: "near me", location-specific
- **Navigational**: Brand/site searches

### Difficulty Scoring

Proprietary 0-100 score based on:
- **SERP Strength (40%)**: Homepage ratio, brand presence
- **Competition (30%)**: Exact-match titles
- **SERP Crowding (20%)**: Ads + features
- **Content Depth (10%)**: Word count proxy

### Opportunity Score

Prioritization metric:
```
Opportunity = (Traffic Potential × CPC Weight × Intent Fit) / (Difficulty + Brand Crowding)
```

### Clustering

Two-level hierarchical clustering:

1. **Topic Clustering**: Broader themes (threshold: 0.78)
2. **Page Clustering**: Single-page targets (threshold: 0.88)

Uses hybrid approach:
- Sentence embeddings (all-MiniLM-L6-v2)
- Token overlap (Jaccard similarity)

### Content Briefs

Each brief includes:
- Search intent summary
- H1/H2/H3 outline structure
- FAQs from People Also Ask
- Must-cover entities and subtopics
- Internal linking recommendations
- Schema.org types to target
- SERP features to optimize for
- Word count range

### Hub-Cluster Linking

Generates internal link structure:
- **Hub** = Pillar page (highest opportunity)
- **Spokes** = Supporting pages
- **Sibling links** = Related support pages

## 📊 Data Sources

### Active Sources

1. **SerpAPI** - SERP data, features, PAA questions
2. **Google Trends** - Seasonality and trend direction
3. **Autosuggest APIs** - Keyword suggestions

### Available Integrations

1. **Google Ads API** - Official search volume and CPC
2. **Google Search Console** - Owned site performance
3. **Reddit/Amazon** - Question and product modifiers

## 🔧 Advanced Usage

### Custom Geo Expansion

```python
from expansion import KeywordExpander

expander = KeywordExpander()
keywords = expander.expand_with_geo(
    services=['plumber', 'electrician'],
    locations=['Sydney', 'Melbourne', 'Brisbane']
)
```

### Competitor Analysis

```python
keywords = expander.extract_competitor_keywords(
    competitor_url='competitor.com',
    geo='US',
    max_keywords=50
)
```

### Custom Clustering Thresholds

Edit `.env`:
```
TOPIC_CLUSTER_THRESHOLD=0.80
PAGE_GROUP_THRESHOLD=0.90
SIBLING_LINK_THRESHOLD=0.92
```

## 📈 Workflow Integration

### n8n Automation

1. Schedule nightly refresh of metrics
2. Weekly re-clustering if pool changed >5%
3. Push briefs to Notion
4. Assign writers via Slack/Discord

### WordPress Integration

Export briefs directly to WordPress drafts:
```python
from exports.wordpress_export import WordPressExporter

wp = WordPressExporter(
    url=settings.wordpress_url,
    username=settings.wordpress_username,
    password=settings.wordpress_app_password
)

wp.create_draft_post(brief)
```

### Search Console Tracking

Compare planned vs actual performance:
```python
from providers.search_console import SearchConsoleProvider

gsc = SearchConsoleProvider()
gsc.track_target_pages(project_id, page_groups)
```

## 🎯 Success Metrics

Track these KPIs:

1. **Time to First Result**: <10 min for 1k seeds
2. **Cluster Purity**: ≥0.8 average
3. **Writer Acceptance**: >90% brief approval
4. **Publishing Velocity**: 2× increase within 60 days
5. **Top-10 Share**: Weekly growth after publishing

## 🧪 Quality Assurance

### Evaluation

The tool includes evaluation metrics:
- Cluster purity measurement
- Brief entity coverage analysis
- Difficulty correlation with 3rd-party tools
- Repeatability across runs

### Dogfooding

Track content outcomes:
- Time to first click (Search Console)
- Impressions after 28 days
- Top-3 ranking share after 90 days

## 🔒 Compliance & Privacy

### Data Source Transparency

Every API call is logged with full attribution. Query your data sources:

```sql
-- See which providers contributed to a project
SELECT provider, COUNT(*) as calls, SUM(quota_consumed) as quota
FROM audit_logs 
WHERE project_id = 1 
GROUP BY provider;
```

**Active Data Sources:**
- **SerpAPI**: SERP results, PAA questions, related searches, SERP features
- **Google Trends**: Seasonality analysis, trend direction
- **Autosuggest APIs**: Google, Bing, YouTube keyword suggestions
- **Google Ads** (optional): Official search volume and CPC data
- **Search Console** (optional): Existing ranking data for your site

All sources are documented in audit logs and can be exported for compliance reporting.

### Telemetry & Privacy

**Telemetry**: Disabled by default. When enabled (opt-in), anonymous usage statistics help improve the tool.

```bash
# In .env file:
ENABLE_TELEMETRY=false  # Default: off
```

**What we collect (only if enabled):**
- Feature usage counts (which commands run)
- Error frequencies (for debugging)
- Performance metrics (processing times)

**What we NEVER collect:**
- Your API keys or credentials
- Your seed keywords or project data
- SERP data or API responses
- Any personally identifiable information

**Data Source Ledger**: Every API call is logged locally in your `audit_logs` table:
- Timestamp and duration
- Provider name
- Query parameters (sanitized)
- Response status and quota consumed
- Project association

View your ledger:
```bash
python cli.py audit --last 7d
```

### Compliance Features

- ✅ Uses official APIs where available (Google Ads, Sheets, Search Console)
- ✅ Respects rate limits with token-bucket algorithm
- ✅ Complete data source attribution and audit trail
- ✅ Secure credential storage (environment variables only)
- ✅ User data deletion support (`python cli.py delete <project_id>`)
- ✅ Offline mode available (no API calls, local processing only)
- ✅ Cache transparency (view and clear cached data)
- ✅ Terms of Service compliance for all providers

### Offline Mode

Run without internet for privacy or testing:

```bash
# Use only cached data
python cli.py create --name "Offline Project" \
  --seeds "cached,keywords" \
  --offline-mode

# Or set in .env
OFFLINE_MODE=true
```

In offline mode:
- Uses cached SERP data only
- Skips trend analysis
- Performs clustering and scoring locally
- No API calls or external requests
- Ideal for sensitive projects or air-gapped environments

### Data Deletion

Complete removal of project data:

```bash
# Delete project and all associated data
python cli.py delete <project_id> --confirm

# Clear all caches
python cli.py clear-cache --all
```

This removes:
- All keywords, topics, and briefs
- SERP snapshots and cached responses
- Audit logs for that project
- Generated exports (if stored locally)

## 🛠️ Troubleshooting

### Rate Limit Errors

Reduce requests per minute in `.env`:
```
SERP_API_RPM=20
AUTOSUGGEST_RPM=10
```

### Low Keyword Count

- Increase seed keywords
- Enable competitor analysis
- Add geographic modifiers
- Check API quota usage

### Poor Clustering

- Adjust thresholds in `.env`
- Ensure diverse seed keywords
- Check language/normalization settings

## 📝 Roadmap

### Phase 2
- Entity-first topical maps
- Internal link auditor
- CTR models by niche
- Local pack analysis
- YouTube keyword mode

### Phase 3
- Opportunity forecasting
- Multi-site rollups
- Writer workload planning
- A/B testing of briefs

## 🤝 Contributing

Contributions welcome! Focus areas:
1. Additional data providers
2. Export format integrations
3. Language support expansion
4. UI/dashboard development

## 📄 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

Built with:
- SerpAPI for SERP data
- sentence-transformers for embeddings
- pytrends for Google Trends
- NLTK for text processing
- SQLAlchemy for data persistence

## 📞 Support

For issues and questions:
1. Check troubleshooting guide above
2. Review provider documentation
3. Open GitHub issue with:
   - Error message
   - Minimal reproduction case
   - Environment details

---

**Built for agencies, SEO teams, and content creators who need scalable, data-driven keyword research.**
