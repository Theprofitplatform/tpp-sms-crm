/**
 * Auto-Fix Job Queue System
 * 
 * Manages auto-fix jobs using BullMQ for:
 * - Distributed job processing
 * - Priority-based execution
 * - Retry logic with exponential backoff
 * - Job scheduling and cron jobs
 * - Progress tracking
 * - Failed job handling
 */

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import db from '../database/index.js';

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Create queue
const autofixQueue = new Queue('autofix-jobs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 604800 // Keep failed jobs for 7 days
    }
  }
});

/**
 * AutoFix Queue Manager
 */
export class AutoFixQueue {
  constructor() {
    this.queue = autofixQueue;
    this.workers = new Map();
  }

  /**
   * Add a job to the queue
   */
  async addJob(engineName, clientId, options = {}) {
    const {
      priority = 5,
      delay = 0,
      repeat = null,
      dryRun = false,
      ...engineOptions
    } = options;

    const jobData = {
      engineName,
      clientId,
      dryRun,
      options: engineOptions,
      addedAt: new Date().toISOString(),
      addedBy: options.userId || 'system'
    };

    const jobOptions = {
      priority,
      delay,
      jobId: `${engineName}-${clientId}-${Date.now()}`
    };

    if (repeat) {
      jobOptions.repeat = repeat;
    }

    const job = await this.queue.add(engineName, jobData, jobOptions);

    console.log(`✅ Job queued: ${job.id} (${engineName} for client ${clientId})`);

    // Log to database
    await db.logAutoFixJob({
      jobId: job.id,
      engineName,
      clientId,
      status: 'queued',
      priority,
      options: jobData
    });

    return {
      jobId: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts
    };
  }

  /**
   * Add bulk jobs
   */
  async addBulkJobs(jobs) {
    const bulkData = jobs.map(job => ({
      name: job.engineName,
      data: {
        engineName: job.engineName,
        clientId: job.clientId,
        dryRun: job.dryRun || false,
        options: job.options || {},
        addedAt: new Date().toISOString()
      },
      opts: {
        priority: job.priority || 5,
        delay: job.delay || 0
      }
    }));

    const addedJobs = await this.queue.addBulk(bulkData);

    console.log(`✅ ${addedJobs.length} jobs queued in bulk`);

    return addedJobs.map(job => ({
      jobId: job.id,
      name: job.name,
      data: job.data
    }));
  }

  /**
   * Schedule recurring job
   */
  async scheduleRecurringJob(engineName, clientId, cronExpression, options = {}) {
    return this.addJob(engineName, clientId, {
      ...options,
      repeat: {
        pattern: cronExpression,
        tz: process.env.TZ || 'Australia/Sydney'
      }
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      return { found: false };
    }

    const state = await job.getState();
    const progress = job.progress;
    const failedReason = job.failedReason;
    const returnValue = job.returnvalue;

    return {
      found: true,
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress,
      failedReason,
      result: returnValue,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const counts = await this.queue.getJobCounts();
    const workers = await this.queue.getWorkers();

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
      workers: workers.length,
      isPaused: await this.queue.isPaused()
    };
  }

  /**
   * Get jobs by status
   */
  async getJobs(status = 'waiting', start = 0, end = 10) {
    const jobs = await this.queue.getJobs([status], start, end, true);
    
    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason
    }));
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId) {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.retry();
    console.log(`🔄 Job ${jobId} queued for retry`);

    return { success: true, jobId };
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId) {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.remove();
    console.log(`❌ Job ${jobId} cancelled`);

    return { success: true, jobId };
  }

  /**
   * Pause queue
   */
  async pauseQueue() {
    await this.queue.pause();
    console.log('⏸️  Queue paused');
  }

  /**
   * Resume queue
   */
  async resumeQueue() {
    await this.queue.resume();
    console.log('▶️  Queue resumed');
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(grace = 86400000) { // 24 hours default
    const cleaned = await this.queue.clean(grace, 1000, 'completed');
    console.log(`🧹 Cleaned ${cleaned.length} completed jobs`);
    
    return { cleaned: cleaned.length };
  }

  /**
   * Obliterate queue (use with caution!)
   */
  async obliterateQueue() {
    await this.queue.obliterate({ force: true });
    console.log('💥 Queue obliterated');
  }

  /**
   * Register a worker for processing jobs
   */
  registerWorker(engineName, processorFn, options = {}) {
    const { concurrency = 1 } = options;

    const worker = new Worker(
      'autofix-jobs',
      async (job) => {
        // Only process jobs for this engine
        if (job.name !== engineName) {
          return;
        }

        console.log(`🔄 Processing job ${job.id}: ${engineName} for client ${job.data.clientId}`);

        try {
          // Update job status in database
          await db.updateAutoFixJob(job.id, { status: 'processing' });

          // Process the job
          const result = await processorFn(job.data, job);

          // Update job status in database
          await db.updateAutoFixJob(job.id, {
            status: 'completed',
            result,
            completedAt: new Date().toISOString()
          });

          console.log(`✅ Job ${job.id} completed successfully`);

          return result;

        } catch (error) {
          console.error(`❌ Job ${job.id} failed:`, error.message);

          // Update job status in database
          await db.updateAutoFixJob(job.id, {
            status: 'failed',
            error: error.message,
            failedAt: new Date().toISOString()
          });

          throw error;
        }
      },
      {
        connection: redis,
        concurrency
      }
    );

    // Worker event handlers
    worker.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} has completed`);
    });

    worker.on('failed', (job, error) => {
      console.error(`❌ Job ${job?.id} has failed:`, error.message);
    });

    worker.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    this.workers.set(engineName, worker);

    console.log(`👷 Worker registered for ${engineName} (concurrency: ${concurrency})`);

    return worker;
  }

  /**
   * Close all workers and connections
   */
  async close() {
    console.log('🛑 Closing queue workers...');

    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`   Closed worker: ${name}`);
    }

    await this.queue.close();
    await redis.quit();

    console.log('✅ All workers and connections closed');
  }
}

// Export singleton instance
export default new AutoFixQueue();
