# Dashboard Page Inventory - Quick Reference

**Total Pages:** 19  
**Status:** All require testing  
**Last Updated:** 2025-10-28

---

## 📊 Complete Page Inventory

### 1. ControlCenterPage

**File:** `dashboard/src/pages/ControlCenterPage.jsx`  
**Lines:** 951  
**Complexity:** ⭐⭐⭐ Complex  
**Priority:** 🔴 Critical  
**Agent:** Team 1 (Agent-1A)  
**Time Estimate:** 90 minutes

**Purpose:** Automation control center with real-time job management

**Key Features:**
- Job scheduling and management
- Real-time Socket.IO updates
- Batch operations across clients
- Auto-fix engine controls
- Job history and monitoring

**APIs Used:**
```
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
```

**External Dependencies:**
- Socket.IO (real-time updates)
- Job queue system

**Testing Focus:**
- Real-time job updates
- Batch operation execution
- Auto-fix engine triggers
- Job scheduling functionality

---

### 2. ClientDetailPage

**File:** `dashboard/src/pages/ClientDetailPage.jsx`  
**Lines:** 493  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🔴 Critical  
**Agent:** Team 1 (Agent-1B)  
**Time Estimate:** 60 minutes

**Purpose:** Individual client overview and management

**Key Features:**
- Client overview dashboard
- Quick actions (audit, test, optimize)
- Recent reports viewing
- Client status monitoring
- Configuration management

**APIs Used:**
```
GET  /api/client/:clientId/status
GET  /api/reports/:clientId
POST /api/test-auth/:clientId
POST /api/audit/:clientId
POST /api/optimize/:clientId
```

**Testing Focus:**
- Client data display
- Quick action buttons
- Report integration
- Status updates

---

### 3. ReportsPage

**File:** `dashboard/src/pages/ReportsPage.jsx`  
**Lines:** 570  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🔴 Critical  
**Agent:** Team 1 (Agent-1A)  
**Time Estimate:** 60 minutes

**Purpose:** Report generation and viewing

**Key Features:**
- Report listing and filtering
- Report generation triggers
- Report viewing (HTML/PDF)
- Export functionality
- Report history

**APIs Used:**
```
GET  /api/reports/:clientId
GET  /api/analytics/client/:clientId/audits
POST /api/audit/:clientId (generate new)
```

**Testing Focus:**
- Report listing
- Report generation
- Filtering and sorting
- Export functionality

---

### 4. AutoFixPage

**File:** `dashboard/src/pages/AutoFixPage.jsx`  
**Lines:** 549  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🔴 Critical  
**Agent:** Team 1 (Agent-1B)  
**Time Estimate:** 60 minutes

**Purpose:** Auto-fix engines for SEO issues

**Key Features:**
- Content optimizer
- NAP (Name, Address, Phone) auto-fixer
- Schema markup injector
- Title & meta description optimizer
- Fix history and tracking

**APIs Used:**
```
POST /api/control/auto-fix/content/:clientId
POST /api/control/auto-fix/nap/:clientId
POST /api/control/auto-fix/schema/:clientId
POST /api/control/auto-fix/titles/:clientId
```

**Testing Focus:**
- Each auto-fix engine
- Fix application
- History tracking
- Rollback functionality

---

### 5. BulkOperationsPage

**File:** `dashboard/src/pages/BulkOperationsPage.jsx`  
**Lines:** ~200  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🟡 High  
**Agent:** Team 1 (Agent-1A)  
**Time Estimate:** 30 minutes

**Purpose:** Bulk operations across multiple clients

**Key Features:**
- Multi-client selection
- Batch audit
- Batch optimization
- Progress tracking
- Results summary

**APIs Used:**
```
POST /api/batch/:action
GET  /api/dashboard (for client list)
```

**Testing Focus:**
- Client selection
- Batch execution
- Progress monitoring
- Results display

---

### 6. KeywordResearchPage

**File:** `dashboard/src/pages/KeywordResearchPage.jsx`  
**Lines:** 834  
**Complexity:** ⭐⭐⭐ Complex  
**Priority:** 🟡 High  
**Agent:** Team 2 (Agent-2A)  
**Time Estimate:** 90 minutes

**Purpose:** Keyword research tools and project management

**Key Features:**
- Research project management
- Keyword discovery tools
- Volume and difficulty metrics
- Keyword grouping
- Export to CSV
- Integration with tracking

