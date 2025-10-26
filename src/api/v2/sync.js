/**
 * API v2 - Sync Management Endpoints
 *
 * Manages synchronization between:
 * - Keyword research data and tracking system
 * - Local database and external services (SerpBear, GSC)
 * - Performance metrics and analytics
 *
 * @module api/v2/sync
 */

import express from 'express';
import axios from 'axios';
import { db, keywordOps } from '../../database/index.js';

const router = express.Router();

// Configuration
const KEYWORD_SERVICE_URL = process.env.KEYWORD_SERVICE_URL || 'http://localhost:5000';
const SERPBEAR_URL = process.env.SERPBEAR_URL || 'http://localhost:3000';

/**
 * Response wrapper
 */
function apiResponse(success, data = null, error = null, meta = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  if (meta !== null) response.meta = meta;
  return response;
}

/**
 * Error handler
 */
function handleError(res, error, defaultMessage = 'Internal server error') {
  console.error('Sync API Error:', error);
  const statusCode = error.response?.status || error.statusCode || 500;
  const message = error.response?.data?.message || error.message || defaultMessage;
  res.status(statusCode).json(apiResponse(false, null, message));
}

/**
 * Check service health
 */
async function checkServiceHealth(url, serviceName) {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 3000 });
    return {
      name: serviceName,
      url,
      status: 'healthy',
      uptime: response.data?.uptime || null,
      version: response.data?.version || null
    };
  } catch (error) {
    return {
      name: serviceName,
      url,
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * GET /api/v2/sync/status
 *
 * Get synchronization status across all services
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     last_sync: "2025-10-26T12:00:00Z",
 *     services: {
 *       keyword_research: { status: "healthy", last_sync: "..." },
 *       serpbear: { status: "healthy", last_sync: "..." },
 *       database: { status: "healthy", last_write: "..." }
 *     },
 *     sync_stats: {
 *       keywords_tracked: 150,
 *       keywords_researched: 500,
 *       pending_syncs: 5
 *     },
 *     issues: []
 *   }
 * }
 */
