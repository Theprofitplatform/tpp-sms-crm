# Local SEO API Reference

**Version:** 3.0  
**Base URL:** `http://localhost:9000/api/local-seo`

---

## Overview

The Local SEO API provides comprehensive endpoints for managing and analyzing local search engine optimization across multiple clients. This includes NAP consistency checking, citation monitoring, competitor analysis, review tracking, and more.

---

## Endpoints

### 1. Get All Client Scores

**GET** `/api/local-seo/scores`

Returns cached scores for all clients.

**Response:**
```json
{
  "success": true,
  "scores": [
    {
      "id": "instantautotraders",
      "name": "Instant Auto Traders",
      "domain": "https://instantautotraders.com",
      "score": 100,
      "nap": { "consistent": true, "score": 100 },
      "schema": { "implemented": true },
      "lastRun": "2025-10-29T03:15:00.000Z"
    }
  ]
}
```

---

### 2. Run Audit for Client

**POST** `/api/local-seo/audit/:clientId`

Runs a complete Local SEO audit for a specific client.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "message": "Audit started for instantautotraders",
  "estimatedTime": "10-15 seconds"
}
```

**Note:** Audit runs asynchronously in the background. Results are cached and can be retrieved via other endpoints.

---

### 3. Run Advanced Audit

**POST** `/api/local-seo/audit-advanced/:clientId`

Runs an advanced audit including citations, competitors, reviews, keywords, social media, and GMB analysis.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "message": "Advanced audit started for instantautotraders",
  "estimatedTime": "20-30 seconds"
}
```

**Advanced Audit Includes:**
- NAP Consistency
- Schema Markup
- Citation Analysis (10+ sources)
- Competitor Benchmarking
- Review Monitoring (7 platforms)
- Local Keyword Tracking
- Social Media Audit (7 platforms)
- GMB Optimization

---

### 4. Run Auto-Fix

**POST** `/api/local-seo/fix/:clientId`

Automatically fixes detected Local SEO issues.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "message": "Auto-fix started for instantautotraders",
  "fixes": 3,
  "details": [
    "Adding schema markup",
    "Fixing NAP inconsistencies",
    "Optimizing meta descriptions"
  ]
}
```

---

### 5. Get Detailed Report

**GET** `/api/local-seo/report/:clientId`

Returns a comprehensive audit report for a client.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "report": {
    "client": "instantautotraders",
    "businessName": "Instant Auto Traders",
    "score": 100,
    "generatedAt": "2025-10-29T03:15:00.000Z",
    "sections": {
      "napConsistency": {
        "score": 100,
        "status": "excellent",
        "findings": [...]
      },
      "schemaMarkup": {
        "implemented": true,
        "types": ["LocalBusiness", "Organization"]
      },
      "citations": {...},
      "competitors": {...},
      "reviews": {...}
    },
    "recommendations": [...]
  }
}
```

---

### 6. Bulk Audit

**POST** `/api/local-seo/bulk-audit`

Run audits for multiple clients simultaneously.

**Request Body:**
```json
{
  "clientIds": ["instantautotraders", "hottyres", "client3"],
  "advanced": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk audit started",
  "clientsQueued": 3,
  "estimatedTime": "36 seconds"
}
```

**Parameters:**
- `clientIds` (array, required) - Array of client IDs
- `advanced` (boolean, optional) - Run advanced audit (default: false)

**Processing:** Audits run sequentially in the background to avoid overloading the system.

---

### 7. Get Historical Trends

**GET** `/api/local-seo/history/:clientId?days=30`

Returns historical performance trends for a client.

**Parameters:**
- `clientId` (path) - Client identifier
- `days` (query, optional) - Number of days to retrieve (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-09-29",
      "end": "2025-10-29",
      "days": 30
    },
    "currentMetrics": {
      "score": 95,
      "napScore": 100,
      "citationScore": 85,
      "reviewScore": 92
    },
    "trends": {
      "score": { "direction": "up", "change": 5 },
      "napScore": { "direction": "stable", "change": 0 },
      "citationScore": { "direction": "up", "change": 10 }
    },
    "history": [
      {
        "date": "2025-10-29",
        "score": 95,
        "napScore": 100
      }
    ],
    "insights": [
      "Score improved by 5 points over the period",
      "NAP consistency remains excellent"
    ]
  }
}
```

---

### 8. Get Keyword Positions

**GET** `/api/local-seo/keywords/:clientId`

Returns local keyword tracking results.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "keywords": [
      {
        "keyword": "auto traders sydney",
        "type": "primary",
        "position": 3,
        "previousPosition": 5,
        "trend": "up",
        "searchVolume": "high"
      }
    ],
    "summary": {
      "totalKeywords": 52,
      "averagePosition": 8.3,
      "topThree": 12,
      "quickWins": 8
    },
    "opportunities": [
      {
        "keyword": "used cars sydney",
        "currentPosition": 11,
        "potential": "high",
        "effort": "medium"
      }
    ]
  }
}
```

---

### 9. Get Social Media Audit

**GET** `/api/local-seo/social/:clientId`

