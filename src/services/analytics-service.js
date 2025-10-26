/**
 * Advanced Analytics Service
 * Provides comprehensive analytics aggregation and insights
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/seo-automation.db');

class AnalyticsService {
  constructor() {
    this.db = new Database(dbPath);
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get comprehensive analytics for a client
   */
  getAnalytics(clientId, timeframe = '30d') {
    // Check cache first
    const cached = this.getFromCache(clientId, timeframe);
    if (cached) {
      return cached;
    }

    const { startDate, endDate } = this.parseTimeframe(timeframe);

    const analytics = {
      timeframe,
      period: { start: startDate, end: endDate },
      rankings: this.getRankingAnalytics(clientId, startDate, endDate),
      autoFixes: this.getAutoFixAnalytics(clientId, startDate, endDate),
      localSeo: this.getLocalSeoAnalytics(clientId, startDate, endDate),
      competitors: this.getCompetitorAnalytics(clientId, startDate, endDate),
      recommendations: this.getRecommendationsSummary(clientId)
    };

    // Cache the result
    this.saveToCache(clientId, timeframe, analytics);

    return analytics;
  }

  /**
   * Get ranking analytics
   */
  getRankingAnalytics(clientId, startDate, endDate) {
    // Get keyword performance data
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalKeywords,
        AVG(current_position) as avgPosition,
        SUM(CASE WHEN current_position <= 3 THEN 1 ELSE 0 END) as top3Count,
        SUM(CASE WHEN current_position <= 10 THEN 1 ELSE 0 END) as top10Count,
        SUM(CASE WHEN current_position <= 20 THEN 1 ELSE 0 END) as top20Count,
        AVG(search_volume) as avgSearchVolume
      FROM keyword_performance
      WHERE client_id = ? AND check_date >= ? AND check_date <= ?
    `);

    const current = stmt.get(clientId, startDate, endDate) || {};

    // Get previous period for comparison
    const prevPeriod = this.getPreviousPeriod(startDate, endDate);
    const previous = stmt.get(clientId, prevPeriod.start, prevPeriod.end) || {};

    // Calculate improvements
    const improvement = this.calculateImprovement(previous.avgPosition, current.avgPosition, true); // true = lower is better

    // Get trending keywords
    const trendingStmt = this.db.prepare(`
      SELECT
        keyword,
        current_position,
        previous_position,
        (previous_position - current_position) as positionChange
      FROM keyword_performance
      WHERE client_id = ?
        AND check_date >= ?
        AND check_date <= ?
        AND previous_position IS NOT NULL
      ORDER BY positionChange DESC
      LIMIT 10
    `);

    const trendingKeywords = trendingStmt.all(clientId, startDate, endDate);

    return {
      totalKeywords: current.totalKeywords || 0,
      avgPosition: Math.round((current.avgPosition || 0) * 10) / 10,
      top3Count: current.top3Count || 0,
      top10Count: current.top10Count || 0,
      top20Count: current.top20Count || 0,
      avgSearchVolume: current.avgSearchVolume || 0,
      improvement,
      trendingKeywords: trendingKeywords.map(kw => ({
        keyword: kw.keyword,
        position: kw.current_position,
        change: kw.positionChange,
        trend: kw.positionChange > 0 ? 'up' : kw.positionChange < 0 ? 'down' : 'stable'
      }))
    };
  }

  /**
   * Get auto-fix analytics
   */
  getAutoFixAnalytics(clientId, startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalApplied,
        fix_type,
        COUNT(*) as count
      FROM auto_fix_actions
      WHERE client_id = ? AND applied_at >= ? AND applied_at <= ?
      GROUP BY fix_type
    `);

    const fixes = stmt.all(clientId, startDate, endDate);

    const byType = {};
    let totalApplied = 0;

    fixes.forEach(fix => {
      byType[fix.fix_type] = fix.count;
      totalApplied += fix.count;
    });

    // Calculate impact score (based on number and types of fixes)
    const impactScore = Math.min(100, totalApplied * 5 + Object.keys(byType).length * 10);

    return {
      totalApplied,
      byType,
      impactScore: Math.round(impactScore)
    };
  }

  /**
   * Get local SEO analytics
   */
  getLocalSeoAnalytics(clientId, startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT
        AVG(gmb_score) as gmbScore,
        AVG(citation_score) as citationScore,
        AVG(review_rating) as avgRating,
        SUM(review_count) as totalReviews
      FROM local_seo_scores
      WHERE client_id = ? AND check_date >= ? AND check_date <= ?
    `);

    const data = stmt.get(clientId, startDate, endDate) || {};

    return {
      gmb: {
        score: Math.round(data.gmbScore || 0),
        issues: data.gmbScore < 80 ? Math.floor((100 - data.gmbScore) / 10) : 0
      },
      citations: {
        score: Math.round(data.citationScore || 0),
        accuracy: data.citationScore ? `${data.citationScore}%` : '0%'
      },
      reviews: {
        count: data.totalReviews || 0,
        avgRating: Math.round((data.avgRating || 0) * 10) / 10
      }
    };
  }

  /**
   * Get competitor analytics
   */
  getCompetitorAnalytics(clientId, startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(DISTINCT competitor_domain) as totalTracked,
        competitor_domain,
        AVG(position) as avgPosition
      FROM competitor_rankings
      WHERE client_id = ? AND check_date >= ? AND check_date <= ?
      GROUP BY competitor_domain
      ORDER BY avgPosition
      LIMIT 5
    `);

    const competitors = stmt.all(clientId, startDate, endDate);

    return {
      totalTracked: competitors.length,
      positionGaps: competitors.map(c => ({
        competitor: c.competitor_domain,
        gap: Math.round((c.avgPosition - 15) * 10) / 10, // Assuming client target is position 15
        improving: c.avgPosition > 15
      }))
    };
  }

  /**
   * Get recommendations summary
   */
  getRecommendationsSummary(clientId) {
    const stmt = this.db.prepare(`
      SELECT
        type,
        COUNT(*) as count
      FROM recommendations
      WHERE client_id = ? AND status = 'pending'
      GROUP BY type
    `);

    const recommendations = stmt.all(clientId);
    const summary = {};
    recommendations.forEach(r => {
      summary[r.type] = r.count;
    });

    return {
      total: recommendations.reduce((sum, r) => sum + r.count, 0),
      byType: summary
    };
  }

  /**
   * Parse timeframe string to dates
   */
  parseTimeframe(timeframe) {
    const endDate = new Date().toISOString().split('T')[0];
    let startDate;

    if (timeframe.endsWith('d')) {
      const days = parseInt(timeframe);
      const date = new Date();
      date.setDate(date.getDate() - days);
      startDate = date.toISOString().split('T')[0];
    } else if (timeframe === 'custom') {
      // Would need start and end dates passed separately
      startDate = endDate;
    } else {
      // Default to 30 days
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  }

  /**
   * Get previous period for comparison
   */
  getPreviousPeriod(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days);

    return {
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0]
    };
  }

  /**
   * Calculate improvement percentage
   */
  calculateImprovement(oldValue, newValue, lowerIsBetter = false) {
    if (!oldValue || oldValue === 0) return '+0%';

    const change = lowerIsBetter ? (oldValue - newValue) : (newValue - oldValue);
    const percentage = (change / oldValue) * 100;

    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${Math.round(percentage)}%`;
  }

  /**
   * Cache management
   */
  getFromCache(clientId, timeframe) {
    try {
      const stmt = this.db.prepare(`
        SELECT data, expires_at
        FROM analytics_cache
        WHERE client_id = ? AND timeframe = ? AND expires_at > datetime('now')
      `);

      const cached = stmt.get(clientId, timeframe);
      if (cached) {
        return JSON.parse(cached.data);
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  saveToCache(clientId, timeframe, data) {
    try {
      const expiresAt = new Date(Date.now() + this.cacheExpiry).toISOString();

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO analytics_cache (client_id, timeframe, data, expires_at)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(clientId, timeframe, JSON.stringify(data), expiresAt);
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Clear analytics cache for a client
   */
  clearCache(clientId) {
    const stmt = this.db.prepare('DELETE FROM analytics_cache WHERE client_id = ?');
    stmt.run(clientId);
  }

  close() {
    this.db.close();
  }
}

export default new AnalyticsService();
