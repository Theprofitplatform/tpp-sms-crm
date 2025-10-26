/**
 * API v2 - Authentication Middleware
 *
 * JWT-based authentication for API endpoints
 * Supports both user authentication and API key authentication
 *
 * @module api/v2/middleware/auth
 */

import jwt from 'jsonwebtoken';
import { authOps } from '../../../database/index.js';

// JWT Secret (should be in environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 *
 * @param {Object} user - User object with id, email, role
 * @returns {string} JWT token
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'client',
    client_id: user.client_id
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Verify JWT token
 *
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Extract token from request
 *
 * Supports:
 * - Authorization header: "Bearer <token>"
 * - Query parameter: ?token=<token>
 * - Cookie: token=<token>
 *
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null if not found
 */
function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter
  if (req.query.token) {
    return req.query.token;
  }

  // Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}

/**
 * Authentication middleware
 *
 * Verifies JWT token and attaches user to request
 *
 * Usage:
 *   router.get('/protected', authenticate, (req, res) => {
 *     // req.user is available here
 *   });
 */
export function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'No token provided'
    });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }

  // Verify user still exists and is active
  try {
    const user = authOps.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'User not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    // Attach user to request (without password)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      client_id: user.client_id,
      first_name: user.first_name,
      last_name: user.last_name
    };

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
}

/**
 * Optional authentication middleware
 *
 * Attaches user to request if token is provided, but doesn't require it
 *
 * Usage:
 *   router.get('/public', optionalAuthenticate, (req, res) => {
 *     // req.user is available if authenticated, null otherwise
 *   });
 */
export function optionalAuthenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    req.user = null;
    return next();
  }

  try {
    const user = authOps.getUserById(decoded.id);

    if (user && user.status === 'active') {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        client_id: user.client_id,
        first_name: user.first_name,
        last_name: user.last_name
      };
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    console.error('Optional authentication error:', error);
    req.user = null;
    next();
  }
}

/**
 * Role-based authorization middleware
 *
 * Requires authentication and specific role(s)
 *
 * Usage:
 *   router.post('/admin', authenticate, authorize(['admin']), (req, res) => {
 *     // Only admin users can access
 *   });
 */
export function authorize(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
}

/**
 * Client access middleware
 *
 * Ensures user can only access their own client data
 * Admins can access all clients
 *
 * Usage:
 *   router.get('/clients/:clientId', authenticate, requireClientAccess, (req, res) => {
 *     // User can only access if clientId matches their client_id or if they're admin
 *   });
 */
export function requireClientAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Admin users can access all clients
  if (req.user.role === 'admin') {
    return next();
  }

  // Get client_id from params or body
  const requestedClientId = req.params.clientId || req.params.client_id || req.body.client_id;

  if (!requestedClientId) {
    // No specific client requested - allow (will be filtered by user's client_id)
    return next();
  }

  // Check if user has access to this client
  if (req.user.client_id !== requestedClientId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to access this client'
    });
  }

  next();
}

/**
 * API Key authentication middleware
 *
 * Alternative to JWT for programmatic access
 * API keys should be stored in database
 *
 * Usage:
 *   router.post('/webhook', authenticateApiKey, (req, res) => {
 *     // Authenticated via API key
 *   });
 */
export function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Provide API key in X-API-Key header or api_key query parameter'
    });
  }

  // TODO: Implement API key validation
  // For now, this is a placeholder
  // In production, validate against database table

  try {
    // Validate API key format (example)
    if (apiKey.length < 32) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Attach API key info to request
    req.apiKey = {
      key: apiKey,
      validated: true
    };

    next();

  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

/**
 * Rate limiting middleware
 *
 * Simple in-memory rate limiting
 * For production, use Redis-based rate limiting
 *
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
export function rateLimit(maxRequests = 100, windowMs = 60000) {
  const requests = new Map();

  return (req, res, next) => {
    const identifier = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this identifier
    let userRequests = requests.get(identifier) || [];

    // Filter out requests outside the window
    userRequests = userRequests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
        retry_after: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    userRequests.push(now);
    requests.set(identifier, userRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      for (const [key, timestamps] of requests.entries()) {
        const filtered = timestamps.filter(t => t > windowStart);
        if (filtered.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, filtered);
        }
      }
    }

    next();
  };
}

/**
 * CORS middleware for API v2
 *
 * Configure CORS for cross-origin requests
 */
export function corsMiddleware(req, res, next) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:9000'
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}

export default {
  generateToken,
  verifyToken,
  authenticate,
  optionalAuthenticate,
  authorize,
  requireClientAccess,
  authenticateApiKey,
  rateLimit,
  corsMiddleware
};
