# Auto-Fix Manual Review - Comprehensive Implementation Guide

**Project Goal**: Add manual review capability to auto-fix system before changes are applied to websites

**Estimated Timeline**: 3-4 weeks  
**Complexity**: Medium-High  
**Risk Level**: Low (backward compatible)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [File Structure](#file-structure)
3. [Phase 1: Database Foundation](#phase-1-database-foundation)
4. [Phase 2: Service Layer](#phase-2-service-layer)
5. [Phase 3: API Endpoints](#phase-3-api-endpoints)
6. [Phase 4: Engine Refactoring](#phase-4-engine-refactoring)
7. [Phase 5: Dashboard UI](#phase-5-dashboard-ui)
8. [Phase 6: Integration & Testing](#phase-6-integration--testing)
9. [Deployment Checklist](#deployment-checklist)

---

## Quick Start

### Prerequisites

```bash
# Ensure dependencies are installed
npm install

# Verify database is accessible
node -e "import('./src/database/index.js').then(db => console.log('DB OK'))"

# Check current auto-fix engines
node auto-fix-all-upgraded.js --dry-run
```

### Development Order

1. ✅ **Week 1**: Database + Service Layer (Foundation)
2. ✅ **Week 2**: API Endpoints + Base Engine Class
3. ✅ **Week 3**: Dashboard UI Components
4. ✅ **Week 4**: Engine Refactoring + Testing

---

## File Structure

### New Files to Create

```
src/
├── database/
│   └── migrations/
│       └── 001_add_proposal_tables.js          [NEW]
├── services/
│   ├── proposal-service.js                      [NEW]
│   ├── proposal-diff-generator.js               [NEW]
│   └── autofix-engine-base.js                   [NEW]
├── api/
│   └── autofix-review-routes.js                 [NEW]
└── automation/
    └── auto-fixers/
        └── engine-base.js                       [NEW]

dashboard/src/
├── pages/
│   ├── AutoFixReviewPage.jsx                    [NEW]
│   └── ProposalDetailPage.jsx                   [NEW]
├── components/
│   ├── ProposalCard.jsx                         [NEW]
│   ├── ProposalDiffViewer.jsx                   [NEW]
│   ├── BulkReviewActions.jsx                    [NEW]
│   └── ProposalFilters.jsx                      [NEW]
└── services/
    └── api.js                                   [UPDATE]
```

### Files to Modify

```
src/
├── database/
│   └── index.js                                 [UPDATE - Add new tables]
├── services/
│   ├── auto-fix-history.js                      [UPDATE - Add proposal methods]
│   └── autofix-queue.js                         [UPDATE - Support two-phase]
└── automation/
    └── auto-fixers/
        ├── nap-fixer.js                         [UPDATE - Extend base class]
        ├── content-optimizer.js                 [UPDATE - Extend base class]
        └── title-meta-optimizer.js              [UPDATE - Extend base class]

dashboard/src/
├── pages/
│   └── AutoFixPage.jsx                          [UPDATE - Add review mode]
└── App.jsx                                      [UPDATE - Add new routes]
```

---

## Phase 1: Database Foundation

**Duration**: 2 days  
**Files**: 2 new, 1 updated

### Task 1.1: Create Migration Script

**File**: `src/database/migrations/001_add_proposal_tables.js`

```javascript
/**
 * Migration: Add Auto-Fix Proposal Tables
 * Adds support for manual review workflow
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
    
    CREATE INDEX IF NOT EXISTS idx_review_sessions_client 
      ON autofix_review_sessions(client_id, status);
    
    CREATE INDEX IF NOT EXISTS idx_review_sessions_started 
      ON autofix_review_sessions(started_at DESC);
  `);

  // Settings table for auto-review configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS autofix_review_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      setting_key TEXT NOT NULL,
      setting_value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, setting_key)
    );
    
    CREATE INDEX IF NOT EXISTS idx_review_settings_client 
      ON autofix_review_settings(client_id);
  `);

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
    
    CREATE INDEX IF NOT EXISTS idx_approval_templates_client_engine 
      ON autofix_approval_templates(client_id, engine_id);
  `);

  console.log('✅ Migration complete: Tables created');
}

export function down(db) {
  console.log('Rolling back migration: 001_add_proposal_tables');
  
  db.exec(`DROP TABLE IF EXISTS autofix_approval_templates`);
  db.exec(`DROP TABLE IF EXISTS autofix_review_settings`);
  db.exec(`DROP TABLE IF EXISTS autofix_review_sessions`);
  db.exec(`DROP TABLE IF EXISTS autofix_proposals`);
  
  console.log('✅ Rollback complete');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = path.join(__dirname, '../../..', 'data', 'seo-automation.db');
  const db = new Database(dbPath);
  
  const command = process.argv[2] || 'up';
  
  if (command === 'up') {
    up(db);
  } else if (command === 'down') {
    down(db);
  } else {
    console.error('Usage: node 001_add_proposal_tables.js [up|down]');
    process.exit(1);
  }
  
  db.close();
}
```

### Task 1.2: Run Migration

```bash
# Run migration
node src/database/migrations/001_add_proposal_tables.js up

# Verify tables created
sqlite3 data/seo-automation.db ".tables" | grep proposal
```

### Task 1.3: Update Database Index

**File**: `src/database/index.js` (Add after existing schema)

```javascript
// ADD TO EXISTING SCHEMA SECTION (around line 400)

// Auto-Fix Proposals (Manual Review System)
CREATE TABLE IF NOT EXISTS autofix_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_group_id TEXT NOT NULL,
  engine_id TEXT NOT NULL,
  engine_name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  applied_at DATETIME,
  expires_at DATETIME,
  reviewed_by TEXT,
  review_notes TEXT,
  priority INTEGER DEFAULT 50,
  severity TEXT DEFAULT 'medium',
  category TEXT,
  impact_score INTEGER DEFAULT 50,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_title TEXT,
  target_url TEXT,
  field_name TEXT NOT NULL,
  before_value TEXT,
  after_value TEXT,
  diff_html TEXT,
  issue_description TEXT,
  fix_description TEXT,
  expected_benefit TEXT,
  risk_level TEXT DEFAULT 'low',
  reversible BOOLEAN DEFAULT 1,
  backup_id INTEGER,
  applied_success BOOLEAN,
  applied_error TEXT,
  metadata TEXT,
  FOREIGN KEY (backup_id) REFERENCES auto_fix_actions(id)
);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON autofix_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_group ON autofix_proposals(proposal_group_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON autofix_proposals(client_id, status);

CREATE TABLE IF NOT EXISTS autofix_review_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_group_id TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  engine_id TEXT NOT NULL,
  engine_name TEXT NOT NULL,
  total_proposals INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  applied_count INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  completed_at DATETIME,
  reviewed_by TEXT,
  session_notes TEXT,
  auto_approved BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'pending',
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_review_sessions_client ON autofix_review_sessions(client_id, status);

CREATE TABLE IF NOT EXISTS autofix_review_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, setting_key)
);

CREATE TABLE IF NOT EXISTS autofix_approval_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  engine_id TEXT NOT NULL,
  field_name TEXT,
  pattern_type TEXT,
  pattern_regex TEXT,
  max_risk_level TEXT DEFAULT 'low',
  auto_approve BOOLEAN DEFAULT 1,
  times_used INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 100.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  description TEXT,
  metadata TEXT
);
```

### Task 1.4: Add Database Helper Methods

**File**: `src/database/index.js` (Add to exports at bottom)

```javascript
// ADD THESE METHODS TO THE DATABASE CLASS/EXPORTS

