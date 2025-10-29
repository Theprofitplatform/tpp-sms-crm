/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  TIMEOUT: 30000, // 30 seconds
  UPLOAD_TIMEOUT: 120000, // 2 minutes
  EXPORT_TIMEOUT: 300000  // 5 minutes
}

// Polling Intervals (in milliseconds)
export const POLLING_INTERVALS = {
  FAST: 5000,    // 5 seconds - for active jobs
  NORMAL: 30000, // 30 seconds - for status checks
  SLOW: 60000,   // 1 minute - for background updates
  VERY_SLOW: 300000 // 5 minutes - for infrequent checks
}

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_CSV_SIZE: 50 * 1024 * 1024, // 50MB

  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],

  ALLOWED_CSV_TYPES: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/csv'
  ],

  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
}

// Validation Patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^\+?[\d\s\-()]+$/,
  DOMAIN: /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  CRON: /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/
}

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  TABLE_PAGE_SIZE: 50,
  CARDS_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 100
}

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss'
}

// Toast Durations (in milliseconds)
export const TOAST_DURATION = {
  SHORT: 2000,
  DEFAULT: 3000,
  LONG: 5000,
  VERY_LONG: 10000
}

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  RECENT_SEARCHES: 'recent_searches',
  GRID_LAYOUT: 'grid_layout'
}

// Breakpoints (matches Tailwind CSS)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
}

// Status Values
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  IN_PROGRESS: 'in-progress',
  CANCELLED: 'cancelled'
}

// Priority Levels
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

// SEO Score Thresholds
export const SEO_SCORE = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
  POOR: 0
}

// Position Tracking Thresholds
export const POSITION = {
  TOP_3: 3,
  TOP_10: 10,
  TOP_20: 20,
  TOP_50: 50
}

// Rate Limiting
export const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_BULK_OPERATIONS: 100,
  MAX_CONCURRENT_REQUESTS: 5
}

// Error Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 10000  // 10 seconds
}

// Chart Colors (for consistency)
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  PURPLE: '#a855f7',
  PINK: '#ec4899'
}

// Export Types
export const EXPORT_TYPES = {
  CSV: 'csv',
  JSON: 'json',
  PDF: 'pdf',
  EXCEL: 'xlsx'
}

// Notification Types
export const NOTIFICATION_TYPES = {
  RANK_CHANGE: 'rank_change',
  AUDIT_COMPLETE: 'audit_complete',
  OPTIMIZATION_RESULT: 'optimization_result',
  SYSTEM_ERROR: 'system_error',
  WEEKLY_REPORT: 'weekly_report',
  GOAL_ACHIEVED: 'goal_achieved'
}

// Notification Channels
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  DISCORD: 'discord',
  SLACK: 'slack',
  WEBHOOK: 'webhook'
}
