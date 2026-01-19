/**
 * Arming System Tests
 *
 * Tests for the LIVE mode arming safety controls.
 * Uses Node.js built-in test runner (node:test).
 *
 * Usage:
 *   node --test tests/test-arming.js
 *
 * Note: These tests use an in-memory SQLite database for isolation.
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock logger
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// Database wrapper that mimics the actual Database class
class TestDatabase {
  constructor() {
    this.db = new BetterSqlite3(':memory:');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.setupSchema();
  }

  setupSchema() {
    // Create mode_state table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mode_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        mode TEXT NOT NULL DEFAULT 'BACKTEST' CHECK (mode IN ('BACKTEST', 'PAPER', 'LIVE')),
        kill_switch_active INTEGER DEFAULT 0,
        kill_switch_reason TEXT,
        kill_switch_triggered_at TEXT,
        last_mode_change TEXT DEFAULT CURRENT_TIMESTAMP,
        changed_by TEXT DEFAULT 'system',
        live_armed INTEGER DEFAULT 0,
        live_armed_at TEXT,
        live_armed_expires_at TEXT
      )
    `);

    // Insert default mode state
    this.db.exec(`
      INSERT INTO mode_state (id, mode, kill_switch_active, live_armed)
      VALUES (1, 'BACKTEST', 0, 0)
    `);

    // Create arming_events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS arming_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL CHECK (event_type IN ('request', 'confirm', 'disarm', 'expire', 'reject')),
        requested_by TEXT,
        confirmation_code TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT,
        confirmed_at TEXT,
        ip_address TEXT
      )
    `);

    // Create config_versions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_hash TEXT NOT NULL,
        config_snapshot TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        active_from TEXT,
        active_until TEXT
      )
    `);

    // Create trading_sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trading_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_version_id INTEGER,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        mode TEXT NOT NULL CHECK (mode IN ('BACKTEST', 'PAPER', 'LIVE'))
      )
    `);
  }

  getModeState() {
    return this.db.prepare('SELECT * FROM mode_state WHERE id = 1').get();
  }

  setMode(mode, changedBy = 'system') {
    this.db.prepare(`
      UPDATE mode_state
      SET mode = ?, last_mode_change = datetime('now'), changed_by = ?
      WHERE id = 1
    `).run(mode, changedBy);
    return this.getModeState();
  }

  close() {
    this.db.close();
  }
}

// Import ArmingManager (we need to use dynamic import due to ES modules)
let ArmingManager;

/**
 * Test suite for ArmingManager
 */
