/**
 * Authentication Middleware
 *
 * Middleware functions for protecting routes and checking permissions
 *
 * Usage:
 *   app.get('/api/protected', authMiddleware.authenticate, (req, res) => {
 *     // User is authenticated, req.user contains user data
 *   });
 *
 *   app.get('/api/client/:clientId/data',
 *     authMiddleware.authenticate,
 *     authMiddleware.checkClientAccess,
 *     (req, res) => {
 *       // User has access to this client's data
 *     }
 *   );
 */

import { AuthService } from './auth-service.js';

export const authMiddleware = {
  /**
   * Authenticate user from JWT token
   * Expects token in Authorization header: "Bearer <token>"
   * or in cookie: "auth_token"
   */
  async authenticate(req, res, next) {
    try {
      // Get token from Authorization header
      let token = null;
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      // Fallback to cookie
      if (!token && req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No authentication token provided'
        });
      }

      // Verify token
      const result = await AuthService.verifyToken(token);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token'
        });
      }

      // Attach user to request
      req.user = result.user;
      next();

    } catch (error) {
      return res.status(401).json({
        success: false,
        error: error.message || 'Authentication failed'
      });
    }
  },

  /**
   * Check if authenticated user has access to client data
   * Requires authenticate middleware to run first
   * Expects clientId in req.params.clientId
   */
  async checkClientAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const clientId = req.params.clientId;
      if (!clientId) {
        return res.status(400).json({
          success: false,
          error: 'Client ID not provided'
        });
      }

      const hasAccess = await AuthService.checkClientAccess(req.user.id, clientId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this client data'
        });
      }

      next();

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Access check failed'
      });
    }
  },

  /**
   * Check if user has admin role
   * Requires authenticate middleware to run first
   */
  async requireAdmin(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      next();

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Authorization failed'
      });
    }
  },

  /**
   * Optional authentication
   * If token is provided, verify it and attach user
   * If no token, continue without user
   */
  async optionalAuth(req, res, next) {
    try {
      // Get token
      let token = null;
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      if (!token && req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }

      if (token) {
        // Verify token
        const result = await AuthService.verifyToken(token);

        if (result.success) {
          req.user = result.user;
        }
      }

      next();

    } catch (error) {
      // Continue without user if token verification fails
      next();
    }
  }
};
