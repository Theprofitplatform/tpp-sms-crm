# API Documentation

Complete API reference for the SEO Automation Platform.

## Base URL

```
http://localhost:3000
```

## Authentication

Most endpoints require authentication via JWT token sent as HTTP-only cookie or Authorization header.

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Authentication Flow

1. Register or login to receive JWT token
2. Token is set as HTTP-only cookie automatically
3. Include token in Authorization header for API requests

---

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "clientId": "client-123",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "client"  // "client" or "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": 1
}
```

#### POST /api/auth/login
Login to existing account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "clientId": "client-123",
    "role": "client",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### GET /api/auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "clientId": "client-123",
    "role": "client"
  }
}
```

#### POST /api/auth/change-password
Change user password.

**Request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

---

### Lead Management

#### POST /api/leads/capture
Capture a new lead from landing page.

**Request:**
```json
{
  "businessName": "Acme Corp",
  "website": "https://acmecorp.com",
  "name": "John Doe",
  "email": "john@acmecorp.com",
  "phone": "(555) 123-4567",
  "industry": "Technology"
}
```

**Response:**
```json
{
  "success": true,
  "leadId": 1,
  "message": "Lead captured successfully"
}
```

#### GET /api/leads
Get all leads with optional filters.

**Query Parameters:**
- `status` - Filter by status (new, contacted, qualified, converted, lost)
- `limit` - Number of results (default: 100)
- `fromDate` - Start date filter
- `toDate` - End date filter

**Response:**
```json
{
  "success": true,
  "count": 10,
  "leads": [
    {
      "id": 1,
      "business_name": "Acme Corp",
      "website": "https://acmecorp.com",
      "name": "John Doe",
      "email": "john@acmecorp.com",
      "phone": "(555) 123-4567",
      "industry": "Technology",
      "status": "new",
      "audit_completed": true,
      "audit_score": 68,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET /api/leads/stats
Get lead statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "new": 45,
    "contacted": 60,
    "converted": 30,
    "auditCompleted": 120
  }
}
```

#### PUT /api/leads/:leadId/status
Update lead status.

**Request:**
```json
{
  "status": "contacted",
  "notes": "Called and scheduled follow-up"
}
```

#### POST /api/leads/:leadId/audit
Generate SEO audit for lead.

**Response:**
```json
{
  "success": true,
  "audit": {
    "website": "https://acmecorp.com",
    "score": 68,
    "technical": {
      "mobileOptimized": true,
      "httpsEnabled": true,
      "pageSpeed": 72
    },
    "onPage": {
      "titleOptimized": false,
      "metaDescription": true,
      "h1Tags": 3
    },
    "competitors": [...]
  }
}
```

#### GET /api/leads/:leadId/events
Get event history for lead.

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": 1,
      "event_type": "audit_viewed",
      "created_at": "2024-01-15T10:35:00.000Z"
    }
  ]
}
```

---

### Email Campaigns

#### POST /api/email/initialize
Initialize default email campaigns.

**Response:**
```json
{
  "success": true,
  "message": "Email campaigns initialized",
  "campaignIds": [1, 2, 3, 4, 5, 6, 7, 8, 9]
}
```

#### GET /api/email/campaigns
Get all email campaigns.

**Response:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": 1,
      "name": "Welcome & Audit Delivery",
      "type": "welcome",
      "status": "active",
      "trigger_event": "lead_captured",
      "delay_hours": 0,
      "created_at": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

#### GET /api/email/campaigns/:campaignId
Get specific campaign details.

#### PUT /api/email/campaigns/:campaignId/status
Update campaign status (active, paused, archived).

**Request:**
```json
{
  "status": "paused"
}
```

#### POST /api/email/trigger
Manually trigger email campaign.

**Request:**
```json
{
  "leadId": 1,
  "eventType": "lead_captured"
}
```

#### POST /api/email/process-queue
Process pending emails in queue.

**Request (optional):**
```json
{
  "limit": 50,
  "dryRun": false
}
```

**Response:**
```json
{
  "success": true,
  "sent": 45,
  "failed": 2,
  "results": [...]
}
```

#### GET /api/email/queue
Get current email queue.

**Response:**
```json
{
  "success": true,
  "queue": [
    {
      "id": 1,
      "recipient_email": "john@acmecorp.com",
      "subject": "Your FREE SEO Audit is Ready!",
      "status": "pending",
      "scheduled_for": "2024-01-15T11:00:00.000Z",
      "retry_count": 0
    }
  ]
}
```

#### GET /api/email/stats
Get email statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSent": 1500,
    "totalFailed": 15,
    "activeCampaigns": 9,
    "pendingInQueue": 25
  }
}
```

---

### Client Email Communication

#### POST /api/email/client/:clientId/send
Send generic email to client.

**Request:**
```json
{
  "eventType": "custom",
  "customData": {
    "subject": "Custom Email",
    "message": "..."
  }
}
```

