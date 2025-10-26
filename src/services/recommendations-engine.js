/**
 * Recommendations Engine
 * Generates intelligent SEO recommendations based on data analysis
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/seo-automation.db');

class RecommendationsEngine {
  constructor() {
    this.db = new Database(dbPath);
  }

  /**
   * Generate recommendations for a client
   */
  generateRecommendations(clientId) {
    const recommendations = [];

    // Analyze rankings
    recommendations.push(...this.analyzeRankings(clientId));

    // Analyze local SEO
    recommendations.push(...this.analyzeLocalSEO(clientId));

    // Analyze auto-fixes
    recommendations.push(...this.analyzeAutoFixes(clientId));

    // Analyze competitors
    recommendations.push(...this.analyzeCompetitors(clientId));

    // Save recommendations to database
    this.saveRecommendations(clientId, recommendations);

    return recommendations;
  }

  /**
   * Analyze ranking data for opportunities
   */
  analyzeRankings(clientId) {
    const recommendations = [];

    // Find keywords close to page 1
    const nearPage1Stmt = this.db.prepare(`
      SELECT keyword, current_position, search_volume
      FROM keyword_performance
      WHERE client_id = ? AND current_position BETWEEN 11 AND 15
      ORDER BY search_volume DESC
      LIMIT 5
    `);

    const nearPage1 = nearPage1Stmt.all(clientId);

    if (nearPage1.length > 0) {
      recommendations.push({
        type: 'opportunity',
        category: 'content',
        title: `${nearPage1.length} keywords close to page 1`,
        description: `Target these keywords for quick wins with content optimization`,
        impact: 'high',
        effort: 'medium',
        keywords: nearPage1.map(k => k.keyword),
        action: {
          type: 'content_optimization',
          endpoint: '/api/auto-fix/content/:clientId/optimize'
        },
        estimatedImpact: '+15% organic traffic'
      });
    }

    // Find declining keywords
    const decliningStmt = this.db.prepare(`
      SELECT keyword, current_position, previous_position,
             (current_position - previous_position) as decline
      FROM keyword_performance
      WHERE client_id = ?
        AND previous_position IS NOT NULL
        AND (current_position - previous_position) > 5
      ORDER BY decline DESC
      LIMIT 5
    `);

    const declining = decliningStmt.all(clientId);

    if (declining.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'content',
        title: `${declining.length} keywords declining in rankings`,
        description: 'These keywords need immediate attention to prevent further losses',
        impact: 'high',
        effort: 'medium',
        keywords: declining.map(k => k.keyword),
        action: {
          type: 'content_refresh',
          endpoint: '/api/auto-fix/content/:clientId/optimize'
        },
        estimatedImpact: 'Prevent -20% traffic loss'
      });
    }

    return recommendations;
  }

  /**
   * Analyze local SEO opportunities
   */
  analyzeLocalSEO(clientId) {
    const recommendations = [];

    // Check GMB score
    const gmbStmt = this.db.prepare(`
      SELECT gmb_score
      FROM local_seo_scores
      WHERE client_id = ?
      ORDER BY check_date DESC
      LIMIT 1
    `);

    const gmb = gmbStmt.get(clientId);

    if (gmb && gmb.gmb_score < 80) {
      recommendations.push({
        type: 'critical',
        category: 'local',
        title: 'Low Google Business Profile score',
        description: `Current GMB score is ${gmb.gmb_score}/100. Optimize your profile to improve local visibility`,
        impact: 'high',
        effort: 'low',
        action: {
          type: 'gmb_optimization',
          endpoint: '/api/automation/local-seo/:clientId'
        },
        estimatedImpact: '+25% local visibility'
      });
    }

    return recommendations;
  }

  /**
   * Analyze auto-fix opportunities
   */
  analyzeAutoFixes(clientId) {
    const recommendations = [];

    // Check for missing schema markup
    const schemaStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM auto_fix_actions
      WHERE client_id = ? AND fix_type = 'schema' AND status = 'pending'
    `);

    const schema = schemaStmt.get(clientId);

    if (schema && schema.count > 0) {
      recommendations.push({
        type: 'critical',
        category: 'technical',
        title: `Missing Schema Markup on ${schema.count} pages`,
        description: 'Add LocalBusiness schema to improve local search visibility',
        impact: 'high',
        effort: 'low',
        action: {
          type: 'auto_fix',
          endpoint: '/api/auto-fix/schema/:clientId/inject'
        },
        estimatedImpact: '+8% local visibility'
      });
    }

    // Check for NAP inconsistencies
    const napStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM auto_fix_actions
      WHERE client_id = ? AND fix_type = 'nap' AND status = 'pending'
    `);

    const nap = napStmt.get(clientId);

    if (nap && nap.count > 0) {
      recommendations.push({
        type: 'warning',
        category: 'local',
        title: `NAP inconsistencies detected on ${nap.count} citations`,
        description: 'Inconsistent business information hurts local rankings',
        impact: 'medium',
        effort: 'medium',
        action: {
          type: 'auto_fix',
          endpoint: '/api/auto-fix/nap/:clientId/run'
        },
        estimatedImpact: '+5% local rankings'
      });
    }

    return recommendations;
  }

  /**
   * Analyze competitor data
   */
  analyzeCompetitors(clientId) {
    const recommendations = [];

    // Find competitor weaknesses (keywords where they rank lower)
    const weaknessStmt = this.db.prepare(`
      SELECT keyword, competitor_domain, position
      FROM competitor_rankings
      WHERE client_id = ? AND position > 20
      GROUP BY keyword
      HAVING COUNT(*) >= 2
      LIMIT 10
    `);

    const weaknesses = weaknessStmt.all(clientId);

    if (weaknesses.length > 0) {
      recommendations.push({
        type: 'opportunity',
        category: 'competitive',
        title: `${weaknesses.length} competitor weak spots identified`,
        description: 'Target keywords where competitors rank poorly for easy wins',
        impact: 'medium',
        effort: 'low',
        keywords: weaknesses.map(w => w.keyword),
        action: {
          type: 'content_creation',
          endpoint: '/api/auto-fix/content/:clientId/optimize'
        },
        estimatedImpact: '+10% market share'
      });
    }

    return recommendations;
  }

  /**
   * Save recommendations to database
   */
  saveRecommendations(clientId, recommendations) {
    // Clear old pending recommendations
    const clearStmt = this.db.prepare(`
      DELETE FROM recommendations
      WHERE client_id = ? AND status = 'pending'
    `);
    clearStmt.run(clientId);

    // Insert new recommendations
    const insertStmt = this.db.prepare(`
      INSERT INTO recommendations
      (client_id, type, category, title, description, impact, effort, action_data, estimated_impact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const rec of recommendations) {
      insertStmt.run(
        clientId,
        rec.type,
        rec.category,
        rec.title,
        rec.description,
        rec.impact,
        rec.effort,
        JSON.stringify(rec.action),
        rec.estimatedImpact
      );
    }
  }

  /**
   * Get recommendations for a client
   */
  getRecommendations(clientId, status = 'pending') {
    const stmt = this.db.prepare(`
      SELECT *
      FROM recommendations
      WHERE client_id = ? AND status = ?
      ORDER BY
        CASE impact
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        CASE type
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'opportunity' THEN 3
          WHEN 'info' THEN 4
        END
    `);

    const recommendations = stmt.all(clientId, status);

    // Parse action_data JSON
    return recommendations.map(rec => ({
      ...rec,
      action: JSON.parse(rec.action_data || '{}')
    }));
  }

  /**
   * Update recommendation status
   */
  updateStatus(recommendationId, status) {
    const stmt = this.db.prepare(`
      UPDATE recommendations
      SET status = ?,
          ${status === 'completed' ? 'completed_at = CURRENT_TIMESTAMP' : ''}
          ${status === 'dismissed' ? 'dismissed_at = CURRENT_TIMESTAMP' : ''}
      WHERE id = ?
    `);

    stmt.run(status, recommendationId);
  }

  close() {
    this.db.close();
  }
}

export default new RecommendationsEngine();
