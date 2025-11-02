/**
 * RECOMMENDATIONS API ROUTES - Phase 4B
 *
 * Endpoints for managing recommendations and AutoFix:
 * - GET /api/recommendations - List recommendations
 * - POST /api/recommendations/applyAutoFix - Apply AutoFix to a recommendation
 * - GET /api/pixel/issues - List pixel issues
 */

import express from 'express';
import { db } from '../../database/index.js';
import recommendationsDB from '../../database/recommendations-db.js';
import MetaTagsFixer from '../../automation/auto-fixers/meta-tags-fixer.js';
import ImageAltFixer from '../../automation/auto-fixers/image-alt-fixer.js';
import SchemaFixer from '../../automation/auto-fixers/schema-fixer.js';

const router = express.Router();

/**
 * GET /api/recommendations
 * Fetch recommendations
 *
 * Query params:
 * - category: filter by category
 * - priority: filter by priority
 * - status: filter by status
 * - limit: number of results (default: 50)
 */
router.get('/recommendations', (req, res) => {
  try {
    const {
      category,
      priority,
      status,
      limit = 50
    } = req.query;

    // Build options for recommendationsDB
    const options = {
      limit: parseInt(limit)
    };

    if (status) {
      options.status = status;
    }

    if (priority) {
      options.priority = priority;
    }

    // Get recommendations using DB module
    const recommendations = recommendationsDB.getAll(options);

    // Filter by category if provided (since DB module doesn't support it)
    let filteredRecs = recommendations;
    if (category) {
      filteredRecs = recommendations.filter(r => r.type === category);
    }

    res.json({
      success: true,
      recommendations: filteredRecs,
      meta: {
        count: filteredRecs.length,
        filters: { category, priority, status }
      }
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: true, // Return success even if empty
      recommendations: [],
      meta: {
        count: 0,
        filters: { category, priority, status },
        error: error.message
      }
    });
  }
});

/**
 * POST /api/recommendations/applyAutoFix
 * Apply AutoFix to a recommendation
 *
 * Body:
 * - recommendationId: ID of the recommendation
 */
