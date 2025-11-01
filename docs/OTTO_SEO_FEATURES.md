# Otto SEO Features - Complete User Guide

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Pixel Management](#pixel-management)
4. [Schema Automation](#schema-automation)
5. [SSR Optimization](#ssr-optimization)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Introduction

### What Are Otto SEO Features?

Otto SEO Features are three powerful automation tools that bring enterprise-level SEO capabilities to your platform, inspired by Otto SEO but enhanced with white-label support and multi-client management.

### The Three Features

1. **🔍 Pixel Management** - Lightweight JavaScript tracking for real-time SEO monitoring
2. **🤖 Schema Automation** - AI-powered schema markup detection and generation
3. **⚡ SSR Optimization** - Server-side SEO optimizations without CMS access

### Why Use These Features?

✅ **Universal Compatibility** - Works with ANY website (WordPress, Shopify, Wix, Squarespace, static HTML)
✅ **No CMS Required** - Apply optimizations without backend access
✅ **Real-Time Monitoring** - Track SEO metrics as they happen
✅ **AI-Powered** - Automatic detection and generation of schema markup
✅ **Performance Optimized** - Caching and smart delivery
✅ **White-Label Ready** - Perfect for agencies and resellers

---

## Quick Start

### Prerequisites

- SEO Expert Platform v2.0.0 or higher
- Active client account
- (Optional) Anthropic API key for AI features

### 5-Minute Setup

1. **Access the Dashboard**
   ```
   Navigate to: http://localhost:9000
   ```

2. **Find Otto Features**
   - Open the sidebar
   - Locate the "Otto Features" section
   - Choose your desired feature

3. **Select a Client**
   - Use the client dropdown at the top
   - All features are per-client

4. **Start Using!**
   - Follow the in-app guides
   - Each feature has intuitive wizards

---

## Pixel Management

### Overview

Pixel Management lets you deploy a lightweight JavaScript tracking pixel on any website to monitor SEO metrics in real-time, without requiring backend access or CMS integration.

### What Gets Tracked?

- ✅ Page titles and meta descriptions
- ✅ Heading structure (H1, H2, etc.)
- ✅ Images and alt text
- ✅ Internal and external links
- ✅ Existing schema markup
- ✅ Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
- ✅ SEO score (0-100)
- ✅ Detected issues and warnings

### Step-by-Step Guide

#### 1. Generate a Pixel

1. Navigate to **Otto Features > Pixel Management**
2. Select your client from the dropdown
3. Click **"Generate New Pixel"**
4. Fill in the configuration:
   - **Domain**: Your client's domain (e.g., `example.com`)
   - **Deployment Type**: Choose where to place the pixel
     - `Header` (Recommended) - Best for early loading
     - `Body` - Alternative placement
     - `Footer` - Minimal performance impact
   - **Features**: Select what to track
     - `meta-tracking` - Page metadata and SEO elements
     - `performance` - Core Web Vitals
     - `schema` - Existing schema detection
     - `live-updates` - WebSocket for real-time optimization
   - **Debug Mode**: Enable console logging (for testing only)
5. Click **"Generate Pixel"**

#### 2. Install the Pixel

After generation, you'll see:

```html
<!-- SEO Expert Pixel -->
<script>
(function() {
  // Pixel code here...
})();
</script>
```

**Installation Steps:**

- **WordPress**:
  1. Install "Insert Headers and Footers" plugin
  2. Paste code in header section
  3. Save

- **Shopify**:
  1. Go to Online Store > Themes > Edit Code
  2. Open `theme.liquid`
  3. Paste before `</head>`
  4. Save

- **Squarespace**:
  1. Settings > Advanced > Code Injection
  2. Paste in Header section
  3. Save

- **Custom HTML**:
  1. Open your HTML file
  2. Paste inside `<head>` section
  3. Upload to server

#### 3. Verify Installation

1. Visit your client's website
2. Open browser console (F12)
3. Look for: `[SEO Pixel] Initializing SEO Pixel v2.0.0`
4. Refresh your dashboard - pixel should show "Active"

#### 4. Monitor Tracked Pages

The dashboard shows:

- **Active Pixels**: Number of installed, active pixels
- **Pages Tracked**: Total pages monitored
- **Online Now**: Currently active pixels
- **Avg SEO Score**: Average across all tracked pages

**Tracked Pages Table:**

| Column | Description |
|--------|-------------|
| Page | Title and URL |
| SEO Score | 0-100 score with color indicator |
| Issues | Detected problems (errors, warnings, info) |
| Last Tracked | Most recent data collection |

#### 5. Understand SEO Scores

**Score Ranges:**
- 🟢 **80-100**: Excellent - Minor improvements only
- 🟡 **60-79**: Good - Some optimization needed
- 🔴 **0-59**: Needs Work - Major issues detected

**What Affects Scores:**

| Issue Type | Impact | Examples |
|------------|--------|----------|
| Error | -10 points | Missing title, no meta description |
| Warning | -5 points | Title too long, missing alt text |
| Info | 0 points | Suggestions only |
| Bonus | +3-5 points | Schema present, good CWV scores |

#### 6. Common Issues Detected

1. **Missing Title** (Error)
   - No `<title>` tag found
   - Fix: Add title tag

2. **Meta Description Issues** (Error/Warning)
   - Missing or too short (< 120 chars)
   - Fix: Add description 120-160 chars

3. **H1 Problems** (Error/Warning)
   - No H1 or multiple H1 tags
   - Fix: Use exactly one H1 per page

4. **Images Without Alt** (Warning)
   - Images missing alt attributes
   - Fix: Add descriptive alt text

5. **Poor Core Web Vitals** (Warning)
   - LCP > 2.5s, FID > 100ms, CLS > 0.1
   - Fix: Optimize images, reduce JavaScript

6. **No Schema Markup** (Info)
   - No structured data found
   - Fix: Use Schema Automation feature

### Advanced Features

#### WebSocket Live Updates

When enabled, the pixel can receive real-time optimization commands:

```javascript
// Example: Update title in real-time
{
  type: 'UPDATE_META',
  title: 'New Title',
  description: 'New Description'
}

// Example: Inject schema
{
  type: 'INJECT_SCHEMA',
  schema: { "@type": "Article", ... }
}
```

#### Custom Events

Track custom events by extending the pixel:

```javascript
// After pixel loads
window.seoPixelTrack = function(eventName, data) {
  // Custom tracking logic
};
```

### Performance Impact

- **Pixel Size**: ~11 KB minified
- **Load Time**: < 50ms
- **Data Transmission**: < 5 KB per page
- **Frequency**: Every 5 minutes + on page load

### Privacy & Security

- ✅ No personal data collected
- ✅ No cookies used
- ✅ GDPR compliant
- ✅ Secure HTTPS transmission
- ✅ API key authentication

---

## Schema Automation

### Overview

Schema Automation uses AI to automatically detect schema markup opportunities on your pages and generate valid JSON-LD structured data that helps search engines understand your content better.

### Supported Schema Types

| Type | Use Case | Rich Results |
|------|----------|--------------|
| **Article** | Blog posts, news | Article cards, AMP |
| **Product** | E-commerce items | Product cards, price |
| **LocalBusiness** | Physical locations | Local pack, maps |
| **FAQPage** | Q&A sections | FAQ accordion |
| **HowTo** | Step-by-step guides | How-to carousel |
| **Recipe** | Cooking instructions | Recipe cards |
| **Review** | Product/service reviews | Star ratings |
| **Event** | Upcoming events | Event listings |
| **Organization** | Company info | Knowledge panel |
| **BreadcrumbList** | Navigation | Breadcrumb display |

### Step-by-Step Guide

#### 1. Analyze Pages for Opportunities

Schema opportunities are detected automatically when:
- Pixel tracks a page
- Manual page analysis is run
- Audit is performed

Or manually analyze:

1. Navigate to **Otto Features > Schema Automation**
2. Select your client
3. Click **"Analyze Page"** (if available)
4. Enter page URL and HTML
5. Click **"Analyze"**

#### 2. Review Opportunities

The **Opportunities Tab** shows detected schema types:

**Opportunity Card Shows:**
- **Schema Type**: What kind of structured data
- **Priority Badge**: High/Medium/Low urgency
- **Impact**: Expected SEO benefit
- **Confidence Score**: How certain the AI is (0-100%)
- **Recommendation**: Why this schema fits
- **Generate & Apply Button**: One-click implementation

**Example Opportunity:**

```
📄 Article Schema
Priority: HIGH  Impact: MEDIUM  Confidence: 85%

"This page appears to be an article with 500 words. Adding
Article schema will help it appear in Google News and rich results."

[Generate & Apply]
```

#### 3. Generate Schema with AI

1. Click **"Generate & Apply"** on any opportunity
2. AI analyzes the page and creates schema
3. Review the generated JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Build a Website",
  "description": "Learn how to build a website in 10 easy steps",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  },
  "datePublished": "2025-01-01",
  "image": "https://example.com/image.jpg"
}
```

4. Click **"Apply This Schema"** to implement

#### 4. Manage Applied Schemas

The **Applied Schemas Tab** shows active structured data:

| Column | Description |
|--------|-------------|
| Type | Schema type with icon |
| Page | Where it's applied |
| Status | Active/Inactive |
| Applied | Installation date |
| Actions | View or Remove |

#### 5. Understanding Confidence Scores

**How Confidence is Calculated:**

- **80-100%**: Very confident - Clear indicators present
  - Example: Article has title, author, date, 500+ words

- **60-79%**: Confident - Most indicators present
  - Example: Product has name, price, but no image

- **50-59%**: Moderate - Some indicators present
  - Example: FAQ section with 3+ questions

- **Below 50%**: Not recommended - Weak indicators
  - Not shown to avoid false positives

**Confidence Factors:**

| Schema Type | Key Indicators |
|-------------|----------------|
| Article | `<article>` tag, heading, author, date, 300+ words |
| Product | Price, SKU, "add to cart" button |
| LocalBusiness | Address, phone, business hours |
| FAQPage | Question/answer pairs (3+ required) |
| HowTo | Numbered or ordered list (3+ steps) |
| Recipe | Ingredients list, instructions |

#### 6. Priority Classification

**High Priority:**
- Confidence > 70%
- High-impact schema type (Product, LocalBusiness, FAQPage)
- Can significantly improve search visibility

**Medium Priority:**
- Confidence 60-70%
- Medium-impact type (Article, HowTo, Recipe)
- Good for rich results

**Low Priority:**
- Confidence 50-60%
- Lower-impact type (Organization, BreadcrumbList)
- Nice to have

#### 7. Validation

After applying schema, validate it:

1. Go to [Google Rich Results Test](https://search.google.com/test/rich-results)
2. Enter your page URL
3. Check for errors/warnings
4. Fix any issues in the schema editor

**Common Validation Issues:**

- Missing required fields (e.g., `name` for Product)
- Invalid date format (use ISO 8601: `2025-01-01`)
- Wrong URL format (must be absolute: `https://...`)
- Image URL not accessible

### Schema Best Practices

#### Article Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Your Title Here (< 110 chars)",
  "description": "Meta description",
  "image": ["https://example.com/image.jpg"],
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Site",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.jpg"
    }
  },
  "datePublished": "2025-01-01T12:00:00+00:00",
  "dateModified": "2025-01-15T12:00:00+00:00"
}
```

**Tips:**
- Keep headline under 110 characters
- Include high-quality image (1200x675px recommended)
- Always include publisher info
- Use proper date format with timezone

#### Product Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "image": ["https://example.com/product.jpg"],
  "description": "Product description",
  "sku": "12345",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://example.com/product"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "123"
  }
}
```

