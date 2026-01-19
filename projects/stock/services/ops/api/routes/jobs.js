/**
 * Job Queue Routes
 *
 * Manages background job submission and status.
 */

import { Router } from 'express';

const router = Router();

/**
 * List jobs
 */
router.get('/', (req, res) => {
  const { jobQueue } = req.app.locals;
  const { status, type, limit = 50 } = req.query;

  try {
    const jobs = jobQueue.listJobs({
      status,
      type,
      limit: parseInt(limit, 10),
    });

    res.json({
      jobs,
      total: jobs.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get job by ID
 */
router.get('/:id', (req, res) => {
  const { jobQueue } = req.app.locals;

  try {
    const job = jobQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Submit a new job
 */
router.post('/', async (req, res) => {
  const { jobQueue, logger } = req.app.locals;
  const { type, payload, priority, scheduledFor, maxAttempts } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Job type is required' });
  }

  if (!payload) {
    return res.status(400).json({ error: 'Job payload is required' });
  }

  try {
    const job = await jobQueue.addJob(type, payload, {
      priority: priority || 0,
      scheduledFor,
      maxAttempts,
    });

    logger.info('Job submitted', { jobId: job.id, type });

    res.status(201).json(job);
  } catch (error) {
    logger.error('Job submission failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get queue statistics
 */
router.get('/stats/summary', (req, res) => {
  const { jobQueue } = req.app.locals;

  try {
    const stats = jobQueue.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clean up old jobs
 */
router.post('/cleanup', (req, res) => {
  const { jobQueue, logger } = req.app.locals;
  const { maxAgeDays = 7 } = req.body;

  try {
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    const deleted = jobQueue.cleanup(maxAge);

    logger.info('Job cleanup completed', { deleted, maxAgeDays });

    res.json({
      success: true,
      deleted,
      message: `Deleted ${deleted} old jobs`,
    });
  } catch (error) {
    logger.error('Job cleanup failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