router.get('/status', async (req, res) => {
  try {
    // Check service health
    const [keywordServiceHealth, serpbearHealth] = await Promise.all([
      checkServiceHealth(KEYWORD_SERVICE_URL, 'Keyword Research Service'),
      checkServiceHealth(SERPBEAR_URL, 'SerpBear Tracking')
    ]);

    // Get database stats
    const dbStats = {
      name: 'Local Database',
      status: 'healthy'
    };

    try {
      const keywordCountStmt = db.prepare('SELECT COUNT(DISTINCT keyword) as count FROM keyword_performance');
      const keywordCount = keywordCountStmt.get();
      dbStats.keywords_tracked = keywordCount.count;

      const lastUpdateStmt = db.prepare('SELECT MAX(created_at) as last_update FROM keyword_performance');
      const lastUpdate = lastUpdateStmt.get();
      dbStats.last_write = lastUpdate.last_update;
    } catch (error) {
      dbStats.status = 'unhealthy';
      dbStats.error = error.message;
    }

    // Get sync stats
    let researchKeywordCount = 0;
    try {
      const response = await axios.get(`${KEYWORD_SERVICE_URL}/api/keyword/stats`, { timeout: 3000 });
      researchKeywordCount = response.data?.data?.total_keywords || 0;
    } catch (error) {
      console.warn('Failed to fetch research keyword count:', error.message);
    }

    // Check for issues
    const issues = [];

    if (keywordServiceHealth.status === 'unhealthy') {
      issues.push({
        severity: 'high',
        service: 'keyword_research',
        message: 'Keyword research service is unavailable',
        recommendation: 'Check if the Python service is running on port 5000'
      });
    }

    if (serpbearHealth.status === 'unhealthy') {
      issues.push({
        severity: 'medium',
        service: 'serpbear',
        message: 'SerpBear tracking service is unavailable',
        recommendation: 'Position tracking will not update until service is restored'
      });
    }

    if (dbStats.status === 'unhealthy') {
      issues.push({
        severity: 'critical',
        service: 'database',
        message: 'Database connection issues detected',
        recommendation: 'Check database file permissions and disk space'
      });
    }

    // Get last sync operations from logs
    const lastSyncStmt = db.prepare(`
      SELECT created_at, message, metadata
      FROM system_logs
      WHERE category = 'sync'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const lastSync = lastSyncStmt.get();

    res.json(apiResponse(true, {
      last_sync: lastSync?.created_at || null,
      services: {
        keyword_research: keywordServiceHealth,
        serpbear: serpbearHealth,
        database: dbStats
      },
      sync_stats: {
        keywords_tracked: dbStats.keywords_tracked || 0,
        keywords_researched: researchKeywordCount,
        services_healthy: [keywordServiceHealth, serpbearHealth, dbStats].filter(s => s.status === 'healthy').length,
        total_services: 3
      },
      issues,
      overall_status: issues.length === 0 ? 'healthy' : issues.some(i => i.severity === 'critical') ? 'critical' : 'degraded'
    }));

  } catch (error) {
    handleError(res, error, 'Failed to fetch sync status');
  }
});

/**
 * POST /api/v2/sync/trigger
 *
 * Manually trigger synchronization
 *
 * Request body:
 * {
 *   type: "keywords"|"positions"|"full",
 *   client_id: "client123" (optional),
 *   force: false
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     sync_id: "sync_1234567890",
 *     type: "keywords",
 *     started_at: "2025-10-26T12:00:00Z",
 *     status: "running",
 *     progress: {
 *       total: 100,
 *       processed: 0,
 *       failed: 0
 *     }
 *   }
 * }
 */
router.post('/trigger', async (req, res) => {
  try {
    const {
      type = 'keywords',
      client_id = null,
      force = false
    } = req.body;

    // Validate sync type
    const validTypes = ['keywords', 'positions', 'full'];
    if (!validTypes.includes(type)) {
      return res.status(400).json(apiResponse(
        false,
        null,
        `Invalid sync type. Must be one of: ${validTypes.join(', ')}`
      ));
    }

    // Check if client exists (if provided)
    if (client_id) {
      const clientStmt = db.prepare('SELECT id FROM clients WHERE id = ?');
      const client = clientStmt.get(client_id);

      if (!client) {
        return res.status(404).json(apiResponse(false, null, 'Client not found'));
      }
    }

    // Check if sync is already running (unless force is true)
    if (!force) {
      const runningSyncStmt = db.prepare(`
        SELECT id FROM system_logs
        WHERE category = 'sync'
          AND message LIKE '%running%'
          AND created_at > datetime('now', '-5 minutes')
        LIMIT 1
      `);
      const runningSync = runningSyncStmt.get();

      if (runningSync) {
        return res.status(409).json(apiResponse(
          false,
          null,
          'A sync operation is already running. Use force=true to override.'
        ));
      }
    }

    // Generate sync ID
    const syncId = `sync_${Date.now()}_${type}`;

    // Log sync start
    const logStmt = db.prepare(`
      INSERT INTO system_logs (level, category, message, metadata)
      VALUES (?, ?, ?, ?)
    `);

    logStmt.run(
      'info',
      'sync',
      `Sync ${type} started`,
      JSON.stringify({
        sync_id: syncId,
        type,
        client_id,
        force,
        started_at: new Date().toISOString()
      })
    );

    // Perform sync based on type
    let result = {
      sync_id: syncId,
      type,
      started_at: new Date().toISOString(),
      status: 'running',
      progress: {
        total: 0,
        processed: 0,
        failed: 0
      }
    };

    if (type === 'keywords' || type === 'full') {
      // Sync keywords from research to tracking
      try {
        const params = new URLSearchParams({ per_page: 1000 });
        const response = await axios.get(
          `${KEYWORD_SERVICE_URL}/api/keyword/keywords?${params}`,
          { timeout: 10000 }
        );

        const researchKeywords = response.data?.data || [];
        result.progress.total = researchKeywords.length;

        // Process each keyword
        for (const keyword of researchKeywords) {
          try {
            // Check if already in tracking
            const existingStmt = db.prepare(`
              SELECT id FROM keyword_performance
              WHERE keyword = ?
            `);
            const existing = existingStmt.get(keyword.keyword);

            if (!existing && keyword.metadata?.client_id) {
              // Add to tracking
              const insertStmt = db.prepare(`
                INSERT INTO keyword_performance (client_id, keyword, date)
                VALUES (?, ?, date('now'))
              `);
              insertStmt.run(keyword.metadata.client_id, keyword.keyword);
              result.progress.processed++;
            } else {
              result.progress.processed++;
            }
          } catch (error) {
            console.error(`Failed to sync keyword ${keyword.keyword}:`, error.message);
            result.progress.failed++;
          }
        }

        result.status = 'completed';

      } catch (error) {
        console.error('Keyword sync failed:', error.message);
        result.status = 'failed';
        result.error = error.message;
      }
    }

    if (type === 'positions' || type === 'full') {
      // Sync position data from SerpBear
      try {
        // This would fetch position data from SerpBear
        // Implementation depends on SerpBear's API
        const response = await axios.get(
          `${SERPBEAR_URL}/api/keywords`,
          { timeout: 10000 }
        );

        // Update positions in database
        // ... implementation here

      } catch (error) {
        console.error('Position sync failed:', error.message);
        if (result.status !== 'failed') {
          result.status = 'partial';
        }
      }
    }

    // Log sync completion
    logStmt.run(
      result.status === 'completed' ? 'info' : 'warning',
      'sync',
      `Sync ${type} ${result.status}`,
      JSON.stringify({
        sync_id: syncId,
        ...result,
        completed_at: new Date().toISOString()
      })
    );

    res.json(apiResponse(true, result));

  } catch (error) {
    handleError(res, error, 'Failed to trigger sync');
  }
});

/**
 * GET /api/v2/sync/history
 *
 * Get synchronization history
 *
 * Query parameters:
 * - limit: Number of records (default: 50, max: 200)
 * - type: Filter by sync type
 */
router.get('/history', async (req, res) => {
  try {
    const {
      limit = 50,
      type = null
    } = req.query;

    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));

    // Get sync history from logs
    let query = `
      SELECT id, level, message, metadata, created_at
      FROM system_logs
      WHERE category = 'sync'
    `;

    const params = [];

    if (type) {
      query += ` AND metadata LIKE ?`;
      params.push(`%"type":"${type}"%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limitNum);

    const stmt = db.prepare(query);
    const history = stmt.all(...params);

    // Parse metadata
    const parsedHistory = history.map(record => {
      try {
        const metadata = JSON.parse(record.metadata || '{}');
        return {
          id: record.id,
          level: record.level,
          message: record.message,
          created_at: record.created_at,
          ...metadata
        };
      } catch (error) {
        return record;
      }
    });

    res.json(apiResponse(true, parsedHistory, null, {
      count: parsedHistory.length,
      limit: limitNum
    }));

  } catch (error) {
    handleError(res, error, 'Failed to fetch sync history');
  }
});

