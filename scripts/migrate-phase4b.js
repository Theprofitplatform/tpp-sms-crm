#!/usr/bin/env node
/**
 * Phase 4B Database Migration
 *
 * Adds tables and columns for:
 * - Recommendations sync (link pixel issues to recommendations)
 * - AutoFix proposals (track auto-fix attempts)
 * - Notification log (track pixel notifications)
 *
 * Date: November 2, 2025
 * Phase: 4B - High-Value Integrations
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../data/seo-automation.db');

console.log('🗄️  Phase 4B Database Migration');
console.log('=' .repeat(50));
console.log(`Database: ${dbPath}\n`);

try {
  // Open database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  console.log('📋 Step 1: Adding columns to existing tables...\n');

  // Add columns to seo_issues table
  try {
    db.exec(`
      ALTER TABLE seo_issues ADD COLUMN recommendation_id INTEGER;
    `);
    console.log('✅ Added recommendation_id to seo_issues');
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('⏭️  Column recommendation_id already exists in seo_issues');
    } else {
      throw err;
    }
  }

  try {
    db.exec(`
      ALTER TABLE seo_issues ADD COLUMN autofix_status TEXT DEFAULT 'NOT_FIXABLE';
    `);
    console.log('✅ Added autofix_status to seo_issues');
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('⏭️  Column autofix_status already exists in seo_issues');
    } else {
      throw err;
    }
  }

  // Add columns to recommendations table
  // Check if recommendations table exists
  const recommendationsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='recommendations'
  `).get();

  if (recommendationsTableExists) {
    try {
      db.exec(`
        ALTER TABLE recommendations ADD COLUMN source_type TEXT;
      `);
      console.log('✅ Added source_type to recommendations');
    } catch (err) {
      if (err.message.includes('duplicate column')) {
        console.log('⏭️  Column source_type already exists in recommendations');
      } else {
        throw err;
      }
    }

    try {
      db.exec(`
        ALTER TABLE recommendations ADD COLUMN source_id TEXT;
      `);
      console.log('✅ Added source_id to recommendations');
    } catch (err) {
      if (err.message.includes('duplicate column')) {
        console.log('⏭️  Column source_id already exists in recommendations');
      } else {
        throw err;
      }
    }

    try {
      db.exec(`
        ALTER TABLE recommendations ADD COLUMN fix_code TEXT;
      `);
      console.log('✅ Added fix_code to recommendations');
    } catch (err) {
      if (err.message.includes('duplicate column')) {
        console.log('⏭️  Column fix_code already exists in recommendations');
      } else {
        throw err;
      }
    }
  } else {
    console.log('⚠️  Recommendations table does not exist - will create basic structure');

    db.exec(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        category TEXT NOT NULL DEFAULT 'GENERAL',
        status TEXT NOT NULL DEFAULT 'PENDING',
        estimated_time INTEGER,
        source_type TEXT,
        source_id TEXT,
        fix_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );
    `);
    console.log('✅ Created recommendations table with Phase 4B columns');
  }

  console.log('\n📋 Step 2: Creating new tables...\n');

  // Create autofix_proposals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS autofix_proposals (
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
  console.log('✅ Created autofix_proposals table');

  // Create notification_log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      client_id TEXT,
      user_id TEXT,
      pixel_id INTEGER,
      data TEXT,
      channels TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME,
      action_url TEXT
    );
  `);
  console.log('✅ Created notification_log table');

  console.log('\n📋 Step 3: Creating indexes...\n');

  // Create indexes for better query performance
  const indexes = [
    {
      name: 'idx_seo_issues_recommendation',
      sql: 'CREATE INDEX IF NOT EXISTS idx_seo_issues_recommendation ON seo_issues(recommendation_id)'
    },
    {
      name: 'idx_seo_issues_autofix_status',
      sql: 'CREATE INDEX IF NOT EXISTS idx_seo_issues_autofix_status ON seo_issues(autofix_status)'
    },
    {
      name: 'idx_recommendations_source',
      sql: 'CREATE INDEX IF NOT EXISTS idx_recommendations_source ON recommendations(source_type, source_id)'
    },
    {
      name: 'idx_autofix_proposals_issue',
      sql: 'CREATE INDEX IF NOT EXISTS idx_autofix_proposals_issue ON autofix_proposals(issue_id)'
    },
    {
      name: 'idx_autofix_proposals_status',
      sql: 'CREATE INDEX IF NOT EXISTS idx_autofix_proposals_status ON autofix_proposals(status)'
    },
    {
      name: 'idx_notification_log_client',
      sql: 'CREATE INDEX IF NOT EXISTS idx_notification_log_client ON notification_log(client_id)'
    },
    {
      name: 'idx_notification_log_pixel',
      sql: 'CREATE INDEX IF NOT EXISTS idx_notification_log_pixel ON notification_log(pixel_id)'
    },
    {
      name: 'idx_notification_log_type',
      sql: 'CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(type)'
    },
    {
      name: 'idx_notification_log_read',
      sql: 'CREATE INDEX IF NOT EXISTS idx_notification_log_read ON notification_log(read_at)'
    }
  ];

  for (const index of indexes) {
    try {
      db.exec(index.sql);
      console.log(`✅ Created ${index.name}`);
    } catch (err) {
      console.log(`⏭️  Index ${index.name} already exists or error:`, err.message);
    }
  }

  console.log('\n📋 Step 4: Verifying tables and columns...\n');

  // Verify seo_issues columns
  const seoIssuesInfo = db.pragma('table_info(seo_issues)');
  const hasRecommendationId = seoIssuesInfo.some(col => col.name === 'recommendation_id');
  const hasAutofixStatus = seoIssuesInfo.some(col => col.name === 'autofix_status');
  console.log(`seo_issues.recommendation_id: ${hasRecommendationId ? '✅' : '❌'}`);
  console.log(`seo_issues.autofix_status: ${hasAutofixStatus ? '✅' : '❌'}`);

  // Verify recommendations columns (if table exists)
  if (recommendationsTableExists) {
    const recommendationsInfo = db.pragma('table_info(recommendations)');
    const hasSourceType = recommendationsInfo.some(col => col.name === 'source_type');
    const hasSourceId = recommendationsInfo.some(col => col.name === 'source_id');
    const hasFixCode = recommendationsInfo.some(col => col.name === 'fix_code');
    console.log(`recommendations.source_type: ${hasSourceType ? '✅' : '❌'}`);
    console.log(`recommendations.source_id: ${hasSourceId ? '✅' : '❌'}`);
    console.log(`recommendations.fix_code: ${hasFixCode ? '✅' : '❌'}`);
  }

  // Verify new tables
  const autofixTable = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='autofix_proposals'
  `).get();
  console.log(`autofix_proposals table: ${autofixTable ? '✅' : '❌'}`);

  const notificationTable = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='notification_log'
  `).get();
  console.log(`notification_log table: ${notificationTable ? '✅' : '❌'}`);

  console.log('\n📋 Step 5: Gathering statistics...\n');

  // Get table counts
  const seoIssuesCount = db.prepare('SELECT COUNT(*) as count FROM seo_issues').get();
  console.log(`seo_issues rows: ${seoIssuesCount.count}`);

  if (recommendationsTableExists) {
    const recommendationsCount = db.prepare('SELECT COUNT(*) as count FROM recommendations').get();
    console.log(`recommendations rows: ${recommendationsCount.count}`);
  }

  const autofixCount = db.prepare('SELECT COUNT(*) as count FROM autofix_proposals').get();
  console.log(`autofix_proposals rows: ${autofixCount.count}`);

  const notificationCount = db.prepare('SELECT COUNT(*) as count FROM notification_log').get();
  console.log(`notification_log rows: ${notificationCount.count}`);

  // Close database
  db.close();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Phase 4B Migration Complete!');
  console.log('=' + '='.repeat(50));
  console.log('\n📝 Summary:');
  console.log('  • Added columns to seo_issues (recommendation_id, autofix_status)');
  if (recommendationsTableExists) {
    console.log('  • Added columns to recommendations (source_type, source_id, fix_code)');
  } else {
    console.log('  • Created recommendations table with Phase 4B columns');
  }
  console.log('  • Created autofix_proposals table');
  console.log('  • Created notification_log table');
  console.log('  • Created 9 indexes for performance');
  console.log('\n✅ Database ready for Phase 4B features!\n');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
