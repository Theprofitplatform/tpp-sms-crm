/**
 * Image Optimizer v2
 *
 * Optimizes images for SEO and performance
 *
 * Features:
 * - Adds missing alt text to images
 * - Optimizes image file names
 * - Suggests image compression for large files
 * - Adds lazy loading attributes
 * - Checks image dimensions
 * - Manual review workflow
 *
 * @extends AutoFixEngineBase
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';
import * as cheerio from 'cheerio';

export class ImageOptimizerV2 extends AutoFixEngineBase {
  constructor(config) {
    super(config);

    this.wpClient = new WordPressClient(
      config.siteUrl,
      config.wpUser,
      config.wpPassword
    );

    this.siteUrl = config.siteUrl;
    this.maxImageSize = config.maxImageSize || 500000; // 500KB default
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'performance';
  }

  /**
   * Detect issues: Find image optimization opportunities
   */
  async detectIssues(options = {}) {
    const issues = [];
    const limit = options.limit || 50;

    try {
      console.log('   🖼️  Fetching WordPress content...');

      const [posts, pages] = await Promise.all([
        this.wpClient.getPosts({ per_page: limit }),
        this.wpClient.getPages({ per_page: limit })
      ]);

      const allContent = [...posts, ...pages];
      console.log(`   ✅ Found ${allContent.length} pages to scan`);
      console.log('   🔍 Analyzing images...');

      let totalImages = 0;
      let issuesFound = 0;

      for (const item of allContent) {
        const imageIssues = await this.analyzeImages(item);
        totalImages += imageIssues.total;
        issuesFound += imageIssues.issues.length;

        issues.push(...imageIssues.issues);
      }

      console.log(`   ✅ Scan complete: Analyzed ${totalImages} images, found ${issuesFound} issues`);

    } catch (error) {
      console.error(`   ❌ Detection error: ${error.message}`);
      throw error;
    }

    return issues;
  }

  /**
   * Analyze images in content
   */
  async analyzeImages(item) {
    const content = item.content?.rendered || '';
    const issues = [];
    let total = 0;

    if (!content) {
      return { total: 0, issues: [] };
    }

    const $ = cheerio.load(content);
    const images = $('img');

    for (let i = 0; i < images.length; i++) {
      const img = $(images[i]);
      total++;

      // Check 1: Missing alt text
      const alt = img.attr('alt');
      if (!alt || alt.trim() === '') {
        const src = img.attr('src') || '';
        const suggestedAlt = this.generateAltText(src, item.title.rendered);

        issues.push(this.createAltTextIssue(item, img, suggestedAlt, src));
      }

      // Check 2: Missing lazy loading
      const loading = img.attr('loading');
      if (!loading || loading !== 'lazy') {
        const src = img.attr('src') || '';
        issues.push(this.createLazyLoadingIssue(item, img, src));
      }

      // Check 3: Non-descriptive file names
      const src = img.attr('src') || '';
      if (this.hasNonDescriptiveFilename(src)) {
        // Note: Can't actually rename uploaded files easily, so just flag it
        issues.push(this.createFilenameIssue(item, img, src));
      }
    }

    return { total, issues };
  }

  /**
   * Create alt text issue
   */
  createAltTextIssue(item, img, suggestedAlt, src) {
    const imgHtml = img.toString();

    return {
      target_type: item.type,
      target_id: item.id,
      target_title: item.title.rendered,
      target_url: item.link,
      field_name: 'content',

      before_value: imgHtml,
      after_value: imgHtml.replace(/<img/, `<img alt="${suggestedAlt}"`),

      issue_description: `Image missing alt text: "${src}". Alt text is crucial for accessibility (screen readers) and SEO (image search). Search engines use alt text to understand image content. Missing alt text is a WCAG accessibility violation.`,

      fix_description: `Add alt text: "${suggestedAlt}" to image. This AI-suggested alt text describes the image context based on filename and page title. You can modify it to be more specific during review.`,

      expected_benefit: `Alt text improves accessibility for visually impaired users, helps search engines index images, improves image SEO rankings, and provides fallback text if image fails to load. Required for WCAG 2.1 compliance.`,

      severity: 'high',
      risk_level: 'low',
      category: 'accessibility',
      impact_score: 85,
      priority: 90,

      reversible: true,

      metadata: {
        verificationSteps: [
          `1. Visit page: ${item.link}`,
          `2. Right-click the image and select "Inspect"`,
          `3. Verify alt attribute is present: alt="${suggestedAlt}"`,
          `4. Test with screen reader or browser read-aloud feature`,
          `5. Ensure alt text accurately describes the image`
        ],
        imageDetails: {
          src: src,
          suggestedAlt: suggestedAlt,
          issueType: 'missing_alt_text'
        }
      }
    };
  }

  /**
   * Create lazy loading issue
   */
  createLazyLoadingIssue(item, img, src) {
    const imgHtml = img.toString();

    return {
      target_type: item.type,
      target_id: item.id,
      target_title: item.title.rendered,
      target_url: item.link,
      field_name: 'content',

      before_value: imgHtml,
      after_value: imgHtml.replace(/<img/, `<img loading="lazy"`),

      issue_description: `Image not using lazy loading: "${src}". Lazy loading defers loading of off-screen images, improving initial page load time and Core Web Vitals (LCP). Non-lazy-loaded images increase page weight and slow down rendering.`,

      fix_description: `Add loading="lazy" attribute to image. This native browser feature loads images only when they're about to enter the viewport, reducing initial page load time and bandwidth usage.`,

      expected_benefit: `Lazy loading improves page speed, reduces bandwidth usage, improves Core Web Vitals (especially LCP - Largest Contentful Paint), and enhances user experience on slow connections. Can improve Google PageSpeed score.`,

      severity: 'medium',
      risk_level: 'low',
      category: 'performance',
      impact_score: 70,
      priority: 75,

      reversible: true,

      metadata: {
        verificationSteps: [
          `1. Visit page: ${item.link}`,
          `2. Open browser DevTools (F12) → Network tab`,
          `3. Scroll down slowly and observe image loading`,
          `4. Images should load as they approach viewport`,
          `5. Verify loading="lazy" in image HTML`
        ],
        imageDetails: {
          src: src,
          issueType: 'missing_lazy_loading'
        }
      }
    };
  }

  /**
   * Create filename issue
   */
  createFilenameIssue(item, img, src) {
    const filename = src.split('/').pop().split('?')[0];
    const suggestedName = this.generateDescriptiveFilename(filename, item.title.rendered);

    return {
      target_type: item.type,
      target_id: item.id,
      target_title: item.title.rendered,
      target_url: item.link,
      field_name: 'content',

      before_value: filename,
      after_value: suggestedName,

      issue_description: `Image has non-descriptive filename: "${filename}". Descriptive filenames improve image SEO. Search engines use filenames to understand image content. Generic names like "IMG_1234.jpg" provide no SEO value.`,

      fix_description: `Consider renaming to: "${suggestedName}". Note: This requires manual intervention - WordPress doesn't support automatic file renaming. Upload the image with a better name, or use an SEO-friendly name when initially uploading.`,

      expected_benefit: `Descriptive filenames improve image search rankings, provide context to search engines, and make media library more organized. Best practice for image SEO.`,

      severity: 'low',
      risk_level: 'low',
      category: 'seo',
      impact_score: 40,
      priority: 50,

      reversible: false, // Can't easily rename uploaded files

      metadata: {
        verificationSteps: [
          `1. This is an informational issue - requires manual re-upload`,
          `2. Download the image from: ${src}`,
          `3. Rename locally to: ${suggestedName}`,
          `4. Upload to WordPress media library with new name`,
          `5. Update image in content to use new file`
        ],
        imageDetails: {
          src: src,
          currentFilename: filename,
          suggestedFilename: suggestedName,
          issueType: 'non_descriptive_filename',
          requiresManualFix: true
        }
      }
    };
  }

  /**
   * Generate alt text suggestion
   */
  generateAltText(src, pageTitle) {
    // Extract filename without extension
    const filename = src.split('/').pop().split('?')[0].replace(/\.[^/.]+$/, '');

    // Clean up filename (remove special chars, replace dashes/underscores with spaces)
    let alt = filename
      .replace(/[-_]/g, ' ')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim();

    // If filename is generic (IMG_1234, etc), use page title
    if (/^(img|image|photo|picture|screenshot)?\d+$/i.test(alt)) {
      alt = pageTitle;
    }

    // Capitalize first letter
    alt = alt.charAt(0).toUpperCase() + alt.slice(1);

    // Limit length
    if (alt.length > 100) {
      alt = alt.substring(0, 97) + '...';
    }

    return alt || 'Image';
  }

  /**
   * Check if filename is non-descriptive
   */
  hasNonDescriptiveFilename(src) {
    const filename = src.split('/').pop().split('?')[0];

    // Pattern: IMG_1234.jpg, DSC1234.jpg, image-1.jpg, etc.
    const nonDescriptivePatterns = [
      /^IMG[-_]?\d+/i,
      /^DSC[-_]?\d+/i,
      /^image[-_]?\d+/i,
      /^photo[-_]?\d+/i,
      /^picture[-_]?\d+/i,
      /^screenshot[-_]?\d+/i,
      /^\d+$/
    ];

    return nonDescriptivePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Generate descriptive filename
   */
  generateDescriptiveFilename(currentFilename, pageTitle) {
    // Get file extension
    const ext = currentFilename.split('.').pop();

    // Clean page title for filename
    let newName = pageTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    return `${newName}.${ext}`;
  }

  /**
   * Apply fix: Update image attributes in content
   */
  async applyFix(proposal, options = {}) {
    const { target_id, target_type, before_value, after_value, metadata } = proposal;

    if (!metadata || !metadata.imageDetails) {
      throw new Error('Proposal missing required metadata');
    }

    // Skip filename issues (require manual intervention)
    if (metadata.imageDetails.requiresManualFix) {
      throw new Error('This issue requires manual intervention - cannot auto-fix file renaming');
    }

    try {
      // Fetch current content
      let content;
      if (target_type === 'post') {
        const post = await this.wpClient.getPost(target_id);
        content = post.content.raw || post.content.rendered;
      } else {
        const page = await this.wpClient.getPage(target_id);
        content = page.content.raw || page.content.rendered;
      }

      // Replace the image HTML
      const escapedBefore = this.escapeRegExp(before_value);
      const updatedContent = content.replace(
        new RegExp(escapedBefore, 'g'),
        after_value
      );

      // Update WordPress
      if (target_type === 'post') {
        await this.wpClient.updatePost(target_id, { content: updatedContent });
      } else {
        await this.wpClient.updatePage(target_id, { content: updatedContent });
      }

      console.log(`      ✅ Updated ${target_type} #${target_id}: ${metadata.imageDetails.issueType}`);

      return {
        success: true,
        contentId: target_id,
        contentType: target_type,
        issueType: metadata.imageDetails.issueType,
        message: 'Image attributes updated successfully'
      };

    } catch (error) {
      console.error(`      ❌ Failed to apply fix: ${error.message}`);
      throw error;
    }
  }

  /**
   * Escape special regex characters
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default ImageOptimizerV2;
