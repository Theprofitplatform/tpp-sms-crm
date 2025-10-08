-- D1 Database Schema for Short Links

CREATE TABLE IF NOT EXISTS short_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  clicked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_short_links_token ON short_links(token);
CREATE INDEX IF NOT EXISTS idx_short_links_expires ON short_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_short_links_tenant ON short_links(tenant_id);