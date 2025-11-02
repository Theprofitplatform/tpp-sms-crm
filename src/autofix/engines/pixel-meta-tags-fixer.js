/**
 * PIXEL META TAGS AUTO-FIX ENGINE
 *
 * Automatically fixes meta tag issues detected by pixel:
 * - Missing title tags
 * - Title too short/long
 * - Missing meta descriptions
 * - Meta description too short/long
 * - Missing Open Graph tags
 * - Missing Twitter Card tags
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

export class PixelMetaTagsFixerEngine {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.name = 'pixel-meta-tags-fixer';
    this.version = '1.0.0';
  }

  /**
   * Check if this engine can fix the given issue
   *
   * @param {Object} issue - Pixel issue object
   * @returns {boolean} True if fixable
   */
  canFix(issue) {
    const fixableTypes = [
      'MISSING_TITLE',
      'TITLE_TOO_SHORT',
      'TITLE_TOO_LONG',
      'MISSING_META_DESCRIPTION',
      'META_TOO_SHORT',
      'META_TOO_LONG',
      'MISSING_OG_TAGS',
      'MISSING_TWITTER_CARD'
    ];

    return fixableTypes.includes(issue.issue_type);
  }

  /**
   * Generate a fix for the issue
   *
   * @param {Object} issue - Pixel issue object
   * @returns {Promise<Object>} Fix proposal
   */
  async generateFix(issue) {
    const fixGenerators = {
      'MISSING_TITLE': () => this.generateTitleTag(issue),
      'TITLE_TOO_SHORT': () => this.expandTitle(issue),
      'TITLE_TOO_LONG': () => this.shortenTitle(issue),
      'MISSING_META_DESCRIPTION': () => this.generateMetaDescription(issue),
      'META_TOO_SHORT': () => this.expandMetaDescription(issue),
      'META_TOO_LONG': () => this.shortenMetaDescription(issue),
      'MISSING_OG_TAGS': () => this.generateOpenGraphTags(issue),
      'MISSING_TWITTER_CARD': () => this.generateTwitterCard(issue)
    };

    const generator = fixGenerators[issue.issue_type];
    if (!generator) {
      throw new Error(`No fix generator for issue type: ${issue.issue_type}`);
    }

    return await generator();
  }

  /**
   * Generate title tag from page content
   */
  async generateTitleTag(issue) {
    // Get page data
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    let title = '';
    let confidence = 0.5;

    if (pageData?.h1_tags && JSON.parse(pageData.h1_tags).length > 0) {
      // Use H1 as title
      title = JSON.parse(pageData.h1_tags)[0];
      confidence = 0.9;
    } else {
      // Generate from URL
      const urlParts = new URL(issue.page_url).pathname.split('/').filter(p => p);
      title = urlParts[urlParts.length - 1] || 'Home';
      title = title.replace(/-/g, ' ').replace(/_/g, ' ');
      title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      confidence = 0.6;
    }

    // Ensure length is appropriate
    if (title.length < 50) {
      // Add brand/site name if available
      const client = await this.getClientInfo(issue.pixel_id);
      if (client) {
        title += ` | ${client.name || client.domain}`;
      }
    }

    // Truncate if too long
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
      confidence *= 0.9;
    }

    return {
      code: `<title>${this.escapeHtml(title)}</title>`,
      confidence,
      estimatedTime: 5,
      requiresReview: confidence < 0.8,
      metadata: {
        generatedFrom: pageData?.h1_tags ? 'h1' : 'url',
        originalLength: 0,
        newLength: title.length
      }
    };
  }

  /**
   * Expand short title
   */
  async expandTitle(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);
    const currentTitle = pageData?.page_title || '';

    const client = await this.getClientInfo(issue.pixel_id);
    const brandName = client?.name || client?.domain || '';

    let expandedTitle = currentTitle;

    // Add brand name if not present
    if (brandName && !currentTitle.toLowerCase().includes(brandName.toLowerCase())) {
      expandedTitle += ` | ${brandName}`;
    }

    // If still too short, add descriptive words
    if (expandedTitle.length < 50 && pageData?.h1_tags) {
      const h1 = JSON.parse(pageData.h1_tags)[0];
      if (h1 && !expandedTitle.includes(h1)) {
        expandedTitle = `${h1} - ${expandedTitle}`;
      }
    }

    return {
      code: `<title>${this.escapeHtml(expandedTitle)}</title>`,
      confidence: 0.75,
      estimatedTime: 5,
      requiresReview: true,
      metadata: {
        originalTitle: currentTitle,
        originalLength: currentTitle.length,
        newLength: expandedTitle.length
      }
    };
  }

  /**
   * Shorten long title
   */
  async shortenTitle(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);
    const currentTitle = pageData?.page_title || '';

    // Remove common unnecessary parts
    let shortenedTitle = currentTitle
      .replace(/\s*\|\s*.*$/, '') // Remove everything after pipe
      .replace(/\s*-\s*.*$/, '') // Remove everything after dash
      .substring(0, 60);

    // If still too long, truncate intelligently
    if (shortenedTitle.length > 60) {
      const words = shortenedTitle.split(' ');
      shortenedTitle = '';
      for (const word of words) {
        if ((shortenedTitle + ' ' + word).length <= 57) {
          shortenedTitle += (shortenedTitle ? ' ' : '') + word;
        } else {
          break;
        }
      }
      shortenedTitle += '...';
    }

    return {
      code: `<title>${this.escapeHtml(shortenedTitle)}</title>`,
      confidence: 0.8,
      estimatedTime: 5,
      requiresReview: true,
      metadata: {
        originalTitle: currentTitle,
        originalLength: currentTitle.length,
        newLength: shortenedTitle.length
      }
    };
  }

  /**
   * Generate meta description from page content
   */
  async generateMetaDescription(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    let description = '';
    let confidence = 0.5;

    // Try to extract from first paragraph or H1
    if (pageData?.h1_tags) {
      const h1 = JSON.parse(pageData.h1_tags)[0];
      description = h1;
      confidence = 0.7;
    }

    // Expand to appropriate length
    if (description.length < 120) {
      // Add generic site description
      const client = await this.getClientInfo(issue.pixel_id);
      if (client) {
        description += `. Learn more about ${client.name || client.domain}.`;
      }
    }

    // Ensure it's not too long
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }

    return {
      code: `<meta name="description" content="${this.escapeHtml(description)}">`,
      confidence,
      estimatedTime: 10,
      requiresReview: confidence < 0.8,
      metadata: {
        generatedFrom: 'h1',
        length: description.length
      }
    };
  }

  /**
   * Expand short meta description
   */
  async expandMetaDescription(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);
    const currentMeta = pageData?.meta_description || '';

    let expandedMeta = currentMeta;

    // Add more context
    const client = await this.getClientInfo(issue.pixel_id);
    if (client && expandedMeta.length < 120) {
      expandedMeta += `. Visit ${client.domain} for more information.`;
    }

    // Ensure appropriate length
    if (expandedMeta.length > 160) {
      expandedMeta = expandedMeta.substring(0, 157) + '...';
    }

    return {
      code: `<meta name="description" content="${this.escapeHtml(expandedMeta)}">`,
      confidence: 0.7,
      estimatedTime: 10,
      requiresReview: true,
      metadata: {
        originalLength: currentMeta.length,
        newLength: expandedMeta.length
      }
    };
  }

  /**
   * Shorten long meta description
   */
  async shortenMetaDescription(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);
    const currentMeta = pageData?.meta_description || '';

    // Truncate to 160 characters intelligently
    let shortenedMeta = currentMeta.substring(0, 160);

    // Try to end at a sentence or word boundary
    const lastPeriod = shortenedMeta.lastIndexOf('.');
    const lastSpace = shortenedMeta.lastIndexOf(' ');

    if (lastPeriod > 100) {
      shortenedMeta = currentMeta.substring(0, lastPeriod + 1);
    } else if (lastSpace > 140) {
      shortenedMeta = currentMeta.substring(0, lastSpace) + '...';
    } else {
      shortenedMeta = currentMeta.substring(0, 157) + '...';
    }

    return {
      code: `<meta name="description" content="${this.escapeHtml(shortenedMeta)}">`,
      confidence: 0.85,
      estimatedTime: 5,
      requiresReview: false,
      metadata: {
        originalLength: currentMeta.length,
        newLength: shortenedMeta.length
      }
    };
  }

  /**
   * Generate Open Graph tags
   */
  async generateOpenGraphTags(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);
    const client = await this.getClientInfo(issue.pixel_id);

    const title = pageData?.page_title || 'Page';
    const description = pageData?.meta_description || 'Visit our website';
    const url = issue.page_url;
    const siteName = client?.name || client?.domain || '';

    const ogTags = `
<!-- Open Graph Tags -->
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${this.escapeHtml(title)}">
<meta property="og:description" content="${this.escapeHtml(description)}">
<meta property="og:site_name" content="${this.escapeHtml(siteName)}">`.trim();

    return {
      code: ogTags,
      confidence: 0.8,
      estimatedTime: 10,
      requiresReview: true,
      metadata: {
        tagsGenerated: 5
      }
    };
  }

  /**
   * Generate Twitter Card tags
   */
  async generateTwitterCard(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    const title = pageData?.page_title || 'Page';
    const description = pageData?.meta_description || 'Visit our website';

    const twitterTags = `
<!-- Twitter Card Tags -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${this.escapeHtml(title)}">
<meta name="twitter:description" content="${this.escapeHtml(description)}">`.trim();

    return {
      code: twitterTags,
      confidence: 0.8,
      estimatedTime: 10,
      requiresReview: true,
      metadata: {
        tagsGenerated: 3
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
      console.error('[MetaTagsFixer] Error getting page data:', error.message);
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
      console.error('[MetaTagsFixer] Error getting client info:', error.message);
      return null;
    }
  }

  /**
   * Helper: Escape HTML for attributes
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
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default new PixelMetaTagsFixerEngine();
