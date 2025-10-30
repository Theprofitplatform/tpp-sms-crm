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
