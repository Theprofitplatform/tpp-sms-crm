# Auto-Fix Manual Review System 🚀

A complete manual review and bulk approval system for SEO auto-fix engines with rich descriptions, risk assessment, and verification workflows.

[![Status](https://img.shields.io/badge/status-production--ready-green)]()
[![Engines](https://img.shields.io/badge/engines-3%20refactored-blue)]()
[![API](https://img.shields.io/badge/API-complete-success)]()
[![UI](https://img.shields.io/badge/UI-react%20component-blue)]()

---

## 🎯 Overview

This system transforms auto-fix engines from immediate auto-apply to a safe three-phase workflow:

```
📍 DETECT → 👀 REVIEW → ✅ APPLY
```

**Before:** Changes applied immediately with no preview
**After:** Review every change with rich descriptions before applying

---

## ✨ Key Features

### 🔒 **Safety First**
- Nothing changes until you explicitly approve
- Visual before/after diffs
- Automatic backups (via engine base)
- Rollback capability (planned)

### 📝 **Rich Descriptions**
Every proposal includes:
- What's wrong (issue description)
- What will change (fix description)
- Why it helps (expected benefit)
- How to verify (step-by-step checklist)

### 🎚️ **Risk Assessment**
- Automatic risk calculation (low/medium/high/critical)
- Severity ratings (low/medium/high/critical)
- Priority scores (0-100)
- Smart filtering by risk level

### 🚀 **Multiple Approval Strategies**
- **Manual Review** - One-by-one approval with notes
- **Accept Low Risk** - Bulk approve only low-risk items
- **Accept All** - Approve everything (with warnings)
- **Filtered Bulk** - Approve by criteria (type, risk, severity)

### 🎨 **Beautiful UI**
- React component ready to drop in
- Filter by status, risk level, severity
- Expandable verification steps
- Color-coded badges and status

---

## 🚀 Quick Start (30 Seconds)

```bash
# 1. Test the workflow
node test-manual-review-workflow.js

# 2. Try the API
curl -X POST http://localhost:4000/api/autofix/detect \
  -H "Content-Type: application/json" \
  -d '{"engineId": "nap-fixer", "clientId": "your-client-id"}'

# 3. Follow the checklist
# Open GET_STARTED_CHECKLIST.md for step-by-step guide
```

---

## 📦 What's Included

### ✅ Refactored Engines (Production-Ready)

| Engine | Description | Risk Levels | Status |
|--------|-------------|-------------|--------|
| **nap-fixer** | NAP consistency (phone, business name, email, address) | Low-Medium | ✅ Ready |
| **content-optimizer-v2** | Image alt text, external links, headings, readability | Low-Medium | ✅ Ready |
| **schema-injector-v2** | LocalBusiness & Article schema markup | Low | ✅ Ready |

### 🔧 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/autofix/detect` | POST | Run detection (creates proposals) |
| `/api/autofix/proposals` | GET | Get proposals with filters |
| `/api/autofix/proposals/:id/review` | POST | Review single proposal |
| `/api/autofix/proposals/bulk-review` | POST | Review multiple proposals |
| `/api/autofix/proposals/accept-low-risk` | POST | Accept only low-risk ⭐ |
| `/api/autofix/proposals/accept-all` | POST | Accept all (with warnings) ⭐ |
| `/api/autofix/apply` | POST | Apply approved proposals |

⭐ = New endpoints added by this system

### 🎨 UI Components

- `ProposalReviewDashboard.jsx` - Complete review interface
- `ProposalReviewDashboard.css` - Modern, responsive styling

### 📚 Documentation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **GET_STARTED_CHECKLIST.md** | Quick start guide | 5 min |
| **IMPLEMENTATION_COMPLETE.md** | Complete overview & examples | 15 min |
| **MANUAL_REVIEW_USAGE_GUIDE.md** | Full API docs & workflows | 30 min |
| **MANUAL_REVIEW_FEATURES_SUMMARY.md** | Feature list & testing | 10 min |
| **MANUAL_REVIEW_IMPLEMENTATION_PLAN.md** | Technical architecture | 20 min |

---

## 🎓 Usage Examples

### Example 1: Basic Workflow (Most Common)

```javascript
// Step 1: Detect issues
const detectResponse = await fetch('http://localhost:4000/api/autofix/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    engineId: 'nap-fixer',
    clientId: 'acme-corp'
  })
});
const { groupId } = (await detectResponse.json()).result;

// Step 2: Accept low-risk (recommended)
await fetch('http://localhost:4000/api/autofix/proposals/accept-low-risk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ groupId, maxRiskLevel: 'low' })
});

// Step 3: Apply approved fixes
await fetch('http://localhost:4000/api/autofix/apply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    groupId,
    engineId: 'nap-fixer',
    clientId: 'acme-corp'
  })
});
```

### Example 2: Using React UI

```jsx
import ProposalReviewDashboard from './components/ProposalReviewDashboard';

function AutoFixPage() {
  const [groupId, setGroupId] = useState(null);

  const runDetection = async () => {
    const response = await fetch('/api/autofix/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engineId: 'nap-fixer',
        clientId: 'acme-corp'
      })
    });
    const data = await response.json();
    setGroupId(data.result.groupId);
  };

  return (
    <div>
      <button onClick={runDetection}>Scan for Issues</button>

      {groupId && (
        <ProposalReviewDashboard
          groupId={groupId}
          clientId="acme-corp"
          engineId="nap-fixer"
        />
      )}
    </div>
  );
}
```

### Example 3: Manual Review

```bash
# Get all proposals
curl "http://localhost:4000/api/autofix/proposals?groupId=GROUP_ID&status=pending"

# Review each one
curl -X POST http://localhost:4000/api/autofix/proposals/1/review \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "notes": "Looks good"}'

curl -X POST http://localhost:4000/api/autofix/proposals/2/review \
  -H "Content-Type: application/json" \
  -d '{"action": "reject", "notes": "This variation is intentional"}'
```

---

## 📊 Proposal Format

Each proposal contains:

```json
{
  "id": 1,
  "fix_description": "Standardize phone number from \"(555) 123-4567\" to \"555-123-4567\"",
  "issue_description": "Inconsistent phone number format...",
  "expected_benefit": "Consistent phone formatting improves local SEO...",

  "before_value": "(555) 123-4567",
  "after_value": "555-123-4567",
  "diff_html": "<div class='diff'>...</div>",

  "risk_level": "low",
  "severity": "high",
  "priority": 80,

  "target_type": "page",
  "target_id": 42,
  "target_title": "Contact Us",
  "target_url": "https://example.com/contact",

  "status": "pending",

  "metadata": {
    "verificationSteps": [
      "Check the updated page to see the new phone format",
      "Verify the number still dials correctly",
      "Confirm it matches your Google Business Profile"
    ],
    "changeType": "text-replacement",
    "napField": "phone"
  }
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User / UI                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  • /detect - Create proposals                               │
│  • /proposals - Get/filter proposals                        │
│  • /accept-low-risk - Bulk approve                          │
│  • /apply - Execute approved fixes                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Proposal Service                            │
│  • Save proposals to database                               │
│  • Track status (pending/approved/rejected/applied)         │
│  • Generate visual diffs                                    │
│  • Create review sessions                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                Auto-Fix Engine Base                          │
│  • detectIssues() - Find problems                           │
│  • createProposals() - Generate proposal objects            │
│  • applyFix() - Execute single approved fix                 │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    ┌──────────┐  ┌─────────┐  ┌──────────┐
    │   NAP    │  │ Content │  │  Schema  │
    │  Fixer   │  │Optimizer│  │ Injector │
    └──────────┘  └─────────┘  └──────────┘
```

---

## 🛠️ Available Engines

### NAP Fixer (`nap-fixer`)

**What it fixes:**
- Phone number format variations
- Business name capitalization inconsistencies
- Email address variations
- Address format differences

**Risk Level:** Low-Medium
**Auto-Fixable:** Yes
**Verification:** Check contact page, footer, about page

**Example Proposal:**
```
Issue: Phone shows as "(555) 123-4567" in some places, "555-123-4567" in others
Fix: Standardize to "555-123-4567" everywhere
Benefit: Google prefers consistent NAP data for local SEO
Risk: Low (text replacement only)
```

### Content Optimizer v2 (`content-optimizer-v2`)

**What it fixes:**
- Missing image alt text
- External links without security attributes
- Heading hierarchy issues (H1 in content, H3 without H2)
- Internal linking opportunities (suggestions only)
- Readability issues (suggestions only)
- Keyword density problems (suggestions only)

**Risk Level:** Low-Medium
**Auto-Fixable:** Partial (images, links, headings yes; content changes need manual)
**Verification:** Inspect elements, click links, read content

**Example Proposals:**
```
Issue: Image missing alt text
Fix: Add alt="Our team at the office"
Benefit: Improves accessibility and image SEO
Risk: Low

Issue: External link missing noopener
Fix: Add rel="noopener noreferrer"
Benefit: Prevents security vulnerabilities
Risk: Low
```

### Schema Injector v2 (`schema-injector-v2`)

**What it fixes:**
- Missing LocalBusiness schema on homepage
- Outdated business information in existing schema
- Missing Article schema on blog posts

**Risk Level:** Low (invisible to users)
**Auto-Fixable:** Yes
**Verification:** Google Rich Results Test, view page source

**Example Proposal:**
```
Issue: Homepage missing LocalBusiness schema
Fix: Add JSON-LD markup with business info
Benefit: Enables rich snippets: map, hours, ratings, contact info
Risk: Low (only affects search engines)
```

---

## 🔍 Filtering & Querying

### By Status
```bash
GET /api/autofix/proposals?groupId=...&status=pending
GET /api/autofix/proposals?groupId=...&status=approved
GET /api/autofix/proposals?groupId=...&status=rejected
GET /api/autofix/proposals?groupId=...&status=applied
```

### By Risk Level
```bash
GET /api/autofix/proposals?groupId=...&riskLevel=low
GET /api/autofix/proposals?groupId=...&riskLevel=medium
GET /api/autofix/proposals?groupId=...&riskLevel=high
```

### By Severity
```bash
GET /api/autofix/proposals?groupId=...&severity=high
GET /api/autofix/proposals?groupId=...&severity=critical
```

### Combined
```bash
GET /api/autofix/proposals?groupId=...&status=pending&riskLevel=low&severity=high
```

---

## 📈 Monitoring & Analytics

### Get Session Summary
```bash
GET /api/autofix/proposals/group/GROUP_ID
```

Returns:
```json
{
  "session": {
    "totalProposals": 47,
    "approvedCount": 42,
    "rejectedCount": 3,
    "appliedCount": 40,
    "status": "in_progress"
  },
  "summary": {
    "pending": 2,
    "byRiskLevel": { "low": 40, "medium": 5, "high": 2 },
    "bySeverity": { "high": 30, "medium": 15, "low": 2 }
  }
}
```

### Get Statistics
```bash
GET /api/autofix/statistics?clientId=CLIENT_ID
```

Returns:
```json
{
  "totalProposals": 247,
  "totalApplied": 198,
  "successRate": 95.2,
  "byEngine": {
    "nap-fixer": { "total": 100, "applied": 95 },
    "content-optimizer-v2": { "total": 147, "applied": 103 }
  }
}
```

---

## 🎯 Best Practices

### 1. Start Conservative
```bash
# First time: Only approve low-risk
POST /api/autofix/proposals/accept-low-risk
{ "groupId": "...", "maxRiskLevel": "low" }
```

### 2. Review High Priority First
```bash
# Get high-priority items
GET /api/autofix/proposals?groupId=...&status=pending

# Sort by priority (highest first) in your code
proposals.sort((a, b) => b.priority - a.priority)
```

### 3. Test on Staging
- Run detection on production
- Review proposals
- Apply to staging first
- Verify, then apply to production

### 4. Use Bulk Actions Wisely
```bash
# Good: Bulk approve similar fixes
POST /api/autofix/proposals/bulk-review
{ "proposalIds": [1,2,3], "action": "approve" }

# Better: Use filtered bulk approval
POST /api/autofix/proposals/accept-low-risk
{ "groupId": "...", "maxRiskLevel": "low" }
```

### 5. Always Verify
- Follow verification steps in each proposal
- Check a sample of pages visually
- Monitor Google Search Console for impacts
- Run detection again after 1 week

---

## 🔐 Security

### Safety Features
- ✅ Nothing changes without explicit approval
- ✅ All actions logged with user attribution
- ✅ Proposals expire after 7 days (prevents stale changes)
- ✅ High-risk items require confirmation
- ✅ Backups created before applying (engine-level)

### Permissions
- API endpoints require authentication (implement auth as needed)
- Track `reviewedBy` field for audit trail
- Database access restricted to service layer

---

## 🚨 Troubleshooting

### Problem: "No proposals found"
**Solutions:**
- Check that detection ran successfully (groupId returned)
- Verify client configuration is correct
- Ensure WordPress API credentials are valid
- Look for errors in server logs

### Problem: "Engine not found"
**Solutions:**
- Verify engineId spelling (e.g., "nap-fixer" not "NAP-Fixer")
- Check engine is in engineMap (`src/api/autofix-review-routes.js:541`)
- Ensure engine file exists in correct location

### Problem: "Apply does nothing"
**Solutions:**
- Check that proposals are approved (status="approved")
- Verify groupId matches approved proposals
- Check WordPress credentials are still valid
- Look at apply response for detailed errors

### Problem: "UI not loading"
**Solutions:**
- Verify ProposalReviewDashboard is imported correctly
- Check that CSS file is loaded
- Ensure props (groupId, clientId, engineId) are passed
- Check browser console for errors

---

## 📅 Maintenance

### Daily
- Monitor apply success rates
- Check for failed proposals

### Weekly
- Review rejected proposals for patterns
- Clean up old expired proposals
- Run health check script

### Monthly
- Analyze which fix types have highest impact
- Review and update risk assessments
- Refactor additional engines as needed

---

## 🗺️ Roadmap

### ✅ Completed (v1.0)
- [x] Three-phase workflow (detect/review/apply)
- [x] Rich proposal descriptions
- [x] Risk assessment
- [x] Accept All / Accept Low Risk
- [x] React UI component
- [x] 3 refactored engines
- [x] Complete documentation

### 🔄 In Progress (v1.1)
- [ ] Rollback API endpoint
- [ ] Real-time updates (WebSockets)
- [ ] Additional engines (Title/Meta, Broken Links)

### 📋 Planned (v2.0)
- [ ] Approval templates (auto-approve patterns)
- [ ] Email/Slack notifications
- [ ] Analytics dashboard
- [ ] Multi-user collaboration
- [ ] Export proposals to CSV/PDF
- [ ] AI-powered risk assessment

---

## 🤝 Contributing

### Refactoring More Engines

Want to add review workflow to other engines? Follow this pattern:

```javascript
import { AutoFixEngineBase } from './engine-base.js';

export class YourEngine extends AutoFixEngineBase {
  // 1. Implement detectIssues() - returns proposal objects
  async detectIssues(options = {}) {
    const proposals = [];
    // Your detection logic...
    return proposals;
  }

  // 2. Implement applyFix() - applies one approved proposal
  async applyFix(proposal, options = {}) {
    // Your apply logic...
    return { success: true };
  }
}
```

See `MANUAL_REVIEW_IMPLEMENTATION_PLAN.md` for complete refactoring guide.

---

## 📞 Support

### Documentation
- **Quick Start:** `GET_STARTED_CHECKLIST.md`
- **API Reference:** `MANUAL_REVIEW_USAGE_GUIDE.md`
- **Architecture:** `MANUAL_REVIEW_IMPLEMENTATION_PLAN.md`
- **Examples:** `examples/simple-review-workflow.js`

### Testing
- **Test Script:** `node test-manual-review-workflow.js`
- **Health Check:** `node scripts/health-check.js` (coming soon)

---

## 📊 Stats

- **3** Production-ready engines
- **8** API endpoints (2 new)
- **1** React UI component
- **5** Comprehensive guides (600+ lines)
- **2** Test scripts
- **100%** Documentation coverage

---

## 🎉 Get Started Now!

```bash
# 1. Read the checklist
cat GET_STARTED_CHECKLIST.md

# 2. Test the workflow
node test-manual-review-workflow.js

# 3. Try your first detection
curl -X POST http://localhost:4000/api/autofix/detect \
  -H "Content-Type: application/json" \
  -d '{"engineId": "nap-fixer", "clientId": "your-client-id"}'

# 4. Start using it!
```

---

## 📄 License

Part of the SEO Expert system. See main project LICENSE.

---

## 🙏 Acknowledgments

Built on top of:
- AutoFixEngineBase framework
- WordPress REST API
- React
- Better-SQLite3

---

**Ready to improve your SEO workflow with confidence?** Start with `GET_STARTED_CHECKLIST.md`! 🚀
