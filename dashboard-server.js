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
import { createServer } from 'http';
import { Server } from 'socket.io';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import historyDB from './src/database/history-db.js';
import apiV2Router from './src/api/v2/index.js';
import cookieParser from 'cookie-parser';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = 9000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Serve the new React dashboard (built version)
// Uncomment this after building the dashboard with: cd dashboard && npm run build
// app.use(express.static('dashboard/dist'));

// Serve legacy public files
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
    const startTime = Date.now();
    const { stdout } = await execAsync(`node client-manager.js audit ${clientId}`);
    const duration = Date.now() - startTime;

    // Store audit in history
    historyDB.addAuditRecord(clientId, {
      type: 'audit',
      success: true,
      duration,
      output: stdout.substring(0, 500) // Store first 500 chars
    });

    // Update client metrics
    const metrics = historyDB.getClientMetrics(clientId) || {};
    historyDB.updateClientMetrics(clientId, {
      ...metrics,
      totalAudits: (metrics.totalAudits || 0) + 1
    });

    // Broadcast real-time update
    broadcastUpdate('audit-completed', {
      clientId,
      success: true,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      output: stdout
    });
  } catch (error) {
    // Store failed audit
    historyDB.addAuditRecord(clientId, {
      type: 'audit',
      success: false,
      error: error.message
    });

    broadcastUpdate('audit-failed', {
      clientId,
      error: error.message,
      timestamp: new Date().toISOString()
    });

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
    const startTime = Date.now();
    const { stdout } = await execAsync(`node client-manager.js optimize ${clientId}`);
    const duration = Date.now() - startTime;

    // Store optimization in history
    historyDB.addAuditRecord(clientId, {
      type: 'optimization',
      success: true,
      duration,
      output: stdout.substring(0, 500)
    });

    // Update client metrics
    const metrics = historyDB.getClientMetrics(clientId) || {};
    historyDB.updateClientMetrics(clientId, {
      ...metrics,
      totalOptimizations: (metrics.totalOptimizations || 0) + 1
    });

    // Broadcast real-time update
    broadcastUpdate('optimization-completed', {
      clientId,
      success: true,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      output: stdout
    });
  } catch (error) {
    // Store failed optimization
    historyDB.addAuditRecord(clientId, {
      type: 'optimization',
      success: false,
      error: error.message
    });

    broadcastUpdate('optimization-failed', {
      clientId,
      error: error.message,
      timestamp: new Date().toISOString()
    });

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast real-time updates
function broadcastUpdate(event, data) {
  io.emit(event, data);
}

// Analytics API endpoints

// Get analytics summary
app.get('/api/analytics/summary', (req, res) => {
  try {
    const summary = historyDB.getAnalyticsSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get client performance history
app.get('/api/analytics/client/:clientId/performance', (req, res) => {
  const { clientId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const history = historyDB.getClientPerformanceHistory(clientId, limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get client audit history
app.get('/api/analytics/client/:clientId/audits', (req, res) => {
  const { clientId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const history = historyDB.getClientAuditHistory(clientId, limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all performance history
app.get('/api/analytics/performance', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;

  try {
    const history = historyDB.getAllPerformanceHistory(limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get daily stats history
app.get('/api/analytics/daily-stats', (req, res) => {
  const days = parseInt(req.query.days) || 30;

  try {
    const stats = historyDB.getDailyStatsHistory(days);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all client metrics
app.get('/api/analytics/clients/metrics', (req, res) => {
  try {
    const metrics = historyDB.getAllClientMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// API V2 ROUTES - Unified Keyword Management
// ============================================

console.log('[API v2] Mounting unified keyword management API...');
app.use('/api/v2', apiV2Router);
console.log('[API v2] Routes available at /api/v2/*');

// ============================================
// KEYWORD RESEARCH PROXY ROUTES (Legacy)
// ============================================

const KEYWORD_SERVICE_URL = 'http://localhost:5000';

console.log('[Keyword Service] Configuring proxy to:', KEYWORD_SERVICE_URL);

// Proxy all keyword research requests to Python service
app.use('/api/keyword', createProxyMiddleware({
  target: KEYWORD_SERVICE_URL,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Keyword Service] Proxying ${req.method} ${req.url} -> ${KEYWORD_SERVICE_URL}${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('[Keyword Service] Proxy error:', err.message);
    res.status(503).json({
      success: false,
      error: 'Keyword research service unavailable',
      message: 'Please ensure the Python keyword service is running on port 5000',
      details: err.message
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[Keyword Service] Response ${proxyRes.statusCode} for ${req.url}`);
  }
}));

console.log('[Keyword Service] Proxy configured for /api/keyword/*');

// Start server
httpServer.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(70));
  console.log('🚀 SEO Automation Dashboard Server');
  console.log('='.repeat(70));
  console.log('');
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log('✅ Real-time updates: WebSocket enabled');
  console.log('✅ Analytics API: Available');
  console.log('✅ API v2: Unified keyword management at /api/v2');
  console.log('');
  console.log('📚 API Documentation:');
  console.log(`   - API v2 Docs: http://localhost:${PORT}/api/v2`);
  console.log(`   - Health Check: http://localhost:${PORT}/api/v2/health`);
  console.log(`   - Keywords: http://localhost:${PORT}/api/v2/keywords`);
  console.log(`   - Research: http://localhost:${PORT}/api/v2/research/projects`);
  console.log(`   - Sync: http://localhost:${PORT}/api/v2/sync/status`);
  console.log('');
  console.log('Open your browser and navigate to the URL above');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});
