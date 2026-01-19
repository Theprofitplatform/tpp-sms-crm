/**
 * Config Version Manager
 *
 * Manages configuration versioning for the trading system.
 * - Loads config from /config/*.json files
 * - Computes SHA256 hash of combined config
 * - Stores versions in SQLite config_versions table
 * - Records which config version was active for each trading session
 *
 * Usage:
 *   const versionManager = new ConfigVersionManager(db, logger);
 *   await versionManager.initialize();
 *   const currentVersion = versionManager.getCurrentVersion();
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class ConfigVersionManager {
  constructor(db, logger, configDir = null) {
    this.db = db;
    this.logger = logger;
    this.configDir = configDir || path.resolve(process.cwd(), 'config');
    this.currentVersion = null;
    this.currentConfig = null;
  }

  /**
   * Initialize the version manager
   * - Load config files
   * - Check for changes
   * - Create new version if needed
   */
  async initialize() {
    this.logger.info('Initializing ConfigVersionManager...', { configDir: this.configDir });

    try {
      // Load current config from files
      this.currentConfig = this.loadConfigFiles();

      if (!this.currentConfig || Object.keys(this.currentConfig).length === 0) {
        this.logger.warn('No config files found in config directory', { configDir: this.configDir });
        return null;
      }

      // Compute hash
      const configHash = this.computeHash(this.currentConfig);

      // Check if this version already exists
      const existingVersion = this.getVersionByHash(configHash);

      if (existingVersion) {
        this.logger.info('Config unchanged, using existing version', {
          versionId: existingVersion.id,
          hash: configHash.substring(0, 8),
        });
        this.currentVersion = existingVersion;
      } else {
        // Create new version
        this.currentVersion = this.createVersion(configHash, this.currentConfig);
        this.logger.info('New config version created', {
          versionId: this.currentVersion.id,
          hash: configHash.substring(0, 8),
        });

        // Log config change to decision log if available
        this.logConfigChange(this.currentVersion);
      }

      return this.currentVersion;
    } catch (error) {
      this.logger.error('Failed to initialize ConfigVersionManager', { error: error.message });
      throw error;
    }
  }

  /**
   * Load all JSON config files from config directory
   */
  loadConfigFiles() {
    const config = {};

    if (!fs.existsSync(this.configDir)) {
      this.logger.warn('Config directory does not exist', { configDir: this.configDir });
      return config;
    }

    const files = fs.readdirSync(this.configDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(this.configDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const name = path.basename(file, '.json');
        config[name] = JSON.parse(content);
        this.logger.debug('Loaded config file', { file, name });
      } catch (error) {
        this.logger.error('Failed to load config file', { file, error: error.message });
      }
    }

    return config;
  }

  /**
   * Compute SHA256 hash of config object
   */
  computeHash(config) {
    // Sort keys for consistent hashing
    const sortedConfig = this.sortObjectKeys(config);
    const configString = JSON.stringify(sortedConfig);
    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  /**
   * Recursively sort object keys for consistent hashing
   */
  sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const sorted = {};
      Object.keys(obj).sort().forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });
      return sorted;
    }
    return obj;
  }

  /**
   * Get config version by hash
   */
  getVersionByHash(hash) {
    try {
      const row = this.db.db.prepare(
        'SELECT * FROM config_versions WHERE config_hash = ? ORDER BY created_at DESC LIMIT 1'
      ).get(hash);
      return row || null;
    } catch (error) {
      this.logger.error('Failed to query config version', { error: error.message });
      return null;
    }
  }

  /**
   * Get the latest config version
   */
  getLatestVersion() {
    try {
      const row = this.db.db.prepare(
        'SELECT * FROM config_versions ORDER BY created_at DESC LIMIT 1'
      ).get();
      return row || null;
    } catch (error) {
      this.logger.error('Failed to get latest config version', { error: error.message });
      return null;
    }
  }

  /**
   * Create a new config version
   */
  createVersion(hash, config) {
    const now = new Date().toISOString();

    // End the previous active version
    this.db.db.prepare(`
      UPDATE config_versions
      SET active_until = ?
      WHERE active_until IS NULL
    `).run(now);

    // Insert new version
    const result = this.db.db.prepare(`
      INSERT INTO config_versions (config_hash, config_snapshot, created_at, active_from)
      VALUES (?, ?, ?, ?)
    `).run(hash, JSON.stringify(config), now, now);

    return {
      id: result.lastInsertRowid,
      config_hash: hash,
      config_snapshot: JSON.stringify(config),
      created_at: now,
      active_from: now,
      active_until: null,
    };
  }

  /**
   * Log config change to decision_log if table exists
   */
  logConfigChange(version) {
    try {
      // Check if decision_log table exists (it's in TimescaleDB)
      // For now, just log to the application logger
      this.logger.info('CONFIG_CHANGE', {
        event: 'config_version_created',
        version_id: version.id,
        config_hash: version.config_hash,
        timestamp: version.created_at,
      });
    } catch (error) {
      this.logger.warn('Could not log config change to decision_log', { error: error.message });
    }
  }

  /**
   * Get current config version
   */
  getCurrentVersion() {
    return this.currentVersion;
  }

  /**
   * Get current loaded config
   */
  getCurrentConfig() {
    return this.currentConfig;
  }

  /**
   * Get config value by path (e.g., 'settings.trading.default_market')
   */
  getConfigValue(path) {
    if (!this.currentConfig) return null;

    const parts = path.split('.');
    let value = this.currentConfig;

    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }

    return value;
  }

  /**
   * Get all config versions
   */
  getAllVersions(limit = 100) {
    try {
      const rows = this.db.db.prepare(
        'SELECT id, config_hash, created_at, active_from, active_until FROM config_versions ORDER BY created_at DESC LIMIT ?'
      ).all(limit);
      return rows;
    } catch (error) {
      this.logger.error('Failed to get all config versions', { error: error.message });
      return [];
    }
  }

  /**
   * Get version by ID
   */
  getVersionById(id) {
    try {
      const row = this.db.db.prepare('SELECT * FROM config_versions WHERE id = ?').get(id);
      if (row && row.config_snapshot) {
        row.config = JSON.parse(row.config_snapshot);
      }
      return row || null;
    } catch (error) {
      this.logger.error('Failed to get config version by ID', { error: error.message });
      return null;
    }
  }

  /**
   * Compare two config versions
   */
  compareVersions(versionId1, versionId2) {
    const v1 = this.getVersionById(versionId1);
    const v2 = this.getVersionById(versionId2);

    if (!v1 || !v2) {
      return null;
    }

    const config1 = JSON.parse(v1.config_snapshot);
    const config2 = JSON.parse(v2.config_snapshot);

    return {
      version1: { id: v1.id, hash: v1.config_hash, created_at: v1.created_at },
      version2: { id: v2.id, hash: v2.config_hash, created_at: v2.created_at },
      differences: this.findDifferences(config1, config2),
    };
  }

  /**
   * Find differences between two config objects
   */
  findDifferences(obj1, obj2, path = '') {
    const differences = [];

    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        differences.push(...this.findDifferences(val1, val2, currentPath));
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences.push({
          path: currentPath,
          oldValue: val1,
          newValue: val2,
        });
      }
    }

    return differences;
  }
}

export default ConfigVersionManager;
