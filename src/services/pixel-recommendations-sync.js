/**
 * PIXEL RECOMMENDATIONS SYNC SERVICE
 *
 * Automatically creates recommendations from pixel-detected SEO issues
 * Links critical/high severity issues to actionable recommendations
 * Triggers notifications when issues are detected or resolved
 *
 * Phase: 4B - High-Value Integrations (Complete with Day 3 Notifications)
 * Date: November 2, 2025
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import pixelNotificationService from './pixel-notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

class PixelRecommendationsSync {
  constructor(options = {}) {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');

    this.options = {
      batchSize: options.batchSize || 20,
      minSeverity: options.minSeverity || ['CRITICAL', 'HIGH'],
      enableAutoFix: options.enableAutoFix !== false,
      notifyOnCritical: options.notifyOnCritical !== false,
      ...options
    };
  }

  /**
   * Main batch sync method - processes multiple unprocessed issues
   * Called by cron job hourly
   *
   * @returns {Object} Sync results
   */
  async syncIssues() {
    const startTime = Date.now();
    console.log('[PixelRecommendationsSync] Starting batch sync...');

    try {
      // Get unprocessed CRITICAL/HIGH issues
      const issues = this.db.prepare(`
        SELECT
          i.*,
          p.client_id,
          p.domain
        FROM seo_issues i
        JOIN pixel_deployments p ON i.pixel_id = p.id
        WHERE i.status = 'OPEN'
          AND i.severity IN ('CRITICAL', 'HIGH')
          AND (i.processed_for_recommendation = 0 OR i.processed_for_recommendation IS NULL)
        ORDER BY i.severity_weight DESC, i.detected_at ASC
        LIMIT ?
      `).all(this.options.batchSize);

      if (issues.length === 0) {
        console.log('[PixelRecommendationsSync] No unprocessed issues found');
        return {
          success: true,
          processed: 0,
          created: 0,
          skipped: 0,
          duration: Date.now() - startTime
        };
      }

      console.log(`[PixelRecommendationsSync] Processing ${issues.length} issues...`);

      let created = 0;
      let skipped = 0;

      // Process each issue
      for (const issue of issues) {
        try {
          // Check if recommendation already exists
          const existing = this.findExistingRecommendationForIssue(issue.id);
          if (existing) {
            this.markIssueProcessed(issue.id);
            skipped++;
            continue;
          }

          // Create recommendation with AutoFix detection
          const recommendation = this.createRecommendationWithAutoFix(issue);
          created++;
        } catch (error) {
          console.error(`[PixelRecommendationsSync] Error processing issue ${issue.id}:`, error.message);
          skipped++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[PixelRecommendationsSync] Sync complete: ${created} created, ${skipped} skipped (${duration}ms)`);

      return {
        success: true,
        processed: issues.length,
        created,
        skipped,
        duration
      };
    } catch (error) {
      console.error('[PixelRecommendationsSync] Batch sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Create recommendation with AutoFix engine detection
   *
   * @param {Object} issue - Pixel issue with client_id
   * @returns {Object} Created recommendation
   */
  createRecommendationWithAutoFix(issue) {
    // Detect AutoFix engine
    const autoFixEngine = this.options.enableAutoFix
      ? this.getAutoFixEngineForIssueType(issue.issue_type)
      : null;

    const recommendation = {
      clientId: issue.client_id,
      title: this.formatRecommendationTitle(issue),
      description: issue.recommendation || issue.description,
      priority: this.mapSeverityToPriority(issue.severity),
      category: this.mapIssueCategoryToRecommendation(issue.category),
      estimatedTime: this.extractEstimatedTime(issue),
      fixCode: issue.fix_code || null,
      sourceType: 'pixel_issue',
      sourceId: issue.id.toString(),
      metadata: JSON.stringify({
        pixelIssueId: issue.id,
        issueType: issue.issue_type,
        pageUrl: issue.page_url,
        detectedAt: issue.detected_at || new Date().toISOString(),
        severity: issue.severity,
        category: issue.category,
        domain: issue.domain
      })
    };

    // Insert recommendation
    const result = this.db.prepare(`
      INSERT INTO recommendations (
        client_id, title, description, type, category,
        impact, effort, status, action_data,
        pixel_issue_id, auto_fix_available, auto_fix_engine,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      recommendation.clientId,
      recommendation.title,
      recommendation.description,
      this.mapSeverityToType(issue.severity),
      recommendation.category,
      this.mapSeverityToImpact(issue.severity),
      this.estimateEffort(issue.issue_type),
      'pending',
      recommendation.metadata,
      issue.id,
      autoFixEngine ? 1 : 0,
      autoFixEngine
    );

    const recommendationId = result.lastInsertRowid;

    // Link to issue
    this.linkRecommendationToIssue(recommendationId, issue.id);

    console.log(`[PixelRecommendationsSync] Created recommendation ${recommendationId} for issue ${issue.id}${autoFixEngine ? ` (AutoFix: ${autoFixEngine})` : ''}`);

    const createdRecommendation = {
      id: recommendationId,
      ...recommendation,
      autoFixAvailable: !!autoFixEngine,
      autoFixEngine,
      auto_fix_available: !!autoFixEngine,
      auto_fix_engine: autoFixEngine
    };

    // PHASE 4B DAY 3: Trigger notifications for new issue
    if (this.options.notifyOnCritical && (issue.severity === 'CRITICAL' || issue.severity === 'HIGH')) {
      try {
        pixelNotificationService.handleNewIssue(issue, createdRecommendation)
          .catch(err => console.error('[PixelRecommendationsSync] Notification error:', err.message));
      } catch (err) {
        console.error('[PixelRecommendationsSync] Failed to trigger notification:', err.message);
      }
    }

    return createdRecommendation;
  }

  /**
   * Mark issue as processed
   */
  markIssueProcessed(issueId) {
    this.db.prepare(`
      UPDATE seo_issues
      SET processed_for_recommendation = 1
      WHERE id = ?
    `).run(issueId);
  }

  /**
   * Find existing recommendation for issue
   */
  findExistingRecommendationForIssue(issueId) {
    return this.db.prepare(`
      SELECT * FROM recommendations
      WHERE pixel_issue_id = ?
      AND status != 'dismissed'
      LIMIT 1
    `).get(issueId);
  }

  /**
   * Get AutoFix engine for issue type
   */
  getAutoFixEngineForIssueType(issueType) {
    const autoFixMapping = {
      'missing_meta_description': 'meta-tags-fixer',
      'missing_title': 'meta-tags-fixer',
      'title_too_short': 'meta-tags-fixer',
      'title_too_long': 'meta-tags-fixer',
      'missing_og_tags': 'meta-tags-fixer',
      'missing_og_title': 'meta-tags-fixer',
      'missing_og_description': 'meta-tags-fixer',
      'missing_alt_text': 'image-alt-fixer',
      'images_without_alt': 'image-alt-fixer',
      'missing_schema': 'schema-fixer',
      'missing_local_business_schema': 'schema-fixer'
    };

    return autoFixMapping[issueType] || null;
  }

  /**
   * Map severity to recommendation type
   */
  mapSeverityToType(severity) {
    const mapping = {
      'CRITICAL': 'critical',
      'HIGH': 'warning',
      'MEDIUM': 'opportunity',
      'LOW': 'info'
    };
    return mapping[severity] || 'info';
  }

  /**
   * Map severity to impact
   */
  mapSeverityToImpact(severity) {
    const mapping = {
      'CRITICAL': 'high',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low'
    };
    return mapping[severity] || 'medium';
  }

  /**
   * Estimate effort to fix
   */
  estimateEffort(issueType) {
    const effortMapping = {
      'missing_meta_description': 'low',
      'missing_title': 'low',
      'missing_alt_text': 'low',
      'missing_h1': 'low',
      'missing_schema': 'medium',
      'broken_link': 'low',
      'slow_page_load': 'high',
      'large_image': 'medium',
      'mobile_usability': 'high'
    };

    return effortMapping[issueType] || 'medium';
  }

  /**
   * Process new pixel issue and create recommendation if needed
   * Only creates recommendations for CRITICAL or HIGH severity issues
   *
   * @param {Object} issue - Pixel issue object
   * @param {string} clientId - Client identifier
   * @returns {Object|null} Created recommendation or null
   */
  async processIssue(issue, clientId) {
    try {
      // Only process CRITICAL or HIGH severity issues
      if (!['CRITICAL', 'HIGH'].includes(issue.severity)) {
        return null;
      }

      // Check if recommendation already exists for this issue
      const existing = this.findExistingRecommendation(issue.id);
      if (existing) {
        console.log(`[PixelRecommendationsSync] Recommendation already exists for issue ${issue.id}`);
        return existing;
      }

      // Create new recommendation
      const recommendation = this.createRecommendation({
        clientId,
        title: this.formatRecommendationTitle(issue),
        description: issue.recommendation || issue.description,
        priority: this.mapSeverityToPriority(issue.severity),
        category: this.mapIssueCategoryToRecommendation(issue.category),
        estimatedTime: this.extractEstimatedTime(issue),
        fixCode: issue.fix || null,
        sourceType: 'pixel_issue',
        sourceId: issue.id.toString(),
        metadata: JSON.stringify({
          pixelIssueId: issue.id,
          issueType: issue.type,
          pageUrl: issue.pageUrl,
          detectedAt: issue.detectedAt || new Date().toISOString(),
          severity: issue.severity,
          category: issue.category
        })
      });

      // Link recommendation to issue
      this.linkRecommendationToIssue(recommendation.id, issue.id);

      console.log(`[PixelRecommendationsSync] Created recommendation ${recommendation.id} for issue ${issue.id}`);

      return recommendation;
    } catch (error) {
      console.error(`[PixelRecommendationsSync] Error processing issue ${issue.id}:`, error.message);
      return null;
    }
  }

  /**
   * Find existing recommendation for a pixel issue
   *
   * @param {number} issueId - Pixel issue ID
   * @returns {Object|null} Existing recommendation or null
   */
  findExistingRecommendation(issueId) {
    try {
      return this.db.prepare(`
        SELECT * FROM recommendations
        WHERE source_type = 'pixel_issue'
        AND source_id = ?
        AND status != 'COMPLETED'
      `).get(issueId.toString());
    } catch (error) {
      console.error('[PixelRecommendationsSync] Error finding existing recommendation:', error.message);
      return null;
    }
  }

  /**
   * Find recommendation by pixel issue ID (using seo_issues link)
   *
   * @param {number} issueId - Pixel issue ID
   * @returns {Object|null} Recommendation or null
   */
  findRecommendationByIssueId(issueId) {
    try {
      const issue = this.db.prepare(`
        SELECT recommendation_id FROM seo_issues WHERE id = ?
      `).get(issueId);

      if (!issue || !issue.recommendation_id) {
        return null;
      }

      return this.db.prepare(`
        SELECT * FROM recommendations WHERE id = ?
      `).get(issue.recommendation_id);
    } catch (error) {
      console.error('[PixelRecommendationsSync] Error finding recommendation by issue ID:', error.message);
      return null;
    }
  }

  /**
   * Create new recommendation in database
   *
   * @param {Object} data - Recommendation data
   * @returns {Object} Created recommendation
   */
  createRecommendation(data) {
    const stmt = this.db.prepare(`
      INSERT INTO recommendations (
        client_id, title, description, priority, category,
        estimated_time, fix_code, source_type, source_id,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'), datetime('now'))
    `);

    const result = stmt.run(
      data.clientId,
      data.title,
      data.description,
      data.priority,
      data.category,
      data.estimatedTime || 15,
      data.fixCode,
      data.sourceType,
      data.sourceId
    );

    return {
      id: result.lastInsertRowid,
      ...data,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Link recommendation to pixel issue
   *
   * @param {number} recommendationId - Recommendation ID
   * @param {number} issueId - Pixel issue ID
   */
  linkRecommendationToIssue(recommendationId, issueId) {
    try {
      this.db.prepare(`
        UPDATE seo_issues
        SET recommendation_id = ?
        WHERE id = ?
      `).run(recommendationId, issueId);
    } catch (error) {
      console.error('[PixelRecommendationsSync] Error linking recommendation to issue:', error.message);
    }
  }

  /**
   * Sync issue resolution to recommendation completion
   * When pixel issue is resolved, mark the linked recommendation as complete
   *
   * @param {number} issueId - Pixel issue ID
   */
  async syncIssueResolution(issueId) {
    try {
      const recommendation = this.findRecommendationByIssueId(issueId);

      if (!recommendation) {
        console.log(`[PixelRecommendationsSync] No recommendation found for resolved issue ${issueId}`);
        return;
      }

      if (recommendation.status === 'COMPLETED') {
        console.log(`[PixelRecommendationsSync] Recommendation ${recommendation.id} already completed`);
        return;
      }

      // Mark recommendation as completed
      this.markRecommendationComplete(recommendation.id);

      console.log(`[PixelRecommendationsSync] Marked recommendation ${recommendation.id} as complete for resolved issue ${issueId}`);

      // PHASE 4B DAY 3: Trigger notifications for resolved issue
      if (this.options.notifyOnCritical) {
        try {
          const issue = this.db.prepare('SELECT * FROM seo_issues WHERE id = ?').get(issueId);
          if (issue) {
            pixelNotificationService.handleIssueResolved(issue, recommendation)
              .catch(err => console.error('[PixelRecommendationsSync] Resolution notification error:', err.message));
          }
        } catch (err) {
          console.error('[PixelRecommendationsSync] Failed to trigger resolution notification:', err.message);
        }
      }
    } catch (error) {
      console.error(`[PixelRecommendationsSync] Error syncing issue resolution ${issueId}:`, error.message);
    }
  }

  /**
   * Mark recommendation as completed
   *
   * @param {number} recommendationId - Recommendation ID
   */
  markRecommendationComplete(recommendationId) {
    try {
      this.db.prepare(`
        UPDATE recommendations
        SET status = 'COMPLETED',
            completed_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(recommendationId);
    } catch (error) {
      console.error('[PixelRecommendationsSync] Error marking recommendation complete:', error.message);
    }
  }

  /**
   * Map pixel issue severity to recommendation priority
   *
   * @param {string} severity - Issue severity (CRITICAL, HIGH, MEDIUM, LOW)
   * @returns {string} Recommendation priority
   */
  mapSeverityToPriority(severity) {
    const map = {
      'CRITICAL': 'HIGH',
      'HIGH': 'MEDIUM',
      'MEDIUM': 'LOW',
      'LOW': 'LOW'
    };
    return map[severity] || 'LOW';
  }

  /**
   * Map pixel issue category to recommendation category
   *
   * @param {string} category - Issue category
   * @returns {string} Recommendation category
   */
  mapIssueCategoryToRecommendation(category) {
    const map = {
      'meta': 'SEO',
      'headings': 'CONTENT',
      'images': 'PERFORMANCE',
      'performance': 'PERFORMANCE',
      'mobile': 'MOBILE',
      'content': 'CONTENT',
      'links': 'SEO',
      'schema': 'SCHEMA'
    };
    return map[category] || 'GENERAL';
  }

  /**
   * Format issue into user-friendly recommendation title
   *
   * @param {Object} issue - Pixel issue
   * @returns {string} Formatted title
   */
  formatRecommendationTitle(issue) {
    // Extract page name from URL
    let pageName = 'Page';
    if (issue.pageUrl) {
      try {
        const url = new URL(issue.pageUrl);
        pageName = url.pathname === '/' ? 'Homepage' : url.pathname.split('/').filter(p => p).pop() || 'Page';
      } catch (e) {
        // Invalid URL, use default
      }
    }

    // Create action-oriented title
    const actionMap = {
      'missing-title': 'Add Page Title',
      'missing-meta-description': 'Add Meta Description',
      'missing-h1': 'Add H1 Heading',
      'missing-alt-text': 'Add Image Alt Text',
      'missing-schema': 'Add Schema Markup',
      'title-too-short': 'Optimize Page Title Length',
      'title-too-long': 'Shorten Page Title',
      'meta-too-short': 'Expand Meta Description',
      'meta-too-long': 'Shorten Meta Description',
      'multiple-h1': 'Fix Multiple H1 Tags',
      'poor-lcp': 'Improve Page Load Speed',
      'high-cls': 'Fix Layout Stability',
      'poor-fid': 'Improve Interactivity'
    };

    const action = actionMap[issue.type] || issue.description.replace(/^(Missing|No|Invalid|Poor)\s+/i, 'Fix ');

    return `${action} - ${pageName}`;
  }

  /**
   * Extract estimated fix time from issue
   *
   * @param {Object} issue - Pixel issue
   * @returns {number} Estimated time in minutes
   */
  extractEstimatedTime(issue) {
    // Check if issue has explicit estimated time
    if (issue.estimatedFixTime) {
      return issue.estimatedFixTime;
    }

    // Default estimates by issue type
    const timeEstimates = {
      'missing-title': 5,
      'missing-meta-description': 10,
      'missing-h1': 5,
      'missing-alt-text': 3,
      'missing-schema': 20,
      'title-too-short': 5,
      'title-too-long': 5,
      'meta-too-short': 10,
      'meta-too-long': 10,
      'multiple-h1': 10,
      'poor-lcp': 30,
      'high-cls': 20,
      'poor-fid': 25
    };

    return timeEstimates[issue.type] || 15;
  }

  /**
   * Get statistics on recommendation sync
   *
   * @returns {Object} Sync statistics
   */
  getStats() {
    try {
      const totalIssues = this.db.prepare(`
        SELECT COUNT(*) as count FROM seo_issues
        WHERE severity IN ('CRITICAL', 'HIGH')
      `).get();

      const issuesWithRecommendations = this.db.prepare(`
        SELECT COUNT(*) as count FROM seo_issues
        WHERE severity IN ('CRITICAL', 'HIGH')
        AND recommendation_id IS NOT NULL
      `).get();

      const pixelRecommendations = this.db.prepare(`
        SELECT COUNT(*) as count FROM recommendations
        WHERE source_type = 'pixel_issue'
      `).get();

      const completedRecommendations = this.db.prepare(`
        SELECT COUNT(*) as count FROM recommendations
        WHERE source_type = 'pixel_issue'
        AND status = 'COMPLETED'
      `).get();

      return {
        totalCriticalHighIssues: totalIssues.count,
        issuesWithRecommendations: issuesWithRecommendations.count,
        syncRate: totalIssues.count > 0 ? (issuesWithRecommendations.count / totalIssues.count * 100).toFixed(1) + '%' : '0%',
        totalPixelRecommendations: pixelRecommendations.count,
        completedPixelRecommendations: completedRecommendations.count,
        completionRate: pixelRecommendations.count > 0 ? (completedRecommendations.count / pixelRecommendations.count * 100).toFixed(1) + '%' : '0%'
      };
    } catch (error) {
      console.error('[PixelRecommendationsSync] Error getting stats:', error.message);
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
  }
}

// Export both class and singleton instance
export { PixelRecommendationsSync };
const pixelRecommendationsSync = new PixelRecommendationsSync();
export default pixelRecommendationsSync;
