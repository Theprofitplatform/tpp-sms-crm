/**
 * Activity Log API Routes
 */

import express from 'express';
import activityLogDB from '../database/activity-log-db.js';

const router = express.Router();

/**
 * GET /api/activity-log
 * Get activities with filters
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      category: req.query.category,
      status: req.query.status,
      clientId: req.query.clientId,
      userId: req.query.userId,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50
    };
    
    const result = activityLogDB.getActivities(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity-log/recent
 * Get recent activities (last 24 hours)
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = activityLogDB.getRecentActivities(limit);
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity-log/failed
 * Get failed activities
 */
router.get('/failed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = activityLogDB.getFailedActivities(limit);
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching failed activities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity-log/client/:clientId
 * Get activities for a specific client
 */
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const activities = activityLogDB.getClientActivities(clientId, limit);
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching client activities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity-log/stats
 * Get activity statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '24h';
    const stats = activityLogDB.getStats(timeRange);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity-log/timeline
 * Get activity timeline
 */
router.get('/timeline', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '24h';
    const groupBy = req.query.groupBy || 'hour';
    const timeline = activityLogDB.getActivityTimeline(timeRange, groupBy);
    
    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity-log/:id
 * Get a specific activity
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const activity = activityLogDB.getActivity(id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/activity-log
 * Log a new activity
 */
router.post('/', async (req, res) => {
  try {
    const activity = activityLogDB.logActivity(req.body);
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/activity-log/cleanup
 * Clean up old activities
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const daysToKeep = parseInt(req.query.days) || 90;
    const result = activityLogDB.clearOldActivities(daysToKeep);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error cleaning up activities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
