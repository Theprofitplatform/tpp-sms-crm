/**
 * LOCAL SEO SCHEDULER
 * 
 * Automated scheduling for Local SEO audits
 * Supports daily, weekly, and monthly audit schedules
 */

import cron from 'node-cron';
import { EventEmitter } from 'events';

export class LocalSEOScheduler extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
    this.enabled = true;
    this.runHistory = [];
  }

  /**
   * Schedule daily audits
   */
  scheduleDailyAudit(clientId, config, hour = 2, minute = 0) {
    const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time
    const jobId = `daily_${clientId}`;

    if (this.jobs.has(jobId)) {
      console.log(`⚠️  Daily audit already scheduled for ${clientId}`);
      return false;
    }

    const job = cron.schedule(cronExpression, async () => {
      if (!this.enabled) return;

      console.log(`\n🕐 [${new Date().toLocaleTimeString()}] Running scheduled audit for ${clientId}`);
      
      try {
        await this.runScheduledAudit(clientId, config, 'daily');
        this.recordRun(clientId, 'daily', 'success');
      } catch (error) {
        console.error(`❌ Scheduled audit failed for ${clientId}:`, error.message);
        this.recordRun(clientId, 'daily', 'failed', error.message);
        this.emit('auditFailed', { clientId, schedule: 'daily', error: error.message });
      }
    });

    this.jobs.set(jobId, {
      job,
      clientId,
      schedule: 'daily',
      cronExpression,
      config,
      createdAt: new Date().toISOString()
    });

    console.log(`✅ Daily audit scheduled for ${clientId} at ${hour}:${minute.toString().padStart(2, '0')}`);
    return true;
  }

  /**
   * Schedule weekly audits
   */
  scheduleWeeklyAudit(clientId, config, dayOfWeek = 1, hour = 2, minute = 0) {
    const cronExpression = `${minute} ${hour} * * ${dayOfWeek}`; // Weekly on specified day
    const jobId = `weekly_${clientId}`;

    if (this.jobs.has(jobId)) {
      console.log(`⚠️  Weekly audit already scheduled for ${clientId}`);
      return false;
    }

    const job = cron.schedule(cronExpression, async () => {
      if (!this.enabled) return;

      console.log(`\n🕐 [${new Date().toLocaleTimeString()}] Running scheduled weekly audit for ${clientId}`);
      
      try {
        await this.runScheduledAudit(clientId, config, 'weekly');
        this.recordRun(clientId, 'weekly', 'success');
      } catch (error) {
        console.error(`❌ Scheduled weekly audit failed for ${clientId}:`, error.message);
        this.recordRun(clientId, 'weekly', 'failed', error.message);
        this.emit('auditFailed', { clientId, schedule: 'weekly', error: error.message });
      }
    });

    this.jobs.set(jobId, {
      job,
      clientId,
      schedule: 'weekly',
      cronExpression,
      config,
      createdAt: new Date().toISOString()
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`✅ Weekly audit scheduled for ${clientId} on ${days[dayOfWeek]} at ${hour}:${minute.toString().padStart(2, '0')}`);
    return true;
  }

  /**
   * Schedule monthly audits
   */
  scheduleMonthlyAudit(clientId, config, dayOfMonth = 1, hour = 2, minute = 0) {
    const cronExpression = `${minute} ${hour} ${dayOfMonth} * *`; // Monthly on specified day
    const jobId = `monthly_${clientId}`;

    if (this.jobs.has(jobId)) {
      console.log(`⚠️  Monthly audit already scheduled for ${clientId}`);
      return false;
    }

    const job = cron.schedule(cronExpression, async () => {
      if (!this.enabled) return;

      console.log(`\n🕐 [${new Date().toLocaleTimeString()}] Running scheduled monthly audit for ${clientId}`);
      
      try {
        await this.runScheduledAudit(clientId, config, 'monthly');
        this.recordRun(clientId, 'monthly', 'success');
      } catch (error) {
        console.error(`❌ Scheduled monthly audit failed for ${clientId}:`, error.message);
        this.recordRun(clientId, 'monthly', 'failed', error.message);
        this.emit('auditFailed', { clientId, schedule: 'monthly', error: error.message });
      }
    });

    this.jobs.set(jobId, {
      job,
      clientId,
      schedule: 'monthly',
      cronExpression,
      config,
      createdAt: new Date().toISOString()
    });

    console.log(`✅ Monthly audit scheduled for ${clientId} on day ${dayOfMonth} at ${hour}:${minute.toString().padStart(2, '0')}`);
    return true;
  }

  /**
   * Run scheduled audit
   */
  async runScheduledAudit(clientId, config, scheduleType) {
    this.emit('auditStarted', { clientId, schedule: scheduleType, timestamp: new Date().toISOString() });

    // Dynamic import to avoid circular dependencies
    const { LocalSEOOrchestrator } = await import('../automation/local-seo-orchestrator.js');
    
    const orchestrator = new LocalSEOOrchestrator(config);
    const results = await orchestrator.runCompleteAudit();

    // Calculate score
    const napScore = results.tasks?.napConsistency?.score || 0;
    const schemaScore = results.tasks?.schema?.hasSchema ? 100 : 0;
    const overallScore = Math.round((napScore + schemaScore) / 2);

    const auditData = {
      clientId,
      schedule: scheduleType,
      score: overallScore,
      napScore,
      schemaScore,
      timestamp: new Date().toISOString(),
      results
    };

    this.emit('auditCompleted', auditData);

    console.log(`✅ Scheduled ${scheduleType} audit completed for ${clientId}: ${overallScore}/100`);

    return auditData;
  }

  /**
   * Unschedule audit
   */
  unschedule(clientId, scheduleType = 'all') {
    if (scheduleType === 'all') {
      const jobIds = ['daily', 'weekly', 'monthly'].map(type => `${type}_${clientId}`);
      let count = 0;

      jobIds.forEach(jobId => {
        if (this.jobs.has(jobId)) {
          const jobData = this.jobs.get(jobId);
          jobData.job.stop();
          this.jobs.delete(jobId);
          count++;
        }
      });

      if (count > 0) {
        console.log(`✅ Unscheduled ${count} audit(s) for ${clientId}`);
      }
      return count;
    } else {
      const jobId = `${scheduleType}_${clientId}`;
      if (this.jobs.has(jobId)) {
        const jobData = this.jobs.get(jobId);
        jobData.job.stop();
        this.jobs.delete(jobId);
        console.log(`✅ Unscheduled ${scheduleType} audit for ${clientId}`);
        return true;
      }
      return false;
    }
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs() {
    const jobs = [];
    
    this.jobs.forEach((jobData, jobId) => {
      jobs.push({
        jobId,
        clientId: jobData.clientId,
        schedule: jobData.schedule,
        cronExpression: jobData.cronExpression,
        createdAt: jobData.createdAt,
        nextRun: this.getNextRunTime(jobData.cronExpression)
      });
    });

    return jobs.sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun));
  }

  /**
   * Get jobs for specific client
   */
  getClientJobs(clientId) {
    const jobs = [];
    
    this.jobs.forEach((jobData, jobId) => {
      if (jobData.clientId === clientId) {
        jobs.push({
          jobId,
          schedule: jobData.schedule,
          cronExpression: jobData.cronExpression,
          createdAt: jobData.createdAt,
          nextRun: this.getNextRunTime(jobData.cronExpression)
        });
      }
    });

    return jobs;
  }

  /**
   * Get next run time (simplified calculation)
   */
  getNextRunTime(cronExpression) {
    const parts = cronExpression.split(' ');
    const minute = parseInt(parts[0]);
    const hour = parseInt(parts[1]);
    
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next.toISOString();
  }

  /**
   * Record run history
   */
  recordRun(clientId, schedule, status, error = null) {
    const record = {
      clientId,
      schedule,
      status,
      timestamp: new Date().toISOString(),
      error
    };

    this.runHistory.unshift(record);

    // Keep only last 100 runs
    if (this.runHistory.length > 100) {
      this.runHistory = this.runHistory.slice(0, 100);
    }
  }

  /**
   * Get run history
   */
  getRunHistory(clientId = null, limit = 20) {
    let history = this.runHistory;

    if (clientId) {
      history = history.filter(record => record.clientId === clientId);
    }

    return history.slice(0, limit);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const total = this.runHistory.length;
    const successful = this.runHistory.filter(r => r.status === 'success').length;
    const failed = this.runHistory.filter(r => r.status === 'failed').length;

    return {
      totalJobs: this.jobs.size,
      totalRuns: total,
      successfulRuns: successful,
      failedRuns: failed,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      lastRun: this.runHistory[0] || null
    };
  }

  /**
   * Enable/disable scheduler
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`📅 Scheduler ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    this.jobs.forEach((jobData, jobId) => {
      jobData.job.stop();
    });
    this.jobs.clear();
    console.log('⏹️  All scheduled jobs stopped');
  }

  /**
   * Start all jobs
   */
  startAll() {
    this.jobs.forEach((jobData, jobId) => {
      jobData.job.start();
    });
    console.log('▶️  All scheduled jobs started');
  }
}

// Singleton instance
export const localSEOScheduler = new LocalSEOScheduler();
export default localSEOScheduler;
