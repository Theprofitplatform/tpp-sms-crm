/**
 * PIXEL SCHEMA MARKUP AUTO-FIX ENGINE
 *
 * Automatically fixes schema markup issues detected by pixel:
 * - Missing schema markup
 * - Invalid schema
 * - Incomplete schema
 *
 * Integrates with existing Schema Automation feature
 *
 * Phase: 4B - AutoFix Integration
 * Date: November 2, 2025
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'seo-automation.db');

export class PixelSchemaFixerEngine {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.name = 'pixel-schema-fixer';
    this.version = '1.0.0';
  }

  /**
   * Check if this engine can fix the given issue
   */
  canFix(issue) {
    const fixableTypes = [
      'MISSING_SCHEMA',
      'MISSING_ORGANIZATION_SCHEMA',
      'MISSING_WEBPAGE_SCHEMA',
      'MISSING_BREADCRUMB_SCHEMA',
      'INVALID_SCHEMA'
    ];

    return fixableTypes.includes(issue.issue_type);
  }

  /**
   * Generate a fix for the issue
   */
  async generateFix(issue) {
    const fixGenerators = {
      'MISSING_SCHEMA': () => this.generateBasicSchema(issue),
      'MISSING_ORGANIZATION_SCHEMA': () => this.generateOrganizationSchema(issue),
      'MISSING_WEBPAGE_SCHEMA': () => this.generateWebPageSchema(issue),
      'MISSING_BREADCRUMB_SCHEMA': () => this.generateBreadcrumbSchema(issue),
      'INVALID_SCHEMA': () => this.fixInvalidSchema(issue)
    };

    const generator = fixGenerators[issue.issue_type];
    if (!generator) {
      throw new Error(`No fix generator for issue type: ${issue.issue_type}`);
    }

    return await generator();
  }

  /**
   * Generate basic schema based on page type
   */
  async generateBasicSchema(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);
    const client = await this.getClientInfo(issue.pixel_id);

    // Detect page type from URL and content
    const isHomepage = new URL(issue.page_url).pathname === '/';

    if (isHomepage) {
      return this.generateOrganizationSchema(issue);
    } else {
      return this.generateWebPageSchema(issue);
    }
  }

  /**
   * Generate Organization schema
   */
  async generateOrganizationSchema(issue) {
    const client = await this.getClientInfo(issue.pixel_id);
    const url = new URL(issue.page_url);

    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": client?.name || client?.domain || url.hostname,
      "url": `${url.protocol}//${url.hostname}`,
      "logo": `${url.protocol}//${url.hostname}/logo.png`
    };

    // Add additional fields if available
    if (client?.email) {
      schema.email = client.email;
    }

    const schemaJson = JSON.stringify(schema, null, 2);

    return {
      code: `<script type="application/ld+json">\n${schemaJson}\n</script>`,
      confidence: 0.85,
      estimatedTime: 15,
      requiresReview: true,
      metadata: {
        schemaType: 'Organization',
        fieldsPopulated: Object.keys(schema).length
      }
    };
  }

  /**
   * Generate WebPage schema
   */
  async generateWebPageSchema(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": pageData?.page_title || 'Page',
      "url": issue.page_url,
      "description": pageData?.meta_description || ''
    };

    // Add breadcrumb if not homepage
    const url = new URL(issue.page_url);
    if (url.pathname !== '/') {
      schema.breadcrumb = {
        "@type": "BreadcrumbList",
        "itemListElement": this.generateBreadcrumbItems(url)
      };
    }

    const schemaJson = JSON.stringify(schema, null, 2);

    return {
      code: `<script type="application/ld+json">\n${schemaJson}\n</script>`,
      confidence: 0.8,
      estimatedTime: 15,
      requiresReview: true,
      metadata: {
        schemaType: 'WebPage',
        fieldsPopulated: Object.keys(schema).length
      }
    };
  }

  /**
   * Generate Breadcrumb schema
   */
  async generateBreadcrumbSchema(issue) {
    const url = new URL(issue.page_url);
    const items = this.generateBreadcrumbItems(url);

    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items
    };

    const schemaJson = JSON.stringify(schema, null, 2);

    return {
      code: `<script type="application/ld+json">\n${schemaJson}\n</script>`,
      confidence: 0.9,
      estimatedTime: 10,
      requiresReview: false,
      metadata: {
        schemaType: 'BreadcrumbList',
        itemCount: items.length
      }
    };
  }

  /**
   * Generate breadcrumb items from URL
   */
  generateBreadcrumbItems(url) {
    const pathParts = url.pathname.split('/').filter(p => p);
    const items = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${url.protocol}//${url.hostname}`
      }
    ];

    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      const name = part.replace(/-/g, ' ').replace(/_/g, ' ');
      const capitalized = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      items.push({
        "@type": "ListItem",
        "position": index + 2,
        "name": capitalized,
        "item": `${url.protocol}//${url.hostname}${currentPath}`
      });
    });

    return items;
  }

  /**
   * Fix invalid schema
   */
  async fixInvalidSchema(issue) {
    // This would require analyzing the existing schema
    // For now, suggest regenerating
    return {
      code: `<!-- Suggestion: Regenerate schema using one of the generators above -->`,
      confidence: 0.6,
      estimatedTime: 20,
      requiresReview: true,
      metadata: {
        note: 'Manual schema validation recommended'
      }
    };
  }

  /**
   * Helper: Get page data from database
   */
  async getPageData(pixelId, pageUrl) {
    try {
      return this.db.prepare(`
        SELECT * FROM pixel_page_data
        WHERE pixel_id = ? AND url = ?
        ORDER BY tracked_at DESC
        LIMIT 1
      `).get(pixelId, pageUrl);
    } catch (error) {
      console.error('[SchemaFixer] Error getting page data:', error.message);
      return null;
    }
  }

  /**
   * Helper: Get client info
   */
  async getClientInfo(pixelId) {
    try {
      const pixel = this.db.prepare('SELECT client_id, domain FROM pixel_deployments WHERE id = ?').get(pixelId);
      if (!pixel) return null;

      const client = this.db.prepare('SELECT * FROM clients WHERE id = ?').get(pixel.client_id);
      return client || { domain: pixel.domain };
    } catch (error) {
      console.error('[SchemaFixer] Error getting client info:', error.message);
      return null;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default new PixelSchemaFixerEngine();
