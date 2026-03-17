# Manual Review & Accept All - Usage Guide

## Overview
Your auto-fix engines now support a comprehensive manual review workflow with "Accept All" capabilities. This guide shows you how to use these features.

---

## 🚀 Quick Start

### Phase 1: Detection (Non-Destructive)
```bash
# Detect NAP issues (creates proposals for review)
POST http://localhost:4000/api/autofix/detect
Content-Type: application/json

{
  "engineId": "nap-fixer",
  "clientId": "your-client-id",
  "options": {}
}

# Response includes:
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

**Nothing has been changed yet - this is safe to run anytime!**

### Phase 2: Review Proposals
```bash
# Get all proposals for the session
GET http://localhost:4000/api/autofix/proposals?groupId=nap-auto-fixer-client-123-1234567890&status=pending

# Response shows each proposal with:
{
  "proposals": [
    {
      "id": 1,
      "fix_description": "Standardize phone number from \"(555) 123-4567\" to \"555-123-4567\"",
      "issue_description": "Inconsistent phone number format...",
      "expected_benefit": "Consistent phone formatting improves local SEO...",
      "before_value": "(555) 123-4567",
      "after_value": "555-123-4567",
      "risk_level": "low",
      "severity": "high",
      "priority": 80,
      "target_title": "Contact Us",
      "target_url": "https://site.com/contact",
      "diff_html": "<div class=\"diff\">...</div>",
      "metadata": {
        "verificationSteps": [
          "Check the updated page to see the new phone format",
          "Verify the number still dials correctly",
          "Confirm it matches your Google Business Profile",
          "Location: content field"
        ]
      }
    }
  ]
}
```

### Phase 3: Approve Proposals

**Option A: Review One-by-One**
```bash
# Approve individual proposal
POST http://localhost:4000/api/autofix/proposals/1/review
Content-Type: application/json

{
  "action": "approve",
  "notes": "Looks good",
  "reviewedBy": "john@example.com"
}

# Or reject
{
  "action": "reject",
  "notes": "This phone format is intentional"
}
```

**Option B: Accept Low Risk Only (Recommended)**
```bash
# Approve only low-risk proposals
POST http://localhost:4000/api/autofix/proposals/accept-low-risk
Content-Type: application/json

{
  "groupId": "nap-auto-fixer-client-123-1234567890",
  "maxRiskLevel": "low",
  "reviewedBy": "john@example.com"
}

# Response:
{
  "success": true,
  "approved": 42,
  "skipped": 5,
  "message": "Approved 42 low-risk proposals. Skipped 5 higher-risk proposals."
}
```

**Option C: Accept All (Use with Caution)**
```bash
# Accept all proposals (including high-risk)
POST http://localhost:4000/api/autofix/proposals/accept-all
Content-Type: application/json

{
  "groupId": "nap-auto-fixer-client-123-1234567890",
  "reviewedBy": "john@example.com"
}

# If high-risk proposals exist, you'll get a warning:
{
  "success": false,
  "requiresConfirmation": true,
  "highRiskCount": 3,
  "message": "Found 3 high-risk proposals. Set confirmRisky=true to proceed."
}

# Confirm to proceed:
{
  "groupId": "nap-auto-fixer-client-123-1234567890",
  "confirmRisky": true,
  "reviewedBy": "john@example.com"
}
```

**Option D: Bulk Approve by Criteria**
```bash
# Approve all proposals matching specific criteria
POST http://localhost:4000/api/autofix/proposals/bulk-review
Content-Type: application/json

{
  "proposalIds": [1, 2, 3, 4, 5],
  "action": "approve",
  "notes": "Bulk approved phone format fixes",
  "reviewedBy": "john@example.com"
}
```

### Phase 4: Apply Approved Fixes
```bash
# Apply all approved proposals
POST http://localhost:4000/api/autofix/apply
Content-Type: application/json

{
  "groupId": "nap-auto-fixer-client-123-1234567890",
  "engineId": "nap-fixer",
  "clientId": "your-client-id",
  "options": {}
}

# Response:
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

## 📋 Complete Workflow Examples

