/**
 * Alerts Module - Stock Trading Automation System
 *
 * Exports critical alert handling functionality for direct notification
 * delivery that bypasses Alertmanager for emergencies.
 *
 * This module provides:
 *   - CriticalAlertHandler: Direct notification to Discord, SMS, PagerDuty
 *   - CRITICAL_ALERT_TYPES: Enumeration of critical alert types
 *
 * Usage:
 *   import {
 *     CriticalAlertHandler,
 *     CRITICAL_ALERT_TYPES,
 *   } from './alerts/index.js';
 *
 *   const handler = new CriticalAlertHandler({
 *     logger,
 *     discord: { webhookUrl: '...' },
 *     sms: { twilioSid: '...', authToken: '...', from: '...', to: '...' },
 *     pagerduty: { routingKey: '...' },
 *   });
 *
 *   // Send specific alert types
 *   await handler.sendKillSwitchAlert({ reason: 'Manual activation' });
 *   await handler.sendPositionMismatchAlert({ symbol: 'AAPL', internal: 100, broker: 0 });
 *   await handler.sendDrawdownBreachAlert({ current: 5.5, limit: 5.0 });
 *
 *   // Send generic critical alert
 *   await handler.sendCriticalAlert({
 *     type: CRITICAL_ALERT_TYPES.SERVICE_DOWN,
 *     title: 'Critical Service Down',
 *     message: 'Execution service is not responding',
 *     details: { service: 'execution', lastSeen: '2024-01-01T10:00:00Z' },
 *   });
 *
 * Dependencies:
 *   - axios (HTTP client for Discord/PagerDuty)
 *   - twilio (optional, for SMS alerts)
 */

export {
  CriticalAlertHandler,
  CRITICAL_ALERT_TYPES,
} from './critical_alerts.js';

// Re-export default for CommonJS compatibility
export { default } from './critical_alerts.js';
