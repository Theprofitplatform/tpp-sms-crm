# Dashboard Refactoring Plan - Complete Implementation Guide

**Project:** SEO Expert Dashboard
**Total Pages:** 27
**Timeline:** 6 Weeks
**Estimated Effort:** 240-300 hours
**Last Updated:** 2025-10-29

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Architecture Overview](#architecture-overview)
4. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
5. [Code Patterns & Templates](#code-patterns--templates)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Reference Materials](#reference-materials)

---

## 🎯 Executive Summary

### Critical Issues Found

| Issue | Pages Affected | Severity | Impact |
|-------|----------------|----------|--------|
| API Integration Anti-Pattern | 23/27 | CRITICAL | Inconsistent error handling, code duplication |
| Mock Data in Production | 15/27 | CRITICAL | Non-functional features, misleading UI |
| Accessibility Violations | 26/27 | HIGH | WCAG non-compliance, legal risk |
| useEffect Dependency Issues | 21/27 | HIGH | Stale closures, bugs, memory leaks |
| No Error Handling | 24/27 | HIGH | Poor UX, silent failures |
| Security Vulnerabilities | 5/27 | MEDIUM | XSS, CSV injection risks |

### Overall Health Scores

| Category | Current Score | Target Score | Gap |
|----------|--------------|--------------|-----|
| Code Quality | 5.9/10 | 8.5/10 | -2.6 |
| React Best Practices | 4.8/10 | 9.0/10 | -4.2 |
| Performance | 4.6/10 | 8.5/10 | -3.9 |
| Accessibility | 3.7/10 | 9.0/10 | -5.3 |
| Error Handling | 3.9/10 | 9.0/10 | -5.1 |
| State Management | 5.2/10 | 8.0/10 | -2.8 |
| API Integration | 3.4/10 | 9.0/10 | -5.6 |
| UI/UX | 6.1/10 | 8.5/10 | -2.4 |

---

## 📊 Current State Analysis

### Project Structure

```
/mnt/c/Users/abhis/projects/seo expert/
├── dashboard/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── pages/            # 27 page components (MAIN FOCUS)
│   │   │   ├── AIOptimizerPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── APIDocumentationPage.jsx
│   │   │   ├── AutoFixPage.jsx
│   │   │   ├── BulkOperationsPage.jsx
│   │   │   ├── ClientDetailPage.jsx
│   │   │   ├── ClientsPage.jsx
│   │   │   ├── ControlCenterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── DomainsPage.jsx
│   │   │   ├── EmailCampaignsPage.jsx
│   │   │   ├── ExportBackupPage.jsx
│   │   │   ├── GoalsPage.jsx
│   │   │   ├── GoogleSearchConsolePage.jsx
│   │   │   ├── KeywordResearchPage.jsx
│   │   │   ├── KeywordsPage.jsx
│   │   │   ├── LocalSEOPage.jsx
│   │   │   ├── NotificationCenterPage.jsx
│   │   │   ├── PositionTrackingPage.jsx
│   │   │   ├── RecommendationsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── SchedulerPage.jsx
│   │   │   ├── SettingsPage.jsx (NON-FUNCTIONAL)
│   │   │   ├── UnifiedKeywordsPage.jsx
│   │   │   ├── WebhooksPage.jsx
│   │   │   ├── WhiteLabelPage.jsx
│   │   │   └── WordPressManagerPage.jsx
│   │   ├── services/
│   │   │   └── api.js        # Centralized API service (EXISTS but underutilized)
│   │   ├── hooks/            # Custom hooks (NEEDS EXPANSION)
│   │   ├── utils/            # Utility functions (NEEDS CREATION)
│   │   └── constants/        # Constants (NEEDS CREATION)
│   └── package.json
├── src/
│   ├── database/             # Database layer
│   └── api/                  # Backend API endpoints
└── package.json
```

### Existing API Service Layer (dashboard/src/services/api.js)

**Already Implemented:**
- `clientAPI` - Client management (lines 63-114)
- `keywordAPI` - Keyword operations (lines 115-203)
- `analyticsAPI` - Analytics data (lines 204-268)
- `autoFixAPI` - Auto-fix engines (lines 269-311)
- `optimizationAPI` - Optimization operations (lines 312-343)
- `auditAPI` - Audit operations (lines 344-408)
- `emailAPI` - Email campaigns (lines 409-461)
- `webhooksAPI` - Webhook management (lines 462-520)
- `settingsAPI` - Settings management (lines 559-598)
- `brandingAPI` - Branding/white-label (lines 525-554)
- `recommendationsAPI` - Recommendations (lines 316-359)
- `goalsAPI` - Goals management (lines 599-648)

**Missing (Need to Add):**
- `wordpressAPI` - WordPress integration
- `schedulerAPI` - Job scheduling
- `exportAPI` - Data export/backup
- `notificationsAPI` - Notification settings
- `localSEOAPI` - Local SEO features
- `domainsAPI` - Domain management
- `keywordsPageAPI` - Keywords page specific endpoints

### Page-Specific Issues Matrix

| Page | Mock Data | API Issues | useEffect Issues | Accessibility | Error Handling | Critical Bug | Priority |
|------|-----------|------------|------------------|---------------|----------------|--------------|----------|
| SettingsPage | ❌ | ❌ | ❌ | ❌ | ❌ | NON-FUNCTIONAL | P0 |
| KeywordResearchPage | ❌ | ❌ | ✅ | ⚠️ | ❌ | Mock data only | P0 |
| EmailCampaignsPage | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | Missing import | P0 |
| AIOptimizerPage | ⚠️ | ✅ | ❌ | ⚠️ | ⚠️ | Infinite loop | P1 |
| PositionTrackingPage | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | XSS vulnerability | P1 |
| WhiteLabelPage | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | XSS in CSS | P1 |
| ExportBackupPage | ⚠️ | ❌ | ⚠️ | ⚠️ | ❌ | Memory leaks | P1 |
| NotificationCenterPage | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | Orphaned state | P2 |
| RecommendationsPage | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | Mock data | P2 |
| AutoFixPage | ❌ | ✅ | ✅ | ⚠️ | ⚠️ | Mock data | P2 |
| GoalsPage | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | Mock data | P2 |
| WebhooksPage | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | Mock data | P2 |
| WordPressManagerPage | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | Direct fetch | P2 |
| SchedulerPage | ⚠️ | ❌ | ✅ | ⚠️ | ⚠️ | Direct fetch | P2 |
| LocalSEOPage | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ | Direct fetch | P2 |
| DashboardPage | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Mock data | P3 |
| AnalyticsPage | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | N+1 queries | P3 |
| ClientsPage | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | No memoization | P3 |
| ClientDetailPage | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | Mock keywords | P3 |
| DomainsPage | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ | Direct fetch | P3 |
| KeywordsPage | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ | Direct fetch | P3 |
| GoogleSearchConsolePage | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | Minor issues | P3 |
| ReportsPage | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | N+1 queries | P3 |
| BulkOperationsPage | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | Sequential ops | P3 |
| ControlCenterPage | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | Polling + socket | P3 |
| UnifiedKeywordsPage | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | API mismatch | P3 |
| APIDocumentationPage | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Static content | P4 |

**Legend:**
- ✅ = No issues / Implemented correctly
- ⚠️ = Partial issues / Needs improvement
- ❌ = Critical issues / Not implemented

---

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend Framework:** React 18
- **UI Library:** shadcn/ui (Radix UI + Tailwind CSS)
- **State Management:** Local state (useState, useReducer)
- **Data Fetching:** Native fetch API (needs upgrade to React Query)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Backend:** Node.js (separate from dashboard)

### Design Patterns to Follow

1. **API Service Layer Pattern**
   - All API calls through centralized service
   - Consistent error handling
   - Typed responses (when TypeScript added)

2. **Custom Hooks Pattern**
   - Extract reusable logic
   - Separate concerns
   - Easy testing

3. **Component Composition**
   - Small, focused components
   - Memoization for performance
   - Clear prop interfaces

4. **Error Handling Pattern**
   - Error boundaries for catastrophic failures
   - Toast notifications for user feedback
   - Retry mechanisms for transient failures

---

## 📅 Phase-by-Phase Implementation

## PHASE 1: Foundation & Critical Infrastructure (Week 1)

### 1.1 Create Error Handling Infrastructure

#### File: `/dashboard/src/utils/errorHandler.js`

```javascript
/**
 * Custom Application Error Class
 * Provides structured error information for better handling
 */
export class AppError extends Error {
  constructor(message, type = 'generic', statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.type = type // 'network' | 'auth' | 'validation' | 'server' | 'generic' | 'cancelled'
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date()
  }
}

/**
 * Centralized API Error Handler
 * Converts various error types into AppError instances
 *
 * @param {Error} error - The error object
 * @param {Response} response - Optional fetch Response object
 * @returns {AppError} Structured error object
 */
export const handleAPIError = (error, response = null) => {
  // Request was cancelled (AbortController)
  if (error.name === 'AbortError') {
    return new AppError('Request cancelled', 'cancelled', 0)
  }

  // Network error (offline or server unreachable)
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new AppError(
      'Cannot connect to server. Please check your network connection.',
      'network',
      0
    )
  }

  // Check if offline
  if (!navigator.onLine) {
    return new AppError(
      'You are offline. Please check your internet connection.',
      'network',
      0
    )
  }

  // HTTP error responses
  if (response) {
    if (response.status === 401) {
      return new AppError(
        'Authentication failed. Please log in again.',
        'auth',
        401
      )
    }

    if (response.status === 403) {
      return new AppError(
        'You do not have permission to perform this action.',
        'auth',
        403
      )
    }

    if (response.status === 404) {
      return new AppError(
        'The requested resource was not found.',
        'notfound',
        404
      )
    }

    if (response.status === 422) {
      return new AppError(
        'Invalid data submitted. Please check your input.',
        'validation',
        422,
        error.details
      )
    }

    if (response.status >= 500) {
      return new AppError(
        'Server error. Our team has been notified. Please try again later.',
        'server',
        response.status
      )
    }

    if (response.status === 429) {
      return new AppError(
        'Too many requests. Please wait a moment and try again.',
        'ratelimit',
        429
      )
    }
  }

  // Generic error
  return new AppError(
    error.message || 'An unexpected error occurred. Please try again.',
    'generic',
    500
  )
}

/**
 * Retry a function with exponential backoff
 * Useful for transient network errors
 *
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise} Result of the function
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error
      }

      // Don't retry if error is not retriable
      if (!isRetriable(error)) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)

      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Check if an error should be retried
 * Only retry network errors and server errors (5xx)
 *
 * @param {AppError} error - Error to check
 * @returns {boolean} Whether to retry
 */
const isRetriable = (error) => {
  if (!(error instanceof AppError)) {
    return false
  }

  return error.type === 'network' ||
         error.type === 'server' ||
         error.statusCode === 429 // Rate limit
}

/**
 * Format error for logging/reporting
 *
 * @param {AppError} error - Error to format
 * @returns {Object} Formatted error object
 */
export const formatErrorForLogging = (error) => {
  return {
    message: error.message,
    type: error.type,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    details: error.details,
    stack: error.stack
  }
}
```

#### File: `/dashboard/src/components/ErrorBoundary.jsx`

```javascript
import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 * Prevents entire app from crashing
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (in production, send to error reporting service)
    console.error('ErrorBoundary caught error:', error, errorInfo)

    this.setState({ errorInfo })

    // TODO: Send to error reporting service (Sentry, Rollbar, etc.)
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-600">Something went wrong</CardTitle>
                  <CardDescription>
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium mb-2">
                    Error Details (Development Only)
                  </summary>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button onClick={this.handleReset} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome}>
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                If this problem persists, please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook to reset error boundary programmatically
 * Usage: const resetError = useErrorBoundary()
 */
export const useErrorBoundary = () => {
  const [, setError] = React.useState()

  return React.useCallback((error) => {
    setError(() => {
      throw error
    })
  }, [])
}
```

### 1.2 Expand API Service Layer

#### File: `/dashboard/src/services/api.js` (ADD these to existing file)

```javascript
// ============================================================
// ADD THESE NEW API MODULES TO EXISTING api.js FILE
// Insert after existing modules (after goalsAPI around line 648)
// ============================================================

// WordPress Integration API
export const wordpressAPI = {
  /**
   * Get all WordPress sites
   */
  async getSites() {
    const response = await fetch(`${API_BASE}/wordpress/sites`)
    if (!response.ok) {
      throw new Error('Failed to fetch WordPress sites')
    }
    return response.json()
  },

  /**
   * Test connection to a WordPress site
   * @param {string} siteId - Site ID
   */
  async testConnection(siteId) {
    const response = await fetch(`${API_BASE}/wordpress/test/${siteId}`, {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error('Connection test failed')
    }
    return response.json()
  },

  /**
   * Sync data with WordPress site
   * @param {string} siteId - Site ID
   */
  async syncSite(siteId) {
    const response = await fetch(`${API_BASE}/wordpress/sync/${siteId}`, {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error('Sync failed')
    }
    return response.json()
  },

  /**
   * Add new WordPress site
   * @param {Object} siteData - Site configuration
   */
  async addSite(siteData) {
    const response = await fetch(`${API_BASE}/wordpress/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteData)
    })
    if (!response.ok) {
      throw new Error('Failed to add WordPress site')
    }
    return response.json()
  },

  /**
   * Update WordPress site configuration
   * @param {string} siteId - Site ID
   * @param {Object} siteData - Updated configuration
   */
  async updateSite(siteId, siteData) {
    const response = await fetch(`${API_BASE}/wordpress/sites/${siteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteData)
    })
    if (!response.ok) {
      throw new Error('Failed to update WordPress site')
    }
    return response.json()
  },

  /**
   * Delete WordPress site
   * @param {string} siteId - Site ID
   */
  async deleteSite(siteId) {
    const response = await fetch(`${API_BASE}/wordpress/sites/${siteId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error('Failed to delete WordPress site')
    }
    return response.json()
  }
}

