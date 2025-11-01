/**
 * Auto-Fix Review API Routes
 * Endpoints for manual review workflow
 */

import express from 'express';
import proposalService from '../services/proposal-service.js';
import db from '../database/index.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/autofix/proposals
 * Get proposals with filters
 */
router.get('/proposals', async (req, res) => {
  try {
    const {
      clientId,
      status = 'pending',
      engineId,
      groupId,
      severity,
      riskLevel,
      limit = 50
    } = req.query;

    const proposals = proposalService.getProposals({
      clientId,
      status,
      engineId,
      groupId,
      severity,
      riskLevel,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: proposals.length,
      proposals
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autofix/proposals/:id
 * Get single proposal by ID
 */
router.get('/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = proposalService.getProposalById(id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    res.json({
      success: true,
      proposal
    });
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autofix/proposals/group/:groupId
 * Get proposals by group with summary
 */
router.get('/proposals/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const proposals = proposalService.getProposalsByGroup(groupId);
    const summary = proposalService.getGroupSummary(groupId);
    const session = proposalService.getReviewSession(groupId);

    res.json({
      success: true,
      groupId,
      summary,
      session,
      proposals
    });
  } catch (error) {
    console.error('Error fetching group proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/proposals/:id/review
 * Review single proposal (approve/reject)
 */
router.post('/proposals/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes, reviewedBy } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const result = proposalService.reviewProposal(id, {
      action,
      notes,
      reviewedBy: reviewedBy || 'user'
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error reviewing proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/proposals/bulk-review
 * Bulk review proposals
 */
router.post('/proposals/bulk-review', async (req, res) => {
  try {
    const { proposalIds, action, notes, reviewedBy } = req.body;

    if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'proposalIds must be a non-empty array'
      });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const result = proposalService.bulkReview(proposalIds, {
      action,
      notes,
      reviewedBy: reviewedBy || 'user'
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error bulk reviewing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/proposals/auto-approve
 * Auto-approve proposals based on criteria
 */
router.post('/proposals/auto-approve', async (req, res) => {
  try {
    const { groupId, criteria } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'groupId is required'
      });
    }

    const result = proposalService.autoApprove(groupId, criteria || {});

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error auto-approving:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/proposals/accept-all
 * Accept all proposals in a group (with safety checks)
 */
router.post('/proposals/accept-all', async (req, res) => {
  try {
    const { groupId, confirmRisky = false, reviewedBy = 'user' } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'groupId is required'
      });
    }

    // Get all proposals in the group
    const proposals = proposalService.getProposals({
      groupId,
      status: 'pending'
    });

    if (proposals.length === 0) {
      return res.json({
        success: true,
        approved: 0,
        message: 'No pending proposals found'
      });
    }

    // Check for high-risk proposals
    const highRiskProposals = proposals.filter(p =>
      p.risk_level === 'high' || p.severity === 'critical'
    );

    if (highRiskProposals.length > 0 && !confirmRisky) {
      return res.json({
        success: false,
        requiresConfirmation: true,
        highRiskCount: highRiskProposals.length,
        totalCount: proposals.length,
        message: `Found ${highRiskProposals.length} high-risk proposals. Set confirmRisky=true to proceed.`,
        highRiskProposals: highRiskProposals.map(p => ({
          id: p.id,
          description: p.fix_description,
          target: p.target_title,
          riskLevel: p.risk_level
        }))
      });
    }

    // Approve all proposals
    const proposalIds = proposals.map(p => p.id);
    const result = proposalService.bulkReview(proposalIds, {
      action: 'approve',
      notes: 'Bulk approved via Accept All',
      reviewedBy
    });

    res.json({
      success: true,
      approved: result.approved,
      highRisk: highRiskProposals.length,
      total: proposals.length,
      message: `Approved ${result.approved} proposals (${highRiskProposals.length} high-risk)`
    });

  } catch (error) {
    console.error('Error accepting all proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/proposals/accept-low-risk
 * Accept only low-risk proposals in a group
 */
router.post('/proposals/accept-low-risk', async (req, res) => {
  try {
    const { groupId, maxRiskLevel = 'low', reviewedBy = 'user' } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'groupId is required'
      });
    }

    // Get all pending proposals in the group
    const allProposals = proposalService.getProposals({
      groupId,
      status: 'pending'
    });

    if (allProposals.length === 0) {
      return res.json({
        success: true,
        approved: 0,
        skipped: 0,
        message: 'No pending proposals found'
      });
    }

    // Define risk level hierarchy
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const maxRiskIndex = riskLevels.indexOf(maxRiskLevel);

    if (maxRiskIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid maxRiskLevel. Must be: low, medium, high, or critical'
      });
    }

    // Filter proposals by risk level
    const lowRiskProposals = allProposals.filter(p => {
      const proposalRiskIndex = riskLevels.indexOf(p.risk_level || 'low');
      return proposalRiskIndex <= maxRiskIndex;
    });

    const skippedProposals = allProposals.filter(p => {
      const proposalRiskIndex = riskLevels.indexOf(p.risk_level || 'low');
      return proposalRiskIndex > maxRiskIndex;
    });

    if (lowRiskProposals.length === 0) {
      return res.json({
        success: true,
        approved: 0,
        skipped: skippedProposals.length,
        message: `No proposals found with risk level <= ${maxRiskLevel}. ${skippedProposals.length} proposals skipped.`
      });
    }

    // Approve low-risk proposals
    const proposalIds = lowRiskProposals.map(p => p.id);
    const result = proposalService.bulkReview(proposalIds, {
      action: 'approve',
      notes: `Bulk approved via Accept Low Risk (max: ${maxRiskLevel})`,
      reviewedBy
    });

    res.json({
      success: true,
      approved: result.approved,
      skipped: skippedProposals.length,
      total: allProposals.length,
      maxRiskLevel,
      message: `Approved ${result.approved} low-risk proposals. Skipped ${skippedProposals.length} higher-risk proposals.`,
      skippedDetails: skippedProposals.map(p => ({
        id: p.id,
        description: p.fix_description,
        riskLevel: p.risk_level,
        severity: p.severity
      }))
    });

  } catch (error) {
    console.error('Error accepting low-risk proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/detect
 * Run auto-fix in detect mode only
 */
router.post('/detect', async (req, res) => {
  try {
    const { engineId, clientId, options = {} } = req.body;

    if (!engineId || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'engineId and clientId are required'
      });
    }

    // Dynamically load engine
    const engine = await loadEngine(engineId, clientId);
    
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: `Engine ${engineId} not found`
      });
    }

    const result = await engine.runDetection(options);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error running detection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/apply
 * Apply approved proposals
 */
router.post('/apply', async (req, res) => {
  try {
    const { groupId, engineId, clientId, options = {} } = req.body;

    if (!groupId || !engineId || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'groupId, engineId, and clientId are required'
      });
    }

    // Load engine
    const engine = await loadEngine(engineId, clientId);
    
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: `Engine ${engineId} not found`
      });
    }

    const result = await engine.runApplication(groupId, options);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error applying proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autofix/statistics
 * Get proposal statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { clientId } = req.query;
    
    const stats = proposalService.getStatistics(clientId);

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/expire-old
 * Manually trigger expiration of old proposals
 */
router.post('/expire-old', async (req, res) => {
  try {
    const result = proposalService.expireOldProposals();

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error expiring proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autofix/sessions
 * Get all review sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const { clientId, status, limit = 50 } = req.query;
    
    const sessions = proposalService.getReviewSession
      ? await proposalService.getReviewSession({ clientId, status, limit: parseInt(limit) })
      : [];

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper: Load engine dynamically
 */
async function loadEngine(engineId, clientId) {
  // Map engine IDs to module paths (relative to project root)
  const engineMap = {
    // Modern engines with review workflow (✅ RECOMMENDED)
    'nap-auto-fixer': './src/automation/auto-fixers/nap-fixer.js',
    'nap-fixer': './src/automation/auto-fixers/nap-fixer.js',
    'content-optimizer-v2': './src/automation/auto-fixers/content-optimizer-v2.js',
    'schema-injector-v2': './src/automation/auto-fixers/schema-injector-v2.js',

    // Legacy engines (need refactoring for full review workflow)
    'content-optimizer': './src/automation/auto-fixers/content-optimizer.js',
    'title-meta-optimizer': './src/automation/auto-fixers/title-meta-optimizer.js',
    'meta-description-optimizer': './src/automation/auto-fixers/meta-description-optimizer.js',
    'schema-injector': './src/automation/auto-fixers/schema-injector.js',
    'broken-link-detector': './src/automation/auto-fixers/broken-link-detector.js',
    'duplicate-content-detector': './src/automation/auto-fixers/duplicate-content-detector.js',
    'core-web-vitals-optimizer': './src/automation/auto-fixers/core-web-vitals-optimizer.js',
    'accessibility-fixer': './src/automation/auto-fixers/accessibility-fixer.js'
  };

  const enginePath = engineMap[engineId];
  
  if (!enginePath) {
    console.error(`Engine ${engineId} not found in engineMap`);
    return null;
  }

  try {
    // Import from project root
    const engineModule = await import(`../../automation/auto-fixers/${engineId}.js`).catch(async () => {
      // Try alternative name mappings
      const altPath = enginePath.replace('./src/', '../../');
      return await import(altPath);
    });
    
    const EngineClass = engineModule.default || engineModule[Object.keys(engineModule)[0]];
    
    if (!EngineClass) {
      throw new Error(`No engine class found in ${enginePath}`);
    }
    
    // Load client config
    const clientConfig = await loadClientConfig(clientId);
    
    return new EngineClass(clientConfig);
  } catch (error) {
    console.error(`Error loading engine ${engineId}:`, error);
    return null;
  }
}

/**
 * Helper: Load client configuration
 */
async function loadClientConfig(clientId) {
  const envPath = path.join(process.cwd(), 'clients', `${clientId}.env`);
  
  if (!fs.existsSync(envPath)) {
    throw new Error(`Client config not found: ${envPath}`);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const config = { id: clientId };

  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      const cleanKey = key.trim();
      const cleanValue = value.trim().replace(/['"]/g, '');
      
      // Map common keys
      if (cleanKey === 'WORDPRESS_URL') config.siteUrl = cleanValue;
      if (cleanKey === 'WORDPRESS_USER') config.wpUser = cleanValue;
      if (cleanKey === 'WORDPRESS_APP_PASSWORD') config.wpPassword = cleanValue;
      if (cleanKey === 'BUSINESS_NAME') config.businessName = cleanValue;
      if (cleanKey === 'CITY') config.city = cleanValue;
      if (cleanKey === 'STATE') config.state = cleanValue;
      if (cleanKey === 'COUNTRY') config.country = cleanValue;
      if (cleanKey === 'PHONE') config.phone = cleanValue;
      if (cleanKey === 'EMAIL') config.email = cleanValue;
      if (cleanKey === 'ADDRESS') config.address = cleanValue;
    }
  });

  return config;
}

/**
 * GET /api/autofix/config/:clientId
 * Get NAP configuration for a client
 */
router.get('/config/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get from autofix_review_settings table
    const stmt = db.db.prepare(`
      SELECT settings FROM autofix_review_settings
      WHERE client_id = ? AND engine_id = 'nap-fixer'
    `);
    
    const row = stmt.get(clientId);

    if (row && row.settings) {
      const settings = JSON.parse(row.settings);
      res.json({
        success: true,
        config: settings.napConfig || {}
      });
    } else {
      // Return empty config
      res.json({
        success: true,
        config: {
          businessName: '',
          phone: '',
          email: '',
          address: '',
          city: '',
          state: '',
          country: 'Australia',
          phoneFormat: 'international'
        }
      });
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/config/:clientId
 * Save NAP configuration for a client
 */
router.post('/config/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { engineId = 'nap-fixer', config } = req.body;

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration is required'
      });
    }

    // Save to autofix_review_settings
    const settings = {
      napConfig: config,
      updatedAt: new Date().toISOString()
    };

    const stmt = db.db.prepare(`
      INSERT INTO autofix_review_settings (client_id, engine_id, settings, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(client_id, engine_id) 
      DO UPDATE SET settings = ?, updated_at = ?
    `);

    const settingsJson = JSON.stringify(settings);
    const now = new Date().toISOString();

    stmt.run(
      clientId,
      engineId,
      settingsJson,
      now,
      settingsJson,
      now
    );

    res.json({
      success: true,
      message: 'Configuration saved successfully'
    });

  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/autofix/config/:clientId/test
 * Test NAP configuration (preview what would be detected)
 */
router.post('/config/:clientId/test', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration is required'
      });
    }

    // For now, return a simple preview
    // In full implementation, this would do a dry-run detection
    res.json({
      success: true,
      preview: {
        contentCount: 'Unknown (requires WordPress connection)',
        estimatedIssues: 'Will vary based on content',
        configValid: true,
        message: 'Configuration looks valid. Run detection to see actual results.'
      }
    });

  } catch (error) {
    console.error('Error testing config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
