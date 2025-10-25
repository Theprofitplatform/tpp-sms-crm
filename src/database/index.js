/**
 * SEO AUTOMATION DATABASE
 *
 * SQLite database for historical tracking and analytics
 * Stores all optimization history, trends, and metrics
 *
 * @module database
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance

/**
 * Database Schema
 */
const SCHEMA = `
-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  business_type TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optimization history
CREATE TABLE IF NOT EXISTS optimization_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL, -- 'keyword', 'content', 'technical', 'local-seo'
  target TEXT, -- keyword, page URL, etc.
  before_value TEXT,
  after_value TEXT,
  impact_score INTEGER, -- 0-100
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  metadata TEXT, -- JSON string for additional data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_optimization_client_date ON optimization_history(client_id, date);
CREATE INDEX IF NOT EXISTS idx_optimization_type ON optimization_history(type);

-- Local SEO scores
CREATE TABLE IF NOT EXISTS local_seo_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  nap_score INTEGER, -- 0-100
  has_schema BOOLEAN DEFAULT 0,
  directories_submitted INTEGER DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  warnings_found INTEGER DEFAULT 0,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_local_seo_client_date ON local_seo_scores(client_id, date);

-- Competitor rankings
CREATE TABLE IF NOT EXISTS competitor_rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  competitor_domain TEXT NOT NULL,
  competitor_name TEXT,
  keyword TEXT NOT NULL,
  your_position INTEGER,
  their_position INTEGER,
  search_volume INTEGER,
  date DATE NOT NULL,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_competitor_client_date ON competitor_rankings(client_id, date);
CREATE INDEX IF NOT EXISTS idx_competitor_keyword ON competitor_rankings(keyword);

-- Competitor alerts
CREATE TABLE IF NOT EXISTS competitor_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  competitor_domain TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'ranking_gap', 'position_loss', 'new_competitor'
  severity TEXT NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW'
  keyword TEXT,
  message TEXT NOT NULL,
  recommendation TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'resolved'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_alerts_client_status ON competitor_alerts(client_id, status);

-- Keyword performance
CREATE TABLE IF NOT EXISTS keyword_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  position INTEGER,
  impressions INTEGER,
  clicks INTEGER,
  ctr REAL,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_keyword_client_date ON keyword_performance(client_id, date);
CREATE INDEX IF NOT EXISTS idx_keyword_text ON keyword_performance(keyword);

-- GSC metrics (daily snapshots)
CREATE TABLE IF NOT EXISTS gsc_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_clicks INTEGER,
  total_impressions INTEGER,
  average_ctr REAL,
  average_position REAL,
  metadata TEXT, -- JSON string for additional metrics
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  UNIQUE(client_id, date)
);
CREATE INDEX IF NOT EXISTS idx_gsc_client_date ON gsc_metrics(client_id, date);

-- Auto-fix actions
CREATE TABLE IF NOT EXISTS auto_fix_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  fix_type TEXT NOT NULL, -- 'nap_consistency', 'schema_injection', 'title_optimization'
  target TEXT, -- page URL, element identifier
  action_taken TEXT NOT NULL,
  before_state TEXT,
  after_state TEXT,
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'rolled_back'
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_autofix_client_date ON auto_fix_actions(client_id, created_at);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL, -- 'info', 'warning', 'error'
  category TEXT, -- 'automation', 'api', 'database'
  message TEXT NOT NULL,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_logs_level_date ON system_logs(level, created_at);

-- Reports generated
CREATE TABLE IF NOT EXISTS reports_generated (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'local_seo', 'competitor', 'keyword', 'comprehensive'
  file_path TEXT,
  format TEXT, -- 'html', 'json', 'pdf'
  size_bytes INTEGER,
  generation_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_reports_client_date ON reports_generated(client_id, created_at);

-- Client portal access logs
CREATE TABLE IF NOT EXISTS portal_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  action TEXT, -- 'login', 'view_report', 'download_report'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_portal_client_date ON portal_access_logs(client_id, created_at);

-- Competitor response performance tracking
CREATE TABLE IF NOT EXISTS response_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  keyword TEXT,
  position_before INTEGER,
  position_after INTEGER,
  status TEXT DEFAULT 'tracking', -- 'tracking', 'success', 'failed', 'pending'
  tracked_at DATETIME,
  evaluated_at DATETIME,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_response_client_task ON response_performance(client_id, task_id);
`;

