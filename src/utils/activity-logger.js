/**
 * Activity Logger Utility
 * 
 * Centralized logging for all system activities
 */

import activityLogDB, { ActivityTypes, ActivityStatus } from '../database/activity-log-db.js';

/**
 * Log an auto-fix operation
 */
export function logAutoFix(data) {
  return activityLogDB.logActivity({
    type: ActivityTypes.AUTOFIX,
    category: 'seo',
    action: data.action || 'Auto-Fix Operation',
    description: data.description,
    status: data.status || ActivityStatus.SUCCESS,
    clientId: data.clientId,
    clientName: data.clientName,
    itemsProcessed: data.itemsProcessed || 0,
    itemsSuccessful: data.itemsSuccessful || 0,
    itemsFailed: data.itemsFailed || 0,
    duration: data.duration,
    error: data.error,
    details: data.details || {},
    metadata: {
      engineId: data.engineId,
      engineName: data.engineName,
      runId: data.runId,
      ...data.metadata
    }
  });
}

/**
 * Log an API call
 */
export function logAPICall(data) {
  return activityLogDB.logActivity({
    type: ActivityTypes.API_CALL,
    category: data.category || 'api',
    action: data.action,
    description: data.description,
    status: data.status || ActivityStatus.SUCCESS,
    clientId: data.clientId,
    clientName: data.clientName,
    duration: data.duration,
    error: data.error,
    details: data.details || {},
    metadata: {
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      ...data.metadata
    }
  });
}

/**
 * Log a user action
 */
export function logUserAction(data) {
  return activityLogDB.logActivity({
    type: ActivityTypes.USER_ACTION,
    category: data.category || 'user',
    action: data.action,
    description: data.description,
    status: ActivityStatus.SUCCESS,
    userId: data.userId,
    clientId: data.clientId,
    clientName: data.clientName,
    details: data.details || {},
    metadata: data.metadata || {}
  });
}

/**
 * Log a system event
 */
export function logSystemEvent(data) {
  return activityLogDB.logActivity({
    type: ActivityTypes.SYSTEM_EVENT,
    category: data.category || 'system',
    action: data.action,
    description: data.description,
    status: data.status || ActivityStatus.SUCCESS,
    duration: data.duration,
    error: data.error,
    details: data.details || {},
    metadata: data.metadata || {}
  });
}

/**
 * Log an error
 */
export function logError(data) {
  return activityLogDB.logActivity({
    type: ActivityTypes.ERROR,
    category: data.category || 'error',
    action: data.action || 'Error Occurred',
    description: data.description || data.error?.message,
    status: ActivityStatus.FAILED,
    clientId: data.clientId,
    clientName: data.clientName,
    error: data.error?.message || data.error,
    errorStack: data.error?.stack,
    details: data.details || {},
    metadata: data.metadata || {}
  });
}

/**
 * Log an optimization operation
 */
export function logOptimization(data) {
  return activityLogDB.logActivity({
    type: ActivityTypes.OPTIMIZATION,
    category: 'seo',
    action: data.action || 'Content Optimization',
    description: data.description,
    status: data.status || ActivityStatus.SUCCESS,
    clientId: data.clientId,
    clientName: data.clientName,
    itemsProcessed: data.itemsProcessed || 0,
    itemsSuccessful: data.itemsSuccessful || 0,
    itemsFailed: data.itemsFailed || 0,
    duration: data.duration,
    error: data.error,
    details: data.details || {},
    metadata: data.metadata || {}
  });
}

/**
 * Log an integration event
 */
export function logIntegration(data) {
  return activityLogDB.logActivity({
    type: ActivityTypes.INTEGRATION,
    category: data.category || 'integration',
    action: data.action,
    description: data.description,
    status: data.status || ActivityStatus.SUCCESS,
    clientId: data.clientId,
    clientName: data.clientName,
    itemsProcessed: data.itemsProcessed || 0,
    itemsSuccessful: data.itemsSuccessful || 0,
    itemsFailed: data.itemsFailed || 0,
    duration: data.duration,
    error: data.error,
    details: data.details || {},
    metadata: {
      integration: data.integration,
      ...data.metadata
    }
  });
}

/**
 * Wrap a function to automatically log its execution
 */
export function withActivityLogging(fn, logConfig) {
  return async function(...args) {
    const startTime = Date.now();
    let status = ActivityStatus.SUCCESS;
    let error = null;
    let result = null;
    
    try {
      result = await fn(...args);
      return result;
    } catch (err) {
      status = ActivityStatus.FAILED;
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      activityLogDB.logActivity({
        type: logConfig.type || ActivityTypes.SYSTEM_EVENT,
        category: logConfig.category || 'general',
        action: logConfig.action,
        description: logConfig.description,
        status,
        duration,
        error: error?.message,
        errorStack: error?.stack,
        clientId: logConfig.clientId,
        clientName: logConfig.clientName,
        details: logConfig.details || {},
        metadata: logConfig.metadata || {}
      });
    }
  };
}

export default {
  logAutoFix,
  logAPICall,
  logUserAction,
  logSystemEvent,
  logError,
  logOptimization,
  logIntegration,
  withActivityLogging,
  ActivityTypes,
  ActivityStatus
};
