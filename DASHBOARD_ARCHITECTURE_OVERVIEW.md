# Dashboard Architecture & Structure Overview

## Project Overview
The SEO Expert dashboard is a modern React-based web application built with:
- **Framework**: React 18.3.1
- **Build Tool**: Vite
- **Styling**: TailwindCSS with Radix UI components
- **Charts**: Recharts (for data visualization)
- **HTTP Client**: Axios + Fetch API
- **Real-time**: Socket.io client support
- **Routing**: React Router DOM (installed but currently using hash-based routing in App.jsx)

**Port**: 5173 (dev), proxies API requests to localhost:9000

---

## Current Dashboard Structure

```
dashboard/src/
├── App.jsx                          # Main app component with routing logic
├── main.jsx                        # Entry point
├── index.css                       # Global styles
├── components/
│   ├── Sidebar.jsx                # Navigation sidebar with all menu items
│   ├── StatsCards.jsx             # Statistics cards component
│   ├── ClientsTable.jsx           # Clients list/table
│   ├── Charts.jsx                 # Reusable chart components
│   ├── RecentActivity.jsx         # Activity feed
│   ├── LoadingState.jsx           # Skeleton loaders
│   ├── ErrorState.jsx             # Error display
│   └── ui/                        # Radix UI wrapper components
│       ├── button.jsx
│       ├── card.jsx
│       ├── badge.jsx
│       ├── tabs.jsx
│       ├── dialog.jsx
│       ├── dropdown-menu.jsx
│       ├── input.jsx
│       ├── select.jsx
│       ├── switch.jsx
│       ├── checkbox.jsx
│       ├── label.jsx
│       ├── progress.jsx
│       ├── table.jsx
│       ├── skeleton.jsx
│       ├── alert.jsx
│       ├── toast.jsx
│       └── toaster.jsx
├── pages/                         # Page components (24 pages total)
│   ├── DashboardPage.jsx
│   ├── ClientsPage.jsx
│   ├── ClientDetailPage.jsx
│   ├── ReportsPage.jsx
│   ├── AnalyticsPage.jsx
│   ├── PositionTrackingPage.jsx
│   ├── AIOptimizerPage.jsx
│   ├── ControlCenterPage.jsx
│   ├── AutoFixPage.jsx
│   ├── RecommendationsPage.jsx
│   ├── KeywordResearchPage.jsx
│   ├── UnifiedKeywordsPage.jsx
│   ├── GoalsPage.jsx
│   ├── EmailCampaignsPage.jsx
│   ├── WebhooksPage.jsx
│   ├── WhiteLabelPage.jsx
│   ├── SchedulerPage.jsx
│   ├── BulkOperationsPage.jsx
│   ├── ExportBackupPage.jsx
│   ├── NotificationCenterPage.jsx
│   ├── SettingsPage.jsx
│   ├── GoogleSearchConsolePage.jsx
│   ├── LocalSEOPage.jsx
│   ├── WordPressManagerPage.jsx
│   └── APIDocumentationPage.jsx
├── services/
│   └── api.js                     # Centralized API service layer
├── hooks/
│   └── use-api.js                 # Custom hooks for API calls
├── lib/
│   └── utils.js                   # Utility functions
```

---

## 1. Core Routing Architecture (App.jsx)

### Navigation Method
- **Type**: Hash-based routing (e.g., `#dashboard`, `#clients`)
- **State Management**: React useState hooks
- **Key States**:
  - `currentSection`: Current page being viewed
  - `selectedClient`: Client ID for detail view
  - `isDark`: Dark mode toggle
  - `dashboardData`: Main dashboard stats and client data

### Page Routing Logic
```javascript
// Hash-based section routing with conditional rendering
if (currentSection === 'dashboard') {
  render <DashboardPage />
} else if (currentSection === 'clients') {
  render <ClientsPage />
} 
// ... etc for all 24 pages
```

### Available Sections (from Sidebar)
1. **Main**: Dashboard, Clients
2. **Automation**: Control Center, Auto-Fix Engines, AI Optimizer, Scheduler, Bulk Operations
3. **SEO Tools**: Position Tracking, Google Console, Local SEO, WordPress Manager
4. **Insights**: Analytics, Recommendations, Goals
5. **Communications**: Email Campaigns, Reports, Notifications
6. **Research**: Keyword Research, Unified Keywords
7. **System**: API Docs, Export & Backup, White-Label, Webhooks, Settings

---

## 2. Sidebar Navigation Structure (Sidebar.jsx)

### Navigation Groups with Icons
- Uses Lucide React icons (consistent across app)
- 7 navigation groups with 24 total items
- Active state highlighting
- Simple button-based navigation
- Current section passed as prop