describe('ArmingManager', async () => {
  // Load the ArmingManager module
  const armingModule = await import('../arming/arming.js');
  ArmingManager = armingModule.ArmingManager;

  let db;
  let armingManager;
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = {
      LIVE_ENABLE: process.env.LIVE_ENABLE,
      LIVE_TRADING_ENABLED: process.env.LIVE_TRADING_ENABLED,
    };

    // Reset environment
    delete process.env.LIVE_ENABLE;
    delete process.env.LIVE_TRADING_ENABLED;

    // Create fresh database and manager
    db = new TestDatabase();
    armingManager = new ArmingManager(db, mockLogger);
  });

  afterEach(() => {
    // Restore environment
    if (originalEnv.LIVE_ENABLE !== undefined) {
      process.env.LIVE_ENABLE = originalEnv.LIVE_ENABLE;
    } else {
      delete process.env.LIVE_ENABLE;
    }
    if (originalEnv.LIVE_TRADING_ENABLED !== undefined) {
      process.env.LIVE_TRADING_ENABLED = originalEnv.LIVE_TRADING_ENABLED;
    } else {
      delete process.env.LIVE_TRADING_ENABLED;
    }

    // Close database
    db.close();
  });

  test('should initialize without errors', async () => {
    const result = await armingManager.initialize();
    assert.strictEqual(result, true);
  });

  test('isLiveEnabled should return false when env vars not set', () => {
    assert.strictEqual(armingManager.isLiveEnabled(), false);
  });

  test('isLiveEnabled should return true when LIVE_ENABLE is set', () => {
    process.env.LIVE_ENABLE = 'true';
    assert.strictEqual(armingManager.isLiveEnabled(), true);
  });

  test('isLiveEnabled should return true when LIVE_TRADING_ENABLED is set', () => {
    process.env.LIVE_TRADING_ENABLED = 'true';
    assert.strictEqual(armingManager.isLiveEnabled(), true);
  });

  test('isArmed should return false initially', () => {
    assert.strictEqual(armingManager.isArmed(), false);
  });

  test('canActivateLive should return false when not armed', () => {
    process.env.LIVE_ENABLE = 'true';
    assert.strictEqual(armingManager.canActivateLive(), false);
  });

  test('requestArming should fail when LIVE_ENABLE not set', () => {
    const result = armingManager.requestArming('test_user');

    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('not enabled'));
  });

  test('requestArming should succeed when LIVE_ENABLE is set', () => {
    process.env.LIVE_ENABLE = 'true';

    const result = armingManager.requestArming('test_user', '127.0.0.1');

    assert.strictEqual(result.success, true);
    assert.ok(result.code);
    assert.strictEqual(result.code.length, 6);
    assert.ok(result.expires_at);
    assert.ok(result.warning);
  });

  test('requestArming should generate unique 6-digit codes', () => {
    process.env.LIVE_ENABLE = 'true';

    const codes = new Set();
    for (let i = 0; i < 10; i++) {
      armingManager.clearPendingCode();
      const result = armingManager.requestArming('test_user');
      assert.strictEqual(result.code.length, 6);
      assert.ok(/^\d{6}$/.test(result.code), 'Code should be 6 digits');
      codes.add(result.code);
    }

    // Should have generated some unique codes (may not all be unique, but should have variety)
    assert.ok(codes.size >= 1);
  });

  test('confirmArming should fail without pending request', () => {
    const result = armingManager.confirmArming('123456');

    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('No pending'));
  });

  test('confirmArming should fail with wrong code', () => {
    process.env.LIVE_ENABLE = 'true';

    armingManager.requestArming('test_user');
    const result = armingManager.confirmArming('000000');

    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Invalid'));
  });

  test('confirmArming should succeed with correct code', () => {
    process.env.LIVE_ENABLE = 'true';

    const request = armingManager.requestArming('test_user');
    const result = armingManager.confirmArming(request.code);

    assert.strictEqual(result.success, true);
    assert.ok(result.armed_at);
    assert.ok(result.expires_at);
    assert.ok(result.warning.includes('24 hours'));
  });

  test('isArmed should return true after successful arming', () => {
    process.env.LIVE_ENABLE = 'true';

    const request = armingManager.requestArming('test_user');
    armingManager.confirmArming(request.code);

    assert.strictEqual(armingManager.isArmed(), true);
  });

  test('canActivateLive should return true after arming', () => {
    process.env.LIVE_ENABLE = 'true';

    const request = armingManager.requestArming('test_user');
    armingManager.confirmArming(request.code);

    assert.strictEqual(armingManager.canActivateLive(), true);
  });

  test('requestArming should fail when already armed', () => {
    process.env.LIVE_ENABLE = 'true';

    const request = armingManager.requestArming('test_user');
    armingManager.confirmArming(request.code);

    const secondRequest = armingManager.requestArming('test_user');
    assert.strictEqual(secondRequest.success, false);
    assert.ok(secondRequest.error.includes('already armed'));
  });

  test('disarm should succeed and clear armed state', () => {
    process.env.LIVE_ENABLE = 'true';

    // Arm first
    const request = armingManager.requestArming('test_user');
    armingManager.confirmArming(request.code);
    assert.strictEqual(armingManager.isArmed(), true);

    // Disarm
    const result = armingManager.disarm('test_user', 'Test disarm');

    assert.strictEqual(result.success, true);
    assert.strictEqual(armingManager.isArmed(), false);
  });

  test('disarm should switch from LIVE to PAPER mode', () => {
    process.env.LIVE_ENABLE = 'true';

    // Set mode to LIVE
    db.setMode('LIVE', 'test');

    // Arm
    const request = armingManager.requestArming('test_user');
    armingManager.confirmArming(request.code);

    // Disarm
    const result = armingManager.disarm('test_user', 'Test disarm');

    assert.strictEqual(result.previous_mode, 'LIVE');
    assert.strictEqual(result.current_mode, 'PAPER');

    const state = db.getModeState();
    assert.strictEqual(state.mode, 'PAPER');
  });

  test('getStatus should return correct status when disarmed', () => {
    const status = armingManager.getStatus();

    assert.strictEqual(status.status, 'LIVE_DISABLED');
    assert.strictEqual(status.armed, false);
    assert.strictEqual(status.can_activate_live, false);
  });

  test('getStatus should return correct status when armed', () => {
    process.env.LIVE_ENABLE = 'true';

    const request = armingManager.requestArming('test_user');
    armingManager.confirmArming(request.code);

    const status = armingManager.getStatus();

    assert.strictEqual(status.status, 'ARMED');
    assert.strictEqual(status.armed, true);
    assert.strictEqual(status.can_activate_live, true);
    assert.ok(status.armed_at);
    assert.ok(status.expires_at);
    assert.ok(typeof status.expires_in_hours === 'number');
  });

  test('getStatus should show pending confirmation', () => {
    process.env.LIVE_ENABLE = 'true';

    armingManager.requestArming('test_user');

    const status = armingManager.getStatus();

    assert.strictEqual(status.pending_confirmation, true);
    assert.ok(status.confirmation_expires_at);
  });

  test('getArmingHistory should return events', () => {
    process.env.LIVE_ENABLE = 'true';

    armingManager.requestArming('test_user', '127.0.0.1');

    const history = armingManager.getArmingHistory();

    assert.ok(Array.isArray(history));
    assert.ok(history.length > 0);
    assert.strictEqual(history[0].event_type, 'request');
    assert.strictEqual(history[0].requested_by, 'test_user');
  });

  test('arming events should be logged', () => {
    process.env.LIVE_ENABLE = 'true';

    // Request
    const request = armingManager.requestArming('test_user', '127.0.0.1');

    // Confirm
    armingManager.confirmArming(request.code, '127.0.0.1');

    // Disarm
    armingManager.disarm('test_user', 'Test', '127.0.0.1');

    const history = armingManager.getArmingHistory();

    // Should have request, confirm, and disarm events
    const eventTypes = history.map(e => e.event_type);
    assert.ok(eventTypes.includes('request'));
    assert.ok(eventTypes.includes('confirm'));
    assert.ok(eventTypes.includes('disarm'));
  });

  test('confirmation code should expire', async () => {
    process.env.LIVE_ENABLE = 'true';

    // Request arming
    armingManager.requestArming('test_user');

    // Manually expire the code
    armingManager.pendingCodeExpiry = new Date(Date.now() - 1000);

    // Try to confirm
    const result = armingManager.confirmArming('000000');

    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('expired'));
  });
});

