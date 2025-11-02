# React Dashboard + Google Search Console Integration Plan

**Goal**: Build comprehensive Manual Review dashboard with GSC data integration

---

## Current State Analysis

### ✅ Already Built

1. **Dashboard Infrastructure**
   - React dashboard on port 9000 (`dashboard/`)
   - Dashboard server (`dashboard-server.js`)
   - AutoFixReviewPage already exists
   - API routes at `/api/autofix`

2. **Manual Review API**
   - Production API on port 4000 (`src/index.js`)
   - All 12 endpoints operational
   - Database with proposals tables

### 🔨 What We Need to Build

1. **Connect Dashboard to Production API**
2. **Enhance AutoFix Review Page**
3. **Add Google Search Console Integration**
4. **Create GSC Dashboard Widgets**
5. **Add Traffic-Based Prioritization**

---

## Implementation Plan

### Phase 1: Connect Dashboard to Production API (30 minutes)

**Current Issue**: Dashboard server has its own `/api/autofix` routes that may not connect to the production API on port 4000.

**Solution**:
1. Update `dashboard-server.js` to proxy `/api/autofix` to `http://localhost:4000/api/autofix`
2. OR update the routes to directly use the production API
3. Test that dashboard can load proposals from production API

**Files to Modify**:
- `dashboard-server.js` (line 1878)

---

### Phase 2: Enhance Dashboard Pages (4-6 hours)

#### 2.1 Update AutoFixReviewPage
**Features to Add**:
- Real-time proposal updates
- Bulk approve by risk level
- Before/After comparison view
- Proposal timeline
- Export to CSV

#### 2.2 Create Engines Control Page
**New File**: `dashboard/src/pages/EnginesControlPage.jsx`

**Features**:
- Grid of all 10 engines
- Click to run detection
- Configure engine settings
- Schedule automated runs
- View last run time

#### 2.3 Create Enhanced Statistics Dashboard
**New File**: `dashboard/src/pages/ManualReviewDashboard.jsx`

**Features**:
- Approval rate chart (line/bar)
- Proposals by engine (pie chart)
- Proposals by risk level (stacked bar)
- Time series of detections
- Top issues detected
- Client comparison

#### 2.4 Create History Timeline Page
**New File**: `dashboard/src/pages/ProposalHistoryPage.jsx`

**Features**:
- Timeline of all detections
- Filter by client/engine
- See applied vs rejected
- Impact tracking

---

### Phase 3: Google Search Console Integration (8-10 hours)

#### 3.1 Set Up GSC API Authentication

**Files to Create**:
- `src/services/google-search-console.js` - GSC API client
- `src/database/migrations/002_add_gsc_tables.js` - Database tables

**Database Tables**:
```sql
CREATE TABLE gsc_properties (
  id INTEGER PRIMARY KEY,
  client_id TEXT NOT NULL,
  property_url TEXT NOT NULL,
  verification_method TEXT,
  verified BOOLEAN DEFAULT 0,
  last_sync DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gsc_search_analytics (
  id INTEGER PRIMARY KEY,
  property_id INTEGER,
  page_url TEXT,
  query TEXT,
  clicks INTEGER,
  impressions INTEGER,
  ctr REAL,
  position REAL,
  date DATE,
  FOREIGN KEY (property_id) REFERENCES gsc_properties(id)
);

CREATE TABLE gsc_url_issues (
  id INTEGER PRIMARY KEY,
  property_id INTEGER,
  page_url TEXT,
  issue_type TEXT,
  severity TEXT,
  detected_at DATETIME,
  resolved_at DATETIME,
  FOREIGN KEY (property_id) REFERENCES gsc_properties(id)
);
```

**GSC Service Methods**:
```javascript
class GoogleSearchConsoleService {
  // Authentication
  async authenticate(credentials)
  async verifyProperty(propertyUrl)

  // Data Import
  async importSearchAnalytics(propertyUrl, startDate, endDate)
  async importUrlInspection(url)
  async importCoverageIssues()

  // Analytics
  async getTopPages(limit = 100)
  async getTopQueries(limit = 100)
  async getPagePerformance(url)

  // Integration with Proposals
  async enrichProposalWithGSCData(proposal)
  async prioritizeByTraffic(proposals)
}
```

#### 3.2 Create GSC API Routes

**New File**: `src/api/gsc-routes.js`

**Endpoints**:
- `POST /api/gsc/authenticate` - OAuth flow
- `POST /api/gsc/verify-property` - Verify site ownership
- `POST /api/gsc/sync` - Sync GSC data
- `GET /api/gsc/properties` - List properties
- `GET /api/gsc/analytics/:propertyId` - Get search analytics
- `GET /api/gsc/page-performance/:url` - Get page metrics
- `GET /api/gsc/top-pages` - Get top performing pages
- `GET /api/gsc/issues` - Get URL issues from GSC

#### 3.3 Integrate GSC with Proposals

**Modifications to**:
- `src/services/proposal-service.js`
- `src/database/index.js` (add `gscOps`)

**Features**:
1. **Traffic-Based Prioritization**:
   ```javascript
   async prioritizeProposalsByTraffic(proposals) {
     // For each proposal URL
     // Get GSC metrics (clicks, impressions)
     // Calculate priority score
     // Sort by impact potential
     return sortedProposals;
   }
   ```

2. **Impact Estimation**:
   ```javascript
   async estimateImpact(proposal) {
     // Get current performance from GSC
     // Estimate improvement
     // Return: { estimatedClicks, estimatedImpressions }
   }
   ```

