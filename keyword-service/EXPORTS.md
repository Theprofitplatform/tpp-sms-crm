# Export Schemas

Complete specification for all CSV export formats.

## Overview

The tool generates three primary export files:
1. **keywords.csv** - All keywords with metrics and classifications
2. **topics.csv** - Topic clusters with aggregate metrics
3. **briefs.csv** - Content briefs for each page group

## Schema Version

Current version: **1.0.0**

All CSVs include schema version in header comment:
```csv
# schema_version: 1.0.0
keyword,volume,difficulty,...
```

## Encoding Standards

- **Character Encoding**: UTF-8
- **Line Endings**: LF (Unix style)
- **Quoting**: Fields with commas, quotes, or newlines must be quoted
- **Null Values**: Empty string for text, empty for numbers, `[]` for JSON arrays
- **JSON Fields**: Valid JSON (arrays/objects) in CSV cells

## keywords.csv

### Column Specification

| Column | Type | Format | Description | Example |
|--------|------|--------|-------------|---------|
| `keyword` | string | text | Original keyword text | `best seo tools` |
| `lemma` | string | text | Normalized/lemmatized form | `best seo tool` |
| `lang` | string | ISO 639-1 | Language code | `en` |
| `geo` | string | ISO 3166-1 | Geographic location | `US` |
| `intent` | string | enum | Search intent classification | `commercial` |
| `entities` | JSON array | `["entity1", ...]` | Extracted entities | `["seo", "tools"]` |
| `volume` | integer | number | Monthly search volume | `8100` |
| `cpc` | float | number | Cost per click (USD) | `12.50` |
| `trend_score` | float | -1 to 1 | Trend direction | `0.15` (rising) |
| `serp_features` | JSON array | `["feature", ...]` | SERP features present | `["featured_snippet"]` |
| `difficulty` | float | 0-100 | Overall difficulty score | `65.4` |
| `difficulty_serp_strength` | float | 0-1 | SERP strength component | `0.70` |
| `difficulty_competition` | float | 0-1 | Competition component | `0.65` |
| `difficulty_serp_crowding` | float | 0-1 | Crowding component | `0.60` |
| `difficulty_content_depth` | float | 0-1 | Content depth component | `0.68` |
| `traffic_potential` | float | number | Est. monthly clicks at target rank | `2187.0` |
| `opportunity` | float | 0-100 | Opportunity score | `89.3` |
| `topic_id` | integer | number | Topic cluster ID (FK) | `1` |
| `page_group_id` | integer | number | Page group ID (FK) | `1` |
| `is_pillar` | boolean | true/false | Is pillar content | `true` |
| `source` | string | enum | Keyword source | `seed` |
| `created_at` | string | ISO 8601 | Creation timestamp | `2024-10-24T10:00:00Z` |

### Intent Values

- `informational` - How-to, guides, explanations
- `commercial` - Reviews, comparisons, "best X"
- `transactional` - Buy, purchase, pricing
- `navigational` - Brand/site searches
- `local` - Near me, location-specific

### Source Values

- `seed` - Original seed keyword
- `autosuggest` - From autosuggest APIs
- `paa` - People Also Ask questions
- `related` - Related searches
- `competitor` - Competitor analysis

### Example Row

```csv
best seo tools,best seo tool,en,US,commercial,"[""seo"", ""tools"", ""software""]",8100,12.50,0.15,"[""featured_snippet"", ""people_also_ask""]",65.4,0.70,0.65,0.60,0.68,2187.0,89.3,1,1,true,seed,2024-10-24T10:00:00Z
```

## topics.csv

### Column Specification

| Column | Type | Format | Description | Example |
|--------|------|--------|-------------|---------|
| `topic_id` | integer | number | Unique topic identifier | `1` |
| `label` | string | text | Human-readable topic label | `SEO Tools & Software` |
| `pillar_keyword` | string | text | Primary keyword for topic | `best seo tools` |
| `cluster_size` | integer | number | Number of keywords in cluster | `25` |
| `avg_difficulty` | float | 0-100 | Average difficulty of keywords | `55.3` |
| `total_traffic_potential` | float | number | Sum of traffic potential | `8745.0` |
| `opportunity_sum` | float | number | Sum of opportunity scores | `224.2` |
| `created_at` | string | ISO 8601 | Creation timestamp | `2024-10-24T10:05:00Z` |

### Example Row

```csv
1,SEO Tools & Software,best seo tools,25,55.3,8745.0,224.2,2024-10-24T10:05:00Z
```

## briefs.csv

### Column Specification

