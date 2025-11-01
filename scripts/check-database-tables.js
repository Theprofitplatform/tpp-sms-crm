/**
 * Check which database tables exist and their row counts
 */

import database from '../src/database/index.js';
const db = database.db;

console.log('📊 Database Tables Analysis\n');
console.log('='.repeat(70));

try {
  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`\nTotal tables: ${tables.length}\n`);

  const tablesWithData = [];
  const emptyTables = [];

  // Check each table
  tables.forEach((table, idx) => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    const hasData = count.count > 0;

    if (hasData) {
      tablesWithData.push({ name: table.name, count: count.count });
      console.log(`${(idx + 1).toString().padStart(3)}. ✅ ${table.name.padEnd(40)} ${count.count} rows`);
    } else {
      emptyTables.push(table.name);
      console.log(`${(idx + 1).toString().padStart(3)}. ⬜ ${table.name.padEnd(40)} 0 rows`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log(`\n📈 Summary:`);
  console.log(`   Total tables: ${tables.length}`);
  console.log(`   Tables with data: ${tablesWithData.length} (${Math.round(tablesWithData.length / tables.length * 100)}%)`);
  console.log(`   Empty tables: ${emptyTables.length} (${Math.round(emptyTables.length / tables.length * 100)}%)`);

  console.log(`\n📝 Empty tables:`);
  emptyTables.forEach((name, idx) => {
    console.log(`   ${idx + 1}. ${name}`);
  });

  console.log(`\n✅ Tables with data:`);
  tablesWithData.slice(0, 10).forEach((t, idx) => {
    console.log(`   ${idx + 1}. ${t.name} (${t.count} rows)`);
  });

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