3. **Track Results**:
   ```javascript
   async trackProposalImpact(proposalId) {
     // Get before/after GSC metrics
     // Calculate actual improvement
     // Store in database
   }
   ```

#### 3.4 Create GSC Dashboard Components

**New Components**:

1. **`dashboard/src/components/GSCPropertyCard.jsx`**
   - Shows property verification status
   - Last sync time
   - Quick stats (clicks, impressions, CTR, position)

2. **`dashboard/src/components/GSCAnalyticsChart.jsx`**
   - Line chart of clicks/impressions over time
   - Compare multiple pages
   - Date range selector

3. **`dashboard/src/components/GSCTopPages.jsx`**
   - Table of top performing pages
   - Columns: URL, Clicks, Impressions, CTR, Position
   - Click to see proposals for that page

4. **`dashboard/src/components/GSCIssuesWidget.jsx`**
   - List of GSC-detected issues
   - Link to create proposals
   - Track resolution

5. **`dashboard/src/components/ProposalWithGSC.jsx`**
   - Enhanced proposal card showing:
     - Current page traffic (clicks/impressions)
     - Estimated impact
     - Traffic trend (up/down/stable)

#### 3.5 Create GSC Settings Page

**New File**: `dashboard/src/pages/GSCSettingsPage.jsx`

**Features**:
- OAuth authentication flow
- Add/remove properties
- Configure sync schedule
- View sync history
- API quota usage

---

### Phase 4: Enhanced Features (4-6 hours)

#### 4.1 Real-Time Updates

Use WebSockets or polling for live proposal updates:

**New File**: `src/services/websocket-service.js`

```javascript
// Emit events when:
- New proposals created
- Proposals approved/rejected
- Changes applied
- GSC data synced
```

#### 4.2 Automated Reports

**New File**: `src/services/reporting-service.js`

Generate reports:
- Daily summary emails
- Weekly performance reports
- Monthly SEO improvement reports
- GSC ranking changes

#### 4.3 Smart Notifications

**New File**: `src/services/notification-service.js`

Notifications for:
- High-priority proposals (high traffic pages)
- GSC issues detected
- Ranking drops detected
- Successful optimizations

---

## Google Search Console Setup Requirements

### Prerequisites

1. **Google Cloud Project**
   - Create project at https://console.cloud.google.com
   - Enable Google Search Console API
   - Create OAuth 2.0 credentials

2. **Verification**
   - Verify site ownership in GSC
   - Add domain property (recommended) or URL prefix

3. **API Quotas**
   - Default: 1,200 queries/minute
   - 600,000 queries/day
   - Sufficient for most use cases

### OAuth Flow

```javascript
// 1. User clicks "Connect GSC" in dashboard
// 2. Redirect to Google OAuth consent screen
// 3. User grants permission
// 4. Callback with authorization code
// 5. Exchange code for access token
// 6. Store refresh token in database
// 7. Use token to fetch GSC data
```

### Credentials Structure

```javascript
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "http://localhost:9000/api/gsc/callback",
  "scopes": [
    "https://www.googleapis.com/auth/webmasters.readonly"
  ]
}
```

---

## Implementation Order

### Week 1: Dashboard Enhancement

**Day 1-2**: Connect dashboard to production API
- ✅ Proxy setup
- ✅ Test all endpoints
- ✅ Fix any connection issues

**Day 3-4**: Enhance AutoFixReviewPage
- ✅ Real-time updates
- ✅ Bulk operations
- ✅ Before/After view

**Day 5**: Create Engines Control Page
- ✅ Engine grid
- ✅ Run detection
- ✅ Configure settings

### Week 2: GSC Integration

**Day 1-2**: GSC API Setup
- ✅ Database migrations
- ✅ GSC service implementation
- ✅ OAuth authentication

**Day 3**: GSC API Routes
- ✅ Create endpoints
- ✅ Test sync
- ✅ Error handling

**Day 4**: GSC Dashboard Components
- ✅ Property cards
- ✅ Analytics charts
- ✅ Top pages widget

**Day 5**: Integration & Testing
- ✅ Proposal prioritization
- ✅ Impact estimation
- ✅ End-to-end testing

---

## Questions for You

Before I start building, I need to know:

### 1. Google Search Console Setup

**Do you have**:
- [ ] Google Cloud project created?
- [ ] GSC API enabled?
- [ ] OAuth credentials created?
- [ ] Site verified in GSC?

**If not**: I can guide you through the setup process (30-45 minutes)

### 2. Which WordPress sites to connect?

- [ ] instantautotraders.com.au
- [ ] hottyres.com.au
- [ ] sadcdisabilityservices.com.au
- [ ] Other sites?

### 3. Priority

**What should I build first?**

**Option A**: Dashboard enhancements (get visual UI working first)
- Connect dashboard to API (30 min)
- Enhance review page (4 hours)
- Then add GSC (8 hours)

**Option B**: GSC integration (get data flowing first)
- Set up GSC API (2 hours)
- Import data (4 hours)
- Then build dashboard (6 hours)

**My Recommendation**: **Option A** - Get the dashboard working first so you can see and use the Manual Review System visually, then add GSC data for better prioritization.

---

## Next Steps

**Tell me**:
1. Do you have GSC API credentials ready? (or need help setting up)
2. Which WordPress sites to connect to GSC?
3. Do you prefer Option A or Option B for build order?

**Or just say**: "Start with Option A" and I'll begin building the dashboard enhancements right now!

---

**Estimated Total Time**:
- Dashboard Enhancement: 6-8 hours
- GSC Integration: 8-10 hours
- Testing & Polish: 2-3 hours
- **Total**: 16-21 hours (2-3 days of work)

**Ready to start!** 🚀