// Scheduler API
export const schedulerAPI = {
  /**
   * Get all scheduled jobs
   */
  async getJobs() {
    const response = await fetch(`${API_BASE}/scheduler/jobs`)
    if (!response.ok) {
      throw new Error('Failed to fetch scheduler data')
    }
    return response.json()
  },

  /**
   * Toggle job enabled status
   * @param {string} jobId - Job ID
   * @param {boolean} enabled - New enabled status
   */
  async toggleJob(jobId, enabled) {
    const response = await fetch(`${API_BASE}/scheduler/jobs/${jobId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    if (!response.ok) {
      throw new Error('Failed to toggle job')
    }
    return response.json()
  },

  /**
   * Run job immediately
   * @param {string} jobId - Job ID
   */
  async runJob(jobId) {
    const response = await fetch(`${API_BASE}/scheduler/jobs/${jobId}/run`, {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error('Failed to run job')
    }
    return response.json()
  },

  /**
   * Update job schedule
   * @param {string} jobId - Job ID
   * @param {Object} scheduleData - New schedule configuration
   */
  async updateSchedule(jobId, scheduleData) {
    const response = await fetch(`${API_BASE}/scheduler/jobs/${jobId}/schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData)
    })
    if (!response.ok) {
      throw new Error('Failed to update job schedule')
    }
    return response.json()
  },

  /**
   * Get job history
   * @param {string} jobId - Optional job ID (null for all jobs)
   * @param {number} limit - Number of history items
   */
  async getHistory(jobId = null, limit = 50) {
    const url = jobId
      ? `${API_BASE}/scheduler/jobs/${jobId}/history?limit=${limit}`
      : `${API_BASE}/scheduler/history?limit=${limit}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch job history')
    }
    return response.json()
  }
}

// Export/Backup API
export const exportAPI = {
  /**
   * Export data in specified format
   * @param {string} type - Export type (database, clients, keywords, full)
   */
  async exportData(type) {
    const response = await fetch(`${API_BASE}/export/${type}`)
    if (!response.ok) {
      throw new Error('Export failed')
    }

    const blob = await response.blob()
    const filename = response.headers.get('content-disposition')
      ?.split('filename=')[1]
      ?.replace(/"/g, '') ||
      `${type}-export-${new Date().toISOString().split('T')[0]}.csv`

    return { blob, filename }
  },

  /**
   * Get backup history
   * @param {number} limit - Number of backups to retrieve
   */
  async getBackupHistory(limit = 10) {
    const response = await fetch(`${API_BASE}/backups?limit=${limit}`)
    if (!response.ok) {
      throw new Error('Failed to fetch backups')
    }
    return response.json()
  },

  /**
   * Get backup schedule configuration
   */
  async getBackupSchedule() {
    const response = await fetch(`${API_BASE}/backups/schedule`)
    if (!response.ok) {
      throw new Error('Failed to fetch backup schedule')
    }
    return response.json()
  },

  /**
   * Update backup schedule
   * @param {Object} scheduleData - New schedule configuration
   */
  async updateBackupSchedule(scheduleData) {
    const response = await fetch(`${API_BASE}/backups/schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData)
    })
    if (!response.ok) {
      throw new Error('Failed to update backup schedule')
    }
    return response.json()
  },

  /**
   * Download a specific backup
   * @param {string} backupId - Backup ID
   */
  async downloadBackup(backupId) {
    const response = await fetch(`${API_BASE}/backups/${backupId}/download`)
    if (!response.ok) {
      throw new Error('Failed to download backup')
    }

    const blob = await response.blob()
    const filename = response.headers.get('content-disposition')
      ?.split('filename=')[1]
      ?.replace(/"/g, '') ||
      `backup-${backupId}.zip`

    return { blob, filename }
  }
}

