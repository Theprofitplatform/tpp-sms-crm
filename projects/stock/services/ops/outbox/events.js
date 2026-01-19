/**
 * Outbox Event Type Definitions
 *
 * Defines all event types that flow through the outbox system.
 * Each event type has a defined structure and target service.
 *
 * Usage:
 *   import { EventTypes, getEventConfig } from './events.js';
 *
 *   const config = getEventConfig(EventTypes.SIGNAL_GENERATED);
 *   // { targetService: 'execution', endpoint: '/api/v1/orders/propose', ... }
 */

/**
 * Event type constants
 */
export const EventTypes = {
  // Data Service Events
  MARKET_DATA_READY: 'market_data_ready',

  // Signal Service Events
  SIGNAL_GENERATED: 'signal_generated',

  // Order Flow Events
  ORDER_PROPOSED: 'order_proposed',
  ORDER_APPROVED: 'order_approved',
  ORDER_REJECTED: 'order_rejected',
  ORDER_SUBMITTED: 'order_submitted',

  // Execution Events
  FILL_RECEIVED: 'fill_received',

  // System Events
  RISK_ALERT: 'risk_alert',
  KILL_SWITCH_ACTIVATED: 'kill_switch_activated',
  KILL_SWITCH_DEACTIVATED: 'kill_switch_deactivated',

  // Notification Events (route to notification service)
  NOTIFY_SIGNAL: 'notify_signal',
  NOTIFY_ORDER: 'notify_order',
  NOTIFY_POSITION: 'notify_position',
  NOTIFY_ERROR: 'notify_error',
  NOTIFY_DAILY_SUMMARY: 'notify_daily_summary',
};

/**
 * Event configuration map
 * Defines how each event type should be dispatched
 */
const EVENT_CONFIG = {
  [EventTypes.MARKET_DATA_READY]: {
    targetService: 'signal',
    endpoint: '/api/v1/signals/generate',
    method: 'POST',
    description: 'Triggers signal generation when new market data is available',
    maxRetries: 3,
    timeoutMs: 30000,
  },

  [EventTypes.SIGNAL_GENERATED]: {
    targetService: 'execution',
    endpoint: '/api/v1/orders/propose',
    method: 'POST',
    description: 'Proposes an order based on a generated signal',
    maxRetries: 3,
    timeoutMs: 10000,
  },

  [EventTypes.ORDER_PROPOSED]: {
    targetService: 'risk',
    endpoint: '/api/v1/orders/validate',
    method: 'POST',
    description: 'Validates a proposed order against risk limits',
    maxRetries: 3,
    timeoutMs: 10000,
  },

  [EventTypes.ORDER_APPROVED]: {
    targetService: 'execution',
    endpoint: '/api/v1/orders/execute',
    method: 'POST',
    description: 'Executes an approved order',
    maxRetries: 5,
    timeoutMs: 15000,
  },

  [EventTypes.ORDER_REJECTED]: {
    targetService: 'ops',
    endpoint: '/api/v1/alerts',
    method: 'POST',
    description: 'Logs order rejection for monitoring',
    maxRetries: 2,
    timeoutMs: 5000,
  },

  [EventTypes.ORDER_SUBMITTED]: {
    targetService: 'ops',
    endpoint: '/api/v1/orders/track',
    method: 'POST',
    description: 'Tracks submitted order status',
    maxRetries: 3,
    timeoutMs: 5000,
  },

  [EventTypes.FILL_RECEIVED]: {
    targetService: 'risk',
    endpoint: '/api/v1/portfolio/update',
    method: 'POST',
    description: 'Updates portfolio after order fill',
    maxRetries: 5,
    timeoutMs: 10000,
  },

  [EventTypes.RISK_ALERT]: {
    targetService: 'ops',
    endpoint: '/api/v1/alerts',
    method: 'POST',
    description: 'Sends risk alert notification',
    maxRetries: 3,
    timeoutMs: 5000,
  },

  [EventTypes.KILL_SWITCH_ACTIVATED]: {
    targetService: 'execution',
    endpoint: '/api/v1/killswitch/notify',
    method: 'POST',
    description: 'Notifies execution service to halt all trading',
    maxRetries: 5,
    timeoutMs: 5000,
  },

  [EventTypes.KILL_SWITCH_DEACTIVATED]: {
    targetService: 'execution',
    endpoint: '/api/v1/killswitch/notify',
    method: 'POST',
    description: 'Notifies execution service trading can resume',
    maxRetries: 3,
    timeoutMs: 5000,
  },

  // Notification Events
  [EventTypes.NOTIFY_SIGNAL]: {
    targetService: 'ops',
    endpoint: '/api/v1/notifications/webhook/signal',
    method: 'POST',
    description: 'Sends signal notification via Discord/Telegram',
    maxRetries: 2,
    timeoutMs: 10000,
  },

  [EventTypes.NOTIFY_ORDER]: {
    targetService: 'ops',
    endpoint: '/api/v1/notifications/webhook/order',
    method: 'POST',
    description: 'Sends order notification via Discord/Telegram',
    maxRetries: 2,
    timeoutMs: 10000,
  },

  [EventTypes.NOTIFY_POSITION]: {
    targetService: 'ops',
    endpoint: '/api/v1/notifications/webhook/position',
    method: 'POST',
    description: 'Sends position notification via Discord/Telegram',
    maxRetries: 2,
    timeoutMs: 10000,
  },

  [EventTypes.NOTIFY_ERROR]: {
    targetService: 'ops',
    endpoint: '/api/v1/notifications/webhook/error',
    method: 'POST',
    description: 'Sends error notification via Discord/Telegram',
    maxRetries: 3,
    timeoutMs: 10000,
  },

  [EventTypes.NOTIFY_DAILY_SUMMARY]: {
    targetService: 'ops',
    endpoint: '/api/v1/notifications/webhook/daily-summary',
    method: 'POST',
    description: 'Sends daily trading summary via Discord/Telegram',
    maxRetries: 3,
    timeoutMs: 15000,
  },
};

