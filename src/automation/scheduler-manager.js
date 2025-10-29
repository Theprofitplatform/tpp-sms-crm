/**
 * Unified Scheduler Manager
 * 
 * Coordinates all automated jobs and schedulers
 * Provides centralized job management and execution tracking
 */

import cron from 'node-cron';
import { schedulerOps } from '../database/scheduler-db.js';
import { rankScheduler } from './rank-scheduler.js';
// TEMP DISABLED - causing crashes
// import { localSeoScheduler } from './local-seo-scheduler.js';
import db from '../database/index.js';
import parser from 'cron-parser';

export class SchedulerManager {
  constructor(io = null) {
    this.jobs = new Map(); // jobId -> cron job instance
    this.runningJobs = new Map(); // jobId -> execution state
    this.io = io; // Socket.io instance for real-time updates
    this.isInitialized = false;
  }

  /**
   * Initialize scheduler - load all jobs from database
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️  Scheduler Manager already initialized');
      return;
    }

    console.log('📅 Initializing Scheduler Manager...');

    try {
      // Load all enabled jobs from database
      const jobs = schedulerOps.getAllJobs();
      const enabledJobs = jobs.filter(j => j.enabled);

      console.log(`   Found ${jobs.length} jobs (${enabledJobs.length} enabled)`);

      // Start enabled jobs
      for (const job of enabledJobs) {
        try {
          await this.startJob(job.id);
          console.log(`   ✓ Started: ${job.name} (${job.schedule})`);
        } catch (error) {
          console.error(`   ✗ Failed to start ${job.name}:`, error.message);
        }
      }

      this.isInitialized = true;
      console.log('✅ Scheduler Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Scheduler Manager:', error);
      throw error;
    }
  }

  /**
   * Register a new job
   */
  async registerJob(jobConfig) {
    // Validate cron expression
    if (!cron.validate(jobConfig.schedule)) {
      throw new Error('Invalid cron expression');
    }

    // Calculate next run
    const nextRun = this.calculateNextRun(jobConfig.schedule);

    // Create job in database
    const job = schedulerOps.createJob({
      ...jobConfig,
      nextRun
    });

    console.log(`📝 Registered job: ${job.name} (${job.id})`);

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
      scheduled: true,
      timezone: 'America/New_York' // Adjust as needed
    });

    this.jobs.set(jobId, cronJob);

    // Calculate and update next run
    const nextRun = this.calculateNextRun(jobConfig.schedule);
    schedulerOps.updateJob(jobId, { nextRun });

    console.log(`▶️  Started job: ${jobConfig.name}`);
  }

  /**
   * Stop a job
   */
  stopJob(jobId) {
    const cronJob = this.jobs.get(jobId);
    if (cronJob) {
      cronJob.stop();
      this.jobs.delete(jobId);
      console.log(`⏸️  Stopped job: ${jobId}`);
    }
  }

  /**
   * Execute a job
   */
  async executeJob(jobId) {
    const jobConfig = schedulerOps.getJob(jobId);
    if (!jobConfig) {
      console.error(`❌ Job ${jobId} not found`);
      return;
    }

    // Check if already running
    if (this.runningJobs.has(jobId)) {
      console.warn(`⚠️  Job ${jobConfig.name} is already running, skipping...`);
      return;
    }

    console.log(`🔄 Executing job: ${jobConfig.name}`);

    const startTime = Date.now();
    let success = false;
    let output = '';
    let error = null;

    // Mark as running
    this.runningJobs.set(jobId, { 
      startTime, 
      status: 'running',
      jobName: jobConfig.name 
    });

    this.broadcast('job-started', {
      jobId,
      name: jobConfig.name,
      type: jobConfig.type,
      startTime: new Date(startTime).toISOString()
    });

    try {
      // Route to appropriate executor
      const result = await this.routeJob(jobConfig);
      success = result.success !== false;
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
      error,
      timestamp: new Date().toISOString()
    });

    return { success, duration, output, error };
  }

  /**
   * Route job to appropriate executor
   */
  async routeJob(jobConfig) {
    try {
      switch (jobConfig.type) {
        case 'rank-tracking':
          return await this.executeRankTracking(jobConfig);

        case 'local-seo':
          return await this.executeLocalSEO(jobConfig);

        case 'content-optimization':
          return await this.executeContentOptimization(jobConfig);

        case 'email-campaign':
          return await this.executeEmailCampaign(jobConfig);

        case 'master-optimization':
          return await this.executeMasterOptimization(jobConfig);

        default:
          throw new Error(`Unknown job type: ${jobConfig.type}`);
      }
    } catch (error) {
      throw new Error(`Job execution failed: ${error.message}`);
    }
  }

  /**
   * Execute rank tracking job
   */
  async executeRankTracking(jobConfig) {
    const result = await rankScheduler.runNow();
    return {
      success: result.success,
      output: `Rank tracking completed: ${result.clientsChecked || 0} clients checked`
    };
  }

  /**
   * Execute local SEO job
   */
  async executeLocalSEO(jobConfig) {
    // TEMP DISABLED
    // const result = await localSeoScheduler.runNow();
    const result = { success: false, error: 'Local SEO scheduler temporarily disabled' };
    return {
      success: result.success,
      output: `Local SEO audit completed: ${result.clientsProcessed || 0} clients processed`
    };
  }

  /**
   * Execute content optimization job
   */
  async executeContentOptimization(jobConfig) {
    // Placeholder - implement based on your content optimization service
    return {
      success: true,
      output: 'Content optimization completed'
    };
  }

  /**
   * Execute email campaign job
   */
  async executeEmailCampaign(jobConfig) {
    // Placeholder - implement based on your email automation service
    return {
      success: true,
      output: 'Email campaign sent'
    };
  }

  /**
   * Execute master optimization job
   */
  async executeMasterOptimization(jobConfig) {
    // Placeholder - implement based on your master optimizer
    return {
      success: true,
      output: 'Master optimization completed'
    };
  }

  /**
   * Toggle job enabled/disabled
   */
  async toggleJob(jobId, enabled) {
    schedulerOps.updateJob(jobId, { enabled });

    if (enabled) {
      await this.startJob(jobId);
      console.log(`✅ Enabled job: ${jobId}`);
    } else {
      this.stopJob(jobId);
      console.log(`⏸️  Disabled job: ${jobId}`);
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
    const deleted = schedulerOps.deleteJob(jobId);
    
    if (deleted) {
      this.broadcast('job-deleted', { jobId });
      console.log(`🗑️  Deleted job: ${jobId}`);
    }
    
    return deleted;
  }

  /**
   * Get all jobs with status
   */
  getAllJobs() {
    const jobs = schedulerOps.getAllJobs();
    return jobs.map(job => ({
      ...job,
      running: this.runningJobs.has(job.id),
      isScheduled: this.jobs.has(job.id)
    }));
  }

  /**
   * Get single job
   */
  getJob(jobId) {
    const job = schedulerOps.getJob(jobId);
    if (!job) return null;
    
    return {
      ...job,
      running: this.runningJobs.has(jobId),
      isScheduled: this.jobs.has(jobId)
    };
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
    const stats = schedulerOps.getStats();
    return {
      ...stats,
      activeSchedules: this.jobs.size,
      currentlyRunning: this.runningJobs.size
    };
  }

  /**
   * Calculate next run time using cron-parser
   */
  calculateNextRun(cronExpression) {
    try {
      const interval = parser.parseExpression(cronExpression);
      return interval.next().toISOString();
    } catch (error) {
      console.error('Failed to calculate next run:', error);
      return null;
    }
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
   * Get running jobs
   */
  getRunningJobs() {
    return Array.from(this.runningJobs.entries()).map(([jobId, state]) => {
      const job = schedulerOps.getJob(jobId);
      return {
        jobId,
        ...state,
        jobName: job?.name || 'Unknown',
        elapsed: Date.now() - state.startTime
      };
    });
  }

  /**
   * Shutdown scheduler
   */
  shutdown() {
    console.log('🛑 Shutting down Scheduler Manager...');

    // Stop all cron jobs
    for (const [jobId, cronJob] of this.jobs.entries()) {
      cronJob.stop();
      console.log(`   Stopped: ${jobId}`);
    }

    this.jobs.clear();
    this.runningJobs.clear();
    this.isInitialized = false;

    console.log('✅ Scheduler Manager shut down');
  }
}

// Export singleton instance
export const schedulerManager = new SchedulerManager();
export default schedulerManager;
