/**
 * Activity Log Database
 * 
 * Comprehensive audit trail for tracking:
 * - All system actions and operations
 * - User activities
 * - Auto-fix operations
 * - API calls and integrations
 * - Errors and issues
 * - System events
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'activity-log.json');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    activities: [],
    stats: {
      totalActivities: 0,
      successCount: 0,
      failureCount: 0,
      warningCount: 0
    }
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

/**
 * Read database
 */
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading activity log database:', error);
    return { activities: [], stats: {} };
  }
}

/**
 * Write database
 */
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing activity log database:', error);
    return false;
  }
}

/**
 * Activity types
 */
export const ActivityTypes = {
  AUTOFIX: 'autofix',
  API_CALL: 'api_call',
  USER_ACTION: 'user_action',
  SYSTEM_EVENT: 'system_event',
  ERROR: 'error',
  WARNING: 'warning',
  AUDIT: 'audit',
  OPTIMIZATION: 'optimization',
  INTEGRATION: 'integration'
};

/**
 * Activity status
 */
export const ActivityStatus = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PARTIAL: 'partial',
  WARNING: 'warning',
  IN_PROGRESS: 'in_progress'
};

/**
 * Log activity
 */
export function logActivity(data) {
  const db = readDB();
  
  const activity = {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: data.type || ActivityTypes.SYSTEM_EVENT,
    category: data.category || 'general',
    action: data.action,
    description: data.description,
    status: data.status || ActivityStatus.SUCCESS,
    
    // Context
    userId: data.userId || null,
    clientId: data.clientId || null,
    clientName: data.clientName || null,
    
    // Details
    details: data.details || {},
    metadata: data.metadata || {},
    
    // Results
    itemsProcessed: data.itemsProcessed || 0,
    itemsSuccessful: data.itemsSuccessful || 0,
    itemsFailed: data.itemsFailed || 0,
    
    // Error tracking
    error: data.error || null,
    errorStack: data.errorStack || null,
    
    // Performance
    duration: data.duration || null,
    
    // Timestamps
    createdAt: new Date().toISOString(),
    timestamp: Date.now()
  };
  
  db.activities.push(activity);
  
  // Update stats
  db.stats.totalActivities = (db.stats.totalActivities || 0) + 1;
  if (activity.status === ActivityStatus.SUCCESS) {
    db.stats.successCount = (db.stats.successCount || 0) + 1;
  } else if (activity.status === ActivityStatus.FAILED) {
    db.stats.failureCount = (db.stats.failureCount || 0) + 1;
  } else if (activity.status === ActivityStatus.WARNING) {
    db.stats.warningCount = (db.stats.warningCount || 0) + 1;
  }
  
  // Keep only last 5000 activities
  if (db.activities.length > 5000) {
    db.activities = db.activities.slice(-5000);
  }
  
  writeDB(db);
  return activity;
}

/**
 * Get activities with filters
 */
export function getActivities(filters = {}) {
  const db = readDB();
  let activities = db.activities || [];
  
  // Apply filters
  if (filters.type) {
    activities = activities.filter(a => a.type === filters.type);
  }
  
  if (filters.category) {
    activities = activities.filter(a => a.category === filters.category);
  }
  
  if (filters.status) {
    activities = activities.filter(a => a.status === filters.status);
  }
  
  if (filters.clientId) {
    activities = activities.filter(a => a.clientId === filters.clientId);
  }
  
  if (filters.userId) {
    activities = activities.filter(a => a.userId === filters.userId);
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    activities = activities.filter(a => 
      a.action?.toLowerCase().includes(searchLower) ||
      a.description?.toLowerCase().includes(searchLower) ||
      a.clientName?.toLowerCase().includes(searchLower)
    );
  }
  
  if (filters.startDate) {
    const startTime = new Date(filters.startDate).getTime();
    activities = activities.filter(a => a.timestamp >= startTime);
  }
  
  if (filters.endDate) {
    const endTime = new Date(filters.endDate).getTime();
    activities = activities.filter(a => a.timestamp <= endTime);
  }
  
  // Sort by most recent first
  activities.sort((a, b) => b.timestamp - a.timestamp);
  
  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    activities: activities.slice(startIndex, endIndex),
    total: activities.length,
    page,
    limit,
    totalPages: Math.ceil(activities.length / limit)
  };
}

/**
 * Get activity by ID
 */
