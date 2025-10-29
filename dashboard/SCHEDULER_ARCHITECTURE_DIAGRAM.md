# Scheduler System Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Dashboard UI                           │
│                    (dashboard/src/pages/SchedulerPage.jsx)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Stats Cards  │  │  Jobs Table  │  │  Job History │             │
│  │              │  │              │  │              │             │
│  │ • Total Jobs │  │ • Enable/    │  │ • Timeline   │             │
│  │ • Active     │  │   Disable    │  │ • Status     │             │
│  │ • Success    │  │ • Run Now    │  │ • Duration   │             │
│  │   Rate       │  │ • Edit/Del   │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐        │
│  │         Create/Edit Job Modal                          │        │
│  │  • Job Name & Type                                     │        │
│  │  • Cron Expression Builder                             │        │
│  │  • Client Selection                                    │        │
│  │  • Configuration Options                               │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────┬────────────────────────────┬──────────────────────────┘
              │                            │
              │ HTTP/REST API              │ WebSocket (Real-time)
              │ /api/scheduler/*           │ socket.io
              │                            │
┌─────────────▼────────────────────────────▼──────────────────────────┐
│                      Express.js Server                               │
│                    (dashboard-server.js)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │             Scheduler API Routes                         │      │
│  │                                                           │      │
│  │  GET    /api/scheduler/jobs         ← List all jobs     │      │
│  │  POST   /api/scheduler/jobs         ← Create job        │      │
│  │  PUT    /api/scheduler/jobs/:id     ← Update job        │      │
│  │  DELETE /api/scheduler/jobs/:id     ← Delete job        │      │
│  │  POST   /api/scheduler/jobs/:id/toggle  ← Enable/Disable│      │
│  │  POST   /api/scheduler/jobs/:id/run     ← Run now       │      │
│  │  GET    /api/scheduler/executions   ← History           │      │
│  │  GET    /api/scheduler/stats        ← Statistics        │      │
│  │                                                           │      │
│  └───────────────────────┬──────────────────────────────────┘      │
│                          │                                          │
│                          │                                          │
│  ┌───────────────────────▼──────────────────────────────────┐      │
│  │        Unified Scheduler Manager                         │      │
│  │      (src/automation/scheduler-manager.js)               │      │
│  │                                                           │      │
│  │  • Job Registry (Map<jobId, CronJob>)                   │      │
│  │  • Job State Management                                  │      │
│  │  • Execution Coordinator                                 │      │
│  │  • History Tracking                                      │      │
│  │  • Real-time Events (via socket.io)                     │      │
│  │                                                           │      │
│  │  Methods:                                                │      │
│  │  - registerJob(config)                                   │      │
│  │  - startJob(jobId)                                       │      │
│  │  - stopJob(jobId)                                        │      │
│  │  - executeJob(jobId)                                     │      │
│  │  - getJobStatus(jobId)                                   │      │
│  │  - updateJob(jobId, config)                             │      │
│  │  - deleteJob(jobId)                                      │      │
│  │                                                           │      │
│  └───────────────────┬──────────────────┬───────────────────┘      │
│                      │                  │                           │
│         ┌────────────┴─────┬────────────┴──────┬──────────┐        │
│         │                  │                   │          │        │
│  ┌──────▼─────┐    ┌──────▼─────┐    ┌───────▼────┐   ┌─▼──────┐ │
│  │   Rank     │    │  Local SEO │    │   Email    │   │ Master │ │
│  │  Tracking  │    │  Scheduler │    │ Automation │   │Optimize│ │
│  │ Scheduler  │    │            │    │            │   │        │ │
│  │            │    │            │    │            │   │        │ │
│  │ • Daily    │    │ • NAP Check│    │ • Campaigns│   │• Audit │ │
│  │   Rank     │    │ • Schema   │    │ • Reports  │   │• Fix   │ │
│  │   Check    │    │ • GBP      │    │ • Sequences│   │• AI    │ │
│  │            │    │            │    │            │   │        │ │
│  └────────────┘    └────────────┘    └────────────┘   └────────┘ │
│         │                  │                   │          │        │
└─────────┼──────────────────┼───────────────────┼──────────┼────────┘
          │                  │                   │          │
          │    ┌─────────────┴───────────────────┴──────────┘
          │    │
┌─────────▼────▼────────────────────────────────────────────────────┐
│                     Database Layer                                 │
│                 (src/database/index.js)                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │            scheduler_jobs Table                          │     │
│  │                                                           │     │
│  │  • id (PRIMARY KEY)                                      │     │
│  │  • name                                                   │     │
│  │  • type (rank-tracking, local-seo, email, etc.)         │     │
│  │  • schedule (cron expression)                            │     │
│  │  • enabled (boolean)                                      │     │
│  │  • client_id (NULL = all clients)                        │     │
│  │  • config (JSON)                                          │     │
│  │  • next_run, last_run                                     │     │
│  │  • total_runs, successful_runs                            │     │
│  │  • created_at, updated_at                                 │     │
│  │                                                           │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │         scheduler_executions Table                       │     │
│  │                                                           │     │
│  │  • id (AUTO INCREMENT)                                   │     │
│  │  • job_id (FOREIGN KEY)                                  │     │
│  │  • started_at, completed_at                              │     │
│  │  • status (running, completed, failed)                   │     │
│  │  • duration (ms)                                          │     │
│  │  • success (boolean)                                      │     │
│  │  • output, error (TEXT)                                   │     │
│  │                                                           │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Create New Job Flow

```
┌──────────┐
│   User   │
│  Clicks  │
│"Create   │
│  Job"    │
└────┬─────┘
     │
     ▼
┌────────────────┐
│ CreateJobModal │
│   Opens        │
├────────────────┤
│ • Select Type  │
│ • Set Schedule │
│ • Configure    │
└────┬───────────┘
     │
     │ User fills form
     │ and clicks "Create"
     ▼
┌────────────────┐
│  POST /api/    │
│  scheduler/    │
│  jobs          │
└────┬───────────┘
     │
     ▼
┌────────────────┐
│  Dashboard     │
│  Server        │
│  validates     │
└────┬───────────┘
     │
     ▼
┌────────────────┐
│  Scheduler     │
│  Manager       │
│ .registerJob() │
└────┬───────────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌─────────────┐   ┌──────────┐
│ Create cron │   │  Save to │
│    job      │   │ Database │
└─────────────┘   └──────────┘
     │                  │
     └────────┬─────────┘
              │
              ▼
     ┌────────────────┐
     │ Broadcast via  │
     │  WebSocket     │
     │ 'job-created'  │
     └────┬───────────┘
          │
          ▼
     ┌────────────┐
     │   UI       │
     │  Updates   │
     │ Real-time  │
     └────────────┘
```

### 2. Job Execution Flow

```
┌──────────────┐
│  Cron Timer  │
│   Triggers   │
└──────┬───────┘
       │
       ▼
┌────────────────────┐
│ Scheduler Manager  │
│ executeJob(jobId)  │
└──────┬─────────────┘
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌──────────────┐        ┌───────────────┐
│ Update DB    │        │  WebSocket    │
│ status =     │        │  Broadcast    │
│ 'running'    │        │ 'job-started' │
└──────┬───────┘        └───────────────┘
       │
       ▼
┌────────────────────┐
│  Load Job Config   │
│  & Get Client      │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Route to correct  │
│  Scheduler Module  │
├────────────────────┤
│ • RankScheduler    │
│ • LocalSEO         │
│ • EmailAutomation  │
│ • Master Optimizer │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Execute Task      │
│  (async)           │
└──────┬─────────────┘
       │
       │ On Complete/Error
       │
       ▼
┌────────────────────┐
│  Log Execution     │
│  to DB             │
├────────────────────┤
│ • duration         │
│ • success/failure  │
│ • output/error     │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Update Job Stats  │
├────────────────────┤
│ • last_run         │
│ • total_runs++     │
│ • successful_runs  │
│ • next_run         │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│   WebSocket        │
│   Broadcast        │
│ 'job-completed'    │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│   UI Updates       │
│   Real-time        │
└────────────────────┘
```

### 3. Enable/Disable Job Flow

```
┌──────────┐
│   User   │
│  Toggles │
│  Switch  │
└────┬─────┘
     │
     ▼
┌────────────────┐
│  POST /api/    │
│  scheduler/    │
│  jobs/:id/     │
│  toggle        │
│                │
│  { enabled:    │
│    true/false }│
└────┬───────────┘
     │
     ▼
┌────────────────┐
│  Scheduler     │
│  Manager       │
│ .toggleJob()   │
└────┬───────────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌─────────────┐   ┌──────────┐
│  Start or   │   │  Update  │
│  Stop cron  │   │ Database │
│    job      │   │  enabled │
└─────────────┘   └──────────┘
     │                  │
     └────────┬─────────┘
              │
              ▼
     ┌────────────────┐
     │   Response +   │
     │   WebSocket    │
     └────┬───────────┘
          │
          ▼
     ┌────────────┐
     │   UI       │
     │  Updates   │
     └────────────┘
```

### 4. Run Now Flow

```
┌──────────┐
│   User   │
│  Clicks  │
│ "Run Now"│
└────┬─────┘
     │
     ▼
┌────────────────┐
│  POST /api/    │
│  scheduler/    │
│  jobs/:id/run  │
└────┬───────────┘
     │
     ▼
┌────────────────┐
│  Scheduler     │
│  Manager       │
│ .executeJob()  │
│  (bypass cron) │
└────┬───────────┘
     │
     │ (Same execution
     │  flow as cron
     │  triggered job)
     │
     ▼
┌────────────────┐
│  Execute &     │
│  Track         │
└────────────────┘
```

---

## Component Interaction Matrix

| Component | Interacts With | Purpose |
|-----------|----------------|---------|
| **SchedulerPage.jsx** | Dashboard Server API | Fetch/display jobs |
| **SchedulerPage.jsx** | WebSocket | Real-time updates |
| **CreateJobModal** | Scheduler API | Create new jobs |
| **CronBuilder** | SchedulerPage | Build cron expressions |
| **Dashboard Server** | Scheduler Manager | Route API requests |
| **Scheduler Manager** | Database | Persist jobs & history |
| **Scheduler Manager** | Cron Jobs | Schedule execution |
| **Scheduler Manager** | Automation Modules | Execute tasks |
| **Scheduler Manager** | WebSocket | Broadcast events |
| **RankScheduler** | Rank Tracker | Execute rank checks |
| **LocalSEOScheduler** | Local SEO Orchestrator | Run audits |
| **EmailAutomation** | Email Sender | Send campaigns |
| **Master Optimizer** | Multiple Modules | Orchestrate workflow |

---

## Event Flow (WebSocket)

```
Server Events → Client
══════════════════════

job-started
├─ Payload: { jobId, name, startTime }
└─ UI: Show spinner, update status

job-progress
├─ Payload: { jobId, progress, message }
└─ UI: Update progress bar

job-completed
├─ Payload: { jobId, duration, result }
└─ UI: Show success, update stats

job-failed
├─ Payload: { jobId, error, duration }
└─ UI: Show error notification

job-created
├─ Payload: { job: {...} }
└─ UI: Add to jobs list

job-updated
├─ Payload: { jobId, updates }
└─ UI: Update job in list

job-deleted
├─ Payload: { jobId }
└─ UI: Remove from list

scheduler-stats
├─ Payload: { totalJobs, activeJobs, successRate }
└─ UI: Update stats cards
```

---

## State Management

### Frontend State (React)

```javascript
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [jobs, setJobs] = useState([])
const [stats, setStats] = useState({
  totalJobs: 0,
  activeJobs: 0,
  successRate: 0,
  lastRun: null
})
const [executions, setExecutions] = useState([])
const [showCreateModal, setShowCreateModal] = useState(false)
```

### Backend State (Scheduler Manager)

```javascript
class SchedulerManager {
  constructor() {
    this.jobs = new Map()           // jobId → CronJob instance
    this.activeExecutions = new Map() // jobId → ExecutionState
    this.executionQueue = []         // Queued jobs
    this.isRunning = false          // Manager status
  }
}
```

### Database State (Persistent)

```sql
-- Job configuration
scheduler_jobs
  ├─ Job definitions
  ├─ Schedules
  └─ Metadata

-- Execution history
scheduler_executions
  ├─ Run logs
  ├─ Performance data
  └─ Error tracking
```

---

## Error Handling Strategy

```
┌────────────────┐
│  Job Execution │
│     Starts     │
└────┬───────────┘
     │
     ├─── try {
     │      Execute job
     │    }
     │
     ├─── catch (error) {
     │      Log error
     │      Update status
     │      Notify user
     │    }
     │
     ├─── finally {
     │      Clean up
     │      Update stats
     │      Calculate next run
     │    }
     │
     └─── Error Recovery:
          - Retry (if configured)
          - Alert admin
          - Disable job (if repeated failure)
          - Fallback to safe state
```

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Load History**
   - Only fetch recent executions initially
   - Load more on demand

2. **Job Queue Management**
   - Limit concurrent executions
   - Priority queue for critical jobs

3. **Database Optimization**
   - Index on job_id, created_at
   - Periodic history cleanup

4. **WebSocket Throttling**
   - Batch updates every 500ms
   - Debounce progress events

5. **Memory Management**
   - Clear old execution data
   - Keep only active jobs in memory

---

**Status:** 📐 Architecture Documented
**Next:** Begin Implementation
