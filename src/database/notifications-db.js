import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database/notifications.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    status TEXT DEFAULT 'unread',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    readAt DATETIME
  );

  CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    emailNotifications INTEGER DEFAULT 1,
    pushNotifications INTEGER DEFAULT 1,
    categories TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt);
`);

// Generate unique ID
const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get all notifications
export const getAll = (options = {}) => {
  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params = [];

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  if (options.type) {
    query += ' AND type = ?';
    params.push(options.type);
  }

  query += ' ORDER BY createdAt DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(parseInt(options.limit));
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
};

// Get notification by ID
export const getById = (id) => {
  const stmt = db.prepare('SELECT * FROM notifications WHERE id = ?');
  return stmt.get(id);
};

// Create notification
export const create = (notification) => {
  const id = notification.id || generateId();
  const stmt = db.prepare(`
    INSERT INTO notifications (
      id, type, category, title, message, link, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    notification.type,
    notification.category || null,
    notification.title,
    notification.message,
    notification.link || null,
    notification.status || 'unread'
  );

  return getById(id);
};

// Update notification
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
  const stmt = db.prepare(`UPDATE notifications SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getById(id);
};

// Mark as read
export const markAsRead = (id) => {
  return update(id, {
    status: 'read',
    readAt: new Date().toISOString()
  });
};

// Mark all as read
export const markAllAsRead = () => {
  const stmt = db.prepare(`
    UPDATE notifications 
    SET status = 'read', readAt = ? 
    WHERE status = 'unread'
  `);
  return stmt.run(new Date().toISOString());
};

// Delete notification
export const deleteNotification = (id) => {
  const stmt = db.prepare('DELETE FROM notifications WHERE id = ?');
  return stmt.run(id);
};

// Get preferences
export const getPreferences = () => {
  const stmt = db.prepare('SELECT * FROM notification_preferences LIMIT 1');
  let prefs = stmt.get();

  if (!prefs) {
    // Create default preferences
    prefs = {
      id: 'default',
      emailNotifications: 1,
      pushNotifications: 1,
      categories: JSON.stringify(['audit', 'goal', 'issue', 'update'])
    };
    
    const insertStmt = db.prepare(`
      INSERT INTO notification_preferences (id, emailNotifications, pushNotifications, categories)
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(prefs.id, prefs.emailNotifications, prefs.pushNotifications, prefs.categories);
  }

  // Parse categories
  if (prefs.categories) {
    prefs.categories = JSON.parse(prefs.categories);
  }

  return prefs;
};

// Update preferences
export const updatePreferences = (preferences) => {
  const current = getPreferences();
  
  const stmt = db.prepare(`
    UPDATE notification_preferences 
    SET emailNotifications = ?, pushNotifications = ?, categories = ?
    WHERE id = ?
  `);

  const categories = preferences.categories 
    ? JSON.stringify(preferences.categories) 
    : current.categories;

  stmt.run(
    preferences.emailNotifications !== undefined ? preferences.emailNotifications : current.emailNotifications,
    preferences.pushNotifications !== undefined ? preferences.pushNotifications : current.pushNotifications,
    categories,
    current.id
  );

  return getPreferences();
};

// Get unread count
export const getUnreadCount = () => {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM notifications WHERE status = 'unread'");
  return stmt.get().count;
};

export default {
  getAll,
  getById,
  create,
  update,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  getUnreadCount
};