/**
 * Initialize database with schema
 */
export function initializeDatabase() {
  console.log('🗄️  Initializing database...');

  try {
    db.exec(SCHEMA);
    console.log('✅ Database schema created/verified');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Client Operations
 */
export const clientOps = {
  /**
   * Add or update client
   */
  upsert(client) {
    const stmt = db.prepare(`
      INSERT INTO clients (id, name, domain, business_type, city, state, country, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        domain = excluded.domain,
        business_type = excluded.business_type,
        city = excluded.city,
        state = excluded.state,
        country = excluded.country,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `);

    return stmt.run(
      client.id,
      client.name,
      client.domain,
      client.businessType || null,
      client.city || null,
      client.state || null,
      client.country || null,
      client.status || 'active'
    );
  },

  /**
   * Get client by ID
   */
  getById(clientId) {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    return stmt.get(clientId);
  },

  /**
   * Get all clients
   */
  getAll() {
    const stmt = db.prepare('SELECT * FROM clients ORDER BY name');
    return stmt.all();
  },

  /**
   * Get active clients
   */
  getActive() {
    const stmt = db.prepare('SELECT * FROM clients WHERE status = ? ORDER BY name');
    return stmt.all('active');
  },

  /**
   * Record optimization for a client
   */
  recordOptimization(clientId, optimization) {
    const stmt = db.prepare(`
      INSERT INTO optimization_history
      (client_id, date, type, target, before_value, after_value, impact_score, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      clientId,
      optimization.date || new Date().toISOString().split('T')[0],
      optimization.type,
      optimization.target || null,
      JSON.stringify(optimization.beforeState || {}),
      JSON.stringify(optimization.afterState || {}),
      optimization.impactScore || 50,
      optimization.status || 'completed',
      JSON.stringify({
        pagesModified: optimization.pagesModified || 0,
        issuesFixed: optimization.issuesFixed || 0,
        expectedImpact: optimization.expectedImpact || 'Unknown',
        ...optimization.metadata
      })
    );

    return result.lastInsertRowid;
  },

  /**
   * Get optimization history for a client
   */
  getOptimizationHistory(clientId, days = 30) {
    const stmt = db.prepare(`
      SELECT * FROM optimization_history
      WHERE client_id = ?
        AND date >= date('now', '-' || ? || ' days')
      ORDER BY date DESC, created_at DESC
    `);
    return stmt.all(clientId, days);
  },

  /**
   * Get recent optimizations across all clients
   */
  getRecentOptimizations(limit = 20) {
    const stmt = db.prepare(`
      SELECT oh.*, c.name as client_name, c.domain as client_domain
      FROM optimization_history oh
      JOIN clients c ON oh.client_id = c.id
      ORDER BY oh.created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }
};

/**
 * Optimization History Operations
 */
export const optimizationOps = {
  /**
   * Record optimization
   */
  record(clientId, optimization) {
    const stmt = db.prepare(`
      INSERT INTO optimization_history
      (client_id, date, type, target, before_value, after_value, impact_score, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      clientId,
      optimization.date || new Date().toISOString().split('T')[0],
      optimization.type,
      optimization.target || null,
      optimization.beforeValue || null,
      optimization.afterValue || null,
      optimization.impactScore || 50,
      optimization.status || 'completed',
      JSON.stringify(optimization.metadata || {})
    );
  },

  /**
   * Get optimization history for client
   */
  getHistory(clientId, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM optimization_history
      WHERE client_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT ?
    `);
    return stmt.all(clientId, limit);
  },

  /**
   * Get optimizations by type
   */
  getByType(clientId, type, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM optimization_history
      WHERE client_id = ? AND type = ?
      ORDER BY date DESC
      LIMIT ?
    `);
    return stmt.all(clientId, type, limit);
  },

  /**
   * Get statistics
   */
  getStats(clientId, startDate = null, endDate = null) {
    let query = `
      SELECT
        type,
        COUNT(*) as count,
        AVG(impact_score) as avg_impact,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM optimization_history
      WHERE client_id = ?
    `;

    const params = [clientId];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' GROUP BY type';

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
};

/**
 * Local SEO Operations
 */
export const localSeoOps = {
  /**
   * Record Local SEO score
   */
  recordScore(clientId, score) {
    const stmt = db.prepare(`
      INSERT INTO local_seo_scores
      (client_id, date, nap_score, has_schema, directories_submitted, reviews_count, issues_found, warnings_found, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      clientId,
      score.date || new Date().toISOString().split('T')[0],
      score.napScore || 0,
      score.hasSchema ? 1 : 0,
      score.directoriesSubmitted || 0,
      score.reviewsCount || 0,
      score.issuesFound || 0,
      score.warningsFound || 0,
      JSON.stringify(score.metadata || {})
    );
  },

  /**
   * Get latest score
   */
  getLatest(clientId) {
    const stmt = db.prepare(`
      SELECT * FROM local_seo_scores
      WHERE client_id = ?
      ORDER BY date DESC
      LIMIT 1
    `);
    return stmt.get(clientId);
  },

  /**
   * Get score history
   */
  getHistory(clientId, limit = 30) {
    const stmt = db.prepare(`
      SELECT * FROM local_seo_scores
      WHERE client_id = ?
      ORDER BY date DESC
      LIMIT ?
    `);
    return stmt.all(clientId, limit);
  },

  /**
   * Get trend data
   */
  getTrend(clientId, days = 90) {
    const stmt = db.prepare(`
      SELECT date, nap_score, has_schema, directories_submitted, reviews_count
      FROM local_seo_scores
      WHERE client_id = ?
        AND date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `);
    return stmt.all(clientId, days);
  }
};

/**
 * Competitor Operations
 */
export const competitorOps = {
  /**
   * Record competitor ranking
   */
  recordRanking(clientId, ranking) {
    const stmt = db.prepare(`
      INSERT INTO competitor_rankings
      (client_id, competitor_domain, competitor_name, keyword, your_position, their_position, search_volume, date, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      clientId,
      ranking.competitorDomain,
      ranking.competitorName || null,
      ranking.keyword,
      ranking.yourPosition || null,
      ranking.theirPosition || null,
      ranking.searchVolume || null,
      ranking.date || new Date().toISOString().split('T')[0],
      JSON.stringify(ranking.metadata || {})
    );
  },

  /**
   * Get competitor rankings
   */
  getRankings(clientId, competitorDomain = null, limit = 100) {
    let query = `
      SELECT * FROM competitor_rankings
      WHERE client_id = ?
    `;

    const params = [clientId];

    if (competitorDomain) {
      query += ' AND competitor_domain = ?';
      params.push(competitorDomain);
    }

    query += ' ORDER BY date DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  /**
   * Get competitors list
   */
  getCompetitorsList(clientId) {
    const stmt = db.prepare(`
      SELECT
        competitor_domain as domain,
        competitor_name as name,
        COUNT(DISTINCT keyword) as keywordsTracked,
        AVG(their_position) as avgPosition,
        MAX(date) as lastChecked,
        SUM(CASE WHEN your_position > their_position THEN 1 ELSE 0 END) as outrankingCount
      FROM competitor_rankings
      WHERE client_id = ?
      GROUP BY competitor_domain
      ORDER BY keywordsTracked DESC
    `);
    return stmt.all(clientId);
  },

  /**
   * Create alert
   */
  createAlert(clientId, alert) {
    const stmt = db.prepare(`
      INSERT INTO competitor_alerts
      (client_id, competitor_domain, alert_type, severity, keyword, message, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      clientId,
      alert.competitorDomain,
      alert.type,
      alert.severity,
      alert.keyword || null,
      alert.message,
      alert.recommendation || null
    );

    return result.lastInsertRowid;
  },

  /**
   * Get open alerts
   */
  getOpenAlerts(clientId) {
    const stmt = db.prepare(`
      SELECT * FROM competitor_alerts
      WHERE client_id = ? AND status = 'open'
      ORDER BY
        CASE severity
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
        END,
        created_at DESC
    `);
    return stmt.all(clientId);
  },

  /**
   * Resolve alert
   */
  resolveAlert(alertId) {
    const stmt = db.prepare(`
      UPDATE competitor_alerts
      SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(alertId);
  }
};

/**
 * Keyword Performance Operations
 */
export const keywordOps = {
  /**
   * Record keyword performance
   */
  record(clientId, keyword, data) {
    const stmt = db.prepare(`
      INSERT INTO keyword_performance
      (client_id, keyword, position, impressions, clicks, ctr, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      clientId,
      keyword,
      data.position || null,
      data.impressions || 0,
      data.clicks || 0,
      data.ctr || 0,
      data.date || new Date().toISOString().split('T')[0]
    );
  },

  /**
   * Get keyword trend
   */
  getTrend(clientId, keyword, days = 90) {
    const stmt = db.prepare(`
      SELECT date, position, impressions, clicks, ctr
      FROM keyword_performance
      WHERE client_id = ? AND keyword = ?
        AND date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `);
    return stmt.all(clientId, keyword, days);
  },

  /**
   * Get top keywords
   */
  getTopKeywords(clientId, limit = 20) {
    const stmt = db.prepare(`
      SELECT
        keyword,
        AVG(position) as avg_position,
        SUM(clicks) as total_clicks,
        SUM(impressions) as total_impressions,
        AVG(ctr) as avg_ctr
      FROM keyword_performance
      WHERE client_id = ?
        AND date >= date('now', '-30 days')
      GROUP BY keyword
      ORDER BY total_clicks DESC
      LIMIT ?
    `);
    return stmt.all(clientId, limit);
  },

  /**
   * Record keyword performance with optimization context
   */
  recordPerformance(clientId, data) {
    const stmt = db.prepare(`
      INSERT INTO keyword_performance
      (client_id, keyword, position, impressions, clicks, ctr, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      clientId,
      data.keyword,
      data.afterPosition || data.beforePosition || null,
      data.impressions || 0,
      data.clicks || 0,
      data.ctr || 0,
      data.date || new Date().toISOString().split('T')[0]
    );
  },

  /**
   * Get keyword improvements over a period
   */
  getImprovements(clientId, days = 90) {
    const stmt = db.prepare(`
      WITH ranked_keywords AS (
        SELECT
          keyword,
          position,
          date,
          ROW_NUMBER() OVER (PARTITION BY keyword ORDER BY date DESC) as rn,
          ROW_NUMBER() OVER (PARTITION BY keyword ORDER BY date ASC) as rn_first
        FROM keyword_performance
        WHERE client_id = ?
          AND date >= date('now', '-' || ? || ' days')
          AND position IS NOT NULL
      )
      SELECT
        latest.keyword,
        first.position as initialPosition,
        latest.position as currentPosition,
        (latest.position - first.position) as positionChange,
        first.date as startDate,
        latest.date as endDate
      FROM ranked_keywords latest
      JOIN ranked_keywords first ON latest.keyword = first.keyword
      WHERE latest.rn = 1 AND first.rn_first = 1
        AND first.position IS NOT NULL AND latest.position IS NOT NULL
      ORDER BY positionChange ASC
    `);
    return stmt.all(clientId, days);
  }
};

/**
 * GSC Metrics Operations
 */
export const gscOps = {
  /**
   * Record daily metrics
   */
  recordDaily(clientId, metrics) {
    const stmt = db.prepare(`
      INSERT INTO gsc_metrics
      (client_id, date, total_clicks, total_impressions, average_ctr, average_position, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id, date) DO UPDATE SET
        total_clicks = excluded.total_clicks,
        total_impressions = excluded.total_impressions,
        average_ctr = excluded.average_ctr,
        average_position = excluded.average_position,
        metadata = excluded.metadata
    `);

    return stmt.run(
      clientId,
      metrics.date || new Date().toISOString().split('T')[0],
      metrics.clicks || 0,
      metrics.impressions || 0,
      metrics.ctr || 0,
      metrics.position || 0,
      JSON.stringify(metrics.metadata || {})
    );
  },

  /**
   * Get metrics trend
   */
  getTrend(clientId, days = 90) {
    const stmt = db.prepare(`
      SELECT * FROM gsc_metrics
      WHERE client_id = ?
        AND date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `);
    return stmt.all(clientId, days);
  }
};

/**
 * Auto-Fix Operations
 */
export const autoFixOps = {
  /**
   * Record auto-fix action
   */
  record(clientId, action) {
    const stmt = db.prepare(`
      INSERT INTO auto_fix_actions
      (client_id, fix_type, target, action_taken, before_state, after_state, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      clientId,
      action.fixType,
      action.target || null,
      action.actionTaken,
      action.beforeState || null,
      action.afterState || null,
      action.status || 'completed',
      action.errorMessage || null
    );
  },

  /**
   * Get fix history
   */
  getHistory(clientId, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM auto_fix_actions
      WHERE client_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(clientId, limit);
  },

  /**
   * Get stats
   */
  getStats(clientId) {
    const stmt = db.prepare(`
      SELECT
        fix_type,
        COUNT(*) as total_fixes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_fixes,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_fixes
      FROM auto_fix_actions
      WHERE client_id = ?
      GROUP BY fix_type
    `);
    return stmt.all(clientId);
  }
};

/**
 * System Logs
 */
export const logsOps = {
  /**
   * Add log entry
   */
  add(level, category, message, metadata = null) {
    const stmt = db.prepare(`
      INSERT INTO system_logs (level, category, message, metadata)
      VALUES (?, ?, ?, ?)
    `);

    return stmt.run(
      level,
      category || null,
      message,
      metadata ? JSON.stringify(metadata) : null
    );
  },

  /**
   * Alias for add() - more semantic naming
   */
  log(level, category, message, metadata = null) {
    return this.add(level, category, message, metadata);
  },

  /**
   * Get recent logs
   */
  getRecent(limit = 100, level = null) {
    let query = 'SELECT * FROM system_logs';
    const params = [];

    if (level) {
      query += ' WHERE level = ?';
      params.push(level);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
};

// Alias for more semantic naming
export const systemOps = logsOps;

/**
 * Reports Operations
 */
export const reportsOps = {
  /**
   * Record generated report
   */
  record(clientId, report) {
    const stmt = db.prepare(`
      INSERT INTO reports_generated
      (client_id, report_type, file_path, format, size_bytes, generation_time_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      clientId,
      report.type,
      report.filePath || null,
      report.format || 'html',
      report.sizeBytes || 0,
      report.generationTimeMs || 0
    );
  },

  /**
   * Get report history
   */
  getHistory(clientId, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM reports_generated
      WHERE client_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(clientId, limit);
  }
};

/**
 * Analytics/Dashboard Queries
 */
export const analytics = {
  /**
   * Get client dashboard data
   */
  getClientDashboard(clientId, days = 30) {
    const data = {
      client: clientOps.getById(clientId),
      localSeo: {
        latest: localSeoOps.getLatest(clientId),
        trend: localSeoOps.getTrend(clientId, days)
      },
      competitors: {
        list: competitorOps.getCompetitorsList(clientId),
        alerts: competitorOps.getOpenAlerts(clientId)
      },
      keywords: {
        top: keywordOps.getTopKeywords(clientId, 10)
      },
      gsc: {
        trend: gscOps.getTrend(clientId, days)
      },
      optimizations: {
        stats: optimizationOps.getStats(clientId),
        recent: optimizationOps.getHistory(clientId, 10)
      },
      autoFixes: {
        stats: autoFixOps.getStats(clientId),
        recent: autoFixOps.getHistory(clientId, 10)
      },
      reports: reportsOps.getHistory(clientId, 5)
    };

    return data;
  },

  /**
   * Get system overview
   */
  getSystemOverview() {
    const clients = clientOps.getAll();

    return {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'active').length,
      systemHealth: {
        // Add system health metrics
      }
    };
  }
};

// Initialize on import
initializeDatabase();

// Export database instance for custom queries
export { db };

export default {
  initializeDatabase,
  clientOps,
  optimizationOps,
  localSeoOps,
  competitorOps,
  keywordOps,
  gscOps,
  autoFixOps,
  logsOps,
  systemOps,
  reportsOps,
  analytics,
  db
};
