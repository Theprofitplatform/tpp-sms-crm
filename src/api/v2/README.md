# API v2 - Unified Keyword Management

**Version:** 2.0.0
**Status:** Production Ready
**Date:** October 26, 2025

## Overview

This directory contains the unified API v2 for integrated keyword management, combining SerpBear position tracking with the keyword research microservice.

## Directory Structure

```
v2/
├── index.js              # Main router and documentation endpoint
├── keywords.js           # Keyword CRUD and management endpoints
├── research.js           # Research project workflow endpoints
├── sync.js               # Synchronization management endpoints
├── middleware/
│   └── auth.js          # Authentication and authorization middleware
└── README.md            # This file
```

## Quick Start

### 1. Start Services

```bash
# Terminal 1: Dashboard server
node dashboard-server.js

# Terminal 2: Keyword service
cd keyword-service && python api_server.py
```

### 2. Test API

```bash
# Health check
curl http://localhost:9000/api/v2/health

# API documentation
curl http://localhost:9000/api/v2

# Sync status
curl http://localhost:9000/api/v2/sync/status
```

## File Descriptions

### index.js
Main API router that:
- Mounts all sub-routers (keywords, research, sync)
- Provides API documentation endpoint
- Handles CORS and authentication
- Implements error handling
- Serves health check endpoint

**Routes:**
- `GET /api/v2` - API documentation
- `GET /api/v2/health` - Health check
- `/api/v2/keywords/*` - Keywords endpoints
- `/api/v2/research/*` - Research endpoints
- `/api/v2/sync/*` - Sync endpoints

### keywords.js
Keyword management endpoints:
- List, create, update, delete keywords
- Track keywords for position monitoring
- Enrich keywords with research data
- Get keyword statistics
- Filter by intent, volume, difficulty
- Sort and paginate results

**Key Features:**
- Multi-source aggregation (research + tracking)
- Advanced filtering and sorting
- Performance history tracking
- Bulk operations support

### research.js
Research project workflow endpoints:
- Create and manage research projects
- Get project keywords and topics
- Track top opportunity keywords
- Export to CSV
- Filter and sort results
- Bulk operations

**Key Features:**
- Project-based organization
- Opportunity scoring
- One-click tracking
- Topic clustering
- Geographic/language targeting

### sync.js
Synchronization management endpoints:
- Check sync status across services
- Trigger manual synchronization
- View sync history
- Bulk keyword sync
- Service health monitoring

**Key Features:**
- Service health checks
- Automated sync triggers
- Error recovery
- Bulk operations
- History tracking

### middleware/auth.js
Authentication and authorization:
- JWT token authentication
- Optional authentication
- Role-based authorization
- Client access control
- API key authentication
- Rate limiting
- CORS configuration

**Security Features:**
- Token validation
- User status checks
- Rate limiting
- IP-based restrictions

## API Design

### Response Format

All endpoints return consistent JSON:

```json
{
  "success": true|false,
  "data": { ... },      // Present on success
  "error": "...",       // Present on error
  "message": "...",     // Optional error details
  "meta": { ... }       // Optional pagination/metadata
}
```

### Error Handling

Standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Rate Limit
- `500` - Server Error
- `503` - Service Unavailable

### Pagination

List endpoints support pagination:

```bash
?page=1&per_page=50
```

Response includes metadata:
```json
{
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

### Filtering

Multiple filter parameters:
- `client_id` - Filter by client
- `source` - Filter by source (research|tracking|both)
- `intent` - Filter by intent type
- `min_volume` - Minimum search volume
- `max_difficulty` - Maximum difficulty
- `sort` - Sort field
- `order` - Sort order (asc|desc)

### Authentication

JWT Bearer token in header:
```
Authorization: Bearer <token>
```

Or query parameter:
```
?token=<token>
```

## Configuration

Environment variables in `.env`:

```bash
# API
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:9000

# Services
KEYWORD_SERVICE_URL=http://localhost:5000
SERPBEAR_URL=http://localhost:3000
```

## Dependencies

Required packages:
- `express` - Web framework
- `jsonwebtoken` - JWT authentication
- `cookie-parser` - Cookie parsing
- `axios` - HTTP client for service integration
- `better-sqlite3` - Database (via parent module)

## Database Schema

Uses existing tables from `/src/database/index.js`:

**Primary Tables:**
- `clients` - Client information
- `keyword_performance` - Position tracking data
- `system_logs` - Sync and system events

**Operations:**
- `keywordOps` - Keyword CRUD operations
- `clientOps` - Client management
- `logsOps` - System logging

## Integration Points

### Keyword Research Service
**URL:** http://localhost:5000
**Used by:** keywords.js, research.js, sync.js

**Endpoints:**
- `/api/keyword/research` - Create projects
- `/api/keyword/projects` - List projects
- `/api/keyword/keywords` - Get keywords

### SerpBear
**URL:** http://localhost:3000
**Used by:** keywords.js, research.js

**Endpoints:**
- `/api/keywords` - Add/remove tracking

### Database
**Location:** `/src/database/index.js`
**Used by:** All API files

**Operations:**
- Client CRUD
- Keyword performance
- System logging

## Testing

### Manual Testing

```bash
# Create research project
curl -X POST http://localhost:9000/api/v2/research/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "client_id": "client123",
    "seeds": "seo, marketing"
  }'

