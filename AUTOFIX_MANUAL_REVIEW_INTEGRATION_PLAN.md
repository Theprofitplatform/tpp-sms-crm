# Auto-Fix Manual Review Integration Plan

## Executive Summary

This document outlines a comprehensive plan to integrate manual review into the existing auto-fix system, allowing users to review and approve/reject changes before they are applied to websites.

---

## Current System Analysis

### Architecture Overview

```
User Interaction (Dashboard)
    ↓
Run Auto-Fix Engine
    ↓
Detect Issues → Apply Fixes Immediately → Log Results
    ↓
History View (Read-only)
```

### Current Components

1. **Orchestrator** (`auto-fix-all-upgraded.js`)
   - Runs 11 different auto-fix engines
   - Supports sequential, parallel, and queue-based execution
   - Creates backups before applying changes

2. **Individual Engines** (e.g., `nap-fixer.js`)
   - Detects issues in WordPress content
   - Immediately applies fixes via WordPress API
   - Logs changes to database

3. **Queue System** (`autofix-queue.js`)
   - BullMQ-based job queue
   - Priority-based execution
   - Retry logic and progress tracking

4. **Dashboard** (`AutoFixPage.jsx`)
   - Lists available engines
   - "Run Now" button triggers immediate execution
   - History view shows completed runs

5. **History Service** (`auto-fix-history.js`)
   - Reads log files
   - Provides revert functionality (partial implementation)

### Key Issues

- ❌ No review step between detection and application
- ❌ Changes applied immediately on "Run Now"
- ❌ User cannot preview changes
- ❌ No granular approval (all-or-nothing)
- ❌ Limited rollback capabilities

---

## Proposed Architecture: Two-Phase Execution

### New Workflow

```
User Interaction (Dashboard)
    ↓
Phase 1: DETECT MODE
    ↓
    Scan & Detect Issues
    ↓
    Generate Change Proposals
    ↓
    Store in Pending Reviews DB
    ↓
User Reviews in Dashboard
    ↓
    Approve/Reject Individual Changes
    ↓
Phase 2: APPLY MODE
    ↓
    Apply Only Approved Changes
    ↓
    Log Results
    ↓
History View
```

---

## Implementation Plan

### Phase 1: Database Schema Updates

**New Tables**

```sql
-- Pending auto-fix proposals
CREATE TABLE IF NOT EXISTS autofix_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identification
    proposal_group_id TEXT NOT NULL,  -- Groups related proposals
    engine_id TEXT NOT NULL,
    engine_name TEXT NOT NULL,
    client_id TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending',  -- pending, approved, rejected, applied, expired
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    applied_at DATETIME,
    expires_at DATETIME,
    
    -- Review metadata
    reviewed_by TEXT,
    review_notes TEXT,
    
    -- Priority & categorization
    priority INTEGER DEFAULT 50,
    severity TEXT,  -- low, medium, high, critical
    category TEXT,  -- seo, accessibility, technical, content
    impact_score INTEGER,
    
    -- Change details
    target_type TEXT NOT NULL,  -- post, page, widget, setting
    target_id TEXT NOT NULL,
    target_title TEXT,
    field_name TEXT NOT NULL,
    
    -- Before/after
    before_value TEXT,
    after_value TEXT,
    diff_html TEXT,  -- HTML representation of diff
    
    -- Context
    issue_description TEXT,
    fix_description TEXT,
    expected_benefit TEXT,
    
    -- Risk assessment
    risk_level TEXT DEFAULT 'low',  -- low, medium, high
    reversible BOOLEAN DEFAULT 1,
    backup_id INTEGER,
    
    -- Additional data
    metadata TEXT,  -- JSON
    
    FOREIGN KEY (backup_id) REFERENCES auto_fix_actions(id)
);

-- Indexes
CREATE INDEX idx_proposals_status ON autofix_proposals(status);
CREATE INDEX idx_proposals_group ON autofix_proposals(proposal_group_id);
CREATE INDEX idx_proposals_client ON autofix_proposals(client_id);
CREATE INDEX idx_proposals_engine ON autofix_proposals(engine_id);

-- Bulk review decisions
CREATE TABLE IF NOT EXISTS autofix_review_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_group_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    engine_id TEXT NOT NULL,
    
    total_proposals INTEGER,
    approved_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    reviewed_by TEXT,
    session_notes TEXT,
    
    metadata TEXT  -- JSON
);
```