export function getActivity(activityId) {
  const db = readDB();
  return db.activities.find(a => a.id === activityId);
}

/**
 * Get recent activities (last 24 hours)
 */
export function getRecentActivities(limit = 50) {
  const db = readDB();
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  return db.activities
    .filter(a => a.timestamp >= oneDayAgo)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get failed activities
 */
export function getFailedActivities(limit = 50) {
  const db = readDB();
  
  return db.activities
    .filter(a => a.status === ActivityStatus.FAILED)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get activities by client
 */
export function getClientActivities(clientId, limit = 50) {
  const db = readDB();
  
  return db.activities
    .filter(a => a.clientId === clientId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get activity statistics
 */
export function getStats(timeRange = '24h') {
  const db = readDB();
  
  let startTime;
  switch (timeRange) {
    case '1h':
      startTime = Date.now() - (60 * 60 * 1000);
      break;
    case '24h':
      startTime = Date.now() - (24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = 0;
  }
  
  const activities = db.activities.filter(a => a.timestamp >= startTime);
  
  const stats = {
    total: activities.length,
    success: activities.filter(a => a.status === ActivityStatus.SUCCESS).length,
    failed: activities.filter(a => a.status === ActivityStatus.FAILED).length,
    warning: activities.filter(a => a.status === ActivityStatus.WARNING).length,
    inProgress: activities.filter(a => a.status === ActivityStatus.IN_PROGRESS).length,
    
    byType: {},
    byCategory: {},
    
    totalItemsProcessed: activities.reduce((sum, a) => sum + (a.itemsProcessed || 0), 0),
    totalItemsSuccessful: activities.reduce((sum, a) => sum + (a.itemsSuccessful || 0), 0),
    totalItemsFailed: activities.reduce((sum, a) => sum + (a.itemsFailed || 0), 0),
    
    avgDuration: 0,
    timeRange
  };
  
  // Count by type
  activities.forEach(a => {
    stats.byType[a.type] = (stats.byType[a.type] || 0) + 1;
    stats.byCategory[a.category] = (stats.byCategory[a.category] || 0) + 1;
  });
  
  // Calculate average duration
  const activitiesWithDuration = activities.filter(a => a.duration);
  if (activitiesWithDuration.length > 0) {
    stats.avgDuration = Math.round(
      activitiesWithDuration.reduce((sum, a) => sum + a.duration, 0) / activitiesWithDuration.length
    );
  }
  
  // Calculate success rate
  stats.successRate = stats.total > 0 
    ? Math.round((stats.success / stats.total) * 100) 
    : 0;
  
  return stats;
}

/**
 * Get activity timeline (grouped by time)
 */
export function getActivityTimeline(timeRange = '24h', groupBy = 'hour') {
  const db = readDB();
  
  let startTime;
  switch (timeRange) {
    case '24h':
      startTime = Date.now() - (24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = 0;
  }
  
  const activities = db.activities.filter(a => a.timestamp >= startTime);
  
  const timeline = {};
  
  activities.forEach(activity => {
    const date = new Date(activity.timestamp);
    let key;
    
    if (groupBy === 'hour') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
    } else if (groupBy === 'day') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else {
      key = date.toISOString().split('T')[0];
    }
    
    if (!timeline[key]) {
      timeline[key] = {
        timestamp: key,
        total: 0,
        success: 0,
        failed: 0,
        warning: 0
      };
    }
    
    timeline[key].total++;
    if (activity.status === ActivityStatus.SUCCESS) timeline[key].success++;
    if (activity.status === ActivityStatus.FAILED) timeline[key].failed++;
    if (activity.status === ActivityStatus.WARNING) timeline[key].warning++;
  });
  
  return Object.values(timeline).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Clear old activities (older than specified days)
 */
export function clearOldActivities(daysToKeep = 90) {
  const db = readDB();
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  const beforeCount = db.activities.length;
  db.activities = db.activities.filter(a => a.timestamp >= cutoffTime);
  const afterCount = db.activities.length;
  
  writeDB(db);
  
  return {
    deleted: beforeCount - afterCount,
    remaining: afterCount
  };
}

export default {
  logActivity,
  getActivities,
  getActivity,
  getRecentActivities,
  getFailedActivities,
  getClientActivities,
  getStats,
  getActivityTimeline,
  clearOldActivities,
  ActivityTypes,
  ActivityStatus
};