/**
 * Get proposals with filters
 */
function getProposals(filters = {}) {
  let query = `
    SELECT p.*, s.engine_name as session_engine_name
    FROM autofix_proposals p
    LEFT JOIN autofix_review_sessions s ON p.proposal_group_id = s.proposal_group_id
    WHERE 1=1
  `;
  const params = [];

  if (filters.clientId) {
    query += ' AND p.client_id = ?';
    params.push(filters.clientId);
  }

  if (filters.status) {
    query += ' AND p.status = ?';
    params.push(filters.status);
  }

  if (filters.engineId) {
    query += ' AND p.engine_id = ?';
    params.push(filters.engineId);
  }

  if (filters.groupId) {
    query += ' AND p.proposal_group_id = ?';
    params.push(filters.groupId);
  }

  if (filters.severity) {
    query += ' AND p.severity = ?';
    params.push(filters.severity);
  }

  if (filters.riskLevel) {
    query += ' AND p.risk_level = ?';
    params.push(filters.riskLevel);
  }

  query += ' ORDER BY p.created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Get proposal by ID
 */
function getProposalById(id) {
  const stmt = db.prepare('SELECT * FROM autofix_proposals WHERE id = ?');
  return stmt.get(id);
}

/**
 * Create review session
 */
function createReviewSession(data) {
  const stmt = db.prepare(`
    INSERT INTO autofix_review_sessions (
      proposal_group_id, client_id, engine_id, engine_name,
      total_proposals, metadata
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.groupId,
    data.clientId,
    data.engineId,
    data.engineName,
    data.totalProposals,
    JSON.stringify(data.metadata || {})
  );

  return result.lastInsertRowid;
}

/**
 * Update review session
 */
function updateReviewSession(groupId, updates) {
  const setClauses = [];
  const params = [];

  if (updates.approved_count !== undefined) {
    setClauses.push('approved_count = ?');
    params.push(updates.approved_count);
  }

  if (updates.rejected_count !== undefined) {
    setClauses.push('rejected_count = ?');
    params.push(updates.rejected_count);
  }

  if (updates.applied_count !== undefined) {
    setClauses.push('applied_count = ?');
    params.push(updates.applied_count);
  }

  if (updates.status) {
    setClauses.push('status = ?');
    params.push(updates.status);
  }

  if (updates.reviewed_by) {
    setClauses.push('reviewed_by = ?');
    params.push(updates.reviewed_by);
  }

  if (updates.reviewed_at) {
    setClauses.push('reviewed_at = ?');
    params.push(updates.reviewed_at);
  }

  if (updates.completed_at) {
    setClauses.push('completed_at = ?');
    params.push(updates.completed_at);
  }

  params.push(groupId);

  const stmt = db.prepare(`
    UPDATE autofix_review_sessions
    SET ${setClauses.join(', ')}
    WHERE proposal_group_id = ?
  `);

  return stmt.run(...params);
}

/**
 * Get review session
 */
function getReviewSession(groupId) {
  const stmt = db.prepare(`
    SELECT * FROM autofix_review_sessions
    WHERE proposal_group_id = ?
  `);
  return stmt.get(groupId);
}

// Export new functions
export default {
  db,
  // ... existing exports ...
  getProposals,
  getProposalById,
  createReviewSession,
  updateReviewSession,
  getReviewSession
};
```

**✅ Phase 1 Checkpoint**: Run migration and verify tables exist

---

## Phase 2: Service Layer

**Duration**: 3 days  
**Files**: 3 new, 1 updated

### Task 2.1: Create Proposal Service

**File**: `src/services/proposal-service.js`

```javascript
/**
 * Proposal Service
 * Manages auto-fix proposals for manual review workflow
 */

import db from '../database/index.js';

export class ProposalService {
  /**
   * Save proposals to database
   */
  async saveProposals(proposals) {
    const stmt = db.db.prepare(`
      INSERT INTO autofix_proposals (
        proposal_group_id, engine_id, engine_name, client_id,
        target_type, target_id, target_title, target_url, field_name,
        before_value, after_value, diff_html,
        issue_description, fix_description, expected_benefit,
        severity, risk_level, category, impact_score, priority,
        metadata, expires_at, reversible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.db.transaction((proposalList) => {
      const results = [];
      for (const p of proposalList) {
        const result = stmt.run(
          p.proposal_group_id,
          p.engine_id,
          p.engine_name,
          p.client_id,
          p.target_type,
          p.target_id,
          p.target_title || '',
          p.target_url || '',
          p.field_name,
          p.before_value || '',
          p.after_value || '',
          p.diff_html || null,
          p.issue_description || '',
          p.fix_description || '',
          p.expected_benefit || '',
          p.severity || 'medium',
          p.risk_level || 'low',
          p.category || 'general',
          p.impact_score || 50,
          p.priority || 50,
          JSON.stringify(p.metadata || {}),
          p.expires_at || this.getExpirationDate(),
          p.reversible !== undefined ? p.reversible : 1
        );
        results.push(result.lastInsertRowid);
      }
      return results;
    });

    return insertMany(proposals);
  }

  /**
   * Get proposals with filters
   */
  getProposals(filters = {}) {
    return db.getProposals(filters);
  }

  /**
   * Get proposal by ID
   */
  getProposalById(id) {
    return db.getProposalById(id);
  }

  /**
   * Get proposals by group
   */
  getProposalsByGroup(groupId) {
    return db.getProposals({ groupId });
  }

  /**
   * Review a single proposal
   */
  reviewProposal(proposalId, review) {
    const { action, notes, reviewedBy } = review;
    const status = action === 'approve' ? 'approved' : 'rejected';

    const stmt = db.db.prepare(`
      UPDATE autofix_proposals
      SET status = ?,
          reviewed_at = ?,
          reviewed_by = ?,
          review_notes = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      status,
      new Date().toISOString(),
      reviewedBy || 'system',
      notes || '',
      proposalId
    );

    // Update session counts
    const proposal = this.getProposalById(proposalId);
    if (proposal) {
      this.updateSessionCounts(proposal.proposal_group_id);
    }

    return { success: true, proposalId, status };
  }

  /**
   * Bulk review proposals
   */
  bulkReview(proposalIds, review) {
    const { action, notes, reviewedBy } = review;
    const status = action === 'approve' ? 'approved' : 'rejected';

    const stmt = db.db.prepare(`
      UPDATE autofix_proposals
      SET status = ?,
          reviewed_at = ?,
          reviewed_by = ?,
          review_notes = ?
      WHERE id = ?
    `);

    const updateMany = db.db.transaction((ids) => {
      const results = [];
      for (const id of ids) {
        stmt.run(
          status,
          new Date().toISOString(),
          reviewedBy || 'system',
          notes || '',
          id
        );
        results.push(id);
      }
      return results;
    });

    const updated = updateMany(proposalIds);

    // Update session counts for affected groups
    const groupIds = new Set();
    proposalIds.forEach(id => {
      const proposal = this.getProposalById(id);
      if (proposal) {
        groupIds.add(proposal.proposal_group_id);
      }
    });

    groupIds.forEach(groupId => {
      this.updateSessionCounts(groupId);
    });

    return { success: true, updated: updated.length };
  }

  /**
   * Mark proposal as applied
   */
  markProposalApplied(proposalId, result = {}) {
    const stmt = db.db.prepare(`
      UPDATE autofix_proposals
      SET status = 'applied',
          applied_at = ?,
          applied_success = ?,
          applied_error = ?
      WHERE id = ?
    `);

    stmt.run(
      new Date().toISOString(),
      result.success ? 1 : 0,
      result.error || null,
      proposalId
    );

    // Update session
    const proposal = this.getProposalById(proposalId);
    if (proposal) {
      this.updateSessionCounts(proposal.proposal_group_id);
    }
  }

  /**
   * Auto-approve proposals based on criteria
   */
  autoApprove(groupId, criteria = {}) {
    const {
      maxRiskLevel = 'low',
      minImpactScore = 0,
      engineWhitelist = []
    } = criteria;

    let query = `
      UPDATE autofix_proposals
      SET status = 'approved',
          reviewed_at = ?,
          reviewed_by = 'auto-system'
      WHERE proposal_group_id = ?
        AND status = 'pending'
        AND risk_level = ?
        AND impact_score >= ?
    `;

    const params = [
      new Date().toISOString(),
      groupId,
      maxRiskLevel,
      minImpactScore
    ];

    if (engineWhitelist.length > 0) {
      query += ` AND engine_id IN (${engineWhitelist.map(() => '?').join(',')})`;
      params.push(...engineWhitelist);
    }

    const stmt = db.db.prepare(query);
    const result = stmt.run(...params);

    // Update session
    this.updateSessionCounts(groupId);

    return { approved: result.changes };
  }

  /**
   * Get group summary
   */
  getGroupSummary(groupId) {
    const stmt = db.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        engine_id,
        engine_name,
        client_id,
        MIN(created_at) as created_at
      FROM autofix_proposals
      WHERE proposal_group_id = ?
      GROUP BY engine_id, engine_name, client_id
    `);

    return stmt.get(groupId);
  }

  /**
   * Update session counts
   */
  updateSessionCounts(groupId) {
    const summary = this.getGroupSummary(groupId);

    if (!summary) return;

    db.updateReviewSession(groupId, {
      approved_count: summary.approved,
      rejected_count: summary.rejected,
      applied_count: summary.applied
    });
  }

  /**
   * Create review session
   */
  createReviewSession(data) {
    return db.createReviewSession(data);
  }

  /**
   * Get review session
   */
  getReviewSession(groupId) {
    return db.getReviewSession(groupId);
  }

  /**
   * Get expiration date (7 days from now)
   */
  getExpirationDate() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    return expiry.toISOString();
  }

  /**
   * Expire old pending proposals
   */
  expireOldProposals() {
    const stmt = db.db.prepare(`
      UPDATE autofix_proposals
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at < datetime('now')
    `);

    const result = stmt.run();
    return { expired: result.changes };
  }

  /**
   * Get statistics
   */
  getStatistics(clientId = null) {
    let query = `
      SELECT
        COUNT(*) as total_proposals,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        AVG(CASE WHEN status IN ('approved', 'applied') THEN 1.0 ELSE 0.0 END) * 100 as approval_rate
      FROM autofix_proposals
    `;

    if (clientId) {
      query += ' WHERE client_id = ?';
      const stmt = db.db.prepare(query);
      return stmt.get(clientId);
    } else {
      const stmt = db.db.prepare(query);
      return stmt.get();
    }
  }
}

export const proposalService = new ProposalService();
export default proposalService;
```

### Task 2.2: Create Diff Generator

**File**: `src/services/proposal-diff-generator.js`

```javascript
/**
 * Proposal Diff Generator
 * Creates visual diffs for proposal before/after values
 */

import { diffWords, diffChars, diffLines } from 'diff';

export class ProposalDiffGenerator {
  /**
   * Generate HTML diff
   */
  generateDiff(before, after, type = 'auto') {
    // Auto-detect best diff method
    if (type === 'auto') {
      if (this.isMultiline(before) || this.isMultiline(after)) {
        type = 'lines';
      } else if (before.length > 100 || after.length > 100) {
        type = 'words';
      } else {
        type = 'chars';
      }
    }

    let diff;
    switch (type) {
      case 'lines':
        diff = diffLines(before, after);
        break;
      case 'words':
        diff = diffWords(before, after);
        break;
      case 'chars':
        diff = diffChars(before, after);
        break;
      default:
        diff = diffWords(before, after);
    }

    return this.diffToHTML(diff);
  }

  /**
   * Convert diff to HTML
   */
  diffToHTML(diff) {
    const html = diff.map(part => {
      const escapedValue = this.escapeHTML(part.value);
      
      if (part.added) {
        return `<span class="diff-added" style="background-color: #d4edda; color: #155724;">${escapedValue}</span>`;
      } else if (part.removed) {
        return `<span class="diff-removed" style="background-color: #f8d7da; color: #721c24; text-decoration: line-through;">${escapedValue}</span>`;
      } else {
        return `<span class="diff-unchanged" style="color: #6c757d;">${escapedValue}</span>`;
      }
    }).join('');

    return html;
  }

  /**
   * Generate side-by-side diff
   */
  generateSideBySideDiff(before, after) {
    const diff = diffLines(before, after);
    
    const leftLines = [];
    const rightLines = [];

    diff.forEach(part => {
      const lines = part.value.split('\n');
      lines.forEach((line, i) => {
        // Skip last empty line
        if (i === lines.length - 1 && line === '') return;

        if (part.removed) {
          leftLines.push({
            content: line,
            type: 'removed'
          });
        } else if (part.added) {
          rightLines.push({
            content: line,
            type: 'added'
          });
        } else {
          leftLines.push({
            content: line,
            type: 'unchanged'
          });
          rightLines.push({
            content: line,
            type: 'unchanged'
          });
        }
      });
    });

    return { leftLines, rightLines };
  }

  /**
   * Generate diff statistics
   */
  generateDiffStats(before, after) {
    const diff = diffWords(before, after);
    
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diff.forEach(part => {
      const wordCount = part.value.split(/\s+/).filter(w => w.length > 0).length;
      
      if (part.added) {
        added += wordCount;
      } else if (part.removed) {
        removed += wordCount;
      } else {
        unchanged += wordCount;
      }
    });

    const total = added + removed + unchanged;
    const changePercent = total > 0 ? ((added + removed) / total * 100).toFixed(1) : 0;

    return {
      added,
      removed,
      unchanged,
      total,
      changePercent: parseFloat(changePercent)
    };
  }

  /**
   * Check if text is multiline
   */
  isMultiline(text) {
    return text.includes('\n') || text.length > 200;
  }

  /**
   * Escape HTML
   */
  escapeHTML(text) {
    const div = { textContent: text };
    return div.textContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate compact summary
   */
  generateSummary(before, after) {
    const stats = this.generateDiffStats(before, after);
    
    if (stats.changePercent < 10) {
      return 'Minor changes';
    } else if (stats.changePercent < 50) {
      return 'Moderate changes';
    } else {
      return 'Major changes';
    }
  }
}

export const diffGenerator = new ProposalDiffGenerator();
export default diffGenerator;
```

### Task 2.3: Create Base Engine Class

**File**: `src/automation/auto-fixers/engine-base.js`

```javascript
/**
 * Auto-Fix Engine Base Class
 * Provides two-phase execution: detect and apply
 */

import { proposalService } from '../../services/proposal-service.js';
import { diffGenerator } from '../../services/proposal-diff-generator.js';

export class AutoFixEngineBase {
  constructor(config) {
    this.config = config;
    this.clientId = config.id || config.clientId;
    this.mode = 'detect'; // 'detect' or 'apply'
    this.engineId = this.constructor.name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
    this.engineName = this.constructor.name;
  }

  /**
   * Run in detect mode: Find issues and create proposals
   */
  async runDetection(options = {}) {
    console.log(`\n🔍 [${this.engineName}] Running detection for ${this.clientId}...`);
    
    const startTime = Date.now();
    const groupId = `${this.engineId}-${this.clientId}-${Date.now()}`;

    try {
      // Step 1: Detect issues (implemented by subclass)
      const issues = await this.detectIssues(options);
      console.log(`   Found ${issues.length} issues`);

      if (issues.length === 0) {
        return {
          success: true,
          detected: 0,
          proposals: 0,
          groupId: null
        };
      }

      // Step 2: Create proposals
      const proposals = await this.createProposals(issues, groupId);
      console.log(`   Created ${proposals.length} proposals`);

      // Step 3: Generate diffs
      proposals.forEach(proposal => {
        if (proposal.before_value && proposal.after_value) {
          proposal.diff_html = diffGenerator.generateDiff(
            proposal.before_value,
            proposal.after_value
          );
        }
      });

      // Step 4: Save to database
      await proposalService.saveProposals(proposals);

      // Step 5: Create review session
      const sessionId = proposalService.createReviewSession({
        groupId,
        clientId: this.clientId,
        engineId: this.engineId,
        engineName: this.engineName,
        totalProposals: proposals.length,
        metadata: {
          detectionTime: Date.now() - startTime,
          options
        }
      });

      console.log(`   ✅ Detection complete (Session ID: ${sessionId})`);

      return {
        success: true,
        detected: issues.length,
        proposals: proposals.length,
        groupId,
        sessionId
      };

    } catch (error) {
      console.error(`   ❌ Detection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run in apply mode: Apply approved proposals
   */
  async runApplication(groupId, options = {}) {
    console.log(`\n⚡ [${this.engineName}] Applying approved proposals (Group: ${groupId})...`);
    
    const startTime = Date.now();

    try {
      // Get approved proposals
      const approvedProposals = proposalService.getProposals({
        groupId,
        status: 'approved'
      });

      console.log(`   Found ${approvedProposals.length} approved proposals`);

      if (approvedProposals.length === 0) {
        return {
          success: true,
          total: 0,
          succeeded: 0,
          failed: 0,
          results: []
        };
      }

      const results = [];

      // Apply each proposal
      for (const proposal of approvedProposals) {
        try {
          console.log(`   Applying: ${proposal.fix_description}`);
          
          const result = await this.applyFix(proposal, options);
          
          proposalService.markProposalApplied(proposal.id, {
            success: true,
            result
          });

          results.push({
            success: true,
            proposalId: proposal.id,
            target: proposal.target_title
          });

          console.log(`   ✅ Applied successfully`);

        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
          
          proposalService.markProposalApplied(proposal.id, {
            success: false,
            error: error.message
          });

          results.push({
            success: false,
            proposalId: proposal.id,
            target: proposal.target_title,
            error: error.message
          });
        }
      }

      // Update session
      const session = proposalService.getReviewSession(groupId);
      if (session) {
        proposalService.updateSessionCounts(groupId);
      }

      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`\n   ✅ Application complete: ${succeeded} succeeded, ${failed} failed`);
      console.log(`   Duration: ${Math.round((Date.now() - startTime) / 1000)}s`);

      return {
        success: true,
        total: approvedProposals.length,
        succeeded,
        failed,
        results,
        duration: Date.now() - startTime
      };

    } catch (error) {
      console.error(`   ❌ Application failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create proposals from issues
   * Can be overridden by subclasses for custom logic
   */
  async createProposals(issues, groupId) {
    return issues.map(issue => ({
      proposal_group_id: groupId,
      engine_id: this.engineId,
      engine_name: this.engineName,
      client_id: this.clientId,
      
      target_type: issue.target_type || 'post',
      target_id: issue.target_id,
      target_title: issue.target_title,
      target_url: issue.target_url,
      field_name: issue.field_name,
      
      before_value: issue.before_value,
      after_value: issue.after_value,
      
      issue_description: issue.issue_description,
      fix_description: issue.fix_description,
      expected_benefit: issue.expected_benefit,
      
      severity: issue.severity || 'medium',
      risk_level: issue.risk_level || 'low',
      category: issue.category || this.getCategory(),
      impact_score: issue.impact_score || 50,
      priority: issue.priority || 50,
      
      reversible: issue.reversible !== undefined ? issue.reversible : true,
      
      metadata: issue.metadata || {}
    }));
  }

  /**
   * Get engine category (override in subclass)
   */
  getCategory() {
    return 'general';
  }

  /**
   * Abstract method: Detect issues
   * Must be implemented by subclasses
   */
  async detectIssues(options) {
    throw new Error(`${this.engineName}.detectIssues() must be implemented`);
  }

  /**
   * Abstract method: Apply a single fix
   * Must be implemented by subclasses
   */
  async applyFix(proposal, options) {
    throw new Error(`${this.engineName}.applyFix() must be implemented`);
  }

  /**
   * Legacy method: Run with auto-detect mode
   */
  async run(options = {}) {
    const reviewMode = options.reviewMode !== undefined
      ? options.reviewMode
      : true; // Default to review mode

    if (reviewMode) {
      // New flow: detect only
      return await this.runDetection(options);
    } else {
      // Legacy flow: detect + apply immediately
      const detectionResult = await this.runDetection(options);
      
      if (detectionResult.proposals > 0) {
        // Auto-approve all
        proposalService.bulkReview(
          proposalService.getProposals({
            groupId: detectionResult.groupId,
            status: 'pending'
          }).map(p => p.id),
          { action: 'approve', reviewedBy: 'auto-legacy' }
        );
        
        // Apply immediately
        return await this.runApplication(detectionResult.groupId, options);
      }

      return detectionResult;
    }
  }
}

export default AutoFixEngineBase;
```

**✅ Phase 2 Checkpoint**: Service layer complete, test with mock data

---

## Phase 3: API Endpoints

**Duration**: 2 days  
**Files**: 1 new, 1 updated

### Task 3.1: Create API Routes

**File**: `src/api/autofix-review-routes.js`

```javascript
/**
 * Auto-Fix Review API Routes
 * Endpoints for manual review workflow
 */

import express from 'express';
import proposalService from '../services/proposal-service.js';

const router = express.Router();

/**
 * GET /api/autofix/proposals
 * Get proposals with filters
 */
router.get('/proposals', async (req, res) => {
  try {
    const {
      clientId,
      status = 'pending',
      engineId,
      groupId,
      severity,
      riskLevel,
      limit = 50
    } = req.query;

    const proposals = proposalService.getProposals({
      clientId,
      status,
      engineId,
      groupId,
      severity,
      riskLevel,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: proposals.length,
      proposals
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autofix/proposals/:id
 * Get single proposal by ID
 */
router.get('/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = proposalService.getProposalById(id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    res.json({
      success: true,
      proposal
    });
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autofix/proposals/group/:groupId
 * Get proposals by group with summary
 */
router.get('/proposals/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const proposals = proposalService.getProposalsByGroup(groupId);
    const summary = proposalService.getGroupSummary(groupId);
    const session = proposalService.getReviewSession(groupId);

    res.json({
      success: true,
      groupId,
      summary,
      session,
      proposals
    });
  } catch (error) {
    console.error('Error fetching group proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/proposals/:id/review
 * Review single proposal (approve/reject)
 */
router.post('/proposals/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes, reviewedBy } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const result = proposalService.reviewProposal(id, {
      action,
      notes,
      reviewedBy: reviewedBy || 'user'
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error reviewing proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/proposals/bulk-review
 * Bulk review proposals
 */
router.post('/proposals/bulk-review', async (req, res) => {
  try {
    const { proposalIds, action, notes, reviewedBy } = req.body;

    if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'proposalIds must be a non-empty array'
      });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const result = proposalService.bulkReview(proposalIds, {
      action,
      notes,
      reviewedBy: reviewedBy || 'user'
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error bulk reviewing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/proposals/auto-approve
 * Auto-approve proposals based on criteria
 */
router.post('/proposals/auto-approve', async (req, res) => {
  try {
    const { groupId, criteria } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'groupId is required'
      });
    }

    const result = proposalService.autoApprove(groupId, criteria || {});

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error auto-approving:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/detect
 * Run auto-fix in detect mode only
 */
router.post('/detect', async (req, res) => {
  try {
    const { engineId, clientId, options = {} } = req.body;

    if (!engineId || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'engineId and clientId are required'
      });
    }

    // Dynamically load engine
    const engine = await loadEngine(engineId, clientId);
    
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: `Engine ${engineId} not found`
      });
    }

    const result = await engine.runDetection(options);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error running detection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/apply
 * Apply approved proposals
 */
router.post('/apply', async (req, res) => {
  try {
    const { groupId, engineId, clientId, options = {} } = req.body;

    if (!groupId || !engineId || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'groupId, engineId, and clientId are required'
      });
    }

    // Load engine
    const engine = await loadEngine(engineId, clientId);
    
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: `Engine ${engineId} not found`
      });
    }

    const result = await engine.runApplication(groupId, options);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error applying proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autofix/statistics
 * Get proposal statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { clientId } = req.query;
    
    const stats = proposalService.getStatistics(clientId);

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/expire-old
 * Manually trigger expiration of old proposals
 */
router.post('/expire-old', async (req, res) => {
  try {
    const result = proposalService.expireOldProposals();

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error expiring proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper: Load engine dynamically
 */
async function loadEngine(engineId, clientId) {
  // Map engine IDs to file paths
  const engineMap = {
    'nap-fixer': './src/automation/auto-fixers/nap-fixer.js',
    'content-optimizer': './src/automation/auto-fixers/content-optimizer.js',
    'title-meta-optimizer': './src/automation/auto-fixers/title-meta-optimizer.js',
    // Add more engines as they're refactored
  };

  const enginePath = engineMap[engineId];
  
  if (!enginePath) {
    return null;
  }

  try {
    const engineModule = await import(enginePath);
    const EngineClass = engineModule.default || engineModule[Object.keys(engineModule)[0]];
    
    // Load client config
    const clientConfig = await loadClientConfig(clientId);
    
    return new EngineClass(clientConfig);
  } catch (error) {
    console.error(`Error loading engine ${engineId}:`, error);
    return null;
  }
}

/**
 * Helper: Load client configuration
 */
async function loadClientConfig(clientId) {
  const fs = (await import('fs')).default;
  const path = (await import('path')).default;
  
  const envPath = `./clients/${clientId}.env`;
  
  if (!fs.existsSync(envPath)) {
    throw new Error(`Client config not found: ${envPath}`);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const config = { id: clientId };

  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      const cleanKey = key.trim();
      const cleanValue = value.trim().replace(/['"]/g, '');
      
      // Map common keys
      if (cleanKey === 'WORDPRESS_URL') config.siteUrl = cleanValue;
      if (cleanKey === 'WORDPRESS_USER') config.wpUser = cleanValue;
      if (cleanKey === 'WORDPRESS_APP_PASSWORD') config.wpPassword = cleanValue;
      if (cleanKey === 'BUSINESS_NAME') config.businessName = cleanValue;
      if (cleanKey === 'CITY') config.city = cleanValue;
      if (cleanKey === 'STATE') config.state = cleanValue;
      if (cleanKey === 'COUNTRY') config.country = cleanValue;
      if (cleanKey === 'PHONE') config.phone = cleanValue;
      if (cleanKey === 'EMAIL') config.email = cleanValue;
    }
  });

  return config;
}

export default router;
```

### Task 3.2: Register Routes

**File**: Update main server file (likely `src/api/v2/index.js` or similar)

```javascript
// ADD TO EXISTING SERVER FILE

import autofixReviewRoutes from '../autofix-review-routes.js';

// ... existing routes ...

// Register auto-fix review routes
app.use('/api/autofix', autofixReviewRoutes);
```

**✅ Phase 3 Checkpoint**: Test API endpoints with curl/Postman

```bash
# Test getting proposals
curl http://localhost:3000/api/autofix/proposals?status=pending

# Test statistics
curl http://localhost:3000/api/autofix/statistics
```

---

## Phase 4: Engine Refactoring

**Duration**: 3-4 days  
**Files**: 3 updated

### Task 4.1: Refactor NAP Fixer

**File**: `src/automation/auto-fixers/nap-fixer.js`

Add at the top:

```javascript
import { AutoFixEngineBase } from './engine-base.js';

// Change class declaration from:
// export class NAPAutoFixer {
// To:
export class NAPAutoFixer extends AutoFixEngineBase {
```

Replace `runAutoFix` method with:

```javascript
/**
 * Detect NAP inconsistencies (Phase 1)
 */
async detectIssues(options = {}) {
  const issues = [];

  // Get all posts and pages
  const [posts, pages] = await Promise.all([
    this.wpClient.getPosts({ per_page: 100 }),
    this.wpClient.getPages({ per_page: 100 })
  ]);

  const allContent = [...posts, ...pages];

  for (const content of allContent) {
    // Check content for NAP variations
    const contentIssues = this.findNAPVariations(
      content.content.rendered,
      'content',
      content
    );

    issues.push(...contentIssues);
  }

  return issues.map(issue => ({
    target_type: issue.contentType,
    target_id: issue.contentId,
    target_title: issue.contentTitle,
    target_url: issue.contentUrl,
    field_name: issue.field,
    before_value: issue.found,
    after_value: issue.correct,
    issue_description: `Inconsistent ${issue.field}: "${issue.found}"`,
    fix_description: `Replace with correct ${issue.field}: "${issue.correct}"`,
    expected_benefit: 'Improved NAP consistency for Local SEO',
    severity: issue.severity,
    risk_level: 'low',
    category: 'local-seo',
    reversible: true
  }));
}

/**
 * Apply NAP fix (Phase 2)
 */
async applyFix(proposal, options = {}) {
  const { target_id, field_name, before_value, after_value } = proposal;

  // Get current content
  const content = await this.wpClient.getPost(target_id);

  // Update content
  let updatedContent = {};

  if (field_name === 'content') {
    updatedContent.content = content.content.rendered.replace(
      new RegExp(this.escapeRegex(before_value), 'g'),
      after_value
    );
  } else if (field_name === 'title') {
    updatedContent.title = content.title.rendered.replace(before_value, after_value);
  }

  // Apply via WordPress API
  return await this.wpClient.updatePost(target_id, updatedContent);
}

/**
 * Get engine category
 */
getCategory() {
  return 'local-seo';
}
```

### Task 4.2: Update 2 More Engines

Follow same pattern for `content-optimizer.js` and `title-meta-optimizer.js`:

1. Extend `AutoFixEngineBase`
2. Implement `detectIssues()` method
3. Implement `applyFix()` method
4. Implement `getCategory()` method
5. Remove direct WordPress API calls from detection phase

**✅ Phase 4 Checkpoint**: Test engines in both modes

```bash
# Test detection
node -e "import('./src/automation/auto-fixers/nap-fixer.js').then(async m => {
  const config = { id: 'test-client', siteUrl: '...', wpUser: '...', wpPassword: '...' };
  const engine = new m.NAPAutoFixer(config);
  const result = await engine.runDetection();
  console.log(result);
});"
```

---

## Phase 5: Dashboard UI

**Duration**: 4-5 days  
**Files**: 5 new, 2 updated

### Task 5.1: Create Proposal Card Component

**File**: `dashboard/src/components/ProposalCard.jsx`

```jsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ThumbsUp, ThumbsDown, Eye, AlertTriangle, Info } from 'lucide-react'

export function ProposalCard({
  proposal,
  selected,
  onSelect,
  onReview,
  showActions = true
}) {
  const [showDetails, setShowDetails] = useState(false)

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <Card className={`transition-all ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {showActions && proposal.status === 'pending' && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect(proposal.id)}
              className="mt-1"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline">{proposal.engine_name}</Badge>
              <Badge variant={getRiskColor(proposal.risk_level)}>
                {proposal.risk_level} risk
              </Badge>
              <Badge variant={getSeverityColor(proposal.severity)}>
                {proposal.severity}
              </Badge>
              <Badge variant="secondary">{proposal.category}</Badge>
            </div>

            <CardTitle className="text-base">{proposal.fix_description}</CardTitle>
            
            <p className="text-sm text-muted-foreground mt-1">
              {proposal.issue_description}
            </p>

            <div className="text-xs text-muted-foreground mt-2">
              <strong>Target:</strong> {proposal.target_title} ({proposal.field_name})
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Diff View */}
        {proposal.diff_html ? (
          <div className="bg-muted p-3 rounded-lg">
            <div 
              className="text-sm font-mono"
              dangerouslySetInnerHTML={{ __html: proposal.diff_html }}
            />
          </div>
        ) : (
          <div className="bg-muted p-3 rounded-lg space-y-1">
            <div className="text-xs font-mono text-red-600">
              - {proposal.before_value?.substring(0, 100)}
              {proposal.before_value?.length > 100 && '...'}
            </div>
            <div className="text-xs font-mono text-green-600">
              + {proposal.after_value?.substring(0, 100)}
              {proposal.after_value?.length > 100 && '...'}
            </div>
          </div>
        )}

        {/* Expected Benefit */}
        {proposal.expected_benefit && (
          <div className="flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
            <span className="text-muted-foreground">{proposal.expected_benefit}</span>
          </div>
        )}

        {/* Actions */}
        {showActions && proposal.status === 'pending' && onReview && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onReview(proposal.id, 'approve')}
              className="flex-1"
            >
              <ThumbsUp className="mr-1 h-3 w-3" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReview(proposal.id, 'reject')}
              className="flex-1"
            >
              <ThumbsDown className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </div>
        )}

        {/* Status Badge */}
        {proposal.status !== 'pending' && (
          <div className="pt-2">
            <Badge variant={proposal.status === 'approved' || proposal.status === 'applied' ? 'default' : 'secondary'}>
              Status: {proposal.status}
            </Badge>
            {proposal.reviewed_by && (
              <span className="text-xs text-muted-foreground ml-2">
                by {proposal.reviewed_by}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProposalCard
```

### Task 5.2: Create Review Page

**File**: `dashboard/src/pages/AutoFixReviewPage.jsx`

```jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ProposalCard } from '@/components/ProposalCard'
import {
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Play,
  Loader2,
  Filter,
  RefreshCw
} from 'lucide-react'

export default function AutoFixReviewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [proposals, setProposals] = useState([])
  const [selectedProposals, setSelectedProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'pending')
  const [stats, setStats] = useState(null)

  // Load proposals
  const loadProposals = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/autofix/proposals?status=${filterStatus}&limit=100`
      )
      const data = await response.json()

      if (data.success) {
        setProposals(data.proposals)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load proposals',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [filterStatus, toast])

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/autofix/statistics')
      const data = await response.json()

      if (data.success) {
        setStats(data.statistics)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [])

  useEffect(() => {
    loadProposals()
    loadStats()
  }, [loadProposals, loadStats])

  // Handle single review
  const handleReview = async (proposalId, action) => {
    try {
      const response = await fetch(`/api/autofix/proposals/${proposalId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewedBy: 'user'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: `Proposal ${action}d successfully`
        })
        loadProposals()
        loadStats()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to review proposal',
        variant: 'destructive'
      })
    }
  }

  // Handle bulk review
  const handleBulkReview = async (action) => {
    if (selectedProposals.length === 0) return

    try {
      const response = await fetch('/api/autofix/proposals/bulk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalIds: selectedProposals,
          action,
          reviewedBy: 'user'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: `${selectedProposals.length} proposals ${action}d`
        })
        setSelectedProposals([])
        loadProposals()
        loadStats()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to review proposals',
        variant: 'destructive'
      })
    }
  }

  // Apply approved proposals
  const handleApply = async () => {
    // Get unique group IDs from approved proposals
    const groupIds = [...new Set(
      proposals
        .filter(p => p.status === 'approved')
        .map(p => p.proposal_group_id)
    )]

    if (groupIds.length === 0) {
      toast({
        title: 'No Approved Proposals',
        description: 'There are no approved proposals to apply',
        variant: 'destructive'
      })
      return
    }

    setApplying(true)

    try {
      for (const groupId of groupIds) {
        // Get group info
        const groupResponse = await fetch(`/api/autofix/proposals/group/${groupId}`)
        const groupData = await groupResponse.json()

        if (groupData.success && groupData.session) {
          // Apply
          const applyResponse = await fetch('/api/autofix/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupId,
              engineId: groupData.session.engine_id,
              clientId: groupData.session.client_id
            })
          })

          const applyData = await applyResponse.json()

          if (applyData.success) {
            toast({
              title: 'Success',
              description: `Applied ${applyData.result.succeeded} changes from ${groupData.session.engine_name}`
            })
          }
        }
      }

      loadProposals()
      loadStats()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply proposals',
        variant: 'destructive'
      })
    } finally {
      setApplying(false)
    }
  }

  // Select/deselect proposal
  const handleSelectProposal = (proposalId) => {
    setSelectedProposals(prev =>
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    )
  }

  // Select all visible
  const handleSelectAll = () => {
    if (selectedProposals.length === proposals.length) {
      setSelectedProposals([])
    } else {
      setSelectedProposals(proposals.map(p => p.id))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading proposals...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Review Auto-Fix Proposals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve changes before they're applied to your website
          </p>
        </div>

        <Button onClick={() => navigate('/autofix')} variant="outline">
          Back to Auto-Fix
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Applied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.applied || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approval_rate?.toFixed(0) || 0}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedProposals.length > 0 && (
        <Card className="bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedProposals.length} proposal{selectedProposals.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkReview('approve')}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkReview('reject')}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Reject Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProposals([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="pending">
              <Clock className="mr-2 h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected">
              <XCircle className="mr-2 h-4 w-4" />
              Rejected
            </TabsTrigger>
            <TabsTrigger value="applied">
              <Play className="mr-2 h-4 w-4" />
              Applied
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {filterStatus === 'approved' && proposals.length > 0 && (
              <Button
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Apply All Approved
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={loadProposals}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value={filterStatus} className="space-y-4">
          {filterStatus === 'pending' && proposals.length > 0 && (
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedProposals.length === proposals.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          )}

          {proposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No {filterStatus} proposals</h3>
                <p className="text-muted-foreground">
                  {filterStatus === 'pending' && 'Run an auto-fix engine to generate proposals'}
                  {filterStatus === 'approved' && 'No proposals have been approved yet'}
                  {filterStatus === 'rejected' && 'No proposals have been rejected'}
                  {filterStatus === 'applied' && 'No proposals have been applied yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {proposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  selected={selectedProposals.includes(proposal.id)}
                  onSelect={handleSelectProposal}
                  onReview={handleReview}
                  showActions={filterStatus === 'pending'}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Task 5.3: Update AutoFixPage

**File**: `dashboard/src/pages/AutoFixPage.jsx`

Add import:
```jsx
import { useNavigate } from 'react-router-dom'
```

Update `handleRunEngine`:
```jsx
const navigate = useNavigate()

const handleRunEngine = async (engineId) => {
  setRunningEngine(engineId)

  try {
    // Run in detect mode
    const response = await fetch('/api/autofix/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engineId,
        clientId: 'instantautotraders', // TODO: Get from context
        options: {}
      })
    })

    const data = await response.json()

    if (data.success && data.result.proposals > 0) {
      toast({
        title: 'Detection Complete',
        description: `Found ${data.result.detected} issues. Review them now?`,
        action: (
          <Button
            onClick={() => navigate(`/autofix/review?groupId=${data.result.groupId}`)}
            size="sm"
          >
            Review Proposals
          </Button>
        )
      })
    } else {
      toast({
        title: 'Detection Complete',
        description: 'No issues found'
      })
    }

    refetchEngines()
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to run detection',
      variant: 'destructive'
    })
  } finally {
    setRunningEngine(null)
  }
}
```

### Task 5.4: Add Routes

**File**: `dashboard/src/App.jsx`

```jsx
import AutoFixReviewPage from './pages/AutoFixReviewPage'

// Add to routes:
<Route path="/autofix/review" element={<AutoFixReviewPage />} />
```

### Task 5.5: Update API Service

**File**: `dashboard/src/services/api.js`

Add to exports:

```javascript
/**
 * Auto-Fix Review APIs
 */
export const autofixReviewAPI = {
  // Get proposals
  async getProposals(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await fetch(`${API_BASE}/autofix/proposals?${params}`)
    return response.json()
  },

  // Get proposal by ID
  async getProposal(id) {
    const response = await fetch(`${API_BASE}/autofix/proposals/${id}`)
    return response.json()
  },

  // Get proposals by group
  async getProposalGroup(groupId) {
    const response = await fetch(`${API_BASE}/autofix/proposals/group/${groupId}`)
    return response.json()
  },

  // Review proposal
  async reviewProposal(proposalId, action, notes = '', reviewedBy = 'user') {
    const response = await fetch(`${API_BASE}/autofix/proposals/${proposalId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes, reviewedBy })
    })
    return response.json()
  },

  // Bulk review
  async bulkReview(proposalIds, action, notes = '', reviewedBy = 'user') {
    const response = await fetch(`${API_BASE}/autofix/proposals/bulk-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalIds, action, notes, reviewedBy })
    })
    return response.json()
  },

  // Run detection
  async runDetection(engineId, clientId, options = {}) {
    const response = await fetch(`${API_BASE}/autofix/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engineId, clientId, options })
    })
    return response.json()
  },

  // Apply approved proposals
  async applyProposals(groupId, engineId, clientId) {
    const response = await fetch(`${API_BASE}/autofix/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, engineId, clientId })
    })
    return response.json()
  },

  // Get statistics
  async getStatistics(clientId = null) {
    const params = clientId ? `?clientId=${clientId}` : ''
    const response = await fetch(`${API_BASE}/autofix/statistics${params}`)
    return response.json()
  }
}
```

**✅ Phase 5 Checkpoint**: Test full UI workflow

---

## Phase 6: Integration & Testing

**Duration**: 3 days

### Task 6.1: Integration Testing

Create test script:

**File**: `test-manual-review-workflow.js`

```javascript
#!/usr/bin/env node

/**
 * Integration test for manual review workflow
 */

import { NAPAutoFixer } from './src/automation/auto-fixers/nap-fixer.js';
import proposalService from './src/services/proposal-service.js';
import fs from 'fs';

async function runIntegrationTest() {
  console.log('\n🧪 AUTO-FIX MANUAL REVIEW INTEGRATION TEST\n');

  // Load test client config
  const testClientConfig = {
    id: 'test-client',
    siteUrl: process.env.TEST_WORDPRESS_URL,
    wpUser: process.env.TEST_WORDPRESS_USER,
    wpPassword: process.env.TEST_WORDPRESS_PASSWORD,
    businessName: 'Test Business',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    phone: '+61 2 1234 5678',
    email: 'test@example.com'
  };

  try {
    // Phase 1: Detection
    console.log('1️⃣  Testing Detection Phase...');
    const napFixer = new NAPAutoFixer(testClientConfig);
    const detectionResult = await napFixer.runDetection();

    console.log(`   ✅ Detected: ${detectionResult.detected} issues`);
    console.log(`   ✅ Proposals: ${detectionResult.proposals}`);
    console.log(`   ✅ Group ID: ${detectionResult.groupId}`);

    if (detectionResult.proposals === 0) {
      console.log('\n✅ TEST PASSED: No issues to fix (this is OK)');
      return;
    }

    // Phase 2: Review
    console.log('\n2️⃣  Testing Review Phase...');
    const proposals = proposalService.getProposalsByGroup(detectionResult.groupId);
    console.log(`   Found ${proposals.length} proposals`);

    // Approve first half, reject second half
    const halfPoint = Math.ceil(proposals.length / 2);
    const toApprove = proposals.slice(0, halfPoint).map(p => p.id);
    const toReject = proposals.slice(halfPoint).map(p => p.id);

    if (toApprove.length > 0) {
      proposalService.bulkReview(toApprove, {
        action: 'approve',
        reviewedBy: 'test-script'
      });
      console.log(`   ✅ Approved: ${toApprove.length}`);
    }

    if (toReject.length > 0) {
      proposalService.bulkReview(toReject, {
        action: 'reject',
        reviewedBy: 'test-script'
      });
      console.log(`   ✅ Rejected: ${toReject.length}`);
    }

    // Phase 3: Application
    console.log('\n3️⃣  Testing Application Phase...');
    const applicationResult = await napFixer.runApplication(detectionResult.groupId);

    console.log(`   ✅ Total: ${applicationResult.total}`);
    console.log(`   ✅ Succeeded: ${applicationResult.succeeded}`);
    console.log(`   ✅ Failed: ${applicationResult.failed}`);

    // Phase 4: Verification
    console.log('\n4️⃣  Verifying Results...');
    const finalProposals = proposalService.getProposalsByGroup(detectionResult.groupId);
    const applied = finalProposals.filter(p => p.status === 'applied').length;
    const approved = finalProposals.filter(p => p.status === 'approved').length;
    const rejected = finalProposals.filter(p => p.status === 'rejected').length;

    console.log(`   Applied: ${applied}`);
    console.log(`   Still Approved: ${approved}`);
    console.log(`   Rejected: ${rejected}`);

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      test: 'manual-review-workflow',
      phases: {
        detection: detectionResult,
        application: applicationResult
      },
      verification: {
        applied,
        approved,
        rejected,
        total: finalProposals.length
      }
    };

    fs.writeFileSync(
      `test-reports/manual-review-test-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ TEST PASSED: All phases completed successfully\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runIntegrationTest();
```

Run test:
```bash
node test-manual-review-workflow.js
```

### Task 6.2: Unit Tests

Add tests for key components:

```bash
# Test proposal service
npm test -- proposal-service.test.js

# Test diff generator
npm test -- diff-generator.test.js

# Test base engine
npm test -- engine-base.test.js
```

### Task 6.3: End-to-End Test

Manual test checklist:

- [ ] Run detection from dashboard
- [ ] View proposals in review page
- [ ] Approve some proposals
- [ ] Reject some proposals
- [ ] Apply approved proposals
- [ ] Verify changes in WordPress
- [ ] Check activity log
- [ ] Test bulk operations
- [ ] Test filters and search
- [ ] Test statistics display

### Task 6.4: Performance Testing

```bash
# Test with large dataset
node test-manual-review-workflow.js --proposals=100

# Check database query performance
sqlite3 data/seo-automation.db "EXPLAIN QUERY PLAN SELECT * FROM autofix_proposals WHERE status = 'pending'"
```

**✅ Phase 6 Checkpoint**: All tests passing

---

## Deployment Checklist

### Pre-Deployment

- [ ] All database migrations run successfully
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] API endpoints tested
- [ ] UI components working
- [ ] Backward compatibility verified

### Deployment Steps

1. **Backup Current Database**
   ```bash
   cp data/seo-automation.db data/seo-automation-backup-$(date +%Y%m%d).db
   ```

2. **Run Migrations**
   ```bash
   node src/database/migrations/001_add_proposal_tables.js up
   ```

3. **Deploy Code**
   ```bash
   git pull origin main
   npm install
   npm run build
   ```

4. **Restart Services**
   ```bash
   npm run restart
   ```

5. **Verify Deployment**
   ```bash
   curl http://localhost:3000/api/autofix/statistics
   ```

### Post-Deployment

- [ ] Verify API endpoints responding
- [ ] Test UI navigation
- [ ] Check logs for errors
- [ ] Monitor performance
- [ ] Test with real user account
- [ ] Update documentation
- [ ] Notify team

### Rollback Plan

If issues arise:

```bash
# Rollback database
node src/database/migrations/001_add_proposal_tables.js down

# Restore backup
cp data/seo-automation-backup-YYYYMMDD.db data/seo-automation.db

# Revert code
git revert HEAD
npm install
npm run restart
```

---

## Configuration

### Default Settings

Add to `.env`:

```bash
# Auto-Fix Review Settings
AUTOFIX_REVIEW_ENABLED=true
AUTOFIX_REVIEW_DEFAULT_MODE=review  # or 'direct'
AUTOFIX_PROPOSAL_EXPIRY_DAYS=7
AUTOFIX_AUTO_APPROVE_ENABLED=false
AUTOFIX_AUTO_APPROVE_MAX_RISK=low
```

### Per-Client Settings

Configure in database:

```sql
INSERT INTO autofix_review_settings (client_id, setting_key, setting_value)
VALUES 
  ('instantautotraders', 'review.enabled', 'true'),
  ('instantautotraders', 'review.default_mode', 'review'),
  ('instantautotraders', 'auto_approve.enabled', 'false');
```

---

## Maintenance

### Daily Tasks

```bash
# Expire old proposals
curl -X POST http://localhost:3000/api/autofix/expire-old
```

### Weekly Tasks

- Review approval rates
- Check failed applications
- Update auto-approval templates

### Monthly Tasks

- Analyze statistics
- Optimize database
- Update documentation

---

## Monitoring

### Key Metrics

1. **Proposal Volume**: Proposals created per day
2. **Approval Rate**: % of proposals approved
3. **Application Success**: % of applications that succeed
4. **Time to Review**: Average time from creation to review
5. **Time to Apply**: Average time from approval to application

### Alerts

Set up alerts for:

- Proposal backlog > 100
- Application failure rate > 10%
- Review time > 7 days
- Database size > 1GB

---

## Troubleshooting

### Common Issues

**Issue**: Proposals not appearing in UI

**Solution**: 
```bash
# Check database
sqlite3 data/seo-automation.db "SELECT COUNT(*) FROM autofix_proposals"

# Check API
curl http://localhost:3000/api/autofix/proposals
```

**Issue**: Apply failing silently

**Solution**:
```bash
# Check logs
tail -f logs/autofix-*.log

# Test WordPress connection
node -e "import('./src/integrations/wordpress-client.js')..."
```

**Issue**: Diff not rendering

**Solution**:
- Check proposal has before/after values
- Verify diff_html generation
- Check React dangerouslySetInnerHTML

---

## Success Criteria

✅ **MVP Complete When**:

1. Database tables created and populated
2. At least 3 engines refactored
3. API endpoints functional
4. UI can display and review proposals
5. Apply functionality works
6. Tests passing
7. Documentation complete

✅ **Production Ready When**:

1. All engines refactored
2. Comprehensive test coverage
3. Performance optimized
4. Security reviewed
5. User training complete
6. Rollback tested
7. Monitoring in place

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Database | 2 days | None |
| 2. Services | 3 days | Phase 1 |
| 3. API | 2 days | Phase 2 |
| 4. Engines | 3-4 days | Phase 3 |
| 5. Dashboard | 4-5 days | Phase 3 |
| 6. Testing | 3 days | Phase 5 |
| **Total** | **17-19 days** | **~3-4 weeks** |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up development environment**
3. **Start with Phase 1** (Database)
4. **Test each phase** before moving on
5. **Document as you go**

---

## Support

For questions or issues during implementation:

1. Check this guide first
2. Review existing code patterns
3. Test in isolation
4. Ask for code review

---

**Document Version**: 1.0  
**Last Updated**: October 30, 2025  
**Author**: SEO Expert System Team  
**Status**: Ready for Implementation
