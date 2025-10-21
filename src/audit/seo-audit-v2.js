import * as cheerio from 'cheerio';
import { logger } from './logger.js';

/**
 * Enhanced SEO Auditor V2
 * Comprehensive SEO analysis with image, readability, and advanced checks
 */
export class SEOAuditorV2 {
  constructor() {
    this.stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'is', 'was', 'are', 'been', 'be', 'have', 'has', 'had'
    ]);
  }

  /**
   * Run comprehensive audit on a post
   */
  auditPost(post) {
    const title = post.title.rendered.replace(/&#8211;/g, '-').replace(/&#8212;/g, '—');
    const content = post.content.rendered;
    const excerpt = post.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '';
    const $ = cheerio.load(content);

    const issues = [];
    const suggestions = [];
    const score = { total: 100, deductions: 0 };

    // 1. Title Analysis
    this.auditTitle(title, issues, score);

    // 2. Meta Description Analysis
    this.auditMetaDescription(excerpt, content, issues, score);

    // 3. Heading Structure Analysis
    this.auditHeadings($, issues, suggestions, score);

    // 4. Content Quality Analysis
    this.auditContentQuality($, content, title, issues, suggestions, score);

    // 5. Image Optimization Analysis
    this.auditImages($, issues, suggestions, score);

    // 6. Link Analysis
    this.auditLinks($, post, issues, suggestions, score);

    // 7. Readability Analysis
    this.auditReadability($, content, issues, suggestions, score);

    // 8. Keyword Analysis
    this.auditKeywords($, title, issues, suggestions);

    // 9. URL/Permalink Analysis
    this.auditPermalink(post, issues, suggestions, score);

    // 10. Schema/Structured Data Hints
    this.auditStructuredData($, suggestions);

    const finalScore = Math.max(0, Math.min(100, score.total - score.deductions));

    return {
      postId: post.id,
      title,
      url: post.link,
      issues,
      suggestions,
      score: finalScore,
      meta: this.extractMetadata($, content, title)
    };
  }

  /**
   * Audit title
   */
  auditTitle(title, issues, score) {
    if (title.length === 0) {
      issues.push({
        type: 'title',
        severity: 'critical',
        message: 'Title is empty',
        fix: 'Add a descriptive title'
      });
      score.deductions += 20;
    } else if (title.length < 30) {
      issues.push({
        type: 'title',
        severity: 'warning',
        message: `Title too short (${title.length} chars)`,
        fix: 'Aim for 50-60 characters'
      });
      score.deductions += 5;
    } else if (title.length > 60) {
      issues.push({
        type: 'title',
        severity: 'warning',
        message: `Title too long (${title.length} chars)`,
        fix: 'Keep under 60 characters'
      });
      score.deductions += 3;
    }

    // Check for power words
    const powerWords = ['best', 'guide', 'ultimate', 'complete', 'top', 'essential'];
    const hasPowerWord = powerWords.some(word => title.toLowerCase().includes(word));
    if (!hasPowerWord && title.length < 50) {
      issues.push({
        type: 'title',
        severity: 'info',
        message: 'Title could be more engaging',
        fix: 'Consider adding power words (Best, Ultimate, Complete, etc.)'
      });
    }
  }

  /**
   * Audit meta description
   */
  auditMetaDescription(excerpt, content, issues, score) {
    if (excerpt.length === 0) {
      issues.push({
        type: 'meta_description',
        severity: 'high',
        message: 'Meta description is missing',
        fix: 'Add a compelling meta description'
      });
      score.deductions += 10;
    } else if (excerpt.length < 120) {
      issues.push({
        type: 'meta_description',
        severity: 'warning',
        message: `Meta description too short (${excerpt.length} chars)`,
        fix: 'Aim for 150-160 characters'
      });
      score.deductions += 5;
    } else if (excerpt.length > 160) {
      issues.push({
        type: 'meta_description',
        severity: 'warning',
        message: `Meta description too long (${excerpt.length} chars)`,
        fix: 'Keep under 160 characters'
      });
      score.deductions += 3;
    }

    // Check for "Table of Contents" or other navigation
    if (/table of contents/i.test(excerpt)) {
      issues.push({
        type: 'meta_description',
        severity: 'critical',
        message: 'Meta description contains "Table of Contents"',
        fix: 'Extract actual content, not navigation elements'
      });
      score.deductions += 10;
    }

    // Check if excerpt is just repeating title
    if (excerpt.toLowerCase().includes(excerpt.toLowerCase().substring(0, 30))) {
      issues.push({
        type: 'meta_description',
        severity: 'warning',
        message: 'Meta description may be too similar to title',
        fix: 'Write unique, descriptive excerpt'
      });
      score.deductions += 2;
    }
  }

  /**
   * Audit heading structure
   */
  auditHeadings($, issues, suggestions, score) {
    const h1Tags = $('h1').toArray();
    const h2Tags = $('h2').toArray();
    const h3Tags = $('h3').toArray();

    // Check H1
    if (h1Tags.length === 0) {
      issues.push({
        type: 'headings',
        severity: 'critical',
        message: 'Missing H1 tag',
        fix: 'Add a single H1 tag at the beginning of content'
      });
      score.deductions += 15;
    } else if (h1Tags.length > 1) {
      issues.push({
        type: 'headings',
        severity: 'high',
        message: `Multiple H1 tags (${h1Tags.length})`,
        fix: 'Use only one H1 tag per page'
      });
      score.deductions += 8;
    }

    // Check hierarchy
    const allHeadings = $('h1, h2, h3, h4, h5, h6').toArray();
    let previousLevel = 0;

    allHeadings.forEach((heading) => {
      const currentLevel = parseInt(heading.tagName.substring(1));

      if (currentLevel > previousLevel + 1 && previousLevel !== 0) {
        issues.push({
          type: 'headings',
          severity: 'low',
          message: `Heading hierarchy skipped from H${previousLevel} to H${currentLevel}`,
          fix: 'Maintain proper heading hierarchy'
        });
        score.deductions += 2;
      }

      previousLevel = currentLevel;
    });

    // Check if headings are descriptive
    if (h2Tags.length === 0) {
      suggestions.push({
        type: 'headings',
        message: 'No H2 tags found - consider breaking content into sections'
      });
    }

    // Check for empty headings
    allHeadings.forEach((heading) => {
      if ($(heading).text().trim().length === 0) {
        issues.push({
          type: 'headings',
          severity: 'warning',
          message: 'Empty heading found',
          fix: 'Remove or add text to empty headings'
        });
        score.deductions += 3;
      }
    });
  }

  /**
   * Audit content quality
   */
  auditContentQuality($, content, title, issues, suggestions, score) {
    const text = $.text().trim();
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const paragraphs = $('p').toArray();
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

    // Word count
    if (wordCount < 300) {
      issues.push({
        type: 'content',
        severity: 'high',
        message: `Content too short (${wordCount} words)`,
        fix: 'Aim for at least 300 words of quality content'
      });
      score.deductions += 10;
    } else if (wordCount < 600) {
      suggestions.push({
        type: 'content',
        message: `Consider expanding content (currently ${wordCount} words)`
      });
    }

    // Paragraph count
    if (paragraphs.length < 3) {
      issues.push({
        type: 'content',
        severity: 'warning',
        message: 'Too few paragraphs - content may be hard to read',
        fix: 'Break content into more paragraphs'
      });
      score.deductions += 3;
    }

    // Average sentence length
    if (sentences.length > 0) {
      const avgSentenceLength = wordCount / sentences.length;
      if (avgSentenceLength > 25) {
        issues.push({
          type: 'content',
          severity: 'info',
          message: 'Sentences are too long on average',
          fix: 'Break long sentences for better readability'
        });
        score.deductions += 2;
      }
    }

    // Check for lists (good for readability)
    const lists = $('ul, ol').length;
    if (wordCount > 500 && lists === 0) {
      suggestions.push({
        type: 'content',
        message: 'Consider adding bullet points or numbered lists for better scannability'
      });
    }
  }

  /**
   * Audit images
   */
  auditImages($, issues, suggestions, score) {
    const images = $('img').toArray();
    let missingAlt = 0;
    let emptyAlt = 0;

    images.forEach((img) => {
      const alt = $(img).attr('alt');
      const src = $(img).attr('src');

      if (!alt) {
        missingAlt++;
      } else if (alt.trim().length === 0) {
        emptyAlt++;
      } else if (alt.length < 5) {
        issues.push({
          type: 'images',
          severity: 'warning',
          message: `Image alt text too short: "${alt}"`,
          fix: 'Write descriptive alt text (5+ words)'
        });
        score.deductions += 1;
      }

      // Check for image file size indicators (large files)
      if (src && /\d{4,}x\d{4,}/.test(src)) {
        suggestions.push({
          type: 'images',
          message: 'Large image detected - consider optimizing for web'
        });
      }
    });

    if (missingAlt > 0) {
      issues.push({
        type: 'images',
        severity: 'high',
        message: `${missingAlt} image(s) missing alt text`,
        fix: 'Add descriptive alt text to all images'
      });
      score.deductions += missingAlt * 3;
    }

    if (emptyAlt > 0) {
      issues.push({
        type: 'images',
        severity: 'warning',
        message: `${emptyAlt} image(s) have empty alt text`,
        fix: 'Add meaningful alt text'
      });
      score.deductions += emptyAlt * 2;
    }

    if (images.length === 0) {
      suggestions.push({
        type: 'images',
        message: 'Consider adding a featured image'
      });
    }
  }

  /**
   * Audit links
   */
  auditLinks($, post, issues, suggestions, score) {
    const allLinks = $('a').toArray();
    const internalLinks = [];
    const externalLinks = [];
    const brokenIndicators = [];

    const postDomain = new URL(post.link).hostname;

    allLinks.forEach((link) => {
      const href = $(link).attr('href');
      const text = $(link).text().trim();

      if (!href) {
        brokenIndicators.push(text || 'Empty link');
        return;
      }

      // Check if internal or external
      try {
        const url = new URL(href, post.link);
        if (url.hostname === postDomain) {
          internalLinks.push(href);
        } else {
          externalLinks.push(href);
        }
      } catch (e) {
        // Relative link or malformed
        internalLinks.push(href);
      }

      // Check for generic anchor text
      const genericTexts = ['click here', 'read more', 'here', 'this', 'link'];
      if (genericTexts.some(generic => text.toLowerCase() === generic)) {
        issues.push({
          type: 'links',
          severity: 'info',
          message: `Generic anchor text: "${text}"`,
          fix: 'Use descriptive anchor text'
        });
        score.deductions += 1;
      }
    });

    if (brokenIndicators.length > 0) {
      issues.push({
        type: 'links',
        severity: 'high',
        message: `${brokenIndicators.length} link(s) without href attribute`,
        fix: 'Fix or remove broken links'
      });
      score.deductions += brokenIndicators.length * 3;
    }

    if (allLinks.length > 0 && externalLinks.length === 0) {
      suggestions.push({
        type: 'links',
        message: 'Consider adding external links to authoritative sources'
      });
    }

    if (internalLinks.length === 0 && allLinks.length > 0) {
      suggestions.push({
        type: 'links',
        message: 'Consider adding internal links to related content'
      });
    }
  }

  /**
   * Audit readability (Flesch Reading Ease approximation)
   */
  auditReadability($, content, issues, suggestions, score) {
    const text = $.text().trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const syllables = this.estimateSyllables(words);

    if (sentences.length === 0 || words.length === 0) return;

    // Flesch Reading Ease = 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    const wordsPerSentence = words.length / sentences.length;
    const syllablesPerWord = syllables / words.length;
    const fleschScore = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);

    if (fleschScore < 30) {
      issues.push({
        type: 'readability',
        severity: 'warning',
        message: 'Content is very difficult to read',
        fix: 'Simplify language and shorten sentences'
      });
      score.deductions += 5;
    } else if (fleschScore < 50) {
      issues.push({
        type: 'readability',
        severity: 'info',
        message: 'Content is somewhat difficult to read',
        fix: 'Consider simplifying complex sentences'
      });
      score.deductions += 2;
    }

    // Good readability
    if (fleschScore >= 60 && fleschScore <= 70) {
      suggestions.push({
        type: 'readability',
        message: `Good readability score (${Math.round(fleschScore)})`
      });
    }
  }

  /**
   * Estimate syllables in words (simple approximation)
   */
  estimateSyllables(words) {
    let count = 0;
    words.forEach(word => {
      word = word.toLowerCase();
      if (word.length <= 3) {
        count += 1;
      } else {
        // Count vowel groups
        const vowels = word.match(/[aeiouy]+/g);
        count += vowels ? vowels.length : 1;
        // Adjust for silent e
        if (word.endsWith('e')) count -= 1;
        if (count === 0) count = 1;
      }
    });
    return count;
  }

  /**
   * Audit keywords
   */
  auditKeywords($, title, issues, suggestions) {
    const text = $.text().toLowerCase();
    const titleWords = title.toLowerCase().split(/\s+/).filter(w =>
      w.length > 3 && !this.stopWords.has(w)
    );

    if (titleWords.length === 0) return;

    // Check if title keywords appear in content
    const primaryKeyword = titleWords.slice(0, 3).join(' ');
    const keywordCount = (text.match(new RegExp(primaryKeyword, 'gi')) || []).length;

    if (keywordCount === 0) {
      issues.push({
        type: 'keywords',
        severity: 'warning',
        message: 'Title keywords not found in content',
        fix: `Mention "${primaryKeyword}" in your content`
      });
    } else if (keywordCount === 1) {
      suggestions.push({
        type: 'keywords',
        message: 'Consider mentioning primary keywords more frequently'
      });
    }
  }

  /**
   * Audit permalink/URL
   */
  auditPermalink(post, issues, suggestions, score) {
    const url = post.link;
    const slug = post.slug;

    // Check URL length
    if (slug.length > 75) {
      issues.push({
        type: 'permalink',
        severity: 'warning',
        message: `Permalink too long (${slug.length} chars)`,
        fix: 'Shorten URL slug for better SEO'
      });
      score.deductions += 3;
    }

    // Check for dates in permalink (not ideal for evergreen content)
    if (/\/\d{4}\/\d{2}\//.test(url)) {
      suggestions.push({
        type: 'permalink',
        message: 'Consider removing dates from permalinks for evergreen content'
      });
    }

    // Check for stop words in slug
    const stopWordsInSlug = slug.split('-').filter(word => this.stopWords.has(word));
    if (stopWordsInSlug.length > 2) {
      suggestions.push({
        type: 'permalink',
        message: `URL contains ${stopWordsInSlug.length} stop words - consider removing`
      });
    }
  }

  /**
   * Audit structured data hints
   */
  auditStructuredData($, suggestions) {
    // Check for schema markup
    const schemaScripts = $('script[type="application/ld+json"]');

    if (schemaScripts.length === 0) {
      suggestions.push({
        type: 'structured_data',
        message: 'Consider adding Schema.org structured data (JSON-LD)'
      });
    }

    // Check for FAQ sections (good for rich snippets)
    const hasDefinitionList = $('dl').length > 0;
    const hasAccordion = $('[class*="accordion"], [class*="faq"]').length > 0;

    if (!hasDefinitionList && !hasAccordion) {
      suggestions.push({
        type: 'structured_data',
        message: 'Consider adding an FAQ section for rich snippets'
      });
    }
  }

  /**
   * Extract metadata
   */
  extractMetadata($, content, title) {
    const text = $.text().trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);

    return {
      wordCount: words.length,
      paragraphCount: $('p').length,
      imageCount: $('img').length,
      internalLinks: $('a').filter((i, el) => {
        const href = $(el).attr('href');
        return href && !href.startsWith('http');
      }).length,
      externalLinks: $('a').filter((i, el) => {
        const href = $(el).attr('href');
        return href && href.startsWith('http');
      }).length,
      h2Count: $('h2').length,
      h3Count: $('h3').length,
      listsCount: $('ul, ol').length
    };
  }
}

/**
 * Audit multiple posts with V2
 */
export async function auditPostsV2(posts) {
  logger.section('Starting Enhanced Content SEO Audit (V2)');

  const auditor = new SEOAuditorV2();
  const results = [];

  for (const post of posts) {
    logger.info(`Auditing: ${post.title.rendered}`);

    const result = auditor.auditPost(post);

    logger.info(`Score: ${result.score}/100 | Issues: ${result.issues.length} | Suggestions: ${result.suggestions.length}`);

    results.push(result);
  }

  logger.success(`Audited ${posts.length} posts`);
  return results;
}
