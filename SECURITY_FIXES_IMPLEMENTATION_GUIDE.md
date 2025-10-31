# Security Fixes Implementation Guide

**Date:** October 31, 2025
**Status:** ✅ Security utilities created, ready for integration

---

## What Was Fixed

### 1. ✅ Created Input Validation Utilities

**File:** `src/utils/input-validator.js`

**Features:**
- `sanitizeClientId()` - Validates client IDs to prevent command injection
- `sanitizeFilePath()` - Prevents path traversal attacks
- `sanitizeShellArg()` - Validates shell command arguments
- `buildSafeCommand()` - Builds safe shell commands with validation
- `sanitizeHtml()` - Prevents XSS attacks
- Email, URL, and job ID validation

**Usage Example:**
```javascript
import { sanitizeClientId } from './src/utils/input-validator.js';

// BEFORE (Vulnerable):
const { clientId } = req.params;
await execAsync(`node client-manager.js audit ${clientId}`);

// AFTER (Safe):
const { clientId } = req.params;
const safeClientId = sanitizeClientId(clientId); // Throws if invalid
await execAsync(`node client-manager.js audit ${safeClientId}`);
```

---

### 2. ✅ Created Safe Command Execution Wrappers

**File:** `src/utils/safe-exec.js`

**Features:**
- `executeNodeScript()` - Safe execution with script allowlist
- `executeAudit()` - Safe audit execution
- `executeOptimization()` - Safe optimization execution
- `executeAutoFix()` - Safe auto-fix execution
- `testAuthentication()` - Safe auth testing
- All functions validate inputs and use allowlists

**Usage Example:**
```javascript
import { executeAudit } from './src/utils/safe-exec.js';

// BEFORE (Vulnerable):
app.post('/api/audit/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { stdout } = await execAsync(`node client-manager.js audit ${clientId}`);
  res.json({ success: true, output: stdout });
});

// AFTER (Safe):
app.post('/api/audit/:clientId', async (req, res) => {
  const { clientId } = req.params;
  try {
    const result = await executeAudit(clientId);
    res.json({
      success: true,
      output: result.stdout,
      duration: result.duration
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message // Safe error message, no internals exposed
    });
  }
});
```

---

### 3. ✅ Created Route Protection Middleware

**File:** `src/middleware/route-protection.js`

**Features:**
- `requireAuth` - Requires authentication
- `requireAdmin` - Requires admin role
- `requireClientAccess` - Checks user can access specific client
- `validateClientId` - Validates client ID format
- `protectClientEndpoint` - Combined protection for client endpoints
- `protectAdminEndpoint` - Combined protection for admin endpoints
- `auditLog` - Logs sensitive operations

**Usage Example:**
```javascript
import {
  protectClientEndpoint,
  protectAdminEndpoint,
  auditLog
} from './src/middleware/route-protection.js';

// BEFORE (No protection):
app.post('/api/audit/:clientId', async (req, res) => {
  // Anyone can trigger this!
});

// AFTER (Protected):
app.post('/api/audit/:clientId',
  protectClientEndpoint,  // Validates, authenticates, checks access
  auditLog,               // Logs the operation
  async (req, res) => {
    // Now protected!
  }
);

// Admin-only routes:
app.post('/api/control/shutdown',
  protectAdminEndpoint,
  async (req, res) => {
    // Only admins can access
  }
);
```

---

## Migration Steps

### Step 1: Update Imports in dashboard-server.js

Add these imports at the top:

```javascript
import { executeAudit, executeOptimization, executeAutoFix, testAuthentication } from './src/utils/safe-exec.js';
import { protectClientEndpoint, protectAdminEndpoint, auditLog } from './src/middleware/route-protection.js';
import { sanitizeClientId } from './src/utils/input-validator.js';
```

---

### Step 2: Protect All Endpoints

**Current vulnerable endpoints:**

```javascript
// Line 605 - Audit endpoint (VULNERABLE)
app.post('/api/audit/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { stdout } = await execAsync(`node client-manager.js audit ${clientId}`);
});

// Line 663 - Optimize endpoint (VULNERABLE)
app.post('/api/optimize/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { stdout } = await execAsync(`node client-manager.js optimize ${clientId}`);
});

// Line 1267 - Auto-fix content (VULNERABLE)
app.post('/api/control/auto-fix/content/:clientId', async (req, res) => {
  execAsync(`node auto-fix-all.js ${clientId}`)
});

// Line 1398 - Auto-fix titles (VULNERABLE)
app.post('/api/control/auto-fix/titles/:clientId', async (req, res) => {
  execAsync(`node auto-fix-titles.js ${clientId}`)
});
```

**Replace with protected versions:**

