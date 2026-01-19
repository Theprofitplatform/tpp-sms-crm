/**
 * Authentication Middleware
 *
 * Provides API key and JWT token authentication for the Ops Service.
 * Supports role-based access control (RBAC) with three roles:
 *   - admin: Full access to all endpoints including arming and config
 *   - operator: Can manage mode, killswitch, and execute trading operations
 *   - viewer: Read-only access to status and monitoring endpoints
 *
 * Authentication methods:
 *   - X-API-Key header: For programmatic access
 *   - Authorization: Bearer <jwt> header: For web dashboard
 *
 * Usage:
 *   import { authMiddleware, requireRole } from './middleware/auth.js';
 *
 *   // Require authentication
 *   app.use('/api/v1/secure', authMiddleware);
 *
 *   // Require specific role
 *   router.post('/admin-action', requireRole('admin'), handler);
 */

import crypto from 'crypto';

// =============================================================================
// Arming-Specific Rate Limiting and IP Blocking
// =============================================================================

/**
 * Arming-specific rate limiter: 3 attempts per hour per IP
 * This is more restrictive than general API rate limiting to protect
 * the critical LIVE mode arming system.
 */
class ArmingRateLimiter {
  constructor() {
    this.attempts = new Map(); // IP -> { count, windowStart }
    this.blockedIPs = new Map(); // IP -> { blockedUntil, reason }
    this.failedAttempts = new Map(); // IP -> { count, lastAttempt }

    // Configuration
    this.maxAttemptsPerHour = 3;
    this.maxFailedAttempts = 5;
    this.blockDurationMs = 24 * 60 * 60 * 1000; // 24 hours
    this.windowMs = 60 * 60 * 1000; // 1 hour

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    this.cleanupInterval.unref?.();
  }

  /**
   * Check if an IP is blocked
   * @param {string} ip - IP address
   * @returns {object|null} Block info or null if not blocked
   */
  isBlocked(ip) {
    const block = this.blockedIPs.get(ip);
    if (!block) return null;

    if (Date.now() > block.blockedUntil) {
      this.blockedIPs.delete(ip);
      return null;
    }

    return {
      blocked: true,
      reason: block.reason,
      blockedUntil: new Date(block.blockedUntil).toISOString(),
      remainingMs: block.blockedUntil - Date.now(),
    };
  }

  /**
   * Block an IP address
   * @param {string} ip - IP address
   * @param {string} reason - Reason for blocking
   * @param {number} durationMs - Block duration in milliseconds
   */
  blockIP(ip, reason, durationMs = this.blockDurationMs) {
    this.blockedIPs.set(ip, {
      blockedUntil: Date.now() + durationMs,
      reason,
      blockedAt: new Date().toISOString(),
    });
  }

  /**
   * Record a failed arming attempt
   * @param {string} ip - IP address
   * @returns {object} Result with blocked status
   */
  recordFailedAttempt(ip) {
    const now = Date.now();
    const record = this.failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };

    // Reset count if last attempt was more than an hour ago
    if (now - record.lastAttempt > this.windowMs) {
      record.count = 0;
    }

    record.count += 1;
    record.lastAttempt = now;
    this.failedAttempts.set(ip, record);

    // Block after too many failed attempts
    if (record.count >= this.maxFailedAttempts) {
      this.blockIP(
        ip,
        `Blocked after ${record.count} failed arming attempts`,
        this.blockDurationMs
      );
      return {
        blocked: true,
        reason: `Too many failed attempts (${record.count})`,
      };
    }

