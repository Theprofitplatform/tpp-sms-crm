/**
 * Job Queue Module
 *
 * SQLite-backed job queue with retry logic and dead letter queue.
 * Based on the seo-expert job queue pattern.
 *
 * Features:
 * - Persistent job storage
 * - Priority-based processing
 * - Exponential backoff retry
 * - Dead letter queue for failed jobs
 * - Concurrent job processing with mutex
 */

import { Mutex } from 'async-mutex';
import { randomUUID } from 'crypto';

export class JobQueue {
  constructor(database, options = {}) {
    this.db = database.db;
    this.mutex = new Mutex();

    this.options = {
      maxConcurrent: options.maxConcurrent || 5,
      pollInterval: options.pollInterval || 1000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      onJobComplete: options.onJobComplete || (() => {}),
      onJobFailed: options.onJobFailed || (() => {}),
    };

    this.activeJobs = new Map();
    this.isRunning = false;
    this.pollTimeout = null;
  }

  /**
   * Add a job to the queue
   */
  async addJob(type, payload, options = {}) {
    const release = await this.mutex.acquire();
    try {
      const id = randomUUID();
      const now = new Date().toISOString();

      const job = {
        id,
        type,
        status: 'pending',
        priority: options.priority || 0,
        payload: JSON.stringify(payload),
        result: null,
        error: null,
        attempts: 0,
        max_attempts: options.maxAttempts || this.options.maxRetries,
        created_at: now,
        started_at: null,
        completed_at: null,
        scheduled_for: options.scheduledFor || now,
        locked_by: null,
        locked_at: null,
      };

      this.db.prepare(`
        INSERT INTO jobs (id, type, status, priority, payload, attempts, max_attempts, created_at, scheduled_for)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        job.id, job.type, job.status, job.priority, job.payload,
        job.attempts, job.max_attempts, job.created_at, job.scheduled_for
      );

      return job;
    } finally {
      release();
    }
  }

  /**
   * Get the next available job
   */
  async getNextJob() {
    const release = await this.mutex.acquire();
    try {
      const now = new Date().toISOString();
      const workerId = randomUUID().substring(0, 8);

      // Find and lock the next job
      const job = this.db.prepare(`
        SELECT * FROM jobs
        WHERE status = 'pending'
          AND scheduled_for <= ?
          AND locked_by IS NULL
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `).get(now);

      if (!job) return null;

      // Lock the job
      this.db.prepare(`
        UPDATE jobs
        SET status = 'processing',
            locked_by = ?,
            locked_at = ?,
            started_at = ?
        WHERE id = ?
      `).run(workerId, now, now, job.id);

      return {
        ...job,
        payload: JSON.parse(job.payload),
        locked_by: workerId,
        locked_at: now,
        started_at: now,
      };
    } finally {
      release();
    }
  }

  /**
   * Mark a job as completed
   */
  async completeJob(jobId, result = null) {
    const release = await this.mutex.acquire();
    try {
      const now = new Date().toISOString();

      this.db.prepare(`
        UPDATE jobs
        SET status = 'completed',
            result = ?,
            completed_at = ?,
            locked_by = NULL
        WHERE id = ?
      `).run(result ? JSON.stringify(result) : null, now, jobId);

      const job = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      this.options.onJobComplete(job);

      return job;
    } finally {
      release();
    }
  }

  /**
   * Mark a job as failed
   */
  async failJob(jobId, error) {
    const release = await this.mutex.acquire();
    try {
      const job = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      if (!job) return null;

      const attempts = job.attempts + 1;
      const now = new Date().toISOString();

      if (attempts >= job.max_attempts) {
        // Move to dead letter queue
        this.db.prepare(`
          INSERT INTO dead_letter_queue (id, original_job_id, type, payload, error, attempts, original_created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(), job.id, job.type, job.payload,
          error.message || String(error), attempts, job.created_at
        );

        // Mark original job as dead
        this.db.prepare(`
          UPDATE jobs
          SET status = 'dead',
              error = ?,
              attempts = ?,
              locked_by = NULL
          WHERE id = ?
        `).run(error.message || String(error), attempts, jobId);

        this.options.onJobFailed(job, error);
      } else {
        // Retry with exponential backoff
        const retryDelay = this.options.retryDelay * Math.pow(2, attempts - 1);
        const scheduledFor = new Date(Date.now() + retryDelay).toISOString();

        this.db.prepare(`
          UPDATE jobs
          SET status = 'pending',
              error = ?,
              attempts = ?,
              scheduled_for = ?,
              locked_by = NULL,
              locked_at = NULL
          WHERE id = ?
        `).run(error.message || String(error), attempts, scheduledFor, jobId);
      }

      return this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    } finally {
      release();
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId) {
    const job = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) return null;

    return {
      ...job,
      payload: JSON.parse(job.payload),
      result: job.result ? JSON.parse(job.result) : null,
    };
  }

  /**
   * List jobs with optional filtering
   */
  listJobs(options = {}) {
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const jobs = this.db.prepare(query).all(...params);
    return jobs.map(job => ({
      ...job,
      payload: JSON.parse(job.payload),
      result: job.result ? JSON.parse(job.result) : null,
    }));
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const stats = this.db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM jobs
      GROUP BY status
    `).all();

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dead: 0,
      total: 0,
    };

    for (const row of stats) {
      result[row.status] = row.count;
      result.total += row.count;
    }

    return result;
  }

  /**
   * Clean up old completed jobs
   */
  cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAge).toISOString();

    const result = this.db.prepare(`
      DELETE FROM jobs
      WHERE status IN ('completed', 'dead')
        AND completed_at < ?
    `).run(cutoff);

    return result.changes;
  }
}

export default JobQueue;