#### POST /api/email/client/:clientId/monthly-report
Send monthly performance report.

**Request (optional custom data):**
```json
{
  "month": "January",
  "totalClicks": 1250,
  "totalImpressions": 45000
}
```

#### POST /api/email/client/:clientId/ranking-alert
Send ranking drop alert.

**Request:**
```json
{
  "keyword": "seo services",
  "oldPosition": 5,
  "newPosition": 12,
  "severity": "high"
}
```

#### POST /api/email/client/:clientId/check-in
Send monthly satisfaction check-in.

#### POST /api/email/client/:clientId/onboard
Send client onboarding welcome email.

**Request:**
```json
{
  "temporaryPassword": "ChangeMe123!",
  "clientEmail": "john@client.com",
  "portalLink": "https://app.yourcompany.com/portal"
}
```

#### POST /api/email/client/:clientId/milestone
Send milestone celebration email.

**Request:**
```json
{
  "milestone": "Top 3 Ranking",
  "milestoneDescription": "Your website now ranks in the top 3 for 'best pizza NYC'"
}
```

---

### White-Label Configuration

#### GET /api/white-label/config
Get active white-label configuration.

**Response:**
```json
{
  "success": true,
  "config": {
    "id": 1,
    "config_name": "default",
    "is_active": true,
    "company_name": "Your Company",
    "primary_color": "#667eea",
    "secondary_color": "#764ba2",
    "accent_color": "#10b981",
    "email_from_name": "Your Company",
    "email_from_email": "hello@yourcompany.com"
  }
}
```

#### GET /api/white-label/portal-config
Get public portal configuration (no auth required).

**Response:**
```json
{
  "success": true,
  "config": {
    "companyName": "Your Company",
    "primaryColor": "#667eea",
    "portalTitle": "SEO Dashboard",
    "socialLinks": {...},
    "legalLinks": {...}
  }
}
```

#### GET /api/white-label/configs
Get all configurations (admin only).

**Response:**
```json
{
  "success": true,
  "count": 3,
  "configs": [...]
}
```

#### POST /api/white-label/config
Create new white-label configuration.

**Request:**
```json
{
  "configName": "agency-brand",
  "isActive": false,
  "companyName": "Agency Name",
  "companyLogoUrl": "https://example.com/logo.png",
  "companyWebsite": "https://agency.com",
  "primaryColor": "#667eea",
  "secondaryColor": "#764ba2",
  "accentColor": "#10b981",
  "emailFromName": "Agency Name",
  "emailFromEmail": "hello@agency.com",
  "emailReplyTo": "support@agency.com",
  "portalTitle": "SEO Dashboard",
  "portalWelcomeText": "Welcome to your dashboard",
  "supportEmail": "support@agency.com",
  "supportPhone": "(555) 123-4567",
  "socialFacebook": "https://facebook.com/agency",
  "socialTwitter": "https://twitter.com/agency",
  "socialLinkedin": "https://linkedin.com/company/agency"
}
```

#### PUT /api/white-label/config/:configId
Update white-label configuration.

#### POST /api/white-label/config/:configId/activate
Set configuration as active.

#### DELETE /api/white-label/config/:configId
Delete configuration (cannot delete active config).

---

### Client Management

#### GET /api/clients
Get all clients (admin only).

**Response:**
```json
{
  "success": true,
  "count": 25,
  "clients": [
    {
      "id": "client-123",
      "name": "Acme Corp",
      "domain": "acmecorp.com",
      "city": "San Francisco",
      "state": "CA",
      "status": "active",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/clients/:clientId
Get specific client details.

**Response:**
```json
{
  "success": true,
  "client": {
    "id": "client-123",
    "name": "Acme Corp",
    "domain": "acmecorp.com",
    "business_type": "Local Business",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "status": "active"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- General API: 100 requests per minute
- Email sending: 50 emails per batch

---

## Examples

### Complete Lead Capture Flow

```bash
# 1. Capture lead
curl -X POST http://localhost:3000/api/leads/capture \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business",
    "website": "https://test.com",
    "name": "John Doe",
    "email": "john@test.com",
    "phone": "(555) 123-4567",
    "industry": "Technology"
  }'

# 2. Generate audit
curl -X POST http://localhost:3000/api/leads/1/audit

# 3. Check email queue
curl http://localhost:3000/api/email/queue

# 4. Process emails
curl -X POST http://localhost:3000/api/email/process-queue
```

### Setup Workflow

```bash
# 1. Initialize campaigns
curl -X POST http://localhost:3000/api/email/initialize

# 2. Create white-label config
curl -X POST http://localhost:3000/api/white-label/config \
  -H "Content-Type: application/json" \
  -d @white-label-config.json

# 3. Create admin user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d @admin-user.json
```

---

For more information, see:
- [Setup Guide](SETUP.md)
- [Deployment Guide](DEPLOYMENT.md)
- [User Guide](USER_GUIDE.md)
