/**
 * Reconciliation Job - Stock Trading Automation System
 *
 * Scheduled job that runs position and order reconciliation
 * every 5 minutes during market hours.
 *
 * CRITICAL: This job detects discrepancies between broker and local
 * positions/orders that could indicate:
 *   - Bug in execution tracking
 *   - Network failures during order processing
 *   - Broker API issues
 *   - Data corruption
 *
 * On mismatch detection:
 *   - Triggers kill switch automatically (for critical mismatches)
 *   - Sends Discord/email alert
 *   - Logs to decision_log with full details
 *   - Stores report for audit trail
 *
 * Usage:
 *   - Automatically scheduled by the ops service
 *   - Can be triggered manually via API: POST /api/v1/reconciliation/trigger
 *   - Can be run via Makefile: make reconcile
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Market configurations for determining market hours
 */
const MARKET_CONFIGS = {
  US: {
    timezone: 'America/New_York',
    regularOpen: { hour: 9, minute: 30 },
    regularClose: { hour: 16, minute: 0 },
    preMarketOpen: { hour: 4, minute: 0 },
    afterHoursClose: { hour: 20, minute: 0 },
    is24_7: false,
  },
  ASX: {
    timezone: 'Australia/Sydney',
    regularOpen: { hour: 10, minute: 0 },
    regularClose: { hour: 16, minute: 0 },
    is24_7: false,
  },
  CRYPTO: {
    timezone: 'UTC',
    is24_7: true,
  },
};

/**
 * Reconciliation Job Runner
 */
export class ReconciliationJob {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.config = {
      executionServiceUrl: options.executionServiceUrl ||
        process.env.EXECUTION_SERVICE_URL || 'http://localhost:5104',
      riskServiceUrl: options.riskServiceUrl ||
        process.env.RISK_SERVICE_URL || 'http://localhost:5103',
      discordWebhook: options.discordWebhook || process.env.DISCORD_WEBHOOK_URL,
      runIntervalMs: options.runIntervalMs || 5 * 60 * 1000, // 5 minutes
      includeOrders: options.includeOrders ?? true,
      timeout: options.timeout || 30000,
    };

