# SEO Automation Dashboard - API Documentation

Complete API reference for the SEO Automation Dashboard system.

**Base URL:** `http://localhost:3000`

**Version:** 2.0.0

**Last Updated:** October 2025

---

## Table of Contents

1. [Core Dashboard Endpoints](#core-dashboard-endpoints)
2. [Local SEO Endpoints](#local-seo-endpoints)
3. [Competitor Tracking Endpoints](#competitor-tracking-endpoints)
4. [Bridge API Endpoints](#bridge-api-endpoints)
5. [Database Operations Reference](#database-operations-reference)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

---

## Core Dashboard Endpoints

### GET /api/dashboard

Get dashboard overview for all clients.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 3,
    "active": 2,
    "pending": 1,
    "configured": 2
  },
  "clients": [...]
}
```

### GET /api/dashboard/:clientId/complete

Get complete dashboard data for a specific client (unified view).

**Parameters:**
- `clientId` (path) - Client identifier
- `days` (query, optional) - Timeframe in days (default: 30)

**Response:**
```json
{
  "success": true,
  "clientId": "instantautotraders",
  "data": {
    "client": {...},
    "automation": {
      "localSeo": {...},
      "competitors": {...},
      "keywords": {...},
      "gsc": {...}
    },
    "optimizations": {
      "history": [...],
      "stats": {...},
      "roi": {...}
    },
    "autoFixes": {...},
    "reports": [...]
  }
}
```

---

## Local SEO Endpoints

### POST /api/local-seo/:clientId/run

Run complete Local SEO audit for a client.

**Parameters:**
- `clientId` (path) - Client identifier

**Process:**
1. Runs NAP consistency check
2. Validates schema markup
3. Checks directory submissions
4. Stores results in database
5. Generates HTML report

**Response:**
```json
{
  "success": true,
  "results": {
    "tasks": {
      "napConsistency": {
        "score": 85,
        "issues": []
      },
      "schema": {
        "hasSchema": true,
        "valid": true
      },
      "directoryTracking": {
        "directories": []
      }
    }
  },
  "reportPath": "/logs/local-seo/..."
}
```

### GET /api/local-seo/:clientId/latest

Get latest Local SEO score for a client.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "napScore": 85,
    "hasSchema": true,
    "issuesFound": 2,
    "timestamp": "2025-10-24T12:00:00Z",
    "metadata": {...}
  }
}
```

### GET /api/local-seo/:clientId/trend

Get NAP score trend over time.

**Parameters:**
- `clientId` (path) - Client identifier
- `days` (query, optional) - Number of days (default: 90)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-10-01",
      "napScore": 80,
      "hasSchema": false
    },
    {
      "timestamp": "2025-10-15",
      "napScore": 85,
      "hasSchema": true
    }
  ]
}
```

### GET /api/local-seo/:clientId/history

Get complete Local SEO history.

**Parameters:**
- `clientId` (path) - Client identifier
- `limit` (query, optional) - Max records (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

---

## Competitor Tracking Endpoints

### POST /api/competitors/:clientId/run

Run competitor analysis for a client.

**Parameters:**
- `clientId` (path) - Client identifier

**Process:**
1. Fetches GSC data for keywords
2. Discovers competitors automatically
3. Compares rankings
4. Generates alerts for position changes
5. Stores all data in database

**Response:**
```json
{
  "success": true,
  "results": {
    "competitors": [...],
    "rankings": {...},
    "alerts": [...],
    "gaps": [...]
  },
  "reportPath": "/logs/competitors/..."
}
```

### GET /api/competitors/:clientId/list

Get list of tracked competitors with stats.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "domain": "competitor1.com",
      "name": "Competitor 1",
      "keywordsTracked": 25,
      "avgPosition": 8.5,
      "lastChecked": "2025-10-24",
      "outrankingCount": 12
    }
  ]
}
```

### GET /api/competitors/:clientId/rankings

Get detailed ranking comparisons.

**Parameters:**
- `clientId` (path) - Client identifier
- `competitorDomain` (query, optional) - Filter by competitor
- `limit` (query, optional) - Max records (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "keyword": "cash for cars sydney",
      "yourPosition": 5,
      "competitorDomain": "competitor1.com",
      "theirPosition": 3,
      "searchVolume": 1000,
      "timestamp": "2025-10-24"
    }
  ]
}
```

### GET /api/competitors/:clientId/alerts

Get active competitive alerts.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "type": "position_loss",
      "severity": "HIGH",
      "competitorDomain": "competitor1.com",
      "keyword": "cash for cars",
      "message": "Competitor moved from position 5 to 3",
      "actionRequired": "Review and optimize content"
    }
  ]
}
```

