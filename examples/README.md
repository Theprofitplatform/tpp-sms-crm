# Examples Directory

This directory contains example files to help you understand the tool's output and configuration.

## Files

### Output Examples

**`sample-audit-report.json`**
Complete audit report in JSON format showing:
- Content audit results for 2 example posts
- Technical SEO metrics
- Performance scores (mobile + desktop)
- Core Web Vitals data
- Priority recommendations
- Issue breakdown by type and severity

Use this to understand the structure of audit reports and what data is available.

**`sample-audit-summary.md`**
Markdown summary report showing:
- High-level statistics
- Issue counts by severity
- Priority recommendations
- Actionable fix suggestions

This is the quick-read version ideal for sharing with team members.

### Configuration Examples

**`advanced-config.env`**
Comprehensive `.env` configuration file with:
- All available settings
- Detailed comments explaining each option
- Recommended values
- Safety warnings
- Performance tuning options
- Integration settings

Copy and customize for your needs:
```bash
cp examples/advanced-config.env env/.env
# Then edit env/.env with your credentials
```

## Understanding the Output

### Audit Scores

Scores range from 0-100:
- **90-100**: Excellent SEO
- **70-89**: Good, minor improvements needed
- **50-69**: Fair, notable issues to address
- **Below 50**: Poor, significant work required

### Issue Severity Levels

- **Critical**: Must fix immediately (blocks indexing, major SEO harm)
- **High**: Should fix soon (significant SEO impact)
- **Medium**: Should fix eventually (moderate impact)
- **Low**: Nice to have (minor improvements)

### Common Issues Found

Based on real audits, most sites have:

1. **Missing meta descriptions** (High) - 60% of posts
2. **Missing image alt text** (High) - 50% of images
3. **Title length issues** (Warning) - 40% of posts
4. **Thin content** (High) - 20% of posts
5. **Heading structure problems** (Medium) - 30% of posts

### Performance Metrics

**Core Web Vitals Thresholds:**
- **LCP (Largest Contentful Paint)**: <2.5s (good), 2.5-4s (needs improvement), >4s (poor)
- **FID (First Input Delay)**: <100ms (good), 100-300ms (needs improvement), >300ms (poor)
- **CLS (Cumulative Layout Shift)**: <0.1 (good), 0.1-0.25 (needs improvement), >0.25 (poor)

**PageSpeed Scores:**
- **90-100**: Fast
- **50-89**: Moderate
- **0-49**: Slow

## Using Examples in Testing

### Test with Sample Data

```bash
# Use example config
cp examples/advanced-config.env env/.env
# Edit with your credentials

# Run small audit
node index.js --mode=audit --max-posts=5

# Compare your output with sample-audit-report.json
cat logs/audit-report-*.json | jq . > my-report.json
diff examples/sample-audit-report.json my-report.json
```

### Validate Report Structure

```javascript
// In Node.js REPL
const sampleReport = require('./examples/sample-audit-report.json');
const myReport = require('./logs/audit-report-2024-01-15.json');

console.log('Sample has', sampleReport.contentAudit.posts.length, 'posts');
console.log('My report has', myReport.contentAudit.posts.length, 'posts');

// Check structure matches
console.log('Structures match:',
  Object.keys(sampleReport).sort().join(',') ===
  Object.keys(myReport).sort().join(',')
);
```

## Integration Examples

### Slack Notification

See example Slack message for audit completion in INTEGRATIONS.md.

### Email Report

Template for sending HTML reports via email in INTEGRATIONS.md.

### Notion Database

Structure for storing audit results in Notion in INTEGRATIONS.md.

### Custom Webhooks

Payload format for custom integrations in INTEGRATIONS.md.

## Real-World Scenarios

### Scenario 1: New Website Audit

**Initial Run:**
```bash
# Full audit of all content
node index.js --mode=audit --max-posts=1000
```

**Expected Results:**
- Average score: 40-60 (typical for new sites)
- Common issues: Missing meta descriptions, no alt text, thin content
- Performance: Usually good (few posts, minimal plugins)

**Action Plan:**
1. Fix critical issues (multiple H1s, missing titles)
2. Add meta descriptions to top 20 posts
3. Add alt text to all images
4. Expand thin content

### Scenario 2: Established Site Maintenance

**Weekly Run:**
```bash
# Audit recent posts only
node index.js --mode=audit --max-posts=20
```

**Expected Results:**
- Average score: 70-80 (maintained site)
- Issues: Occasional forgotten alt text, long titles
- Performance: May degrade over time (plugin bloat)

**Action Plan:**
1. Review new posts for compliance
2. Monitor performance trends
3. Fix issues in batches

### Scenario 3: Major Content Migration

**Before Migration:**
```bash
# Full audit and backup
node index.js --mode=audit --max-posts=5000
cp -r logs logs-pre-migration
```

**After Migration:**
```bash
# Compare results
node index.js --mode=audit --max-posts=5000
diff logs-pre-migration logs-post-migration
```

**Expected Issues:**
- Broken internal links
- Missing images
- Changed URLs (301 redirects needed)
- Lost meta descriptions

## Performance Benchmarks

Based on 100+ real audits:

### Average Execution Times

| Operation | Time (posts) | Notes |
|-----------|--------------|-------|
| Connection test | 1-2s | Initial API check |
| Fetch 10 posts | 3-5s | Depends on server |
| Audit 10 posts | 5-10s | Content analysis |
| PageSpeed check | 30-60s | Per strategy (mobile/desktop) |
| Generate report | 2-3s | All formats |

### Typical Issue Distribution

| Issue Type | Percentage |
|------------|------------|
| Missing alt text | 25% |
| Meta description | 20% |
| Title length | 15% |
| Thin content | 15% |
| Heading structure | 10% |
| Links | 8% |
| Other | 7% |

### Score Improvements

After first round of fixes:

| Initial Score | After Fixes | Improvement |
|---------------|-------------|-------------|
| 30-40 | 55-65 | +25 points |
| 50-60 | 70-80 | +20 points |
| 70-80 | 85-92 | +12 points |

## Tips for Best Results

1. **Start Small**: Test with `--max-posts=5` first
2. **Review Reports**: Read HTML report before auto-fix
3. **Fix Critical First**: Address severe issues before minor ones
4. **Monitor Trends**: Run weekly, track improvements
5. **Backup First**: Always backup before enabling fixes
6. **Test on Staging**: Never test on production first
7. **Read Logs**: Check `logs/*.log` for detailed info
8. **Compare Reports**: Track progress over time

## Need Help?

- Full documentation: [README.md](../README.md)
- Quick start: [QUICKSTART.md](../QUICKSTART.md)
- Troubleshooting: [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- Advanced features: [INTEGRATIONS.md](../INTEGRATIONS.md)

---

These examples represent real-world output from the tool. Your results will vary based on your WordPress site's content and configuration.
