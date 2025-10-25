/**
 * Automated Rank Tracker
 *
 * Daily automated keyword rank checking with alerts
 */

import db from '../database/index.js';
import { GoogleSearchConsole } from './google-search-console.js';
import { discordNotifier } from '../audit/discord-notifier.js';

export class RankTracker {
  constructor(options = {}) {
    this.gsc = new GoogleSearchConsole();
    this.alertThreshold = options.alertThreshold || 5; // Alert on ±5 position changes
    this.daysToCompare = options.daysToCompare || 7; // Compare with 7 days ago
  }

  /**
   * Run rank tracking for all active clients
   */
  async runForAllClients() {
    console.log('🔍 Starting automated rank tracking for all clients...');

    const clients = db.clientOps.getAll().filter(c => c.status === 'active');
    const results = {
      clientsChecked: 0,
      totalKeywords: 0,
      alerts: 0,
      errors: []
    };

    for (const client of clients) {
      try {
        console.log(`  Checking rankings for ${client.name}...`);
        const result = await this.trackClient(client.id);

        results.clientsChecked++;
        results.totalKeywords += result.keywordsChecked;
        results.alerts += result.alertsTriggered;

      } catch (error) {
        console.error(`  ❌ Error tracking ${client.name}:`, error.message);
        results.errors.push({ client: client.name, error: error.message });
      }
    }

    console.log(`✅ Rank tracking complete: ${results.clientsChecked} clients, ${results.totalKeywords} keywords, ${results.alerts} alerts`);

    return results;
  }

  /**
   * Track rankings for a specific client
   */
  async trackClient(clientId) {
    const client = db.clientOps.getById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Get current keyword performance from GSC
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 3); // Last 3 days

    const gscData = await this.gsc.getSearchAnalytics(client.domain, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      dimensions: ['query']
    });

    if (!gscData || !gscData.rows) {
      console.log(`  No GSC data available for ${client.name}`);
      return { keywordsChecked: 0, alertsTriggered: 0 };
    }

    const alerts = [];
    let keywordsChecked = 0;

    for (const row of gscData.rows) {
      const keyword = row.keys[0];
      const currentPosition = row.position;
      const clicks = row.clicks;
      const impressions = row.impressions;
      const ctr = row.ctr;

      keywordsChecked++;

      // Get previous position
      const previousData = db.keywordOps.getKeywordHistory(clientId, keyword, this.daysToCompare);
      const previousPosition = previousData.length > 0 ? previousData[0].position : null;

      // Store current data
      db.keywordOps.record(clientId, keyword, {
        position: currentPosition,
        clicks,
        impressions,
        ctr,
        date: today.toISOString().split('T')[0]
      });

      // Check for significant changes
      if (previousPosition !== null) {
        const change = previousPosition - currentPosition; // Positive = improvement

        if (Math.abs(change) >= this.alertThreshold) {
          alerts.push({
            keyword,
            previousPosition,
            currentPosition,
            change,
            type: change > 0 ? 'improvement' : 'drop'
          });
        }
      }
    }

    // Send alerts if any
    if (alerts.length > 0 && process.env.DISCORD_NOTIFICATIONS_ENABLED === 'true') {
      await this.sendRankingAlerts(client, alerts);
    }

    return {
      keywordsChecked,
      alertsTriggered: alerts.length,
      alerts
    };
  }

  /**
   * Send ranking alerts to Discord
   */
  async sendRankingAlerts(client, alerts) {
    const formattedAlerts = alerts.map(alert => {
      const emoji = alert.type === 'improvement' ? '📈' : '📉';
      const changeText = alert.change > 0 ? `+${alert.change}` : alert.change;

      return {
        type: alert.type,
        message: `${emoji} **${alert.keyword}**: #${alert.previousPosition} → #${alert.currentPosition} (${changeText})`
      };
    });

    // Group improvements and drops
    const improvements = formattedAlerts.filter(a => a.type === 'improvement');
    const drops = formattedAlerts.filter(a => a.type === 'drop');

    // Send to Discord
    await discordNotifier.sendRankingAlert(formattedAlerts);

    // Send individual local SEO alert if severe drops
    const severeDrops = alerts.filter(a => a.change < -10);
    if (severeDrops.length > 0) {
      await discordNotifier.sendLocalSEOAlert({
        clientName: client.name,
        issueType: 'Severe Ranking Drops',
        severity: 'HIGH',
        message: `${severeDrops.length} keywords dropped 10+ positions`,
        score: 60
      });
    }

    return formattedAlerts;
  }

  /**
   * Get ranking summary for client
   */
  getRankingSummary(clientId, days = 30) {
    const keywords = db.keywordOps.getStats(clientId, days);
    const recentChanges = db.keywordOps.getRecentChanges(clientId, 7);

    const improvements = recentChanges.filter(k => k.change > 0).length;
    const drops = recentChanges.filter(k => k.change < 0).length;

    return {
      totalKeywords: keywords.total || 0,
      avgPosition: keywords.avgPosition || 0,
      topKeywords: keywords.topKeywords || [],
      recentChanges: {
        improvements,
        drops,
        neutral: recentChanges.length - improvements - drops
      }
    };
  }

  /**
   * Manual rank check for specific client
   */
  async checkNow(clientId) {
    console.log(`🔍 Manual rank check for client ${clientId}...`);
    return await this.trackClient(clientId);
  }
}

// Export singleton
export const rankTracker = new RankTracker();
