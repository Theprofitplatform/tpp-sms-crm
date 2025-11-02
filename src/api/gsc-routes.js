/**
 * Google Search Console API Routes
 * Provides endpoints for GSC authentication, data sync, and analytics
 */

import express from 'express';
import gscService from '../services/google-search-console.js';
import db from '../database/index.js';

const router = express.Router();

/**
 * GET /api/gsc/auth-url
 * Generate OAuth authorization URL for GSC
 */
router.get('/auth-url', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    // Get OAuth credentials from environment
    const credentials = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/gsc/callback'
    };

    if (!credentials.client_id || !credentials.client_secret) {
      return res.status(500).json({
        error: 'Google OAuth credentials not configured',
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env'
      });
    }

    // Initialize OAuth client
    gscService.initializeOAuth(credentials);

    // Generate authorization URL
    const authUrl = gscService.getAuthorizationUrl();

    res.json({
      success: true,
      authUrl,
      clientId
    });
  } catch (error) {
    console.error('Failed to generate auth URL:', error);
    res.status(500).json({
      error: 'Failed to generate authorization URL',
      message: error.message
    });
  }
});

/**
 * GET /api/gsc/callback
 * OAuth callback handler - exchanges code for tokens
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Initialize OAuth client
    const credentials = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/gsc/callback'
    };

    gscService.initializeOAuth(credentials);

    // Exchange code for tokens
    const tokens = await gscService.authenticate(code);

    // Store tokens (encrypted in production)
    // For now, return them to be stored client-side or in database

    res.json({
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

/**
 * POST /api/gsc/verify-property
 * Verify ownership of a GSC property
 */
router.post('/verify-property', async (req, res) => {
  try {
    const { clientId, propertyUrl, tokens } = req.body;

    if (!clientId || !propertyUrl || !tokens) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, propertyUrl, tokens'
      });
    }

    // Initialize OAuth with stored tokens
    const credentials = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/gsc/callback'
    };

    gscService.initializeOAuth(credentials);
    gscService.setCredentials(tokens);

    // Verify property
    const verification = await gscService.verifyProperty(propertyUrl);

    if (!verification.verified) {
      return res.status(403).json({
        error: 'Property verification failed',
        message: verification.error
      });
    }

    // Store property in database
    const propertyId = db.db.prepare(`
      INSERT INTO gsc_properties (
        client_id, property_url, property_type,
        verified, verified_at,
        access_token, refresh_token, token_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id, property_url) DO UPDATE SET
        verified = 1,
        verified_at = CURRENT_TIMESTAMP,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_expires_at = excluded.token_expires_at
      RETURNING id
    `).get(
      clientId,
      propertyUrl,
      'URL_PREFIX',
      1,
      new Date().toISOString(),
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
    );

    res.json({
      success: true,
      propertyId: propertyId?.id,
      verification,
      message: 'Property verified and saved'
    });
  } catch (error) {
    console.error('Property verification error:', error);
    res.status(500).json({
      error: 'Failed to verify property',
      message: error.message
    });
  }
});

/**
 * GET /api/gsc/properties
 * List all GSC properties for a client
 */
router.get('/properties', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const properties = db.db.prepare(`
      SELECT
        id, client_id, property_url, property_type,
        verified, verified_at,
        last_sync, last_sync_status, last_sync_error,
        created_at
      FROM gsc_properties
      WHERE client_id = ?
      ORDER BY verified DESC, created_at DESC
    `).all(clientId);

    res.json({
      success: true,
      count: properties.length,
      properties
    });
  } catch (error) {
    console.error('Failed to list properties:', error);
    res.status(500).json({
      error: 'Failed to list properties',
      message: error.message
    });
  }
});

/**
 * POST /api/gsc/sync
 * Sync GSC data for a property
 */
router.post('/sync', async (req, res) => {
  try {
    const { clientId, propertyId, days = 30 } = req.body;

    if (!clientId || !propertyId) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, propertyId'
      });
    }

    // Get property from database
    const property = db.db.prepare(`
      SELECT * FROM gsc_properties
      WHERE id = ? AND client_id = ?
    `).get(propertyId, clientId);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (!property.verified) {
      return res.status(403).json({ error: 'Property not verified' });
    }

    // Initialize OAuth with stored tokens
    const credentials = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/gsc/callback'
    };

    gscService.initializeOAuth(credentials);
    gscService.setCredentials({
      access_token: property.access_token,
      refresh_token: property.refresh_token,
      expiry_date: property.token_expires_at ? new Date(property.token_expires_at).getTime() : null
    });

    // Sync data
    const result = await gscService.syncSearchAnalytics(
      clientId,
      propertyId,
      property.property_url,
      days
    );

    res.json({
      success: true,
      result,
      message: `Synced ${result.recordsImported} records`
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
});

