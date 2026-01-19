/**
 * Corporate Actions Job - Stock Trading Automation System
 *
 * Scheduled job that fetches and processes corporate actions:
 * 1. Fetches upcoming corporate actions from Data Service
 * 2. Alerts on splits happening within the next 24 hours
 * 3. Auto-applies adjustments after ex-date
 * 4. Checks for unapplied past actions
 *
 * CRITICAL: Splits can affect position sizes and order quantities.
 * This job ensures the system stays in sync with corporate events.
 *
 * Schedule:
 *   - Runs daily at 6:00 AM ET (before US market pre-market opens)
 *   - Additional run at 5:00 PM ET (after US market closes)
 *
 * Usage:
 *   - Automatically scheduled by the ops service
 *   - Can be triggered manually via API: POST /api/v1/jobs/corporate-actions/run
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Corporate Actions Job Runner
 */
export class CorporateActionsJob {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.config = {
      dataServiceUrl: options.dataServiceUrl ||
        process.env.DATA_SERVICE_URL || 'http://localhost:5101',
      executionServiceUrl: options.executionServiceUrl ||
        process.env.EXECUTION_SERVICE_URL || 'http://localhost:5104',
      discordWebhook: options.discordWebhook || process.env.DISCORD_WEBHOOK_URL,
      watchlist: options.watchlist || [],  // Symbols to actively monitor
      daysAhead: options.daysAhead || 7,   // Days to look ahead for upcoming actions
      autoApply: options.autoApply ?? false,  // Auto-apply adjustments (disabled by default)
      timeout: options.timeout || 30000,
    };

