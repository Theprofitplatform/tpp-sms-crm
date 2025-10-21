import * as cheerio from 'cheerio';
import { config } from '../../config/env/config.js';
import { logger } from './logger.js';

/**
 * Content SEO Auditor
 */
export class SEOAuditor {
  constructor() {
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Run full SEO audit on a post
   */
  async auditPost(post) {
    const results = {
      postId: post.id,
      title: post.title.rendered,
      url: post.link,
      issues: [],
      suggestions: [],
      score: 100
    };

    // Load content into cheerio for parsing
    const $ = cheerio.load(post.content.rendered);

    // Run all audit checks
    this.checkTitle(post, results);
    this.checkMetaDescription(post, results);
    this.checkPermalink(post, results);
    this.checkHeadings($, results);
    this.checkContent(post, $, results);
    this.checkImages($, results);
    this.checkInternalLinks($, results);
    this.checkKeywordDensity(post, $, results);

    // Calculate final score
    results.score = Math.max(0, 100 - (results.issues.length * 5));

    return results;
  }

  /**
   * Check title tag
   */
  checkTitle(post, results) {
    const title = post.title.rendered;

    if (!title || title.trim().length === 0) {
      results.issues.push({
        type: 'title',
        severity: 'critical',
        message: 'Missing title',
        fix: 'Add a descriptive title'
      });
    } else if (title.length < 30) {
      results.issues.push({
        type: 'title',
        severity: 'warning',
        message: `Title too short (${title.length} chars)`,
        fix: 'Aim for 50-60 characters'
      });
    } else if (title.length > 60) {
      results.issues.push({
        type: 'title',
        severity: 'warning',
        message: `Title too long (${title.length} chars)`,
        fix: 'Keep under 60 characters to avoid truncation'
      });
    } else {
      results.suggestions.push({
        type: 'title',
        message: 'Title length is good'
      });
    }
  }

  /**
   * Check meta description
   */
  checkMetaDescription(post, results) {
    // Check if Yoast or Rank Math meta is available
    const metaDesc = post.yoast_head_json?.og_description ||
                     post.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim();

    if (!metaDesc || metaDesc.length === 0) {
      results.issues.push({
        type: 'meta_description',
        severity: 'high',
        message: 'Missing meta description',
        fix: 'Add a compelling meta description (150-160 chars)'
      });
    } else if (metaDesc.length < 120) {
      results.issues.push({
        type: 'meta_description',
        severity: 'warning',
        message: `Meta description too short (${metaDesc.length} chars)`,
        fix: 'Expand to 150-160 characters'
      });
    } else if (metaDesc.length > 160) {
      results.issues.push({
        type: 'meta_description',
        severity: 'warning',
        message: `Meta description too long (${metaDesc.length} chars)`,
        fix: 'Keep under 160 characters'
      });
    }
  }

  /**
   * Check permalink structure
   */
  checkPermalink(post, results) {
    const slug = post.slug;

    if (slug.length > 75) {
      results.issues.push({
        type: 'permalink',
        severity: 'low',
        message: 'URL slug is too long',
        fix: 'Shorten URL to improve readability'
      });
    }

    // Check for dates in URL (usually not recommended)
    if (/\d{4}\/\d{2}\/\d{2}/.test(post.link)) {
      results.suggestions.push({
        type: 'permalink',
        message: 'Consider removing dates from permalinks for evergreen content'
      });
    }

    // Check for stop words in slug
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at'];
    const slugWords = slug.split('-');
    const hasStopWords = slugWords.some(word => stopWords.includes(word));

    if (hasStopWords) {
      results.suggestions.push({
        type: 'permalink',
        message: 'Consider removing stop words from URL'
      });
    }
  }

  /**
   * Check heading structure
   */
  checkHeadings($, results) {
    const h1Tags = $('h1');
    const h2Tags = $('h2');

    if (h1Tags.length === 0) {
      results.issues.push({
        type: 'headings',
        severity: 'critical',
        message: 'Missing H1 tag',
        fix: 'Add a single H1 tag at the beginning of content'
      });
    } else if (h1Tags.length > 1) {
      results.issues.push({
        type: 'headings',
        severity: 'high',
        message: `Multiple H1 tags found (${h1Tags.length})`,
        fix: 'Use only one H1 tag per page'
      });
    }

    if (h2Tags.length === 0) {
      results.issues.push({
        type: 'headings',
        severity: 'medium',
        message: 'No H2 subheadings found',
        fix: 'Add H2 tags to structure your content'
      });
    }

    // Check heading hierarchy
    const headings = $('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    headings.each((i, elem) => {
      const level = parseInt(elem.tagName.charAt(1));

      if (level - previousLevel > 1) {
        results.issues.push({
          type: 'headings',
          severity: 'low',
          message: `Heading hierarchy skipped from H${previousLevel} to H${level}`,
          fix: 'Maintain proper heading hierarchy'
        });
      }

      previousLevel = level;
    });
  }

