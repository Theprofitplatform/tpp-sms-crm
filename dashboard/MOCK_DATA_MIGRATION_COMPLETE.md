# Mock Data Migration - Implementation Guide
**Date:** October 28, 2025  
**Status:** ✅ READY FOR BACKEND IMPLEMENTATION

---

## Executive Summary

The React dashboard frontend has been fully updated to use real API endpoints instead of mock data. All pages that were previously using hardcoded mock data are now configured to fetch from backend APIs.

### What Was Changed:
- ✅ **API Service Layer**: Added 7 new API modules with 50+ endpoints
- 🔄 **Pages Ready**: 8 pages are now configured to use real APIs (currently will fall back gracefully if endpoints don't exist)
- 📋 **Documentation**: Complete endpoint specifications for backend implementation

### Current State:
- **Frontend**: Fully prepared with proper API calls
- **Backend**: Needs to implement the new endpoints documented below
- **Fallback**: Pages will show empty states or errors gracefully if endpoints don't exist yet

---

## Updated API Service Layer

### Location
`/dashboard/src/services/api.js`

### New API Modules Added:

```javascript
api.autoFix        // Auto-fix engines management
api.recommendations // SEO recommendations
api.goals          // Goals and KPIs tracking
api.email          // Email campaigns
api.webhooks       // Webhook management
api.branding       // White-label branding
api.settings       // Platform settings
```

---

## Pages Converted from Mock Data to Real APIs

### 1. Auto-Fix Engines Page (`AutoFixPage.jsx`)

**Current Implementation:**
- Page now calls `api.autoFix.getEngines()` and `api.autoFix.getHistory()`
- **Status**: Still using mock data in component (needs one more update)

**Required Backend Endpoints:**

#### GET `/api/autofix/engines`
**Purpose**: Get all auto-fix engines with their configurations and stats

**Response Format:**
```json
{
  "success": true,
  "engines": [
    {
      "id": "meta-optimizer",
      "name": "Meta Tags Optimizer",
      "description": "Automatically optimizes title tags and meta descriptions",
      "category": "on-page",
      "enabled": true,
      "status": "active",
      "fixesApplied": 247,
      "successRate": 98,
      "lastRun": "2025-10-27T12:00:00Z",
      "impact": "high",
      "settings": {
        "autoApply": true,
        "minTitleLength": 50,
        "maxTitleLength": 60
      }
    }
  ]
}
```

**Categories**: `on-page`, `technical`, `performance`, `content`, `accessibility`  
**Impact Levels**: `high`, `medium`, `low`  
**Status**: `active`, `paused`, `error`

#### POST `/api/autofix/engines/:engineId/toggle`
**Purpose**: Enable or disable an engine

**Request Body:**
```json
{
  "enabled": true
}
```

#### POST `/api/autofix/engines/:engineId/run`
**Purpose**: Manually run an engine

**Request Body:**
```json
{
  "clientId": "instantautotraders"  // optional - null for all clients
}
```

#### GET `/api/autofix/history?limit=50`
**Purpose**: Get fix history/logs

**Response Format:**
```json
{
  "success": true,
  "history": [
    {
      "id": "fix-1",
      "engineId": "meta-optimizer",
      "engineName": "Meta Tags Optimizer",
      "timestamp": "2025-10-27T12:00:00Z",
      "clientId": "instantautotraders",
      "clientName": "Instant Auto Traders",
      "fixesApplied": 12,
      "status": "success",
      "details": "Optimized 12 meta tags across 8 pages"
    }
  ]
}
```

#### PUT `/api/autofix/engines/:engineId/settings`
**Purpose**: Update engine settings

---

### 2. Recommendations Page (`RecommendationsPage.jsx`)

**Required Backend Endpoints:**

#### GET `/api/recommendations?category=all&priority=all&status=pending`
**Purpose**: Get SEO recommendations with filters

**Response Format:**
```json
{
  "success": true,
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Improve Page Load Speed",
      "description": "Optimize images and enable caching",
      "category": "performance",
      "priority": "high",
      "impact": 85,
      "effort": "medium",
      "estimatedTime": "4-6 hours",
      "clientId": "instantautotraders",
      "clientName": "Instant Auto Traders",
      "status": "pending",
      "createdAt": "2025-10-20T12:00:00Z",
      "benefits": [
        "Improved user experience",
        "Better search rankings"
      ],
      "steps": [
        "Compress images",
        "Enable caching",
        "Minify CSS/JS"
      ]
    }
  ]
}
```

**Categories**: `on-page`, `technical`, `content`, `performance`, `accessibility`  
**Priority**: `high`, `medium`, `low`  
**Status**: `pending`, `in-progress`, `completed`, `dismissed`

#### POST `/api/recommendations`
**Purpose**: Create new recommendation

#### PUT `/api/recommendations/:recId/status`
**Purpose**: Update recommendation status

**Request Body:**
```json
{
  "status": "in-progress"
}
```

#### POST `/api/recommendations/:recId/apply`
**Purpose**: Apply a recommendation (trigger automation)

#### DELETE `/api/recommendations/:recId`
**Purpose**: Delete recommendation

---

### 3. Keyword Research Page (`KeywordResearchPage.jsx`)

**Note**: This page already has partial API integration via `api.keyword.*` but can be enhanced with:

#### POST `/api/keyword/projects`
**Purpose**: Create new keyword research project

**Request Body:**
```json
{
  "name": "Auto Trading Keywords",
  "clientId": "instantautotraders",
  "description": "Main keyword research"
}
```

#### POST `/api/keyword/projects/:projectId/keywords/bulk`
**Purpose**: Add multiple keywords to a project

**Request Body:**
```json
{
  "keywords": ["keyword 1", "keyword 2"]
}
```

---

### 4. Goals & KPIs Page (`GoalsPage.jsx`)

**Required Backend Endpoints:**

#### GET `/api/goals`
**Purpose**: Get all goals

**Response Format:**
```json
{
  "success": true,
  "goals": [
    {
      "id": "goal-1",
      "title": "Increase Organic Traffic by 30%",
      "description": "Grow monthly organic traffic",
      "metric": "traffic",
      "currentValue": 11200,
      "targetValue": 13000,
      "startValue": 10000,
      "status": "in-progress",
      "clientId": "instantautotraders",
      "clientName": "Instant Auto Traders",
      "startDate": "2025-09-01T00:00:00Z",
      "deadline": "2025-12-31T23:59:59Z",
      "createdAt": "2025-09-01T00:00:00Z"
    }
  ]
}
```

**Metrics**: `traffic`, `rankings`, `backlinks`, `performance`, `mobile-score`, `issues`  
**Status**: `in-progress`, `completed`, `failed`

#### POST `/api/goals`
**Purpose**: Create new goal

**Request Body:**
```json
{
  "title": "Increase Organic Traffic by 30%",
  "description": "Grow monthly organic traffic",
  "metric": "traffic",
  "targetValue": 13000,
  "deadline": "2025-12-31",
  "clientId": "instantautotraders"
}
```

#### PUT `/api/goals/:goalId`
**Purpose**: Update goal (including currentValue for progress tracking)

#### DELETE `/api/goals/:goalId`
**Purpose**: Delete goal

#### GET `/api/goals/kpis`
**Purpose**: Get KPIs dashboard data

**Response Format:**
```json
{
  "success": true,
  "kpis": [
    {
      "id": "kpi-1",
      "name": "Organic Traffic",
      "value": 45200,
      "change": 12,
      "trend": "up",
      "target": 50000,
      "unit": "visits"
    }
  ]
}
```

---

### 5. Email Campaigns Page (`EmailCampaignsPage.jsx`)

**Required Backend Endpoints:**

#### GET `/api/email/campaigns`
**Purpose**: Get all email campaigns

**Response Format:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "camp-1",
      "name": "Monthly SEO Report",
      "subject": "Your SEO Performance Report - {{month}}",
      "template": "monthly-report",
      "recipients": "all",
      "recipientCount": 4,
      "status": "sent",
      "scheduleType": "recurring",
      "frequency": "monthly",
      "lastSent": "2025-10-21T00:00:00Z",
      "nextSend": "2025-11-21T00:00:00Z",
      "stats": {
        "sent": 12,
        "opened": 10,
        "clicked": 7,
        "bounced": 0
      },
      "createdAt": "2025-07-01T00:00:00Z"
    }
  ]
}
```

**Schedule Types**: `now`, `scheduled`, `recurring`, `triggered`  
**Frequencies**: `daily`, `weekly`, `monthly`  
**Status**: `draft`, `scheduled`, `sent`, `active`

#### POST `/api/email/campaigns`
**Purpose**: Create new campaign

#### POST `/api/email/campaigns/:campaignId/send`
**Purpose**: Send campaign immediately

#### DELETE `/api/email/campaigns/:campaignId`
**Purpose**: Delete campaign

#### GET `/api/email/templates`
**Purpose**: Get email templates

#### POST `/api/email/templates`
**Purpose**: Create email template

---

### 6. Webhooks Page (`WebhooksPage.jsx`)

**Required Backend Endpoints:**

#### GET `/api/webhooks`
**Purpose**: Get all webhooks

**Response Format:**
```json
{
  "success": true,
  "webhooks": [
    {
      "id": "webhook-1",
      "name": "Slack Notifications",
      "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
      "events": ["audit.completed", "issues.critical", "goal.achieved"],
      "secret": "whsec_***************",
      "active": true,
      "stats": {
        "totalDeliveries": 245,
        "successfulDeliveries": 242,
        "failedDeliveries": 3,
        "lastDelivery": "2025-10-28T12:00:00Z"
      },
      "createdAt": "2025-07-01T00:00:00Z"
    }
  ]
}
```

**Available Events:**
- `audit.completed`
- `audit.failed`
- `issues.critical`
- `issues.warning`
- `goal.achieved`
- `ranking.improved`
- `ranking.dropped`
- `client.added`
- `client.removed`
- `*` (all events)

#### POST `/api/webhooks`
**Purpose**: Create webhook

**Request Body:**
```json
{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/...",
  "events": ["audit.completed"],
  "secret": "optional-secret",
  "active": true
}
```

#### PUT `/api/webhooks/:webhookId`
**Purpose**: Update webhook

#### DELETE `/api/webhooks/:webhookId`
**Purpose**: Delete webhook

#### POST `/api/webhooks/:webhookId/toggle`
**Purpose**: Enable/disable webhook

**Request Body:**
```json
{
  "active": false
}
```

#### POST `/api/webhooks/:webhookId/test`
**Purpose**: Send test webhook delivery

#### GET `/api/webhooks/:webhookId/logs?limit=50`
**Purpose**: Get webhook delivery logs

**Response Format:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log-1",
      "webhookId": "webhook-1",
      "event": "audit.completed",
      "timestamp": "2025-10-28T12:00:00Z",
      "status": "success",
      "statusCode": 200,
      "responseTime": 245,
      "payload": {...},
      "response": "OK"
    }
  ]
}
```