    return {
      blocked: false,
      failedCount: record.count,
      remainingAttempts: this.maxFailedAttempts - record.count,
    };
  }

  /**
   * Check rate limit for arming requests
   * @param {string} ip - IP address
   * @returns {object} Result with allowed status
   */
  checkRateLimit(ip) {
    // Check if IP is blocked first
    const blockInfo = this.isBlocked(ip);
    if (blockInfo) {
      return {
        allowed: false,
        ...blockInfo,
      };
    }

    const now = Date.now();
    const record = this.attempts.get(ip) || { count: 0, windowStart: now };

    // Reset window if expired
    if (now - record.windowStart >= this.windowMs) {
      record.count = 0;
      record.windowStart = now;
    }

    if (record.count >= this.maxAttemptsPerHour) {
      const resetTime = record.windowStart + this.windowMs;
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        limit: this.maxAttemptsPerHour,
        window: 'hour',
        reset: new Date(resetTime).toISOString(),
        retryAfter: Math.ceil((resetTime - now) / 1000),
      };
    }

    // Allow the request
    record.count += 1;
    this.attempts.set(ip, record);

    return {
      allowed: true,
      remaining: this.maxAttemptsPerHour - record.count,
      limit: this.maxAttemptsPerHour,
      window: 'hour',
    };
  }

  /**
   * Reset rate limit for an IP (for testing)
   * @param {string} ip - IP address
   */
  reset(ip) {
    this.attempts.delete(ip);
    this.failedAttempts.delete(ip);
    this.blockedIPs.delete(ip);
  }

  /**
   * Get all blocked IPs (for admin monitoring)
   * @returns {Array} List of blocked IPs
   */
  getBlockedIPs() {
    const blocked = [];
    for (const [ip, info] of this.blockedIPs.entries()) {
      if (Date.now() < info.blockedUntil) {
        blocked.push({
          ip,
          ...info,
          remainingMs: info.blockedUntil - Date.now(),
        });
      }
    }
    return blocked;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();

    // Clean up attempts
    for (const [ip, record] of this.attempts.entries()) {
      if (now - record.windowStart > this.windowMs * 2) {
        this.attempts.delete(ip);
      }
    }

    // Clean up failed attempts
    for (const [ip, record] of this.failedAttempts.entries()) {
      if (now - record.lastAttempt > this.windowMs * 2) {
        this.failedAttempts.delete(ip);
      }
    }

    // Clean up expired blocks
    for (const [ip, info] of this.blockedIPs.entries()) {
      if (now > info.blockedUntil) {
        this.blockedIPs.delete(ip);
      }
    }
  }

  /**
   * Stop the cleanup interval
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global arming rate limiter instance
const armingRateLimiter = new ArmingRateLimiter();

/**
 * Create arming-specific rate limit middleware
 * Enforces 3 requests per hour per IP for arming endpoints
 * Blocks IPs after 5 failed attempts
 *
 * @param {object} options - Middleware options
 * @returns {Function} Express middleware
 */
export function createArmingRateLimitMiddleware(options = {}) {
  const { logger = console } = options;

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Check rate limit
    const result = armingRateLimiter.checkRateLimit(ip);

    // Add headers
    res.setHeader('X-Arming-RateLimit-Limit', result.limit || 3);
    res.setHeader('X-Arming-RateLimit-Remaining', result.remaining ?? 0);
    if (result.reset) {
      res.setHeader('X-Arming-RateLimit-Reset', result.reset);
    }

    if (!result.allowed) {
      logger.warn('Arming rate limit exceeded or IP blocked', {
        ip,
        reason: result.reason,
        blocked: result.blocked,
        retryAfter: result.retryAfter,
      });

      if (result.retryAfter) {
        res.setHeader('Retry-After', result.retryAfter);
      }

      return res.status(429).json({
        error: 'Too Many Requests',
        message: result.reason,
        retry_after: result.retryAfter,
        limit: result.limit,
        window: result.window,
        blocked: result.blocked || false,
        blocked_until: result.blockedUntil,
      });
    }

    // Attach rate limiter info to request for use in routes
    req.armingRateLimit = {
      remaining: result.remaining,
      limit: result.limit,
      recordFailure: () => armingRateLimiter.recordFailedAttempt(ip),
    };

    next();
  };
}

/**
 * Record a failed arming attempt (call from route handlers)
 * @param {string} ip - IP address
 * @returns {object} Result with potential block info
 */
export function recordFailedArmingAttempt(ip) {
  return armingRateLimiter.recordFailedAttempt(ip);
}

/**
 * Get arming rate limiter status (for monitoring)
 * @returns {object} Rate limiter status
 */
