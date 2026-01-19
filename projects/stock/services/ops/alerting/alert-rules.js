/**
 * Alert Rules - Stock Trading Automation System
 *
 * Defines all alert conditions, thresholds, and channel mappings.
 *
 * Alert Categories:
 *   - Trading: Kill switch, position mismatch, loss limits
 *   - System: Service health, data staleness, clock drift
 *   - Operations: Order rejects, outbox backlog, dead letters
 *
 * Usage:
 *   import { ALERT_RULES, getAlertRule, evaluateCondition } from './alert-rules.js';
 *
 *   const rule = getAlertRule('kill_switch_activated');
 *   const shouldAlert = evaluateCondition(rule, currentMetrics);
 */

import { SEVERITY_LEVELS, CHANNELS } from './alert-manager.js';

/**
 * Alert rule definitions
 *
 * Each rule defines:
 *   - type: Unique identifier for the alert
 *   - title: Human-readable title
 *   - description: Detailed description
 *   - severity: Alert severity level
 *   - channels: Which channels to notify (can be overridden by severity)
 *   - condition: Function that evaluates if alert should fire
 *   - threshold: Numeric threshold for condition
 *   - dedupe: Whether to deduplicate (default: true)
 *   - autoResolve: Whether alert auto-resolves when condition clears
 *   - runbook: Link to runbook documentation
 */
