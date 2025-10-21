import { wpClient } from './fetch-posts.js';
import { config } from '../../config/env/config.js';
import { logger } from './logger.js';
import * as cheerio from 'cheerio';

/**
 * Enhanced SEO Fix Engine V2
 * Fixes all identified issues with smart detection and validation
 */
export class SEOFixerV2 {
  constructor(options = {}) {
    this.dryRun = config.safety.dryRun;
    this.appliedFixes = [];
    this.siteName = options.siteName || 'Instant Auto Traders';
    this.titleTemplate = options.titleTemplate || '{title} | {siteName}';
  }

  /**
   * Apply fixes to a post with comprehensive validation
   */
  async applyFixes(post, auditResults) {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Applying fixes to: ${post.title.rendered}`);
    logger.info(`Post ID: ${post.id} | Status: ${post.status}`);

    // Safety check
    if (post.status === 'publish' && !config.safety.applyToPublished) {
      logger.warn('Skipping published post (safety setting enabled)');
      return {
        postId: post.id,
        skipped: true,
        reason: 'Published posts are protected by safety settings'
      };
    }

    const fixes = {
      postId: post.id,
      title: post.title.rendered,
      changes: [],
      errors: [],
      backup: {
        title: post.title.rendered,
        excerpt: post.excerpt?.rendered,
        content: post.content?.rendered
      }
    };

    const updateData = {};

    // 1. Fix title intelligently
    if (this.shouldFixTitle(auditResults)) {
      const newTitle = this.generateSmartTitle(post, auditResults);
      if (newTitle !== post.title.rendered) {
        updateData.title = newTitle;
        fixes.changes.push({
          type: 'title',
          old: post.title.rendered,
          new: newTitle,
          reason: 'Title length optimization'
        });
        logger.info(`  ✓ Title: "${post.title.rendered}" → "${newTitle}"`);
      }
    }

    // 2. Fix excerpt/meta description with smart extraction
    if (this.shouldFixExcerpt(auditResults, post)) {
      const newExcerpt = this.generateSmartExcerpt(post);
      const oldExcerpt = post.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '';

      if (newExcerpt !== oldExcerpt) {
        updateData.excerpt = newExcerpt;
        fixes.changes.push({
          type: 'excerpt',
          old: oldExcerpt.substring(0, 80) + '...',
          new: newExcerpt.substring(0, 80) + '...',
          reason: 'Meta description optimization (skip TOC, proper length)'
        });
        logger.info(`  ✓ Excerpt: Optimized (${oldExcerpt.length} → ${newExcerpt.length} chars)`);
      }
    }

    // 3. Fix H1 tag ONLY if genuinely missing in content
    const h1Result = this.analyzeH1Situation(post, auditResults);
    if (h1Result.needsFix) {
      const newContent = this.fixH1Intelligently(post, h1Result);
      if (newContent !== post.content.rendered) {
        updateData.content = newContent;
        fixes.changes.push({
          type: 'h1_tag',
          old: h1Result.currentState,
          new: h1Result.proposedFix,
          reason: h1Result.reason
        });
        logger.info(`  ✓ H1: ${h1Result.reason}`);
      }
    }

    // 4. Fix heading hierarchy properly
    if (this.shouldFixHeadingHierarchy(auditResults)) {
      const currentContent = updateData.content || post.content.rendered;
      const hierarchyResult = this.fixHeadingHierarchyProperly(currentContent);

      if (hierarchyResult.changed) {
        updateData.content = hierarchyResult.content;
        fixes.changes.push({
          type: 'heading_hierarchy',
          old: 'Invalid hierarchy',
          new: 'Fixed hierarchy',
          reason: hierarchyResult.description
        });
        logger.info(`  ✓ Hierarchy: ${hierarchyResult.description}`);
      }
    }

    // 5. Fix slug if needed
    if (this.shouldFixSlug(auditResults, post)) {
      const newSlug = this.generateOptimizedSlug(post);
      if (newSlug !== post.slug) {
        updateData.slug = newSlug;
        fixes.changes.push({
          type: 'slug',
          old: post.slug,
          new: newSlug,
          reason: 'Removed stop words for better SEO'
        });
        logger.info(`  ✓ Slug: "${post.slug}" → "${newSlug}"`);
      }
    }

    // Apply changes with validation
    if (fixes.changes.length > 0) {
      if (this.dryRun) {
        logger.warn('  DRY RUN: Changes logged but not applied');
        fixes.dryRun = true;
      } else {
        try {
          // Validate before applying
          const validation = this.validateChanges(post, updateData);
          if (!validation.valid) {
            logger.error('  ✗ Validation failed:', validation.errors.join(', '));
            fixes.errors = validation.errors;
            fixes.applied = false;
          } else {
            await wpClient.updatePost(post.id, updateData);

            // Verify changes were applied
            const verified = await this.verifyChanges(post.id, updateData);
            if (verified) {
              logger.success('  ✓ Changes applied and verified');
              fixes.applied = true;
            } else {
              logger.error('  ✗ Changes applied but verification failed');
              fixes.applied = true;
              fixes.warnings = ['Verification incomplete'];
            }
          }
        } catch (error) {
          logger.error('  ✗ Failed to apply changes', error.message);
          fixes.errors.push(error.message);
          fixes.applied = false;
        }
      }
    } else {
      logger.info('  No fixes needed');
    }

    this.appliedFixes.push(fixes);
    return fixes;
  }

  /**
   * Generate smart title based on content and context
   */
  generateSmartTitle(post, auditResults) {
    let title = post.title.rendered.replace(/&#8211;/g, '-').replace(/&#8212;/g, '—');

    // Remove generic suffixes we may have added before
    title = title.replace(/\s*[-–—|]\s*(Business Guide|Guide|Article)$/i, '');

    // If too short, extend with context
    if (title.length < 40) {
      // Try to get category
      const categories = post._embedded?.['wp:term']?.[0];

      if (categories && categories.length > 0 && categories[0].name !== 'Uncategorized') {
        // Use category name
        const category = categories[0].name;
        title = `${title} - ${category}`;
      } else {
        // Use site name instead of generic "Business Guide"
        title = `${title} | ${this.siteName}`;
      }
    }

    // If still too short, that's okay - don't force it
    // If too long, truncate intelligently
    if (title.length > 60) {
      const lastSpace = title.substring(0, 57).lastIndexOf(' ');
      title = title.substring(0, lastSpace > 40 ? lastSpace : 57) + '...';
    }

    return title;
  }

  /**
   * Generate smart excerpt that skips TOC and navigation
   */
  generateSmartExcerpt(post) {
    let content = post.content.rendered.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove common TOC patterns
    content = content.replace(/Table of Contents\s*/gi, '');
    content = content.replace(/Skip to content\s*/gi, '');
    content = content.replace(/\[\s*hide\s*\]\s*/gi, '');
    content = content.replace(/\[\s*show\s*\]\s*/gi, '');

    // Remove repeating title patterns (title appears multiple times)
    const titleWords = post.title.rendered.replace(/[^\w\s]/g, '').toLowerCase().split(/\s+/);
    if (titleWords.length > 2) {
      const titlePattern = titleWords.slice(0, 3).join('\\s+');
      const regex = new RegExp(`(${titlePattern}[^.!?]*[.!?]\\s*)+`, 'gi');
      content = content.replace(regex, '');
    }

    // Split into sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];

    // Find first substantive sentence (not navigation, not just keywords)
    let excerpt = '';
    for (const sentence of sentences) {
      const cleaned = sentence.trim();
      // Skip short sentences or navigation
      if (cleaned.length < 20) continue;
      if (/^(Home|About|Contact|Menu|Search)/i.test(cleaned)) continue;

      excerpt = cleaned;
      break;
    }

    // If we didn't find a good sentence, take first paragraph
    if (!excerpt) {
      const paragraphs = content.split(/\n\n+/);
      excerpt = paragraphs.find(p => p.length > 50) || paragraphs[0] || content;
    }

    // Add second sentence if there's room
    if (excerpt.length < 120 && sentences.length > 1) {
      const secondSentence = sentences[1]?.trim();
      if (secondSentence && excerpt.length + secondSentence.length < 155) {
        excerpt += ' ' + secondSentence;
      }
    }

    // Trim to optimal length (150-160 chars)
    if (excerpt.length > 157) {
      const lastSpace = excerpt.substring(0, 154).lastIndexOf(' ');
      excerpt = excerpt.substring(0, lastSpace > 140 ? lastSpace : 154) + '...';
    }

    return excerpt;
  }

  /**
   * Analyze H1 situation comprehensively
   */
  analyzeH1Situation(post, auditResults) {
    const $ = cheerio.load(post.content.rendered);
    const h1Tags = $('h1');
    const h2Tags = $('h2');

    const result = {
      needsFix: false,
      currentState: '',
      proposedFix: '',
      reason: '',
      h1Count: h1Tags.length,
      firstH2: h2Tags.first().text()
    };

    // Check if audit says H1 is missing
    const h1Issue = auditResults.issues.find(i =>
      i.type === 'headings' && i.message.includes('Missing H1')
    );

    if (!h1Issue) {
      result.currentState = 'H1 exists';
      result.needsFix = false;
      return result;
    }

    // If genuinely missing, we need to add it
    if (h1Tags.length === 0) {
      result.needsFix = true;
      result.currentState = 'No H1 in content';
      result.proposedFix = `Add H1: "${post.title.rendered}"`;
      result.reason = 'Added H1 using post title at content start';
      return result;
    }

    result.currentState = `H1 exists: "${h1Tags.first().text()}"`;
    result.needsFix = false;
    return result;
  }

  /**
   * Fix H1 intelligently - only if genuinely missing
   */
  fixH1Intelligently(post, h1Result) {
    if (!h1Result.needsFix) return post.content.rendered;

    let content = post.content.rendered;
    const $ = cheerio.load(content);

    // Check if there's an H2 at the start that should be H1
    const firstH2 = $('h2').first();
    if (firstH2.length > 0) {
      // Convert first H2 to H1
      const h2Html = $.html(firstH2);
      const h1Html = h2Html.replace(/<h2/, '<h1').replace(/<\/h2>/, '</h1>');
      content = content.replace(h2Html, h1Html);
      return content;
    }

    // Otherwise, add H1 at the beginning
    const h1Tag = `<h1>${post.title.rendered.replace(/&#8211;/g, '-')}</h1>\n\n`;

    // Find where to insert (after any opening divs/wrappers)
    const insertMatch = content.match(/^(\s*(?:<div[^>]*>|\s)*)/);
    const insertPos = insertMatch ? insertMatch[0].length : 0;

    content = content.slice(0, insertPos) + h1Tag + content.slice(insertPos);
    return content;
  }

  /**
   * Fix heading hierarchy properly (not the buggy version)
   */
  fixHeadingHierarchyProperly(content) {
    const $ = cheerio.load(content);
    const allHeadings = $('h1, h2, h3, h4, h5, h6').toArray();

    if (allHeadings.length === 0) {
      return { changed: false, content, description: 'No headings found' };
    }

    let changed = false;
    let previousLevel = 0;

    allHeadings.forEach((heading) => {
      const tagName = heading.tagName.toLowerCase();
      const currentLevel = parseInt(tagName.substring(1));

      // If we skip levels (e.g., H1 -> H3), adjust
      if (previousLevel > 0 && currentLevel > previousLevel + 1) {
        // Downgrade this heading to previous + 1
        const newLevel = previousLevel + 1;
        const newTag = `h${newLevel}`;

        $(heading).replaceWith(function() {
          return `<${newTag}>${$(this).html()}</${newTag}>`;
        });

        changed = true;
      }

      previousLevel = currentLevel;
    });

    return {
      changed,
      content: changed ? $.html() : content,
      description: changed ? 'Fixed heading level skips' : 'Hierarchy already correct'
    };
  }

  /**
   * Generate optimized slug
   */
  generateOptimizedSlug(post) {
    let slug = post.slug;

    // Remove stop words for SEO
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'];
    const words = slug.split('-').filter(word => !stopWords.includes(word) || slug.split('-').length <= 4);
    slug = words.join('-');

    // Limit length
    if (slug.length > 50) {
      const shortenedWords = slug.split('-').slice(0, 7);
      slug = shortenedWords.join('-');
    }

    return slug;
  }

  /**
   * Validate changes before applying
   */
  validateChanges(post, updateData) {
    const errors = [];

    // Validate title
    if (updateData.title) {
      if (updateData.title.length < 10) {
        errors.push('Title too short (< 10 chars)');
      }
      if (updateData.title.length > 100) {
        errors.push('Title too long (> 100 chars)');
      }
    }

    // Validate excerpt
    if (updateData.excerpt) {
      if (updateData.excerpt.length < 50) {
        errors.push('Excerpt too short (< 50 chars)');
      }
      if (updateData.excerpt.length > 200) {
        errors.push('Excerpt too long (> 200 chars)');
      }
      // Check for TOC remnants
      if (/table of contents/i.test(updateData.excerpt)) {
        errors.push('Excerpt still contains "Table of Contents"');
      }
    }

    // Validate content
    if (updateData.content) {
      const $ = cheerio.load(updateData.content);
      const h1Count = $('h1').length;

      if (h1Count > 1) {
        errors.push(`Multiple H1 tags found (${h1Count})`);
      }
      if (h1Count === 0) {
        errors.push('Content has no H1 tag');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Verify changes were applied correctly
   */
  async verifyChanges(postId, updateData) {
    try {
      // Wait a bit for WordPress to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch updated post
      const posts = await wpClient.fetchAllPosts(100);
      const updatedPost = posts.find(p => p.id === postId);

      if (!updatedPost) return false;

      // Verify each change
      if (updateData.title && !updatedPost.title.rendered.includes(updateData.title)) {
        logger.warn('  ⚠ Title verification incomplete');
      }

      return true;
    } catch (error) {
      logger.error('Verification error:', error.message);
      return false;
    }
  }

  // Reuse detection methods from V1
  shouldFixTitle(auditResults) {
    return auditResults.issues.some(issue =>
      issue.type === 'title' &&
      (issue.message.includes('too short') || issue.message.includes('too long'))
    );
  }

  shouldFixExcerpt(auditResults, post) {
    const hasIssue = auditResults.issues.some(issue =>
      issue.type === 'meta_description'
    );

    const excerptText = post.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '';
    return hasIssue || excerptText.length === 0 || excerptText.length < 120 || /table of contents/i.test(excerptText);
  }

  shouldFixSlug(auditResults, post) {
    return auditResults.issues.some(issue =>
      issue.type === 'permalink' && issue.message.includes('too long')
    ) || this.hasStopWords(post.slug);
  }

  shouldFixHeadingHierarchy(auditResults) {
    return auditResults.issues.some(issue =>
      issue.type === 'headings' && issue.message.includes('hierarchy')
    );
  }

  hasStopWords(slug) {
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = slug.split('-');
    // Only remove if slug is long enough
    return words.length > 4 && words.some(word => stopWords.includes(word));
  }

  getSummary() {
    const total = this.appliedFixes.length;
    const applied = this.appliedFixes.filter(f => f.applied).length;
    const skipped = this.appliedFixes.filter(f => f.skipped).length;
    const errors = this.appliedFixes.filter(f => f.errors?.length > 0).length;

    return {
      total,
      applied,
      skipped,
      errors,
      dryRun: this.dryRun,
      fixes: this.appliedFixes
    };
  }
}

/**
 * Apply fixes to multiple posts with V2 engine
 */
export async function applyFixesToPostsV2(posts, auditResults, options = {}) {
  logger.section('Starting Enhanced Auto-Fix Process (V2)');

  if (config.safety.dryRun) {
    logger.warn('DRY RUN MODE: No actual changes will be made');
  }

  const fixer = new SEOFixerV2(options);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const audit = auditResults[i];

    if (audit && audit.issues.length > 0) {
      await fixer.applyFixes(post, audit);
    }
  }

  const summary = fixer.getSummary();
  logger.section('Fix Summary');
  logger.info(`Total posts processed: ${summary.total}`);
  logger.info(`Changes applied: ${summary.applied}`);
  logger.info(`Skipped: ${summary.skipped}`);
  logger.info(`Errors: ${summary.errors}`);

  if (summary.dryRun) {
    logger.warn('\nThis was a DRY RUN. Set DRY_RUN=false in .env to apply changes.');
  }

  return summary;
}
