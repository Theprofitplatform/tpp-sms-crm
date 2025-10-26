/**
 * Unified Dashboard - Configuration
 *
 * API endpoints, WebSocket URL, and global configuration
 */

const CONFIG = {
  // API Base URL
  API_BASE: 'http://localhost:9000/api',

  // WebSocket URL for real-time updates
  SOCKET_URL: 'http://localhost:9000',

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZES: [10, 20, 50, 100]
  },

  // Chart defaults
  CHARTS: {
    DEFAULT_TIMEFRAME: '30d',
    TIMEFRAMES: [
      { value: '7d', label: 'Last 7 Days' },
      { value: '30d', label: 'Last 30 Days' },
      { value: '90d', label: 'Last 90 Days' },
      { value: '365d', label: 'Last Year' }
    ],
    COLORS: {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#34a853',
      warning: '#fbbc04',
      danger: '#ea4335',
      info: '#4285f4'
    }
  },

  // Toast notification defaults
  TOAST: {
    DURATION: 5000, // 5 seconds
    POSITION: 'top-right'
  },

  // Auto-refresh intervals (in milliseconds)
  REFRESH: {
    DASHBOARD: 60000, // 1 minute
    ACTIVITY: 30000, // 30 seconds
    QUEUE: 15000 // 15 seconds
  },

  // Export formats
  EXPORT_FORMATS: ['csv', 'excel', 'json'],

  // Recommendation priorities
  PRIORITIES: {
    HIGH: { label: 'High', color: '#ea4335' },
    MEDIUM: { label: 'Medium', color: '#fbbc04' },
    LOW: { label: 'Low', color: '#4285f4' }
  },

  // Goal statuses
  GOAL_STATUSES: {
    ACTIVE: { label: 'Active', color: '#34a853' },
    COMPLETED: { label: 'Completed', color: '#667eea' },
    PAUSED: { label: 'Paused', color: '#fbbc04' },
    CANCELLED: { label: 'Cancelled', color: '#ea4335' }
  },

  // Client statuses
  CLIENT_STATUSES: {
    ACTIVE: { label: 'Active', color: '#34a853' },
    INACTIVE: { label: 'Inactive', color: '#ea4335' },
    'PENDING-SETUP': { label: 'Pending Setup', color: '#fbbc04' }
  },

  // Automation types
  AUTOMATION_TYPES: {
    RANK_TRACKING: { label: 'Rank Tracking', icon: '📊' },
    LOCAL_SEO: { label: 'Local SEO', icon: '📍' },
    COMPETITOR_TRACKING: { label: 'Competitor Tracking', icon: '🎯' },
    AUTO_FIX_NAP: { label: 'Auto-Fix NAP', icon: '🔧' },
    AUTO_FIX_SCHEMA: { label: 'Auto-Fix Schema', icon: '🏷️' },
    AUTO_FIX_TITLES: { label: 'Auto-Fix Titles', icon: '📝' },
    AUTO_FIX_CONTENT: { label: 'Auto-Fix Content', icon: '✍️' }
  },

  // Email campaign statuses
  CAMPAIGN_STATUSES: {
    DRAFT: { label: 'Draft', color: '#718096' },
    ACTIVE: { label: 'Active', color: '#34a853' },
    PAUSED: { label: 'Paused', color: '#fbbc04' },
    COMPLETED: { label: 'Completed', color: '#667eea' }
  },

  // Webhook event types
  WEBHOOK_EVENTS: [
    'client.created',
    'client.updated',
    'audit.completed',
    'optimization.completed',
    'rank.changed',
    'goal.completed',
    'recommendation.generated'
  ]
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
