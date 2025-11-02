/**
 * PIXEL CONTENT AUTO-FIX ENGINE
 *
 * Automatically fixes content-related issues detected by pixel:
 * - Missing H1 tags
 * - Thin content (low word count)
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

export class PixelContentFixerEngine {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.name = 'pixel-content-fixer';
    this.version = '1.0.0';
  }

  /**
   * Check if this engine can fix the given issue
   */
  canFix(issue) {
    const fixableTypes = [
      'MISSING_H1',
      'THIN_CONTENT'
    ];

    return fixableTypes.includes(issue.issue_type);
  }

  /**
   * Generate a fix for the issue
   */
  async generateFix(issue) {
    const fixGenerators = {
      'MISSING_H1': () => this.generateH1(issue),
      'THIN_CONTENT': () => this.expandContent(issue)
    };

    const generator = fixGenerators[issue.issue_type];
    if (!generator) {
      throw new Error(`No fix generator for issue type: ${issue.issue_type}`);
    }

    return await generator();
  }

  /**
   * Generate H1 tag from page content
   */
  async generateH1(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);

    let h1Text = '';
    let confidence = 0.5;

    // Strategy 1: Use page title
    if (pageData?.page_title) {
      h1Text = pageData.page_title;
      // Remove site name if present
      h1Text = h1Text.split(' | ')[0].split(' - ')[0];
      confidence = 0.85;
    }

    // Strategy 2: Use first H2
    if (!h1Text && pageData?.h2_tags) {
      const h2Tags = JSON.parse(pageData.h2_tags);
      if (h2Tags.length > 0) {
        h1Text = h2Tags[0];
        confidence = 0.75;
      }
    }

    // Strategy 3: Generate from URL
    if (!h1Text) {
      const urlParts = new URL(issue.page_url).pathname.split('/').filter(p => p);
      h1Text = urlParts[urlParts.length - 1] || 'Home';
      h1Text = h1Text.replace(/-/g, ' ').replace(/_/g, ' ');
      h1Text = h1Text.split(' ').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      confidence = 0.6;
    }

    // Ensure it's not too long
    if (h1Text.length > 70) {
      h1Text = h1Text.substring(0, 67) + '...';
      confidence *= 0.9;
    }

    return {
      code: `<h1>${this.escapeHtml(h1Text)}</h1>`,
      confidence,
      estimatedTime: 5,
      requiresReview: confidence < 0.8,
      metadata: {
        generatedFrom: pageData?.page_title ? 'title' : 'url',
        length: h1Text.length
      }
    };
  }

  /**
   * Provide recommendations for thin content
   */
  async expandContent(issue) {
    const pageData = await this.getPageData(issue.pixel_id, issue.page_url);
    const currentWordCount = pageData?.word_count || 0;

    const suggestions = [
      `Current word count: ${currentWordCount} words`,
      'Recommended minimum: 300 words for standard pages, 1000+ for pillar content',
      'Add detailed descriptions and explanations',
      'Include relevant examples and use cases',
      'Add FAQ section to address common questions',
      'Include customer testimonials or case studies',
      'Add more context about your services/products',
      'Consider adding a comparison table or detailed specifications'
    ];

    const code = `<!-- Content Expansion Recommendations -->
<!-- Current word count: ${currentWordCount} -->
<!-- Target: 300-1000+ words -->

<!-- Suggested content structure: -->

<section class="content-main">
  <h2>Overview</h2>
  <p>[Add 2-3 paragraphs explaining the topic in detail]</p>
</section>

<section class="content-details">
  <h2>Key Benefits</h2>
  <ul>
    <li>[Benefit 1 with detailed explanation]</li>
    <li>[Benefit 2 with detailed explanation]</li>
    <li>[Benefit 3 with detailed explanation]</li>
  </ul>
</section>

<section class="content-faq">
  <h2>Frequently Asked Questions</h2>
  <div class="faq-item">
    <h3>Question 1?</h3>
    <p>[Detailed answer]</p>
  </div>
  <div class="faq-item">
    <h3>Question 2?</h3>
    <p>[Detailed answer]</p>
  </div>
</section>

<section class="content-cta">
  <h2>Get Started</h2>
  <p>[Call to action with supporting information]</p>
</section>`;

    return {
      code,
      confidence: 0.6,
      estimatedTime: 60,
      requiresReview: true,
      metadata: {
        currentWordCount,
        targetWordCount: 300,
        suggestions
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
      console.error('[ContentFixer] Error getting page data:', error.message);
      return null;
    }
  }

  /**
   * Helper: Escape HTML
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

export default new PixelContentFixerEngine();
