/**
 * Apply Validation Middleware to Dashboard Routes
 * 
 * This module exports route configurations with validation
 * Use this to systematically apply validation to all routes
 */

import { validate, validateParams, validateQuery, sanitizeInput } from './validation.js';
import {
  clientSchema,
  campaignSchema,
  goalSchema,
  webhookSchema,
  keywordSchema,
  leadSchema,
  registerSchema,
  loginSchema,
  optimizationSchema,
  bulkOptimizationSchema,
  scheduledJobSchema,
  localSEOAuditSchema,
  localSEOScheduleSchema,
  wordpressConnectionSchema,
  notificationPreferencesSchema,
  gscSyncSchema,
  paginationSchema,
  dateRangeSchema,
  idParamSchema,
  clientIdParamSchema
} from '../validation/schemas.js';
import { authMiddleware } from '../auth/auth-middleware.js';

// Combine auth + validation middleware
export const requireAuth = authMiddleware.authenticate;
export const requireAdmin = [authMiddleware.authenticate, authMiddleware.requireAdmin];

// Common middleware combinations
export const withAuth = [requireAuth, sanitizeInput];
export const withAdmin = [requireAuth, authMiddleware.requireAdmin, sanitizeInput];

/**
 * Route validation configurations
 * Format: { method, path, middlewares: [validation, auth] }
 */
export const validatedRoutes = {
  // Authentication routes
  auth: {
    register: [validate(registerSchema), sanitizeInput],
    login: [validate(loginSchema), sanitizeInput]
  },

  // Client routes  
  clients: {
    create: [...withAdmin, validate(clientSchema)],
    update: [...withAdmin, validateParams(clientIdParamSchema), validate(clientSchema)],
    getOne: [validateParams(clientIdParamSchema)],
    delete: [...withAdmin, validateParams(clientIdParamSchema)]
  },

  // Campaign routes
  campaigns: {
    create: [...withAdmin, validate(campaignSchema)],
    update: [...withAdmin, validateParams(idParamSchema), validate(campaignSchema)],
    delete: [...withAdmin, validateParams(idParamSchema)]
  },

  // Goal routes
  goals: {
    create: [...withAdmin, validate(goalSchema)],
    update: [...withAdmin, validateParams(idParamSchema), validate(goalSchema)],
    delete: [...withAdmin, validateParams(idParamSchema)],
    list: [validateQuery(paginationSchema)]
  },

  // Webhook routes
  webhooks: {
    create: [...withAdmin, validate(webhookSchema)],
    update: [...withAdmin, validateParams(idParamSchema), validate(webhookSchema)],
    delete: [...withAdmin, validateParams(idParamSchema)]
  },

  // Keyword routes
  keywords: {
    add: [...withAuth, validate(keywordSchema)],
    bulk: [...withAuth, sanitizeInput]
  },

  // Lead capture routes
  leads: {
    capture: [validate(leadSchema), sanitizeInput] // No auth for public form
  },

  // AI Optimizer routes
  aiOptimizer: {
    optimize: [...withAuth, validate(optimizationSchema)],
    bulkOptimize: [...withAuth, validate(bulkOptimizationSchema)],
    apply: [...withAuth, validateParams(idParamSchema)],
    rollback: [...withAuth, validateParams(idParamSchema)]
  },

  // Scheduler routes
  scheduler: {
    createJob: [...withAdmin, validate(scheduledJobSchema)],
    updateJob: [...withAdmin, validateParams(idParamSchema)],
    deleteJob: [...withAdmin, validateParams(idParamSchema)],
    runJob: [...withAdmin, validateParams(idParamSchema)]
  },

  // Local SEO routes
  localSEO: {
    audit: [...withAuth, validateParams(clientIdParamSchema), validate(localSEOAuditSchema)],
    schedule: [...withAuth, validateParams(clientIdParamSchema), validate(localSEOScheduleSchema)],
    fix: [...withAuth, validateParams(clientIdParamSchema)]
  },

  // WordPress routes
  wordpress: {
    addSite: [...withAdmin, validate(wordpressConnectionSchema)],
    updateSite: [...withAdmin, validateParams({ siteId: Joi.string().required() }), validate(wordpressConnectionSchema)],
    deleteSite: [...withAdmin, validateParams({ siteId: Joi.string().required() })],
    test: [...withAuth, validateParams({ siteId: Joi.string().required() })]
  },

  // Notification routes
  notifications: {
    updatePreferences: [...withAuth, validate(notificationPreferencesSchema)],
    markRead: [...withAuth, validateParams(idParamSchema)],
    delete: [...withAuth, validateParams(idParamSchema)]
  },

  // GSC routes
  gsc: {
    sync: [...withAuth, validate(gscSyncSchema)],
    summary: [...withAuth, validateQuery(dateRangeSchema)]
  },

  // Analytics routes
  analytics: {
    summary: [validateQuery(dateRangeSchema)],
    performance: [validateParams(clientIdParamSchema), validateQuery(dateRangeSchema)],
    clientMetrics: [validateParams(clientIdParamSchema)]
  }
};

/**
 * Helper to apply validation to a route
 */
export function applyValidation(app, method, path, middlewares, handler) {
  app[method](path, ...middlewares, handler);
}

/**
 * Bulk apply validation to multiple routes
 */
export function applyValidationBulk(app, routes) {
  routes.forEach(({ method, path, middlewares, handler }) => {
    applyValidation(app, method, path, middlewares, handler);
  });
}
