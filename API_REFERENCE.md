# 📡 API REFERENCE

Complete reference for all 133 API endpoints.

**Base URL:** `http://localhost:9000/api`
**Authentication:** JWT Bearer Token (where indicated)

---

## 🔐 AUTHENTICATION

### Register User
```http
POST /api/auth/register
Content-Type: application/json
```

**Request:**
```json
{
  "clientId": "client-123",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "client"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "userId": 1,
  "message": "User registered successfully"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "clientId": "client-123",
    "role": "client"
  }
}
```

### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "valid": true,
  "user": { "id": 1, "email": "user@example.com" }
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

---

## 👥 CLIENTS

### Get All Clients
```http
GET /api/clients
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "clients": [
    {
      "id": "client-123",
      "name": "ACME Corp",
      "domain": "https://acme.com",
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Get Client by ID
```http
GET /api/clients/:clientId
Authorization: Bearer {token}
```

### Create Client
```http
POST /api/clients
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "id": "client-123",
  "name": "ACME Corp",
  "domain": "https://acme.com",
  "businessType": "local_business",
  "city": "Sydney",
  "state": "NSW",
  "country": "Australia"
}
```

### Update Client
```http
PUT /api/clients/:clientId
Authorization: Bearer {token}
```

### Delete Client
```http
DELETE /api/clients/:clientId
Authorization: Bearer {token}
```

---

## 📧 LEADS

### Create Lead
```http
POST /api/leads
Content-Type: application/json
```

**Request:**
```json
{
  "businessName": "ACME Corp",
  "website": "https://acme.com",
  "name": "John Doe",
  "email": "john@acme.com",
  "phone": "+61412345678",
  "industry": "automotive",
  "source": "lead_magnet"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "leadId": 1,
  "message": "Lead created successfully"
}
```

### Get All Leads
```http
GET /api/leads?status=new&limit=50
Authorization: Bearer {token}
```

### Get Lead by ID
```http
GET /api/leads/:leadId
Authorization: Bearer {token}
```

### Update Lead Status
```http
PUT /api/leads/:leadId/status
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "status": "contacted",
  "notes": "Called and left voicemail"
}
```

### Track Lead Event
```http
POST /api/leads/:leadId/events
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "eventType": "email_opened",
  "metadata": { "campaignId": 1 }
}
```

---

## 📨 EMAIL CAMPAIGNS

### Get All Campaigns
```http
GET /api/email/campaigns
Authorization: Bearer {token}
```

### Create Campaign
```http
POST /api/email/campaigns
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Welcome Series",
  "type": "welcome",
  "triggerEvent": "lead_captured",
  "delayHours": 0,
  "subjectTemplate": "Welcome {{name}}!",
  "bodyTemplate": "<html>...</html>",
  "status": "active"
}
```

### Queue Email
```http
POST /api/email/queue
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "leadId": 1,
  "campaignId": 1,
  "recipientEmail": "john@acme.com",
  "recipientName": "John Doe",
  "subject": "Welcome!",
  "bodyHtml": "<html>...</html>",
  "scheduledFor": "2025-01-01T10:00:00Z"
}
```

### Process Queue
```http
POST /api/email/process-queue
Authorization: Bearer {token}
```

### Get Email Stats
```http
GET /api/email/stats/:campaignId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "sent": 450,
  "opened": 234,
  "clicked": 89,
  "openRate": "52%",
  "clickRate": "19.7%"
}
```

---

## 🏢 LOCAL SEO

### Run Audit
```http
POST /api/local-seo/audit/:clientId
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "options": {
    "citations": true,
    "competitors": true,
    "reviews": true,
    "keywords": true,
    "social": true,
    "gmb": true
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "clientId": "client-123",
  "overallScore": 72,
  "napScore": 85,
  "schemaScore": 100,
  "citationScore": 72,
  "reviewScore": 78,
  "competitivePosition": 2,
  "issues": [...],
  "recommendations": [...]
}
```

### Get Audit History
```http
GET /api/local-seo/history/:clientId?days=30
Authorization: Bearer {token}
```

### Get Trends
```http
GET /api/local-seo/trends/:clientId?days=30
Authorization: Bearer {token}
```

**Response:**
```json
{
  "overallScore": {
    "from": 65,
    "to": 72,
    "change": +7,
    "direction": "up"
  },
  "chartData": {
    "labels": ["2025-10-01", "2025-10-08", ...],
    "values": [65, 67, 70, 72]
  }
}
```

### Get Keywords
```http
GET /api/local-seo/keywords/:clientId
Authorization: Bearer {token}
```

### Get Social Media Audit
```http
GET /api/local-seo/social/:clientId
Authorization: Bearer {token}
```

### Get GMB Analysis
```http
GET /api/local-seo/gmb/:clientId
Authorization: Bearer {token}
```

---

## 🔧 AUTO-FIX

### Detect Issues
```http
POST /api/auto-fix/detect/:clientId
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "types": ["nap", "schema", "title_meta", "content"]
}
```

**Response:**
```json
{
  "issues": [
    {
      "type": "nap_consistency",
      "severity": "high",
      "location": "footer",
      "current": "Old Phone",
      "recommended": "New Phone",
      "confidence": 95
    }
  ]
}
```

### Apply Fix
```http
POST /api/auto-fix/apply/:clientId
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "fixType": "nap_consistency",
  "autoApprove": false
}
```

### Get Fix History
```http
GET /api/auto-fix/history/:clientId?limit=50
Authorization: Bearer {token}
```

### Rollback Fix
```http
POST /api/auto-fix/rollback/:fixId
Authorization: Bearer {token}
```

---

## 📊 REPORTS

### Generate Report
```http
POST /api/reports/generate/:clientId
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "type": "local_seo",
  "format": "pdf",
  "period": "monthly",
  "sections": ["overview", "keywords", "competitors"]
}
```

**Response:**
```json
{
  "success": true,
  "reportId": 123,
  "pdfUrl": "/api/reports/download/123",
  "htmlUrl": "/api/reports/view/123"
}
```

### Get Report
```http
GET /api/reports/:reportId
Authorization: Bearer {token}
```

### Download Report
```http
GET /api/reports/download/:reportId
Authorization: Bearer {token}
```

### List Reports
```http
GET /api/reports/list/:clientId?limit=20
Authorization: Bearer {token}
```

---

## 🎨 WHITE-LABEL

### Get Active Config
```http
GET /api/white-label/config
```

**Response:**
```json
{
  "configName": "default",
  "companyName": "Your Company",
  "primaryColor": "#667eea",
  "emailFromName": "Your Company",
  "emailFromEmail": "hello@yourcompany.com"
}
```

### Create Config
```http
POST /api/white-label/config
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "configName": "brand-1",
  "isActive": true,
  "companyName": "Brand Name",
  "primaryColor": "#667eea",
  "secondaryColor": "#764ba2",
  "emailFromName": "Brand Name",
  "emailFromEmail": "hello@brand.com"
}
```

### Update Config
```http
PUT /api/white-label/config/:configId
Authorization: Bearer {token}
```

### Set Active
```http
POST /api/white-label/config/:configId/activate
Authorization: Bearer {token}
```

---

## 📈 ANALYTICS

### Get Dashboard Data
```http
GET /api/analytics/:clientId?timeframe=30d
Authorization: Bearer {token}
```

**Response:**
```json
{
  "rankings": {
    "avgPosition": 8.5,
    "top3Count": 12,
    "top10Count": 45,
    "improvement": "+15%"
  },
  "traffic": {
    "organicVisits": 12540,
    "avgTimeOnSite": "3:24",
    "bounceRate": "42%"
  },
  "autoFixes": {
    "totalApplied": 28,
    "impactScore": 82
  }
}
```

### Export Data
```http
GET /api/export/:clientId/rankings?format=csv
Authorization: Bearer {token}
```

**Formats:** `csv`, `xlsx`, `json`

---

## 🔍 KEYWORDS

### Track Position
```http
POST /api/keywords/track
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "clientId": "client-123",
  "keyword": "seo services sydney",
  "domain": "https://example.com"
}
```

### Get Rankings
```http
GET /api/keywords/:clientId/rankings?limit=50
Authorization: Bearer {token}
```

### Get Trends
```http
GET /api/keywords/:clientId/trends?keyword=seo+services
Authorization: Bearer {token}
```

---

## 🏆 COMPETITORS

### Add Competitor
```http
POST /api/competitors/:clientId
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "competitorDomain": "competitor.com",
  "competitorName": "Competitor Inc",
  "keywords": ["seo services", "local seo"]
}
```

### Get Competitor Analysis
```http
GET /api/competitors/:clientId/analysis
Authorization: Bearer {token}
```

### Get Alerts
```http
GET /api/competitors/:clientId/alerts
Authorization: Bearer {token}
```

---

## ⚙️ ADMIN

### System Health
```http
GET /api/admin/health
Authorization: Bearer {token} (admin role required)
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": "7d 14h 32m",
  "database": {
    "status": "connected",
    "size": "24 MB"
  },
  "memory": {
    "used": "155 MB",
    "percentage": 30
  }
}
```

### Get Logs
```http
GET /api/admin/logs?level=error&limit=100
Authorization: Bearer {token} (admin role required)
```

### Bulk Operations
```http
POST /api/admin/bulk
Authorization: Bearer {token} (admin role required)
Content-Type: application/json
```

**Request:**
```json
{
  "action": "pause_automation",
  "clientIds": ["client-1", "client-2"]
}
```

---

## 🔔 WEBHOOKS

### Register Webhook
```http
POST /api/webhooks
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "url": "https://external-system.com/webhook",
  "events": ["client_created", "report_generated"],
  "secret": "webhook_secret_key"
}
```

### List Webhooks
```http
GET /api/webhooks
Authorization: Bearer {token}
```

### Test Webhook
```http
POST /api/webhooks/:webhookId/test
Authorization: Bearer {token}
```

### Delete Webhook
```http
DELETE /api/webhooks/:webhookId
Authorization: Bearer {token}
```

---

## 🔗 INTEGRATIONS

### Connect Google Search Console
```http
POST /api/integrations/gsc
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "clientId": "client-123",
  "siteUrl": "https://example.com",
  "serviceAccountJson": {...}
}
```

### Get GSC Data
```http
GET /api/integrations/gsc/:clientId/data?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

---

## 📝 NOTES

### Authentication
Most endpoints require a JWT token. Include it in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP

### Error Responses
All errors follow this format:
```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Pagination
Endpoints that return lists support pagination:
```
GET /api/clients?page=1&limit=50
```

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

## 🔧 TESTING APIS

### Using cURL
```bash
# Login
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePass123!"}'

# Get clients (with token)
curl http://localhost:9000/api/clients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman
1. Import collection from `/docs/postman-collection.json`
2. Set environment variable `baseUrl` = `http://localhost:9000`
3. Login to get token
4. Token auto-saves to environment

---

## 📚 ADDITIONAL RESOURCES

- **Setup Guide:** `SETUP.md`
- **Architecture:** `ARCHITECTURE.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`

---

**API Version:** v2.0
**Last Updated:** 2025-11-01
**Total Endpoints:** 133