    this.isRunning = false;
    this.intervalHandle = null;
    this.lastRunResult = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3;
  }

  /**
   * Start the scheduled reconciliation job
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Reconciliation job already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting reconciliation job', {
      intervalMs: this.config.runIntervalMs,
      intervalMinutes: this.config.runIntervalMs / 60000,
    });

    // Run immediately on start
    this._runReconciliation();

    // Schedule recurring runs
    this.intervalHandle = setInterval(() => {
      this._runReconciliation();
    }, this.config.runIntervalMs);
  }

  /**
   * Stop the scheduled reconciliation job
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.logger.info('Reconciliation job stopped');
  }

  /**
   * Check if any market is currently open
   */
  isMarketOpen() {
    const now = new Date();

    for (const [market, config] of Object.entries(MARKET_CONFIGS)) {
      if (config.is24_7) {
        return true; // Crypto is always open
      }

      try {
        // Get time in market timezone
        const localTimeStr = now.toLocaleString('en-US', { timeZone: config.timezone });
        const localTime = new Date(localTimeStr);
        const dayOfWeek = localTime.getDay();

        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        const hours = localTime.getHours();
        const minutes = localTime.getMinutes();
        const currentMinutes = hours * 60 + minutes;

        // Check regular hours
        if (config.regularOpen && config.regularClose) {
          const openMinutes = config.regularOpen.hour * 60 + config.regularOpen.minute;
          const closeMinutes = config.regularClose.hour * 60 + config.regularClose.minute;

          if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
            return true;
          }
        }

        // Check extended hours (pre-market and after-hours)
        if (config.preMarketOpen) {
          const preOpenMinutes = config.preMarketOpen.hour * 60 + config.preMarketOpen.minute;
          const openMinutes = config.regularOpen.hour * 60 + config.regularOpen.minute;

          if (currentMinutes >= preOpenMinutes && currentMinutes < openMinutes) {
            return true;
          }
        }

        if (config.afterHoursClose) {
          const closeMinutes = config.regularClose.hour * 60 + config.regularClose.minute;
          const afterCloseMinutes = config.afterHoursClose.hour * 60 + config.afterHoursClose.minute;

          if (currentMinutes >= closeMinutes && currentMinutes <= afterCloseMinutes) {
            return true;
          }
        }
      } catch (error) {
        this.logger.warn('Error checking market hours', { market, error: error.message });
      }
    }

    return false;
  }

  /**
   * Internal method to run reconciliation
   */
  async _runReconciliation() {
    // Only run during market hours (unless crypto is being traded)
    if (!this.isMarketOpen()) {
      this.logger.debug('Skipping reconciliation - markets closed');
      return;
    }

    this.logger.info('Running scheduled reconciliation');

    try {
      const result = await this.run();
      this.lastRunResult = result;
      this.consecutiveErrors = 0;

      // Log result
      if (result.status === 'mismatch') {
        this.logger.warn('Reconciliation found mismatches', {
          mismatchCount: result.mismatch_count,
          requiresIntervention: result.requires_intervention,
        });
      } else if (result.status === 'error') {
        this.logger.error('Reconciliation returned error', {
          error: result.error,
        });
      } else {
        this.logger.info('Reconciliation completed successfully', {
          brokerPositions: result.broker_position_count,
          localPositions: result.local_position_count,
        });
      }
    } catch (error) {
      this.consecutiveErrors++;
      this.logger.error('Reconciliation job failed', {
        error: error.message,
        consecutiveErrors: this.consecutiveErrors,
      });

      // After multiple consecutive errors, send alert
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        await this._sendErrorAlert(error);
      }
    }
  }

  /**
   * Run reconciliation manually
   */
  async run() {
    const startTime = Date.now();

    try {
      // Call execution service reconciliation endpoint
      const response = await axios.post(
        `${this.config.executionServiceUrl}/api/v1/reconciliation/run`,
        null,
        {
          params: {
            include_orders: this.config.includeOrders,
          },
          timeout: this.config.timeout,
        }
      );

      const result = response.data;
      const duration = Date.now() - startTime;

      this.logger.info('Reconciliation completed', {
        status: result.status,
        duration_ms: duration,
        broker_positions: result.broker_position_count,
        local_positions: result.local_position_count,
        mismatches: result.mismatch_count,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error.response) {
        // Server responded with error
        this.logger.error('Reconciliation API error', {
          status: error.response.status,
          data: error.response.data,
          duration_ms: duration,
        });

        return {
          status: 'error',
          error: error.response.data?.detail || 'API error',
          duration_ms: duration,
        };
      } else {
        // Network error or timeout
        this.logger.error('Reconciliation request failed', {
          error: error.message,
          duration_ms: duration,
        });

        throw error;
      }
    }
  }

  /**
   * Get the status of the reconciliation job
   */
  async getStatus() {
    try {
      const response = await axios.get(
        `${this.config.executionServiceUrl}/api/v1/reconciliation/status`,
        { timeout: this.config.timeout }
      );

      return {
        job_running: this.isRunning,
        interval_ms: this.config.runIntervalMs,
        last_run_result: this.lastRunResult,
        consecutive_errors: this.consecutiveErrors,
        ...response.data,
      };
    } catch (error) {
      return {
        job_running: this.isRunning,
        interval_ms: this.config.runIntervalMs,
        last_run_result: this.lastRunResult,
        consecutive_errors: this.consecutiveErrors,
        error: error.message,
      };
    }
  }

  /**
   * Get reconciliation history
   */
  async getHistory(limit = 50) {
    try {
      const response = await axios.get(
        `${this.config.executionServiceUrl}/api/v1/reconciliation/history`,
        {
          params: { limit },
          timeout: this.config.timeout,
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get reconciliation history', { error: error.message });
      throw error;
    }
  }

  /**
   * Send error alert when reconciliation fails repeatedly
   */
  async _sendErrorAlert(error) {
    if (!this.config.discordWebhook) {
      return;
    }

    const embed = {
      title: ':rotating_light: Reconciliation Job Failing',
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
        text: 'Reconciliation job needs attention',
      },
    };

    try {
      await axios.post(this.config.discordWebhook, {
        embeds: [embed],
      });
    } catch (webhookError) {
      this.logger.error('Failed to send error alert', { error: webhookError.message });
    }
  }
}

export default ReconciliationJob;
