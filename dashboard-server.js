#!/usr/bin/env node

/**
 * SEO Automation Dashboard Server
 *
 * Web-based dashboard for managing multi-client SEO operations
 *
 * Usage:
 *   node dashboard-server.js
 *   Then open: http://localhost:3000
 *
 * Features:
 *   - Visual client overview
 *   - Quick actions (test, audit, optimize)
 *   - Status monitoring
 *   - Report viewing
 *   - Documentation navigation
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { LocalSEOOrchestrator } from './src/automation/local-seo-orchestrator.js';
import { LocalSEOReportGenerator } from './src/reports/local-seo-report-generator.js';
import { CompetitorTracker } from './src/automation/competitor-tracker.js';
import { GoogleSearchConsole } from './src/automation/google-search-console.js';
import db from './src/database/index.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, 'logs', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'logs', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Load clients
function loadClients() {
  try {
    const configPath = path.join(__dirname, 'clients', 'clients-config.json');
    if (!fs.existsSync(configPath)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('Error loading clients:', error);
    return {};
  }
}

// Check env file status
function checkEnvFile(clientId) {
  const envPath = path.join(__dirname, 'clients', `${clientId}.env`);

  if (!fs.existsSync(envPath)) {
    return { exists: false, configured: false };
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasUrl = envContent.includes('WORDPRESS_URL=http');
  const hasUser = !envContent.includes('WORDPRESS_USER=\n') && envContent.includes('WORDPRESS_USER=');
  const hasPassword = !envContent.includes('WORDPRESS_APP_PASSWORD=\n') && envContent.includes('WORDPRESS_APP_PASSWORD=');

  return {
    exists: true,
    configured: hasUrl && hasUser && hasPassword
  };
}

// Get client reports
function getClientReports(clientId) {
  const reportDir = path.join(__dirname, 'logs', 'clients', clientId);

  if (!fs.existsSync(reportDir)) {
    return [];
  }

  return fs.readdirSync(reportDir)
    .filter(f => f.endsWith('.html'))
    .map(f => ({
      name: f,
      path: `/reports/${clientId}/${f}`,
      date: fs.statSync(path.join(reportDir, f)).mtime
    }))
    .sort((a, b) => b.date - a.date);
}

// API Routes

// Get dashboard data
app.get('/api/dashboard', (req, res) => {
  try {
    const clients = loadClients();
    const clientData = Object.entries(clients).map(([id, client]) => {
      const envCheck = checkEnvFile(id);
      const reports = getClientReports(id);

      return {
        id,
        ...client,
        envConfigured: envCheck.configured,
        envExists: envCheck.exists,
        reportCount: reports.length,
        latestReport: reports[0] || null
      };
    });

    const stats = {
      total: clientData.length,
      active: clientData.filter(c => c.status === 'active').length,
      pending: clientData.filter(c => c.status === 'pending-setup').length,
      inactive: clientData.filter(c => c.status === 'inactive').length,
      configured: clientData.filter(c => c.envConfigured).length,
      needsSetup: clientData.filter(c => !c.envConfigured).length
    };

    res.json({
      success: true,
      clients: clientData,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test authentication for a client
app.post('/api/test-auth/:clientId', async (req, res) => {
  const { clientId } = req.params;

  try {
    // Backup current env
    const mainEnv = path.join(__dirname, 'config', 'env', '.env');
    const backupEnv = path.join(__dirname, 'config', 'env', '.env.backup');
    const clientEnv = path.join(__dirname, 'clients', `${clientId}.env`);

    if (!fs.existsSync(clientEnv)) {
      return res.json({
        success: false,
        error: 'Environment file not found'
      });
    }

    // Backup and swap
    if (fs.existsSync(mainEnv)) {
      fs.copyFileSync(mainEnv, backupEnv);
    }
    fs.copyFileSync(clientEnv, mainEnv);

    // Run test
    const { stdout, stderr } = await execAsync('node test-auth.js');

    // Restore
    if (fs.existsSync(backupEnv)) {
      fs.copyFileSync(backupEnv, mainEnv);
    }

    res.json({
      success: true,
      output: stdout,
      error: stderr
    });
  } catch (error) {
    // Restore env even on error
    const mainEnv = path.join(__dirname, 'config', 'env', '.env');
    const backupEnv = path.join(__dirname, 'config', 'env', '.env.backup');
    if (fs.existsSync(backupEnv)) {
      fs.copyFileSync(backupEnv, mainEnv);
    }

    res.json({
      success: false,
      error: error.message,
      output: error.stdout,
      stderr: error.stderr
    });
  }
});

// Run audit for a client
app.post('/api/audit/:clientId', async (req, res) => {
  const { clientId } = req.params;

  try {
    const { stdout } = await execAsync(`node client-manager.js audit ${clientId}`);

    res.json({
      success: true,
      output: stdout
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      output: error.stdout
    });
  }
});

// Run optimization for a client
app.post('/api/optimize/:clientId', async (req, res) => {
  const { clientId } = req.params;

  try {
    const { stdout } = await execAsync(`node client-manager.js optimize ${clientId}`);

    res.json({
      success: true,
      output: stdout
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      output: error.stdout
    });
  }
});

// Run batch operations
app.post('/api/batch/:action', async (req, res) => {
  const { action } = req.params;

  try {
    let command;
    if (action === 'optimize') {
      command = 'node client-manager.js optimize-all';
    } else if (action === 'audit') {
      command = 'node audit-all-clients.js';
    } else if (action === 'test') {
      command = 'node test-all-clients.js';
    } else {
      return res.json({
        success: false,
        error: 'Invalid action'
      });
    }

    const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });

    res.json({
      success: true,
      output: stdout
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      output: error.stdout
    });
  }
});

// Get client reports
app.get('/api/reports/:clientId', (req, res) => {
  const { clientId } = req.params;
  const reports = getClientReports(clientId);

  res.json({
    success: true,
    reports
  });
});

// Serve report files
app.use('/reports', express.static(path.join(__dirname, 'logs', 'clients')));

// Serve documentation
app.get('/api/docs', (req, res) => {
  const docs = [
    { name: 'Quick Start', file: 'QUICKSTART.md', category: 'Getting Started' },
    { name: 'Your Next Step', file: 'YOUR-NEXT-STEP.md', category: 'Getting Started' },
    { name: 'Complete System Guide', file: 'YOUR-COMPLETE-SYSTEM-GUIDE.md', category: 'References' },
    { name: 'Command Reference', file: 'COMMAND-REFERENCE.md', category: 'References' },
    { name: 'Add Second Site', file: 'ADD-SECOND-SITE-WALKTHROUGH.md', category: 'Tutorials' },
    { name: 'Migrate Existing Clients', file: 'MIGRATE-EXISTING-CLIENTS.md', category: 'Tutorials' },
    { name: 'Multi-Client Plan', file: 'MULTI-CLIENT-PLAN.md', category: 'Business' },
    { name: 'Get First Client', file: 'GET-FIRST-CLIENT-GUIDE.md', category: 'Business' },
    { name: 'Documentation Index', file: 'DOCUMENTATION-INDEX.md', category: 'References' }
  ];

  res.json({
    success: true,
    docs
  });
});

// Get documentation content
app.get('/api/docs/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, filename);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.json({
      success: true,
      content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update client status
app.post('/api/client/:clientId/status', (req, res) => {
  const { clientId } = req.params;
  const { status } = req.body;

  try {
    const configPath = path.join(__dirname, 'clients', 'clients-config.json');
    const clients = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!clients[clientId]) {
      return res.json({
        success: false,
        error: 'Client not found'
      });
    }

    clients[clientId].status = status;
    fs.writeFileSync(configPath, JSON.stringify(clients, null, 2));

    res.json({
      success: true,
      message: `Client status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// CSV Analysis endpoint
app.post('/api/analyze-csv', upload.single('csv'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const analysis = analyzePositionTracking(csvContent);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// CSV Analysis functions
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function getLatestPosition(row) {
  const dateColumns = Object.keys(row).filter(k =>
    k.match(/\d{8}$/) && !k.includes('_type') && !k.includes('_landing')
  );
  const latestColumn = dateColumns[dateColumns.length - 1];
  const value = row[latestColumn];
  return value && !isNaN(value) ? parseInt(value) : 999;
}

function getLatestURL(row) {
  const landingColumns = Object.keys(row).filter(k => k.includes('_landing'));
  const latestLanding = landingColumns[landingColumns.length - 1];
  return row[latestLanding] || '';
}

function getCTRByPosition(position) {
  const ctrMap = {
    1: 0.316, 2: 0.158, 3: 0.106, 4: 0.080, 5: 0.065,
    6: 0.053, 7: 0.044, 8: 0.038, 9: 0.033, 10: 0.029
  };
  if (position <= 10) return ctrMap[position];
  if (position <= 20) return 0.015;
  return 0.005;
}

function estimateTrafficIncrease(currentPosition, volume) {
  const currentCTR = getCTRByPosition(currentPosition);
  const targetCTR = getCTRByPosition(3);
  const increase = (targetCTR - currentCTR) * volume;
  return Math.round(increase);
}

function analyzePositionTracking(csvContent) {
  const lines = csvContent.split('\n');

  // Find header line
  const headerIndex = lines.findIndex(line => line.startsWith('Keyword,Tags,Intents'));
  if (headerIndex === -1) {
    throw new Error('Invalid CSV format - could not find header');
  }

  const headers = parseCSVLine(lines[headerIndex]);
  const dataLines = lines.slice(headerIndex + 1);

  const data = dataLines
    .filter(line => line.trim() && !line.startsWith('ID:') && !line.startsWith('Report type'))
    .map(line => {
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    })
    .filter(row => row.Keyword && row.Keyword.trim());

  // Analyze top performers
  const topPerformers = data.filter(row => {
    const position = getLatestPosition(row);
    return position && position <= 10;
  }).map(row => ({
    keyword: row.Keyword,
    position: getLatestPosition(row),
    volume: parseInt(row['Search Volume']) || 0,
    intent: row.Intents,
    url: getLatestURL(row)
  }));

  // Analyze opportunities (positions 11-20)
  const opportunities = data.filter(row => {
    const position = getLatestPosition(row);
    const volume = parseInt(row['Search Volume']) || 0;
    return position >= 11 && position <= 20 && volume >= 50;
  }).map(row => {
    const position = getLatestPosition(row);
    const volume = parseInt(row['Search Volume']) || 0;
    return {
      keyword: row.Keyword,
      position,
      volume,
      cpc: row.CPC,
      potentialTraffic: estimateTrafficIncrease(position, volume),
      action: 'Optimize content, build backlinks, improve on-page SEO'
    };
  }).sort((a, b) => b.volume - a.volume);

  // Analyze declines
  const declines = data.filter(row => {
    const difference = parseInt(row['*.instantautotraders.com.au/*_difference']) || 0;
    return difference < -5;
  }).map(row => {
    const difference = parseInt(row['*.instantautotraders.com.au/*_difference']) || 0;
    const volume = parseInt(row['Search Volume']) || 0;
    return {
      keyword: row.Keyword,
      change: difference,
      currentPosition: getLatestPosition(row),
      volume,
      impact: Math.abs(difference) * volume > 1000 ? 'HIGH' : Math.abs(difference) * volume > 500 ? 'MEDIUM' : 'LOW'
    };
  });

  // Analyze AI Overview placements
  const aiOverviewKeywords = [];
  data.forEach(row => {
    let hasAIOverview = false;
    Object.entries(row).forEach(([key, value]) => {
      if (key.includes('_type') && value === 'ai overview') {
        hasAIOverview = true;
      }
    });

    if (hasAIOverview) {
      aiOverviewKeywords.push({
        keyword: row.Keyword,
        volume: parseInt(row['Search Volume']) || 0,
        position: getLatestPosition(row)
      });
    }
  });

  // Critical issues
  const critical = [];

  if (topPerformers.length === 0) {
    critical.push({
      issue: 'Zero keywords in top 10 positions',
      impact: 'Missing valuable traffic and conversions',
      action: 'Emergency SEO audit and optimization required',
      priority: 'CRITICAL'
    });
  }

  declines.forEach(decline => {
    if (decline.impact === 'HIGH') {
      critical.push({
        keyword: decline.keyword,
        issue: `Lost ${Math.abs(decline.change)} positions`,
        currentPosition: decline.currentPosition,
        volume: decline.volume,
        impact: decline.impact,
        action: 'Immediate investigation and recovery plan needed'
      });
    }
  });

  return {
    stats: {
      totalKeywords: data.length,
      top10: topPerformers.length,
      declined: declines.length,
      opportunities: opportunities.length
    },
    topPerformers,
    opportunities: opportunities.slice(0, 10),
    declines,
    aiOverview: aiOverviewKeywords,
    critical
  };
}

// ============================================================================
// LOCAL SEO ENDPOINTS
// ============================================================================

// Run Local SEO audit for a client
app.post('/api/local-seo/:clientId/run', async (req, res) => {
  const { clientId } = req.params;

  try {
    console.log(`Running Local SEO audit for ${clientId}...`);

    // Load client config (from your existing client configs)
    const clientConfigs = {
      instantautotraders: {
        id: 'instantautotraders',
        businessName: 'Instant Auto Traders',
        businessType: 'AutomotiveBusiness',
        siteUrl: 'https://instantautotraders.com.au',
        city: 'Sydney',
        state: 'NSW',
        country: 'AU'
      },
      hottyres: {
        id: 'hottyres',
        businessName: 'Hot Tyres',
        businessType: 'AutomotiveBusiness',
        siteUrl: 'https://hottyres.com.au',
        city: 'Sydney',
        state: 'NSW',
        country: 'AU'
      },
      sadc: {
        id: 'sadc',
        businessName: 'SADC Disability Services',
        businessType: 'LocalBusiness',
        siteUrl: 'https://sadcdisabilityservices.com.au',
        city: 'Sydney',
        state: 'NSW',
        country: 'AU'
      }
    };

    const config = clientConfigs[clientId];
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Run Local SEO audit
    const orchestrator = new LocalSEOOrchestrator(config);
    const results = await orchestrator.runCompleteAudit();

    // Store results in database
    db.localSeoOps.recordScore(clientId, {
      date: new Date().toISOString().split('T')[0],
      napScore: results.tasks?.napConsistency?.score || 0,
      hasSchema: results.tasks?.schema?.hasSchema || false,
      directoriesSubmitted: 0, // Will be tracked separately
      reviewsCount: 0, // Will be tracked separately
      issuesFound: results.tasks?.napConsistency?.issues?.length || 0,
      warningsFound: results.tasks?.napConsistency?.warnings?.length || 0,
      metadata: results
    });

    // Generate HTML report
    const reportGenerator = new LocalSEOReportGenerator(results, config);
    const reportDir = path.join(__dirname, 'logs', 'local-seo', clientId);
    await fs.mkdir(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, `report-${Date.now()}.html`);
    await reportGenerator.generateHTMLReport(reportPath);

    res.json({
      success: true,
      results,
      reportPath: `/reports/local-seo/${clientId}/${path.basename(reportPath)}`
    });

  } catch (error) {
    console.error('Local SEO error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get latest Local SEO score
app.get('/api/local-seo/:clientId/latest', (req, res) => {
  const { clientId } = req.params;

  try {
    const latest = db.localSeoOps.getLatest(clientId);

    if (!latest) {
      return res.json({
        success: true,
        data: null,
        message: 'No Local SEO data yet. Run an audit first.'
      });
    }

    res.json({
      success: true,
      data: {
        ...latest,
        metadata: latest.metadata ? JSON.parse(latest.metadata) : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Local SEO trend
app.get('/api/local-seo/:clientId/trend', (req, res) => {
  const { clientId } = req.params;
  const { days = 90 } = req.query;

  try {
    const trend = db.localSeoOps.getTrend(clientId, parseInt(days));

    res.json({
      success: true,
      data: trend.map(row => ({
        date: row.date,
        napScore: row.nap_score,
        hasSchema: Boolean(row.has_schema),
        directoriesSubmitted: row.directories_submitted,
        reviewsCount: row.reviews_count
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Local SEO history
app.get('/api/local-seo/:clientId/history', (req, res) => {
  const { clientId } = req.params;
  const { limit = 30 } = req.query;

  try {
    const history = db.localSeoOps.getHistory(clientId, parseInt(limit));

    res.json({
      success: true,
      data: history.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// COMPETITOR TRACKING ENDPOINTS
// ============================================================================

import { CompetitorTracker } from './src/automation/competitor-tracker.js';
import { GoogleSearchConsole } from './src/automation/google-search-console.js';

// Run competitor tracking
app.post('/api/competitors/:clientId/run', async (req, res) => {
  const { clientId } = req.params;

  try {
    console.log(`Running competitor tracking for ${clientId}...`);

    // Load client config
    const clientConfigs = {
      instantautotraders: {
        id: 'instantautotraders',
        businessName: 'Instant Auto Traders',
        siteUrl: 'https://instantautotraders.com.au',
        industry: 'automotive',
        city: 'Sydney',
        gscPropertyUrl: 'sc-domain:instantautotraders.com.au'
      },
      hottyres: {
        id: 'hottyres',
        businessName: 'Hot Tyres',
        siteUrl: 'https://hottyres.com.au',
        industry: 'automotive-services',
        city: 'Sydney',
        gscPropertyUrl: 'sc-domain:hottyres.com.au'
      },
      sadc: {
        id: 'sadc',
        businessName: 'SADC Disability Services',
        siteUrl: 'https://sadcdisabilityservices.com.au',
        industry: 'disability-services',
        city: 'Sydney',
        gscPropertyUrl: 'sc-domain:sadcdisabilityservices.com.au'
      }
    };

    const config = clientConfigs[clientId];
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Fetch GSC data
    let gscData = null;
    try {
      const gscClient = new GoogleSearchConsole(config.gscPropertyUrl);
      gscData = await gscClient.getPerformanceData();
    } catch (error) {
      console.warn('GSC data unavailable:', error.message);
    }

    // Run competitor tracking
    const tracker = new CompetitorTracker(config, gscData);
    const results = await tracker.runCompleteAnalysis();

    // Store competitor rankings in database
    if (results.rankings) {
      Object.entries(results.rankings).forEach(([keyword, data]) => {
        data.competitors.forEach(comp => {
          db.competitorOps.recordRanking(clientId, {
            competitorDomain: comp.domain,
            competitorName: comp.name,
            keyword,
            yourPosition: data.yourPosition,
            theirPosition: comp.position,
            searchVolume: null,
            date: new Date().toISOString().split('T')[0],
            metadata: { snippet: comp.snippet }
          });
        });
      });
    }

    // Store alerts
    if (results.alerts) {
      results.alerts.forEach(alert => {
        db.competitorOps.createAlert(clientId, {
          competitorDomain: alert.competitor || 'unknown',
          type: alert.type || 'RANKING_GAP',
          severity: alert.severity,
          keyword: alert.keyword || null,
          message: alert.message,
          recommendation: alert.recommendation || null
        });
      });
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Competitor tracking error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get competitors list
app.get('/api/competitors/:clientId/list', (req, res) => {
  const { clientId } = req.params;

  try {
    const competitors = db.competitorOps.getCompetitorsList(clientId);

    res.json({
      success: true,
      data: competitors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get competitor rankings
app.get('/api/competitors/:clientId/rankings', (req, res) => {
  const { clientId } = req.params;
  const { competitor = null, limit = 100 } = req.query;

  try {
    const rankings = db.competitorOps.getRankings(
      clientId,
      competitor,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: rankings.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get competitor alerts
app.get('/api/competitors/:clientId/alerts', (req, res) => {
  const { clientId } = req.params;

  try {
    const alerts = db.competitorOps.getOpenAlerts(clientId);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Resolve competitor alert
app.put('/api/competitors/:clientId/alerts/:alertId/resolve', (req, res) => {
  const { alertId } = req.params;

  try {
    db.competitorOps.resolveAlert(parseInt(alertId));

    res.json({
      success: true,
      message: 'Alert resolved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENHANCED DASHBOARD ENDPOINTS
// ============================================================================

// Get comprehensive client dashboard data
app.get('/api/dashboard/:clientId/complete', (req, res) => {
  const { clientId } = req.params;
  const { days = 30 } = req.query;

  try {
    const dashboardData = db.analytics.getClientDashboard(clientId, parseInt(days));

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Bridge API - Connect SEO Expert ↔ SEO Analyst
// ============================================

/**
 * POST /api/bridge/send-results
 * Accept optimization results from SEO Expert automation
 * Store in database and make available for reporting
 */