**APIs Used:**
```
GET  /api/v2/research/projects
POST /api/v2/research/projects
GET  /api/v2/research/projects/:id
POST /api/v2/keywords (add from research)
```

**Testing Focus:**
- Project CRUD operations
- Keyword discovery
- Metrics display
- Export functionality

---

### 7. UnifiedKeywordsPage

**File:** `dashboard/src/pages/UnifiedKeywordsPage.jsx`  
**Lines:** 570  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🟡 High  
**Agent:** Team 2 (Agent-2B)  
**Time Estimate:** 60 minutes

**Purpose:** Unified keyword management across all sources

**Key Features:**
- Unified keyword view (SerpBear + GSC + Manual)
- Keyword synchronization
- Position tracking integration
- Search Console data
- Keyword tagging and organization

**APIs Used:**
```
GET  /api/v2/keywords
POST /api/v2/keywords
PUT  /api/v2/keywords/:id
DELETE /api/v2/keywords/:id
GET  /api/v2/sync/status
POST /api/v2/sync/trigger
```

**Testing Focus:**
- Multi-source sync
- Keyword CRUD
- Position data display
- Tagging system

---

### 8. RecommendationsPage

**File:** `dashboard/src/pages/RecommendationsPage.jsx`  
**Lines:** 586  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🟡 High  
**Agent:** Team 2 (Agent-2A)  
**Time Estimate:** 60 minutes

**Purpose:** AI-powered SEO recommendations

**Key Features:**
- Recommendation generation
- Priority-based filtering
- Action tracking
- Apply recommendations
- Recommendation history

**APIs Used:**
```
GET  /api/recommendations/:clientId (likely needs implementation)
POST /api/recommendations/generate/:clientId
PUT  /api/recommendations/:id/apply
```

**Testing Focus:**
- Recommendation display
- Filtering and sorting
- Apply actions
- Status tracking

---

### 9. GoalsPage

**File:** `dashboard/src/pages/GoalsPage.jsx`  
**Lines:** 665  
**Complexity:** ⭐⭐⭐ Complex  
**Priority:** 🟡 High  
**Agent:** Team 2 (Agent-2B)  
**Time Estimate:** 60 minutes

**Purpose:** Goal tracking and achievement monitoring

**Key Features:**
- Goal creation and management
- Progress tracking
- Achievement notifications
- Goal templates
- Historical goal data

**APIs Used:**
```
GET  /api/goals (likely needs implementation)
POST /api/goals
PUT  /api/goals/:id
DELETE /api/goals/:id
GET  /api/goals/:id/progress
```

**Testing Focus:**
- Goal CRUD operations
- Progress calculation
- Achievement detection
- Notifications

---

### 10. GoogleSearchConsolePage

**File:** `dashboard/src/pages/GoogleSearchConsolePage.jsx`  
**Lines:** 413  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🟡 High  
**Agent:** Team 2 (Agent-2A)  
**Time Estimate:** 45 minutes

**Purpose:** Google Search Console integration

**Key Features:**
- GSC connection status
- Query performance data
- Page performance metrics
- Data synchronization
- Trend analysis

**APIs Used:**
```
POST /api/control/gsc/sync/:clientId
GET  /api/gsc/queries/:clientId (likely needs implementation)
GET  /api/gsc/pages/:clientId (likely needs implementation)
```

**Testing Focus:**
- GSC connection
- Data sync
- Query display
- Performance metrics

---

### 11. EmailCampaignsPage

**File:** `dashboard/src/pages/EmailCampaignsPage.jsx`  
**Lines:** 880  
**Complexity:** ⭐⭐⭐ Complex  
**Priority:** 🟡 High  
**Agent:** Team 3 (Agent-3)  
**Time Estimate:** 90 minutes

**Purpose:** Email campaign management

**Key Features:**
- Campaign creation
- Template management
- Email scheduling
- Recipient management
- Campaign metrics (open rate, click rate)

**APIs Used:**
```
POST /api/control/email/campaign/:clientId
GET  /api/email/campaigns (likely needs implementation)
POST /api/email/campaigns
GET  /api/email/campaigns/:id/metrics
```

**Testing Focus:**
- Campaign CRUD
- Template editor
- Scheduling
- Metrics display

---

### 12. WebhooksPage

