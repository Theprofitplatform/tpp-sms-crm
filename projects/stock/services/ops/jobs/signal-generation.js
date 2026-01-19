/**
 * Signal Generation Job - Stock Trading Automation System
 *
 * Scheduled job that generates trading signals every 15 minutes during
 * US market hours (9:30 AM - 4:00 PM EST, Monday-Friday).
 *
 * Features:
 *   - Configurable symbols via environment variables
 *   - Multiple strategy support (momentum, mean_reversion)
 *   - Market hours awareness (only runs during trading hours)
 *   - Discord notifications for new signals
 *   - Error handling with consecutive error tracking
 *
 * Configuration (Environment Variables):
 *   SIGNAL_GENERATION_ENABLED=true       - Enable/disable the job
 *   SIGNAL_GENERATION_INTERVAL_MINUTES=15 - Run interval in minutes
 *   SIGNAL_GENERATION_SYMBOLS=AAPL,MSFT,... - Comma-separated symbols
 *   SIGNAL_GENERATION_STRATEGIES=momentum,mean_reversion - Strategies to run
 *   SIGNAL_GENERATION_MARKET=US          - Market to generate signals for
 *
 * Usage:
 *   - Automatically scheduled by the ops service on startup
 *   - Can be triggered manually via API: POST /api/v1/signals/generate-job
 *   - Can be controlled via API: POST /api/v1/signals/job/start|stop|status
 *
 * Dependencies:
 *   - Signal Service must be running at SIGNAL_SERVICE_URL
 *   - Data Service must be available for market data
 */

import axios from 'axios';
import { EventTypes } from '../outbox/events.js';

/**
 * US Market configuration for determining market hours
 */
const US_MARKET_CONFIG = {
  timezone: 'America/New_York',
  regularOpen: { hour: 9, minute: 30 },
  regularClose: { hour: 16, minute: 0 },
  tradingDays: [1, 2, 3, 4, 5], // Monday = 1, Friday = 5
};

/**
 * Signal Generation Job Runner
 */
