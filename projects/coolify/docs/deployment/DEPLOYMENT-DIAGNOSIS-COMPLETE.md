# Deployment Diagnosis - Mobile Repair Dashboard
**Date:** November 16, 2025  
**Application:** mobile-repair-dashboard (zccwogo8g4884gwcgwk4wwoc)  
**Repository:** avi-boop/rep  
**Status:** exited:unhealthy ❌

---

## 🔍 Investigation Summary

### Issue Discovered

The application builds successfully but exits with **"exited:unhealthy"** status. Through systematic investigation, I've identified multiple issues and fixed several, but the deployment is still failing.

---

## 🛠️ Issues Identified & Fixed

### ✅ Issue #1: Git Commit SHA Problem (FIXED)

**Problem:** Coolify stored a short commit SHA from a previous deployment that couldn't be found in shallow clones.

**Error:**
```bash
fatal: couldn't find remote ref 32f10c3
```

**Root Cause:**
- `git_commit_sha = '32f10c3'` (short SHA) stored in database
- `git clone --depth=1` (shallow clone) doesn't have full history
- Short commit references can't be resolved in shallow clones

**Fix Applied:**
```sql
UPDATE applications 
SET git_commit_sha = 'HEAD' 
WHERE uuid = 'zccwogo8g4884gwcgwk4wwoc';
```

**Result:** ✅ Git clone now works correctly

---

### ✅ Issue #2: Dockerfile Path Configuration (INVESTIGATED & CORRECTED)

**Initial Problem:** Dockerfile location was unclear.

**Investigation:**
1. Checked application config: `dockerfile_location = '/Dockerfile.production'`
2. Checked repository structure via GitHub API
3. Found: `Dockerfile.production` exists **at repository root**

**Actual Repository Structure:**
```
/
├── Dockerfile.production  ✅ (exists here)
├── docker-compose.yml
├── .dockerignore
├── package.json
└── ... other files
```

**Current Configuration** (Correct ✅):
```json
{
  "base_directory": "/",
  "dockerfile_location": "/Dockerfile.production"
}
```

---

## ❌ Ongoing Issue: Deployment Still Failing

### Latest Deployment Attempts:

| Deployment UUID | Status | Primary Error | Notes |
|-----------------|--------|---------------|-------|
| ws8wg8008coko8scg0k8s4kw | failed | Git commit SHA not found | Fixed: Updated to HEAD |
| ag4scsoco0k4884084c0s0co | failed | Dockerfile path incorrect | False alarm: path was actually correct |
| f0ckkgg0ww880swso0o4wwg8 | failed | Dockerfile path issue | Configuration corrected |
| n8sggk0444ks4w44wgsgccco | failed | TBD | Latest attempt |

---

## 🔧 Current Application Configuration

```json
{
  "uuid": "zccwogo8g4884gwcgwk4wwoc",
  "name": "mobile-repair-dashboard",
  "git_repository": "avi-boop/rep",
  "git_branch": "main",
  "git_commit_sha": "HEAD",
  "base_directory": "/",
  "dockerfile_location": "/Dockerfile.production",
  "build_pack": "dockerfile",
  "ports_exposes": "3000",
  "fqdn": "https://repair.theprofitplatform.com.au",
  
  "health_check_enabled": true,
  "health_check_path": "/api/health",
  "health_check_method": "GET",
  "health_check_port": null,
  "health_check_interval": 30,
  "health_check_retries": 10,
  "health_check_timeout": 10,
  "health_check_start_period": 5,
  "health_check_return_code": 200,
  "health_check_scheme": "http",
  
  "environment_variables": {
    "DATABASE_URL": "postgresql://...",
    "REDIS_URL": "redis://repair-redis:6379",
    "NODE_ENV": "production",
    "PORT": "3000",
    ...
  }
}
```

---

## 📊 Environment Variables Configuration

**⚠️ Warning Detected:**
```
Build-time environment variable warning: NODE_ENV=production

Affects: Node.js/npm/yarn/bun/pnpm
Issue: Skips devDependencies installation which are often required 
       for building (webpack, typescript, etc.)

Recommendation: Uncheck "Available at Buildtime" or use "development" 
                during build
```

**Potential Impact:**
- Dev dependencies may not be installed during build
- TypeScript compilation might fail
- Build tools (webpack, etc.) might be missing

---

## 🚨 MCP Tools Limitation Discovered

**Problem:** Coolify MCP tools don't provide access to detailed deployment logs.

