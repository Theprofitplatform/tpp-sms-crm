#!/usr/bin/env node

/**
 * Automated Ranking Monitor
 * Tracks keyword rankings daily and alerts on changes
 */

import { competitorAnalyzer } from '../audit/competitor-analysis.js';
import { logger } from '../audit/logger.js';
import { discordNotifier } from '../audit/discord-notifier.js';
import { config } from '../../config/env/config.js';
import fs from 'fs';
import path from 'path';

// Validate configuration on startup
config.validateMonitoring();

class RankingMonitor {
  constructor() {
    this.siteUrl = 'https://instantautotraders.com.au';
    this.keywords = [
      // Core branded keywords
      'instant auto traders',
      'instant auto traders sydney',
      
      // Primary service keywords
      'sell car sydney',
      'cash for cars sydney',
      'instant car purchase sydney',
      'car buyers sydney',
      'sell your car online sydney',
      'car valuation sydney',
      'sell car fast sydney',
      'car buyers nsw',
      
      // Vehicle type variations
      'cash for utes sydney',
      'cash for trucks sydney',
      'cash for vans sydney',
      'cash for 4x4 sydney',
      'sell my ute sydney',
      'sell my truck sydney',
      'sell my van sydney',
      
      // Service variations
      'we buy cars sydney',
      'buy my car sydney',
      'instant cash for cars sydney',
      'quick car sale sydney',
      'sell car same day sydney',
      'car removal sydney',
      'free car removal sydney',
      'scrap car buyers sydney',
      'damaged car buyers sydney',
      'unwanted car removal sydney',
      
      // Location-specific keywords (Sydney suburbs)
      'sell car parramatta',
      'cash for cars parramatta',
      'sell car penrith',
      'cash for cars penrith',
      'sell car blacktown',
      'car buyers western sydney',
      'sell car liverpool',
      'car buyers campbelltown',
      
      // Competitive long-tail keywords
      'best place to sell car sydney',
      'highest paying car buyers sydney',
      'sell car online instantly sydney',
      'car valuation free sydney',
      'get quote sell car sydney',
      'sell car without inspection sydney',
      'sell car quick cash sydney',
      
      // Urgent/need-based keywords
      'need to sell car today sydney',
      'emergency car sale sydney',
      'sell car urgently sydney',
      'instant car buyer sydney'
    ];
    this.historyFile = 'logs/ranking-history.json';
    this.history = this.loadHistory();
  }

  /* istanbul ignore next */
  async monitor() {
    console.log('\n📊 Ranking Monitor - InstantAutoTraders.com.au\n');
    console.log('='.repeat(70));
    console.log(`Monitoring ${this.keywords.length} keywords...\n`);

    const today = new Date().toISOString().split('T')[0];
    const results = {
      date: today,
      timestamp: new Date().toISOString(),
      rankings: []
    };

    try {
      for (let i = 0; i < this.keywords.length; i++) {
        const keyword = this.keywords[i];
        console.log(`\n[${i + 1}/${this.keywords.length}] Checking: "${keyword}"`);
        console.log('-'.repeat(70));

        try {
          const comparison = await competitorAnalyzer.compareWithCompetitors(
            this.siteUrl,
            keyword,
            { limit: 20 }
          );

          const position = comparison.yourSite.position;
          const ranking = comparison.insights.youRank;

          console.log(`Position: ${position}`);
          console.log(`Ranking: ${ranking ? '✅ Yes' : '❌ No'}`);

          // Check for changes
          const previousRank = this.getPreviousRank(keyword);
          const change = this.calculateChange(previousRank, position);

          if (change !== 0) {
            const emoji = change > 0 ? '📈' : '📉';
            console.log(`${emoji} Change: ${change > 0 ? '+' : ''}${change} positions`);
          }

          results.rankings.push({
            keyword,
            position,
            ranking,
            change,
            topCompetitors: comparison.topCompetitors.slice(0, 3).map(c => c.domain),
            opportunities: comparison.insights.opportunities
          });

        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
          results.rankings.push({
            keyword,
            error: error.message
          });
        }

        // Rate limiting
        await this.delay(2000);
      }

      // Save results
      this.saveResults(results);

      // Generate alert summary
      const alerts = this.generateAlerts(results);

      // Send Discord notification
      await this.sendDiscordNotifications(results, alerts);

      // Print summary
      this.printSummary(results);

    } catch (error) {
      logger.error('Monitoring failed', error.message);
      console.log('\n❌ Error:', error.message);
    }
  }

  getPreviousRank(keyword) {
    if (this.history.length === 0) return null;

    const lastEntry = this.history[this.history.length - 1];
    const ranking = lastEntry.rankings.find(r => r.keyword === keyword);

    return ranking ? ranking.position : null;
  }

