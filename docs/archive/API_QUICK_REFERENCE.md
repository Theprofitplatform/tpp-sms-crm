# API Quick Reference Card 🚀

Quick copy-paste reference for the Manual Review API.

---

## 🎯 Complete Workflow (Copy & Paste)

```bash
# 1. DETECT - Find issues (safe, no changes)
curl -X POST http://localhost:4000/api/autofix/detect \
  -H "Content-Type: application/json" \
  -d '{
    "engineId": "nap-fixer",
    "clientId": "your-client-id"
  }'
# Save the groupId from response

# 2. VIEW - Get proposals
curl "http://localhost:4000/api/autofix/proposals?groupId=YOUR_GROUP_ID&status=pending"

# 3. APPROVE - Accept low-risk (recommended)
curl -X POST http://localhost:4000/api/autofix/proposals/accept-low-risk \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "YOUR_GROUP_ID",
    "maxRiskLevel": "low"
  }'

# 4. APPLY - Execute approved fixes
curl -X POST http://localhost:4000/api/autofix/apply \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "YOUR_GROUP_ID",
    "engineId": "nap-fixer",
    "clientId": "your-client-id"
  }'
```

---

## 📋 All Endpoints

### Detection
```bash
POST /api/autofix/detect
Body: { "engineId": "nap-fixer", "clientId": "abc" }
Returns: { groupId, sessionId, proposals: count }
```

### Get Proposals
```bash
# All pending
GET /api/autofix/proposals?groupId=GROUP_ID&status=pending

# Filter by risk
GET /api/autofix/proposals?groupId=GROUP_ID&riskLevel=low

# Filter by severity
GET /api/autofix/proposals?groupId=GROUP_ID&severity=high

# Single proposal
GET /api/autofix/proposals/123
```

### Review Single
```bash
# Approve
POST /api/autofix/proposals/123/review
Body: { "action": "approve", "notes": "Looks good" }

# Reject
POST /api/autofix/proposals/123/review
Body: { "action": "reject", "notes": "Manual review needed" }
```

### Bulk Review
```bash
# Accept low-risk only (RECOMMENDED)
POST /api/autofix/proposals/accept-low-risk
Body: { "groupId": "...", "maxRiskLevel": "low" }

# Accept all (with confirmation)
POST /api/autofix/proposals/accept-all
Body: { "groupId": "...", "confirmRisky": true }

# Bulk review specific IDs
POST /api/autofix/proposals/bulk-review
Body: { "proposalIds": [1,2,3], "action": "approve" }
```

### Apply
```bash
POST /api/autofix/apply
Body: {
  "groupId": "...",
  "engineId": "nap-fixer",
  "clientId": "abc"
}
```

### Session Info
```bash
# Get session summary
GET /api/autofix/proposals/group/GROUP_ID

# Get statistics
GET /api/autofix/statistics?clientId=abc
```

---

## 🔧 Available Engines

```bash
# Modern engines (use these!)
"nap-fixer"              # NAP consistency
"content-optimizer-v2"   # Content quality
"schema-injector-v2"     # Schema markup

# Legacy engines (need refactoring)
"title-meta-optimizer"
"broken-link-detector"
# ... others
```

---

## 💡 Common Patterns

### Pattern 1: Safe Weekly Scan
```bash
# Monday: Detect
curl -X POST .../detect -d '{"engineId":"nap-fixer","clientId":"abc"}'

# Tuesday: Review & approve low-risk
curl -X POST .../accept-low-risk -d '{"groupId":"...","maxRiskLevel":"low"}'

# Wednesday: Apply
curl -X POST .../apply -d '{"groupId":"...","engineId":"nap-fixer","clientId":"abc"}'
```

### Pattern 2: Content Audit
```bash
# Detect content issues
curl -X POST .../detect -d '{"engineId":"content-optimizer-v2","clientId":"abc","options":{"limit":20}}'

# Get high-priority only
curl ".../proposals?groupId=...&status=pending&severity=high"

# Manual review each
curl -X POST .../proposals/1/review -d '{"action":"approve"}'
curl -X POST .../proposals/2/review -d '{"action":"reject","notes":"Intentional"}'

# Apply approved
curl -X POST .../apply -d '{"groupId":"...","engineId":"content-optimizer-v2","clientId":"abc"}'
```

### Pattern 3: Schema Injection
```bash
# Detect schema opportunities
curl -X POST .../detect -d '{"engineId":"schema-injector-v2","clientId":"abc"}'

# Accept all (schema is low-risk)
curl -X POST .../accept-all -d '{"groupId":"...","confirmRisky":true}'

# Apply
curl -X POST .../apply -d '{"groupId":"...","engineId":"schema-injector-v2","clientId":"abc"}'

# Verify
open https://search.google.com/test/rich-results
```

---

## 🎨 JavaScript Examples

