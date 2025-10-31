/**
 * Sentry Error Tracking Configuration
 * 
 * Initializes Sentry for production error monitoring
 */

import * as Sentry from '@sentry/react'

/**
 * Initialize Sentry
 * Only runs in production environment
 */
export function initSentry() {
  // Only initialize in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Sentry] Skipping initialization in development')
    return
  }

  // TODO: Add your Sentry DSN from https://sentry.io
  const SENTRY_DSN = process.env.VITE_SENTRY_DSN || ''

  if (!SENTRY_DSN) {
    console.warn('[Sentry] No DSN configured. Error tracking disabled.')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Set environment
    environment: process.env.NODE_ENV,
    
    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance monitoring - sample rate
    tracesSampleRate: 1.0, // 100% in production, adjust based on traffic
    
    // Session Replay - sample rate for errors
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Release tracking
    release: `seo-dashboard@${process.env.VITE_APP_VERSION || '1.0.0'}`,
    
    // Filter out common errors
    beforeSend(event, hint) {
      // Filter out specific errors if needed
      const error = hint.originalException
      
      // Ignore certain error types
      if (error && error.message) {
        // Ignore network errors
        if (error.message.includes('NetworkError')) {
          return null
        }
        
        // Ignore ResizeObserver errors (common and harmless)
        if (error.message.includes('ResizeObserver')) {
          return null
        }
      }
      
      return event
    },
    
    // Ignore specific URLs
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random network errors
      'Network request failed',
      'Failed to fetch',
      // Chrome extensions
      'chrome-extension://',
      'moz-extension://',
    ],
  })

  console.log('[Sentry] Initialized successfully')
}

/**
 * Manually capture an error
 */
export function captureError(error, context = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', error, context)
    return
  }

  Sentry.captureException(error, {
    contexts: { custom: context }
  })
}

/**
 * Capture a message
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${level.toUpperCase()}]`, message, context)
    return
  }

  Sentry.captureMessage(message, {
    level,
    contexts: { custom: context }
  })
}

/**
 * Set user context
 */
export function setUser(user) {
  Sentry.setUser(user)
}

/**
 * Add breadcrumb (for error context)
 */
export function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb)
}

/**
 * Start a span (for performance monitoring)
 * Note: Use Sentry.startSpan in newer versions
 */
export function startSpan(options) {
  if (typeof Sentry.startSpan === 'function') {
    return Sentry.startSpan(options)
  }
  // Fallback for older versions
  console.log('[Sentry] Performance monitoring span:', options)
}