### Example 1: Safe "Accept Low Risk" Workflow
```bash
# 1. Detect issues
POST /api/autofix/detect
{ "engineId": "nap-fixer", "clientId": "client-123" }
# → Returns groupId: "group-xyz"

# 2. Review proposals (optional - just to see what was found)
GET /api/autofix/proposals?groupId=group-xyz&status=pending

# 3. Accept only low-risk proposals
POST /api/autofix/proposals/accept-low-risk
{ "groupId": "group-xyz", "maxRiskLevel": "low" }
# → Approves 42 proposals, skips 5 high-risk

# 4. Apply approved fixes
POST /api/autofix/apply
{ "groupId": "group-xyz", "engineId": "nap-fixer", "clientId": "client-123" }
# → Applies 42 fixes to WordPress

# 5. Verify changes
# Check the website and use verification steps from proposals
```

### Example 2: Manual Review Workflow
```bash
# 1. Detect issues
POST /api/autofix/detect
{ "engineId": "nap-fixer", "clientId": "client-123" }

# 2. Get proposals
GET /api/autofix/proposals?groupId=group-xyz&status=pending

# 3. Review each proposal one-by-one
POST /api/autofix/proposals/1/review
{ "action": "approve" }

POST /api/autofix/proposals/2/review
{ "action": "reject", "notes": "This is correct as-is" }

POST /api/autofix/proposals/3/review
{ "action": "approve" }

# ... continue for each proposal

# 4. Apply approved fixes
POST /api/autofix/apply
{ "groupId": "group-xyz", "engineId": "nap-fixer", "clientId": "client-123" }
```

### Example 3: Bulk Approve Similar Fixes
```bash
# 1. Detect issues
POST /api/autofix/detect
{ "engineId": "nap-fixer", "clientId": "client-123" }

# 2. Get proposals and filter by type
GET /api/autofix/proposals?groupId=group-xyz&status=pending

# 3. Identify proposals for phone format (IDs: 1,2,3,4,5)
#    and business name (IDs: 6,7,8)

# 4. Approve all phone format fixes at once
POST /api/autofix/proposals/bulk-review
{
  "proposalIds": [1, 2, 3, 4, 5],
  "action": "approve",
  "notes": "Phone format is correct"
}

# 5. Review business name changes individually
POST /api/autofix/proposals/6/review
{ "action": "approve" }

# 6. Apply approved fixes
POST /api/autofix/apply
{ "groupId": "group-xyz", "engineId": "nap-fixer", "clientId": "client-123" }
```

---

## 🎯 Understanding Proposals

Each proposal contains:

### Description Fields
- **`issue_description`**: What problem was found
- **`fix_description`**: What change will be made
- **`expected_benefit`**: Why this fix helps SEO

### Change Preview
- **`before_value`**: Current text
- **`after_value`**: Proposed text
- **`diff_html`**: Visual diff with highlighting

### Risk Assessment
- **`risk_level`**: `low`, `medium`, `high`, or `critical`
  - `low`: Safe text replacements (phone, email)
  - `medium`: Content changes that might affect readability
  - `high`: Structural changes or multiple page impacts
  - `critical`: Risky changes requiring careful review

- **`severity`**: How important this fix is for SEO
  - `low`: Minor inconsistency
  - `medium`: Notable issue
  - `high`: Significant SEO problem
  - `critical`: Major issue hurting rankings

### Priority
- **`priority`**: Score 0-100 (higher = more important)
- Combines severity, impact, and field importance

### Verification
- **`metadata.verificationSteps`**: Checklist for verifying the fix worked
- Follow these steps after applying fixes

---

## 🔍 Filtering Proposals

### By Status
```bash
GET /api/autofix/proposals?groupId=group-xyz&status=pending
GET /api/autofix/proposals?groupId=group-xyz&status=approved
GET /api/autofix/proposals?groupId=group-xyz&status=rejected
GET /api/autofix/proposals?groupId=group-xyz&status=applied
```

### By Risk Level
```bash
GET /api/autofix/proposals?groupId=group-xyz&riskLevel=low
GET /api/autofix/proposals?groupId=group-xyz&riskLevel=medium
GET /api/autofix/proposals?groupId=group-xyz&riskLevel=high
```

### By Severity
```bash
GET /api/autofix/proposals?groupId=group-xyz&severity=high
GET /api/autofix/proposals?groupId=group-xyz&severity=critical
```

### By Engine
```bash
GET /api/autofix/proposals?engineId=nap-fixer&status=pending
GET /api/autofix/proposals?engineId=content-optimizer&status=pending
```

### Combination Filters
```bash
GET /api/autofix/proposals?groupId=group-xyz&status=pending&riskLevel=low&severity=high
```

