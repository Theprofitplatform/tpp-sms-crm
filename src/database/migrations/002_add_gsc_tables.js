/**
 * Migration: Add Google Search Console Tables
 * Adds support for GSC data integration and traffic-based prioritization
 *
 * Run: node src/database/migrations/002_add_gsc_tables.js up
 * Rollback: node src/database/migrations/002_add_gsc_tables.js down
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function up(db) {
  console.log('Running migration: 002_add_gsc_tables');

  // GSC Properties (verified sites)
  db.exec(`
    CREATE TABLE IF NOT EXISTS gsc_properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      -- Identification
      client_id TEXT NOT NULL,
      property_url TEXT NOT NULL,
      property_type TEXT DEFAULT 'URL_PREFIX',

      -- Verification
      verification_method TEXT,
      verified BOOLEAN DEFAULT 0,
      verified_at DATETIME,

      -- Sync tracking
      last_sync DATETIME,
      last_sync_status TEXT,
      last_sync_error TEXT,
      sync_frequency TEXT DEFAULT 'daily',

      -- OAuth tokens (encrypted)
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at DATETIME,

      -- Metadata
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      UNIQUE(client_id, property_url)
    );
  `);
  console.log('  ✓ Created table: gsc_properties');

  // GSC Search Analytics (clicks, impressions, CTR, position)
  db.exec(`
    CREATE TABLE IF NOT EXISTS gsc_search_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      property_id INTEGER NOT NULL,

      -- Page & Query
      page_url TEXT NOT NULL,
      query TEXT,

      -- Metrics
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0.0,
      position REAL DEFAULT 0.0,

      -- Dimensions
      device TEXT,
      country TEXT,
      search_appearance TEXT,

      -- Time
      date DATE NOT NULL,

      -- Metadata
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (property_id) REFERENCES gsc_properties(id) ON DELETE CASCADE,
      UNIQUE(property_id, page_url, query, date, device)
    );
  `);
  console.log('  ✓ Created table: gsc_search_analytics');

  // Indexes for search_analytics (optimized for queries)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_gsc_analytics_property
      ON gsc_search_analytics(property_id);

    CREATE INDEX IF NOT EXISTS idx_gsc_analytics_page
      ON gsc_search_analytics(page_url);

    CREATE INDEX IF NOT EXISTS idx_gsc_analytics_date
      ON gsc_search_analytics(date DESC);

    CREATE INDEX IF NOT EXISTS idx_gsc_analytics_clicks
      ON gsc_search_analytics(clicks DESC);

    CREATE INDEX IF NOT EXISTS idx_gsc_analytics_property_page
      ON gsc_search_analytics(property_id, page_url, date DESC);
  `);
  console.log('  ✓ Created indexes on gsc_search_analytics');

  // GSC URL Issues (coverage, mobile usability, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS gsc_url_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      property_id INTEGER NOT NULL,

      -- URL & Issue
      page_url TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      issue_category TEXT,
      severity TEXT DEFAULT 'medium',

      -- Details
      issue_description TEXT,
      recommended_fix TEXT,

      -- Status
      status TEXT DEFAULT 'active',
      detected_at DATETIME NOT NULL,
      resolved_at DATETIME,

      -- Metadata
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (property_id) REFERENCES gsc_properties(id) ON DELETE CASCADE
    );
  `);
  console.log('  ✓ Created table: gsc_url_issues');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_gsc_issues_property
      ON gsc_url_issues(property_id);

    CREATE INDEX IF NOT EXISTS idx_gsc_issues_page
      ON gsc_url_issues(page_url);

    CREATE INDEX IF NOT EXISTS idx_gsc_issues_status
      ON gsc_url_issues(status);
  `);
  console.log('  ✓ Created indexes on gsc_url_issues');

  // GSC Page Performance Summary (aggregated metrics per page)
  db.exec(`
    CREATE TABLE IF NOT EXISTS gsc_page_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      property_id INTEGER NOT NULL,
      page_url TEXT NOT NULL,

      -- 7-day metrics
      clicks_7d INTEGER DEFAULT 0,
      impressions_7d INTEGER DEFAULT 0,
      ctr_7d REAL DEFAULT 0.0,
      position_7d REAL DEFAULT 0.0,

      -- 30-day metrics
      clicks_30d INTEGER DEFAULT 0,
      impressions_30d INTEGER DEFAULT 0,
      ctr_30d REAL DEFAULT 0.0,
      position_30d REAL DEFAULT 0.0,

      -- 90-day metrics
      clicks_90d INTEGER DEFAULT 0,
      impressions_90d INTEGER DEFAULT 0,
      ctr_90d REAL DEFAULT 0.0,
      position_90d REAL DEFAULT 0.0,

      -- Trends (vs previous period)
      clicks_trend TEXT,
      impressions_trend TEXT,
      position_trend TEXT,

      -- Rankings
      top_queries TEXT,
      avg_query_position REAL,

      -- Metadata
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (property_id) REFERENCES gsc_properties(id) ON DELETE CASCADE,
      UNIQUE(property_id, page_url)
    );
  `);
  console.log('  ✓ Created table: gsc_page_performance');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_gsc_performance_property
      ON gsc_page_performance(property_id);

    CREATE INDEX IF NOT EXISTS idx_gsc_performance_clicks
      ON gsc_page_performance(clicks_30d DESC);
  `);
  console.log('  ✓ Created indexes on gsc_page_performance');

  // Link proposals to GSC data for impact tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposal_gsc_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      proposal_id INTEGER NOT NULL,

      -- Before metrics (at detection time)
      before_clicks_7d INTEGER,
      before_impressions_7d INTEGER,
      before_ctr_7d REAL,
      before_position_7d REAL,

      -- After metrics (post-application)
      after_clicks_7d INTEGER,
      after_impressions_7d INTEGER,
      after_ctr_7d REAL,
      after_position_7d REAL,

      -- Impact calculation
      clicks_change INTEGER,
      impressions_change INTEGER,
      ctr_change REAL,
      position_change REAL,

      -- Priority score (based on traffic)
      priority_score INTEGER DEFAULT 50,
      traffic_potential TEXT,

      -- Timestamps
      before_date DATE,
      after_date DATE,
      measured_at DATETIME,

      FOREIGN KEY (proposal_id) REFERENCES autofix_proposals(id) ON DELETE CASCADE
    );
  `);
  console.log('  ✓ Created table: proposal_gsc_data');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_proposal_gsc_proposal
      ON proposal_gsc_data(proposal_id);

    CREATE INDEX IF NOT EXISTS idx_proposal_gsc_priority
      ON proposal_gsc_data(priority_score DESC);
  `);
  console.log('  ✓ Created indexes on proposal_gsc_data');

  console.log('✅ Migration complete: All GSC tables and indexes created');
}

export function down(db) {
  console.log('Rolling back migration: 002_add_gsc_tables');

  db.exec(`DROP INDEX IF EXISTS idx_proposal_gsc_proposal`);
  db.exec(`DROP INDEX IF EXISTS idx_proposal_gsc_priority`);
  db.exec(`DROP TABLE IF EXISTS proposal_gsc_data`);
  console.log('  ✓ Dropped table: proposal_gsc_data');

  db.exec(`DROP INDEX IF EXISTS idx_gsc_performance_property`);
  db.exec(`DROP INDEX IF EXISTS idx_gsc_performance_clicks`);
  db.exec(`DROP TABLE IF EXISTS gsc_page_performance`);
  console.log('  ✓ Dropped table: gsc_page_performance');

  db.exec(`DROP INDEX IF EXISTS idx_gsc_issues_property`);
  db.exec(`DROP INDEX IF EXISTS idx_gsc_issues_page`);
  db.exec(`DROP INDEX IF EXISTS idx_gsc_issues_status`);
  db.exec(`DROP TABLE IF EXISTS gsc_url_issues`);
  console.log('  ✓ Dropped table: gsc_url_issues');

  db.exec(`DROP INDEX IF EXISTS idx_gsc_analytics_property`);
  db.exec(`DROP INDEX IF EXISTS idx_gsc_analytics_page`);
  db.exec(`DROP INDEX IF EXISTS idx_gsc_analytics_date`);
  db.exec(`DROP INDEX IF EXISTS idx_gsc_analytics_clicks`);
  db.exec(`DROP INDEX IF EXISTS idx_gsc_analytics_property_page`);
  db.exec(`DROP TABLE IF EXISTS gsc_search_analytics`);
  console.log('  ✓ Dropped table: gsc_search_analytics');

  db.exec(`DROP TABLE IF EXISTS gsc_properties`);
  console.log('  ✓ Dropped table: gsc_properties');

  console.log('✅ Rollback complete');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = path.join(__dirname, '../../..', 'data', 'seo-automation.db');

  console.log(`Database path: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const command = process.argv[2] || 'up';

  try {
    if (command === 'up') {
      up(db);
    } else if (command === 'down') {
      down(db);
    } else {
      console.error('Usage: node 002_add_gsc_tables.js [up|down]');
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}
