/**
 * Authentication Middleware
 *
 * Re-exports authentication middleware with test-friendly naming
 */

import { authMiddleware } from '../auth/auth-middleware.js';

/**
 * Require authentication for route
 * Alias for authMiddleware.authenticate
 */
export const requireAuth = authMiddleware.authenticate;

/**
 * Check client access
 * Alias for authMiddleware.checkClientAccess
 */
export const checkClientAccess = authMiddleware.checkClientAccess;

/**
 * Require admin role
 * Alias for authMiddleware.requireAdmin
 */
export const requireAdmin = authMiddleware.requireAdmin;

// Export full middleware object as default
export default authMiddleware;
