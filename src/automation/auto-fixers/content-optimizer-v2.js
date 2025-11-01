/**
 * Content Optimizer v2 - With Manual Review Workflow
 *
 * Comprehensive content optimization engine using the review workflow:
 * - Keyword density and placement
 * - Internal linking structure
 * - Image alt text and optimization
 * - Content readability
 * - Heading hierarchy and structure
 *
 * Features:
 * - Detect → Review → Apply workflow
 * - Rich descriptions for each fix
 * - Risk assessment
 * - Verification instructions
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';

export class ContentOptimizer extends AutoFixEngineBase {
  constructor(config) {
    super(config);
    this.wpClient = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.wpUser,
      password: config.wpPassword
    });
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'content-seo';
  }

  /**
   * REQUIRED: Detect content issues and return as proposals
   */
  async detectIssues(options = {}) {
    const { limit = 10 } = options;
    const proposals = [];

    console.log(`   Fetching up to ${limit} pieces of content...`);

    // Get all posts and pages
    const posts = await this.wpClient.getPosts({ per_page: limit });
    const pages = await this.wpClient.getPages({ per_page: limit });
    const allContent = [...posts, ...pages];

    console.log(`   Analyzing ${allContent.length} items...`);

    // Analyze each piece of content
    for (const item of allContent) {
      const itemProposals = await this.analyzeContentItem(item);
      proposals.push(...itemProposals);
    }

    return proposals;
  }

  /**
   * Analyze a single content item and create proposals
   */
  async analyzeContentItem(item) {
    const content = item.content.rendered;
    const title = item.title.rendered;
    const proposals = [];

    // 1. Check image alt text
    const imageProposals = this.analyzeImagesForProposals(item, content);
    proposals.push(...imageProposals);

    // 2. Check external links
    const linkProposals = this.analyzeExternalLinksForProposals(item, content);
    proposals.push(...linkProposals);

    // 3. Check heading structure
    const headingProposals = this.analyzeHeadingsForProposals(item, content);
    proposals.push(...headingProposals);

    // 4. Check internal linking (suggestions only)
    const internalLinkProposals = this.analyzeInternalLinkingForProposals(item, content);
    proposals.push(...internalLinkProposals);

    // 5. Check readability (suggestions only)
    const readabilityProposals = this.analyzeReadabilityForProposals(item, content);
    proposals.push(...readabilityProposals);

    // 6. Check keyword density (suggestions only)
    const keywordProposals = this.analyzeKeywordDensityForProposals(item, content, title);
    proposals.push(...keywordProposals);

    return proposals;
  }

  /**
   * Analyze images and create proposals
   */
  analyzeImagesForProposals(item, content) {
    const proposals = [];
    const images = content.match(/<img[^>]+>/gi) || [];

    images.forEach((img, index) => {
      const imgSrc = img.match(/src="([^"]+)"/)?.[1] || 'unknown';
      const fileName = imgSrc.split('/').pop();

      // Check for missing alt text
      if (!img.includes('alt=')) {
        proposals.push({
          target_type: item.type,
          target_id: item.id,
          target_title: item.title.rendered,
          target_url: item.link,
          field_name: 'content',

          before_value: img,
          after_value: this.generateImageWithAlt(img, item.title.rendered),

          issue_description: `Image "${fileName}" is missing alt text, which hurts accessibility and SEO`,
          fix_description: `Add alt text: "${this.generateAltText(item.title.rendered, index)}"`,
          expected_benefit: 'Improves accessibility for screen readers, helps search engines understand images, and can boost image search rankings',

          severity: 'medium',
          risk_level: 'low',
          category: 'image-optimization',
          impact_score: 60,
          priority: 60,

          reversible: true,

          metadata: {
            fixType: 'image_alt_text',
            imageSrc: imgSrc,
            imageIndex: index,
            verificationSteps: [
              `View page: ${item.link}`,
              'Right-click image and select "Inspect Element"',
              'Verify alt attribute is present and descriptive',
              'Test with screen reader to ensure it sounds natural'
            ],
            changeType: 'add-attribute'
          }
        });
      } else {
        // Check if alt text is empty or too short
        const altMatch = img.match(/alt="([^"]*)"/);
        if (altMatch && (altMatch[1] === '' || altMatch[1].length < 3)) {
          proposals.push({
            target_type: item.type,
            target_id: item.id,
            target_title: item.title.rendered,
            target_url: item.link,
            field_name: 'content',

            before_value: img,
            after_value: this.generateImageWithAlt(img, item.title.rendered),

            issue_description: `Image "${fileName}" has empty or very short alt text: "${altMatch[1]}"`,
            fix_description: `Improve alt text to: "${this.generateAltText(item.title.rendered, index)}"`,
            expected_benefit: 'Better describes the image for accessibility and SEO purposes',

            severity: 'medium',
            risk_level: 'low',
            category: 'image-optimization',
            impact_score: 55,
            priority: 55,

            reversible: true,

            metadata: {
              fixType: 'image_alt_text_improve',
              imageSrc: imgSrc,
              currentAlt: altMatch[1],
              verificationSteps: [
                `View page: ${item.link}`,
                'Inspect the image element',
                'Verify alt text accurately describes the image',
                'Ensure it reads naturally (5-15 words)'
              ],
              changeType: 'update-attribute'
            }
          });
        }
      }
    });

    return proposals;
  }

  /**
   * Analyze external links and create proposals
   */
  analyzeExternalLinksForProposals(item, content) {
    const proposals = [];
    const links = content.match(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi) || [];

    links.forEach((link, index) => {
      const hrefMatch = link.match(/href="([^"]+)"/);
      if (!hrefMatch) return;

      const href = hrefMatch[1];
      const isExternal = href.startsWith('http') && !href.includes(this.config.siteUrl);

      if (isExternal && !link.includes('noopener')) {
        const linkText = link.match(/>([^<]+)</)?.[1] || 'link';

        proposals.push({
          target_type: item.type,
          target_id: item.id,
          target_title: item.title.rendered,
          target_url: item.link,
          field_name: 'content',

          before_value: link,
          after_value: this.addSecurityAttributes(link),

          issue_description: `External link "${linkText}" missing security attributes (noopener, noreferrer)`,
          fix_description: 'Add rel="noopener noreferrer" to prevent security vulnerabilities',
          expected_benefit: 'Protects your site from tabnabbing attacks and prevents passing referrer information',

          severity: 'low',
          risk_level: 'low',
          category: 'security',
          impact_score: 40,
          priority: 40,

          reversible: true,

          metadata: {
            fixType: 'external_link_security',
            linkHref: href,
            linkText,
            verificationSteps: [
              `View page: ${item.link}`,
              'Click the external link to verify it still works',
              'Inspect the link element',
              'Verify rel="noopener noreferrer" is present',
              'Confirm link opens in new tab if target="_blank" was set'
            ],
            changeType: 'add-attribute'
          }
        });
      }
    });

    return proposals;
  }

  /**
   * Analyze heading structure and create proposals
   */
  analyzeHeadingsForProposals(item, content) {
    const proposals = [];

    const h1s = content.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
    const h2s = content.match(/<h2[^>]*>.*?<\/h2>/gi) || [];
    const h3s = content.match(/<h3[^>]*>.*?<\/h3>/gi) || [];
    const h4s = content.match(/<h4[^>]*>.*?<\/h4>/gi) || [];

    // Remove H1s (WordPress adds it from title)
    if (h1s.length > 0) {
      h1s.forEach((h1, index) => {
        const h1Text = h1.match(/>([^<]+)</)?.[1] || '';

        proposals.push({
          target_type: item.type,
          target_id: item.id,
          target_title: item.title.rendered,
          target_url: item.link,
          field_name: 'content',

          before_value: h1,
          after_value: h1.replace(/<h1/gi, '<h2').replace(/<\/h1>/gi, '</h2>'),

          issue_description: `H1 heading "${h1Text}" found in content - WordPress automatically adds H1 from page title`,
          fix_description: 'Convert H1 to H2 to maintain proper heading hierarchy',
          expected_benefit: 'Fixes heading structure for SEO (only one H1 per page is recommended)',

          severity: 'high',
          risk_level: 'low',
          category: 'heading-structure',
          impact_score: 75,
          priority: 75,

          reversible: true,

          metadata: {
            fixType: 'heading_h1_to_h2',
            h1Text,
            verificationSteps: [
              `View page: ${item.link}`,
              'Inspect the heading to verify it is now H2',
              'Check that page title (H1) is still visible',
              'Run SEO audit tool to verify only one H1 exists',
              'Ensure visual styling still looks correct'
            ],
            changeType: 'replace-tag'
          }
        });
      });
    }

    // Check for H3 without H2 (hierarchy issue)
    if (h3s.length > 0 && h2s.length === 0) {
      proposals.push({
        target_type: item.type,
        target_id: item.id,
        target_title: item.title.rendered,
        target_url: item.link,
        field_name: 'content',

        before_value: 'h3',
        after_value: 'h2',

        issue_description: `Found ${h3s.length} H3 heading(s) without any H2 headings - breaks heading hierarchy`,
        fix_description: `Convert ${h3s.length} H3 heading(s) to H2 to fix hierarchy`,
        expected_benefit: 'Proper heading structure improves SEO and accessibility',

        severity: 'medium',
        risk_level: 'low',
        category: 'heading-structure',
        impact_score: 65,
        priority: 65,

        reversible: true,

        metadata: {
          fixType: 'heading_h3_to_h2',
          h3Count: h3s.length,
          verificationSteps: [
            `View page: ${item.link}`,
            'Check that headings flow logically (H1 → H2 → H3)',
            'Verify no visual styling issues',
            'Run heading hierarchy checker tool',
            'Test with screen reader for proper structure'
          ],
          changeType: 'replace-tag'
        }
      });
    }

    // Check for H4 without H3 (hierarchy issue)
    if (h4s.length > 0 && h3s.length === 0) {
      proposals.push({
        target_type: item.type,
        target_id: item.id,
        target_title: item.title.rendered,
        target_url: item.link,
        field_name: 'content',

        before_value: 'h4',
        after_value: 'h3',

        issue_description: `Found ${h4s.length} H4 heading(s) without any H3 headings - breaks heading hierarchy`,
        fix_description: `Convert ${h4s.length} H4 heading(s) to H3 to fix hierarchy`,
        expected_benefit: 'Maintains proper heading order for better SEO',

        severity: 'low',
        risk_level: 'low',
        category: 'heading-structure',
        impact_score: 50,
        priority: 50,

        reversible: true,

        metadata: {
          fixType: 'heading_h4_to_h3',
          h4Count: h4s.length,
          verificationSteps: [
            `View page: ${item.link}`,
            'Verify heading hierarchy flows correctly',
            'Check visual styling is preserved',
            'Validate with HTML validator'
          ],
          changeType: 'replace-tag'
        }
      });
    }

    return proposals;
  }

  /**
   * Analyze internal linking (suggestions, not auto-fixable)
   */
  analyzeInternalLinkingForProposals(item, content) {
    const proposals = [];
    const text = this.stripHTML(content);
    const wordCount = text.split(/\s+/).length;

    const links = content.match(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi) || [];
    const internalLinks = links.filter(link => {
      const href = link.match(/href="([^"]+)"/)?.[1] || '';
      return !href.startsWith('http') || href.includes(this.config.siteUrl);
    });

    // Only suggest if significant content with no internal links
    if (wordCount > 500 && internalLinks.length === 0) {
      proposals.push({
        target_type: item.type,
        target_id: item.id,
        target_title: item.title.rendered,
        target_url: item.link,
        field_name: 'content',

        before_value: `${wordCount} words, 0 internal links`,
        after_value: `${wordCount} words, 2-3 internal links (manual addition required)`,

        issue_description: `No internal links found in ${wordCount}-word content - missing opportunity for better site structure`,
        fix_description: 'Manually add 2-3 internal links to related content',
        expected_benefit: 'Internal linking improves site structure, distributes page authority, and helps users discover related content',

        severity: 'medium',
        risk_level: 'medium',
        category: 'internal-linking',
        impact_score: 70,
        priority: 70,

        reversible: true,

        metadata: {
          fixType: 'internal_linking_suggestion',
          wordCount,
          currentInternalLinks: 0,
          verificationSteps: [
            'Identify 2-3 related pages on your site',
            'Find natural anchor text in the content',
            'Add contextual internal links',
            `Verify links work by visiting ${item.link}`,
            'Ensure links open in same tab'
          ],
          requiresManualAction: true,
          autoFixable: false
        }
      });
    }

    return proposals;
  }

  /**
   * Analyze readability (suggestions only)
   */
  analyzeReadabilityForProposals(item, content) {
    const proposals = [];
    const text = this.stripHTML(content);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length === 0 || words.length === 0) {
      return proposals;
    }

    const avgSentenceLength = words.length / sentences.length;

    // Only suggest if sentences are significantly too long
    if (avgSentenceLength > 30) {
      proposals.push({
        target_type: item.type,
        target_id: item.id,
        target_title: item.title.rendered,
        target_url: item.link,
        field_name: 'content',

        before_value: `Average sentence length: ${avgSentenceLength.toFixed(1)} words`,
        after_value: `Target average: 15-20 words per sentence`,

        issue_description: `Sentences are too long (average ${avgSentenceLength.toFixed(1)} words) - hurts readability`,
        fix_description: 'Break up long sentences to improve readability (manual editing required)',
        expected_benefit: 'Better readability improves user engagement and reduces bounce rate',

        severity: 'low',
        risk_level: 'high',
        category: 'readability',
        impact_score: 45,
        priority: 30, // Lower priority because manual

        reversible: true,

        metadata: {
          fixType: 'readability_sentence_length',
          currentAvg: avgSentenceLength.toFixed(1),
          targetAvg: '15-20',
          verificationSteps: [
            'Review content and identify overly long sentences',
            'Break sentences at natural pause points',
            'Use tools like Hemingway Editor for guidance',
            'Re-read content to ensure natural flow',
            'Check readability score improved'
          ],
          requiresManualAction: true,
          autoFixable: false
        }
      });
    }

    return proposals;
  }

  /**
   * Analyze keyword density (suggestions only)
   */
  analyzeKeywordDensityForProposals(item, content, title) {
    const proposals = [];
    const text = this.stripHTML(content);
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const totalWords = words.length;

    if (totalWords < 100) {
      return proposals; // Too short to analyze
    }

    // Extract potential focus keyword from title
    const titleWords = title.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4 && !this.isStopWord(w));

    if (titleWords.length > 0) {
      const focusKeyword = titleWords[0];
      const keywordCount = words.filter(w => w.includes(focusKeyword)).length;
      const density = (keywordCount / totalWords) * 100;

      // Only flag if density is very low or very high
      if (density < 0.3) {
        proposals.push({
          target_type: item.type,
          target_id: item.id,
          target_title: item.title.rendered,
          target_url: item.link,
          field_name: 'content',

          before_value: `Keyword "${focusKeyword}" density: ${density.toFixed(2)}%`,
          after_value: `Target density: 1-2%`,

          issue_description: `Very low keyword density for "${focusKeyword}" (${density.toFixed(2)}%) - may not rank well`,
          fix_description: `Mention "${focusKeyword}" more naturally throughout content (target: 1-2%)`,
          expected_benefit: 'Better keyword targeting can improve search rankings for target terms',

          severity: 'medium',
          risk_level: 'high',
          category: 'keyword-density',
          impact_score: 60,
          priority: 40, // Lower because manual

          reversible: true,

          metadata: {
            fixType: 'keyword_density_low',
            keyword: focusKeyword,
            currentDensity: density.toFixed(2),
            currentCount: keywordCount,
            targetDensity: '1-2%',
            verificationSteps: [
              'Review content and identify natural places to add keyword',
              'Add variations and related terms, not exact matches',
              'Read content aloud to ensure it flows naturally',
              'Check keyword density with SEO tool',
              'Ensure no keyword stuffing (max 2%)'
            ],
            requiresManualAction: true,
            autoFixable: false
          }
        });
      } else if (density > 3.5) {
        proposals.push({
          target_type: item.type,
          target_id: item.id,
          target_title: item.title.rendered,
          target_url: item.link,
          field_name: 'content',

          before_value: `Keyword "${focusKeyword}" density: ${density.toFixed(2)}%`,
          after_value: `Target density: 1-2%`,

          issue_description: `Keyword stuffing detected for "${focusKeyword}" (${density.toFixed(2)}%) - risks penalty`,
          fix_description: `Reduce usage of "${focusKeyword}" to avoid search engine penalties (target: 1-2%)`,
          expected_benefit: 'Avoiding keyword stuffing prevents search engine penalties and improves readability',

          severity: 'high',
          risk_level: 'high',
          category: 'keyword-density',
          impact_score: 80,
          priority: 50, // Higher because it's harmful

          reversible: true,

          metadata: {
            fixType: 'keyword_density_high',
            keyword: focusKeyword,
            currentDensity: density.toFixed(2),
            currentCount: keywordCount,
            targetDensity: '1-2%',
            verificationSteps: [
              'Find instances where keyword is overused',
              'Replace some with synonyms or related terms',
              'Ensure content still reads naturally',
              'Recheck keyword density',
              'Verify content still targets the topic'
            ],
            requiresManualAction: true,
            autoFixable: false
          }
        });
      }
    }

    return proposals;
  }

  /**
   * REQUIRED: Apply a single fix from an approved proposal
   */
  async applyFix(proposal, options = {}) {
    const { target_id, before_value, after_value, metadata } = proposal;

    // Get current content
    const content = await this.wpClient.getPost(target_id);
    let updatedContent = content.content.rendered;

    // Apply fix based on type
    switch (metadata.fixType) {
      case 'image_alt_text':
      case 'image_alt_text_improve':
        updatedContent = updatedContent.replace(before_value, after_value);
        break;

      case 'external_link_security':
        updatedContent = updatedContent.replace(before_value, after_value);
        break;

      case 'heading_h1_to_h2':
        updatedContent = updatedContent.replace(before_value, after_value);
        break;

      case 'heading_h3_to_h2':
        updatedContent = updatedContent.replace(/<h3/gi, '<h2').replace(/<\/h3>/gi, '</h2>');
        break;

      case 'heading_h4_to_h3':
        updatedContent = updatedContent.replace(/<h4/gi, '<h3').replace(/<\/h4>/gi, '</h3>');
        break;

      default:
        throw new Error(`Cannot auto-fix type: ${metadata.fixType} (requires manual action)`);
    }

    // Update WordPress
    const endpoint = proposal.target_type === 'post' ? 'updatePost' : 'updatePage';
    const updated = await this.wpClient[endpoint](target_id, {
      content: updatedContent
    });

    return {
      success: true,
      contentId: target_id,
      fixType: metadata.fixType,
      timestamp: new Date().toISOString(),
      url: updated.link
    };
  }

  /**
   * Helper: Generate alt text from title
   */
  generateAltText(title, index) {
    const cleanTitle = title.replace(/[^\w\s-]/g, '').trim();
    return index === 0 ? cleanTitle : `${cleanTitle} - image ${index + 1}`;
  }

  /**
   * Helper: Generate image tag with alt text
   */
  generateImageWithAlt(imgTag, title) {
    const altText = this.generateAltText(title, 0);

    if (!imgTag.includes('alt=')) {
      // Add alt attribute
      return imgTag.replace('<img', `<img alt="${altText}"`);
    } else {
      // Update existing alt
      return imgTag.replace(/alt="[^"]*"/, `alt="${altText}"`);
    }
  }

  /**
   * Helper: Add security attributes to link
   */
  addSecurityAttributes(link) {
    if (link.includes('rel="')) {
      return link.replace(/rel="([^"]*)"/, 'rel="$1 noopener noreferrer"');
    } else {
      return link.replace('<a', '<a rel="noopener noreferrer"');
    }
  }

  /**
   * Helper: Strip HTML tags
   */
  stripHTML(html) {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Helper: Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = ['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have',
                       'will', 'your', 'more', 'what', 'when', 'where', 'which'];
    return stopWords.includes(word.toLowerCase());
  }
}

export default ContentOptimizer;