// Notifications API
export const notificationsAPI = {
  /**
   * Get notification settings
   */
  async getSettings() {
    const response = await fetch(`${API_BASE}/notifications/settings`)
    if (!response.ok) {
      throw new Error('Failed to fetch notification settings')
    }
    return response.json()
  },

  /**
   * Update notification settings
   * @param {Object} settings - Updated settings
   */
  async updateSettings(settings) {
    const response = await fetch(`${API_BASE}/notifications/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    if (!response.ok) {
      throw new Error('Failed to save notification settings')
    }
    return response.json()
  },

  /**
   * Test notification channel connection
   * @param {string} channel - Channel type (email, discord, slack, sms)
   * @param {Object} config - Channel configuration
   */
  async testConnection(channel, config) {
    const response = await fetch(`${API_BASE}/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, config })
    })
    if (!response.ok) {
      throw new Error('Connection test failed')
    }
    return response.json()
  }
}

// Local SEO API
export const localSEOAPI = {
  /**
   * Get local SEO scores for all clients
   */
  async getScores() {
    const response = await fetch(`${API_BASE}/local-seo/scores`)
    if (!response.ok) {
      throw new Error('Failed to fetch local SEO data')
    }
    return response.json()
  },

  /**
   * Run local SEO audit for client
   * @param {string} clientId - Client ID
   */
  async runAudit(clientId) {
    const response = await fetch(`${API_BASE}/local-seo/audit/${clientId}`, {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error('Audit failed')
    }
    return response.json()
  },

  /**
   * Run auto-fix for client
   * @param {string} clientId - Client ID
   */
  async autoFix(clientId) {
    const response = await fetch(`${API_BASE}/local-seo/fix/${clientId}`, {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error('Auto-fix failed')
    }
    return response.json()
  },

  /**
   * Get local SEO report for client
   * @param {string} clientId - Client ID
   */
  async getReport(clientId) {
    const response = await fetch(`${API_BASE}/local-seo/report/${clientId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch report')
    }
    return response.json()
  }
}

// Domains API (for DomainsPage)
export const domainsAPI = {
  /**
   * Get all domains
   */
  async getAll() {
    const response = await fetch(`${API_BASE}/domains`)
    if (!response.ok) {
      throw new Error('Failed to fetch domains')
    }
    return response.json()
  },

  /**
   * Add new domain
   * @param {Object} domainData - Domain configuration
   */
  async create(domainData) {
    const response = await fetch(`${API_BASE}/domains`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(domainData)
    })
    if (!response.ok) {
      throw new Error('Failed to add domain')
    }
    return response.json()
  },

  /**
   * Update domain
   * @param {string} domainId - Domain ID
   * @param {Object} domainData - Updated configuration
   */
  async update(domainId, domainData) {
    const response = await fetch(`${API_BASE}/domains/${domainId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(domainData)
    })
    if (!response.ok) {
      throw new Error('Failed to update domain')
    }
    return response.json()
  },

  /**
   * Delete domain
   * @param {string} domainId - Domain ID
   */
  async delete(domainId) {
    const response = await fetch(`${API_BASE}/domains/${domainId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error('Failed to delete domain')
    }
    return response.json()
  },

  /**
   * Toggle domain active status
   * @param {string} domainId - Domain ID
   * @param {boolean} active - New active status
   */
  async toggleActive(domainId, active) {
    const response = await fetch(`${API_BASE}/domains/${domainId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    })
    if (!response.ok) {
      throw new Error('Failed to toggle domain status')
    }
    return response.json()
  }
}
```

### 1.3 Create Shared Hooks

#### File: `/dashboard/src/hooks/useAPIRequest.js`

```javascript
import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { handleAPIError, retryWithBackoff } from '@/utils/errorHandler'

/**
 * Custom hook for API requests with built-in loading, error handling, and retry logic
 *
 * @returns {Object} { loading, error, execute }
 *
 * @example
 * const { loading, error, execute } = useAPIRequest()
 *
 * const handleSubmit = async () => {
 *   await execute(
 *     () => api.submitData(data),
 *     {
 *       showSuccessToast: true,
 *       successMessage: 'Data submitted successfully',
 *       retries: 3
 *     }
 *   )
 * }
 */
export const useAPIRequest = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const execute = useCallback(async (
    apiFunction,
    {
      onSuccess,
      onError,
      showSuccessToast = false,
      successMessage = 'Operation successful',
      showErrorToast = true,
      retries = 0,
      errorMessage = null
    } = {}
  ) => {
    setLoading(true)
    setError(null)

    try {
      // Execute with retry if specified
      const fn = retries > 0
        ? () => retryWithBackoff(apiFunction, retries)
        : apiFunction

      const result = await fn()

      // Show success toast if requested
      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: successMessage
        })
      }

      // Call success callback
      onSuccess?.(result)

      return { success: true, data: result }

    } catch (err) {
      // Convert to AppError
      const appError = handleAPIError(err)
      setError(appError)

      // Show error toast if requested
      if (showErrorToast) {
        toast({
          title: 'Error',
          description: errorMessage || appError.message,
          variant: 'destructive'
        })
      }

      // Call error callback
      onError?.(appError)

      return { success: false, error: appError }

    } finally {
      setLoading(false)
    }
  }, [toast])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { loading, error, execute, clearError }
}

/**
 * Hook for API requests with data state management
 *
 * @example
 * const { data, loading, error, refetch } = useAPIData(
 *   () => api.getData(),
 *   { autoFetch: true }
 * )
 */
export const useAPIData = (apiFunction, options = {}) => {
  const [data, setData] = useState(options.initialData || null)
  const { loading, error, execute } = useAPIRequest()

  const fetch = useCallback(async () => {
    const result = await execute(apiFunction, {
      showErrorToast: options.showErrorToast !== false,
      onSuccess: (data) => {
        setData(data)
        options.onSuccess?.(data)
      }
    })
    return result
  }, [apiFunction, execute, options])

  // Auto-fetch on mount if requested
  React.useEffect(() => {
    if (options.autoFetch !== false) {
      fetch()
    }
  }, []) // Empty deps intentional - only fetch once

  return { data, loading, error, refetch: fetch, setData }
}
```

#### File: `/dashboard/src/hooks/useDebounce.js`

```javascript
import { useState, useEffect } from 'react'

/**
 * Debounce a value - useful for search inputs
 *
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {any} Debounced value
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 500)
 *
 * useEffect(() => {
 *   // Fetch data with debounced search term
 *   fetchData(debouncedSearch)
 * }, [debouncedSearch])
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // Set timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup function - cancel timeout if value changes
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounce a callback function
 *
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 *
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query) => fetchData(query),
 *   500
 * )
 *
 * <Input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export const useDebouncedCallback = (callback, delay = 300) => {
  const [timeoutId, setTimeoutId] = useState(null)

  return useCallback((...args) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args)
    }, delay)

    setTimeoutId(newTimeoutId)
  }, [callback, delay, timeoutId])
}
```

#### File: `/dashboard/src/hooks/useLocalStorage.js`

```javascript
import { useState, useEffect } from 'react'

/**
 * Persist state to localStorage
 *
 * @param {string} key - localStorage key
 * @param {any} initialValue - Initial value
 * @returns {[any, Function]} [value, setValue]
 *
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'dark')
 */
export const useLocalStorage = (key, initialValue) => {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Update localStorage when value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}
```

### 1.4 Create Constants File

#### File: `/dashboard/src/constants/index.js`

```javascript
/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
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
```

---

## PHASE 2: Critical Page Fixes (Week 1-2)

### 2.1 Rebuild SettingsPage.jsx (COMPLETE REWRITE)

**⚠️ CRITICAL: This page is completely non-functional and needs to be rebuilt from scratch**

#### File: `/dashboard/src/pages/SettingsPage.jsx`

```javascript
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { settingsAPI } from '@/services/api'
import { useAPIRequest } from '@/hooks/useAPIRequest'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { VALIDATION_PATTERNS } from '@/constants'

// UI Components
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

