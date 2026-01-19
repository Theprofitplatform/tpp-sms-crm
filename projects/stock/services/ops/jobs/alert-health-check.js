/**
 * Alert Health Check Job - Stock Trading Automation System
 *
 * Monitors the health of the alerting system and ensures alerts can be delivered.
 * Runs every 15 minutes by default.
 *
 * Features:
 *   - Verifies Alertmanager is reachable
 *   - Verifies Discord webhook is working
 *   - Sends test alert if alert system was down and recovered
 *   - Logs alert system health to metrics
 *   - Triggers direct critical alert if primary alerting is down
 *
 * Usage:
 *   import { AlertHealthCheckJob } from './jobs/alert-health-check.js';
 *
 *   const job = new AlertHealthCheckJob({
 *     logger: logger,
 *     alertManager: alertManager,
 *     criticalAlertHandler: criticalAlertHandler,
 *     alertmanagerUrl: 'http://localhost:9093',
 *     prometheusUrl: 'http://localhost:9090',
 *     discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
 *     checkIntervalMs: 15 * 60 * 1000, // 15 minutes
 *   });
 *
 *   job.start();
 *
 * Dependencies:
 *   - axios (HTTP client)
 */

import axios from 'axios';
import { Counter, Gauge } from 'prom-client';

// Prometheus metrics for alert health
const alertHealthGauge = new Gauge({
  name: 'alert_system_health',
  help: 'Alert system health status (1=healthy, 0=unhealthy)',
  labelNames: ['component'],
});

const alertHealthCheckCounter = new Counter({
  name: 'alert_health_checks_total',
  help: 'Total number of alert health checks performed',
  labelNames: ['result'],
});

const alertDeliveryFailuresCounter = new Counter({
  name: 'alert_delivery_failures_total',
  help: 'Total number of alert delivery failures',
  labelNames: ['channel'],
});

/**
 * AlertHealthCheckJob - Monitors alerting system health
 */
export class AlertHealthCheckJob {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.alertManager = options.alertManager;
    this.criticalAlertHandler = options.criticalAlertHandler;

    // Service URLs
    this.alertmanagerUrl = options.alertmanagerUrl || 'http://localhost:9093';
    this.prometheusUrl = options.prometheusUrl || 'http://localhost:9090';
    this.discordWebhookUrl = options.discordWebhookUrl;

    // Timing configuration
    this.checkIntervalMs = options.checkIntervalMs || 15 * 60 * 1000; // 15 minutes
    this.requestTimeoutMs = options.requestTimeoutMs || 10000; // 10 seconds

    // State tracking
    this.state = {
      running: false,
      lastCheckAt: null,
      lastCheckResult: null,
      intervalId: null,
      consecutiveFailures: 0,
      wasDown: false,
      componentStatus: {
        alertmanager: { healthy: null, lastCheck: null, error: null },
        prometheus: { healthy: null, lastCheck: null, error: null },
        discord: { healthy: null, lastCheck: null, error: null },
        internalAlertManager: { healthy: null, lastCheck: null, error: null },
      },
    };