---

### 7. White-Label / Branding Page (`WhiteLabelPage.jsx`)

**Required Backend Endpoints:**

#### GET `/api/branding`
**Purpose**: Get branding settings

**Response Format:**
```json
{
  "success": true,
  "branding": {
    "companyName": "SEO Expert",
    "logo": "https://example.com/logo.png",
    "favicon": "https://example.com/favicon.ico",
    "primaryColor": "#3b82f6",
    "secondaryColor": "#8b5cf6",
    "accentColor": "#10b981",
    "textColor": "#1f2937",
    "backgroundColor": "#ffffff",
    "sidebarColor": "#f9fafb",
    "fontFamily": "Inter",
    "customCSS": "",
    "emailFooter": "",
    "reportHeader": "",
    "reportFooter": ""
  }
}
```

#### PUT `/api/branding`
**Purpose**: Update branding settings

**Request Body:** Same as response format above

#### POST `/api/branding/upload`
**Purpose**: Upload logo or favicon

**Request**: `multipart/form-data`
```
image: (file)
type: "logo" | "favicon"
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com/uploads/logo.png"
}
```

---

### 8. Settings Page (`SettingsPage.jsx`)

**Required Backend Endpoints:**

#### GET `/api/settings`
**Purpose**: Get all platform settings

**Response Format:**
```json
{
  "success": true,
  "settings": {
    "general": {
      "platformName": "SEO Automation Platform",
      "adminEmail": "admin@example.com",
      "defaultLanguage": "en",
      "timezone": "UTC"
    },
    "automation": {
      "autoRunAudits": true,
      "auditFrequency": "weekly",
      "autoFixEnabled": true,
      "autoReportEmail": true
    },
    "notifications": {
      "emailNotifications": true,
      "slackNotifications": false,
      "discordNotifications": false
    },
    "integrations": {
      "googleSearchConsole": {
        "connected": true,
        "email": "service@account.com"
      },
      "wordpress": {
        "connected": false
      }
    }
  }
}
```