/**
 * Get event configuration
 * @param {string} eventType - The event type
 * @returns {object|null} Event configuration or null if not found
 */
export function getEventConfig(eventType) {
  return EVENT_CONFIG[eventType] || null;
}

/**
 * Validate event type
 * @param {string} eventType - The event type to validate
 * @returns {boolean} True if valid
 */
export function isValidEventType(eventType) {
  return Object.values(EventTypes).includes(eventType);
}

/**
 * Get all event types for a target service
 * @param {string} targetService - The target service name
 * @returns {string[]} Array of event types
 */
export function getEventTypesForService(targetService) {
  return Object.entries(EVENT_CONFIG)
    .filter(([, config]) => config.targetService === targetService)
    .map(([eventType]) => eventType);
}

/**
 * Payload schema definitions for validation
 */
export const PayloadSchemas = {
  [EventTypes.MARKET_DATA_READY]: {
    required: ['symbols', 'market', 'timestamp'],
    optional: ['interval', 'data_type'],
  },

  [EventTypes.SIGNAL_GENERATED]: {
    required: ['signal_id', 'symbol', 'direction', 'strategy_id', 'confidence'],
    optional: ['target_price', 'stop_loss', 'take_profit', 'metadata'],
  },

  [EventTypes.ORDER_PROPOSED]: {
    required: ['order_id', 'symbol', 'side', 'quantity', 'order_type', 'signal_id'],
    optional: ['limit_price', 'stop_price', 'time_in_force'],
  },

  [EventTypes.ORDER_APPROVED]: {
    required: ['order_id', 'validation_id', 'approved_at'],
    optional: ['risk_checks', 'modifications'],
  },

  [EventTypes.ORDER_REJECTED]: {
    required: ['order_id', 'reason', 'rejected_by'],
    optional: ['risk_checks', 'violated_limits'],
  },

  [EventTypes.ORDER_SUBMITTED]: {
    required: ['order_id', 'broker', 'submitted_at'],
    optional: ['broker_order_id', 'estimated_fill_time'],
  },

  [EventTypes.FILL_RECEIVED]: {
    required: ['fill_id', 'order_id', 'filled_quantity', 'filled_price', 'filled_at'],
    optional: ['commission', 'remaining_quantity'],
  },

  [EventTypes.RISK_ALERT]: {
    required: ['alert_type', 'severity', 'message'],
    optional: ['symbol', 'current_value', 'threshold_value', 'action_required'],
  },

  [EventTypes.KILL_SWITCH_ACTIVATED]: {
    required: ['reason', 'triggered_by', 'activated_at'],
    optional: ['affected_orders', 'auto_actions'],
  },

  [EventTypes.KILL_SWITCH_DEACTIVATED]: {
    required: ['deactivated_by', 'deactivated_at'],
    optional: ['notes'],
  },

  // Notification Event Schemas
  [EventTypes.NOTIFY_SIGNAL]: {
    required: ['symbol', 'direction'],
    optional: ['signal_id', 'strategy_id', 'strategy_name', 'confidence', 'entry_price', 'target_price', 'stop_loss'],
  },

  [EventTypes.NOTIFY_ORDER]: {
    required: ['event_type', 'symbol'],
    optional: ['order_id', 'side', 'quantity', 'filled_qty', 'avg_price', 'commission', 'reason', 'rejected_by'],
  },

  [EventTypes.NOTIFY_POSITION]: {
    required: ['event_type', 'symbol'],
    optional: ['side', 'quantity', 'entry_price', 'exit_price', 'pnl', 'pnl_percent', 'strategy', 'hold_time'],
  },

  [EventTypes.NOTIFY_ERROR]: {
    required: ['message'],
    optional: ['service', 'error_type', 'title', 'code', 'stack', 'critical'],
  },

  [EventTypes.NOTIFY_DAILY_SUMMARY]: {
    required: ['date'],
    optional: ['totalPnl', 'winRate', 'totalTrades', 'winners', 'losers', 'openPositions', 'bestTrade', 'worstTrade', 'portfolioValue'],
  },
};

/**
 * Validate event payload against schema
 * @param {string} eventType - The event type
 * @param {object} payload - The payload to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validatePayload(eventType, payload) {
  const schema = PayloadSchemas[eventType];
  if (!schema) {
    return { valid: false, errors: [`Unknown event type: ${eventType}`] };
  }

  const errors = [];

  // Check required fields
  for (const field of schema.required) {
    if (!(field in payload) || payload[field] === null || payload[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default EventTypes;
