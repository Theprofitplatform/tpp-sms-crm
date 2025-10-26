/**
 * API v2 - Unified Keyword Management Endpoints
 *
 * Combines SerpBear position tracking with keyword research service
 * Provides comprehensive keyword management across the platform
 *
 * @module api/v2/keywords
 */

import express from 'express';
import axios from 'axios';
import { db, keywordOps } from '../../database/index.js';

const router = express.Router();

// Configuration
const KEYWORD_SERVICE_URL = process.env.KEYWORD_SERVICE_URL || 'http://localhost:5000';
const SERPBEAR_URL = process.env.SERPBEAR_URL || 'http://localhost:3000';

/**
 * Response wrapper for consistent API responses
 */
function apiResponse(success, data = null, error = null, meta = null) {
  const response = { success };

  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  if (meta !== null) response.meta = meta;

  return response;
}

/**
 * Error handler middleware
 */
function handleError(res, error, defaultMessage = 'Internal server error') {
  console.error('API Error:', error);

  const statusCode = error.response?.status || error.statusCode || 500;
  const message = error.response?.data?.message || error.message || defaultMessage;

  res.status(statusCode).json(apiResponse(false, null, message));
}

/**
 * Validation middleware
 */
function validateKeywordId(req, res, next) {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json(apiResponse(false, null, 'Invalid keyword ID'));
  }

  next();
}

/**
 * GET /api/v2/keywords
 *
 * List all keywords with filtering and pagination
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 50, max: 100)
 * - client_id: Filter by client
 * - source: Filter by source (research|tracking|both)
 * - intent: Filter by intent type
 * - min_volume: Minimum search volume
 * - max_difficulty: Maximum difficulty score
 * - sort: Sort field (volume|difficulty|position|created_at)
 * - order: Sort order (asc|desc)
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: 1,
 *       keyword: "seo tools",
 *       source: "research",
 *       volume: 12000,
 *       difficulty: 65,
 *       intent: "informational",
 *       tracked: true,
 *       position: 15,
 *       client_id: "client123"
 *     }
 *   ],
 *   meta: {
 *     page: 1,
 *     per_page: 50,
 *     total: 150,
 *     total_pages: 3
 *   }
 * }
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      per_page = 50,
      client_id,
      source = 'both',
      intent,
      min_volume,
      max_difficulty,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const perPage = Math.min(100, Math.max(1, parseInt(per_page)));
    const offset = (pageNum - 1) * perPage;

    // Build query based on source
    let keywords = [];

    if (source === 'tracking' || source === 'both') {
      // Get keywords from tracking database
      const trackingStmt = db.prepare(`
        SELECT
          k.*,
          'tracking' as source,
          c.name as client_name,
          c.domain as client_domain
        FROM keyword_performance k
        JOIN clients c ON k.client_id = c.id
        WHERE 1=1
        ${client_id ? 'AND k.client_id = ?' : ''}
        ORDER BY k.${sort === 'volume' ? 'impressions' : sort === 'position' ? 'position' : 'created_at'} ${order}
        LIMIT ? OFFSET ?
      `);

      const params = [];
      if (client_id) params.push(client_id);
      params.push(perPage, offset);

      const trackingKeywords = trackingStmt.all(...params);
      keywords = keywords.concat(trackingKeywords);
    }

    if (source === 'research' || source === 'both') {
      // Get keywords from research service
      try {
        const researchParams = new URLSearchParams({
          page: pageNum,
          per_page: perPage
        });

        if (intent) researchParams.append('intent', intent);
        if (min_volume) researchParams.append('min_volume', min_volume);
        if (max_difficulty) researchParams.append('max_difficulty', max_difficulty);

        const response = await axios.get(
          `${KEYWORD_SERVICE_URL}/api/keyword/keywords?${researchParams}`,
          { timeout: 5000 }
        );

        if (response.data?.data) {
          const researchKeywords = response.data.data.map(k => ({
            ...k,
            source: 'research',
            tracked: false // Check if it's being tracked
          }));
          keywords = keywords.concat(researchKeywords);
        }
      } catch (error) {
        console.warn('Failed to fetch research keywords:', error.message);
        // Continue with tracking keywords only
      }
    }

    // Apply filters
    if (intent) {
      keywords = keywords.filter(k => k.intent === intent);
    }
    if (min_volume) {
      keywords = keywords.filter(k => (k.volume || k.impressions || 0) >= parseInt(min_volume));
    }
    if (max_difficulty) {
      keywords = keywords.filter(k => (k.difficulty || 0) <= parseInt(max_difficulty));
    }

    // Sort if needed
    keywords.sort((a, b) => {
      const aVal = a[sort] || 0;
      const bVal = b[sort] || 0;
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Pagination
    const total = keywords.length;
    const paginatedKeywords = keywords.slice(offset, offset + perPage);

    res.json(apiResponse(true, paginatedKeywords, null, {
      page: pageNum,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage)
    }));

  } catch (error) {
    handleError(res, error, 'Failed to fetch keywords');
  }
});

/**
 * POST /api/v2/keywords
 *
 * Add a new keyword to the system
 *
 * Request body:
 * {
 *   keyword: "seo tools",
 *   client_id: "client123",
 *   source: "manual",
 *   track: false
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: 123,
 *     keyword: "seo tools",
 *     client_id: "client123",
 *     created_at: "2025-10-26T12:00:00Z"
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { keyword, client_id, source = 'manual', track = false } = req.body;

    // Validation
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return res.status(400).json(apiResponse(false, null, 'Keyword is required'));
    }

    if (!client_id) {
      return res.status(400).json(apiResponse(false, null, 'Client ID is required'));
    }

    // Check if client exists
    const clientStmt = db.prepare('SELECT id FROM clients WHERE id = ?');
    const client = clientStmt.get(client_id);

    if (!client) {
      return res.status(404).json(apiResponse(false, null, 'Client not found'));
    }

    // Add keyword to tracking database
    const insertStmt = db.prepare(`
      INSERT INTO keyword_performance (client_id, keyword, date)
      VALUES (?, ?, date('now'))
    `);

    const result = insertStmt.run(client_id, keyword.trim());

    // If track flag is set, also add to tracking service
    if (track) {
      try {
        await axios.post(`${SERPBEAR_URL}/api/keywords`, {
          keyword: keyword.trim(),
          domain: client.domain
        });
      } catch (error) {
        console.warn('Failed to add keyword to tracking service:', error.message);
      }
    }

    res.status(201).json(apiResponse(true, {
      id: result.lastInsertRowid,
      keyword: keyword.trim(),
      client_id,
      source,
      tracked: track,
      created_at: new Date().toISOString()
    }));

  } catch (error) {
    handleError(res, error, 'Failed to add keyword');
  }
});

/**
 * GET /api/v2/keywords/:id
 *
 * Get detailed keyword information
 *
 * Response includes:
 * - Basic keyword data
 * - Performance history
 * - Research data (if available)
 * - Tracking status
 */
