/**
 * API v2 - Keyword Research Workflow Endpoints
 *
 * Manages keyword research projects and workflows
 * Integrates with Python keyword research microservice
 *
 * @module api/v2/research
 */

import express from 'express';
import axios from 'axios';
import { db } from '../../database/index.js';

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
  console.error('API Error:', error);
  const statusCode = error.response?.status || error.statusCode || 500;
  const message = error.response?.data?.message || error.message || defaultMessage;
  res.status(statusCode).json(apiResponse(false, null, message));
}

/**
 * POST /api/v2/research/projects
 *
 * Create a new keyword research project
 *
 * Request body:
 * {
 *   name: "Q4 Content Strategy",
 *   client_id: "client123",
 *   seeds: "seo tools, keyword research, content planning",
 *   geo: "US",
 *   language: "en",
 *   focus: "informational"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     project_id: 5,
 *     name: "Q4 Content Strategy",
 *     client_id: "client123",
 *     status: "processing",
 *     created_at: "2025-10-26T12:00:00Z",
 *     estimated_completion: "2025-10-26T12:05:00Z"
 *   }
 * }
 */
router.post('/projects', async (req, res) => {
  try {
    const {
      name,
      client_id,
      seeds,
      geo = 'US',
      language = 'en',
      focus = 'informational'
    } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json(apiResponse(false, null, 'Project name is required'));
    }

    if (!client_id) {
      return res.status(400).json(apiResponse(false, null, 'Client ID is required'));
    }

    if (!seeds || typeof seeds !== 'string' || seeds.trim().length === 0) {
      return res.status(400).json(apiResponse(false, null, 'Seed keywords are required'));
    }

    // Validate seed keywords (at least 1, max 10)
    const seedArray = seeds.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (seedArray.length === 0) {
      return res.status(400).json(apiResponse(false, null, 'At least one seed keyword is required'));
    }
    if (seedArray.length > 10) {
      return res.status(400).json(apiResponse(false, null, 'Maximum 10 seed keywords allowed'));
    }

    // Check if client exists
    const clientStmt = db.prepare('SELECT id, name, domain FROM clients WHERE id = ?');
    const client = clientStmt.get(client_id);

    if (!client) {
      return res.status(404).json(apiResponse(false, null, 'Client not found'));
    }

    // Create research project in keyword service
    try {
      const response = await axios.post(`${KEYWORD_SERVICE_URL}/api/keyword/research`, {
        name: name.trim(),
        seeds: seeds.trim(),
        geo,
        language,
        focus,
        metadata: {
          client_id,
          client_name: client.name,
          client_domain: client.domain
        }
      }, {
        timeout: 10000
      });

      const projectData = response.data?.data || {};

      // Log project creation
      const logStmt = db.prepare(`
        INSERT INTO system_logs (level, category, message, metadata)
        VALUES (?, ?, ?, ?)
      `);

      logStmt.run(
        'info',
        'research',
        `Created keyword research project: ${name}`,
        JSON.stringify({
          project_id: projectData.id,
          client_id,
          seeds: seedArray
        })
      );

      res.status(201).json(apiResponse(true, {
        project_id: projectData.id,
        name: name.trim(),
        client_id,
        client_name: client.name,
        status: 'processing',
        seeds: seedArray,
        geo,
        language,
        focus,
        created_at: new Date().toISOString(),
        estimated_completion: new Date(Date.now() + 5 * 60000).toISOString() // ~5 minutes
      }));

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json(apiResponse(
          false,
          null,
          'Keyword research service is unavailable. Please ensure the service is running.'
        ));
      }
      throw error;
    }

  } catch (error) {
    handleError(res, error, 'Failed to create research project');
  }
});

/**
 * GET /api/v2/research/projects
 *
 * List all research projects
 *
 * Query parameters:
 * - client_id: Filter by client
 * - status: Filter by status (pending|processing|completed|failed)
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 20)
 */
router.get('/projects', async (req, res) => {
  try {
    const {
      client_id,
      status,
      page = 1,
      per_page = 20
    } = req.query;

    // Build query params
    const params = new URLSearchParams({
      page,
      per_page
    });

    if (status) params.append('status', status);

    // Fetch from keyword service
    const response = await axios.get(
      `${KEYWORD_SERVICE_URL}/api/keyword/projects?${params}`,
      { timeout: 5000 }
    );

    let projects = response.data?.data || [];

    // Filter by client_id if provided
    if (client_id) {
      projects = projects.filter(p =>
        p.metadata?.client_id === client_id
      );
    }

    // Enrich with client data
    const enrichedProjects = projects.map(project => {
      if (project.metadata?.client_id) {
        const clientStmt = db.prepare('SELECT name, domain FROM clients WHERE id = ?');
        const client = clientStmt.get(project.metadata.client_id);

        if (client) {
          project.client_name = client.name;
          project.client_domain = client.domain;
        }
      }
      return project;
    });

    res.json(apiResponse(true, enrichedProjects, null, {
      page: parseInt(page),
      per_page: parseInt(per_page),
      total: enrichedProjects.length
    }));

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json(apiResponse(
        false,
        null,
        'Keyword research service is unavailable'
      ));
    }
    handleError(res, error, 'Failed to fetch research projects');
  }
});

