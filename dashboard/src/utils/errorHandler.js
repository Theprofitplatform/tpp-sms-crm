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
