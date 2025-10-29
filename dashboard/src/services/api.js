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
  },

  // Get GSC summary data
  async getGSCSummary() {
    try {
      const response = await fetch(`${API_BASE}/gsc/summary`)
      if (!response.ok) {
        console.warn('GSC data not available')
        return { topQueries: [], totalClicks: 0, totalImpressions: 0, avgPosition: 0 }
      }
      return response.json()
    } catch (error) {
      console.warn('GSC service error:', error)
      return { topQueries: [], totalClicks: 0, totalImpressions: 0, avgPosition: 0 }
    }
  },

  // Sync GSC data
  async syncGSC() {
    const response = await fetch(`${API_BASE}/gsc/sync`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to sync GSC data')
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
 * Auto-Fix Engines APIs
 */
export const autoFixAPI = {
  // Get all auto-fix engines
  async getEngines() {
    const response = await fetch(`${API_BASE}/autofix/engines`)
    return response.json()
  },

  // Toggle engine status
  async toggleEngine(engineId, enabled) {
    const response = await fetch(`${API_BASE}/autofix/engines/${engineId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    return response.json()
  },

  // Run specific engine
  async runEngine(engineId, clientId = null) {
    const response = await fetch(`${API_BASE}/autofix/engines/${engineId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId })
    })
    return response.json()
  },

  // Get fix history
  async getHistory(limit = 50) {
    const response = await fetch(`${API_BASE}/autofix/history?limit=${limit}`)
    return response.json()
  },

  // Update engine settings
  async updateSettings(engineId, settings) {
    const response = await fetch(`${API_BASE}/autofix/engines/${engineId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    return response.json()
  },

  // Get auto-fix change history (NEW)
  async getChangeHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const response = await fetch(`${API_BASE}/auto-fix-history?${queryString}`)
    if (!response.ok) {
      console.warn('Auto-fix history not available')
      return { success: false, reports: [] }
    }
    return response.json()
  },

  // Get specific auto-fix report (NEW)
  async getReport(reportId) {
    const response = await fetch(`${API_BASE}/auto-fix-history/${reportId}`)
    if (!response.ok) {
      console.warn('Auto-fix report not found')
      return { success: false, error: 'Report not found' }
    }
    return response.json()
  },

  // Revert auto-fix changes (NEW)
  async revertChanges(clientId, backupId, postIds) {
    const response = await fetch(`${API_BASE}/auto-fix/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, backupId, postIds })
    })
    return response.json()
  }
}

/**
 * Recommendations APIs
 */
