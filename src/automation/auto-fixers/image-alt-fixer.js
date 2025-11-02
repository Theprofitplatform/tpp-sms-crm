/**
 * Image Alt Text Fixer - Phase 4B AutoFix Engine
 *
 * Automatically fixes pixel-detected image alt text issues:
 * - Missing alt text on images
 * - Empty alt attributes
 * - Generic alt text
 *
 * Generates descriptive alt text from:
 * - Image filename
 * - Surrounding context
 * - Page title/heading
 *
 * Date: November 2, 2025
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';

class ImageAltFixer {
  constructor(options = {}) {
    this.options = {
      maxAltLength: options.maxAltLength || 125,
      useAI: options.useAI || false, // Set to true if AI service available
      aiService: options.aiService || null,
      timeout: options.timeout || 10000,
      ...options
    };
  }

  /**
   * Main entry point - fix a pixel issue
   *
   * @param {Object} issue - Pixel issue object
   * @returns {Object} Fix result with code and instructions
   */
  async fixIssue(issue) {
    try {
      const issueType = issue.issue_type || issue.type;

      if (!['missing_alt_text', 'images_without_alt', 'empty_alt_text'].includes(issueType)) {
        return {
          success: false,
          error: `Unsupported issue type: ${issueType}`,
          supported: false
        };
      }

      return await this.fixMissingAltText(issue);
    } catch (error) {
      console.error(`[ImageAltFixer] Error fixing issue:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fix missing alt text
   */
  async fixMissingAltText(issue) {
    const pageUrl = issue.page_url || issue.url;

    try {
      // Fetch page to find images
      const $ = await this.fetchPage(pageUrl);

      // Find all images without alt text
      const imagesWithoutAlt = [];
      $('img').each((i, elem) => {
        const $img = $(elem);
        const alt = $img.attr('alt');
        const src = $img.attr('src');

        if (!src) return;

        if (!alt || alt.trim() === '') {
          imagesWithoutAlt.push({
            src,
            context: this.getImageContext($, $img),
            index: i
          });
        }
      });

      if (imagesWithoutAlt.length === 0) {
        return {
          success: true,
          action: 'no_action_needed',
          message: 'No images found without alt text'
        };
      }

      // Generate alt text for each image
      const fixes = [];
      for (const img of imagesWithoutAlt) {
        const altText = await this.generateAltText(img.src, {
          context: img.context,
          pageTitle: $('title').text(),
          h1: $('h1').first().text()
        });

        fixes.push({
          imageSrc: img.src,
          altText,
          fixCode: `<img src="${img.src}" alt="${this.escapeHtml(altText)}">`
        });
      }

      // Create combined fix code
      const fixCode = this.generateBatchFixCode(fixes);

      return {
        success: true,
        action: 'add_alt_text',
        count: fixes.length,
        fixes,
        fixCode,
        instructions: [
          `Add alt text to ${fixes.length} image${fixes.length > 1 ? 's' : ''}`,
          'Each alt attribute should describe the image content',
          'Keep alt text concise but descriptive (under 125 characters)',
          'Use empty alt="" for decorative images'
        ],
        location: 'Images throughout the page',
        priority: 'high',
        estimatedTime: fixes.length * 3
      };
    } catch (error) {
      // Fallback: Generate generic instructions
      return {
        success: true,
        action: 'manual_fix_required',
        error: `Could not fetch page: ${error.message}`,
        instructions: [
          'Manually review all images on the page',
          'Add descriptive alt text to each image',
          'Alt text should describe what the image shows',
          'For decorative images, use alt=""'
        ],
        estimatedTime: 10,
        note: 'Page not accessible - manual fix required'
      };
    }
  }

  /**
   * Fetch and parse page
   */
  async fetchPage(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)'
        },
        timeout: this.options.timeout,
        maxRedirects: 5
      });

      return cheerio.load(response.data);
    } catch (error) {
      throw new Error(`Failed to fetch page: ${error.message}`);
    }
  }

  /**
   * Get context around image
   */
  getImageContext($, $img) {
    // Check for nearby text
    const parent = $img.parent();
    const parentText = parent.text().trim().substring(0, 200);

    // Check for figure caption
    const figure = $img.closest('figure');
    if (figure.length) {
      const caption = figure.find('figcaption').text().trim();
      if (caption) return caption;
    }

    // Check for nearby heading
    const prevHeading = $img.prevAll('h1, h2, h3, h4').first().text().trim();
    if (prevHeading) return prevHeading;

    // Return parent text if meaningful
    if (parentText && parentText.length > 10) {
      return parentText;
    }

    return '';
  }

  /**
   * Generate alt text for image
   */
  async generateAltText(imageSrc, context = {}) {
    // If AI service available, use it
    if (this.options.useAI && this.options.aiService) {
      try {
        const aiAltText = await this.options.aiService.generateAltText(imageSrc, context);
        return this.optimizeAltText(aiAltText);
      } catch (error) {
        console.warn('[ImageAltFixer] AI generation failed, using fallback');
      }
    }

    // Fallback: Generate from filename and context
    return this.generateAltTextFromFilename(imageSrc, context);
  }

  /**
   * Generate alt text from filename
   */
  generateAltTextFromFilename(imageSrc, context = {}) {
    try {
      // Extract filename
      const filename = path.basename(imageSrc, path.extname(imageSrc));

      // Clean filename
      let altText = filename
        // Remove common prefixes/suffixes
        .replace(/^(img|image|photo|pic|picture)[-_]/i, '')
        .replace(/[-_](img|image|photo|pic|picture)$/i, '')
        // Replace separators with spaces
        .replace(/[-_]/g, ' ')
        // Remove numbers (usually just IDs)
        .replace(/\b\d+\b/g, '')
        // Remove extra spaces
        .replace(/\s+/g, ' ')
        .trim();

      // Capitalize
      altText = this.capitalizeWords(altText);

      // If too short or empty, use context
      if (altText.length < 5 && context.context) {
        altText = context.context.substring(0, 100);
      }

      // If still too short, use page context
      if (altText.length < 5) {
        if (context.h1) {
          altText = `Image related to ${context.h1}`;
        } else if (context.pageTitle) {
          altText = `Image for ${context.pageTitle}`;
        } else {
          altText = 'Image';
        }
      }

      return this.optimizeAltText(altText);
    } catch (error) {
      return 'Image';
    }
  }

  /**
   * Capitalize words
   */
  capitalizeWords(text) {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Optimize alt text length and quality
   */
  optimizeAltText(altText) {
    // Remove common filler words at start
    altText = altText
      .replace(/^(a|an|the)\s+/i, '')
      .trim();

    // Ensure it's not too long
    if (altText.length > this.options.maxAltLength) {
      altText = altText.substring(0, this.options.maxAltLength);

      // Cut at last complete word
      const lastSpace = altText.lastIndexOf(' ');
      if (lastSpace > 50) {
        altText = altText.substring(0, lastSpace);
      }
    }

    return altText;
  }

  /**
   * Generate batch fix code
   */
  generateBatchFixCode(fixes) {
    const codeBlocks = fixes.map((fix, index) => {
      return `<!-- Image ${index + 1}: ${fix.imageSrc} -->
${fix.fixCode}`;
    });

    return codeBlocks.join('\n\n');
  }

  /**
   * Escape HTML for safe insertion
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get capabilities - what issue types this fixer supports
   */
  static getCapabilities() {
    return {
      name: 'Image Alt Text Fixer',
      version: '1.0.0',
      supportedIssueTypes: [
        'missing_alt_text',
        'images_without_alt',
        'empty_alt_text'
      ],
      estimatedTimePerFix: 3, // minutes per image
      automationLevel: 'medium', // requires some review
      requiresReview: true // should review generated alt text
    };
  }
}

export default ImageAltFixer;