**Current Workaround:**
```bash
# Direct database access required
docker exec coolify-db psql -U coolify -d coolify -t -c \
  "SELECT logs FROM application_deployment_queues WHERE deployment_uuid = 'xxx';"
```

**Recommendation for MCP Enhancement:**
```typescript
// Proposed new MCP tool
get_deployment_logs(deployment_uuid) {
  // Should return detailed build logs without needing database access
  // Should parse JSON logs and present them in readable format
}

get_application_deployment_history(application_uuid, limit = 10) {
  // Should return recent deployment attempts with status
  // Should include quick access to logs for failed deployments
}
```

---

## 🔎 Investigation Tools Used

### 1. **Direct API Calls**
```javascript
// List applications
GET /api/v1/applications

// Get application details
GET /api/v1/applications/{uuid}

// Start deployment
POST /api/v1/applications/{uuid}/start
```

### 2. **Database Queries**
```sql
-- Get application info
SELECT * FROM applications WHERE uuid = 'xxx';

-- Get deployment history
SELECT id, deployment_uuid, status, created_at 
FROM application_deployment_queues 
ORDER BY created_at DESC LIMIT 10;

-- Get deployment logs
SELECT logs FROM application_deployment_queues 
WHERE deployment_uuid = 'xxx';
```

### 3. **Docker Commands**
```bash
# List containers
docker ps -a | grep "zccwogo8g4884gwcgwk4wwoc"

# Check images
docker images | grep "zccwogo8g4884gwcgwk4wwoc"

# View logs
docker logs coolify
```

### 4. **GitHub API**
```bash
# List repository contents
curl -s "https://api.github.com/repos/avi-boop/rep/contents"

# Find Dockerfiles
curl -s "https://api.github.com/repos/avi-boop/rep/contents" | \
  jq -r '.[] | select(.name | contains("Docker"))'
```

---

## 📝 Next Steps Required

### Immediate Actions:

1. **Get Latest Deployment Logs**
   ```bash
   docker exec coolify-db psql -U coolify -d coolify -t -c \
     "SELECT logs FROM application_deployment_queues \
      WHERE deployment_uuid = 'n8sggk0444ks4w44wgsgccco';"
   ```

2. **Analyze Build Failure**
   - Check if Docker build starts
   - Check if dependencies install correctly
   - Check if TypeScript compiles
   - Check if application starts

3. **Review NODE_ENV Configuration**
   - Consider changing NODE_ENV to "development" for build-time
   - Set as "Runtime only" in Coolify UI
   - Or use multi-stage Docker build

4. **Check Dockerfile.production**
   - Verify it's properly configured
   - Ensure all dependencies are included
   - Check if health check endpoint is implemented

5. **Test Locally** (Recommended)
   ```bash
   git clone https://github.com/avi-boop/rep
   cd rep
   docker build -f Dockerfile.production -t test-build .
   docker run -p 3000:3000 test-build
   curl http://localhost:3000/api/health
   ```

---

## 🎯 Root Cause Hypothesis

Based on the investigation, the most likely causes are:

1. **Build Failure** - Docker build might be failing due to:
   - Missing dev dependencies (NODE_ENV=production issue)
   - TypeScript compilation errors
   - Missing build tools

2. **Runtime Failure** - Application might be starting but crashing due to:
   - Missing Prisma client files
   - Database connection issues
   - Missing environment variables

3. **Health Check Failure** - Application might be running but:
   - `/api/health` endpoint not responding
   - Health check timing out before app fully starts
   - Port configuration mismatch

---

## 📈 Success Metrics

To consider this issue resolved:
- ✅ Docker build completes successfully
- ✅ Container starts and stays running
- ✅ Health check passes (http://localhost:3000/api/health returns 200)
- ✅ Application accessible at https://repair.theprofitplatform.com.au
- ✅ No restart loops or crashes

---

## 🤝 Recommendations

### For User:
1. Review latest deployment logs for specific errors
2. Test Docker build locally to isolate issues
3. Consider NODE_ENV configuration for build vs runtime
4. Verify health check endpoint implementation

### For Coolify MCP:
1. Add `get_deployment_logs()` tool
2. Add `get_deployment_history()` tool
3. Improve error reporting in deployment responses
4. Add deployment status streaming/webhook support

---

**Status:** Investigation ongoing  
**Priority:** High  
**Latest Deployment UUID:** n8sggk0444ks4w44wgsgccco  
**Next Action:** Extract and analyze latest deployment logs

---

**Generated:** November 16, 2025, 01:13 UTC  
**By:** AI Assistant (Droid)
