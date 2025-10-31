import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database/goals.db');

// Ensure database directory exists
let db;
try {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
} catch (err) {
  console.warn('⚠️  Could not initialize goals database. Feature disabled.');
  console.warn('Error:', err.message);
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {}
  };
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metric TEXT NOT NULL,
    targetValue REAL NOT NULL,
    currentValue REAL DEFAULT 0,
    progress REAL DEFAULT 0,
    deadline DATETIME,
    status TEXT DEFAULT 'active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    achievedAt DATETIME,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS goal_progress_history (
    id TEXT PRIMARY KEY,
    goalId TEXT NOT NULL,
    value REAL NOT NULL,
    progress REAL NOT NULL,
    recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goalId) REFERENCES goals(id)
  );

  CREATE INDEX IF NOT EXISTS idx_goals_client ON goals(clientId);
  CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
  CREATE INDEX IF NOT EXISTS idx_progress_goal ON goal_progress_history(goalId);
`);

// Generate unique ID
const generateId = () => `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateProgressId = () => `prog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get all goals
export const getAll = (options = {}) => {
  let query = 'SELECT * FROM goals WHERE 1=1';
  const params = [];

  if (options.clientId) {
    query += ' AND clientId = ?';
    params.push(options.clientId);
  }

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  if (options.type) {
    query += ' AND type = ?';
    params.push(options.type);
  }

  query += ' ORDER BY createdAt DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
};

// Get goal by ID
export const getById = (id) => {
  const stmt = db.prepare('SELECT * FROM goals WHERE id = ?');
  return stmt.get(id);
};

// Create goal
export const create = (goal) => {
  const id = goal.id || generateId();
  const stmt = db.prepare(`
    INSERT INTO goals (
      id, clientId, type, title, description, metric,
      targetValue, currentValue, progress, deadline, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    goal.clientId,
    goal.type,
    goal.title,
    goal.description || null,
    goal.metric,
    goal.targetValue,
    goal.currentValue || 0,
    goal.progress || 0,
    goal.deadline || null,
    goal.status || 'active'
  );

  // Record initial progress
  recordProgress(id, goal.currentValue || 0, goal.progress || 0);

  return getById(id);
};

// Update goal
export const update = (id, updates) => {
  const goal = getById(id);
  if (!goal) return null;

  // Calculate progress if currentValue changed
  if (updates.currentValue !== undefined) {
    updates.progress = Math.min((updates.currentValue / goal.targetValue) * 100, 100);

    // Check if goal achieved
    if (updates.progress >= 100 && goal.status === 'active') {
      updates.status = 'achieved';
      updates.achievedAt = new Date().toISOString();
    }

    // Record progress update
    recordProgress(id, updates.currentValue, updates.progress);
  }

  updates.updatedAt = new Date().toISOString();

  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'createdAt') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return goal;

  values.push(id);
  const stmt = db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getById(id);
};

// Delete goal
export const deleteGoal = (id) => {
  // Delete progress history first
  db.prepare('DELETE FROM goal_progress_history WHERE goalId = ?').run(id);
  // Delete goal
  const stmt = db.prepare('DELETE FROM goals WHERE id = ?');
  return stmt.run(id);
};

// Record progress
export const recordProgress = (goalId, value, progress) => {
  const id = generateProgressId();
  const stmt = db.prepare(`
    INSERT INTO goal_progress_history (id, goalId, value, progress)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, goalId, value, progress);
};

// Get progress history
export const getProgressHistory = (goalId, period = 'all') => {
  let query = 'SELECT * FROM goal_progress_history WHERE goalId = ?';
  const params = [goalId];

  if (period === 'week') {
    query += " AND recordedAt >= datetime('now', '-7 days')";
  } else if (period === 'month') {
    query += " AND recordedAt >= datetime('now', '-30 days')";
  }

  query += ' ORDER BY recordedAt ASC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
};

// Calculate projection
export const calculateProjection = (goal, progressHistory) => {
  if (progressHistory.length < 2) {
    return { canAchieve: false, estimatedDate: null, daysRemaining: null };
  }

  // Calculate daily progress rate
  const first = progressHistory[0];
  const last = progressHistory[progressHistory.length - 1];
  const daysElapsed = (new Date(last.recordedAt) - new Date(first.recordedAt)) / (1000 * 60 * 60 * 24);
  const progressMade = last.progress - first.progress;
  const dailyRate = progressMade / daysElapsed;

  if (dailyRate <= 0) {
    return { canAchieve: false, estimatedDate: null, daysRemaining: null };
  }

  const remainingProgress = 100 - goal.progress;
  const daysNeeded = remainingProgress / dailyRate;
  const estimatedDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);

  const canAchieve = goal.deadline ? estimatedDate <= new Date(goal.deadline) : true;

  return {
    canAchieve,
    estimatedDate: estimatedDate.toISOString(),
    daysRemaining: Math.ceil(daysNeeded),
    dailyRate: dailyRate.toFixed(2)
  };
};

// Get statistics
export const getStats = (clientId) => {
  const query = clientId
    ? 'SELECT status, type, COUNT(*) as count FROM goals WHERE clientId = ? GROUP BY status, type'
    : 'SELECT status, type, COUNT(*) as count FROM goals GROUP BY status, type';

  const params = clientId ? [clientId] : [];
  const stmt = db.prepare(query);
  return stmt.all(...params);
};

export default {
  getAll,
  getById,
  create,
  update,
  deleteGoal,
  recordProgress,
  getProgressHistory,
  calculateProjection,
  getStats
};