export const recommendationsAPI = {
  // Get all recommendations
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await fetch(`${API_BASE}/recommendations?${params}`)
    return response.json()
  },

  // Create recommendation
  async create(data) {
    const response = await fetch(`${API_BASE}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Update recommendation status
  async updateStatus(recId, status) {
    const response = await fetch(`${API_BASE}/recommendations/${recId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    return response.json()
  },

  // Apply recommendation
  async apply(recId) {
    const response = await fetch(`${API_BASE}/recommendations/${recId}/apply`, {
      method: 'POST'
    })
    return response.json()
  },

  // Delete recommendation
  async delete(recId) {
    const response = await fetch(`${API_BASE}/recommendations/${recId}`, {
      method: 'DELETE'
    })
    return response.json()
  }
}

/**
 * Goals & KPIs APIs
 */
export const goalsAPI = {
  // Get all goals
  async getAll() {
    const response = await fetch(`${API_BASE}/goals`)
    return response.json()
  },

  // Create goal
  async create(data) {
    const response = await fetch(`${API_BASE}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Update goal
  async update(goalId, data) {
    const response = await fetch(`${API_BASE}/goals/${goalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Delete goal
  async delete(goalId) {
    const response = await fetch(`${API_BASE}/goals/${goalId}`, {
      method: 'DELETE'
    })
    return response.json()
  },

  // Get KPIs
  async getKPIs() {
    const response = await fetch(`${API_BASE}/goals/kpis`)
    return response.json()
  }
}

/**
 * Email Campaigns APIs
 */
export const emailAPI = {
  // Get all campaigns
  async getCampaigns() {
    const response = await fetch(`${API_BASE}/email/campaigns`)
    return response.json()
  },

  // Create campaign
  async createCampaign(data) {
    const response = await fetch(`${API_BASE}/email/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Send campaign
  async sendCampaign(campaignId) {
    const response = await fetch(`${API_BASE}/email/campaigns/${campaignId}/send`, {
      method: 'POST'
    })
    return response.json()
  },

  // Get templates
  async getTemplates() {
    const response = await fetch(`${API_BASE}/email/templates`)
    return response.json()
  },

  // Create template
  async createTemplate(data) {
    const response = await fetch(`${API_BASE}/email/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Delete campaign
  async deleteCampaign(campaignId) {
    const response = await fetch(`${API_BASE}/email/campaigns/${campaignId}`, {
      method: 'DELETE'
    })
    return response.json()
  }
}

/**
 * Webhooks APIs
 */
export const webhooksAPI = {
  // Get all webhooks
  async getAll() {
    const response = await fetch(`${API_BASE}/webhooks`)
    return response.json()
  },

  // Create webhook
  async create(data) {
    const response = await fetch(`${API_BASE}/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Update webhook
  async update(webhookId, data) {
    const response = await fetch(`${API_BASE}/webhooks/${webhookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Delete webhook
  async delete(webhookId) {
    const response = await fetch(`${API_BASE}/webhooks/${webhookId}`, {
      method: 'DELETE'
    })
    return response.json()
  },

  // Toggle webhook
  async toggle(webhookId, active) {
    const response = await fetch(`${API_BASE}/webhooks/${webhookId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    })
    return response.json()
  },

  // Test webhook
  async test(webhookId) {
    const response = await fetch(`${API_BASE}/webhooks/${webhookId}/test`, {
      method: 'POST'
    })
    return response.json()
  },

  // Get delivery logs
  async getLogs(webhookId, limit = 50) {
    const response = await fetch(`${API_BASE}/webhooks/${webhookId}/logs?limit=${limit}`)
    return response.json()
  }
}

/**
 * White Label / Branding APIs
 */
export const brandingAPI = {
  // Get branding settings
  async getSettings() {
    const response = await fetch(`${API_BASE}/branding`)
    return response.json()
  },

  // Update branding settings
  async updateSettings(data) {
    const response = await fetch(`${API_BASE}/branding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Upload logo/favicon
  async uploadImage(type, file) {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('type', type)

    const response = await fetch(`${API_BASE}/branding/upload`, {
      method: 'POST',
      body: formData
    })
    return response.json()
  }
}

/**
 * Settings APIs
 */
export const settingsAPI = {
  // Get all settings
  async getAll() {
    const response = await fetch(`${API_BASE}/settings`)
    return response.json()
  },

  // Update settings
  async update(category, data) {
    const response = await fetch(`${API_BASE}/settings/${category}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // Get API keys
  async getAPIKeys() {
    const response = await fetch(`${API_BASE}/settings/api-keys`)
    return response.json()
  },

  // Generate new API key
  async generateAPIKey(name) {
    const response = await fetch(`${API_BASE}/settings/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    return response.json()
  },

  // Revoke API key
  async revokeAPIKey(keyId) {
    const response = await fetch(`${API_BASE}/settings/api-keys/${keyId}`, {
      method: 'DELETE'
    })
    return response.json()
  }
}

/**
 * WordPress Integration API
 */
export const wordpressAPI = {
  // Get all WordPress sites
  async getSites() {
    const response = await fetch(`${API_BASE}/wordpress/sites`)
    if (!response.ok) throw new Error('Failed to fetch WordPress sites')
    return response.json()
  },

  // Test connection to a WordPress site
  async testConnection(siteId) {
    const response = await fetch(`${API_BASE}/wordpress/test/${siteId}`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Connection test failed')
    return response.json()
  },

  // Sync data with WordPress site
  async syncSite(siteId) {
    const response = await fetch(`${API_BASE}/wordpress/sync/${siteId}`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Sync failed')
    return response.json()
  },

  // Add new WordPress site
  async addSite(siteData) {
    const response = await fetch(`${API_BASE}/wordpress/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteData)
    })
    if (!response.ok) throw new Error('Failed to add WordPress site')
    return response.json()
  },

  // Update WordPress site configuration
  async updateSite(siteId, siteData) {
    const response = await fetch(`${API_BASE}/wordpress/sites/${siteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteData)
    })
    if (!response.ok) throw new Error('Failed to update WordPress site')
    return response.json()
  },

  // Delete WordPress site
  async deleteSite(siteId) {
    const response = await fetch(`${API_BASE}/wordpress/sites/${siteId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete WordPress site')
    return response.json()
  }
}

/**
 * Scheduler API
 */
export const schedulerAPI = {
  // Get all scheduled jobs
  async getJobs() {
    const response = await fetch(`${API_BASE}/scheduler/jobs`)
    if (!response.ok) throw new Error('Failed to fetch scheduler data')
    return response.json()
  },

  // Toggle job enabled status
  async toggleJob(jobId, enabled) {
    const response = await fetch(`${API_BASE}/scheduler/jobs/${jobId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    if (!response.ok) throw new Error('Failed to toggle job')
    return response.json()
  },

  // Run job immediately
  async runJob(jobId) {
    const response = await fetch(`${API_BASE}/scheduler/jobs/${jobId}/run`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to run job')
    return response.json()
  },

  // Update job schedule
  async updateSchedule(jobId, scheduleData) {
    const response = await fetch(`${API_BASE}/scheduler/jobs/${jobId}/schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData)
    })
    if (!response.ok) throw new Error('Failed to update job schedule')
    return response.json()
  },

  // Get job history
  async getHistory(jobId = null, limit = 50) {
    const url = jobId
      ? `${API_BASE}/scheduler/jobs/${jobId}/history?limit=${limit}`
      : `${API_BASE}/scheduler/history?limit=${limit}`

    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch job history')
    return response.json()
  }
}

/**
 * Export/Backup API
 */
export const exportAPI = {
  // Export data in specified format
  async exportData(type) {
    const response = await fetch(`${API_BASE}/export/${type}`)
    if (!response.ok) throw new Error('Export failed')

    const blob = await response.blob()
    const filename = response.headers.get('content-disposition')
      ?.split('filename=')[1]
      ?.replace(/"/g, '') ||
      `${type}-export-${new Date().toISOString().split('T')[0]}.csv`

    return { blob, filename }
  },

  // Get backup history
  async getBackupHistory(limit = 10) {
    const response = await fetch(`${API_BASE}/backups?limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch backups')
    return response.json()
  },

  // Get backup schedule configuration
  async getBackupSchedule() {
    const response = await fetch(`${API_BASE}/backups/schedule`)
    if (!response.ok) throw new Error('Failed to fetch backup schedule')
    return response.json()
  },

  // Update backup schedule
  async updateBackupSchedule(scheduleData) {
    const response = await fetch(`${API_BASE}/backups/schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData)
    })
    if (!response.ok) throw new Error('Failed to update backup schedule')
    return response.json()
  },

  // Download a specific backup
  async downloadBackup(backupId) {
    const response = await fetch(`${API_BASE}/backups/${backupId}/download`)
    if (!response.ok) throw new Error('Failed to download backup')

    const blob = await response.blob()
    const filename = response.headers.get('content-disposition')
      ?.split('filename=')[1]
      ?.replace(/"/g, '') ||
      `backup-${backupId}.zip`

    return { blob, filename }
  }
}

/**
 * Notifications API
 */
export const notificationsAPI = {
  // Get notification settings
  async getSettings() {
    const response = await fetch(`${API_BASE}/notifications/settings`)
    if (!response.ok) throw new Error('Failed to fetch notification settings')
    return response.json()
  },

  // Update notification settings
  async updateSettings(settings) {
    const response = await fetch(`${API_BASE}/notifications/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    if (!response.ok) throw new Error('Failed to save notification settings')
    return response.json()
  },

  // Test notification channel connection
  async testConnection(channel, config) {
    const response = await fetch(`${API_BASE}/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, config })
    })
    if (!response.ok) throw new Error('Connection test failed')
    return response.json()
  }
}

/**
 * Local SEO API
 */
export const localSEOAPI = {
  // Get local SEO scores for all clients
  async getScores() {
    const response = await fetch(`${API_BASE}/local-seo/scores`)
    if (!response.ok) throw new Error('Failed to fetch local SEO data')
    return response.json()
  },

  // Run local SEO audit for client
  async runAudit(clientId) {
    const response = await fetch(`${API_BASE}/local-seo/audit/${clientId}`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Audit failed')
    return response.json()
  },

  // Run auto-fix for client
  async autoFix(clientId) {
    const response = await fetch(`${API_BASE}/local-seo/fix/${clientId}`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Auto-fix failed')
    return response.json()
  },

  // Get local SEO report for client
  async getReport(clientId) {
    const response = await fetch(`${API_BASE}/local-seo/report/${clientId}`)
    if (!response.ok) throw new Error('Failed to fetch report')
    return response.json()
  }
}

/**
 * Domains API
 */
export const domainsAPI = {
  // Get all domains
  async getAll() {
    const response = await fetch(`${API_BASE}/domains`)
    if (!response.ok) throw new Error('Failed to fetch domains')
    return response.json()
  },

  // Add new domain
  async create(domainData) {
    const response = await fetch(`${API_BASE}/domains`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(domainData)
    })
    if (!response.ok) throw new Error('Failed to add domain')
    return response.json()
  },

  // Update domain
  async update(domainId, domainData) {
    const response = await fetch(`${API_BASE}/domains/${domainId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(domainData)
    })
    if (!response.ok) throw new Error('Failed to update domain')
    return response.json()
  },

  // Delete domain
  async delete(domainId) {
    const response = await fetch(`${API_BASE}/domains/${domainId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete domain')
    return response.json()
  },

  // Toggle domain active status
  async toggleActive(domainId, active) {
    const response = await fetch(`${API_BASE}/domains/${domainId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    })
    if (!response.ok) throw new Error('Failed to toggle domain status')
    return response.json()
  }
}

/**
 * Tracking Keywords API (Position Tracking)
 */
export const trackingKeywordsAPI = {
  // Get all tracking keywords
  async getAll(limit = 100, offset = 0) {
    const response = await fetch(`${API_BASE}/keywords?limit=${limit}&offset=${offset}`)
    if (!response.ok) throw new Error('Failed to fetch keywords')
    return response.json()
  },

  // Get keywords by domain
  async getByDomain(domainId, limit = 100) {
    const response = await fetch(`${API_BASE}/keywords?domain_id=${domainId}&limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch keywords')
    return response.json()
  },

  // Get single keyword
  async getById(keywordId) {
    const response = await fetch(`${API_BASE}/keywords/${keywordId}`)
    if (!response.ok) throw new Error('Failed to fetch keyword')
    return response.json()
  },

  // Add new keyword
  async add(keywordData) {
    const response = await fetch(`${API_BASE}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keywordData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add keyword')
    }
    return response.json()
  },

  // Bulk add keywords
  async bulkAdd(domainId, keywords, device = 'desktop', country = 'US') {
    const response = await fetch(`${API_BASE}/keywords/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_id: domainId, keywords, device, country })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add keywords')
    }
    return response.json()
  },

  // Update keyword
  async update(keywordId, updates) {
    const response = await fetch(`${API_BASE}/keywords/${keywordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update keyword')
    return response.json()
  },

  // Delete keyword
  async delete(keywordId) {
    const response = await fetch(`${API_BASE}/keywords/${keywordId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete keyword')
    return response.json()
  },

  // Refresh keyword position
  async refresh(keywordId) {
    const response = await fetch(`${API_BASE}/keywords/${keywordId}/refresh`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to refresh keyword')
    return response.json()
  },

  // Refresh all keywords for a domain
  async refreshAll(domainId) {
    const response = await fetch(`${API_BASE}/keywords/refresh-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_id: domainId })
    })
    if (!response.ok) throw new Error('Failed to refresh keywords')
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
  trackingKeywords: trackingKeywordsAPI,
  batch: batchAPI,
  docs: docsAPI,
  autoFix: autoFixAPI,
  recommendations: recommendationsAPI,
  goals: goalsAPI,
  email: emailAPI,
  webhooks: webhooksAPI,
  branding: brandingAPI,
  settings: settingsAPI,
  wordpress: wordpressAPI,
  scheduler: schedulerAPI,
  export: exportAPI,
  notifications: notificationsAPI,
  localSEO: localSEOAPI,
  domains: domainsAPI,
  healthCheck,
  handleAPIError
}
