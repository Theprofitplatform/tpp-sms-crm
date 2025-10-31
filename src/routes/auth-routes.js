/**
 * Authentication API Routes
 * 
 * Endpoints for user authentication
 */

import express from 'express';
import { AuthService } from '../auth/auth-service.js';
import { authMiddleware } from '../auth/auth-middleware.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { clientId, email, password, firstName, lastName, role } = req.body;

    // Validate required fields
    if (!clientId || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId, email, password'
      });
    }

    const result = await AuthService.register({
      clientId,
      email,
      password,
      firstName,
      lastName,
      role
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await AuthService.login(email, password);

    // Set HTTP-only cookie with token (optional, for browser clients)
    if (result.token) {
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (clear cookie)
 */
router.post('/logout', authMiddleware.authenticate, async (req, res) => {
  try {
    await AuthService.logout(req.user.id);

    // Clear auth cookie
    res.clearCookie('auth_token');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware.authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('[Auth] Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authMiddleware.authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    const result = await AuthService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );

    res.json(result);
  } catch (error) {
    console.error('[Auth] Change password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/request-password-reset
 * Request password reset
 */
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await AuthService.requestPasswordReset(email);

    res.json(result);
  } catch (error) {
    console.error('[Auth] Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required'
      });
    }

    const result = await AuthService.resetPassword(resetToken, newPassword);

    res.json(result);
  } catch (error) {
    console.error('[Auth] Password reset error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/activity
 * Get user activity log
 */
router.get('/activity', authMiddleware.authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await AuthService.getUserActivity(req.user.id, limit);

    res.json(result);
  } catch (error) {
    console.error('[Auth] Get activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
