/**
 * API Configuration
 *
 * In development (localhost): Direct connection to service ports
 * In production: Use nginx proxy paths
 */

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

// Service endpoints
export const API_CONFIG = {
  // Ops Service - Mode management, settings, health
  ops: isLocalhost
    ? 'http://localhost:5100'
    : '/api/ops',

  // Data Service - Market data, OHLCV
  data: isLocalhost
    ? 'http://localhost:5101'
    : '/api/data',

  // Signal Service - Strategies, signals
  signal: isLocalhost
    ? 'http://localhost:5102'
    : '/api/signal',

  // Risk Service - Risk validation, limits
  risk: isLocalhost
    ? 'http://localhost:5103'
    : '/api/risk',

  // Execution Service - Orders, positions
  exec: isLocalhost
    ? 'http://localhost:5104'
    : '/api/exec',
}

// API endpoint builders
export const API = {
  // Ops Service endpoints
  ops: {
    health: () => `${API_CONFIG.ops}/health`,
    mode: () => `${API_CONFIG.ops}/api/v1/mode`,
    modeSwitch: () => `${API_CONFIG.ops}/api/v1/mode/switch`,
    killswitchActivate: () => `${API_CONFIG.ops}/api/v1/mode/killswitch/activate`,
    killswitchDeactivate: () => `${API_CONFIG.ops}/api/v1/mode/killswitch/deactivate`,
    settings: () => `${API_CONFIG.ops}/api/v1/settings`,
    configVersion: () => `${API_CONFIG.ops}/api/v1/config/version`,
    // Arming endpoints (for LIVE mode)
    arming: {
      status: () => `${API_CONFIG.ops}/api/v1/arming/status`,
      request: () => `${API_CONFIG.ops}/api/v1/arming/request`,
      confirm: () => `${API_CONFIG.ops}/api/v1/arming/confirm`,
      disarm: () => `${API_CONFIG.ops}/api/v1/arming/disarm`,
    },
    // Outbox endpoints
    outbox: {
      status: () => `${API_CONFIG.ops}/api/v1/outbox/status`,
      deadLetter: () => `${API_CONFIG.ops}/api/v1/outbox/dead-letter`,
      retry: (id) => `${API_CONFIG.ops}/api/v1/outbox/retry/${id}`,
    },
    // Events endpoints
    events: {
      publish: () => `${API_CONFIG.ops}/api/v1/events/publish`,
      byId: (id) => `${API_CONFIG.ops}/api/v1/events/${id}`,
    },
    // Reports endpoints
    reports: {
      daily: () => `${API_CONFIG.ops}/api/v1/reports/daily`,
      latest: () => `${API_CONFIG.ops}/api/v1/reports/daily/latest`,
      generate: () => `${API_CONFIG.ops}/api/v1/reports/daily/generate`,
    },
    // Alerts endpoints
    alerts: {
      list: () => `${API_CONFIG.ops}/api/v1/alerts`,
      active: () => `${API_CONFIG.ops}/api/v1/alerts/active`,
      acknowledge: (id) => `${API_CONFIG.ops}/api/v1/alerts/${id}/acknowledge`,
    },
    // Reconciliation endpoints (Ops side - job management)
    reconciliation: {
      status: () => `${API_CONFIG.ops}/api/v1/reconciliation/status`,
      trigger: () => `${API_CONFIG.ops}/api/v1/reconciliation/trigger`,
      start: () => `${API_CONFIG.ops}/api/v1/reconciliation/start`,
      stop: () => `${API_CONFIG.ops}/api/v1/reconciliation/stop`,
    },
    // Corporate actions endpoints (Ops side - job management)
    corporateActions: {
      status: () => `${API_CONFIG.ops}/api/v1/corporate-actions/status`,
      run: () => `${API_CONFIG.ops}/api/v1/corporate-actions/run`,
    },
  },

  // Data Service endpoints
  data: {
    health: () => `${API_CONFIG.data}/health`,
    symbols: () => `${API_CONFIG.data}/api/v1/symbols`,
    ohlcv: (symbol, market, start) =>
      `${API_CONFIG.data}/api/v1/ohlcv/${symbol}?market=${market}&start=${start}`,
    quality: (symbol) => `${API_CONFIG.data}/api/v1/ohlcv/${symbol}/quality`,
    providers: () => `${API_CONFIG.data}/api/v1/providers`,
    providerHealth: (name) => `${API_CONFIG.data}/api/v1/providers/${name}/health`,
    // Corporate actions endpoints (Data side - data retrieval)
    corporateActions: {
      bySymbol: (symbol) => `${API_CONFIG.data}/api/v1/corporate-actions/${symbol}`,
      splits: (symbol) => `${API_CONFIG.data}/api/v1/corporate-actions/${symbol}/splits`,
      pending: () => `${API_CONFIG.data}/api/v1/corporate-actions/pending`,
    },
  },

  // Signal Service endpoints
  signal: {
    health: () => `${API_CONFIG.signal}/health`,
    strategies: () => `${API_CONFIG.signal}/api/v1/strategies`,
    signals: () => `${API_CONFIG.signal}/api/v1/signals`,
    generateSignals: () => `${API_CONFIG.signal}/api/v1/signals/generate`,
    generateDemo: () => `${API_CONFIG.signal}/api/v1/signals/demo`,
    rejectSignal: (id) => `${API_CONFIG.signal}/api/v1/signals/${id}/reject`,
    // Intelligence endpoints (strategy performance tracking)
    intelligence: {
      weights: () => `${API_CONFIG.signal}/api/v1/intelligence/weights`,
      recordPerformance: () => `${API_CONFIG.signal}/api/v1/intelligence/performance/record`,
    },
  },

  // Risk Service endpoints
  risk: {
    health: () => `${API_CONFIG.risk}/health`,
    limits: () => `${API_CONFIG.risk}/api/v1/limits`,
    portfolioRisk: () => `${API_CONFIG.risk}/api/v1/portfolio/risk`,
    killswitchStatus: () => `${API_CONFIG.risk}/api/v1/killswitch/status`,
    // Portfolio endpoints
    portfolio: {
      risk: () => `${API_CONFIG.risk}/api/v1/portfolio/risk`,
      exposure: () => `${API_CONFIG.risk}/api/v1/portfolio/exposure`,
      correlations: () => `${API_CONFIG.risk}/api/v1/portfolio/correlations`,
      volatility: () => `${API_CONFIG.risk}/api/v1/portfolio/volatility`,
      circuitBreakers: () => `${API_CONFIG.risk}/api/v1/portfolio/circuit-breakers`,
    },
    // Kill switch endpoints
    killswitch: {
      status: () => `${API_CONFIG.risk}/api/v1/killswitch/status`,
      trigger: () => `${API_CONFIG.risk}/api/v1/killswitch/trigger`,
      reset: () => `${API_CONFIG.risk}/api/v1/killswitch/reset`,
    },
  },

  // Execution Service endpoints
  exec: {
    health: () => `${API_CONFIG.exec}/health`,
    orders: () => `${API_CONFIG.exec}/api/v1/orders`,
    orderById: (id) => `${API_CONFIG.exec}/api/v1/orders/${id}`,
    positions: () => `${API_CONFIG.exec}/api/v1/positions`,
    trades: () => `${API_CONFIG.exec}/api/v1/trades`,
    account: () => `${API_CONFIG.exec}/api/v1/account`,
    markets: () => `${API_CONFIG.exec}/api/v1/markets`,
    // FX endpoints
    fx: {
      rates: () => `${API_CONFIG.exec}/api/v1/fx/rates`,
      rate: (pair) => `${API_CONFIG.exec}/api/v1/fx/rate/${pair}`,
      convert: () => `${API_CONFIG.exec}/api/v1/fx/convert`,
    },
    // Reconciliation endpoints (Execution side - actual reconciliation)
    reconciliation: {
      status: () => `${API_CONFIG.exec}/api/v1/reconciliation/status`,
      run: () => `${API_CONFIG.exec}/api/v1/reconciliation/run`,
      history: () => `${API_CONFIG.exec}/api/v1/reconciliation/history`,
    },
  },
}

export default API
