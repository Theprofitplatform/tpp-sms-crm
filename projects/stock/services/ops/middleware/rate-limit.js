/**
 * Rate Limiting Middleware
 *
 * Provides sliding window rate limiting for the Ops Service.
 * Limits are applied per IP address and per API key.
 *
 * Endpoint groups with different limits:
 *   - arming: 5 requests/minute (strict - LIVE trading safety)
 *   - mode: 10 requests/minute (mode switching)
 *   - write: 30 requests/minute (POST/PUT/DELETE operations)
 *   - read: 100 requests/minute (GET operations)
 *
 * Usage:
 *   import { createRateLimiter, rateLimitMiddleware } from './middleware/rate-limit.js';
 *
 *   const limiter = createRateLimiter();
 *   app.use(rateLimitMiddleware(limiter));
 *
 * Headers added to responses:
 *   X-RateLimit-Limit: Maximum requests per window
 *   X-RateLimit-Remaining: Requests remaining in current window
 *   X-RateLimit-Reset: Unix timestamp when the window resets
 *   Retry-After: Seconds until requests allowed (when rate limited)
 */

/**
 * Rate limit configuration for different endpoint groups
 */
export const RATE_LIMIT_CONFIG = {
  arming: {
    windowMs: 60000, // 1 minute
    maxRequests: 5,
    message: 'Too many arming requests. Please wait before trying again.',
  },
  mode: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    message: 'Too many mode switching requests. Please wait before trying again.',
  },
  killswitch: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    message: 'Too many killswitch requests. Please wait before trying again.',
  },
  config: {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    message: 'Too many config requests. Please wait before trying again.',
  },
  write: {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
    message: 'Too many write requests. Please wait before trying again.',
  },
  read: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests. Please slow down.',
  },
  default: {
    windowMs: 60000, // 1 minute
    maxRequests: 60,
    message: 'Too many requests. Please slow down.',
  },
};

/**
 * Endpoint pattern to rate limit group mapping
 */
export const ENDPOINT_GROUPS = {
  arming: ['/api/v1/arming/'],
  mode: ['/api/v1/mode/switch', '/api/v1/mode/killswitch/'],
  killswitch: ['/api/v1/killswitch/'],
  config: ['/api/v1/config/'],
  // Write operations identified by HTTP method, not endpoint
};

/**
 * Sliding window counter for rate limiting
 */
class SlidingWindowCounter {
  constructor() {
    this.windows = new Map();
    this.cleanupInterval = null;
  }

  /**
   * Start automatic cleanup of expired windows
   * @param {number} intervalMs - Cleanup interval in milliseconds
   */
  startCleanup(intervalMs = 60000) {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.windows.entries()) {
        if (now - data.windowStart > data.windowMs * 2) {
          this.windows.delete(key);
        }
      }
    }, intervalMs);

    // Don't keep the process running just for cleanup
    this.cleanupInterval.unref?.();
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check and increment request count
   * @param {string} key - Unique identifier (IP + API key + endpoint group)
   * @param {number} windowMs - Window duration in milliseconds
   * @param {number} maxRequests - Maximum requests per window
   * @returns {object} Result with allowed status and metadata
   */
  check(key, windowMs, maxRequests) {
    const now = Date.now();
    let data = this.windows.get(key);

    if (!data || now - data.windowStart >= windowMs) {
      // Start new window
      data = {
        windowStart: now,
        windowMs,
        count: 0,
        requests: [],
      };
      this.windows.set(key, data);
    }

    // Sliding window: remove requests outside the window
    const windowStart = now - windowMs;
    data.requests = data.requests.filter(ts => ts > windowStart);

    const currentCount = data.requests.length;
    const remaining = Math.max(0, maxRequests - currentCount);
    const resetTime = Math.ceil((data.windowStart + windowMs) / 1000);

    if (currentCount >= maxRequests) {
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        reset: resetTime,
        retryAfter: Math.ceil((data.windowStart + windowMs - now) / 1000),
      };
    }

    // Add current request
    data.requests.push(now);
    data.count = data.requests.length;

    return {
      allowed: true,
      limit: maxRequests,
      remaining: remaining - 1,
      reset: resetTime,
    };
  }

  /**
   * Get current state for a key
   * @param {string} key - Unique identifier
   * @returns {object|null} Current state or null
   */
  getState(key) {
    return this.windows.get(key) || null;
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.windows.delete(key);
  }

  /**
   * Get all current rate limit states (for monitoring)
   * @returns {object} All states
   */
  getAllStates() {
    const states = {};
    for (const [key, data] of this.windows.entries()) {
      states[key] = {
        count: data.requests.length,
        windowStart: new Date(data.windowStart).toISOString(),
      };
    }
    return states;
  }
}

