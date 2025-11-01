/**
 * DATABASE MIGRATION: Pixel Management Enhancements
 *
 * Adds tables for:
 * - SEO issue tracking
 * - Pixel analytics
 * - Pixel health monitoring
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'seo-automation.db');

console.log('🔄 Starting Pixel Management Enhancement Migration...\n');

try {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Start transaction
  db.prepare('BEGIN').run();

  // 1. Create seo_issues table
  console.log('Creating seo_issues table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS seo_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pixel_id INTEGER NOT NULL,
      page_url TEXT NOT NULL,
      issue_id TEXT NOT NULL UNIQUE,
      issue_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      fix_code TEXT,
      impact TEXT,
      estimated_time TEXT,
      current_value TEXT,
      target_value TEXT,
      affected_count INTEGER,
      severity_weight INTEGER,
      severity_color TEXT,
      priority INTEGER,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      status TEXT DEFAULT 'OPEN',
      FOREIGN KEY (pixel_id) REFERENCES pixel_deployments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_seo_issues_pixel ON seo_issues(pixel_id);
    CREATE INDEX IF NOT EXISTS idx_seo_issues_status ON seo_issues(status);
    CREATE INDEX IF NOT EXISTS idx_seo_issues_severity ON seo_issues(severity);
    CREATE INDEX IF NOT EXISTS idx_seo_issues_page ON seo_issues(page_url);
  `);
  console.log('✅ seo_issues table created\n');

  // 2. Create pixel_analytics table
  console.log('Creating pixel_analytics table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS pixel_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pixel_id INTEGER NOT NULL,
      date DATE NOT NULL,
      page_views INTEGER DEFAULT 0,
      unique_pages INTEGER DEFAULT 0,
      avg_seo_score REAL,
      avg_lcp REAL,
      avg_fid REAL,
      avg_cls REAL,
      total_issues INTEGER DEFAULT 0,
      critical_issues INTEGER DEFAULT 0,
      high_issues INTEGER DEFAULT 0,
      medium_issues INTEGER DEFAULT 0,
      low_issues INTEGER DEFAULT 0,
      issues_resolved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pixel_id) REFERENCES pixel_deployments(id) ON DELETE CASCADE,
      UNIQUE(pixel_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_pixel_analytics_pixel ON pixel_analytics(pixel_id);
    CREATE INDEX IF NOT EXISTS idx_pixel_analytics_date ON pixel_analytics(date);
  `);
  console.log('✅ pixel_analytics table created\n');

  // 3. Create pixel_health table
  console.log('Creating pixel_health table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS pixel_health (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pixel_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL CHECK(status IN ('UP', 'DOWN', 'DEGRADED')),
      response_time INTEGER,
      error_rate REAL,
      data_quality_score INTEGER,
      pages_tracked_today INTEGER DEFAULT 0,
      last_error TEXT,
      FOREIGN KEY (pixel_id) REFERENCES pixel_deployments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_pixel_health_pixel ON pixel_health(pixel_id);
    CREATE INDEX IF NOT EXISTS idx_pixel_health_timestamp ON pixel_health(timestamp);
    CREATE INDEX IF NOT EXISTS idx_pixel_health_status ON pixel_health(status);
  `);
  console.log('✅ pixel_health table created\n');

  // 4. Update pixel_page_data table to add issue_summary column
  console.log('Updating pixel_page_data table...');
  const columns = db.pragma('table_info(pixel_page_data)');
  const hasIssueSummary = columns.some(col => col.name === 'issue_summary');

  if (!hasIssueSummary) {
    db.exec(`ALTER TABLE pixel_page_data ADD COLUMN issue_summary TEXT`);
    console.log('✅ Added issue_summary column to pixel_page_data\n');
  } else {
    console.log('⏭️  issue_summary column already exists\n');
  }

  // Commit transaction
  db.prepare('COMMIT').run();

  // Verify tables
  console.log('Verifying tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name IN ('seo_issues', 'pixel_analytics', 'pixel_health')
    ORDER BY name
  `).all();

  console.log(`✅ Found ${tables.length} tables:`);
  tables.forEach(t => console.log(`   - ${t.name}`));

  // Get row counts
  console.log('\nTable statistics:');
  const seoIssuesCount = db.prepare('SELECT COUNT(*) as count FROM seo_issues').get();
  const analyticsCount = db.prepare('SELECT COUNT(*) as count FROM pixel_analytics').get();
  const healthCount = db.prepare('SELECT COUNT(*) as count FROM pixel_health').get();

  console.log(`   - seo_issues: ${seoIssuesCount.count} rows`);
  console.log(`   - pixel_analytics: ${analyticsCount.count} rows`);
  console.log(`   - pixel_health: ${healthCount.count} rows`);

  db.close();

  console.log('\n✅ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Restart the dashboard service');
  console.log('2. Test the new endpoints');
  console.log('3. Verify issue detection is working\n');

  process.exit(0);

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
