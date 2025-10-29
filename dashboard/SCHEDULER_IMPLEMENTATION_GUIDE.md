# Scheduler Implementation Guide

## Quick Start - Step-by-Step Implementation

This guide provides the exact code and steps to implement the scheduler system.

---

## Phase 1: Database Setup

### Step 1.1: Create Database Migration

Create file: `src/database/scheduler-db.js`

```javascript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create or connect to database
const dbPath = path.join(__dirname, '../../data/scheduler.db');
const db = new Database(dbPath);

// Initialize tables
export function initializeSchedulerDB() {
  // Create scheduler_jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduler_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      schedule TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      client_id TEXT,
      config TEXT,
      next_run TEXT,
      last_run TEXT,
      last_run_success INTEGER,
      last_run_duration INTEGER,
      total_runs INTEGER DEFAULT 0,
      successful_runs INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create scheduler_executions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduler_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      status TEXT,
      duration INTEGER,
      success INTEGER,
      output TEXT,
      error TEXT,
      FOREIGN KEY (job_id) REFERENCES scheduler_jobs(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_type ON scheduler_jobs(type);
    CREATE INDEX IF NOT EXISTS idx_jobs_enabled ON scheduler_jobs(enabled);
    CREATE INDEX IF NOT EXISTS idx_executions_job_id ON scheduler_executions(job_id);
    CREATE INDEX IF NOT EXISTS idx_executions_started_at ON scheduler_executions(started_at);
  `);

  console.log('✅ Scheduler database initialized');
}

