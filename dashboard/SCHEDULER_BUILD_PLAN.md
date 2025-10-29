# Scheduler Page Implementation Plan

## Executive Summary
Build a fully functional scheduler page for the SEO automation dashboard that manages all automated tasks, cron jobs, and scheduled workflows with a unified interface.

---

## Current State Analysis

### ✅ What Exists
1. **Frontend UI (SchedulerPage.jsx)** - Complete and well-designed
   - Stats cards (Total Jobs, Active Jobs, Success Rate, Last Execution)
   - Jobs table with enable/disable toggles
   - "Run Now" functionality
   - Execution history timeline
   - Cron format reference guide

2. **Backend Scheduler Modules**
   - `RankScheduler` - Daily rank tracking (default: 6 AM)
   - `LocalSEOScheduler` - Daily local SEO audits (default: 7 AM)
   - `MasterSEOAutomator` - Complete SEO optimization workflows
   - `EmailAutomation` - Campaign and sequence management

3. **Infrastructure**
   - node-cron for scheduling
   - Database (history-db) for storing execution results
   - WebSocket (socket.io) for real-time updates
   - Client management system

### ❌ What's Missing
1. **Backend API Endpoints** - No `/api/scheduler/*` routes
2. **Unified Scheduler Manager** - No central coordinator for all schedulers
3. **Job CRUD Operations** - Cannot create/edit/delete jobs via UI
4. **Persistent Job Storage** - Jobs only exist in memory
5. **Job History Tracking** - No comprehensive execution history
6. **Integration Layer** - Frontend can't communicate with backend schedulers

---

## Architecture Design

### 1. Unified Scheduler Manager
Create a central `SchedulerManager` class that:
- Manages all scheduler instances (rank tracking, local SEO, email, etc.)
- Provides CRUD operations for jobs
- Tracks execution history
- Coordinates job scheduling and execution
- Handles job persistence

```
┌─────────────────────────────────────────┐
│       Unified Scheduler Manager         │
├─────────────────────────────────────────┤
│  - Job Registry                         │
│  - Execution History                    │
│  - Schedule Management                  │
│  - Status Tracking                      │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼──────┐ ┌─────▼──────┐
│  Rank       │ │  Local SEO │
│  Scheduler  │ │  Scheduler │
└─────────────┘ └────────────┘
       │               │
┌──────▼──────┐ ┌─────▼──────┐
│  Email      │ │  Master    │
│  Automation │ │  Optimizer │
└─────────────┘ └────────────┘
```

### 2. Database Schema

