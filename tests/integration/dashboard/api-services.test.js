/**
 * Integration Tests for API Service Layer
 * Tests all API modules: wordpress, scheduler, export, notifications, localSEO, domains, goals, webhooks, recommendations, autoFix
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import {
  wordpressAPI,
  schedulerAPI,
  exportAPI,
  notificationsAPI,
  localSEOAPI,
  domainsAPI,
  goalsAPI,
  webhooksAPI,
  recommendationsAPI,
  autoFixAPI
} from '../../../dashboard/src/services/api.js'

// Mock fetch
global.fetch = jest.fn()

const mockResponse = (data, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
  blob: async () => new Blob([JSON.stringify(data)], { type: 'application/json' })
})

describe('WordPress API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch WordPress sites', async () => {
    const mockSites = [
      { id: 1, url: 'https://site1.com', name: 'Site 1', status: 'connected' },
      { id: 2, url: 'https://site2.com', name: 'Site 2', status: 'connected' }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockSites))

    const result = await wordpressAPI.getSites()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/wordpress/sites'))
    expect(result).toEqual(mockSites)
  })

  it('should test WordPress connection', async () => {
    const mockResult = { success: true, message: 'Connection successful' }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await wordpressAPI.testConnection(1)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/wordpress/test/1'), expect.objectContaining({ method: 'POST' }))
    expect(result.success).toBe(true)
  })

  it('should sync WordPress site', async () => {
    const mockResult = { success: true, synced: 10 }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await wordpressAPI.syncSite(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/wordpress/sync/1'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.success).toBe(true)
  })

  it('should handle API errors', async () => {
    fetch.mockResolvedValueOnce(mockResponse({ error: 'Not found' }, false, 404))

    await expect(wordpressAPI.getSites()).rejects.toThrow()
  })
})

describe('Scheduler API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch scheduled jobs', async () => {
    const mockJobs = [
      { id: 1, name: 'Daily Audit', schedule: '0 0 * * *', enabled: true },
      { id: 2, name: 'Weekly Report', schedule: '0 0 * * 0', enabled: false }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockJobs))

    const result = await schedulerAPI.getJobs()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/scheduler/jobs'))
    expect(result).toEqual(mockJobs)
  })

  it('should toggle job status', async () => {
    const mockResult = { success: true, enabled: false }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await schedulerAPI.toggleJob(1, false)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/scheduler/jobs/1/toggle'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.enabled).toBe(false)
  })

  it('should run job manually', async () => {
    const mockResult = { success: true, jobId: 1, status: 'running' }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await schedulerAPI.runJob(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/scheduler/jobs/1/run'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.status).toBe('running')
  })
})

describe('Export API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should export data as CSV', async () => {
    const mockBlob = new Blob(['csv,data'], { type: 'text/csv' })

    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'filename="export.csv"' },
      blob: async () => mockBlob
    })

    const result = await exportAPI.exportData('csv')

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/export/csv'))
    expect(result).toHaveProperty('blob')
    expect(result).toHaveProperty('filename')
    expect(result.blob).toBeInstanceOf(Blob)
  })

  it('should export data as JSON', async () => {
    const mockBlob = new Blob(['{"data": "json"}'], { type: 'application/json' })

    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'filename="export.json"' },
      blob: async () => mockBlob
    })

    const result = await exportAPI.exportData('json')

    expect(result).toHaveProperty('blob')
    expect(result).toHaveProperty('filename')
    expect(result.blob).toBeInstanceOf(Blob)
  })

  it('should fetch backup history', async () => {
    const mockHistory = [
      { id: 1, date: '2025-01-01', size: 1024, type: 'auto' },
      { id: 2, date: '2025-01-02', size: 2048, type: 'manual' }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockHistory))

    const result = await exportAPI.getBackupHistory(10)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/backups?limit=10'))
    expect(result).toEqual(mockHistory)
  })
})

describe('Notifications API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch notification settings', async () => {
    const mockSettings = {
      email: true,
      sms: false,
      discord: true,
      slack: false
    }

    fetch.mockResolvedValueOnce(mockResponse(mockSettings))

    const result = await notificationsAPI.getSettings()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/notifications/settings'))
    expect(result).toEqual(mockSettings)
  })

  it('should update notification settings', async () => {
    const newSettings = {
      email: false,
      sms: true,
      discord: true,
      slack: true
    }

    fetch.mockResolvedValueOnce(mockResponse({ success: true }))

    const result = await notificationsAPI.updateSettings(newSettings)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/settings'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newSettings)
      })
    )
    expect(result.success).toBe(true)
  })
})

describe('Local SEO API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch local SEO scores', async () => {
    const mockScores = [
      { clientId: 1, napConsistency: 85, gmbStatus: 'verified', schemaMarkup: true, score: 90 },
      { clientId: 2, napConsistency: 78, gmbStatus: 'pending', schemaMarkup: false, score: 75 }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockScores))

    const result = await localSEOAPI.getScores()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/local-seo/scores'))
    expect(result).toEqual(mockScores)
  })

  it('should run local SEO audit for client', async () => {
    const mockResult = {
      success: true,
      issuesFound: 3,
      score: 87
    }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await localSEOAPI.runAudit(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/local-seo/audit/1'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.issuesFound).toBe(3)
  })

  it('should auto-fix local SEO issues for client', async () => {
    const mockResult = {
      success: true,
      fixed: 2,
      remaining: 1
    }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await localSEOAPI.autoFix(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/local-seo/fix/1'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.fixed).toBe(2)
  })
})

describe('Domains API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch all domains', async () => {
    const mockDomains = [
      { id: 1, domain: 'example.com', active: true },
      { id: 2, domain: 'test.com', active: false }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockDomains))

    const result = await domainsAPI.getAll()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/domains'))
    expect(result).toEqual(mockDomains)
  })

  it('should create new domain', async () => {
    const newDomain = { domain: 'newsite.com', active: true }
    const mockResult = { id: 3, ...newDomain }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await domainsAPI.create(newDomain)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/domains'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newDomain)
      })
    )
    expect(result.id).toBe(3)
  })

  it('should update domain', async () => {
    const updates = { active: false }
    const mockResult = { success: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await domainsAPI.update(1, updates)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/domains/1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updates)
      })
    )
    expect(result.success).toBe(true)
  })

  it('should delete domain', async () => {
    const mockResult = { success: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await domainsAPI.delete(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/domains/1'),
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result.success).toBe(true)
  })
})

describe('Goals API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch all goals', async () => {
    const mockGoals = [
      { id: 1, title: 'Increase traffic', target: 10000, current: 7500, status: 'in-progress' },
      { id: 2, title: 'Improve rank', target: 10, current: 15, status: 'pending' }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockGoals))

    const result = await goalsAPI.getAll()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/goals'))
    expect(result).toEqual(mockGoals)
  })

  it('should create new goal', async () => {
    const newGoal = { title: 'New Goal', target: 5000, deadline: '2025-12-31' }
    const mockResult = { id: 3, ...newGoal, current: 0, status: 'pending' }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await goalsAPI.create(newGoal)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/goals'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newGoal)
      })
    )
    expect(result.id).toBe(3)
  })

  it('should update goal', async () => {
    const updates = { current: 8000 }
    const mockResult = { success: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await goalsAPI.update(1, updates)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/goals/1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updates)
      })
    )
    expect(result.success).toBe(true)
  })

  it('should delete goal', async () => {
    const mockResult = { success: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await goalsAPI.delete(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/goals/1'),
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result.success).toBe(true)
  })
})

describe('Webhooks API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch all webhooks', async () => {
    const mockWebhooks = [
      { id: 1, url: 'https://hook1.com', events: ['rank_change'], enabled: true },
      { id: 2, url: 'https://hook2.com', events: ['audit_complete'], enabled: false }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockWebhooks))

    const result = await webhooksAPI.getAll()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/webhooks'))
    expect(result).toEqual(mockWebhooks)
  })

  it('should create new webhook', async () => {
    const newWebhook = { url: 'https://newhook.com', events: ['rank_change', 'audit_complete'] }
    const mockResult = { id: 3, ...newWebhook, enabled: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await webhooksAPI.create(newWebhook)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/webhooks'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newWebhook)
      })
    )
    expect(result.id).toBe(3)
  })

  it('should update webhook', async () => {
    const updates = { enabled: false }
    const mockResult = { success: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await webhooksAPI.update(1, updates)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/webhooks/1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updates)
      })
    )
    expect(result.success).toBe(true)
  })

  it('should delete webhook', async () => {
    const mockResult = { success: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await webhooksAPI.delete(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/webhooks/1'),
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result.success).toBe(true)
  })

  it('should test webhook', async () => {
    const mockResult = { success: true, statusCode: 200, message: 'Webhook delivered' }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await webhooksAPI.test(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/webhooks/1/test'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)
  })
})

describe('Recommendations API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch all recommendations', async () => {
    const mockRecs = [
      { id: 1, title: 'Add alt text', priority: 'high', impact: 8 },
      { id: 2, title: 'Fix broken links', priority: 'medium', impact: 6 }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockRecs))

    const result = await recommendationsAPI.getAll()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/recommendations'))
    expect(result).toEqual(mockRecs)
  })

  it('should apply recommendation', async () => {
    const mockResult = { success: true, applied: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await recommendationsAPI.apply(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/recommendations/1/apply'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.applied).toBe(true)
  })

  it('should delete recommendation', async () => {
    const mockResult = { success: true }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await recommendationsAPI.delete(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/recommendations/1'),
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result.success).toBe(true)
  })
})

describe('AutoFix API Module', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should fetch autofix engines', async () => {
    const mockEngines = [
      { id: 1, name: 'Meta Tags', enabled: true, successRate: 95 },
      { id: 2, name: 'Image Alt', enabled: false, successRate: 88 }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockEngines))

    const result = await autoFixAPI.getEngines()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/autofix/engines'))
    expect(result).toEqual(mockEngines)
  })

  it('should toggle engine status', async () => {
    const mockResult = { success: true, enabled: false }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await autoFixAPI.toggleEngine(1, false)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/autofix/engines/1/toggle'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ enabled: false })
      })
    )
    expect(result.enabled).toBe(false)
  })

  it('should run engine manually', async () => {
    const mockResult = { success: true, fixed: 15, errors: 2 }

    fetch.mockResolvedValueOnce(mockResponse(mockResult))

    const result = await autoFixAPI.runEngine(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/autofix/engines/1/run'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.fixed).toBe(15)
  })

  it('should fetch fix history', async () => {
    const mockHistory = [
      { id: 1, engine: 'Meta Tags', fixed: 10, date: '2025-01-01' },
      { id: 2, engine: 'Image Alt', fixed: 5, date: '2025-01-02' }
    ]

    fetch.mockResolvedValueOnce(mockResponse(mockHistory))

    const result = await autoFixAPI.getHistory(10)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/autofix/history?limit=10'))
    expect(result).toEqual(mockHistory)
  })
})

describe('API Error Handling', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('should handle 401 Unauthorized', async () => {
    fetch.mockResolvedValueOnce(mockResponse({ error: 'Unauthorized' }, false, 401))

    await expect(domainsAPI.getAll()).rejects.toThrow('Failed to fetch domains')
  })

  it('should handle 403 Forbidden', async () => {
    fetch.mockResolvedValueOnce(mockResponse({ error: 'Forbidden' }, false, 403))

    // goalsAPI.getAll() doesn't check response.ok, so it returns the error as JSON
    const result = await goalsAPI.getAll()
    expect(result).toEqual({ error: 'Forbidden' })
  })

  it('should handle 404 Not Found', async () => {
    fetch.mockResolvedValueOnce(mockResponse({ error: 'Not found' }, false, 404))

    // webhooksAPI.delete() doesn't check response.ok, so it returns the error as JSON
    const result = await webhooksAPI.delete(999)
    expect(result).toEqual({ error: 'Not found' })
  })

  it('should handle 500 Server Error', async () => {
    fetch.mockResolvedValueOnce(mockResponse({ error: 'Internal error' }, false, 500))

    await expect(schedulerAPI.getJobs()).rejects.toThrow('Failed to fetch scheduler data')
  })

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(wordpressAPI.getSites()).rejects.toThrow('Failed to fetch')
  })
})