**Tips:**
- Include multiple high-quality images
- Add ratings if available (significantly improves CTR)
- Keep prices current
- Specify availability accurately

#### LocalBusiness Schema

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Business Name",
  "image": "https://example.com/storefront.jpg",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94102",
    "addressCountry": "US"
  },
  "telephone": "+1-415-555-0123",
  "url": "https://example.com",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ],
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "37.7749",
    "longitude": "-122.4194"
  }
}
```

**Tips:**
- Include complete NAP (Name, Address, Phone)
- Add business hours
- Include geo coordinates for better local SEO
- Use specific business type (Restaurant, Dentist, etc.)

### ROI of Schema Markup

**Expected Results:**

| Schema Type | CTR Improvement | Time to Effect |
|-------------|-----------------|----------------|
| Product | +20-40% | 1-2 weeks |
| FAQ | +15-30% | 1 week |
| Recipe | +25-35% | 1-2 weeks |
| Review | +20-30% | 1-2 weeks |
| HowTo | +15-25% | 1-2 weeks |
| LocalBusiness | +10-20% | 2-4 weeks |

**Note**: Results vary based on content quality, competition, and existing rankings.

---

## SSR Optimization

### Overview

SSR (Server-Side Rendering) Optimization allows you to apply SEO improvements to any website without requiring CMS access or backend modifications. The optimizations are applied on-the-fly when pages are served.

### Use Cases

Perfect for:
- ✅ Shopify, Wix, Squarespace sites (limited API access)
- ✅ Client sites where you don't have backend access
- ✅ Static HTML sites
- ✅ Third-party platforms
- ✅ Testing optimizations before permanent implementation
- ✅ Emergency SEO fixes

### Supported Optimization Types

| Type | What It Does | Example |
|------|--------------|---------|
| **Title Tag** | Replaces `<title>` | "Home" → "Best SEO Tools 2025 \| Brand" |
| **Meta Description** | Updates meta description | Add/improve description |
| **Schema Markup** | Injects structured data | Add Article schema |
| **Canonical URL** | Sets canonical link | Prevent duplicate content |
| **Hreflang Tags** | Adds language alternatives | Multi-language support |
| **Open Graph Tags** | Social media meta tags | Facebook/Twitter cards |
| **Robots Meta** | Controls indexing | noindex, nofollow, etc. |

### Step-by-Step Guide

#### 1. Create an Optimization

1. Navigate to **Otto Features > SSR Optimization**
2. Select your client
3. Click **"Create Optimization"**
4. Fill in the form:

**Domain:**
```
example.com
```

**Page URL:**
```
https://example.com/page-to-optimize
```

**Optimization Type:**
- Choose from 7 types (see table above)

**Optimized Value:**
```
Enter the new/improved value
```

5. (Optional) Click **"Test First"** to preview
6. Click **"Create Optimization"**

#### 2. Optimization Type Examples

##### Title Tag Optimization

**Original:**
```html
<title>Home</title>
```

**Optimized Value:**
```
Best SEO Tools for Small Business | 2025 Guide | Brand Name
```

**Result:**
```html
<title>Best SEO Tools for Small Business | 2025 Guide | Brand Name</title>
```

**Best Practices:**
- Keep under 60 characters
- Include primary keyword
- Add brand name at end
- Make it compelling (increase CTR)

---

##### Meta Description Optimization

**Original:**
```html
<meta name="description" content="">
```

**Optimized Value:**
```
Discover the top 10 SEO tools for small businesses in 2025. Compare features, pricing, and reviews. Start your free trial today!
```

**Result:**
```html
<meta name="description" content="Discover the top 10 SEO tools for small businesses in 2025. Compare features, pricing, and reviews. Start your free trial today!">
```

**Best Practices:**
- 120-160 characters
- Include call-to-action
- Use active voice
- Include target keyword naturally

---

##### Schema Markup Optimization

**Optimized Value (JSON format):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Company Name",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://facebook.com/company",
    "https://twitter.com/company"
  ]
}
```

