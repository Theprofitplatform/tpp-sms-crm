/**
 * NOTIFICATIONS API ROUTES - Phase 4B
 *
 * Endpoints for managing Phase 4B notifications:
 * - GET /api/notifications - List notifications
 * - POST /api/notifications/:id/read - Mark notification as read
 * - POST /api/notifications/mark-all-read - Mark all as read
 */

import express from 'express';
import notificationsDB from '../../database/notifications-db.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Fetch notifications for the current user
 *
 * Query params:
 * - limit: number of notifications to return (default: 10)
 * - offset: pagination offset (default: 0)
 * - status: filter by status (unread, read, all) (default: all)
 */
router.get('/notifications', (req, res) => {
  try {
    const {
      limit = 10,
      status
    } = req.query;

    // Get notifications using the DB module
    const options = {
      limit: parseInt(limit)
    };

    if (status && status !== 'all') {
      options.status = status;
    }

    const notifications = notificationsDB.getAll(options);
    const unreadCount = notificationsDB.getUnreadCount();

    res.json({
      success: true,
      notifications,
      meta: {
        total: notifications.length,
        unread: unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.post('/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;

    // Mark notification as read using DB module
    const notification = notificationsDB.markAsRead(id);

    res.json({
      success: true,
      notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/notifications/mark-all-read', (req, res) => {
  try {
    // Mark all notifications as read using DB module
    const result = notificationsDB.markAllAsRead();

    res.json({
      success: true,
      markedAsRead: result.changes || 0,
      message: `${result.changes || 0} notification(s) marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
router.delete('/notifications/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Delete notification using DB module
    notificationsDB.deleteNotification(id);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get('/notifications/stats', (req, res) => {
  try {
    // Get all notifications for stats calculation
    const allNotifications = notificationsDB.getAll({});
    const unreadCount = notificationsDB.getUnreadCount();

    const stats = {
      total: allNotifications.length,
      unread: unreadCount,
      read: allNotifications.length - unreadCount,
      issues: allNotifications.filter(n => n.type === 'pixel_issue').length,
      resolved: allNotifications.filter(n => n.type === 'pixel_resolved').length
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification stats',
      message: error.message
    });
  }
});

export default router;
