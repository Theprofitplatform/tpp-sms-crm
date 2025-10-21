import { wpClient } from './fetch-posts.js';
import { config } from '../../config/env/config.js';
import { logger } from './logger.js';

/**
 * SEO Fix Engine
 */
export class SEOFixer {
  constructor() {
    this.dryRun = config.safety.dryRun;
    this.appliedFixes = [];
  }

  /**
   * Apply fixes to a post based on audit results
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
      errors: []
    };

    // Prepare update data
    const updateData = {};

    // Fix title issues
    if (this.shouldFixTitle(auditResults)) {
      const newTitle = this.generateTitle(post, auditResults);
      if (newTitle !== post.title.rendered) {
        updateData.title = newTitle;
        fixes.changes.push({
          type: 'title',
          old: post.title.rendered,
          new: newTitle
        });
        logger.info(`  - Title: "${post.title.rendered}" → "${newTitle}"`);
      }
    }

    // Fix excerpt (meta description)
    if (this.shouldFixExcerpt(auditResults, post)) {
      const newExcerpt = this.generateExcerpt(post);
      if (newExcerpt !== post.excerpt.rendered) {
        updateData.excerpt = newExcerpt;
        fixes.changes.push({
          type: 'excerpt',
          old: post.excerpt.rendered?.substring(0, 50) + '...',
          new: newExcerpt.substring(0, 50) + '...'
        });
        logger.info(`  - Excerpt updated`);
      }
    }

    // Fix slug/permalink
    if (this.shouldFixSlug(auditResults, post)) {
      const newSlug = this.generateSlug(post);
      if (newSlug !== post.slug) {
        updateData.slug = newSlug;
        fixes.changes.push({
          type: 'slug',
          old: post.slug,
          new: newSlug
        });
        logger.info(`  - Slug: "${post.slug}" → "${newSlug}"`);
      }
    }

    // Fix H1 tag issues
    if (this.shouldFixH1(auditResults)) {
      const newContent = this.addH1Tag(post);
      if (newContent !== post.content.rendered) {
        updateData.content = newContent;
        fixes.changes.push({
          type: 'h1_tag',
          old: 'Missing H1',
          new: 'H1 added'
        });
        logger.info(`  - H1 tag: Added using post title`);
      }
    }

    // Fix heading hierarchy
    if (this.shouldFixHeadingHierarchy(auditResults)) {
      const currentContent = updateData.content || post.content.rendered;
      const newContent = this.fixHeadingHierarchy(currentContent);
      if (newContent !== currentContent) {
        updateData.content = newContent;
        fixes.changes.push({
          type: 'heading_hierarchy',
          old: 'Invalid hierarchy',
          new: 'Fixed hierarchy'
        });
        logger.info(`  - Heading hierarchy: Fixed`);
      }
    }

    // Apply changes if not in dry run mode
    if (fixes.changes.length > 0) {
      if (this.dryRun) {
        logger.warn('  DRY RUN: Changes logged but not applied');
        fixes.dryRun = true;
      } else {
        try {
          await wpClient.updatePost(post.id, updateData);
          logger.success('  ✓ Changes applied successfully');
          fixes.applied = true;
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
   * Check if title needs fixing
   */
  shouldFixTitle(auditResults) {
    return auditResults.issues.some(issue =>
      issue.type === 'title' &&
      (issue.message.includes('too short') || issue.message.includes('too long'))
    );
  }

  /**
   * Generate optimized title
   */
  generateTitle(post, auditResults) {
    let title = post.title.rendered;

    // If too short, add context
    if (title.length < 30) {
      // Try to add context from categories or content
      const categories = post._embedded?.['wp:term']?.[0];
      if (categories && categories.length > 0) {
        title = `${title} - ${categories[0].name} Guide`;
      }
    }

    // If too long, truncate smartly
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    return title;
  }

  /**
   * Check if excerpt needs fixing
   */
  shouldFixExcerpt(auditResults, post) {
    const hasIssue = auditResults.issues.some(issue =>
      issue.type === 'meta_description'
    );

    const excerptText = post.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '';
    return hasIssue || excerptText.length === 0 || excerptText.length < 120;
  }

  /**
   * Generate optimized excerpt
   */
  generateExcerpt(post) {
    // Try to extract first paragraph from content
    const content = post.content.rendered.replace(/<[^>]*>/g, '').trim();
    const firstParagraph = content.split('\n\n')[0] || content;

    // Trim to 150-160 characters
    let excerpt = firstParagraph.substring(0, 157);

    // Try to end at last complete word
    const lastSpace = excerpt.lastIndexOf(' ');
    if (lastSpace > 140) {
      excerpt = excerpt.substring(0, lastSpace);
    }

    return excerpt + '...';
  }

  /**
   * Check if slug needs fixing
   */
  shouldFixSlug(auditResults, post) {
    return auditResults.issues.some(issue =>
      issue.type === 'permalink' && issue.message.includes('too long')
    ) || this.hasStopWords(post.slug);
  }

  /**
   * Generate optimized slug
   */
  generateSlug(post) {
    let slug = post.slug;

    // Remove stop words
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = slug.split('-').filter(word => !stopWords.includes(word));
    slug = words.join('-');

    // Limit length
    if (slug.length > 50) {
      const shortenedWords = slug.split('-').slice(0, 7);
      slug = shortenedWords.join('-');
    }

    return slug;
  }

  /**
   * Check if slug has stop words
   */
  hasStopWords(slug) {
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at'];
    return slug.split('-').some(word => stopWords.includes(word));
  }

  /**
   * Check if H1 needs fixing
   */
  shouldFixH1(auditResults) {
    return auditResults.issues.some(issue =>
      issue.type === 'headings' && issue.message.includes('Missing H1')
    );
  }

  /**
   * Add H1 tag to content
   */
  addH1Tag(post) {
    let content = post.content.rendered;
    const title = post.title.rendered;

    // Check if H1 already exists
    if (/<h1[^>]*>/i.test(content)) {
      return content; // Already has H1
    }

    // Strategy 1: Add H1 at the beginning of content
    const h1Tag = `<h1>${title}</h1>\n\n`;

    // Find where to insert (after any initial whitespace or opening tags)
    const insertMatch = content.match(/^(\s*(?:<[^>]+>\s*)*)/);
    const insertPos = insertMatch ? insertMatch[0].length : 0;

    // Insert H1 tag
    content = content.slice(0, insertPos) + h1Tag + content.slice(insertPos);

    return content;
  }

  /**
   * Check if heading hierarchy needs fixing
   */
  shouldFixHeadingHierarchy(auditResults) {
    return auditResults.issues.some(issue =>
      issue.type === 'headings' && issue.message.includes('hierarchy')
    );
  }

  /**
   * Fix heading hierarchy (convert first H2 to H1 if no H1 exists)
   */
  fixHeadingHierarchy(content) {
    // If no H1 exists and content starts with H2, convert first H2 to H1
    if (!/<h1[^>]*>/i.test(content)) {
      // Find first H2 and convert it to H1
      content = content.replace(/<h2([^>]*)>(.*?)<\/h2>/i, '<h1$1>$2</h1>');
    }

    return content;
  }

  /**
   * Get summary of all applied fixes
   */
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
 * Apply fixes to multiple posts
 */
export async function applyFixesToPosts(posts, auditResults) {
  logger.section('Starting Auto-Fix Process');

  if (config.safety.dryRun) {
    logger.warn('DRY RUN MODE: No actual changes will be made');
  }

  const fixer = new SEOFixer();

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
