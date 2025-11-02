/**
 * Google Search Console Service
 * Handles GSC API integration, data import, and traffic-based prioritization
 */

import { google } from 'googleapis';
import db from '../database/index.js';

class GoogleSearchConsoleService {
  constructor() {
    this.searchconsole = null;
    this.oauth2Client = null;
  }

  /**
   * Initialize OAuth2 client
   */
  initializeOAuth(credentials) {
    const { client_id, client_secret, redirect_uri } = credentials;

    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri || 'http://localhost:9000/api/gsc/callback'
    );

    this.searchconsole = google.searchconsole({
      version: 'v1',
      auth: this.oauth2Client
    });

    return this.oauth2Client;
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl() {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized. Call initializeOAuth first.');
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
      prompt: 'consent'
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async authenticate(code) {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    return tokens;
  }

  /**
   * Set credentials from stored tokens
   */
  setCredentials(tokens) {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized');
    }

    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Verify property ownership
   */
  async verifyProperty(propertyUrl) {
    try {
      const response = await this.searchconsole.sites.get({
        siteUrl: propertyUrl
      });

      return {
        verified: true,
        permissionLevel: response.data.permissionLevel,
        siteUrl: response.data.siteUrl
      };
    } catch (error) {
      console.error('Property verification error:', error.message);
      return {
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * List all verified properties
   */
  async listProperties() {
    try {
      const response = await this.searchconsole.sites.list();
      return response.data.siteEntry || [];
    } catch (error) {
      console.error('Failed to list properties:', error.message);
      throw error;
    }
  }

  /**
   * Import search analytics data for a date range
   */
  async importSearchAnalytics(propertyUrl, startDate, endDate, dimensions = ['page', 'query']) {
    try {
      const response = await this.searchconsole.searchanalytics.query({
        siteUrl: propertyUrl,
        requestBody: {
          startDate: startDate,
          endDate: endDate,
          dimensions: dimensions,
          rowLimit: 25000
        }
      });

      const rows = response.data.rows || [];
      console.log(`Fetched ${rows.length} rows of search analytics data`);

      return rows;
    } catch (error) {
      console.error('Failed to import search analytics:', error.message);
      throw error;
    }
  }

  /**
   * Import and store search analytics in database
   */
  async syncSearchAnalytics(clientId, propertyId, propertyUrl, days = 30) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      console.log(`Syncing GSC data from ${startDate} to ${endDate}`);

      const data = await this.importSearchAnalytics(propertyUrl, startDate, endDate);

      // Store in database
      const stmt = db.db.prepare(`
        INSERT INTO gsc_search_analytics (
          property_id, page_url, query, clicks, impressions, ctr, position, date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(property_id, page_url, query, date, device)
        DO UPDATE SET
          clicks = excluded.clicks,
          impressions = excluded.impressions,
          ctr = excluded.ctr,
          position = excluded.position
      `);

      const insert = db.db.transaction((rows) => {
        for (const row of rows) {
          const page = row.keys[0];
          const query = row.keys[1] || null;

          stmt.run(
            propertyId,
            page,
            query,
            row.clicks || 0,
            row.impressions || 0,
            row.ctr || 0,
            row.position || 0,
            endDate
          );
        }
      });

      insert(data);

      // Update property sync status
      db.db.prepare(`
        UPDATE gsc_properties
        SET last_sync = ?, last_sync_status = 'success'
        WHERE id = ?
      `).run(new Date().toISOString(), propertyId);

      console.log(`✅ Synced ${data.length} analytics records`);

      // Update page performance summaries
      await this.updatePagePerformanceSummaries(propertyId);

      return {
        success: true,
        recordsImported: data.length,
        startDate,
        endDate
      };
    } catch (error) {
      console.error('Sync failed:', error.message);

      // Update property sync status
      db.db.prepare(`
        UPDATE gsc_properties
        SET last_sync_status = 'failed', last_sync_error = ?
        WHERE id = ?
      `).run(error.message, propertyId);

      throw error;
    }
  }

  /**
   * Calculate and update page performance summaries
   */
  async updatePagePerformanceSummaries(propertyId) {
    const today = new Date().toISOString().split('T')[0];
    const date7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const date30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const date90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get unique pages
    const pages = db.db.prepare(`
      SELECT DISTINCT page_url
      FROM gsc_search_analytics
      WHERE property_id = ?
    `).all(propertyId);

    for (const { page_url } of pages) {
      // 7-day metrics
      const metrics7d = db.db.prepare(`
        SELECT
          SUM(clicks) as clicks,
          SUM(impressions) as impressions,
          AVG(ctr) as ctr,
          AVG(position) as position
        FROM gsc_search_analytics
        WHERE property_id = ? AND page_url = ? AND date >= ?
      `).get(propertyId, page_url, date7d);

      // 30-day metrics
      const metrics30d = db.db.prepare(`
        SELECT
          SUM(clicks) as clicks,
          SUM(impressions) as impressions,
          AVG(ctr) as ctr,
          AVG(position) as position
        FROM gsc_search_analytics
        WHERE property_id = ? AND page_url = ? AND date >= ?
      `).get(propertyId, page_url, date30d);

      // 90-day metrics
      const metrics90d = db.db.prepare(`
        SELECT
          SUM(clicks) as clicks,
          SUM(impressions) as impressions,
          AVG(ctr) as ctr,
          AVG(position) as position
        FROM gsc_search_analytics
        WHERE property_id = ? AND page_url = ? AND date >= ?
      `).get(propertyId, page_url, date90d);

      // Top queries for this page
      const topQueries = db.db.prepare(`
        SELECT query, SUM(clicks) as clicks
        FROM gsc_search_analytics
        WHERE property_id = ? AND page_url = ? AND query IS NOT NULL AND date >= ?
        GROUP BY query
        ORDER BY clicks DESC
        LIMIT 10
      `).all(propertyId, page_url, date30d);

      // Calculate trends (simple comparison: last 7d vs previous 7d)
      const prevMetrics7d = db.db.prepare(`
        SELECT SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(position) as position
        FROM gsc_search_analytics
        WHERE property_id = ? AND page_url = ?
        AND date >= ? AND date < ?
      `).get(propertyId, page_url,
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date7d
      );

      const clicksTrend = this.calculateTrend(metrics7d.clicks, prevMetrics7d.clicks);
      const impressionsTrend = this.calculateTrend(metrics7d.impressions, prevMetrics7d.impressions);
      const positionTrend = this.calculateTrend(prevMetrics7d.position, metrics7d.position); // Lower is better

      // Insert or update page performance
      db.db.prepare(`
        INSERT INTO gsc_page_performance (
          property_id, page_url,
          clicks_7d, impressions_7d, ctr_7d, position_7d,
          clicks_30d, impressions_30d, ctr_30d, position_30d,
          clicks_90d, impressions_90d, ctr_90d, position_90d,
          clicks_trend, impressions_trend, position_trend,
          top_queries, avg_query_position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(property_id, page_url) DO UPDATE SET
          clicks_7d = excluded.clicks_7d,
          impressions_7d = excluded.impressions_7d,
          ctr_7d = excluded.ctr_7d,
          position_7d = excluded.position_7d,
          clicks_30d = excluded.clicks_30d,
          impressions_30d = excluded.impressions_30d,
          ctr_30d = excluded.ctr_30d,
          position_30d = excluded.position_30d,
          clicks_90d = excluded.clicks_90d,
          impressions_90d = excluded.impressions_90d,
          ctr_90d = excluded.ctr_90d,
          position_90d = excluded.position_90d,
          clicks_trend = excluded.clicks_trend,
          impressions_trend = excluded.impressions_trend,
          position_trend = excluded.position_trend,
          top_queries = excluded.top_queries,
          avg_query_position = excluded.avg_query_position,
          last_updated = CURRENT_TIMESTAMP
      `).run(
        propertyId,
        page_url,
        metrics7d.clicks || 0,
        metrics7d.impressions || 0,
        metrics7d.ctr || 0,
        metrics7d.position || 0,
        metrics30d.clicks || 0,
        metrics30d.impressions || 0,
        metrics30d.ctr || 0,
        metrics30d.position || 0,
        metrics90d.clicks || 0,
        metrics90d.impressions || 0,
        metrics90d.ctr || 0,
        metrics90d.position || 0,
        clicksTrend,
        impressionsTrend,
        positionTrend,
        JSON.stringify(topQueries.map(q => ({ query: q.query, clicks: q.clicks }))),
        metrics30d.position || 0
      );
    }

    console.log(`✅ Updated performance summaries for ${pages.length} pages`);
  }

  /**
   * Calculate trend (up, down, stable)
   */
  calculateTrend(current, previous) {
    if (!previous || previous === 0) return 'new';
    const change = ((current - previous) / previous) * 100;
    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
  }

  /**
   * Get page performance metrics
   */
  getPagePerformance(propertyId, pageUrl) {
    return db.db.prepare(`
      SELECT * FROM gsc_page_performance
      WHERE property_id = ? AND page_url = ?
    `).get(propertyId, pageUrl);
  }

  /**
   * Get top performing pages
   */
  getTopPages(propertyId, limit = 100, orderBy = 'clicks_30d') {
    return db.db.prepare(`
      SELECT * FROM gsc_page_performance
      WHERE property_id = ?
      ORDER BY ${orderBy} DESC
      LIMIT ?
    `).all(propertyId, limit);
  }

  /**
   * Enrich proposal with GSC data
   */
  async enrichProposal(proposal) {
    try {
      // Get client's GSC property
      const property = db.db.prepare(`
        SELECT id FROM gsc_properties
        WHERE client_id = ? AND verified = 1
        LIMIT 1
      `).get(proposal.client_id);

      if (!property) {
        console.log(`No verified GSC property for client ${proposal.client_id}`);
        return proposal;
      }

      // Get page performance for proposal's target URL
      const performance = this.getPagePerformance(property.id, proposal.target_url);

      if (!performance) {
        console.log(`No GSC data for URL: ${proposal.target_url}`);
        return proposal;
      }

      // Calculate priority score based on traffic
      const priorityScore = this.calculatePriorityScore(performance);
      const trafficPotential = this.assessTrafficPotential(performance);

      // Store GSC enrichment data
      db.db.prepare(`
        INSERT INTO proposal_gsc_data (
          proposal_id,
          before_clicks_7d, before_impressions_7d, before_ctr_7d, before_position_7d,
          priority_score, traffic_potential, before_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        proposal.id,
        performance.clicks_7d,
        performance.impressions_7d,
        performance.ctr_7d,
        performance.position_7d,
        priorityScore,
        trafficPotential,
        new Date().toISOString().split('T')[0]
      );

      return {
        ...proposal,
        gsc_data: {
          clicks_7d: performance.clicks_7d,
          impressions_7d: performance.impressions_7d,
          ctr_7d: performance.ctr_7d,
          position_7d: performance.position_7d,
          clicks_30d: performance.clicks_30d,
          impressions_30d: performance.impressions_30d,
          trend: performance.clicks_trend,
          priority_score: priorityScore,
          traffic_potential: trafficPotential
        }
      };
    } catch (error) {
      console.error('Failed to enrich proposal with GSC data:', error);
      return proposal;
    }
  }

  /**
   * Calculate priority score (0-100) based on traffic metrics
   */
  calculatePriorityScore(performance) {
    const clicks = performance.clicks_30d || 0;
    const impressions = performance.impressions_30d || 0;
    const position = performance.position_30d || 100;

    // Scoring formula:
    // - High clicks = higher priority
    // - High impressions = higher priority
    // - Better position (lower number) = slightly higher priority
    // - Upward trend = bonus points

    let score = 0;

    // Clicks score (0-40 points)
    score += Math.min(40, clicks / 10);

    // Impressions score (0-30 points)
    score += Math.min(30, impressions / 100);

    // Position score (0-20 points, better for positions 1-10)
    if (position <= 10) {
      score += 20 - (position * 2);
    } else if (position <= 20) {
      score += 10 - position;
    }

    // Trend bonus (0-10 points)
    if (performance.clicks_trend === 'up') score += 10;
    else if (performance.clicks_trend === 'stable') score += 5;

    return Math.min(100, Math.round(score));
  }

  /**
   * Assess traffic potential (high, medium, low)
   */
  assessTrafficPotential(performance) {
    const clicks = performance.clicks_30d || 0;
    const impressions = performance.impressions_30d || 0;
    const ctr = performance.ctr_30d || 0;
    const position = performance.position_30d || 100;

    // High potential: Good impressions, poor CTR, or good impressions with position > 10
    if (impressions > 1000 && ctr < 0.05) return 'high';
    if (impressions > 500 && position > 10 && position < 20) return 'high';

    // Medium potential: Decent impressions, decent position
    if (impressions > 100 && position < 20) return 'medium';
    if (clicks > 50) return 'medium';

    // Low potential: Low impressions
    return 'low';
  }

  /**
   * Prioritize proposals by GSC traffic data
   */
  async prioritizeProposals(proposals) {
    const enrichedProposals = [];

    for (const proposal of proposals) {
      const enriched = await this.enrichProposal(proposal);
      enrichedProposals.push(enriched);
    }

    // Sort by priority score (highest first)
    return enrichedProposals.sort((a, b) => {
      const scoreA = a.gsc_data?.priority_score || 0;
      const scoreB = b.gsc_data?.priority_score || 0;
      return scoreB - scoreA;
    });
  }
}

// Export singleton instance
const gscService = new GoogleSearchConsoleService();
export default gscService;