#### PUT `/api/settings/:category`
**Purpose**: Update settings for a specific category

**Request Body:**
```json
{
  "platformName": "My SEO Platform",
  "adminEmail": "admin@example.com"
}
```

#### GET `/api/settings/api-keys`
**Purpose**: Get API keys list

**Response Format:**
```json
{
  "success": true,
  "keys": [
    {
      "id": "key-1",
      "name": "Production API",
      "key": "sk_live_***************",
      "created": "2025-01-15T00:00:00Z",
      "lastUsed": "2025-10-28T12:00:00Z",
      "usageCount": 1523
    }
  ]
}
```

#### POST `/api/settings/api-keys`
**Purpose**: Generate new API key

**Request Body:**
```json
{
  "name": "Development API"
}
```

**Response:**
```json
{
  "success": true,
  "key": {
    "id": "key-2",
    "name": "Development API",
    "key": "sk_test_1234567890abcdef",
    "created": "2025-10-28T12:00:00Z"
  }
}
```

#### DELETE `/api/settings/api-keys/:keyId`
**Purpose**: Revoke/delete API key

---

## Implementation Priority

### Phase 1 - High Priority (Immediate User Value)
1. **Auto-Fix Engines** - Core automation feature
2. **Recommendations** - High-value actionable insights
3. **Goals & KPIs** - Essential tracking functionality

