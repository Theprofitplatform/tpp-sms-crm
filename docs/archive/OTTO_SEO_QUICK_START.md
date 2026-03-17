# Otto SEO Features - Quick Start Guide

**Deployment Date:** November 1, 2025
**Production URL:** https://seodashboard.theprofitplatform.com.au/

## Overview

Otto SEO is a suite of three powerful enhancement tools now live on production:

1. **Pixel/Script-Based Deployment** - Real-time page tracking and data collection
2. **Schema Automation Engine** - AI-powered schema markup generation
3. **SSR Optimization Service** - Server-side rendering performance enhancements

---

## 🎯 Feature 1: Pixel Management

### What It Does
Deploys a lightweight JavaScript pixel to client websites that:
- Tracks page metadata (titles, descriptions, headings)
- Collects Core Web Vitals (LCP, FID, CLS)
- Detects existing schema markup
- Identifies SEO issues in real-time
- Reports back to the dashboard

### Accessing the Feature
**Dashboard:** Navigate to `Otto Features → Pixel Management`

### API Endpoints

#### Generate New Pixel
```bash
POST /api/v2/pixel/generate
Content-Type: application/json

{
  "clientId": "client-123",
  "domain": "example.com",
  "deploymentType": "header",  // 'header', 'body', or 'footer'
  "features": ["meta-tracking", "performance", "schema"],
  "debug": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pixelId": "px_abc123",
    "apiKey": "sk_live_xyz789",
    "pixelCode": "<script>...",
    "deploymentInstructions": "Add this code to your <head> tag"
  }
}
```

#### Track Page Data
```bash
POST /api/v2/pixel/track
Content-Type: application/json

{
  "apiKey": "sk_live_xyz789",
  "url": "https://example.com/page",
  "pageTitle": "Example Page",
  "metaDescription": "Description...",
  "h1Tags": ["Main Heading"],
  "performanceMetrics": {
    "lcp": 1.2,
    "fid": 50,
    "cls": 0.05
  }
}
```

#### View Pixel Status
```bash
GET /api/v2/pixel/status/:clientId
```

#### View Tracked Pages
```bash
GET /api/v2/pixel/pages/:clientId
```

#### Deactivate Pixel
```bash
POST /api/v2/pixel/deactivate
Content-Type: application/json

{
  "clientId": "client-123",
  "pixelId": "px_abc123"
}
```

### Database Tables
- **pixel_deployments** - Tracks active pixels
- **pixel_page_data** - Stores collected page data
- **page_performance** - Core Web Vitals history

---

## 📦 Feature 2: Schema Automation

### What It Does
- Analyzes pages for schema opportunities
- Generates AI-powered JSON-LD markup
- Validates schema against Google standards
- Applies schema to client websites
- Tracks schema performance

### Accessing the Feature
**Dashboard:** Navigate to `Otto Features → Schema Automation`

### API Endpoints

#### Analyze Page for Opportunities
```bash
POST /api/v2/schema/analyze
Content-Type: application/json

{
  "url": "https://example.com/product-page",
  "pageContent": "<html>...",
  "businessType": "ecommerce"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "opportunities": [
    {
      "type": "Product",
      "confidence": 0.95,
      "reason": "Detected product information",
      "requiredFields": ["name", "price", "availability"]
    },
    {
      "type": "BreadcrumbList",
      "confidence": 0.88,
      "reason": "Found breadcrumb navigation"
    }
  ]
}
```

#### Get Schema Opportunities
```bash
GET /api/v2/schema/opportunities/:clientId
```

#### Generate Schema Markup
```bash
POST /api/v2/schema/generate
Content-Type: application/json

{
  "clientId": "client-123",
  "url": "https://example.com/product",
  "schemaType": "Product",
  "pageData": {
    "name": "Amazing Product",
    "price": "29.99",
    "currency": "USD",
    "availability": "InStock"
  }
}
```

**Response:**
```json
{
  "success": true,
  "schema": {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Amazing Product",
    "offers": {
      "@type": "Offer",
      "price": "29.99",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  },
  "validation": {
    "valid": true,
    "warnings": []
  }
}
```

#### Apply Schema to Page
```bash
POST /api/v2/schema/apply
Content-Type: application/json

{
  "clientId": "client-123",
  "url": "https://example.com/product",
  "schemaId": "schema_xyz"
}
```

#### View Applied Schemas
```bash
GET /api/v2/schema/applied/:clientId
```

#### Validate Schema
```bash
POST /api/v2/schema/validate
Content-Type: application/json

{
  "schema": {
    "@context": "https://schema.org",
    "@type": "Product",
    ...
  }
}
```

#### Remove Schema
```bash
DELETE /api/v2/schema/:clientId/:schemaId
```

### Supported Schema Types
- **Article** - Blog posts, news articles
- **Product** - E-commerce products
- **LocalBusiness** - Physical businesses
- **FAQPage** - FAQ sections
- **HowTo** - Step-by-step guides
- **Organization** - Company information
- **BreadcrumbList** - Navigation breadcrumbs
- **Review** - Product/service reviews

