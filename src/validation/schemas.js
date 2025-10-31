/**
 * Joi Validation Schemas
 * 
 * Input validation schemas for API endpoints
 */

import Joi from 'joi';

// Client validation
export const clientSchema = Joi.object({
  id: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Client ID must contain only lowercase letters, numbers, and hyphens'
    }),
  name: Joi.string().min(2).max(200).required(),
  domain: Joi.string().domain().required(),
  businessType: Joi.string().max(100).allow('', null),
  city: Joi.string().max(100).allow('', null),
  state: Joi.string().max(50).allow('', null),
  country: Joi.string().max(50).allow('', null),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().max(20).allow('', null),
  url: Joi.string().uri().allow('', null)
});

// Campaign validation
export const campaignSchema = Joi.object({
  clientId: Joi.string().required(),
  name: Joi.string().min(3).max(200).required(),
  type: Joi.string().valid('seo', 'local-seo', 'content', 'technical').required(),
  status: Joi.string().valid('active', 'paused', 'completed').default('active'),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).allow(null),
  budget: Joi.number().positive().allow(null),
  goals: Joi.array().items(Joi.string()).default([])
});

// Goal validation
export const goalSchema = Joi.object({
  clientId: Joi.string().required(),
  metric: Joi.string().valid('traffic', 'rankings', 'conversions', 'revenue').required(),
  target: Joi.number().positive().required(),
  current: Joi.number().min(0).default(0),
  deadline: Joi.date().iso().required(),
  priority: Joi.string().valid('high', 'medium', 'low').default('medium')
});

// Webhook validation
export const webhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(
    Joi.string().valid(
      'audit.completed',
      'issue.detected',
      'goal.achieved',
      'rank.changed',
      'campaign.completed'
    )
  ).min(1).required(),
  secret: Joi.string().min(32).allow('', null)
});

// Keyword validation
export const keywordSchema = Joi.object({
  keyword: Joi.string().min(2).max(200).required(),
  domain: Joi.string().domain().required(),
  location: Joi.string().max(100).default('United States'),
  language: Joi.string().length(2).default('en'),
  device: Joi.string().valid('desktop', 'mobile', 'tablet').default('desktop')
});

// Lead capture validation
export const leadSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  company: Joi.string().max(200).allow('', null),
  website: Joi.string().domain().allow('', null),
  phone: Joi.string().max(20).allow('', null),
  source: Joi.string().max(100).allow('', null)
});

// Auth validation
export const registerSchema = Joi.object({
  clientId: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).allow('', null),
  lastName: Joi.string().min(2).max(50).allow('', null),
  role: Joi.string().valid('client', 'admin').default('client')
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Optimization schemas
export const optimizationSchema = Joi.object({
  clientId: Joi.string().required(),
  contentType: Joi.string().valid('post', 'page', 'product').required(),
  contentId: Joi.number().integer().positive().allow(null),
  contentTitle: Joi.string().max(300).allow('', null)
});

export const bulkOptimizationSchema = Joi.object({
  clientId: Joi.string().required(),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

// Scheduler schemas
export const scheduledJobSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  type: Joi.string().valid('audit', 'optimization', 'rank-tracking', 'local-seo', 'backup').required(),
  schedule: Joi.string().required(), // cron format
  clientId: Joi.string().allow('', null),
  config: Joi.object().default({}),
  enabled: Joi.boolean().default(true)
});

// Local SEO schemas
export const localSEOAuditSchema = Joi.object({
  includeNAP: Joi.boolean().default(true),
  includeSchema: Joi.boolean().default(true),
  includeDirectories: Joi.boolean().default(true),
  includeReviews: Joi.boolean().default(true)
});

export const localSEOScheduleSchema = Joi.object({
  frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
  time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  autoFix: Joi.boolean().default(false),
  notifications: Joi.boolean().default(true)
});

// WordPress connection schema
export const wordpressConnectionSchema = Joi.object({
  siteId: Joi.string().required(),
  url: Joi.string().uri().required(),
  username: Joi.string().min(3).max(60).required(),
  appPassword: Joi.string().min(20).required(),
  verifySSL: Joi.boolean().default(true)
});

// Notification preferences schema
export const notificationPreferencesSchema = Joi.object({
  email: Joi.boolean().default(true),
  discord: Joi.boolean().default(false),
  rankChanges: Joi.boolean().default(true),
  auditCompletion: Joi.boolean().default(true),
  optimizationResults: Joi.boolean().default(true),
  systemErrors: Joi.boolean().default(true),
  weeklyReports: Joi.boolean().default(true)
});

// GSC sync schema
export const gscSyncSchema = Joi.object({
  clientId: Joi.string().allow('', null),
  days: Joi.number().integer().min(1).max(90).default(30),
  force: Joi.boolean().default(false)
});

// Query parameter schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().allow(''),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  days: Joi.number().integer().min(1).max(365)
}).or('days', 'startDate');

// ID parameter schema
export const idParamSchema = Joi.object({
  id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.string().pattern(/^[a-z0-9-]+$/),
    Joi.number().integer().positive()
  ).required()
});

export const clientIdParamSchema = Joi.object({
  clientId: Joi.string().pattern(/^[a-z0-9-]+$/).required()
});
