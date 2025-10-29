/**
 * Domains API Endpoints
 * 
 * CRUD operations for domain management
 */

import express from 'express';

export function createDomainsAPI(db) {
  const router = express.Router();

  // GET /api/domains - List all domains
  router.get('/', (req, res) => {
    try {
      const stmt = db.prepare(`
        SELECT 
          id, domain, slug, display_name, description, tags,
          keyword_count, active, notification, notification_interval,
          notification_emails, created_at, updated_at, last_scrape_at
        FROM domains
        ORDER BY updated_at DESC
      `);
      
      const domains = stmt.all().map(domain => ({
        ...domain,
        tags: domain.tags ? JSON.parse(domain.tags) : [],
        notification_emails: domain.notification_emails ? JSON.parse(domain.notification_emails) : [],
        active: domain.active === 1,
        notification: domain.notification === 1,
      }));

      res.json({ success: true, domains });
    } catch (error) {
      console.error('Error fetching domains:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/domains/:id - Get single domain
  router.get('/:id', (req, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM domains WHERE id = ?');
      const domain = stmt.get(req.params.id);

      if (!domain) {
        return res.status(404).json({ success: false, error: 'Domain not found' });
      }

      // Parse JSON fields
      domain.tags = domain.tags ? JSON.parse(domain.tags) : [];
      domain.notification_emails = domain.notification_emails ? JSON.parse(domain.notification_emails) : [];
      domain.active = domain.active === 1;
      domain.notification = domain.notification === 1;

      res.json({ success: true, domain });
    } catch (error) {
      console.error('Error fetching domain:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/domains - Create new domain
  router.post('/', (req, res) => {
    try {
      const {
        domain,
        display_name,
        description,
        tags = [],
        notification = true,
        notification_interval = 'daily',
        notification_emails = [],
      } = req.body;

      // Validate
      if (!domain) {
        return res.status(400).json({ success: false, error: 'Domain is required' });
      }

      // Generate slug from domain
      const slug = domain.replace(/[^a-z0-9]/gi, '-').toLowerCase();

      const stmt = db.prepare(`
        INSERT INTO domains (
          domain, slug, display_name, description, tags,
          notification, notification_interval, notification_emails
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        domain,
        slug,
        display_name || domain,
        description || '',
        JSON.stringify(tags),
        notification ? 1 : 0,
        notification_interval,
        JSON.stringify(notification_emails)
      );

      res.json({
        success: true,
        domain: {
          id: result.lastInsertRowid,
          domain,
          slug,
          display_name: display_name || domain,
          description: description || '',
          tags,
          notification,
          notification_interval,
          notification_emails,
        },
      });
    } catch (error) {
      console.error('Error creating domain:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ success: false, error: 'Domain already exists' });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/domains/:id - Update domain
  router.put('/:id', (req, res) => {
    try {
      const {
        display_name,
        description,
        tags,
        active,
        notification,
        notification_interval,
        notification_emails,
      } = req.body;

      const updates = [];
      const values = [];

      if (display_name !== undefined) {
        updates.push('display_name = ?');
        values.push(display_name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (tags !== undefined) {
        updates.push('tags = ?');
        values.push(JSON.stringify(tags));
      }
      if (active !== undefined) {
        updates.push('active = ?');
        values.push(active ? 1 : 0);
      }
      if (notification !== undefined) {
        updates.push('notification = ?');
        values.push(notification ? 1 : 0);
      }
      if (notification_interval !== undefined) {
        updates.push('notification_interval = ?');
        values.push(notification_interval);
      }
      if (notification_emails !== undefined) {
        updates.push('notification_emails = ?');
        values.push(JSON.stringify(notification_emails));
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);

      const stmt = db.prepare(`UPDATE domains SET ${updates.join(', ')} WHERE id = ?`);
      const result = stmt.run(...values);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Domain not found' });
      }

      res.json({ success: true, message: 'Domain updated' });
    } catch (error) {
      console.error('Error updating domain:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/domains/:id - Delete domain
  router.delete('/:id', (req, res) => {
    try {
      // Check if domain has keywords
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM keywords WHERE domain_id = ?');
      const { count } = countStmt.get(req.params.id);

      if (count > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete domain with ${count} keywords. Delete keywords first.`,
        });
      }

      const stmt = db.prepare('DELETE FROM domains WHERE id = ?');
      const result = stmt.run(req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Domain not found' });
      }

      res.json({ success: true, message: 'Domain deleted' });
    } catch (error) {
      console.error('Error deleting domain:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/domains/:id/stats - Get domain statistics
  router.get('/:id/stats', (req, res) => {
    try {
      const statsStmt = db.prepare(`
        SELECT 
          COUNT(*) as total_keywords,
          SUM(CASE WHEN position > 0 AND position <= 3 THEN 1 ELSE 0 END) as top3,
          SUM(CASE WHEN position > 0 AND position <= 10 THEN 1 ELSE 0 END) as top10,
          SUM(CASE WHEN position > 10 AND position <= 20 THEN 1 ELSE 0 END) as top20,
          SUM(CASE WHEN position = 0 OR position > 100 THEN 1 ELSE 0 END) as unranked,
          AVG(CASE WHEN position > 0 THEN position END) as avg_position,
          SUM(search_volume) as total_volume
        FROM keywords
        WHERE domain_id = ?
      `);

      const stats = statsStmt.get(req.params.id);

      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error fetching domain stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export default createDomainsAPI;
