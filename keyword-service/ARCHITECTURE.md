# Architecture Documentation

## System Overview

The keyword research tool is built as a modular, pipeline-based system with clear separation of concerns.

## Core Components

### 1. Data Acquisition Layer (`providers/`)

**Purpose**: Fetch data from external APIs with rate limiting, caching, and retry logic.

**Modules**:

- `base.py`: Base provider class with:
  - Token bucket rate limiter
  - Cache management (SQLite-backed)
  - Audit logging
  - Exponential backoff retry decorator

- `autosuggest.py`: Keyword suggestions from:
  - Google autocomplete
  - Bing autocomplete
  - YouTube autocomplete
  - Wildcard pattern expansion

- `serpapi_client.py`: SERP data via SerpAPI:
  - Organic results (top 10)
  - SERP features detection
  - People Also Ask questions
  - Ads density calculation
  - Map pack detection

- `trends.py`: Google Trends integration:
  - Interest over time
  - Trending searches
  - Seasonality detection
  - Trend direction classification

**Design Patterns**:
- Adapter pattern for different APIs
- Cache-aside for performance
- Circuit breaker for fault tolerance

### 2. Processing Layer (`processing/`)

**Purpose**: Transform raw keyword data into actionable intelligence.

**Modules**:

- `normalizer.py`: Text normalization and deduplication
  - Unicode normalization
  - Lemmatization (WordNet)
  - Stopword handling
  - Edit distance deduplication
  - Token extraction

- `intent_classifier.py`: Rule-based intent classification
  - Pattern matching for 5 intent types
  - Confidence scoring
  - Question detection
  - Modifier extraction

- `entity_extractor.py`: Entity extraction
  - Products, locations, audiences
  - Price signals, brands, years
  - Problem/pain point detection
  - Core topic extraction

- `scoring.py`: Proprietary scoring algorithms
  - **Difficulty (0-100)**:
    - SERP strength (40%): homepage ratio, brands
    - Competition (30%): title matching
    - SERP crowding (20%): ads + features
    - Content depth (10%): snippet length proxy
  
  - **Traffic Potential**:
    - Volume × CTR at target rank
    - CTR curves by intent and SERP layout
    - Feature impact modeling
  
  - **Opportunity Score**:
    - (Traffic × CPC weight × Intent fit) / (Difficulty + Brand crowding)
    - Normalized with logarithmic scaling

- `clustering.py`: ML-based keyword clustering
  - Sentence embeddings (sentence-transformers)
  - Cosine similarity matrix
  - Agglomerative clustering
  - Two-level hierarchy (topic → page)
  - Token overlap hybrid approach
  - Hub-cluster graph generation

- `brief_generator.py`: Content brief creation
  - Intent-specific outline templates
  - FAQ extraction from PAA
  - Entity-driven sections
  - Schema.org recommendations
  - SERP feature targeting
  - Word count suggestions
  - Internal link planning

### 3. Expansion Engine (`expansion.py`)

**Purpose**: Grow seed keywords into comprehensive keyword lists.

**Methods**:
1. Autosuggest expansion (prefix, suffix, wildcard)
2. Intent-based modifier injection
3. People Also Ask extraction
4. Related searches from SERP
5. Geographic modifiers (service × location)
6. Competitor keyword extraction

**Deduplication**: Multi-stage with normalization and similarity threshold.

### 4. Orchestration Layer (`orchestrator.py`)

**Purpose**: Coordinate the complete workflow.

**Pipeline Stages**:
```
Seeds → Expansion → Metrics → Processing → Clustering → Briefs → Storage
```

**Features**:
- Progress tracking with tqdm
- Error handling and recovery
- Batch processing
- Database transactions
- Audit trail logging

### 5. Export Layer (`exports/`)

**Purpose**: Output data in multiple formats.

**Exporters**:

- `csv_export.py`: Pandas-based CSV generation
  - Keywords with full metrics
  - Brief summaries
  - Content calendars

- `sheets_export.py`: Google Sheets integration
  - OAuth2 authentication
  - Worksheet management
  - Header formatting
  - Direct URL output

- `notion_export.py`: Notion API integration
  - Database page creation
  - Rich block content
  - Property mapping
  - Nested structures (outline, FAQs)

- `wordpress_export.py`: WordPress REST API
  - Draft post creation
  - HTML content generation
  - Custom field mapping
  - Schema meta injection

### 6. Reporting Layer (`reporting.py`)

**Purpose**: Generate insights and calendars.

**Features**:

- **Content Calendar**:
  - Priority-based scheduling
  - Week-by-week distribution
  - Cadence control
  - Assignment tracking

- **Project Reports**:
  - Aggregate metrics
  - Intent distribution
  - Top opportunities
  - Strategic recommendations

### 7. Data Layer (`models.py`, `database.py`)

**Schema**:

```
Project (1) → (N) Keyword
Project (1) → (N) Topic
Project (1) → (N) PageGroup
Project (1) → (N) SerpSnapshot
Topic (1) → (N) Keyword
PageGroup (1) → (N) Keyword
```

**Key Fields**:
- `Keyword`: text, lemma, intent, entities, volume, difficulty, opportunity, SERP features
- `Topic`: label, pillar, metrics, graph structure
- `PageGroup`: label, outline, FAQs, schema, internal links, word range
- `SerpSnapshot`: query, results, features, raw JSON
- `AuditLog`: operation, data source, quota, status
- `Cache`: key-value with expiration

**Indexes**:
- `(project_id, opportunity)` for sorting
- `(project_id, intent)` for filtering
- `lemma` for deduplication
- `(query, geo, language)` for SERP lookups

### 8. CLI (`cli.py`)

