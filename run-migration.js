// Database Migration Runner
// Applies the enhancement tables migration

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'seo-automation.db');
const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', 'add-enhancement-tables.sql');

console.log('🗄️  Running database migration...');
console.log('Database:', dbPath);
console.log('Migration:', migrationPath);

try {
  // Open database
  const db = new Database(dbPath);

  // Read migration SQL
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log(`\nExecuting migration SQL...`);

  try {
    // Execute the entire migration file at once
    db.exec(migrationSQL);
    console.log('✓ All SQL statements executed successfully');
  } catch (error) {
    console.error('✗ Error executing migration:', error.message);
    throw error;
  }

  // Verify new tables were created
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`\n📊 Total tables in database: ${tables.length}`);

  // Check for new tables
  const newTables = [
    'analytics_cache',
    'client_goals',
    'recommendations',
    'webhooks',
    'webhook_logs',
    'report_templates',
    'integrations'
  ];

  console.log('\n🔍 Checking new tables:');
  for (const tableName of newTables) {
    const exists = tables.find(t => t.name === tableName);
    if (exists) {
      console.log(`  ✅ ${tableName}`);
    } else {
      console.log(`  ❌ ${tableName} - NOT FOUND`);
    }
  }

  db.close();
  console.log('\n✅ Migration completed successfully!');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}
