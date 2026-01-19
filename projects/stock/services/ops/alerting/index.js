/**
 * Alerting Module - Stock Trading Automation System
 *
 * Exports all alerting functionality for easy import.
 *
 * Usage:
 *   import {
 *     AlertManager,
 *     ALERT_RULES,
 *     SEVERITY_LEVELS,
 *     getAlertRule,
 *   } from './alerting/index.js';
 */

export {
  AlertManager,
  SEVERITY_LEVELS,
  ALERT_STATUS,
  CHANNELS,
} from './alert-manager.js';

export {
  ALERT_RULES,
  ALERT_THRESHOLDS,
  SEVERITY_CHANNEL_ROUTING,
  ESCALATION_CONFIG,
  getAlertRule,
  getAllAlertRules,
  getAlertRulesBySeverity,
  evaluateCondition,
  buildAlertMessage,
} from './alert-rules.js';