**Commands**:
- `create`: Run full pipeline
- `list`: Show all projects
- `report`: Display project summary
- `export`: Multi-format export
- `calendar`: Generate content calendar
- `init`: Database initialization

**Design**: Click-based with clear help text and validation.

## Data Flow

### End-to-End Example

```
Input: ["seo tools"]
  ↓
Expansion (autosuggest, modifiers)
  → ["seo tools", "best seo tools", "seo tools for beginners", ...]
  ↓
Metrics Collection (SERP, Trends)
  → [{keyword, volume, cpc, SERP data}, ...]
  ↓
Processing (intent, entities, scoring)
  → [{keyword, intent, difficulty, opportunity}, ...]
  ↓
Clustering (topics → pages)
  → Topics: [SEO Tools Overview, Free SEO Tools, Enterprise SEO]
  → Pages: [Best SEO Tools 2024, Top 10 Free Tools, ...]
  ↓
Brief Generation
  → [{outline, FAQs, schema, word_count}, ...]
  ↓
Storage (SQLite)
  → Project #1 with 347 keywords, 12 topics, 28 pages
  ↓
Export (CSV, Sheets, Notion, WP)
  → Client-ready deliverables
```

## Scalability Considerations

### Current Limits (MVP)
- 500 keywords per project (quota management)
- 50 briefs per export
- SQLite database (single file)
- Serial processing

### Phase 2 Scaling
- PostgreSQL for production
- Celery task queue for parallel processing
- Redis for distributed caching
- Batch API calls (5-10 concurrent)
- Incremental updates vs full refresh

## Security

### API Key Management
- Environment variables only
- No keys in code or git
- Service account rotation support
- Audit log of all API calls

### Data Privacy
- No PII storage
- User data deletion support
- Rate limit enforcement
- Provider TOS compliance

## Testing Strategy

### Unit Tests
- Provider clients (mocked responses)
- Processing modules (fixed datasets)
- Scoring algorithms (known inputs/outputs)

### Integration Tests
- Full pipeline with sample project
- Export format validation
- Database transactions

### Quality Metrics
- Cluster purity (Silhouette score)
- Brief entity coverage
- Difficulty correlation (vs Ahrefs/Semrush)
- Repeatability (same seeds → same results)

## Performance Benchmarks

### Target Performance
- Time to first result: <10 min for 1k seeds
- Clustering: <30s for 500 keywords
- Brief generation: <5s per brief
- Export: <10s for CSV, <30s for Sheets

### Bottlenecks
1. API rate limits (primary constraint)
2. SERP API latency (~500ms per call)
3. Embedding generation (~10ms per keyword)
4. Database writes (batch transactions help)

## Configuration

### Environment Variables
See `.env.example` for full list.

**Critical Settings**:
- `SERPAPI_API_KEY`: Required for SERP data
- `*_RPM`: Rate limit controls
- `*_THRESHOLD`: Clustering sensitivity
- `DATABASE_URL`: Storage backend

### Tuning Recommendations

**For Higher Recall** (more keywords):
- Increase autosuggest depth
- Lower deduplication threshold
- Enable all expansion methods

**For Higher Precision** (better keywords):
- Increase clustering thresholds
- Filter by min volume
- Focus on single intent type

**For Speed**:
- Reduce SERP lookups (sample subset)
- Disable Trends (optional)
- Use cached SERP data
- Limit page groups per topic

## Extension Points

### Adding New Providers

1. Extend `BaseProvider`
2. Implement rate limiting
3. Add caching layer
4. Log to audit trail

Example:
```python
class NewProvider(BaseProvider):
    def __init__(self):
        super().__init__("new_provider", rpm=60)
    
    @BaseProvider.with_retry
    def fetch_data(self, query):
        cache_key = self._make_cache_key(query)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        self.rate_limiter.acquire()
        # ... fetch logic ...
        self._set_cache(cache_key, data)
        return data
```

### Adding New Export Formats

1. Create module in `exports/`
2. Implement export methods
3. Add CLI option
4. Update README

### Custom Intent Types

Edit `intent_classifier.py`:
```python
CUSTOM_PATTERNS = [
    r'\b(pattern1|pattern2)\b'
]
```

### Custom Scoring Weights

Edit `scoring.py`:
```python
difficulty = (
    serp_strength * 0.5 +  # Adjust weights
    competition * 0.3 +
    crowding * 0.15 +
    content_depth * 0.05
)
```

## Deployment

### Local Development
```bash
python cli.py create --name "Test"
```

### Production (Server)
```bash
# Run as scheduled job
0 2 * * * /path/to/venv/bin/python /path/to/cli.py refresh --all

# Or via n8n webhook
curl -X POST https://n8n.example.com/webhook/keyword-research \
  -d '{"seeds": ["keyword1", "keyword2"]}'
```

### Docker (Future)
```dockerfile
FROM python:3.11-slim
COPY . /app
RUN pip install -r requirements.txt
CMD ["python", "cli.py", "serve"]
```

## Monitoring

### Key Metrics
- API quota usage (audit logs)
- Pipeline success rate
- Average processing time
- Cache hit rate
- Cluster quality scores

### Alerts
- API quota >80%
- Pipeline failures >10%
- Database size >1GB (migrate to Postgres)
- Cache expiration rate >50%

## Troubleshooting

### Common Issues

**"No keywords found"**
- Check SERPAPI_API_KEY
- Verify quota remaining
- Try broader seeds
- Reduce rate limits

**"Clustering failed"**
- Ensure >10 keywords
- Check embedding model loaded
- Lower clustering threshold
- Verify memory available

**"Export error"**
- Check credentials (Sheets, Notion, WP)
- Verify network access
- Test with smaller dataset
- Review audit logs

See README.md for more troubleshooting.
