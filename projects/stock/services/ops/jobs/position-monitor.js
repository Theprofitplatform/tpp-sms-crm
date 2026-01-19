/**
 * Position Monitor Job - Stock Trading Automation System
 *
 * Monitors open positions and triggers exits when stop-loss or take-profit
 * levels are hit.
 *
 * Features:
 *   - Periodic position monitoring during market hours
 *   - Stop-loss trigger detection
 *   - Take-profit trigger detection
 *   - Automatic exit order generation via outbox
 *   - Discord notifications for exits
 *
 * Configuration (Environment Variables):
 *   POSITION_MONITOR_ENABLED=true        - Enable/disable the job
 *   POSITION_MONITOR_INTERVAL_SECONDS=30 - Check interval in seconds
 *
 * Usage:
 *   - Automatically scheduled by the ops service on startup
 *   - Can be triggered manually via API: POST /api/v1/positions/monitor/trigger
 *   - Can be controlled via API: POST /api/v1/positions/monitor/start|stop|status
 */

import axios from 'axios';
import { EventTypes } from '../outbox/events.js';

/**
 * Position Monitor Job
 */
export class PositionMonitorJob {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.outboxPublisher = options.outboxPublisher || null;
    this.config = {
      executionServiceUrl: options.executionServiceUrl ||
        process.env.EXECUTION_SERVICE_URL || 'http://localhost:5104',
      dataServiceUrl: options.dataServiceUrl ||
        process.env.DATA_SERVICE_URL || 'http://localhost:5101',
      discordWebhook: options.discordWebhook || process.env.DISCORD_WEBHOOK_URL,
      intervalMs: (options.intervalSeconds ||
        parseInt(process.env.POSITION_MONITOR_INTERVAL_SECONDS || '30', 10)) * 1000,
      timeout: options.timeout || 10000,
    };