/**
 * GET /api/gsc/analytics/:propertyId
 * Get search analytics for a property
 */
router.get('/analytics/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    const query = `
      SELECT
        page_url, query,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions,
        AVG(ctr) as ctr,
        AVG(position) as position
      FROM gsc_search_analytics
      WHERE property_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
      GROUP BY page_url, query
      ORDER BY clicks DESC
      LIMIT ?
    `;

    const params = [propertyId];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);
    params.push(parseInt(limit));

    const analytics = db.db.prepare(query).all(...params);

    res.json({
      success: true,
      count: analytics.length,
      analytics
    });
  } catch (error) {
    console.error('Failed to get analytics:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/gsc/page-performance/:propertyId
 * Get page performance metrics
 */
router.get('/page-performance/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { pageUrl, limit = 100, orderBy = 'clicks_30d' } = req.query;

    // Validate orderBy to prevent SQL injection
    const allowedOrderBy = [
      'clicks_7d', 'clicks_30d', 'clicks_90d',
      'impressions_7d', 'impressions_30d', 'impressions_90d',
      'ctr_7d', 'ctr_30d', 'ctr_90d',
      'position_7d', 'position_30d', 'position_90d'
    ];

    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'clicks_30d';

    let query, params;

    if (pageUrl) {
      // Get specific page
      query = `
        SELECT * FROM gsc_page_performance
        WHERE property_id = ? AND page_url = ?
      `;
      params = [propertyId, pageUrl];
    } else {
      // Get top pages
      query = `
        SELECT * FROM gsc_page_performance
        WHERE property_id = ?
        ORDER BY ${safeOrderBy} DESC
        LIMIT ?
      `;
      params = [propertyId, parseInt(limit)];
    }

    const performance = pageUrl
      ? db.db.prepare(query).get(...params)
      : db.db.prepare(query).all(...params);

    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('Failed to get page performance:', error);
    res.status(500).json({
      error: 'Failed to get page performance',
      message: error.message
    });
  }
});

/**
 * GET /api/gsc/top-pages
 * Get top performing pages across all properties
 */
router.get('/top-pages', async (req, res) => {
  try {
    const { clientId, limit = 50, orderBy = 'clicks_30d' } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    // Validate orderBy
    const allowedOrderBy = [
      'clicks_7d', 'clicks_30d', 'clicks_90d',
      'impressions_7d', 'impressions_30d', 'impressions_90d'
    ];

    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'clicks_30d';

    const topPages = db.db.prepare(`
      SELECT
        p.property_url,
        perf.page_url,
        perf.clicks_7d, perf.impressions_7d, perf.ctr_7d, perf.position_7d,
        perf.clicks_30d, perf.impressions_30d, perf.ctr_30d, perf.position_30d,
        perf.clicks_trend, perf.impressions_trend, perf.position_trend,
        perf.top_queries
      FROM gsc_page_performance perf
      JOIN gsc_properties p ON perf.property_id = p.id
      WHERE p.client_id = ?
      ORDER BY perf.${safeOrderBy} DESC
      LIMIT ?
    `).all(clientId, parseInt(limit));

    res.json({
      success: true,
      count: topPages.length,
      pages: topPages
    });
  } catch (error) {
    console.error('Failed to get top pages:', error);
    res.status(500).json({
      error: 'Failed to get top pages',
      message: error.message
    });
  }
});

/**
 * GET /api/gsc/issues
 * Get URL issues from GSC
 */
router.get('/issues', async (req, res) => {
  try {
    const { clientId, propertyId, status = 'active', severity } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    let query = `
      SELECT
        i.*,
        p.property_url
      FROM gsc_url_issues i
      JOIN gsc_properties p ON i.property_id = p.id
      WHERE p.client_id = ?
    `;

    const params = [clientId];

    if (propertyId) {
      query += ' AND i.property_id = ?';
      params.push(propertyId);
    }

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (severity) {
      query += ' AND i.severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY i.detected_at DESC';

    const issues = db.db.prepare(query).all(...params);

    res.json({
      success: true,
      count: issues.length,
      issues
    });
  } catch (error) {
    console.error('Failed to get issues:', error);
    res.status(500).json({
      error: 'Failed to get issues',
      message: error.message
    });
  }
});

/**
 * POST /api/gsc/enrich-proposals
 * Enrich proposals with GSC data
 */
router.post('/enrich-proposals', async (req, res) => {
  try {
    const { clientId, proposalIds } = req.body;

    if (!clientId || !proposalIds || !Array.isArray(proposalIds)) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, proposalIds (array)'
      });
    }

    // Get proposals
    const proposals = db.db.prepare(`
      SELECT * FROM autofix_proposals
      WHERE id IN (${proposalIds.map(() => '?').join(',')})
        AND client_id = ?
    `).all(...proposalIds, clientId);

    if (proposals.length === 0) {
      return res.status(404).json({ error: 'No proposals found' });
    }

    // Enrich with GSC data
    const enrichedProposals = [];
    for (const proposal of proposals) {
      const enriched = await gscService.enrichProposal(proposal);
      enrichedProposals.push(enriched);
    }

    res.json({
      success: true,
      count: enrichedProposals.length,
      proposals: enrichedProposals
    });
  } catch (error) {
    console.error('Failed to enrich proposals:', error);
    res.status(500).json({
      error: 'Failed to enrich proposals',
      message: error.message
    });
  }
});

/**
 * GET /api/gsc/proposal-gsc-data/:proposalId
 * Get GSC data for a specific proposal
 */
router.get('/proposal-gsc-data/:proposalId', async (req, res) => {
  try {
    const { proposalId } = req.params;

    const gscData = db.db.prepare(`
      SELECT * FROM proposal_gsc_data
      WHERE proposal_id = ?
    `).get(proposalId);

    if (!gscData) {
      return res.status(404).json({
        error: 'No GSC data found for this proposal'
      });
    }

    res.json({
      success: true,
      gscData
    });
  } catch (error) {
    console.error('Failed to get proposal GSC data:', error);
    res.status(500).json({
      error: 'Failed to get proposal GSC data',
      message: error.message
    });
  }
});

/**
 * GET /api/gsc/stats
 * Get overall GSC statistics for a client
 */
router.get('/stats', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    // Get property count
    const propertiesCount = db.db.prepare(`
      SELECT COUNT(*) as count FROM gsc_properties
      WHERE client_id = ? AND verified = 1
    `).get(clientId);

    // Get total clicks and impressions (last 30 days)
    const totals = db.db.prepare(`
      SELECT
        SUM(perf.clicks_30d) as total_clicks,
        SUM(perf.impressions_30d) as total_impressions,
        AVG(perf.position_30d) as avg_position
      FROM gsc_page_performance perf
      JOIN gsc_properties p ON perf.property_id = p.id
      WHERE p.client_id = ?
    `).get(clientId);

    // Get top performing page
    const topPage = db.db.prepare(`
      SELECT
        perf.page_url,
        perf.clicks_30d,
        p.property_url
      FROM gsc_page_performance perf
      JOIN gsc_properties p ON perf.property_id = p.id
      WHERE p.client_id = ?
      ORDER BY perf.clicks_30d DESC
      LIMIT 1
    `).get(clientId);

    // Get issues count
    const issuesCount = db.db.prepare(`
      SELECT COUNT(*) as count FROM gsc_url_issues i
      JOIN gsc_properties p ON i.property_id = p.id
      WHERE p.client_id = ? AND i.status = 'active'
    `).get(clientId);

    res.json({
      success: true,
      stats: {
        properties: propertiesCount?.count || 0,
        total_clicks_30d: totals?.total_clicks || 0,
        total_impressions_30d: totals?.total_impressions || 0,
        avg_position: totals?.avg_position ? parseFloat(totals.avg_position.toFixed(2)) : 0,
        active_issues: issuesCount?.count || 0,
        top_page: topPage || null
      }
    });
  } catch (error) {
    console.error('Failed to get GSC stats:', error);
    res.status(500).json({
      error: 'Failed to get GSC stats',
      message: error.message
    });
  }
});

export default router;
