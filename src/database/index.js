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
  report_type TEXT NOT NULL, -- 'local_seo', 'competitor', 'keyword', 'comprehensive', 'monthly', 'weekly'
  file_path TEXT,
  format TEXT, -- 'html', 'json', 'pdf'
  size_bytes INTEGER,
  generation_time_ms INTEGER,
  pdf_path TEXT,
  pdf_size INTEGER,
  pdf_filename TEXT,
  email_sent BOOLEAN DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  period TEXT, -- e.g., 'October 2025', '2025-10'
  metadata TEXT, -- JSON string for additional data
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

-- Users (authentication)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'client', -- 'client', 'admin'
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_client ON users(client_id);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  used BOOLEAN DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);

-- Authentication activity log
CREATE TABLE IF NOT EXISTS auth_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL, -- 'login_success', 'login_failed', 'logout', 'password_changed', 'register'
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_auth_activity_user_date ON auth_activity_log(user_id, created_at);

-- Leads (from lead magnet)
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  website TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
  audit_completed BOOLEAN DEFAULT 0,
  audit_score INTEGER,
  conversion_status TEXT DEFAULT 'pending', -- 'pending', 'converted', 'declined'
  source TEXT DEFAULT 'lead_magnet',
  notes TEXT,
  metadata TEXT, -- JSON string
  contacted_at DATETIME,
  converted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- Lead tracking events
CREATE TABLE IF NOT EXISTS lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- 'audit_viewed', 'book_call_clicked', 'email_sent', 'contacted', etc.
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_date ON lead_events(lead_id, created_at);

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'welcome', 'follow_up', 'nurture', 'reengagement'
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'archived'
  trigger_event TEXT, -- 'lead_captured', 'audit_viewed', 'manual'
  delay_hours INTEGER DEFAULT 0,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  from_name TEXT DEFAULT 'SEO Expert',
  from_email TEXT,
  reply_to TEXT,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_trigger ON email_campaigns(trigger_event);

-- Email sequences
CREATE TABLE IF NOT EXISTS email_sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  delay_hours INTEGER DEFAULT 0, -- Delay after previous email or trigger
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'paused'
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id)
);
CREATE INDEX IF NOT EXISTS idx_sequences_campaign ON email_sequences(campaign_id, sequence_order);

-- Email queue
CREATE TABLE IF NOT EXISTS email_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  campaign_id INTEGER,
  sequence_id INTEGER,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  reply_to TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed', 'cancelled'
  scheduled_for DATETIME NOT NULL,
  sent_at DATETIME,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id),
  FOREIGN KEY (sequence_id) REFERENCES email_sequences(id)
);
CREATE INDEX IF NOT EXISTS idx_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_queue_lead ON email_queue(lead_id);