    this.logger.info('AlertHealthCheckJob initialized', {
      alertmanagerUrl: this.alertmanagerUrl,
      prometheusUrl: this.prometheusUrl,
      discordConfigured: !!this.discordWebhookUrl,
      checkIntervalMs: this.checkIntervalMs,
    });
  }

  /**
   * Start the health check job
   */
  start() {
    if (this.state.running) {
      this.logger.warn('AlertHealthCheckJob already running');
      return;
    }

    this.state.running = true;

    // Run initial check
    this.runCheck().catch(error => {
      this.logger.error('Initial alert health check failed', { error: error.message });
    });

    // Schedule recurring checks
    this.state.intervalId = setInterval(() => {
      this.runCheck().catch(error => {
        this.logger.error('Scheduled alert health check failed', { error: error.message });
      });
    }, this.checkIntervalMs);

    this.logger.info('AlertHealthCheckJob started', {
      intervalMs: this.checkIntervalMs,
    });
  }

  /**
   * Stop the health check job
   */
  stop() {
    if (!this.state.running) {
      return;
    }

    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }

    this.state.running = false;
    this.logger.info('AlertHealthCheckJob stopped');
  }

  /**
   * Run a health check
   */
  async runCheck() {
    const checkStartTime = new Date();
    const results = {
      timestamp: checkStartTime.toISOString(),
      components: {},
      overall: false,
    };

    this.logger.debug('Running alert health check');

    // Check Alertmanager
    results.components.alertmanager = await this._checkAlertmanager();
    this._updateComponentStatus('alertmanager', results.components.alertmanager);

    // Check Prometheus
    results.components.prometheus = await this._checkPrometheus();
    this._updateComponentStatus('prometheus', results.components.prometheus);

    // Check Discord webhook
    if (this.discordWebhookUrl) {
      results.components.discord = await this._checkDiscordWebhook();
      this._updateComponentStatus('discord', results.components.discord);
    }

    // Check internal AlertManager
    if (this.alertManager) {
      results.components.internalAlertManager = await this._checkInternalAlertManager();
      this._updateComponentStatus('internalAlertManager', results.components.internalAlertManager);
    }

    // Determine overall health
    const criticalComponents = ['alertmanager', 'discord'];
    results.overall = criticalComponents.every(comp => {
      const componentResult = results.components[comp];
      return componentResult?.healthy !== false; // healthy or not checked
    });

    // Update metrics
    this._updateMetrics(results);

    // Handle state changes
    await this._handleStateChange(results);

    // Store results
    this.state.lastCheckAt = checkStartTime.toISOString();
    this.state.lastCheckResult = results;

    this.logger.info('Alert health check completed', {
      overall: results.overall ? 'healthy' : 'unhealthy',
      alertmanager: results.components.alertmanager?.healthy,
      prometheus: results.components.prometheus?.healthy,
      discord: results.components.discord?.healthy,
      internalAlertManager: results.components.internalAlertManager?.healthy,
    });

    return results;
  }

  /**
   * Check Alertmanager health
   */
  async _checkAlertmanager() {
    try {
      const response = await axios.get(`${this.alertmanagerUrl}/-/healthy`, {
        timeout: this.requestTimeoutMs,
      });

      // Also check status API for more details
      let statusInfo = null;
      try {
        const statusResponse = await axios.get(`${this.alertmanagerUrl}/api/v2/status`, {
          timeout: this.requestTimeoutMs,
        });
        statusInfo = {
          cluster: statusResponse.data.cluster?.status,
          versionInfo: statusResponse.data.versionInfo?.version,
        };
      } catch (error) {
        // Status API failure is not critical
      }

      return {
        healthy: response.status === 200,
        latencyMs: response.headers['x-response-time'] || null,
        statusInfo,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      alertDeliveryFailuresCounter.inc({ channel: 'alertmanager' });
      return {
        healthy: false,
        error: error.message,
        errorCode: error.code,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Prometheus health
   */
  async _checkPrometheus() {
    try {
      const response = await axios.get(`${this.prometheusUrl}/-/healthy`, {
        timeout: this.requestTimeoutMs,
      });

      // Also check if alerting rules are loaded
      let rulesInfo = null;
      try {
        const rulesResponse = await axios.get(`${this.prometheusUrl}/api/v1/rules`, {
          timeout: this.requestTimeoutMs,
        });
        const groups = rulesResponse.data?.data?.groups || [];
        rulesInfo = {
          ruleGroups: groups.length,
          totalRules: groups.reduce((acc, g) => acc + (g.rules?.length || 0), 0),
        };
      } catch (error) {
        // Rules API failure is not critical
      }

      return {
        healthy: response.status === 200,
        rulesInfo,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      alertDeliveryFailuresCounter.inc({ channel: 'prometheus' });
      return {
        healthy: false,
        error: error.message,
        errorCode: error.code,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Discord webhook (without sending a visible message)
   *
   * We verify the webhook exists by checking the URL format and
   * optionally making a GET request (which Discord webhooks support)
   */
  async _checkDiscordWebhook() {
    try {
      // Validate webhook URL format
      if (!this.discordWebhookUrl.includes('discord.com/api/webhooks/')) {
        return {
          healthy: false,
          error: 'Invalid webhook URL format',
          checkedAt: new Date().toISOString(),
        };
      }

      // Make a GET request to the webhook URL to check if it exists
      // Discord returns webhook info for valid webhooks
      const response = await axios.get(this.discordWebhookUrl, {
        timeout: this.requestTimeoutMs,
      });

      return {
        healthy: response.status === 200,
        webhookName: response.data?.name,
        guildId: response.data?.guild_id,
        channelId: response.data?.channel_id,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      alertDeliveryFailuresCounter.inc({ channel: 'discord' });

      // 401/404 means webhook is invalid or deleted
      if (error.response?.status === 401 || error.response?.status === 404) {
        return {
          healthy: false,
          error: 'Webhook not found or invalid',
          statusCode: error.response?.status,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        healthy: false,
        error: error.message,
        errorCode: error.code,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check internal AlertManager health
   */
  async _checkInternalAlertManager() {
    try {
      const stats = await this.alertManager.getAlertStats();

      return {
        healthy: true,
        stats: {
          activeAlerts: stats.activeAlerts,
          criticalAlerts: stats.criticalAlerts,
          totalLast24h: stats.totalLast24h,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Update component status in state
   */
  _updateComponentStatus(component, result) {
    this.state.componentStatus[component] = {
      healthy: result.healthy,
      lastCheck: result.checkedAt,
      error: result.error || null,
    };
  }

  /**
   * Update Prometheus metrics
   */
  _updateMetrics(results) {
    // Update health gauges
    for (const [component, result] of Object.entries(results.components)) {
      alertHealthGauge.set(
        { component },
        result.healthy ? 1 : 0
      );
    }

    // Update check counter
    alertHealthCheckCounter.inc({
      result: results.overall ? 'success' : 'failure',
    });
  }

  /**
   * Handle state changes (down -> up, up -> down)
   */
  async _handleStateChange(results) {
    const isHealthy = results.overall;
    const wasDown = this.state.wasDown;

    if (!isHealthy) {
      this.state.consecutiveFailures++;

      // If alert system just went down, send critical alert via direct channel
      if (!wasDown && this.criticalAlertHandler) {
        const failedComponents = Object.entries(results.components)
          .filter(([, result]) => !result.healthy)
          .map(([name]) => name);

        this.logger.error('Alert system failure detected, sending direct critical alert', {
          failedComponents,
        });

        try {
          await this.criticalAlertHandler.sendAlertSystemFailureAlert({
            component: failedComponents.join(', '),
            lastHealthy: this.state.lastCheckAt,
            error: results.components[failedComponents[0]]?.error,
          });
        } catch (error) {
          this.logger.error('Failed to send alert system failure alert', {
            error: error.message,
          });
        }
      }

      this.state.wasDown = true;
    } else {
      // If alert system recovered from failure
      if (wasDown && this.state.consecutiveFailures > 0) {
        this.logger.info('Alert system recovered from failure', {
          downDuration: this.state.consecutiveFailures * this.checkIntervalMs,
          consecutiveFailures: this.state.consecutiveFailures,
        });

        // Send recovery notification
        if (this.alertManager) {
          try {
            await this.alertManager.sendAlert({
              type: 'alert_system_recovered',
              severity: 'info',
              title: 'Alert System Recovered',
              message: `The alerting system has recovered after ${this.state.consecutiveFailures} failed health checks.`,
              details: {
                downDuration: `${Math.round(this.state.consecutiveFailures * this.checkIntervalMs / 60000)} minutes`,
                consecutiveFailures: this.state.consecutiveFailures,
              },
              source: 'alert-health-check',
            });
          } catch (error) {
            this.logger.error('Failed to send recovery alert', { error: error.message });
          }
        }
      }

      this.state.consecutiveFailures = 0;
      this.state.wasDown = false;
    }
  }

  /**
   * Get current health status
   */
  getStatus() {
    return {
      running: this.state.running,
      lastCheckAt: this.state.lastCheckAt,
      lastCheckResult: this.state.lastCheckResult,
      consecutiveFailures: this.state.consecutiveFailures,
      wasDown: this.state.wasDown,
      componentStatus: this.state.componentStatus,
      config: {
        alertmanagerUrl: this.alertmanagerUrl,
        prometheusUrl: this.prometheusUrl,
        discordConfigured: !!this.discordWebhookUrl,
        checkIntervalMs: this.checkIntervalMs,
      },
    };
  }

  /**
   * Force a health check immediately
   */
  async forceCheck() {
    return this.runCheck();
  }

  /**
   * Send a test alert through all channels
   */
  async sendTestAlert() {
    const results = {
      timestamp: new Date().toISOString(),
      channels: {},
    };

    // Test internal alert manager
    if (this.alertManager) {
      try {
        const alertResult = await this.alertManager.sendTestAlert();
        results.channels.internalAlertManager = {
          success: true,
          alertId: alertResult.alertId,
        };
      } catch (error) {
        results.channels.internalAlertManager = {
          success: false,
          error: error.message,
        };
      }
    }

    // Test critical alert handler
    if (this.criticalAlertHandler) {
      try {
        const criticalResult = await this.criticalAlertHandler.testChannels();
        results.channels.criticalAlertHandler = criticalResult;
      } catch (error) {
        results.channels.criticalAlertHandler = {
          success: false,
          error: error.message,
        };
      }
    }

    this.logger.info('Test alerts sent', results);

    return results;
  }
}

export default AlertHealthCheckJob;
