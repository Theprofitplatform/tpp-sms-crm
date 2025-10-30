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
          p.reversible !== undefined ? (p.reversible ? 1 : 0) : 1
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
    return db.proposalOps.getProposals(filters);
  }

  /**
   * Get proposal by ID
   */
  getProposalById(id) {
    return db.proposalOps.getProposalById(id);
  }

  /**
   * Get proposals by group
   */
  getProposalsByGroup(groupId) {
    return db.proposalOps.getProposals({ groupId });
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

    db.proposalOps.updateReviewSession(groupId, {
      approved_count: summary.approved,
      rejected_count: summary.rejected,
      applied_count: summary.applied
    });
  }

  /**
   * Create review session
   */
  createReviewSession(data) {
    return db.proposalOps.createReviewSession(data);
  }

  /**
   * Get review session
   */
  getReviewSession(groupId) {
    return db.proposalOps.getReviewSession(groupId);
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