-- Email tracking
CREATE TABLE IF NOT EXISTS email_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id INTEGER NOT NULL,
  lead_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'
  event_data TEXT, -- JSON string (click URL, bounce reason, etc.)
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (queue_id) REFERENCES email_queue(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
CREATE INDEX IF NOT EXISTS idx_tracking_queue ON email_tracking(queue_id);
CREATE INDEX IF NOT EXISTS idx_tracking_lead_event ON email_tracking(lead_id, event_type);

-- Email unsubscribes
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  lead_id INTEGER,
  user_id INTEGER,
  reason TEXT,
  source TEXT, -- 'lead_email', 'client_email'
  unsubscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_email ON email_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_lead ON email_unsubscribes(lead_id);

-- White-label branding configuration
CREATE TABLE IF NOT EXISTS white_label_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT 0,

  -- Company branding
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  company_website TEXT,

  -- Color scheme
  primary_color TEXT DEFAULT '#667eea',
  secondary_color TEXT DEFAULT '#764ba2',
  accent_color TEXT DEFAULT '#10b981',

  -- Email branding
  email_from_name TEXT NOT NULL,
  email_from_email TEXT NOT NULL,
  email_reply_to TEXT,
  email_header_logo TEXT,
  email_footer_text TEXT,

  -- URLs and links
  dashboard_url TEXT,
  support_email TEXT,
  support_phone TEXT,
  social_facebook TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,

  -- Portal customization
  portal_title TEXT,
  portal_welcome_text TEXT,

  -- Legal
  privacy_policy_url TEXT,
  terms_of_service_url TEXT,

  -- Additional customization (JSON)
  custom_css TEXT,
  custom_metadata TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_white_label_active ON white_label_config(is_active);

-- Scraper settings table
CREATE TABLE IF NOT EXISTS scraper_settings (
  scraper_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  api_key TEXT,
  priority INTEGER DEFAULT 10,
  config TEXT,
  last_used_at DATETIME,
  success_rate REAL DEFAULT 1.0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scraper_enabled ON scraper_settings(enabled, priority);
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
  },

  /**
   * Record full local SEO audit results
   */
  recordAudit(clientId, auditData) {
    const stmt = db.prepare(`
      INSERT INTO local_seo_scores
      (client_id, date, nap_score, has_schema, directories_submitted, reviews_count, issues_found, warnings_found, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      clientId,
      auditData.date || new Date().toISOString().split('T')[0],
      auditData.napScore || 0,
      auditData.schemaScore >= 80 ? 1 : 0,
      auditData.directoriesScore || 0,
      auditData.reviewsCount || 0,
      auditData.issuesDetected || 0,
      auditData.issuesFixed || 0,
      JSON.stringify(auditData.metadata || {})
    );
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
  },

  /**
   * Get keyword history for ranking comparison
   */
  getKeywordHistory(clientId, keyword, daysAgo = 7) {
    const stmt = db.prepare(`
      SELECT position, date
      FROM keyword_performance
      WHERE client_id = ? AND keyword = ?
        AND date = date('now', '-' || ? || ' days')
      ORDER BY date DESC
      LIMIT 1
    `);
    return stmt.all(clientId, keyword, daysAgo);
  },

  /**
   * Get keyword stats for summary
   */
  getStats(clientId, days = 30) {
    const stmt = db.prepare(`
      SELECT
        COUNT(DISTINCT keyword) as total,
        AVG(position) as avgPosition,
        json_group_array(
          json_object(
            'keyword', keyword,
            'position', position,
            'clicks', clicks
          )
        ) as topKeywords
      FROM (
        SELECT keyword, AVG(position) as position, SUM(clicks) as clicks
        FROM keyword_performance
        WHERE client_id = ?
          AND date >= date('now', '-' || ? || ' days')
          AND position IS NOT NULL
        GROUP BY keyword
        ORDER BY clicks DESC
        LIMIT 10
      )
    `);

    const result = stmt.get(clientId, days);

    if (result && result.topKeywords) {
      try {
        result.topKeywords = JSON.parse(result.topKeywords);
      } catch (e) {
        result.topKeywords = [];
      }
    }

    return result || { total: 0, avgPosition: 0, topKeywords: [] };
  },

  /**
   * Get recent ranking changes
   */
  getRecentChanges(clientId, days = 7) {
    const stmt = db.prepare(`
      WITH latest AS (
        SELECT keyword, position, date,
          ROW_NUMBER() OVER (PARTITION BY keyword ORDER BY date DESC) as rn
        FROM keyword_performance
        WHERE client_id = ?
          AND date >= date('now', '-' || ? || ' days')
          AND position IS NOT NULL
      ),
      previous AS (
        SELECT keyword, position,
          ROW_NUMBER() OVER (PARTITION BY keyword ORDER BY date DESC) as rn
        FROM keyword_performance
        WHERE client_id = ?
          AND date < date('now', '-' || ? || ' days')
          AND position IS NOT NULL
      )
      SELECT
        latest.keyword,
        latest.position as currentPosition,
        previous.position as previousPosition,
        (previous.position - latest.position) as change
      FROM latest
      LEFT JOIN previous ON latest.keyword = previous.keyword AND previous.rn = 1
      WHERE latest.rn = 1
        AND previous.position IS NOT NULL
      ORDER BY ABS(previous.position - latest.position) DESC
    `);

    return stmt.all(clientId, days, clientId, days);
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
      (client_id, report_type, file_path, format, size_bytes, generation_time_ms, pdf_path, pdf_size, pdf_filename, period, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      clientId,
      report.type,
      report.filePath || null,
      report.format || 'html',
      report.sizeBytes || 0,
      report.generationTimeMs || 0,
      report.pdfPath || null,
      report.pdfSize || null,
      report.pdfFilename || null,
      report.period || null,
      report.metadata ? JSON.stringify(report.metadata) : null
    );

    return result.lastInsertRowid;
  },

  /**
   * Get report by ID
   */
  getById(reportId) {
    const stmt = db.prepare('SELECT * FROM reports_generated WHERE id = ?');
    const report = stmt.get(reportId);

    if (report && report.metadata) {
      report.metadata = JSON.parse(report.metadata);
    }

    return report;
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

    const reports = stmt.all(clientId, limit);

    return reports.map(r => {
      if (r.metadata) r.metadata = JSON.parse(r.metadata);
      return r;
    });
  },

  /**
   * Mark report as emailed
   */
  markAsEmailed(reportId) {
    const stmt = db.prepare(`
      UPDATE reports_generated
      SET email_sent = 1
      WHERE id = ?
    `);

    return stmt.run(reportId).changes > 0;
  },

  /**
   * Increment download count
   */
  incrementDownloads(reportId) {
    const stmt = db.prepare(`
      UPDATE reports_generated
      SET download_count = download_count + 1
      WHERE id = ?
    `);

    return stmt.run(reportId).changes > 0;
  },

  /**
   * Delete report
   */
  deleteReport(reportId) {
    const stmt = db.prepare('DELETE FROM reports_generated WHERE id = ?');
    return stmt.run(reportId).changes > 0;
  },

  /**
   * Get reports by period
   */
  getByPeriod(clientId, period) {
    const stmt = db.prepare(`
      SELECT * FROM reports_generated
      WHERE client_id = ? AND period = ?
      ORDER BY created_at DESC
    `);

    const reports = stmt.all(clientId, period);

    return reports.map(r => {
      if (r.metadata) r.metadata = JSON.parse(r.metadata);
      return r;
    });
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

/**
 * Authentication Operations
 */
export const authOps = {
  /**
   * Create a new user
   */
  createUser(userData) {
    const stmt = db.prepare(`
      INSERT INTO users (client_id, email, password, first_name, last_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userData.clientId,
      userData.email,
      userData.password,
      userData.firstName || null,
      userData.lastName || null,
      userData.role || 'client',
      'active'
    );

    return result.lastInsertRowid;
  },

  /**
   * Get user by email
   */
  getUserByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  /**
   * Get user by ID
   */
  getUserById(userId) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId);
  },

  /**
   * Update last login timestamp
   */
  updateLastLogin(userId) {
    const stmt = db.prepare(`
      UPDATE users
      SET last_login = datetime('now')
      WHERE id = ?
    `);

    stmt.run(userId);
  },

  /**
   * Update user password
   */
  updatePassword(userId, hashedPassword) {
    const stmt = db.prepare(`
      UPDATE users
      SET password = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(hashedPassword, userId);
  },

  /**
   * Update user status
   */
  updateStatus(userId, status) {
    const stmt = db.prepare(`
      UPDATE users
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(status, userId);
  },

  /**
   * Store password reset token
   */
  storeResetToken(userId, token) {
    const stmt = db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, datetime('now', '+1 hour'))
    `);

    stmt.run(userId, token);
  },

  /**
   * Check if reset token is valid
   */
  isResetTokenValid(userId, token) {
    const stmt = db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE user_id = ? AND token = ? AND used = 0 AND expires_at > datetime('now')
    `);

    const result = stmt.get(userId, token);
    return result !== undefined;
  },

  /**
   * Invalidate reset token
   */
  invalidateResetToken(userId, token) {
    const stmt = db.prepare(`
      UPDATE password_reset_tokens
      SET used = 1
      WHERE user_id = ? AND token = ?
    `);

    stmt.run(userId, token);
  },

  /**
   * Log authentication activity
   */
  logActivity(userId, activityType, metadata = {}) {
    const stmt = db.prepare(`
      INSERT INTO auth_activity_log (user_id, activity_type, metadata)
      VALUES (?, ?, ?)
    `);

    stmt.run(userId, activityType, JSON.stringify(metadata));
  },

  /**
   * Get activity log for user
   */
  getActivityLog(userId, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM auth_activity_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(userId, limit);
  },

  /**
   * Get all users for a client
   */
  getUsersByClient(clientId) {
    const stmt = db.prepare('SELECT id, email, first_name, last_name, role, status, last_login, created_at FROM users WHERE client_id = ?');
    return stmt.all(clientId);
  },

  /**
   * Get all users (admin only)
   */
  getAllUsers() {
    const stmt = db.prepare('SELECT id, client_id, email, first_name, last_name, role, status, last_login, created_at FROM users');
    return stmt.all();
  }
};

