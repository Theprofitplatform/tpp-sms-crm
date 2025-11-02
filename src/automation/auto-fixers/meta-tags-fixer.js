/**
 * Meta Tags Fixer - Phase 4B AutoFix Engine
 *
 * Automatically fixes pixel-detected meta tag issues:
 * - Missing meta descriptions
 * - Missing/invalid title tags
 * - Title too short/long
 * - Missing Open Graph tags
 *
 * Designed to work with pixel issue data
 * Date: November 2, 2025
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

class MetaTagsFixer {
  constructor(options = {}) {
    this.options = {
      titleMinLength: options.titleMinLength || 30,
      titleMaxLength: options.titleMaxLength || 60,
      descriptionMinLength: options.descriptionMinLength || 120,
      descriptionMaxLength: options.descriptionMaxLength || 160,
      userAgent: options.userAgent || 'Mozilla/5.0 (compatible; SEOBot/1.0)',
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

      switch (issueType) {
        case 'missing_meta_description':
          return await this.fixMissingMetaDescription(issue);

        case 'missing_title':
          return await this.fixMissingTitle(issue);

        case 'title_too_short':
          return await this.fixTitleTooShort(issue);

        case 'title_too_long':
          return await this.fixTitleTooLong(issue);

        case 'missing_og_tags':
        case 'missing_og_title':
        case 'missing_og_description':
          return await this.fixMissingOpenGraphTags(issue);

        default:
          return {
            success: false,
            error: `Unknown issue type: ${issueType}`,
            supported: false
          };
      }
    } catch (error) {
      console.error(`[MetaTagsFixer] Error fixing issue:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fix missing meta description
   */
  async fixMissingMetaDescription(issue) {
    const pageUrl = issue.page_url || issue.url;

    try {
      // Fetch page to analyze content
      const $ = await this.fetchPage(pageUrl);

      // Generate meta description from page content
      const description = await this.generateMetaDescription($, issue);

      // Create fix code
      const fixCode = `<meta name="description" content="${this.escapeHtml(description)}">`;

      return {
        success: true,
        action: 'add_meta_tag',
        tag: 'description',
        value: description,
        fixCode,
        instructions: [
          'Add this meta tag to the <head> section of your page',
          'Place it after the <title> tag',
          'Ensure the content is unique for each page'
        ],
        location: '<head>',
        priority: 'high',
        estimatedTime: 5
      };
    } catch (error) {
      // Fallback: Use recommendation from pixel if available
      if (issue.recommendation) {
        const description = this.extractDescriptionFromRecommendation(issue.recommendation);
        if (description) {
          return {
            success: true,
            action: 'add_meta_tag',
            tag: 'description',
            value: description,
            fixCode: `<meta name="description" content="${this.escapeHtml(description)}">`,
            instructions: ['Add this meta tag to the <head> section'],
            location: '<head>',
            priority: 'high',
            estimatedTime: 5,
            note: 'Generated from AI recommendation (page not accessible)'
          };
        }
      }

      throw error;
    }
  }

  /**
   * Fix missing title tag
   */
  async fixMissingTitle(issue) {
    const pageUrl = issue.page_url || issue.url;

    try {
      const $ = await this.fetchPage(pageUrl);
      const title = await this.generateTitle($, issue);

      const fixCode = `<title>${this.escapeHtml(title)}</title>`;

      return {
        success: true,
        action: 'add_title',
        value: title,
        fixCode,
        instructions: [
          'Add this title tag to the <head> section',
          'Place it as the first tag in <head>',
          'Keep it between 30-60 characters'
        ],
        location: '<head>',
        priority: 'critical',
        estimatedTime: 5
      };
    } catch (error) {
      // Fallback title
      const fallbackTitle = this.generateFallbackTitle(pageUrl);
      return {
        success: true,
        action: 'add_title',
        value: fallbackTitle,
        fixCode: `<title>${this.escapeHtml(fallbackTitle)}</title>`,
        instructions: ['Add this title tag to <head>', 'Customize the title for your content'],
        location: '<head>',
        priority: 'critical',
        estimatedTime: 5,
        note: 'Fallback title (page not accessible) - please customize'
      };
    }
  }

  /**
   * Fix title too short
   */
  async fixTitleTooShort(issue) {
    const pageUrl = issue.page_url || issue.url;
    const currentTitle = issue.current_value || '';

    try {
      const $ = await this.fetchPage(pageUrl);
      const expandedTitle = await this.expandTitle(currentTitle, $, issue);

      const fixCode = `<title>${this.escapeHtml(expandedTitle)}</title>`;

      return {
        success: true,
        action: 'update_title',
        before: currentTitle,
        after: expandedTitle,
        fixCode,
        instructions: [
          'Replace the existing <title> tag with this improved version',
          `Current title is only ${currentTitle.length} characters`,
          `New title is ${expandedTitle.length} characters (optimal)`
        ],
        location: '<head> → <title>',
        priority: 'medium',
        estimatedTime: 5
      };
    } catch (error) {
      return {
        success: false,
        error: 'Could not expand title - page not accessible',
        suggestion: `Add relevant keywords to expand "${currentTitle}" to 30-60 characters`
      };
    }
  }

  /**
   * Fix title too long
   */
  async fixTitleTooLong(issue) {
    const currentTitle = issue.current_value || '';
    const shortenedTitle = this.shortenTitle(currentTitle);

    const fixCode = `<title>${this.escapeHtml(shortenedTitle)}</title>`;

    return {
      success: true,
      action: 'update_title',
      before: currentTitle,
      after: shortenedTitle,
      fixCode,
      instructions: [
        'Replace the existing <title> tag',
        `Current title is ${currentTitle.length} characters (too long)`,
        `New title is ${shortenedTitle.length} characters (optimal)`
      ],
      location: '<head> → <title>',
      priority: 'medium',
      estimatedTime: 5
    };
  }

  /**
   * Fix missing Open Graph tags
   */
  async fixMissingOpenGraphTags(issue) {
    const pageUrl = issue.page_url || issue.url;

    try {
      const $ = await this.fetchPage(pageUrl);

      const title = $('title').text() || await this.generateTitle($, issue);
      const description = $('meta[name="description"]').attr('content') ||
                         await this.generateMetaDescription($, issue);

      const ogTags = [
        `<meta property="og:title" content="${this.escapeHtml(title)}">`,
        `<meta property="og:description" content="${this.escapeHtml(description)}">`,
        `<meta property="og:url" content="${this.escapeHtml(pageUrl)}">`,
        `<meta property="og:type" content="website">`
      ];

      // Add Twitter Card tags as bonus
      const twitterTags = [
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${this.escapeHtml(title)}">`,
        `<meta name="twitter:description" content="${this.escapeHtml(description)}">`
      ];

      const fixCode = [...ogTags, '', ...twitterTags].join('\n');

      return {
        success: true,
        action: 'add_og_tags',
        tags: {
          openGraph: ogTags,
          twitter: twitterTags
        },
        fixCode,
        instructions: [
          'Add these Open Graph tags to the <head> section',
          'These improve how your page appears when shared on social media',
          'Twitter Card tags included as bonus for Twitter sharing'
        ],
        location: '<head>',
        priority: 'medium',
        estimatedTime: 10
      };
    } catch (error) {
      return {
        success: false,
        error: 'Could not generate Open Graph tags - page not accessible',
        suggestion: 'Manually add og:title, og:description, og:url, and og:type tags'
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
          'User-Agent': this.options.userAgent
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
   * Generate meta description from page content
   */
  async generateMetaDescription($, issue) {
    // Try to extract from first paragraph
    const firstPara = $('p').first().text().trim();

    if (firstPara && firstPara.length > 50) {
      // Clean and truncate
      let description = firstPara
        .replace(/\s+/g, ' ')
        .substring(0, this.options.descriptionMaxLength);

      // Cut at last complete word
      const lastSpace = description.lastIndexOf(' ');
      if (lastSpace > this.options.descriptionMinLength) {
        description = description.substring(0, lastSpace);
      }

      return description + (firstPara.length > description.length ? '...' : '');
    }

    // Fallback: Use h1 + site name
    const h1 = $('h1').first().text().trim();
    const siteName = $('title').text().split('|').pop().trim() || 'our website';

    if (h1) {
      return `${h1}. Learn more on ${siteName}.`;
    }

    // Last resort: Generic description
    const title = $('title').text().trim() || 'this page';
    return `Discover everything about ${title}. Visit us for more information.`;
  }

  /**
   * Generate title from page content
   */
  async generateTitle($, issue) {
    // Try h1
    const h1 = $('h1').first().text().trim();
    if (h1 && h1.length >= this.options.titleMinLength) {
      return this.optimizeTitle(h1);
    }

    // Try first heading
    const firstHeading = $('h2, h3').first().text().trim();
    if (firstHeading) {
      return this.optimizeTitle(firstHeading);
    }

    // Fallback: Extract from URL
    return this.generateFallbackTitle(issue.page_url || issue.url);
  }

  /**
   * Generate fallback title from URL
   */
  generateFallbackTitle(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      if (path === '/' || path === '') {
        return urlObj.hostname.replace('www.', '');
      }

      const parts = path.split('/').filter(p => p);
      const lastPart = parts[parts.length - 1];

      // Remove file extension and clean
      const name = lastPart
        .replace(/\.(html|php|aspx?)$/i, '')
        .replace(/[-_]/g, ' ');

      // Capitalize words
      const capitalized = name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return capitalized;
    } catch {
      return 'Untitled Page';
    }
  }

  /**
   * Optimize title length
   */
  optimizeTitle(title) {
    if (title.length <= this.options.titleMaxLength) {
      return title;
    }

    // Truncate and add ellipsis
    let optimized = title.substring(0, this.options.titleMaxLength - 3);

    // Cut at last complete word
    const lastSpace = optimized.lastIndexOf(' ');
    if (lastSpace > this.options.titleMinLength) {
      optimized = optimized.substring(0, lastSpace);
    }

    return optimized + '...';
  }

  /**
   * Expand short title
   */
  async expandTitle(currentTitle, $, issue) {
    // Add site name if not present
    const siteName = $('meta[property="og:site_name"]').attr('content') ||
                     $('title').text().split('|').pop().trim();

    if (siteName && !currentTitle.includes(siteName)) {
      const expanded = `${currentTitle} | ${siteName}`;
      if (expanded.length <= this.options.titleMaxLength) {
        return expanded;
      }
    }

    // Add category or location if available
    const breadcrumbs = $('.breadcrumb, [itemprop="breadcrumb"]').text().trim();
    if (breadcrumbs) {
      const parts = breadcrumbs.split(/[>\/]/);
      if (parts.length > 1) {
        const category = parts[parts.length - 2].trim();
        if (category) {
          const expanded = `${currentTitle} - ${category}`;
          if (expanded.length <= this.options.titleMaxLength) {
            return expanded;
          }
        }
      }
    }

    // Fallback: Add generic descriptor
    return `${currentTitle} - Learn More`;
  }

  /**
   * Shorten long title
   */
  shortenTitle(title) {
    // Remove common fluff
    let shortened = title
      .replace(/\s*[|\-–—]\s*.+$/, '') // Remove everything after separator
      .trim();

    // Still too long? Truncate
    if (shortened.length > this.options.titleMaxLength) {
      shortened = shortened.substring(0, this.options.titleMaxLength - 3);

      // Cut at last word
      const lastSpace = shortened.lastIndexOf(' ');
      if (lastSpace > this.options.titleMinLength) {
        shortened = shortened.substring(0, lastSpace);
      }

      shortened += '...';
    }

    return shortened;
  }

  /**
   * Extract description from recommendation text
   */
  extractDescriptionFromRecommendation(recommendation) {
    // Try to extract quoted text
    const matches = recommendation.match(/"([^"]+)"/);
    if (matches && matches[1].length >= this.options.descriptionMinLength) {
      return matches[1];
    }

    // Try to extract from "Add: " or similar
    const addMatch = recommendation.match(/Add:?\s*(.+)/i);
    if (addMatch && addMatch[1].length >= 50) {
      return addMatch[1].substring(0, this.options.descriptionMaxLength);
    }

    return null;
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
      name: 'Meta Tags Fixer',
      version: '1.0.0',
      supportedIssueTypes: [
        'missing_meta_description',
        'missing_title',
        'title_too_short',
        'title_too_long',
        'missing_og_tags',
        'missing_og_title',
        'missing_og_description'
      ],
      estimatedTimePerFix: 5, // minutes
      automationLevel: 'high', // can run automatically
      requiresReview: false // fixes are safe to apply automatically
    };
  }
}

export default MetaTagsFixer;