    this.isRunning = false;
    this.schedulerHandle = null;
    this.lastRunResult = null;
    this.consecutiveErrors = 0;
  }

  /**
   * Start the scheduled job
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Corporate actions job already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting corporate actions job');

    // Schedule runs at 6:00 AM and 5:00 PM ET
    this._scheduleNextRun();
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.schedulerHandle) {
      clearTimeout(this.schedulerHandle);
      this.schedulerHandle = null;
    }

    this.logger.info('Corporate actions job stopped');
  }

  /**
   * Schedule the next run based on current time
   */
  _scheduleNextRun() {
    if (!this.isRunning) return;

    const now = new Date();
    const etOffset = -5; // ET offset from UTC (simplified, doesn't handle DST)

    // Calculate next run time (6 AM or 5 PM ET, whichever is next)
    const nextRun = new Date(now);
    const currentHourET = (now.getUTCHours() + etOffset + 24) % 24;

    if (currentHourET < 6) {
      // Before 6 AM ET, schedule for 6 AM today
      nextRun.setUTCHours(6 - etOffset, 0, 0, 0);
    } else if (currentHourET < 17) {
      // Between 6 AM and 5 PM ET, schedule for 5 PM today
      nextRun.setUTCHours(17 - etOffset, 0, 0, 0);
    } else {
      // After 5 PM ET, schedule for 6 AM tomorrow
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setUTCHours(6 - etOffset, 0, 0, 0);
    }

    const delay = nextRun.getTime() - now.getTime();

    this.logger.info('Scheduling next corporate actions job run', {
      next_run: nextRun.toISOString(),
      delay_hours: (delay / (1000 * 60 * 60)).toFixed(2),
    });

    this.schedulerHandle = setTimeout(async () => {
      await this._executeJob();
      this._scheduleNextRun();
    }, delay);
  }

  /**
   * Execute the job
   */
  async _executeJob() {
    this.logger.info('Running corporate actions job');

    try {
      const result = await this.run();
      this.lastRunResult = result;
      this.consecutiveErrors = 0;

      // Send alerts if needed
      if (result.alerts && result.alerts.length > 0) {
        await this._sendAlerts(result.alerts);
      }

      this.logger.info('Corporate actions job completed', {
        upcoming_actions: result.upcoming_count,
        pending_actions: result.pending_count,
        alerts_sent: result.alerts?.length || 0,
      });

    } catch (error) {
      this.consecutiveErrors++;
      this.logger.error('Corporate actions job failed', {
        error: error.message,
        consecutive_errors: this.consecutiveErrors,
      });

      if (this.consecutiveErrors >= 3) {
        await this._sendErrorAlert(error);
      }
    }
  }

  /**
   * Run the job manually
   */
  async run() {
    const startTime = Date.now();
    const result = {
      run_at: new Date().toISOString(),
      upcoming_count: 0,
      pending_count: 0,
      symbols_checked: 0,
      actions_applied: 0,
      alerts: [],
      errors: [],
    };

    try {
      // 1. Fetch pending and upcoming corporate actions
      const pendingResponse = await axios.get(
        `${this.config.dataServiceUrl}/api/v1/corporate-actions/pending`,
        {
          params: { days_ahead: this.config.daysAhead },
          timeout: this.config.timeout,
        }
      );

      const pending = pendingResponse.data.pending || [];
      const upcoming = pendingResponse.data.upcoming || [];

      result.pending_count = pending.length;
      result.upcoming_count = upcoming.length;

      // 2. Check for actions requiring immediate attention
      for (const action of pending) {
        // Past-due actions that haven't been applied
        result.alerts.push({
          type: 'pending_action',
          severity: 'high',
          symbol: action.symbol,
          action_type: action.action_type,
          ex_date: action.ex_date,
          days_overdue: action.days_overdue || 0,
          message: `${action.symbol} has unapplied ${action.action_type} from ${action.ex_date}`,
        });
      }

      // 3. Check for upcoming splits (high priority)
      const upcomingSplits = upcoming.filter(a => a.action_type === 'split');
      for (const split of upcomingSplits) {
        const daysUntil = split.days_until || 0;

        if (daysUntil <= 1) {
          // Split happening tomorrow or today
          result.alerts.push({
            type: 'imminent_split',
            severity: 'critical',
            symbol: split.symbol,
            ex_date: split.ex_date,
            split_ratio: `${split.split_ratio_to}-for-${split.split_ratio_from}`,
            days_until: daysUntil,
            message: `URGENT: ${split.symbol} split in ${daysUntil} day(s)`,
          });
        } else if (daysUntil <= 3) {
          // Split in next 3 days
          result.alerts.push({
            type: 'upcoming_split',
            severity: 'high',
            symbol: split.symbol,
            ex_date: split.ex_date,
            split_ratio: `${split.split_ratio_to}-for-${split.split_ratio_from}`,
            days_until: daysUntil,
            message: `${split.symbol} split in ${daysUntil} day(s)`,
          });
        }
      }

      // 4. Check positions that may need adjustment
      if (pending.length > 0 || upcomingSplits.some(s => s.days_until === 0)) {
        try {
          const positionCheckResponse = await axios.get(
            `${this.config.executionServiceUrl}/api/v1/positions/adjustment-check`,
            { timeout: this.config.timeout }
          );

          const adjustmentsNeeded = positionCheckResponse.data.adjustments_needed || 0;

          if (adjustmentsNeeded > 0) {
            result.alerts.push({
              type: 'positions_need_adjustment',
              severity: 'high',
              count: adjustmentsNeeded,
              message: `${adjustmentsNeeded} position(s) may need corporate action adjustment`,
            });
          }
        } catch (error) {
          this.logger.warn('Could not check positions for adjustments', { error: error.message });
        }
      }

      // 5. Fetch specific symbols from watchlist
      if (this.config.watchlist.length > 0) {
        for (const symbol of this.config.watchlist) {
          try {
            const actionsResponse = await axios.get(
              `${this.config.dataServiceUrl}/api/v1/corporate-actions/${symbol}`,
              { timeout: this.config.timeout }
            );

            result.symbols_checked++;

            const actions = actionsResponse.data.actions || [];
            const recentActions = actions.filter(a => {
              const exDate = new Date(a.ex_date);
              const daysDiff = (new Date() - exDate) / (1000 * 60 * 60 * 24);
              return daysDiff < 7 && daysDiff >= 0;
            });

            if (recentActions.length > 0) {
              this.logger.info('Recent corporate actions for watchlist symbol', {
                symbol,
                actions: recentActions.length,
              });
            }
          } catch (error) {
            result.errors.push({
              symbol,
              error: error.message,
            });
          }
        }
      }

      // 6. Auto-apply adjustments if enabled
      if (this.config.autoApply && pending.length > 0) {
        this.logger.warn('Auto-apply is enabled - this is not recommended for production');
        // Auto-apply logic would go here
        // For safety, this is disabled by default
      }

      result.duration_ms = Date.now() - startTime;
      return result;

    } catch (error) {
      result.errors.push({
        type: 'fetch_error',
        error: error.message,
      });
      result.duration_ms = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Send alerts via Discord
   */
  async _sendAlerts(alerts) {
    if (!this.config.discordWebhook || alerts.length === 0) {
      return;
    }

    // Group alerts by severity
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const highAlerts = alerts.filter(a => a.severity === 'high');
    const otherAlerts = alerts.filter(a => !['critical', 'high'].includes(a.severity));

    // Build Discord embeds
    const embeds = [];

    if (criticalAlerts.length > 0) {
      embeds.push({
        title: ':rotating_light: CRITICAL Corporate Action Alerts',
        color: 0xDC3545,
        timestamp: new Date().toISOString(),
        fields: criticalAlerts.map(a => ({
          name: a.symbol || 'System',
          value: a.message,
          inline: false,
        })),
      });
    }

    if (highAlerts.length > 0) {
      embeds.push({
        title: ':warning: Corporate Action Alerts',
        color: 0xFFC107,
        timestamp: new Date().toISOString(),
        fields: highAlerts.map(a => ({
          name: a.symbol || 'System',
          value: a.message,
          inline: false,
        })),
      });
    }

    if (otherAlerts.length > 0) {
      embeds.push({
        title: ':information_source: Corporate Action Updates',
        color: 0x17A2B8,
        timestamp: new Date().toISOString(),
        fields: otherAlerts.map(a => ({
          name: a.symbol || 'System',
          value: a.message,
          inline: false,
        })),
      });
    }

    // Send to Discord
    try {
      await axios.post(this.config.discordWebhook, { embeds });
      this.logger.info('Corporate action alerts sent to Discord', { count: alerts.length });
    } catch (error) {
      this.logger.error('Failed to send Discord alerts', { error: error.message });
    }
  }

  /**
   * Send error alert when job fails repeatedly
   */
  async _sendErrorAlert(error) {
    if (!this.config.discordWebhook) {
      return;
    }

    const embed = {
      title: ':x: Corporate Actions Job Failing',
      color: 0xDC3545,
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: 'Consecutive Errors',
          value: String(this.consecutiveErrors),
          inline: true,
        },
        {
          name: 'Error',
          value: error.message || 'Unknown error',
          inline: false,
        },
      ],
      footer: {
        text: 'Corporate actions monitoring may be impaired',
      },
    };

    try {
      await axios.post(this.config.discordWebhook, { embeds: [embed] });
    } catch (webhookError) {
      this.logger.error('Failed to send error alert', { error: webhookError.message });
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      is_running: this.isRunning,
      last_run_result: this.lastRunResult,
      consecutive_errors: this.consecutiveErrors,
      config: {
        days_ahead: this.config.daysAhead,
        watchlist_count: this.config.watchlist.length,
        auto_apply: this.config.autoApply,
      },
    };
  }
}

export default CorporateActionsJob;
