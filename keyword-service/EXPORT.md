# Export Format Documentation

Complete specification for all export formats with column contracts and data types.

## Overview

The tool exports data in four formats:
1. **CSV** - Three files (keywords, briefs, calendar)
2. **Google Sheets** - Multi-tab spreadsheet
3. **Notion** - Database pages with rich content
4. **WordPress** - Draft posts with structured content

---

## CSV Export

### Command

```bash
python cli.py export <project_id> --format csv --output results
```

Generates three files:
- `results_keywords.csv`
- `results_briefs.csv`
- `results_calendar.csv`

### File 1: Keywords Export (`*_keywords.csv`)

Complete keyword dataset with all metrics and classifications.

#### Columns

| Column | Type | Description | Example | Nullable |
|--------|------|-------------|---------|----------|
| `keyword` | string | Original keyword text | "best seo tools" | No |
| `lemma` | string | Normalized form | "best seo tool" | No |
| `intent` | string | Classification | "commercial" | No |
| `intent_confidence` | float | Confidence score (0-1) | 0.95 | No |
| `search_volume` | integer | Monthly searches | 8100 | Yes |
| `cpc` | float | Cost per click (USD) | 12.50 | Yes |
| `trend_direction` | string | rising/stable/declining | "rising" | Yes |
| `trend_score` | integer | Change % over 90d | 15 | Yes |
| `difficulty` | float | Difficulty score (0-100) | 67.5 | No |
| `traffic_potential` | integer | Estimated monthly visits | 2835 | No |
| `opportunity_score` | float | Priority metric (0-100) | 82.3 | No |
| `topic_id` | integer | Topic cluster ID | 3 | Yes |
| `topic_label` | string | Topic name | "SEO Tools Overview" | Yes |
| `page_group_id` | integer | Page group ID | 12 | Yes |
| `page_label` | string | Target page topic | "Best SEO Tools 2024" | Yes |
| `is_pillar` | boolean | Hub/pillar page flag | true | No |
| `serp_features` | string | Comma-separated features | "featured_snippet,paa" | Yes |
| `entities` | string | Extracted entities (JSON) | `["product:SEO","year:2024"]` | Yes |
| `question_type` | string | what/how/why/when/where | "what" | Yes |
| `word_count` | integer | Content length suggestion | 2500 | Yes |
| `internal_links` | string | Suggested internal links | "kw123,kw456" | Yes |
| `schema_types` | string | Recommended schema.org | "Product,Review" | Yes |
| `competitors_count` | integer | Top 10 competitor count | 7 | Yes |
| `exact_match_titles` | integer | Exact matches in top 10 | 3 | Yes |
| `homepage_ratio` | float | Homepage % in top 10 | 0.30 | Yes |
| `ad_density` | float | Ad coverage (0-1) | 0.45 | Yes |
| `created_at` | datetime | Timestamp added | "2024-10-24 10:30:00" | No |

#### Data Types (Python)

```python
{
    'keyword': str,
    'lemma': str,
    'intent': str,  # Enum: informational, commercial, transactional, local, navigational
    'intent_confidence': float,
    'search_volume': Optional[int],
    'cpc': Optional[float],
    'trend_direction': Optional[str],  # Enum: rising, stable, declining
    'trend_score': Optional[int],
    'difficulty': float,
    'traffic_potential': int,
    'opportunity_score': float,
    'topic_id': Optional[int],
    'topic_label': Optional[str],
    'page_group_id': Optional[int],
    'page_label': Optional[str],
    'is_pillar': bool,
    'serp_features': Optional[str],
    'entities': Optional[str],  # JSON string
    'question_type': Optional[str],
    'word_count': Optional[int],
    'internal_links': Optional[str],  # Comma-separated IDs
    'schema_types': Optional[str],  # Comma-separated types
    'competitors_count': Optional[int],
    'exact_match_titles': Optional[int],
    'homepage_ratio': Optional[float],
    'ad_density': Optional[float],
    'created_at': datetime
}
```