/**
 * GET /api/v2/research/projects/:id
 *
 * Get detailed information about a research project
 *
 * Response includes:
 * - Project metadata
 * - Keyword count
 * - Topic clusters
 * - Progress status
 * - Top opportunities
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json(apiResponse(false, null, 'Invalid project ID'));
    }

    // Fetch project from keyword service
    const response = await axios.get(
      `${KEYWORD_SERVICE_URL}/api/keyword/projects/${id}`,
      { timeout: 5000 }
    );

    const project = response.data?.data || null;

    if (!project) {
      return res.status(404).json(apiResponse(false, null, 'Project not found'));
    }

    // Enrich with client data
    if (project.metadata?.client_id) {
      const clientStmt = db.prepare('SELECT name, domain FROM clients WHERE id = ?');
      const client = clientStmt.get(project.metadata.client_id);

      if (client) {
        project.client_name = client.name;
        project.client_domain = client.domain;
      }
    }

    // Get keyword count and stats
    try {
      const keywordsResponse = await axios.get(
        `${KEYWORD_SERVICE_URL}/api/keyword/projects/${id}/keywords?per_page=1`,
        { timeout: 3000 }
      );

      project.keyword_count = keywordsResponse.data?.meta?.total || 0;
    } catch (error) {
      project.keyword_count = 0;
    }

    // Get topics
    try {
      const topicsResponse = await axios.get(
        `${KEYWORD_SERVICE_URL}/api/keyword/projects/${id}/topics`,
        { timeout: 3000 }
      );

      project.topics = topicsResponse.data?.data || [];
      project.topic_count = project.topics.length;
    } catch (error) {
      project.topics = [];
      project.topic_count = 0;
    }

    res.json(apiResponse(true, project));

  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json(apiResponse(false, null, 'Project not found'));
    }
    handleError(res, error, 'Failed to fetch project details');
  }
});

/**
 * GET /api/v2/research/projects/:id/keywords
 *
 * Get keywords for a research project
 *
 * Query parameters:
 * - page: Page number
 * - per_page: Items per page (max 100)
 * - intent: Filter by intent
 * - min_volume: Minimum search volume
 * - max_difficulty: Maximum difficulty
 * - sort: Sort field (volume|difficulty|opportunity)
 */
router.get('/projects/:id/keywords', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      per_page = 50,
      intent,
      min_volume,
      max_difficulty,
      sort = 'opportunity'
    } = req.query;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json(apiResponse(false, null, 'Invalid project ID'));
    }

    // Build query params
    const params = new URLSearchParams({
      page,
      per_page: Math.min(100, parseInt(per_page))
    });

    if (intent) params.append('intent', intent);
    if (min_volume) params.append('min_volume', min_volume);
    if (max_difficulty) params.append('max_difficulty', max_difficulty);
    if (sort) params.append('sort', sort);

    // Fetch keywords
    const response = await axios.get(
      `${KEYWORD_SERVICE_URL}/api/keyword/projects/${id}/keywords?${params}`,
      { timeout: 10000 }
    );

    res.json(response.data);

  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json(apiResponse(false, null, 'Project not found'));
    }
    handleError(res, error, 'Failed to fetch project keywords');
  }
});

/**
 * POST /api/v2/research/projects/:id/track-opportunities
 *
 * Add top opportunity keywords from research project to tracking
 *
 * Request body:
 * {
 *   limit: 20,
 *   min_opportunity: 70,
 *   intent_filter: ["informational", "commercial"],
 *   domain: "example.com"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     tracked_count: 15,
 *     skipped_count: 5,
 *     keywords: [
 *       { keyword: "seo tools", tracked: true },
 *       { keyword: "keyword research", tracked: false, reason: "already tracked" }
 *     ]
 *   }
 * }
 */