/**
 * Lead Operations
 */
export const leadOps = {
  /**
   * Create a new lead
   */
  createLead(leadData) {
    const stmt = db.prepare(`
      INSERT INTO leads (business_name, website, name, email, phone, industry, source, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      leadData.businessName,
      leadData.website,
      leadData.name,
      leadData.email,
      leadData.phone || null,
      leadData.industry || null,
      leadData.source || 'lead_magnet',
      leadData.metadata ? JSON.stringify(leadData.metadata) : null
    );

    return result.lastInsertRowid;
  },

  /**
   * Get lead by ID
   */
  getLeadById(leadId) {
    const stmt = db.prepare('SELECT * FROM leads WHERE id = ?');
    const lead = stmt.get(leadId);

    if (lead && lead.metadata) {
      lead.metadata = JSON.parse(lead.metadata);
    }

    return lead;
  },

  /**
   * Get lead by email
   */
  getLeadByEmail(email) {
    const stmt = db.prepare('SELECT * FROM leads WHERE email = ?');
    const lead = stmt.get(email);

    if (lead && lead.metadata) {
      lead.metadata = JSON.parse(lead.metadata);
    }

    return lead;
  },

  /**
   * Update lead status
   */
  updateStatus(leadId, status) {
    const stmt = db.prepare(`
      UPDATE leads
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(status, leadId);
  },

  /**
   * Mark audit as completed
   */
  markAuditCompleted(leadId, auditScore) {
    const stmt = db.prepare(`
      UPDATE leads
      SET audit_completed = 1, audit_score = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(auditScore, leadId);
  },

  /**
   * Mark lead as contacted
   */
  markContacted(leadId, notes = null) {
    const stmt = db.prepare(`
      UPDATE leads
      SET status = 'contacted', contacted_at = datetime('now'), notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(notes, leadId);
  },

  /**
   * Mark lead as converted
   */
  markConverted(leadId, clientId = null) {
    const stmt = db.prepare(`
      UPDATE leads
      SET status = 'converted', conversion_status = 'converted', converted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(leadId);

    // If clientId is provided, we can link the lead to a client
    if (clientId) {
      const updateMetadata = db.prepare(`
        UPDATE leads
        SET metadata = json_set(COALESCE(metadata, '{}'), '$.clientId', ?)
        WHERE id = ?
      `);
      updateMetadata.run(clientId, leadId);
    }
  },

  /**
   * Track lead event
   */
  trackEvent(leadId, eventType, metadata = {}) {
    const stmt = db.prepare(`
      INSERT INTO lead_events (lead_id, event_type, metadata)
      VALUES (?, ?, ?)
    `);

    stmt.run(leadId, eventType, JSON.stringify(metadata));
  },

  /**
   * Get all events for a lead
   */
  getEvents(leadId, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM lead_events
      WHERE lead_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(leadId, limit);
  },

  /**
   * Get all leads with filters
   */
  getAllLeads(filters = {}) {
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.auditCompleted !== undefined) {
      query += ' AND audit_completed = ?';
      params.push(filters.auditCompleted ? 1 : 0);
    }

    if (filters.conversionStatus) {
      query += ' AND conversion_status = ?';
      params.push(filters.conversionStatus);
    }

    if (filters.fromDate) {
      query += ' AND created_at >= ?';
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      query += ' AND created_at <= ?';
      params.push(filters.toDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = db.prepare(query);
    const leads = stmt.all(...params);

    return leads.map(lead => {
      if (lead.metadata) {
        lead.metadata = JSON.parse(lead.metadata);
      }
      return lead;
    });
  },

  /**
   * Get lead statistics
   */
  getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as total FROM leads');
    const newStmt = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'new'");
    const contactedStmt = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'contacted'");
    const convertedStmt = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'");
    const auditStmt = db.prepare("SELECT COUNT(*) as count FROM leads WHERE audit_completed = 1");

    return {
      total: totalStmt.get().total,
      new: newStmt.get().count,
      contacted: contactedStmt.get().count,
      converted: convertedStmt.get().count,
      auditCompleted: auditStmt.get().count
    };
  },

  /**
   * Update lead notes
   */
  updateNotes(leadId, notes) {
    const stmt = db.prepare(`
      UPDATE leads
      SET notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(notes, leadId);
  }
};

/**
 * Email Automation Operations
 */
export const emailOps = {
  /**
   * Create email campaign
   */
  createCampaign(campaignData) {
    const stmt = db.prepare(`
      INSERT INTO email_campaigns (name, description, type, trigger_event, delay_hours, subject_template, body_template, from_name, from_email, reply_to, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      campaignData.name,
      campaignData.description || null,
      campaignData.type,
      campaignData.triggerEvent || null,
      campaignData.delayHours || 0,
      campaignData.subjectTemplate,
      campaignData.bodyTemplate,
      campaignData.fromName || 'SEO Expert',
      campaignData.fromEmail || null,
      campaignData.replyTo || null,
      campaignData.metadata ? JSON.stringify(campaignData.metadata) : null
    );

    return result.lastInsertRowid;
  },

  /**
   * Get campaign by ID
   */
  getCampaign(campaignId) {
    const stmt = db.prepare('SELECT * FROM email_campaigns WHERE id = ?');
    const campaign = stmt.get(campaignId);

    if (campaign && campaign.metadata) {
      campaign.metadata = JSON.parse(campaign.metadata);
    }

    return campaign;
  },

  /**
   * Get all active campaigns
   */
  getActiveCampaigns() {
    const stmt = db.prepare('SELECT * FROM email_campaigns WHERE status = ? ORDER BY created_at DESC');
    const campaigns = stmt.all('active');

    return campaigns.map(c => {
      if (c.metadata) c.metadata = JSON.parse(c.metadata);
      return c;
    });
  },

  /**
   * Update campaign status
   */
  updateCampaignStatus(campaignId, status) {
    const stmt = db.prepare(`
      UPDATE email_campaigns
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(status, campaignId);
  },

  /**
   * Add email to sequence
   */
  addSequenceEmail(sequenceData) {
    const stmt = db.prepare(`
      INSERT INTO email_sequences (campaign_id, sequence_order, delay_hours, subject_template, body_template, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      sequenceData.campaignId,
      sequenceData.sequenceOrder,
      sequenceData.delayHours || 0,
      sequenceData.subjectTemplate,
      sequenceData.bodyTemplate,
      sequenceData.metadata ? JSON.stringify(sequenceData.metadata) : null
    );

    return result.lastInsertRowid;
  },

  /**
   * Get campaign sequences
   */
  getSequences(campaignId) {
    const stmt = db.prepare(`
      SELECT * FROM email_sequences
      WHERE campaign_id = ? AND status = 'active'
      ORDER BY sequence_order ASC
    `);

    const sequences = stmt.all(campaignId);

    return sequences.map(s => {
      if (s.metadata) s.metadata = JSON.parse(s.metadata);
      return s;
    });
  },

  /**
   * Queue email for sending
   */
  queueEmail(emailData) {
    const stmt = db.prepare(`
      INSERT INTO email_queue (lead_id, campaign_id, sequence_id, recipient_email, recipient_name, subject, body_html, body_text, from_email, from_name, reply_to, scheduled_for, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      emailData.leadId,
      emailData.campaignId || null,
      emailData.sequenceId || null,
      emailData.recipientEmail,
      emailData.recipientName || null,
      emailData.subject,
      emailData.bodyHtml,
      emailData.bodyText || null,
      emailData.fromEmail,
      emailData.fromName || 'SEO Expert',
      emailData.replyTo || null,
      emailData.scheduledFor || new Date().toISOString(),
      emailData.metadata ? JSON.stringify(emailData.metadata) : null
    );

    return result.lastInsertRowid;
  },

  /**
   * Get pending emails ready to send
   */
  getPendingEmails(limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM email_queue
      WHERE status = 'pending'
        AND scheduled_for <= datetime('now')
      ORDER BY scheduled_for ASC
      LIMIT ?
    `);

    const emails = stmt.all(limit);

    return emails.map(e => {
      if (e.metadata) e.metadata = JSON.parse(e.metadata);
      return e;
    });
  },

  /**
   * Update email status
   */
  updateEmailStatus(queueId, status, errorMessage = null) {
    const stmt = db.prepare(`
      UPDATE email_queue
      SET status = ?, sent_at = datetime('now'), error_message = ?
      WHERE id = ?
    `);

    stmt.run(status, errorMessage, queueId);
  },

  /**
   * Increment retry count
   */
  incrementRetryCount(queueId) {
    const stmt = db.prepare(`
      UPDATE email_queue
      SET retry_count = retry_count + 1
      WHERE id = ?
    `);

    stmt.run(queueId);
  },

  /**
   * Track email event
   */
  trackEvent(trackingData) {
    const stmt = db.prepare(`
      INSERT INTO email_tracking (queue_id, lead_id, event_type, event_data, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      trackingData.queueId,
      trackingData.leadId,
      trackingData.eventType,
      trackingData.eventData ? JSON.stringify(trackingData.eventData) : null,
      trackingData.ipAddress || null,
      trackingData.userAgent || null
    );
  },

  /**
   * Get email statistics for lead
   */
  getLeadEmailStats(leadId) {
    const sentStmt = db.prepare("SELECT COUNT(*) as count FROM email_queue WHERE lead_id = ? AND status = 'sent'");
    const openedStmt = db.prepare("SELECT COUNT(DISTINCT queue_id) as count FROM email_tracking WHERE lead_id = ? AND event_type = 'opened'");
    const clickedStmt = db.prepare("SELECT COUNT(DISTINCT queue_id) as count FROM email_tracking WHERE lead_id = ? AND event_type = 'clicked'");

    return {
      sent: sentStmt.get(leadId).count,
      opened: openedStmt.get(leadId).count,
      clicked: clickedStmt.get(leadId).count
    };
  },

  /**
   * Get campaign statistics
   */
  getCampaignStats(campaignId) {
    const sentStmt = db.prepare("SELECT COUNT(*) as count FROM email_queue WHERE campaign_id = ? AND status = 'sent'");
    const failedStmt = db.prepare("SELECT COUNT(*) as count FROM email_queue WHERE campaign_id = ? AND status = 'failed'");
    const openedStmt = db.prepare(`
      SELECT COUNT(DISTINCT et.queue_id) as count
      FROM email_tracking et
      JOIN email_queue eq ON et.queue_id = eq.id
      WHERE eq.campaign_id = ? AND et.event_type = 'opened'
    `);
    const clickedStmt = db.prepare(`
      SELECT COUNT(DISTINCT et.queue_id) as count
      FROM email_tracking et
      JOIN email_queue eq ON et.queue_id = eq.id
      WHERE eq.campaign_id = ? AND et.event_type = 'clicked'
    `);

    const sent = sentStmt.get(campaignId).count;
    const opened = openedStmt.get(campaignId).count;
    const clicked = clickedStmt.get(campaignId).count;

    return {
      sent,
      failed: failedStmt.get(campaignId).count,
      opened,
      clicked,
      openRate: sent > 0 ? ((opened / sent) * 100).toFixed(2) : 0,
      clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(2) : 0
    };
  },

  /**
   * Get recent emails for lead
   */
  getLeadEmails(leadId, limit = 20) {
    const stmt = db.prepare(`
      SELECT * FROM email_queue
      WHERE lead_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const emails = stmt.all(leadId, limit);

    return emails.map(e => {
      if (e.metadata) e.metadata = JSON.parse(e.metadata);
      return e;
    });
  },

  /**
   * Cancel pending emails for lead
   */
  cancelPendingEmails(leadId) {
    const stmt = db.prepare(`
      UPDATE email_queue
      SET status = 'cancelled'
      WHERE lead_id = ? AND status = 'pending'
    `);

    const result = stmt.run(leadId);
    return result.changes;
  },

  /**
   * Unsubscribe email address
   */
  unsubscribe(unsubscribeData) {
    const stmt = db.prepare(`
      INSERT INTO email_unsubscribes (email, lead_id, user_id, reason, source)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        unsubscribeData.email,
        unsubscribeData.leadId || null,
        unsubscribeData.userId || null,
        unsubscribeData.reason || null,
        unsubscribeData.source || 'unknown'
      );
      return result.lastInsertRowid;
    } catch (error) {
      // Email already unsubscribed - return existing record
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const existing = db.prepare('SELECT id FROM email_unsubscribes WHERE email = ?').get(unsubscribeData.email);
        return existing?.id;
      }
      throw error;
    }
  },

  /**
   * Check if email is unsubscribed
   */
  isUnsubscribed(email) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM email_unsubscribes WHERE email = ?');
    const result = stmt.get(email);
    return result.count > 0;
  },

  /**
   * Get unsubscribe record
   */
  getUnsubscribe(email) {
    const stmt = db.prepare('SELECT * FROM email_unsubscribes WHERE email = ?');
    return stmt.get(email);
  },

  /**
   * Resubscribe email address
   */
  resubscribe(email) {
    const stmt = db.prepare('DELETE FROM email_unsubscribes WHERE email = ?');
    const result = stmt.run(email);
    return result.changes > 0;
  }
};

/**
 * White-Label Configuration Operations
 */
export const whiteLabelOps = {
  /**
   * Create white-label configuration
   */
  createConfig(configData) {
    const stmt = db.prepare(`
      INSERT INTO white_label_config (
        config_name, is_active, company_name, company_logo_url, company_website,
        primary_color, secondary_color, accent_color,
        email_from_name, email_from_email, email_reply_to, email_header_logo, email_footer_text,
        dashboard_url, support_email, support_phone,
        social_facebook, social_twitter, social_linkedin,
        portal_title, portal_welcome_text,
        privacy_policy_url, terms_of_service_url,
        custom_css, custom_metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      configData.configName,
      configData.isActive ? 1 : 0,
      configData.companyName,
      configData.companyLogoUrl || null,
      configData.companyWebsite || null,
      configData.primaryColor || '#667eea',
      configData.secondaryColor || '#764ba2',
      configData.accentColor || '#10b981',
      configData.emailFromName,
      configData.emailFromEmail,
      configData.emailReplyTo || null,
      configData.emailHeaderLogo || null,
      configData.emailFooterText || null,
      configData.dashboardUrl || null,
      configData.supportEmail || null,
      configData.supportPhone || null,
      configData.socialFacebook || null,
      configData.socialTwitter || null,
      configData.socialLinkedin || null,
      configData.portalTitle || null,
      configData.portalWelcomeText || null,
      configData.privacyPolicyUrl || null,
      configData.termsOfServiceUrl || null,
      configData.customCss || null,
      configData.customMetadata ? JSON.stringify(configData.customMetadata) : null
    );

    return result.lastInsertRowid;
  },

  /**
   * Get white-label configuration by ID
   */
  getConfig(configId) {
    const stmt = db.prepare('SELECT * FROM white_label_config WHERE id = ?');
    const config = stmt.get(configId);

    if (config && config.custom_metadata) {
      config.custom_metadata = JSON.parse(config.custom_metadata);
    }

    return config;
  },

  /**
   * Get active white-label configuration
   */
  getActiveConfig() {
    const stmt = db.prepare('SELECT * FROM white_label_config WHERE is_active = 1 LIMIT 1');
    const config = stmt.get();

    if (config && config.custom_metadata) {
      config.custom_metadata = JSON.parse(config.custom_metadata);
    }

    return config;
  },

  /**
   * Get all white-label configurations
   */
  getAllConfigs() {
    const stmt = db.prepare('SELECT * FROM white_label_config ORDER BY created_at DESC');
    const configs = stmt.all();

    return configs.map(c => {
      if (c.custom_metadata) c.custom_metadata = JSON.parse(c.custom_metadata);
      return c;
    });
  },

  /**
   * Update white-label configuration
   */
  updateConfig(configId, configData) {
    const updates = [];
    const values = [];

    // Build dynamic update query
    const fields = {
      configName: 'config_name',
      isActive: 'is_active',
      companyName: 'company_name',
      companyLogoUrl: 'company_logo_url',
      companyWebsite: 'company_website',
      primaryColor: 'primary_color',
      secondaryColor: 'secondary_color',
      accentColor: 'accent_color',
      emailFromName: 'email_from_name',
      emailFromEmail: 'email_from_email',
      emailReplyTo: 'email_reply_to',
      emailHeaderLogo: 'email_header_logo',
      emailFooterText: 'email_footer_text',
      dashboardUrl: 'dashboard_url',
      supportEmail: 'support_email',
      supportPhone: 'support_phone',
      socialFacebook: 'social_facebook',
      socialTwitter: 'social_twitter',
      socialLinkedin: 'social_linkedin',
      portalTitle: 'portal_title',
      portalWelcomeText: 'portal_welcome_text',
      privacyPolicyUrl: 'privacy_policy_url',
      termsOfServiceUrl: 'terms_of_service_url',
      customCss: 'custom_css',
      customMetadata: 'custom_metadata'
    };

    Object.keys(fields).forEach(key => {
      if (configData[key] !== undefined) {
        updates.push(`${fields[key]} = ?`);
        let value = configData[key];

        // Special handling for boolean and JSON fields
        if (key === 'isActive') {
          value = value ? 1 : 0;
        } else if (key === 'customMetadata' && value) {
          value = JSON.stringify(value);
        }

        values.push(value);
      }
    });

    if (updates.length === 0) {
      return false;
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(configId);

    const query = `
      UPDATE white_label_config
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    return result.changes > 0;
  },

  /**
   * Set configuration as active (deactivates all others)
   */
  setActive(configId) {
    // First deactivate all configs
    const deactivateStmt = db.prepare('UPDATE white_label_config SET is_active = 0');
    deactivateStmt.run();

    // Then activate the specified one
    const activateStmt = db.prepare(`
      UPDATE white_label_config
      SET is_active = 1, updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = activateStmt.run(configId);
    return result.changes > 0;
  },

  /**
   * Delete white-label configuration
   */
  deleteConfig(configId) {
    // Don't allow deleting the active configuration
    const activeConfig = this.getActiveConfig();
    if (activeConfig && activeConfig.id === configId) {
      throw new Error('Cannot delete the active configuration');
    }

    const stmt = db.prepare('DELETE FROM white_label_config WHERE id = ?');
    const result = stmt.run(configId);

    return result.changes > 0;
  },

  /**
   * Get configuration by name
   */
  getConfigByName(configName) {
    const stmt = db.prepare('SELECT * FROM white_label_config WHERE config_name = ?');
    const config = stmt.get(configName);

    if (config && config.custom_metadata) {
      config.custom_metadata = JSON.parse(config.custom_metadata);
    }

    return config;
  }
};

// Initialize on import
initializeDatabase();

// Get DB instance function
export const getDB = () => db;

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
  authOps,
  leadOps,
  emailOps,
  whiteLabelOps,
  db,
  getDB
};