  calculateChange(previousRank, currentRank) {
    if (!previousRank || previousRank === 'Not in top 10' ||
        currentRank === 'Not in top 10') {
      return 0;
    }

    // Lower position number = better rank
    return previousRank - currentRank;
  }

  saveResults(results) {
    // Add to history
    this.history.push(results);

    // Keep last 90 days
    if (this.history.length > 90) {
      this.history = this.history.slice(-90);
    }

    // Save to file
    fs.writeFileSync(
      this.historyFile,
      JSON.stringify(this.history, null, 2)
    );

    // Save today's report
    const reportFile = `logs/ranking-${results.date}.json`;
    fs.writeFileSync(
      reportFile,
      JSON.stringify(results, null, 2)
    );

    console.log(`\n💾 Results saved to: ${reportFile}`);
  }

  generateAlerts(results) {
    const alerts = [];

    // Check for big improvements
    results.rankings.forEach(r => {
      if (r.change && r.change >= 3) {
        alerts.push({
          type: 'improvement',
          keyword: r.keyword,
          message: `📈 Big improvement! "${r.keyword}" moved up ${r.change} positions to #${r.position}`
        });
      }

      if (r.change && r.change <= -3) {
        alerts.push({
          type: 'drop',
          keyword: r.keyword,
          message: `📉 Drop detected! "${r.keyword}" dropped ${Math.abs(r.change)} positions to #${r.position}`
        });
      }

      // Check for new rankings
      if (r.ranking && !this.getPreviousRank(r.keyword)) {
        alerts.push({
          type: 'new',
          keyword: r.keyword,
          message: `🎉 New ranking! "${r.keyword}" now ranks at #${r.position}`
        });
      }
    });

    if (alerts.length > 0) {
      console.log('\n🔔 Alerts:\n');
      alerts.forEach(alert => {
        console.log(`   ${alert.message}`);
      });

      // Save alerts
      const alertFile = `logs/alerts-${results.date}.json`;
      fs.writeFileSync(alertFile, JSON.stringify(alerts, null, 2));
    }

    return alerts;
  }

  async sendDiscordNotifications(results, alerts) {
    try {
      console.log('\n📬 Sending Discord notifications...');

      // Send ranking update
      await discordNotifier.sendRankingUpdate(results);
      console.log('✅ Ranking update sent to Discord');

      // Send alerts if any
      if (alerts.length > 0) {
        await discordNotifier.sendRankingAlert(alerts);
        console.log('✅ Alert notification sent to Discord');
      }
    } catch (error) {
      console.log('⚠️  Discord notification failed:', error.message);
      // Don't fail the whole monitoring if Discord fails
    }
  }

  /* istanbul ignore next */
  printSummary(results) {
    console.log('\n' + '='.repeat(70));
    console.log('\n📈 Ranking Summary\n');

    const ranking = results.rankings.filter(r => r.ranking).length;
    const notRanking = results.rankings.filter(r => !r.ranking && !r.error).length;
    const errors = results.rankings.filter(r => r.error).length;

    console.log(`Keywords Tracked: ${this.keywords.length}`);
    console.log(`Ranking in Top 20: ${ranking}`);
    console.log(`Not Ranking: ${notRanking}`);
    console.log(`Errors: ${errors}`);

    if (ranking > 0) {
      console.log('\n✅ Currently Ranking:\n');
      results.rankings
        .filter(r => r.ranking)
        .forEach(r => {
          console.log(`   ${r.position}. "${r.keyword}"`);
        });
    }

    // Calculate average position for ranking keywords
    const positions = results.rankings
      .filter(r => r.ranking && typeof r.position === 'number')
      .map(r => r.position);

    if (positions.length > 0) {
      const avgPosition = (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1);
      console.log(`\n📊 Average Position: ${avgPosition}`);
    }

    // Show trend over time
    if (this.history.length > 1) {
      console.log('\n📅 Trend (Last 7 Days):\n');
      this.printTrend();
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /* istanbul ignore next */
  printTrend() {
    const last7Days = this.history.slice(-7);

    this.keywords.slice(0, 5).forEach(keyword => {
      const trend = last7Days.map(day => {
        const ranking = day.rankings.find(r => r.keyword === keyword);
        return ranking?.position || '-';
      });

      console.log(`   ${keyword}: ${trend.join(' → ')}`);
    });
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('⚠️  Could not load history, starting fresh');
    }
    return [];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run monitor with error handling
/* istanbul ignore next */
const monitor = new RankingMonitor();

/* istanbul ignore next */
(async () => {
  try {
    await monitor.monitor();
  } catch (error) {
    console.error('❌ Fatal error in ranking monitor:', error);

    // Try to send error notification to Discord
    try {
      await discordNotifier.sendError({
        script: 'Ranking Monitor',
        error,
        timestamp: Date.now()
      });
    } catch (notifyError) {
      console.error('Failed to send error notification:', notifyError.message);
    }

    process.exit(1);
  }
})();