#### Intent Values

- `informational`: How-to guides, tutorials, definitions
- `commercial`: Reviews, comparisons, "best X" queries
- `transactional`: Buy, price, discount queries
- `local`: Near me, location-specific
- `navigational`: Brand/site name searches

#### SERP Features

Comma-separated list of detected features:
- `featured_snippet`
- `people_also_ask`
- `local_pack`
- `knowledge_panel`
- `video_results`
- `image_pack`
- `shopping_results`
- `top_stories`
- `related_searches`
- `site_links`

#### Entity Format (JSON String)

```json
[
  "product:SEO Tools",
  "brand:Ahrefs",
  "location:United States",
  "audience:marketers",
  "year:2024",
  "problem:low rankings"
]
```

---

### File 2: Briefs Export (`*_briefs.csv`)

Content brief summaries for each page group.

#### Columns

| Column | Type | Description | Example | Nullable |
|--------|------|-------------|---------|----------|
| `page_group_id` | integer | Unique page ID | 12 | No |
| `page_label` | string | Target page title | "Best SEO Tools 2024" | No |
| `is_pillar` | boolean | Hub page flag | true | No |
| `primary_keyword` | string | Main target keyword | "best seo tools" | No |
| `intent` | string | Dominant intent | "commercial" | No |
| `keywords_count` | integer | Keywords in group | 23 | No |
| `keywords_list` | string | All keywords (newline-separated) | "best seo tools\ntop seo tools..." | No |
| `search_volume_total` | integer | Summed monthly searches | 45200 | No |
| `traffic_potential` | integer | Est. monthly visits | 15820 | No |
| `difficulty_avg` | float | Average difficulty | 58.3 | No |
| `opportunity_score` | float | Priority score | 87.5 | No |
| `h1` | string | Suggested H1 | "15 Best SEO Tools in 2024" | No |
| `h2_outline` | string | H2 sections (newline) | "What Are SEO Tools?\nTop 15 SEO Tools..." | No |
| `faqs` | string | FAQ list (JSON) | `[{"q":"...","a":"..."}]` | Yes |
| `entities_required` | string | Must-cover entities | "Ahrefs,SEMrush,Moz" | Yes |
| `word_count_min` | integer | Min word count | 2000 | No |
| `word_count_max` | integer | Max word count | 3000 | No |
| `schema_types` | string | Schema.org types | "Product,Review,FAQPage" | Yes |
| `serp_features_target` | string | Features to optimize for | "featured_snippet,paa" | Yes |
| `internal_links_to` | string | Links to these pages | "12,34,56" | Yes |
| `internal_links_from` | string | Links from these pages | "78,90" | Yes |
| `coverage_diff` | string | H2/H3 gaps (JSON) | `{"missing":["Pricing"],"covered":["Features"]}` | Yes |
| `cta_type` | string | Recommended CTA | "product_comparison" | Yes |
| `created_at` | datetime | Timestamp generated | "2024-10-24 10:35:00" | No |

#### FAQ Format (JSON String)

```json
[
  {
    "question": "What are SEO tools?",
    "answer": "SEO tools are software applications that help..."
  },
  {
    "question": "Which SEO tool is best?",
    "answer": "The best SEO tool depends on..."
  }
]
```

#### Coverage Diff Format (JSON String)

```json
{
  "missing_h2": ["Pricing Comparison", "User Reviews"],
  "missing_h3": ["Free Trials", "Customer Support"],
  "covered_h2": ["Features Overview", "Top Tools List"],
  "common_patterns": ["How to choose", "Getting started"]
}
```

---

### File 3: Calendar Export (`*_calendar.csv`)

12-week content publishing schedule.

#### Columns

