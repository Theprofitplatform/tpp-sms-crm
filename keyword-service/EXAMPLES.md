# Usage Examples

Real-world examples showing how to use the keyword research tool.

## Example 1: Local Service Business

**Scenario**: Plumbing company in Sydney wants to rank for local searches.

```bash
python cli.py create \
  --name "Sydney Plumbing SEO" \
  --seeds "emergency plumber,blocked drain,hot water repair" \
  --geo AU \
  --language en \
  --focus local
```

**Output**:
- 250+ keywords with geographic modifiers
- "near me" variations
- Suburb-specific keywords
- Map pack optimization recommendations
- LocalBusiness schema briefs

**Sample Keywords Generated**:
- emergency plumber sydney
- emergency plumber near me
- 24 hour plumber sydney
- blocked drain plumber sydney
- hot water repair cost sydney
- plumber sydney cbd
- emergency plumber northern beaches
- ...

## Example 2: SaaS Product Launch

**Scenario**: New project management tool needs commercial content.

```bash
python cli.py create \
  --name "Project Management Tool SEO" \
  --seeds "project management software,team collaboration,task tracking" \
  --geo US \
  --focus commercial \
  --competitors "asana.com,monday.com,trello.com"
```

**Output**:
- Comparison keywords ("X vs Y")
- "best", "top", "review" variations
- Competitor gap analysis
- Product schema recommendations
- Feature-based clusters

**Sample Keywords**:
- best project management software 2024
- asana vs monday comparison
- project management tools for small teams
- affordable project management software
- project management software reviews
- free project management tools
- ...

## Example 3: Informational Blog

**Scenario**: Fitness blog wants comprehensive guide content.

```bash
python cli.py create \
  --name "Fitness Guide Hub" \
  --seeds "weight loss,muscle building,nutrition" \
  --geo US \
  --focus informational
```

**Output**:
- "how to", "what is", "guide" variations
- Question-based keywords from PAA
- FAQPage schema recommendations
- Pillar + cluster structure
- Internal linking roadmap

**Sample Keywords**:
- how to lose weight fast
- what is intermittent fasting
- muscle building guide for beginners
- nutrition tips for weight loss
- how to calculate calorie deficit
- best exercises for muscle gain
- ...

## Example 4: E-commerce Store

**Scenario**: Online retailer selling running shoes.

```bash
python cli.py create \
  --name "Running Shoes Ecommerce" \
  --seeds "running shoes,trail running,marathon training" \
  --geo US \
  --focus transactional
```

**Output**:
- "buy", "price", "discount" variations
- Product-focused keywords
- Shopping schema recommendations
- Buying intent clusters
- Seasonal opportunities

**Sample Keywords**:
- buy running shoes online
- best running shoes for beginners
- cheap trail running shoes
- running shoes sale
- nike running shoes price
- marathon training shoes
- ...

## Example 5: International Expansion

**Scenario**: UK business expanding to Australia, New Zealand, and US.

```bash
# UK market
python cli.py create \
  --name "UK Market Research" \
  --seeds "accounting software,bookkeeping" \
  --geo UK \
  --language en

# Australian market
python cli.py create \
  --name "AU Market Research" \
  --seeds "accounting software,bookkeeping" \
  --geo AU \
  --language en

# US market
python cli.py create \
  --name "US Market Research" \
  --seeds "accounting software,bookkeeping" \
  --geo US \
  --language en
```

**Analysis**:
- Compare search volumes across markets
- Identify geo-specific terminology
- Find local competitors
- Adjust content strategy per market

## Example 6: Content Refresh Strategy

**Scenario**: Updating existing content with data-driven insights.

```bash
# Create new research
python cli.py create \
  --name "Content Refresh 2024" \
  --seeds "existing,keywords,from,site"

# Generate report
python cli.py report 1

# Export calendar
python cli.py calendar 1 --weeks 12 --posts-per-week 3

# Export to Google Sheets for team collaboration
python cli.py export 1 --format sheets
```

**Workflow**:
1. Extract current ranking keywords
2. Find related opportunities
3. Identify content gaps
4. Prioritize by opportunity score
5. Schedule updates in content calendar

## Example 7: Agency Client Onboarding

**Scenario**: Agency doing initial research for new client.

```bash
# Quick market scan
python cli.py create \
  --name "Client X - Initial Research" \
  --seeds "client,main,services" \
  --url "https://clientwebsite.com" \
  --competitors "competitor1.com,competitor2.com,competitor3.com" \
  --geo US

# Generate comprehensive report
python cli.py report 1 > client_report.txt

# Export for presentation
python cli.py export 1 --format csv --output client_keywords.csv

# Create pitch deck content calendar
python cli.py calendar 1 --weeks 24 --posts-per-week 2
```

**Deliverables**:
- Market opportunity analysis
- Competitor gap report
- 6-month content roadmap
- Estimated traffic potential
- Investment recommendations

## Example 8: Seasonal Campaign Planning

**Scenario**: E-commerce preparing for holiday season.

```bash
python cli.py create \
  --name "Black Friday Campaign" \
  --seeds "black friday deals,cyber monday,holiday gifts" \
  --focus transactional

# Generate calendar with earlier start date
python cli.py calendar 1 --weeks 8 --posts-per-week 4
```