// Icons
import {
  Settings,
  Bell,
  Link2,
  Key,
  Palette,
  Save,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-react'

export default function SettingsPage() {
  // Form state
  const [settings, setSettings] = useState({
    general: {
      platformName: '',
      adminEmail: '',
      language: 'en',
      timezone: 'UTC'
    },
    notifications: {
      rankChanges: true,
      auditCompletion: true,
      optimizationResults: true,
      systemErrors: true,
      weeklyReports: true
    },
    integrations: [],
    api: {
      apiKey: '',
      webhookUrl: ''
    },
    appearance: {
      theme: 'system',
      primaryColor: 'blue',
      sidebarPosition: 'left'
    }
  })

  const [initialSettings, setInitialSettings] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState({})
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useLocalStorage('settings-active-tab', 'general')

  const { loading, execute } = useAPIRequest()
  const { toast } = useToast()

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const loadSettings = async () => {
    await execute(
      () => settingsAPI.getAll(),
      {
        showErrorToast: true,
        onSuccess: (data) => {
          setSettings(data)
          setInitialSettings(JSON.parse(JSON.stringify(data)))
        }
      }
    )
  }

  const handleChange = useCallback((category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
    setIsDirty(true)

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`${category}.${field}`]
      return newErrors
    })
  }, [])

  const validateSettings = () => {
    const newErrors = {}

    // Validate email
    if (!VALIDATION_PATTERNS.EMAIL.test(settings.general.adminEmail)) {
      newErrors['general.adminEmail'] = 'Invalid email format'
    }

    // Validate webhook URL if provided
    if (settings.api.webhookUrl && !VALIDATION_PATTERNS.URL.test(settings.api.webhookUrl)) {
      newErrors['api.webhookUrl'] = 'Invalid URL format'
    }

    // Validate platform name
    if (!settings.general.platformName || settings.general.platformName.trim().length === 0) {
      newErrors['general.platformName'] = 'Platform name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    // Validate before saving
    if (!validateSettings()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive'
      })
      return
    }

    await execute(
      () => settingsAPI.update('all', settings),
      {
        showSuccessToast: true,
        successMessage: 'Settings saved successfully',
        onSuccess: () => {
          setInitialSettings(JSON.parse(JSON.stringify(settings)))
          setIsDirty(false)
        }
      }
    )
  }

  const handleDiscard = () => {
    setSettings(JSON.parse(JSON.stringify(initialSettings)))
    setIsDirty(false)
    setErrors({})
    toast({ title: 'Changes discarded' })
  }

  const handleRegenerateApiKey = async () => {
    if (!confirm('This will invalidate your current API key. Continue?')) {
      return
    }

    await execute(
      () => settingsAPI.generateAPIKey('Default Key'),
      {
        showSuccessToast: true,
        successMessage: 'API key regenerated successfully',
        onSuccess: (data) => {
          handleChange('api', 'apiKey', data.apiKey)
        }
      }
    )
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  if (loading && !initialSettings) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your application configuration
          </p>
        </div>

        {isDirty && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Discard Changes
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Unsaved changes alert */}
      {isDirty && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic application configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform Name */}
              <div className="space-y-2">
                <Label htmlFor="platform-name">
                  Platform Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="platform-name"
                  value={settings.general.platformName}
                  onChange={(e) => handleChange('general', 'platformName', e.target.value)}
                  placeholder="My SEO Platform"
                  aria-invalid={!!errors['general.platformName']}
                  aria-describedby={errors['general.platformName'] ? 'platform-name-error' : undefined}
                />
                {errors['general.platformName'] && (
                  <p id="platform-name-error" className="text-sm text-red-500">
                    {errors['general.platformName']}
                  </p>
                )}
              </div>

              {/* Admin Email */}
              <div className="space-y-2">
                <Label htmlFor="admin-email">
                  Admin Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={settings.general.adminEmail}
                  onChange={(e) => handleChange('general', 'adminEmail', e.target.value)}
                  placeholder="admin@example.com"
                  aria-invalid={!!errors['general.adminEmail']}
                  aria-describedby={errors['general.adminEmail'] ? 'admin-email-error' : undefined}
                />
                {errors['general.adminEmail'] && (
                  <p id="admin-email-error" className="text-sm text-red-500">
                    {errors['general.adminEmail']}
                  </p>
                )}
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={settings.general.language}
                  onValueChange={(value) => handleChange('general', 'language', value)}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.general.timezone}
                  onValueChange={(value) => handleChange('general', 'timezone', value)}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries({
                rankChanges: 'Rank Changes',
                auditCompletion: 'Audit Completion',
                optimizationResults: 'Optimization Results',
                systemErrors: 'System Errors',
                weeklyReports: 'Weekly Reports'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`notif-${key}`} className="cursor-pointer">
                    {label}
                  </Label>
                  <Switch
                    id={`notif-${key}`}
                    checked={settings.notifications[key]}
                    onCheckedChange={(checked) => handleChange('notifications', key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Manage your API keys and webhooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.api.apiKey}
                      readOnly
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowApiKey(!showApiKey)}
                        aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(settings.api.apiKey)}
                        aria-label="Copy API key"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateApiKey}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Keep your API key secure. Never share it publicly.
                </p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={settings.api.webhookUrl}
                  onChange={(e) => handleChange('api', 'webhookUrl', e.target.value)}
                  placeholder="https://your-domain.com/webhook"
                  aria-invalid={!!errors['api.webhookUrl']}
                  aria-describedby={errors['api.webhookUrl'] ? 'webhook-url-error' : undefined}
                />
                {errors['api.webhookUrl'] && (
                  <p id="webhook-url-error" className="text-sm text-red-500">
                    {errors['api.webhookUrl']}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Receive real-time notifications at this URL
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Theme */}
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  {['light', 'dark', 'system'].map((theme) => (
                    <Button
                      key={theme}
                      variant={settings.appearance.theme === theme ? 'default' : 'outline'}
                      onClick={() => handleChange('appearance', 'theme', theme)}
                      className="flex-1"
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="grid grid-cols-5 gap-2">
                  {['blue', 'green', 'purple', 'red', 'orange'].map((color) => (
                    <button
                      key={color}
                      className={`h-10 rounded-md border-2 ${
                        settings.appearance.primaryColor === color
                          ? 'border-primary'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: `var(--${color}-500)` }}
                      onClick={() => handleChange('appearance', 'primaryColor', color)}
                      aria-label={`Select ${color} as primary color`}
                    />
                  ))}
                </div>
              </div>

              {/* Sidebar Position */}
              <div className="space-y-2">
                <Label htmlFor="sidebar-position">Sidebar Position</Label>
                <Select
                  value={settings.appearance.sidebarPosition}
                  onValueChange={(value) => handleChange('appearance', 'sidebarPosition', value)}
                >
                  <SelectTrigger id="sidebar-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab - Placeholder */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect third-party services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No integrations configured yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save reminder */}
      {isDirty && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="font-medium">You have unsaved changes</p>
            <p className="text-sm text-muted-foreground">Don't forget to save</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDiscard}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 2.2 Fix EmailCampaignsPage - Add Missing Import

**File: `/dashboard/src/pages/EmailCampaignsPage.jsx`**

**Line 7-20: Add missing import**

```javascript
// ADD Zap to imports
import {
  FileText,
  Send,
  Calendar,
  Users,
  BarChart3,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Zap // ← ADD THIS LINE
} from 'lucide-react'
```

### 2.3 Fix KeywordResearchPage - Remove All Mock Data

**File: `/dashboard/src/pages/KeywordResearchPage.jsx`**

**Replace lines 74-258 (mock data) with real API integration:**

```javascript
import { useEffect, useCallback, useState, useMemo } from 'react'
import { keywordAPI } from '@/services/api'
import { useAPIRequest } from '@/hooks/useAPIRequest'

export default function KeywordResearchPage() {
  const [projects, setProjects] = useState([])
  const [keywords, setKeywords] = useState([])
  const { loading, execute } = useAPIRequest()

  const fetchData = useCallback(async () => {
    await execute(
      async () => {
        const [projectsRes, keywordsRes] = await Promise.all([
          keywordAPI.listProjects(),
          keywordAPI.getAll()
        ])
        return { projects: projectsRes, keywords: keywordsRes }
      },
      {
        showErrorToast: true,
        onSuccess: ({ projects, keywords }) => {
          setProjects(projects.projects || [])
          setKeywords(keywords.keywords || [])
        }
      }
    )
  }, [execute])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Rest of component...
}
```

### 2.4 Fix ExportBackupPage - Resolve Memory Leaks

**File: `/dashboard/src/pages/ExportBackupPage.jsx`**

**Replace handleExport function (lines 59-76):**

```javascript
const handleExport = useCallback(async (type) => {
  setExportingItems(prev => new Set(prev).add(type))
  let blobUrl

  try {
    const { blob, filename } = await exportAPI.exportData(type)

    blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.click()

    toast({
      title: 'Export successful',
      description: `${type} data exported successfully`
    })
  } catch (err) {
    toast({
      title: 'Export failed',
      description: err.message,
      variant: 'destructive'
    })
  } finally {
    setExportingItems(prev => {
      const next = new Set(prev)
      next.delete(type)
      return next
    })

    // Cleanup blob URL after a short delay
    if (blobUrl) {
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
    }
  }
}, [toast])
```

---

## PHASE 3: useEffect Dependency Fixes (Week 2)

### Universal Fix Pattern

**Apply this pattern to ALL pages with useEffect dependency warnings:**

#### Before (WRONG):
```javascript
useEffect(() => {
  fetchData()
}, [])
```

#### After (CORRECT):
```javascript
// Wrap function in useCallback
const fetchData = useCallback(async () => {
  const controller = new AbortController()
  setLoading(true)
  setError(null)

  try {
    const response = await fetch('/api/data', {
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    setData(data)
  } catch (err) {
    if (err.name !== 'AbortError') {
      setError(err.message)
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      })
    }
  } finally {
    setLoading(false)
  }
}, [/* include dependencies */])

useEffect(() => {
  fetchData()

  // Optional: cleanup if needed
  return () => {
    // AbortController will auto-cancel on unmount
  }
}, [fetchData])
```

### Pages to Fix (21 total)

**Priority 1 (Critical - has infinite loop risk):**
1. ✅ AIOptimizerPage.jsx (line 51) - **INFINITE LOOP RISK**
2. ✅ ControlCenterPage.jsx (lines 115, 120) - Multiple useEffect issues

**Priority 2 (High - frequently used pages):**
3. ✅ DashboardPage.jsx
4. ✅ ClientsPage.jsx (line 56)
5. ✅ KeywordsPage.jsx (line 60)
6. ✅ AnalyticsPage.jsx (line 16)
7. ✅ ReportsPage.jsx (line 56)

**Priority 3 (Medium - less critical):**
8. ✅ ClientDetailPage.jsx (line 31)
9. ✅ DomainsPage.jsx (line 52)
10. ✅ GoalsPage.jsx (line 53)
11. ✅ GoogleSearchConsolePage.jsx (line 48)
12. ✅ KeywordResearchPage.jsx (line 72)
13. ✅ LocalSEOPage.jsx (line 46)
14. ✅ NotificationCenterPage.jsx (line 34)
15. ✅ RecommendationsPage.jsx (line 34)
16. ✅ SchedulerPage.jsx (line 44)
17. ✅ UnifiedKeywordsPage.jsx (line 54)
18. ✅ WebhooksPage.jsx (line 55)
19. ✅ WhiteLabelPage.jsx (line 44)
20. ✅ WordPressManagerPage.jsx (line 44)
21. ✅ AutoFixPage.jsx (line 48)
22. ✅ EmailCampaignsPage.jsx (line 61)

### Example: Fix AIOptimizerPage (CRITICAL)

**File: `/dashboard/src/pages/AIOptimizerPage.jsx`**

**Lines 51-62: Current (BROKEN):**
```javascript
useEffect(() => {
  fetchOptimizerData()
  const interval = setInterval(() => {
    if (optimizerData?.stats?.inProgress > 0 || optimizerData?.queue?.some(q => q.status === 'processing')) {
      fetchOptimizerData()
    }
  }, 5000)
  return () => clearInterval(interval)
}, [optimizerData?.stats?.inProgress, optimizerData?.queue]) // ❌ CAUSES INFINITE LOOP
```

**Replace with:**
```javascript
// Wrap fetchOptimizerData in useCallback
const fetchOptimizerData = useCallback(async () => {
  const controller = new AbortController()
  setLoading(true)

  try {
    const response = await fetch('/api/ai-optimizer/status', {
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error('Failed to fetch optimizer data')
    }

    const data = await response.json()
    setOptimizerData(data)
  } catch (err) {
    if (err.name !== 'AbortError') {
      toast({
        title: 'Error',
        description: 'Failed to load optimizer data',
        variant: 'destructive'
      })
    }
  } finally {
    setLoading(false)
  }
}, [toast])

// Initial fetch
useEffect(() => {
  fetchOptimizerData()
}, [fetchOptimizerData])

// Separate polling effect (uses ref to avoid stale closure)
useEffect(() => {
  const hasActiveJobs =
    optimizerData?.stats?.inProgress > 0 ||
    optimizerData?.queue?.some(q => q.status === 'processing')

  if (!hasActiveJobs) return

  const interval = setInterval(fetchOptimizerData, 5000)
  return () => clearInterval(interval)
}, [optimizerData?.stats?.inProgress, optimizerData?.queue, fetchOptimizerData])
```

---

## PHASE 4: API Integration Refactor (Week 2-3)

### Master Refactoring Checklist

**Pages requiring API integration (23 total):**

#### Remove Mock Data (15 pages):
- [ ] AIOptimizerPage.jsx - Remove mock engines (lines 54-197)
- [ ] AutoFixPage.jsx - Remove mock engines
- [ ] DashboardPage.jsx - Remove mock chart data (lines 14-39)
- [ ] EmailCampaignsPage.jsx - Remove mock campaigns (lines 69-251)
- [ ] GoalsPage.jsx - Remove mock goals (lines 65-213)
- [ ] KeywordResearchPage.jsx - Remove ALL mock data
- [ ] NotificationCenterPage.jsx - Remove hardcoded settings
- [ ] RecommendationsPage.jsx - Remove mock recommendations (lines 42-244)
- [ ] WebhooksPage.jsx - Remove mock webhooks (lines 63-188)
- [ ] WhiteLabelPage.jsx - Remove hardcoded defaults
- [ ] ClientDetailPage.jsx - Remove `generateMockKeywords()` (line 110)
- [ ] ControlCenterPage.jsx - Partially mocked
- [ ] LocalSEOPage.jsx - Has mock data in error fallbacks
- [ ] PositionTrackingPage.jsx - CSV upload but no backend sync
- [ ] UnifiedKeywordsPage.jsx - Some mock elements

#### Add API Service Integration (23 pages):
- [ ] BulkOperationsPage.jsx - Use clientAPI.runAudit, etc.
- [ ] DomainsPage.jsx - Add domainsAPI
- [ ] ExportBackupPage.jsx - Use exportAPI
- [ ] KeywordsPage.jsx - Add to keywordAPI
- [ ] LocalSEOPage.jsx - Use localSEOAPI
- [ ] NotificationCenterPage.jsx - Use notificationsAPI
- [ ] SchedulerPage.jsx - Use schedulerAPI
- [ ] WordPressManagerPage.jsx - Use wordpressAPI
- [ ] All others listed above

### Refactoring Template

**Before (Direct fetch with mock data):**
```javascript
const fetchData = async () => {
  setLoading(true)
  try {
    // Mock data
    const mockData = [{ id: 1, name: 'Test' }]
    setData(mockData)
  } catch (error) {
    console.error('Error:', error)
  }
  setLoading(false)
}
```

**After (Using API service with useAPIRequest hook):**
```javascript
import { clientAPI } from '@/services/api'
import { useAPIRequest } from '@/hooks/useAPIRequest'

const { loading, execute } = useAPIRequest()

const fetchData = useCallback(async () => {
  await execute(
    () => clientAPI.getAll(),
    {
      showErrorToast: true,
      retries: 3, // Auto-retry 3 times
      onSuccess: (data) => {
        setData(data.clients || [])
      }
    }
  )
}, [execute])
```

---

## PHASE 5: Error Handling (Week 3)

### 5.1 Wrap All Pages in Error Boundaries

**File: `/dashboard/src/App.jsx` (or your routing file)**

```javascript
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Import all pages
import DashboardPage from '@/pages/DashboardPage'
import ClientsPage from '@/pages/ClientsPage'
// ... etc

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={
          <ErrorBoundary>
            <DashboardPage />
          </ErrorBoundary>
        } />

        <Route path="/clients" element={
          <ErrorBoundary>
            <ClientsPage />
          </ErrorBoundary>
        } />

        {/* Repeat for all 27 pages */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

### 5.2 Add Toast Notifications

**Pattern to apply everywhere:**

```javascript
import { useToast } from '@/components/ui/use-toast'

export default function SomePage() {
  const { toast } = useToast()

  const handleAction = async () => {
    try {
      await api.doSomething()

      // Success toast
      toast({
        title: "Success",
        description: "Operation completed successfully"
      })
    } catch (error) {
      // Error toast
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }
}
```

### 5.3 Add Retry Mechanisms

**Use retryWithBackoff utility:**

```javascript
import { retryWithBackoff } from '@/utils/errorHandler'

const fetchData = async () => {
  try {
    const data = await retryWithBackoff(
      () => api.getData(),
      3, // max retries
      1000 // base delay (ms)
    )
    setData(data)
  } catch (error) {
    // Show error after all retries failed
    toast({
      title: 'Error',
      description: 'Failed to load data after 3 attempts',
      variant: 'destructive'
    })
  }
}
```

---

## PHASE 6: Accessibility Improvements (Week 4)

### 6.1 ARIA Labels Pattern

**Icon-only buttons (found in 26 pages):**

```javascript
// ❌ BEFORE (Inaccessible)
<Button size="sm" variant="outline">
  <RefreshCw className="h-4 w-4" />
</Button>

// ✅ AFTER (Accessible)
<Button
  size="sm"
  variant="outline"
  aria-label="Refresh data"
>
  <RefreshCw className="h-4 w-4" aria-hidden="true" />
</Button>
```

### 6.2 Form Accessibility

**All forms must follow this pattern:**

```javascript
<div className="space-y-2">
  <Label htmlFor="field-name">
    Field Name <span className="text-red-500">*</span>
  </Label>
  <Input
    id="field-name"
    value={value}
    onChange={handleChange}
    aria-required="true"
    aria-invalid={!!error}
    aria-describedby={error ? "field-error" : undefined}
  />
  {error && (
    <p id="field-error" className="text-sm text-red-500" role="alert">
      {error}
    </p>
  )}
</div>
```

### 6.3 Live Regions for Dynamic Content

**Add to all pages with loading/updating data:**

```javascript
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {loading ? "Loading data..." : `${items.length} items loaded`}
</div>
```

### 6.4 Keyboard Navigation

**Make table rows keyboard accessible:**

```javascript
<TableRow
  tabIndex={0}
  role="button"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleRowClick(item)
    }
  }}
  onClick={() => handleRowClick(item)}
  className="cursor-pointer focus:ring-2 focus:ring-primary"
>
  {/* Row content */}
</TableRow>
```

---

## PHASE 7: Performance Optimization (Week 4-5)

### 7.1 Memoization Pattern

**For filtered data:**

```javascript
const filteredItems = useMemo(() => {
  return items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })
}, [items, searchQuery, statusFilter])
```

**For stats calculations:**

```javascript
const stats = useMemo(() => ({
  total: items.length,
  active: items.filter(i => i.active).length,
  pending: items.filter(i => i.pending).length,
  avgScore: items.length > 0
    ? items.reduce((sum, i) => sum + i.score, 0) / items.length
    : 0
}), [items])
```

**For event handlers:**

```javascript
const handleSubmit = useCallback(async (data) => {
  await execute(() => api.submit(data))
}, [execute])

const handleDelete = useCallback(async (id) => {
  if (!confirm('Are you sure?')) return
  await execute(() => api.delete(id))
}, [execute])
```

### 7.2 Component Extraction

**Extract large repeated components:**

```javascript
// Before: Inline in parent
{clients.map(client => (
  <Card key={client.id}>
    <CardHeader>
      <CardTitle>{client.name}</CardTitle>
      {/* ... 50 more lines */}
    </CardHeader>
  </Card>
))}

// After: Extracted component
const ClientCard = memo(({ client, onEdit, onDelete }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{client.name}</CardTitle>
        {/* ... component content */}
      </CardHeader>
    </Card>
  )
})

// In parent:
{clients.map(client => (
  <ClientCard
    key={client.id}
    client={client}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />
))}
```

---

## PHASE 8: Security Fixes (Week 5)

### 8.1 Input Sanitization

**File: `/dashboard/src/utils/sanitize.js`**

```javascript
import DOMPurify from 'dompurify'

/**
 * Sanitize HTML content
 */
export const sanitizeHTML = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
  })
}

/**
 * Sanitize CSS - Remove dangerous patterns
 */
export const sanitizeCSS = (css) => {
  const dangerous = [
    /javascript:/gi,
    /expression\(/gi,
    /import\s/gi,
    /@import/gi,
    /behavior:/gi,
    /binding:/gi,
    /-moz-binding/gi
  ]

  let clean = css
  dangerous.forEach(pattern => {
    clean = clean.replace(pattern, '')
  })

  return clean
}

/**
 * Escape CSV to prevent injection attacks
 */
export const escapeCSV = (str) => {
  if (typeof str !== 'string') {
    return str
  }

  // Prevent CSV injection (formulas starting with =, +, -, @)
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`
  }

  // Escape quotes
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Validate and sanitize URL
 */
export const sanitizeURL = (url) => {
  try {
    const parsed = new URL(url)

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }

    return parsed.toString()
  } catch {
    throw new Error('Invalid URL')
  }
}

/**
 * Validate email
 */
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255)
}
```

**Apply to:**
- WhiteLabelPage.jsx - Sanitize custom CSS (line 558)
- PositionTrackingPage.jsx - Escape CSV output (line 324)
- Any page with user-generated content

### 8.2 File Upload Validation

**Pattern for all file uploads:**

```javascript
import { FILE_LIMITS } from '@/constants'

const validateFile = (file) => {
  // Check file size
  if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
    throw new Error(`File too large. Maximum size is ${FILE_LIMITS.MAX_IMAGE_SIZE / 1024 / 1024}MB`)
  }

  // Check MIME type
  if (!FILE_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Allowed types: JPG, PNG, GIF, WebP')
  }

  // Check file extension
  const extension = file.name.split('.').pop().toLowerCase()
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']

  if (!allowedExtensions.includes(extension)) {
    throw new Error('Invalid file extension')
  }

  return true
}

const handleFileUpload = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    validateFile(file)

    // Proceed with upload
    const formData = new FormData()
    formData.append('file', file)

    await api.uploadFile(formData)

    toast({ title: 'File uploaded successfully' })
  } catch (error) {
    toast({
      title: 'Upload failed',
      description: error.message,
      variant: 'destructive'
    })
  }
}
```

### 8.3 CSRF Token Handling

**Add to api.js:**

```javascript
/**
 * Get CSRF token from meta tag
 */
const getCSRFToken = () => {
  return document.querySelector('meta[name="csrf-token"]')?.content || ''
}

/**
 * Enhanced fetch with CSRF token
 */
const fetchWithCSRF = async (url, options = {}) => {
  const headers = {
    ...options.headers,
    'X-CSRF-Token': getCSRFToken()
  }

  return fetch(url, {
    ...options,
    headers
  })
}

// Use in all POST/PUT/DELETE requests
export const clientAPI = {
  async create(clientData) {
    const response = await fetchWithCSRF(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    })

    if (!response.ok) throw new Error('Failed to create client')
    return response.json()
  }
}
```

---

## PHASE 9: Testing & Documentation (Week 6)

### 9.1 Unit Tests

**File: `/dashboard/src/__tests__/hooks/useAPIRequest.test.js`**

```javascript
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAPIRequest } from '@/hooks/useAPIRequest'

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

describe('useAPIRequest', () => {
  it('should handle successful API call', async () => {
    const { result } = renderHook(() => useAPIRequest())

    const mockAPI = jest.fn().mockResolvedValue({ data: 'test' })

    let response
    await act(async () => {
      response = await result.current.execute(mockAPI)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(response.success).toBe(true)
    expect(response.data).toEqual({ data: 'test' })
  })

  it('should handle API error', async () => {
    const { result } = renderHook(() => useAPIRequest())

    const mockAPI = jest.fn().mockRejectedValue(new Error('API Error'))

    let response
    await act(async () => {
      response = await result.current.execute(mockAPI)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeTruthy()
    expect(response.success).toBe(false)
  })

  it('should retry on failure when retries specified', async () => {
    const { result } = renderHook(() => useAPIRequest())

    const mockAPI = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: 'success' })

    let response
    await act(async () => {
      response = await result.current.execute(mockAPI, { retries: 3 })
    })

    expect(mockAPI).toHaveBeenCalledTimes(3)
    expect(response.success).toBe(true)
  })
})
```

**File: `/dashboard/src/__tests__/utils/errorHandler.test.js`**

```javascript
import { handleAPIError, retryWithBackoff, AppError } from '@/utils/errorHandler'

describe('errorHandler', () => {
  describe('handleAPIError', () => {
    it('should handle network errors', () => {
      const error = new TypeError('fetch failed')
      const result = handleAPIError(error)

      expect(result).toBeInstanceOf(AppError)
      expect(result.type).toBe('network')
    })

    it('should handle 401 responses', () => {
      const response = { status: 401 }
      const result = handleAPIError(new Error(), response)

      expect(result.type).toBe('auth')
      expect(result.statusCode).toBe(401)
    })

    it('should handle 404 responses', () => {
      const response = { status: 404 }
      const result = handleAPIError(new Error(), response)

      expect(result.type).toBe('notfound')
      expect(result.statusCode).toBe(404)
    })
  })

  describe('retryWithBackoff', () => {
    it('should retry failed requests', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new AppError('Error', 'network'))
        .mockResolvedValueOnce('success')

      const result = await retryWithBackoff(mockFn, 3, 10)

      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(result).toBe('success')
    })

    it('should throw after max retries', async () => {
      const mockFn = jest.fn()
        .mockRejectedValue(new AppError('Error', 'network'))

      await expect(retryWithBackoff(mockFn, 2, 10))
        .rejects.toThrow()

      expect(mockFn).toHaveBeenCalledTimes(2)
    })
  })
})
```

### 9.2 Integration Tests

**File: `/dashboard/src/__tests__/pages/ClientsPage.test.jsx`**

```javascript
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import ClientsPage from '@/pages/ClientsPage'

// Mock API
jest.mock('@/services/api', () => ({
  clientAPI: {
    getAll: jest.fn(() => Promise.resolve({
      success: true,
      clients: [
        { id: 1, name: 'Test Client', status: 'active' },
        { id: 2, name: 'Another Client', status: 'pending' }
      ]
    })),
    create: jest.fn((data) => Promise.resolve({
      success: true,
      client: { id: 3, ...data }
    }))
  }
}))

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('ClientsPage', () => {
  it('should render clients after loading', async () => {
    renderWithRouter(<ClientsPage />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Test Client')).toBeInTheDocument()
    })

    expect(screen.getByText('Another Client')).toBeInTheDocument()
  })

  it('should allow adding a new client', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ClientsPage />)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Test Client')).toBeInTheDocument()
    })

    // Click "Add Client" button
    const addButton = screen.getByRole('button', { name: /add client/i })
    await user.click(addButton)

    // Fill in form
    const nameInput = screen.getByLabelText(/client name/i)
    await user.type(nameInput, 'New Client')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create/i })
    await user.click(submitButton)

    // Verify client was added
    await waitFor(() => {
      expect(screen.getByText('New Client')).toBeInTheDocument()
    })
  })

  it('should filter clients by search term', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ClientsPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Client')).toBeInTheDocument()
    })

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'Test')

    // Verify filtering
    expect(screen.getByText('Test Client')).toBeInTheDocument()
    expect(screen.queryByText('Another Client')).not.toBeInTheDocument()
  })
})
```

### 9.3 Documentation

**File: `/dashboard/DEVELOPMENT.md`**

```markdown
# Dashboard Development Guidelines

