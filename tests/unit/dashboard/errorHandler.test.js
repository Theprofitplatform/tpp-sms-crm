/**
 * Unit Tests for Error Handler Utilities
 * Tests AppError class, handleAPIError, and retryWithBackoff
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  AppError,
  handleAPIError,
  retryWithBackoff,
  formatErrorForLogging
} from '../../../dashboard/src/utils/errorHandler.js'

describe('AppError Class', () => {
  it('should create an AppError with default values', () => {
    const error = new AppError('Test error')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
    expect(error.name).toBe('AppError')
    expect(error.message).toBe('Test error')
    expect(error.type).toBe('generic')
    expect(error.statusCode).toBe(500)
    expect(error.details).toBeNull()
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  it('should create an AppError with custom values', () => {
    const details = { field: 'email', issue: 'invalid format' }
    const error = new AppError('Validation failed', 'validation', 422, details)

    expect(error.message).toBe('Validation failed')
    expect(error.type).toBe('validation')
    expect(error.statusCode).toBe(422)
    expect(error.details).toEqual(details)
  })

  it('should have a timestamp', () => {
    const before = new Date()
    const error = new AppError('Test')
    const after = new Date()

    expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

describe('handleAPIError', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    global.navigator = global.navigator || {}
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true
    })
  })

  it('should handle AbortError (cancelled request)', () => {
    const error = new Error('The operation was aborted')
    error.name = 'AbortError'

    const appError = handleAPIError(error)

    expect(appError).toBeInstanceOf(AppError)
    expect(appError.message).toBe('Request cancelled')
    expect(appError.type).toBe('cancelled')
    expect(appError.statusCode).toBe(0)
  })

  it('should handle network errors (fetch failure)', () => {
    const error = new TypeError('Failed to fetch')

    const appError = handleAPIError(error)

    expect(appError.type).toBe('network')
    expect(appError.statusCode).toBe(0)
    expect(appError.message).toContain('Cannot connect to server')
  })

  it('should handle offline state', () => {
    global.navigator.onLine = false
    const error = new Error('Network error')

    const appError = handleAPIError(error)

    expect(appError.type).toBe('network')
    expect(appError.message).toContain('You are offline')
  })

  it('should handle 401 Unauthorized', () => {
    const response = { status: 401 }
    const error = new Error('Unauthorized')

    const appError = handleAPIError(error, response)

    expect(appError.type).toBe('auth')
    expect(appError.statusCode).toBe(401)
    expect(appError.message).toContain('Authentication failed')
  })

  it('should handle 403 Forbidden', () => {
    const response = { status: 403 }
    const error = new Error('Forbidden')

    const appError = handleAPIError(error, response)

    expect(appError.type).toBe('auth')
    expect(appError.statusCode).toBe(403)
    expect(appError.message).toContain('permission')
  })

  it('should handle 404 Not Found', () => {
    const response = { status: 404 }
    const error = new Error('Not Found')

    const appError = handleAPIError(error, response)

    expect(appError.type).toBe('notfound')
    expect(appError.statusCode).toBe(404)
    expect(appError.message).toContain('not found')
  })

  it('should handle 422 Validation Error', () => {
    const response = { status: 422 }
    const error = new Error('Validation failed')

    const appError = handleAPIError(error, response)

    expect(appError.type).toBe('validation')
    expect(appError.statusCode).toBe(422)
    expect(appError.message).toContain('Invalid data')
  })

  it('should handle 429 Rate Limit', () => {
    const response = { status: 429 }
    const error = new Error('Too many requests')

    const appError = handleAPIError(error, response)

    expect(appError.type).toBe('ratelimit')
    expect(appError.statusCode).toBe(429)
    expect(appError.message).toContain('Too many requests')
  })

  it('should handle 500 Server Error', () => {
    const response = { status: 500 }
    const error = new Error('Internal Server Error')

    const appError = handleAPIError(error, response)

    expect(appError.type).toBe('server')
    expect(appError.statusCode).toBe(500)
    expect(appError.message).toContain('Server error')
  })

  it('should handle 503 Service Unavailable', () => {
    const response = { status: 503 }
    const error = new Error('Service Unavailable')

    const appError = handleAPIError(error, response)

    expect(appError.type).toBe('server')
    expect(appError.statusCode).toBe(503)
  })

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong')

    const appError = handleAPIError(error)

    expect(appError.type).toBe('generic')
    expect(appError.statusCode).toBe(500)
    expect(appError.message).toBe('Something went wrong')
  })
})

describe('retryWithBackoff', () => {
  it('should succeed on first attempt', async () => {
    const mockFn = jest.fn().mockResolvedValue('success')

    const result = await retryWithBackoff(mockFn, 3, 100)

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should retry on network errors', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new AppError('Network error', 'network'))
      .mockRejectedValueOnce(new AppError('Network error', 'network'))
      .mockResolvedValueOnce('success')

    const result = await retryWithBackoff(mockFn, 3, 100)

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should retry on server errors', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new AppError('Server error', 'server', 500))
      .mockResolvedValueOnce('success')

    const result = await retryWithBackoff(mockFn, 3, 100)

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(2)
  })

  it('should retry on rate limit errors', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new AppError('Rate limited', 'ratelimit', 429))
      .mockResolvedValueOnce('success')

    const result = await retryWithBackoff(mockFn, 3, 100)

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(2)
  })

  it('should NOT retry on auth errors', async () => {
    const authError = new AppError('Unauthorized', 'auth', 401)
    const mockFn = jest.fn().mockRejectedValue(authError)

    await expect(retryWithBackoff(mockFn, 3, 100)).rejects.toThrow(authError)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should NOT retry on validation errors', async () => {
    const validationError = new AppError('Invalid data', 'validation', 422)
    const mockFn = jest.fn().mockRejectedValue(validationError)

    await expect(retryWithBackoff(mockFn, 3, 100)).rejects.toThrow(validationError)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should throw after max retries', async () => {
    const networkError = new AppError('Network error', 'network')
    const mockFn = jest.fn().mockRejectedValue(networkError)

    await expect(retryWithBackoff(mockFn, 3, 100)).rejects.toThrow(networkError)
    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should use exponential backoff', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new AppError('Network error', 'network'))
      .mockRejectedValueOnce(new AppError('Network error', 'network'))
      .mockResolvedValueOnce('success')

    const startTime = Date.now()
    await retryWithBackoff(mockFn, 3, 100)
    const endTime = Date.now()
    const elapsed = endTime - startTime

    // Should wait 100ms + 200ms = 300ms minimum (with small tolerance for timing)
    expect(elapsed).toBeGreaterThanOrEqual(295)
    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should handle non-AppError errors', async () => {
    const genericError = new Error('Generic error')
    const mockFn = jest.fn().mockRejectedValue(genericError)

    // Should not retry non-AppError
    await expect(retryWithBackoff(mockFn, 3, 100)).rejects.toThrow(genericError)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})

describe('formatErrorForLogging', () => {
  it('should format AppError for logging', () => {
    const error = new AppError('Test error', 'network', 0, { extra: 'data' })

    const formatted = formatErrorForLogging(error)

    expect(formatted).toHaveProperty('message', 'Test error')
    expect(formatted).toHaveProperty('type', 'network')
    expect(formatted).toHaveProperty('statusCode', 0)
    expect(formatted).toHaveProperty('timestamp')
    expect(formatted).toHaveProperty('details', { extra: 'data' })
    expect(formatted).toHaveProperty('stack')
  })

  it('should include timestamp', () => {
    const error = new AppError('Test error')
    const formatted = formatErrorForLogging(error)

    expect(formatted.timestamp).toBeInstanceOf(Date)
  })

  it('should include stack trace', () => {
    const error = new AppError('Test error')
    const formatted = formatErrorForLogging(error)

    expect(formatted.stack).toBeDefined()
    expect(typeof formatted.stack).toBe('string')
  })
})