  /**
   * Check content quality
   */
  checkContent(post, $, results) {
    const content = $.text();
    const wordCount = content.trim().split(/\s+/).length;

    if (wordCount < config.automation.minContentLength) {
      results.issues.push({
        type: 'content',
        severity: 'high',
        message: `Thin content (${wordCount} words)`,
        fix: `Expand content to at least ${config.automation.minContentLength} words`
      });
    } else if (wordCount < 600) {
      results.suggestions.push({
        type: 'content',
        message: `Content could be expanded (currently ${wordCount} words)`
      });
    }

    // Check for paragraphs
    const paragraphs = $('p');
    if (paragraphs.length < 3) {
      results.issues.push({
        type: 'content',
        severity: 'medium',
        message: 'Few paragraphs detected',
        fix: 'Break content into more paragraphs for readability'
      });
    }

    // Check paragraph length
    paragraphs.each((i, elem) => {
      const text = $(elem).text().trim();
      const words = text.split(/\s+/).length;

      if (words > 150) {
        results.suggestions.push({
          type: 'content',
          message: 'Some paragraphs are very long - consider breaking them up'
        });
        return false; // break after first finding
      }
    });

    results.meta = {
      wordCount,
      paragraphCount: paragraphs.length
    };
  }

  /**
   * Check images
   */
  checkImages($, results) {
    const images = $('img');
    const missingAlt = [];

    images.each((i, elem) => {
      const $img = $(elem);
      const alt = $img.attr('alt');
      const src = $img.attr('src');

      if (!alt || alt.trim().length === 0) {
        missingAlt.push(src || `Image ${i + 1}`);
      }
    });

    if (missingAlt.length > 0) {
      results.issues.push({
        type: 'images',
        severity: 'high',
        message: `${missingAlt.length} image(s) missing alt text`,
        fix: 'Add descriptive alt text to all images',
        details: missingAlt.slice(0, 5) // Show first 5
      });
    }

    // Check for featured image
    if (!results.featuredImage) {
      results.suggestions.push({
        type: 'images',
        message: 'Consider adding a featured image'
      });
    }

    results.meta = results.meta || {};
    results.meta.imageCount = images.length;
  }

  /**
   * Check internal links
   */
  checkInternalLinks($, results) {
    const links = $('a[href^="http"]');
    const internalLinks = [];
    const externalLinks = [];

    links.each((i, elem) => {
      const href = $(elem).attr('href');

      if (href.includes(config.wordpress.url)) {
        internalLinks.push(href);
      } else {
        externalLinks.push(href);
      }
    });

    if (internalLinks.length === 0) {
      results.suggestions.push({
        type: 'links',
        message: 'Add internal links to related content'
      });
    }

    results.meta = results.meta || {};
    results.meta.internalLinks = internalLinks.length;
    results.meta.externalLinks = externalLinks.length;
  }

  /**
   * Check keyword density (basic)
   */
  checkKeywordDensity(post, $, results) {
    const content = $.text().toLowerCase();
    const title = post.title.rendered.toLowerCase();
    const words = content.trim().split(/\s+/);

    // Extract potential focus keyword from title (first 3-4 words)
    const titleWords = title.split(/\s+/).slice(0, 3).join(' ');

    const keywordCount = (content.match(new RegExp(titleWords, 'gi')) || []).length;
    const density = words.length > 0 ? (keywordCount / words.length) * 100 : 0;

    if (density < 0.5) {
      results.suggestions.push({
        type: 'keyword',
        message: 'Consider using your focus keyword more frequently in content'
      });
    } else if (density > 3) {
      results.issues.push({
        type: 'keyword',
        severity: 'medium',
        message: 'Possible keyword stuffing detected',
        fix: 'Reduce keyword density to 1-2%'
      });
    }

    results.meta = results.meta || {};
    results.meta.keywordDensity = density.toFixed(2);
  }
}

/**
 * Audit multiple posts
 */
export async function auditPosts(posts) {
  logger.section('Starting Content SEO Audit');

  const auditor = new SEOAuditor();
  const results = [];

  for (const post of posts) {
    logger.info(`Auditing: ${post.title.rendered}`);

    try {
      const result = await auditor.auditPost(post);
      results.push(result);

      logger.info(`Score: ${result.score}/100 | Issues: ${result.issues.length}`);
    } catch (error) {
      logger.error(`Failed to audit post ${post.id}`, error.message);
    }
  }

  logger.success(`Audited ${results.length} posts`);

  return results;
}