**File:** `dashboard/src/pages/WebhooksPage.jsx`  
**Lines:** 717  
**Complexity:** ⭐⭐⭐ Complex  
**Priority:** 🟡 High  
**Agent:** Team 3 (Agent-3)  
**Time Estimate:** 60 minutes

**Purpose:** Webhook configuration and monitoring

**Key Features:**
- Webhook CRUD
- Event subscription
- Delivery logs
- Webhook testing
- Secret management

**APIs Used:**
```
GET  /api/webhooks (needs implementation)
POST /api/webhooks
PUT  /api/webhooks/:id
DELETE /api/webhooks/:id
POST /api/webhooks/:id/test
GET  /api/webhooks/:id/logs
```

**Testing Focus:**
- Webhook configuration
- Event selection
- Test delivery
- Log display

---

### 13. WhiteLabelPage

**File:** `dashboard/src/pages/WhiteLabelPage.jsx`  
**Lines:** 585  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🟡 High  
**Agent:** Team 3 (Agent-3)  
**Time Estimate:** 45 minutes

**Purpose:** White label settings

**Key Features:**
- Branding configuration
- Logo upload
- Color scheme customization
- Custom domain settings
- Email branding

**APIs Used:**
```
GET  /api/white-label (needs implementation)
PUT  /api/white-label
POST /api/white-label/logo (upload)
```

**Testing Focus:**
- Logo upload
- Color customization
- Domain configuration
- Preview functionality

---

### 14. LocalSEOPage

**File:** `dashboard/src/pages/LocalSEOPage.jsx`  
**Lines:** 480  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🟠 Medium  
**Agent:** Team 4 (Agent-4)  
**Time Estimate:** 45 minutes

**Purpose:** Local SEO features

**Key Features:**
- NAP validation
- Local listings management
- Schema markup for local business
- Score calculation
- Local SEO recommendations

**APIs Used:**
```
GET  /api/local-seo/scores
POST /api/control/local-seo/sync/:clientId
GET  /api/local-seo/:clientId (likely needs implementation)
```

**Testing Focus:**
- NAP validation
- Score display
- Sync functionality
- Recommendations

---

### 15. WordPressManagerPage

**File:** `dashboard/src/pages/WordPressManagerPage.jsx`  
**Lines:** 453  
**Complexity:** ⭐⭐ Medium  
**Priority:** 🟠 Medium  
**Agent:** Team 4 (Agent-4)  
**Time Estimate:** 45 minutes

**Purpose:** WordPress site management

**Key Features:**
- Connection testing
- Post/page management
- Plugin status
- Update monitoring
- Direct WP API integration

**APIs Used:**
```
POST /api/test-auth/:clientId
GET  /api/wordpress/:clientId/posts (needs implementation)
GET  /api/wordpress/:clientId/plugins (needs implementation)
POST /api/wordpress/:clientId/update (needs implementation)
```

**Testing Focus:**
- Connection testing
- Post listing
- Plugin status
- Update operations

---

### 16. ExportBackupPage

**File:** `dashboard/src/pages/ExportBackupPage.jsx`  
**Lines:** 217  
**Complexity:** ⭐ Simple  
**Priority:** 🟠 Medium  
**Agent:** Team 4 (Agent-4)  
**Time Estimate:** 30 minutes

**Purpose:** Export and backup functionality

**Key Features:**
- Data export (JSON/CSV)
- Backup creation
- Backup restoration
- Scheduled backups
- Export history

**APIs Used:**
```
GET  /api/export/:type (needs implementation)
POST /api/backup/create (needs implementation)
POST /api/backup/restore (needs implementation)
GET  /api/backup/list (needs implementation)
```

**Testing Focus:**
- Export formats
- Backup creation
- Restore functionality
- Schedule management

---

### 17. NotificationCenterPage

**File:** `dashboard/src/pages/NotificationCenterPage.jsx`  
**Lines:** 338  
**Complexity:** ⭐ Simple  
**Priority:** 🟠 Medium  
**Agent:** Team 4 (Agent-4)  
**Time Estimate:** 30 minutes

**Purpose:** Notification management

**Key Features:**
- Notification listing
- Read/unread status
- Notification filtering
- Notification preferences
- Mark as read/unread

**APIs Used:**
```
GET  /api/notifications (needs implementation)
PUT  /api/notifications/:id/read
POST /api/notifications/preferences
DELETE /api/notifications/:id
```

