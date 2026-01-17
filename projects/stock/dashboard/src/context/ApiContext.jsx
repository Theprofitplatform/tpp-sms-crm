import { createContext, useContext, useMemo } from 'react'

/**
 * API Context - Centralized API configuration
 * Replaces repeated API_BASE definitions across all pages
 *
 * @example
 * const { apiBase, endpoints } = useApi()
 * const response = await fetch(`${endpoints.positions}`)
 */

const ApiContext = createContext(null)

// Determine API base URL based on environment
function getApiBase() {
  if (typeof window === 'undefined') return 'http://localhost'

  const hostname = window.location.hostname

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost'
  }

  // Production - use same hostname as frontend
  return `http://${hostname}`
}

// Service ports
const SERVICE_PORTS = {
  ops: 5100,
  data: 5101,
  signal: 5102,
  risk: 5103,
  execution: 5104,
}

export function ApiProvider({ children }) {
  const apiBase = useMemo(() => getApiBase(), [])

  const endpoints = useMemo(() => ({
    // Ops Service (5100)
    mode: `${apiBase}:${SERVICE_PORTS.ops}/api/v1/mode`,
    modeSwitch: `${apiBase}:${SERVICE_PORTS.ops}/api/v1/mode/switch`,
    killswitchActivate: `${apiBase}:${SERVICE_PORTS.ops}/api/v1/mode/killswitch/activate`,
    killswitchDeactivate: `${apiBase}:${SERVICE_PORTS.ops}/api/v1/mode/killswitch/deactivate`,
    settings: `${apiBase}:${SERVICE_PORTS.ops}/api/v1/settings`,
    opsHealth: `${apiBase}:${SERVICE_PORTS.ops}/health`,

    // Data Service (5101)
    ohlcv: (symbol, market = 'US') => `${apiBase}:${SERVICE_PORTS.data}/api/v1/ohlcv/${symbol}?market=${market}`,
    dataHealth: `${apiBase}:${SERVICE_PORTS.data}/health`,

    // Signal Service (5102)
    signals: `${apiBase}:${SERVICE_PORTS.signal}/api/v1/signals`,
    signalReject: (id) => `${apiBase}:${SERVICE_PORTS.signal}/api/v1/signals/${id}/reject`,
    strategies: `${apiBase}:${SERVICE_PORTS.signal}/api/v1/strategies`,
    signalHealth: `${apiBase}:${SERVICE_PORTS.signal}/health`,

    // Risk Service (5103)
    limits: `${apiBase}:${SERVICE_PORTS.risk}/api/v1/limits`,
    portfolioRisk: `${apiBase}:${SERVICE_PORTS.risk}/api/v1/portfolio/risk`,
    killswitch: `${apiBase}:${SERVICE_PORTS.risk}/api/v1/killswitch`,
    riskHealth: `${apiBase}:${SERVICE_PORTS.risk}/health`,

    // Execution Service (5104)
    positions: `${apiBase}:${SERVICE_PORTS.execution}/api/v1/positions`,
    orders: `${apiBase}:${SERVICE_PORTS.execution}/api/v1/orders`,
    orderById: (id) => `${apiBase}:${SERVICE_PORTS.execution}/api/v1/orders/${id}`,
    executionHealth: `${apiBase}:${SERVICE_PORTS.execution}/health`,
  }), [apiBase])

  const value = useMemo(() => ({
    apiBase,
    ports: SERVICE_PORTS,
    endpoints,
  }), [apiBase, endpoints])

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  )
}

export function useApi() {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}

export default ApiContext
