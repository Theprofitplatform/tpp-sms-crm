/**
 * Add Position Tracking Tables
 * 
 * Extends the existing SQLite database with SerpBear-inspired position tracking
 * 
 * New tables:
 * - domains: Track multiple domains/clients for SEO monitoring
 * - keywords: Store keywords with position history
 * - serp_results: Historical SERP data for each keyword
 * - scraper_settings: Configuration for scraper APIs
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

// Ensure database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found. Please run the main application first.');
  process.exit(1);
}

const db = new Database(DB_PATH);

const POSITION_TRACKING_SCHEMA = `
-- Domains for position tracking
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description TEXT,
  tags TEXT, -- JSON array
  keyword_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT 1,
  notification BOOLEAN DEFAULT 1,
  notification_interval TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'never'
  notification_emails TEXT, -- JSON array
  search_console TEXT, -- JSON object for GSC config
  ga_property TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_scrape_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_domains_active ON domains(active);
CREATE INDEX IF NOT EXISTS idx_domains_updated ON domains(updated_at);

-- Keywords with position tracking
CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  device TEXT DEFAULT 'desktop', -- 'desktop', 'mobile'
  country TEXT DEFAULT 'US',
  city TEXT,
  lat_long TEXT,
  position INTEGER DEFAULT 0,
  position_history TEXT DEFAULT '[]', -- JSON array: [{date, position, url}]
  url TEXT, -- Current ranking URL
  last_result TEXT, -- JSON object with full SERP data
  sticky BOOLEAN DEFAULT 1, -- Keep tracking even if not found
  updating BOOLEAN DEFAULT 0, -- Currently being updated
  last_update_error TEXT,
  search_volume INTEGER DEFAULT 0,
  cpc REAL DEFAULT 0.0,
  trend_data TEXT, -- JSON array for volume trends
  tags TEXT DEFAULT '[]', -- JSON array
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_tracked_at DATETIME,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_keywords_domain ON keywords(domain_id);
CREATE INDEX IF NOT EXISTS idx_keywords_domain_position ON keywords(domain_id, position);
CREATE INDEX IF NOT EXISTS idx_keywords_updated ON keywords(updated_at);
CREATE INDEX IF NOT EXISTS idx_keywords_tracked ON keywords(last_tracked_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_unique ON keywords(domain_id, keyword, device, country);

-- SERP results snapshots
CREATE TABLE IF NOT EXISTS serp_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  has_featured_snippet BOOLEAN DEFAULT 0,
  has_knowledge_panel BOOLEAN DEFAULT 0,
  has_local_pack BOOLEAN DEFAULT 0,
  has_ads BOOLEAN DEFAULT 0,
  ads_count INTEGER DEFAULT 0,
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_serp_keyword ON serp_results(keyword_id);
CREATE INDEX IF NOT EXISTS idx_serp_captured ON serp_results(captured_at);

-- Scraper settings and API keys
CREATE TABLE IF NOT EXISTS scraper_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scraper_name TEXT NOT NULL UNIQUE, -- 'scrapingant', 'serpapi', 'proxy', etc.
  enabled BOOLEAN DEFAULT 1,
  api_key TEXT,
  api_credits_remaining INTEGER,
  priority INTEGER DEFAULT 10, -- Lower = higher priority
  success_rate REAL DEFAULT 1.0,
  last_used_at DATETIME,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  config TEXT, -- JSON object for additional config
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scraper_enabled ON scraper_settings(enabled, priority);

-- Position change notifications queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL, -- 'position_change', 'daily_summary', 'weekly_summary'
  recipients TEXT NOT NULL, -- JSON array of email addresses
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  scheduled_for DATETIME,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification_queue(status, scheduled_for);
`;

try {
  console.log('📊 Adding position tracking tables...');
  
  db.exec(POSITION_TRACKING_SCHEMA);
  
  console.log('✅ Position tracking tables created successfully!');
  console.log('\nTables added:');
  console.log('  - domains (for multi-domain tracking)');
  console.log('  - keywords (position history tracking)');
  console.log('  - serp_results (SERP data snapshots)');
  console.log('  - scraper_settings (API configuration)');
  console.log('  - notification_queue (email alerts)');
  console.log('\nYou can now use the position tracking API endpoints.');
  
} catch (error) {
  console.error('❌ Error adding tables:', error.message);
  process.exit(1);
} finally {
  db.close();
}
