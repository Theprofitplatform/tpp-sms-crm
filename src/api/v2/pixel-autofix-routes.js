/**
 * PIXEL AUTOFIX API ROUTES
 *
 * Endpoints for pixel issue AutoFix functionality:
 * - Check fixable issues
 * - Get fix proposals
 * - Apply fixes
 * - Batch operations
 *
 * Phase: 4B - AutoFix Integration
 * Date: November 2, 2025
 */

import express from 'express';
import pixelAutoFixOrchestrator from '../../autofix/pixel-autofix-orchestrator.js';

const router = express.Router();

/**
 * Get all fixable issues for a pixel
 * GET /api/v2/pixel/autofix/:pixelId/fixable
 */
router.get('/pixel/autofix/:pixelId/fixable', async (req, res) => {
  try {
    const { pixelId } = req.params;

    const fixableIssues = await pixelAutoFixOrchestrator.getFixableIssues(parseInt(pixelId));

    res.json({
      success: true,
      data: fixableIssues,
      count: fixableIssues.length,
      message: `Found ${fixableIssues.length} fixable issues`
    });
  } catch (error) {
    console.error('[AutoFix API] Error getting fixable issues:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get fix proposal for a specific issue
 * GET /api/v2/pixel/autofix/issue/:issueId/proposal
 */
router.get('/pixel/autofix/issue/:issueId/proposal', async (req, res) => {
  try {
    const { issueId } = req.params;

    // Get the issue first
    const issue = pixelAutoFixOrchestrator.db.prepare('SELECT * FROM seo_issues WHERE id = ?').get(parseInt(issueId));

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    // Check if fix is available
    const fixProposal = await pixelAutoFixOrchestrator.canAutoFix(issue);

    if (!fixProposal) {
      return res.json({
        success: true,
        fixable: false,
        message: 'This issue cannot be auto-fixed'
      });
    }

    res.json({
      success: true,
      fixable: true,
      data: fixProposal
    });
  } catch (error) {
    console.error('[AutoFix API] Error getting fix proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Apply a fix proposal
 * POST /api/v2/pixel/autofix/proposal/:proposalId/apply
 *
 * Body: { approved: true, approvedBy: "user@example.com" }
 */
router.post('/pixel/autofix/proposal/:proposalId/apply', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { approved = false, approvedBy = 'api-user' } = req.body;

    const result = await pixelAutoFixOrchestrator.applyFix(
      parseInt(proposalId),
      approved,
      approvedBy
    );

    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Fix applied successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[AutoFix API] Error applying fix:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Apply multiple fixes in batch
 * POST /api/v2/pixel/autofix/:pixelId/apply-batch
 *
 * Body: {
 *   proposalIds: [1, 2, 3],
 *   approved: true,
 *   approvedBy: "user@example.com"
 * }
 */
router.post('/pixel/autofix/:pixelId/apply-batch', async (req, res) => {
  try {
    const { pixelId } = req.params;
    const { proposalIds = [], approved = false, approvedBy = 'api-user' } = req.body;

    if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'proposalIds array is required'
      });
    }

    const results = await pixelAutoFixOrchestrator.applyBatchFixes(
      proposalIds,
      approved,
      approvedBy
    );

    res.json({
      success: true,
      data: results,
      message: `Applied ${results.applied.length} of ${results.total} fixes`
    });
  } catch (error) {
    console.error('[AutoFix API] Error applying batch fixes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get AutoFix statistics
 * GET /api/v2/pixel/autofix/stats
 */
router.get('/pixel/autofix/stats', async (req, res) => {
  try {
    const stats = pixelAutoFixOrchestrator.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[AutoFix API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get a specific proposal
 * GET /api/v2/pixel/autofix/proposal/:proposalId
 */
router.get('/pixel/autofix/proposal/:proposalId', async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal = pixelAutoFixOrchestrator.getProposal(parseInt(proposalId));

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    res.json({
      success: true,
      data: proposal
    });
  } catch (error) {
    console.error('[AutoFix API] Error getting proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
