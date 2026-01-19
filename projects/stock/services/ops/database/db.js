/**
 * SQLite Database Module
 *
 * Provides access to the SQLite configuration database.
 * Uses better-sqlite3 for synchronous, high-performance operations.
 */

import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class Database {
  constructor(dbPath) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new BetterSqlite3(dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Get a configuration value
   */
  getConfig(key) {
    const row = this.db.prepare('SELECT value, type FROM config WHERE key = ?').get(key);
    if (!row) return null;

    // Type conversion
    switch (row.type) {
      case 'int':
        return parseInt(row.value, 10);
      case 'float':
        return parseFloat(row.value);
      case 'bool':
        return row.value === 'true';
      case 'json':
        return JSON.parse(row.value);
      default:
        return row.value;
    }
  }

  /**
   * Set a configuration value
   */
  setConfig(key, value, type = 'string') {
    const stringValue = type === 'json' ? JSON.stringify(value) : String(value);
    this.db.prepare(`
      INSERT INTO config (key, value, type, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        type = excluded.type,
        updated_at = datetime('now')
    `).run(key, stringValue, type);
  }

  /**
   * Get current trading mode state
   */
  getModeState() {
    const row = this.db.prepare('SELECT * FROM mode_state WHERE id = 1').get();
    return row || {
      mode: 'BACKTEST',
      kill_switch_active: 0,
      kill_switch_reason: null,
      kill_switch_triggered_at: null,
    };
  }

  /**
   * Update trading mode
   */
  setMode(mode, changedBy = 'system') {
    const validModes = ['BACKTEST', 'PAPER', 'LIVE'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }

    this.db.prepare(`
      UPDATE mode_state
      SET mode = ?, last_mode_change = datetime('now'), changed_by = ?
      WHERE id = 1
    `).run(mode, changedBy);

    return this.getModeState();
  }

  /**
   * Activate kill switch
   */
  activateKillSwitch(reason, triggeredBy = 'manual') {
    this.db.prepare(`
      UPDATE mode_state
      SET kill_switch_active = 1,
          kill_switch_reason = ?,
          kill_switch_triggered_at = datetime('now')
      WHERE id = 1
    `).run(reason);

    return this.getModeState();
  }

  /**
   * Deactivate kill switch
   */
  deactivateKillSwitch() {
    this.db.prepare(`
      UPDATE mode_state
      SET kill_switch_active = 0,
          kill_switch_reason = NULL,
          kill_switch_triggered_at = NULL
      WHERE id = 1
    `).run();

    return this.getModeState();
  }

  /**
   * Get all strategies
   */
  getStrategies(enabledOnly = false) {
    let query = 'SELECT * FROM strategies';
    if (enabledOnly) {
      query += ' WHERE enabled = 1';
    }
    query += ' ORDER BY name';

    const rows = this.db.prepare(query).all();
    return rows.map(row => ({
      ...row,
      config: JSON.parse(row.config),
      markets: JSON.parse(row.markets || '["US"]'),
      symbols: row.symbols ? JSON.parse(row.symbols) : null,
    }));
  }

  /**
   * Get strategy by ID
   */
  getStrategy(id) {
    const row = this.db.prepare('SELECT * FROM strategies WHERE id = ?').get(id);
    if (!row) return null;

    return {
      ...row,
      config: JSON.parse(row.config),
      markets: JSON.parse(row.markets || '["US"]'),
      symbols: row.symbols ? JSON.parse(row.symbols) : null,
    };
  }

  /**
   * Get risk profiles
   */
  getRiskProfiles() {
    const rows = this.db.prepare('SELECT * FROM risk_profiles ORDER BY name').all();
    return rows.map(row => ({
      ...row,
      config: JSON.parse(row.config),
    }));
  }

  /**
   * Get default risk profile
   */
  getDefaultRiskProfile() {
    const row = this.db.prepare('SELECT * FROM risk_profiles WHERE is_default = 1').get();
    if (!row) return null;

    return {
      ...row,
      config: JSON.parse(row.config),
    };
  }

  /**
   * Get broker configurations
   */
  getBrokerConfigs(enabledOnly = false) {
    let query = 'SELECT * FROM broker_configs';
    if (enabledOnly) {
      query += ' WHERE enabled = 1';
    }
    query += ' ORDER BY name';

    const rows = this.db.prepare(query).all();
    return rows.map(row => ({
      ...row,
      config: JSON.parse(row.config),
      markets: JSON.parse(row.markets || '["US"]'),
    }));
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

export default Database;