### PUT /api/competitors/:clientId/alerts/:alertId/resolve

Mark an alert as resolved.

**Parameters:**
- `clientId` (path) - Client identifier
- `alertId` (path) - Alert ID

**Response:**
```json
{
  "success": true,
  "message": "Alert resolved"
}
```

---

## Bridge API Endpoints

The Bridge API connects SEO Expert automation with SEO Analyst reporting.

### POST /api/bridge/send-results

Send optimization results from automation to the bridge.

**Request Body:**
```json
{
  "clientId": "instantautotraders",
  "optimizationType": "meta_optimization",
  "results": {
    "pagesModified": 5,
    "issuesFixed": 3,
    "expectedImpact": "Improved CTR",
    "before": {...},
    "after": {...},
    "keywords": [
      {
        "keyword": "cash for cars",
        "beforePosition": 10,
        "afterPosition": 8,
        "url": "/cash-for-cars"
      }
    ]
  },
  "metadata": {
    "tool": "seo-expert",
    "version": "2.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "optimizationId": 123,
  "message": "Results stored successfully",
  "timestamp": "2025-10-24T12:00:00Z"
}
```

### GET /api/bridge/recent

Get recent optimizations across all clients.

**Parameters:**
- `limit` (query, optional) - Max records (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "client_id": "instantautotraders",
      "client_name": "Instant Auto Traders",
      "type": "meta_optimization",
      "pagesModified": 5,
      "issuesFixed": 3,
      "created_at": "2025-10-24T12:00:00Z"
    }
  ],
  "count": 20
}
```

### GET /api/bridge/:clientId/history

Get optimization history for a specific client.

**Parameters:**
- `clientId` (path) - Client identifier
- `days` (query, optional) - Timeframe in days (default: 30)

**Response:**
```json
{
  "success": true,
  "clientId": "instantautotraders",
  "data": [...],
  "count": 15
}
```

### GET /api/bridge/:clientId/roi

Calculate ROI metrics for a client.

**Parameters:**
- `clientId` (path) - Client identifier
- `days` (query, optional) - Timeframe in days (default: 90)

**Response:**
```json
{
  "success": true,
  "clientId": "instantautotraders",
  "roi": {
    "timeframe": "90 days",
    "totalOptimizations": 25,
    "pagesModified": 120,
    "issuesFixed": 45,
    "keywordImprovements": {
      "total": 50,
      "improved": 35,
      "declined": 5,
      "stable": 10
    },
    "averagePositionChange": -2.5
  }
}
```

**Note:** Negative position change is good (moved up in rankings).

### GET /api/bridge/:clientId/unified

Get unified dashboard combining all systems.

**Parameters:**
- `clientId` (path) - Client identifier
- `days` (query, optional) - Timeframe in days (default: 30)

**Response:**
```json
{
  "success": true,
  "clientId": "instantautotraders",
  "data": {
    "client": {...},
    "automation": {...},
    "optimizations": {...},
    "autoFixes": {...},
    "reports": [...]
  }
}
```

---

## Database Operations Reference

All database operations are available through the database module:

```javascript
import db from './src/database/index.js';
```

### Client Operations

- `clientOps.upsert(client)` - Create or update client
- `clientOps.getById(clientId)` - Get client by ID
- `clientOps.getAll()` - Get all clients
- `clientOps.getActive()` - Get active clients only
- `clientOps.recordOptimization(clientId, optimization)` - Record optimization
- `clientOps.getOptimizationHistory(clientId, days)` - Get optimization history
- `clientOps.getRecentOptimizations(limit)` - Get recent optimizations (all clients)

### Local SEO Operations

- `localSeoOps.recordScore(clientId, score)` - Record NAP score
- `localSeoOps.getLatest(clientId)` - Get latest score
- `localSeoOps.getHistory(clientId, limit)` - Get score history
- `localSeoOps.getTrend(clientId, days)` - Get trend data

### Competitor Operations

- `competitorOps.recordRanking(clientId, ranking)` - Record ranking
- `competitorOps.getRankings(clientId, domain, limit)` - Get rankings
- `competitorOps.getCompetitorsList(clientId)` - Get competitors with stats
- `competitorOps.createAlert(clientId, alert)` - Create alert
- `competitorOps.getOpenAlerts(clientId)` - Get open alerts
- `competitorOps.resolveAlert(alertId)` - Mark alert as resolved

### Keyword Operations

- `keywordOps.record(clientId, keyword, data)` - Record keyword data
- `keywordOps.recordPerformance(clientId, data)` - Record with optimization context
- `keywordOps.getTrend(clientId, keyword, days)` - Get keyword trend
- `keywordOps.getTopKeywords(clientId, limit)` - Get top keywords by clicks
- `keywordOps.getImprovements(clientId, days)` - Calculate position improvements

### GSC Operations

- `gscOps.recordDaily(clientId, metrics)` - Record daily GSC metrics
- `gscOps.getTrend(clientId, days)` - Get metrics trend
- `gscOps.getLatest(clientId)` - Get latest metrics

### System Logs

- `systemOps.log(level, category, message, metadata)` - Add log entry
- `logsOps.add(level, category, message, metadata)` - Alias for log()
- `logsOps.getRecent(limit, level)` - Get recent logs

### Reports Operations

- `reportsOps.record(clientId, report)` - Record generated report
- `reportsOps.getHistory(clientId, limit)` - Get report history

### Analytics

- `analytics.getClientDashboard(clientId, days)` - Get complete client dashboard

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**

- `200 OK` - Request successful
- `400 Bad Request` - Missing required parameters
- `404 Not Found` - Client or resource not found
- `500 Internal Server Error` - Server-side error

---

## Examples

### Example 1: Run Local SEO Audit and Get Results

```javascript
// Run audit
const runResponse = await fetch('http://localhost:3000/api/local-seo/instantautotraders/run', {
  method: 'POST'
});
const runData = await runResponse.json();

