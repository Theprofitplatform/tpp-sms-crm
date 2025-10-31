/**
 * Route Protection Middleware
 *
 * Centralized middleware for securing API endpoints
 */

import { authMiddleware } from '../auth/auth-middleware.js';

/**
 * Middleware to require authentication
 * Apply this to all routes that need authentication
 */
export const requireAuth = authMiddleware;

/**
 * Middleware to require admin role
 * Apply this to admin-only routes
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  next();
}

/**
 * Middleware to validate client access
 * Ensures user can only access their own clients
 */
export function requireClientAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const clientId = req.params.clientId || req.body.clientId;

  if (!clientId) {
    return res.status(400).json({
      success: false,
      error: 'Client ID required'
    });
  }

  // Admin can access all clients
  if (req.user.role === 'admin') {
    return next();
  }

  // Regular users can only access their assigned clients
  if (!req.user.clients || !req.user.clients.includes(clientId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this client'
    });
  }

  next();
}

/**
 * Rate limiting for sensitive operations
 * Prevents abuse of expensive operations
 */
export function rateLimitSensitive(req, res, next) {
  // This is a placeholder - in production, use a proper rate limiter
  // with Redis or similar
  const identifier = req.user?.id || req.ip;
  const key = `ratelimit:${identifier}`;

  // For now, just add warning header
  res.setHeader('X-RateLimit-Warning', 'Rate limiting not fully implemented');

  next();
}

/**
 * Input validation middleware
 * Validates that clientId is safe
 */
export function validateClientId(req, res, next) {
  const clientId = req.params.clientId || req.body.clientId;

  if (!clientId) {
    return res.status(400).json({
      success: false,
      error: 'Client ID is required'
    });
  }

  // Validate format (alphanumeric, hyphens, underscores only)
  const clientIdPattern = /^[a-zA-Z0-9_-]+$/;

  if (!clientIdPattern.test(clientId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid client ID format. Only alphanumeric, hyphens, and underscores allowed.'
    });
  }

  if (clientId.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Client ID too long'
    });
  }

  next();
}

/**
 * Combined middleware: Auth + Client Access + Validation
 * Use this for most client-specific endpoints
 */
export function protectClientEndpoint(req, res, next) {
  // Chain: validate → authenticate → check access
  validateClientId(req, res, (err) => {
    if (err) return next(err);

    requireAuth(req, res, (err) => {
      if (err) return next(err);

      requireClientAccess(req, res, next);
    });
  });
}

/**
 * Protect admin-only endpoints
 * Use for /api/control/* routes
 */
export function protectAdminEndpoint(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);

    requireAdmin(req, res, next);
  });
}

/**
 * Audit logging middleware
 * Logs all sensitive operations
 */
export function auditLog(req, res, next) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user: req.user?.email || 'anonymous',
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  console.log('[AUDIT]', JSON.stringify(logEntry));

  next();
}

export default {
  requireAuth,
  requireAdmin,
  requireClientAccess,
  rateLimitSensitive,
  validateClientId,
  protectClientEndpoint,
  protectAdminEndpoint,
  auditLog
};