router.get('/:id', validateKeywordId, async (req, res) => {
  try {
    const { id } = req.params;

    // Get keyword from database
    const stmt = db.prepare(`
      SELECT
        k.*,
        c.name as client_name,
        c.domain as client_domain
      FROM keyword_performance k
      JOIN clients c ON k.client_id = c.id
      WHERE k.id = ?
    `);

    const keyword = stmt.get(id);

    if (!keyword) {
      return res.status(404).json(apiResponse(false, null, 'Keyword not found'));
    }

    // Get performance history
    const historyStmt = db.prepare(`
      SELECT date, position, impressions, clicks, ctr
      FROM keyword_performance
      WHERE client_id = ? AND keyword = ?
      ORDER BY date DESC
      LIMIT 90
    `);

    const history = historyStmt.all(keyword.client_id, keyword.keyword);

    // Try to get research data
    let researchData = null;
    try {
      const response = await axios.get(
        `${KEYWORD_SERVICE_URL}/api/keyword/keywords/search?q=${encodeURIComponent(keyword.keyword)}`,
        { timeout: 3000 }
      );
      researchData = response.data?.data?.[0] || null;
    } catch (error) {
      console.warn('Failed to fetch research data:', error.message);
    }

    res.json(apiResponse(true, {
      ...keyword,
      history,
      research: researchData,
      tracked: true
    }));

  } catch (error) {
    handleError(res, error, 'Failed to fetch keyword details');
  }
});

/**
 * PUT /api/v2/keywords/:id
 *
 * Update keyword information
 *
 * Request body:
 * {
 *   position: 15,
 *   volume: 12000,
 *   difficulty: 65
 * }
 */
router.put('/:id', validateKeywordId, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if keyword exists
    const checkStmt = db.prepare('SELECT * FROM keyword_performance WHERE id = ?');
    const keyword = checkStmt.get(id);

    if (!keyword) {
      return res.status(404).json(apiResponse(false, null, 'Keyword not found'));
    }

    // Build update query dynamically
    const allowedFields = ['position', 'impressions', 'clicks', 'ctr'];
    const setFields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        setFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (setFields.length === 0) {
      return res.status(400).json(apiResponse(false, null, 'No valid fields to update'));
    }

    values.push(id);

    const updateStmt = db.prepare(`
      UPDATE keyword_performance
      SET ${setFields.join(', ')}
      WHERE id = ?
    `);

    updateStmt.run(...values);

    // Get updated keyword
    const updatedKeyword = checkStmt.get(id);

    res.json(apiResponse(true, updatedKeyword));

  } catch (error) {
    handleError(res, error, 'Failed to update keyword');
  }
});

/**
 * DELETE /api/v2/keywords/:id
 *
 * Delete a keyword
 */