/**
 * Create a rate limiter instance
 * @param {object} customConfig - Custom rate limit configuration
 * @returns {object} Rate limiter with counter and config
 */
export function createRateLimiter(customConfig = {}) {
  const config = { ...RATE_LIMIT_CONFIG, ...customConfig };
  const counter = new SlidingWindowCounter();

  counter.startCleanup();

  return {
    counter,
    config,
    stop: () => counter.stopCleanup(),
  };
}

/**
 * Determine the rate limit group for an endpoint
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @returns {string} Rate limit group name
 */
export function getEndpointGroup(path, method) {
  // Check specific endpoint patterns
  for (const [group, patterns] of Object.entries(ENDPOINT_GROUPS)) {
    for (const pattern of patterns) {
      if (path.startsWith(pattern)) {
        return group;
      }
    }
  }

  // Fall back to method-based grouping
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return 'write';
  }

  return 'read';
}

/**
 * Create rate limiting middleware
 * @param {object} limiter - Rate limiter instance from createRateLimiter
 * @param {object} options - Middleware options
 * @returns {Function} Express middleware
 */
export function createRateLimitMiddleware(limiter, options = {}) {
  const {
    logger = console,
    keyGenerator = defaultKeyGenerator,
    skip = () => false,
    onRateLimited = null,
  } = options;

  return (req, res, next) => {
    // Allow skipping rate limiting for certain requests
    if (skip(req)) {
      return next();
    }

    const path = req.originalUrl || req.path;
    const method = req.method;
    const group = getEndpointGroup(path, method);
    const groupConfig = limiter.config[group] || limiter.config.default;

    // Generate unique key for this request
    const key = keyGenerator(req, group);

    // Check rate limit
    const result = limiter.counter.check(
      key,
      groupConfig.windowMs,
      groupConfig.maxRequests
    );

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.reset);
    res.setHeader('X-RateLimit-Group', group);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);

      logger.warn('Rate limit exceeded', {
        key,
        group,
        ip: req.ip,
        path,
        method,
        limit: result.limit,
        retryAfter: result.retryAfter,
      });

      if (onRateLimited) {
        onRateLimited(req, res, {
          key,
          group,
          ...result,
        });
      }

      return res.status(429).json({
        error: 'Too Many Requests',
        message: groupConfig.message,
        retry_after: result.retryAfter,
        limit: result.limit,
        group,
      });
    }

    next();
  };
}

/**
 * Default key generator for rate limiting
 * Combines IP address, API key (if present), and endpoint group
 * @param {object} req - Express request
 * @param {string} group - Endpoint group
 * @returns {string} Unique key
 */
function defaultKeyGenerator(req, group) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const apiKeyId = req.auth?.keyId || 'anon';

  return `${group}:${ip}:${apiKeyId}`;
}

/**
 * Create a rate limiter for specific endpoints with custom limits
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Window duration in milliseconds
 * @param {object} options - Additional options
 * @returns {Function} Express middleware
 */
export function createEndpointRateLimiter(maxRequests, windowMs, options = {}) {
  const counter = new SlidingWindowCounter();
  const {
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req) => req.ip || 'unknown',
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const result = counter.check(key, windowMs, maxRequests);

    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.reset);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);

      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retry_after: result.retryAfter,
      });
    }

    next();
  };
}

/**
 * Rate limit status endpoint handler
 * Returns current rate limit status for monitoring
 * @param {object} limiter - Rate limiter instance
 * @returns {Function} Express route handler
 */
export function createRateLimitStatusHandler(limiter) {
  return (req, res) => {
    const states = limiter.counter.getAllStates();

    res.json({
      config: Object.entries(limiter.config).map(([group, config]) => ({
        group,
        window_ms: config.windowMs,
        max_requests: config.maxRequests,
      })),
      current_states: states,
      total_tracked: Object.keys(states).length,
    });
  };
}

export default {
  createRateLimiter,
  createRateLimitMiddleware,
  createEndpointRateLimiter,
  createRateLimitStatusHandler,
  getEndpointGroup,
  RATE_LIMIT_CONFIG,
  ENDPOINT_GROUPS,
};