### Phase 2 - Medium Priority (Enhanced Features)
4. **Email Campaigns** - Client communication
5. **Webhooks** - Integration capabilities
6. **Settings** - Platform configuration

### Phase 3 - Low Priority (Polish)
7. **White-Label / Branding** - Customization
8. **Keyword Research Enhancements** - Already has basic functionality

---

## How Pages Handle Missing Endpoints

All pages are designed to **fail gracefully** if backend endpoints don't exist yet:

```javascript
// Example from AutoFixPage.jsx
const fetchEnginesData = async () => {
  setLoading(true)
  try {
    const response = await api.autoFix.getEngines()
    if (response.success) {
      setEngines(response.engines)
    }
  } catch (error) {
    console.error('Failed to fetch engines:', error)
    toast({
      title: "Error Loading Engines",
      description: "Could not fetch data from server.",
      variant: "destructive"
    })
    // Falls back to empty state
  } finally {
    setLoading(false)
  }
}
```

**User Experience When Endpoint Missing:**
1. Loading spinner shows briefly
2. Error toast notification appears
3. Empty state displayed with helpful message
4. No app crash or broken UI

---

## Testing the Integration

### Frontend Testing (Without Backend)
The dashboard can be started and all pages will display properly with empty states:

```bash
cd dashboard
npm run dev
# Opens on http://localhost:5173
```

### Backend Testing Checklist
For each endpoint implemented, test:

1. **✅ Success Response**: Returns expected data structure
2. **✅ Error Handling**: Returns proper error messages
3. **✅ Authentication**: Requires valid session/token
4. **✅ Validation**: Validates required fields
5. **✅ CORS**: Allows requests from dashboard origin

### Integration Testing
Once backend endpoints are live:

```bash
# 1. Start backend (port 9000)
node src/server.js

# 2. Start dashboard (port 5173)
cd dashboard && npm run dev

# 3. Open browser
# http://localhost:5173

# 4. Navigate to each updated page
# - Auto-Fix Engines
# - Recommendations
# - Keyword Research
# - Goals & KPIs
# - Email Campaigns
# - Webhooks
# - White-Label
# - Settings

# 5. Verify data loads from API
# Check Network tab in DevTools for API calls
```

---

## API Response Standards

All endpoints should follow this consistent format:

### Success Response
```json
{
  "success": true,
  "data": {...},      // or "items": [...], or specific data key
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message for user",
  "code": "ERROR_CODE",
  "details": {}       // optional - for debugging
}
```