app.post('/api/bridge/send-results', async (req, res) => {
  try {
    const {
      clientId,
      optimizationType,
      results,
      metadata
    } = req.body;

    if (!clientId || !optimizationType || !results) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId, optimizationType, results'
      });
    }

    // Store optimization in database
    const optimizationId = db.clientOps.recordOptimization(clientId, {
      type: optimizationType,
      pagesModified: results.pagesModified || 0,
      issuesFixed: results.issuesFixed || 0,
      expectedImpact: results.expectedImpact || 'Unknown',
      beforeState: results.before || {},
      afterState: results.after || {},
      metadata: metadata || {}
    });

    // If keywords were optimized, store in keyword_performance
    if (results.keywords && Array.isArray(results.keywords)) {
      results.keywords.forEach(kw => {
        db.keywordOps.recordPerformance(clientId, {
          keyword: kw.keyword,
          beforePosition: kw.beforePosition,
          afterPosition: kw.afterPosition || kw.beforePosition,
          url: kw.url,
          searchVolume: kw.volume || 0,
          optimizationId
        });
      });
    }

    // Log the bridge activity
    db.systemOps.log('info', 'bridge_api',
      `Received optimization results from SEO Expert for ${clientId}: ${optimizationType}`,
      { clientId, optimizationType, optimizationId }
    );

    res.json({
      success: true,
      optimizationId,
      message: 'Results stored successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Bridge API error:', error);
    db.systemOps.log('error', 'bridge_api', 'Failed to store optimization results', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/recent
 * Get recent optimization actions across all clients
 */
app.get('/api/bridge/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const recent = db.clientOps.getRecentOptimizations(limit);

    res.json({
      success: true,
      data: recent,
      count: recent.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/:clientId/history
 * Get optimization history for specific client
 */
app.get('/api/bridge/:clientId/history', (req, res) => {
  try {
    const { clientId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const days = parseInt(req.query.days) || 30;

    const history = db.clientOps.getOptimizationHistory(clientId, days);

    res.json({
      success: true,
      clientId,
      data: history,
      count: history.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/:clientId/roi
 * Calculate ROI for a client based on optimization history
 */
app.get('/api/bridge/:clientId/roi', (req, res) => {
  try {
    const { clientId } = req.params;
    const days = parseInt(req.query.days) || 90;

    // Get optimization history
    const history = db.clientOps.getOptimizationHistory(clientId, days);

    // Get keyword performance improvements
    const keywordImprovements = db.keywordOps.getImprovements(clientId, days);

    // Calculate ROI metrics
    const roi = {
      timeframe: `${days} days`,
      totalOptimizations: history.length,
      pagesModified: history.reduce((sum, opt) => sum + (opt.pagesModified || 0), 0),
      issuesFixed: history.reduce((sum, opt) => sum + (opt.issuesFixed || 0), 0),
      keywordImprovements: {
        total: keywordImprovements.length,
        improved: keywordImprovements.filter(k => k.positionChange < 0).length, // negative is better
        declined: keywordImprovements.filter(k => k.positionChange > 0).length,
        stable: keywordImprovements.filter(k => k.positionChange === 0).length
      },
      averagePositionChange: keywordImprovements.length > 0
        ? (keywordImprovements.reduce((sum, k) => sum + k.positionChange, 0) / keywordImprovements.length).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      clientId,
      roi
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/:clientId/unified
 * Get unified view of automation + reporting data
 */
app.get('/api/bridge/:clientId/unified', async (req, res) => {
  try {
    const { clientId } = req.params;
    const days = parseInt(req.query.days) || 30;

    // Get complete client dashboard from database
    const dashboardData = db.analytics.getClientDashboard(clientId, days);

    // Get ROI data
    const roiData = await fetch(`http://localhost:${PORT}/api/bridge/${clientId}/roi?days=${days}`)
      .then(r => r.json())
      .catch(() => ({ success: false }));

    // Combine everything
    const unified = {
      client: dashboardData.client,
      automation: {
        localSeo: dashboardData.localSeo,
        competitors: dashboardData.competitors,
        keywords: dashboardData.keywords,
        gsc: dashboardData.gsc
      },
      optimizations: {
        history: dashboardData.optimizations.recent,
        stats: dashboardData.optimizations.stats,
        roi: roiData.success ? roiData.roi : null
      },
      autoFixes: dashboardData.autoFixes,
      reports: dashboardData.reports
    };

    res.json({
      success: true,
      clientId,
      data: unified
    });
  } catch (error) {
    console.error('❌ Unified view error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve Local SEO reports
app.use('/reports/local-seo', express.static(path.join(__dirname, 'logs', 'local-seo')));

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(70));
  console.log('🚀 SEO Automation Dashboard Server');
  console.log('='.repeat(70));
  console.log('');
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('📊 API Endpoints Available:');
  console.log('   → Local SEO: /api/local-seo/:clientId/run');
  console.log('   → Competitors: /api/competitors/:clientId/run');
  console.log('   → Complete Dashboard: /api/dashboard/:clientId/complete');
  console.log('   → Bridge API: /api/bridge/send-results (POST)');
  console.log('   → Unified View: /api/bridge/:clientId/unified');
  console.log('   → ROI Metrics: /api/bridge/:clientId/roi');
  console.log('');
  console.log('🔗 SEO Expert ↔ SEO Analyst Bridge Active');
  console.log('');
  console.log('Open your browser and navigate to the URL above');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});