## Architecture Overview

The dashboard follows a component-based architecture with:
- **React 18** for UI
- **shadcn/ui** for component library
- **Tailwind CSS** for styling
- **Centralized API layer** for all backend communication

## Code Standards

### 1. API Integration

**Always use the centralized API service:**

```javascript
// ❌ WRONG - Direct fetch
const response = await fetch('/api/clients')

// ✅ CORRECT - Use API service
import { clientAPI } from '@/services/api'
const data = await clientAPI.getAll()
```

### 2. Error Handling

**Use the useAPIRequest hook:**

```javascript
import { useAPIRequest } from '@/hooks/useAPIRequest'

const { loading, execute } = useAPIRequest()

const handleAction = async () => {
  await execute(
    () => api.doSomething(),
    {
      showSuccessToast: true,
      successMessage: 'Action completed',
      retries: 3
    }
  )
}
```

### 3. State Management

**For async data:**
```javascript
const { data, loading, error, refetch } = useAPIData(
  () => api.getData(),
  { autoFetch: true }
)
```

**For local state:**
```javascript
const [value, setValue] = useState(initialValue)
const [savedValue, setSavedValue] = useLocalStorage('key', initialValue)
```

### 4. Accessibility

**All icon-only buttons MUST have aria-label:**
```javascript
<Button aria-label="Refresh data">
  <RefreshCw className="h-4 w-4" aria-hidden="true" />
</Button>
```

