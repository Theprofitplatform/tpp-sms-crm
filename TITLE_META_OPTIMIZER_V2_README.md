# Title/Meta Optimizer v2 - AI-Powered SEO 🤖

**AI-powered title and meta description optimization with manual review workflow**

---

## 🎯 Overview

The Title/Meta Optimizer v2 uses **Claude AI** and **Google Search Console** data to identify and fix low-performing titles and meta descriptions.

**Key Features:**
- ✅ Integrates with Google Search Console for real performance data
- ✅ Uses Claude AI to generate optimized titles and descriptions
- ✅ Manual review workflow - you approve before changes go live
- ✅ Detailed ROI projections (potential click improvements)
- ✅ Rich descriptions and verification steps
- ✅ Automatic risk assessment based on page traffic

---

## 🚀 How It Works

### 1. Detection Phase

The optimizer:
1. Fetches performance data from Google Search Console
2. Identifies pages with low CTR (click-through rate)
3. Matches GSC pages to WordPress content
4. Generates AI-optimized titles and meta descriptions
5. Creates detailed proposals for review

**Criteria for low CTR:**
- CTR below site average OR below 2%
- At least 100 impressions (significant traffic)
- Position in top 20 (good visibility)

### 2. Review Phase

Each proposal includes:
- **Current vs. Proposed** - Side-by-side comparison
- **AI Reasoning** - Why the new version will perform better
- **ROI Projection** - Estimated additional clicks per month
- **Risk Level** - Based on current page traffic
- **Verification Steps** - How to confirm the fix worked

### 3. Application Phase

After approval:
- Updates WordPress title
- Updates meta description
- Creates audit trail
- Provides verification checklist

---

## 📊 Example Proposal

```
Issue:
Low click-through rate (1.5%) compared to site average (3.2%). Page has
5,000 impressions but only 75 clicks at position 8.5. Current title
"Complete Guide to SEO Basics" may not be compelling enough to encourage clicks.

Fix:
Update title from "Complete Guide to SEO Basics" to "2024 Guide: SEO Basics
[Boost Your Traffic]" and meta description to "Discover proven SEO basics
strategies that actually work. Get more traffic today!"

AI Analysis:
Added year for freshness, power words to increase urgency, and clear
value proposition.

Expected Benefit:
Improving CTR from 1.5% to site average 3.2% could generate approximately
85 additional clicks per month. Better titles and descriptions improve
organic traffic, user engagement, and SERP appeal.

Risk Level: Low
Severity: High
Priority: 75

Verification Steps:
1. Check the updated page at: https://example.com/seo-basics
2. View page source and verify the <title> tag
3. Verify meta description in page source
4. Monitor CTR in Google Search Console over next 14 days
5. Expected improvement: 85 more clicks per month if CTR reaches site average
```

---

## 🔧 Setup Requirements

### 1. Google Search Console API

You need GSC API access to fetch performance data.

**Setup:**
1. Enable Search Console API in Google Cloud Console
2. Create service account credentials
3. Share your GSC property with the service account email
4. Download credentials JSON file

**Configuration:**
```javascript
const config = {
  gscPropertyUrl: 'https://yoursite.com',
  gscCredentials: './path/to/credentials.json'
};
```

### 2. Anthropic API Key

Required for AI-powered optimizations.

**Setup:**
1. Sign up at https://console.anthropic.com/
2. Create API key
3. Set environment variable:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. WordPress with Yoast SEO (Recommended)

For best results, install Yoast SEO plugin to manage meta descriptions.

Without Yoast:
- Meta descriptions will be stored in post excerpt field
- May not display correctly in search results

With Yoast:
- Full meta description support
- Preview in search results
- Better SEO control

---

## 💻 Usage

### API Endpoint

```bash
# Detect low-CTR pages and generate optimizations
POST /api/autofix/detect
{
  "engineId": "title-meta-optimizer-v2",
  "clientId": "your-client-id",
  "options": {
    "limit": 10  // Limit AI calls to avoid costs
  }
}

# Returns: { groupId, sessionId, proposals: 10 }
```

### JavaScript

```javascript
import { TitleMetaOptimizerV2 } from './src/automation/auto-fixers/title-meta-optimizer-v2.js';

const optimizer = new TitleMetaOptimizerV2({
  id: 'my-client',
  siteUrl: 'https://mysite.com',
  wpUser: 'admin',
  wpPassword: 'app_password_here',
  gscPropertyUrl: 'https://mysite.com',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
});

// Run detection
const result = await optimizer.runDetection({ limit: 10 });
console.log(`Created ${result.proposals} proposals`);

// Review proposals
const proposals = proposalService.getProposals({
  groupId: result.groupId,
  status: 'pending'
});

// Approve low-risk
const lowRisk = proposals.filter(p => p.risk_level === 'low');
lowRisk.forEach(p => {
  proposalService.reviewProposal(p.id, {
    action: 'approve',
    notes: 'AI optimization looks good'
  });
});

// Apply approved
await optimizer.runApplication(result.groupId);
```

---

## 📈 ROI & Impact

### Expected Results

**Typical Improvements:**
- CTR increase: 20-50% average
- Additional clicks: Varies by traffic volume
- Time to see results: 7-14 days

**Example:**
```
Page with:
- 5,000 impressions/month
- 1.5% CTR (75 clicks)
- Site average: 3.2% CTR

After optimization:
- Same impressions
- 2.8% CTR (140 clicks)
- +65 clicks/month (+87% improvement)
```