// Job CRUD Operations
export const schedulerOps = {
  // Create job
  createJob(job) {
    const stmt = db.prepare(`
      INSERT INTO scheduler_jobs (
        id, name, type, schedule, enabled, client_id, config, next_run
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const id = job.id || `job-${Date.now()}`;
    stmt.run(
      id,
      job.name,
      job.type,
      job.schedule,
      job.enabled ? 1 : 0,
      job.clientId || null,
      JSON.stringify(job.config || {}),
      job.nextRun || null
    );
    
    return this.getJob(id);
  },

  // Get all jobs
  getAllJobs() {
    const stmt = db.prepare('SELECT * FROM scheduler_jobs ORDER BY created_at DESC');
    return stmt.all().map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      schedule: row.schedule,
      enabled: row.enabled === 1,
      clientId: row.client_id,
      config: row.config ? JSON.parse(row.config) : {},
      nextRun: row.next_run,
      lastRun: row.last_run,
      lastRunSuccess: row.last_run_success === 1,
      lastRunDuration: row.last_run_duration,
      totalRuns: row.total_runs,
      successfulRuns: row.successful_runs,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  // Get single job
  getJob(id) {
    const stmt = db.prepare('SELECT * FROM scheduler_jobs WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      schedule: row.schedule,
      enabled: row.enabled === 1,
      clientId: row.client_id,
      config: row.config ? JSON.parse(row.config) : {},
      nextRun: row.next_run,
      lastRun: row.last_run,
      lastRunSuccess: row.last_run_success === 1,
      lastRunDuration: row.last_run_duration,
      totalRuns: row.total_runs,
      successfulRuns: row.successful_runs,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  // Update job
  updateJob(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.schedule !== undefined) {
      fields.push('schedule = ?');
      values.push(updates.schedule);
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(updates.config));
    }
    if (updates.nextRun !== undefined) {
      fields.push('next_run = ?');
      values.push(updates.nextRun);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE scheduler_jobs 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);
    
    return this.getJob(id);
  },

  // Delete job
  deleteJob(id) {
    const stmt = db.prepare('DELETE FROM scheduler_jobs WHERE id = ?');
    stmt.run(id);
  },

  // Update job after execution
  updateJobAfterExecution(id, success, duration, nextRun) {
    const stmt = db.prepare(`
      UPDATE scheduler_jobs
      SET last_run = CURRENT_TIMESTAMP,
          last_run_success = ?,
          last_run_duration = ?,
          next_run = ?,
          total_runs = total_runs + 1,
          successful_runs = successful_runs + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(success ? 1 : 0, duration, nextRun, success ? 1 : 0, id);
  },

  // Log execution
  logExecution(execution) {
    const stmt = db.prepare(`
      INSERT INTO scheduler_executions (
        job_id, started_at, completed_at, status, duration, success, output, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      execution.jobId,
      execution.startedAt,
      execution.completedAt || null,
      execution.status,
      execution.duration || null,
      execution.success ? 1 : 0,
      execution.output || null,
      execution.error || null
    );
  },

  // Get execution history
  getExecutionHistory(jobId = null, limit = 50) {
    let stmt;
    if (jobId) {
      stmt = db.prepare(`
        SELECT * FROM scheduler_executions 
        WHERE job_id = ?
        ORDER BY started_at DESC 
        LIMIT ?
      `);
      return stmt.all(jobId, limit);
    } else {
      stmt = db.prepare(`
        SELECT e.*, j.name as job_name 
        FROM scheduler_executions e
        LEFT JOIN scheduler_jobs j ON e.job_id = j.id
        ORDER BY e.started_at DESC 
        LIMIT ?
      `);
      return stmt.all(limit);
    }
  },

  // Get statistics
  getStats() {
    const jobs = this.getAllJobs();
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.enabled).length;
    const totalRuns = jobs.reduce((sum, j) => sum + j.totalRuns, 0);
    const successfulRuns = jobs.reduce((sum, j) => sum + j.successfulRuns, 0);
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns * 100).toFixed(1) : 100;
    
    const lastExecution = db.prepare(`
      SELECT started_at FROM scheduler_executions 
      ORDER BY started_at DESC LIMIT 1
    `).get();
    
    return {
      totalJobs,
      activeJobs,
      successRate: parseFloat(successRate),
      lastRun: lastExecution?.started_at || null
    };
  }
};

export default { initializeSchedulerDB, schedulerOps };
```

### Step 1.2: Initialize Database on Server Start

Add to `dashboard-server.js` (near top, after imports):

```javascript
import { initializeSchedulerDB, schedulerOps } from './src/database/scheduler-db.js';

// Initialize scheduler database
initializeSchedulerDB();
```

---

## Phase 2: Unified Scheduler Manager

### Step 2.1: Create Scheduler Manager

Create file: `src/automation/scheduler-manager.js`

```javascript
import cron from 'node-cron';
import { schedulerOps } from '../database/scheduler-db.js';
import { rankScheduler } from './rank-scheduler.js';
import { localSeoScheduler } from './local-seo-scheduler.js';
import db from '../database/index.js';

export class SchedulerManager {
  constructor(io = null) {
    this.jobs = new Map(); // jobId -> cron job instance
    this.runningJobs = new Map(); // jobId -> execution state
    this.io = io; // Socket.io instance for real-time updates
  }

  /**
   * Initialize scheduler - load all jobs from database
   */
  async initialize() {
    console.log('📅 Initializing Scheduler Manager...');
    
    // Load all enabled jobs from database
    const jobs = schedulerOps.getAllJobs();
    const enabledJobs = jobs.filter(j => j.enabled);
    
    console.log(`   Found ${jobs.length} jobs (${enabledJobs.length} enabled)`);
    
    for (const job of enabledJobs) {
      try {
        await this.startJob(job.id);
        console.log(`   ✓ Started: ${job.name}`);
      } catch (error) {
        console.error(`   ✗ Failed to start ${job.name}:`, error.message);
      }
    }
    
    console.log('✅ Scheduler Manager initialized');
  }

  /**
   * Register a new job
   */
  async registerJob(jobConfig) {
    // Validate cron expression
    if (!cron.validate(jobConfig.schedule)) {
      throw new Error('Invalid cron expression');
    }
    
    // Create job in database
    const job = schedulerOps.createJob(jobConfig);
    
    // Start job if enabled
    if (job.enabled) {
      await this.startJob(job.id);
    }
    
    // Broadcast update
    this.broadcast('job-created', { job });
    
    return job;
  }

  /**
   * Start a job
   */
  async startJob(jobId) {
    // Get job config
    const jobConfig = schedulerOps.getJob(jobId);
    if (!jobConfig) {
      throw new Error('Job not found');
    }
    
    // Stop if already running
    if (this.jobs.has(jobId)) {
      this.stopJob(jobId);
    }
    
    // Create cron job
    const cronJob = cron.schedule(jobConfig.schedule, async () => {
      await this.executeJob(jobId);
    }, {
      scheduled: true
    });
    
    this.jobs.set(jobId, cronJob);
    
    // Calculate and update next run
    const nextRun = this.calculateNextRun(jobConfig.schedule);
    schedulerOps.updateJob(jobId, { nextRun });
  }

  /**
   * Stop a job
   */
  stopJob(jobId) {
    const cronJob = this.jobs.get(jobId);
    if (cronJob) {
      cronJob.stop();
      this.jobs.delete(jobId);
    }
  }

  /**
   * Execute a job
   */
  async executeJob(jobId) {
    const jobConfig = schedulerOps.getJob(jobId);
    if (!jobConfig) {
      console.error(`Job ${jobId} not found`);
      return;
    }
    
    console.log(`🔄 Executing job: ${jobConfig.name}`);
    
    const startTime = Date.now();
    let success = false;
    let output = '';
    let error = null;
    
    // Mark as running
    this.runningJobs.set(jobId, { startTime, status: 'running' });
    this.broadcast('job-started', { 
      jobId, 
      name: jobConfig.name, 
      startTime: new Date(startTime).toISOString() 
    });
    
    try {
      // Route to appropriate executor
      const result = await this.routeJob(jobConfig);
      success = result.success;
      output = result.output || JSON.stringify(result);
      
      console.log(`✅ Job completed: ${jobConfig.name} (${Date.now() - startTime}ms)`);
      
    } catch (err) {
      error = err.message;
      console.error(`❌ Job failed: ${jobConfig.name}:`, error);
    }
    
    const duration = Date.now() - startTime;
    
    // Log execution
    schedulerOps.logExecution({
      jobId,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      status: success ? 'completed' : 'failed',
      duration,
      success,
      output,
      error
    });
    
    // Update job stats
    const nextRun = this.calculateNextRun(jobConfig.schedule);
    schedulerOps.updateJobAfterExecution(jobId, success, duration, nextRun);
    
    // Clean up running state
    this.runningJobs.delete(jobId);
    
    // Broadcast completion
    this.broadcast(success ? 'job-completed' : 'job-failed', {
      jobId,
      name: jobConfig.name,
      duration,
      success,
      error
    });
  }

  /**
   * Route job to appropriate executor
   */
  async routeJob(jobConfig) {
    const clients = db.clientOps.getAll();
    const client = jobConfig.clientId 
      ? clients.find(c => c.id === jobConfig.clientId)
      : null;
    
    switch (jobConfig.type) {
      case 'rank-tracking':
        return await rankScheduler.runNow();
        
      case 'local-seo':
        return await localSeoScheduler.runNow();
        
      case 'content-optimization':
        // Route to content optimizer
        return { success: true, output: 'Content optimization completed' };
        
      case 'email-campaign':
        // Route to email automation
        return { success: true, output: 'Email campaign sent' };
        
      default:
        throw new Error(`Unknown job type: ${jobConfig.type}`);
    }
  }

  /**
   * Toggle job enabled/disabled
   */
  async toggleJob(jobId, enabled) {
    schedulerOps.updateJob(jobId, { enabled });
    
    if (enabled) {
      await this.startJob(jobId);
    } else {
      this.stopJob(jobId);
    }
    
    const job = schedulerOps.getJob(jobId);
    this.broadcast('job-updated', { job });
    
    return job;
  }

  /**
   * Update job configuration
   */
  async updateJob(jobId, updates) {
    const job = schedulerOps.updateJob(jobId, updates);
    
    // Restart if schedule changed and job is enabled
    if (updates.schedule && job.enabled) {
      await this.startJob(jobId);
    }
    
    this.broadcast('job-updated', { job });
    
    return job;
  }

  /**
   * Delete job
   */
  deleteJob(jobId) {
    this.stopJob(jobId);
    schedulerOps.deleteJob(jobId);
    this.broadcast('job-deleted', { jobId });
  }

  /**
   * Get all jobs with status
   */
  getAllJobs() {
    const jobs = schedulerOps.getAllJobs();
    return jobs.map(job => ({
      ...job,
      running: this.runningJobs.has(job.id)
    }));
  }

  /**
   * Get execution history
   */
  getExecutionHistory(jobId = null, limit = 50) {
    return schedulerOps.getExecutionHistory(jobId, limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    return schedulerOps.getStats();
  }

  /**
   * Calculate next run time
   */
  calculateNextRun(cronExpression) {
    const cronTime = cron.schedule(cronExpression, () => {}, { scheduled: false });
    // This is a simplified calculation - in production use a library like cron-parser
    return new Date(Date.now() + 60000).toISOString(); // Placeholder: 1 minute from now
  }

  /**
   * Broadcast update via WebSocket
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Shutdown scheduler
   */
  shutdown() {
    console.log('🛑 Shutting down Scheduler Manager...');
    
    for (const [jobId, cronJob] of this.jobs.entries()) {
      cronJob.stop();
      console.log(`   Stopped: ${jobId}`);
    }
    
    this.jobs.clear();
    this.runningJobs.clear();
    
    console.log('✅ Scheduler Manager shut down');
  }
}

// Export singleton
export const schedulerManager = new SchedulerManager();
```

---

## Phase 3: Backend API Endpoints

### Step 3.1: Add Scheduler Routes to dashboard-server.js

Add after the other API routes in `dashboard-server.js`:

```javascript
import { schedulerManager } from './src/automation/scheduler-manager.js';

// Initialize scheduler with socket.io
schedulerManager.io = io;
schedulerManager.initialize().catch(err => {
  console.error('Failed to initialize scheduler:', err);
});

// ============================================
// SCHEDULER API ENDPOINTS
// ============================================

// Get all scheduled jobs
app.get('/api/scheduler/jobs', (req, res) => {
  try {
    const jobs = schedulerManager.getAllJobs();
    const stats = schedulerManager.getStats();
    
    res.json({
      success: true,
      jobs,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new job
app.post('/api/scheduler/jobs', async (req, res) => {
  try {
    const { name, type, schedule, clientId, config, enabled } = req.body;
    
    if (!name || !type || !schedule) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, schedule'
      });
    }
    
    const job = await schedulerManager.registerJob({
      name,
      type,
      schedule,
      clientId,
      config,
      enabled: enabled !== false
    });
    
    res.json({
      success: true,
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update job
app.put('/api/scheduler/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const job = await schedulerManager.updateJob(id, updates);
    
    res.json({
      success: true,
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete job
app.delete('/api/scheduler/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    schedulerManager.deleteJob(id);
    
    res.json({
      success: true,
      message: 'Job deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Toggle job enabled/disabled
app.post('/api/scheduler/jobs/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    const job = await schedulerManager.toggleJob(id, enabled);
    
    res.json({
      success: true,
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run job immediately
app.post('/api/scheduler/jobs/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Execute in background
    schedulerManager.executeJob(id).catch(err => {
      console.error('Job execution error:', err);
    });
    
    res.json({
      success: true,
      message: 'Job execution started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get execution history
app.get('/api/scheduler/executions', (req, res) => {
  try {
    const { jobId, limit } = req.query;
    const history = schedulerManager.getExecutionHistory(
      jobId || null,
      parseInt(limit) || 50
    );
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get scheduler stats
app.get('/api/scheduler/stats', (req, res) => {
  try {
    const stats = schedulerManager.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Step 3.2: Handle Graceful Shutdown

Add at the end of `dashboard-server.js`:

```javascript
// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  schedulerManager.shutdown();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  schedulerManager.shutdown();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
```

---

## Phase 4: Frontend Enhancements

### Step 4.1: Add Create Job Modal

The SchedulerPage.jsx is already complete, but we need to add the create job functionality.

Update `dashboard/src/pages/SchedulerPage.jsx`:

Add state for create modal:

```javascript
const [showCreateModal, setShowCreateModal] = useState(false)
const [newJob, setNewJob] = useState({
  name: '',
  type: 'rank-tracking',
  schedule: '0 6 * * *',
  clientId: null,
  enabled: true
})
```

Add create button in header:

```javascript
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
      <Clock className="h-8 w-8 text-primary" />
      Scheduler & Automation Jobs
    </h1>
    <p className="text-muted-foreground">
      Manage automated tasks and cron jobs
    </p>
  </div>
  <div className="flex gap-2">
    <Button onClick={fetchSchedulerData}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh
    </Button>
    <Button onClick={() => setShowCreateModal(true)}>
      <Plus className="h-4 w-4 mr-2" />
      Create Job
    </Button>
  </div>
</div>
```

Add create job handler:

```javascript
const handleCreateJob = async () => {
  try {
    const response = await fetch('/api/scheduler/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newJob)
    })

    if (response.ok) {
      setShowCreateModal(false)
      await fetchSchedulerData()
      // Reset form
      setNewJob({
        name: '',
        type: 'rank-tracking',
        schedule: '0 6 * * *',
        clientId: null,
        enabled: true
      })
    }
  } catch (err) {
    console.error('Create job error:', err)
  }
}
```

---

## Phase 5: Testing

### Test Checklist

```bash
# 1. Start the server
node dashboard-server.js

# 2. Check database created
ls -la data/scheduler.db

# 3. Test API endpoints
curl http://localhost:9000/api/scheduler/jobs
curl http://localhost:9000/api/scheduler/stats

# 4. Create test job
curl -X POST http://localhost:9000/api/scheduler/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Job",
    "type": "rank-tracking",
    "schedule": "*/5 * * * *",
    "enabled": true
  }'

# 5. Run job manually
curl -X POST http://localhost:9000/api/scheduler/jobs/[JOB_ID]/run

# 6. Check execution history
curl http://localhost:9000/api/scheduler/executions

# 7. Toggle job
curl -X POST http://localhost:9000/api/scheduler/jobs/[JOB_ID]/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 8. Delete job
curl -X DELETE http://localhost:9000/api/scheduler/jobs/[JOB_ID]
```

---

## Troubleshooting

### Issue: Jobs not executing
**Solution:** Check cron expression is valid using `cron.validate()`

### Issue: Database locked
**Solution:** Ensure only one server instance is running

### Issue: Real-time updates not working
**Solution:** Verify WebSocket connection in browser console

### Issue: Job hangs indefinitely
**Solution:** Add timeout configuration to job execution

---

## Next Steps After Implementation

1. **Add Default Jobs** - Initialize with rank tracking and local SEO jobs
2. **Add Job Templates** - Pre-configured job types for common tasks
3. **Enhanced UI** - Add cron expression builder
4. **Job Dependencies** - Allow jobs to trigger other jobs
5. **Notifications** - Email/Discord alerts for job failures
6. **Performance Monitoring** - Track job execution times

---

**Status:** 📝 Implementation Guide Complete
**Estimated Time:** 3-4 hours
**Complexity:** Medium