    this.isRunning = false;
    this.intervalHandle = null;
    this.lastRunResult = null;
    this.runCount = 0;
    this.totalExitsTriggered = 0;
  }

  /**
   * Start the position monitoring job
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Position monitor job already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting position monitor job', {
      intervalSeconds: this.config.intervalMs / 1000,
    });

    // Run immediately, then on interval
    this._runMonitoring();
    this.intervalHandle = setInterval(() => this._runMonitoring(), this.config.intervalMs);
  }

  /**
   * Stop the position monitoring job
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('Position monitor job not running');
      return;
    }

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.isRunning = false;
    this.logger.info('Position monitor job stopped');
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalSeconds: this.config.intervalMs / 1000,
      runCount: this.runCount,
      totalExitsTriggered: this.totalExitsTriggered,
      lastRunResult: this.lastRunResult,
    };
  }

  /**
   * Internal monitoring run
   */
  async _runMonitoring() {
    this.runCount++;

    try {
      const result = await this.run();
      this.lastRunResult = result;

      if (result.exits_triggered > 0) {
        this.logger.info('Position exits triggered', {
          exits: result.exits_triggered,
          positions_checked: result.positions_checked,
        });
      }
    } catch (error) {
      this.logger.error('Position monitoring failed', {
        error: error.message,
      });
      this.lastRunResult = {
        run_at: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Run position monitoring manually
   */
  async run() {
    const startTime = Date.now();
    const result = {
      run_at: new Date().toISOString(),
      positions_checked: 0,
      exits_triggered: 0,
      stop_loss_exits: [],
      take_profit_exits: [],
      errors: [],
    };

    try {
      // Fetch open positions from execution service
      const positions = await this._fetchOpenPositions();
      result.positions_checked = positions.length;

      if (positions.length === 0) {
        result.duration_ms = Date.now() - startTime;
        return result;
      }

      // Get current prices for all symbols
      const symbols = [...new Set(positions.map(p => p.symbol))];
      const prices = await this._fetchCurrentPrices(symbols);

      // Check each position for exit triggers
      for (const position of positions) {
        try {
          const currentPrice = prices[position.symbol];
          if (!currentPrice) {
            this.logger.warn('No price available for position', { symbol: position.symbol });
            continue;
          }

          const exitResult = await this._checkExitTriggers(position, currentPrice);

          if (exitResult.triggered) {
            result.exits_triggered++;
            this.totalExitsTriggered++;

            if (exitResult.type === 'stop_loss') {
              result.stop_loss_exits.push(exitResult);
            } else if (exitResult.type === 'take_profit') {
              result.take_profit_exits.push(exitResult);
            }

            // Send notification
            await this._sendExitNotification(exitResult);
          }
        } catch (error) {
          this.logger.error('Error checking position exit', {
            symbol: position.symbol,
            error: error.message,
          });
          result.errors.push({
            symbol: position.symbol,
            error: error.message,
          });
        }
      }

      result.duration_ms = Date.now() - startTime;
      return result;

    } catch (error) {
      result.error = error.message;
      result.duration_ms = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Fetch open positions from execution service
   */
  async _fetchOpenPositions() {
    try {
      const response = await axios.get(
        `${this.config.executionServiceUrl}/api/v1/positions`,
        { timeout: this.config.timeout }
      );
      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch positions', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch current prices from data service
   */
  async _fetchCurrentPrices(symbols) {
    const prices = {};

    for (const symbol of symbols) {
      try {
        const response = await axios.get(
          `${this.config.dataServiceUrl}/api/v1/quote/${symbol}`,
          { timeout: this.config.timeout }
        );
        if (response.data && response.data.price) {
          prices[symbol] = response.data.price;
        }
      } catch (error) {
        this.logger.warn('Failed to fetch price', { symbol, error: error.message });
      }
    }

    return prices;
  }

  /**
   * Fetch stop-loss and take-profit from database via execution service
   */
  async _fetchPositionLimits(symbol, market) {
    try {
      // Try to get position details with limits from execution service
      const response = await axios.get(
        `${this.config.executionServiceUrl}/api/v1/positions/${symbol}/details`,
        { timeout: this.config.timeout }
      );
      return {
        stop_loss: response.data?.stop_loss || null,
        take_profit: response.data?.take_profit || null,
      };
    } catch {
      // Fallback - fetch from orders or return null
      return { stop_loss: null, take_profit: null };
    }
  }

  /**
   * Check if position should be exited based on stop-loss or take-profit
   */
  async _checkExitTriggers(position, currentPrice) {
    const result = {
      triggered: false,
      type: null,
      symbol: position.symbol,
      market: position.market || 'US',
      quantity: position.quantity,
      entry_price: position.average_entry_price,
      current_price: currentPrice,
      trigger_price: null,
    };

    // Get position limits (stop-loss/take-profit)
    const limits = await this._fetchPositionLimits(position.symbol, position.market);
    const stopLoss = position.stop_loss || limits.stop_loss;
    const takeProfit = position.take_profit || limits.take_profit;

    // For LONG positions
    if (position.side === 'LONG') {
      // Check stop-loss (price drops below stop)
      if (stopLoss && currentPrice <= stopLoss) {
        result.triggered = true;
        result.type = 'stop_loss';
        result.trigger_price = stopLoss;
        result.reason = `Stop-loss triggered: price ${currentPrice.toFixed(2)} <= stop ${stopLoss.toFixed(2)}`;

        // Generate exit order via outbox
        await this._generateExitOrder(position, currentPrice, 'stop_loss', stopLoss);
      }
      // Check take-profit (price rises above target)
      else if (takeProfit && currentPrice >= takeProfit) {
        result.triggered = true;
        result.type = 'take_profit';
        result.trigger_price = takeProfit;
        result.reason = `Take-profit triggered: price ${currentPrice.toFixed(2)} >= target ${takeProfit.toFixed(2)}`;

        // Generate exit order via outbox
        await this._generateExitOrder(position, currentPrice, 'take_profit', takeProfit);
      }
    }
    // For SHORT positions (reverse logic)
    else if (position.side === 'SHORT') {
      // Check stop-loss (price rises above stop)
      if (stopLoss && currentPrice >= stopLoss) {
        result.triggered = true;
        result.type = 'stop_loss';
        result.trigger_price = stopLoss;
        result.reason = `Stop-loss triggered: price ${currentPrice.toFixed(2)} >= stop ${stopLoss.toFixed(2)}`;

        await this._generateExitOrder(position, currentPrice, 'stop_loss', stopLoss);
      }
      // Check take-profit (price drops below target)
      else if (takeProfit && currentPrice <= takeProfit) {
        result.triggered = true;
        result.type = 'take_profit';
        result.trigger_price = takeProfit;
        result.reason = `Take-profit triggered: price ${currentPrice.toFixed(2)} <= target ${takeProfit.toFixed(2)}`;

        await this._generateExitOrder(position, currentPrice, 'take_profit', takeProfit);
      }
    }

    return result;
  }

  /**
   * Generate exit order and publish to outbox
   */
  async _generateExitOrder(position, currentPrice, exitType, triggerPrice) {
    if (!this.outboxPublisher) {
      this.logger.warn('No outbox publisher configured, cannot generate exit order');
      return;
    }

    const payload = {
      signal_id: `exit_${position.symbol}_${Date.now()}`,
      symbol: position.symbol,
      direction: position.side === 'LONG' ? 'SELL' : 'BUY', // Opposite direction to close
      strategy_id: 'position_monitor',
      confidence: 1.0, // Exit signals are high confidence
      entry_price: currentPrice,
      quantity: position.quantity,
      metadata: {
        exit_type: exitType,
        trigger_price: triggerPrice,
        entry_price: position.average_entry_price,
        market: position.market || 'US',
        reason: `${exitType.replace('_', ' ')} triggered at ${currentPrice.toFixed(2)}`,
        data_snapshot_hash: `exit_${Date.now()}`,
        rule_version_id: 'position_monitor_v1',
      },
    };

    try {
      await this.outboxPublisher.publish(EventTypes.SIGNAL_GENERATED, payload);
      this.logger.info('Exit order published to outbox', {
        symbol: position.symbol,
        exitType,
        currentPrice,
        triggerPrice,
        quantity: position.quantity,
      });
    } catch (error) {
      this.logger.error('Failed to publish exit order', {
        symbol: position.symbol,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send Discord notification for position exit
   */
  async _sendExitNotification(exitResult) {
    if (!this.config.discordWebhook) {
      return;
    }

    const emoji = exitResult.type === 'stop_loss' ? '🛑' : '🎯';
    const color = exitResult.type === 'stop_loss' ? 0xff0000 : 0x00ff00;
    const pnlPct = ((exitResult.current_price - exitResult.entry_price) / exitResult.entry_price * 100);

    const embed = {
      title: `${emoji} Position Exit: ${exitResult.symbol}`,
      color,
      fields: [
        { name: 'Exit Type', value: exitResult.type.replace('_', ' ').toUpperCase(), inline: true },
        { name: 'Quantity', value: exitResult.quantity.toString(), inline: true },
        { name: 'Market', value: exitResult.market, inline: true },
        { name: 'Entry Price', value: `$${exitResult.entry_price.toFixed(2)}`, inline: true },
        { name: 'Exit Price', value: `$${exitResult.current_price.toFixed(2)}`, inline: true },
        { name: 'P&L %', value: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, inline: true },
        { name: 'Trigger', value: `$${exitResult.trigger_price.toFixed(2)}`, inline: true },
      ],
      footer: { text: 'Stock Trading System - Position Monitor' },
      timestamp: new Date().toISOString(),
    };

    try {
      await axios.post(this.config.discordWebhook, { embeds: [embed] }, { timeout: 5000 });
    } catch (error) {
      this.logger.warn('Failed to send Discord notification', { error: error.message });
    }
  }

  /**
   * Set the outbox publisher (can be set after construction)
   */
  setOutboxPublisher(publisher) {
    this.outboxPublisher = publisher;
    this.logger.info('Outbox publisher set for position monitor job');
  }

  /**
   * Update configuration
   */
  updateConfig(updates) {
    if (updates.intervalSeconds) {
      this.config.intervalMs = updates.intervalSeconds * 1000;

      // Restart interval if running
      if (this.isRunning && this.intervalHandle) {
        clearInterval(this.intervalHandle);
        this.intervalHandle = setInterval(() => this._runMonitoring(), this.config.intervalMs);
      }
    }

    return this.getStatus();
  }
}

export default PositionMonitorJob;
