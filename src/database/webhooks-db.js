import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database/webhooks.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT NOT NULL,
    secret TEXT,
    active INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastDelivery DATETIME,
    totalDeliveries INTEGER DEFAULT 0,
    successfulDeliveries INTEGER DEFAULT 0,
    failedDeliveries INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id TEXT PRIMARY KEY,
    webhookId TEXT NOT NULL,
    event TEXT NOT NULL,
    payload TEXT NOT NULL,
    status INTEGER,
    responseTime INTEGER,
    error TEXT,
    deliveredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhookId) REFERENCES webhooks(id)
  );

  CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
  CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhookId);
`);

// Generate unique ID
const generateId = () => `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateDeliveryId = () => `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get all webhooks
export const getAll = () => {
  const stmt = db.prepare('SELECT * FROM webhooks ORDER BY createdAt DESC');
  const webhooks = stmt.all();
  
  // Parse events JSON
  return webhooks.map(webhook => ({
    ...webhook,
    events: JSON.parse(webhook.events),
    active: Boolean(webhook.active)
  }));
};

// Get webhook by ID
export const getById = (id) => {
  const stmt = db.prepare('SELECT * FROM webhooks WHERE id = ?');
  const webhook = stmt.get(id);
  
  if (webhook) {
    webhook.events = JSON.parse(webhook.events);
    webhook.active = Boolean(webhook.active);
  }
  
  return webhook;
};

// Create webhook
export const create = (webhook) => {
  const id = webhook.id || generateId();
  const stmt = db.prepare(`
    INSERT INTO webhooks (id, name, url, events, secret, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    webhook.name,
    webhook.url,
    JSON.stringify(webhook.events || []),
    webhook.secret || null,
    webhook.active !== false ? 1 : 0
  );

  return getById(id);
};

// Update webhook
export const update = (id, updates) => {
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'createdAt') {
      if (key === 'events') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else if (key === 'active') {
        fields.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });

  if (fields.length === 0) return getById(id);

  values.push(id);
  const stmt = db.prepare(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getById(id);
};

// Delete webhook
export const deleteWebhook = (id) => {
  // Delete deliveries first
  db.prepare('DELETE FROM webhook_deliveries WHERE webhookId = ?').run(id);
  // Delete webhook
  const stmt = db.prepare('DELETE FROM webhooks WHERE id = ?');
  return stmt.run(id);
};

// Record delivery
export const recordDelivery = (webhookId, event, payload, status, responseTime, error = null) => {
  const id = generateDeliveryId();
  const stmt = db.prepare(`
    INSERT INTO webhook_deliveries (id, webhookId, event, payload, status, responseTime, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, webhookId, event, JSON.stringify(payload), status, responseTime, error);

  // Update webhook stats
  const webhook = getById(webhookId);
  const isSuccess = status >= 200 && status < 300;
  
  update(webhookId, {
    lastDelivery: new Date().toISOString(),
    totalDeliveries: webhook.totalDeliveries + 1,
    successfulDeliveries: webhook.successfulDeliveries + (isSuccess ? 1 : 0),
    failedDeliveries: webhook.failedDeliveries + (isSuccess ? 0 : 1)
  });

  return id;
};

// Get delivery logs
export const getDeliveryLogs = (webhookId, limit = 50) => {
  const stmt = db.prepare(`
    SELECT * FROM webhook_deliveries 
    WHERE webhookId = ? 
    ORDER BY deliveredAt DESC 
    LIMIT ?
  `);
  
  const deliveries = stmt.all(webhookId, limit);
  
  return deliveries.map(delivery => ({
    ...delivery,
    payload: JSON.parse(delivery.payload)
  }));
};

// Get webhooks by event
export const getByEvent = (event) => {
  const all = getAll();
  return all.filter(webhook => 
    webhook.active && webhook.events.includes(event)
  );
};

export default {
  getAll,
  getById,
  create,
  update,
  deleteWebhook,
  recordDelivery,
  getDeliveryLogs,
  getByEvent
};
