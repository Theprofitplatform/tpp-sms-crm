# Sample Project - SEO Tools Research

This is a minimal example project demonstrating the keyword research tool's output format.

## Seeds Used

- "seo tools"
- "keyword research"

## Generated Files

- `keywords.csv` - All discovered keywords with metrics
- `topics.csv` - Topic clusters
- `briefs.csv` - Content briefs for each page group

## How to Recreate

```bash
python cli.py create \
  --name "Sample SEO Tools Project" \
  --seeds "seo tools,keyword research" \
  --geo US \
  --language en \
  --focus informational
```

## Expected Outputs

- **Keywords**: ~50-100 keywords from expansion
- **Topics**: ~5-10 topic clusters
- **Page Groups**: ~15-25 pages
- **Briefs**: One brief per page group

## Schema Validation

Run schema validation tests:

```bash
pytest tests/test_exports_schema.py -v
```

This ensures:
- All required columns present
- UTF-8 encoding
- JSON fields properly formatted
- No missing critical data