---

## 📊 Monitoring Progress

### View Review Session
```bash
GET /api/autofix/proposals/group/group-xyz

# Response includes summary:
{
  "session": {
    "groupId": "group-xyz",
    "engineName": "NAPAutoFixer",
    "totalProposals": 47,
    "approvedCount": 42,
    "rejectedCount": 3,
    "appliedCount": 40,
    "status": "in_progress",
    "createdAt": "2024-10-29T10:00:00Z"
  },
  "summary": {
    "pending": 2,
    "approved": 42,
    "rejected": 3,
    "applied": 40,
    "byRiskLevel": {
      "low": 40,
      "medium": 5,
      "high": 2
    },
    "bySeverity": {
      "high": 30,
      "medium": 15,
      "low": 2
    }
  }
}
```

### Get Statistics
```bash
GET /api/autofix/statistics?clientId=client-123

# Response:
{
  "totalProposals": 247,
  "totalApplied": 198,
  "successRate": 95.2,
  "byEngine": {
    "nap-fixer": { "total": 100, "applied": 95 },
    "content-optimizer": { "total": 147, "applied": 103 }
  }
}
```

---

## 🔒 Safety Features

### 1. Risk Assessment
Every proposal is automatically assessed for risk:
- Low risk: Safe to auto-approve
- Medium risk: Review recommended
- High risk: Careful review required

### 2. Confirmation for Risky Changes
"Accept All" requires explicit confirmation if high-risk proposals are present.

### 3. Reversible Tracking
Each proposal has a `reversible` flag indicating if it can be undone.

### 4. Backup Creation
(Future feature) Automatic backups before applying changes.

### 5. Detailed Logging
All actions are logged with:
- What changed
- When it changed
- Who approved it
- Success/failure status

---

## ✅ Verification Checklists

### After Applying NAP Fixes

**Phone Number Changes:**
1. Check the updated page to see the new phone format
2. Verify the number still dials correctly
3. Confirm it matches your Google Business Profile
4. Check footer, contact page, and about page

**Business Name Changes:**
1. Read the updated content to verify natural flow
2. Check that capitalization is consistent
3. Confirm it matches your official branding
4. Verify on footer, contact page, and about page

**Email Changes:**
1. Verify email address is correct and monitored
2. Check that links still work (mailto:)
3. Confirm it matches your preferred contact email

**Address Changes:**
1. Verify address matches Google Business Profile
2. Check that it includes city, state, and zip
3. Confirm formatting is consistent

### Tools for Verification
- **Google Business Profile**: Check NAP consistency
- **Google Search Console**: Monitor ranking changes
- **Manual Testing**: Click links, dial numbers
- **Site Search**: Search for old values to find missed items

---

## 🐛 Troubleshooting

### "No pending proposals found"
- You may have already approved/rejected all proposals
- Run detection again to find new issues
- Check if proposals have expired (7-day default)

### "Engine not found"
- Verify engineId spelling (e.g., "nap-fixer" not "nap-auto-fixer")
- Check that the engine file exists
- Ensure it's listed in the engineMap in autofix-review-routes.js

### "Proposal not found"
- Proposal may have expired
- Check if you're using the correct proposal ID
- Verify the groupId is correct

