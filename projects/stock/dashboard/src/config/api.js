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
  },

  // Data Service endpoints
  data: {
    health: () => `${API_CONFIG.data}/health`,
    ohlcv: (symbol, market, start) =>
      `${API_CONFIG.data}/api/v1/ohlcv/${symbol}?market=${market}&start=${start}`,
  },

  // Signal Service endpoints
  signal: {
    health: () => `${API_CONFIG.signal}/health`,
    strategies: () => `${API_CONFIG.signal}/api/v1/strategies`,
    signals: () => `${API_CONFIG.signal}/api/v1/signals`,
    rejectSignal: (id) => `${API_CONFIG.signal}/api/v1/signals/${id}/reject`,
  },

  // Risk Service endpoints
  risk: {
    health: () => `${API_CONFIG.risk}/health`,
    limits: () => `${API_CONFIG.risk}/api/v1/limits`,
    portfolioRisk: () => `${API_CONFIG.risk}/api/v1/portfolio/risk`,
    killswitchStatus: () => `${API_CONFIG.risk}/api/v1/killswitch/status`,
  },

  // Execution Service endpoints
  exec: {
    health: () => `${API_CONFIG.exec}/health`,
    orders: () => `${API_CONFIG.exec}/api/v1/orders`,
    orderById: (id) => `${API_CONFIG.exec}/api/v1/orders/${id}`,
    positions: () => `${API_CONFIG.exec}/api/v1/positions`,
  },
}

export default API