**scheduler_jobs** table:
```sql
CREATE TABLE scheduler_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'rank-tracking', 'local-seo', 'email', 'optimization'
  schedule TEXT NOT NULL,           -- Cron expression
  enabled BOOLEAN DEFAULT 1,
  client_id TEXT,                   -- NULL for "all clients"
  config TEXT,                      -- JSON config
  next_run DATETIME,
  last_run DATETIME,
  last_run_success BOOLEAN,
  last_run_duration INTEGER,
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**scheduler_executions** table:
```sql
CREATE TABLE scheduler_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  started_at DATETIME,
  completed_at DATETIME,
  status TEXT,                      -- 'running', 'completed', 'failed'
  duration INTEGER,
  success BOOLEAN,
  output TEXT,
  error TEXT,
  FOREIGN KEY (job_id) REFERENCES scheduler_jobs(id)
);
```

### 3. API Endpoints

**GET /api/scheduler/jobs**
- Returns all scheduled jobs with status and statistics
- Response includes: jobs array, overall stats

**POST /api/scheduler/jobs**
- Create new scheduled job
- Body: { name, type, schedule, clientId, config }

**PUT /api/scheduler/jobs/:id**
- Update existing job
- Body: { name, schedule, enabled, config }

**DELETE /api/scheduler/jobs/:id**
- Delete scheduled job

**POST /api/scheduler/jobs/:id/toggle**
- Enable/disable job
- Body: { enabled: boolean }

**POST /api/scheduler/jobs/:id/run**
- Execute job immediately (bypass schedule)

**GET /api/scheduler/executions**
- Get execution history
- Query params: jobId, limit, status

**GET /api/scheduler/stats**
- Get scheduler statistics and health metrics

---

## Implementation Plan

### Phase 1: Database Setup (30 min)
1. ✅ Create database migration for scheduler tables
2. ✅ Add database operations (schedulerOps) to database/index.js
3. ✅ Initialize with default jobs (rank tracking, local SEO)

### Phase 2: Unified Scheduler Manager (1 hour)
1. ✅ Create `src/automation/scheduler-manager.js`
2. ✅ Implement job registration and lifecycle management
3. ✅ Integrate existing schedulers (RankScheduler, LocalSEOScheduler)
4. ✅ Add execution tracking and history logging
5. ✅ Implement job persistence (save/load from database)

### Phase 3: Backend API Endpoints (1 hour)
1. ✅ Add scheduler routes to `dashboard-server.js`
2. ✅ Implement all CRUD endpoints
3. ✅ Add WebSocket events for real-time updates
4. ✅ Add error handling and validation

### Phase 4: Frontend Enhancements (1 hour)
1. ✅ Add job creation modal/form
2. ✅ Add job editing functionality
3. ✅ Enhance job details display
4. ✅ Add cron expression builder/validator
5. ✅ Improve real-time status updates

### Phase 5: Testing & Integration (30 min)
1. ✅ Test all CRUD operations
2. ✅ Test job execution and history
3. ✅ Test real-time updates
4. ✅ End-to-end scheduler workflow test

### Phase 6: Documentation (15 min)
1. ✅ Add scheduler usage guide
2. ✅ Document job types and configurations
3. ✅ Add troubleshooting section

---

## Job Types & Configurations

### 1. Rank Tracking Job
```javascript
{
  type: 'rank-tracking',
  name: 'Daily Rank Tracking',
  schedule: '0 6 * * *',  // 6 AM daily
  clientId: null,          // All clients
  config: {
    sendNotifications: true,
    alertThreshold: 5      // Alert if position drops by 5+
  }
}
```

### 2. Local SEO Audit Job
```javascript
{
  type: 'local-seo',
  name: 'Daily Local SEO Audit',
  schedule: '0 7 * * *',  // 7 AM daily
  clientId: null,          // All clients
  config: {
    autoFix: true,
    checkNAP: true,
    checkSchema: true,
    checkGBP: true
  }
}
```

### 3. Email Campaign Job
```javascript
{
  type: 'email-campaign',
  name: 'Weekly Client Report',
  schedule: '0 9 * * 1',  // 9 AM every Monday
  clientId: 'client-123',
  config: {
    campaignType: 'weekly-report',
    includeRankings: true,
    includeGSC: true
  }
}
```

### 4. Master Optimization Job
```javascript
{
  type: 'master-optimization',
  name: 'Weekly Full Optimization',
  schedule: '0 2 * * 0',  // 2 AM every Sunday
  clientId: 'client-123',
  config: {
    skipAI: false,
    maxPosts: 50,
    createBackup: true
  }
}
```

### 5. Competitor Monitoring Job
```javascript
{
  type: 'competitor-scan',
  name: 'Weekly Competitor Analysis',
  schedule: '0 8 * * 1',  // 8 AM every Monday
  clientId: 'client-123',
  config: {
    competitors: ['competitor1.com', 'competitor2.com'],
    keywords: ['keyword1', 'keyword2']
  }
}
```

---

## Key Features

### 1. Job Management
- ✅ Create/Edit/Delete jobs via UI
- ✅ Enable/Disable jobs with toggle
- ✅ Run jobs manually (bypass schedule)
- ✅ Clone jobs for similar configurations
- ✅ Bulk operations (enable all, disable all)

### 2. Execution Monitoring
- ✅ Real-time job status updates
- ✅ Live progress indicators
- ✅ Execution history with details
- ✅ Success/failure tracking
- ✅ Performance metrics (duration, success rate)

### 3. Schedule Management
- ✅ Visual cron expression builder
- ✅ Human-readable schedule display
- ✅ Next run time calculation
- ✅ Schedule validation
- ✅ Common presets (daily, weekly, monthly)

### 4. Notifications & Alerts
- ✅ WebSocket real-time updates
- ✅ Job start/complete/failure events
- ✅ Email notifications for failures
- ✅ Discord integration for critical alerts

### 5. Safety & Reliability
- ✅ Job execution timeout protection
- ✅ Automatic retry on failure (configurable)
- ✅ Concurrent job limit
- ✅ Database backup before destructive operations
- ✅ Dry-run mode for testing

---

## UI Components to Add

### 1. Create Job Modal
```
┌────────────────────────────────────┐
│ Create New Scheduled Job       [X] │
├────────────────────────────────────┤
│                                    │
│ Job Name: [________________]       │
│                                    │
│ Job Type: [Dropdown ▼]            │
│                                    │
│ Schedule:                          │
│   ○ Hourly   ○ Daily   ○ Weekly   │
│   ● Custom: [0 6 * * *]           │
│                                    │
│ Client: [All Clients ▼]           │
│                                    │
│ Configuration:                     │
│   ┌──────────────────────────┐    │
│   │ (Dynamic based on type)  │    │
│   └──────────────────────────┘    │
│                                    │
│ [Cancel]           [Create Job] ✓  │
└────────────────────────────────────┘
```

### 2. Job Details Drawer
- Full execution history
- Configuration details
- Edit capabilities
- Logs viewer
- Performance charts

### 3. Cron Expression Builder
- Visual schedule picker
- Common presets
- Real-time validation
- Next 5 run times preview

---

## Success Criteria

### Functionality
- ✅ All existing schedulers integrated and manageable via UI
- ✅ Can create, edit, delete jobs without code changes
- ✅ Jobs persist across server restarts
- ✅ Real-time status updates work correctly
- ✅ Execution history is tracked and displayable

### Performance
- ✅ Scheduler overhead < 1% CPU
- ✅ Job start time accuracy within 1 second
- ✅ History queries < 100ms
- ✅ UI updates < 50ms after job events

### Reliability
- ✅ Jobs survive server crashes
- ✅ No duplicate job executions
- ✅ Failed jobs don't crash scheduler
- ✅ Database operations are atomic

### Usability
- ✅ Non-technical users can create schedules
- ✅ Clear error messages and validation
- ✅ Intuitive job management interface
- ✅ Quick access to common operations

---

## Technical Stack

- **Backend:** Node.js + Express.js
- **Scheduler:** node-cron
- **Database:** SQLite (existing history-db)
- **Real-time:** Socket.io
- **Frontend:** React + shadcn/ui
- **State:** React hooks (useState, useEffect)

---

## Risk Mitigation

### Risk 1: Job Collision
**Problem:** Multiple jobs running simultaneously
**Solution:** Job queue with concurrency limits

### Risk 2: Long-Running Jobs
**Problem:** Jobs blocking scheduler
**Solution:** Job timeout configuration + async execution

### Risk 3: Database Lock
**Problem:** SQLite write contention
**Solution:** Job status in memory, write history async

### Risk 4: Server Restart
**Problem:** Jobs in progress lost
**Solution:** Checkpoint progress, resume on restart

### Risk 5: Invalid Cron Expressions
**Problem:** Syntax errors breaking scheduler
**Solution:** Strict validation before saving

---

## Future Enhancements

### Phase 2 (Future)
1. **Job Dependencies** - Chain jobs together
2. **Conditional Execution** - Run based on metrics
3. **Job Templates** - Pre-configured job types
4. **Scheduler Clustering** - Distributed job execution
5. **Advanced Retry Logic** - Exponential backoff
6. **Job Performance Profiling** - Detailed metrics
7. **Calendar View** - Visual schedule overview
8. **Job Groups** - Organize related jobs
9. **API Webhooks** - Trigger jobs from external systems
10. **Multi-tenant Isolation** - Separate scheduler per client

---

## Code Files to Create/Modify

### New Files
1. `src/database/scheduler-db.js` - Database operations
2. `src/automation/scheduler-manager.js` - Unified manager
3. `dashboard/src/components/CreateJobModal.jsx` - Job creation UI
4. `dashboard/src/components/CronBuilder.jsx` - Cron expression builder

### Modified Files
1. `dashboard-server.js` - Add scheduler API routes
2. `src/database/index.js` - Add scheduler operations
3. `dashboard/src/pages/SchedulerPage.jsx` - Add create/edit functionality

---

## Estimated Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Database Setup | 30 min |
| 2 | Scheduler Manager | 1 hour |
| 3 | Backend API | 1 hour |
| 4 | Frontend Enhancement | 1 hour |
| 5 | Testing | 30 min |
| 6 | Documentation | 15 min |
| **Total** | | **~4 hours** |

---

## Next Steps

1. **Review Plan** - Validate approach and architecture
2. **Database Migration** - Create scheduler tables
3. **Build Scheduler Manager** - Core functionality
4. **Implement API Endpoints** - Backend integration
5. **Enhance Frontend** - Complete UI
6. **Test & Deploy** - End-to-end validation

---

## Notes

- Leverage existing cron-based schedulers (RankScheduler, LocalSEOScheduler)
- Maintain backward compatibility with existing automation
- Use WebSocket for real-time updates (already configured)
- Follow existing code patterns and conventions
- Prioritize reliability over features
- Keep UI simple and intuitive

---

**Status:** 📋 Plan Complete - Ready for Implementation
**Priority:** HIGH
**Estimated Effort:** 4 hours
**Impact:** Major improvement to automation management
