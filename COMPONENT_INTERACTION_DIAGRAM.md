# Component Interaction & Data Flow Diagram

## Overall Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser (Port 5173)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    App.jsx (Root)                        │   │
│  │  State:                                                  │   │
│  │  - currentSection (routing)                              │   │
│  │  - selectedClient (detail view)                          │   │
│  │  - isDark (theme)                                        │   │
│  │  - dashboardData (stats, clients, activities)            │   │
│  │                                                          │   │
│  │  useEffect: fetch /api/dashboard every 30s              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                    │                                             │
│        ┌───────────┼───────────┐                                │
│        │           │           │                                │
│  ┌─────▼─────┐ ┌──▼──────┐ ┌─▼──────────┐                      │
│  │  Sidebar  │ │  Header  │ │ Main Page  │                      │
│  │           │ │          │ │            │                      │
│  │ - Navs    │ │- Search  │ │ 24 Pages   │                      │
│  │ - Groups  │ │- Theme   │ │ (rendered  │                      │
│  │ - Icons   │ │- Notifs  │ │  based on  │                      │
│  │           │ │- Dropdown│ │ section)   │                      │
│  └─────────────┴──────────┘ └────────────┘                      │
│                                   │                              │
│           ┌───────────────────────┼───────────────────────┐     │
│           │                       │                       │     │
│      ┌────▼────┐            ┌────▼────┐           ┌──────▼──┐  │
│      │Dashboard│            │ Clients  │           │Analytics│  │
│      │  Page   │            │  Page    │           │  Page   │  │
│      │         │            │          │           │         │  │
│      │ receives│            │ fetches  │           │ fetches │  │
│      │ data as │            │ own data │           │ own data│  │
│      │ props   │            │ on mount │           │ on mount│  │
│      └────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ▲
                               │ (HTTP proxied)
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                  Backend Server (Port 9000)                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Core API   │  │  Analytics   │  │  Keyword     │           │
│  │              │  │  Service     │  │  Service     │           │
│  │ /api/        │  │  (Python)    │  │  (Python)    │           │
│  │  dashboard   │  │              │  │              │           │
│  │  /audit/     │  │ /analytics/  │  │ /keyword/    │           │
│  │  /optimize/  │  │   summary    │  │  projects    │           │
│  │  /reports/   │  │  /daily-     │  │  /research   │           │
│  │              │  │   stats      │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Auto-Fix API │  │ Goals API    │  │ Email API    │           │
│  │              │  │              │  │              │           │
│  │ /autofix/    │  │ /goals/      │  │ /email/      │           │
│  │  engines     │  │  /kpis       │  │ campaigns    │           │
│  │  /history    │  │              │  │ /templates   │           │
│  │              │  │              │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Webhooks API │  │ Settings API │  │ Branding API │           │
│  │              │  │              │  │              │           │
│  │ /webhooks/   │  │ /settings/   │  │ /branding/   │           │
│  │  create      │  │  update      │  │ upload       │           │
│  │  /toggle     │  │  /api-keys   │  │              │           │
│  │  /test       │  │              │  │              │           │
│  │              │  │              │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow for Key Features

### 1. Dashboard Loading Flow

```
App.jsx mounts
   ↓
useEffect hook runs
   ↓
fetch('/api/dashboard')
   ↓
Backend returns:
{
  stats: { total, active, configured, needsSetup },
  clients: [ { id, name, domain, status, ... } ],
  ...
}
   ↓
Transform API response to component format:
{
  stats: { totalClients, activeCampaigns, avgRanking, issuesFound },
  clients: [ { id, name, domain, status, keywords, avgRank, ... } ],
  activities: [ { type, title, description, ... } ]
}
   ↓
setState(dashboardData)
   ↓
DashboardPage receives data as prop
   ↓
DashboardPage renders:
  - StatsCards (from stats)
  - ClientsTable (from clients)
  - RecentActivity (from activities)
  - Charts with performance data
```

### 2. Client Detail Loading Flow

```
User clicks on a client in ClientsTable
   ↓
handleClientSelect(clientId) called
   ↓
setCurrentSection('client-detail')
setSelectedClient(clientId)
   ↓
ClientDetailPage mounts with clientId prop
   ↓
useEffect hook with dependency [clientId]
   ↓
Fetch in parallel:
1. /api/dashboard (to get client info)
2. /api/analytics/client/{id}/performance?limit=10
3. /api/analytics/client/{id}/audits?limit=10
4. /api/reports/{clientId}
   ↓
Transform and merge responses
   ↓
Calculate metrics from historical data
Generate mock keywords (TODO: use keyword API)
   ↓
setState(client)
   ↓
Render ClientDetailPage with:
  - Client header with status
  - Metrics cards with trends
  - Rankings chart
  - Traffic chart
  - Top keywords
  - Recent issues
  - Reports list
```

