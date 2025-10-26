/**
 * API Service Layer
 * Centralized API calls for the dashboard
 */

const API_BASE = '/api'

/**
 * Client Management APIs
 */
export const clientAPI = {
  // Get all clients with stats
  async getAll() {
    const response = await fetch(`${API_BASE}/dashboard`)
    if (!response.ok) throw new Error('Failed to fetch clients')
    return response.json()
  },

  // Get specific client details
  async getById(clientId) {
    const response = await fetch(`${API_BASE}/dashboard`)
    const data = await response.json()
    const client = data.clients?.find(c => c.id === clientId)
    if (!client) throw new Error('Client not found')
    return { success: true, client }
  },

  // Update client status
  async updateStatus(clientId, status) {
    const response = await fetch(`${API_BASE}/client/${clientId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    return response.json()
  },

  // Test client authentication
  async testAuth(clientId) {
    const response = await fetch(`${API_BASE}/test-auth/${clientId}`, {
      method: 'POST'
    })
    return response.json()
  },

  // Run audit for client
  async runAudit(clientId) {
    const response = await fetch(`${API_BASE}/audit/${clientId}`, {
      method: 'POST'
    })
    return response.json()
  },

  // Run optimization for client
  async runOptimization(clientId) {
    const response = await fetch(`${API_BASE}/optimize/${clientId}`, {
      method: 'POST'
    })
    return response.json()
  },

  // Get client reports
  async getReports(clientId) {
    const response = await fetch(`${API_BASE}/reports/${clientId}`)
    return response.json()
  }
}

/**
 * Analytics APIs
 */
export const analyticsAPI = {
  // Get analytics summary
  async getSummary() {
    const response = await fetch(`${API_BASE}/analytics/summary`)
    return response.json()
  },

  // Get client performance history
  async getClientPerformance(clientId, limit = 50) {
    const response = await fetch(`${API_BASE}/analytics/client/${clientId}/performance?limit=${limit}`)
    return response.json()
  },

  // Get client audit history
  async getClientAudits(clientId, limit = 50) {
    const response = await fetch(`${API_BASE}/analytics/client/${clientId}/audits?limit=${limit}`)
    return response.json()
  },

  // Get all performance history
  async getAllPerformance(limit = 100) {
    const response = await fetch(`${API_BASE}/analytics/performance?limit=${limit}`)
    return response.json()
  },

  // Get daily stats history
  async getDailyStats(days = 30) {
    const response = await fetch(`${API_BASE}/analytics/daily-stats?days=${days}`)
    return response.json()
  },

  // Get all client metrics
  async getClientMetrics() {
    const response = await fetch(`${API_BASE}/analytics/clients/metrics`)
    return response.json()
  }
}

/**
 * Keyword Research APIs (proxied to Python service)
 */
export const keywordAPI = {
  // List all keyword research projects
  async listProjects() {
    try {
      const response = await fetch(`${API_BASE}/keyword/projects`)
      if (!response.ok) {
        // Keyword service might not be running
        console.warn('Keyword service unavailable')
        return { success: false, projects: [] }
      }
      return response.json()
    } catch (error) {
      console.warn('Keyword service error:', error)
      return { success: false, projects: [] }
    }
  },

  // Get project details
  async getProject(projectId) {
    try {
      const response = await fetch(`${API_BASE}/keyword/projects/${projectId}`)
      if (!response.ok) throw new Error('Project not found')
      return response.json()
    } catch (error) {
      console.warn('Keyword service error:', error)
      return { success: false, error: error.message }
    }
  },

  // Create new keyword research
  async createResearch(data) {
    try {
      const response = await fetch(`${API_BASE}/keyword/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    } catch (error) {
      console.warn('Keyword service error:', error)
      return { success: false, error: error.message }
    }
  },

  // Get keywords for a project
  async getKeywords(projectId, options = {}) {
    try {
      const {
        page = 1,
        perPage = 50,
        intent,
        minVolume,
        maxDifficulty
      } = options

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      })

      if (intent) params.append('intent', intent)
      if (minVolume) params.append('min_volume', minVolume.toString())
      if (maxDifficulty) params.append('max_difficulty', maxDifficulty.toString())

      const response = await fetch(`${API_BASE}/keyword/projects/${projectId}/keywords?${params}`)
      if (!response.ok) throw new Error('Failed to fetch keywords')
      return response.json()
    } catch (error) {
      console.warn('Keyword service error:', error)
      return { success: false, keywords: [], total: 0 }
    }
  },

  // Get top keywords for a client (maps client ID to project)
  async getClientKeywords(clientId, limit = 10) {
    try {
      // First, try to find a project for this client
      const projectsResponse = await this.listProjects()
      if (!projectsResponse.success || !projectsResponse.projects) {
        return { success: false, keywords: [] }
      }

      // Find project matching client (simple name match for now)
      const project = projectsResponse.projects.find(p =>
        p.name.toLowerCase().includes(clientId.toLowerCase())
      )

      if (!project) {
        return { success: false, keywords: [] }
      }

      // Get keywords for this project
      const keywordsResponse = await this.getKeywords(project.id, {
        perPage: limit,
        page: 1
      })

      return {
        success: true,
        keywords: keywordsResponse.keywords || []
      }
    } catch (error) {
      console.warn('Keyword service error:', error)
      return { success: false, keywords: [] }
    }
  }
}

/**
 * Batch Operations
 */
export const batchAPI = {
  // Run batch operation
  async run(action) {
    const response = await fetch(`${API_BASE}/batch/${action}`, {
      method: 'POST'
    })
    return response.json()
  },

  // Batch optimize all clients
  async optimizeAll() {
    return this.run('optimize')
  },

  // Batch audit all clients
  async auditAll() {
    return this.run('audit')
  },

  // Batch test all clients
  async testAll() {
    return this.run('test')
  }
}

/**
 * Documentation APIs
 */
export const docsAPI = {
  // Get documentation list
  async list() {
    const response = await fetch(`${API_BASE}/docs`)
    return response.json()
  },

  // Get specific documentation
  async get(filename) {
    const response = await fetch(`${API_BASE}/docs/${filename}`)
    return response.json()
  }
}

/**
 * Utility function to handle API errors
 */
export const handleAPIError = (error) => {
  console.error('API Error:', error)

  if (error.message.includes('fetch')) {
    return {
      success: false,
      error: 'Network error. Please check your connection and ensure the backend server is running.'
    }
  }

  return {
    success: false,
    error: error.message || 'An unexpected error occurred'
  }
}

/**
 * Check if services are available
 */
export const healthCheck = {
  async backend() {
    try {
      const response = await fetch(`${API_BASE}/dashboard`)
      return response.ok
    } catch {
      return false
    }
  },

  async keywordService() {
    try {
      const response = await fetch(`${API_BASE}/keyword/projects`)
      return response.ok
    } catch {
      return false
    }
  },

  async all() {
    const [backend, keywordService] = await Promise.all([
      this.backend(),
      this.keywordService()
    ])

    return {
      backend,
      keywordService,
      healthy: backend // Backend is required, keyword service is optional
    }
  }
}

export default {
  client: clientAPI,
  analytics: analyticsAPI,
  keyword: keywordAPI,
  batch: batchAPI,
  docs: docsAPI,
  healthCheck,
  handleAPIError
}