| Column | Type | Description | Example | Nullable |
|--------|------|-------------|---------|----------|
| `week_number` | integer | Week in schedule (1-12) | 3 | No |
| `publish_date` | date | Suggested publish date | "2024-11-15" | No |
| `page_group_id` | integer | Brief ID | 12 | No |
| `page_label` | string | Content title | "Best SEO Tools 2024" | No |
| `priority` | integer | Rank in queue (1=highest) | 1 | No |
| `opportunity_score` | float | Priority metric | 87.5 | No |
| `search_volume` | integer | Monthly searches | 45200 | No |
| `difficulty` | float | Average difficulty | 58.3 | No |
| `intent` | string | Content type | "commercial" | No |
| `word_count` | integer | Target length | 2500 | No |
| `estimated_hours` | float | Writing time estimate | 8.5 | No |
| `dependencies` | string | Prerequisite page IDs | "1,2" | Yes |
| `assigned_to` | string | Writer name | "" | Yes |
| `status` | string | not_started/in_progress/done | "not_started" | No |
| `notes` | string | Additional context | "Seasonal relevance Q4" | Yes |

#### Week Distribution

- **Weeks 1-4**: High-opportunity commercial intent (quick wins)
- **Weeks 5-8**: Pillar/hub pages (foundation)
- **Weeks 9-12**: Supporting informational content (depth)

#### Priority Calculation

```python
priority = rank_by(opportunity_score, descending=True)
# Ties broken by: traffic_potential > intent_fit > difficulty (inverse)
```

---

## Google Sheets Export

### Command

```bash
python cli.py export <project_id> --format sheets
```

Creates new Google Sheet with multiple tabs.

### Tabs

1. **Dashboard** - Summary metrics and charts
2. **Keywords** - Same columns as CSV keywords export
3. **Briefs** - Same columns as CSV briefs export
4. **Calendar** - Same columns as CSV calendar export
5. **Audit Log** - API calls and quota usage

### Dashboard Tab

| Metric | Formula | Description |
|--------|---------|-------------|
| Total Keywords | `COUNT(Keywords!A:A)-1` | Count of unique keywords |
| Total Topics | `MAX(Keywords!F:F)` | Number of topic clusters |
| Total Page Groups | `MAX(Keywords!H:H)` | Number of content briefs |
| Avg Difficulty | `AVERAGE(Keywords!I:I)` | Mean difficulty score |
| Total Volume | `SUM(Keywords!E:E)` | Summed monthly searches |
| Est. Traffic | `SUM(Keywords!J:J)` | Potential monthly visits |
| Top Opportunity | `MAX(Keywords!K:K)` | Highest opportunity score |

### Formatting

- **Headers**: Bold, frozen row, background #4285F4
- **Difficulty**: Color scale (green 0-33, yellow 34-66, red 67-100)
- **Opportunity**: Color scale (red 0-33, yellow 34-66, green 67-100)
- **Intent**: Conditional formatting by type
- **Numeric columns**: Right-aligned, thousand separators
- **Date columns**: `YYYY-MM-DD` format

### Sharing

Output includes shareable URL:
```
https://docs.google.com/spreadsheets/d/SHEET_ID/edit
```

---

## Notion Export

### Command

```bash
python cli.py export <project_id> --format notion
```

Creates pages in Notion database with rich content blocks.

### Database Properties

| Property | Type | Description |
|----------|------|-------------|
| `Title` | title | Page label |
| `Status` | select | Not Started / In Progress / Done |
| `Priority` | number | Opportunity score |
| `Intent` | select | informational / commercial / transactional / local |
| `Keywords` | number | Count in group |
| `Volume` | number | Monthly searches |
| `Difficulty` | number | 0-100 score |
| `Traffic Est.` | number | Potential visits |
| `Word Count` | number | Target length |
| `Publish Date` | date | Suggested date |
| `Assigned` | person | Writer |

### Page Content Structure