### Node.js/Fetch
```javascript
// Detection
const detectRes = await fetch('http://localhost:4000/api/autofix/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    engineId: 'nap-fixer',
    clientId: 'acme-corp'
  })
});
const { groupId } = (await detectRes.json()).result;

// Accept low-risk
await fetch('http://localhost:4000/api/autofix/proposals/accept-low-risk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ groupId, maxRiskLevel: 'low' })
});

// Apply
const applyRes = await fetch('http://localhost:4000/api/autofix/apply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    groupId,
    engineId: 'nap-fixer',
    clientId: 'acme-corp'
  })
});
const result = await applyRes.json();
console.log(`Applied ${result.result.succeeded} fixes`);
```

### Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api/autofix',
  headers: { 'Content-Type': 'application/json' }
});

// Detection
const { data: detectData } = await api.post('/detect', {
  engineId: 'nap-fixer',
  clientId: 'acme-corp'
});
const groupId = detectData.result.groupId;

// Accept low-risk
await api.post('/proposals/accept-low-risk', {
  groupId,
  maxRiskLevel: 'low'
});

// Apply
const { data: applyData } = await api.post('/apply', {
  groupId,
  engineId: 'nap-fixer',
  clientId: 'acme-corp'
});
console.log(`Applied ${applyData.result.succeeded} fixes`);
```

---

## 📊 Response Formats

### Detection Response
```json
{
  "success": true,
  "result": {
    "detected": 47,
    "proposals": 47,
    "groupId": "nap-auto-fixer-client-123-1234567890",
    "sessionId": "abc-123"
  }
}
```

### Proposals Response
```json
{
  "success": true,
  "count": 47,
  "proposals": [
    {
      "id": 1,
      "fix_description": "Standardize phone...",
      "issue_description": "Inconsistent phone...",
      "expected_benefit": "Consistent phone...",
      "before_value": "(555) 123-4567",
      "after_value": "555-123-4567",
      "risk_level": "low",
      "severity": "high",
      "priority": 80,
      "status": "pending",
      "metadata": {
        "verificationSteps": ["Step 1", "Step 2"]
      }
    }
  ]
}
```

### Accept Low Risk Response
```json
{
  "success": true,
  "approved": 42,
  "skipped": 5,
  "total": 47,
  "message": "Approved 42 low-risk proposals. Skipped 5..."
}
```

### Apply Response
```json
{
  "success": true,
  "result": {
    "total": 42,
    "succeeded": 40,
    "failed": 2,
    "duration": 15000,
    "results": [...]
  }
}
```

---

## 🔍 Useful Filters

```bash
# Pending low-risk high-priority
GET /api/autofix/proposals?groupId=...&status=pending&riskLevel=low&severity=high

# All approved proposals
GET /api/autofix/proposals?groupId=...&status=approved

# High-risk items needing review
GET /api/autofix/proposals?groupId=...&status=pending&riskLevel=high

# Applied fixes (for verification)
GET /api/autofix/proposals?groupId=...&status=applied
```

---

## ⚡ Quick Commands

```bash
# Set these first
export API="http://localhost:4000/api/autofix"
export CLIENT="your-client-id"
export ENGINE="nap-fixer"

# Then use shortcuts
curl -X POST $API/detect -H "Content-Type: application/json" -d "{\"engineId\":\"$ENGINE\",\"clientId\":\"$CLIENT\"}"

# Save groupId, then
export GROUP="your-group-id-here"

curl "$API/proposals?groupId=$GROUP&status=pending"
curl -X POST $API/proposals/accept-low-risk -H "Content-Type: application/json" -d "{\"groupId\":\"$GROUP\"}"
curl -X POST $API/apply -H "Content-Type: application/json" -d "{\"groupId\":\"$GROUP\",\"engineId\":\"$ENGINE\",\"clientId\":\"$CLIENT\"}"
```

---

## 📞 Health Check

```bash
# Check API is running
curl http://localhost:4000/api/autofix/statistics

# Run full health check
node scripts/health-check.js
```

---

## 🎯 Error Handling

```javascript
try {
  const response = await fetch('http://localhost:4000/api/autofix/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ engineId: 'nap-fixer', clientId: 'abc' })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.error);
    return;
  }

  const data = await response.json();

  if (!data.success) {
    console.error('Operation failed:', data.error);
    return;
  }

  // Success!
  console.log('Proposals:', data.result.proposals);

} catch (error) {
  console.error('Network error:', error.message);
}
```

---

## 📱 Status Codes

- `200` - Success
- `400` - Bad request (missing parameters)
- `404` - Not found (engine/proposal doesn't exist)
- `500` - Server error (check logs)

---

## 🚀 Tips

1. **Always start with low-risk**: Use `accept-low-risk` first time
2. **Check proposals before applying**: Review at least a few samples
3. **Verify after applying**: Follow verification steps in metadata
4. **Monitor success rate**: Check `/statistics` endpoint regularly
5. **Use filters**: Don't review everything manually - filter first

---

**Need more details?** See `MANUAL_REVIEW_USAGE_GUIDE.md` for complete documentation.