export class SignalGenerationJob {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.outboxPublisher = options.outboxPublisher || null;
    this.config = {
      signalServiceUrl: options.signalServiceUrl ||
        process.env.SIGNAL_SERVICE_URL || 'http://localhost:5102',
      discordWebhook: options.discordWebhook || process.env.DISCORD_WEBHOOK_URL,
      intervalMs: (options.intervalMinutes ||
        parseInt(process.env.SIGNAL_GENERATION_INTERVAL_MINUTES || '15', 10)) * 60 * 1000,
      symbols: options.symbols ||
        (process.env.SIGNAL_GENERATION_SYMBOLS || 'AAPL,MSFT,GOOGL,AMZN,TSLA,NVDA,META')
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0),
      strategies: options.strategies ||
        (process.env.SIGNAL_GENERATION_STRATEGIES || 'momentum,mean_reversion')
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0),
      market: options.market || process.env.SIGNAL_GENERATION_MARKET || 'US',
      lookbackDays: options.lookbackDays ||
        parseInt(process.env.SIGNAL_GENERATION_LOOKBACK_DAYS || '100', 10),
      timeout: options.timeout || 60000, // 60 seconds for signal generation
      notifyOnSignals: options.notifyOnSignals ?? true,
      minConfidenceForNotify: options.minConfidenceForNotify || 0.7,
      // Auto-execute signals through the outbox pattern
      autoExecuteSignals: options.autoExecuteSignals ??
        (process.env.SIGNAL_AUTO_EXECUTE === 'true'),
    };

    this.isRunning = false;
    this.intervalHandle = null;
    this.lastRunResult = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3;
    this.totalSignalsGenerated = 0;
    this.runCount = 0;
  }

  /**
   * Start the scheduled signal generation job
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Signal generation job already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting signal generation job', {
      intervalMinutes: this.config.intervalMs / 60000,
      symbols: this.config.symbols,
      strategies: this.config.strategies,
      market: this.config.market,
    });

    // Check if we should run immediately (if market is open)
    if (this.isMarketOpen()) {
      this._runSignalGeneration();
    } else {
      this.logger.info('Market closed - signal generation will start when market opens');
    }

    // Schedule recurring runs
    this.intervalHandle = setInterval(() => {
      this._runSignalGeneration();
    }, this.config.intervalMs);
  }

  /**
   * Stop the scheduled signal generation job
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

    this.logger.info('Signal generation job stopped', {
      totalRuns: this.runCount,
      totalSignalsGenerated: this.totalSignalsGenerated,
    });
  }

  /**
   * Check if US market is currently open (regular trading hours)
   * 9:30 AM - 4:00 PM EST, Monday-Friday
   */
  isMarketOpen() {
    const now = new Date();

    try {
      // Get time in US Eastern timezone
      const localTimeStr = now.toLocaleString('en-US', {
        timeZone: US_MARKET_CONFIG.timezone,
      });
      const localTime = new Date(localTimeStr);

      // Check day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeek = localTime.getDay();
      if (!US_MARKET_CONFIG.tradingDays.includes(dayOfWeek)) {
        return false; // Weekend
      }

      // Check time
      const hours = localTime.getHours();
      const minutes = localTime.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      const openMinutes =
        US_MARKET_CONFIG.regularOpen.hour * 60 +
        US_MARKET_CONFIG.regularOpen.minute;
      const closeMinutes =
        US_MARKET_CONFIG.regularClose.hour * 60 +
        US_MARKET_CONFIG.regularClose.minute;

      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } catch (error) {
      this.logger.warn('Error checking market hours', { error: error.message });
      // Default to running if we can't determine market hours
      return true;
    }
  }

  /**
   * Get current time in EST for logging
   */
  getCurrentESTTime() {
    try {
      return new Date().toLocaleString('en-US', {
        timeZone: US_MARKET_CONFIG.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Internal method to run signal generation
   */
  async _runSignalGeneration() {
    // Only run during market hours
    if (!this.isMarketOpen()) {
      this.logger.debug('Skipping signal generation - market closed', {
        estTime: this.getCurrentESTTime(),
      });
      return;
    }

    this.logger.info('Running scheduled signal generation', {
      estTime: this.getCurrentESTTime(),
      symbols: this.config.symbols.length,
      strategies: this.config.strategies,
    });

    this.runCount++;

    try {
      const result = await this.run();
      this.lastRunResult = result;
      this.consecutiveErrors = 0;

      // Log summary
      this.logger.info('Signal generation completed', {
        totalSignals: result.total_signals,
        byStrategy: result.by_strategy,
        duration_ms: result.duration_ms,
      });

      // Send Discord notification for high-confidence signals
      if (this.config.notifyOnSignals && result.high_confidence_signals?.length > 0) {
        await this._sendSignalNotification(result.high_confidence_signals);
      }
    } catch (error) {
      this.consecutiveErrors++;
      this.logger.error('Signal generation job failed', {
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
   * Run signal generation manually for all configured strategies
   */
  async run() {
    const startTime = Date.now();
    const result = {
      run_at: new Date().toISOString(),
      market: this.config.market,
      symbols_requested: this.config.symbols,
      strategies_run: this.config.strategies,
      total_signals: 0,
      by_strategy: {},
      all_signals: [],
      high_confidence_signals: [],
      errors: [],
    };

    // Run each strategy
    for (const strategyId of this.config.strategies) {
      try {
        const strategyResult = await this._generateSignalsForStrategy(strategyId);
        result.by_strategy[strategyId] = {
          signals_generated: strategyResult.signals_generated,
          symbols_analyzed: strategyResult.symbols_analyzed,
        };
        result.total_signals += strategyResult.signals_generated;
        result.all_signals.push(...strategyResult.signals);

        // Track high-confidence signals
        const highConfidence = strategyResult.signals.filter(
          s => s.confidence_score >= this.config.minConfidenceForNotify
        );
        result.high_confidence_signals.push(...highConfidence);

        this.logger.info('Strategy completed', {
          strategy: strategyId,
          signalsGenerated: strategyResult.signals_generated,
          symbolsAnalyzed: strategyResult.symbols_analyzed,
        });
      } catch (error) {
        this.logger.error('Strategy failed', {
          strategy: strategyId,
          error: error.message,
        });
        result.errors.push({
          strategy: strategyId,
          error: error.message,
        });
      }
    }

    result.duration_ms = Date.now() - startTime;
    this.totalSignalsGenerated += result.total_signals;

    // Publish high-confidence signals to outbox for execution (if enabled)
    if (this.config.autoExecuteSignals && result.high_confidence_signals.length > 0) {
      const publishResults = await this._publishSignalsToOutbox(result.high_confidence_signals);
      result.signals_published = publishResults.published;
      result.publish_errors = publishResults.errors;
    }

    return result;
  }

  /**
   * Set the outbox publisher (can be set after construction)
   * @param {OutboxPublisher} publisher - The outbox publisher instance
   */
  setOutboxPublisher(publisher) {
    this.outboxPublisher = publisher;
    this.logger.info('Outbox publisher set for signal generation job');
  }

  /**
   * Publish signals to the outbox for execution
   * @param {Array} signals - Array of signals to publish
   * @returns {Object} Results of publishing
   */
  async _publishSignalsToOutbox(signals) {
    const results = { published: 0, errors: [] };

    if (!this.outboxPublisher) {
      this.logger.warn('Outbox publisher not configured, skipping signal publishing');
      return results;
    }

    for (const signal of signals) {
      try {
        // Transform signal to outbox event payload
        const payload = {
          signal_id: signal.id,
          symbol: signal.symbol,
          direction: signal.side, // BUY or SELL
          strategy_id: signal.strategy_id,
          confidence: signal.confidence_score,
          entry_price: signal.entry_price,
          target_price: signal.target_price,
          stop_loss: signal.stop_loss,
          metadata: {
            strategy_version: signal.strategy_version,
            features: signal.features,
            invalidation_rules: signal.invalidation_rules,
            reason: signal.reason,
            market: signal.market,
            time_in_force: signal.time_in_force,
            data_snapshot_hash: signal.data_snapshot_hash,
            rule_version_id: signal.rule_version_id,
          },
        };

        await this.outboxPublisher.publish(EventTypes.SIGNAL_GENERATED, payload);
        results.published++;

        this.logger.info('Signal published to outbox', {
          signalId: signal.id,
          symbol: signal.symbol,
          direction: signal.side,
          confidence: signal.confidence_score,
        });
      } catch (error) {
        this.logger.error('Failed to publish signal to outbox', {
          signalId: signal.id,
          error: error.message,
        });
        results.errors.push({
          signalId: signal.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Generate signals for a specific strategy
   * Includes specific error handling for timeouts vs service errors
   */
  async _generateSignalsForStrategy(strategyId) {
    try {
      const response = await axios.post(
        `${this.config.signalServiceUrl}/api/v1/signals/generate`,
        {
          symbols: this.config.symbols,
          market: this.config.market,
          strategy_id: strategyId,
          lookback_days: this.config.lookbackDays,
        },
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        signals: response.data.signals || [],
        signals_generated: response.data.signals_generated || 0,
        symbols_analyzed: response.data.symbols_analyzed || 0,
        strategy_version: response.data.strategy_version,
      };
    } catch (error) {
      // Distinguish between different error types for better debugging
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Timeout error - signal service took too long
        const timeoutError = new Error(`Signal generation timed out for strategy ${strategyId} after ${this.config.timeout}ms`);
        timeoutError.type = 'timeout';
        timeoutError.strategy = strategyId;
        throw timeoutError;
      } else if (error.code === 'ECONNREFUSED') {
        // Connection refused - signal service is down
        const connError = new Error(`Signal service unavailable (connection refused) for strategy ${strategyId}`);
        connError.type = 'connection_refused';
        connError.strategy = strategyId;
        throw connError;
      } else if (error.response?.status === 503) {
        // Service unavailable (e.g., kill switch active)
        const serviceError = new Error(`Signal service returned 503: ${error.response.data?.error || 'Service unavailable'}`);
        serviceError.type = 'service_unavailable';
        serviceError.strategy = strategyId;
        throw serviceError;
      } else {
        // Other errors - preserve original error info
        error.strategy = strategyId;
        error.type = 'unknown';
        throw error;
      }
    }
  }

  /**
   * Send Discord notification for new high-confidence signals
   */
  async _sendSignalNotification(signals) {
    if (!this.config.discordWebhook || signals.length === 0) {
      return;
    }

    // Group signals by type (BUY/SELL)
    const buySignals = signals.filter(s => s.side === 'BUY');
    const sellSignals = signals.filter(s => s.side === 'SELL');

    const fields = [];

    if (buySignals.length > 0) {
      const buyList = buySignals
        .map(s => `**${s.symbol}** (${(s.confidence_score * 100).toFixed(0)}%) - ${s.reason.substring(0, 50)}...`)
        .join('\n');
      fields.push({
        name: `:green_circle: BUY Signals (${buySignals.length})`,
        value: buyList.substring(0, 1024),
        inline: false,
      });
    }

    if (sellSignals.length > 0) {
      const sellList = sellSignals
        .map(s => `**${s.symbol}** (${(s.confidence_score * 100).toFixed(0)}%) - ${s.reason.substring(0, 50)}...`)
        .join('\n');
      fields.push({
        name: `:red_circle: SELL Signals (${sellSignals.length})`,
        value: sellList.substring(0, 1024),
        inline: false,
      });
    }

    const embed = {
      title: ':chart_with_upwards_trend: New Trading Signals',
      color: 0x00D4AA, // Teal color
      timestamp: new Date().toISOString(),
      fields,
      footer: {
        text: `${signals.length} high-confidence signals (>=${this.config.minConfidenceForNotify * 100}%)`,
      },
    };

    try {
      await axios.post(this.config.discordWebhook, {
        embeds: [embed],
      });
      this.logger.info('Signal notification sent to Discord', { signalCount: signals.length });
    } catch (error) {
      this.logger.warn('Failed to send signal notification', { error: error.message });
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
      title: ':warning: Signal Generation Job Failing',
      color: 0xDC3545,
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: 'Consecutive Errors',
          value: String(this.consecutiveErrors),
          inline: true,
        },
        {
          name: 'EST Time',
          value: this.getCurrentESTTime(),
          inline: true,
        },
        {
          name: 'Error',
          value: error.message || 'Unknown error',
          inline: false,
        },
      ],
      footer: {
        text: 'Signal generation may be impaired',
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

  /**
   * Get job status
   */
  getStatus() {
    return {
      is_running: this.isRunning,
      market_open: this.isMarketOpen(),
      current_est_time: this.getCurrentESTTime(),
      interval_minutes: this.config.intervalMs / 60000,
      symbols: this.config.symbols,
      strategies: this.config.strategies,
      market: this.config.market,
      last_run_result: this.lastRunResult,
      consecutive_errors: this.consecutiveErrors,
      total_runs: this.runCount,
      total_signals_generated: this.totalSignalsGenerated,
      config: {
        min_confidence_for_notify: this.config.minConfidenceForNotify,
        lookback_days: this.config.lookbackDays,
        notify_on_signals: this.config.notifyOnSignals,
      },
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates) {
    const allowedUpdates = [
      'symbols',
      'strategies',
      'minConfidenceForNotify',
      'notifyOnSignals',
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        this.config[key] = value;
        this.logger.info('Config updated', { key, value });
      }
    }

    return this.getStatus();
  }
}

export default SignalGenerationJob;
