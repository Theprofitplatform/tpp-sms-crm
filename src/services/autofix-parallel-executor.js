/**
 * Auto-Fix Parallel Executor
 * Manages parallel execution of auto-fix engines across multiple clients
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import EventEmitter from 'events';
import autofixDB from '../database/autofix-db.js';

const execAsync = promisify(exec);

export class ParallelExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxConcurrent = options.maxConcurrent || 3;
    this.timeout = options.timeout || 300000; // 5 minutes default
    this.activeJobs = new Map();
    this.queuedJobs = [];
    this.completedJobs = [];
    this.failedJobs = [];
  }

  /**
   * Execute multiple engines for multiple clients in parallel
   */
  async executeParallel(jobs) {
    console.log(`Starting parallel execution of ${jobs.length} jobs`);
    
    const executionId = `exec-${Date.now()}`;
    const startTime = Date.now();

    // Validate jobs
    const validJobs = jobs.filter(job => this.validateJob(job));
    
    if (validJobs.length === 0) {
      return {
        success: false,
        error: 'No valid jobs to execute',
        executionId
      };
    }

    // Queue all jobs
    this.queuedJobs = [...validJobs];
    
    // Start execution
    const execution = {
      id: executionId,
      startTime,
      totalJobs: validJobs.length,
      completed: 0,
      failed: 0,
      status: 'running'
    };

    this.emit('execution-started', execution);

    // Process jobs in parallel
    const processPromises = [];
    for (let i = 0; i < this.maxConcurrent; i++) {
      processPromises.push(this.processQueue(executionId));
    }

    // Wait for all to complete
    await Promise.all(processPromises);

    // Calculate results
    const endTime = Date.now();
    const duration = endTime - startTime;

    const results = {
      success: true,
      executionId,
      duration,
      totalJobs: validJobs.length,
      completed: this.completedJobs.length,
      failed: this.failedJobs.length,
      successRate: (this.completedJobs.length / validJobs.length) * 100,
      jobs: {
        completed: this.completedJobs,
        failed: this.failedJobs
      }
    };

    this.emit('execution-completed', results);

    // Reset state
    this.completedJobs = [];
    this.failedJobs = [];

    return results;
  }

  /**
   * Process job queue
   */
  async processQueue(executionId) {
    while (this.queuedJobs.length > 0) {
      const job = this.queuedJobs.shift();
      
      if (!job) break;

      try {
        await this.executeJob(job, executionId);
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
      }
    }
  }

  /**
   * Execute a single job
   */
  async executeJob(job, executionId) {
    const jobId = job.id || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`Starting job ${jobId}: ${job.engineId} for ${job.clientId}`);

    // Add to active jobs
    const activeJob = {
      id: jobId,
      executionId,
      engineId: job.engineId,
      clientId: job.clientId,
      startTime,
      status: 'running'
    };

    this.activeJobs.set(jobId, activeJob);
    this.emit('job-started', activeJob);

    try {
      // Map engine to script
      const scriptMap = {
        'content-optimizer': 'auto-fix-all.js',
        'nap-fixer': 'run-nap-autofix.js',
        'schema-injector': 'run-schema-inject.js',
        'title-meta-optimizer': 'auto-fix-titles.js'
      };

      const script = scriptMap[job.engineId];

      if (!script) {
        throw new Error(`Unknown engine: ${job.engineId}`);
      }

      // Execute with timeout
      const { stdout, stderr } = await this.execWithTimeout(
        `node ${script} ${job.clientId}`,
        this.timeout
      );

      // Parse results
      const fixesMatch = stdout.match(/fixed?\s+(\d+)/i);
      const issuesMatch = stdout.match(/(\d+)\s+issues?/i);
      const fixesApplied = fixesMatch ? parseInt(fixesMatch[1]) : 0;
      const issuesFound = issuesMatch ? parseInt(issuesMatch[1]) : 0;

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update job
      activeJob.status = 'completed';
      activeJob.endTime = endTime;
      activeJob.duration = duration;
      activeJob.fixesApplied = fixesApplied;
      activeJob.issuesFound = issuesFound;
      activeJob.output = stdout.substring(0, 500);

      // Move to completed
      this.activeJobs.delete(jobId);
      this.completedJobs.push(activeJob);

      // Log to database
      const engine = autofixDB.getEngine(job.engineId);
      if (engine) {
        autofixDB.addFixRun({
          engineId: job.engineId,
          engineName: engine.name,
          clientId: job.clientId,
          clientName: job.clientName || job.clientId,
          status: 'success',
          fixesApplied,
          issuesFound,
          duration
        });
      }

      this.emit('job-completed', activeJob);

      console.log(`✓ Job ${jobId} completed: ${fixesApplied} fixes in ${duration}ms`);

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update job
      activeJob.status = 'failed';
      activeJob.endTime = endTime;
      activeJob.duration = duration;
      activeJob.error = error.message;

      // Move to failed
      this.activeJobs.delete(jobId);
      this.failedJobs.push(activeJob);

      // Log failure
      const engine = autofixDB.getEngine(job.engineId);
      if (engine) {
        autofixDB.addFixRun({
          engineId: job.engineId,
          engineName: engine.name,
          clientId: job.clientId,
          clientName: job.clientName || job.clientId,
          status: 'failed',
          error: error.message,
          duration
        });
      }

      this.emit('job-failed', activeJob);

      console.error(`✗ Job ${jobId} failed: ${error.message}`);
    }
  }

  /**
   * Execute command with timeout
   */
  execWithTimeout(command, timeout) {
    return new Promise((resolve, reject) => {
      const child = exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error('Execution timeout'));
      }, timeout);

      // Clear timeout on completion
      child.on('exit', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * Validate job structure
   */
  validateJob(job) {
    if (!job.engineId) {
      console.warn('Job missing engineId');
      return false;
    }

    if (!job.clientId) {
      console.warn('Job missing clientId');
      return false;
    }

    // Check if engine exists and is enabled
    const engine = autofixDB.getEngine(job.engineId);
    if (!engine) {
      console.warn(`Engine ${job.engineId} not found`);
      return false;
    }

    if (!engine.enabled) {
      console.warn(`Engine ${job.engineId} is disabled`);
      return false;
    }

    return true;
  }

  /**
   * Get current execution status
   */
  getStatus() {
    return {
      queuedJobs: this.queuedJobs.length,
      activeJobs: this.activeJobs.size,
      completedJobs: this.completedJobs.length,
      failedJobs: this.failedJobs.length,
      maxConcurrent: this.maxConcurrent,
      jobs: {
        active: Array.from(this.activeJobs.values()),
        queued: this.queuedJobs,
        completed: this.completedJobs.slice(-10),
        failed: this.failedJobs.slice(-10)
      }
    };
  }

  /**
   * Cancel all pending jobs
   */
  cancelAll() {
    const cancelledCount = this.queuedJobs.length;
    this.queuedJobs = [];
    
    console.log(`Cancelled ${cancelledCount} queued jobs`);
    
    return {
      success: true,
      cancelledJobs: cancelledCount
    };
  }
}

