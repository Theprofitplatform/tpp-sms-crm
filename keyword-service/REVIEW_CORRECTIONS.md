# REVIEW CORRECTIONS

## Acknowledgment of Actual Codebase State

**What Actually Exists (Corrected Understanding):**

✅ **Substantial Implementation** - Not skeleton code:
- Full 8-stage orchestration pipeline in `orchestrator.py`
- Complete processing modules: `intent_classifier.py`, `entity_extractor.py`, `scoring.py`, `clustering.py`, `brief_generator.py`
- Working provider implementations: `serpapi_client.py`, `autosuggest.py`, `trends.py`
- BaseProvider with rate limiting, caching, retry logic, and audit logging

✅ **Testing Infrastructure** - Already in place:
- `tests/conftest.py` with fixtures and `--run-integration` flag
- `test_clustering.py` and `test_providers.py` present
- Proper test markers: `@pytest.mark.integration`, `@pytest.mark.slow`, `@pytest.mark.smoke`

✅ **Configuration & Compliance** - Already present:
- `constraints.txt` exists
- `.env.example` with comprehensive API key entries (Google Ads, Sheets, Notion, WordPress, Search Console - lines 46-61)
- Audit logging framework described in README (lines 336-355) with SQL query examples
- Data source attribution and transparency section

✅ **Documentation** - Comprehensive:
- README with data source ledger, privacy section, compliance features, offline mode
- Clear workflow and architecture diagrams
- Troubleshooting guide

**Adjustment Required:**
Review scope and wording updated to reflect **enhancement and hardening** of existing substantial codebase, not building from skeleton.

---

## PRE-IMPLEMENTATION AUDIT
**Target: 1 hour | Required before any PR work**

### Tasks

1. **Run Test Suite**
   ```bash
   # Unit tests only
   pytest

   # With integration (requires API keys)
   pytest --run-integration

   # Record coverage
   pytest --cov=. --cov-report=term-missing
   ```
   - [ ] Record coverage percentage
   - [ ] Note any failing tests
   - [ ] Document missing test areas

