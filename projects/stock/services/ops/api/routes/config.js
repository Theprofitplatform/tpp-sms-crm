/**
 * Config Routes
 *
 * API endpoints for configuration versioning.
 *
 * Endpoints:
 *   GET  /api/v1/config/version          - Get current config version
 *   GET  /api/v1/config/versions         - Get version history
 *   GET  /api/v1/config/version/:id      - Get specific version
 *   POST /api/v1/config/version/capture  - Capture new version
 *   GET  /api/v1/config/compare          - Compare two versions
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/v1/config/version
 * Get the current active configuration version
 */
router.get('/version', (req, res) => {
  const { logger, configVersionManager } = req.app.locals;

  if (!configVersionManager) {
    return res.status(503).json({
      error: 'Config version manager not initialized',
      message: 'The config versioning system is not available.',
    });
  }

  try {
    const currentVersion = configVersionManager.getCurrentVersion();

    if (!currentVersion) {
      return res.json({
        version: null,
        message: 'No config version captured yet. Call /api/v1/config/version/capture to create one.',
      });
    }

    res.json({
      id: currentVersion.id,
      hash: currentVersion.config_hash,
      created_at: currentVersion.created_at,
      active_from: currentVersion.active_from,
      active_until: currentVersion.active_until,
      // Don't include full snapshot by default (can be large)
      has_snapshot: Boolean(currentVersion.config_snapshot),
    });
  } catch (error) {
    logger.error('Failed to get current config version', { error: error.message });
    res.status(500).json({ error: 'Failed to get config version', details: error.message });
  }
});

/**
 * GET /api/v1/config/version/full
 * Get the current active configuration version with full snapshot
 */
router.get('/version/full', (req, res) => {
  const { logger, configVersionManager } = req.app.locals;

  if (!configVersionManager) {
    return res.status(503).json({
      error: 'Config version manager not initialized',
    });
  }

  try {
    const currentVersion = configVersionManager.getCurrentVersion();

    if (!currentVersion) {
      return res.status(404).json({
        error: 'No config version found',
        message: 'No config version captured yet.',
      });
    }

    res.json({
      id: currentVersion.id,
      hash: currentVersion.config_hash,
      created_at: currentVersion.created_at,
      active_from: currentVersion.active_from,
      active_until: currentVersion.active_until,
      config: currentVersion.config_snapshot ? JSON.parse(currentVersion.config_snapshot) : null,
    });
  } catch (error) {
    logger.error('Failed to get full config version', { error: error.message });
    res.status(500).json({ error: 'Failed to get config version', details: error.message });
  }
});

/**
 * GET /api/v1/config/versions
 * Get version history
 *
 * Query params:
 *   - limit: Maximum number of versions (default: 20)
 */
router.get('/versions', (req, res) => {
  const { logger, configVersionManager } = req.app.locals;
  const limit = parseInt(req.query.limit, 10) || 20;

  if (!configVersionManager) {
    return res.status(503).json({
      error: 'Config version manager not initialized',
    });
  }

  try {
    const versions = configVersionManager.getAllVersions(limit);

    res.json({
      total: versions.length,
      versions: versions.map(v => ({
        id: v.id,
        hash: v.config_hash,
        created_at: v.created_at,
        active_from: v.active_from,
        active_until: v.active_until,
      })),
    });
  } catch (error) {
    logger.error('Failed to get config versions', { error: error.message });
    res.status(500).json({ error: 'Failed to get config versions', details: error.message });
  }
});

/**
 * GET /api/v1/config/version/:id
 * Get a specific version by ID
 */
router.get('/version/:id', (req, res) => {
  const { logger, configVersionManager } = req.app.locals;
  const id = parseInt(req.params.id, 10);

  if (!configVersionManager) {
    return res.status(503).json({
      error: 'Config version manager not initialized',
    });
  }

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid version ID' });
  }

  try {
    const version = configVersionManager.getVersionById(id);

    if (!version) {
      return res.status(404).json({ error: `Config version ${id} not found` });
    }

    res.json({
      id: version.id,
      hash: version.config_hash,
      created_at: version.created_at,
      active_from: version.active_from,
      active_until: version.active_until,
      config: version.config || null,
    });
  } catch (error) {
    logger.error('Failed to get config version', { id, error: error.message });
    res.status(500).json({ error: 'Failed to get config version', details: error.message });
  }
});

/**
 * POST /api/v1/config/version/capture
 * Capture a new configuration version
 *
 * This creates a snapshot of the current configuration state.
 * If the configuration hasn't changed, it returns the existing version.
 */
router.post('/version/capture', (req, res) => {
  const { logger, configVersionManager } = req.app.locals;

  if (!configVersionManager) {
    return res.status(503).json({
      error: 'Config version manager not initialized',
    });
  }

  try {
    // Re-initialize to capture current state
    const version = configVersionManager.initialize();

    if (!version) {
      return res.status(500).json({
        error: 'Failed to capture config version',
        message: 'No configuration files found.',
      });
    }

    res.json({
      success: true,
      id: version.id,
      hash: version.config_hash,
      created_at: version.created_at,
      is_new: !Boolean(configVersionManager.getVersionByHash(version.config_hash)?.id !== version.id),
    });
  } catch (error) {
    logger.error('Failed to capture config version', { error: error.message });
    res.status(500).json({ error: 'Failed to capture config version', details: error.message });
  }
});

/**
 * GET /api/v1/config/compare
 * Compare two configuration versions
 *
 * Query params:
 *   - v1: First version ID
 *   - v2: Second version ID
 */
router.get('/compare', (req, res) => {
  const { logger, configVersionManager } = req.app.locals;
  const v1 = parseInt(req.query.v1, 10);
  const v2 = parseInt(req.query.v2, 10);

  if (!configVersionManager) {
    return res.status(503).json({
      error: 'Config version manager not initialized',
    });
  }

  if (isNaN(v1) || isNaN(v2)) {
    return res.status(400).json({
      error: 'Invalid version IDs',
      usage: 'GET /api/v1/config/compare?v1=1&v2=2',
    });
  }

  try {
    const comparison = configVersionManager.compareVersions(v1, v2);

    if (!comparison) {
      return res.status(404).json({
        error: 'One or both versions not found',
        v1: v1,
        v2: v2,
      });
    }

    res.json(comparison);
  } catch (error) {
    logger.error('Failed to compare config versions', { v1, v2, error: error.message });
    res.status(500).json({ error: 'Failed to compare versions', details: error.message });
  }
});

export default router;