**Strategy**:
- Identify trending seasonal keywords
- Plan content 2-3 months early
- Focus on high-intent keywords
- Optimize for shopping features

## Advanced Usage

### Custom Python Scripts

```python
from orchestrator import KeywordResearchOrchestrator
from expansion import KeywordExpander

# Initialize
orchestrator = KeywordResearchOrchestrator()

# Run with custom settings
project_id = orchestrator.run_full_pipeline(
    project_name="Custom Research",
    seeds=["keyword1", "keyword2"],
    geo="US",
    language="en",
    content_focus="informational"
)

# Access data programmatically
from database import get_db
from models import Keyword

with get_db() as db:
    keywords = db.query(Keyword).filter(
        Keyword.project_id == project_id,
        Keyword.difficulty < 30,
        Keyword.volume > 1000
    ).order_by(Keyword.opportunity.desc()).all()
    
    for kw in keywords[:10]:
        print(f"{kw.text}: {kw.opportunity}")
```

### Batch Processing

```bash
# Create multiple projects from config
for geo in US UK AU; do
  python cli.py create \
    --name "Global Research - $geo" \
    --seeds "saas,software,tool" \
    --geo $geo
done
```

### Integration with n8n

**Webhook Trigger**:
```javascript
// n8n HTTP Request node
{
  "method": "POST",
  "url": "http://your-server/api/research",
  "body": {
    "seeds": ["keyword1", "keyword2"],
    "geo": "US"
  }
}
```

**Python API Endpoint** (future):
```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/api/research', methods=['POST'])
def research():
    data = request.json
    project_id = orchestrator.run_full_pipeline(
        project_name=f"API Request {datetime.now()}",
        seeds=data['seeds'],
        geo=data.get('geo', 'US')
    )
    return {'project_id': project_id}
```

## Performance Tips

### For Speed
```bash
# Limit expansion methods
python cli.py create \
  --name "Quick Research" \
  --seeds "keyword" \
  --no-paa \
  --no-trends \
  --max-keywords 100
```

### For Comprehensiveness
```bash
# Full expansion with all sources
python cli.py create \
  --name "Deep Research" \
  --seeds "keyword1,keyword2,keyword3" \
  --include-competitor-gap \
  --include-reddit \
  --include-youtube
```

### For Accuracy
```bash
# Focus on high-quality seeds
python cli.py create \
  --name "Precision Research" \
  --seeds "specific,long,tail,keywords" \
  --min-volume 100 \
  --max-difficulty 50
```

## Common Patterns

### Pattern 1: Hub and Spoke Content

1. Create research
2. Identify pillar topics (high opportunity)
3. Export briefs with internal link recommendations
4. Build pillar pages first
5. Create supporting content linking to pillars

### Pattern 2: Competitor Reverse Engineering

1. Add competitor URLs to project
2. Extract their ranking keywords
3. Find gaps in your content
4. Prioritize by difficulty + volume
5. Create superior content

### Pattern 3: Local Area Domination

1. Expand with all service areas
2. Cluster by suburb/region
3. Create location-specific pages
4. Interlink with hub location page
5. Optimize for map pack

### Pattern 4: Product Launch

1. Research before product launch
2. Create educational content (informational)
3. Build comparison content (commercial)
4. Launch with product pages (transactional)
5. Track rankings and iterate

## Export Workflows

### To Notion
```bash
# 1. Create research
python cli.py create --name "Project"

# 2. Export to Notion
python cli.py export 1 --format notion

# 3. Team reviews briefs in Notion
# 4. Writers claim assignments
# 5. Track progress in Notion
```

### To WordPress
```bash
# 1. Research and export
python cli.py create --name "Blog Content"
python cli.py export 1 --format wordpress

# 2. Writers edit drafts in WP
# 3. Add content to outlines
# 4. Publish on schedule
```

### To Google Sheets
```bash
# 1. Export master sheet
python cli.py export 1 --format sheets

# 2. Team collaborates in Sheets
# 3. Filter and sort by priority
# 4. Add columns for status tracking
# 5. Import back to tool if needed
```

## Troubleshooting Examples

### Low Keyword Count

**Problem**: Only 20 keywords from 5 seeds

**Solution**:
```bash
# Add more diverse seeds
python cli.py create \
  --seeds "broad,term,specific,longtail,variations,synonyms"

# Enable all expansion methods
# Check API quotas
# Review deduplication threshold
```

### Poor Clustering

**Problem**: All keywords in one giant cluster

**Solution**:
- Lower `TOPIC_CLUSTER_THRESHOLD` in `.env`
- Use more specific seeds
- Reduce similarity threshold
- Check for duplicate/similar seeds

### Missing SERP Features

**Problem**: No PAA questions found

**Solution**:
- Verify SerpAPI key
- Check keyword language matches geo
- Try broader keywords
- Review SERP manually to confirm

## Next Steps

After running these examples:

1. Review project reports
2. Analyze top opportunities
3. Validate brief quality
4. Adjust clustering thresholds
5. Export to your workflow
6. Track content performance
7. Iterate and improve

See README.md for full documentation.
