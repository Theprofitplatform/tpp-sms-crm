# Get Started with Manual Review Workflow - Quick Checklist ✅

## 🎯 What You Have Now

You have a complete manual review system with:
- ✅ **3 Refactored Engines** (NAP Fixer, Content Optimizer v2, Schema Injector v2)
- ✅ **API Endpoints** (Accept All, Accept Low Risk, Bulk Review)
- ✅ **React UI Component** (ProposalReviewDashboard)
- ✅ **Complete Documentation** (4 comprehensive guides)
- ✅ **Test Script** (Verify workflow works)
- ✅ **Integration Examples** (Copy & paste ready)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Your Server
```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
npm start
```

### Step 2: Test the Workflow
```bash
# Open another terminal
node test-manual-review-workflow.js
```

This will:
- ✅ Test detection (finds issues)
- ✅ Show proposal format (with rich descriptions)
- ✅ Test approval strategies
- ✅ Verify the complete workflow

**Expected output:** You'll see proposals with detailed descriptions, risk levels, and verification steps.

### Step 3: Try the API
```bash
# Detect NAP issues
curl -X POST http://localhost:4000/api/autofix/detect \
  -H "Content-Type: application/json" \
  -d '{"engineId": "nap-fixer", "clientId": "your-client-id"}'

# Save the groupId from response, then:
curl "http://localhost:4000/api/autofix/proposals?groupId=YOUR_GROUP_ID&status=pending"
```

**Expected output:** JSON array of proposals with fix_description, risk_level, verification_steps, etc.

---

## 📋 Complete Checklist

### Prerequisites
- [ ] Server is running (`npm start`)
- [ ] Database has proposal tables (check `src/database/migrations/001_add_proposal_tables.js`)
- [ ] At least one client configured (in `clients/` directory)
- [ ] WordPress REST API is accessible

### Testing (Do This First)
- [ ] Run test script: `node test-manual-review-workflow.js`
- [ ] Verify proposals are created in database
- [ ] Check that proposals have rich descriptions
- [ ] Confirm risk levels are assigned (low/medium/high)
- [ ] Verify verification steps are included

### Available Engines (Choose Your Engine)

**Modern Engines (✅ READY TO USE)**
- [ ] `nap-fixer` - NAP consistency fixes
- [ ] `content-optimizer-v2` - Content quality fixes
- [ ] `schema-injector-v2` - Schema markup

**Legacy Engines (⚠️ NEED REFACTORING)**
- [ ] `title-meta-optimizer` - Needs refactoring
- [ ] `broken-link-detector` - Needs refactoring
- [ ] Others - Needs refactoring

### API Workflow Testing

**Step 1: Detection**
- [ ] POST `/api/autofix/detect` with engineId and clientId
- [ ] Receive groupId in response
- [ ] Confirm proposals created (check database or API)

**Step 2: Review**
- [ ] GET `/api/autofix/proposals?groupId=...&status=pending`
- [ ] Review proposal format (has fix_description, risk_level, etc.)
- [ ] Check verification steps are present

**Step 3: Approval**

Choose ONE strategy:

- [ ] **Manual**: POST `/api/autofix/proposals/:id/review` for each
- [ ] **Low Risk**: POST `/api/autofix/proposals/accept-low-risk`
- [ ] **Accept All**: POST `/api/autofix/proposals/accept-all`

**Step 4: Application**
- [ ] POST `/api/autofix/apply` with groupId, engineId, clientId
- [ ] Check result (succeeded count, failed count)
- [ ] Verify changes on WordPress site

### UI Integration (Optional)

- [ ] Import ProposalReviewDashboard component
- [ ] Pass groupId, clientId, engineId as props
- [ ] Test in browser (filters, approve/reject, apply)
- [ ] Verify styling works (ProposalReviewDashboard.css loaded)

### Verification After Applying

For **NAP Fixes**:
- [ ] Check contact page for consistent phone format
- [ ] Verify footer has consistent business name
- [ ] Confirm email addresses are standardized
- [ ] Compare with Google Business Profile

For **Content Fixes**:
- [ ] Inspect images for alt text (right-click → Inspect)
- [ ] Click external links to verify noopener attribute
- [ ] Check heading hierarchy (H1 → H2 → H3)
- [ ] Read content to ensure natural flow

For **Schema Fixes**:
- [ ] Test with Google Rich Results Test
- [ ] View page source for JSON-LD script tags
- [ ] Verify business information is accurate
- [ ] Check for validation errors

---

