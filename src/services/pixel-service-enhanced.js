/**
 * ENHANCED PIXEL SERVICE with Advanced Issue Detection
 *
 * Integrates the SEO issue detector for comprehensive page analysis
 */

import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import issueDetector from './pixel-issue-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

class EnhancedPixelService {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Track pixel data with enhanced issue detection
   */
  trackPixelData(apiKey, data) {
    // Get pixel deployment
    const pixel = this.db.prepare(`
      SELECT id, client_id FROM pixel_deployments WHERE api_key = ? AND status = 'active'
    `).get(apiKey);

    if (!pixel) {
      throw new Error('Invalid API key or inactive pixel');
    }

    // Detect SEO issues using the advanced detector
    const detectedIssues = issueDetector.detectIssues(data);

    // Calculate enhanced SEO score
    const seoScore = issueDetector.calculateSEOScore(detectedIssues);

    // Get issue summary
    const issueSummary = issueDetector.getIssueSummary(detectedIssues);

    // Store page data with enhanced metrics
    const pageDataStmt = this.db.prepare(`
      INSERT INTO pixel_page_data (
        pixel_id, client_id, url, page_title, meta_description,
        h1_tags, h2_tags, images_data, links_data, schema_found,
        performance_metrics, issues_detected, seo_score, issue_summary,
        word_count, has_mobile_viewport, load_time_ms, page_size_kb
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pageResult = pageDataStmt.run(
      pixel.id,
      pixel.client_id,
      data.metadata.url,
      data.metadata.title,
      data.metadata.metaDescription,
      JSON.stringify(data.metadata.h1Tags),
      JSON.stringify(data.metadata.h2Tags),
      JSON.stringify(data.metadata.images),
      JSON.stringify(data.metadata.links),
      JSON.stringify(data.metadata.schema),
      JSON.stringify(data.vitals || data.performanceMetrics),
      JSON.stringify(detectedIssues.map(i => i.type)), // Store issue types for backward compat
      seoScore,
      JSON.stringify(issueSummary),
      data.metadata.wordCount,
      data.metadata.hasViewport ? 1 : 0,
      data.vitals?.ttfb || null,
      Math.round((data.pageSize || 0) / 1024)
    );

    // Store individual issues in seo_issues table
    const issueStmt = this.db.prepare(`
      INSERT OR REPLACE INTO seo_issues (
        pixel_id, page_url, issue_id, issue_type, severity, category,
        description, recommendation, fix_code, impact, estimated_time,
        current_value, target_value, affected_count, severity_weight,
        severity_color, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let issuesStored = 0;
    detectedIssues.forEach(issue => {
      try {
        issueStmt.run(
          pixel.id,
          data.metadata.url,
          issue.id,
          issue.type,
          issue.severity,
          issue.category,
          issue.description,
          issue.recommendation,
          issue.fix || issue.fix_code || null,
          issue.impact,
          issue.estimatedTime,
          issue.currentValue || null,
          issue.targetValue || null,
          issue.affectedCount || null,
          issue.severityWeight,
          issue.severityColor,
          issue.priority,
          'OPEN'
        );
        issuesStored++;
      } catch (err) {
        console.error(`Error storing issue ${issue.type}:`, err.message);
      }
    });

    // Update pixel last seen and stats
    this.db.prepare(`
      UPDATE pixel_deployments
      SET last_ping_at = CURRENT_TIMESTAMP,
          last_seen_url = ?,
          pages_tracked = pages_tracked + 1
      WHERE id = ?
    `).run(data.metadata.url, pixel.id);

    // Update daily analytics
    this.updateDailyAnalytics(pixel.id, seoScore, data.vitals || {}, issueSummary);

    // Update pixel health
    this.updatePixelHealth(pixel.id, 'UP', seoScore);

    return {
      success: true,
      pageDataId: pageResult.lastInsertRowid,
      seoScore,
      issuesDetected: detectedIssues.length,
      issuesStored,
      issueSummary,
      topIssues: detectedIssues.slice(0, 5).map(i => ({
        type: i.type,
        severity: i.severity,
        description: i.description
      }))
    };
  }

  /**
   * Update daily analytics
   */
  updateDailyAnalytics(pixelId, seoScore, vitals, issueSummary) {
    const today = new Date().toISOString().split('T')[0];

    const stmt = this.db.prepare(`
      INSERT INTO pixel_analytics (
        pixel_id, date, page_views, avg_seo_score, avg_lcp, avg_fid, avg_cls,
        total_issues, critical_issues, high_issues, medium_issues, low_issues
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pixel_id, date) DO UPDATE SET
        page_views = page_views + 1,
        avg_seo_score = ((avg_seo_score * page_views) + ?) / (page_views + 1),
        avg_lcp = ((COALESCE(avg_lcp, 0) * page_views) + ?) / (page_views + 1),
        avg_fid = ((COALESCE(avg_fid, 0) * page_views) + ?) / (page_views + 1),
        avg_cls = ((COALESCE(avg_cls, 0) * page_views) + ?) / (page_views + 1),
        total_issues = total_issues + ?,
        critical_issues = critical_issues + ?,
        high_issues = high_issues + ?,
        medium_issues = medium_issues + ?,
        low_issues = low_issues + ?,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      pixelId, today, seoScore, vitals.lcp || 0, vitals.fid || 0, vitals.cls || 0,
      issueSummary.total, issueSummary.critical, issueSummary.high,
      issueSummary.medium, issueSummary.low,
      // For the UPDATE part:
      seoScore, vitals.lcp || 0, vitals.fid || 0, vitals.cls || 0,
      issueSummary.total, issueSummary.critical, issueSummary.high,
      issueSummary.medium, issueSummary.low
    );
  }

  /**
   * Update pixel health status
   */
  updatePixelHealth(pixelId, status, dataQualityScore = null) {
    this.db.prepare(`
      INSERT INTO pixel_health (
        pixel_id, status, data_quality_score, pages_tracked_today
      ) VALUES (?, ?, ?, 1)
    `).run(pixelId, status, dataQualityScore);

    // Clean up old health records (keep last 30 days)
    this.db.prepare(`
      DELETE FROM pixel_health
      WHERE pixel_id = ?
      AND timestamp < datetime('now', '-30 days')
    `).run(pixelId);
  }

  /**
   * Get issues for a pixel
   */
  getPixelIssues(pixelId, options = {}) {
    const {
      severity = null,
      category = null,
      status = 'OPEN',
      limit = 100,
      offset = 0
    } = options;

    let query = 'SELECT * FROM seo_issues WHERE pixel_id = ?';
    const params = [pixelId];

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY priority ASC, severity_weight DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get issue summary for pixel
   */
  getIssueSummary(pixelId) {
    const summary = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity = 'LOW' THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved
      FROM seo_issues
      WHERE pixel_id = ? AND status = 'OPEN'
    `).get(pixelId);

    const byCategory = this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM seo_issues
      WHERE pixel_id = ? AND status = 'OPEN'
      GROUP BY category
      ORDER BY count DESC
    `).all(pixelId);

    return {
      ...summary,
      byCategory: byCategory.reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {})
    };
  }

  /**
   * Resolve an issue
   */
  resolveIssue(issueId) {
    const result = this.db.prepare(`
      UPDATE seo_issues
      SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP
      WHERE issue_id = ?
    `).run(issueId);

    return result.changes > 0;
  }

  /**
   * Get pixel analytics
   */
  getPixelAnalytics(pixelId, days = 7) {
    const analytics = this.db.prepare(`
      SELECT * FROM pixel_analytics
      WHERE pixel_id = ?
      AND date >= date('now', '-' || ? || ' days')
      ORDER BY date DESC
    `).all(pixelId, days);

    return analytics;
  }

  /**
   * Get pixel health history
   */
  getPixelHealth(pixelId, hours = 24) {
    const health = this.db.prepare(`
      SELECT * FROM pixel_health
      WHERE pixel_id = ?
      AND timestamp >= datetime('now', '-' || ? || ' hours')
      ORDER BY timestamp DESC
    `).all(pixelId, hours);

    // Calculate uptime percentage
    const totalChecks = health.length;
    const upChecks = health.filter(h => h.status === 'UP').length;
    const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks * 100).toFixed(2) : 100;

    return {
      history: health,
      uptime: uptimePercentage,
      totalChecks,
      currentStatus: health[0]?.status || 'UNKNOWN'
    };
  }

  /**
   * Get pixel uptime statistics
   */
  getPixelUptime(pixelId) {
    const last24h = this.getPixelHealth(pixelId, 24);
    const last7d = this.getPixelHealth(pixelId, 24 * 7);
    const last30d = this.getPixelHealth(pixelId, 24 * 30);

    return {
      last24Hours: last24h.uptime,
      last7Days: last7d.uptime,
      last30Days: last30d.uptime,
      currentStatus: last24h.currentStatus
    };
  }
}

export default new EnhancedPixelService();
