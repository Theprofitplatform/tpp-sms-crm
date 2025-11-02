import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'seo-automation.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

console.log('All tables in database:');
tables.forEach(t => {
  console.log(`  - ${t.name}`);
});

console.log('\nChecking for Phase 4B tables:');
console.log(`  autofix_proposals: ${tables.some(t => t.name === 'autofix_proposals') ? '✅' : '❌'}`);
console.log(`  notification_log: ${tables.some(t => t.name === 'notification_log') ? '✅' : '❌'}`);
console.log(`  recommendations: ${tables.some(t => t.name === 'recommendations') ? '✅' : '❌'}`);

// Check autofix_proposals schema
if (tables.some(t => t.name === 'autofix_proposals')) {
  console.log('\nautofix_proposals columns:');
  const columns = db.pragma('table_info(autofix_proposals)');
  columns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });
}

db.close();