### Database Tables
- **schema_markup** - Generated schemas
- **schema_suggestions** - AI recommendations

---

## ⚡ Feature 3: SSR Optimization

### What It Does
- Optimizes content for server-side rendering
- Pre-renders critical above-the-fold content
- Lazy-loads non-critical resources
- Minifies HTML/CSS/JS
- Implements resource hints (preload, prefetch)
- Improves Core Web Vitals scores

### Accessing the Feature
**Dashboard:** Navigate to `Otto Features → SSR Optimization`

### API Endpoints

#### Optimize Page for SSR
```bash
POST /api/v2/ssr/optimize
Content-Type: application/json

{
  "clientId": "client-123",
  "url": "https://example.com/page",
  "optimizations": [
    "critical-css",
    "lazy-images",
    "resource-hints",
    "minification"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "optimization": {
    "id": "opt_abc123",
    "url": "https://example.com/page",
    "improvements": {
      "lcp": "+45%",
      "fid": "+30%",
      "cls": "+60%"
    },
    "optimizedHtml": "<!DOCTYPE html>...",
    "criticalCss": "body{margin:0}..."
  }
}
```

#### Apply Optimization
```bash
POST /api/v2/ssr/apply
Content-Type: application/json

{
  "clientId": "client-123",
  "optimizationId": "opt_abc123"
}
```

#### View Optimizations
```bash
GET /api/v2/ssr/optimizations/:clientId
```

#### Performance Statistics
```bash
GET /api/v2/ssr/stats/:clientId
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalOptimizations": 45,
    "avgLcpImprovement": "+42%",
    "avgFidImprovement": "+35%",
    "avgClsImprovement": "+58%",
    "pagesOptimized": 45,
    "totalSavings": "12.3 MB"
  }
}
```

#### Deactivate Optimization
```bash
POST /api/v2/ssr/deactivate
Content-Type: application/json

{
  "clientId": "client-123",
  "optimizationId": "opt_abc123"
}
```

#### Rollback Optimization
```bash
POST /api/v2/ssr/rollback
Content-Type: application/json

{
  "clientId": "client-123",
  "optimizationId": "opt_abc123",
  "reason": "Performance regression detected"
}
```

#### Batch Optimize
```bash
POST /api/v2/ssr/batch
Content-Type: application/json

{
  "clientId": "client-123",
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
  ],
  "optimizations": ["all"]
}
```

### Database Tables
- **ssr_optimizations** - Optimization history
- **page_performance** - Before/after metrics

---

## Authentication

All Otto SEO API endpoints support JWT authentication:

```bash
# Include JWT token in header
Authorization: Bearer <your-jwt-token>

# OR use query parameter
?token=<your-jwt-token>
```

---

## Rate Limits

- **Authenticated:** 1000 requests/hour
- **Unauthenticated:** 100 requests/hour

---

## Testing the Features

### 1. Test Pixel Generation
```bash
curl -X POST https://seodashboard.theprofitplatform.com.au/api/v2/pixel/generate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client",
    "domain": "example.com",
    "deploymentType": "header",
    "features": ["meta-tracking", "performance"]
  }'
```

### 2. Test Schema Analysis
```bash
curl -X POST https://seodashboard.theprofitplatform.com.au/api/v2/schema/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/product",
    "pageContent": "<html>...</html>"
  }'
```

### 3. Test SSR Optimization
```bash
curl -X POST https://seodashboard.theprofitplatform.com.au/api/v2/ssr/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client",
    "url": "https://example.com/page",
    "optimizations": ["critical-css", "lazy-images"]
  }'
```

---

## Monitoring & Logs

### PM2 Process Management
```bash
# View all services
pm2 status

# View logs
pm2 logs seo-dashboard --lines 50

# Restart services
pm2 restart seo-dashboard
```

### Service Health Checks
```bash
# Dashboard health
curl https://seodashboard.theprofitplatform.com.au/api/v2/health

# Keyword service health
curl http://localhost:5000/health
```

---

## Troubleshooting

### Issue: Pixel not tracking
**Solution:** Check that the pixel code is properly embedded in the website's HTML and that the API key is valid.

### Issue: Schema validation fails
**Solution:** Use the `/api/v2/schema/validate` endpoint to check for errors before applying schema.

### Issue: SSR optimization doesn't improve performance
**Solution:** Check the `/api/v2/ssr/stats/:clientId` endpoint to verify baseline metrics and ensure optimizations are applied correctly.

---

## Support

For issues or questions about Otto SEO features:
1. Check the API documentation at `/api/v2`
2. Review PM2 logs: `pm2 logs seo-dashboard`
3. Contact support with the error details

---

## What's Next?

Future enhancements planned:
- Automated A/B testing for optimizations
- AI-powered content suggestions
- Real-time SEO issue alerts
- Integration with Google Search Console
- Advanced schema template library

---

**Deployment Status:** ✅ All Otto SEO features are live and operational on production.