export const ALERT_RULES = {
  // ===========================================================================
  // CRITICAL TRADING ALERTS
  // ===========================================================================

  kill_switch_activated: {
    type: 'kill_switch_activated',
    title: 'Kill Switch Activated',
    description: 'Trading has been halted by the kill switch. All orders will be rejected.',
    severity: SEVERITY_LEVELS.CRITICAL,
    channels: [CHANNELS.DISCORD, CHANNELS.EMAIL, CHANNELS.SMS],
    dedupe: false, // Always send
    autoResolve: true,
    runbook: 'https://docs.example.com/runbooks/kill-switch',
    getMessage: (data) => {
      return `Trading has been halted. Reason: ${data.reason || 'Unknown'}. ` +
        `Triggered by: ${data.triggered_by || 'system'}. ` +
        `All new orders will be rejected until the kill switch is reset.`;
    },
    evaluate: (metrics) => metrics.kill_switch_active === true,
  },

  position_mismatch: {
    type: 'position_mismatch',
    title: 'Position Mismatch Detected',
    description: 'Discrepancy detected between broker and local position tracking.',
    severity: SEVERITY_LEVELS.CRITICAL,
    channels: [CHANNELS.DISCORD, CHANNELS.EMAIL, CHANNELS.SMS],
    dedupe: true,
    autoResolve: false,
    runbook: 'https://docs.example.com/runbooks/position-mismatch',
    getMessage: (data) => {
      return `CRITICAL: Position mismatch detected!\n\n` +
        `Symbol: ${data.symbol}\n` +
        `Broker Position: ${data.broker_qty} @ ${data.broker_avg_price}\n` +
        `Local Position: ${data.local_qty} @ ${data.local_avg_price}\n` +
        `Difference: ${data.difference} shares\n\n` +
        `This may indicate a bug or network failure during order execution. ` +
        `Manual reconciliation required.`;
    },
    evaluate: (metrics) => metrics.position_mismatch_count > 0,
    threshold: 0,
  },

  daily_loss_critical: {
    type: 'daily_loss_critical',
    title: 'Daily Loss Limit Reached',
    description: 'Daily loss has reached the maximum allowed limit.',
    severity: SEVERITY_LEVELS.CRITICAL,
    channels: [CHANNELS.DISCORD, CHANNELS.EMAIL, CHANNELS.SMS],
    dedupe: true,
    autoResolve: true,
    runbook: 'https://docs.example.com/runbooks/daily-loss-limit',
    getMessage: (data) => {
      return `Daily loss has reached ${data.loss_pct.toFixed(2)}% ` +
        `(Limit: ${data.limit_pct}%). ` +
        `P&L: $${data.pnl.toFixed(2)}. ` +
        `Trading may be automatically halted.`;
    },
    evaluate: (metrics) => metrics.daily_loss_pct >= 2.0,
    threshold: 2.0, // 2% limit
  },

  service_down: {
    type: 'service_down',
    title: 'Service Unreachable',
    description: 'A critical service has been unreachable for more than 1 minute.',
    severity: SEVERITY_LEVELS.CRITICAL,
    channels: [CHANNELS.DISCORD, CHANNELS.EMAIL],
    dedupe: true,
    dedupeWindowMs: 300000, // 5 minute dedupe window
    autoResolve: true,
    runbook: 'https://docs.example.com/runbooks/service-down',
    getMessage: (data) => {
      return `Service ${data.service_name} has been unreachable for ` +
        `${Math.round(data.downtime_seconds / 60)} minute(s). ` +
        `URL: ${data.service_url}. ` +
        `Error: ${data.error || 'Connection failed'}`;
    },
    evaluate: (metrics, serviceName) => {
      const service = metrics.services?.[serviceName];
      return service?.status === 'unreachable' && service?.downtime_seconds > 60;
    },
    threshold: 60, // 60 seconds
  },

  // ===========================================================================
  // WARNING ALERTS
  // ===========================================================================

  daily_loss_warning: {
    type: 'daily_loss_warning',
    title: 'Approaching Daily Loss Limit',
    description: 'Daily loss is approaching the maximum allowed limit.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD, CHANNELS.EMAIL],
    dedupe: true,
    autoResolve: true,
    getMessage: (data) => {
      return `Daily loss is at ${data.loss_pct.toFixed(2)}% ` +
        `(Warning at ${data.warning_threshold}%, Limit: ${data.limit_pct}%). ` +
        `Consider reducing exposure.`;
    },
    evaluate: (metrics) => metrics.daily_loss_pct >= 1.5 && metrics.daily_loss_pct < 2.0,
    threshold: 1.5, // 1.5% warning
  },

  data_stale: {
    type: 'data_stale',
    title: 'Market Data Stale',
    description: 'Market data has not been updated for over 1 hour.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD],
    dedupe: true,
    autoResolve: true,
    runbook: 'https://docs.example.com/runbooks/data-stale',
    getMessage: (data) => {
      return `Market data has not been updated for ${Math.round(data.staleness_minutes)} minutes. ` +
        `Last update: ${data.last_update}. ` +
        `Source: ${data.source || 'unknown'}. ` +
        `This may affect trading decisions.`;
    },
    evaluate: (metrics) => {
      if (!metrics.last_data_update) return false;
      const staleMs = Date.now() - new Date(metrics.last_data_update).getTime();
      return staleMs > 60 * 60 * 1000; // 1 hour
    },
    threshold: 60, // 60 minutes
  },

  order_reject_spike: {
    type: 'order_reject_spike',
    title: 'Order Rejection Spike',
    description: 'Unusually high number of order rejections detected.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD],
    dedupe: true,
    autoResolve: true,
    getMessage: (data) => {
      return `Order rejection rate has spiked to ${data.reject_rate.toFixed(1)}% ` +
        `(${data.rejected_count} rejected / ${data.total_count} total). ` +
        `Common reason: ${data.top_reason || 'Various'}`;
    },
    evaluate: (metrics) => {
      if (metrics.total_orders < 5) return false; // Need minimum sample
      return (metrics.rejected_orders / metrics.total_orders) > 0.3; // 30%
    },
    threshold: 30, // 30% rejection rate
  },

  clock_drift: {
    type: 'clock_drift',
    title: 'Clock Drift Detected',
    description: 'System clock drift exceeds acceptable threshold.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD],
    dedupe: true,
    autoResolve: true,
    getMessage: (data) => {
      return `Clock drift detected: ${data.skew_ms}ms between services. ` +
        `Service: ${data.service_name}. ` +
        `This may cause order timing issues.`;
    },
    evaluate: (metrics) => Math.abs(metrics.clock_skew_ms || 0) > 5000,
    threshold: 5000, // 5 seconds
  },

  outbox_backlog: {
    type: 'outbox_backlog',
    title: 'Outbox Event Backlog',
    description: 'Event outbox has accumulated a large backlog.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD],
    dedupe: true,
    autoResolve: true,
    getMessage: (data) => {
      return `Outbox backlog has grown to ${data.pending_count} events. ` +
        `Oldest event: ${data.oldest_event_age_minutes} minutes old. ` +
        `Event processing may be falling behind.`;
    },
    evaluate: (metrics) => metrics.outbox_pending > 100,
    threshold: 100,
  },

  dead_letter_accumulating: {
    type: 'dead_letter_accumulating',
    title: 'Dead Letter Events Accumulating',
    description: 'Events are failing and moving to the dead letter queue.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD],
    dedupe: true,
    autoResolve: true,
    runbook: 'https://docs.example.com/runbooks/dead-letter',
    getMessage: (data) => {
      return `${data.dead_letter_count} events in dead letter queue. ` +
        `Recent failures: ${data.recent_failures}. ` +
        `Manual intervention may be required.`;
    },
    evaluate: (metrics) => metrics.dead_letter_count > 10,
    threshold: 10,
  },

  high_latency: {
    type: 'high_latency',
    title: 'High Service Latency',
    description: 'Service response times are elevated.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD],
    dedupe: true,
    autoResolve: true,
    getMessage: (data) => {
      return `${data.service_name} p95 latency: ${data.latency_ms}ms. ` +
        `This may impact trading performance.`;
    },
    evaluate: (metrics) => metrics.p95_latency_ms > 2000,
    threshold: 2000, // 2 seconds
  },

  high_memory: {
    type: 'high_memory',
    title: 'High Memory Usage',
    description: 'Service memory usage is elevated.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD],
    dedupe: true,
    autoResolve: true,
    getMessage: (data) => {
      return `${data.service_name} memory usage: ${(data.memory_mb).toFixed(0)}MB ` +
        `(${data.memory_pct.toFixed(1)}% of limit). ` +
        `Consider restarting or scaling.`;
    },
    evaluate: (metrics) => metrics.memory_bytes > 1024 * 1024 * 1024, // 1GB
    threshold: 1073741824, // 1GB in bytes
  },

  reconciliation_failed: {
    type: 'reconciliation_failed',
    title: 'Reconciliation Job Failed',
    description: 'The position reconciliation job has failed repeatedly.',
    severity: SEVERITY_LEVELS.WARNING,
    channels: [CHANNELS.DISCORD, CHANNELS.EMAIL],
    dedupe: true,
    autoResolve: true,
    getMessage: (data) => {
      return `Reconciliation job has failed ${data.consecutive_failures} times. ` +
        `Last error: ${data.last_error}. ` +
        `Position tracking may be unreliable.`;
    },
    evaluate: (metrics) => metrics.reconciliation_consecutive_errors >= 3,
    threshold: 3,
  },

  // ===========================================================================
  // INFO ALERTS
  // ===========================================================================

  mode_changed: {
    type: 'mode_changed',
    title: 'Trading Mode Changed',
    description: 'The trading mode has been changed.',
    severity: SEVERITY_LEVELS.INFO,
    channels: [CHANNELS.DISCORD],
    dedupe: false,
    autoResolve: false,
    getMessage: (data) => {
      return `Trading mode changed from ${data.old_mode} to ${data.new_mode}. ` +
        `Changed by: ${data.changed_by || 'system'}`;
    },
    evaluate: () => false, // Triggered manually
  },

  strategy_enabled: {
    type: 'strategy_enabled',
    title: 'Strategy Enabled',
    description: 'A trading strategy has been enabled.',
    severity: SEVERITY_LEVELS.INFO,
    channels: [CHANNELS.DISCORD],
    dedupe: false,
    autoResolve: false,
    getMessage: (data) => {
      return `Strategy "${data.strategy_name}" has been enabled. ` +
        `Markets: ${data.markets?.join(', ') || 'All'}`;
    },
    evaluate: () => false, // Triggered manually
  },

  strategy_disabled: {
    type: 'strategy_disabled',
    title: 'Strategy Disabled',
    description: 'A trading strategy has been disabled.',
    severity: SEVERITY_LEVELS.INFO,
    channels: [CHANNELS.DISCORD],
    dedupe: false,
    autoResolve: false,
    getMessage: (data) => {
      return `Strategy "${data.strategy_name}" has been disabled. ` +
        `Reason: ${data.reason || 'Manual'}`;
    },
    evaluate: () => false, // Triggered manually
  },

  daily_report_generated: {
    type: 'daily_report_generated',
    title: 'Daily Report Generated',
    description: 'The daily trading report has been generated.',
    severity: SEVERITY_LEVELS.INFO,
    channels: [CHANNELS.DISCORD, CHANNELS.EMAIL],
    dedupe: false,
    autoResolve: false,
    getMessage: (data) => {
      return `Daily report for ${data.date} generated. ` +
        `Total P&L: $${data.total_pnl?.toFixed(2) || '0.00'}. ` +
        `Trades: ${data.trade_count || 0}. ` +
        `Win rate: ${(data.win_rate || 0).toFixed(1)}%`;
    },
    evaluate: () => false, // Triggered manually
  },

  config_version_changed: {
    type: 'config_version_changed',
    title: 'Configuration Version Changed',
    description: 'A new configuration version has been activated.',
    severity: SEVERITY_LEVELS.INFO,
    channels: [CHANNELS.DISCORD],
    dedupe: false,
    autoResolve: false,
    getMessage: (data) => {
      return `Configuration updated to version ${data.version}. ` +
        `Changed by: ${data.changed_by || 'system'}. ` +
        `Changes: ${data.change_summary || 'See audit log'}`;
    },
    evaluate: () => false, // Triggered manually
  },
};

