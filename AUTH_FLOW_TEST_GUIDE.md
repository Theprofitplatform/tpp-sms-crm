# Authentication Flow Test Guide

This guide explains how to test the complete authentication flow in the SMS CRM system.

## Prerequisites

1. **Database**: PostgreSQL running on port 5432
2. **Redis**: Redis running on port 6379
3. **API Server**: API running on port 3000

## Quick Setup

```bash
# Start database and Redis (using Docker)
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Run database migrations
pnpm run migrate

# Start API server
pnpm run dev:api
```

## Manual Testing Steps

### Step 1: Create Test User

First, create a test tenant and user directly in the database:

```sql
-- Insert test tenant
INSERT INTO tenants (name, timezone) VALUES ('Test Tenant', 'Australia/Sydney');

-- Get the tenant ID
SELECT id FROM tenants WHERE name = 'Test Tenant';

-- Insert test user (replace TENANT_ID with actual ID)
INSERT INTO users (tenant_id, email, role, is_active)
VALUES ('TENANT_ID', 'test@example.com', 'admin', true);
```

### Step 2: Test Magic Link Request

```bash
curl -X POST http://localhost:3000/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response:**
```json
{
  "message": "If account exists, magic link sent"
}
```

### Step 3: Get Magic Token

Check the database for the generated token:

```sql
SELECT * FROM magic_tokens
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

### Step 4: Test Token Verification

Use the token from the previous step:

```bash
curl -X GET http://localhost:3000/auth/verify/TOKEN_HERE
```

**Expected Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "test@example.com",
    "role": "admin",
    "tenantId": "tenant-uuid"
  }
}
```

### Step 5: Test Authenticated Endpoint

Use the session cookie from the verification response:

```bash
curl -X GET http://localhost:3000/campaigns \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

### Step 6: Test Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

## Automated Testing

Run the automated test script:

```bash
node test-auth-flow.js
```

## Expected Flow

1. **Magic Link Request**: User requests login link
2. **Token Generation**: System creates magic token in database
3. **Email Simulation**: Token is logged (in development)
4. **Token Verification**: User clicks link, token is verified
5. **Session Creation**: Redis-backed session is created
6. **Access Granted**: User can access protected endpoints
7. **Logout**: Session is destroyed

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running
2. **Redis Connection**: Ensure Redis is running for sessions
3. **Migration Issues**: Run `pnpm run migrate` to apply schema
4. **Port Conflicts**: Check ports 3000 (API), 5432 (DB), 6379 (Redis)

### Error Messages

- `"Unauthorized - No active session"`: No valid session cookie
- `"Invalid or expired token"`: Magic token is invalid or used
- `"User not found or inactive"`: User doesn't exist or is disabled

## Security Notes

- Magic tokens expire after 15 minutes
- Sessions use Redis for persistence
- All endpoints require proper authentication
- Rate limiting is enforced on auth endpoints