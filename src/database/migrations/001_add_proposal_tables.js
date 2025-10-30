/**
 * Migration: Add Auto-Fix Proposal Tables
 * Adds support for manual review workflow
 * 
 * Run: node src/database/migrations/001_add_proposal_tables.js up
 * Rollback: node src/database/migrations/001_add_proposal_tables.js down
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function up(db) {
  console.log('Running migration: 001_add_proposal_tables');

  // Main proposals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS autofix_proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- Identification
      proposal_group_id TEXT NOT NULL,
      engine_id TEXT NOT NULL,
      engine_name TEXT NOT NULL,
      client_id TEXT NOT NULL,
      
      -- Status tracking
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      applied_at DATETIME,
      expires_at DATETIME,
      
      -- Review metadata
      reviewed_by TEXT,
      review_notes TEXT,
      
      -- Priority & categorization
      priority INTEGER DEFAULT 50,
      severity TEXT DEFAULT 'medium',
      category TEXT,
      impact_score INTEGER DEFAULT 50,
      
      -- Target information
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_title TEXT,
      target_url TEXT,
      field_name TEXT NOT NULL,
      
      -- Change details
      before_value TEXT,
      after_value TEXT,
      diff_html TEXT,
      
      -- Context & description
      issue_description TEXT,
      fix_description TEXT,
      expected_benefit TEXT,
      
      -- Risk assessment
      risk_level TEXT DEFAULT 'low',
      reversible BOOLEAN DEFAULT 1,
      backup_id INTEGER,
      
      -- Application results
      applied_success BOOLEAN,
      applied_error TEXT,
      
      -- Additional data
      metadata TEXT,
      
      FOREIGN KEY (backup_id) REFERENCES auto_fix_actions(id)
    );
  `);

  console.log('  ✓ Created table: autofix_proposals');

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_proposals_status 
      ON autofix_proposals(status);
    
    CREATE INDEX IF NOT EXISTS idx_proposals_group 
      ON autofix_proposals(proposal_group_id);
    
    CREATE INDEX IF NOT EXISTS idx_proposals_client 
      ON autofix_proposals(client_id, status);
    
    CREATE INDEX IF NOT EXISTS idx_proposals_engine 
      ON autofix_proposals(engine_id, status);
    
    CREATE INDEX IF NOT EXISTS idx_proposals_created 
      ON autofix_proposals(created_at);
    
    CREATE INDEX IF NOT EXISTS idx_proposals_expires 
      ON autofix_proposals(expires_at)
      WHERE status = 'pending';
  `);

  console.log('  ✓ Created indexes on autofix_proposals');

  // Review sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS autofix_review_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      proposal_group_id TEXT NOT NULL UNIQUE,
      client_id TEXT NOT NULL,
      engine_id TEXT NOT NULL,
      engine_name TEXT NOT NULL,
      
      -- Counts
      total_proposals INTEGER DEFAULT 0,
      approved_count INTEGER DEFAULT 0,
      rejected_count INTEGER DEFAULT 0,
      applied_count INTEGER DEFAULT 0,
      
      -- Timing
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      completed_at DATETIME,
      
      -- Review metadata
      reviewed_by TEXT,
      session_notes TEXT,
      auto_approved BOOLEAN DEFAULT 0,
      
      -- Status
      status TEXT DEFAULT 'pending',
      
      -- Additional data
      metadata TEXT
    );
  `);

  console.log('  ✓ Created table: autofix_review_sessions');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_review_sessions_client 
      ON autofix_review_sessions(client_id, status);
    
    CREATE INDEX IF NOT EXISTS idx_review_sessions_started 
      ON autofix_review_sessions(started_at DESC);
  `);

  console.log('  ✓ Created indexes on autofix_review_sessions');

  // Settings table for auto-review configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS autofix_review_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      engine_id TEXT NOT NULL,
      settings TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, engine_id)
    );
  `);

  console.log('  ✓ Created table: autofix_review_settings');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_review_settings_client 
      ON autofix_review_settings(client_id);
  `);

  console.log('  ✓ Created indexes on autofix_review_settings');

  // Proposal templates for auto-approval patterns
  db.exec(`
    CREATE TABLE IF NOT EXISTS autofix_approval_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      client_id TEXT NOT NULL,
      engine_id TEXT NOT NULL,
      
      -- Pattern matching
      field_name TEXT,
      pattern_type TEXT,
      pattern_regex TEXT,
      
      -- Auto-approve criteria
      max_risk_level TEXT DEFAULT 'low',
      auto_approve BOOLEAN DEFAULT 1,
      
      -- Stats
      times_used INTEGER DEFAULT 0,
      success_rate REAL DEFAULT 100.0,
      
      -- Metadata
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      
      description TEXT,
      metadata TEXT
    );
  `);

  console.log('  ✓ Created table: autofix_approval_templates');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_approval_templates_client_engine 
      ON autofix_approval_templates(client_id, engine_id);
  `);

  console.log('  ✓ Created indexes on autofix_approval_templates');

  console.log('✅ Migration complete: All tables and indexes created');
}

export function down(db) {
  console.log('Rolling back migration: 001_add_proposal_tables');
  
  db.exec(`DROP INDEX IF EXISTS idx_approval_templates_client_engine`);
  db.exec(`DROP TABLE IF EXISTS autofix_approval_templates`);
  console.log('  ✓ Dropped table: autofix_approval_templates');
  
  db.exec(`DROP INDEX IF EXISTS idx_review_settings_client`);
  db.exec(`DROP TABLE IF EXISTS autofix_review_settings`);
  console.log('  ✓ Dropped table: autofix_review_settings');
  
  db.exec(`DROP INDEX IF EXISTS idx_review_sessions_client`);
  db.exec(`DROP INDEX IF EXISTS idx_review_sessions_started`);
  db.exec(`DROP TABLE IF EXISTS autofix_review_sessions`);
  console.log('  ✓ Dropped table: autofix_review_sessions');
  
  db.exec(`DROP INDEX IF EXISTS idx_proposals_status`);
  db.exec(`DROP INDEX IF EXISTS idx_proposals_group`);
  db.exec(`DROP INDEX IF EXISTS idx_proposals_client`);
  db.exec(`DROP INDEX IF EXISTS idx_proposals_engine`);
  db.exec(`DROP INDEX IF EXISTS idx_proposals_created`);
  db.exec(`DROP INDEX IF EXISTS idx_proposals_expires`);
  db.exec(`DROP TABLE IF EXISTS autofix_proposals`);
  console.log('  ✓ Dropped table: autofix_proposals');
  
  console.log('✅ Rollback complete');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = path.join(__dirname, '../../..', 'data', 'seo-automation.db');
  
  console.log(`Database path: ${dbPath}`);
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  const command = process.argv[2] || 'up';
  
  try {
    if (command === 'up') {
      up(db);
    } else if (command === 'down') {
      down(db);
    } else {
      console.error('Usage: node 001_add_proposal_tables.js [up|down]');
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}
