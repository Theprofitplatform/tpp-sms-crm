/**
 * LIVE Mode Arming Manager
 *
 * Provides two-condition safety system for LIVE mode trading:
 * 1. Environment variable LIVE_ENABLE=true
 * 2. Database flag live_armed=1 in mode_state table
 *
 * Arming requires:
 * - Request generates a 6-digit confirmation code
 * - Code must be confirmed within 5 minutes
 * - Arming expires after 24 hours
 *
 * All arming/disarming events are logged to arming_events table.
 *
 * Usage:
 *   const armingManager = new ArmingManager(db, logger);
 *   await armingManager.initialize();
 *   const { code } = armingManager.requestArming('user@example.com');
 *   const result = armingManager.confirmArming(code);
 *   const status = armingManager.getStatus();
 *   armingManager.disarm('user@example.com', 'Maintenance');
 */

import crypto from 'crypto';

// Constants
const CONFIRMATION_CODE_EXPIRY_MINUTES = 5;
const ARMING_EXPIRY_HOURS = 24;

export class ArmingManager {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
    this.pendingCode = null;
    this.pendingCodeExpiry = null;
    this.pendingCodeRequestedBy = null;
    this.pendingCodeIpAddress = null;
  }

  /**
   * Initialize the arming manager
   * - Check for expired arming and auto-disarm
   */
  async initialize() {
    this.logger.info('Initializing ArmingManager...');

    try {
      // Check if currently armed but expired
      const state = this.getModeState();
      if (state.live_armed && state.live_armed_expires_at) {
        const expiresAt = new Date(state.live_armed_expires_at);
        if (expiresAt < new Date()) {
          this.logger.warn('LIVE arming expired, auto-disarming');
          this.disarm('system', 'Arming expired (24h limit)');
          this.logArmingEvent('expire', 'system', null, null);
        }
      }

      this.logger.info('ArmingManager initialized', { armed: Boolean(state.live_armed) });
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize ArmingManager', { error: error.message });
      throw error;
    }
  }

  /**
   * Get current mode state from database
   */
  getModeState() {
    const row = this.db.db.prepare('SELECT * FROM mode_state WHERE id = 1').get();
    return row || {
      mode: 'BACKTEST',
      kill_switch_active: 0,
      live_armed: 0,
      live_armed_at: null,
      live_armed_expires_at: null,
    };
  }

  /**
   * Check if LIVE mode is enabled in environment
   */
  isLiveEnabled() {
    return process.env.LIVE_ENABLE === 'true' || process.env.LIVE_TRADING_ENABLED === 'true';
  }

  /**
   * Check if system is armed for LIVE trading
   */
  isArmed() {
    const state = this.getModeState();

    // Check if armed
    if (!state.live_armed) {
      return false;
    }

    // Check if expired
    if (state.live_armed_expires_at) {
      const expiresAt = new Date(state.live_armed_expires_at);
      if (expiresAt < new Date()) {
        // Auto-disarm on expiry
        this.disarm('system', 'Arming expired (24h limit)');
        this.logArmingEvent('expire', 'system', null, null);
        return false;
      }
    }

    return true;
  }

  /**
   * Check if LIVE mode can be activated
   * Both conditions must be met:
   * 1. LIVE_ENABLE=true in environment
   * 2. live_armed=1 in database
   */
  canActivateLive() {
    return this.isLiveEnabled() && this.isArmed();
  }

  /**
   * Request arming - generates confirmation code
   * @param {string} requestedBy - Who is requesting the arming
   * @param {string} ipAddress - IP address of the requester
   * @returns {object} Result with code or error
   */
  requestArming(requestedBy = 'unknown', ipAddress = null) {
    // Check if environment allows LIVE mode
    if (!this.isLiveEnabled()) {
      this.logger.warn('Arming request denied - LIVE_ENABLE not set', { requestedBy });
      return {
        success: false,
        error: 'LIVE mode is not enabled. Set LIVE_ENABLE=true in environment.',
      };
    }

    // Check if already armed
    if (this.isArmed()) {
      this.logger.warn('Arming request denied - already armed', { requestedBy });
      return {
        success: false,
        error: 'System is already armed for LIVE trading.',
        status: this.getStatus(),
      };
    }

    // Generate 6-digit confirmation code
    const code = this.generateConfirmationCode();

    // Store pending code with expiry
    this.pendingCode = code;
    this.pendingCodeExpiry = new Date(Date.now() + CONFIRMATION_CODE_EXPIRY_MINUTES * 60 * 1000);
    this.pendingCodeRequestedBy = requestedBy;
    this.pendingCodeIpAddress = ipAddress;

    // Log the request event
    this.logArmingEvent('request', requestedBy, code, ipAddress);

    this.logger.warn('ARMING REQUESTED', {
      requestedBy,
      ipAddress,
      expiresIn: `${CONFIRMATION_CODE_EXPIRY_MINUTES} minutes`,
    });

    return {
      success: true,
      message: `Confirmation code generated. Enter code within ${CONFIRMATION_CODE_EXPIRY_MINUTES} minutes to arm system.`,
      code,
      expires_at: this.pendingCodeExpiry.toISOString(),
      warning: 'WARNING: Arming will enable LIVE trading with REAL money. Ensure you understand the risks.',
    };
  }

  /**
   * Confirm arming with the provided code
   * @param {string} code - The 6-digit confirmation code
   * @param {string} ipAddress - IP address of the confirmer
   * @returns {object} Result of confirmation
   */
  confirmArming(code, ipAddress = null) {
    // Check if there's a pending code
    if (!this.pendingCode) {
      this.logger.warn('Arming confirmation denied - no pending request');
      return {
        success: false,
        error: 'No pending arming request. Call /arming/request first.',
      };
    }

    // Check if code has expired
    if (this.pendingCodeExpiry < new Date()) {
      this.clearPendingCode();
      this.logger.warn('Arming confirmation denied - code expired');
      this.logArmingEvent('reject', this.pendingCodeRequestedBy, code, ipAddress);
      return {
        success: false,
        error: 'Confirmation code has expired. Request a new code.',
      };
    }

    // Validate code
    if (code !== this.pendingCode) {
      this.logger.warn('Arming confirmation denied - invalid code', { ipAddress });
      this.logArmingEvent('reject', this.pendingCodeRequestedBy, code, ipAddress);
      return {
        success: false,
        error: 'Invalid confirmation code.',
      };
    }

    // Arm the system
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ARMING_EXPIRY_HOURS * 60 * 60 * 1000);

    this.db.db.prepare(`
      UPDATE mode_state
      SET live_armed = 1,
          live_armed_at = ?,
          live_armed_expires_at = ?
      WHERE id = 1
    `).run(now.toISOString(), expiresAt.toISOString());

    // Log the confirmation event
    this.logArmingEvent('confirm', this.pendingCodeRequestedBy, code, ipAddress);

    this.logger.warn('SYSTEM ARMED FOR LIVE TRADING', {
      requestedBy: this.pendingCodeRequestedBy,
      confirmedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress,
    });

    // Clear pending code
    this.clearPendingCode();

    return {
      success: true,
      message: 'System is now ARMED for LIVE trading.',
      armed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      warning: `Arming will automatically expire in ${ARMING_EXPIRY_HOURS} hours.`,
    };
  }

  /**
   * Disarm the system
   * @param {string} disarmedBy - Who is disarming
   * @param {string} reason - Reason for disarming
   * @param {string} ipAddress - IP address
   * @returns {object} Result of disarming
   */
  disarm(disarmedBy = 'unknown', reason = 'Manual disarm', ipAddress = null) {
    const state = this.getModeState();

    // Check if currently in LIVE mode
    if (state.mode === 'LIVE') {
      this.logger.warn('Disarming while in LIVE mode - switching to PAPER', { disarmedBy, reason });
      this.db.db.prepare(`
        UPDATE mode_state
        SET mode = 'PAPER',
            last_mode_change = datetime('now'),
            changed_by = ?
        WHERE id = 1
      `).run(disarmedBy);
    }

    // Disarm
    this.db.db.prepare(`
      UPDATE mode_state
      SET live_armed = 0,
          live_armed_at = NULL,
          live_armed_expires_at = NULL
      WHERE id = 1
    `).run();

    // Log the disarm event
    this.logArmingEvent('disarm', disarmedBy, null, ipAddress);

    this.logger.warn('SYSTEM DISARMED', { disarmedBy, reason, ipAddress });

    return {
      success: true,
      message: 'System has been disarmed. LIVE trading is now disabled.',
      disarmed_by: disarmedBy,
      reason,
      previous_mode: state.mode,
      current_mode: state.mode === 'LIVE' ? 'PAPER' : state.mode,
    };
  }

  /**
   * Get current arming status
   */
  getStatus() {
    const state = this.getModeState();
    const isArmed = this.isArmed();
    const liveEnabled = this.isLiveEnabled();

    let status = 'DISARMED';
    let canGoLive = false;

    if (!liveEnabled) {
      status = 'LIVE_DISABLED';
    } else if (isArmed) {
      status = 'ARMED';
      canGoLive = true;
    } else {
      status = 'DISARMED';
    }

    const result = {
      status,
      live_enabled: liveEnabled,
      armed: isArmed,
      can_activate_live: canGoLive,
      current_mode: state.mode,
      kill_switch_active: Boolean(state.kill_switch_active),
    };

    if (isArmed && state.live_armed_at) {
      result.armed_at = state.live_armed_at;
      result.expires_at = state.live_armed_expires_at;

      // Calculate remaining time
      if (state.live_armed_expires_at) {
        const expiresAt = new Date(state.live_armed_expires_at);
        const now = new Date();
        const remainingMs = expiresAt - now;
        if (remainingMs > 0) {
          result.expires_in_minutes = Math.floor(remainingMs / 60000);
          result.expires_in_hours = Math.floor(remainingMs / 3600000);
        }
      }
    }

    if (this.pendingCode && this.pendingCodeExpiry > new Date()) {
      result.pending_confirmation = true;
      result.confirmation_expires_at = this.pendingCodeExpiry.toISOString();
    }

    return result;
  }

  /**
   * Generate a 6-digit confirmation code
   */
  generateConfirmationCode() {
    // Generate cryptographically secure random number
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    // Get 6 digits
    const code = String(randomNumber % 1000000).padStart(6, '0');
    return code;
  }

  /**
   * Clear pending confirmation code
   */
  clearPendingCode() {
    this.pendingCode = null;
    this.pendingCodeExpiry = null;
    this.pendingCodeRequestedBy = null;
    this.pendingCodeIpAddress = null;
  }

  /**
   * Log arming event to database
   */
  logArmingEvent(eventType, requestedBy, confirmationCode, ipAddress) {
    try {
      const now = new Date().toISOString();
      const expiresAt = eventType === 'request'
        ? new Date(Date.now() + CONFIRMATION_CODE_EXPIRY_MINUTES * 60 * 1000).toISOString()
        : null;
      const confirmedAt = eventType === 'confirm' ? now : null;

      this.db.db.prepare(`
        INSERT INTO arming_events (event_type, requested_by, confirmation_code, created_at, expires_at, confirmed_at, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(eventType, requestedBy, confirmationCode, now, expiresAt, confirmedAt, ipAddress);
    } catch (error) {
      this.logger.error('Failed to log arming event', { eventType, error: error.message });
    }
  }

  /**
   * Get arming event history
   */
  getArmingHistory(limit = 50) {
    try {
      const rows = this.db.db.prepare(`
        SELECT * FROM arming_events
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit);
      return rows;
    } catch (error) {
      this.logger.error('Failed to get arming history', { error: error.message });
      return [];
    }
  }
}

export default ArmingManager;