```
# [Page Title]

## 📊 Metrics
- Search Volume: [number]
- Difficulty: [number]
- Traffic Potential: [number]
- Opportunity Score: [number]

## 🎯 Target Keywords
[Bulleted list of keywords]

## 📝 Outline

### H1: [Suggested title]

### H2 Sections
- [Section 1]
- [Section 2]
...

## ❓ FAQs
[Toggle blocks with Q&A]

## 🔗 Internal Links
- Link to: [Page titles]
- Link from: [Page titles]

## 🏷️ Schema
[Code block with JSON-LD]

## ✅ Checklist
- [ ] Cover entities: [list]
- [ ] Target SERP features: [list]
- [ ] Word count: [range]
- [ ] Add internal links
```

### JSON-LD Schema Example

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are SEO tools?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SEO tools are software applications..."
      }
    }
  ]
}
```

---

## WordPress Export

### Command

```bash
python cli.py export <project_id> --format wordpress
```

Creates draft posts in WordPress via REST API.

### Post Fields

| Field | WP Field | Source |
|-------|----------|--------|
| Title | `post_title` | `page_label` |
| Content | `post_content` | Generated HTML |
| Status | `post_status` | `draft` |
| Author | `post_author` | Config user ID |
| Category | `categories` | Mapped from intent |
| Tags | `tags` | Entities + keywords |
| Excerpt | `post_excerpt` | First 150 chars of H2 |
| Featured Image | `featured_media` | None (manual) |

### Custom Fields (Meta)

```php
[
  'seo_opportunity_score' => 87.5,
  'seo_difficulty' => 58.3,
  'seo_search_volume' => 45200,
  'seo_target_keywords' => 'best seo tools, top seo tools',
  'seo_word_count_min' => 2000,
  'seo_word_count_max' => 3000,
  'seo_schema_type' => 'Product,Review',
  'seo_internal_links' => '[12,34,56]',
  'seo_brief_json' => '{"h1":"...","h2":["..."]}',
]
```

### Content HTML Structure

```html
<!-- Metrics Dashboard (Shortcode) -->
[seo_metrics difficulty="58.3" volume="45200" opportunity="87.5"]

<!-- Target Keywords (Comment) -->
<!-- Target Keywords: best seo tools, top seo tools, seo software -->

<!-- Outline -->
<h1>15 Best SEO Tools in 2024</h1>

<h2>What Are SEO Tools?</h2>
<p>[Brief intro paragraph to be written]</p>

<h2>Top 15 SEO Tools Reviewed</h2>

<h3>1. Ahrefs</h3>
<p>[To be written - cover: features, pricing, pros/cons]</p>
<!-- Entity: Ahrefs -->

<h3>2. SEMrush</h3>
<p>[To be written]</p>

<!-- FAQs -->
<h2>Frequently Asked Questions</h2>

<h3>What are SEO tools?</h3>
<p>[Answer from PAA]</p>

<!-- Schema (as HTML comment for Yoast/RankMath) -->
<!-- SCHEMA:FAQPage
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  ...
}
-->

