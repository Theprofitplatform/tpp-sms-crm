/**
 * PIXEL AUTOFIX ORCHESTRATOR
 *
 * Coordinates all AutoFix engines for pixel-detected issues
 * Manages fix proposals, approvals, and application
 *
 * Phase: 4B - AutoFix Integration
 * Date: November 2, 2025
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import metaTagsFixerEngine from './engines/pixel-meta-tags-fixer.js';
import imageAltFixerEngine from './engines/pixel-image-alt-fixer.js';
import schemaFixerEngine from './engines/pixel-schema-fixer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

export class PixelAutoFixOrchestrator {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');

    // Register all engines
    this.engines = {
      'pixel-meta-tags-fixer': metaTagsFixerEngine,
      'pixel-image-alt-fixer': imageAltFixerEngine,
      'pixel-schema-fixer': schemaFixerEngine
    };

    // Map issue types to engines
    this.issueTypeEngineMap = this.buildIssueTypeMap();
  }

  /**
   * Build map of issue types to engines
   */
  buildIssueTypeMap() {
    const map = {};

    Object.entries(this.engines).forEach(([engineName, engine]) => {
      // Test which issue types each engine can fix
      const testIssues = [
        'MISSING_TITLE', 'TITLE_TOO_SHORT', 'TITLE_TOO_LONG',
        'MISSING_META_DESCRIPTION', 'META_TOO_SHORT', 'META_TOO_LONG',
        'MISSING_OG_TAGS', 'MISSING_TWITTER_CARD',
        'IMAGES_WITHOUT_ALT', 'IMAGE_ALT_TOO_SHORT', 'IMAGE_ALT_TOO_LONG', 'IMAGE_ALT_GENERIC',
        'MISSING_SCHEMA', 'MISSING_ORGANIZATION_SCHEMA', 'MISSING_WEBPAGE_SCHEMA',
        'MISSING_BREADCRUMB_SCHEMA', 'INVALID_SCHEMA'
      ];

      testIssues.forEach(issueType => {
        if (engine.canFix({ issue_type: issueType })) {
          map[issueType] = engineName;
        }
      });
    });

    return map;
  }

  /**
   * Check if an issue can be auto-fixed
   *
   * @param {Object} issue - Pixel issue
   * @returns {Promise<Object|null>} Fix proposal or null
   */
  async canAutoFix(issue) {
    try {
      const engineName = this.issueTypeEngineMap[issue.issue_type];
      if (!engineName) {
        console.log(`[AutoFixOrchestrator] No engine for issue type: ${issue.issue_type}`);
        return null;
      }

      const engine = this.engines[engineName];
      if (!engine.canFix(issue)) {
        return null;
      }

      // Generate fix proposal
      const fixProposal = await engine.generateFix(issue);

      // Store proposal in database
      const proposalId = this.storeProposal({
        issueId: issue.id,
        engineName,
        ...fixProposal
      });

      return {
        proposalId,
        issueId: issue.id,
        engine: engineName,
        fix: fixProposal.code,
        confidence: fixProposal.confidence,
        requiresReview: fixProposal.requiresReview || fixProposal.confidence < 0.8,
        estimatedTime: fixProposal.estimatedTime || 10,
        metadata: fixProposal.metadata || {}
      };
    } catch (error) {
      console.error('[AutoFixOrchestrator] Error checking auto-fix:', error.message);
      return null;
    }
  }

  /**
   * Get all fixable issues for a pixel
   *
   * @param {number} pixelId - Pixel ID
   * @returns {Promise<Array>} Array of fixable issues with proposals
   */
  async getFixableIssues(pixelId) {
    try {
      // Get all open issues for this pixel
      const issues = this.db.prepare(`
        SELECT * FROM seo_issues
        WHERE pixel_id = ? AND status = 'OPEN'
        ORDER BY severity_weight DESC
      `).all(pixelId);

      const fixableIssues = [];

      for (const issue of issues) {
        const fixProposal = await this.canAutoFix(issue);
        if (fixProposal) {
          fixableIssues.push({
            issue,
            fixProposal
          });
        }
      }

      return fixableIssues;
    } catch (error) {
      console.error('[AutoFixOrchestrator] Error getting fixable issues:', error.message);
      return [];
    }
  }

  /**
   * Apply a fix proposal
   *
   * @param {number} proposalId - Proposal ID
   * @param {boolean} approved - Whether fix was approved
   * @param {string} approvedBy - User who approved
   * @returns {Promise<Object>} Result
   */
  async applyFix(proposalId, approved = false, approvedBy = 'system') {
    try {
      const proposal = this.getProposal(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      if (proposal.status !== 'PENDING') {
        throw new Error(`Proposal already ${proposal.status}`);
      }

      // Check if approval is required
      if (proposal.requires_review && !approved) {
        throw new Error('Fix requires manual review and approval');
      }

      // Update proposal status
      this.updateProposalStatus(proposalId, 'APPLIED', approvedBy);

      // Mark issue as resolved (AutoFix applied)
      this.resolveIssue(proposal.issue_id, 'APPLIED_AUTOFIX');

      console.log(`[AutoFixOrchestrator] Applied fix proposal ${proposalId} for issue ${proposal.issue_id}`);

      return {
        success: true,
        proposalId,
        issueId: proposal.issue_id,
        appliedAt: new Date().toISOString(),
        appliedBy: approvedBy
      };
    } catch (error) {
      console.error('[AutoFixOrchestrator] Error applying fix:', error.message);

      // Update proposal status to FAILED
      this.updateProposalStatus(proposalId, 'FAILED', null, error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch apply fixes
   *
   * @param {Array<number>} proposalIds - Array of proposal IDs
   * @param {boolean} approved - Whether fixes were approved
   * @param {string} approvedBy - User who approved
   * @returns {Promise<Object>} Results
   */
  async applyBatchFixes(proposalIds, approved = false, approvedBy = 'system') {
    const results = {
      applied: [],
      failed: [],
      total: proposalIds.length
    };

    for (const proposalId of proposalIds) {
      try {
        const result = await this.applyFix(proposalId, approved, approvedBy);
        if (result.success) {
          results.applied.push(proposalId);
        } else {
          results.failed.push({ proposalId, error: result.error });
        }
      } catch (error) {
        results.failed.push({ proposalId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Store fix proposal in database
   */
  storeProposal(proposal) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO autofix_proposals (
          issue_id, engine_name, fix_code, confidence,
          requires_review, status, metadata
        ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
      `);

      const result = stmt.run(
        proposal.issueId,
        proposal.engineName,
        proposal.code,
        proposal.confidence,
        proposal.requiresReview ? 1 : 0,
        JSON.stringify(proposal.metadata || {})
      );

      return result.lastInsertRowid;
    } catch (error) {
      console.error('[AutoFixOrchestrator] Error storing proposal:', error.message);
      return null;
    }
  }

  /**
   * Get proposal by ID
   */
  getProposal(proposalId) {
    try {
      return this.db.prepare('SELECT * FROM autofix_proposals WHERE id = ?').get(proposalId);
    } catch (error) {
      console.error('[AutoFixOrchestrator] Error getting proposal:', error.message);
      return null;
    }
  }

  /**
   * Update proposal status
   */
  updateProposalStatus(proposalId, status, reviewedBy = null, errorMessage = null) {
    try {
      this.db.prepare(`
        UPDATE autofix_proposals
        SET status = ?,
            reviewed_at = datetime('now'),
            reviewed_by = ?,
            applied_at = CASE WHEN ? = 'APPLIED' THEN datetime('now') ELSE applied_at END,
            error_message = ?
        WHERE id = ?
      `).run(status, reviewedBy, status, errorMessage, proposalId);
    } catch (error) {
      console.error('[AutoFixOrchestrator] Error updating proposal status:', error.message);
    }
  }

  /**
   * Resolve issue with AutoFix status
   */
  resolveIssue(issueId, resolution = 'APPLIED_AUTOFIX') {
    try {
      this.db.prepare(`
        UPDATE seo_issues
        SET status = 'RESOLVED',
            resolved_at = datetime('now'),
            autofix_status = 'APPLIED'
        WHERE id = ?
      `).run(issueId);
    } catch (error) {
      console.error('[AutoFixOrchestrator] Error resolving issue:', error.message);
    }
  }

  /**
   * Get AutoFix statistics
   */
  getStats() {
    try {
      const stats = {
        totalProposals: this.db.prepare('SELECT COUNT(*) as count FROM autofix_proposals').get().count,
        pendingProposals: this.db.prepare('SELECT COUNT(*) as count FROM autofix_proposals WHERE status = "PENDING"').get().count,
        appliedProposals: this.db.prepare('SELECT COUNT(*) as count FROM autofix_proposals WHERE status = "APPLIED"').get().count,
        failedProposals: this.db.prepare('SELECT COUNT(*) as count FROM autofix_proposals WHERE status = "FAILED"').get().count,
        avgConfidence: this.db.prepare('SELECT AVG(confidence) as avg FROM autofix_proposals').get().avg || 0,
        byEngine: {}
      };

      // Get stats by engine
      const engineStats = this.db.prepare(`
        SELECT engine_name, COUNT(*) as count, AVG(confidence) as avg_confidence
        FROM autofix_proposals
        GROUP BY engine_name
      `).all();

      engineStats.forEach(stat => {
        stats.byEngine[stat.engine_name] = {
          count: stat.count,
          avgConfidence: stat.avg_confidence
        };
      });

      return stats;
    } catch (error) {
      console.error('[AutoFixOrchestrator] Error getting stats:', error.message);
      return {};
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }

    // Close all engine connections
    Object.values(this.engines).forEach(engine => {
      if (engine.close) {
        engine.close();
      }
    });
  }
}

// Export singleton instance
const pixelAutoFixOrchestrator = new PixelAutoFixOrchestrator();
export default pixelAutoFixOrchestrator;
