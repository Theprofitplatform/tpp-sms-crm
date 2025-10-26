# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready keyword research and content planning tool for SEO agencies and content teams. Automates keyword expansion, SERP analysis, clustering, scoring, and content brief generation using Python with SQLAlchemy ORM and multiple API integrations.

## Core Commands

### Environment Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download required spaCy model
python -m spacy download en_core_web_sm

# Configure environment
cp .env.example .env
# Edit .env and add at minimum: SERPAPI_API_KEY

# Initialize database
python cli.py init
```

### Development Workflow
```bash
# Run tests (unit tests only)
pytest

# Run with integration tests (requires API keys)
pytest --run-integration

# Run slow tests
pytest --run-slow

# Run specific test file
pytest tests/test_clustering.py

# Run smoke tests only
pytest -m smoke
```

### CLI Operations
```bash
# Create a new project
python cli.py create \
  --name "Project Name" \
  --seeds "seed1,seed2,seed3" \
  --geo US \
  --language en \
  --focus informational

# List all projects
python cli.py list

# View project report
python cli.py report <project_id>

# Export data
python cli.py export <project_id> --format csv --output keywords.csv
python cli.py export <project_id> --format sheets
python cli.py export <project_id> --format notion

# Generate content calendar
python cli.py calendar <project_id> --weeks 12 --posts-per-week 2

# Delete project
python cli.py delete <project_id> --confirm

# View audit logs
python cli.py audit --last 7d