### Layout
```
┌─ Header (Logo + Title)
├─ Navigation Groups
│  ├─ Main (2 items)
│  ├─ Automation (5 items)
│  ├─ SEO Tools (4 items)
│  ├─ Insights (3 items)
│  ├─ Communications (3 items)
│  ├─ Research (2 items)
│  └─ System (5 items)
└─ Footer (User info)
```

---

## 3. API Integration Layer (services/api.js)

### API Structure
The API service is organized into modules by functionality:

#### Client Management (clientAPI)
- `getAll()`: Fetch all clients with stats
- `getById(clientId)`: Get specific client details
- `updateStatus(clientId, status)`: Update client status
- `testAuth(clientId)`: Test client authentication
- `runAudit(clientId)`: Run SEO audit
- `runOptimization(clientId)`: Run optimization
- `getReports(clientId)`: Get client reports

#### Analytics (analyticsAPI)
- `getSummary()`: Overall analytics summary
- `getClientPerformance(clientId, limit)`: Client performance history
- `getClientAudits(clientId, limit)`: Audit history
- `getAllPerformance(limit)`: All performance data
- `getDailyStats(days)`: Daily statistics
- `getClientMetrics()`: All client metrics

#### Keywords (keywordAPI)
- `listProjects()`: List keyword research projects
- `getProject(projectId)`: Get project details
- `createResearch(data)`: Create keyword research
- `getKeywords(projectId, options)`: Get project keywords with pagination
- `getClientKeywords(clientId, limit)`: Get keywords for a client

#### Auto-Fix (autoFixAPI)
- `getEngines()`: Get all auto-fix engines
- `toggleEngine(engineId, enabled)`: Toggle engine
- `runEngine(engineId, clientId)`: Run specific engine
- `getHistory(limit)`: Fix history
- `updateSettings(engineId, settings)`: Update engine settings

#### Recommendations (recommendationsAPI)
- `getAll(filters)`: Get all recommendations
- `create(data)`: Create recommendation
- `updateStatus(recId, status)`: Update status
- `apply(recId)`: Apply recommendation
- `delete(recId)`: Delete recommendation

#### Goals/KPIs (goalsAPI)
- `getAll()`: Get all goals
- `create(data)`: Create goal
- `update(goalId, data)`: Update goal
- `delete(goalId)`: Delete goal
- `getKPIs()`: Get KPI data

#### Email Campaigns (emailAPI)
- `getCampaigns()`: Get all campaigns
- `createCampaign(data)`: Create campaign
- `sendCampaign(campaignId)`: Send campaign
- `getTemplates()`: Get email templates
- `createTemplate(data)`: Create template
- `deleteCampaign(campaignId)`: Delete campaign

#### Webhooks (webhooksAPI)
- `getAll()`: Get all webhooks
- `create(data)`: Create webhook
- `update(webhookId, data)`: Update webhook
- `delete(webhookId)`: Delete webhook
- `toggle(webhookId, active)`: Toggle webhook
- `test(webhookId)`: Test webhook
- `getLogs(webhookId, limit)`: Get delivery logs

#### Branding (brandingAPI)
- `getSettings()`: Get branding settings
- `updateSettings(data)`: Update settings
- `uploadImage(type, file)`: Upload logo/favicon

#### Settings (settingsAPI)
- `getAll()`: Get all settings
- `update(category, data)`: Update category settings
- `getAPIKeys()`: Get API keys
- `generateAPIKey(name)`: Generate new key
- `revokeAPIKey(keyId)`: Revoke key

#### Batch Operations (batchAPI)
- `optimizeAll()`: Batch optimize all clients
- `auditAll()`: Batch audit all clients
- `testAll()`: Batch test all clients

#### Documentation (docsAPI)
- `list()`: Get documentation list
- `get(filename)`: Get specific documentation

### Health Check
```javascript
healthCheck.backend()        // Check backend availability
healthCheck.keywordService() // Check keyword service
healthCheck.all()            // Check all services
```

### Error Handling
```javascript
handleAPIError(error) // Centralized error handling
```

---

## 4. State Management Approach

### Current Implementation
**No Redux/Context API** - Uses React hooks directly:
- **useState** for local component state
- **useEffect** for side effects and data fetching
- **Custom hooks** (useApi, useApiMutation) for API calls
- Props drilling for passing data between components

### Data Flow Pattern
```
App.jsx (root state)
  ↓
useEffect → fetch /api/dashboard
  ↓
State updates: dashboardData
  ↓
Props passed to child pages:
  - DashboardPage receives data prop
  - ClientDetailPage receives clientId prop
  - Other pages fetch their own data
```