/**
 * Create optimized execution plan
 */
export function createExecutionPlan(engines, clients, options = {}) {
  const plan = {
    jobs: [],
    estimatedDuration: 0,
    totalJobs: 0,
    strategy: options.strategy || 'parallel'
  };

  // Generate jobs for each engine-client combination
  engines.forEach(engine => {
    clients.forEach(client => {
      plan.jobs.push({
        id: `${engine.id}-${client.id}-${Date.now()}`,
        engineId: engine.id,
        engineName: engine.name,
        clientId: client.id,
        clientName: client.name,
        priority: calculatePriority(engine, client, options),
        estimatedDuration: estimateJobDuration(engine, client)
      });
    });
  });

  // Sort by priority
  plan.jobs.sort((a, b) => b.priority - a.priority);

  // Calculate total
  plan.totalJobs = plan.jobs.length;
  
  // Estimate duration based on strategy
  if (options.strategy === 'parallel') {
    const maxConcurrent = options.maxConcurrent || 3;
    const batches = Math.ceil(plan.jobs.length / maxConcurrent);
    plan.estimatedDuration = batches * 
      Math.max(...plan.jobs.map(j => j.estimatedDuration));
  } else {
    plan.estimatedDuration = plan.jobs.reduce((sum, j) => sum + j.estimatedDuration, 0);
  }

  return plan;
}

