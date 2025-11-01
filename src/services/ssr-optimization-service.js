/**
 * SERVER-SIDE RENDERING OPTIMIZATION SERVICE
 *
 * Apply SEO optimizations without requiring CMS access
 * Works for any website by intercepting and modifying HTML
 *
 * Methods:
 * - HTML manipulation on-the-fly
 * - Caching for performance
 * - Support for title, meta, schema, hreflang, canonical tags
 * - Rollback capability
 *
 * Use Cases:
 * - Shopify, Wix, Squarespace sites (limited API access)
 * - Static HTML sites
 * - Third-party platforms
 * - Sites where direct editing isn't possible
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

class SSROptimizationService {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');

    // Optimization appliers
    this.appliers = {
      title: this.applyTitleOptimization.bind(this),
      meta_description: this.applyMetaDescriptionOptimization.bind(this),
      schema: this.applySchemaOptimization.bind(this),
      canonical: this.applyCanonicalOptimization.bind(this),
      hreflang: this.applyHreflangOptimization.bind(this),
      og_tags: this.applyOGTagsOptimization.bind(this),
      robots_meta: this.applyRobotsMetaOptimization.bind(this),
      structured_data: this.applyStructuredDataOptimization.bind(this)
    };
  }

  /**
   * Create a new SSR optimization
   */
  createOptimization(clientId, domain, pageUrl, optimizationType, originalValue, optimizedValue, options = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO ssr_optimizations (
        client_id, domain, page_url, optimization_type,
        original_value, optimized_value, status,
        application_method, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      clientId,
      domain,
      pageUrl,
      optimizationType,
      originalValue,
      optimizedValue,
      options.status || 'active',
      options.applicationMethod || 'proxy'
    );

    // Clear cache for this URL
    this.clearCache(pageUrl);

    return {
      id: result.lastInsertRowid,
      status: 'created'
    };
  }

  /**
   * Apply optimizations to HTML
   */
  async applyOptimizations(clientId, pageUrl, html) {
    // Get all active optimizations for this page
    const optimizations = this.db.prepare(`
      SELECT * FROM ssr_optimizations
      WHERE client_id = ? AND page_url = ? AND status = 'active'
      ORDER BY created_at ASC
    `).all(clientId, pageUrl);

    if (optimizations.length === 0) {
      return {
        modified: false,
        html,
        optimizationsApplied: 0
      };
    }

    // Load HTML into cheerio
    const $ = cheerio.load(html, {
      decodeEntities: false, // Preserve entities
      xmlMode: false
    });

    let modificationsCount = 0;

    // Apply each optimization
    for (const opt of optimizations) {
      try {
        const applier = this.appliers[opt.optimization_type];
        if (applier) {
          applier($, opt);
          modificationsCount++;

          // Update serve count
          this.db.prepare(`
            UPDATE ssr_optimizations
            SET serve_count = serve_count + 1,
                last_served_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(opt.id);
        }
      } catch (error) {
        console.error(`Error applying optimization ${opt.id}:`, error);
      }
    }

    const modifiedHtml = $.html();

    return {
      modified: modificationsCount > 0,
      html: modifiedHtml,
      optimizationsApplied: modificationsCount
    };
  }

  /**
   * Apply title optimization
   */
  applyTitleOptimization($, optimization) {
    $('title').remove();
    $('head').prepend(`<title>${this.escapeHtml(optimization.optimized_value)}</title>`);
  }

  /**
   * Apply meta description optimization
   */
  applyMetaDescriptionOptimization($, optimization) {
    $('meta[name="description"]').remove();
    $('head').append(
      `<meta name="description" content="${this.escapeHtml(optimization.optimized_value)}">`
    );
  }

  /**
   * Apply schema markup optimization
   */
  applySchemaOptimization($, optimization) {
    const schemaData = JSON.parse(optimization.optimized_value);

    // Remove existing schema of same type
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const existing = JSON.parse($(elem).html());
        if (existing['@type'] === schemaData['@type']) {
          $(elem).remove();
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    // Add new schema
    $('head').append(`
      <script type="application/ld+json">
      ${JSON.stringify(schemaData, null, 2)}
      </script>
    `);
  }

  /**
   * Apply canonical URL optimization
   */
  applyCanonicalOptimization($, optimization) {
    $('link[rel="canonical"]').remove();
    $('head').append(`<link rel="canonical" href="${this.escapeHtml(optimization.optimized_value)}">`);
  }

  /**
   * Apply hreflang optimization
   */
  applyHreflangOptimization($, optimization) {
    const hreflangData = JSON.parse(optimization.optimized_value);

    // Remove existing hreflang tags
    $('link[rel="alternate"]').remove();

    // Add new hreflang tags
    for (const lang of hreflangData) {
      $('head').append(
        `<link rel="alternate" hreflang="${lang.code}" href="${this.escapeHtml(lang.url)}">`
      );
    }
  }

  /**
   * Apply Open Graph tags optimization
   */
  applyOGTagsOptimization($, optimization) {
    const ogData = JSON.parse(optimization.optimized_value);

    // Remove existing OG tags
    $('meta[property^="og:"]').remove();

    // Add new OG tags
    for (const [key, value] of Object.entries(ogData)) {
      $('head').append(`<meta property="og:${key}" content="${this.escapeHtml(value)}">`);
    }

    // Also add Twitter cards
    if (ogData.title) {
      $('head').append(`<meta name="twitter:card" content="summary_large_image">`);
      $('head').append(`<meta name="twitter:title" content="${this.escapeHtml(ogData.title)}">`);
    }
    if (ogData.description) {
      $('head').append(`<meta name="twitter:description" content="${this.escapeHtml(ogData.description)}">`);
    }
    if (ogData.image) {
      $('head').append(`<meta name="twitter:image" content="${this.escapeHtml(ogData.image)}">`);
    }
  }

  /**
   * Apply robots meta tag optimization
   */
  applyRobotsMetaOptimization($, optimization) {
    $('meta[name="robots"]').remove();
    $('head').append(`<meta name="robots" content="${this.escapeHtml(optimization.optimized_value)}">`);
  }

  /**
   * Apply structured data optimization
   */
  applyStructuredDataOptimization($, optimization) {
    const structuredData = JSON.parse(optimization.optimized_value);
    $('head').append(`
      <script type="application/ld+json">
      ${JSON.stringify(structuredData, null, 2)}
      </script>
    `);
  }

  /**
   * Get cached optimization
   */
  getCachedOptimization(pageUrl) {
    const cacheKey = this.generateCacheKey(pageUrl);

    const cached = this.db.prepare(`
      SELECT cached_html, expires_at FROM ssr_cache
      WHERE cache_key = ? AND expires_at > datetime('now')
    `).get(cacheKey);

    if (cached) {
      // Update hit count
      this.db.prepare(`
        UPDATE ssr_cache
        SET hit_count = hit_count + 1,
            last_hit_at = CURRENT_TIMESTAMP
        WHERE cache_key = ?
      `).run(cacheKey);

      return cached.cached_html;
    }

    return null;
  }

  /**
   * Cache optimized HTML
   */
  cacheOptimization(optimizationId, pageUrl, html, ttlMinutes = 60) {
    const cacheKey = this.generateCacheKey(pageUrl);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    // Delete existing cache
    this.db.prepare(`
      DELETE FROM ssr_cache WHERE cache_key = ?
    `).run(cacheKey);

    // Insert new cache
    this.db.prepare(`
      INSERT INTO ssr_cache (
        optimization_id, url_pattern, cached_html,
        cache_key, expires_at, last_hit_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(optimizationId, pageUrl, html, cacheKey, expiresAt);
  }

  /**
   * Clear cache for a URL
   */
  clearCache(pageUrl) {
    const cacheKey = this.generateCacheKey(pageUrl);
    this.db.prepare(`
      DELETE FROM ssr_cache WHERE cache_key = ?
    `).run(cacheKey);
  }

  /**
   * Clear all cache for a client
   */
  clearAllCache(clientId) {
    // Get all optimization IDs for this client
    const optIds = this.db.prepare(`
      SELECT id FROM ssr_optimizations WHERE client_id = ?
    `).all(clientId).map(row => row.id);

    if (optIds.length === 0) return 0;

    const placeholders = optIds.map(() => '?').join(',');
    const result = this.db.prepare(`
      DELETE FROM ssr_cache WHERE optimization_id IN (${placeholders})
    `).run(...optIds);

    return result.changes;
  }

  /**
   * Generate cache key
   */
  generateCacheKey(pageUrl) {
    return crypto.createHash('md5').update(pageUrl).digest('hex');
  }

  /**
   * Get optimizations for a client
   */
  getOptimizations(clientId, options = {}) {
    const { pageUrl = null, status = 'active', limit = 100 } = options;

    let query = `
      SELECT * FROM ssr_optimizations
      WHERE client_id = ?
    `;
    const params = [clientId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (pageUrl) {
      query += ' AND page_url = ?';
      params.push(pageUrl);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(clientId) {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total_optimizations,
        COUNT(DISTINCT page_url) as pages_optimized,
        SUM(serve_count) as total_serves,
        optimization_type,
        COUNT(*) as count_by_type
      FROM ssr_optimizations
      WHERE client_id = ? AND status = 'active'
      GROUP BY optimization_type
    `).all(clientId);

    const cacheStats = this.db.prepare(`
      SELECT
        COUNT(*) as cached_pages,
        SUM(hit_count) as total_cache_hits,
        AVG(hit_count) as avg_hits_per_page
      FROM ssr_cache c
      JOIN ssr_optimizations o ON c.optimization_id = o.id
      WHERE o.client_id = ?
    `).get(clientId);

    return {
      stats,
      cacheStats
    };
  }

  /**
   * Deactivate optimization
   */
  deactivateOptimization(clientId, optimizationId) {
    const result = this.db.prepare(`
      UPDATE ssr_optimizations
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND client_id = ?
    `).run(optimizationId, clientId);

    if (result.changes > 0) {
      // Clear related cache
      this.db.prepare(`
        DELETE FROM ssr_cache WHERE optimization_id = ?
      `).run(optimizationId);
    }

    return result.changes > 0;
  }

  /**
   * Rollback optimization
   */
  rollbackOptimization(clientId, optimizationId, reason) {
    const result = this.db.prepare(`
      UPDATE ssr_optimizations
      SET status = 'inactive',
          rollback_at = CURRENT_TIMESTAMP,
          rollback_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND client_id = ?
    `).run(reason, optimizationId, clientId);

    if (result.changes > 0) {
      // Clear related cache
      this.db.prepare(`
        DELETE FROM ssr_cache WHERE optimization_id = ?
      `).run(optimizationId);
    }

    return result.changes > 0;
  }

  /**
   * Batch create optimizations
   */
  batchCreateOptimizations(clientId, domain, optimizations) {
    const stmt = this.db.prepare(`
      INSERT INTO ssr_optimizations (
        client_id, domain, page_url, optimization_type,
        original_value, optimized_value, status, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `);

    const results = [];

    const transaction = this.db.transaction(() => {
      for (const opt of optimizations) {
        const result = stmt.run(
          clientId,
          domain,
          opt.pageUrl,
          opt.type,
          opt.originalValue || '',
          opt.optimizedValue,
        );
        results.push(result.lastInsertRowid);

        // Clear cache
        this.clearCache(opt.pageUrl);
      }
    });

    transaction();

    return {
      created: results.length,
      ids: results
    };
  }

  /**
   * Test optimization without applying
   */
  testOptimization(html, optimizationType, optimizedValue) {
    const $ = cheerio.load(html, { decodeEntities: false });

    const testOpt = {
      optimization_type: optimizationType,
      optimized_value: optimizedValue
    };

    try {
      const applier = this.appliers[optimizationType];
      if (applier) {
        applier($, testOpt);
        return {
          success: true,
          html: $.html(),
          preview: this.generatePreview($, optimizationType)
        };
      } else {
        return {
          success: false,
          error: 'Unknown optimization type'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate preview of optimization
   */
  generatePreview($, optimizationType) {
    switch (optimizationType) {
      case 'title':
        return { title: $('title').text() };
      case 'meta_description':
        return { metaDescription: $('meta[name="description"]').attr('content') };
      case 'schema':
        const schemas = [];
        $('script[type="application/ld+json"]').each((i, elem) => {
          try {
            schemas.push(JSON.parse($(elem).html()));
          } catch (e) {}
        });
        return { schemas };
      case 'canonical':
        return { canonical: $('link[rel="canonical"]').attr('href') };
      case 'og_tags':
        const ogTags = {};
        $('meta[property^="og:"]').each((i, elem) => {
          const property = $(elem).attr('property').replace('og:', '');
          ogTags[property] = $(elem).attr('content');
        });
        return { ogTags };
      default:
        return {};
    }
  }

  /**
   * Escape HTML entities
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Track performance impact
   */
  trackPerformanceImpact(optimizationId, metrics) {
    this.db.prepare(`
      UPDATE ssr_optimizations
      SET performance_impact = ?
      WHERE id = ?
    `).run(JSON.stringify(metrics), optimizationId);
  }

  /**
   * Get performance metrics for optimizations
   */
  getPerformanceMetrics(clientId, pageUrl) {
    const optimizations = this.db.prepare(`
      SELECT id, optimization_type, performance_impact, created_at
      FROM ssr_optimizations
      WHERE client_id = ? AND page_url = ? AND performance_impact IS NOT NULL
      ORDER BY created_at DESC
    `).all(clientId, pageUrl);

    return optimizations.map(opt => ({
      ...opt,
      performance_impact: opt.performance_impact ? JSON.parse(opt.performance_impact) : null
    }));
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache() {
    const result = this.db.prepare(`
      DELETE FROM ssr_cache
      WHERE expires_at < datetime('now')
    `).run();

    return result.changes;
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return this.db.prepare(`
      SELECT
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        AVG(hit_count) as avg_hits,
        COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_entries,
        COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired_entries
      FROM ssr_cache
    `).get();
  }
}

export default new SSROptimizationService();
