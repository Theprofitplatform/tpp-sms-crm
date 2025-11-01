  # Broken Link Detector v2 - Fix Dead Links 🔗

**Automatically detect and fix broken links with manual review workflow**

---

## 🎯 Overview

The Broken Link Detector v2 scans your WordPress site for broken links and suggests automatic fixes where possible.

**Key Features:**
- ✅ Scans all internal and external links
- ✅ Detects 404s, redirects, timeouts, and DNS errors
- ✅ Suggests automatic fixes (HTTPS upgrade, trailing slashes)
- ✅ Manual review workflow - you approve before changes
- ✅ Detailed impact descriptions
- ✅ Smart caching to avoid re-checking same URLs
- ✅ Categorizes by severity and fix type

---

## 🚀 How It Works

### 1. Detection Phase

The detector:
1. Scans all posts and pages for links
2. Tests each unique URL (with caching)
3. Categorizes broken links by status
4. Suggests automatic fixes where possible
5. Creates detailed proposals for review

**Types of Broken Links Detected:**
- **404 Not Found** - Page doesn't exist
- **410 Gone** - Permanently deleted
- **403 Forbidden** - Access denied
- **500 Server Errors** - Server issues
- **Timeouts** - Server not responding
- **DNS Errors** - Domain doesn't exist
- **Redirects** - 301/302 redirects (warnings)

### 2. Automatic Fix Suggestions

The detector tries these fixes automatically:
1. **HTTP → HTTPS** - Upgrade insecure links
2. **Add trailing slash** - `/page` → `/page/`
3. **Remove trailing slash** - `/page/` → `/page`
4. **HTTPS → HTTP** - Downgrade if needed (rare)

Each suggestion is verified before being proposed.

### 3. Review Phase

Each proposal includes:
- **Status and Error** - What's wrong
- **Suggested Fix** - Automatic replacement (if available)
- **Confidence Level** - High/Medium
- **Impact Description** - Why it matters
- **Verification Steps** - How to confirm the fix

### 4. Application Phase

After approval:
- Replaces broken links in content
- Handles both single and double quotes
- Updates WordPress via REST API
- Provides detailed success/failure reports

---

## 📊 Example Proposals

### Example 1: Automatic Fix (HTTP → HTTPS)

```
Issue:
Broken internal link detected: "http://example.com/about" returns HTTP 404 Not
Found. This internal link may indicate a missing or moved page. Link text:
"About Us". Broken links harm user experience and SEO rankings.

Fix:
Replace broken link "http://example.com/about" with working alternative
"https://example.com/about". Fix type: Upgrade HTTP to HTTPS. The new URL
was verified as working (HTTP 200).

Expected Benefit:
Fixing broken links improves user experience and SEO. Internal links should
always work. Benefits: better user trust, improved crawlability, restored
internal link equity, and compliance with web standards. Automatic fix available.

Risk Level: Medium (internal link)
Severity: High (404 error)
Confidence: High
Fix Type: protocol_upgrade

Verification Steps:
1. Visit the page at: https://example.com/blog-post
2. Find the link with text: "About Us"
3. Verify the link now points to: https://example.com/about
4. Click the link and confirm it loads successfully (HTTP 200)
5. Check that link is still contextually relevant to surrounding content
```

### Example 2: Manual Review Required

```
Issue:
Broken external link detected: "https://oldsite.com/resource" returns HTTP 404
Not Found. This external link is not accessible. Link text: "Resource Page".
Broken links harm user experience and SEO rankings.

Fix:
Remove or replace broken link "https://oldsite.com/resource". No automatic fix
available - manual intervention required. Consider: updating to correct URL,
removing the link, or linking to archive.org version.

Expected Benefit:
Fixing broken links improves user experience and SEO. External links should
always work. Benefits: better user trust, improved crawlability, and compliance
with web standards. Manual review needed to find replacement.

Risk Level: Low (external link)
Severity: High (404 error)
Manual Review Required: Yes

Verification Steps:
1. Visit the page at: https://example.com/blog-post
2. Find the link with text: "Resource Page"
3. Verify the link has been updated or removed
4. If updated, test the new link works correctly
5. Check that link is still contextually relevant to surrounding content
```

---

## 💻 Usage

### API Endpoint

```bash
# Detect broken links
POST /api/autofix/detect
{
  "engineId": "broken-link-detector-v2",
  "clientId": "your-client-id",
  "options": {
    "limit": 50,           // Max pages to scan
    "checkExternal": true, // Check external links
    "timeout": 5000        // Link timeout (ms)
  }
}

# Returns: { groupId, sessionId, proposals: N }
```

### JavaScript