### Custom Hooks for API (hooks/use-api.js)

#### useApi(url, options)
```javascript
// GET requests with loading/error states
const { data, loading, error, refetch } = useApi('/api/endpoint')
```

#### useApiMutation()
```javascript
// POST requests
const { mutate, loading, error } = useApiMutation()
await mutate('/api/endpoint', { data })
```

---

## 5. Component Architecture Patterns

### UI Components (Radix UI + TailwindCSS)
Located in `/components/ui/`:
- **Card**: Container with header, content, footer
- **Button**: Various variants (primary, secondary, ghost, outline)
- **Badge**: Status/tag display
- **Tabs**: Tab navigation
- **Dialog**: Modal dialogs
- **Dropdown Menu**: Context menus
- **Input**: Form input fields
- **Select**: Dropdown select
- **Switch**: Toggle switches
- **Checkbox**: Checkboxes
- **Table**: Data table
- **Progress**: Progress bars
- **Alert**: Alert messages
- **Toast**: Toast notifications
- **Skeleton**: Loading skeletons

### Feature Components
Located in `/components/`:
- **Sidebar**: Navigation sidebar with all menu items
- **StatsCards**: 4-column stats display (Clients, Campaigns, Rankings, Issues)
- **ClientsTable**: Searchable clients table with actions
- **Charts**: Reusable chart components (LineChart, BarChart, AreaChart)
- **RecentActivity**: Activity feed display
- **LoadingState**: Skeleton loaders for various layouts
- **ErrorState**: Error display component

---

## 6. Page Implementation Patterns

### Common Pattern Used Across Pages

#### Example: PositionTrackingPage.jsx
```javascript
export function PositionTrackingPage() {
  // 1. Local state for component
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // 2. Toast notifications
  const { toast } = useToast()
  
  // 3. Event handlers
  const handleFile = async (uploadedFile) => {
    const formData = new FormData()
    formData.append('csv', uploadedFile)
    
    const response = await fetch('/api/position-tracking/analyze', {
      method: 'POST',
      body: formData
    })
    const data = await response.json()
    // Handle response...
  }
  
  // 4. UI with Cards, Tabs, Tables, etc.
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>...</CardHeader>
        <CardContent>...</CardContent>
      </Card>
    </div>
  )
}
```

### Key Features Found
1. **File Upload**: Position Tracking uses drag-drop CSV upload
2. **Real-time Status**: Multiple pages show loading states
3. **Data Transformation**: Client data transformed from API format
4. **Error Handling**: Try-catch blocks with toast notifications
5. **Mocking**: Mock data fallbacks when API unavailable (e.g., AIOptimizerPage)
6. **Charts**: Recharts integration for visualizations
7. **Modals**: Dialog components for detailed views
8. **Tabs**: Tab navigation within pages

---

## 7. Data Loading & Display Patterns

### Dashboard Loading Flow
```
1. App.jsx mounts
2. useEffect → fetch /api/dashboard
3. Transform API response to component format
4. Update dashboardData state
5. Pass data to DashboardPage
6. Components render with data
```

### Parallel API Calls
Multiple requests in parallel (e.g., ClientDetailPage):
```javascript
const [dashResponse, perfResponse, auditResponse, reportsResponse] 
  = await Promise.all([
    fetch('/api/dashboard'),
    fetch(`/api/analytics/client/${clientId}/performance?limit=10`),
    fetch(`/api/analytics/client/${clientId}/audits?limit=10`),
    fetch(`/api/reports/${clientId}`)
  ])
```

### Error Fallbacks
- MockData as fallback (AIOptimizerPage)
- Empty states when API fails
- Toast notifications for errors
- Graceful degradation

---

## 8. Features Currently Implemented

### Fully Functional
1. **Dashboard**: Stats cards, clients table, activity feed, performance charts
2. **Clients Page**: Client list with search, status badges, action menus
3. **Client Detail**: Client metrics, keywords, issues, reports
4. **Position Tracking**: CSV upload, analysis, export
5. **Sidebar Navigation**: All menu items routing correctly
6. **API Integration**: Complete API service layer
7. **Dark Mode**: Theme toggle in header

### Partially Implemented
1. **AI Optimizer**: Mock data for history, client selection
2. **Analytics Page**: Template with charts but basic data
3. **Reports Page**: Template structure created
4. **Email Campaigns**: Template with campaign list
5. **Webhooks**: Template with webhook management