**All forms MUST use Label with htmlFor:**
```javascript
<Label htmlFor="field-name">Field Name</Label>
<Input id="field-name" value={value} onChange={handleChange} />
```

**All dynamic content MUST have live regions:**
```javascript
<div role="status" aria-live="polite" className="sr-only">
  {loading ? "Loading..." : `${items.length} items loaded`}
</div>
```

### 5. Performance

**Memoize expensive calculations:**
```javascript
const filteredData = useMemo(() => {
  return data.filter(...)
}, [data, filters])
```

**Memoize event handlers:**
```javascript
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies])
```

**Extract large components:**
```javascript
const ItemCard = memo(({ item }) => {
  return <Card>...</Card>
})
```

### 6. Security

**Sanitize user input:**
```javascript
import { sanitizeHTML, sanitizeCSS, escapeCSV } from '@/utils/sanitize'

const clean = sanitizeHTML(userInput)
```

**Validate file uploads:**
```javascript
import { FILE_LIMITS } from '@/constants'

if (file.size > FILE_LIMITS.MAX_SIZE) {
  throw new Error('File too large')
}
```

## File Organization

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (don't edit)
│   └── custom/          # Custom components
├── pages/               # Page components
├── services/
│   └── api.js          # Centralized API service
├── hooks/
│   ├── useAPIRequest.js
│   ├── useDebounce.js
│   └── useLocalStorage.js
├── utils/
│   ├── errorHandler.js
│   └── sanitize.js
└── constants/
    └── index.js         # All constants
```

## Testing

### Unit Tests

Run unit tests:
```bash
npm test
```

Write tests for all hooks and utility functions:
```javascript
import { renderHook } from '@testing-library/react'

test('hook should work', () => {
  const { result } = renderHook(() => useCustomHook())
  expect(result.current).toBeDefined()
})
```

### Integration Tests

Test page components:
```javascript
import { render, screen } from '@testing-library/react'

test('page should render', async () => {
  render(<MyPage />)
  expect(await screen.findByText('Title')).toBeInTheDocument()
})
```

### Test Coverage

Maintain 80%+ code coverage for:
- All custom hooks
- All utility functions
- Critical page components

## Common Patterns

### Fetching Data on Mount

```javascript
const fetchData = useCallback(async () => {
  const controller = new AbortController()

  await execute(
    () => api.getData({ signal: controller.signal }),
    {
      showErrorToast: true,
      onSuccess: setData
    }
  )
}, [execute])

useEffect(() => {
  fetchData()
}, [fetchData])
```

### Filtering and Search

```javascript
const [searchQuery, setSearchQuery] = useState('')
const debouncedSearch = useDebounce(searchQuery, 300)

const filteredItems = useMemo(() => {
  return items.filter(item =>
    item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  )
}, [items, debouncedSearch])
```

### Form Handling

```javascript
const [formData, setFormData] = useState({ name: '', email: '' })
const [errors, setErrors] = useState({})

const handleChange = (field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }))
  setErrors(prev => ({ ...prev, [field]: undefined }))
}

