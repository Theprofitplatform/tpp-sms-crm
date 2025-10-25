import { google } from 'googleapis';
import { logger } from '../audit/logger.js';
import { readFileSync } from 'fs';

/**
 * Google Search Console API Integration
 * FREE alternative to expensive SEO APIs
 * Gets YOUR actual ranking data, not estimates
 */
export class GoogleSearchConsole {
  constructor(serviceAccountPath = 'config/google/service-account.json') {
    try {
      const keyFile = readFileSync(serviceAccountPath, 'utf8');
      const credentials = JSON.parse(keyFile);
      
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
      });
      
      this.searchconsole = google.searchconsole({
        version: 'v1',
        auth: this.auth
      });
      
      logger.info('Google Search Console API initialized');
    } catch (error) {
      logger.error('Failed to initialize GSC API:', error.message);
      throw new Error(`GSC setup failed: ${error.message}`);
    }
  }

  /**
   * Get keyword rankings for a domain
   * This replaces expensive SEMrush/Ahrefs APIs
   */
  async getKeywordRankings(siteUrl, options = {}) {
    const {
      startDate = this.getDateDaysAgo(30),
      endDate = this.getDateDaysAgo(0),
      dimensions = ['query', 'page'],
      rowLimit = 1000
    } = options;

    try {
      logger.info(`Fetching rankings for ${siteUrl}...`);

      const response = await this.searchconsole.searchanalytics.query({
        siteUrl: siteUrl,
        requestBody: {
          startDate: startDate,
          endDate: endDate,
          dimensions: dimensions,
          rowLimit: rowLimit,
          dataState: 'final'
        }
      });

      const rows = response.data.rows || [];
      
      const rankings = rows.map(row => ({
        keyword: row.keys[0],
        page: row.keys[1] || siteUrl,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr * 100, // Convert to percentage
        position: Math.round(row.position)
      }));

      logger.success(`Found ${rankings.length} keywords`);
      return rankings;

    } catch (error) {
      logger.error('GSC API failed:', error.message);
      throw error;
    }
  }

  /**
   * Find "quick wins" - keywords ranking 11-20
   * These are easiest to improve (already close to page 1)
   */
  async findQuickWins(siteUrl) {
    logger.info('Finding quick win opportunities...');
    
    const rankings = await this.getKeywordRankings(siteUrl);
    
    // Filter for position 11-20 (page 2)
    const quickWins = rankings.filter(r => r.position > 10 && r.position <= 20);
    
    // Sort by impressions (high volume = high value)
    quickWins.sort((a, b) => b.impressions - a.impressions);
    
    // Calculate potential traffic gain
    const estimatedGain = this.calculateTrafficGain(quickWins);
    
    logger.success(`Found ${quickWins.length} quick wins`);
    logger.info(`Estimated traffic gain: +${Math.round(estimatedGain)} clicks/month`);
    
    return {
      total: quickWins.length,
      opportunities: quickWins.slice(0, 50),
      estimatedTrafficGain: Math.round(estimatedGain)
    };
  }

  /**
   * Find pages with low CTR despite good impressions
   * These need better titles/descriptions
   */
  async findLowCTRPages(siteUrl) {
    logger.info('Finding low CTR pages...');
    
    const rankings = await this.getKeywordRankings(siteUrl, {
      dimensions: ['page']
    });
    
    // Filter for pages with good impressions but low CTR
    const lowCTR = rankings.filter(r => 
      r.impressions > 100 && 
      r.ctr < 2.0 && 
      r.position <= 10
    );
    
    lowCTR.sort((a, b) => b.impressions - a.impressions);
    
    const potentialClicks = this.calculatePotentialClicks(lowCTR);
    
    logger.success(`Found ${lowCTR.length} low CTR pages`);
    logger.info(`Potential clicks gain: +${Math.round(potentialClicks)} clicks/month`);
    
    return {
      total: lowCTR.length,
      pages: lowCTR.slice(0, 20),
      potentialClicks: Math.round(potentialClicks)
    };
  }

  /**
   * Track position changes over time
   */
  async trackPositionChanges(siteUrl) {
    logger.info('Tracking position changes...');
    
    // Current period (last 7 days)
    const now = await this.getKeywordRankings(siteUrl, {
      startDate: this.getDateDaysAgo(7),
      endDate: this.getDateDaysAgo(0),
      dimensions: ['query']
    });

    // Previous period (30-37 days ago)
    const before = await this.getKeywordRankings(siteUrl, {
      startDate: this.getDateDaysAgo(37),
      endDate: this.getDateDaysAgo(30),
      dimensions: ['query']
    });

    const changes = this.compareRankings(before, now);
    
    const improvements = changes.filter(c => c.change > 0);
    const declines = changes.filter(c => c.change < 0);
    
    logger.success(`Tracked ${changes.length} keyword changes`);
    logger.info(`Improvements: ${improvements.length}, Declines: ${declines.length}`);
    
    return {
      improvements: improvements.slice(0, 20),
      declines: declines.slice(0, 20),
      summary: {
        avgPositionChange: this.calculateAvgChange(changes),
        totalKeywords: now.length,
        inTop10: now.filter(r => r.position <= 10).length,
        inTop20: now.filter(r => r.position <= 20).length
      }
    };
  }

  /**
   * Get overall site metrics
   */
  async getSiteMetrics(siteUrl) {
    logger.info('Fetching site metrics...');
    
    const response = await this.searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: this.getDateDaysAgo(30),
        endDate: this.getDateDaysAgo(0),
        dimensions: [],
        dataState: 'final'
      }
    });

    if (!response.data.rows || response.data.rows.length === 0) {
      return {
        totalClicks: 0,
        totalImpressions: 0,
        averageCTR: 0,
        averagePosition: 0,
        period: '30 days'
      };
    }

    const data = response.data.rows[0];
    
    return {
      totalClicks: data.clicks,
      totalImpressions: data.impressions,
      averageCTR: (data.ctr * 100).toFixed(2),
      averagePosition: data.position.toFixed(1),
      period: '30 days'
    };
  }

  /**
   * Get top performing pages
   */
  async getTopPages(siteUrl, limit = 20) {
    const rankings = await this.getKeywordRankings(siteUrl, {
      dimensions: ['page']
    });
    
    rankings.sort((a, b) => b.clicks - a.clicks);
    
    return rankings.slice(0, limit);
  }

  /**
   * Get top performing queries
   */
  async getTopQueries(siteUrl, limit = 50) {
    const rankings = await this.getKeywordRankings(siteUrl, {
      dimensions: ['query']
    });
    
    rankings.sort((a, b) => b.clicks - a.clicks);
    
    return rankings.slice(0, limit);
  }

  // Helper methods

  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  calculateTrafficGain(opportunities) {
    // Estimate traffic gain if we move from current position to position 5
    return opportunities.reduce((sum, opp) => {
      const currentCTR = this.getExpectedCTR(opp.position);
      const targetCTR = this.getExpectedCTR(5); // Target position 5
      const gain = opp.impressions * (targetCTR - currentCTR);
      return sum + gain;
    }, 0);
  }

  getExpectedCTR(position) {
    // Average CTR by position (industry data)
    const ctrByPosition = {
      1: 0.316, 2: 0.158, 3: 0.100, 4: 0.077, 5: 0.061,
      6: 0.050, 7: 0.042, 8: 0.036, 9: 0.031, 10: 0.027,
      11: 0.018, 12: 0.015, 13: 0.013, 14: 0.011, 15: 0.010,
      16: 0.008, 17: 0.007, 18: 0.006, 19: 0.005, 20: 0.004
    };
    return ctrByPosition[Math.round(position)] || 0.003;
  }

  calculatePotentialClicks(pages) {
    // Calculate potential clicks if CTR improves to 5%
    return pages.reduce((sum, page) => {
      const currentClicks = page.clicks;
      const potentialClicks = page.impressions * 0.05; // 5% CTR target
      return sum + (potentialClicks - currentClicks);
    }, 0);
  }

  compareRankings(before, now) {
    const beforeMap = new Map(before.map(r => [r.keyword, r.position]));
    
    return now.map(r => {
      const oldPosition = beforeMap.get(r.keyword) || null;
      return {
        keyword: r.keyword,
        oldPosition: oldPosition,
        newPosition: r.position,
        change: oldPosition ? (oldPosition - r.position) : 0, // Positive = improvement
        clicks: r.clicks,
        impressions: r.impressions
      };
    }).filter(r => r.change !== 0);
  }

  calculateAvgChange(changes) {
    if (changes.length === 0) return 0;
    const sum = changes.reduce((acc, c) => acc + c.change, 0);
    return (sum / changes.length).toFixed(1);
  }
}