/**
 * POST /api/v2/sync/keywords/bulk
 *
 * Bulk sync keywords from research to tracking
 *
 * Request body:
 * {
 *   keyword_ids: [1, 2, 3, 4, 5],
 *   client_id: "client123",
 *   domain: "example.com"
 * }
 */
router.post('/keywords/bulk', async (req, res) => {
  try {
    const { keyword_ids, client_id, domain } = req.body;

    // Validation
    if (!Array.isArray(keyword_ids) || keyword_ids.length === 0) {
      return res.status(400).json(apiResponse(false, null, 'keyword_ids array is required'));
    }

    if (keyword_ids.length > 100) {
      return res.status(400).json(apiResponse(false, null, 'Maximum 100 keywords per bulk operation'));
    }

    if (!client_id) {
      return res.status(400).json(apiResponse(false, null, 'client_id is required'));
    }

    // Check if client exists
    const clientStmt = db.prepare('SELECT id, domain FROM clients WHERE id = ?');
    const client = clientStmt.get(client_id);

    if (!client) {
      return res.status(404).json(apiResponse(false, null, 'Client not found'));
    }

    const targetDomain = domain || client.domain;

    // Fetch keywords from research service
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const keywordId of keyword_ids) {
      try {
        // Fetch keyword data
        const response = await axios.get(
          `${KEYWORD_SERVICE_URL}/api/keyword/keywords/${keywordId}`,
          { timeout: 3000 }
        );

        const keyword = response.data?.data;

        if (!keyword) {
          results.push({
            keyword_id: keywordId,
            success: false,
            error: 'Keyword not found'
          });
          failedCount++;
          continue;
        }

        // Check if already tracked
        const existingStmt = db.prepare(`
          SELECT id FROM keyword_performance
          WHERE client_id = ? AND keyword = ?
        `);
        const existing = existingStmt.get(client_id, keyword.keyword);

        if (existing) {
          results.push({
            keyword_id: keywordId,
            keyword: keyword.keyword,
            success: false,
            error: 'Already tracked'
          });
          failedCount++;
          continue;
        }

        // Add to tracking
        const insertStmt = db.prepare(`
          INSERT INTO keyword_performance (client_id, keyword, date)
          VALUES (?, ?, date('now'))
        `);
        insertStmt.run(client_id, keyword.keyword);

        // Try to add to SerpBear
        try {
          await axios.post(`${SERPBEAR_URL}/api/keywords`, {
            keyword: keyword.keyword,
            domain: targetDomain
          }, { timeout: 5000 });
        } catch (error) {
          console.warn(`Failed to add ${keyword.keyword} to SerpBear:`, error.message);
        }

        results.push({
          keyword_id: keywordId,
          keyword: keyword.keyword,
          success: true
        });
        successCount++;

      } catch (error) {
        results.push({
          keyword_id: keywordId,
          success: false,
          error: error.message
        });
        failedCount++;
      }
    }

    res.json(apiResponse(true, {
      total: keyword_ids.length,
      success_count: successCount,
      failed_count: failedCount,
      results
    }));

  } catch (error) {
    handleError(res, error, 'Failed to perform bulk sync');
  }
});

export default router;