### Fixes Failed to Apply
- Check WordPress credentials are valid
- Verify WordPress REST API is enabled
- Ensure content still exists (wasn't deleted)
- Check proposal details in results for specific errors

### How to Re-detect After Changes
```bash
# If you made manual changes and want to re-scan:
POST /api/autofix/detect
{ "engineId": "nap-fixer", "clientId": "client-123" }

# This creates a new group with fresh proposals
```

---

## 🎨 Best Practices

### 1. Start with Low Risk
```bash
# Always start with low-risk only
POST /api/autofix/proposals/accept-low-risk
{ "groupId": "...", "maxRiskLevel": "low" }
```

### 2. Review High Priority First
```bash
# Get high-priority proposals
GET /api/autofix/proposals?groupId=...&status=pending

# Sort by priority (highest first) in your UI
# Review and approve/reject manually
```

### 3. Test on Staging First
- Run detection on production
- Review proposals
- Apply to staging environment first
- Verify changes work correctly
- Then apply to production

### 4. Use Bulk Actions Wisely
- Only bulk approve similar changes (e.g., all phone format fixes)
- Review at least one example before bulk approving
- Don't bulk approve mixed change types

### 5. Monitor After Application
- Check Google Search Console for ranking changes
- Monitor user feedback
- Watch for broken links or formatting issues
- Re-run detection periodically to catch new issues

### 6. Document Your Decisions
```bash
# Always include notes when rejecting
POST /api/autofix/proposals/1/review
{
  "action": "reject",
  "notes": "This variation is intentional for local branding"
}
```

---

## 📱 Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function reviewAndApplyFixes(clientId) {
  // 1. Detect
  const detectRes = await axios.post('http://localhost:4000/api/autofix/detect', {
    engineId: 'nap-fixer',
    clientId
  });

  const groupId = detectRes.data.result.groupId;
  console.log(`Found ${detectRes.data.result.detected} issues`);

  // 2. Accept low-risk
  const approveRes = await axios.post('http://localhost:4000/api/autofix/proposals/accept-low-risk', {
    groupId,
    maxRiskLevel: 'low'
  });

  console.log(`Approved ${approveRes.data.approved} low-risk proposals`);

  // 3. Apply
  const applyRes = await axios.post('http://localhost:4000/api/autofix/apply', {
    groupId,
    engineId: 'nap-fixer',
    clientId
  });

  console.log(`Applied ${applyRes.data.result.succeeded} fixes successfully`);

  return applyRes.data;
}
```

### cURL
```bash
#!/bin/bash

CLIENT_ID="your-client-id"
BASE_URL="http://localhost:4000/api/autofix"

# Detect
DETECT_RESPONSE=$(curl -s -X POST "$BASE_URL/detect" \
  -H "Content-Type: application/json" \
  -d "{\"engineId\":\"nap-fixer\",\"clientId\":\"$CLIENT_ID\"}")

GROUP_ID=$(echo $DETECT_RESPONSE | jq -r '.result.groupId')
echo "Group ID: $GROUP_ID"

# Accept low-risk
curl -X POST "$BASE_URL/proposals/accept-low-risk" \
  -H "Content-Type: application/json" \
  -d "{\"groupId\":\"$GROUP_ID\",\"maxRiskLevel\":\"low\"}"

# Apply
curl -X POST "$BASE_URL/apply" \
  -H "Content-Type: application/json" \
  -d "{\"groupId\":\"$GROUP_ID\",\"engineId\":\"nap-fixer\",\"clientId\":\"$CLIENT_ID\"}"
```

---

## 🚀 Next Steps

1. **Try the workflow**: Start with a small test client
2. **Review the results**: Check that descriptions are helpful
3. **Integrate into your UI**: Build a review dashboard (see MANUAL_REVIEW_IMPLEMENTATION_PLAN.md)
4. **Expand to other engines**: Content Optimizer, Title/Meta Optimizer, etc.
5. **Add automation**: Set up scheduled detection runs
6. **Monitor impact**: Track SEO improvements from fixes

---

## 📚 Related Documentation

- **MANUAL_REVIEW_IMPLEMENTATION_PLAN.md**: Technical implementation details
- **API_REFERENCE.md**: Complete API endpoint documentation
- **ARCHITECTURE.md**: System architecture overview
- **TROUBLESHOOTING.md**: Common issues and solutions

---

## 💡 Tips

- **Start conservative**: Use "Accept Low Risk" until you're comfortable
- **Review high-priority items**: Even if low risk, review high-priority fixes
- **Use verification steps**: Follow the checklist in each proposal
- **Document patterns**: If you keep rejecting similar items, add notes
- **Regular scans**: Run detection monthly to catch new inconsistencies
- **Combine engines**: Run multiple engines and review all at once

---

## ❓ FAQ

**Q: Can I undo applied fixes?**
A: Currently, you'll need to manually revert in WordPress. Automatic rollback is planned.

**Q: How long do proposals last?**
A: Proposals expire after 7 days by default.

**Q: Can I filter out certain types of changes?**
A: Yes, use the API filters or reject proposals with notes to create patterns.

**Q: What happens if a fix fails?**
A: The specific fix is marked as failed, logged, and other fixes continue. Check results for details.

**Q: Can I see what was actually changed?**
A: Yes, check the proposal's `diff_html` field for a visual diff, or compare before_value and after_value.

**Q: Is this safe to use on production sites?**
A: Yes, but we recommend testing on staging first. Start with "Accept Low Risk" for safety.

---

**Ready to get started?** Run your first detection now! 🎉
