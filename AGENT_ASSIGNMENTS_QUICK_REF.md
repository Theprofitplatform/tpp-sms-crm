# Agent Assignment Quick Reference
## Dashboard Pages Testing - Work Distribution

**Start Date:** TBD  
**Estimated Completion:** 3-4 hours (parallel) / 8-12 hours (sequential)  

---

## 🎯 Agent Team 1: Core Business Operations

**Agent IDs:** Agent-1A, Agent-1B  
**Priority:** CRITICAL  
**Time Budget:** 3-4 hours  

### Assignment List
```
[ ] 1. ControlCenterPage (951 lines) - Agent-1A
    - Time: 90 min
    - Complexity: HIGH
    - APIs: /api/control/jobs/*, /api/control/auto-fix/*, Socket.IO
    - Focus: Real-time job management, automation control

[ ] 2. ClientDetailPage (493 lines) - Agent-1B
    - Time: 60 min
    - Complexity: MEDIUM
    - APIs: /api/client/:clientId/*, /api/reports/:clientId
    - Focus: Client overview, quick actions

[ ] 3. ReportsPage (570 lines) - Agent-1A
    - Time: 60 min
    - Complexity: MEDIUM
    - APIs: /api/reports/:clientId, /api/analytics/*
    - Focus: Report generation, filtering, export

[ ] 4. AutoFixPage (549 lines) - Agent-1B
    - Time: 60 min
    - Complexity: MEDIUM
    - APIs: /api/control/auto-fix/*
    - Focus: SEO auto-fix engines (content, NAP, schema, titles)

[ ] 5. BulkOperationsPage (~200 lines) - Agent-1A
    - Time: 30 min
    - Complexity: MEDIUM
    - APIs: /api/batch/:action
    - Focus: Multi-client operations
```

### Quick Start Commands
```bash
# Terminal 1 - Backend
cd "/mnt/c/Users/abhis/projects/seo expert"
node dashboard-server.js

# Terminal 2 - Frontend
cd "/mnt/c/Users/abhis/projects/seo expert/dashboard"
npm run dev

# Access: http://localhost:5173 (Vite dev server)
```

---

## 🔬 Agent Team 2: SEO Intelligence & Research

**Agent IDs:** Agent-2A, Agent-2B  
**Priority:** HIGH  
**Time Budget:** 3-4 hours  

### Assignment List
```
[ ] 6. KeywordResearchPage (834 lines) - Agent-2A
    - Time: 90 min
    - Complexity: HIGH
    - APIs: /api/v2/research/*, /api/v2/keywords/*
    - Focus: Keyword research projects, discovery tools

[ ] 7. UnifiedKeywordsPage (570 lines) - Agent-2B
    - Time: 60 min
    - Complexity: MEDIUM
    - APIs: /api/v2/keywords/*, /api/v2/sync/*
    - Focus: Unified keyword view, SerpBear + GSC sync

[ ] 8. RecommendationsPage (586 lines) - Agent-2A
    - Time: 60 min
    - Complexity: MEDIUM
    - APIs: [Needs verification]
    - Focus: AI recommendations, action items

[ ] 9. GoalsPage (665 lines) - Agent-2B
    - Time: 60 min
    - Complexity: MEDIUM
    - APIs: [Needs verification]
    - Focus: Goal tracking, achievement monitoring

[ ] 10. GoogleSearchConsolePage (413 lines) - Agent-2A
     - Time: 45 min
     - Complexity: MEDIUM
     - APIs: /api/control/gsc/sync/:clientId
     - Focus: GSC integration, query data, performance
```

### Key Focus Areas
- V2 API integration (`/api/v2/*`)
- SerpBear integration
- Google Search Console connection
- Keyword synchronization logic

---

## 📧 Agent Team 3: Marketing & Integration

**Agent IDs:** Agent-3  
**Priority:** HIGH  
**Time Budget:** 2-3 hours  

### Assignment List
```
[ ] 11. EmailCampaignsPage (880 lines) - Agent-3
     - Time: 90 min
     - Complexity: HIGH
     - APIs: /api/control/email/campaign/:clientId
     - Focus: Campaign creation, templates, scheduling

[ ] 12. WebhooksPage (717 lines) - Agent-3
     - Time: 60 min
     - Complexity: MEDIUM
     - APIs: [Needs implementation]
     - Focus: Webhook CRUD, event subscriptions, logs

[ ] 13. WhiteLabelPage (585 lines) - Agent-3
     - Time: 45 min
     - Complexity: MEDIUM
     - APIs: [Needs verification]
     - Focus: Branding, custom domains, logo upload
```

### Key Focus Areas
- Email automation workflows
- Webhook delivery system
- White label configuration
- External integration testing

---

## 🏪 Agent Team 4: Local SEO & Operations

