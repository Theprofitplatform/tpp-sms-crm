import Database from 'better-sqlite3';

const db = new Database('./data/seo-automation.db');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scraper_settings (
      id TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Scraper settings table created');
  db.close();
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