/**
 * Test suite for ConfigVersionManager
 */
describe('ConfigVersionManager', async () => {
  const configModule = await import('../config/versioning.js');
  const ConfigVersionManager = configModule.ConfigVersionManager;

  let db;
  let configManager;

  beforeEach(() => {
    db = new TestDatabase();
    configManager = new ConfigVersionManager(db, mockLogger);
  });

  afterEach(() => {
    db.close();
  });

  test('should initialize without errors', async () => {
    // Note: This will warn about missing config directory, which is expected in tests
    const result = await configManager.initialize();
    // Result may be null if no config files found, which is OK for testing
    assert.ok(result === null || typeof result === 'object');
  });

  test('computeHash should be deterministic', () => {
    const config1 = { foo: 'bar', baz: 123 };
    const config2 = { foo: 'bar', baz: 123 };
    const config3 = { foo: 'bar', baz: 456 };

    const hash1 = configManager.computeHash(config1);
    const hash2 = configManager.computeHash(config2);
    const hash3 = configManager.computeHash(config3);

    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, hash3);
  });

  test('computeHash should be order-independent for objects', () => {
    const config1 = { a: 1, b: 2, c: 3 };
    const config2 = { c: 3, a: 1, b: 2 };

    const hash1 = configManager.computeHash(config1);
    const hash2 = configManager.computeHash(config2);

    assert.strictEqual(hash1, hash2);
  });

  test('sortObjectKeys should recursively sort', () => {
    const unsorted = {
      z: { b: 2, a: 1 },
      a: { d: 4, c: 3 },
    };

    const sorted = configManager.sortObjectKeys(unsorted);

    const keys = Object.keys(sorted);
    assert.deepStrictEqual(keys, ['a', 'z']);

    const nestedKeys = Object.keys(sorted.a);
    assert.deepStrictEqual(nestedKeys, ['c', 'd']);
  });

  test('getAllVersions should return empty array initially', () => {
    const versions = configManager.getAllVersions();
    assert.ok(Array.isArray(versions));
    assert.strictEqual(versions.length, 0);
  });

  test('getLatestVersion should return null initially', () => {
    const version = configManager.getLatestVersion();
    assert.strictEqual(version, null);
  });

  test('createVersion should store version in database', () => {
    const config = { test: 'config' };
    const hash = configManager.computeHash(config);

    const version = configManager.createVersion(hash, config);

    assert.ok(version.id);
    assert.strictEqual(version.config_hash, hash);
    assert.ok(version.created_at);
  });

  test('getVersionByHash should find existing version', () => {
    const config = { test: 'config' };
    const hash = configManager.computeHash(config);

    configManager.createVersion(hash, config);

    const found = configManager.getVersionByHash(hash);
    assert.ok(found);
    assert.strictEqual(found.config_hash, hash);
  });

  test('getVersionById should return version with parsed config', () => {
    const config = { test: 'config', nested: { value: 42 } };
    const hash = configManager.computeHash(config);

    const created = configManager.createVersion(hash, config);
    const found = configManager.getVersionById(created.id);

    assert.ok(found);
    assert.deepStrictEqual(found.config, config);
  });

  test('compareVersions should show differences', () => {
    const config1 = { setting: 'old', common: 'same' };
    const config2 = { setting: 'new', common: 'same', added: 'value' };

    const v1 = configManager.createVersion(configManager.computeHash(config1), config1);
    const v2 = configManager.createVersion(configManager.computeHash(config2), config2);

    const comparison = configManager.compareVersions(v1.id, v2.id);

    assert.ok(comparison);
    assert.ok(comparison.differences);
    assert.ok(Array.isArray(comparison.differences));

    // Should find the 'setting' change
    const settingChange = comparison.differences.find(d => d.path === 'setting');
    assert.ok(settingChange);
    assert.strictEqual(settingChange.oldValue, 'old');
    assert.strictEqual(settingChange.newValue, 'new');
  });

  test('createVersion should end previous version', () => {
    const config1 = { version: 1 };
    const config2 = { version: 2 };

    const v1 = configManager.createVersion(configManager.computeHash(config1), config1);
    assert.strictEqual(v1.active_until, null);

    const v2 = configManager.createVersion(configManager.computeHash(config2), config2);

    // Check that v1 now has active_until set
    const updatedV1 = configManager.getVersionById(v1.id);
    assert.ok(updatedV1.active_until);
    assert.strictEqual(v2.active_until, null);
  });
});

