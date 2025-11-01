/**
 * Authentication System - Day 11
 *
 * Secure authentication system for client portal access
 *
 * Features:
 * - JWT-based authentication
 * - Bcrypt password hashing
 * - Secure session management
 * - Client-specific access control
 * - Password reset functionality
 * - Activity logging
 *
 * Security:
 * - Passwords hashed with bcrypt (10 rounds)
 * - JWT tokens with 24-hour expiry
 * - HTTP-only cookies for token storage
 * - CSRF protection ready
 * - Rate limiting ready
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../database/index.js';

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const BCRYPT_ROUNDS = 10;

export class AuthService {
  /**
   * Register a new client user
   */
  static async register(userData) {
    const { clientId, email, password, firstName, lastName, role = 'client' } = userData;

    // Validate input
    if (!clientId || !email || !password) {
      throw new Error('Client ID, email, and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if email already exists
    const existingUser = db.authOps.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Check if client exists
    const client = db.clientOps.getById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const userId = db.authOps.createUser({
      clientId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role
    });

    // Log activity
    db.authOps.logActivity(userId, 'register', {
      clientId,
      email
    });

    return {
      success: true,
      userId,
      message: 'User registered successfully'
    };
  }

  /**
   * Authenticate user and generate JWT token
   */
  static async login(email, password) {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Get user by email
    const user = db.authOps.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new Error('Account is inactive. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Log failed login attempt
      db.authOps.logActivity(user.id, 'login_failed', {
        email,
        reason: 'invalid_password'
      });

      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        clientId: user.client_id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Update last login
    db.authOps.updateLastLogin(user.id);

    // Log successful login
    db.authOps.logActivity(user.id, 'login_success', {
      email,
      clientId: user.client_id
    });

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      token,
      user: {
        id: userWithoutPassword.id,
        clientId: userWithoutPassword.client_id,
        email: userWithoutPassword.email,
        firstName: userWithoutPassword.first_name,
        lastName: userWithoutPassword.last_name,
        role: userWithoutPassword.role,
        lastLogin: new Date().toISOString()
      }
    };
  }

  /**
   * Verify JWT token and return user data
   */
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get fresh user data
      const user = db.authOps.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active') {
        throw new Error('Account is inactive');
      }

      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        user: {
          id: userWithoutPassword.id,
          clientId: userWithoutPassword.client_id,
          email: userWithoutPassword.email,
          firstName: userWithoutPassword.first_name,
          lastName: userWithoutPassword.last_name,
          role: userWithoutPassword.role
        }
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Logout user (client-side token deletion)
   */
  static async logout(userId) {
    // Log logout activity
    db.authOps.logActivity(userId, 'logout', {});

    return {
      success: true,
      message: 'Logged out successfully'
    };
  }

  /**
   * Change user password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    // Get user
    const user = db.authOps.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    db.authOps.updatePassword(userId, hashedPassword);

    // Log activity
    db.authOps.logActivity(userId, 'password_changed', {});

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  /**
   * Request password reset (generates reset token)
   */
  static async requestPasswordReset(email) {
    // Get user
    const user = db.authOps.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent'
      };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token
    db.authOps.storeResetToken(user.id, resetToken);

    // Log activity
    db.authOps.logActivity(user.id, 'password_reset_requested', { email });

    // In production, send email with reset link
    // For now, return the token (for testing)
    return {
      success: true,
      message: 'If the email exists, a reset link has been sent',
      resetToken // Remove this in production
    };
  }

  /**
   * Reset password using reset token
   */
  static async resetPassword(resetToken, newPassword) {
    try {
      // Verify reset token
      const decoded = jwt.verify(resetToken, JWT_SECRET);

      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid reset token');
      }

      // Check if token was used
      const isTokenValid = db.authOps.isResetTokenValid(decoded.userId, resetToken);
      if (!isTokenValid) {
        throw new Error('Reset token has been used or is invalid');
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update password
      db.authOps.updatePassword(decoded.userId, hashedPassword);

      // Invalidate reset token
      db.authOps.invalidateResetToken(decoded.userId, resetToken);

      // Log activity
      db.authOps.logActivity(decoded.userId, 'password_reset_completed', {});

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new Error('Invalid or expired reset token');
      }
      throw error;
    }
  }

  /**
   * Get user activity log
   */
  static async getUserActivity(userId, limit = 50) {
    const activity = db.authOps.getActivityLog(userId, limit);

    return {
      success: true,
      activity
    };
  }

  /**
   * Check if user has access to client data
   */
  static async checkClientAccess(userId, clientId) {
    const user = db.authOps.getUserById(userId);

    if (!user) {
      return false;
    }

    // Admin can access all clients
    if (user.role === 'admin') {
      return true;
    }

    // Regular client can only access their own data
    return user.client_id === clientId;
  }
}
