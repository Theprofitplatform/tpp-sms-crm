/**
 * Auto-Fix Database
 *
 * Stores detailed logs of auto-fix operations including:
 * - What was changed (before/after values)
 * - Pages/posts affected
 * - Success/failure status
 * - Error details
 * - Engine configuration at time of run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'autofix-logs.json');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    engines: [
      {
        id: 'content-optimizer',
        name: 'Content Optimizer',
        description: 'Optimizes content quality, keyword density, headings, and image alt text',
        category: 'on-page',
        impact: 'high',
        enabled: true,
        fixesApplied: 0,
        successRate: 0,
        lastRun: null
      },
      {
        id: 'nap-fixer',
        name: 'NAP Consistency Fixer',
        description: 'Ensures Name, Address, Phone consistency across entire site',
        category: 'local-seo',
        impact: 'high',
        enabled: true,
        fixesApplied: 0,
        successRate: 0,
        lastRun: null
      },
      {
        id: 'schema-injector',
        name: 'Schema Markup Injector',
        description: 'Injects LocalBusiness schema markup for better search visibility',
        category: 'technical',
        impact: 'medium',
        enabled: true,
        fixesApplied: 0,
        successRate: 0,
        lastRun: null
      },
      {
        id: 'title-meta-optimizer',
        name: 'Title/Meta Optimizer',
        description: 'Optimizes page titles and meta descriptions for target keywords',
        category: 'on-page',
        impact: 'high',
        enabled: true,
        fixesApplied: 0,
        successRate: 0,
        lastRun: null
      }
    ],
    fixLogs: [],
    runHistory: []
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

/**
 * Read database
 */
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading autofix database:', error);
    return { engines: [], fixLogs: [], runHistory: [] };
  }
}

/**
 * Write database
 */
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing autofix database:', error);
    return false;
  }
}

/**
 * Get all engines
 */
export function getEngines() {
  const db = readDB();
  return db.engines || [];
}

/**
 * Get specific engine
 */
export function getEngine(engineId) {
  const db = readDB();
  return db.engines.find(e => e.id === engineId);
}

/**
 * Update engine status
 */
export function toggleEngine(engineId, enabled) {
  const db = readDB();
  const engine = db.engines.find(e => e.id === engineId);
  
  if (engine) {
    engine.enabled = enabled;
    writeDB(db);
    return engine;
  }
  
  return null;
}

/**
 * Add fix run to history
 */
export function addFixRun(data) {
  const db = readDB();
  
  const run = {
    id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    engineId: data.engineId,
    engineName: data.engineName,
    clientId: data.clientId,
    clientName: data.clientName,
    status: data.status, // 'success', 'partial', 'failed'
    fixesApplied: data.fixesApplied || 0,
    issuesFound: data.issuesFound || 0,
    failedFixes: data.failedFixes || 0,
    duration: data.duration || 0,
    error: data.error || null,
    createdAt: new Date().toISOString(),
    timestamp: Date.now()
  };
  
  db.runHistory.push(run);
  
  // Keep only last 500 runs
  if (db.runHistory.length > 500) {
    db.runHistory = db.runHistory.slice(-500);
  }
  
  // Update engine stats
  const engine = db.engines.find(e => e.id === data.engineId);
  if (engine) {
    engine.fixesApplied = (engine.fixesApplied || 0) + (data.fixesApplied || 0);
    engine.lastRun = new Date().toISOString();
    
    // Calculate success rate from recent runs
    const recentRuns = db.runHistory
      .filter(r => r.engineId === data.engineId)
      .slice(-20);
    
    const successfulRuns = recentRuns.filter(r => r.status === 'success').length;
    engine.successRate = recentRuns.length > 0 
      ? Math.round((successfulRuns / recentRuns.length) * 100)
      : 0;
  }
  
  writeDB(db);
  return run;
}

/**
 * Add detailed fix log
 */
export function addFixLog(data) {
  const db = readDB();
  
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    runId: data.runId,
    engineId: data.engineId,
    clientId: data.clientId,
    pageId: data.pageId,
    pageTitle: data.pageTitle,
    pageUrl: data.pageUrl,
    fixType: data.fixType, // 'h1-fix', 'meta-description', 'image-alt', 'nap-consistency', etc.
    field: data.field, // 'title', 'content', 'meta', etc.
    oldValue: data.oldValue,
    newValue: data.newValue,
    status: data.status, // 'success', 'failed'
    error: data.error || null,
    createdAt: new Date().toISOString(),
    timestamp: Date.now()
  };
  
  db.fixLogs.push(log);
  
  // Keep only last 2000 logs
  if (db.fixLogs.length > 2000) {
    db.fixLogs = db.fixLogs.slice(-2000);
  }
  
  writeDB(db);
  return log;
}

/**
 * Get run history with filters
 */
export function getRunHistory(filters = {}) {
  const db = readDB();
  let history = db.runHistory || [];
  
  // Apply filters
  if (filters.engineId) {
    history = history.filter(r => r.engineId === filters.engineId);
  }
  
  if (filters.clientId) {
    history = history.filter(r => r.clientId === filters.clientId);
  }
  
  if (filters.status) {
    history = history.filter(r => r.status === filters.status);
  }
  
  if (filters.startDate) {
    const startTime = new Date(filters.startDate).getTime();
    history = history.filter(r => r.timestamp >= startTime);
  }
  
  if (filters.endDate) {
    const endTime = new Date(filters.endDate).getTime();
    history = history.filter(r => r.timestamp <= endTime);
  }
  
  // Sort by most recent first
  history.sort((a, b) => b.timestamp - a.timestamp);
  
  // Limit results
  const limit = filters.limit || 50;
  return history.slice(0, limit);
}

/**
 * Get detailed fix logs for a specific run
 */
export function getFixLogsForRun(runId) {
  const db = readDB();
  return (db.fixLogs || [])
    .filter(log => log.runId === runId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get fix logs with filters
 */
export function getFixLogs(filters = {}) {
  const db = readDB();
  let logs = db.fixLogs || [];
  
  // Apply filters
  if (filters.runId) {
    logs = logs.filter(l => l.runId === filters.runId);
  }
  
  if (filters.engineId) {
    logs = logs.filter(l => l.engineId === filters.engineId);
  }
  
  if (filters.clientId) {
    logs = logs.filter(l => l.clientId === filters.clientId);
  }
  
  if (filters.pageId) {
    logs = logs.filter(l => l.pageId === filters.pageId);
  }
  
  if (filters.status) {
    logs = logs.filter(l => l.status === filters.status);
  }
  
  // Sort by most recent first
  logs.sort((a, b) => b.timestamp - a.timestamp);
  
  // Limit results
  const limit = filters.limit || 100;
  return logs.slice(0, limit);
}

/**
 * Get statistics
 */
export function getStats() {
  const db = readDB();
  
  const totalRuns = db.runHistory.length;
  const successfulRuns = db.runHistory.filter(r => r.status === 'success').length;
  const totalFixes = db.runHistory.reduce((sum, r) => sum + (r.fixesApplied || 0), 0);
  const totalIssues = db.runHistory.reduce((sum, r) => sum + (r.issuesFound || 0), 0);
  
  return {
    totalRuns,
    successfulRuns,
    failedRuns: totalRuns - successfulRuns,
    totalFixes,
    totalIssues,
    successRate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0
  };
}

export default {
  getEngines,
  getEngine,
  toggleEngine,
  addFixRun,
  addFixLog,
  getRunHistory,
  getFixLogsForRun,
  getFixLogs,
  getStats
};