```javascript
// Audit endpoint (PROTECTED)
app.post('/api/audit/:clientId',
  protectClientEndpoint,
  auditLog,
  async (req, res) => {
    const { clientId } = req.params;
    try {
      const result = await executeAudit(clientId);
      // Store audit in history (existing code)
      res.json({
        success: true,
        duration: result.duration,
        output: result.stdout
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Optimize endpoint (PROTECTED)
app.post('/api/optimize/:clientId',
  protectClientEndpoint,
  auditLog,
  async (req, res) => {
    const { clientId } = req.params;
    try {
      const result = await executeOptimization(clientId);
      res.json({
        success: true,
        duration: result.duration,
        output: result.stdout
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Auto-fix endpoints (PROTECTED)
app.post('/api/control/auto-fix/content/:clientId',
  protectAdminEndpoint,
  auditLog,
  async (req, res) => {
    const { clientId } = req.params;
    try {
      const result = await executeAutoFix('all', clientId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

---

### Step 3: Protect All /api/control/* Endpoints

All control endpoints should use `protectAdminEndpoint`:

```javascript
app.post('/api/control/*', protectAdminEndpoint, auditLog, ...);
app.delete('/api/control/*', protectAdminEndpoint, auditLog, ...);
```

---

### Step 4: Protect All /api/scheduler/* Endpoints

```javascript
app.post('/api/scheduler/jobs', protectAdminEndpoint, auditLog, ...);
app.put('/api/scheduler/jobs/:id', protectAdminEndpoint, auditLog, ...);
app.delete('/api/scheduler/jobs/:id', protectAdminEndpoint, auditLog, ...);
```

---

## Quick Reference: Which Protection to Use

| Endpoint Type | Middleware | Example |
|---------------|------------|---------|
| Client-specific operations | `protectClientEndpoint` | `/api/audit/:clientId` |
| Admin-only operations | `protectAdminEndpoint` | `/api/control/*` |
| Public endpoints | None | `/api/health` |
| Sensitive logging needed | Add `auditLog` | Any important operation |

---

## Testing the Fixes

### Test 1: Command Injection Prevention

```bash
# This should now FAIL with proper error:
curl -X POST http://localhost:9000/api/audit/test;rm+-rf+/

# Expected response:
{
  "success": false,
  "error": "Invalid client ID. Only alphanumeric, hyphens, and underscores allowed."
}
```

### Test 2: Authentication Required

```bash
# This should now FAIL without auth:
curl -X POST http://localhost:9000/api/control/shutdown

# Expected response:
{
  "success": false,
  "error": "Authentication required"
}
```

### Test 3: Valid Request Works

```bash
# This should work (with valid client ID and auth):
curl -X POST http://localhost:9000/api/audit/hottyres \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Success
```

---

## Security Checklist

- [x] ✅ Input validation utilities created
- [x] ✅ Safe command execution wrappers created
- [x] ✅ Route protection middleware created
- [ ] ⏳ Update all execAsync calls in dashboard-server.js
- [ ] ⏳ Apply protectClientEndpoint to client routes
- [ ] ⏳ Apply protectAdminEndpoint to admin routes
- [ ] ⏳ Add audit logging to sensitive operations
- [ ] ⏳ Test all endpoints for security
- [ ] ⏳ Run security audit again: `npm audit`

---

## Automated Migration Script

You can use this script to help identify endpoints that need updating:

```bash
# Find all execAsync calls that need updating:
grep -n "execAsync" dashboard-server.js | grep -v "import"

# Find all routes that need protection:
grep -n "app\\.\\(get\\|post\\|put\\|delete\\)" dashboard-server.js
```

---

## Next Steps

1. **Immediate (Today):**
   - Update all execAsync calls to use safe wrappers
   - Apply authentication to /api/control/* endpoints
   - Apply authentication to /api/scheduler/* endpoints

2. **Short-term (This Week):**
   - Test all protected endpoints
   - Add integration tests for security
   - Review and apply client access controls

3. **Medium-term (This Month):**
   - Implement proper rate limiting with Redis
   - Add comprehensive audit logging
   - Set up security monitoring/alerts

---

## Additional Security Recommendations

### 1. Environment Variables

Ensure these are set securely:

```bash
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

### 2. HTTPS Only

In production, always use HTTPS:

```javascript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}
```

### 3. Security Headers

Already configured via Helmet, but verify:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline when possible
    }
  }
}));
```

---

## Support

If you encounter issues during migration:

1. Check the error messages (they're now safe and helpful)
2. Review the examples in this guide
3. Test with valid data first
4. Check authentication is working

---

**Status:** Security utilities ready ✅
**Next Action:** Apply to dashboard-server.js endpoints
**Priority:** HIGH - These fix CRITICAL vulnerabilities