export function getArmingRateLimiterStatus() {
  return {
    blockedIPs: armingRateLimiter.getBlockedIPs(),
    config: {
      maxAttemptsPerHour: armingRateLimiter.maxAttemptsPerHour,
      maxFailedAttempts: armingRateLimiter.maxFailedAttempts,
      blockDurationMs: armingRateLimiter.blockDurationMs,
    },
  };
}

/**
 * Manually unblock an IP (for admin use)
 * @param {string} ip - IP address to unblock
 */
export function unblockIP(ip) {
  armingRateLimiter.reset(ip);
}

// Role hierarchy: admin > operator > viewer
const ROLE_HIERARCHY = {
  admin: 3,
  operator: 2,
  viewer: 1,
};

// Default JWT secret (should be overridden via environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'stock-trading-jwt-secret-change-in-production';
const JWT_EXPIRY_HOURS = parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10);

/**
 * Hash an API key using SHA-256
 * @param {string} apiKey - The plain text API key
 * @returns {string} The hashed key
 */
export function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a new API key
 * @returns {string} A new random API key
 */
export function generateApiKey() {
  // Generate a 32-byte random key and encode as base64
  // Format: stk_<random-base64>
  const randomBytes = crypto.randomBytes(32);
  const base64 = randomBytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `stk_${base64}`;
}

/**
 * Create a simple JWT token (no external dependencies)
 * @param {object} payload - Token payload
 * @returns {string} JWT token
 */