| Column | Type | Format | Description | Example |
|--------|------|--------|-------------|---------|
| `page_group_id` | integer | number | Unique page group identifier | `1` |
| `pillar_keyword` | string | text | Primary keyword | `best seo tools` |
| `intent_summary` | string | text | User intent description | `Users want comparison...` |
| `outline` | JSON object | See below | H1/H2/H3 structure | `{"h1": "...", "h2s": [...]}` |
| `must_cover_entities` | JSON array | `["entity", ...]` | Required entities | `["ahrefs", "semrush"]` |
| `faqs` | JSON array | See below | FAQ questions/hints | `[{"question": "...", ...}]` |
| `schema_types` | JSON array | `["Type", ...]` | Schema.org types | `["SoftwareApplication"]` |
| `internal_links_from` | JSON array | `["url", ...]` | Links TO this page | `["/seo-guide"]` |
| `internal_links_to` | JSON array | `["url", ...]` | Links FROM this page | `["/free-seo-tools"]` |
| `recommended_word_range` | string | `min-max` | Word count range | `2500-3500` |
| `serp_features_to_target` | JSON array | `["feature", ...]` | SERP features to optimize for | `["featured_snippet"]` |
| `created_at` | string | ISO 8601 | Creation timestamp | `2024-10-24T10:10:00Z` |

### Outline JSON Structure

```json
{
  "h1": "Main Title",
  "h2s": [
    {
      "title": "Section Title",
      "h3s": ["Subsection 1", "Subsection 2"]
    }
  ]
}
```

### FAQs JSON Structure

```json
[
  {
    "question": "What are the best SEO tools?",
    "answer_hint": "Cover free and paid options with pros/cons"
  }
]
```

### Example Row (formatted for readability)

```csv
1,
best seo tools,
Users want comprehensive comparison of SEO tools,
"{""h1"": ""Best SEO Tools"", ""h2s"": [{""title"": ""Top 10 Compared"", ""h3s"": [""Ahrefs"", ""SEMrush""]}]}",
"[""ahrefs"", ""semrush"", ""moz""]",
"[{""question"": ""What are best SEO tools?"", ""answer_hint"": ""Cover free and paid""}]",
"[""SoftwareApplication"", ""Review""]",
"[""/seo-guide""]",
"[""/free-seo-tools""]",
2500-3500,
"[""featured_snippet"", ""people_also_ask""]",
2024-10-24T10:10:00Z
```

## JSON Escaping in CSV

JSON fields are properly escaped when embedded in CSV:

**Correct:**
```csv
keyword,entities
"best seo tools","[""seo"", ""tools""]"
```

**Incorrect:**
```csv
keyword,entities
best seo tools,["seo", "tools"]  # Missing outer quotes
```

## Schema Validation

Validate exports programmatically:

```python
import csv
import json

def validate_keywords_csv(filepath):
    required_columns = [
        'keyword', 'lemma', 'lang', 'geo', 'intent',
        'volume', 'difficulty', 'opportunity', 'topic_id'
    ]

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        # Check columns
        for col in required_columns:
            assert col in reader.fieldnames, f"Missing: {col}"

        # Validate rows
        for row in reader:
            # Non-empty required fields
            assert row['keyword'].strip()
            assert row['intent'] in ['informational', 'commercial',
                                      'transactional', 'navigational', 'local']

            # Valid JSON fields
            json.loads(row['entities'])
            json.loads(row['serp_features'])

            # Numeric ranges
            assert 0 <= float(row['difficulty']) <= 100
            assert 0 <= float(row['opportunity']) <= 100
```

Run validation:
```bash
pytest tests/test_exports_schema.py -v
```

## Export Tips

### Large Projects

For projects with 10,000+ keywords:
- Use streaming CSV writes
- Split into multiple files by topic
- Compress with gzip

### Excel Compatibility

Excel has 32,767 character limit per cell. For JSON fields exceeding this:
- Truncate or summarize
- Export to Google Sheets instead
- Use JSON export format

### Database Import

To import into PostgreSQL:
```sql
COPY keywords(keyword, lemma, lang, geo, intent, entities, volume, cpc, difficulty, opportunity)
FROM '/path/keywords.csv'
DELIMITER ','
CSV HEADER
ENCODING 'UTF-8';
```

## Version History

### 1.0.0 (2024-10-24)
- Initial schema
- All core columns
- JSON fields for complex data

### Future (1.1.0)
- Add `competitor_urls` field
- Add `ranking_history` field
- Add `forecast_data` field

## Support

For schema questions or issues:
- GitHub Issues: https://github.com/Theprofitplatform/cursorkeyword/issues
- Email: support@theprofitplatform.com

---

**Last Updated**: 2024-10-24
**Schema Version**: 1.0.0
