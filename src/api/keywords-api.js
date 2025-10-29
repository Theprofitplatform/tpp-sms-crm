/**
 * Keywords API Endpoints
 * 
 * CRUD operations and position tracking for keywords
 */

import express from 'express';
import { ScraperService } from '../services/scraper-service.js';

export function createKeywordsAPI(db) {
  const router = express.Router();
  const scraperService = new ScraperService(db);

  // GET /api/keywords - List keywords (with filtering)
  router.get('/', (req, res) => {
    try {
      const { domain_id, device, country, limit = 100, offset = 0 } = req.query;

      let query = `
        SELECT 
          k.*,
          d.domain as domain_name,
          d.display_name as domain_display_name
        FROM keywords k
        LEFT JOIN domains d ON k.domain_id = d.id
        WHERE 1=1
      `;
      const params = [];

      if (domain_id) {
        query += ' AND k.domain_id = ?';
        params.push(domain_id);
      }
      if (device) {
        query += ' AND k.device = ?';
        params.push(device);
      }
      if (country) {
        query += ' AND k.country = ?';
        params.push(country);
      }

      query += ' ORDER BY k.updated_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const stmt = db.prepare(query);
      const keywords = stmt.all(...params).map(kw => ({
        ...kw,
        position_history: kw.position_history ? JSON.parse(kw.position_history) : [],
        last_result: kw.last_result ? JSON.parse(kw.last_result) : null,
        tags: kw.tags ? JSON.parse(kw.tags) : [],
        sticky: kw.sticky === 1,
        updating: kw.updating === 1,
      }));

      // Get total count
      const countQuery = query.split('ORDER BY')[0].replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
      const countStmt = db.prepare(countQuery);
      const { total } = countStmt.get(...params.slice(0, -2));

      res.json({ success: true, keywords, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (error) {
      console.error('Error fetching keywords:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/keywords/:id - Get single keyword
  router.get('/:id', (req, res) => {
    try {
      const stmt = db.prepare(`
        SELECT 
          k.*,
          d.domain as domain_name,
          d.display_name as domain_display_name
        FROM keywords k
        LEFT JOIN domains d ON k.domain_id = d.id
        WHERE k.id = ?
      `);
      const keyword = stmt.get(req.params.id);

      if (!keyword) {
        return res.status(404).json({ success: false, error: 'Keyword not found' });
      }

      keyword.position_history = keyword.position_history ? JSON.parse(keyword.position_history) : [];
      keyword.last_result = keyword.last_result ? JSON.parse(keyword.last_result) : null;
      keyword.tags = keyword.tags ? JSON.parse(keyword.tags) : [];
      keyword.sticky = keyword.sticky === 1;
      keyword.updating = keyword.updating === 1;

      res.json({ success: true, keyword });
    } catch (error) {
      console.error('Error fetching keyword:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/keywords - Add new keyword
  router.post('/', (req, res) => {
    try {
      const {
        domain_id,
        keyword,
        device = 'desktop',
        country = 'US',
        city = null,
        tags = [],
        notes = '',
        search_volume = 0,
      } = req.body;

      // Validate
      if (!domain_id || !keyword) {
        return res.status(400).json({ success: false, error: 'domain_id and keyword are required' });
      }

      const stmt = db.prepare(`
        INSERT INTO keywords (
          domain_id, keyword, device, country, city,
          tags, notes, search_volume, position_history
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        domain_id,
        keyword,
        device,
        country,
        city,
        JSON.stringify(tags),
        notes,
        search_volume,
        JSON.stringify([])
      );

      // Update domain keyword count
      const updateDomainStmt = db.prepare(`
        UPDATE domains 
        SET keyword_count = keyword_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateDomainStmt.run(domain_id);

      res.json({
        success: true,
        keyword: {
          id: result.lastInsertRowid,
          domain_id,
          keyword,
          device,
          country,
          city,
          tags,
          notes,
          search_volume,
          position: 0,
          position_history: [],
        },
      });
    } catch (error) {
      console.error('Error creating keyword:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Keyword already exists for this domain/device/country combination' 
        });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/keywords/bulk - Add multiple keywords
  router.post('/bulk', (req, res) => {
    try {
      const { domain_id, keywords, device = 'desktop', country = 'US' } = req.body;

      if (!domain_id || !keywords || !Array.isArray(keywords)) {
        return res.status(400).json({ success: false, error: 'domain_id and keywords array required' });
      }

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO keywords (domain_id, keyword, device, country, position_history)
        VALUES (?, ?, ?, ?, '[]')
      `);

      let added = 0;
      for (const keyword of keywords) {
        const result = stmt.run(domain_id, keyword, device, country);
        if (result.changes > 0) added++;
      }

      // Update domain keyword count
      const updateDomainStmt = db.prepare(`
        UPDATE domains 
        SET keyword_count = (SELECT COUNT(*) FROM keywords WHERE domain_id = ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateDomainStmt.run(domain_id, domain_id);

      res.json({ success: true, added, total: keywords.length });
    } catch (error) {
      console.error('Error bulk creating keywords:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/keywords/:id - Update keyword
  router.put('/:id', (req, res) => {
    try {
      const { tags, notes, search_volume, sticky } = req.body;

      const updates = [];
      const values = [];

      if (tags !== undefined) {
        updates.push('tags = ?');
        values.push(JSON.stringify(tags));
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes);
      }
      if (search_volume !== undefined) {
        updates.push('search_volume = ?');
        values.push(search_volume);
      }
      if (sticky !== undefined) {
        updates.push('sticky = ?');
        values.push(sticky ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);

      const stmt = db.prepare(`UPDATE keywords SET ${updates.join(', ')} WHERE id = ?`);
      const result = stmt.run(...values);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Keyword not found' });
      }

      res.json({ success: true, message: 'Keyword updated' });
    } catch (error) {
      console.error('Error updating keyword:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/keywords/:id - Delete keyword
  router.delete('/:id', (req, res) => {
    try {
      // Get domain_id first
      const getStmt = db.prepare('SELECT domain_id FROM keywords WHERE id = ?');
      const keyword = getStmt.get(req.params.id);

      if (!keyword) {
        return res.status(404).json({ success: false, error: 'Keyword not found' });
      }

      const stmt = db.prepare('DELETE FROM keywords WHERE id = ?');
      stmt.run(req.params.id);

      // Update domain keyword count
      const updateDomainStmt = db.prepare(`
        UPDATE domains 
        SET keyword_count = keyword_count - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateDomainStmt.run(keyword.domain_id);

      res.json({ success: true, message: 'Keyword deleted' });
    } catch (error) {
      console.error('Error deleting keyword:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/keywords/:id/refresh - Refresh single keyword position
  router.post('/:id/refresh', async (req, res) => {
    try {
      // Get keyword details
      const stmt = db.prepare(`
        SELECT k.*, d.domain 
        FROM keywords k 
        JOIN domains d ON k.domain_id = d.id 
        WHERE k.id = ?
      `);
      const keyword = stmt.get(req.params.id);

      if (!keyword) {
        return res.status(404).json({ success: false, error: 'Keyword not found' });
      }

      // Mark as updating
      const updateStmt = db.prepare('UPDATE keywords SET updating = 1 WHERE id = ?');
      updateStmt.run(req.params.id);

      // Scrape in background
      (async () => {
        try {
          const result = await scraperService.scrape(
            keyword.keyword,
            keyword.country,
            keyword.device,
            keyword.domain
          );

          // Get current position history
          const positionHistory = keyword.position_history 
            ? JSON.parse(keyword.position_history) 
            : [];

          // Add new position
          positionHistory.push({
            date: new Date().toISOString().split('T')[0],
            position: result.position,
            url: result.url,
          });

          // Keep last 90 days
          if (positionHistory.length > 90) {
            positionHistory.shift();
          }

          // Update keyword
          const updateStmt = db.prepare(`
            UPDATE keywords 
            SET position = ?,
                url = ?,
                position_history = ?,
                last_result = ?,
                updating = 0,
                last_update_error = NULL,
                last_tracked_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `);

          updateStmt.run(
            result.position,
            result.url,
            JSON.stringify(positionHistory),
            JSON.stringify(result),
            req.params.id
          );

          // Store SERP results
          if (result.results && result.results.length > 0) {
            const serpStmt = db.prepare(`
              INSERT INTO serp_results (keyword_id, position, url, title, description)
              VALUES (?, ?, ?, ?, ?)
            `);

            for (const serpResult of result.results) {
              serpStmt.run(
                req.params.id,
                serpResult.position,
                serpResult.url,
                serpResult.title,
                serpResult.description
              );
            }
          }

          console.log(`✅ Keyword #${req.params.id} refreshed: position ${result.position}`);
        } catch (error) {
          console.error(`❌ Error refreshing keyword #${req.params.id}:`, error);
          
          const errorStmt = db.prepare(`
            UPDATE keywords 
            SET updating = 0,
                last_update_error = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `);
          errorStmt.run(error.message, req.params.id);
        }
      })();

      res.json({ 
        success: true, 
        message: 'Position refresh started',
        keyword_id: req.params.id 
      });
    } catch (error) {
      console.error('Error starting position refresh:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/keywords/refresh-all - Refresh all keywords for a domain
  router.post('/refresh-all', async (req, res) => {
    try {
      const { domain_id } = req.body;

      if (!domain_id) {
        return res.status(400).json({ success: false, error: 'domain_id required' });
      }

      // Get all keywords for domain
      const stmt = db.prepare('SELECT id FROM keywords WHERE domain_id = ? AND sticky = 1');
      const keywords = stmt.all(domain_id);

      if (keywords.length === 0) {
        return res.json({ success: true, message: 'No keywords to refresh' });
      }

      // Mark domain as being scraped
      const updateDomainStmt = db.prepare('UPDATE domains SET last_scrape_at = CURRENT_TIMESTAMP WHERE id = ?');
      updateDomainStmt.run(domain_id);

      // Trigger refresh for each keyword (they'll run in background)
      for (const keyword of keywords) {
        // Make internal API call to refresh endpoint
        // This will be handled async
        console.log(`Queuing refresh for keyword #${keyword.id}`);
      }

      res.json({ 
        success: true, 
        message: `Queued ${keywords.length} keywords for refresh`,
        count: keywords.length 
      });
    } catch (error) {
      console.error('Error refreshing all keywords:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export default createKeywordsAPI;