/**
 * Calculate job priority
 */
function calculatePriority(engine, client, options = {}) {
  let priority = 50; // Base priority

  // Engine priority
  if (engine.impact === 'high') priority += 30;
  else if (engine.impact === 'medium') priority += 15;

  // Success rate factor
  if (engine.successRate >= 90) priority += 10;
  else if (engine.successRate < 70) priority -= 10;

  // Last run factor
  if (engine.lastRun) {
    const hoursSinceLastRun = (Date.now() - new Date(engine.lastRun).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastRun > 168) priority += 20; // Over a week
    else if (hoursSinceLastRun > 24) priority += 10; // Over a day
  } else {
    priority += 25; // Never run
  }

  // User-specified priorities
  if (options.enginePriorities && options.enginePriorities[engine.id]) {
    priority += options.enginePriorities[engine.id];
  }

  return priority;
}

/**
 * Estimate job duration
 */
function estimateJobDuration(engine, client) {
  // Base estimates per engine type (in ms)
  const baseEstimates = {
    'content-optimizer': 120000, // 2 minutes
    'nap-fixer': 60000,          // 1 minute
    'schema-injector': 45000,    // 45 seconds
    'title-meta-optimizer': 90000 // 1.5 minutes
  };

  let estimate = baseEstimates[engine.id] || 60000;

  // Adjust based on historical performance
  if (engine.lastRun) {
    const history = autofixDB.getRunHistory({
      engineId: engine.id,
      limit: 10
    });
    
    if (history.length > 0) {
      const avgDuration = history.reduce((sum, h) => sum + (h.duration || 0), 0) / history.length;
      estimate = avgDuration * 1.1; // Add 10% buffer
    }
  }

  return estimate;
}

/**
 * Smart batch creator - groups jobs optimally
 */
export function createSmartBatches(jobs, maxConcurrent = 3) {
  const batches = [];
  const sortedJobs = [...jobs].sort((a, b) => b.priority - a.priority);

  while (sortedJobs.length > 0) {
    const batch = sortedJobs.splice(0, maxConcurrent);
    batches.push(batch);
  }

  return batches;
}

/**
 * Retry failed jobs with exponential backoff
 */
export async function retryFailedJobs(failedJobs, maxRetries = 3) {
  const executor = new ParallelExecutor();
  const retryResults = [];

  for (const job of failedJobs) {
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      attempt++;
      const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff

      console.log(`Retry attempt ${attempt}/${maxRetries} for job ${job.id}`);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, backoffTime));

      try {
        const result = await executor.executeParallel([job]);
        
        if (result.completed > 0) {
          success = true;
          retryResults.push({
            jobId: job.id,
            success: true,
            attempt
          });
        }
      } catch (error) {
        console.error(`Retry ${attempt} failed:`, error.message);
      }
    }

    if (!success) {
      retryResults.push({
        jobId: job.id,
        success: false,
        attempts: maxRetries,
        message: 'Max retries exceeded'
      });
    }
  }

  return {
    total: failedJobs.length,
    succeeded: retryResults.filter(r => r.success).length,
    failed: retryResults.filter(r => !r.success).length,
    results: retryResults
  };
}

export default {
  ParallelExecutor,
  createExecutionPlan,
  createSmartBatches,
  retryFailedJobs
};