### Phase 2: Engine Refactoring

**Split Engine Logic into Detect & Apply**

```javascript
// Base class for all engines
export class AutoFixEngineBase {
  constructor(config) {
    this.config = config;
    this.mode = 'detect'; // or 'apply'
  }

  /**
   * Run in detect mode: Find issues, create proposals
   */
  async runDetection(options = {}) {
    const issues = await this.detectIssues();
    const proposals = this.createProposals(issues);
    await this.saveProposals(proposals);
    return {
      detected: issues.length,
      proposals: proposals.length,
      groupId: proposals[0]?.proposal_group_id
    };
  }

  /**
   * Run in apply mode: Apply approved changes only
   */
  async runApplication(proposalGroupId, options = {}) {
    const approvedProposals = await this.getApprovedProposals(proposalGroupId);
    const results = [];
    
    for (const proposal of approvedProposals) {
      try {
        const result = await this.applyFix(proposal);
        await this.markProposalApplied(proposal.id, result);
        results.push({ success: true, proposalId: proposal.id });
      } catch (error) {
        await this.markProposalFailed(proposal.id, error);
        results.push({ success: false, proposalId: proposal.id, error });
      }
    }
    
    return {
      total: approvedProposals.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // Abstract methods to be implemented by specific engines
  async detectIssues() { throw new Error('Not implemented'); }
  async applyFix(proposal) { throw new Error('Not implemented'); }
}
```

**Example: Updated NAP Fixer**

```javascript
export class NAPAutoFixer extends AutoFixEngineBase {
  async detectIssues() {
    // Existing detection logic
    const issues = [];
    const [posts, pages] = await Promise.all([
      this.wpClient.getPosts({ per_page: 100 }),
      this.wpClient.getPages({ per_page: 100 })
    ]);
    
    // Find NAP variations...
    return issues;
  }

  createProposals(issues) {
    const groupId = `nap-${this.clientId}-${Date.now()}`;
    
    return issues.map(issue => ({
      proposal_group_id: groupId,
      engine_id: 'nap-fixer',
      engine_name: 'NAP Consistency Fixer',
      client_id: this.clientId,
      
      target_type: issue.contentType,
      target_id: issue.contentId,
      target_title: issue.contentTitle,
      field_name: issue.field,
      
      before_value: issue.found,
      after_value: issue.correct,
      
      issue_description: `Inconsistent ${issue.field}: "${issue.found}"`,
      fix_description: `Replace with correct ${issue.field}: "${issue.correct}"`,
      expected_benefit: 'Improved NAP consistency for Local SEO',
      
      severity: issue.severity,
      risk_level: 'low',
      reversible: true,
      
      metadata: JSON.stringify({
        location: issue.location,
        fieldType: issue.field
      })
    }));
  }

  async applyFix(proposal) {
    // Apply single fix based on proposal
    const { target_id, field_name, before_value, after_value } = proposal;
    
    const content = await this.wpClient.getPost(target_id);
    let updatedContent = {};
    
    if (field_name === 'content') {
      updatedContent.content = content.content.rendered.replace(
        new RegExp(this.escapeRegex(before_value), 'g'),
        after_value
      );
    }
    // ... other fields
    
    return await this.wpClient.updatePost(target_id, updatedContent);
  }
}
```

### Phase 3: API Endpoints

**New Routes**

