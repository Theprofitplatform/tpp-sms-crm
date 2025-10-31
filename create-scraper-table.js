import Database from 'better-sqlite3';

const db = new Database('./data/seo-automation.db');

try {
  db.exec(`
    DROP TABLE IF EXISTS scraper_settings;
    
    CREATE TABLE scraper_settings (
      scraper_name TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      api_key TEXT,
      priority INTEGER DEFAULT 10,
      config TEXT,
      last_used_at DATETIME,
      success_rate REAL DEFAULT 1.0,
      error_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Scraper settings table created with all columns');
  db.close();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