**Result:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  ...
}
</script>
```

---

##### Hreflang Tags Optimization

**Optimized Value (JSON format):**
```json
[
  {"code": "en", "url": "https://example.com/en/page"},
  {"code": "es", "url": "https://example.com/es/pagina"},
  {"code": "fr", "url": "https://example.com/fr/page"}
]
```

**Result:**
```html
<link rel="alternate" hreflang="en" href="https://example.com/en/page">
<link rel="alternate" hreflang="es" href="https://example.com/es/pagina">
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page">
```

---

##### Open Graph Tags Optimization

**Optimized Value (JSON format):**
```json
{
  "title": "Amazing Article Title",
  "description": "This article will blow your mind!",
  "image": "https://example.com/og-image.jpg",
  "url": "https://example.com/article",
  "type": "article"
}
```

**Result:**
```html
<meta property="og:title" content="Amazing Article Title">
<meta property="og:description" content="This article will blow your mind!">
<meta property="og:image" content="https://example.com/og-image.jpg">
<meta property="og:url" content="https://example.com/article">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
```

---

#### 3. Test Before Applying

Always test optimizations first:

1. Click **"Test First"** button
2. Review the preview
3. Check for errors
4. Verify HTML output
5. If good, click **"Create Optimization"**

**Test Results Show:**
- ✅ Success/Failure status
- 📋 Preview of changes
- 🔍 HTML output sample

#### 4. Monitor Performance

The dashboard shows:

**Stats Cards:**
- **Active Optimizations**: Total active
- **Pages Optimized**: Unique pages affected
- **Total Serves**: How many times served
- **Cache Hits**: Performance metric

**Optimization Types Breakdown:**
- Count by type
- Total serves per type
- Performance metrics

**Optimizations Table:**

| Column | Information |
|--------|-------------|
| Type | Optimization type |
| Page | Affected URL |
| Value | Preview of optimized content |
| Serves | Times delivered |
| Status | Active/Inactive |
| Actions | Rollback or Deactivate |

#### 5. Rollback Optimizations

If something goes wrong:

1. Find the optimization in the table
2. Click the rollback icon (⟲)
3. Enter reason for rollback
4. Confirm

**The optimization will:**
- Be marked as inactive
- Stop being applied immediately
- Preserve history for audit trail
- Clear from cache

#### 6. Performance & Caching

**How Caching Works:**
1. First request: Optimization applied, result cached
2. Subsequent requests: Served from cache (ultra-fast)
3. Cache TTL: 60 minutes by default
4. Manual clear: Use "Clear Cache" button

**Cache Benefits:**
- ⚡ 10-100x faster delivery
- 📉 Reduced server load
- 💰 Lower API costs
- 🚀 Better user experience

**Cache Stats:**
- **Cached Pages**: Number of entries
- **Total Hits**: Cache hit count
- **Avg Hits/Page**: Efficiency metric
- **Hit Rate**: Cache effectiveness

#### 7. Batch Operations

Optimize multiple pages at once:

1. Prepare a list of pages
2. Create optimizations for each
3. Use API for automation:

```bash
curl -X POST http://localhost:9000/api/v2/ssr/batch \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-123",
    "domain": "example.com",
    "optimizations": [
      {
        "pageUrl": "https://example.com/page1",
        "type": "title",
        "optimizedValue": "New Title 1"
      },
      {
        "pageUrl": "https://example.com/page2",
        "type": "title",
        "optimizedValue": "New Title 2"
      }
    ]
  }'
