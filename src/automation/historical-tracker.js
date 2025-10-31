/**
 * HISTORICAL TRACKING SERVICE
 * 
 * Tracks Local SEO metrics over time and generates trend analysis
 * Stores historical data and provides comparison capabilities
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HistoricalTracker {
  constructor(businessConfig) {
    this.config = businessConfig;
    this.db = this.initializeDatabase();
  }

  /**
   * Initialize SQLite database for historical tracking
   */
  initializeDatabase() {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'local-seo-history.db');
    const db = new Database(dbPath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        overall_score INTEGER,
        nap_score INTEGER,
        schema_score INTEGER,
        citation_score INTEGER,
        review_score INTEGER,
        reputation_score INTEGER,
        total_reviews INTEGER,
        average_rating REAL,
        total_citations INTEGER,
        competitive_position INTEGER,
        data_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_client_timestamp 
        ON audit_history(client_id, timestamp);

      CREATE TABLE IF NOT EXISTS metric_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_value REAL,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_metric_snapshots 
        ON metric_snapshots(client_id, metric_type, timestamp);
    `);

    return db;
  }

  /**
   * Store audit results in history
   */
  storeAudit(auditResults) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_history (
          client_id, timestamp, overall_score, nap_score, schema_score,
          citation_score, review_score, reputation_score, total_reviews,
          average_rating, total_citations, competitive_position, data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const data = {
        client_id: this.config.id,
        timestamp: auditResults.timestamp || new Date().toISOString(),
        overall_score: this.extractScore(auditResults, 'overall'),
        nap_score: this.extractScore(auditResults, 'nap'),
        schema_score: this.extractScore(auditResults, 'schema'),
        citation_score: this.extractScore(auditResults, 'citations'),
        review_score: this.extractScore(auditResults, 'reviews'),
        reputation_score: this.extractScore(auditResults, 'reputation'),
        total_reviews: auditResults.advanced?.reviews?.summary?.totalReviews || 0,
        average_rating: auditResults.advanced?.reviews?.summary?.averageRating || 0,
        total_citations: auditResults.advanced?.citations?.analysis?.found || 0,
        competitive_position: auditResults.advanced?.competitors?.comparison?.position || null,
        data_json: JSON.stringify(auditResults)
      };

      stmt.run(
        data.client_id,
        data.timestamp,
        data.overall_score,
        data.nap_score,
        data.schema_score,
        data.citation_score,
        data.review_score,
        data.reputation_score,
        data.total_reviews,
        data.average_rating,
        data.total_citations,
        data.competitive_position,
        data.data_json
      );

      console.log(`✅ Stored audit in history for ${this.config.id}`);
      return true;
    } catch (error) {
      console.error('Error storing audit history:', error);
      return false;
    }
  }

  /**
   * Extract score from audit results
   */
  extractScore(results, type) {
    switch (type) {
      case 'overall':
        return results.score || 0;
      case 'nap':
        return results.tasks?.napConsistency?.score || 0;
      case 'schema':
        return results.tasks?.schema?.hasSchema ? 100 : 0;
      case 'citations':
        return results.advanced?.citations?.analysis?.score || 0;
      case 'reviews':
        return results.advanced?.reviews?.summary?.reputationScore || 0;
      case 'reputation':
        return results.advanced?.reviews?.summary?.reputationScore || 0;
      default:
        return 0;
    }
  }

  /**
   * Get historical data for a date range
   */
  getHistory(days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const stmt = this.db.prepare(`
        SELECT * FROM audit_history
        WHERE client_id = ? AND timestamp >= ?
        ORDER BY timestamp ASC
      `);

      const results = stmt.all(this.config.id, cutoffDate.toISOString());
      
      return results.map(row => ({
        ...row,
        data_json: JSON.parse(row.data_json || '{}')
      }));
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }

  /**
   * Calculate trends from historical data
   */
  calculateTrends(days = 30) {
    const history = this.getHistory(days);

    if (history.length < 2) {
      return {
        insufficient_data: true,
        message: 'Need at least 2 data points for trend analysis',
        dataPoints: history.length
      };
    }

    const first = history[0];
    const last = history[history.length - 1];

    const trends = {
      period: {
        start: first.timestamp,
        end: last.timestamp,
        days: Math.ceil((new Date(last.timestamp) - new Date(first.timestamp)) / (1000 * 60 * 60 * 24)),
        dataPoints: history.length
      },
      overallScore: this.calculateTrend(first.overall_score, last.overall_score),
      napScore: this.calculateTrend(first.nap_score, last.nap_score),
      citationScore: this.calculateTrend(first.citation_score, last.citation_score),
      reviewScore: this.calculateTrend(first.review_score, last.review_score),
      totalReviews: this.calculateTrend(first.total_reviews, last.total_reviews),
      averageRating: this.calculateTrend(first.average_rating, last.average_rating),
      totalCitations: this.calculateTrend(first.total_citations, last.total_citations),
      competitivePosition: this.calculatePositionTrend(first.competitive_position, last.competitive_position)
    };

    // Calculate overall trend direction
    const positiveMetrics = [
      trends.overallScore,
      trends.napScore,
      trends.citationScore,
      trends.reviewScore,
      trends.totalReviews
    ].filter(t => t.direction === 'up').length;

    const negativeMetrics = [
      trends.overallScore,
      trends.napScore,
      trends.citationScore,
      trends.reviewScore,
      trends.totalReviews
    ].filter(t => t.direction === 'down').length;

    trends.summary = {
      direction: positiveMetrics > negativeMetrics ? 'improving' : 
                 negativeMetrics > positiveMetrics ? 'declining' : 'stable',
      positiveMetrics,
      negativeMetrics,
      improvementRate: history.length > 1 ? 
        ((last.overall_score - first.overall_score) / history.length).toFixed(2) : 0
    };

    return trends;
  }

  /**
   * Calculate trend for a single metric
   */
  calculateTrend(oldValue, newValue) {
    const change = newValue - oldValue;
    const percentChange = oldValue > 0 ? ((change / oldValue) * 100).toFixed(1) : 0;

    return {
      from: oldValue,
      to: newValue,
      change,
      percentChange: parseFloat(percentChange),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      icon: change > 0 ? '📈' : change < 0 ? '📉' : '➡️'
    };
  }

  /**
   * Calculate position trend (lower is better)
   */
  calculatePositionTrend(oldPosition, newPosition) {
    if (!oldPosition || !newPosition) {
      return { direction: 'unknown', message: 'Position data unavailable' };
    }

    const change = oldPosition - newPosition; // Positive means improvement

    return {
      from: oldPosition,
      to: newPosition,
      change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      icon: change > 0 ? '📈' : change < 0 ? '📉' : '➡️',
      message: change > 0 ? `Improved by ${change} position(s)` : 
               change < 0 ? `Dropped by ${Math.abs(change)} position(s)` : 
               'Position unchanged'
    };
  }

  /**
   * Get chart data for visualization
   */
  getChartData(metric, days = 30) {
    const history = this.getHistory(days);

    const dataPoints = history.map(h => ({
      timestamp: h.timestamp,
      date: new Date(h.timestamp).toLocaleDateString(),
      value: h[`${metric}_score`] || h[metric] || 0
    }));

    return {
      labels: dataPoints.map(d => d.date),
      values: dataPoints.map(d => d.value),
      metric,
      period: `${days} days`,
      dataPoints: dataPoints.length,
      trend: dataPoints.length > 1 ? 
        this.calculateTrend(dataPoints[0].value, dataPoints[dataPoints.length - 1].value) : 
        null
    };
  }

  /**
   * Get comparison with previous period
   */
  getPeriodComparison(currentDays = 30) {
    const currentPeriod = this.getHistory(currentDays);
    
    if (currentPeriod.length === 0) {
      return { error: 'No data available' };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - currentDays);
    const previousCutoffDate = new Date(cutoffDate);
    previousCutoffDate.setDate(previousCutoffDate.getDate() - currentDays);

    const stmt = this.db.prepare(`
      SELECT * FROM audit_history
      WHERE client_id = ? 
        AND timestamp >= ? 
        AND timestamp < ?
      ORDER BY timestamp ASC
    `);

    const previousPeriod = stmt.all(
      this.config.id,
      previousCutoffDate.toISOString(),
      cutoffDate.toISOString()
    );

    const currentAvg = this.calculatePeriodAverage(currentPeriod);
    const previousAvg = this.calculatePeriodAverage(previousPeriod);

    return {
      current: {
        period: `Last ${currentDays} days`,
        dataPoints: currentPeriod.length,
        averages: currentAvg
      },
      previous: {
        period: `Previous ${currentDays} days`,
        dataPoints: previousPeriod.length,
        averages: previousAvg
      },
      comparison: {
        overallScore: this.calculateTrend(previousAvg.overall_score, currentAvg.overall_score),
        napScore: this.calculateTrend(previousAvg.nap_score, currentAvg.nap_score),
        citationScore: this.calculateTrend(previousAvg.citation_score, currentAvg.citation_score),
        reviewScore: this.calculateTrend(previousAvg.review_score, currentAvg.review_score)
      }
    };
  }

  /**
   * Calculate average metrics for a period
   */
  calculatePeriodAverage(data) {
    if (data.length === 0) {
      return {
        overall_score: 0,
        nap_score: 0,
        citation_score: 0,
        review_score: 0,
        total_reviews: 0,
        average_rating: 0
      };
    }

    const sum = data.reduce((acc, row) => ({
      overall_score: acc.overall_score + (row.overall_score || 0),
      nap_score: acc.nap_score + (row.nap_score || 0),
      citation_score: acc.citation_score + (row.citation_score || 0),
      review_score: acc.review_score + (row.review_score || 0),
      total_reviews: acc.total_reviews + (row.total_reviews || 0),
      average_rating: acc.average_rating + (row.average_rating || 0)
    }), {
      overall_score: 0,
      nap_score: 0,
      citation_score: 0,
      review_score: 0,
      total_reviews: 0,
      average_rating: 0
    });

    const count = data.length;

    return {
      overall_score: Math.round(sum.overall_score / count),
      nap_score: Math.round(sum.nap_score / count),
      citation_score: Math.round(sum.citation_score / count),
      review_score: Math.round(sum.review_score / count),
      total_reviews: Math.round(sum.total_reviews / count),
      average_rating: (sum.average_rating / count).toFixed(1)
    };
  }

  /**
   * Get insights based on historical data
   */
  getInsights(days = 30) {
    const trends = this.calculateTrends(days);
    
    if (trends.insufficient_data) {
      return {
        insights: [],
        message: 'Insufficient historical data for insights'
      };
    }

    const insights = [];

    // Improving metrics
    if (trends.overallScore.direction === 'up') {
      insights.push({
        type: 'positive',
        category: 'Overall Performance',
        message: `Your overall score has improved by ${trends.overallScore.change} points (${trends.overallScore.percentChange}%)`,
        icon: '🎉'
      });
    }

    // Declining metrics
    if (trends.overallScore.direction === 'down') {
      insights.push({
        type: 'warning',
        category: 'Overall Performance',
        message: `Your overall score has declined by ${Math.abs(trends.overallScore.change)} points (${Math.abs(trends.overallScore.percentChange)}%)`,
        icon: '⚠️'
      });
    }

    // Citations growing
    if (trends.totalCitations.direction === 'up' && trends.totalCitations.change > 2) {
      insights.push({
        type: 'positive',
        category: 'Citations',
        message: `Great progress! You've added ${trends.totalCitations.change} new citations`,
        icon: '📍'
      });
    }

    // Reviews growing
    if (trends.totalReviews.direction === 'up') {
      insights.push({
        type: 'positive',
        category: 'Reviews',
        message: `You've gained ${trends.totalReviews.change} new reviews`,
        icon: '⭐'
      });
    }

    // Rating improving
    if (trends.averageRating.direction === 'up' && trends.averageRating.change > 0.1) {
      insights.push({
        type: 'positive',
        category: 'Reputation',
        message: `Your average rating has improved by ${trends.averageRating.change.toFixed(1)} stars`,
        icon: '🌟'
      });
    }

    // Competitive position improving
    if (trends.competitivePosition.direction === 'up') {
      insights.push({
        type: 'positive',
        category: 'Competition',
        message: trends.competitivePosition.message,
        icon: '🏆'
      });
    }

    // Stagnant metrics
    if (trends.summary.direction === 'stable' && days >= 14) {
      insights.push({
        type: 'info',
        category: 'Performance',
        message: 'Your metrics have been stable. Consider new optimization strategies.',
        icon: 'ℹ️'
      });
    }

    return {
      period: trends.period,
      summary: trends.summary,
      insights,
      trends
    };
  }

  /**
   * Get all data for a comprehensive report
   */
  getComprehensiveReport(days = 30) {
    return {
      history: this.getHistory(days),
      trends: this.calculateTrends(days),
      insights: this.getInsights(days),
      periodComparison: this.getPeriodComparison(days),
      charts: {
        overallScore: this.getChartData('overall', days),
        napScore: this.getChartData('nap', days),
        citationScore: this.getChartData('citation', days),
        reviewScore: this.getChartData('review', days)
      }
    };
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

export default HistoricalTracker;
