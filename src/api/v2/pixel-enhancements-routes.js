/**
 * ENHANCED PIXEL API ROUTES
 *
 * New endpoints for:
 * - Issue management
 * - Analytics
 * - Health monitoring
 */

import express from 'express';
import enhancedPixelService from '../../services/pixel-service-enhanced.js';

const router = express.Router();

// ============================================================
// ISSUE MANAGEMENT ROUTES
// ============================================================

/**
 * Get issues for a pixel
 * GET /api/v2/pixel/issues/:pixelId
 */
router.get('/pixel/issues/:pixelId', async (req, res) => {
  try {
    const { pixelId } = req.params;
    const { severity, category, status, limit, offset } = req.query;

    const issues = enhancedPixelService.getPixelIssues(pixelId, {
      severity,
      category,
      status,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    });

    res.json({
      success: true,
      data: issues,
      count: issues.length
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get issue summary for a pixel
 * GET /api/v2/pixel/issues/:pixelId/summary
 */
router.get('/pixel/issues/:pixelId/summary', async (req, res) => {
  try {
    const { pixelId } = req.params;

    const summary = enhancedPixelService.getIssueSummary(pixelId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching issue summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Resolve an issue
 * POST /api/v2/pixel/issues/:issueId/resolve
 */
router.post('/pixel/issues/:issueId/resolve', async (req, res) => {
  try {
    const { issueId } = req.params;

    const resolved = enhancedPixelService.resolveIssue(issueId);

    if (resolved) {
      res.json({
        success: true,
        message: 'Issue resolved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }
  } catch (error) {
    console.error('Error resolving issue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Ignore an issue
 * DELETE /api/v2/pixel/issues/:issueId/ignore
 */
router.delete('/pixel/issues/:issueId/ignore', async (req, res) => {
  try {
    const { issueId } = req.params;

    const resolved = enhancedPixelService.resolveIssue(issueId); // Mark as resolved for now

    res.json({
      success: true,
      message: 'Issue ignored'
    });
  } catch (error) {
    console.error('Error ignoring issue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// ANALYTICS ROUTES
// ============================================================

/**
 * Get pixel analytics
 * GET /api/v2/pixel/analytics/:pixelId
 */
router.get('/pixel/analytics/:pixelId', async (req, res) => {
  try {
    const { pixelId } = req.params;
    const { days } = req.query;

    const analytics = enhancedPixelService.getPixelAnalytics(
      pixelId,
      parseInt(days) || 7
    );

    res.json({
      success: true,
      data: analytics,
      period: `Last ${days || 7} days`
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pixel analytics trends
 * GET /api/v2/pixel/analytics/:pixelId/trends
 */
router.get('/pixel/analytics/:pixelId/trends', async (req, res) => {
  try {
    const { pixelId } = req.params;

    const last7Days = enhancedPixelService.getPixelAnalytics(pixelId, 7);
    const last30Days = enhancedPixelService.getPixelAnalytics(pixelId, 30);

    // Calculate trends
    const calculateTrend = (data, metric) => {
      if (data.length < 2) return 0;
      const recent = data.slice(0, Math.floor(data.length / 2));
      const older = data.slice(Math.floor(data.length / 2));

      const recentAvg = recent.reduce((sum, d) => sum + (d[metric] || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, d) => sum + (d[metric] || 0), 0) / older.length;

      if (olderAvg === 0) return 0;
      return ((recentAvg - olderAvg) / olderAvg * 100).toFixed(2);
    };

    res.json({
      success: true,
      data: {
        last7Days: {
          seoScore: calculateTrend(last7Days, 'avg_seo_score'),
          lcp: calculateTrend(last7Days, 'avg_lcp'),
          fid: calculateTrend(last7Days, 'avg_fid'),
          cls: calculateTrend(last7Days, 'avg_cls'),
          totalIssues: calculateTrend(last7Days, 'total_issues')
        },
        last30Days: {
          seoScore: calculateTrend(last30Days, 'avg_seo_score'),
          lcp: calculateTrend(last30Days, 'avg_lcp'),
          fid: calculateTrend(last30Days, 'avg_fid'),
          cls: calculateTrend(last30Days, 'avg_cls'),
          totalIssues: calculateTrend(last30Days, 'total_issues')
        }
      }
    });
  } catch (error) {
    console.error('Error calculating trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Export pixel analytics
 * POST /api/v2/pixel/analytics/:pixelId/export
 */
router.post('/pixel/analytics/:pixelId/export', async (req, res) => {
  try {
    const { pixelId } = req.params;
    const { days, format } = req.body;

    const analytics = enhancedPixelService.getPixelAnalytics(
      pixelId,
      parseInt(days) || 30
    );

    if (format === 'csv') {
      // Generate CSV
      const csv = [
        'Date,Page Views,Unique Pages,Avg SEO Score,Avg LCP,Avg FID,Avg CLS,Total Issues,Critical,High,Medium,Low',
        ...analytics.map(a =>
          `${a.date},${a.page_views},${a.unique_pages},${a.avg_seo_score},${a.avg_lcp},${a.avg_fid},${a.avg_cls},${a.total_issues},${a.critical_issues},${a.high_issues},${a.medium_issues},${a.low_issues}`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="pixel-analytics-${pixelId}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: analytics,
        format: 'json'
      });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// HEALTH MONITORING ROUTES
// ============================================================

/**
 * Get pixel health
 * GET /api/v2/pixel/health/:pixelId
 */
router.get('/pixel/health/:pixelId', async (req, res) => {
  try {
    const { pixelId } = req.params;
    const { hours } = req.query;

    const health = enhancedPixelService.getPixelHealth(
      pixelId,
      parseInt(hours) || 24
    );

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error fetching health:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pixel health history
 * GET /api/v2/pixel/health/:pixelId/history
 */
router.get('/pixel/health/:pixelId/history', async (req, res) => {
  try {
    const { pixelId } = req.params;
    const { hours } = req.query;

    const health = enhancedPixelService.getPixelHealth(
      pixelId,
      parseInt(hours) || 168 // 7 days default
    );

    res.json({
      success: true,
      data: health.history,
      uptime: health.uptime,
      currentStatus: health.currentStatus
    });
  } catch (error) {
    console.error('Error fetching health history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pixel uptime statistics
 * GET /api/v2/pixel/uptime/:pixelId
 */
router.get('/pixel/uptime/:pixelId', async (req, res) => {
  try {
    const { pixelId } = req.params;

    const uptime = enhancedPixelService.getPixelUptime(pixelId);

    res.json({
      success: true,
      data: uptime
    });
  } catch (error) {
    console.error('Error fetching uptime:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
