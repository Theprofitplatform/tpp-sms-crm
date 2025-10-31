# 🚀 START HERE: Auto-Fix Manual Review Implementation

## Quick Navigation

📋 **[Architecture Plan](./AUTOFIX_MANUAL_REVIEW_INTEGRATION_PLAN.md)** - High-level design and concepts  
📖 **[Implementation Guide](./AUTOFIX_MANUAL_REVIEW_IMPLEMENTATION_GUIDE.md)** - Step-by-step development guide

---

## What We're Building

Add manual review capability to the auto-fix system so users can:
- **Review** detected issues before applying fixes
- **Approve/Reject** changes individually or in bulk
- **Preview** exact before/after changes
- **Apply** only approved changes to websites
- **Track** what was changed and when

---

## Current vs New Flow

### Current (Direct Apply)
```
Run Engine → Detect & Apply Immediately → Done
```
❌ No review step  
❌ All-or-nothing  
❌ Can't preview changes

### New (Manual Review)
```
Run Detection → Review Proposals → Approve/Reject → Apply Approved → Done
```
✅ Review before applying  
✅ Granular control  
✅ Preview all changes  
✅ Safer & more transparent

---

## Quick Start (3 Commands)

### 1. Run Database Migration
```bash
node src/database/migrations/001_add_proposal_tables.js up
```

### 2. Test the System
```bash
node test-manual-review-workflow.js
```

### 3. Start Dashboard
```bash
npm run dev
```

Then visit: `http://localhost:5173/autofix/review`

---

## Implementation Phases

### ✅ Phase 1: Database Foundation (2 days)
- Create 4 new tables for proposals
- Add indexes for performance
- Run migrations

**Start Here**: `src/database/migrations/001_add_proposal_tables.js`

### ✅ Phase 2: Service Layer (3 days)
- Proposal management service
- Diff generator for visualizing changes
- Base engine class with two-phase execution

**Key Files**:
- `src/services/proposal-service.js`
- `src/services/proposal-diff-generator.js`
- `src/automation/auto-fixers/engine-base.js`

### ✅ Phase 3: API Endpoints (2 days)
- REST API for proposals
- Review endpoints
- Detection & application endpoints

**File**: `src/api/autofix-review-routes.js`

### ✅ Phase 4: Engine Refactoring (3-4 days)
- Update NAP Fixer to support two-phase
- Update 2 more engines
- Test detect & apply separately

**Files to Update**:
- `src/automation/auto-fixers/nap-fixer.js`
- `src/automation/auto-fixers/content-optimizer.js`
- `src/automation/auto-fixers/title-meta-optimizer.js`

### ✅ Phase 5: Dashboard UI (4-5 days)
- Review page with filtering
- Proposal cards with diff viewer
- Bulk actions
- Statistics dashboard

**New Components**:
- `dashboard/src/pages/AutoFixReviewPage.jsx`
- `dashboard/src/components/ProposalCard.jsx`

### ✅ Phase 6: Testing & Integration (3 days)
- Integration tests
- End-to-end testing
- Performance optimization
- Documentation

**Test File**: `test-manual-review-workflow.js`

---

## Total Timeline

**17-19 days** (3-4 weeks for complete implementation)

```
Week 1: Database + Services + API
Week 2: Engine Refactoring
Week 3: Dashboard UI
Week 4: Testing & Deployment
```

---

## File Changes Summary

### New Files (11)
```
src/database/migrations/001_add_proposal_tables.js
src/services/proposal-service.js
src/services/proposal-diff-generator.js
src/automation/auto-fixers/engine-base.js
src/api/autofix-review-routes.js
dashboard/src/pages/AutoFixReviewPage.jsx
dashboard/src/components/ProposalCard.jsx
dashboard/src/components/ProposalDiffViewer.jsx
dashboard/src/components/BulkReviewActions.jsx
dashboard/src/components/ProposalFilters.jsx
test-manual-review-workflow.js
```