### Template Structure (Not Fully Connected)
1. Auto-Fix Engines
2. Control Center/Automation
3. Keyword Research
4. Recommendations
5. Goals & KPIs
6. Google Search Console
7. Local SEO
8. WordPress Manager
9. Scheduler
10. Bulk Operations
11. Export & Backup
12. Notification Center
13. Settings
14. API Documentation
15. White-Label

---

## 9. Key Integration Points

### Backend API Endpoints
```
Base URL: /api (proxied to http://localhost:9000)

Core:
- /api/dashboard              → GET (all clients, stats)
- /api/analytics/summary      → GET (analytics data)
- /api/analytics/daily-stats  → GET (daily stats)

Client Operations:
- /api/audit/{clientId}       → POST (run audit)
- /api/optimize/{clientId}    → POST (run optimization)
- /api/test-auth/{clientId}   → POST (test auth)

Analytics:
- /api/analytics/client/{id}/performance
- /api/analytics/client/{id}/audits
- /api/analytics/clients/metrics

Keyword Service:
- /api/keyword/projects       → GET (keyword projects)
- /api/keyword/research       → POST (create research)
- /api/keyword/projects/{id}/keywords → GET

AI Optimizer:
- /api/ai-optimizer/status    → GET (optimizer status)

Position Tracking:
- /api/position-tracking/analyze → POST (analyze CSV)

Other Services:
- /api/autofix/engines
- /api/recommendations
- /api/goals
- /api/email/campaigns
- /api/webhooks
- /api/branding
- /api/settings
```

### Socket.io Connections
Configured in vite.config.js but not yet integrated into components.
Ready for real-time updates when implemented.

---

## 10. Styling & Theme System

### CSS Framework
- **TailwindCSS** with custom config
- **Tailwind Animate** for animations
- **Dark Mode**: Class-based via `document.documentElement.classList`

### Color System
Based on Tailwind defaults with custom variants:
- `bg-background`, `bg-card`
- `text-foreground`, `text-muted-foreground`
- `border`, `bg-muted`
- Semantic colors: `success`, `destructive`, `warning`

### Responsive Design
- Mobile-first approach
- Breakpoints: `md:`, `lg:` prefixes used
- Grid layouts with col-span adjustments

---

## 11. Dependencies & External Libraries

### Key Dependencies
- **react-dom**: React rendering
- **react-router-dom**: Routing (installed but not actively used)
- **recharts**: Data visualization
- **axios**: HTTP client
- **lucide-react**: Icons (580+ icons)
- **@radix-ui/***: Accessible UI primitives
- **class-variance-authority**: CSS class composition
- **clsx/tailwind-merge**: Class name utilities
- **date-fns**: Date utilities
- **socket.io-client**: Real-time communication

### Development Dependencies
- **vite**: Build tool
- **@vitejs/plugin-react**: React plugin
- **tailwindcss**: CSS framework
- **postcss/autoprefixer**: CSS processing
- **tailwindcss-animate**: Animation utilities

---

## 12. Architecture Notes & Best Practices

### Current Strengths
1. Clean component separation
2. Centralized API service layer
3. Reusable UI components
4. Consistent error handling
5. Icon system (Lucide React)
6. Loading state skeletons
7. Toast notifications
8. Responsive design

### Areas for Enhancement
1. **State Management**: Consider Context API or Redux for complex state
2. **Routing**: Replace hash routing with React Router for better URL management
3. **Error Boundaries**: Add error boundaries for better error handling
4. **Testing**: Add unit tests and integration tests
5. **Performance**: Consider React Query for better cache management
6. **Type Safety**: Add TypeScript for better developer experience
7. **Environment Config**: Use environment variables for API base URL
8. **Real-time**: Integrate Socket.io for live updates

---

## 13. File Size & Performance Notes

### Large Pages (Complex UIs)
- AIOptimizerPage.jsx: 21KB
- ClientsPage.jsx: 24KB
- ControlCenterPage.jsx: 33KB
- EmailCampaignsPage.jsx: 30KB
- KeywordResearchPage.jsx: 29KB

These could benefit from component splitting to reduce bundle size.

---

## Summary

The dashboard is a well-structured, component-based React application with:
- **24 pages** covering SEO management, analytics, automation, and client management
- **Centralized API service** for all backend communication
- **Consistent UI patterns** using Radix UI + TailwindCSS
- **Simple state management** using React hooks
- **Hash-based routing** (can be upgraded to React Router)
- **Mock data fallbacks** for development/testing
- **Toast notifications** for user feedback
- **Dark mode support**
- **Responsive design**

The architecture is straightforward and easy to extend with new features. New pages should follow the existing patterns for consistency.
