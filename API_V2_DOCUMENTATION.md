# API v2 Documentation

## Overview

The SEO Automation Platform API v2 provides unified keyword management by combining:
- **SerpBear**: Position tracking and SERP monitoring
- **Keyword Research Service**: Comprehensive keyword research and analysis

This API enables seamless integration between keyword research and position tracking workflows.

## Base URL

```
http://localhost:9000/api/v2
```

## Authentication

### JWT Bearer Token

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Alternative methods:
- Query parameter: `?token=<your-jwt-token>`
- Cookie: `token=<your-jwt-token>`

### Getting a Token

Tokens are generated through the authentication system. Contact your administrator for access credentials.

## Rate Limits

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour

## Response Format

All endpoints return JSON in this format:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

---

## Endpoints

### Health Check

Check API health and get version information.

**Endpoint:** `GET /api/v2/health`

**Response:**
```json
{
  "success": true,
  "version": "2.0.0",
  "timestamp": "2025-10-26T12:00:00Z",
  "uptime": 12345.67,
  "services": {
    "api": "healthy"
  }
}
```

---

## Keywords API

### List Keywords

Get a paginated list of keywords with filtering and sorting.

**Endpoint:** `GET /api/v2/keywords`

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 50, max: 100): Items per page
- `client_id` (string): Filter by client
- `source` (enum: research|tracking|both, default: both): Keyword source
- `intent` (enum: informational|commercial|transactional): Filter by intent
- `min_volume` (integer): Minimum search volume
- `max_difficulty` (integer): Maximum difficulty score (0-100)
- `sort` (enum: volume|difficulty|position|created_at): Sort field
- `order` (enum: asc|desc, default: desc): Sort order

**Example Request:**
```bash
curl "http://localhost:9000/api/v2/keywords?page=1&per_page=50&source=both&min_volume=1000"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "keyword": "seo tools",
      "source": "research",
      "volume": 12000,
      "difficulty": 65,
      "intent": "informational",
      "tracked": true,
      "position": 15,
      "client_id": "client123"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

---

### Add Keyword

Add a new keyword to the system.

**Endpoint:** `POST /api/v2/keywords`

**Request Body:**
```json
{
  "keyword": "seo tools",
  "client_id": "client123",
  "source": "manual",
  "track": false
}
```

**Parameters:**
- `keyword` (string, required): Keyword text
- `client_id` (string, required): Client identifier
- `source` (string, default: manual): Source of keyword
- `track` (boolean, default: false): Whether to add to position tracking

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "keyword": "seo tools",
    "client_id": "client123",
    "tracked": false,
    "created_at": "2025-10-26T12:00:00Z"
  }
}
```

---

### Get Keyword Details

Get detailed information about a specific keyword.

**Endpoint:** `GET /api/v2/keywords/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "keyword": "seo tools",
    "client_id": "client123",
    "client_name": "Example Corp",
    "client_domain": "example.com",
    "history": [
      {
        "date": "2025-10-26",
        "position": 15,
        "impressions": 1200,
        "clicks": 45,
        "ctr": 3.75
      }
    ],
    "research": {
      "volume": 12000,
      "difficulty": 65,
      "intent": "informational",
      "serp_features": ["featured_snippet", "people_also_ask"]
    },
    "tracked": true
  }
}
```

---

### Update Keyword

Update keyword information.

**Endpoint:** `PUT /api/v2/keywords/:id`

**Request Body:**
```json
{
  "position": 15,
  "volume": 12000,
  "difficulty": 65
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "keyword": "seo tools",
    "position": 15,
    "updated_at": "2025-10-26T12:00:00Z"
  }
}
```

---

### Delete Keyword

Delete a keyword from the system.

**Endpoint:** `DELETE /api/v2/keywords/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Keyword deleted successfully"
  }
}
```

---

### Add to Tracking

Add a keyword to position tracking.

**Endpoint:** `POST /api/v2/keywords/:id/track`

**Request Body:**
```json
{
  "domain": "example.com",
  "location": "United States",
  "device": "desktop"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Keyword added to tracking",
    "keyword": "seo tools",
    "domain": "example.com",
    "tracking_id": "track_123"
  }
}
```

---

### Enrich Keyword

Fetch additional research data for a keyword.

**Endpoint:** `POST /api/v2/keywords/:id/enrich`

**Response:**
```json
{
  "success": true,
  "data": {
    "keyword": "seo tools",
    "volume": 12000,
    "difficulty": 65,
    "intent": "informational",
    "serp_features": ["featured_snippet", "people_also_ask"],
    "related_keywords": ["keyword research", "seo software"],
    "enriched_at": "2025-10-26T12:00:00Z"
  }
}
```

---

### Get Keyword Statistics