```javascript
import { BrokenLinkDetectorV2 } from './src/automation/auto-fixers/broken-link-detector-v2.js';

const detector = new BrokenLinkDetectorV2({
  id: 'my-client',
  siteUrl: 'https://mysite.com',
  wpUser: 'admin',
  wpPassword: 'app_password_here',
  linkTimeout: 5000
});

// Run detection
const result = await detector.runDetection({
  limit: 50,
  checkExternal: true,
  timeout: 5000
});

console.log(`Found ${result.proposals} broken links`);

// Get proposals
const proposals = proposalService.getProposals({
  groupId: result.groupId,
  status: 'pending'
});

// Auto-approve proposals with automatic fixes
const fixable = proposals.filter(p =>
  p.metadata?.linkDetails?.suggestedFix &&
  p.metadata.linkDetails.suggestedFix.confidence === 'high'
);

fixable.forEach(p => {
  proposalService.reviewProposal(p.id, {
    action: 'approve',
    notes: 'Automatic fix with high confidence'
  });
});

// Apply approved
await detector.runApplication(result.groupId);
```

---

## 📈 Impact & Benefits

### SEO Benefits
- ✅ **Improved Crawlability** - Search engines can crawl your site without hitting dead ends
- ✅ **Better User Signals** - Lower bounce rate from working links
- ✅ **Link Equity Preservation** - Internal links pass PageRank correctly
- ✅ **Authority Maintenance** - External links to authoritative sources work

### User Experience Benefits
- ✅ **Trust** - Working links build credibility
- ✅ **Navigation** - Users can follow intended paths
- ✅ **Engagement** - No frustration from 404 errors
- ✅ **Professionalism** - Shows site is maintained

### Typical Results

**Before:**
- 150 total links scanned
- 12 broken links (8% broken rate)
- Mix of 404s, timeouts, and HTTPS issues

**After:**
- 8 automatically fixed (HTTP→HTTPS, trailing slashes)
- 4 flagged for manual review (outdated external links)
- 0% broken rate for fixable issues

---

## 🎯 Best Practices

### 1. Scan Regularly

```bash
# Weekly scan recommended
POST /api/autofix/detect
{
  "engineId": "broken-link-detector-v2",
  "clientId": "my-client",
  "options": { "limit": 100 }
}
```

**Why:** Links break over time as external sites change or internal pages move.

### 2. Start with Internal Links

```javascript
// First run: Internal links only
await detector.runDetection({
  limit: 50,
  checkExternal: false  // Skip external links
});
```

**Why:** Internal links are fully under your control and critical for SEO.

### 3. Approve High-Confidence Fixes

```javascript
// Auto-approve only high-confidence fixes
const highConfidence = proposals.filter(p =>
  p.metadata?.linkDetails?.suggestedFix?.confidence === 'high'
);
```

**Why:** High-confidence fixes (HTTPS upgrade, trailing slashes) are safe and verified.

### 4. Review External Links Manually

```javascript
// Flag external links for review
const external = proposals.filter(p =>
  p.metadata?.linkDetails?.isExternal
);

external.forEach(p => {
  // Manual review: Find replacement or remove
});
```

**Why:** External links require finding replacement sources or removing entirely.

### 5. Monitor Error Patterns

```javascript
// Get statistics
const stats = await detector.getBrokenLinkStats();

console.log('By status:', stats.byStatus);
console.log('By type:', stats.byType);
console.log('Fixable:', stats.fixable);
console.log('Manual review:', stats.manualReview);
```

**Why:** Patterns help identify systemic issues (e.g., site migration needed).

---

## ⚙️ Configuration Options

### Detection Options

```javascript
await detector.runDetection({
  limit: 50,              // Max pages to scan (default: 50)
  checkExternal: true,    // Check external links (default: true)
  timeout: 5000           // Link timeout in ms (default: 5000)
});
```

### Engine Configuration

```javascript
const detector = new BrokenLinkDetectorV2({
  id: 'my-client',
  siteUrl: 'https://mysite.com',
  wpUser: 'admin',
  wpPassword: 'app_password',
  linkTimeout: 10000  // Increase for slow servers
});
```

### Risk Levels

Automatically assigned based on link type:
- **Low**: External links (less critical)
- **Medium**: Internal links (more critical for SEO)

### Severity Levels

Based on HTTP status:
- **High**: 404, 410, timeout, DNS error (dead links)
- **Medium**: 500-series errors (might be temporary)

---

## 🔍 Verification

After applying fixes:

### 1. Test Links Manually
```bash
# Visit the updated page
# Click fixed links to verify they work
```

### 2. Use Link Checker Tools
- **Broken Link Checker** (WordPress plugin)
- **W3C Link Checker** - https://validator.w3.org/checklink
- **Screaming Frog SEO Spider** (desktop app)

### 3. Monitor in Google Search Console
```
Google Search Console → Coverage
Look for "Not found (404)" errors
Should decrease after fixing
```

### 4. Check Server Logs
```bash
# Look for 404 errors in access logs
grep " 404 " /var/log/apache2/access.log | tail -50
```