### Cost Considerations

**AI API Costs:**
- ~$0.003 per optimization (Claude Sonnet)
- Recommend: Start with limit=10
- Test results before scaling

**Time Investment:**
- Detection: 2-5 minutes (depends on page count)
- Review: 2-3 minutes per proposal
- Application: < 1 minute

---

## 🎯 Best Practices

### 1. Start Small
```bash
# First run: Limit to 5-10 pages
POST /api/autofix/detect
{
  "engineId": "title-meta-optimizer-v2",
  "options": { "limit": 5 }
}
```

### 2. Focus on High Impact

Optimizer prioritizes pages with:
- High impressions (more potential clicks)
- Low CTR (most room for improvement)
- Good position (already visible)

### 3. Monitor Results

After applying:
1. Wait 7-14 days for data
2. Check GSC for CTR changes
3. Compare against baseline
4. Iterate based on results

### 4. A/B Test Approach

- Apply to 50% of low-CTR pages first
- Monitor performance vs. control group
- Roll out to remaining pages if successful

---

## ⚙️ Configuration Options

### Detection Options

```javascript
await optimizer.runDetection({
  limit: 10,              // Max pages to optimize (controls AI cost)
  startDate: '2024-01-01', // GSC date range start
  endDate: '2024-01-31'   // GSC date range end
});
```

### Thresholds (Customizable)

```javascript
// In title-meta-optimizer-v2.js constructor
this.minCTRThreshold = 0.02;  // 2% CTR minimum
this.minImpressions = 100;    // Min impressions to consider
this.maxPosition = 20;        // Only top 20 positions
```

### Risk Levels

Automatically assigned based on traffic:
- **Low**: < 1,000 clicks/month (safe to experiment)
- **Medium**: 1,000+ clicks/month (review carefully)
- **High**: Not assigned by this engine (reserved for critical pages)

---

## 🔍 Verification

After applying optimizations:

### 1. Check WordPress
```bash
# Verify title and meta updated
curl https://yoursite.com/page | grep -E '<title>|<meta name="description"'
```

### 2. Google Rich Results Test
```
https://search.google.com/test/rich-results
# Enter your URL
# Verify title and description display correctly
```

### 3. Monitor GSC

Track these metrics over 14 days:
- **CTR** - Should increase
- **Impressions** - Should stay similar
- **Clicks** - Should increase
- **Position** - May improve slightly

---

## 🐛 Troubleshooting

### "No GSC data available"

**Cause**: GSC API not configured or no data for date range

**Solution**:
```bash
# Check GSC credentials
echo $GSC_CREDENTIALS_PATH

# Verify property access
# Go to: https://search.google.com/search-console
# Ensure service account has access
```

### "Claude API error"

**Cause**: API key missing or invalid

**Solution**:
```bash
# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Verify key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

### "No pages matched to WordPress"

**Cause**: GSC URLs don't match WordPress URLs

**Solution**:
- Ensure WordPress URL structure matches GSC
- Check that posts/pages are published
- Verify slug matching logic in `matchPagesToWordPress()`

### "Meta description not updating"

**Cause**: Yoast SEO field not updating

**Solution**:
```javascript
// Update Yoast meta field directly
updateData.meta = {
  yoast_wpseo_metadesc: newDescription
};
```

---

## 📊 Analytics & Reporting

### Get Optimization Potential

```javascript
const potential = await optimizer.getOptimizationPotential();

console.log(`Total Pages: ${potential.totalPages}`);
console.log(`Low-CTR Pages: ${potential.lowCTRPages}`);
console.log(`Potential Clicks: +${potential.potentialClicks}/month`);
console.log(`Top Opportunities:`, potential.topOpportunities);
```

### Track Applied Optimizations

```javascript
const stats = proposalService.getStatistics({
  engineId: 'title-meta-optimizer-v2',
  clientId: 'your-client'
});

console.log(`Applied: ${stats.applied}`);
console.log(`Success Rate: ${stats.successRate}%`);
```

---

## 🎓 Tips for Writing Great Titles & Descriptions

The AI follows these principles (you can too):

### Great Titles:
- ✅ 50-60 characters (displays fully in SERPs)
- ✅ Include primary keyword naturally
- ✅ Use power words (Guide, Ultimate, Best, 2024)
- ✅ Create urgency or curiosity
- ✅ Accurate to content

### Great Descriptions:
- ✅ 150-160 characters (displays fully)
- ✅ Include call-to-action
- ✅ Highlight unique value
- ✅ Use relevant keywords
- ✅ Encourage clicks

---

## 🚀 Next Steps

1. **Set up GSC API** - Get performance data
2. **Get Anthropic API key** - Enable AI optimizations
3. **Run first detection** - Start with limit=5
4. **Review proposals** - Approve best ones
5. **Apply and monitor** - Track results in GSC
6. **Scale up** - Increase limit as you see results

---

## 📚 Related Documentation

- **[MANUAL_REVIEW_README.md](MANUAL_REVIEW_README.md)** - System overview
- **[API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)** - API examples
- **[MANUAL_REVIEW_USAGE_GUIDE.md](MANUAL_REVIEW_USAGE_GUIDE.md)** - Complete API docs
- **[PROJECT_INDEX.md](PROJECT_INDEX.md)** - All resources

---

**Ready to boost your organic traffic with AI-optimized titles and descriptions!** 🚀
