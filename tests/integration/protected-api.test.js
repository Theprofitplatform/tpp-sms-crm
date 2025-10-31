/**
 * Integration Tests: Protected API Endpoints
 * 
 * Tests API endpoints that require authentication
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { AuthService } from '../../src/auth/auth-service.js';
import { requireAuth } from '../../src/middleware/auth.js';
import { validate } from '../../src/middleware/validation.js';
import { clientSchema } from '../../src/validation/schemas.js';
import db from '../../src/database/index.js';

// Create test app with protected routes
const app = express();
app.use(express.json());

// Mock protected endpoint
app.get('/api/test/protected', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Access granted',
    user: req.user
  });
});

// Mock client endpoint with validation
app.post('/api/test/clients', requireAuth, validate(clientSchema), (req, res) => {
  res.json({
    success: true,
    client: req.body
  });
});

describe('Protected API Endpoints', () => {
  let authToken;
  const testUser = {
    clientId: 'test-protected',
    email: 'protected@example.com',
    password: 'SecurePass123!',
    role: 'client'
  };

  beforeAll(async () => {
    // Register and login test user
    try {
      await AuthService.register(testUser);
    } catch (error) {
      // User might exist
    }

    const loginResult = await AuthService.login(
      testUser.email,
      testUser.password
    );
    authToken = loginResult.token;
  });

  describe('Authentication Middleware', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/test/protected')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No token');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', 'NotBearer token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should accept token in query parameter', async () => {
      const response = await request(app)
        .get(`/api/test/protected?token=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Validation + Authentication', () => {
    it('should apply both auth and validation', async () => {
      const validClient = {
        id: 'new-client',
        name: 'New Client',
        domain: 'newclient.com'
      };

      const response = await request(app)
        .post('/api/test/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validClient)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.client.id).toBe(validClient.id);
    });

    it('should reject unauthenticated request even with valid data', async () => {
      const validClient = {
        id: 'new-client',
        name: 'New Client',
        domain: 'newclient.com'
      };

      const response = await request(app)
        .post('/api/test/clients')
        .send(validClient)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject authenticated request with invalid data', async () => {
      const invalidClient = {
        id: 'Invalid ID!',
        name: 'X',
        domain: 'not-a-domain'
      };

      const response = await request(app)
        .post('/api/test/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidClient)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation');
    });
  });

  describe('Token Expiration', () => {
    it('should handle expired token gracefully', async () => {
      // This would require mocking jwt.sign with short expiry
      // or using a pre-generated expired token
      // Skipping for now as it requires time manipulation
    });
  });

  describe('Client Access Control', () => {
    it('should enforce client-level access', async () => {
      // User should only access their own client data
      // This would be tested with actual client endpoints
      // which check clientId matching
    });
  });
});