### Files to Update (6)
```
src/database/index.js                          (Add tables & methods)
src/automation/auto-fixers/nap-fixer.js        (Extend base class)
src/automation/auto-fixers/content-optimizer.js (Extend base class)
src/automation/auto-fixers/title-meta-optimizer.js (Extend base class)
dashboard/src/pages/AutoFixPage.jsx            (Add review mode)
dashboard/src/App.jsx                          (Add routes)
dashboard/src/services/api.js                  (Add API methods)
```

---

## How to Use After Implementation

### For Developers

**Run detection only:**
```javascript
const engine = new NAPAutoFixer(clientConfig);
const result = await engine.runDetection();
// Returns groupId for review
```

**Apply approved proposals:**
```javascript
const engine = new NAPAutoFixer(clientConfig);
const result = await engine.runApplication(groupId);
// Applies only approved changes
```

**Legacy mode (direct apply):**
```javascript
const engine = new NAPAutoFixer(clientConfig);
const result = await engine.run({ reviewMode: false });
// Detects and applies immediately (old behavior)
```

### For Users

1. **Run Detection**
   - Go to Auto-Fix page
   - Click "Run Now" on an engine
   - System detects issues and creates proposals

2. **Review Proposals**
   - Click "Review Proposals" notification
   - See all detected issues with before/after
   - Approve good changes, reject bad ones

3. **Apply Changes**
   - Click "Apply All Approved"
   - Only approved changes go to website
   - See results in activity log

---

## Key Features

### ✅ Smart Review
- Visual diff highlighting
- Risk level indicators
- Impact scores
- Category badges

### ✅ Bulk Operations
- Select multiple proposals
- Approve/reject in bulk
- Auto-approve low-risk changes

### ✅ Safety Features
- All changes reversible
- Backup before apply
- Audit trail
- Expiration after 7 days

### ✅ Flexibility
- Can still use direct mode
- Per-client settings
- Auto-approval rules
- Template-based approvals

---

## Architecture Highlights

### Database Schema
```sql
autofix_proposals           -- All detected changes
autofix_review_sessions     -- Grouped reviews
autofix_review_settings     -- Per-client config
autofix_approval_templates  -- Auto-approve patterns
```

### Service Layer
```
ProposalService      -- CRUD operations
DiffGenerator        -- Visual diffs
AutoFixEngineBase    -- Two-phase execution
```

### API Endpoints
```
GET  /api/autofix/proposals          -- List proposals
POST /api/autofix/proposals/:id/review -- Review one
POST /api/autofix/proposals/bulk-review -- Review many
POST /api/autofix/detect             -- Run detection
POST /api/autofix/apply              -- Apply approved
```

---

## Testing Strategy

### Unit Tests
- Proposal service methods
- Diff generator
- Base engine class

### Integration Tests
- Full workflow: detect → review → apply
- Database operations
- API endpoints

### E2E Tests
- UI interactions
- Dashboard navigation
- Bulk operations

---

## Deployment

### Prerequisites
```bash
# Backup database
cp data/seo-automation.db data/seo-automation-backup.db

# Install dependencies
npm install
```

### Deploy
```bash
# Run migration
node src/database/migrations/001_add_proposal_tables.js up

# Build frontend
cd dashboard && npm run build

# Restart services
npm run restart
```

### Verify
```bash
# Check API
curl http://localhost:3000/api/autofix/statistics

# Check database
sqlite3 data/seo-automation.db ".tables" | grep proposal
```

---

## Configuration

### Environment Variables
```bash
# .env
AUTOFIX_REVIEW_ENABLED=true
AUTOFIX_REVIEW_DEFAULT_MODE=review
AUTOFIX_PROPOSAL_EXPIRY_DAYS=7
AUTOFIX_AUTO_APPROVE_ENABLED=false
```

### Per-Client Settings
```javascript
// In database or via API
{
  "review.enabled": true,
  "review.default_mode": "review",
  "auto_approve.enabled": false,
  "auto_approve.max_risk_level": "low"
}
```

---

## Maintenance

### Daily
```bash
# Expire old proposals
curl -X POST http://localhost:3000/api/autofix/expire-old
```

### Weekly
- Review approval rates
- Check failed applications
- Update auto-approval rules

### Monthly
- Analyze statistics
- Optimize database
- Clean old data

---

## Monitoring

### Key Metrics
- Proposals created per day
- Approval rate
- Application success rate
- Average review time
- Average application time