```

### Best Practices

#### ✅ DO

- **Test first** - Always use "Test First" before applying
- **Document changes** - Keep track of what you optimize
- **Monitor serves** - Check that optimizations are being used
- **Use rollback** - Undo if something goes wrong
- **Clear cache** - After major changes
- **Validate** - Use Google tools to verify
- **Start small** - Optimize one page type at a time

#### ❌ DON'T

- Don't optimize too many pages at once
- Don't skip testing
- Don't forget about cache (may need manual clear)
- Don't use for illegal content
- Don't override critical security headers
- Don't apply contradictory optimizations

### Troubleshooting

**Problem: Optimization not appearing**
- Solution: Clear cache and check serve count

**Problem: Original content still showing**
- Solution: Verify optimization is active and page URL matches exactly

**Problem: Slow performance**
- Solution: Check cache stats, should be > 80% hit rate

**Problem: JSON validation errors**
- Solution: Use [JSON Lint](https://jsonlint.com/) to validate format

---

## Best Practices

### General Guidelines

#### 1. Start with High-Impact Changes

**Priority Order:**
1. Fix critical errors (missing titles, broken links)
2. Add high-impact schema (Product, LocalBusiness, FAQ)
3. Optimize meta descriptions
4. Enhance with additional schema
5. Fine-tune performance

#### 2. Monitor Results

**Track These Metrics:**
- Search Console impressions & clicks
- Average position changes
- CTR improvements
- Page load times
- Schema validation status

**Recommended Tools:**
- Google Search Console
- Google Rich Results Test
- PageSpeed Insights
- Pixel Management dashboard

#### 3. Test Thoroughly

**Testing Checklist:**
- ✅ Validate schema with Google tools
- ✅ Check mobile rendering
- ✅ Verify Core Web Vitals
- ✅ Test on multiple browsers
- ✅ Check social media cards
- ✅ Monitor error logs

#### 4. Document Everything

**Keep Records Of:**
- What was optimized and when
- Original vs. optimized values
- Expected vs. actual results
- Issues encountered
- Rollback history

### Agency-Specific Best Practices

#### White-Label Usage

1. **Custom Branding**
   - Use your company name in reports
   - Custom email notifications
   - Branded dashboard

2. **Client Communication**
   - Explain features in simple terms
   - Show before/after comparisons
   - Provide regular updates

3. **Reporting**
   - Weekly/monthly summaries
   - SEO score improvements
   - Issues fixed vs. remaining

#### Multi-Client Management

1. **Organization**
   - Use clear client naming
   - Tag clients by industry
   - Group similar sites

2. **Automation**
   - Set up scheduled audits
   - Automate email reports
   - Bulk operations for similar changes

3. **Scaling**
   - Start with pilot clients
   - Document processes
   - Create templates
   - Train team members

---

## Troubleshooting

### Common Issues

#### Pixel Not Tracking

**Symptoms:**
- Pixel shows "Offline"
- No tracked pages appearing
- Last seen date is old

**Solutions:**
1. **Check Installation**
   ```bash
   # Open browser console on client's site
   # Should see: [SEO Pixel] Initializing...
   ```

2. **Verify Domain**
   - Make sure domain in pixel matches actual domain
   - No trailing slashes

3. **Check API Key**
   - Pixel may have been deactivated
   - Regenerate if needed

4. **CORS Issues**
   - Check browser console for CORS errors
   - Verify API endpoint is accessible

5. **Content Security Policy**
   - Site may block third-party scripts
   - Add exception in CSP header

#### Schema Not Validating

**Symptoms:**
- Google Rich Results Test shows errors
- Schema not appearing in search results

**Solutions:**
1. **Check Required Fields**
   - Each schema type has required fields
   - Use Google's documentation

2. **Validate JSON**
   - Copy schema to [JSON Lint](https://jsonlint.com/)
   - Fix any syntax errors

3. **Check URLs**
   - Must be absolute (https://...)
   - Must be accessible (no 404s)

4. **Image Issues**
   - Images must be accessible
   - Minimum dimensions (1200x675 for Article)

5. **Date Format**
   - Use ISO 8601: `2025-01-01T12:00:00+00:00`

#### SSR Optimization Not Working

**Symptoms:**
- Original content still showing
- Optimization shows 0 serves

**Solutions:**
1. **Check URL Match**
   - URL must match exactly
   - Include/exclude trailing slash consistently

2. **Clear Cache**
   - Click "Clear Cache" button
   - Wait 1-2 minutes
   - Test again

3. **Check Status**
   - Optimization must be "Active"
   - Check it wasn't accidentally deactivated

4. **Verify Method**
   - Some platforms block HTML modification
   - Try different application method

5. **Check Logs**
   - Review server logs for errors
   - Check activity log for issues

### Performance Issues

#### Slow Page Load

**If pixel slows down site:**

1. **Reduce Features**
   - Disable unnecessary features
   - Use footer deployment instead

2. **Async Loading**
   - Pixel already uses async
   - Verify no blocking scripts

3. **Check Frequency**
   - Default: every 5 minutes
   - Reduce if needed

#### High Server Load

**If SSR causes issues:**

1. **Check Cache Hit Rate**
   - Should be > 80%
   - If low, increase TTL

2. **Limit Optimizations**
   - Start with critical pages only
   - Expand gradually

3. **Use CDN**
   - Cloudflare, AWS CloudFront
   - Offload static content

### Getting Help

**If you're stuck:**

1. **Check Logs**
   - Activity Log in dashboard
   - Server logs
   - Browser console

2. **Run Diagnostics**
   ```bash
   node test-otto-features.js
   ```

3. **Documentation**
   - This guide
   - API documentation
   - inline help in UI

4. **Support**
   - GitHub issues
   - Support email
   - Community forums

---

## FAQ

### General Questions

**Q: Do these features work with any website?**
A: Yes! Pixel Management and SSR Optimization work with ANY website, regardless of CMS. Schema Automation works with any HTML.

**Q: Will this slow down my client's website?**
A: No. The pixel is ~11KB and loads asynchronously. SSR optimizations are cached for performance.

**Q: Is this better than Otto SEO?**
A: We offer similar features PLUS white-label support, multi-client management, and lead generation - all at a better price point.

**Q: Can I use these for my own sites?**
A: Absolutely! Create a client account for yourself and use all features.

### Pixel Management

**Q: How often does the pixel send data?**
A: On page load, then every 5 minutes while the page is open.

**Q: What happens if JavaScript is disabled?**
A: The pixel won't work, but this affects < 1% of users.

**Q: Can the pixel detect all SEO issues?**
A: It detects 10+ common issues. For comprehensive audits, use the full SEO audit feature.

**Q: Does the pixel work with SPAs (React, Vue, Angular)?**
A: Yes, but may need custom integration for route changes.

### Schema Automation

**Q: Is the AI-generated schema accurate?**
A: Yes, with 85%+ accuracy for high-confidence opportunities. Always validate with Google tools.

**Q: Do I need an Anthropic API key?**
A: Only for AI generation. Manual schema creation works without it.

**Q: How long until schema appears in search?**
A: Google typically recognizes schema within 1-2 weeks. Results may take 2-4 weeks.

**Q: Can I edit the generated schema?**
A: Yes, before applying. After applying, remove and create a new one.

### SSR Optimization

**Q: Is this permanent?**
A: No, it's applied on-the-fly. Original files are unchanged. Deactivate anytime.

**Q: Does it work with all hosting providers?**
A: Yes, as long as you can route traffic through the optimization proxy.

**Q: Can I optimize thousands of pages?**
A: Yes, use batch operations. Cache ensures good performance.

**Q: What if the original site updates?**
A: Your optimizations continue to work. They override the original content.

### Pricing & Licensing

**Q: Is this included in the base platform?**
A: Yes, all features included in SEO Expert Platform v2.0.0+.

**Q: Can I charge my clients for this?**
A: Yes! It's white-label ready. Price it however you want.

**Q: Are there usage limits?**
A: No hard limits. Reasonable use expected.

**Q: What about API costs (Anthropic)?**
A: You pay for your own API usage. ~$0.01 per schema generation with Haiku.

---

## Appendix

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Quick search |
| `Ctrl + R` | Refresh data |
| `Ctrl + N` | New optimization/pixel |
| `Esc` | Close modal |

### API Quick Reference

**Pixel Management:**
```bash
# Generate pixel
POST /api/v2/pixel/generate