2. **Code Verification**
   ```bash
   # Review all processing modules
   ls -la processing/*.py

   # Review all providers
   ls -la providers/*.py
   ```
   - [ ] Skim each processing/*.py file
   - [ ] Verify features in README match actual implementations
   - [ ] Check if clustering thresholds are configurable
   - [ ] Confirm difficulty scoring components exist

3. **Quota and Audit Verification**
   - [ ] Check if audit_logs table exists in `models.py`
   - [ ] Verify audit logging implementation in `providers/base.py`
   - [ ] Confirm quota tracking paths in code
   - [ ] Test if quota summary displays at run end

4. **End-to-End Test**
   ```bash
   # Set up minimal environment
   cp .env.example .env
   # Add SERPAPI_API_KEY

   # Initialize database
   python cli.py init

   # Create sample project
   python cli.py create \
     --name "Audit Test" \
     --seeds "seo tools,keyword research" \
     --geo US \
     --focus informational
   ```
   - [ ] Run one complete project
   - [ ] Verify exports generated (CSVs)
   - [ ] Check if raw SERP snapshots saved
   - [ ] Review database schema
   - [ ] Confirm audit logs populated

5. **Dependencies Check**
   ```bash
   # Verify constraints.txt is current
   diff <(sort requirements.txt) <(sort constraints.txt)

   # Check for security vulnerabilities
   pip install safety
   safety check
   ```
   - [ ] Ensure constraints.txt matches requirements.txt versions
   - [ ] Note any outdated dependencies
   - [ ] Check for security vulnerabilities

---

## PRIORITIES (MoSCoW Framework)

### P0 - BLOCKERS FOR DOGFOODING
**Cannot run client trials without these**

#### 1. LICENSE
- **Status**: Missing
- **Impact**: Legal blocker - cannot distribute or use with clients
- **Recommendation**: MIT (permissive) or Apache-2.0 (patent protection)
- **Effort**: 5 minutes

#### 2. SECURITY.md
- **Status**: Missing
- **Impact**: No vulnerability reporting workflow
- **Must Include**:
  - Vulnerability reporting email/process
  - Supported versions
  - Response timeline commitments
  - Data retention and deletion policy
  - Key rotation schedule
- **Effort**: 2 hours

#### 3. Rate Limiting with Hard Cutoffs
- **Status**: BaseProvider has rate limiting; verify hard cutoffs
- **Required**:
  - Exponential backoff with jitter (not just fixed delays)
  - Per-provider hard limits (stop after N requests per run)
  - Global rate limiting across all providers
  - Graceful degradation when limits hit
- **Verify**: Check if `providers/base.py` has these features
- **Effort**: 4-8 hours if building from scratch, 1-2 hours if enhancing

#### 4. Quota Tracking
- **Status**: Audit logging exists; verify end-of-run summary
- **Required**:
  - Display quota usage at run end
  - Per-provider breakdown
  - Remaining quota estimates
  - Warning when approaching limits
  - Storage in audit_logs table
- **Effort**: 2-4 hours

---

### P1 - NEEDED FOR STABLE CLIENT TRIALS
**Required for production-grade reliability**

#### 1. CI with Lint + Tests
- **Status**: Missing `.github/workflows/ci.yml`
- **Required**:
  - Lint (ruff or flake8)
  - Type checking (mypy)
  - Unit tests (without API keys)
  - Export schema validation
  - Run on PRs and main branch
- **Effort**: 3-4 hours

#### 2. constraints.txt Freshness
- **Status**: File exists; verify it's current and pinned
- **Required**:
  - All versions pinned (not just ranges)
  - Matches actual imports
  - Regenerated with `pip freeze`
  - Documented update process
- **Effort**: 30 minutes

#### 3. Example Project + Schema Validation
- **Status**: Missing
- **Required**:
  - `examples/sample_project/` with 2-3 seed keywords
  - Gold standard exports (keywords.csv, topics.csv, briefs.csv)
  - `test_exports_schema.py` validates column contracts
  - CI runs example and compares schemas
- **Effort**: 4-6 hours

---

### P2 - IMPROVES QUALITY BEFORE SCALE
**Should complete before scaling to multiple clients**

#### 1. Enhanced Difficulty Scoring
- **Status**: Basic difficulty exists; needs component breakdown
- **Required Inputs**:
  - `allintitle` ratio (exact-match titles / total results)
  - Brand domain share in top-10
  - SERP crowding score (ads + features count)
  - Existing: homepage ratio, competition, content depth
- **Output**: Component breakdown visible in reports
- **Effort**: 6-8 hours

#### 2. Configurable Clustering Thresholds
- **Status**: Hardcoded or in config.py; expose in reports
- **Required**:
  - Read from `.env`: `TOPIC_CLUSTER_THRESHOLD`, `PAGE_GROUP_THRESHOLD`
  - Display in `cli.py report` output
  - Allow per-project overrides
- **Effort**: 2-3 hours

#### 3. Failure Handling + Resume
- **Status**: Unknown; likely missing
- **Required**:
  - Pipeline checkpoints after each stage
  - `--resume` flag to continue from last checkpoint
  - Idempotent operations (safe to re-run)
  - Partial output preservation
- **Effort**: 8-12 hours

---

### P3 - NICE TO HAVE
**Can defer to Phase 2/3**

#### 1. ARCHITECTURE.md
- Visual diagrams of pipeline stages
- Entity relationship diagram
- Provider architecture patterns

#### 2. Local SEO Data Bundles
- AU and NP suburb/postcode lists
- Geographic expander
- Map pack detection
- **Note**: This is a major feature; move to Phase 3 or separate product unless client-funded

#### 3. docker-compose.yml
- App + Redis + PostgreSQL
- Volumes for /data and /exports
- Development and production configs

---

## PR SEQUENCE
**Small, reviewable PRs instead of mega-PR**

### PR #1: Compliance Pack
**Branch**: `compliance/license-security-conduct`
**Title**: Add LICENSE, SECURITY.md, and CODE_OF_CONDUCT.md

**Scope**:
- LICENSE file (MIT recommended)
- SECURITY.md with vulnerability reporting
- CODE_OF_CONDUCT.md (Contributor Covenant template)
- Verify `.env` in `.gitignore`

**Acceptance Criteria**:
- [ ] LICENSE file present and valid
- [ ] SECURITY.md includes:
  - [ ] Vulnerability reporting email (monitored inbox)
  - [ ] Expected response timeline
  - [ ] Supported versions
  - [ ] Data retention and deletion policy
- [ ] CODE_OF_CONDUCT.md present
- [ ] `.env` confirmed in `.gitignore`
- [ ] No secrets in git history (`git log -p | grep -i "api.*key"`)

**Effort**: 2-3 hours
**Files**: 3 new, 1 verification

---

### PR #2: CI + Testing Foundation
**Branch**: `ci/github-actions-lint-test`
**Title**: Add CI workflow with lint, type checking, and tests

**Scope**:
- `.github/workflows/ci.yml`
- Update `pytest.ini` or `pyproject.toml` config
- Optional: `pre-commit` hooks config
- Document test flags in README

**Acceptance Criteria**:
- [ ] CI runs on all PRs and pushes to main
- [ ] Lint passes (ruff/flake8)
- [ ] Type checking passes (mypy) with reasonable strictness
- [ ] Tests run and pass without integration keys
- [ ] CI fails on lint/test failures
- [ ] README documents:
  - [ ] How to run tests locally
  - [ ] `--run-integration` flag usage
  - [ ] Required environment variables for integration tests

**Effort**: 3-4 hours
**Files**: 1 new workflow, 1-2 config updates, README edits

---

### PR #3: Reproducibility + Example Project
**Branch**: `examples/sample-project-validation`
**Title**: Add example project with export schema validation

**Scope**:
- `examples/sample_project/` directory
- 2-3 seed keywords
- Pre-generated gold standard CSVs (keywords.csv, topics.csv, briefs.csv)
- `tests/test_exports_schema.py`
- Update `constraints.txt` (regenerate with `pip freeze`)

**Acceptance Criteria**:
- [ ] `make example` or `./run_example.sh` produces three CSVs
- [ ] Gold standard CSVs committed with known schema
- [ ] `test_exports_schema.py` validates:
  - [ ] Column names match specification
  - [ ] UTF-8 encoding
  - [ ] Headers present
  - [ ] Required columns non-empty
  - [ ] JSON columns valid (if using JSON in cells)
- [ ] CI runs example validation
- [ ] `constraints.txt` updated to match all imports
- [ ] Documentation explains how to run example

**Effort**: 4-6 hours
**Files**: examples/ directory, 1 test file, constraints.txt update

---

### PR #4: Reliability - Rate Limiting Enhancement
**Branch**: `reliability/token-bucket-backoff`
**Title**: Add token bucket, exponential backoff, and quota summary

**Scope**:
- Enhance `providers/base.py` BaseProvider
- Token bucket implementation per provider
- Exponential backoff with jitter
- Run summary displaying quota usage
- Tests for rate limiting behavior

**Acceptance Criteria**:
- [ ] Per-provider RPM configurable via `.env`
- [ ] Token bucket refills at configured rate
- [ ] Exponential backoff on 429/503 errors
- [ ] Jitter added to prevent thundering herd
- [ ] Logs show:
  - [ ] Rate limit sleep durations
  - [ ] Remaining tokens
  - [ ] Retry attempts and backoff times
- [ ] End-of-run summary prints:
  - [ ] Requests per provider
  - [ ] Quota consumed
  - [ ] Rate limit delays (total time)
  - [ ] Remaining quota estimates
- [ ] Tests simulate throttle scenarios:
  - [ ] Burst exceeding RPM
  - [ ] Sustained load at RPM limit
  - [ ] 429 responses trigger backoff
- [ ] README documents rate limiting behavior

**Effort**: 6-10 hours
**Files**: providers/base.py, tests/test_rate_limiting.py, README updates

---

### PR #5: Metrics Enhancement
**Branch**: `metrics/difficulty-scoring-upgrade`
**Title**: Enhanced difficulty scoring with component breakdown

**Scope**:
- Update `processing/scoring.py`
- Add allintitle ratio calculation
- Add brand domain share in top-10
- Add SERP crowding score (ads + features count)
- Add `data/ctr_layouts.csv` for CTR by SERP layout
- Update reports to show component breakdown

**Acceptance Criteria**:
- [ ] Difficulty calculation includes:
  - [ ] SERP Strength (40%): homepage ratio, brand presence
  - [ ] Competition (30%): exact-match titles (allintitle ratio)
  - [ ] SERP Crowding (20%): ads + SERP features count
  - [ ] Content Depth (10%): word count proxy
- [ ] Component values stored per keyword
- [ ] `cli.py report` displays component breakdown for sample keywords
- [ ] `data/ctr_layouts.csv` loaded at runtime
- [ ] CTR selected based on SERP features present
- [ ] Unit tests for each component:
  - [ ] `test_allintitle_ratio()`
  - [ ] `test_brand_share()`
  - [ ] `test_serp_crowding()`
- [ ] README documents difficulty formula

**Effort**: 6-8 hours
**Files**: processing/scoring.py, data/ctr_layouts.csv, tests updates, README

---

### PR #6: Failure Handling + Resume
**Branch**: `reliability/resume-checkpoints`
**Title**: Add robust error handling and resumable runs

**Scope**:
- Pipeline checkpoints in `orchestrator.py`
- `--resume` flag in `cli.py`
- Idempotent stage operations
- Checkpoint state in database
- Error handling matrix implementation

**Acceptance Criteria**:
- [ ] Each pipeline stage writes checkpoint on completion
- [ ] Checkpoint state stored in database (projects table or new checkpoints table)
- [ ] Partial outputs preserved on failure
- [ ] `--resume` flag restarts from last successful checkpoint
- [ ] Idempotent operations (safe to re-run stages)
- [ ] Error handling per provider:
  - [ ] Invalid API key: fail fast, mark unavailable, continue with partial
  - [ ] 4xx non-auth: skip item, log reason, continue
  - [ ] 429/5xx: retry with backoff, then degrade
  - [ ] Network timeout: single retry, distinct from rate limit
- [ ] `audit_logs` records status per stage and provider
- [ ] Tests simulate mid-run failure:
  - [ ] Abort at stage 5
  - [ ] Resume produces identical results to clean run
- [ ] README documents:
  - [ ] How to use `--resume`
  - [ ] What happens on failures
  - [ ] How to debug stuck runs

**Effort**: 8-12 hours
**Files**: orchestrator.py, cli.py, models.py, tests, README

---

### PR #7: Documentation Pack
**Branch**: `docs/quickstart-exports-operations`
**Title**: Add QUICKSTART.md, EXPORTS.md, and OPERATIONS.md

**Scope**:
- QUICKSTART.md - 10-minute getting started guide
- EXPORTS.md - Canonical export schemas
- OPERATIONS.md - Troubleshooting, quotas, logs

**Acceptance Criteria**:
- [ ] QUICKSTART.md includes:
  - [ ] Prerequisites (Python version, API keys)
  - [ ] 5-step setup (clone, venv, install, env, init)
  - [ ] First project creation with example output
  - [ ] Expected runtime and results
  - [ ] Under 10 minutes for example project
- [ ] EXPORTS.md includes:
  - [ ] Exact column specifications for all CSV formats
  - [ ] Data types and formats
  - [ ] Encoding (UTF-8, LF newlines)
  - [ ] JSON field structure (if using JSON in CSV cells)
  - [ ] Schema version
  - [ ] Sample rows
- [ ] OPERATIONS.md includes:
  - [ ] Common errors with solutions
  - [ ] Quota troubleshooting
  - [ ] Log locations and formats
  - [ ] How to monitor runs
  - [ ] Database queries for debugging
  - [ ] Performance tuning
- [ ] All docs tested by following steps verbatim

**Effort**: 4-6 hours
**Files**: 3 new docs

---

## SCHEMA DECISIONS

### CSV List Field Handling

**Decision**: Use JSON in CSV cells for structured lists

**Rationale**:
- Single source of truth
- Proper escaping handled by CSV library
- Easy to parse programmatically
- No ambiguity with pipe delimiters
- Standard approach for complex data in CSV

**Format**:
```csv
keyword,must_cover_entities,faqs,internal_links_from
"seo tools","[""keyword research"", ""seo"", ""tools""]","[{""question"": ""What are SEO tools?"", ""answer_hint"": ""Software for optimization""}]","[""seo-guide"", ""tools-comparison""]"
```

### Column Specifications

#### keywords.csv
```
keyword: string
lemma: string (normalized form)
lang: string (ISO 639-1)
geo: string (ISO 3166-1)
intent: string (informational|commercial|transactional|navigational|local)
entities: JSON array of strings
volume: integer (monthly search volume)
cpc: float (cost per click, USD)
trend_score: float (-1 to 1, negative=declining, positive=rising)
serp_features: JSON array of strings
difficulty: float (0-100)
difficulty_serp_strength: float (0-1 component)
difficulty_competition: float (0-1 component)
difficulty_serp_crowding: float (0-1 component)
difficulty_content_depth: float (0-1 component)
traffic_potential: float (estimated monthly clicks)
opportunity: float (prioritization score)
topic_id: integer (foreign key)
page_group_id: integer (foreign key)
is_pillar: boolean
source: string (seed|autosuggest|paa|competitor|related)
notes: string
created_at: ISO 8601 timestamp
```

#### topics.csv
```
topic_id: integer
label: string (primary keyword or generated label)
pillar_keyword: string
cluster_size: integer
avg_difficulty: float
total_traffic_potential: float
opportunity_sum: float
created_at: ISO 8601 timestamp
```

#### briefs.csv
```
page_group_id: integer
pillar_keyword: string
intent_summary: string
outline: JSON object {h1: string, h2s: array of {title, h3s}}
must_cover_entities: JSON array of strings
faqs: JSON array of objects [{question, answer_hint}]
schema_types: JSON array of strings (Schema.org types)
internal_links_from: JSON array of strings (URLs or slugs)
internal_links_to: JSON array of strings (URLs or slugs)
recommended_word_range: string (e.g., "1500-2000")
serp_features_to_target: JSON array of strings
created_at: ISO 8601 timestamp
```

### Encoding Standards
- **Character encoding**: UTF-8 with BOM optional
- **Line endings**: LF (Unix style)
- **Quoting**: Fields containing JSON, commas, or newlines must be quoted
- **Null values**: Empty string for text, `null` for JSON, blank for numbers

### Schema Versioning
- Include `# schema_version: 1.0.0` as first line comment in each CSV
- Increment on breaking changes
- Document changes in EXPORTS.md

---

## SECURITY HARDENING

### GitHub Security Features
- [ ] Enable GitHub secret scanning
- [ ] Enable push protection for secrets
- [ ] Enable Dependabot security updates
- [ ] Configure security policy (SECURITY.md links to it)

### Pre-commit Secret Detection
- [ ] Add `git-secrets` or `gitleaks` to CI
- [ ] Fail builds on potential secret leaks
- [ ] Scan patterns:
  - API keys (serpapi_, sk_, etc.)
  - OAuth tokens
  - Private keys
  - Generic high-entropy strings in .env-like files

### Key Rotation
**Document in SECURITY.md**:
- Quarterly rotation recommended for production
- Provider-specific scopes (least privilege):
  - SerpAPI: Search only
  - Google Ads: Read-only (Keyword Planning)
  - Google Sheets: Specific spreadsheet access only
  - Notion: Database-scoped integration
- Rotation steps:
  1. Generate new key with provider
  2. Update `.env`
  3. Test with `--dry-run`
  4. Invalidate old key
  5. Update documentation

### Credential Storage
**Current**: Environment variables (good for dev)

**Production recommendations**:
- Encrypt at rest using OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Or use HashiCorp Vault / AWS Secrets Manager
- Store only refresh tokens; fetch access tokens on demand
- Document encryption approach in SECURITY.md

**Implementation**:
```python
# Optional enhancement - not P0
from keyring import get_password, set_password

def get_api_key(service_name):
    """Fetch from keyring, fallback to env"""
    key = get_password("cursorkeyword", service_name)
    if not key:
        key = os.getenv(f"{service_name.upper()}_API_KEY")
    return key
```

### .gitignore Verification
**Critical files to exclude**:
```gitignore
.env
.env.local
.env.*.local
*.db
keyword_research.db
credentials/
data/raw/
exports/
*.key
*.pem
```

**Verify**:
```bash
git log --all --full-history --source -- .env
# Should return nothing
```

### Data Deletion Process
**Document in SECURITY.md**:
```bash
# Complete project deletion
python cli.py delete <project_id> --confirm

# Deletes:
# - All keywords, topics, page groups
# - SERP snapshots
# - Audit logs for project
# - Raw data in data/raw/<project_id>/
# - Exports (if stored locally)

# Clear all caches
python cli.py clear-cache --all
```

**Retention windows** (configurable in .env):
- Raw SERP snapshots: 90 days default
- Audit logs: 365 days default (compliance requirement)
- Aggregated tables: kept indefinitely unless project deleted
- Exports: kept until manual deletion

---

## PERFORMANCE AND SCALE

### Targets

| Scale | Time Target | Concurrency | Notes |
|-------|-------------|-------------|-------|
| 100 keywords | <2 min | k=3 | Quick projects |
| 1,000 keywords | <10 min | k=5 | Typical niche |
| 10,000 keywords | <45 min | k=10 | Large site |

**Constraints**:
- SerpAPI free tier: 100 searches/month (~3/day)
- SerpAPI paid: Unlimited at 30-60 RPM
- Google Trends: ~60 RPM soft limit
- Autosuggest: 10-20 RPM safe (scraping)

### Concurrency Strategy

**Already in requirements.txt**: Celery + Redis

**Implementation**:
1. Provider calls via Celery tasks (I/O bound)
2. Clustering remains synchronous (CPU bound, but fast with cached embeddings)
3. Queue priorities: SERP > Trends > Autosuggest
4. Result backend: Redis

**Config**:
```python
# orchestrator.py
from celery import group

# Instead of sequential:
for kw in keywords:
    serp_data = self.serp_client.fetch(kw)

# Parallel with Celery:
job = group(fetch_serp.s(kw) for kw in keywords)
results = job.apply_async()
serp_data = results.get()
```

### Benchmarks

**Create benchmarks/benchmark.py**:
```python
import time
from expansion import KeywordExpander

def benchmark_expansion(n_seeds=10):
    expander = KeywordExpander()
    start = time.time()
    keywords = expander.expand_all(['test'] * n_seeds)
    duration = time.time() - start
    rps = len(keywords) / duration
    print(f"Expansion: {len(keywords)} kw in {duration:.2f}s ({rps:.1f} RPS)")

def benchmark_serp_fetch(n_keywords=100):
    # Similar pattern
    pass

def benchmark_clustering(n_keywords=1000):
    # Similar pattern
    pass
```

**Run in CI** (optional P2):
- Store results as artifacts
- Track regressions over time
- Alert on >20% slowdown

### Performance Metrics

**Add to orchestrator end-of-run summary**:
```
Pipeline Performance:
  Expansion:      152 keywords in 12.3s (12.4 RPS)
  SERP Fetch:     152 requests in 91.2s (1.7 RPS, rate-limited)
  Metrics:        152 enriched in 5.7s
  Normalization:  142 unique (10 duplicates removed)
  Classification: 142 classified in 3.1s
  Scoring:        142 scored in 1.8s
  Clustering:     142 keywords → 18 topics, 47 pages in 8.3s
  Briefs:         47 briefs generated in 6.2s

  Total:          2m 10s
  API Calls:      152 SERP, 142 Trends, 87 Autosuggest (381 total)
  Quota Used:     SerpAPI: 152/5000, Trends: 142/unlimited
```

---

## ERROR HANDLING MATRIX

### Provider Error Scenarios

| Error Type | HTTP Code | Action | Logged | User Notified | Pipeline |
|------------|-----------|--------|--------|---------------|----------|
| Invalid API key | 401/403 | Fail fast | Yes | Yes, clear message | Abort provider |
| Invalid params | 400 | Skip item | Yes | Warning | Continue |
| Not found | 404 | Skip item | Yes | Debug only | Continue |
| Rate limit | 429 | Retry with backoff | Yes | Info (delay time) | Pause |
| Server error | 500/502/503 | Retry with backoff | Yes | Warning | Pause |
| Timeout | - | Single retry | Yes | Warning | Continue or skip |
| Network error | - | Single retry | Yes | Warning | Continue or skip |

### Implementation Pattern

```python
# providers/base.py
class BaseProvider:
    def fetch_with_retry(self, url, max_retries=3):
        for attempt in range(max_retries):
            try:
                response = requests.get(url, timeout=self.timeout)

                if response.status_code == 401:
                    self.log_error("Invalid API key")
                    raise InvalidAPIKeyError(self.provider_name)

                if response.status_code == 429:
                    wait = self.calculate_backoff(attempt)
                    self.log_info(f"Rate limited, waiting {wait}s")
                    time.sleep(wait)
                    continue

                if response.status_code >= 500:
                    wait = self.calculate_backoff(attempt)
                    self.log_warning(f"Server error, retry {attempt+1}/{max_retries}")
                    time.sleep(wait)
                    continue

                response.raise_for_status()
                return response.json()

            except requests.Timeout:
                if attempt == max_retries - 1:
                    self.log_error("Request timeout, skipping")
                    return None
                self.log_warning(f"Timeout, retry {attempt+1}/{max_retries}")

            except requests.ConnectionError:
                self.log_error("Network error")
                return None

        return None  # All retries exhausted
```

### Audit Log Records

**Every API call logs**:
```python
audit_log = {
    'project_id': project_id,
    'provider': 'serpapi',
    'endpoint': '/search',
    'query_params': {'q': keyword, 'geo': 'US'},  # Sanitized
    'status_code': 200,
    'success': True,
    'duration_ms': 342,
    'quota_consumed': 1,
    'error_message': None,
    'retry_count': 0,
    'timestamp': '2024-01-15T10:23:45Z'
}
```

**Schema** (add to models.py if missing):
```python
class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'))
    provider = Column(String(50))
    endpoint = Column(String(200))
    query_params = Column(JSON)
    status_code = Column(Integer)
    success = Column(Boolean)
    duration_ms = Column(Integer)
    quota_consumed = Column(Integer)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)
```

---

## USER EXPERIENCE IMPROVEMENTS

### Progress Indicators

**Current**: Likely basic prints

**Enhancement**: Rich progress bars per stage
```python
from tqdm import tqdm

# In orchestrator.py
print("\n📈 Stage 1: Keyword Expansion")
for seed in tqdm(seeds, desc="Expanding seeds"):
    keywords.extend(self.expander.expand(seed))

print("\n🔍 Stage 2: SERP Collection")
for kw in tqdm(keywords, desc="Fetching SERP data"):
    serp_data[kw] = self.serp_client.fetch(kw)
```

**Output**:
```
📈 Stage 1: Keyword Expansion
Expanding seeds: 100%|████████████| 10/10 [00:23<00:00, 2.3s/seed]
  → Generated 152 keywords

🔍 Stage 2: SERP Collection
Fetching SERP data: 45%|██████     | 68/152 [01:32<01:48, 1.3s/kw]
  → Rate limited, waiting 5.2s...
```

### CLI Flags

**Add to cli.py**:
```python
@cli.command()
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
@click.option('--quiet', '-q', is_flag=True, help='Minimal output')
@click.option('--dry-run', is_flag=True, help='Validate without API calls')
@click.option('--resume', is_flag=True, help='Resume from last checkpoint')
def create(..., verbose, quiet, dry_run, resume):
    # Set log level based on flags
    if verbose:
        logging.basicConfig(level=logging.DEBUG)
    elif quiet:
        logging.basicConfig(level=logging.ERROR)
```

### End-of-Run Summary

**Clear, actionable output**:
```
✅ Project "Client Site Audit" Complete

📊 Results:
  Keywords:      142 (10 duplicates removed)
  Topics:        18
  Page Groups:   47
  Briefs:        47 generated

⚡ Performance:
  Duration:      2m 10s
  API Calls:     381 total (152 SERP, 142 Trends, 87 Autosuggest)
  Rate Limited:  3 pauses (total 15.2s)

💰 Quota Usage:
  SerpAPI:       152 / 5,000 (3.0% used, 4,848 remaining)
  Trends:        142 / unlimited
  Autosuggest:   87 / 1,000 daily (8.7% used)

📁 Exports:
  Keywords:      ./exports/project_1_keywords.csv
  Topics:        ./exports/project_1_topics.csv
  Briefs:        ./exports/project_1_briefs.csv

⚠️  Warnings:
  • 5 keywords had no SERP data (low volume)
  • 2 API timeouts (items skipped)

Next Steps:
  • Review briefs: python cli.py report 1
  • Export to Sheets: python cli.py export 1 --format sheets
  • View audit logs: python cli.py audit --project 1
```

### --dry-run Implementation

**Validates without API calls**:
```python
def dry_run_pipeline(seeds, geo, language):
    print("🔍 Dry Run - Validating Configuration\n")

    # Check API keys
    if not settings.serpapi_api_key:
        print("❌ SERPAPI_API_KEY not set")
        return False
    print("✅ SerpAPI key present")

    # Check database
    try:
        db = get_db()
        print("✅ Database connection OK")
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

    # Validate seeds
    print(f"✅ {len(seeds)} seed keywords provided")

    # Estimate API calls
    estimated_keywords = len(seeds) * 15  # Average expansion
    estimated_serp = estimated_keywords
    estimated_trends = estimated_keywords
    print(f"\n📊 Estimated API Calls:")
    print(f"  SERP:    ~{estimated_serp}")
    print(f"  Trends:  ~{estimated_trends}")
    print(f"  Total:   ~{estimated_serp + estimated_trends}")

    # Check quota
    # (Query audit_logs for current usage)

    print("\n✅ Configuration valid - ready to run")
    return True
```

---

## DATA RETENTION

### Retention Policies

**Configure in .env**:
```bash
# Retention periods (days)
SERP_SNAPSHOT_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_DAYS=365
CACHE_RETENTION_DAYS=7

# Auto-cleanup on project delete
DELETE_RAW_DATA_ON_PROJECT_DELETE=true
DELETE_EXPORTS_ON_PROJECT_DELETE=false
```

### Data Categories

| Data Type | Location | Default Retention | Rationale |
|-----------|----------|-------------------|-----------|
| Raw SERP snapshots | `data/raw/<project_id>/` | 90 days | Storage cost, reproducibility window |
| Audit logs | Database `audit_logs` | 365 days | Compliance, debugging |
| Aggregated data | Database (keywords, topics, briefs) | Indefinite (until project deleted) | Core product value |
| Cached responses | Redis or disk cache | 7 days | Balance freshness vs quota |
| Exports | `exports/` | Manual deletion | User-controlled |

### Cleanup Commands

**Add to cli.py**:
```python
@cli.command()
@click.option('--older-than', default=90, help='Days')
@click.option('--dry-run', is_flag=True)
def purge(older_than, dry_run):
    """Purge old raw data and audit logs."""

    cutoff = datetime.now() - timedelta(days=older_than)

    # Find old SERP snapshots
    snapshots = find_old_snapshots(cutoff)

    if dry_run:
        print(f"Would delete {len(snapshots)} SERP snapshots")
        print(f"Estimated space: {calculate_size(snapshots)} MB")
        return

    # Delete files
    for snapshot in snapshots:
        os.remove(snapshot)

    # Delete old audit logs
    db.query(AuditLog).filter(AuditLog.timestamp < cutoff).delete()

    print(f"✅ Purged {len(snapshots)} snapshots")
```

**Automatic cleanup** (optional):
```python
# Run after each project creation
def auto_cleanup():
    if settings.auto_cleanup_enabled:
        purge_old_data(settings.serp_snapshot_retention_days)
```

### GDPR Compliance

**Right to deletion** - already supported:
```bash
python cli.py delete <project_id> --confirm
```

**Data export** (for portability):
```bash
python cli.py export <project_id> --format json --include-raw
# Exports all project data including SERP snapshots
```

**Audit trail**:
```sql
-- See what data was collected for a project
SELECT provider, COUNT(*), MIN(timestamp), MAX(timestamp)
FROM audit_logs
WHERE project_id = 1
GROUP BY provider;
```

---

## MONITORING AND OBSERVABILITY

### Structured Logging

**Implement JSON logs**:
```python
# config.py
import logging
import json

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        # Add extra fields
        if hasattr(record, 'run_id'):
            log_obj['run_id'] = record.run_id
        if hasattr(record, 'project_id'):
            log_obj['project_id'] = record.project_id
        if hasattr(record, 'provider'):
            log_obj['provider'] = record.provider

        return json.dumps(log_obj)

# Setup
handler = logging.FileHandler('logs/keyword_research.jsonl')
handler.setFormatter(JsonFormatter())
logger = logging.getLogger()
logger.addHandler(handler)
```

**Log locations**:
```
logs/
  keyword_research.jsonl          # Main application log
  providers.jsonl                 # Provider-specific logs
  errors.jsonl                    # Errors only
```

### Statistics Tracking

**Add to orchestrator**:
```python
class PipelineStats:
    def __init__(self):
        self.keywords_processed = 0
        self.api_calls = defaultdict(int)
        self.retries = defaultdict(int)
        self.backoff_time = 0
        self.errors = defaultdict(int)
        self.start_time = time.time()

    def record_api_call(self, provider):
        self.api_calls[provider] += 1

    def record_retry(self, provider):
        self.retries[provider] += 1

    def record_backoff(self, duration):
        self.backoff_time += duration

    def record_error(self, error_type):
        self.errors[error_type] += 1

    def summary(self):
        duration = time.time() - self.start_time
        return {
            'duration_seconds': duration,
            'keywords_processed': self.keywords_processed,
            'api_calls': dict(self.api_calls),
            'total_api_calls': sum(self.api_calls.values()),
            'retries': dict(self.retries),
            'total_retries': sum(self.retries.values()),
            'backoff_time_seconds': self.backoff_time,
            'errors': dict(self.errors),
            'total_errors': sum(self.errors.values())
        }
```

### Optional: Prometheus Metrics

**If running as service** (not CLI-only):
```python
from prometheus_client import Counter, Histogram, Gauge

# Metrics
api_calls = Counter('api_calls_total', 'API calls', ['provider', 'status'])
api_duration = Histogram('api_duration_seconds', 'API call duration', ['provider'])
keywords_processed = Counter('keywords_processed_total', 'Keywords processed')
pipeline_duration = Histogram('pipeline_duration_seconds', 'Pipeline duration')
active_projects = Gauge('active_projects', 'Active projects')

# In code
with api_duration.labels(provider='serpapi').time():
    response = self.serp_client.fetch(keyword)
    api_calls.labels(provider='serpapi', status=response.status_code).inc()
```

**Expose endpoint**:
```python
from prometheus_client import start_http_server

if settings.enable_prometheus:
    start_http_server(9090)
```

### Error Tracking with Sentry (Optional)

**Add to requirements.txt** (optional):
```
sentry-sdk>=1.40.0
```

**Configure**:
```python
# config.py
import sentry_sdk

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=0.1,  # 10% of transactions
        before_send=lambda event, hint: None if settings.offline_mode else event
    )
```

**Capture exceptions**:
```python
try:
    result = self.serp_client.fetch(keyword)
except Exception as e:
    sentry_sdk.capture_exception(e)
    logger.error(f"SERP fetch failed: {e}")
```

---

## ROADMAP ALIGNMENT

### Phase 1 (v0.1) - CURRENT FOCUS
**Goal**: Stable, production-ready core pipeline

**Scope**:
- ✅ Full 8-stage pipeline (expansion → briefs)
- ✅ SerpAPI + Trends + Autosuggest integration
- ✅ Basic difficulty scoring
- ✅ Two-stage clustering
- ✅ CSV exports
- ✅ SQLite database
- ✅ CLI interface
- 🔨 **To Complete** (from review):
  - LICENSE, SECURITY.md, CODE_OF_CONDUCT.md (P0)
  - CI with tests (P1)
  - Enhanced rate limiting and quota tracking (P0)
  - Example project validation (P1)
  - Enhanced difficulty scoring (P2)
  - Failure handling and resume (P2)

**Success Criteria**:
- Can run 1,000 keyword projects reliably
- Client-ready documentation
- No data loss on failures
- Clear quota visibility

---

### Phase 2 (v0.2) - ENHANCEMENT
**Goal**: Scale and integrate with content workflows

**Scope**:
- Google Sheets / Notion exports (already coded, needs testing)
- WordPress direct publishing integration (already coded)
- Refresh schedules (periodic re-clustering)
- Local Pack detection and scoring boost
- Entity-first topical maps (README line 465)
- Internal link auditor (README line 465)
- CTR models refined by niche (README line 466)
- YouTube keyword mode (README line 468)
- Writer-ready briefs with full outlines

**New Features**:
- Hub-and-spoke internal linking visualization
- Content gap analysis (planned vs published)
- Brief approval workflow
- Slack/Discord notifications

**Timeline**: 2-3 months after v0.1 stable

---

### Phase 3 (v0.3) - INTELLIGENCE
**Goal**: Predictive and multi-site capabilities

**Scope**:
- Google Ads API integration for official volumes (already in .env.example)
- Search Console sync (already in .env.example, needs implementation)
- Opportunity forecasting (README line 471)
- Multi-site rollups (README line 471)
- Writer workload planning (README line 471)
- A/B testing of briefs (README line 472)
- Local SEO data bundles (AU, NP suburbs) - **only if client-funded**
- Custom CTR models trained on actual GSC data

**Success Metrics**:
- Forecasting accuracy within 20% of actual rankings
- Multi-site agencies managing 10+ properties
- 2× publishing velocity vs manual research

**Timeline**: 6-9 months after v0.1 stable

---

### Phase 4+ (Future)
**Exploratory ideas** (not committed):
- AI content generation from briefs
- Automated SERP monitoring and alerting
- Competitive intelligence dashboard
- Link building opportunity detection
- E-commerce keyword mode (product attributes)
- Voice search optimization
- Multi-language support beyond English

---

## ACCEPTANCE CRITERIA EXAMPLES

### Detailed Per-PR

#### PR #4: Token Bucket Implementation

**Functional**:
- [ ] Token bucket class in `providers/base.py`
- [ ] Configurable RPM per provider via `.env`
- [ ] Tokens refill at rate = RPM / 60 per second
- [ ] Requests consume tokens before execution
- [ ] If tokens < 1, sleep until refill
- [ ] Exponential backoff on 429/503: wait = base_delay * (2 ** attempt) + jitter
- [ ] Jitter = random(0, 1) seconds to prevent thundering herd
- [ ] Hard cutoff: stop after `MAX_REQUESTS_PER_RUN` regardless of time

**Observability**:
- [ ] Log line: `rate_limit_delay_ms` when sleeping
- [ ] Log line: `tokens_remaining` after each request
- [ ] Log line: `backoff_attempt` and `backoff_duration_ms` on retry
- [ ] End-of-run summary includes:
  - [ ] Total requests per provider
  - [ ] Total rate limit sleep time
  - [ ] Number of backoff events
  - [ ] Average request duration per provider

**Testing**:
- [ ] Unit test: `test_token_bucket_refill_rate()`
  - Create bucket with 10 RPM (1 token per 6 seconds)
  - Consume 10 tokens rapidly
  - Assert 11th request sleeps ~6 seconds
- [ ] Unit test: `test_exponential_backoff()`
  - Mock 429 responses
  - Assert wait times: 1s, 2s, 4s (base=1, factor=2)
- [ ] Unit test: `test_jitter_variance()`
  - Run backoff 100 times
  - Assert standard deviation > 0 (jitter applied)
- [ ] Integration test: `test_hard_cutoff()`
  - Set MAX_REQUESTS_PER_RUN = 5
  - Request 10 items
  - Assert only 5 processed, remaining skipped

**Documentation**:
- [ ] README section: "Rate Limiting Behavior"
- [ ] `.env.example` documents all `*_RPM` variables
- [ ] Docstrings on `TokenBucket` class explain algorithm

---

#### PR #5: Difficulty Scoring Components

**Functional**:
- [ ] `processing/scoring.py` has methods:
  - [ ] `calculate_allintitle_ratio(keyword, serp_data)` → float 0-1
  - [ ] `calculate_brand_share(serp_data)` → float 0-1
  - [ ] `calculate_serp_crowding(serp_data)` → float 0-1
- [ ] Difficulty formula:
  ```python
  difficulty = (
      serp_strength * 0.4 +
      allintitle_ratio * 0.3 +
      serp_crowding * 0.2 +
      content_depth * 0.1
  ) * 100
  ```
- [ ] Component values stored in `keywords` table:
  - [ ] `difficulty_serp_strength`
  - [ ] `difficulty_competition`
  - [ ] `difficulty_serp_crowding`
  - [ ] `difficulty_content_depth`
- [ ] `data/ctr_layouts.csv` with columns:
  ```csv
  layout_id,serp_features,base_ctr,description
  1,"[]",0.31,"Clean SERP, no features"
  2,"[""featured_snippet""]",0.18,"Featured snippet present"
  3,"[""local_pack""]",0.12,"Local pack dominates"
  ```
- [ ] Scoring module loads CTR table at init
- [ ] CTR selected by matching SERP features to layout

**Observability**:
- [ ] `cli.py report` shows component breakdown:
  ```
  Sample Difficulty Breakdown (keyword: "best seo tools"):
    SERP Strength:   0.72 (40% weight) = 28.8 pts
    Competition:     0.45 (30% weight) = 13.5 pts
    SERP Crowding:   0.68 (20% weight) = 13.6 pts
    Content Depth:   0.55 (10% weight) =  5.5 pts
    ─────────────────────────────────────────────
    Total Difficulty: 61.4 / 100
  ```

**Testing**:
- [ ] Unit test: `test_allintitle_ratio_calculation()`
  - Mock SERP with 10 results, 3 exact-match titles
  - Assert ratio = 0.3
- [ ] Unit test: `test_brand_share_calculation()`
  - Mock SERP with known brands (wikipedia.org, amazon.com)
  - Assert brand share = 0.4 (4/10)
- [ ] Unit test: `test_serp_crowding_score()`
  - Mock SERP with 3 ads + featured snippet + local pack
  - Assert crowding = 0.5 (normalized scale)
- [ ] Unit test: `test_ctr_layout_matching()`
  - SERP with featured_snippet
  - Assert selected CTR = 0.18 (layout 2)
- [ ] Integration test: End-to-end scoring with real SERP snapshots

**Documentation**:
- [ ] README section: "Difficulty Scoring Formula"
- [ ] Docstrings explain each component
- [ ] `data/ctr_layouts.csv` documented in EXPORTS.md

---

#### PR #6: Resume Functionality

**Functional**:
- [ ] `models.py` adds checkpoint tracking:
  ```python
  class Project(Base):
      # ... existing fields
      last_checkpoint = Column(String(50))  # stage name
      checkpoint_timestamp = Column(DateTime)
  ```
- [ ] `orchestrator.py` writes checkpoint after each stage:
  ```python
  def run_stage(self, stage_name, func):
      func()
      self.save_checkpoint(stage_name)
  ```
- [ ] `cli.py` adds `--resume` flag:
  ```python
  @click.option('--resume', is_flag=True)
  def create(..., resume):
      if resume:
          orchestrator.resume_from_checkpoint(project_id)
      else:
          orchestrator.run_full_pipeline(...)
  ```
- [ ] Idempotent operations:
  - [ ] Keyword insertion uses `ON CONFLICT DO NOTHING`
  - [ ] SERP snapshots check existence before fetch
  - [ ] Clustering regenerates from existing keywords

**Observability**:
- [ ] Log on checkpoint save: `Checkpoint saved: stage=clustering, timestamp=...`
- [ ] Log on resume: `Resuming from: stage=clustering`
- [ ] Progress indicator shows: "Skipping completed stages 1-5"

**Error Handling**:
- [ ] On stage failure:
  - [ ] Partial outputs committed to DB
  - [ ] Error logged with stage name and traceback
  - [ ] Exit with non-zero code
  - [ ] Display: "Run failed at stage X. Use --resume to continue."
- [ ] On resume:
  - [ ] Validate checkpoint exists
  - [ ] Validate DB state is consistent
  - [ ] Start from next stage after checkpoint

**Testing**:
- [ ] Unit test: `test_checkpoint_save_and_load()`
  - Run pipeline to stage 5
  - Kill process
  - Load checkpoint
  - Assert last_checkpoint = "clustering"
- [ ] Integration test: `test_full_resume_flow()`
  - Run project, abort at stage 5 (simulate failure)
  - Count keywords in DB
  - Resume with `--resume`
  - Assert final output identical to clean run
- [ ] Edge case test: `test_resume_on_clean_project()`
  - Resume non-existent project
  - Assert error message

**Documentation**:
- [ ] README section: "Resuming Failed Runs"
- [ ] Example walkthrough of failure and recovery
- [ ] List of idempotent operations

---

## CLEANUP OF ORIGINAL REVIEW

### Items REMOVED (already exist or misunderstood):
- ❌ "Add constraints.txt" → **Already exists**
- ❌ "Add .env.example entries for Sheets/Notion/Google Ads" → **Already exist (lines 46-61)**
- ❌ "Add Data source ledger section in README" → **Already exists (lines 336-355)**
- ❌ "Cache by key" → **Already implemented in BaseProvider**
- ❌ Claims of "skeleton code" → **Substantial implementation exists**

### Items REVISED:
- ✅ "Add allintitle ratio" → **Add to existing scoring.py** (not create from scratch)
- ✅ Mega-PR → **Split into 7 focused PRs**
- ✅ Flat list → **Prioritized with MoSCoW (P0-P3)**
- ✅ No tests → **Acknowledge existing tests, add specific new ones**

### Items ADDED (missing from original):
- ✅ Pre-implementation audit checklist
- ✅ Performance targets and benchmarks
- ✅ Error handling matrix
- ✅ User experience improvements (progress bars, flags, summary)
- ✅ Data retention policies
- ✅ Monitoring and observability
- ✅ Security hardening (secret scanning, key rotation)
- ✅ Schema versioning and JSON-in-CSV decisions
- ✅ Detailed acceptance criteria per PR
- ✅ Roadmap alignment with README phases

---

## SUMMARY: PATH TO CLIENT DOGFOODING

### Week 1: Discovery + P0
**Hours**: ~20
1. Pre-implementation audit (1 hour)
2. PR #1: Compliance pack (2-3 hours)
3. PR #4: Rate limiting enhancement (6-10 hours)
4. PR #0 (emergency): Quota tracking verification/fix (2-4 hours)

**Outcome**: Legal compliance, reliable API usage

---

### Week 2: P1 + Testing
**Hours**: ~15
1. PR #2: CI with lint and tests (3-4 hours)
2. PR #3: Example project + schema validation (4-6 hours)
3. constraints.txt verification and update (30 min)
4. First client test: Run on real project, monitor

**Outcome**: Stable, reproducible pipeline

---

### Week 3-4: P2 Quality
**Hours**: ~20
1. PR #5: Enhanced difficulty scoring (6-8 hours)
2. PR #6: Failure handling + resume (8-12 hours)
3. Configurable clustering thresholds (2-3 hours)

**Outcome**: Production-grade quality and resilience

---

### Week 5: Documentation + Polish
**Hours**: ~8
1. PR #7: Documentation pack (4-6 hours)
2. UX improvements (progress bars, --dry-run) (2-3 hours)
3. Security hardening (secret scanning setup) (1 hour)

**Outcome**: Client-ready, self-service tool

---

### Total Effort to Dogfooding: ~63-78 hours (~10-13 days)

---

## SIGN-OFF CHECKLIST

Before declaring "ready for clients":

**Legal & Compliance**:
- [ ] LICENSE file committed
- [ ] SECURITY.md with reporting workflow
- [ ] CODE_OF_CONDUCT.md
- [ ] .env in .gitignore verified
- [ ] No secrets in git history

**Reliability**:
- [ ] Rate limiting with backoff tested
- [ ] Hard quota cutoffs enforced
- [ ] Resume functionality tested on aborted runs
- [ ] Error handling covers all provider failures

**Quality**:
- [ ] CI passes on main branch
- [ ] Test coverage ≥70% on core modules
- [ ] Example project validates successfully
- [ ] Difficulty scoring components tested
- [ ] Clustering thresholds configurable

**Observability**:
- [ ] Quota tracking displays at run end
- [ ] Audit logs populated for all API calls
- [ ] Progress indicators on all stages
- [ ] Clear error messages guide user action

**Documentation**:
- [ ] QUICKSTART.md tested start-to-finish
- [ ] EXPORTS.md documents all column schemas
- [ ] OPERATIONS.md covers common errors
- [ ] README updated with new features

**Security**:
- [ ] GitHub secret scanning enabled
- [ ] git-secrets or gitleaks in CI
- [ ] Key rotation documented
- [ ] Credential storage approach documented

**Performance**:
- [ ] 1,000 keyword project completes in <10 minutes
- [ ] Benchmarks recorded for regression testing

**Client Readiness**:
- [ ] Ran 3+ test projects end-to-end without intervention
- [ ] All exports generated successfully
- [ ] Quota usage predictable and tracked
- [ ] No unhandled exceptions in last 5 runs

---

**This document supersedes the original review and serves as the definitive implementation guide.**
