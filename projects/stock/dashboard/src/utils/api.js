/**
 * API Configuration and utilities
 * Centralized API handling for the trading dashboard
 */

import axios from 'axios'

// Determine API base URL based on environment
export function getApiBase() {
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
export const SERVICE_PORTS = {
  ops: 5100,
  data: 5101,
  signal: 5102,
  risk: 5103,
  execution: 5104,
}

// Create API base URL for a specific service
export function getServiceUrl(service) {
  const port = SERVICE_PORTS[service]
  if (!port) {
    throw new Error(`Unknown service: ${service}`)
  }
  return `${getApiBase()}:${port}`
}

// Create configured axios instance for a service
export function createApiClient(service, options = {}) {
  const baseURL = getServiceUrl(service)

  const client = axios.create({
    baseURL,
    timeout: options.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add any auth headers here if needed
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle common errors
      if (error.response) {
        // Server responded with error
        const { status, data } = error.response

        if (status === 401) {
          // Handle unauthorized
          console.error('Unauthorized request')
        }

        if (status === 503) {
          // Service unavailable
          error.message = `${service} service is unavailable`
        }

        // Use server error message if available
        if (data?.error) {
          error.message = data.error
        }
      } else if (error.request) {
        // Request made but no response
        error.message = `Cannot connect to ${service} service`
      }

      return Promise.reject(error)
    }
  )

  return client
}

// Pre-configured API clients
export const opsApi = createApiClient('ops')
export const dataApi = createApiClient('data')
export const signalApi = createApiClient('signal')
export const riskApi = createApiClient('risk')
export const executionApi = createApiClient('execution')

// Common API endpoints
export const endpoints = {
  // Ops Service
  mode: '/api/v1/mode',
  modeSwitch: '/api/v1/mode/switch',
  killswitchActivate: '/api/v1/mode/killswitch/activate',
  killswitchDeactivate: '/api/v1/mode/killswitch/deactivate',
  settings: '/api/v1/settings',

  // Data Service
  ohlcv: (symbol, params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    return `/api/v1/ohlcv/${symbol}${queryParams ? `?${queryParams}` : ''}`
  },

  // Signal Service
  signals: '/api/v1/signals',
  signalReject: (id) => `/api/v1/signals/${id}/reject`,
  strategies: '/api/v1/strategies',

  // Risk Service
  limits: '/api/v1/limits',
  portfolioRisk: '/api/v1/portfolio/risk',
  killswitch: '/api/v1/killswitch',

  // Execution Service
  positions: '/api/v1/positions',
  orders: '/api/v1/orders',
  orderById: (id) => `/api/v1/orders/${id}`,

  // Health checks
  health: '/health',
}

// Fetch all service health statuses
export async function fetchAllHealth() {
  const services = ['ops', 'data', 'signal', 'risk', 'execution']
  const clients = [opsApi, dataApi, signalApi, riskApi, executionApi]

  const results = await Promise.allSettled(
    clients.map(client => client.get('/health'))
  )

  const health = {}
  results.forEach((result, index) => {
    const service = services[index]
    if (result.status === 'fulfilled') {
      health[service] = result.value.data
    } else {
      health[service] = { status: 'unhealthy', error: result.reason?.message }
    }
  })

  return health
}

// Backward compatibility - single API_BASE constant
export const API_BASE = getApiBase()