### 3. Page Navigation Flow

```
User clicks sidebar item
   ↓
onNavigate(sectionId) called
   ↓
setCurrentSection(sectionId)
   ↓
App.jsx re-renders with new currentSection
   ↓
App.jsx checks conditional:
if (currentSection === 'position-tracking')
  render <PositionTrackingPage />
else if (currentSection === 'analytics')
  render <AnalyticsPage />
...
   ↓
Page component mounts
   ↓
Some pages fetch data (e.g., AnalyticsPage)
Some receive data as props (e.g., DashboardPage)
   ↓
Page renders with data
```

### 4. API Call Pattern (Example: Position Tracking)

```
User drags CSV file onto upload area
   ↓
handleDrop(e) triggered
   ↓
handleFile(file) called
   ↓
Create FormData:
formData.append('csv', file)
   ↓
setLoading(true)
   ↓
fetch('/api/position-tracking/analyze', {
  method: 'POST',
  body: formData
})
   ↓
Backend analyzes file, returns:
{
  success: true,
  analysis: {
    stats: { totalKeywords, ... },
    critical: [ { keyword, position, ... } ],
    opportunities: [ { keyword, position, ... } ],
    ...
  }
}
   ↓
setAnalysis(data.analysis)
setLoading(false)
   ↓
Display analysis in tabs:
  - Summary
  - Critical Issues
  - Opportunities
   ↓
User can click "Export" button
   ↓
Generate CSV content
Create blob and download
```

---

## Component Hierarchy

```
App
├── Sidebar
│   ├── Nav Groups (7)
│   │   ├── Nav Items (24 total)
│   │   │   └── Button
│   │   └── ...
│   └── Footer (User info)
├── Header
│   ├── Search Input
│   ├── Theme Toggle Button
│   └── Notifications Dropdown
│       └── DropdownMenu
│           ├── DropdownMenuTrigger
│           └── DropdownMenuContent
└── Main Content (conditional render)
    ├── DashboardPage (when section === 'dashboard')
    │   ├── StatsCards (4 cards)
    │   │   └── Card × 4
    │   │       ├── Icon
    │   │       └── Badge
    │   ├── ClientsTable
    │   │   ├── Input (search)
    │   │   └── Table
    │   │       ├── TableHeader
    │   │       └── TableBody
    │   │           └── TableRow × N
    │   ├── RecentActivity
    │   │   └── Activity items
    │   └── Charts (3 tabs)
    │       ├── LineChart (Recharts)
    │       ├── AreaChart (Recharts)
    │       └── BarChart (Recharts)
    │
    ├── ClientDetailPage (when section === 'client-detail')
    │   ├── Header with back button
    │   ├── Metrics Cards (4)
    │   │   └── Card with TrendingUp/Down icons
    │   ├── Tabs
    │   │   ├── TabsTrigger × N
    │   │   └── TabsContent
    │   │       ├── Keywords Table
    │   │       ├── Issues List
    │   │       ├── Charts
    │   │       └── Reports List
    │   └── Action Buttons
    │       ├── Run Audit
    │       ├── Configure
    │       └── View Details
    │
    ├── ClientsPage (when section === 'clients')
    │   ├── Header with "Add Client" button
    │   ├── ClientsTable (same as dashboard)
    │   └── Filters/Search
    │
    ├── AnalyticsPage (when section === 'analytics')
    │   ├── Header
    │   ├── Tabs for different views
    │   │   ├── Overview
    │   │   ├── Performance
    │   │   ├── Rankings
    │   │   └── Traffic
    │   └── Charts (Recharts)
    │
    ├── PositionTrackingPage (when section === 'position-tracking')
    │   ├── Header
    │   ├── Drag-drop upload zone
    │   ├── Tabs
    │   │   ├── Summary
    │   │   ├── Critical Issues
    │   │   └── Opportunities
    │   └── Action buttons (Export)
    │
    ├── AIOptimizerPage (when section === 'ai-optimizer')
    │   ├── Stats cards
    │   ├── Client selector
    │   ├── Optimization history table
    │   ├── Before/After comparison
    │   └── Suggestions dialog
    │
    └── ... (21 other pages following similar patterns)
```

---

## State Management Flow

### App.jsx (Root State)

