/**
 * Historical Audit Data Storage
 *
 * Simple JSON-based database for storing audit history, performance metrics,
 * and client statistics over time.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'history.json');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    audits: [],
    dailyStats: [],
    performanceHistory: [],
    clientMetrics: {}
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
    console.error('Error reading database:', error);
    return {
      audits: [],
      dailyStats: [],
      performanceHistory: [],
      clientMetrics: {}
    };
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
    console.error('Error writing database:', error);
    return false;
  }
}

/**
 * Add audit record
 */
export function addAuditRecord(clientId, auditData) {
  const db = readDB();

  const record = {
    id: `audit_${Date.now()}_${clientId}`,
    clientId,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    ...auditData
  };

  db.audits.push(record);

  // Keep only last 1000 audits
  if (db.audits.length > 1000) {
    db.audits = db.audits.slice(-1000);
  }

  writeDB(db);
  return record;
}

/**
 * Get audit history for a client
 */
export function getClientAuditHistory(clientId, limit = 50) {
  const db = readDB();
  return db.audits
    .filter(a => a.clientId === clientId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

/**
 * Get all audit history
 */
export function getAllAuditHistory(limit = 100) {
  const db = readDB();
  return db.audits
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

/**
 * Add daily statistics
 */
export function addDailyStats(stats) {
  const db = readDB();

  const record = {
    id: `stats_${Date.now()}`,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    ...stats
  };

  db.dailyStats.push(record);

  // Keep only last 365 days
  if (db.dailyStats.length > 365) {
    db.dailyStats = db.dailyStats.slice(-365);
  }

  writeDB(db);
  return record;
}

/**
 * Get daily stats history
 */
export function getDailyStatsHistory(days = 30) {
  const db = readDB();
  return db.dailyStats
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, days);
}

/**
 * Add performance metric
 */
export function addPerformanceMetric(clientId, metric) {
  const db = readDB();

  const record = {
    id: `perf_${Date.now()}_${clientId}`,
    clientId,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    ...metric
  };

  db.performanceHistory.push(record);

  // Keep only last 2000 metrics
  if (db.performanceHistory.length > 2000) {
    db.performanceHistory = db.performanceHistory.slice(-2000);
  }

  writeDB(db);
  return record;
}

/**
 * Get performance history for a client
 */
export function getClientPerformanceHistory(clientId, limit = 50) {
  const db = readDB();
  return db.performanceHistory
    .filter(p => p.clientId === clientId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

/**
 * Get all performance history
 */
export function getAllPerformanceHistory(limit = 100) {
  const db = readDB();
  return db.performanceHistory
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

/**
 * Update client metrics
 */
export function updateClientMetrics(clientId, metrics) {
  const db = readDB();

  if (!db.clientMetrics[clientId]) {
    db.clientMetrics[clientId] = {
      firstSeen: new Date().toISOString(),
      totalAudits: 0,
      totalOptimizations: 0,
      averageScore: 0,
      lastUpdate: new Date().toISOString()
    };
  }

  db.clientMetrics[clientId] = {
    ...db.clientMetrics[clientId],
    ...metrics,
    lastUpdate: new Date().toISOString()
  };

  writeDB(db);
  return db.clientMetrics[clientId];
}

/**
 * Get client metrics
 */
export function getClientMetrics(clientId) {
  const db = readDB();
  return db.clientMetrics[clientId] || null;
}

/**
 * Get all client metrics
 */
export function getAllClientMetrics() {
  const db = readDB();
  return db.clientMetrics;
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary() {
  const db = readDB();

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const recentAudits = db.audits.filter(
    a => new Date(a.timestamp) > last30Days
  );

  const totalAudits = db.audits.length;
  const totalClients = Object.keys(db.clientMetrics).length;

  // Calculate average scores
  const scoresWithValues = recentAudits
    .map(a => a.score || a.performanceScore || 0)
    .filter(s => s > 0);

  const averageScore = scoresWithValues.length > 0
    ? scoresWithValues.reduce((sum, s) => sum + s, 0) / scoresWithValues.length
    : 0;

  return {
    totalAudits,
    totalClients,
    recentAudits: recentAudits.length,
    averageScore: Math.round(averageScore * 10) / 10,
    last30Days: recentAudits.length,
    clientMetrics: db.clientMetrics,
    lastUpdate: new Date().toISOString()
  };
}

/**
 * Clear old data (maintenance)
 */
export function clearOldData(daysToKeep = 90) {
  const db = readDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  db.audits = db.audits.filter(
    a => new Date(a.timestamp) > cutoffDate
  );

  db.performanceHistory = db.performanceHistory.filter(
    p => new Date(p.timestamp) > cutoffDate
  );

  writeDB(db);
  return true;
}

export default {
  addAuditRecord,
  getClientAuditHistory,
  getAllAuditHistory,
  addDailyStats,
  getDailyStatsHistory,
  addPerformanceMetric,
  getClientPerformanceHistory,
  getAllPerformanceHistory,
  updateClientMetrics,
  getClientMetrics,
  getAllClientMetrics,
  getAnalyticsSummary,
  clearOldData
};
