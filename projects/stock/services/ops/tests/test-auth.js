/**
 * Authentication and Rate Limiting Tests
 *
 * Tests for the auth middleware and rate limiting functionality.
 *
 * Usage:
 *   node --test services/ops/tests/test-auth.js
 *
 * Note: Uses Node.js built-in test runner (Node 18+)
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import modules to test
import {
  ApiKeyManager,
  createAuthMiddleware,
  requireRole,
  hashApiKey,
  generateApiKey,
  createJWT,
  verifyJWT,
  ROLE_HIERARCHY,
} from '../middleware/auth.js';

import {
  createRateLimiter,
  createRateLimitMiddleware,
  getEndpointGroup,
  RATE_LIMIT_CONFIG,
} from '../middleware/rate-limit.js';

// Test database path
const TEST_DB_PATH = path.join(__dirname, 'test-auth.db');

// Mock logger
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// Mock Express request/response
function createMockReq(options = {}) {
  return {
    headers: options.headers || {},
    ip: options.ip || '127.0.0.1',
    method: options.method || 'GET',
    path: options.path || '/test',
    originalUrl: options.originalUrl || options.path || '/test',
    app: {
      locals: options.locals || {},
    },
    auth: options.auth || null,
    connection: { remoteAddress: options.ip || '127.0.0.1' },
  };
}

function createMockRes() {
  const headers = {};
  let statusCode = 200;
  let jsonData = null;

  return {
    setHeader: (key, value) => { headers[key] = value; },
    getHeader: (key) => headers[key],
    status: function(code) { statusCode = code; return this; },
    json: (data) => { jsonData = data; },
    getStatus: () => statusCode,
    getJson: () => jsonData,
    getHeaders: () => headers,
  };
}

// Test suite for API Key utilities
describe('API Key Utilities', () => {
  it('should generate unique API keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    assert.ok(key1.startsWith('stk_'), 'Key should start with stk_ prefix');
    assert.ok(key2.startsWith('stk_'), 'Key should start with stk_ prefix');
    assert.notStrictEqual(key1, key2, 'Keys should be unique');
    assert.ok(key1.length > 20, 'Key should be sufficiently long');
  });

  it('should hash API keys consistently', () => {
    const apiKey = 'stk_test123';
    const hash1 = hashApiKey(apiKey);
    const hash2 = hashApiKey(apiKey);

    assert.strictEqual(hash1, hash2, 'Same key should produce same hash');
    assert.strictEqual(hash1.length, 64, 'SHA-256 hash should be 64 hex chars');
  });

  it('should produce different hashes for different keys', () => {
    const hash1 = hashApiKey('stk_key1');
    const hash2 = hashApiKey('stk_key2');

    assert.notStrictEqual(hash1, hash2, 'Different keys should produce different hashes');
  });
});

// Test suite for JWT utilities
describe('JWT Utilities', () => {
  it('should create and verify valid JWT', () => {
    const payload = { sub: 'user123', role: 'admin', email: 'test@example.com' };
    const token = createJWT(payload);

    assert.ok(token, 'Should create token');
    assert.ok(token.split('.').length === 3, 'JWT should have 3 parts');

    const decoded = verifyJWT(token);
    assert.ok(decoded, 'Should verify valid token');
    assert.strictEqual(decoded.sub, 'user123');
    assert.strictEqual(decoded.role, 'admin');
    assert.ok(decoded.iat, 'Should have issued-at timestamp');
    assert.ok(decoded.exp, 'Should have expiration timestamp');
  });

  it('should reject invalid JWT', () => {
    const result = verifyJWT('invalid.token.here');
    assert.strictEqual(result, null, 'Should reject invalid token');
  });

  it('should reject tampered JWT', () => {
    const token = createJWT({ sub: 'user123' });
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ sub: 'hacker' })).toString('base64url');
    const tamperedToken = parts.join('.');

    const result = verifyJWT(tamperedToken);
    assert.strictEqual(result, null, 'Should reject tampered token');
  });

  it('should reject malformed JWT', () => {
    assert.strictEqual(verifyJWT(''), null);
    assert.strictEqual(verifyJWT('a.b'), null);
    assert.strictEqual(verifyJWT(null), null);
    assert.strictEqual(verifyJWT(undefined), null);
  });
});

// Test suite for ApiKeyManager
describe('ApiKeyManager', () => {
  let db;
  let manager;

  before(() => {
    // Create test database
    db = new BetterSqlite3(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');

    // Wrap db for manager compatibility
    const dbWrapper = { db };
    manager = new ApiKeyManager(dbWrapper, mockLogger);
    manager.initialize();
  });

  after(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Clean up WAL files
    if (fs.existsSync(TEST_DB_PATH + '-wal')) {
      fs.unlinkSync(TEST_DB_PATH + '-wal');
    }
    if (fs.existsSync(TEST_DB_PATH + '-shm')) {
      fs.unlinkSync(TEST_DB_PATH + '-shm');
    }
  });

  it('should create API key', () => {
    const result = manager.createKey('Test Key', 'admin', {
      description: 'Test key description',
    });

    assert.ok(result.id, 'Should return key ID');
    assert.ok(result.key, 'Should return API key');
    assert.ok(result.key.startsWith('stk_'), 'Key should have correct prefix');
    assert.strictEqual(result.name, 'Test Key');
    assert.strictEqual(result.role, 'admin');
  });

  it('should reject invalid role', () => {
    assert.throws(
      () => manager.createKey('Invalid', 'superuser'),
      /Invalid role/,
      'Should reject invalid role'
    );
  });

  it('should validate API key', () => {
    const created = manager.createKey('Validate Test', 'operator');
    const validated = manager.validateKey(created.key);

    assert.ok(validated, 'Should validate correct key');
    assert.strictEqual(validated.name, 'Validate Test');
    assert.strictEqual(validated.role, 'operator');
  });

  it('should reject invalid API key', () => {
    const result = manager.validateKey('stk_invalid_key');
    assert.strictEqual(result, null, 'Should reject invalid key');
  });

  it('should reject null/undefined API key', () => {
    assert.strictEqual(manager.validateKey(null), null);
    assert.strictEqual(manager.validateKey(undefined), null);
    assert.strictEqual(manager.validateKey(''), null);
  });

  it('should list API keys', () => {
    const keys = manager.listKeys();
    assert.ok(Array.isArray(keys), 'Should return array');
    assert.ok(keys.length >= 2, 'Should have created keys');
  });

  it('should revoke API key', () => {
    const created = manager.createKey('Revoke Test', 'viewer');
    const revoked = manager.revokeKey(created.id);

    assert.ok(revoked, 'Should revoke successfully');

    const validated = manager.validateKey(created.key);
    assert.strictEqual(validated, null, 'Revoked key should not validate');
  });

  it('should update last_used_at on validation', (t) => {
    const created = manager.createKey('Usage Test', 'viewer');

    // First validation
    manager.validateKey(created.key);

    // Get key info from DB
    const keyInfo = db.prepare('SELECT last_used_at FROM api_keys WHERE id = ?').get(created.id);
    assert.ok(keyInfo.last_used_at, 'Should update last_used_at');
  });
});

// Test suite for Auth Middleware
describe('Auth Middleware', () => {
  let db;
  let manager;
  let middleware;
  let testApiKey;

  before(() => {
    db = new BetterSqlite3(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');
    const dbWrapper = { db };
    manager = new ApiKeyManager(dbWrapper, mockLogger);
    manager.initialize();

    middleware = createAuthMiddleware(manager, { logger: mockLogger });
    testApiKey = manager.createKey('Middleware Test', 'operator').key;
  });

  after(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    if (fs.existsSync(TEST_DB_PATH + '-wal')) {
      fs.unlinkSync(TEST_DB_PATH + '-wal');
    }
    if (fs.existsSync(TEST_DB_PATH + '-shm')) {
      fs.unlinkSync(TEST_DB_PATH + '-shm');
    }
  });

  it('should authenticate valid API key', (t, done) => {
    const req = createMockReq({
      headers: { 'x-api-key': testApiKey },
    });
    const res = createMockRes();

    middleware(req, res, () => {
      assert.ok(req.auth, 'Should set req.auth');
      assert.strictEqual(req.auth.type, 'api-key');
      assert.strictEqual(req.auth.role, 'operator');
      done();
    });
  });

  it('should reject invalid API key', () => {
    const req = createMockReq({
      headers: { 'x-api-key': 'stk_invalid' },
    });
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'Should not call next()');
    assert.strictEqual(res.getStatus(), 401);
    assert.ok(res.getJson().error, 'Should return error');
  });

  it('should authenticate valid JWT', (t, done) => {
    const token = createJWT({ sub: 'user1', role: 'admin' });
    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();

    middleware(req, res, () => {
      assert.ok(req.auth, 'Should set req.auth');
      assert.strictEqual(req.auth.type, 'jwt');
      assert.strictEqual(req.auth.role, 'admin');
      done();
    });
  });

  it('should reject missing authentication', () => {
    const req = createMockReq();
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.getStatus(), 401);
  });
});

// Test suite for Role Requirement
describe('Role Requirement', () => {
  it('should allow admin to access admin endpoint', (t, done) => {
    const req = createMockReq({ auth: { role: 'admin' } });
    const res = createMockRes();
    const roleMiddleware = requireRole('admin');

    roleMiddleware(req, res, () => {
      done();
    });
  });

  it('should allow admin to access operator endpoint', (t, done) => {
    const req = createMockReq({ auth: { role: 'admin' } });
    const res = createMockRes();
    const roleMiddleware = requireRole('operator');

    roleMiddleware(req, res, () => {
      done();
    });
  });

  it('should reject viewer from admin endpoint', () => {
    const req = createMockReq({
      auth: { role: 'viewer' },
      locals: { logger: mockLogger },
    });
    const res = createMockRes();
    const roleMiddleware = requireRole('admin');
    let nextCalled = false;

    roleMiddleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.getStatus(), 403);
  });

  it('should respect role hierarchy', () => {
    assert.ok(ROLE_HIERARCHY.admin > ROLE_HIERARCHY.operator);
    assert.ok(ROLE_HIERARCHY.operator > ROLE_HIERARCHY.viewer);
  });
});

// Test suite for Rate Limiting
describe('Rate Limiting', () => {
  let limiter;

  beforeEach(() => {
    limiter = createRateLimiter();
  });

  after(() => {
    if (limiter) limiter.stop();
  });

  it('should identify endpoint groups correctly', () => {
    assert.strictEqual(getEndpointGroup('/api/v1/arming/request', 'POST'), 'arming');
    assert.strictEqual(getEndpointGroup('/api/v1/mode/switch', 'POST'), 'mode');
    assert.strictEqual(getEndpointGroup('/api/v1/config/version', 'GET'), 'config');
    assert.strictEqual(getEndpointGroup('/api/v1/status', 'GET'), 'read');
    assert.strictEqual(getEndpointGroup('/api/v1/jobs', 'POST'), 'write');
  });

  it('should allow requests within limit', () => {
    const result = limiter.counter.check('test-key', 60000, 5);
    assert.ok(result.allowed, 'First request should be allowed');
    assert.strictEqual(result.remaining, 4);
  });

  it('should block requests exceeding limit', () => {
    const key = 'block-test';

    // Make 5 requests (the limit for arming)
    for (let i = 0; i < 5; i++) {
      limiter.counter.check(key, 60000, 5);
    }

    // 6th request should be blocked
    const result = limiter.counter.check(key, 60000, 5);
    assert.strictEqual(result.allowed, false, 'Should block after limit');
    assert.ok(result.retryAfter > 0, 'Should provide retry-after');
  });

  it('should track requests by unique key', () => {
    const result1 = limiter.counter.check('user1', 60000, 5);
    const result2 = limiter.counter.check('user2', 60000, 5);

    assert.strictEqual(result1.remaining, 4);
    assert.strictEqual(result2.remaining, 4);
  });

  it('should set rate limit headers via middleware', (t, done) => {
    const middleware = createRateLimitMiddleware(limiter, { logger: mockLogger });
    const req = createMockReq({ path: '/api/v1/status' });
    const res = createMockRes();

    middleware(req, res, () => {
      const headers = res.getHeaders();
      assert.ok(headers['X-RateLimit-Limit'], 'Should set limit header');
      assert.ok(headers['X-RateLimit-Remaining'] !== undefined, 'Should set remaining header');
      assert.ok(headers['X-RateLimit-Reset'], 'Should set reset header');
      done();
    });
  });
});

// Test suite for Rate Limit Configuration
describe('Rate Limit Configuration', () => {
  it('should have stricter limits for arming endpoints', () => {
    assert.ok(RATE_LIMIT_CONFIG.arming.maxRequests < RATE_LIMIT_CONFIG.read.maxRequests);
    assert.strictEqual(RATE_LIMIT_CONFIG.arming.maxRequests, 5);
  });

  it('should have appropriate limits for different groups', () => {
    assert.strictEqual(RATE_LIMIT_CONFIG.mode.maxRequests, 10);
    assert.strictEqual(RATE_LIMIT_CONFIG.write.maxRequests, 30);
    assert.strictEqual(RATE_LIMIT_CONFIG.read.maxRequests, 100);
  });
});

console.log('Running authentication and rate limiting tests...\n');
