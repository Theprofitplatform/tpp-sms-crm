/**
 * Daily Report Job - Stock Trading Automation System
 *
 * Generates end-of-day trading performance reports.
 * Runs at market close (typically 4:00 PM ET for US markets).
 *
 * Usage:
 *   - Automatically scheduled by the ops service
 *   - Can be triggered manually via API: POST /api/v1/reports/daily/generate
 *
 * Report Contents:
 *   - P&L summary (daily, weekly, monthly)
 *   - Drawdown analysis
 *   - Win/loss statistics
 *   - Top/bottom performing symbols
 *   - Trade history summary
 *   - Risk metrics
 *
 * Output:
 *   - JSON report saved to data/reports/daily-YYYY-MM-DD.json
 *   - Metrics pushed to Prometheus
 *   - Optional Discord/email notification
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Daily Report Generator
 */
export class DailyReportGenerator {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.config = {
      reportsDir: options.reportsDir || path.join(__dirname, '../../../data/reports'),
      executionServiceUrl: options.executionServiceUrl || process.env.EXECUTION_SERVICE_URL || 'http://localhost:5104',
      riskServiceUrl: options.riskServiceUrl || process.env.RISK_SERVICE_URL || 'http://localhost:5103',
      dataServiceUrl: options.dataServiceUrl || process.env.DATA_SERVICE_URL || 'http://localhost:5101',
      signalServiceUrl: options.signalServiceUrl || process.env.SIGNAL_SERVICE_URL || 'http://localhost:5102',
      discordWebhook: options.discordWebhook || process.env.DISCORD_WEBHOOK_URL,
      timeout: options.timeout || 30000,
    };
  }

  /**
   * Generate the daily report
   */
  async generate(date = null) {
    const reportDate = date ? new Date(date) : new Date();
    const dateStr = this.formatDate(reportDate);

    this.logger.info('Generating daily report', { date: dateStr });

    try {
      // Fetch data from all services in parallel
      const [trades, positions, riskMetrics, signals] = await Promise.all([
        this.fetchTrades(reportDate),
        this.fetchPositions(),
        this.fetchRiskMetrics(),
        this.fetchSignals(reportDate),
      ]);

      // Calculate report metrics
      const report = {
        meta: {
          generated_at: new Date().toISOString(),
          report_date: dateStr,
          trading_day: this.isTradingDay(reportDate),
          version: '1.0.0',
        },
        summary: this.calculateSummary(trades, positions),
        pnl: this.calculatePnL(trades, positions),
        drawdown: this.calculateDrawdown(positions, riskMetrics),
        trades: this.summarizeTrades(trades),
        symbols: this.analyzeSymbols(trades),
        signals: this.summarizeSignals(signals),
        risk: this.formatRiskMetrics(riskMetrics),
      };

      // Save report to file
      const filepath = await this.saveReport(report, dateStr);

      // Send notifications if configured
      if (this.config.discordWebhook) {
        await this.sendDiscordNotification(report);
      }

      this.logger.info('Daily report generated successfully', {
        date: dateStr,
        filepath,
        trades_count: trades.length,
        total_pnl: report.pnl.daily.realized,
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate daily report', {
        date: dateStr,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Fetch trades from execution service
   */
  async fetchTrades(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await axios.get(`${this.config.executionServiceUrl}/api/v1/trades`, {
        params: {
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString(),
        },
        timeout: this.config.timeout,
      });

      return response.data.trades || [];
    } catch (error) {
      this.logger.warn('Failed to fetch trades', { error: error.message });
      return [];
    }
  }

  /**
   * Fetch current positions
   */
  async fetchPositions() {
    try {
      const response = await axios.get(
        `${this.config.executionServiceUrl}/api/v1/positions`,
        { timeout: this.config.timeout }
      );
      return response.data.positions || [];
    } catch (error) {
      this.logger.warn('Failed to fetch positions', { error: error.message });
      return [];
    }
  }

  /**
   * Fetch risk metrics
   */
  async fetchRiskMetrics() {
    try {
      const response = await axios.get(
        `${this.config.riskServiceUrl}/api/v1/portfolio/risk`,
        { timeout: this.config.timeout }
      );
      return response.data;
    } catch (error) {
      this.logger.warn('Failed to fetch risk metrics', { error: error.message });
      return {};
    }
  }

  /**
   * Fetch signals generated today
   */
  async fetchSignals(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const response = await axios.get(`${this.config.signalServiceUrl}/api/v1/signals`, {
        params: {
          since: startOfDay.toISOString(),
        },
        timeout: this.config.timeout,
      });
      return response.data.signals || [];
    } catch (error) {
      this.logger.warn('Failed to fetch signals', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(trades, positions) {
    const completedTrades = trades.filter(t => t.status === 'filled');
    const winners = completedTrades.filter(t => (t.realized_pnl || 0) > 0);
    const losers = completedTrades.filter(t => (t.realized_pnl || 0) < 0);

    const totalPnL = completedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const winningPnL = winners.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const losingPnL = Math.abs(losers.reduce((sum, t) => sum + (t.realized_pnl || 0), 0));

    return {
      total_trades: completedTrades.length,
      winning_trades: winners.length,
      losing_trades: losers.length,
      win_rate: completedTrades.length > 0
        ? ((winners.length / completedTrades.length) * 100).toFixed(2)
        : 0,
      profit_factor: losingPnL > 0 ? (winningPnL / losingPnL).toFixed(2) : 'N/A',
      open_positions: positions.length,
      average_win: winners.length > 0 ? (winningPnL / winners.length).toFixed(2) : 0,
      average_loss: losers.length > 0 ? (losingPnL / losers.length).toFixed(2) : 0,
    };
  }

  /**
   * Calculate P&L metrics
   */
  calculatePnL(trades, positions) {
    const realizedPnL = trades
      .filter(t => t.status === 'filled')
      .reduce((sum, t) => sum + (t.realized_pnl || 0), 0);

    const unrealizedPnL = positions
      .reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

    const totalValue = positions
      .reduce((sum, p) => sum + (p.market_value || 0), 0);

    return {
      daily: {
        realized: parseFloat(realizedPnL.toFixed(2)),
        unrealized: parseFloat(unrealizedPnL.toFixed(2)),
        total: parseFloat((realizedPnL + unrealizedPnL).toFixed(2)),
      },
      portfolio: {
        total_value: parseFloat(totalValue.toFixed(2)),
        cash_balance: 0, // Would need to fetch from execution service
      },
    };
  }

  /**
   * Calculate drawdown metrics
   */
  calculateDrawdown(positions, riskMetrics) {
    const currentDrawdown = riskMetrics.current_drawdown_pct || 0;
    const maxDrawdown = riskMetrics.max_drawdown_pct || 0;

    return {
      current_pct: parseFloat(currentDrawdown.toFixed(2)),
      max_pct: parseFloat(maxDrawdown.toFixed(2)),
      status: currentDrawdown < 5 ? 'healthy' : currentDrawdown < 10 ? 'warning' : 'critical',
    };
  }

  /**
   * Summarize trade activity
   */
  summarizeTrades(trades) {
    const byType = trades.reduce((acc, t) => {
      const type = t.side || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const byStrategy = trades.reduce((acc, t) => {
      const strategy = t.strategy_id || 'unknown';
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {});

    const avgHoldingTime = this.calculateAvgHoldingTime(trades);

    return {
      by_type: byType,
      by_strategy: byStrategy,
      total_volume: trades.reduce((sum, t) => sum + ((t.quantity || 0) * (t.price || 0)), 0).toFixed(2),
      avg_holding_time_minutes: avgHoldingTime,
    };
  }

  /**
   * Calculate average holding time for closed trades
   */
  calculateAvgHoldingTime(trades) {
    const closedTrades = trades.filter(t => t.closed_at && t.opened_at);
    if (closedTrades.length === 0) return 0;

    const totalMinutes = closedTrades.reduce((sum, t) => {
      const opened = new Date(t.opened_at);
      const closed = new Date(t.closed_at);
      return sum + (closed - opened) / (1000 * 60);
    }, 0);

    return Math.round(totalMinutes / closedTrades.length);
  }

  /**
   * Analyze symbol performance
   */
  analyzeSymbols(trades) {
    const symbolStats = trades.reduce((acc, t) => {
      const symbol = t.symbol || 'unknown';
      if (!acc[symbol]) {
        acc[symbol] = { pnl: 0, trades: 0, wins: 0 };
      }
      acc[symbol].pnl += t.realized_pnl || 0;
      acc[symbol].trades += 1;
      if ((t.realized_pnl || 0) > 0) acc[symbol].wins += 1;
      return acc;
    }, {});

    const symbols = Object.entries(symbolStats).map(([symbol, stats]) => ({
      symbol,
      pnl: parseFloat(stats.pnl.toFixed(2)),
      trades: stats.trades,
      win_rate: ((stats.wins / stats.trades) * 100).toFixed(1),
    }));

    symbols.sort((a, b) => b.pnl - a.pnl);

    return {
      top_performers: symbols.slice(0, 5),
      bottom_performers: symbols.slice(-5).reverse(),
      total_symbols_traded: symbols.length,
    };
  }

  /**
   * Summarize signal generation
   */
  summarizeSignals(signals) {
    const byStrategy = signals.reduce((acc, s) => {
      const strategy = s.strategy_id || 'unknown';
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {});

    const byDirection = signals.reduce((acc, s) => {
      const direction = s.direction || 'unknown';
      acc[direction] = (acc[direction] || 0) + 1;
      return acc;
    }, {});

    return {
      total_generated: signals.length,
      by_strategy: byStrategy,
      by_direction: byDirection,
      avg_confidence: signals.length > 0
        ? (signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / signals.length).toFixed(2)
        : 0,
    };
  }

  /**
   * Format risk metrics
   */
  formatRiskMetrics(riskMetrics) {
    return {
      daily_loss_used_pct: parseFloat((riskMetrics.daily_loss_pct || 0).toFixed(2)),
      weekly_loss_used_pct: parseFloat((riskMetrics.weekly_loss_pct || 0).toFixed(2)),
      max_position_size_pct: parseFloat((riskMetrics.max_position_pct || 0).toFixed(2)),
      kill_switch_active: riskMetrics.kill_switch_active || false,
      risk_score: riskMetrics.risk_score || 'unknown',
    };
  }

  /**
   * Save report to file
   */
  async saveReport(report, dateStr) {
    // Ensure reports directory exists
    await fs.mkdir(this.config.reportsDir, { recursive: true });

    const filename = `daily-${dateStr}.json`;
    const filepath = path.join(this.config.reportsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));

    return filepath;
  }

  /**
   * Send Discord notification with report summary
   */
  async sendDiscordNotification(report) {
    if (!this.config.discordWebhook) return;

    const pnlEmoji = report.pnl.daily.total >= 0 ? ':chart_with_upwards_trend:' : ':chart_with_downwards_trend:';
    const pnlColor = report.pnl.daily.total >= 0 ? 0x28a745 : 0xdc3545;

    const embed = {
      title: `Daily Trading Report - ${report.meta.report_date}`,
      color: pnlColor,
      fields: [
        {
          name: `${pnlEmoji} Daily P&L`,
          value: `$${report.pnl.daily.total.toLocaleString()}`,
          inline: true,
        },
        {
          name: ':bar_chart: Trades',
          value: `${report.summary.total_trades} (${report.summary.win_rate}% win rate)`,
          inline: true,
        },
        {
          name: ':warning: Drawdown',
          value: `${report.drawdown.current_pct}%`,
          inline: true,
        },
        {
          name: ':trophy: Top Symbol',
          value: report.symbols.top_performers[0]?.symbol || 'N/A',
          inline: true,
        },
        {
          name: ':moneybag: Profit Factor',
          value: report.summary.profit_factor,
          inline: true,
        },
        {
          name: ':position_held:',
          value: `${report.summary.open_positions} open`,
          inline: true,
        },
      ],
      footer: {
        text: `Generated at ${report.meta.generated_at}`,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await axios.post(this.config.discordWebhook, {
        embeds: [embed],
      });
    } catch (error) {
      this.logger.warn('Failed to send Discord notification', { error: error.message });
    }
  }

  /**
   * List available reports
   */
  async listReports(limit = 30) {
    try {
      const files = await fs.readdir(this.config.reportsDir);
      const reports = files
        .filter(f => f.startsWith('daily-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit);

      return reports.map(filename => ({
        filename,
        date: filename.replace('daily-', '').replace('.json', ''),
        path: path.join(this.config.reportsDir, filename),
      }));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get a specific report by date
   */
  async getReport(date) {
    const dateStr = this.formatDate(new Date(date));
    const filepath = path.join(this.config.reportsDir, `daily-${dateStr}.json`);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Check if date is a trading day (simple check - excludes weekends)
   */
  isTradingDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }
}

export default DailyReportGenerator;