**Agent IDs:** Agent-4  
**Priority:** MEDIUM  
**Time Budget:** 2-3 hours  

### Assignment List
```
[ ] 14. LocalSEOPage (480 lines) - Agent-4
     - Time: 45 min
     - Complexity: MEDIUM
     - APIs: /api/local-seo/scores, /api/control/local-seo/sync/:clientId
     - Focus: NAP validation, local listings, schema

[ ] 15. WordPressManagerPage (453 lines) - Agent-4
     - Time: 45 min
     - Complexity: MEDIUM
     - APIs: WordPress REST API integration
     - Focus: Connection testing, post management

[ ] 16. ExportBackupPage (217 lines) - Agent-4
     - Time: 30 min
     - Complexity: SIMPLE
     - APIs: [Needs verification]
     - Focus: Data export, backup creation, restore

[ ] 17. NotificationCenterPage (338 lines) - Agent-4
     - Time: 30 min
     - Complexity: SIMPLE
     - APIs: [Needs verification]
     - Focus: Notification management, preferences

[ ] 18. SettingsPage (289 lines) - Agent-4
     - Time: 30 min
     - Complexity: SIMPLE
     - APIs: [Needs verification]
     - Focus: User preferences, theme, API keys

[ ] 19. APIDocumentationPage (157 lines) - Agent-4
     - Time: 20 min
     - Complexity: SIMPLE
     - APIs: Static content (frontend only)
     - Focus: Documentation display, code examples
```

### Key Focus Areas
- Local SEO automation
- WordPress API connections
- System operations (export, backup)
- User settings and preferences

---

## 🧪 Testing Checklist (Use for Each Page)

```markdown
### Page: [Name]
**Agent:** [Your ID]  
**Start Time:** [HH:MM]  
**End Time:** [HH:MM]  

#### 1. Code Review (10 min)
- [ ] Read entire page source
- [ ] Document all API calls
- [ ] List all components used
- [ ] Note Socket.IO usage (if any)
- [ ] Identify data flow

#### 2. API Verification (15 min)
- [ ] Check if APIs exist in backend
- [ ] Test API endpoints with curl/fetch
- [ ] Document missing APIs
- [ ] Check response formats
- [ ] Test error handling

#### 3. UI Testing (30 min)
- [ ] Page loads without errors
- [ ] All components render
- [ ] Loading states work
- [ ] Empty states display
- [ ] Error states handle failures
- [ ] Forms submit correctly
- [ ] Buttons trigger actions
- [ ] Modals open/close
- [ ] Tables sort/filter
- [ ] Charts render (if applicable)

#### 4. Integration Testing (15 min)
- [ ] Test with real client data
- [ ] Test navigation to/from page
- [ ] Test URL routing
- [ ] Test Socket.IO updates (if applicable)
- [ ] Test data persistence

#### 5. Issues Found
List all bugs, errors, missing features:
1. [Issue description]
2. [Issue description]

#### 6. Missing APIs
List APIs that need implementation:
1. [API endpoint] - [Purpose]

#### 7. Status
- [ ] ✅ Fully Functional
- [ ] ⚠️ Partially Working
- [ ] ❌ Not Working

#### 8. Priority Fixes
- [ ] Critical: [What needs fixing immediately]
- [ ] High: [Important fixes]
- [ ] Medium: [Nice to have]
```

---

## 🛠️ Testing Environment Setup

### Prerequisites
```bash
# Check Node.js
node --version  # Should be v18+

# Check npm
npm --version

# Navigate to project
cd "/mnt/c/Users/abhis/projects/seo expert"

# Ensure dependencies installed
npm install
cd dashboard && npm install && cd ..
```

### Start Services
```bash
# Terminal 1: Backend Server (Port 9000)
node dashboard-server.js

# Terminal 2: Dashboard Dev Server (Port 5173)
cd dashboard
npm run dev

# Terminal 3: For testing/scripts
# (Available for API testing, logs monitoring)
```

### Access Points
- **Dashboard:** http://localhost:5173
- **Backend API:** http://localhost:9000
- **Reports:** http://localhost:9000/reports/:clientId/:filename

### Test Data
- **Clients Config:** `clients/clients-config.json`
- **Client Env Files:** `clients/*.env`
- **Database:** `database/*.db`
- **Reports:** `logs/clients/*/`

---

## 📊 API Endpoint Reference