### Alerts
- Proposal backlog > 100
- Application failure rate > 10%
- Review time > 7 days

---

## Troubleshooting

### Proposals not showing
```bash
# Check database
sqlite3 data/seo-automation.db "SELECT COUNT(*) FROM autofix_proposals"

# Check API
curl http://localhost:3000/api/autofix/proposals
```

### Apply failing
```bash
# Check logs
tail -f logs/autofix-*.log

# Test WordPress connection
node test-wordpress-connection.js
```

### UI not updating
```bash
# Clear cache
rm -rf dashboard/.vite

# Rebuild
cd dashboard && npm run build
```

---

## Success Criteria

### MVP Ready
- ✅ Database tables created
- ✅ 3 engines refactored
- ✅ API endpoints working
- ✅ UI can review proposals
- ✅ Apply functionality works
- ✅ Basic tests passing

### Production Ready
- ✅ All engines refactored
- ✅ Comprehensive tests
- ✅ Performance optimized
- ✅ Security reviewed
- ✅ Documentation complete
- ✅ User training done
- ✅ Monitoring in place

---

## Next Steps

### Immediate (Day 1)
1. Read architecture plan
2. Review implementation guide
3. Run database migration
4. Test with sample data

### This Week
1. Complete Phase 1 & 2 (Foundation)
2. Build API endpoints
3. Test with Postman/curl

### Next Week
1. Refactor 3 engines
2. Build dashboard UI
3. Integration testing

### Following Week
1. Complete remaining engines
2. Performance optimization
3. Documentation
4. Deploy to production

---

## Resources

### Documentation
- **Architecture**: `AUTOFIX_MANUAL_REVIEW_INTEGRATION_PLAN.md`
- **Implementation**: `AUTOFIX_MANUAL_REVIEW_IMPLEMENTATION_GUIDE.md`
- **API Reference**: Inside implementation guide
- **Component Guide**: Inside implementation guide

### Code Examples
- **Base Engine**: `src/automation/auto-fixers/engine-base.js`
- **Refactored Engine**: `src/automation/auto-fixers/nap-fixer.js` (after update)
- **Service Usage**: `test-manual-review-workflow.js`

### External Resources
- [diff library](https://www.npmjs.com/package/diff) for diffs
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for database
- [shadcn/ui](https://ui.shadcn.com/) for UI components

---

## Support

### Getting Help
1. Check documentation first
2. Review code examples
3. Run tests to isolate issues
4. Check logs for errors

### Common Questions

**Q: Can we keep the old behavior?**  
A: Yes! Set `reviewMode: false` or configure per-client.

**Q: What happens to existing engines?**  
A: They work as-is until refactored. Backward compatible.

**Q: How long do proposals last?**  
A: 7 days by default, configurable per-client.

**Q: Can we auto-approve certain types?**  
A: Yes! Use auto-approval rules and templates.

**Q: Is it reversible?**  
A: Yes, backups are created before applying.

---

## Status

- [x] Architecture designed
- [x] Implementation guide created
- [ ] Database migration ready to run
- [ ] Service layer ready to implement
- [ ] API endpoints ready to implement
- [ ] UI components ready to build
- [ ] Tests ready to write

---

## Quick Commands Reference

```bash
# Run migration
node src/database/migrations/001_add_proposal_tables.js up

# Rollback migration
node src/database/migrations/001_add_proposal_tables.js down

# Run integration test
node test-manual-review-workflow.js

# Check database
sqlite3 data/seo-automation.db ".schema autofix_proposals"

# Test API
curl http://localhost:3000/api/autofix/proposals?status=pending

# Start dashboard dev
cd dashboard && npm run dev

# Build dashboard
cd dashboard && npm run build

# Restart all services
npm run restart

# View logs
tail -f logs/autofix-*.log
```

---

**Ready to start?** 

👉 Begin with **Phase 1** in `AUTOFIX_MANUAL_REVIEW_IMPLEMENTATION_GUIDE.md`

---

**Last Updated**: October 30, 2025  
**Status**: Ready for Implementation  
**Estimated Completion**: 3-4 weeks  
**Risk Level**: Low (fully backward compatible)
