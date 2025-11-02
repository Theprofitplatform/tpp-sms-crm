/**
 * PIXEL IMAGE ALT TEXT AUTO-FIX ENGINE
 *
 * Automatically fixes image alt text issues detected by pixel:
 * - Missing alt attributes
 * - Empty alt attributes
 * - Alt text too short (< 5 chars)
 * - Alt text too long (> 125 chars)
 * - Generic/non-descriptive alt text
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

export class PixelImageAltFixerEngine {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.name = 'pixel-image-alt-fixer';
    this.version = '1.0.0';

    // Generic alt texts to avoid
    this.genericAltTexts = [
      'image', 'img', 'photo', 'picture', 'graphic',
      'banner', 'header', 'footer', 'logo', 'icon'
    ];
  }

  /**
   * Check if this engine can fix the given issue
   *
   * @param {Object} issue - Pixel issue object
   * @returns {boolean} True if fixable
   */
  canFix(issue) {
    const fixableTypes = [
      'IMAGES_WITHOUT_ALT',
      'IMAGE_ALT_TOO_SHORT',
      'IMAGE_ALT_TOO_LONG',
      'IMAGE_ALT_GENERIC'
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
      'IMAGES_WITHOUT_ALT': () => this.generateAltTexts(issue),
      'IMAGE_ALT_TOO_SHORT': () => this.expandAltText(issue),
      'IMAGE_ALT_TOO_LONG': () => this.shortenAltText(issue),
      'IMAGE_ALT_GENERIC': () => this.improveAltText(issue)
    };

    const generator = fixGenerators[issue.issue_type];
    if (!generator) {
      throw new Error(`No fix generator for issue type: ${issue.issue_type}`);
    }

    return await generator();
  }

  /**
   * Generate alt text for images without alt attributes
   */
  async generateAltTexts(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    if (!pageData || !pageData.images_data) {
      return {
        code: '<!-- Unable to generate alt text: No image data available -->',
        confidence: 0,
        estimatedTime: 3,
        requiresReview: true,
        metadata: { error: 'No image data' }
      };
    }

    const images = JSON.parse(pageData.images_data);
    const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim() === '');

    if (imagesWithoutAlt.length === 0) {
      return {
        code: '<!-- No images missing alt text -->',
        confidence: 1,
        estimatedTime: 0,
        requiresReview: false,
        metadata: { imagesProcessed: 0 }
      };
    }

    const fixes = [];
    let totalConfidence = 0;

    for (const img of imagesWithoutAlt.slice(0, 10)) { // Limit to first 10
      const altText = await this.generateAltFromImage(img, pageData);
      const confidence = altText.confidence;
      totalConfidence += confidence;

      fixes.push({
        src: img.src,
        generatedAlt: altText.text,
        confidence
      });
    }

    const avgConfidence = totalConfidence / fixes.length;

    // Generate HTML fix code
    const fixCode = fixes.map(fix =>
      `<!-- Original: <img src="${fix.src}"> -->\n` +
      `<img src="${fix.src}" alt="${this.escapeHtml(fix.generatedAlt)}">`
    ).join('\n\n');

    return {
      code: fixCode,
      confidence: avgConfidence,
      estimatedTime: fixes.length * 3,
      requiresReview: avgConfidence < 0.75,
      metadata: {
        imagesProcessed: fixes.length,
        totalImages: imagesWithoutAlt.length,
        fixes
      }
    };
  }

  /**
   * Generate alt text from image properties
   */
  async generateAltFromImage(img, pageData) {
    let altText = '';
    let confidence = 0.3;

    // Strategy 1: Extract from filename
    if (img.src) {
      const filename = img.src.split('/').pop().split('?')[0].split('.')[0];
      altText = filename
        .replace(/[-_]/g, ' ')
        .replace(/\d+/g, '') // Remove numbers
        .trim();

      if (altText.length > 5 && !this.isGeneric(altText)) {
        confidence = 0.6;
      }
    }

    // Strategy 2: Use context from page title/h1
    if (confidence < 0.6 && pageData) {
      const pageTitle = pageData.page_title || '';
      const h1Tags = pageData.h1_tags ? JSON.parse(pageData.h1_tags) : [];

      if (h1Tags.length > 0) {
        altText = `${h1Tags[0]} - ${altText || 'image'}`;
        confidence = 0.7;
      } else if (pageTitle) {
        altText = `${pageTitle} - ${altText || 'image'}`;
        confidence = 0.65;
      }
    }

    // Strategy 3: Check if it's a logo
    if (img.src && (img.src.includes('logo') || img.src.includes('brand'))) {
      const client = await this.getClientInfo(issue.pixel_id);
      const brandName = client?.name || client?.domain || 'Company';
      altText = `${brandName} logo`;
      confidence = 0.85;
    }

    // Strategy 4: Position-based context
    if (img.src && img.src.includes('header')) {
      altText = `Header ${altText || 'image'}`;
      confidence = Math.min(confidence + 0.1, 0.8);
    } else if (img.src && img.src.includes('footer')) {
      altText = `Footer ${altText || 'image'}`;
      confidence = Math.min(confidence + 0.1, 0.8);
    }

    // Ensure it's not too short
    if (altText.length < 5) {
      altText = `Illustration for ${pageData?.page_title || 'page'}`;
      confidence = 0.5;
    }

    // Ensure it's not too long
    if (altText.length > 125) {
      altText = altText.substring(0, 122) + '...';
      confidence *= 0.9;
    }

    // Capitalize first letter
    altText = altText.charAt(0).toUpperCase() + altText.slice(1);

    return {
      text: altText,
      confidence
    };
  }

  /**
   * Expand too-short alt text
   */
  async expandAltText(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    if (!pageData || !pageData.images_data) {
      return {
        code: '<!-- Unable to expand alt text: No image data available -->',
        confidence: 0,
        estimatedTime: 5,
        requiresReview: true,
        metadata: { error: 'No image data' }
      };
    }

    const images = JSON.parse(pageData.images_data);
    const shortAltImages = images.filter(img => img.alt && img.alt.length < 5);

    const fixes = [];

    for (const img of shortAltImages.slice(0, 10)) {
      const currentAlt = img.alt;
      const pageTitle = pageData.page_title || '';

      // Expand by adding context
      let expandedAlt = currentAlt;

      if (pageTitle && !currentAlt.toLowerCase().includes(pageTitle.toLowerCase())) {
        expandedAlt = `${currentAlt} - ${pageTitle}`;
      }

      // If still too short, add descriptive words
      if (expandedAlt.length < 10) {
        expandedAlt = `${expandedAlt} image for website`;
      }

      fixes.push({
        src: img.src,
        originalAlt: currentAlt,
        expandedAlt
      });
    }

    const fixCode = fixes.map(fix =>
      `<!-- Original: <img alt="${fix.originalAlt}"> -->\n` +
      `<img src="${fix.src}" alt="${this.escapeHtml(fix.expandedAlt)}">`
    ).join('\n\n');

    return {
      code: fixCode,
      confidence: 0.7,
      estimatedTime: fixes.length * 3,
      requiresReview: true,
      metadata: {
        imagesProcessed: fixes.length,
        fixes
      }
    };
  }

  /**
   * Shorten too-long alt text
   */
  async shortenAltText(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    if (!pageData || !pageData.images_data) {
      return {
        code: '<!-- Unable to shorten alt text: No image data available -->',
        confidence: 0,
        estimatedTime: 5,
        requiresReview: true,
        metadata: { error: 'No image data' }
      };
    }

    const images = JSON.parse(pageData.images_data);
    const longAltImages = images.filter(img => img.alt && img.alt.length > 125);

    const fixes = [];

    for (const img of longAltImages.slice(0, 10)) {
      const currentAlt = img.alt;

      // Truncate intelligently
      let shortenedAlt = currentAlt.substring(0, 125);

      // Try to end at a word boundary
      const lastSpace = shortenedAlt.lastIndexOf(' ');
      if (lastSpace > 100) {
        shortenedAlt = currentAlt.substring(0, lastSpace);
      }

      // Remove any trailing punctuation except period
      shortenedAlt = shortenedAlt.replace(/[,;:!?]+$/, '');

      fixes.push({
        src: img.src,
        originalAlt: currentAlt,
        shortenedAlt
      });
    }

    const fixCode = fixes.map(fix =>
      `<!-- Original (${fix.originalAlt.length} chars): ${fix.originalAlt.substring(0, 50)}... -->\n` +
      `<img src="${fix.src}" alt="${this.escapeHtml(fix.shortenedAlt)}">`
    ).join('\n\n');

    return {
      code: fixCode,
      confidence: 0.85,
      estimatedTime: fixes.length * 2,
      requiresReview: false,
      metadata: {
        imagesProcessed: fixes.length,
        fixes
      }
    };
  }

  /**
   * Improve generic alt text
   */
  async improveAltText(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    if (!pageData || !pageData.images_data) {
      return {
        code: '<!-- Unable to improve alt text: No image data available -->',
        confidence: 0,
        estimatedTime: 5,
        requiresReview: true,
        metadata: { error: 'No image data' }
      };
    }

    const images = JSON.parse(pageData.images_data);
    const genericAltImages = images.filter(img =>
      img.alt && this.isGeneric(img.alt)
    );

    const fixes = [];

    for (const img of genericAltImages.slice(0, 10)) {
      const improvedAlt = await this.generateAltFromImage(img, pageData);

      fixes.push({
        src: img.src,
        originalAlt: img.alt,
        improvedAlt: improvedAlt.text,
        confidence: improvedAlt.confidence
      });
    }

    const fixCode = fixes.map(fix =>
      `<!-- Original (generic): ${fix.originalAlt} -->\n` +
      `<img src="${fix.src}" alt="${this.escapeHtml(fix.improvedAlt)}">`
    ).join('\n\n');

    const avgConfidence = fixes.reduce((sum, f) => sum + f.confidence, 0) / fixes.length;

    return {
      code: fixCode,
      confidence: avgConfidence,
      estimatedTime: fixes.length * 4,
      requiresReview: avgConfidence < 0.75,
      metadata: {
        imagesProcessed: fixes.length,
        fixes
      }
    };
  }

  /**
   * Check if alt text is generic
   */
  isGeneric(altText) {
    if (!altText) return true;

    const lowerAlt = altText.toLowerCase().trim();

    // Check exact matches
    if (this.genericAltTexts.includes(lowerAlt)) {
      return true;
    }

    // Check if it's ONLY a generic word
    const words = lowerAlt.split(/\s+/);
    if (words.length === 1 && this.genericAltTexts.includes(words[0])) {
      return true;
    }

    // Check if it's just numbers or very short
    if (lowerAlt.length < 3 || /^\d+$/.test(lowerAlt)) {
      return true;
    }

    return false;
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
      console.error('[ImageAltFixer] Error getting page data:', error.message);
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
      console.error('[ImageAltFixer] Error getting client info:', error.message);
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

export default new PixelImageAltFixerEngine();
