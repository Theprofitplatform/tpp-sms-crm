/**
 * Reconciliation Routes
 *
 * API routes for managing the reconciliation job and viewing results.
 *
 * Endpoints:
 *   GET  /api/v1/reconciliation/status   - Get reconciliation job status
 *   POST /api/v1/reconciliation/trigger  - Trigger manual reconciliation
 *   GET  /api/v1/reconciliation/history  - Get reconciliation history
 *   POST /api/v1/reconciliation/start    - Start scheduled reconciliation
 *   POST /api/v1/reconciliation/stop     - Stop scheduled reconciliation
 */

import { Router } from 'express';

const router = Router();

/**
 * Get reconciliation job status
 */
router.get('/status', async (req, res) => {
  const { reconciliationJob, logger } = req.app.locals;

  if (!reconciliationJob) {
    return res.status(503).json({
      error: 'Reconciliation job not initialized',
      available: false,
    });
  }

  try {
    const status = await reconciliationJob.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get reconciliation status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger manual reconciliation run
 */
router.post('/trigger', async (req, res) => {
  const { reconciliationJob, logger } = req.app.locals;

  if (!reconciliationJob) {
    return res.status(503).json({
      error: 'Reconciliation job not initialized',
      available: false,
    });
  }

  logger.info('Manual reconciliation triggered');

  try {
    const result = await reconciliationJob.run();

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Manual reconciliation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get reconciliation history
 */
router.get('/history', async (req, res) => {
  const { reconciliationJob, logger } = req.app.locals;
  const { limit = 50 } = req.query;

  if (!reconciliationJob) {
    return res.status(503).json({
      error: 'Reconciliation job not initialized',
      available: false,
    });
  }

  try {
    const history = await reconciliationJob.getHistory(parseInt(limit, 10));
    res.json(history);
  } catch (error) {
    logger.error('Failed to get reconciliation history', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start the scheduled reconciliation job
 */
router.post('/start', (req, res) => {
  const { reconciliationJob, logger } = req.app.locals;

  if (!reconciliationJob) {
    return res.status(503).json({
      error: 'Reconciliation job not initialized',
      available: false,
    });
  }

  try {
    reconciliationJob.start();
    logger.info('Reconciliation job started');

    res.json({
      success: true,
      message: 'Reconciliation job started',
      interval_ms: reconciliationJob.config.runIntervalMs,
    });
  } catch (error) {
    logger.error('Failed to start reconciliation job', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop the scheduled reconciliation job
 */
router.post('/stop', (req, res) => {
  const { reconciliationJob, logger } = req.app.locals;

  if (!reconciliationJob) {
    return res.status(503).json({
      error: 'Reconciliation job not initialized',
      available: false,
    });
  }

  try {
    reconciliationJob.stop();
    logger.info('Reconciliation job stopped');

    res.json({
      success: true,
      message: 'Reconciliation job stopped',
    });
  } catch (error) {
    logger.error('Failed to stop reconciliation job', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
