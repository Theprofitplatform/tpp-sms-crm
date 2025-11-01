/**
 * OTTO SEO FEATURES API ROUTES
 *
 * API endpoints for:
 * - Pixel deployment and management
 * - Schema automation
 * - Server-side optimizations
 */

import express from 'express';
import pixelService from '../../services/pixel-service.js';
import enhancedPixelService from '../../services/pixel-service-enhanced.js';
import schemaEngine from '../../services/schema-engine.js';
import ssrOptimizationService from '../../services/ssr-optimization-service.js';

const router = express.Router();

// ============================================================
// PIXEL DEPLOYMENT ROUTES
// ============================================================

/**
 * Generate new pixel for a client
 * POST /api/v2/pixel/generate
 */
router.post('/pixel/generate', async (req, res) => {
  try {
    const { clientId, domain, deploymentType, features, debug } = req.body;

    if (!clientId || !domain) {
      return res.status(400).json({
        success: false,
        error: 'clientId and domain are required'
      });
    }

    const result = pixelService.generatePixel(clientId, domain, {
      deploymentType,
      features,
      debug,
      metadata: req.body.metadata || {}
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error generating pixel:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Track pixel data (called by pixel script)
 * POST /api/v2/pixel/track
 *
 * Now uses enhanced service with advanced issue detection
 */
router.post('/pixel/track', async (req, res) => {
  try {
    const { apiKey, ...data } = req.body;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    // Use enhanced service for advanced issue detection and analytics
    const result = enhancedPixelService.trackPixelData(apiKey, data);

    res.json({
      success: true,
      data: result,
      message: result.issuesDetected > 0
        ? `Detected ${result.issuesDetected} SEO issues`
        : 'No issues detected'
    });
  } catch (error) {
    console.error('Error tracking pixel data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pixel status and stats
 * GET /api/v2/pixel/status/:clientId
 */
router.get('/pixel/status/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    const pixels = pixelService.getPixelStatus(clientId);

    res.json({
      success: true,
      data: pixels
    });
  } catch (error) {
    console.error('Error getting pixel status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pixel page data
 * GET /api/v2/pixel/pages/:clientId
 */
router.get('/pixel/pages/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit, offset, url } = req.query;

    const pages = pixelService.getPixelPageData(clientId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      url
    });

    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('Error getting pixel pages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Deactivate pixel
 * POST /api/v2/pixel/deactivate
 */
router.post('/pixel/deactivate', async (req, res) => {
  try {
    const { clientId, pixelId } = req.body;

    const success = pixelService.deactivatePixel(clientId, pixelId);

    res.json({
      success,
      message: success ? 'Pixel deactivated' : 'Failed to deactivate pixel'
    });
  } catch (error) {
    console.error('Error deactivating pixel:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete pixel
 * DELETE /api/v2/pixel/:clientId/:pixelId
 */
router.delete('/pixel/:clientId/:pixelId', async (req, res) => {
  try {
    const { clientId, pixelId } = req.params;

    const success = pixelService.deletePixel(clientId, parseInt(pixelId));

    res.json({
      success,
      message: success ? 'Pixel deleted' : 'Failed to delete pixel'
    });
  } catch (error) {
    console.error('Error deleting pixel:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// SCHEMA AUTOMATION ROUTES
// ============================================================

/**
 * Analyze page for schema opportunities
 * POST /api/v2/schema/analyze
 */
router.post('/schema/analyze', async (req, res) => {
  try {
    const { clientId, url, html } = req.body;

    if (!clientId || !url || !html) {
      return res.status(400).json({
        success: false,
        error: 'clientId, url, and html are required'
      });
    }

    const result = await schemaEngine.analyzePageForSchema(clientId, url, html);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error analyzing page for schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get schema opportunities for a client
 * GET /api/v2/schema/opportunities/:clientId
 */
router.get('/schema/opportunities/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status, priority, limit } = req.query;

    const opportunities = schemaEngine.getSchemaOpportunities(clientId, {
      status,
      priority,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    console.error('Error getting schema opportunities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate schema markup using AI
 * POST /api/v2/schema/generate
 */
router.post('/schema/generate', async (req, res) => {
  try {
    const { schemaType, detectedData, pageContext } = req.body;

    if (!schemaType || !detectedData) {
      return res.status(400).json({
        success: false,
        error: 'schemaType and detectedData are required'
      });
    }

    const schema = await schemaEngine.generateSchemaMarkup(
      schemaType,
      detectedData,
      pageContext
    );

    res.json({
      success: true,
      data: { schema }
    });
  } catch (error) {
    console.error('Error generating schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Apply schema to a page
 * POST /api/v2/schema/apply
 */
router.post('/schema/apply', async (req, res) => {
  try {
    const { clientId, pageUrl, schemaType, schemaData, opportunityId } = req.body;

    if (!clientId || !pageUrl || !schemaType || !schemaData) {
      return res.status(400).json({
        success: false,
        error: 'clientId, pageUrl, schemaType, and schemaData are required'
      });
    }

    const result = await schemaEngine.applySchema(
      clientId,
      pageUrl,
      schemaType,
      schemaData,
      opportunityId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error applying schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get applied schema for a client
 * GET /api/v2/schema/applied/:clientId
 */
router.get('/schema/applied/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { pageUrl } = req.query;

    const schemas = schemaEngine.getAppliedSchema(clientId, pageUrl);

    res.json({
      success: true,
      data: schemas
    });
  } catch (error) {
    console.error('Error getting applied schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Remove schema markup
 * DELETE /api/v2/schema/:clientId/:schemaId
 */
router.delete('/schema/:clientId/:schemaId', async (req, res) => {
  try {
    const { clientId, schemaId } = req.params;

    const success = schemaEngine.removeSchema(clientId, parseInt(schemaId));

    res.json({
      success,
      message: success ? 'Schema removed' : 'Failed to remove schema'
    });
  } catch (error) {
    console.error('Error removing schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Validate schema markup
 * POST /api/v2/schema/validate
 */
router.post('/schema/validate', async (req, res) => {
  try {
    const { schema } = req.body;

    if (!schema) {
      return res.status(400).json({
        success: false,
        error: 'schema is required'
      });
    }

    const validation = await schemaEngine.validateSchema(schema);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// SERVER-SIDE OPTIMIZATION ROUTES
// ============================================================

/**
 * Create SSR optimization
 * POST /api/v2/ssr/optimize
 */
router.post('/ssr/optimize', async (req, res) => {
  try {
    const {
      clientId,
      domain,
      pageUrl,
      optimizationType,
      originalValue,
      optimizedValue,
      options
    } = req.body;

    if (!clientId || !domain || !pageUrl || !optimizationType || !optimizedValue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = ssrOptimizationService.createOptimization(
      clientId,
      domain,
      pageUrl,
      optimizationType,
      originalValue,
      optimizedValue,
      options
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating SSR optimization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Apply SSR optimizations to HTML
 * POST /api/v2/ssr/apply
 */
router.post('/ssr/apply', async (req, res) => {
  try {
    const { clientId, pageUrl, html } = req.body;

    if (!clientId || !pageUrl || !html) {
      return res.status(400).json({
        success: false,
        error: 'clientId, pageUrl, and html are required'
      });
    }

    const result = await ssrOptimizationService.applyOptimizations(
      clientId,
      pageUrl,
      html
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error applying SSR optimizations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get SSR optimizations
 * GET /api/v2/ssr/optimizations/:clientId
 */
router.get('/ssr/optimizations/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { pageUrl, status, limit } = req.query;

    const optimizations = ssrOptimizationService.getOptimizations(clientId, {
      pageUrl,
      status,
      limit: parseInt(limit) || 100
    });

    res.json({
      success: true,
      data: optimizations
    });
  } catch (error) {
    console.error('Error getting SSR optimizations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get SSR optimization statistics
 * GET /api/v2/ssr/stats/:clientId
 */
router.get('/ssr/stats/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    const stats = ssrOptimizationService.getOptimizationStats(clientId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting SSR stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Deactivate SSR optimization
 * POST /api/v2/ssr/deactivate
 */
router.post('/ssr/deactivate', async (req, res) => {
  try {
    const { clientId, optimizationId } = req.body;

    const success = ssrOptimizationService.deactivateOptimization(
      clientId,
      optimizationId
    );

    res.json({
      success,
      message: success ? 'Optimization deactivated' : 'Failed to deactivate optimization'
    });
  } catch (error) {
    console.error('Error deactivating SSR optimization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rollback SSR optimization
 * POST /api/v2/ssr/rollback
 */
router.post('/ssr/rollback', async (req, res) => {
  try {
    const { clientId, optimizationId, reason } = req.body;

    const success = ssrOptimizationService.rollbackOptimization(
      clientId,
      optimizationId,
      reason
    );

    res.json({
      success,
      message: success ? 'Optimization rolled back' : 'Failed to rollback optimization'
    });
  } catch (error) {
    console.error('Error rolling back SSR optimization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Batch create SSR optimizations
 * POST /api/v2/ssr/batch
 */
router.post('/ssr/batch', async (req, res) => {
  try {
    const { clientId, domain, optimizations } = req.body;

    if (!clientId || !domain || !optimizations || !Array.isArray(optimizations)) {
      return res.status(400).json({
        success: false,
        error: 'clientId, domain, and optimizations array are required'
      });
    }

    const result = ssrOptimizationService.batchCreateOptimizations(
      clientId,
      domain,
      optimizations
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error batch creating SSR optimizations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test SSR optimization without applying
 * POST /api/v2/ssr/test
 */
router.post('/ssr/test', async (req, res) => {
  try {
    const { html, optimizationType, optimizedValue } = req.body;

    if (!html || !optimizationType || !optimizedValue) {
      return res.status(400).json({
        success: false,
        error: 'html, optimizationType, and optimizedValue are required'
      });
    }

    const result = ssrOptimizationService.testOptimization(
      html,
      optimizationType,
      optimizedValue
    );

    res.json(result);
  } catch (error) {
    console.error('Error testing SSR optimization:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Clear cache for a client
 * POST /api/v2/ssr/clear-cache
 */
router.post('/ssr/clear-cache', async (req, res) => {
  try {
    const { clientId } = req.body;

    const cleared = ssrOptimizationService.clearAllCache(clientId);

    res.json({
      success: true,
      message: `Cleared ${cleared} cache entries`
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get cache statistics
 * GET /api/v2/ssr/cache-stats
 */
router.get('/ssr/cache-stats', async (req, res) => {
  try {
    const stats = ssrOptimizationService.getCacheStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