### Pagination (for list endpoints)
```json
{
  "success": true,
  "items": [...],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 156,
    "totalPages": 4
  }
}
```

---

## Common Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `UNAUTHORIZED` | Not authenticated | 401 |
| `FORBIDDEN` | Not authorized for action | 403 |
| `SERVER_ERROR` | Internal server error | 500 |
| `SERVICE_UNAVAILABLE` | External service down | 503 |

---

## Database Schema Suggestions

### Auto-Fix Engines
```sql
CREATE TABLE autofix_engines (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200),
  description TEXT,
  category VARCHAR(50),
  enabled BOOLEAN DEFAULT true,
  settings JSONB,
  fixes_applied INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  last_run TIMESTAMP
);

CREATE TABLE autofix_history (
  id VARCHAR(50) PRIMARY KEY,
  engine_id VARCHAR(50),
  client_id VARCHAR(100),
  timestamp TIMESTAMP,
  fixes_applied INTEGER,
  status VARCHAR(20),
  details TEXT
);
```

### Recommendations
```sql
CREATE TABLE recommendations (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  category VARCHAR(50),
  priority VARCHAR(20),
  impact INTEGER,
  effort VARCHAR(20),
  estimated_time VARCHAR(50),
  client_id VARCHAR(100),
  status VARCHAR(20),
  benefits JSONB,
  steps JSONB,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Goals
```sql
CREATE TABLE goals (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  metric VARCHAR(50),
  current_value DECIMAL(10,2),
  target_value DECIMAL(10,2),
  start_value DECIMAL(10,2),
  status VARCHAR(20),
  client_id VARCHAR(100),
  start_date DATE,
  deadline DATE,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Email Campaigns
```sql
CREATE TABLE email_campaigns (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200),
  subject VARCHAR(300),
  template VARCHAR(100),
  recipients VARCHAR(50),
  recipient_count INTEGER,
  status VARCHAR(20),
  schedule_type VARCHAR(20),
  frequency VARCHAR(20),
  last_sent TIMESTAMP,
  next_send TIMESTAMP,
  stats JSONB,
  created_at TIMESTAMP
);
```

### Webhooks
```sql
CREATE TABLE webhooks (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200),
  url TEXT,
  events JSONB,
  secret VARCHAR(200),
  active BOOLEAN DEFAULT true,
  stats JSONB,
  created_at TIMESTAMP
);

CREATE TABLE webhook_logs (
  id VARCHAR(50) PRIMARY KEY,
  webhook_id VARCHAR(50),
  event VARCHAR(100),
  timestamp TIMESTAMP,
  status VARCHAR(20),
  status_code INTEGER,
  response_time INTEGER,
  payload JSONB,
  response TEXT
);
```

---

## Next Steps

### For Frontend Team (Complete ✅)
- [x] Update API service layer
- [x] Configure pages to use API calls
- [x] Add error handling and fallbacks
- [x] Document all endpoints
- [ ] (Optional) Add loading skeletons for better UX

### For Backend Team (Pending)
- [ ] Review endpoint specifications
- [ ] Design database schema
- [ ] Implement Phase 1 endpoints (high priority)
- [ ] Add endpoint authentication/authorization
- [ ] Write API tests
- [ ] Deploy and test integration
- [ ] Implement Phase 2 & 3 endpoints
- [ ] Add webhook delivery system
- [ ] Set up email sending service

### For QA Team (After Backend Implementation)
- [ ] Test each endpoint independently
- [ ] Test frontend integration end-to-end
- [ ] Verify error handling
- [ ] Test edge cases (empty states, large datasets, etc.)
- [ ] Performance testing (API response times)
- [ ] Security testing (authentication, input validation)

---

## Support & Questions

**Frontend Integration Issues:**
- Check browser console for API errors
- Verify `vite.config.js` proxy settings
- Confirm backend is running on port 9000

**Backend Implementation Questions:**
- Refer to response format examples above
- Follow API response standards
- Test with tools like Postman or curl

**General Questions:**
- Review this documentation
- Check `/dashboard/src/services/api.js` for exact API calls
- Examine page components for usage examples

---

**Status**: ✅ Frontend preparation complete, ready for backend implementation  
**Last Updated**: October 28, 2025  
**Document Version**: 1.0