**Testing Focus:**
- Notification display
- Status management
- Filtering
- Preferences

---

### 18. SettingsPage

**File:** `dashboard/src/pages/SettingsPage.jsx`  
**Lines:** 289  
**Complexity:** ⭐ Simple  
**Priority:** 🟠 Medium  
**Agent:** Team 4 (Agent-4)  
**Time Estimate:** 30 minutes

**Purpose:** Application settings

**Key Features:**
- User preferences
- Theme toggle (dark/light)
- API key management
- Notification settings
- Account settings

**APIs Used:**
```
GET  /api/settings (needs implementation)
PUT  /api/settings
PUT  /api/settings/theme
PUT  /api/settings/notifications
```

**Testing Focus:**
- Settings display
- Theme switching
- Preference saving
- API key management

---

### 19. APIDocumentationPage

**File:** `dashboard/src/pages/APIDocumentationPage.jsx`  
**Lines:** 157  
**Complexity:** ⭐ Simple  
**Priority:** 🟠 Medium  
**Agent:** Team 4 (Agent-4)  
**Time Estimate:** 20 minutes

**Purpose:** API documentation viewer

**Key Features:**
- API endpoint listing
- Code examples
- Request/response formats
- Authentication docs
- Rate limit info

**APIs Used:**
```
(Mostly static content, no dynamic APIs)
```

**Testing Focus:**
- Documentation display
- Code example copying
- Endpoint organization
- Search functionality (if any)

---

## 📊 Summary Statistics

### By Complexity
| Level | Count | Pages |
|-------|-------|-------|
| ⭐ Simple | 4 | APIDocumentation, NotificationCenter, ExportBackup, Settings |
| ⭐⭐ Medium | 11 | ClientDetail, Reports, AutoFix, UnifiedKeywords, Recommendations, GoogleSearchConsole, WhiteLabel, LocalSEO, WordPressManager, BulkOperations, WebhooksPage |
| ⭐⭐⭐ Complex | 4 | ControlCenter, KeywordResearch, EmailCampaigns, Goals |

### By Priority
| Level | Count | Color |
|-------|-------|-------|
| 🔴 Critical | 4 | Red |
| 🟡 High | 9 | Yellow |
| 🟠 Medium | 6 | Orange |

### By Team
| Team | Pages | Focus |
|------|-------|-------|
| Team 1 | 5 | Core Business Operations |
| Team 2 | 5 | SEO Intelligence & Research |
| Team 3 | 3 | Marketing & Integration |
| Team 4 | 6 | Local SEO & Operations |

### Total Lines of Code
- **Total:** ~10,000 lines
- **Average:** ~526 lines per page
- **Largest:** ControlCenterPage (951 lines)
- **Smallest:** APIDocumentationPage (157 lines)

---

## 🔗 API Status Overview

### ✅ Confirmed Existing APIs
- Dashboard data: `/api/dashboard`
- Client operations: `/api/test-auth`, `/api/audit`, `/api/optimize`
- Control center: `/api/control/jobs/*`, `/api/control/auto-fix/*`
- Analytics: `/api/analytics/*`
- Scheduler: `/api/scheduler/*`
- AI Optimizer: `/api/ai-optimizer/*`
- V2 Keywords: `/api/v2/keywords`, `/api/v2/research`, `/api/v2/sync`

### ❓ Likely Missing APIs
- Notifications: `/api/notifications/*`
- Goals: `/api/goals/*`
- Recommendations: `/api/recommendations/*`
- Webhooks: `/api/webhooks/*`
- White Label: `/api/white-label/*`
- Settings: `/api/settings/*`
- Export/Backup: `/api/export/*`, `/api/backup/*`
- WordPress: `/api/wordpress/*` (beyond auth)
- Local SEO: `/api/local-seo/*` (beyond sync)
- GSC: `/api/gsc/*` (beyond sync)

---

## 📁 File Locations

All pages are located in:
```
/mnt/c/Users/abhis/projects/seo expert/dashboard/src/pages/
```

Backend API server:
```
/mnt/c/Users/abhis/projects/seo expert/dashboard-server.js
```

---

**Last Updated:** 2025-10-28  
**Status:** Ready for Testing  
**Next:** See [START_HERE_TESTING_PLAN.md](./START_HERE_TESTING_PLAN.md)