const handleSubmit = async () => {
  const newErrors = validate(formData)
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors)
    return
  }

  await execute(() => api.submit(formData))
}
```

## Debugging

### Enable Debug Logging

```javascript
// In development
if (import.meta.env.DEV) {
  console.log('Debug info:', data)
}
```

### React DevTools

Install React DevTools browser extension for component inspection.

### Network Tab

Monitor API calls in browser DevTools Network tab.

## Deployment

### Build for Production

```bash
npm run build
```

### Run Tests Before Deploy

```bash
npm test
npm run lint
```

### Check Bundle Size

```bash
npm run build
npm run analyze
```

## Troubleshooting

### Common Issues

**1. useEffect dependency warning:**
- Wrap function in useCallback
- Add to dependency array

**2. State not updating:**
- Use functional update: `setState(prev => ...)`
- Check if state is being mutated directly

**3. API errors:**
- Check network tab for response
- Verify API endpoint in constants
- Check CORS configuration

**4. Performance issues:**
- Add memoization (useMemo, useCallback)
- Extract components
- Check for unnecessary re-renders with React DevTools

## Resources

- [React Documentation](https://react.dev)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Testing Library](https://testing-library.com)

## Support

For questions or issues:
1. Check this documentation
2. Search existing issues
3. Ask in team chat
4. Create new issue with reproduction
```

---

## 📊 Progress Tracking

### Week-by-Week Checklist

#### Week 1: Foundation
- [ ] Create error handling utilities
- [ ] Create ErrorBoundary component
- [ ] Expand api.js with missing modules
- [ ] Create useAPIRequest hook
- [ ] Create useDebounce hook
- [ ] Create useLocalStorage hook
- [ ] Create constants file
- [ ] Rebuild SettingsPage from scratch
- [ ] Fix EmailCampaignsPage missing import
- [ ] Fix KeywordResearchPage (remove mock data)
- [ ] Fix ExportBackupPage (memory leaks)

#### Week 2: Dependencies & API Integration (Part 1)
- [ ] Fix AIOptimizerPage infinite loop
- [ ] Fix ControlCenterPage useEffect issues
- [ ] Fix DashboardPage dependencies
- [ ] Fix ClientsPage dependencies
- [ ] Fix KeywordsPage dependencies
- [ ] Fix AnalyticsPage dependencies
- [ ] Fix ReportsPage dependencies
- [ ] Start API integration: ClientDetailPage
- [ ] Start API integration: DomainsPage
- [ ] Start API integration: GoalsPage

#### Week 3: API Integration (Part 2) & Error Handling
- [ ] Complete API integration: remaining 13 pages
- [ ] Wrap all 27 pages in error boundaries
- [ ] Add toast notifications to all pages
- [ ] Implement retry mechanisms
- [ ] Add error recovery UI

#### Week 4: Accessibility & Performance (Part 1)
- [ ] Add ARIA labels to all buttons (26 pages)
- [ ] Add keyboard navigation to all tables
- [ ] Add live regions for dynamic content
- [ ] Fix form accessibility (labels with htmlFor)
- [ ] Add useMemo for filtering (15 pages)
- [ ] Add useMemo for stats calculations (20 pages)