```javascript
// src/api/autofix-review-routes.js

import express from 'express';
import { proposalService } from '../services/proposal-service.js';

const router = express.Router();

/**
 * Run auto-fix in DETECT mode only
 * POST /api/autofix/detect
 */
router.post('/detect', async (req, res) => {
  const { engineId, clientId, options } = req.body;
  
  try {
    const engine = await loadEngine(engineId, clientId);
    const result = await engine.runDetection(options);
    
    res.json({
      success: true,
      groupId: result.groupId,
      detected: result.detected,
      proposals: result.proposals
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get all pending proposals
 * GET /api/autofix/proposals?clientId=xxx&status=pending
 */
router.get('/proposals', async (req, res) => {
  const { clientId, status, engineId, groupId } = req.query;
  
  const proposals = await proposalService.getProposals({
    clientId,
    status: status || 'pending',
    engineId,
    groupId
  });
  
  res.json({ success: true, proposals });
});

/**
 * Get proposals by group
 * GET /api/autofix/proposals/group/:groupId
 */
router.get('/proposals/group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  
  const proposals = await proposalService.getProposalsByGroup(groupId);
  const summary = await proposalService.getGroupSummary(groupId);
  
  res.json({
    success: true,
    groupId,
    summary,
    proposals
  });
});

/**
 * Review single proposal
 * POST /api/autofix/proposals/:id/review
 */
router.post('/proposals/:id/review', async (req, res) => {
  const { id } = req.params;
  const { action, notes, reviewedBy } = req.body; // action: approve|reject
  
  const result = await proposalService.reviewProposal(id, {
    action,
    notes,
    reviewedBy
  });
  
  res.json({ success: true, result });
});

/**
 * Bulk review proposals
 * POST /api/autofix/proposals/bulk-review
 */
router.post('/proposals/bulk-review', async (req, res) => {
  const { proposalIds, action, notes, reviewedBy } = req.body;
  
  const results = await proposalService.bulkReview(proposalIds, {
    action,
    notes,
    reviewedBy
  });
  
  res.json({ success: true, results });
});

/**
 * Apply approved proposals
 * POST /api/autofix/proposals/apply
 */
router.post('/proposals/apply', async (req, res) => {
  const { groupId, clientId, engineId } = req.body;
  
  try {
    const engine = await loadEngine(engineId, clientId);
    const result = await engine.runApplication(groupId);
    
    res.json({
      success: true,
      applied: result.succeeded,
      failed: result.failed,
      results: result.results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Auto-approve low-risk proposals
 * POST /api/autofix/proposals/auto-approve
 */
router.post('/proposals/auto-approve', async (req, res) => {
  const { groupId, criteria } = req.body;
  
  // criteria: { maxRiskLevel: 'low', minImpactScore: 70 }
  const approved = await proposalService.autoApprove(groupId, criteria);
  
  res.json({ success: true, approved });
});

export default router;
```

### Phase 4: Service Layer

**Proposal Service**

