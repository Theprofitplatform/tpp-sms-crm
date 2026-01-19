/**
 * Corporate Actions Routes - Ops Service
 *
 * API endpoints for managing and monitoring corporate actions.
 *
 * Endpoints:
 *   GET  /api/v1/corporate-actions/status   - Get job status
 *   POST /api/v1/corporate-actions/run      - Manually run the job
 *   GET  /api/v1/corporate-actions/upcoming - Get upcoming actions for watchlist
 */

import express from 'express';

const router = express.Router();

/**
 * Get corporate actions job status
 */
router.get('/status', async (req, res) => {
  const { corporateActionsJob, logger } = req.app.locals;

  if (!corporateActionsJob) {
    return res.status(503).json({
      error: 'Corporate actions job not initialized',
    });
  }

  try {
    const status = corporateActionsJob.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting corporate actions status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manually run the corporate actions job
 */
router.post('/run', async (req, res) => {
  const { corporateActionsJob, logger } = req.app.locals;

  if (!corporateActionsJob) {
    return res.status(503).json({
      error: 'Corporate actions job not initialized',
    });
  }

  try {
    logger.info('Manually running corporate actions job');
    const result = await corporateActionsJob.run();
    res.json(result);
  } catch (error) {
    logger.error('Error running corporate actions job', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start the corporate actions job
 */
router.post('/start', async (req, res) => {
  const { corporateActionsJob, logger } = req.app.locals;

  if (!corporateActionsJob) {
    return res.status(503).json({
      error: 'Corporate actions job not initialized',
    });
  }

  try {
    corporateActionsJob.start();
    res.json({
      status: 'started',
      is_running: corporateActionsJob.isRunning,
    });
  } catch (error) {
    logger.error('Error starting corporate actions job', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop the corporate actions job
 */
router.post('/stop', async (req, res) => {
  const { corporateActionsJob, logger } = req.app.locals;

  if (!corporateActionsJob) {
    return res.status(503).json({
      error: 'Corporate actions job not initialized',
    });
  }

  try {
    corporateActionsJob.stop();
    res.json({
      status: 'stopped',
      is_running: corporateActionsJob.isRunning,
    });
  } catch (error) {
    logger.error('Error stopping corporate actions job', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update the watchlist
 */
router.post('/watchlist', async (req, res) => {
  const { corporateActionsJob, logger } = req.app.locals;
  const { symbols } = req.body;

  if (!corporateActionsJob) {
    return res.status(503).json({
      error: 'Corporate actions job not initialized',
    });
  }

  if (!Array.isArray(symbols)) {
    return res.status(400).json({
      error: 'symbols must be an array',
    });
  }

  try {
    corporateActionsJob.config.watchlist = symbols.map(s => s.toUpperCase());
    res.json({
      status: 'updated',
      watchlist: corporateActionsJob.config.watchlist,
    });
  } catch (error) {
    logger.error('Error updating watchlist', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get the current watchlist
 */
router.get('/watchlist', async (req, res) => {
  const { corporateActionsJob, logger } = req.app.locals;

  if (!corporateActionsJob) {
    return res.status(503).json({
      error: 'Corporate actions job not initialized',
    });
  }

  res.json({
    watchlist: corporateActionsJob.config.watchlist,
    count: corporateActionsJob.config.watchlist.length,
  });
});

export default router;