export function createJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (JWT_EXPIRY_HOURS * 3600),
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
export function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [base64Header, base64Payload, signature] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${base64Header}.${base64Payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * API Key Authentication Manager
 * Handles API key storage, validation, and management
 */
export class ApiKeyManager {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
    this.cache = new Map(); // Cache validated keys for performance
    this.cacheTimeout = 60000; // 1 minute cache
  }

  /**
   * Initialize the API keys table if it doesn't exist
   */
  initialize() {
    this.db.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_hash TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'operator', 'viewer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        last_used_at TIMESTAMP,
        enabled BOOLEAN DEFAULT 1,
        created_by TEXT,
        description TEXT
      )
    `);

    // Create index for faster lookups
    this.db.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)
    `);

    // Create auth_audit_log table for tracking auth events
    this.db.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        event_type TEXT NOT NULL,
        api_key_id INTEGER,
        api_key_name TEXT,
        role TEXT,
        ip_address TEXT,
        endpoint TEXT,
        method TEXT,
        success BOOLEAN,
        failure_reason TEXT,
        user_agent TEXT
      )
    `);

    this.logger.info('API key manager initialized');
  }

  /**
   * Create a new API key
   * @param {string} name - Key name/identifier
   * @param {string} role - Role (admin, operator, viewer)
   * @param {object} options - Additional options
   * @returns {object} Created key info including plain text key (only returned once)
   */
  createKey(name, role, options = {}) {
    if (!ROLE_HIERARCHY[role]) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${Object.keys(ROLE_HIERARCHY).join(', ')}`);
    }

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    const stmt = this.db.db.prepare(`
      INSERT INTO api_keys (key_hash, name, role, expires_at, created_by, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      keyHash,
      name,
      role,
      options.expiresAt || null,
      options.createdBy || 'system',
      options.description || null
    );

    this.logger.info('API key created', { id: result.lastInsertRowid, name, role });

    return {
      id: result.lastInsertRowid,
      key: apiKey, // Only returned once - store securely!
      name,
      role,
      created_at: new Date().toISOString(),
      expires_at: options.expiresAt || null,
    };
  }

  /**
   * Validate an API key and return its info
   * @param {string} apiKey - The API key to validate
   * @returns {object|null} Key info or null if invalid
   */
  validateKey(apiKey) {
    if (!apiKey) return null;

    const keyHash = hashApiKey(apiKey);

    // Check cache first
    const cached = this.cache.get(keyHash);
    if (cached && cached.timestamp > Date.now() - this.cacheTimeout) {
      return cached.keyInfo;
    }

    const stmt = this.db.db.prepare(`
      SELECT id, name, role, created_at, expires_at, last_used_at, enabled
      FROM api_keys
      WHERE key_hash = ?
    `);

    const row = stmt.get(keyHash);

    if (!row) return null;

    // Check if enabled
    if (!row.enabled) {
      this.logger.warn('Attempted use of disabled API key', { name: row.name });
      return null;
    }

    // Check expiration
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      this.logger.warn('Attempted use of expired API key', { name: row.name });
      return null;
    }

    // Update last_used_at
    this.db.db.prepare('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?').run(row.id);

    const keyInfo = {
      id: row.id,
      name: row.name,
      role: row.role,
      created_at: row.created_at,
      expires_at: row.expires_at,
    };

    // Cache the result
    this.cache.set(keyHash, { keyInfo, timestamp: Date.now() });

    return keyInfo;
  }

  /**
   * List all API keys (without exposing the actual keys)
   * @returns {Array} List of API keys
   */
  listKeys() {
    const stmt = this.db.db.prepare(`
      SELECT id, name, role, created_at, expires_at, last_used_at, enabled, created_by, description
      FROM api_keys
      ORDER BY created_at DESC
    `);

    return stmt.all();
  }

  /**
   * Revoke an API key
   * @param {number} id - Key ID
   * @returns {boolean} Success
   */
  revokeKey(id) {
    const stmt = this.db.db.prepare('UPDATE api_keys SET enabled = 0 WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      // Clear from cache
      this.cache.clear();
      this.logger.info('API key revoked', { id });
      return true;
    }

    return false;
  }

  /**
   * Delete an API key permanently
   * @param {number} id - Key ID
   * @returns {boolean} Success
   */
  deleteKey(id) {
    const stmt = this.db.db.prepare('DELETE FROM api_keys WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      this.cache.clear();
      this.logger.info('API key deleted', { id });
      return true;
    }

    return false;
  }

  /**
   * Log an authentication event
   * @param {object} event - Event details
   */
  logAuthEvent(event) {
    const stmt = this.db.db.prepare(`
      INSERT INTO auth_audit_log
      (event_type, api_key_id, api_key_name, role, ip_address, endpoint, method, success, failure_reason, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.type,
      event.keyId || null,
      event.keyName || null,
      event.role || null,
      event.ip || null,
      event.endpoint || null,
      event.method || null,
      event.success ? 1 : 0,
      event.failureReason || null,
      event.userAgent || null
    );
  }

  /**
   * Get recent auth audit logs
   * @param {number} limit - Max records
   * @returns {Array} Audit logs
   */
  getAuditLogs(limit = 100) {
    const stmt = this.db.db.prepare(`
      SELECT * FROM auth_audit_log
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }
}

/**
 * Create authentication middleware
 * @param {ApiKeyManager} apiKeyManager - API key manager instance
 * @param {object} options - Middleware options
 * @returns {Function} Express middleware
 */
export function createAuthMiddleware(apiKeyManager, options = {}) {
  const {
    logger = console,
    allowEmergencyAccess = false, // Allow unauthenticated emergency access
    emergencyEndpoints = ['/api/v1/mode/killswitch/activate'], // Endpoints that allow emergency access
  } = options;

  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    const endpoint = req.originalUrl || req.path;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Check for emergency access
    if (allowEmergencyAccess && emergencyEndpoints.some(ep => endpoint.startsWith(ep))) {
      const emergencyToken = req.headers['x-emergency-token'];
      if (emergencyToken === process.env.EMERGENCY_ACCESS_TOKEN) {
        req.auth = {
          type: 'emergency',
          role: 'operator',
          emergency: true,
        };
        logger.warn('Emergency access granted', { endpoint, ip });
        return next();
      }
    }

    // Try API key authentication
    if (apiKey) {
      const keyInfo = apiKeyManager.validateKey(apiKey);

      if (keyInfo) {
        req.auth = {
          type: 'api-key',
          keyId: keyInfo.id,
          keyName: keyInfo.name,
          role: keyInfo.role,
        };

        apiKeyManager.logAuthEvent({
          type: 'api_key_auth',
          keyId: keyInfo.id,
          keyName: keyInfo.name,
          role: keyInfo.role,
          ip,
          endpoint,
          method: req.method,
          success: true,
          userAgent,
        });

        return next();
      }

      // Invalid API key
      apiKeyManager.logAuthEvent({
        type: 'api_key_auth',
        ip,
        endpoint,
        method: req.method,
        success: false,
        failureReason: 'Invalid or expired API key',
        userAgent,
      });

      logger.warn('Invalid API key attempt', { ip, endpoint });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired API key',
      });
    }

    // Try JWT authentication
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyJWT(token);

      if (payload) {
        req.auth = {
          type: 'jwt',
          userId: payload.sub,
          role: payload.role,
          email: payload.email,
        };

        apiKeyManager.logAuthEvent({
          type: 'jwt_auth',
          role: payload.role,
          ip,
          endpoint,
          method: req.method,
          success: true,
          userAgent,
        });

        return next();
      }

      // Invalid JWT
      apiKeyManager.logAuthEvent({
        type: 'jwt_auth',
        ip,
        endpoint,
        method: req.method,
        success: false,
        failureReason: 'Invalid or expired JWT',
        userAgent,
      });

      logger.warn('Invalid JWT attempt', { ip, endpoint });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // No authentication provided
    apiKeyManager.logAuthEvent({
      type: 'no_auth',
      ip,
      endpoint,
      method: req.method,
      success: false,
      failureReason: 'No authentication provided',
      userAgent,
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Provide X-API-Key header or Bearer token.',
    });
  };
}

/**
 * Create role requirement middleware
 * @param {string} requiredRole - Minimum required role
 * @returns {Function} Express middleware
 */
export function requireRole(requiredRole) {
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (!requiredLevel) {
    throw new Error(`Invalid role: ${requiredRole}`);
  }

  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userLevel = ROLE_HIERARCHY[req.auth.role];

    if (!userLevel || userLevel < requiredLevel) {
      const { logger, apiKeyManager } = req.app.locals;

      if (apiKeyManager) {
        apiKeyManager.logAuthEvent({
          type: 'authorization_failed',
          keyId: req.auth.keyId,
          keyName: req.auth.keyName,
          role: req.auth.role,
          ip: req.ip || 'unknown',
          endpoint: req.originalUrl || req.path,
          method: req.method,
          success: false,
          failureReason: `Insufficient role: ${req.auth.role}, required: ${requiredRole}`,
          userAgent: req.headers['user-agent'] || 'unknown',
        });
      }

      if (logger) {
        logger.warn('Authorization failed', {
          role: req.auth.role,
          required: requiredRole,
          endpoint: req.originalUrl,
        });
      }

      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required role: ${requiredRole}, your role: ${req.auth.role}`,
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware - authenticates if credentials provided,
 * but allows unauthenticated access
 * @param {ApiKeyManager} apiKeyManager - API key manager instance
 * @returns {Function} Express middleware
 */
export function createOptionalAuthMiddleware(apiKeyManager) {
  const authMiddleware = createAuthMiddleware(apiKeyManager, { logger: { warn: () => {} } });

  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    // If no auth provided, continue without authentication
    if (!apiKey && !authHeader) {
      return next();
    }

    // Try to authenticate, but intercept 401 responses
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let statusCode = 200;

    res.status = function(code) {
      statusCode = code;
      return originalStatus(code);
    };

    res.json = function(data) {
      if (statusCode === 401) {
        // Auth failed but it's optional, continue without auth
        res.status = originalStatus;
        res.json = originalJson;
        return next();
      }
      return originalJson(data);
    };

    authMiddleware(req, res, next);
  };
}

export default {
  ApiKeyManager,
  createAuthMiddleware,
  requireRole,
  createOptionalAuthMiddleware,
  hashApiKey,
  generateApiKey,
  createJWT,
  verifyJWT,
  ROLE_HIERARCHY,
  // Arming-specific security
  createArmingRateLimitMiddleware,
  recordFailedArmingAttempt,
  getArmingRateLimiterStatus,
  unblockIP,
};
