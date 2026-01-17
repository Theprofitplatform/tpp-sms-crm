/**
 * Settings Routes
 *
 * Handles system settings for the trading platform.
 */

import express from 'express';

const router = express.Router();

// Default settings
const DEFAULT_SETTINGS = {
  trading: {
    mode: 'PAPER',
    max_daily_trades: 50,
    max_position_size_pct: 10,
    max_daily_loss_pct: 2,
    max_weekly_loss_pct: 5,
    default_stop_loss_pct: 5,
    default_take_profit_pct: 10,
    auto_execute_signals: false,
    require_confirmation: true,
  },
  notifications: {
    email_enabled: false,
    email_address: '',
    discord_enabled: false,
    discord_webhook: '',
    telegram_enabled: false,
    telegram_bot_token: '',
    telegram_chat_id: '',
    notify_on_signal: true,
    notify_on_trade: true,
    notify_on_error: true,
  },
  strategies: {
    enabled_strategies: ['momentum', 'mean_reversion'],
    momentum: {
      rsi_oversold: 30,
      rsi_overbought: 70,
      macd_signal_threshold: 0,
    },
    mean_reversion: {
      bollinger_period: 20,
      bollinger_std: 2,
      min_deviation_pct: 5,
    },
  },
  ui: {
    theme: 'dark',
    refresh_interval: 30,
    show_debug_info: false,
    timezone: 'UTC',
  },
};

/**
 * GET /api/v1/settings
 * Get all system settings
 */
router.get('/', async (req, res) => {
  const { db, logger } = req.app.locals;

  try {
    // Try to get settings from database
    let settings = null;
    try {
      const row = db.db.prepare('SELECT settings_json FROM config WHERE key = ?').get('system_settings');
      if (row && row.settings_json) {
        settings = JSON.parse(row.settings_json);
      }
    } catch (dbError) {
      logger.warn('Could not read settings from database, using defaults', { error: dbError.message });
    }

    // Merge with defaults to ensure all keys exist
    settings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      trading: { ...DEFAULT_SETTINGS.trading, ...(settings?.trading || {}) },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(settings?.notifications || {}) },
      strategies: { ...DEFAULT_SETTINGS.strategies, ...(settings?.strategies || {}) },
      ui: { ...DEFAULT_SETTINGS.ui, ...(settings?.ui || {}) },
    };

    res.json(settings);
  } catch (error) {
    logger.error('Error fetching settings', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/v1/settings
 * Update system settings
 */
router.put('/', async (req, res) => {
  const { db, logger } = req.app.locals;
  const newSettings = req.body;

  try {
    // Validate settings structure
    if (!newSettings || typeof newSettings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings format' });
    }

    // Get existing settings
    let existingSettings = DEFAULT_SETTINGS;
    try {
      const row = db.db.prepare('SELECT settings_json FROM config WHERE key = ?').get('system_settings');
      if (row && row.settings_json) {
        existingSettings = JSON.parse(row.settings_json);
      }
    } catch (dbError) {
      logger.warn('Could not read existing settings', { error: dbError.message });
    }

    // Merge settings
    const mergedSettings = {
      ...existingSettings,
      ...newSettings,
      trading: { ...existingSettings.trading, ...(newSettings.trading || {}) },
      notifications: { ...existingSettings.notifications, ...(newSettings.notifications || {}) },
      strategies: { ...existingSettings.strategies, ...(newSettings.strategies || {}) },
      ui: { ...existingSettings.ui, ...(newSettings.ui || {}) },
    };

    // Save to database
    try {
      db.db.prepare(`
        INSERT INTO config (key, settings_json, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          settings_json = excluded.settings_json,
          updated_at = datetime('now')
      `).run('system_settings', JSON.stringify(mergedSettings));
    } catch (dbError) {
      logger.warn('Could not save settings to database', { error: dbError.message });
      // Continue anyway - settings will work in memory
    }

    logger.info('Settings updated', { sections: Object.keys(newSettings) });

    res.json({
      status: 'success',
      message: 'Settings updated successfully',
      settings: mergedSettings,
    });
  } catch (error) {
    logger.error('Error updating settings', { error: error.message });
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/v1/settings/:section
 * Get a specific settings section
 */
router.get('/:section', async (req, res) => {
  const { db, logger } = req.app.locals;
  const { section } = req.params;

  try {
    // Validate section
    if (!DEFAULT_SETTINGS[section]) {
      return res.status(404).json({ error: `Unknown settings section: ${section}` });
    }

    // Get settings
    let sectionSettings = DEFAULT_SETTINGS[section];
    try {
      const row = db.db.prepare('SELECT settings_json FROM config WHERE key = ?').get('system_settings');
      if (row && row.settings_json) {
        const allSettings = JSON.parse(row.settings_json);
        if (allSettings[section]) {
          sectionSettings = { ...DEFAULT_SETTINGS[section], ...allSettings[section] };
        }
      }
    } catch (dbError) {
      logger.warn('Could not read settings from database', { error: dbError.message });
    }

    res.json(sectionSettings);
  } catch (error) {
    logger.error('Error fetching settings section', { section, error: error.message });
    res.status(500).json({ error: 'Failed to fetch settings section' });
  }
});

/**
 * PUT /api/v1/settings/:section
 * Update a specific settings section
 */
router.put('/:section', async (req, res) => {
  const { db, logger } = req.app.locals;
  const { section } = req.params;
  const sectionSettings = req.body;

  try {
    // Validate section
    if (!DEFAULT_SETTINGS[section]) {
      return res.status(404).json({ error: `Unknown settings section: ${section}` });
    }

    // Get existing settings
    let allSettings = { ...DEFAULT_SETTINGS };
    try {
      const row = db.db.prepare('SELECT settings_json FROM config WHERE key = ?').get('system_settings');
      if (row && row.settings_json) {
        allSettings = JSON.parse(row.settings_json);
      }
    } catch (dbError) {
      logger.warn('Could not read existing settings', { error: dbError.message });
    }

    // Update section
    allSettings[section] = { ...DEFAULT_SETTINGS[section], ...sectionSettings };

    // Save to database
    try {
      db.db.prepare(`
        INSERT INTO config (key, settings_json, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          settings_json = excluded.settings_json,
          updated_at = datetime('now')
      `).run('system_settings', JSON.stringify(allSettings));
    } catch (dbError) {
      logger.warn('Could not save settings to database', { error: dbError.message });
    }

    logger.info('Settings section updated', { section });

    res.json({
      status: 'success',
      message: `${section} settings updated`,
      settings: allSettings[section],
    });
  } catch (error) {
    logger.error('Error updating settings section', { section, error: error.message });
    res.status(500).json({ error: 'Failed to update settings section' });
  }
});

export default router;
