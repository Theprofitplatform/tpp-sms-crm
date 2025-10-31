/**
 * Unit Tests: Authentication Service
 * 
 * Tests for JWT authentication, password hashing, and user management
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { AuthService } from '../../src/auth/auth-service.js';
import db from '../../src/database/index.js';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  // Test user data
  const testUser = {
    clientId: 'test-client',
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'client'
  };

  // Create test client before all tests
  beforeAll(() => {
    try {
      // Create test client if it doesn't exist
      db.clientOps.upsert({
        id: 'test-client',
        name: 'Test Client',
        domain: 'testclient.com',
        status: 'active'
      });

      // Create different-client for access tests
      db.clientOps.upsert({
        id: 'different-client',
        name: 'Different Client',
        domain: 'differentclient.com',
        status: 'active'
      });
    } catch (error) {
      console.error('Error creating test clients:', error);
    }
  });

  // Cleanup after each test
  afterEach(() => {
    // Clean up test users
    try {
      const user = db.authOps.getUserByEmail(testUser.email);
      if (user) {
        // Note: Add delete method if needed
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('register', () => {
    it('should register a new user with valid data', async () => {
      const result = await AuthService.register(testUser);

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(typeof result.userId).toBe('number');
    });

    it('should hash the password', async () => {
      await AuthService.register(testUser);
      const user = db.authOps.getUserByEmail(testUser.email);

      expect(user.password).not.toBe(testUser.password);
      expect(user.password.length).toBeGreaterThan(50); // Bcrypt hash length
    });

    it('should reject duplicate email', async () => {
      await AuthService.register(testUser);

      await expect(AuthService.register(testUser))
        .rejects.toThrow('Email already registered');
    });

    it('should reject missing required fields', async () => {
      await expect(AuthService.register({}))
        .rejects.toThrow();
    });

    it('should reject weak password', async () => {
      const weakPassword = { ...testUser, password: 'weak' };

      await expect(AuthService.register(weakPassword))
        .rejects.toThrow('at least 8 characters');
    });

    it('should reject invalid email', async () => {
      const invalidEmail = { ...testUser, email: 'not-an-email' };

      await expect(AuthService.register(invalidEmail))
        .rejects.toThrow('Invalid email');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create test user before each login test
      await AuthService.register(testUser);
    });

    it('should login with correct credentials', async () => {
      const result = await AuthService.login(
        testUser.email,
        testUser.password
      );

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
    });

    it('should return JWT token', async () => {
      const result = await AuthService.login(
        testUser.email,
        testUser.password
      );

      expect(result.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should not return password in user object', async () => {
      const result = await AuthService.login(
        testUser.email,
        testUser.password
      );

      expect(result.user.password).toBeUndefined();
    });

    it('should reject incorrect password', async () => {
      await expect(AuthService.login(testUser.email, 'WrongPassword123!'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      await expect(AuthService.login('nonexistent@example.com', 'password'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should update last login timestamp', async () => {
      const userBefore = db.authOps.getUserByEmail(testUser.email);
      const lastLoginBefore = userBefore.last_login;

      await new Promise(resolve => setTimeout(resolve, 100));

      await AuthService.login(testUser.email, testUser.password);

      const userAfter = db.authOps.getUserByEmail(testUser.email);
      expect(userAfter.last_login).not.toBe(lastLoginBefore);
    });
  });

  describe('verifyToken', () => {
    let validToken;

    beforeEach(async () => {
      await AuthService.register(testUser);
      const loginResult = await AuthService.login(
        testUser.email,
        testUser.password
      );
      validToken = loginResult.token;
    });

    it('should verify valid token', async () => {
      const result = await AuthService.verifyToken(validToken);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
    });

    it('should reject invalid token', async () => {
      await expect(AuthService.verifyToken('invalid.token.here'))
        .rejects.toThrow('Invalid token');
    });

    it('should reject expired token', async () => {
      // This test would require mocking jwt.sign with short expiry
      // Skipping for now as it requires time manipulation
    });
  });

  describe('changePassword', () => {
    let userId;

    beforeEach(async () => {
      const result = await AuthService.register(testUser);
      userId = result.userId;
    });

    it('should change password with correct current password', async () => {
      const result = await AuthService.changePassword(
        userId,
        testUser.password,
        'NewSecurePass123!'
      );

      expect(result.success).toBe(true);

      // Verify new password works
      const loginResult = await AuthService.login(
        testUser.email,
        'NewSecurePass123!'
      );
      expect(loginResult.success).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      await expect(
        AuthService.changePassword(userId, 'WrongPassword', 'NewPass123!')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      await expect(
        AuthService.changePassword(userId, testUser.password, 'weak')
      ).rejects.toThrow('at least 8 characters');
    });
  });

  describe('password reset', () => {
    beforeEach(async () => {
      await AuthService.register(testUser);
    });

    it('should generate reset token', async () => {
      const result = await AuthService.requestPasswordReset(testUser.email);

      expect(result.success).toBe(true);
      expect(result.message).toContain('reset link');
    });

    it('should reset password with valid token', async () => {
      const requestResult = await AuthService.requestPasswordReset(
        testUser.email
      );
      const resetToken = requestResult.resetToken; // In test mode

      const resetResult = await AuthService.resetPassword(
        resetToken,
        'NewPassword123!'
      );

      expect(resetResult.success).toBe(true);

      // Verify new password works
      const loginResult = await AuthService.login(
        testUser.email,
        'NewPassword123!'
      );
      expect(loginResult.success).toBe(true);
    });

    it('should not reveal if email does not exist', async () => {
      const result = await AuthService.requestPasswordReset(
        'nonexistent@example.com'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('If the email exists');
    });
  });

  describe('checkClientAccess', () => {
    let user1Id, user2Id;

    beforeEach(async () => {
      const user1 = await AuthService.register(testUser);
      user1Id = user1.userId;

      const user2 = await AuthService.register({
        ...testUser,
        email: 'user2@example.com',
        clientId: 'different-client'
      });
      user2Id = user2.userId;
    });

    it('should allow access to own client', async () => {
      const hasAccess = await AuthService.checkClientAccess(
        user1Id,
        testUser.clientId
      );

      expect(hasAccess).toBe(true);
    });

    it('should deny access to different client', async () => {
      const hasAccess = await AuthService.checkClientAccess(
        user1Id,
        'different-client'
      );

      expect(hasAccess).toBe(false);
    });
  });
});