# Clear cache
python cli.py clear-cache --all
```

## Architecture

### Pipeline Flow
The orchestrator (`orchestrator.py`) runs a sequential 7-stage pipeline:

1. **Keyword Expansion** (`expansion.py`): Expands seed keywords via autosuggest, PAA, related searches, and intent modifiers
2. **SERP Collection** (`providers/serpapi_client.py`): Fetches SERP data for each keyword
3. **Metrics Enrichment** (`providers/trends.py`): Adds search volume, CPC, and trend data
4. **Normalization** (`processing/normalizer.py`): Deduplicates and normalizes keywords
5. **Classification** (`processing/intent_classifier.py`, `processing/entity_extractor.py`): Classifies intent and extracts entities
6. **Scoring** (`processing/scoring.py`): Calculates difficulty, traffic potential, and opportunity scores
7. **Clustering** (`processing/clustering.py`): Groups keywords into topics and page groups using hierarchical clustering
8. **Brief Generation** (`processing/brief_generator.py`): Creates content briefs with outlines, FAQs, and schema recommendations

### Data Models
SQLAlchemy models in `models.py`:
- **Project**: Top-level container with settings and configuration
- **Keyword**: Individual keywords with all metrics, classification, and scoring
- **Topic**: Broader thematic clusters (threshold: 0.78)
- **PageGroup**: Single-page keyword targets (threshold: 0.88)
- **SerpSnapshot**: Raw SERP data for each keyword
- Relationships: Project → Keywords → Topics/PageGroups with cascade deletion

### Provider Architecture
All data providers in `providers/` inherit from `base.py` which provides:
- Token-bucket rate limiting with configurable RPM
- Automatic caching with TTL
- Retry logic with exponential backoff
- Audit logging for all API calls

Current providers:
- `serpapi_client.py`: SERP data, PAA questions, related searches
- `autosuggest.py`: Google/Bing/YouTube autosuggest APIs
- `trends.py`: Google Trends seasonality analysis

### Configuration Management
`config.py` uses Pydantic settings with environment variable precedence. All settings can be overridden in `.env` file. Key settings:
- API credentials and provider selection
- Rate limits (RPM) per provider
- Clustering thresholds (topic, page, sibling)
- Feature flags for expansion methods
- Database URL (SQLite default, PostgreSQL recommended for production)

## Key Implementation Details

### Clustering Algorithm
Two-level hierarchical clustering (`processing/clustering.py`):
1. **Topic Clustering**: Agglomerative clustering with threshold 0.78 for broader themes
2. **Page Grouping**: Stricter threshold 0.88 for single-page targets

Uses hybrid similarity:
- Sentence embeddings (all-MiniLM-L6-v2) via sentence-transformers
- Token overlap (Jaccard similarity)
- Combined weighted score

### Difficulty Scoring
Proprietary 0-100 score (`processing/scoring.py`):
- SERP Strength (40%): Homepage ratio, brand presence in top 10
- Competition (30%): Exact-match titles
- SERP Crowding (20%): Ads + SERP features
- Content Depth (10%): Word count proxy

### Opportunity Score
Prioritization metric balancing traffic potential vs difficulty:
```python
Opportunity = (Traffic Potential × CPC Weight × Intent Fit) / (Difficulty + Brand Crowding)
```

### Intent Classification
Rule-based + pattern matching in `processing/intent_classifier.py`:
- Informational: "how to", "guide", "what is", "tutorial"
- Commercial: "best", "review", "vs", "comparison", "top"
- Transactional: "buy", "price", "discount", "coupon", "deal"
- Local: "near me", location names
- Navigational: Brand/site searches

### Content Brief Structure
Generated briefs include:
- Search intent summary
- H1/H2/H3 outline derived from SERP titles
- FAQs from People Also Ask
- Must-cover entities (people, products, concepts)
- Internal linking recommendations (hub-spoke model)
- Schema.org types to target
- SERP features to optimize for
- Recommended word count range

## Testing Strategy

Test configuration in `tests/conftest.py`:
- **Unit tests**: Run by default, no API calls
- **Integration tests**: Marked with `@pytest.mark.integration`, require `--run-integration` flag and real API keys
- **Slow tests**: Marked with `@pytest.mark.slow`, require `--run-slow` flag
- **Smoke tests**: Quick validation tests marked with `@pytest.mark.smoke`

Fixtures provided:
- `test_database`: Temporary SQLite database
- `mock_env_vars`: Test environment variables
- `sample_keywords`: Standard test keyword set
- `sample_serp_data`: Mock SERP responses
- `tmp_output_dir`: Temporary output directory

## Common Development Tasks

### Adding a New Data Provider
1. Create provider class in `providers/` inheriting from `BaseProvider` (in `providers/base.py`)
2. Implement required methods: `fetch()`, `parse()`, handle rate limiting
3. Add API credentials to `config.py` Settings class
4. Add configuration variables to `.env.example`
5. Register provider in `orchestrator.py` pipeline
6. Add unit tests in `tests/test_providers.py`

### Adding a New Export Format
1. Create exporter class in `exports/` with `export()` method
2. Add any required credentials to `config.py`
3. Add CLI command in `cli.py` with new format option
4. Update `.env.example` with new integration settings
5. Add feature flag to enable/disable

### Modifying Clustering Thresholds
Edit `.env` file:
```
TOPIC_CLUSTER_THRESHOLD=0.80  # Lower = more clusters
PAGE_GROUP_THRESHOLD=0.90     # Higher = fewer page groups
SIBLING_LINK_THRESHOLD=0.92   # Internal linking similarity
```

### Adding Custom Scoring Weights
Scoring weights are configurable via YAML file (referenced in `.env` as `SCORING_WEIGHTS_CONFIG`). Modify weights for difficulty components or opportunity formula.

## Database Management

### Database Schema
SQLite by default (`keyword_research.db`). For production, use PostgreSQL by setting:
```
DATABASE_URL=postgresql://user:password@localhost:5432/keyword_research
```

### Migrations
Uses Alembic for schema migrations:
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Querying Audit Logs
All API calls are logged to `audit_logs` table:
```sql
-- See provider usage for a project
SELECT provider, COUNT(*) as calls, SUM(quota_consumed) as quota
FROM audit_logs
WHERE project_id = 1
GROUP BY provider;
```

## Privacy & Compliance

### Data Sources
All data sources are logged and attributed:
- SerpAPI: SERP results, PAA, related searches, SERP features
- Google Trends: Seasonality and trend direction
- Autosuggest: Keyword suggestions from Google/Bing/YouTube
- Google Ads (optional): Official search volume and CPC
- Search Console (optional): Existing ranking data

### Offline Mode
Set `OFFLINE_MODE=true` in `.env` to use only cached data without API calls.

### Telemetry
Disabled by default. Set `ENABLE_TELEMETRY=false` in `.env`. Never collects API keys, project data, or PII.

## Common Issues

### Rate Limit Errors
Reduce RPM in `.env`:
```
SERP_API_RPM=20
AUTOSUGGEST_RPM=10
```

### Low Keyword Count
- Increase number of seed keywords
- Enable additional expansion methods in `.env` (ENABLE_COMPETITOR_GAP, ENABLE_YOUTUBE_SUGGESTIONS)
- Add geographic modifiers for local services
- Check API quota usage in audit logs

### Poor Clustering Quality
- Adjust thresholds in `.env` (lower for more granular clusters)
- Ensure diverse seed keywords
- Check that spaCy model is installed (`python -m spacy download en_core_web_sm`)
- Verify embedding model is downloaded (happens automatically on first run)

### Missing Dependencies
Ensure all requirements installed:
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### Database Locked
SQLite limitations with concurrent access. For production, use PostgreSQL.

## Roadmap Features (in planning)

- Entity-first topical maps
- Internal link auditor
- CTR models by niche
- Local pack analysis
- YouTube keyword mode
- Opportunity forecasting
- Multi-site rollups