router.post('/recommendations/applyAutoFix', async (req, res) => {
  try {
    const { recommendationId } = req.body;

    if (!recommendationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing recommendationId'
      });
    }

    // Get recommendation details
    const recommendation = db.prepare(`
      SELECT
        r.*,
        pi.issue_type,
        pi.page_url,
        pi.description as issue_description,
        pi.category as issue_category,
        pi.severity
       FROM recommendations r
       LEFT JOIN pixel_issues pi ON r.pixel_issue_id = pi.id
       WHERE r.id = ?
    `).get(recommendationId);

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    if (!recommendation.auto_fix_available) {
      return res.status(400).json({
        success: false,
        error: 'AutoFix not available for this recommendation'
      });
    }

    // Execute AutoFix based on engine
    let autofixResult;
    const issueData = {
      id: recommendation.pixel_issue_id,
      issue_type: recommendation.issue_type,
      page_url: recommendation.page_url,
      description: recommendation.issue_description,
      category: recommendation.issue_category,
      severity: recommendation.severity
    };

    switch (recommendation.auto_fix_engine) {
      case 'meta-tags-fixer':
        const metaFixer = new MetaTagsFixer();
        autofixResult = await metaFixer.fixIssue(issueData);
        break;

      case 'image-alt-fixer':
        const imageFixer = new ImageAltFixer();
        autofixResult = await imageFixer.fixIssue(issueData);
        break;

      case 'schema-fixer':
        const schemaFixer = new SchemaFixer();
        autofixResult = await schemaFixer.fixIssue(issueData);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown AutoFix engine: ${recommendation.auto_fix_engine}`
        });
    }

    if (!autofixResult.success) {
      return res.status(500).json({
        success: false,
        error: 'AutoFix execution failed',
        details: autofixResult
      });
    }

    // Update recommendation with fix code
    db.prepare(`
      UPDATE recommendations
       SET fix_code = ?,
           estimated_time = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `).run(autofixResult.fixCode, autofixResult.estimatedTime || 5, recommendationId);

    res.json({
      success: true,
      autofix: autofixResult,
      message: 'AutoFix applied successfully'
    });
  } catch (error) {
    console.error('Error applying AutoFix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply AutoFix',
      message: error.message
    });
  }
});

/**
 * GET /api/pixel/issues
 * Fetch pixel issues
 *
 * Query params:
 * - severity: filter by severity
 * - status: filter by status
 * - category: filter by category
 * - limit: number of results (default: 100)
 */
router.get('/pixel/issues', async (req, res) => {
  try {
    const {
      severity,
      status,
      category,
      limit = 100
    } = req.query;

    let query = `
      SELECT
        pi.id,
        pi.pixel_id as pixelId,
        pi.client_id as clientId,
        pi.issue_type as issueType,
        pi.page_url as pageUrl,
        pi.severity,
        pi.status,
        pi.category,
        pi.description,
        pi.recommendation,
        pi.domain,
        pi.detected_at as detectedAt,
        pi.resolved_at as resolvedAt,
        r.id as recommendation_id,
        r.auto_fix_available as autoFixAvailable,
        r.auto_fix_engine as autoFixEngine
      FROM pixel_issues pi
      LEFT JOIN recommendations r ON pi.id = r.pixel_issue_id
    `;

    const params = [];
    const conditions = [];

    if (severity) {
      conditions.push('pi.severity = ?');
      params.push(severity);
    }

    if (status) {
      conditions.push('pi.status = ?');
      params.push(status);
    }

    if (category) {
      conditions.push('pi.category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pi.detected_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const issues = db.prepare(query).all(...params);

    res.json({
      success: true,
      issues,
      meta: {
        count: issues.length,
        filters: { severity, status, category }
      }
    });
  } catch (error) {
    console.error('Error fetching pixel issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pixel issues',
      message: error.message
    });
  }
});

/**
 * POST /api/recommendations/:id/autofix
 * Apply AutoFix to a specific recommendation (RESTful route)
 *
 * This is an alternative to POST /api/recommendations/applyAutoFix
 * that follows RESTful conventions with the ID in the URL
 */
router.post('/recommendations/:id/autofix', async (req, res) => {
  try {
    const recommendationId = req.params.id;

    // Get recommendation details
    const recommendation = db.prepare(`
      SELECT
        r.*,
        pi.issue_type,
        pi.page_url,
        pi.description as issue_description,
        pi.category as issue_category,
        pi.severity
       FROM recommendations r
       LEFT JOIN pixel_issues pi ON r.pixel_issue_id = pi.id
       WHERE r.id = ?
    `).get(recommendationId);

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    if (!recommendation.auto_fix_available) {
      return res.status(400).json({
        success: false,
        error: 'AutoFix not available for this recommendation'
      });
    }

    // Execute AutoFix based on engine
    let autofixResult;
    const issueData = {
      id: recommendation.pixel_issue_id,
      issue_type: recommendation.issue_type,
      page_url: recommendation.page_url,
      description: recommendation.issue_description,
      category: recommendation.issue_category,
      severity: recommendation.severity
    };

    switch (recommendation.auto_fix_engine) {
      case 'meta-tags-fixer':
        const metaFixer = new MetaTagsFixer();
        autofixResult = await metaFixer.fixIssue(issueData);
        break;

      case 'image-alt-fixer':
        const imageFixer = new ImageAltFixer();
        autofixResult = await imageFixer.fixIssue(issueData);
        break;

      case 'schema-fixer':
        const schemaFixer = new SchemaFixer();
        autofixResult = await schemaFixer.fixIssue(issueData);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown AutoFix engine: ${recommendation.auto_fix_engine}`
        });
    }

    if (!autofixResult.success) {
      return res.status(500).json({
        success: false,
        error: 'AutoFix execution failed',
        details: autofixResult
      });
    }

    // Update recommendation with fix code and mark as completed
    db.prepare(`
      UPDATE recommendations
       SET fix_code = ?,
           estimated_time = ?,
           status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `).run(autofixResult.fixCode, autofixResult.estimatedTime || 5, recommendationId);

    res.json({
      success: true,
      autofix: autofixResult,
      message: 'AutoFix applied successfully'
    });
  } catch (error) {
    console.error('Error applying AutoFix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply AutoFix',
      message: error.message
    });
  }
});

/**
 * PATCH /api/recommendations/:id/status
 * Update recommendation status
 */
router.patch('/recommendations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'in_progress', 'completed', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE recommendations
       SET status = ?,
           completed_at = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `).run(status, completedAt, id);

    res.json({
      success: true,
      message: 'Recommendation status updated'
    });
  } catch (error) {
    console.error('Error updating recommendation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recommendation status',
      message: error.message
    });
  }
});

export default router;