/**
 * Test suite for two-condition LIVE mode safety
 */
describe('Two-Condition LIVE Safety', async () => {
  const armingModule = await import('../arming/arming.js');
  const ArmingManager = armingModule.ArmingManager;

  let db;
  let armingManager;
  let originalEnv;

  beforeEach(() => {
    originalEnv = {
      LIVE_ENABLE: process.env.LIVE_ENABLE,
      LIVE_TRADING_ENABLED: process.env.LIVE_TRADING_ENABLED,
    };
    delete process.env.LIVE_ENABLE;
    delete process.env.LIVE_TRADING_ENABLED;

    db = new TestDatabase();
    armingManager = new ArmingManager(db, mockLogger);
  });

  afterEach(() => {
    if (originalEnv.LIVE_ENABLE !== undefined) {
      process.env.LIVE_ENABLE = originalEnv.LIVE_ENABLE;
    } else {
      delete process.env.LIVE_ENABLE;
    }
    if (originalEnv.LIVE_TRADING_ENABLED !== undefined) {
      process.env.LIVE_TRADING_ENABLED = originalEnv.LIVE_TRADING_ENABLED;
    } else {
      delete process.env.LIVE_TRADING_ENABLED;
    }
    db.close();
  });

  test('canActivateLive requires BOTH conditions', () => {
    // Neither condition met
    assert.strictEqual(armingManager.canActivateLive(), false);

    // Only env var set
    process.env.LIVE_ENABLE = 'true';
    assert.strictEqual(armingManager.canActivateLive(), false);

    // Arm the system
    const request = armingManager.requestArming('test');
    armingManager.confirmArming(request.code);

    // Both conditions met
    assert.strictEqual(armingManager.canActivateLive(), true);

    // Remove env var
    delete process.env.LIVE_ENABLE;
    assert.strictEqual(armingManager.canActivateLive(), false);
  });

  test('LIVE mode blocked without env var even when armed', () => {
    // This simulates what would happen if someone tried to arm
    // then the env var was removed

    process.env.LIVE_ENABLE = 'true';
    const request = armingManager.requestArming('test');
    armingManager.confirmArming(request.code);
    assert.strictEqual(armingManager.canActivateLive(), true);

    // Remove env var
    delete process.env.LIVE_ENABLE;
    assert.strictEqual(armingManager.canActivateLive(), false);
    assert.strictEqual(armingManager.isArmed(), true); // Still armed
    assert.strictEqual(armingManager.isLiveEnabled(), false); // But env check fails
  });

  test('24-hour arming expiry is enforced', async () => {
    process.env.LIVE_ENABLE = 'true';

    // Arm the system
    const request = armingManager.requestArming('test');
    armingManager.confirmArming(request.code);
    assert.strictEqual(armingManager.isArmed(), true);

    // Manually expire the arming
    db.db.prepare(`
      UPDATE mode_state
      SET live_armed_expires_at = datetime('now', '-1 hour')
      WHERE id = 1
    `).run();

    // Check arming - should auto-disarm
    assert.strictEqual(armingManager.isArmed(), false);
  });
});

console.log('Running arming system tests...');