#### Week 5: Performance (Part 2) & Security
- [ ] Add useCallback for event handlers (all pages)
- [ ] Extract large components (5-10 components)
- [ ] Add input sanitization
- [ ] Add file upload validation
- [ ] Implement CSRF tokens
- [ ] Fix XSS vulnerabilities (WhiteLabelPage, PositionTrackingPage)

#### Week 6: Testing, Documentation & Deployment
- [ ] Write unit tests for hooks (3 files)
- [ ] Write unit tests for utils (2 files)
- [ ] Write integration tests for critical pages (5 pages)
- [ ] Write DEVELOPMENT.md
- [ ] Code review session
- [ ] Fix any discovered issues
- [ ] Deploy to staging
- [ ] QA testing (2 days)
- [ ] Deploy to production

### Daily Stand-up Template

```markdown
## Daily Progress Update

**Date:** YYYY-MM-DD
**Phase:** [Current Phase]

### Completed Today:
- [ ] Task 1
- [ ] Task 2

### In Progress:
- [ ] Task 3 (50% complete)

### Blockers:
- None / [Describe blocker]

### Tomorrow's Plan:
- [ ] Task 4
- [ ] Task 5

### Notes:
- Any important observations or decisions
```

---

## 🎯 Success Criteria

### Quantitative Metrics

#### Code Quality
- [ ] 0 ESLint warnings for useEffect dependencies
- [ ] 0 pages with hardcoded mock data
- [ ] 100% pages using centralized API service
- [ ] 100% pages wrapped in error boundaries
- [ ] 80%+ code coverage on critical paths

#### Accessibility
- [ ] 90%+ Lighthouse accessibility score on all pages
- [ ] 0 ARIA violations
- [ ] 100% forms with proper labels
- [ ] 100% icon buttons with aria-label

#### Performance
- [ ] <3s initial load time
- [ ] <500ms page transitions
- [ ] 90%+ Lighthouse performance score
- [ ] No memory leaks (Chrome DevTools profiling)

#### Security
- [ ] 0 XSS vulnerabilities
- [ ] All user input sanitized
- [ ] All file uploads validated
- [ ] CSRF protection implemented

### Qualitative Goals

- [ ] All API calls handle errors gracefully
- [ ] All user actions provide immediate feedback
- [ ] All forms validate input properly
- [ ] All pages are keyboard navigable
- [ ] Code is maintainable and consistent
- [ ] Documentation is complete and accurate

---

## 🚀 Deployment Strategy

### Pre-Deployment Checklist

#### Code Quality
- [ ] Run full test suite: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Fix all warnings and errors
- [ ] Run type checking (if TypeScript): `npm run type-check`

#### Performance
- [ ] Run production build: `npm run build`
- [ ] Analyze bundle size: `npm run analyze`
- [ ] Check for bundle size regressions
- [ ] Run Lighthouse audit on key pages

#### Accessibility
- [ ] Run axe DevTools on all pages
- [ ] Test keyboard navigation on all pages
- [ ] Test screen reader on critical workflows
- [ ] Verify WCAG 2.1 AA compliance

#### Security
- [ ] Run security audit: `npm audit`
- [ ] Fix critical vulnerabilities
- [ ] Review all user input handling
- [ ] Verify CSRF protection

#### Review
- [ ] Code review by senior developer
- [ ] QA testing on staging
- [ ] User acceptance testing (if applicable)
- [ ] Documentation review

### Deployment Steps

#### 1. Staging Deployment
```bash
# Build for staging
npm run build:staging

# Deploy to staging server
npm run deploy:staging

# Run smoke tests
npm run test:smoke
```

#### 2. QA Testing (2 days)
- [ ] Test all 27 pages
- [ ] Test critical workflows
- [ ] Test error scenarios
- [ ] Test on different browsers
- [ ] Test on different devices

#### 3. Production Deployment
```bash
# Tag release
git tag -a v2.0.0 -m "Dashboard refactoring complete"
git push origin v2.0.0

# Build for production
npm run build:production

# Deploy to production (off-peak hours)
npm run deploy:production

# Verify deployment
npm run test:production
```

#### 4. Monitoring (First 24 hours)
- [ ] Monitor error rates (< 0.1% error rate)
- [ ] Monitor performance metrics
- [ ] Monitor API response times
- [ ] Check user feedback channels
- [ ] Be ready for rollback if needed

### Rollback Plan

If critical issues are discovered:

```bash
# Rollback to previous version
npm run deploy:rollback

# Notify team
# Fix issues
# Redeploy after fixes verified
```

### Post-Deployment

#### Week 1
- [ ] Monitor error logs daily
- [ ] Review user feedback
- [ ] Track performance metrics
- [ ] Create backlog for Phase 2 improvements

#### Week 2-4
- [ ] Gather analytics on feature usage
- [ ] Identify optimization opportunities
- [ ] Plan Phase 2 improvements
- [ ] Update documentation based on feedback

---

## 📚 Reference Materials

### Key Files Reference

| File | Purpose | Lines of Code |
|------|---------|---------------|
| /dashboard/src/services/api.js | Centralized API service | ~1000 |
| /dashboard/src/utils/errorHandler.js | Error handling utilities | ~150 |
| /dashboard/src/components/ErrorBoundary.jsx | Error boundary component | ~100 |
| /dashboard/src/hooks/useAPIRequest.js | API request hook | ~80 |
| /dashboard/src/constants/index.js | Application constants | ~200 |

### Common Issues & Solutions

#### Issue: "Cannot read property of undefined"
**Solution:** Add optional chaining and default values
```javascript
const value = data?.field?.nestedField ?? 'default'
```

#### Issue: "Warning: Can't perform a React state update on an unmounted component"
**Solution:** Add AbortController cleanup
```javascript
useEffect(() => {
  const controller = new AbortController()
  fetchData(controller.signal)
  return () => controller.abort()
}, [])
```

#### Issue: "Maximum update depth exceeded"
**Solution:** Fix useEffect dependencies or use useRef
```javascript
const fetchData = useCallback(async () => {
  // ...
}, [/* proper dependencies */])
```

#### Issue: "Objects are not valid as a React child"
**Solution:** Convert object to string or extract properties
```javascript
{JSON.stringify(data)} // Debug
{data.name} // Production
```

### Testing Utilities

#### Mock API Responses
```javascript
jest.mock('@/services/api', () => ({
  clientAPI: {
    getAll: jest.fn(() => Promise.resolve({
      success: true,
      clients: mockClients
    }))
  }
}))
```

#### Mock Hooks
```javascript
jest.mock('@/hooks/useAPIRequest', () => ({
  useAPIRequest: () => ({
    loading: false,
    error: null,
    execute: jest.fn()
  })
}))
```

### Browser DevTools Tips

#### Check Re-renders
1. Open React DevTools
2. Click "Profiler" tab
3. Start recording
4. Interact with component
5. Stop recording
6. Analyze flame graph

#### Check Memory Leaks
1. Open Chrome DevTools
2. Go to "Memory" tab
3. Take heap snapshot
4. Interact with app
5. Take another snapshot
6. Compare snapshots

#### Check Network Requests
1. Open Network tab
2. Filter by "XHR"
3. Check for duplicate requests
4. Check request timing
5. Verify CORS headers

---

## 🔗 Additional Resources

### Documentation Links
- [React Best Practices](https://react.dev/learn)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OWASP Security Guide](https://owasp.org/www-project-top-ten/)

### Tools
- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)

### Team Contacts
- **Frontend Lead:** [Name]
- **Backend Lead:** [Name]
- **QA Lead:** [Name]
- **DevOps:** [Name]

---

## 📝 Notes for Implementation Agent

### Important Reminders

1. **Always read existing code before modifying** - Understand patterns and context
2. **Test after each change** - Don't accumulate technical debt
3. **Commit frequently** - Small, atomic commits are easier to review and rollback
4. **Update this document** - Keep progress tracking current
5. **Ask for clarification** - If something is unclear, ask before proceeding

### Priority Order

The phases are numbered for a reason:
1. **Foundation first** - Without proper infrastructure, everything else is harder
2. **Critical bugs next** - Fix non-functional pages immediately
3. **Then systematic improvements** - Work through each category methodically

### When in Doubt

- Check the existing codebase patterns
- Look at how similar problems are solved elsewhere
- Refer to the testing section before writing new code
- Use the error handling utilities we created
- Follow the accessibility patterns consistently

### Success Tips

- Keep changes small and focused
- Test each change immediately
- Use the patterns provided in this document
- Don't deviate from the architecture without good reason
- Document any deviations or issues discovered
- Communicate progress daily

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Status:** Ready for Implementation
**Estimated Completion:** 6 weeks from start date

---

Good luck! This is a comprehensive plan that will transform the dashboard into a production-ready, maintainable, accessible, and performant application. Follow the phases in order, test thoroughly, and you'll succeed. 🚀
