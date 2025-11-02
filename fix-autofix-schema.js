/**
 * Fix autofix_proposals schema
 * Drop old table and create Phase 4B version
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'seo-automation.db');

console.log('🔧 Fixing autofix_proposals schema...\n');

try {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Check row count first
  const count = db.prepare('SELECT COUNT(*) as count FROM autofix_proposals').get();
  console.log(`Current autofix_proposals rows: ${count.count}`);

  if (count.count > 0) {
    console.log('⚠️  Table has data! Backing up first...');
    db.exec(`CREATE TABLE autofix_proposals_backup AS SELECT * FROM autofix_proposals`);
    console.log('✅ Backup created: autofix_proposals_backup');
  }

  // Drop the old table
  console.log('\n📌 Dropping old autofix_proposals table...');
  db.exec(`DROP TABLE IF EXISTS autofix_proposals`);
  console.log('✅ Old table dropped');

  // Create new Phase 4B schema
  console.log('\n📌 Creating Phase 4B autofix_proposals table...');
  db.exec(`
    CREATE TABLE autofix_proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      engine_name TEXT NOT NULL,
      fix_code TEXT NOT NULL,
      confidence REAL NOT NULL,
      requires_review INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      applied_at DATETIME,
      reviewed_by TEXT,
      error_message TEXT,
      metadata TEXT,
      FOREIGN KEY (issue_id) REFERENCES seo_issues(id) ON DELETE CASCADE
    );
  `);
  console.log('✅ New table created');

  // Create indexes
  console.log('\n📌 Creating indexes...');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_autofix_proposals_issue ON autofix_proposals(issue_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_autofix_proposals_status ON autofix_proposals(status)`);
  console.log('✅ Indexes created');

  // Verify
  console.log('\n📌 Verifying schema...');
  const columns = db.pragma('table_info(autofix_proposals)');
  console.log('\nColumns:');
  columns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });

  db.close();

  console.log('\n✅ autofix_proposals schema fixed!\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