Returns social media profile audit results.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "platform": "Facebook",
        "url": "https://facebook.com/instantautotraders",
        "status": "active",
        "napConsistent": true,
        "completeness": 85,
        "followers": 5420,
        "engagement": "high"
      }
    ],
    "summary": {
      "totalProfiles": 5,
      "activeProfiles": 4,
      "averageCompleteness": 78,
      "napInconsistencies": 0,
      "overallScore": 82
    },
    "recommendations": [
      "Complete YouTube profile (45% complete)",
      "Add Instagram profile"
    ]
  }
}
```

---

### 10. Get GMB Analysis

**GET** `/api/local-seo/gmb/:clientId`

Returns Google My Business optimization analysis.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "overallScore": 72,
    "sections": [
      {
        "name": "Basic Information",
        "score": 90,
        "completed": true,
        "issues": []
      },
      {
        "name": "Photos & Videos",
        "score": 60,
        "completed": false,
        "issues": ["Add more interior photos", "Upload video tour"]
      }
    ],
    "roadmap": {
      "phase1": {
        "name": "Quick Wins",
        "duration": "1-2 weeks",
        "tasks": [...]
      },
      "phase2": {
        "name": "Content Enhancement",
        "duration": "3-4 weeks",
        "tasks": [...]
      },
      "phase3": {
        "name": "Ongoing Optimization",
        "duration": "Ongoing",
        "tasks": [...]
      }
    },
    "priorities": [
      {
        "action": "Add missing business hours",
        "impact": "high",
        "effort": "low"
      }
    ]
  }
}
```

---

### 11. Get Client Details (Legacy)

**GET** `/api/local-seo/:clientId`

Returns basic Local SEO details for a client.

**Parameters:**
- `clientId` (path) - Client identifier

**Response:**
```json
{
  "success": true,
  "details": {
    "napConsistency": 100,
    "schemaMarkup": 100,
    "localListings": 8,
    "overallScore": 95,
    "citations": 85,
    "competitivePosition": 2,
    "reputationScore": 92
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common Error Codes:**
- `400` - Bad Request (missing or invalid parameters)
- `404` - Client not found
- `500` - Internal server error

---

## Rate Limiting

**Recommendations:**
- Basic audits: Max 1 per client per hour
- Advanced audits: Max 1 per client per 4 hours
- Bulk audits: Max 5 clients at a time
- Report requests: No limit (cached data)

---

## Caching

Results are cached for 24 hours to improve performance:
- Audit results
- Score calculations
- Report data

**Cache Invalidation:**
- Automatic after 24 hours
- Manual via new audit

---

## Best Practices

### 1. Running Audits
```bash
# Basic audit for quick checks
curl -X POST http://localhost:9000/api/local-seo/audit/clientId

# Advanced audit for comprehensive analysis
curl -X POST http://localhost:9000/api/local-seo/audit-advanced/clientId

# Wait 15-30 seconds before fetching results
sleep 15
curl http://localhost:9000/api/local-seo/report/clientId
```

### 2. Bulk Operations
```bash
# Audit multiple clients
curl -X POST http://localhost:9000/api/local-seo/bulk-audit \
  -H "Content-Type: application/json" \
  -d '{"clientIds": ["client1", "client2", "client3"], "advanced": false}'

# Monitor progress via individual reports
curl http://localhost:9000/api/local-seo/scores
```

### 3. Monitoring Trends
```bash
# Check 30-day trends
curl "http://localhost:9000/api/local-seo/history/clientId?days=30"

# Compare with 7-day trends
curl "http://localhost:9000/api/local-seo/history/clientId?days=7"
```

---

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');
const BASE_URL = 'http://localhost:9000/api/local-seo';

// Run audit
async function runAudit(clientId, advanced = false) {
  const endpoint = advanced ? 
    `${BASE_URL}/audit-advanced/${clientId}` : 
    `${BASE_URL}/audit/${clientId}`;
  
  const response = await axios.post(endpoint);
  console.log(response.data.message);
  
  // Wait for completion
  await new Promise(resolve => setTimeout(resolve, advanced ? 25000 : 15000));
  
  // Get report
  const report = await axios.get(`${BASE_URL}/report/${clientId}`);
  return report.data.report;
}

// Get scores
async function getAllScores() {
  const response = await axios.get(`${BASE_URL}/scores`);
  return response.data.scores;
}

// Usage
runAudit('instantautotraders', true)
  .then(report => console.log('Score:', report.score));
```

### Python
```python
import requests
import time

BASE_URL = 'http://localhost:9000/api/local-seo'

def run_audit(client_id, advanced=False):
    endpoint = f"{BASE_URL}/audit-advanced/{client_id}" if advanced else f"{BASE_URL}/audit/{client_id}"
    
    # Start audit
    response = requests.post(endpoint)
    print(response.json()['message'])
    
    # Wait for completion
    time.sleep(25 if advanced else 15)
    
    # Get report
    report = requests.get(f"{BASE_URL}/report/{client_id}")
    return report.json()['report']

# Usage
report = run_audit('instantautotraders', advanced=True)
print(f"Score: {report['score']}/100")
```

### cURL
```bash
#!/bin/bash

CLIENT_ID="instantautotraders"
BASE_URL="http://localhost:9000/api/local-seo"

# Run advanced audit
echo "Starting advanced audit..."
curl -X POST "$BASE_URL/audit-advanced/$CLIENT_ID"

# Wait for completion
echo "Waiting 25 seconds..."
sleep 25

# Get report
echo "Fetching report..."
curl "$BASE_URL/report/$CLIENT_ID" | jq '.'

# Get scores
echo "All client scores:"
curl "$BASE_URL/scores" | jq '.scores[] | {id, score}'
```

---

## Webhook Support (Future)

Coming in v3.1:
- POST webhook URL when audit completes
- Configurable webhook events
- Retry logic for failed webhooks

---

## Support

For issues or questions:
- Check logs: `logs/local-seo/{clientId}/`
- Server logs: `dashboard-server.log`
- Documentation: `LOCAL_SEO_V3_FEATURES.md`

---

**Last Updated:** October 29, 2025  
**API Version:** 3.0  
**Status:** Production Ready ✅