// Get latest score
const scoreResponse = await fetch('http://localhost:3000/api/local-seo/instantautotraders/latest');
const scoreData = await scoreResponse.json();

console.log(`NAP Score: ${scoreData.data.napScore}/100`);
```

### Example 2: Submit Optimization Results to Bridge

```javascript
import bridgeClient from './src/automation/bridge-client.js';

// After running an optimization
const results = {
  pagesModified: 5,
  issuesFixed: 3,
  expectedImpact: 'Improved meta descriptions',
  before: { avgLength: 120 },
  after: { avgLength: 155 },
  keywords: [
    {
      keyword: 'cash for cars sydney',
      beforePosition: 10,
      afterPosition: 8,
      url: '/cash-for-cars-sydney'
    }
  ]
};

await bridgeClient.sendMetaOptimization('instantautotraders', results);
```

### Example 3: Get ROI for a Client

```javascript
const response = await fetch('http://localhost:3000/api/bridge/instantautotraders/roi?days=90');
const data = await response.json();

console.log(`Total Optimizations: ${data.roi.totalOptimizations}`);
console.log(`Keywords Improved: ${data.roi.keywordImprovements.improved}`);
console.log(`Average Position Change: ${data.roi.averagePositionChange}`);
```

### Example 4: Using Database Directly

```javascript
import db from './src/database/index.js';

// Record a new client
db.clientOps.upsert({
  id: 'newclient',
  name: 'New Client',
  domain: 'newclient.com',
  businessType: 'LocalBusiness',
  city: 'Sydney',
  state: 'NSW',
  country: 'AU',
  status: 'active'
});

// Get optimization history
const history = db.clientOps.getOptimizationHistory('newclient', 30);
console.log(`${history.length} optimizations in last 30 days`);

// Get complete dashboard
const dashboard = db.analytics.getClientDashboard('newclient', 30);
console.log('Dashboard:', dashboard);
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production deployment, consider implementing rate limiting using middleware like `express-rate-limit`.

---

## Authentication

Currently no authentication is required. For production deployment, implement authentication middleware to protect API endpoints.

**Recommended approach:**
- API keys for automation scripts
- JWT tokens for dashboard UI
- Role-based access control (RBAC)

---

## Changelog

### Version 2.0.0 (October 2025)
- Added Local SEO endpoints
- Added Competitor Tracking endpoints
- Added Bridge API for SEO Expert ↔ SEO Analyst integration
- Added unified dashboard endpoint
- Added ROI calculation endpoint
- Implemented SQLite database with historical tracking
- Added 10 database tables
- 100% test coverage

---

## Support

For issues or questions:
- GitHub Issues: [https://github.com/yourrepo/seoexpert/issues](https://github.com/yourrepo/seoexpert/issues)
- Email: support@example.com

---

**Last Updated:** October 24, 2025
**API Version:** 2.0.0
