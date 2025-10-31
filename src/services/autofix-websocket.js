/**
 * Auto-Fix WebSocket Manager
 * Provides real-time updates for auto-fix operations
 */

export class AutoFixWebSocketManager {
  constructor(io) {
    this.io = io;
    this.activeJobs = new Map();
    this.subscribers = new Set();
  }

  /**
   * Subscribe a socket to auto-fix updates
   */
  subscribe(socket) {
    this.subscribers.add(socket);
    
    // Send current active jobs to new subscriber
    socket.emit('autofix:active-jobs', Array.from(this.activeJobs.values()));
    
    console.log(`✓ Socket ${socket.id} subscribed to auto-fix updates`);
  }

  /**
   * Unsubscribe a socket
   */
  unsubscribe(socket) {
    this.subscribers.delete(socket);
    console.log(`✓ Socket ${socket.id} unsubscribed from auto-fix updates`);
  }

  /**
   * Start a new auto-fix job
   */
  startJob(jobId, jobData) {
    const job = {
      id: jobId,
      ...jobData,
      status: 'running',
      progress: 0,
      startTime: Date.now(),
      updates: []
    };

    this.activeJobs.set(jobId, job);
    this.broadcast('autofix:job-started', job);
    
    console.log(`✓ Auto-fix job started: ${jobId}`);
    return job;
  }

  /**
   * Update job progress
   */
  updateJobProgress(jobId, progress, message = null) {
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      console.warn(`Job ${jobId} not found`);
      return;
    }

    job.progress = Math.min(100, Math.max(0, progress));
    
    if (message) {
      job.updates.push({
        timestamp: Date.now(),
        message
      });
    }

    this.broadcast('autofix:job-progress', {
      jobId,
      progress: job.progress,
      message
    });
  }

  /**
   * Complete a job successfully
   */
  completeJob(jobId, results) {
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      console.warn(`Job ${jobId} not found`);
      return;
    }

    job.status = 'completed';
    job.progress = 100;
    job.endTime = Date.now();
    job.duration = job.endTime - job.startTime;
    job.results = results;

    this.broadcast('autofix:job-completed', job);
    
    // Keep job in memory for 30 seconds for late subscribers
    setTimeout(() => {
      this.activeJobs.delete(jobId);
    }, 30000);
    
    console.log(`✓ Auto-fix job completed: ${jobId} (${job.duration}ms)`);
  }

  /**
   * Fail a job
   */
  failJob(jobId, error) {
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      console.warn(`Job ${jobId} not found`);
      return;
    }

    job.status = 'failed';
    job.endTime = Date.now();
    job.duration = job.endTime - job.startTime;
    job.error = error;

    this.broadcast('autofix:job-failed', job);
    
    // Keep job in memory for 30 seconds for late subscribers
    setTimeout(() => {
      this.activeJobs.delete(jobId);
    }, 30000);
    
    console.error(`✗ Auto-fix job failed: ${jobId} - ${error}`);
  }

  /**
   * Add a step update to a job
   */
  addJobStep(jobId, step, status = 'running') {
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      return;
    }

    if (!job.steps) {
      job.steps = [];
    }

    job.steps.push({
      name: step,
      status,
      timestamp: Date.now()
    });

    this.broadcast('autofix:job-step', {
      jobId,
      step,
      status,
      totalSteps: job.steps.length
    });
  }

  /**
   * Broadcast message to all subscribers
   */
  broadcast(event, data) {
    this.subscribers.forEach(socket => {
      socket.emit(event, data);
    });
  }

  /**
   * Send message to specific socket
   */
  sendToSocket(socketId, event, data) {
    const socket = Array.from(this.subscribers).find(s => s.id === socketId);
    
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Get active jobs
   */
  getActiveJobs() {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get specific job
   */
  getJob(jobId) {
    return this.activeJobs.get(jobId);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId, reason = 'Cancelled by user') {
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      return false;
    }

    job.status = 'cancelled';
    job.endTime = Date.now();
    job.duration = job.endTime - job.startTime;
    job.cancelReason = reason;

    this.broadcast('autofix:job-cancelled', job);
    
    setTimeout(() => {
      this.activeJobs.delete(jobId);
    }, 5000);
    
    return true;
  }

  /**
   * Bulk update multiple jobs
   */
  bulkUpdate(updates) {
    updates.forEach(({ jobId, progress, message }) => {
      this.updateJobProgress(jobId, progress, message);
    });
  }

  /**
   * Get job statistics
   */
  getStats() {
    const jobs = Array.from(this.activeJobs.values());
    
    return {
      totalActive: jobs.length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      avgProgress: jobs.length > 0
        ? jobs.reduce((sum, j) => sum + j.progress, 0) / jobs.length
        : 0
    };
  }
}

/**
 * Setup WebSocket handlers for auto-fix
 */
export function setupAutoFixWebSocket(io) {
  const wsManager = new AutoFixWebSocketManager(io);

  io.on('connection', (socket) => {
    console.log(`WebSocket connected: ${socket.id}`);

    // Subscribe to auto-fix updates
    socket.on('autofix:subscribe', () => {
      wsManager.subscribe(socket);
    });

    // Unsubscribe
    socket.on('autofix:unsubscribe', () => {
      wsManager.unsubscribe(socket);
    });

    // Get active jobs
    socket.on('autofix:get-jobs', () => {
      socket.emit('autofix:active-jobs', wsManager.getActiveJobs());
    });

    // Get specific job
    socket.on('autofix:get-job', (jobId) => {
      const job = wsManager.getJob(jobId);
      socket.emit('autofix:job-data', job);
    });

    // Cancel job
    socket.on('autofix:cancel-job', (jobId) => {
      const cancelled = wsManager.cancelJob(jobId);
      socket.emit('autofix:cancel-result', { jobId, success: cancelled });
    });

    // Get stats
    socket.on('autofix:get-stats', () => {
      socket.emit('autofix:stats', wsManager.getStats());
    });

    // Auto-unsubscribe on disconnect
    socket.on('disconnect', () => {
      wsManager.unsubscribe(socket);
      console.log(`WebSocket disconnected: ${socket.id}`);
    });
  });

  return wsManager;
}

export default {
  AutoFixWebSocketManager,
  setupAutoFixWebSocket
};