## 🎓 Learning Path

### Day 1: Understand the System
- [ ] Read `MANUAL_REVIEW_FEATURES_SUMMARY.md` (10 min)
- [ ] Run test script to see it in action (5 min)
- [ ] Review API examples in `MANUAL_REVIEW_USAGE_GUIDE.md` (15 min)

### Day 2: Try Basic Workflow
- [ ] Run detection on test client
- [ ] Review proposals manually
- [ ] Use "Accept Low Risk" endpoint
- [ ] Apply 1-2 fixes and verify

### Day 3: Integrate UI (Optional)
- [ ] Add ProposalReviewDashboard to your app
- [ ] Test filters and bulk actions
- [ ] Customize styling as needed

### Day 4: Production Use
- [ ] Run on production client (start with NAP Fixer)
- [ ] Use "Accept Low Risk" for safety
- [ ] Verify results on live site
- [ ] Monitor for 24-48 hours

---

## 🔍 Troubleshooting Checklist

### "No proposals found"
- [ ] Check that detection ran successfully (look for groupId)
- [ ] Verify client configuration is correct
- [ ] Check WordPress API credentials
- [ ] Look for errors in server logs

### "Engine not found"
- [ ] Verify engineId is correct (e.g., "nap-fixer" not "nap-auto-fixer")
- [ ] Check engine is in engineMap (`src/api/autofix-review-routes.js:540`)
- [ ] Ensure engine file exists in correct location

### "Proposals not showing descriptions"
- [ ] Verify you're using v2 engines (nap-fixer, content-optimizer-v2, schema-injector-v2)
- [ ] Check proposal metadata field is not null
- [ ] Look at raw database to confirm data exists

### "Apply fails with errors"
- [ ] Check WordPress credentials are valid
- [ ] Verify WordPress REST API is enabled
- [ ] Ensure content still exists (wasn't deleted)
- [ ] Check error details in apply response

---

## 📊 Success Metrics

You'll know it's working when:
- [x] Detection creates proposals with groupId
- [x] Proposals have fix_description, issue_description, expected_benefit
- [x] Risk levels are assigned (low/medium/high)
- [x] Verification steps are included in metadata
- [x] "Accept Low Risk" filters correctly
- [x] Apply processes only approved proposals
- [x] Changes appear on WordPress site
- [x] UI component loads and functions

---

## 🎯 Recommended First Steps

**If you want to test quickly (5 minutes)**:
1. Run `node test-manual-review-workflow.js`
2. See the output
3. Done!

**If you want to try the API (15 minutes)**:
1. Run detection: `curl -X POST .../detect`
2. Get proposals: `curl .../proposals?groupId=...`
3. Accept low risk: `curl -X POST .../accept-low-risk`
4. Apply: `curl -X POST .../apply`

**If you want to use the UI (30 minutes)**:
1. Import ProposalReviewDashboard component
2. Pass groupId from detection
3. Test in browser
4. Apply fixes via UI

**If you want production use (1 hour)**:
1. Run detection on real client
2. Review proposals carefully
3. Accept low-risk only (first time)
4. Apply and verify on site
5. Monitor for issues

---

## 📚 Documentation Quick Links

- **`GET_STARTED_CHECKLIST.md`** (this file) - Quick start guide
- **`IMPLEMENTATION_COMPLETE.md`** - Complete overview & examples
- **`MANUAL_REVIEW_FEATURES_SUMMARY.md`** - Feature list & testing
- **`MANUAL_REVIEW_USAGE_GUIDE.md`** - Full API docs & workflows
- **`MANUAL_REVIEW_IMPLEMENTATION_PLAN.md`** - Technical architecture

---

## 🆘 Need Help?

### Check These First:
1. Server logs - Look for error messages
2. Database - Query `autofix_proposals` table directly
3. WordPress API - Test with curl or Postman
4. Documentation - Full examples in MANUAL_REVIEW_USAGE_GUIDE.md

### Common Issues:
- **No groupId returned**: Detection failed, check logs
- **Empty proposals array**: No issues found (good!)  or filters are too restrictive
- **Apply does nothing**: No approved proposals in that group
- **UI not loading**: Check that component is imported correctly

---

## ✨ You're Ready!

Once you've checked off the "Testing" section above, you're ready to use the manual review system in production!

**Start with**: NAP Fixer on a test client → Review proposals → Accept Low Risk → Apply → Verify

**Then expand to**: Content Optimizer v2 → Schema Injector v2 → Eventually refactor other engines

Good luck! 🚀