---

## 🐛 Troubleshooting

### "Timeout checking links"

**Cause**: Server is slow or links are timing out

**Solution**:
```javascript
// Increase timeout
await detector.runDetection({
  timeout: 10000  // 10 seconds instead of 5
});
```

### "Too many external links to check"

**Cause**: Scanning external links takes time

**Solution**:
```javascript
// Skip external links on first run
await detector.runDetection({
  checkExternal: false
});

// Or limit page count
await detector.runDetection({
  limit: 20
});
```

### "False positives (links marked broken but work)"

**Cause**: Some sites block HEAD requests or have bot protection

**Solution**:
- Review proposals manually
- Test links in browser
- Some sites require cookies or User-Agent headers

### "Fix failed: Link still appears in content"

**Cause**: Link might be in widget, shortcode, or different quote style

**Solution**:
- Check if link is in content vs sidebar/footer
- May need to update manually in WordPress admin
- Check raw HTML for actual quote style used

---

## 📊 Statistics & Reporting

### Get Statistics

```javascript
const stats = await detector.getBrokenLinkStats({
  limit: 100,
  checkExternal: true
});

console.log(`Total broken: ${stats.total}`);
console.log(`By status:`, stats.byStatus);
// Example: { "404": 5, "TIMEOUT": 2, "DNS_ERROR": 1 }

console.log(`By type:`, stats.byType);
// Example: { "internal": 3, "external": 5 }

console.log(`Fixable: ${stats.fixable}`);
console.log(`Manual review: ${stats.manualReview}`);
```

### Common Status Codes

| Status | Meaning | Fixable? |
|--------|---------|----------|
| 404 | Not Found | Maybe (try fixes) |
| 410 | Gone (permanent) | No |
| 403 | Forbidden | No |
| 500 | Server Error | Wait and retry |
| TIMEOUT | No response | Check server |
| DNS_ERROR | Domain doesn't exist | No |

---

## 🎓 Understanding Link Types

### Internal Links
- Point to your own domain
- **Critical for SEO** (pass PageRank)
- Usually fixable (you control the content)
- Risk: Medium (affects site navigation)

### External Links
- Point to other domains
- **Important for credibility** (cite sources)
- May break as sites change
- Risk: Low (doesn't affect site structure)

### Common Causes of Broken Links

1. **Page Deleted/Moved** - 404 errors
2. **Protocol Change** - HTTP vs HTTPS
3. **URL Structure Change** - Trailing slashes, case sensitivity
4. **Domain Expired** - DNS errors
5. **Temporary Outage** - Timeouts, 500 errors

---

## 🚀 Production Workflow

### Weekly Maintenance

**Monday:**
```bash
# 1. Run detection
curl -X POST .../detect -d '{
  "engineId": "broken-link-detector-v2",
  "clientId": "my-client",
  "options": {"limit": 100}
}'
```

**Tuesday:**
```bash
# 2. Review proposals
curl ".../proposals?groupId=...&status=pending"

# 3. Approve high-confidence fixes
curl -X POST .../accept-low-risk -d '{"groupId":"..."}'
```

**Wednesday:**
```bash
# 4. Apply approved fixes
curl -X POST .../apply -d '{
  "groupId": "...",
  "engineId": "broken-link-detector-v2",
  "clientId": "my-client"
}'
```

**Thursday:**
```bash
# 5. Manual review for remaining issues
# Check proposals marked for manual review
# Find replacements or remove links
```

**Friday:**
```bash
# 6. Verify fixes
# Test links on site
# Check Google Search Console
```

---

## 📚 Related Documentation

- **[MANUAL_REVIEW_README.md](MANUAL_REVIEW_README.md)** - System overview
- **[API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)** - API examples
- **[PROJECT_INDEX.md](PROJECT_INDEX.md)** - All resources

---

## 💡 Tips & Tricks

### 1. Batch Similar Fixes
Group proposals by fix type for faster review:
```javascript
const byFixType = proposals.reduce((acc, p) => {
  const type = p.metadata?.linkDetails?.suggestedFix?.type || 'manual';
  acc[type] = acc[type] || [];
  acc[type].push(p);
  return acc;
}, {});
```

### 2. Use Archive.org for Dead External Links
```javascript
// For dead external links, suggest archive.org
const archived = `https://web.archive.org/web/${brokenUrl}`;
```

### 3. Set Up Alerts for Broken Links
```javascript
// In your monitoring (see MONITORING_GUIDE.md)
if (stats.total > threshold) {
  sendAlert(`Found ${stats.total} broken links - review needed`);
}
```

### 4. Prioritize High-Traffic Pages
```javascript
// Check most important pages first
await detector.runDetection({
  limit: 10  // Focus on top 10 pages
});
```

---

**Ready to fix those broken links and improve your SEO!** 🔗✨
