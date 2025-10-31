import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database/recommendations.db');

// Ensure database directory exists and initialize database
let db;
try {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
} catch (err) {
  console.warn('⚠️  Could not initialize recommendations database. Feature disabled.');
  console.warn('Error:', err.message);
  // Create a mock database object that does nothing
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {}
  };
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impactEstimate TEXT,
    effortEstimate TEXT,
    status TEXT DEFAULT 'pending',
    actionable INTEGER DEFAULT 0,
    autoApplyConfig TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    appliedAt DATETIME,
    notes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_recommendations_client ON recommendations(clientId);
  CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
  CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON recommendations(priority);
`);

// Generate unique ID
const generateId = () => `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get recommendations by client
export const getByClient = (clientId, options = {}) => {
  let query = 'SELECT * FROM recommendations WHERE clientId = ?';
  const params = [clientId];

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  if (options.priority) {
    query += ' AND priority = ?';
    params.push(options.priority);
  }

  query += ' ORDER BY createdAt DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
};

// Get all recommendations
export const getAll = (options = {}) => {
  let query = 'SELECT * FROM recommendations WHERE 1=1';
  const params = [];

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  if (options.priority) {
    query += ' AND priority = ?';
    params.push(options.priority);
  }

  query += ' ORDER BY createdAt DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
};

// Get recommendation by ID
export const getById = (id) => {
  const stmt = db.prepare('SELECT * FROM recommendations WHERE id = ?');
  return stmt.get(id);
};

// Create recommendation
export const create = (recommendation) => {
  const id = recommendation.id || generateId();
  const stmt = db.prepare(`
    INSERT INTO recommendations (
      id, clientId, type, priority, title, description,
      impactEstimate, effortEstimate, status, actionable, autoApplyConfig
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    recommendation.clientId,
    recommendation.type,
    recommendation.priority,
    recommendation.title,
    recommendation.description,
    recommendation.impactEstimate || null,
    recommendation.effortEstimate || null,
    recommendation.status || 'pending',
    recommendation.actionable ? 1 : 0,
    recommendation.autoApplyConfig ? JSON.stringify(recommendation.autoApplyConfig) : null
  );

  return getById(id);
};

// Save many recommendations
export const saveMany = (recommendations) => {
  const results = [];
  for (const rec of recommendations) {
    results.push(create(rec));
  }
  return results;
};

// Update recommendation
export const update = (id, updates) => {
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'createdAt') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return getById(id);

  values.push(id);
  const stmt = db.prepare(`UPDATE recommendations SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getById(id);
};

// Delete recommendation
export const deleteRecommendation = (id) => {
  const stmt = db.prepare('DELETE FROM recommendations WHERE id = ?');
  return stmt.run(id);
};

// Get statistics
export const getStats = (clientId) => {
  const query = clientId
    ? 'SELECT status, priority, COUNT(*) as count FROM recommendations WHERE clientId = ? GROUP BY status, priority'
    : 'SELECT status, priority, COUNT(*) as count FROM recommendations GROUP BY status, priority';

  const params = clientId ? [clientId] : [];
  const stmt = db.prepare(query);
  return stmt.all(...params);
};

export default {
  getByClient,
  getAll,
  getById,
  create,
  saveMany,
  update,
  deleteRecommendation,
  getStats
};