<!-- Internal Link Suggestions (Comment) -->
<!-- INTERNAL LINKS: 
  - Link to: Keyword Research Guide (#12)
  - Link to: Content Optimization (#34)
-->
```

### Categories Mapping

| Intent | WordPress Category |
|--------|-------------------|
| informational | Guides |
| commercial | Reviews |
| transactional | Products |
| local | Local SEO |
| navigational | Resources |

---

## Data Validation

### Pre-Export Checks

All exports validate:

1. **Required fields**: No nulls in non-nullable columns
2. **Data types**: Numeric ranges, valid enums
3. **Foreign keys**: Valid topic_id and page_group_id
4. **JSON format**: Valid JSON strings in entities, FAQs
5. **Date format**: ISO 8601 (YYYY-MM-DD)
6. **Text encoding**: UTF-8 with BOM for Excel compatibility

### Post-Export Verification

```bash
# Verify CSV integrity
python cli.py verify-export results_keywords.csv

# Expected output:
# ✅ 347 rows validated
# ✅ All required columns present
# ✅ No type mismatches
# ✅ Foreign key integrity OK
```

---

## Refresh Strategy

### Incremental Updates

When re-exporting the same project:

- **CSV**: Overwrites files completely
- **Sheets**: Updates existing sheet (preserves manual edits in "Notes" columns)
- **Notion**: Updates existing pages by `page_group_id`
- **WordPress**: Creates new drafts (does not update)

### Conflict Resolution

**Google Sheets**:
- Protected ranges: Dashboard tab (read-only)
- Editable columns: `assigned_to`, `status`, `notes`
- Merge strategy: Keep manual edits, update metrics

**Notion**:
- Properties: Always updated (source of truth)
- Content blocks: Appends "Updated: [date]" note
- Manual content: Preserved below generated outline

---

## Export Performance

### Benchmarks

| Format | 100 Keywords | 500 Keywords | 1000 Keywords |
|--------|--------------|--------------|---------------|
| CSV | 2s | 5s | 10s |
| Sheets | 15s | 45s | 90s |
| Notion | 30s | 120s | 240s |
| WordPress | 20s | 80s | 160s |

*Tested on standard broadband connection*

### Rate Limits

- **Google Sheets**: 100 requests/100s per user
- **Notion API**: 3 requests/second
- **WordPress REST**: Configurable (default: no limit)

---

## Error Handling

### Common Issues

**CSV Export**

```
Error: Unable to write file
Fix: Check directory permissions, disk space
```

**Google Sheets**

```
Error: Invalid credentials
Fix: Re-authenticate with `python cli.py auth sheets`

Error: Quota exceeded
Fix: Wait 100s or use different service account
```

**Notion**

```
Error: Database not found
Fix: Verify NOTION_DATABASE_ID in .env

Error: Property type mismatch
Fix: Recreate database with correct schema
```

**WordPress**

```
Error: Unauthorized (401)
Fix: Check Application Password in .env

Error: Post creation failed
Fix: Verify user has 'edit_posts' capability
```

### Partial Exports

If export fails mid-process:

1. **CSV**: Incomplete file written (delete and retry)
2. **Sheets**: Partial data (script will resume on retry)
3. **Notion**: Some pages created (script skips existing on retry)
4. **WordPress**: Drafts remain (manual cleanup or retry with `--clean`)

---

## Advanced Usage

### Custom Templates

Override default templates:

```bash
# CSV
python cli.py export 1 --format csv --template custom_template.json

# Notion
python cli.py export 1 --format notion --template notion_template.json
```

Template format:
```json
{
  "columns": ["keyword", "volume", "difficulty"],
  "filters": {"intent": ["commercial", "transactional"]},
  "sort": {"by": "opportunity_score", "order": "desc"},
  "limit": 100
}
```

### Batch Export

Export multiple projects:

```bash
python cli.py export-batch --projects 1,2,3 --format csv
```

### Scheduled Exports

Via cron:
```bash
# Daily at 2 AM
0 2 * * * /path/to/venv/bin/python /path/to/cli.py export 1 --format sheets --refresh
```

Via n8n:
```json
{
  "schedule": "0 2 * * *",
  "webhook": "https://n8n.example.com/webhook/export",
  "payload": {
    "project_id": 1,
    "format": "sheets"
  }
}
```

---

## Column Contract Versions

This document describes **v1.0** of export contracts.

### Version History

- **v1.0** (2024-10-24): Initial release
  - All formats supported
  - 28 columns in keywords export
  - 21 columns in briefs export
  - 14 columns in calendar export

### Deprecation Policy

- Breaking changes: Major version bump (v2.0)
- New columns: Minor version bump (v1.1)
- Backward compatibility: 2 versions (6 months)

### Migration Guide

When upgrading to new contract version, see `MIGRATION_v1_to_v2.md`.

---

## Support

**Questions about export formats?**

1. Check column descriptions above
2. Review example exports in `/examples/`
3. Open GitHub issue with:
   - Export format used
   - Expected vs actual output
   - Error messages (if any)

**Feature requests:**

Request new export formats or columns via GitHub Discussions.

---

**Last Updated**: 2025-10-24  
**Contract Version**: 1.0  
**Next Review**: 2025-11-24
