/**
 * Show database schema for all tables
 */

import database from '../src/database/index.js';
const db = database.db;

const tablesToCheck = [
  'local_seo_scores',
  'auto_fix_actions',
  'client_goals',
  'competitor_rankings',
  'competitor_alerts',
  'keyword_performance',
  'page_performance',
  'recommendations',
  'optimization_history',
  'analytics_cache',
  'webhooks'
];

console.log('📋 Database Schema\n');

tablesToCheck.forEach(table => {
  try {
    const schema = db.prepare(`PRAGMA table_info(${table})`).all();
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Table: ${table}`);
    console.log(`${'='.repeat(70)}`);

    if (schema.length === 0) {
      console.log('   ❌ Table not found');
    } else {
      schema.forEach(col => {
        console.log(`   ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });
    }
  } catch (error) {
    console.log(`\n❌ Error checking ${table}: ${error.message}`);
  }
});