router.delete('/:id', validateKeywordId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if keyword exists
    const checkStmt = db.prepare('SELECT * FROM keyword_performance WHERE id = ?');
    const keyword = checkStmt.get(id);

    if (!keyword) {
      return res.status(404).json(apiResponse(false, null, 'Keyword not found'));
    }

    // Delete from database
    const deleteStmt = db.prepare('DELETE FROM keyword_performance WHERE id = ?');
    deleteStmt.run(id);

    res.json(apiResponse(true, { message: 'Keyword deleted successfully' }));

  } catch (error) {
    handleError(res, error, 'Failed to delete keyword');
  }
});

/**
 * POST /api/v2/keywords/:id/track
 *
 * Add keyword to position tracking
 *
 * Request body:
 * {
 *   domain: "example.com",
 *   location: "United States",
 *   device: "desktop"
 * }
 */
router.post('/:id/track', validateKeywordId, async (req, res) => {
  try {
    const { id } = req.params;
    const { domain, location = 'United States', device = 'desktop' } = req.body;

    // Get keyword
    const stmt = db.prepare('SELECT * FROM keyword_performance WHERE id = ?');
    const keyword = stmt.get(id);

    if (!keyword) {
      return res.status(404).json(apiResponse(false, null, 'Keyword not found'));
    }

    if (!domain) {
      return res.status(400).json(apiResponse(false, null, 'Domain is required'));
    }

    // Add to tracking service
    try {
      const response = await axios.post(`${SERPBEAR_URL}/api/keywords`, {
        keyword: keyword.keyword,
        domain,
        location,
        device
      });

      res.json(apiResponse(true, {
        message: 'Keyword added to tracking',
        keyword: keyword.keyword,
        domain,
        tracking_id: response.data?.id
      }));

    } catch (error) {
      if (error.response?.status === 409) {
        return res.status(409).json(apiResponse(false, null, 'Keyword already being tracked'));
      }
      throw error;
    }

  } catch (error) {
    handleError(res, error, 'Failed to add keyword to tracking');
  }
});

/**
 * POST /api/v2/keywords/:id/enrich
 *
 * Enrich keyword with research data
 *
 * Fetches additional data from keyword research service:
 * - Search volume
 * - Difficulty score
 * - SERP features
 * - Related keywords
 * - Intent classification
 */
router.post('/:id/enrich', validateKeywordId, async (req, res) => {
  try {
    const { id } = req.params;

    // Get keyword
    const stmt = db.prepare('SELECT * FROM keyword_performance WHERE id = ?');
    const keyword = stmt.get(id);

    if (!keyword) {
      return res.status(404).json(apiResponse(false, null, 'Keyword not found'));
    }

    // Fetch research data
    try {
      const response = await axios.post(`${KEYWORD_SERVICE_URL}/api/keyword/enrich`, {
        keyword: keyword.keyword,
        location: 'US',
        language: 'en'
      });

      const enrichedData = response.data?.data || {};

      res.json(apiResponse(true, {
        keyword: keyword.keyword,
        ...enrichedData,
        enriched_at: new Date().toISOString()
      }));

    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json(apiResponse(false, null, 'No research data available for this keyword'));
      }
      throw error;
    }

  } catch (error) {
    handleError(res, error, 'Failed to enrich keyword');
  }
});

/**
 * GET /api/v2/keywords/stats
 *
 * Get keyword statistics
 *
 * Query parameters:
 * - client_id: Filter by client
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     total_keywords: 150,
 *     tracked_keywords: 100,
 *     research_keywords: 50,
 *     avg_position: 25.5,
 *     avg_volume: 5000,
 *     by_intent: {
 *       informational: 80,
 *       commercial: 50,
 *       transactional: 20
 *     }
 *   }
 * }
 */
router.get('/stats', async (req, res) => {
  try {
    const { client_id } = req.query;

    // Get stats from tracking database
    const statsStmt = db.prepare(`
      SELECT
        COUNT(DISTINCT keyword) as total_keywords,
        AVG(position) as avg_position,
        AVG(impressions) as avg_volume
      FROM keyword_performance
      ${client_id ? 'WHERE client_id = ?' : ''}
    `);

    const stats = client_id ? statsStmt.get(client_id) : statsStmt.get();

    // Get research stats
    let researchStats = { research_keywords: 0, by_intent: {} };
    try {
      const response = await axios.get(`${KEYWORD_SERVICE_URL}/api/keyword/stats`);
      researchStats = response.data?.data || researchStats;
    } catch (error) {
      console.warn('Failed to fetch research stats:', error.message);
    }

    res.json(apiResponse(true, {
      total_keywords: stats.total_keywords || 0,
      tracked_keywords: stats.total_keywords || 0,
      research_keywords: researchStats.research_keywords || 0,
      avg_position: Math.round((stats.avg_position || 0) * 10) / 10,
      avg_volume: Math.round(stats.avg_volume || 0),
      by_intent: researchStats.by_intent || {}
    }));

  } catch (error) {
    handleError(res, error, 'Failed to fetch keyword statistics');
  }
});

export default router;