```javascript
// src/services/proposal-service.js

import db from '../database/index.js';

export class ProposalService {
  /**
   * Save proposals to database
   */
  async saveProposals(proposals) {
    const stmt = db.db.prepare(`
      INSERT INTO autofix_proposals (
        proposal_group_id, engine_id, engine_name, client_id,
        target_type, target_id, target_title, field_name,
        before_value, after_value, diff_html,
        issue_description, fix_description, expected_benefit,
        severity, risk_level, category, impact_score,
        metadata, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.db.transaction((proposals) => {
      for (const p of proposals) {
        stmt.run(
          p.proposal_group_id, p.engine_id, p.engine_name, p.client_id,
          p.target_type, p.target_id, p.target_title, p.field_name,
          p.before_value, p.after_value, p.diff_html || null,
          p.issue_description, p.fix_description, p.expected_benefit,
          p.severity, p.risk_level, p.category, p.impact_score || 50,
          p.metadata, p.expires_at || this.getExpirationDate()
        );
      }
    });
    
    insertMany(proposals);
  }

  /**
   * Get proposals with filters
   */
  getProposals(filters = {}) {
    let query = 'SELECT * FROM autofix_proposals WHERE 1=1';
    const params = [];
    
    if (filters.clientId) {
      query += ' AND client_id = ?';
      params.push(filters.clientId);
    }
    
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.engineId) {
      query += ' AND engine_id = ?';
      params.push(filters.engineId);
    }
    
    if (filters.groupId) {
      query += ' AND proposal_group_id = ?';
      params.push(filters.groupId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    const stmt = db.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Review a proposal
   */
  reviewProposal(proposalId, review) {
    const { action, notes, reviewedBy } = review;
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const stmt = db.db.prepare(`
      UPDATE autofix_proposals
      SET status = ?, reviewed_at = ?, reviewed_by = ?, review_notes = ?
      WHERE id = ?
    `);
    
    return stmt.run(status, new Date().toISOString(), reviewedBy, notes, proposalId);
  }

  /**
   * Bulk review
   */
  bulkReview(proposalIds, review) {
    const { action, notes, reviewedBy } = review;
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const stmt = db.db.prepare(`
      UPDATE autofix_proposals
      SET status = ?, reviewed_at = ?, reviewed_by = ?, review_notes = ?
      WHERE id = ?
    `);
    
    const updateMany = db.db.transaction((ids) => {
      for (const id of ids) {
        stmt.run(status, new Date().toISOString(), reviewedBy, notes, id);
      }
    });
    
    updateMany(proposalIds);
    
    return { updated: proposalIds.length };
  }

  /**
   * Auto-approve based on criteria
   */
  autoApprove(groupId, criteria = {}) {
    const { maxRiskLevel = 'low', minImpactScore = 0 } = criteria;
    
    const stmt = db.db.prepare(`
      UPDATE autofix_proposals
      SET status = 'approved', reviewed_at = ?, reviewed_by = 'auto'
      WHERE proposal_group_id = ?
        AND status = 'pending'
        AND risk_level = ?
        AND impact_score >= ?
    `);
    
    const result = stmt.run(
      new Date().toISOString(),
      groupId,
      maxRiskLevel,
      minImpactScore
    );
    
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
        engine_id,
        engine_name,
        client_id
      FROM autofix_proposals
      WHERE proposal_group_id = ?
      GROUP BY engine_id, engine_name, client_id
    `);
    
    return stmt.get(groupId);
  }

  getExpirationDate() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days
    return expiry.toISOString();
  }
}

export const proposalService = new ProposalService();
export default proposalService;
```

### Phase 5: Dashboard UI Components

**Review Dashboard Component**

```jsx
// dashboard/src/pages/AutoFixReviewPage.jsx

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, XCircle, Clock, Eye, 
  ThumbsUp, ThumbsDown, Filter, Search 
} from 'lucide-react';

export default function AutoFixReviewPage() {
  const [proposals, setProposals] = useState([]);
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending');

  useEffect(() => {
    loadProposals();
  }, [filterStatus]);

  const loadProposals = async () => {
    const response = await fetch(
      `/api/autofix/proposals?status=${filterStatus}`
    );
    const data = await response.json();
    setProposals(data.proposals);
  };

  const handleReview = async (proposalId, action) => {
    await fetch(`/api/autofix/proposals/${proposalId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        reviewedBy: 'current-user'
      })
    });
    loadProposals();
  };

  const handleBulkReview = async (action) => {
    await fetch('/api/autofix/proposals/bulk-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalIds: selectedProposals,
        action,
        reviewedBy: 'current-user'
      })
    });
    setSelectedProposals([]);
    loadProposals();
  };

  const handleApplyApproved = async (groupId) => {
    const response = await fetch('/api/autofix/proposals/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId })
    });
    const result = await response.json();
    
    toast({
      title: 'Changes Applied',
      description: `${result.applied} changes applied successfully`
    });
    
    loadProposals();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Review Auto-Fix Proposals</h1>
        
        {selectedProposals.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => handleBulkReview('approve')}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Approve {selectedProposals.length}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleBulkReview('reject')}
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Reject {selectedProposals.length}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
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
        </TabsList>

        <TabsContent value={filterStatus}>
          <div className="space-y-4">
            {proposals.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onReview={handleReview}
                selected={selectedProposals.includes(proposal.id)}
                onSelect={(id) => {
                  setSelectedProposals(prev =>
                    prev.includes(id)
                      ? prev.filter(p => p !== id)
                      : [...prev, id]
                  );
                }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Proposal Card Component
function ProposalCard({ proposal, onReview, selected, onSelect }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(proposal.id)}
          className="mt-1"
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge>{proposal.engine_name}</Badge>
            <Badge variant={getRiskVariant(proposal.risk_level)}>
              {proposal.risk_level} risk
            </Badge>
            <Badge variant="outline">{proposal.severity}</Badge>
          </div>
          
          <h3 className="font-semibold mb-1">{proposal.fix_description}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {proposal.issue_description}
          </p>
          
          <div className="bg-muted p-3 rounded mb-2">
            <div className="text-xs font-mono">
              <div className="text-red-600">- {proposal.before_value}</div>
              <div className="text-green-600">+ {proposal.after_value}</div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground mb-3">
            <strong>Target:</strong> {proposal.target_title} ({proposal.field_name})
            <br />
            <strong>Expected Benefit:</strong> {proposal.expected_benefit}
          </div>
          
          {proposal.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onReview(proposal.id, 'approve')}
              >
                <ThumbsUp className="mr-1 h-3 w-3" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReview(proposal.id, 'reject')}
              >
                <ThumbsDown className="mr-1 h-3 w-3" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function getRiskVariant(risk) {
  switch (risk) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
}
```

### Phase 6: Updated Auto-Fix Page

**Modified AutoFixPage.jsx**

```jsx
// Updated "Run Now" button behavior
const handleRunEngine = async (engineId, mode = 'review') => {
  if (mode === 'review') {
    // New: Run in detect mode first
    const result = await autoFixAPI.runDetection(engineId);
    
    toast({
      title: 'Detection Complete',
      description: `Found ${result.detected} issues. Review them now?`,
      action: (
        <Button onClick={() => navigate(`/autofix/review/${result.groupId}`)}>
          Review Proposals
        </Button>
      )
    });
  } else {
    // Legacy: Direct execution (with confirmation)
    const confirmed = await confirm(
      'Apply changes immediately without review?'
    );
    
    if (confirmed) {
      await autoFixAPI.runEngineDirect(engineId);
    }
  }
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Create database schema
- ✅ Implement ProposalService
- ✅ Add API endpoints for proposals
- ✅ Update base engine class

### Phase 2: Engine Updates (Week 2)
- ✅ Refactor NAPAutoFixer as example
- ✅ Update 2-3 more engines
- ✅ Create migration scripts
- ✅ Test detect/apply separation

### Phase 3: Dashboard UI (Week 3)
- ✅ Create Review Dashboard page
- ✅ Build ProposalCard component
- ✅ Implement bulk actions
- ✅ Add filtering and search

### Phase 4: Integration (Week 4)
- ✅ Update AutoFixPage to support both modes
- ✅ Add settings for default mode
- ✅ Implement auto-approval rules
- ✅ Add email notifications

### Phase 5: Testing & Polish (Week 5)
- ✅ End-to-end testing
- ✅ Performance optimization
- ✅ Documentation
- ✅ Training materials

---

## Configuration Options

### Settings Table

```sql
CREATE TABLE IF NOT EXISTS autofix_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    UNIQUE(client_id, setting_key)
);
```

### Default Settings

```javascript
const DEFAULT_SETTINGS = {
  // Review mode
  'review.enabled': true,
  'review.default_mode': 'review', // or 'direct'
  'review.expiration_days': 7,
  
  // Auto-approval
  'auto_approve.enabled': false,
  'auto_approve.max_risk_level': 'low',
  'auto_approve.min_impact_score': 70,
  
  // Notifications
  'notifications.email_on_detection': true,
  'notifications.email_on_application': true,
  'notifications.email': 'admin@example.com',
  
  // Scheduling
  'schedule.auto_detect': '0 2 * * *', // 2 AM daily
  'schedule.auto_expire': '0 3 * * *'  // 3 AM daily
};
```

---

## Advanced Features

### 1. Smart Auto-Approval

Automatically approve proposals based on criteria:

```javascript
// Auto-approve low-risk, high-impact changes
proposalService.autoApprove(groupId, {
  maxRiskLevel: 'low',
  minImpactScore: 80,
  engineWhitelist: ['title-meta-optimizer', 'image-alt-fixer']
});
```

### 2. Proposal Expiration

Automatically expire old pending proposals:

```javascript
// Cron job: daily cleanup
async function cleanupExpiredProposals() {
  const stmt = db.db.prepare(`
    UPDATE autofix_proposals
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < datetime('now')
  `);
  stmt.run();
}
```

### 3. Proposal Templates

Pre-approved patterns for common fixes:

```javascript
// If this pattern was approved before, auto-approve similar ones
const template = {
  engine_id: 'nap-fixer',
  field_name: 'phone',
  pattern: 'phone_number_formatting'
};

if (matchesApprovedTemplate(proposal, template)) {
  autoApprove(proposal);
}
```

### 4. A/B Testing Integration

Test changes on staging before production:

```javascript
const proposal = {
  // ... proposal data
  test_environment: 'staging',
  test_duration_hours: 24,
  test_metrics: ['bounce_rate', 'time_on_page']
};

// Apply to staging, measure, then prompt for production
```

### 5. Diff Visualization

Enhanced before/after comparison:

```javascript
import { diffWords } from 'diff';

function generateDiffHTML(before, after) {
  const diff = diffWords(before, after);
  
  return diff.map(part => {
    const color = part.added ? 'green' :
                  part.removed ? 'red' : 'gray';
    return `<span style="color:${color}">${part.value}</span>`;
  }).join('');
}
```

---

## Migration Strategy

### Backward Compatibility

```javascript
// Support both old and new flows
class AutoFixEngine {
  async run(options = {}) {
    const reviewMode = options.reviewMode ?? 
                       getSetting('review.enabled') ?? 
                       true;
    
    if (reviewMode) {
      return await this.runDetection(options);
    } else {
      // Legacy: detect + apply immediately
      const detectionResult = await this.runDetection(options);
      return await this.runApplication(detectionResult.groupId);
    }
  }
}
```

### Gradual Rollout

1. **Week 1-2**: Implement infrastructure (no UI changes)
2. **Week 3**: Add review UI as opt-in feature
3. **Week 4**: Enable for power users
4. **Week 5**: Enable for all users with toggle
5. **Week 6+**: Make default behavior

---

## Security Considerations

1. **Authorization**: Only admins can approve high-risk changes
2. **Audit Trail**: Log all review decisions
3. **Rate Limiting**: Prevent abuse of bulk operations
4. **Validation**: Sanitize all input values
5. **Encryption**: Encrypt sensitive proposal data

```javascript
// Role-based approval limits
const APPROVAL_LIMITS = {
  admin: { maxRiskLevel: 'high', noLimit: true },
  editor: { maxRiskLevel: 'medium', dailyLimit: 100 },
  viewer: { maxRiskLevel: 'low', dailyLimit: 20 }
};
```

---

## Testing Strategy

### Unit Tests

```javascript
describe('ProposalService', () => {
  test('saves proposals correctly', async () => {
    const proposals = [/* test data */];
    await proposalService.saveProposals(proposals);
    
    const saved = proposalService.getProposals({ groupId: 'test-123' });
    expect(saved.length).toBe(proposals.length);
  });
  
  test('auto-approves low-risk proposals', async () => {
    const result = await proposalService.autoApprove('test-123', {
      maxRiskLevel: 'low'
    });
    expect(result.approved).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```javascript
describe('Auto-Fix Review Workflow', () => {
  test('complete workflow: detect -> review -> apply', async () => {
    // 1. Run detection
    const detection = await napFixer.runDetection();
    expect(detection.proposals).toBeGreaterThan(0);
    
    // 2. Approve some proposals
    const proposals = await proposalService.getProposalsByGroup(detection.groupId);
    await proposalService.reviewProposal(proposals[0].id, {
      action: 'approve',
      reviewedBy: 'test-user'
    });
    
    // 3. Apply approved
    const application = await napFixer.runApplication(detection.groupId);
    expect(application.succeeded).toBe(1);
    
    // 4. Verify in WordPress
    const post = await wpClient.getPost(proposals[0].target_id);
    expect(post.content.rendered).toContain(proposals[0].after_value);
  });
});
```

---

## Performance Considerations

1. **Database Indexes**: Added on status, group_id, client_id
2. **Batch Operations**: Use transactions for bulk operations
3. **Caching**: Cache proposal counts and summaries
4. **Pagination**: Limit API responses to 50 items
5. **Background Jobs**: Run detections via queue system

---

## Documentation

### User Guide

- How to review proposals
- Understanding risk levels
- Bulk approval workflows
- Setting up auto-approval rules

### Developer Guide

- Creating review-compatible engines
- Proposal data structure
- API reference
- Extending the system

---

## Success Metrics

1. **Adoption Rate**: % of users using review mode
2. **Approval Rate**: % of proposals approved vs rejected
3. **Time to Review**: Average time from detection to review
4. **False Positive Rate**: % of approved changes that need rollback
5. **User Satisfaction**: Survey scores

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** for MVP
3. **Assign development tasks**
4. **Set timeline** for each phase
5. **Begin Phase 1** implementation

---

## Appendix: API Reference

### Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/autofix/detect` | Run detection only |
| GET | `/api/autofix/proposals` | List proposals |
| GET | `/api/autofix/proposals/group/:id` | Get group details |
| POST | `/api/autofix/proposals/:id/review` | Review single proposal |
| POST | `/api/autofix/proposals/bulk-review` | Bulk review |
| POST | `/api/autofix/proposals/apply` | Apply approved proposals |
| POST | `/api/autofix/proposals/auto-approve` | Auto-approve by criteria |

---

**Last Updated**: October 30, 2025  
**Version**: 1.0  
**Author**: SEO Expert System - Auto-Fix Team