# List keywords
curl "http://localhost:9000/api/v2/keywords?per_page=10"

# Check sync status
curl http://localhost:9000/api/v2/sync/status
```

### Unit Tests

To add unit tests (future enhancement):

```javascript
// tests/api/v2/keywords.test.js
import request from 'supertest';
import app from '../../../dashboard-server.js';

describe('GET /api/v2/keywords', () => {
  it('should return paginated keywords', async () => {
    const response = await request(app)
      .get('/api/v2/keywords?page=1&per_page=10')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.meta).toHaveProperty('page', 1);
  });
});
```

## Common Patterns

### Adding New Endpoints

1. Create endpoint function in appropriate file
2. Add route to router
3. Implement error handling
4. Add input validation
5. Update documentation

Example:
```javascript
router.get('/new-endpoint', async (req, res) => {
  try {
    // Validation
    if (!req.query.required_param) {
      return res.status(400).json(apiResponse(
        false, null, 'Missing required parameter'
      ));
    }

    // Business logic
    const data = await fetchData();

    // Response
    res.json(apiResponse(true, data));

  } catch (error) {
    handleError(res, error, 'Failed to fetch data');
  }
});
```

### Error Handling Pattern

```javascript
function handleError(res, error, defaultMessage) {
  console.error('API Error:', error);

  const statusCode = error.response?.status || 500;
  const message = error.response?.data?.message ||
                  error.message ||
                  defaultMessage;

  res.status(statusCode).json(apiResponse(false, null, message));
}
```

### Response Pattern

```javascript
function apiResponse(success, data = null, error = null, meta = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  if (meta !== null) response.meta = meta;
  return response;
}
```

## Performance Considerations

### Database Queries
- Use prepared statements for security and performance
- Index frequently queried columns
- Limit result sets with pagination
- Use transactions for bulk operations

### Service Integration
- Set timeouts for external calls (3-10 seconds)
- Implement retry logic with backoff
- Cache responses when appropriate
- Handle service unavailability gracefully

### Rate Limiting
- Current: In-memory (simple, resets on restart)
- Production: Use Redis for distributed limiting
- Configure per-endpoint limits
- Implement user-tier based limits

## Security Best Practices

1. **Always validate input**
   - Check required fields
   - Validate data types
   - Sanitize user input

2. **Use prepared statements**
   - Prevent SQL injection
   - Better performance

3. **Implement authentication**
   - Verify tokens on protected routes
   - Check user status
   - Validate permissions

4. **Rate limiting**
   - Prevent abuse
   - Protect against DDoS
   - Different limits per tier

5. **Error messages**
   - Don't leak sensitive information
   - Provide helpful but safe messages
   - Log detailed errors server-side

## Documentation

### Main Documentation
- [API_V2_DOCUMENTATION.md](../../../API_V2_DOCUMENTATION.md) - Complete reference
- [API_V2_QUICK_START.md](../../../API_V2_QUICK_START.md) - Quick start guide
- [API_V2_IMPLEMENTATION_COMPLETE.md](../../../API_V2_IMPLEMENTATION_COMPLETE.md) - Implementation details

### Inline Documentation
Each endpoint has JSDoc comments:
```javascript
/**
 * GET /api/v2/keywords
 *
 * List all keywords with filtering and pagination
 *
 * @param {number} page - Page number
 * @param {number} per_page - Items per page
 * @returns {Object} Paginated keyword list
 */
```

## Troubleshooting

### 503 Service Unavailable
**Cause:** Keyword service not running
**Fix:** Start Python service on port 5000

### 401 Unauthorized
**Cause:** Missing/invalid token
**Fix:** Provide valid JWT token

### 404 Not Found
**Cause:** Invalid endpoint or ID
**Fix:** Check endpoint URL and IDs

### Empty Results
**Cause:** No data or wrong filters
**Fix:** Check filters, verify data exists

## Future Enhancements

### Planned Features
- [ ] WebSocket support for real-time updates
- [ ] GraphQL endpoint
- [ ] Webhook notifications
- [ ] Advanced caching layer
- [ ] API usage analytics
- [ ] Custom report generation

### Potential Improvements
- Response compression
- Request batching
- Background job processing
- Advanced search capabilities
- Multi-language support
- API versioning strategy

## Support

- **Health Check:** http://localhost:9000/api/v2/health
- **API Docs:** http://localhost:9000/api/v2
- **Sync Status:** http://localhost:9000/api/v2/sync/status

## License

Internal use only - Part of SEO Automation Platform

## Changelog

### 2.0.0 (2025-10-26)
- Initial release
- Keywords API (8 endpoints)
- Research API (7 endpoints)
- Sync API (4 endpoints)
- JWT authentication
- Rate limiting
- Complete documentation
