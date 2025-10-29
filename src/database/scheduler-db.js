/**
 * Scheduler Database Operations
 * 
 * Manages scheduled jobs and execution history
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create or connect to database
const dbPath = path.join(dataDir, 'scheduler.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize scheduler database tables
 */
export function initializeSchedulerDB() {
  console.log('📅 Initializing scheduler database...');

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

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_type ON scheduler_jobs(type);
    CREATE INDEX IF NOT EXISTS idx_jobs_enabled ON scheduler_jobs(enabled);
    CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON scheduler_jobs(client_id);
    CREATE INDEX IF NOT EXISTS idx_executions_job_id ON scheduler_executions(job_id);
    CREATE INDEX IF NOT EXISTS idx_executions_started_at ON scheduler_executions(started_at);
    CREATE INDEX IF NOT EXISTS idx_executions_status ON scheduler_executions(status);
  `);

  console.log('✅ Scheduler database initialized');
}

/**
 * Scheduler database operations
 */
export const schedulerOps = {
  /**
   * Create a new job
   */
  createJob(job) {
    const stmt = db.prepare(`
      INSERT INTO scheduler_jobs (
        id, name, type, schedule, enabled, client_id, config, next_run
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = job.id || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    stmt.run(
      id,
      job.name,
      job.type,
      job.schedule,
      job.enabled !== false ? 1 : 0,
      job.clientId || null,
      JSON.stringify(job.config || {}),
      job.nextRun || null
    );

    return this.getJob(id);
  },

  /**
   * Get all jobs
   */
  getAllJobs() {
    const stmt = db.prepare('SELECT * FROM scheduler_jobs ORDER BY created_at DESC');
    const rows = stmt.all();
    
    return rows.map(row => this._mapJobRow(row));
  },

  /**
   * Get single job by ID
   */
  getJob(id) {
    const stmt = db.prepare('SELECT * FROM scheduler_jobs WHERE id = ?');
    const row = stmt.get(id);
    
    if (!row) return null;
    return this._mapJobRow(row);
  },

  /**
   * Get jobs by type
   */
  getJobsByType(type) {
    const stmt = db.prepare('SELECT * FROM scheduler_jobs WHERE type = ?');
    const rows = stmt.all(type);
    
    return rows.map(row => this._mapJobRow(row));
  },

  /**
   * Get jobs by client
   */
  getJobsByClient(clientId) {
    const stmt = db.prepare('SELECT * FROM scheduler_jobs WHERE client_id = ?');
    const rows = stmt.all(clientId);
    
    return rows.map(row => this._mapJobRow(row));
  },

  /**
   * Update job
   */
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
    if (updates.clientId !== undefined) {
      fields.push('client_id = ?');
      values.push(updates.clientId);
    }
    if (updates.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(updates.config));
    }
    if (updates.nextRun !== undefined) {
      fields.push('next_run = ?');
      values.push(updates.nextRun);
    }

    if (fields.length === 0) {
      return this.getJob(id);
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

  /**
   * Delete job
   */
  deleteJob(id) {
    const stmt = db.prepare('DELETE FROM scheduler_jobs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Update job after execution
   */
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
    
    stmt.run(
      success ? 1 : 0,
      duration,
      nextRun,
      success ? 1 : 0,
      id
    );
  },

  /**
   * Log job execution
   */
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
      execution.output ? execution.output.substring(0, 10000) : null, // Limit output size
      execution.error ? execution.error.substring(0, 5000) : null
    );
  },

  /**
   * Get execution history
   */
  getExecutionHistory(jobId = null, limit = 50) {
    let stmt;
    
    if (jobId) {
      stmt = db.prepare(`
        SELECT * FROM scheduler_executions 
        WHERE job_id = ?
        ORDER BY started_at DESC 
        LIMIT ?
      `);
      return stmt.all(jobId, limit).map(row => this._mapExecutionRow(row));
    } else {
      stmt = db.prepare(`
        SELECT e.*, j.name as job_name, j.type as job_type
        FROM scheduler_executions e
        LEFT JOIN scheduler_jobs j ON e.job_id = j.id
        ORDER BY e.started_at DESC 
        LIMIT ?
      `);
      return stmt.all(limit).map(row => ({
        ...this._mapExecutionRow(row),
        jobName: row.job_name,
        jobType: row.job_type
      }));
    }
  },

  /**
   * Get recent executions for a job
   */
  getRecentExecutions(jobId, limit = 10) {
    const stmt = db.prepare(`
      SELECT * FROM scheduler_executions 
      WHERE job_id = ?
      ORDER BY started_at DESC 
      LIMIT ?
    `);
    
    return stmt.all(jobId, limit).map(row => this._mapExecutionRow(row));
  },

  /**
   * Get failed executions
   */
  getFailedExecutions(limit = 50) {
    const stmt = db.prepare(`
      SELECT e.*, j.name as job_name, j.type as job_type
      FROM scheduler_executions e
      LEFT JOIN scheduler_jobs j ON e.job_id = j.id
      WHERE e.success = 0
      ORDER BY e.started_at DESC 
      LIMIT ?
    `);
    
    return stmt.all(limit).map(row => ({
      ...this._mapExecutionRow(row),
      jobName: row.job_name,
      jobType: row.job_type
    }));
  },

  /**
   * Get scheduler statistics
   */
  getStats() {
    const jobs = this.getAllJobs();
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.enabled).length;
    const totalRuns = jobs.reduce((sum, j) => sum + j.totalRuns, 0);
    const successfulRuns = jobs.reduce((sum, j) => sum + j.successfulRuns, 0);
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns * 100).toFixed(1) : 100;

    // Get last execution time
    const lastExecution = db.prepare(`
      SELECT started_at FROM scheduler_executions 
      ORDER BY started_at DESC LIMIT 1
    `).get();

    // Get running jobs count
    const runningJobs = db.prepare(`
      SELECT COUNT(*) as count FROM scheduler_executions 
      WHERE status = 'running'
    `).get();

    return {
      totalJobs,
      activeJobs,
      inactiveJobs: totalJobs - activeJobs,
      totalRuns,
      successfulRuns,
      failedRuns: totalRuns - successfulRuns,
      successRate: parseFloat(successRate),
      lastRun: lastExecution?.started_at || null,
      runningJobs: runningJobs?.count || 0
    };
  },

  /**
   * Clean up old execution logs
   */
  cleanupOldExecutions(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const stmt = db.prepare(`
      DELETE FROM scheduler_executions 
      WHERE started_at < ?
    `);
    
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  },

  /**
   * Map database row to job object
   */
  _mapJobRow(row) {
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

  /**
   * Map database row to execution object
   */
  _mapExecutionRow(row) {
    return {
      id: row.id,
      jobId: row.job_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      duration: row.duration,
      success: row.success === 1,
      output: row.output,
      error: row.error
    };
  }
};

export default { initializeSchedulerDB, schedulerOps };