Get aggregate keyword statistics.

**Endpoint:** `GET /api/v2/keywords/stats`

**Query Parameters:**
- `client_id` (string, optional): Filter by client

**Response:**
```json
{
  "success": true,
  "data": {
    "total_keywords": 150,
    "tracked_keywords": 100,
    "research_keywords": 50,
    "avg_position": 25.5,
    "avg_volume": 5000,
    "by_intent": {
      "informational": 80,
      "commercial": 50,
      "transactional": 20
    }
  }
}
```

---

## Research API

### Create Research Project

Create a new keyword research project.

**Endpoint:** `POST /api/v2/research/projects`

**Request Body:**
```json
{
  "name": "Q4 Content Strategy",
  "client_id": "client123",
  "seeds": "seo tools, keyword research, content planning",
  "geo": "US",
  "language": "en",
  "focus": "informational"
}
```

**Parameters:**
- `name` (string, required): Project name
- `client_id` (string, required): Client identifier
- `seeds` (string, required): Comma-separated seed keywords (1-10)
- `geo` (string, default: US): Geographic target
- `language` (string, default: en): Language code
- `focus` (enum: informational|commercial|transactional, default: informational): Content focus

**Response:**
```json
{
  "success": true,
  "data": {
    "project_id": 5,
    "name": "Q4 Content Strategy",
    "client_id": "client123",
    "status": "processing",
    "seeds": ["seo tools", "keyword research", "content planning"],
    "geo": "US",
    "language": "en",
    "focus": "informational",
    "created_at": "2025-10-26T12:00:00Z",
    "estimated_completion": "2025-10-26T12:05:00Z"
  }
}
```

---

### List Research Projects

Get all research projects.

**Endpoint:** `GET /api/v2/research/projects`

**Query Parameters:**
- `client_id` (string): Filter by client
- `status` (enum: pending|processing|completed|failed): Filter by status
- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 20): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "Q4 Content Strategy",
      "client_id": "client123",
      "client_name": "Example Corp",
      "status": "completed",
      "keyword_count": 450,
      "created_at": "2025-10-26T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 5
  }
}
```

---

### Get Project Details

Get detailed information about a research project.

**Endpoint:** `GET /api/v2/research/projects/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Q4 Content Strategy",
    "client_id": "client123",
    "client_name": "Example Corp",
    "client_domain": "example.com",
    "status": "completed",
    "keyword_count": 450,
    "topic_count": 12,
    "seeds": ["seo tools", "keyword research"],
    "geo": "US",
    "language": "en",
    "focus": "informational",
    "topics": [
      {
        "name": "SEO Tools",
        "keyword_count": 85,
        "avg_volume": 8500
      }
    ],
    "created_at": "2025-10-26T12:00:00Z",
    "completed_at": "2025-10-26T12:05:00Z"
  }
}
```

---

### Get Project Keywords

Get keywords for a research project.

**Endpoint:** `GET /api/v2/research/projects/:id/keywords`

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 50, max: 100): Items per page
- `intent` (enum): Filter by intent type
- `min_volume` (integer): Minimum search volume
- `max_difficulty` (integer): Maximum difficulty score
- `sort` (enum: volume|difficulty|opportunity, default: opportunity): Sort field

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "keyword": "best seo tools",
      "volume": 12000,
      "difficulty": 65,
      "intent": "informational",
      "opportunity_score": 85,
      "serp_features": ["featured_snippet", "people_also_ask"]
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 450
  }
}
```

---

### Track Top Opportunities

Add top opportunity keywords from a research project to tracking.

**Endpoint:** `POST /api/v2/research/projects/:id/track-opportunities`

**Request Body:**
```json
{
  "limit": 20,
  "min_opportunity": 70,
  "intent_filter": ["informational", "commercial"],
  "domain": "example.com"
}
```

**Parameters:**
- `limit` (integer, default: 20, max: 100): Number of keywords to track
- `min_opportunity` (integer, default: 70): Minimum opportunity score (0-100)
- `intent_filter` (array): Intent types to include
- `domain` (string, optional): Domain for tracking (uses client domain if not provided)

**Response:**
```json
{
  "success": true,
  "data": {
    "tracked_count": 15,
    "skipped_count": 5,
    "total_processed": 20,
    "keywords": [
      {
        "keyword": "seo tools",
        "tracked": true,
        "opportunity_score": 85,
        "volume": 12000
      },
      {
        "keyword": "keyword research",
        "tracked": false,
        "reason": "Already tracked"
      }
    ]
  }
}
```

---

### Delete Project

Delete a research project.

**Endpoint:** `DELETE /api/v2/research/projects/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Project deleted successfully"
  }
}
```

---

### Export Project