# Track data
POST /api/v2/pixel/track

# Get status
GET /api/v2/pixel/status/:clientId
```

**Schema Automation:**
```bash
# Analyze page
POST /api/v2/schema/analyze

# Generate schema
POST /api/v2/schema/generate

# Apply schema
POST /api/v2/schema/apply
```

**SSR Optimization:**
```bash
# Create optimization
POST /api/v2/ssr/optimize

# Apply to HTML
POST /api/v2/ssr/apply

# Get stats
GET /api/v2/ssr/stats/:clientId
```

### Glossary

- **CWV**: Core Web Vitals - Google's page experience metrics
- **JSON-LD**: JavaScript Object Notation for Linked Data - schema format
- **NAP**: Name, Address, Phone - local SEO data
- **SERP**: Search Engine Results Page
- **SSR**: Server-Side Rendering
- **TTL**: Time To Live - cache duration

### Resources

- [Schema.org](https://schema.org) - Schema markup reference
- [Google Rich Results Test](https://search.google.com/test/rich-results) - Validate schema
- [PageSpeed Insights](https://pagespeed.web.dev/) - Performance testing
- [Search Console](https://search.google.com/search-console) - Monitor SEO
- [JSON Lint](https://jsonlint.com/) - Validate JSON

---

## Support

For support, questions, or feature requests:

- 📧 Email: support@yourcompany.com
- 🐛 Issues: GitHub repository
- 📖 Docs: This guide
- 💬 Community: Forum/Discord

---

**Version:** 2.0.0
**Last Updated:** 2025-01-01
**License:** Proprietary

---

© 2025 SEO Expert Platform. All rights reserved.
