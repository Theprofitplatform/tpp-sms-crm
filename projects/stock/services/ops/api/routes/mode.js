/**
 * Trading Mode Routes
 *
 * Manages trading mode transitions: BACKTEST -> PAPER -> LIVE
 *
 * LIVE mode requires TWO conditions:
 * 1. LIVE_TRADING_ENABLED=true (or LIVE_ENABLE=true) in environment
 * 2. System must be ARMED via /api/v1/arming/confirm
 */

import { Router } from 'express';

const router = Router();

/**
 * Get current trading mode
 */
router.get('/', (req, res) => {
  const { db, armingManager } = req.app.locals;

  try {
    const state = db.getModeState();
    const armingStatus = armingManager ? armingManager.getStatus() : null;

    res.json({
      mode: state.mode,
      kill_switch_active: Boolean(state.kill_switch_active),
      kill_switch_reason: state.kill_switch_reason,
      kill_switch_triggered_at: state.kill_switch_triggered_at,
      last_mode_change: state.last_mode_change,
      changed_by: state.changed_by,
      // Arming info
      live_armed: armingStatus?.armed || false,
      live_armed_expires_at: armingStatus?.expires_at || null,
      can_go_live: armingStatus?.can_activate_live || false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Switch trading mode
 *
 * CRITICAL: Mode transitions have strict rules:
 * - BACKTEST -> PAPER: Always allowed
 * - PAPER -> LIVE: Requires BOTH:
 *   1. LIVE_TRADING_ENABLED=true (or LIVE_ENABLE=true) in environment
 *   2. System must be ARMED via /api/v1/arming/confirm
 *   3. Explicit confirmation in request body
 * - LIVE -> PAPER: Always allowed (safety)
 * - LIVE -> BACKTEST: Always allowed (safety)
 */
router.post('/switch', (req, res) => {
  const { db, logger, config, armingManager } = req.app.locals;
  const { mode, reason, confirmed } = req.body;

  if (!mode) {
    return res.status(400).json({ error: 'Mode is required' });
  }

  if (!reason) {
    return res.status(400).json({ error: 'Reason is required for mode switch' });
  }

  const validModes = ['BACKTEST', 'PAPER', 'LIVE'];
  if (!validModes.includes(mode.toUpperCase())) {
    return res.status(400).json({
      error: `Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`,
    });
  }

  try {
    const currentState = db.getModeState();
    const newMode = mode.toUpperCase();

    // Check kill switch
    if (currentState.kill_switch_active && newMode !== 'BACKTEST') {
      return res.status(400).json({
        error: 'Kill switch is active. Can only switch to BACKTEST mode.',
        kill_switch_reason: currentState.kill_switch_reason,
      });
    }

    // LIVE mode requires confirmation, LIVE_TRADING_ENABLED, AND arming
    if (newMode === 'LIVE') {
      // Check environment (LIVE_TRADING_ENABLED or LIVE_ENABLE)
      const liveEnabled = process.env.LIVE_TRADING_ENABLED === 'true' ||
                          process.env.LIVE_ENABLE === 'true';
      if (!liveEnabled) {
        return res.status(400).json({
          error: 'LIVE trading is not enabled in environment.',
          details: 'Set LIVE_TRADING_ENABLED=true (or LIVE_ENABLE=true) to enable.',
          step: 1,
          total_steps: 3,
        });
      }

      // Check arming status (TWO-CONDITION SAFETY)
      if (armingManager) {
        const armingStatus = armingManager.getStatus();

        if (!armingStatus.armed) {
          return res.status(400).json({
            error: 'System is not armed for LIVE trading.',
            details: 'You must arm the system first via /api/v1/arming/request and /api/v1/arming/confirm',
            step: 2,
            total_steps: 3,
            arming_status: armingStatus.status,
            how_to_arm: {
              step1: 'POST /api/v1/arming/request to get confirmation code',
              step2: 'POST /api/v1/arming/confirm with the code',
            },
          });
        }

        // Check if arming has expired
        if (armingStatus.expires_at) {
          const expiresAt = new Date(armingStatus.expires_at);
          if (expiresAt < new Date()) {
            return res.status(400).json({
              error: 'Arming has expired.',
              details: 'System arming expires after 24 hours. Please re-arm the system.',
              expired_at: armingStatus.expires_at,
            });
          }
        }
      }

      // Require explicit confirmation
      if (!confirmed) {
        return res.status(400).json({
          error: 'LIVE mode requires explicit confirmation',
          requires_confirmation: true,
          step: 3,
          total_steps: 3,
          warning: 'You are about to enable LIVE trading with REAL money. Set confirmed=true to proceed.',
          checklist: {
            environment: 'LIVE_TRADING_ENABLED=true',
            armed: armingManager ? armingManager.isArmed() : 'N/A',
            confirmed: 'Set confirmed=true in request body',
          },
        });
      }
    }

    // Perform the switch
    const newState = db.setMode(newMode, req.body.changed_by || 'api');

    logger.info('Trading mode switched', {
      from: currentState.mode,
      to: newMode,
      reason,
      changed_by: req.body.changed_by || 'api',
    });

    // Include arming info in response for LIVE mode
    const response = {
      success: true,
      previous_mode: currentState.mode,
      current_mode: newState.mode,
      reason,
      timestamp: new Date().toISOString(),
    };

    if (newMode === 'LIVE' && armingManager) {
      const armingStatus = armingManager.getStatus();
      response.arming = {
        armed_at: armingStatus.armed_at,
        expires_at: armingStatus.expires_at,
        expires_in_hours: armingStatus.expires_in_hours,
      };
      response.warning = 'LIVE TRADING IS NOW ACTIVE. All orders will use REAL money.';
    }

    res.json(response);

  } catch (error) {
    logger.error('Mode switch failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get allowed mode transitions
 */
router.get('/transitions', (req, res) => {
  const { db, armingManager } = req.app.locals;

  const currentState = db.getModeState();
  const liveEnabled = process.env.LIVE_TRADING_ENABLED === 'true' ||
                      process.env.LIVE_ENABLE === 'true';

  const armingStatus = armingManager ? armingManager.getStatus() : null;
  const canGoLive = liveEnabled && armingStatus?.armed;

  const transitions = {
    BACKTEST: {
      allowed_transitions: ['PAPER'],
      requires_confirmation: false,
      requires_arming: false,
    },
    PAPER: {
      allowed_transitions: canGoLive ? ['BACKTEST', 'LIVE'] : ['BACKTEST'],
      requires_confirmation: false,
      requires_arming: false,
      live_blocked_reason: !liveEnabled
        ? 'LIVE_TRADING_ENABLED not set'
        : (!armingStatus?.armed ? 'System not armed' : null),
    },
    LIVE: {
      allowed_transitions: ['PAPER', 'BACKTEST'],
      requires_confirmation: false,
      requires_arming: false,
    },
  };

  res.json({
    current_mode: currentState.mode,
    live_trading_enabled: liveEnabled,
    live_armed: armingStatus?.armed || false,
    can_go_live: canGoLive,
    kill_switch_active: Boolean(currentState.kill_switch_active),
    transitions: transitions[currentState.mode],
    all_transitions: transitions,
    arming_status: armingStatus?.status || 'unavailable',
  });
});

/**
 * Get kill switch status
 */
router.get('/killswitch', (req, res) => {
  const { db } = req.app.locals;

  try {
    const state = db.getModeState();
    res.json({
      active: Boolean(state.kill_switch_active),
      reason: state.kill_switch_reason,
      triggered_at: state.kill_switch_triggered_at,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Activate kill switch - EMERGENCY STOP
 */
router.post('/killswitch/activate', (req, res) => {
  const { db, logger } = req.app.locals;
  const { reason } = req.body;

  try {
    const state = db.activateKillSwitch(reason || 'Manual activation', 'api');

    logger.warn('KILL SWITCH ACTIVATED', { reason, triggered_by: 'api' });

    res.json({
      success: true,
      message: 'Kill switch activated - all trading halted',
      state: {
        active: Boolean(state.kill_switch_active),
        reason: state.kill_switch_reason,
        triggered_at: state.kill_switch_triggered_at,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Deactivate kill switch
 */
router.post('/killswitch/deactivate', (req, res) => {
  const { db, logger } = req.app.locals;

  try {
    const state = db.deactivateKillSwitch();

    logger.info('Kill switch deactivated', { deactivated_by: 'api' });

    res.json({
      success: true,
      message: 'Kill switch deactivated - trading can resume',
      state: {
        active: Boolean(state.kill_switch_active),
        reason: state.kill_switch_reason,
        triggered_at: state.kill_switch_triggered_at,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