```
useState hooks:
  ├── currentSection: string
  │   ├── Updated by: handleNavigate(section)
  │   └── Used by: conditional rendering of pages
  │
  ├── selectedClient: string | null
  │   ├── Updated by: handleClientSelect(clientId)
  │   └── Used by: ClientDetailPage receives as prop
  │
  ├── isDark: boolean
  │   ├── Updated by: toggleTheme()
  │   └── Used by: apply/remove 'dark' class on document.documentElement
  │
  └── dashboardData: object
      ├── Structure:
      │   {
      │     stats: {
      │       totalClients: number,
      │       activeCampaigns: number,
      │       avgRanking: number,
      │       issuesFound: number
      │     },
      │     clients: [ { id, name, domain, status, keywords, avgRank } ],
      │     activities: [ { type, title, description, client, timestamp } ],
      │     loading: boolean
      │   }
      ├── Updated by: useEffect on mount and every 30s
      └── Passed to: DashboardPage and AnalyticsPage
```

### Page-Level State Examples

#### PositionTrackingPage
```
useState hooks:
  ├── file: File | null
  ├── analysis: object | null (result from API)
  ├── loading: boolean
  └── dragActive: boolean
```

#### AIOptimizerPage
```
useState hooks:
  ├── loading: boolean
  ├── error: string | null
  ├── optimizing: boolean
  ├── selectedClient: string
  ├── selectedComparison: object | null
  └── optimizerData: {
      queue: [],
      history: [],
      stats: {},
      clients: []
    }
```

#### ClientDetailPage
```
useState hooks:
  ├── client: object | null
  ├── loading: boolean
  ├── error: string | null
  └── runningAudit: boolean
```

---

## API Service Module Exports

```
api.js exports:

const API_BASE = '/api'

export:
  ├── clientAPI
  │   ├── getAll()
  │   ├── getById(clientId)
  │   ├── updateStatus(clientId, status)
  │   ├── testAuth(clientId)
  │   ├── runAudit(clientId)
  │   ├── runOptimization(clientId)
  │   └── getReports(clientId)
  │
  ├── analyticsAPI
  │   ├── getSummary()
  │   ├── getClientPerformance(clientId, limit)
  │   ├── getClientAudits(clientId, limit)
  │   ├── getAllPerformance(limit)
  │   ├── getDailyStats(days)
  │   └── getClientMetrics()
  │
  ├── keywordAPI
  │   ├── listProjects()
  │   ├── getProject(projectId)
  │   ├── createResearch(data)
  │   ├── getKeywords(projectId, options)
  │   └── getClientKeywords(clientId, limit)
  │
  ├── autoFixAPI
  │   ├── getEngines()
  │   ├── toggleEngine(engineId, enabled)
  │   ├── runEngine(engineId, clientId)
  │   ├── getHistory(limit)
  │   └── updateSettings(engineId, settings)
  │
  ├── recommendationsAPI
  │   ├── getAll(filters)
  │   ├── create(data)
  │   ├── updateStatus(recId, status)
  │   ├── apply(recId)
  │   └── delete(recId)
  │
  ├── goalsAPI
  │   ├── getAll()
  │   ├── create(data)
  │   ├── update(goalId, data)
  │   ├── delete(goalId)
  │   └── getKPIs()
  │
  ├── emailAPI
  │   ├── getCampaigns()
  │   ├── createCampaign(data)
  │   ├── sendCampaign(campaignId)
  │   ├── getTemplates()
  │   ├── createTemplate(data)
  │   └── deleteCampaign(campaignId)
  │
  ├── webhooksAPI
  │   ├── getAll()
  │   ├── create(data)
  │   ├── update(webhookId, data)
  │   ├── delete(webhookId)
  │   ├── toggle(webhookId, active)
  │   ├── test(webhookId)
  │   └── getLogs(webhookId, limit)
  │
  ├── brandingAPI
  │   ├── getSettings()
  │   ├── updateSettings(data)
  │   └── uploadImage(type, file)
  │
  ├── settingsAPI
  │   ├── getAll()
  │   ├── update(category, data)
  │   ├── getAPIKeys()
  │   ├── generateAPIKey(name)
  │   └── revokeAPIKey(keyId)
  │
  ├── batchAPI
  │   ├── optimizeAll()
  │   ├── auditAll()
  │   └── testAll()
  │
  ├── docsAPI
  │   ├── list()
  │   └── get(filename)
  │
  ├── healthCheck
  │   ├── backend()
  │   ├── keywordService()
  │   └── all()
  │
  └── handleAPIError(error)
```

---

## Recommended Data Structure for New Pages

When creating new pages, follow this pattern:

```javascript
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'

export function NewFeaturePage() {
  // 1. State
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { toast } = useToast()
  
  // 2. Fetch data
  useEffect(() => {
    fetchData()
  }, [])
  
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/feature-endpoint')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  // 3. Render
  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={fetchData} />
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Name</h1>
          <p className="text-muted-foreground">Description</p>
        </div>
        <Button onClick={fetchData}>Refresh</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Content Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Render data */}
        </CardContent>
      </Card>
    </div>
  )
}
```

This ensures consistency with the existing architecture!