router.post('/projects/:id/track-opportunities', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      limit = 20,
      min_opportunity = 70,
      intent_filter = [],
      domain
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json(apiResponse(false, null, 'Invalid project ID'));
    }

    // Validate limit
    const trackLimit = Math.min(100, Math.max(1, parseInt(limit)));

    // Get project to verify it exists and get client info
    const projectResponse = await axios.get(
      `${KEYWORD_SERVICE_URL}/api/keyword/projects/${id}`,
      { timeout: 5000 }
    );

    const project = projectResponse.data?.data;
    if (!project) {
      return res.status(404).json(apiResponse(false, null, 'Project not found'));
    }

    const client_id = project.metadata?.client_id;
    if (!client_id) {
      return res.status(400).json(apiResponse(false, null, 'Project is not associated with a client'));
    }

    // Get client domain if not provided
    let targetDomain = domain;
    if (!targetDomain) {
      const clientStmt = db.prepare('SELECT domain FROM clients WHERE id = ?');
      const client = clientStmt.get(client_id);
      if (!client || !client.domain) {
        return res.status(400).json(apiResponse(false, null, 'Domain is required'));
      }
      targetDomain = client.domain;
    }

    // Fetch top opportunity keywords
    const params = new URLSearchParams({
      page: 1,
      per_page: trackLimit * 2, // Fetch extra in case some are filtered
      sort: 'opportunity'
    });

    if (intent_filter.length > 0) {
      params.append('intent', intent_filter.join(','));
    }

    const keywordsResponse = await axios.get(
      `${KEYWORD_SERVICE_URL}/api/keyword/projects/${id}/keywords?${params}`,
      { timeout: 10000 }
    );

    let keywords = keywordsResponse.data?.data || [];

    // Filter by opportunity score
    keywords = keywords.filter(k =>
      (k.opportunity_score || 0) >= min_opportunity
    );

    // Limit to requested count
    keywords = keywords.slice(0, trackLimit);

    if (keywords.length === 0) {
      return res.json(apiResponse(true, {
        tracked_count: 0,
        skipped_count: 0,
        keywords: [],
        message: 'No keywords found matching the criteria'
      }));
    }

    // Track keywords
    const results = [];
    let trackedCount = 0;
    let skippedCount = 0;

    for (const keyword of keywords) {
      try {
        // Check if already tracked
        const existingStmt = db.prepare(`
          SELECT id FROM keyword_performance
          WHERE client_id = ? AND keyword = ?
        `);
        const existing = existingStmt.get(client_id, keyword.keyword);

        if (existing) {
          results.push({
            keyword: keyword.keyword,
            tracked: false,
            reason: 'Already tracked'
          });
          skippedCount++;
          continue;
        }

        // Add to tracking database
        const insertStmt = db.prepare(`
          INSERT INTO keyword_performance (client_id, keyword, date)
          VALUES (?, ?, date('now'))
        `);
        insertStmt.run(client_id, keyword.keyword);

        // Try to add to SerpBear tracking
        try {
          await axios.post(`${SERPBEAR_URL}/api/keywords`, {
            keyword: keyword.keyword,
            domain: targetDomain,
            location: project.geo || 'United States'
          }, { timeout: 5000 });
        } catch (error) {
          console.warn(`Failed to add ${keyword.keyword} to SerpBear:`, error.message);
        }

        results.push({
          keyword: keyword.keyword,
          tracked: true,
          opportunity_score: keyword.opportunity_score,
          volume: keyword.volume
        });
        trackedCount++;

      } catch (error) {
        results.push({
          keyword: keyword.keyword,
          tracked: false,
          reason: error.message
        });
        skippedCount++;
      }
    }

    // Log the operation
    const logStmt = db.prepare(`
      INSERT INTO system_logs (level, category, message, metadata)
      VALUES (?, ?, ?, ?)
    `);

    logStmt.run(
      'info',
      'research',
      `Tracked ${trackedCount} keywords from research project ${id}`,
      JSON.stringify({
        project_id: id,
        client_id,
        tracked_count: trackedCount,
        skipped_count: skippedCount
      })
    );

    res.json(apiResponse(true, {
      tracked_count: trackedCount,
      skipped_count: skippedCount,
      total_processed: keywords.length,
      keywords: results
    }));

  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json(apiResponse(false, null, 'Project not found'));
    }
    handleError(res, error, 'Failed to track opportunity keywords');
  }
});

/**
 * DELETE /api/v2/research/projects/:id
 *
 * Delete a research project
 */
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json(apiResponse(false, null, 'Invalid project ID'));
    }

    // Delete from keyword service
    await axios.delete(
      `${KEYWORD_SERVICE_URL}/api/keyword/projects/${id}`,
      { timeout: 5000 }
    );

    res.json(apiResponse(true, { message: 'Project deleted successfully' }));

  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json(apiResponse(false, null, 'Project not found'));
    }
    handleError(res, error, 'Failed to delete project');
  }
});

/**
 * POST /api/v2/research/projects/:id/export
 *
 * Export project keywords to CSV
 *
 * Request body:
 * {
 *   format: "csv",
 *   filters: {
 *     min_volume: 1000,
 *     max_difficulty: 50
 *   }
 * }
 */
router.post('/projects/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'csv', filters = {} } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json(apiResponse(false, null, 'Invalid project ID'));
    }

    // Forward to keyword service
    const response = await axios.post(
      `${KEYWORD_SERVICE_URL}/api/keyword/projects/${id}/export`,
      { format, filters },
      {
        timeout: 30000,
        responseType: 'stream'
      }
    );

    // Set headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="keywords-project-${id}.csv"`);

    // Pipe the response
    response.data.pipe(res);

  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json(apiResponse(false, null, 'Project not found'));
    }
    handleError(res, error, 'Failed to export project');
  }
});

export default router;