Export project keywords to CSV.

**Endpoint:** `POST /api/v2/research/projects/:id/export`

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "min_volume": 1000,
    "max_difficulty": 50
  }
}
```

**Response:**
Returns CSV file download with headers:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="keywords-project-5.csv"
```

---

## Sync API

### Get Sync Status

Get synchronization status across all services.

**Endpoint:** `GET /api/v2/sync/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "last_sync": "2025-10-26T12:00:00Z",
    "services": {
      "keyword_research": {
        "name": "Keyword Research Service",
        "url": "http://localhost:5000",
        "status": "healthy",
        "uptime": 12345
      },
      "serpbear": {
        "name": "SerpBear Tracking",
        "url": "http://localhost:3000",
        "status": "healthy"
      },
      "database": {
        "name": "Local Database",
        "status": "healthy",
        "keywords_tracked": 150,
        "last_write": "2025-10-26T11:55:00Z"
      }
    },
    "sync_stats": {
      "keywords_tracked": 150,
      "keywords_researched": 500,
      "services_healthy": 3,
      "total_services": 3
    },
    "issues": [],
    "overall_status": "healthy"
  }
}
```

---

### Trigger Sync

Manually trigger synchronization.

**Endpoint:** `POST /api/v2/sync/trigger`

**Request Body:**
```json
{
  "type": "keywords",
  "client_id": "client123",
  "force": false
}
```

**Parameters:**
- `type` (enum: keywords|positions|full, default: keywords): Sync type
- `client_id` (string, optional): Filter by client
- `force` (boolean, default: false): Force sync even if one is running

**Response:**
```json
{
  "success": true,
  "data": {
    "sync_id": "sync_1234567890_keywords",
    "type": "keywords",
    "started_at": "2025-10-26T12:00:00Z",
    "status": "completed",
    "progress": {
      "total": 100,
      "processed": 95,
      "failed": 5
    }
  }
}
```

---

### Get Sync History

Get synchronization history.

**Endpoint:** `GET /api/v2/sync/history`

**Query Parameters:**
- `limit` (integer, default: 50, max: 200): Number of records
- `type` (enum): Filter by sync type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sync_id": "sync_1234567890_keywords",
      "type": "keywords",
      "status": "completed",
      "progress": {
        "total": 100,
        "processed": 95,
        "failed": 5
      },
      "created_at": "2025-10-26T12:00:00Z"
    }
  ],
  "meta": {
    "count": 10,
    "limit": 50
  }
}
```

---

### Bulk Sync Keywords

Bulk sync keywords from research to tracking.

**Endpoint:** `POST /api/v2/sync/keywords/bulk`

**Request Body:**
```json
{
  "keyword_ids": [1, 2, 3, 4, 5],
  "client_id": "client123",
  "domain": "example.com"
}
```

**Parameters:**
- `keyword_ids` (array, required): Array of keyword IDs (max 100)
- `client_id` (string, required): Client identifier
- `domain` (string, optional): Domain for tracking

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "success_count": 4,
    "failed_count": 1,
    "results": [
      {
        "keyword_id": 1,
        "keyword": "seo tools",
        "success": true
      },
      {
        "keyword_id": 2,
        "keyword": "keyword research",
        "success": false,
        "error": "Already tracked"
      }
    ]
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists or conflict |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - External service down |

---

## Examples

### Complete Workflow Example

```bash
# 1. Create a research project
curl -X POST http://localhost:9000/api/v2/research/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blog Content Strategy",
    "client_id": "client123",
    "seeds": "content marketing, blogging tips, seo writing",
    "geo": "US",
    "focus": "informational"
  }'

# Response: { "data": { "project_id": 5, ... } }

# 2. Wait for processing (~5 minutes), then get project details
curl http://localhost:9000/api/v2/research/projects/5

# 3. Get top opportunity keywords
curl "http://localhost:9000/api/v2/research/projects/5/keywords?sort=opportunity&per_page=20"

# 4. Track top 10 opportunities
curl -X POST http://localhost:9000/api/v2/research/projects/5/track-opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "min_opportunity": 80,
    "domain": "myblog.com"
  }'

# 5. Check sync status
curl http://localhost:9000/api/v2/sync/status

# 6. List all tracked keywords
curl "http://localhost:9000/api/v2/keywords?client_id=client123&source=tracking"
```

---

## Support

For issues or questions:
- Check service status: `GET /api/v2/health`
- Check sync status: `GET /api/v2/sync/status`
- Review documentation: `GET /api/v2`

---

## Changelog

### Version 2.0.0 (2025-10-26)
- Initial release of unified API
- Combined SerpBear tracking and keyword research
- Implemented JWT authentication
- Added sync management
- Added bulk operations
