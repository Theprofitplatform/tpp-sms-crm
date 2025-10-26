/**
 * Keyword Sync Service
 * Bidirectional sync between SerpBear, Keyword Service, and Unified Database
 *
 * @module keyword-sync-service
 */

const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');

class KeywordSyncService {
  constructor(config = {}) {
    this.config = {
      syncInterval: config.syncInterval || '*/5 * * * *', // Every 5 minutes
      serpbearDbPath: config.serpbearDbPath || './serpbear/data/serpbear.db',
      keywordServiceDbPath: config.keywordServiceDbPath || './keyword-service/keywords.db',
      unifiedDbPath: config.unifiedDbPath || './database/unified-keywords.db',
      batchSize: config.batchSize || 100,
      ...config
    };

    this.syncJob = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSynced: 0,
      totalErrors: 0,
      lastError: null
    };
  }

  /**
   * Initialize the sync service
   */
  async init() {
    console.log('🔄 Initializing Keyword Sync Service...');

    try {
      // Connect to all databases
      this.unifiedDb = await this.connectDatabase(this.config.unifiedDbPath);
      this.serpbearDb = await this.connectDatabase(this.config.serpbearDbPath);
      this.keywordServiceDb = await this.connectDatabase(this.config.keywordServiceDbPath);

      console.log('✅ Connected to all databases');

      // Initialize sync status table
      await this.initializeSyncStatus();

      console.log('✅ Keyword Sync Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize sync service:', error);
      throw error;
    }
  }

  /**
   * Connect to a SQLite database
   */
  connectDatabase(dbPath) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
          // Database might not exist yet, that's okay
          console.warn(`⚠️  Database not found: ${dbPath}`);
          resolve(null);
        } else {
          console.log(`✅ Connected to ${dbPath}`);
          resolve(db);
        }
      });
    });
  }

  /**
   * Initialize sync status tracking
   */
  async initializeSyncStatus() {
    const syncConfigs = [
      {
        source_system: 'serpbear',
        source_table: 'keyword',
        target_table: 'unified_keywords'
      },
      {
        source_system: 'keyword_service',
        source_table: 'keywords',
        target_table: 'unified_keywords'
      },
      {
        source_system: 'serpbear',
        source_table: 'domain',
        target_table: 'domains'
      },
      {
        source_system: 'keyword_service',
        source_table: 'projects',
        target_table: 'research_projects'
      }
    ];

    for (const config of syncConfigs) {
      await this.runQuery(this.unifiedDb, `
        INSERT OR IGNORE INTO sync_status (source_system, source_table, target_table)
        VALUES (?, ?, ?)
      `, [config.source_system, config.source_table, config.target_table]);
    }
  }

  /**
   * Start automatic sync cron job
   */
  startAutoSync() {
    if (this.syncJob) {
      console.log('⚠️  Sync job already running');
      return;
    }

    console.log(`🔄 Starting auto-sync (${this.config.syncInterval})`);

    this.syncJob = cron.schedule(this.config.syncInterval, async () => {
      await this.syncAll();
    });

    // Run initial sync
    this.syncAll();
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncJob) {
      this.syncJob.stop();
      this.syncJob = null;
      console.log('⏹️  Auto-sync stopped');
    }
  }

  /**
   * Sync all data sources
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    console.log('🔄 Starting full sync...');

    try {
      // Sync in order: domains first, then projects, then keywords
      await this.syncDomains();
      await this.syncProjects();
      await this.syncKeywords();

      this.lastSyncTime = new Date();
      const duration = Date.now() - startTime;

      console.log(`✅ Sync completed in ${duration}ms`);

      return {
        success: true,
        duration,
        stats: this.syncStats
      };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.syncStats.totalErrors++;
      this.syncStats.lastError = error.message;

      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync domains from SerpBear to unified database
   */
  async syncDomains() {
    if (!this.serpbearDb) {
      console.log('⏭️  Skipping domains sync (SerpBear DB not available)');
      return;
    }

    console.log('📊 Syncing domains...');

    try {
      await this.updateSyncStatus('serpbear', 'domain', 'domains', 'in_progress');

      // Get all domains from SerpBear
      const serpbearDomains = await this.runQuery(this.serpbearDb, `
        SELECT * FROM domain
      `);

      let synced = 0;
      let failed = 0;

      for (const domain of serpbearDomains) {
        try {
          // Insert or update in unified database
          await this.runQuery(this.unifiedDb, `
            INSERT INTO domains (
              domain, slug, display_name, keyword_count,
              notification, notification_interval, notification_emails,
              search_console, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(domain) DO UPDATE SET
              keyword_count = excluded.keyword_count,
              notification = excluded.notification,
              notification_interval = excluded.notification_interval,
              updated_at = CURRENT_TIMESTAMP
          `, [
            domain.domain,
            domain.slug,
            domain.domain, // Use domain as display_name
            domain.keywordCount || 0,
            domain.notification ? 1 : 0,
            domain.notification_interval || 'daily',
            domain.notification_emails,
            JSON.stringify(domain.search_console || {}),
            new Date().toISOString()
          ]);

          synced++;
        } catch (error) {
          console.error(`❌ Failed to sync domain ${domain.domain}:`, error.message);
          failed++;
        }
      }

      await this.updateSyncStatus('serpbear', 'domain', 'domains', 'completed', {
        records_synced: synced,
        records_failed: failed,
        records_total: serpbearDomains.length
      });

      console.log(`✅ Synced ${synced}/${serpbearDomains.length} domains`);
      this.syncStats.totalSynced += synced;

    } catch (error) {
      await this.updateSyncStatus('serpbear', 'domain', 'domains', 'error', {
        last_error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync research projects from Keyword Service to unified database
   */
  async syncProjects() {
    if (!this.keywordServiceDb) {
      console.log('⏭️  Skipping projects sync (Keyword Service DB not available)');
      return;
    }

    console.log('📊 Syncing research projects...');

    try {
      await this.updateSyncStatus('keyword_service', 'projects', 'research_projects', 'in_progress');

      const projects = await this.runQuery(this.keywordServiceDb, `
        SELECT * FROM projects
      `);

      let synced = 0;
      let failed = 0;

      for (const project of projects) {
        try {
          await this.runQuery(this.unifiedDb, `
            INSERT INTO research_projects (
              id, name, business_url, seed_terms, geo, language,
              competitors, content_focus, status, last_checkpoint,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              status = excluded.status,
              last_checkpoint = excluded.last_checkpoint,
              updated_at = CURRENT_TIMESTAMP
          `, [
            project.id,
            project.name,
            project.business_url,
            project.seed_terms,
            project.geo || 'US',
            project.language || 'en',
            project.competitors,
            project.content_focus,
            project.status || 'draft',
            project.last_checkpoint,
            project.created_at,
            new Date().toISOString()
          ]);

          synced++;
        } catch (error) {
          console.error(`❌ Failed to sync project ${project.id}:`, error.message);
          failed++;
        }
      }

      await this.updateSyncStatus('keyword_service', 'projects', 'research_projects', 'completed', {
        records_synced: synced,
        records_failed: failed,
        records_total: projects.length
      });

      console.log(`✅ Synced ${synced}/${projects.length} projects`);
      this.syncStats.totalSynced += synced;

    } catch (error) {
      await this.updateSyncStatus('keyword_service', 'projects', 'research_projects', 'error', {
        last_error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync keywords from both sources to unified database
   */
  async syncKeywords() {
    console.log('📊 Syncing keywords...');

    // Sync from SerpBear (position tracking data)
    if (this.serpbearDb) {
      await this.syncKeywordsFromSerpBear();
    }

    // Sync from Keyword Service (research data)
    if (this.keywordServiceDb) {
      await this.syncKeywordsFromKeywordService();
    }
  }

  /**
   * Sync keywords from SerpBear
   */
  async syncKeywordsFromSerpBear() {
    console.log('📊 Syncing keywords from SerpBear...');

    try {
      await this.updateSyncStatus('serpbear', 'keyword', 'unified_keywords', 'in_progress');

      const keywords = await this.runQuery(this.serpbearDb, `
        SELECT k.*, d.domain as domain_name
        FROM keyword k
        LEFT JOIN domain d ON k.domain = d.domain
      `);

      let synced = 0;
      let failed = 0;

      for (const kw of keywords) {
        try {
          // Find domain_id in unified database
          const domain = await this.runQuery(this.unifiedDb, `
            SELECT id FROM domains WHERE domain = ?
          `, [kw.domain_name]);

          const domain_id = domain[0]?.id || null;

          await this.runQuery(this.unifiedDb, `
            INSERT INTO unified_keywords (
              keyword, domain_id, device, country, city,
              position, position_history, url, last_result,
              search_volume, sticky, updating, last_tracked_at,
              last_update_error, tags, source, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              position = excluded.position,
              position_history = excluded.position_history,
              url = excluded.url,
              last_result = excluded.last_result,
              last_tracked_at = excluded.last_tracked_at,
              updating = excluded.updating,
              updated_at = CURRENT_TIMESTAMP
            WHERE keyword = excluded.keyword AND domain_id = excluded.domain_id
          `, [
            kw.keyword,
            domain_id,
            kw.device || 'desktop',
            kw.country || 'US',
            kw.city,
            kw.position || 0,
            kw.history || '[]',
            kw.url,
            kw.lastResult || '[]',
            kw.volume || 0,
            kw.sticky ? 1 : 0,
            kw.updating ? 1 : 0,
            kw.lastUpdated,
            kw.lastUpdateError,
            kw.tags || '[]',
            'serpbear',
            kw.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]);

          synced++;
        } catch (error) {
          console.error(`❌ Failed to sync keyword ${kw.keyword}:`, error.message);
          failed++;
        }
      }

      await this.updateSyncStatus('serpbear', 'keyword', 'unified_keywords', 'completed', {
        records_synced: synced,
        records_failed: failed,
        records_total: keywords.length
      });

      console.log(`✅ Synced ${synced}/${keywords.length} keywords from SerpBear`);
      this.syncStats.totalSynced += synced;

    } catch (error) {
      await this.updateSyncStatus('serpbear', 'keyword', 'unified_keywords', 'error', {
        last_error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync keywords from Keyword Service
   */
  async syncKeywordsFromKeywordService() {
    console.log('📊 Syncing keywords from Keyword Service...');

    try {
      const keywords = await this.runQuery(this.keywordServiceDb, `
        SELECT * FROM keywords
      `);

      let synced = 0;
      let failed = 0;

      for (const kw of keywords) {
        try {
          await this.runQuery(this.unifiedDb, `
            INSERT INTO unified_keywords (
              keyword, lemma, research_project_id, topic_id, page_group_id,
              search_volume, cpc, intent, entities,
              difficulty, difficulty_serp_strength, difficulty_competition,
              difficulty_serp_crowding, difficulty_content_depth,
              traffic_potential, opportunity_score,
              serp_features, ads_count, ads_density,
              trend_direction, trend_data,
              source, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(keyword, research_project_id) DO UPDATE SET
              search_volume = excluded.search_volume,
              difficulty = excluded.difficulty,
              opportunity_score = excluded.opportunity_score,
              intent = excluded.intent,
              traffic_potential = excluded.traffic_potential,
              updated_at = CURRENT_TIMESTAMP
          `, [
            kw.text,
            kw.lemma,
            kw.project_id,
            kw.topic_id,
            kw.page_group_id,
            kw.volume || 0,
            kw.cpc || 0,
            kw.intent,
            kw.entities,
            kw.difficulty || 0,
            kw.difficulty_serp_strength,
            kw.difficulty_competition,
            kw.difficulty_serp_crowding,
            kw.difficulty_content_depth,
            kw.traffic_potential || 0,
            kw.opportunity || 0,
            kw.serp_features,
            kw.ads_count || 0,
            kw.ads_density || 0,
            kw.trend_direction,
            kw.trend_data,
            kw.source || 'keyword_service',
            kw.created_at || new Date().toISOString(),
            new Date().toISOString()
          ]);

          synced++;
        } catch (error) {
          console.error(`❌ Failed to sync keyword ${kw.text}:`, error.message);
          failed++;
        }
      }

      console.log(`✅ Synced ${synced}/${keywords.length} keywords from Keyword Service`);
      this.syncStats.totalSynced += synced;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Update sync status in database
   */
  async updateSyncStatus(sourceSystem, sourceTable, targetTable, status, stats = {}) {
    const updates = {
      status,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...stats
    };

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), sourceSystem, sourceTable, targetTable];

    await this.runQuery(this.unifiedDb, `
      UPDATE sync_status
      SET ${setClause}
      WHERE source_system = ? AND source_table = ? AND target_table = ?
    `, values);
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const status = await this.runQuery(this.unifiedDb, `
      SELECT * FROM sync_status ORDER BY last_sync_at DESC
    `);

    return {
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
      stats: this.syncStats,
      details: status
    };
  }

  /**
   * Run a database query (promisified)
   */
  runQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!db) {
        return resolve([]);
      }

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Close all database connections
   */
  async close() {
    const promises = [];

    if (this.unifiedDb) {
      promises.push(new Promise((resolve) => this.unifiedDb.close(resolve)));
    }
    if (this.serpbearDb) {
      promises.push(new Promise((resolve) => this.serpbearDb.close(resolve)));
    }
    if (this.keywordServiceDb) {
      promises.push(new Promise((resolve) => this.keywordServiceDb.close(resolve)));
    }

    await Promise.all(promises);
    console.log('🔌 All database connections closed');
  }
}

module.exports = KeywordSyncService;