/**
 * Get an alert rule by type
 */
export function getAlertRule(type) {
  return ALERT_RULES[type] || null;
}

/**
 * Get all alert rules
 */
export function getAllAlertRules() {
  return Object.values(ALERT_RULES);
}

/**
 * Get alert rules by severity
 */
export function getAlertRulesBySeverity(severity) {
  return Object.values(ALERT_RULES).filter(rule => rule.severity === severity);
}

/**
 * Evaluate if an alert condition is met
 */
export function evaluateCondition(rule, metrics, ...args) {
  if (!rule.evaluate) return false;

  try {
    return rule.evaluate(metrics, ...args);
  } catch (error) {
    console.error(`Error evaluating alert rule ${rule.type}:`, error);
    return false;
  }
}

/**
 * Build alert message from rule and data
 */
export function buildAlertMessage(rule, data) {
  if (rule.getMessage) {
    return rule.getMessage(data);
  }
  return rule.description;
}

/**
 * Alert thresholds for monitoring configuration
 */
export const ALERT_THRESHOLDS = {
  // Loss limits (percentages)
  DAILY_LOSS_WARNING_PCT: 1.5,
  DAILY_LOSS_CRITICAL_PCT: 2.0,
  WEEKLY_LOSS_WARNING_PCT: 3.5,
  WEEKLY_LOSS_CRITICAL_PCT: 5.0,

  // Timing thresholds (milliseconds)
  DATA_STALE_WARNING_MS: 30 * 60 * 1000,  // 30 minutes
  DATA_STALE_CRITICAL_MS: 60 * 60 * 1000, // 1 hour
  CLOCK_DRIFT_WARNING_MS: 5000,            // 5 seconds
  CLOCK_DRIFT_CRITICAL_MS: 30000,          // 30 seconds
  SERVICE_DOWN_CRITICAL_MS: 60000,         // 1 minute

  // Counts
  ORDER_REJECT_WARNING_COUNT: 5,
  ORDER_REJECT_SPIKE_PCT: 30,
  OUTBOX_BACKLOG_WARNING: 100,
  OUTBOX_BACKLOG_CRITICAL: 500,
  DEAD_LETTER_WARNING: 10,
  DEAD_LETTER_CRITICAL: 50,

  // Performance
  LATENCY_WARNING_MS: 2000,
  LATENCY_CRITICAL_MS: 5000,
  MEMORY_WARNING_BYTES: 512 * 1024 * 1024,  // 512MB
  MEMORY_CRITICAL_BYTES: 1024 * 1024 * 1024, // 1GB
};

/**
 * Channel routing configuration for severity levels
 */
export const SEVERITY_CHANNEL_ROUTING = {
  [SEVERITY_LEVELS.INFO]: [CHANNELS.DISCORD],
  [SEVERITY_LEVELS.WARNING]: [CHANNELS.DISCORD, CHANNELS.EMAIL],
  [SEVERITY_LEVELS.ERROR]: [CHANNELS.DISCORD, CHANNELS.EMAIL],
  [SEVERITY_LEVELS.CRITICAL]: [CHANNELS.DISCORD, CHANNELS.EMAIL, CHANNELS.SMS],
};

/**
 * Escalation timing configuration
 */
export const ESCALATION_CONFIG = {
  // Time before escalating to SMS (minutes)
  SMS_ESCALATION_DELAY_MINUTES: 5,

  // Time before escalating to PagerDuty (minutes)
  PAGERDUTY_ESCALATION_DELAY_MINUTES: 15,

  // Maximum escalation level
  MAX_ESCALATION_LEVEL: 3,

  // Whether to auto-escalate
  AUTO_ESCALATE_CRITICAL: true,
  AUTO_ESCALATE_WARNING: false,
};

export default ALERT_RULES;
