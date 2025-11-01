/**
 * Internal Link Builder v2
 *
 * Suggests internal linking opportunities
 *
 * Features:
 * - Finds pages lacking internal links
 * - Suggests contextual link opportunities
 * - Identifies orphan pages
 * - Recommends anchor text
 * - Builds topic clusters
 * - Manual review workflow
 *
 * @extends AutoFixEngineBase
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';
import * as cheerio from 'cheerio';

export class InternalLinkBuilderV2 extends AutoFixEngineBase {
  constructor(config) {
    super(config);

    this.wpClient = new WordPressClient(
      config.siteUrl,
      config.wpUser,
      config.wpPassword
    );

    this.siteUrl = config.siteUrl;
    this.minWordCount = config.minWordCount || 300;
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'content-seo';
  }

  /**
   * Detect issues: Find internal linking opportunities
   */
  async detectIssues(options = {}) {
    const issues = [];
    const limit = options.limit || 50;

    try {
      console.log('   🔗 Fetching WordPress content...');

      const [posts, pages] = await Promise.all([
        this.wpClient.getPosts({ per_page: limit }),
        this.wpClient.getPages({ per_page: limit })
      ]);

      const allContent = [...posts, ...pages];
      console.log(`   ✅ Found ${allContent.length} pages`);
      console.log('   🔍 Analyzing internal link opportunities...');

      // Build content index for matching
      const contentIndex = allContent.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title.rendered,
        url: item.link,
        slug: item.slug,
        excerpt: item.excerpt?.rendered || '',
        content: item.content?.rendered || '',
        categories: item.categories || [],
        tags: item.tags || []
      }));

      let opportunitiesFound = 0;

      // Find linking opportunities for each piece of content
      for (const item of allContent) {
        const opportunities = this.findLinkOpportunities(item, contentIndex);
        opportunitiesFound += opportunities.length;

        for (const opportunity of opportunities) {
          issues.push(this.createLinkingIssue(item, opportunity));
        }
      }

      console.log(`   ✅ Analysis complete: Found ${opportunitiesFound} link opportunities`);

    } catch (error) {
      console.error(`   ❌ Detection error: ${error.message}`);
      throw error;
    }

    return issues;
  }

  /**
   * Find link opportunities for an item
   */
  findLinkOpportunities(item, contentIndex) {
    const content = item.content?.rendered || '';
    const $ = cheerio.load(content);
    const text = $.text().toLowerCase();
    const wordCount = text.split(/\s+/).length;

    // Skip short content
    if (wordCount < this.minWordCount) {
      return [];
    }

    // Get existing internal links
    const existingLinks = $('a[href]')
      .map((i, el) => $(el).attr('href'))
      .get()
      .filter(href => href && href.includes(this.siteUrl))
      .map(href => new URL(href, this.siteUrl).pathname);

    const opportunities = [];

    // Find related content to link to
    for (const target of contentIndex) {
      // Don't link to self
      if (target.id === item.id) continue;

      // Check if already linked
      const targetPath = new URL(target.url).pathname;
      if (existingLinks.includes(targetPath)) continue;

      // Find keyword matches
      const targetKeywords = this.extractKeywords(target.title);

      for (const keyword of targetKeywords) {
        // Check if keyword appears in content (case insensitive)
        const regex = new RegExp(`\\b${this.escapeRegExp(keyword)}\\b`, 'i');
        const match = content.match(regex);

        if (match) {
          // Found a linking opportunity
          opportunities.push({
            targetId: target.id,
            targetType: target.type,
            targetTitle: target.title,
            targetUrl: target.url,
            keyword: keyword,
            matchedText: match[0],
            relevance: this.calculateRelevance(item, target)
          });

          // Limit to avoid too many suggestions
          if (opportunities.length >= 5) break;
        }
      }

      if (opportunities.length >= 5) break;
    }

    return opportunities;
  }

  /**
   * Extract keywords from title
   */
  extractKeywords(title) {
    // Remove common words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];

    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));

    // Also include full title (minus stop words)
    const fullPhrase = title.replace(/\b(the|a|an)\b/gi, '').trim();

    return [fullPhrase, ...words].slice(0, 5);
  }

  /**
   * Calculate relevance score
   */
  calculateRelevance(source, target) {
    let score = 0;

    // Same categories
    const sharedCats = (source.categories || []).filter(c =>
      (target.categories || []).includes(c)
    );
    score += sharedCats.length * 10;

    // Same tags
    const sharedTags = (source.tags || []).filter(t =>
      (target.tags || []).includes(t)
    );
    score += sharedTags.length * 5;

    return Math.min(100, score);
  }

  /**
   * Create linking issue
   */
  createLinkingIssue(item, opportunity) {
    const { targetTitle, targetUrl, keyword, matchedText, relevance } = opportunity;

    const issueDescription = `Internal linking opportunity: Page lacks link to related content "${targetTitle}". The keyword "${keyword}" appears in this content but is not linked. Internal linking improves site navigation, distributes page authority, helps users discover related content, and improves SEO by strengthening topic clusters.`;

    const fixDescription = `Add internal link: Convert text "${matchedText}" into a link to "${targetTitle}" (${targetUrl}). This creates a contextual, relevant internal link that helps users navigate to related content and improves site structure.`;

    const expectedBenefit = `Internal links improve: SEO (distribute PageRank, strengthen topic relevance), user experience (discover related content), site structure (create topic clusters), engagement (increase page views per session), and crawlability (help search engines discover content). Relevance score: ${relevance}/100.`;

    const severity = relevance > 50 ? 'medium' : 'low';

    const verificationSteps = [
      `1. Visit page: ${item.link}`,
      `2. Find the text: "${matchedText}"`,
      `3. Verify it is now a clickable link`,
      `4. Click the link and confirm it goes to: ${targetUrl}`,
      `5. Verify the link is contextually relevant in surrounding text`
    ];

    return {
      target_type: item.type,
      target_id: item.id,
      target_title: item.title.rendered,
      target_url: item.link,
      field_name: 'content',

      before_value: matchedText,
      after_value: `<a href="${targetUrl}">${matchedText}</a>`,

      issue_description: issueDescription,
      fix_description: fixDescription,
      expected_benefit: expectedBenefit,

      severity: severity,
      risk_level: 'low',
      category: 'content-seo',
      impact_score: relevance > 50 ? 65 : 45,
      priority: relevance > 50 ? 70 : 55,

      reversible: true,

      metadata: {
        verificationSteps,
        linkDetails: {
          targetTitle,
          targetUrl,
          keyword,
          matchedText,
          relevance
        }
      }
    };
  }

  /**
   * Apply fix: Add internal link
   */
  async applyFix(proposal, options = {}) {
    const { target_id, target_type, before_value, after_value } = proposal;

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

      // Find first occurrence of the text and replace with link
      const updatedContent = content.replace(
        new RegExp(`\\b${this.escapeRegExp(before_value)}\\b`, 'i'),
        after_value
      );

      // Update WordPress
      if (target_type === 'post') {
        await this.wpClient.updatePost(target_id, { content: updatedContent });
      } else {
        await this.wpClient.updatePage(target_id, { content: updatedContent });
      }

      console.log(`      ✅ Added internal link in ${target_type} #${target_id}`);

      return {
        success: true,
        contentId: target_id,
        contentType: target_type,
        linkAdded: before_value,
        message: 'Internal link added successfully'
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

export default InternalLinkBuilderV2;