### ✅ Confirmed Working APIs
```
GET  /api/dashboard
POST /api/test-auth/:clientId
POST /api/audit/:clientId
POST /api/optimize/:clientId
POST /api/batch/:action
GET  /api/reports/:clientId
GET  /api/analytics/summary
GET  /api/analytics/client/:clientId/performance
GET  /api/analytics/client/:clientId/audits
GET  /api/control/jobs/active
GET  /api/control/jobs/scheduled
GET  /api/control/jobs/history
POST /api/control/jobs/schedule
POST /api/control/jobs/:jobId/stop
POST /api/control/schedules/:scheduleId/toggle
POST /api/control/auto-fix/content/:clientId
POST /api/control/auto-fix/nap/:clientId
POST /api/control/auto-fix/schema/:clientId
POST /api/control/auto-fix/titles/:clientId
POST /api/control/gsc/sync/:clientId
POST /api/control/email/campaign/:clientId
POST /api/control/local-seo/sync/:clientId
GET  /api/scheduler/jobs
POST /api/scheduler/jobs
PUT  /api/scheduler/jobs/:id
POST /api/scheduler/jobs/:id/toggle
GET  /api/ai-optimizer/status
POST /api/ai-optimizer/optimize
GET  /api/v2/keywords
POST /api/v2/keywords
```

### ❓ APIs Needing Verification
```
GET  /api/notifications
GET  /api/goals
GET  /api/recommendations
GET  /api/webhooks
GET  /api/white-label
GET  /api/settings
GET  /api/export
GET  /api/local-seo/scores
GET  /api/wordpress/status
```

---

## 🐛 Common Issues & Solutions

### Issue: API 404 Not Found
**Solution:** API endpoint not implemented yet. Document in "Missing APIs" section.

### Issue: CORS Error
**Solution:** Backend may need CORS headers. Check `dashboard-server.js` for CORS config.

### Issue: Component Not Found
**Solution:** Missing UI component import. Check `@/components/ui/` folder.

### Issue: State Not Updating
**Solution:** Check React hooks, useEffect dependencies, or state setter calls.

### Issue: Socket.IO Not Connecting
**Solution:** Ensure backend server is running on port 9000 and Socket.IO initialized.

### Issue: Empty Page / No Data
**Solution:** Check if test clients exist in `clients/clients-config.json`.

---

## 📈 Progress Tracking

### Team 1 Progress
- [ ] ControlCenterPage (Agent-1A)
- [ ] ClientDetailPage (Agent-1B)
- [ ] ReportsPage (Agent-1A)
- [ ] AutoFixPage (Agent-1B)
- [ ] BulkOperationsPage (Agent-1A)

### Team 2 Progress
- [ ] KeywordResearchPage (Agent-2A)
- [ ] UnifiedKeywordsPage (Agent-2B)
- [ ] RecommendationsPage (Agent-2A)
- [ ] GoalsPage (Agent-2B)
- [ ] GoogleSearchConsolePage (Agent-2A)

### Team 3 Progress
- [ ] EmailCampaignsPage (Agent-3)
- [ ] WebhooksPage (Agent-3)
- [ ] WhiteLabelPage (Agent-3)

### Team 4 Progress
- [ ] LocalSEOPage (Agent-4)
- [ ] WordPressManagerPage (Agent-4)
- [ ] ExportBackupPage (Agent-4)
- [ ] NotificationCenterPage (Agent-4)
- [ ] SettingsPage (Agent-4)
- [ ] APIDocumentationPage (Agent-4)

---

## 📝 Report Naming Convention

Create reports using this format:
```
TEST_REPORT_[PageName].md

Examples:
- TEST_REPORT_ControlCenterPage.md
- TEST_REPORT_KeywordResearchPage.md
- TEST_REPORT_WebhooksPage.md
```

Save all reports in: `/mnt/c/Users/abhis/projects/seo expert/test-reports/`

---

## ✅ Daily Standup Template

```
Agent: [Your ID]
Date: [YYYY-MM-DD]
Time: [HH:MM]

Completed Today:
1. [PageName] - [Status]
2. [PageName] - [Status]

In Progress:
1. [PageName] - [% Complete]

Blockers:
1. [Description of blocker]

Next Steps:
1. [What you'll work on next]

Notes:
- [Any important findings or observations]
```

---

## 🎯 Success Criteria

### Agent Level (Individual)
- [ ] All assigned pages tested
- [ ] Test reports created for each page
- [ ] Issues documented with severity
- [ ] Missing APIs identified
- [ ] Status updated (✅⚠️❌)

### Team Level (Collective)
- [ ] All 19 pages covered
- [ ] Consolidated summary created
- [ ] Cross-team dependencies resolved
- [ ] Critical issues escalated
- [ ] Implementation priorities defined

---

## 📞 Communication Channels

### Slack
- **Channel:** #dashboard-testing
- **DMs:** For quick questions
- **Threads:** Keep discussions organized

### Updates Frequency
- **Progress:** Every 30 minutes
- **Blockers:** Immediately
- **Standups:** Daily at 9 AM

### Escalation Path
1. Ask team members
2. Post in #dashboard-testing
3. Tag @tech-lead for critical blockers

---

**Created:** 2025-10-28  
**Version:** 1.0  
**Ready for Distribution:** ✅
