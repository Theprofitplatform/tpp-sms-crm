/**
 * Redirect Checker v2
 *
 * Detects and optimizes redirect chains
 *
 * Features:
 * - Detects redirect chains (A→B→C)
 * - Finds unnecessary redirects
 * - Suggests direct links
 * - Identifies redirect loops
 * - Checks redirect types (301 vs 302)
 * - Manual review workflow
 *
 * @extends AutoFixEngineBase
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class RedirectCheckerV2 extends AutoFixEngineBase {
  constructor(config) {
    super(config);

    this.wpClient = new WordPressClient(
      config.siteUrl,
      config.wpUser,
      config.wpPassword
    );

    this.siteUrl = config.siteUrl;
    this.checkedUrls = new Map();
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'technical-seo';
  }

  /**
   * Detect issues: Find redirect chains and unnecessary redirects
   */
  async detectIssues(options = {}) {
    const issues = [];
    const limit = options.limit || 50;
    const checkExternal = options.checkExternal !== false;

    try {
      console.log('   ↪️  Fetching WordPress content...');

      const [posts, pages] = await Promise.all([
        this.wpClient.getPosts({ per_page: limit }),
        this.wpClient.getPages({ per_page: limit })
      ]);

      const allContent = [...posts, ...pages];
      console.log(`   ✅ Found ${allContent.length} pages to scan`);
      console.log('   🔍 Checking for redirects...');

      let totalLinks = 0;
      let redirectsFound = 0;

      for (const item of allContent) {
        const redirectIssues = await this.checkContentForRedirects(item, checkExternal);
        totalLinks += redirectIssues.totalLinks;
        redirectsFound += redirectIssues.redirects.length;

        issues.push(...redirectIssues.redirects);
      }

      console.log(`   ✅ Scan complete: Checked ${totalLinks} links, found ${redirectsFound} redirects`);

    } catch (error) {
      console.error(`   ❌ Detection error: ${error.message}`);
      throw error;
    }

    return issues;
  }

  /**
   * Check content for redirects
   */
  async checkContentForRedirects(item, checkExternal) {
    const content = item.content?.rendered || '';
    const redirects = [];
    let totalLinks = 0;

    if (!content) {
      return { totalLinks: 0, redirects: [] };
    }

    const $ = cheerio.load(content);
    const links = $('a[href]');

    for (let i = 0; i < links.length; i++) {
      const link = $(links[i]);
      const href = link.attr('href');

      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        continue;
      }

      totalLinks++;

      // Normalize URL
      let url = href;
      if (url.startsWith('/')) {
        url = new URL(url, this.siteUrl).href;
      }

      const isExternal = !url.startsWith(this.siteUrl);
      if (isExternal && !checkExternal) {
        continue;
      }

      // Check for redirects
      const redirectChain = await this.followRedirectChain(url);

      if (redirectChain.length > 1) {
        const issue = this.createRedirectIssue(item, url, redirectChain, link.text().trim());
        redirects.push(issue);
      }
    }

    return { totalLinks, redirects };
  }

  /**
   * Follow redirect chain
   */
  async followRedirectChain(url, maxDepth = 5) {
    if (this.checkedUrls.has(url)) {
      return this.checkedUrls.get(url);
    }

    const chain = [{ url, status: null }];
    let currentUrl = url;
    let depth = 0;

    try {
      while (depth < maxDepth) {
        const response = await axios.head(currentUrl, {
          maxRedirects: 0,
          validateStatus: () => true,
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEO-Redirect-Checker/2.0)'
          }
        });

        chain[chain.length - 1].status = response.status;

        // Check if redirect
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.location;
          if (!location) break;

          // Make location absolute
          let nextUrl = location;
          if (location.startsWith('/')) {
            nextUrl = new URL(location, currentUrl).href;
          }

          // Detect loop
          if (chain.some(c => c.url === nextUrl)) {
            chain.push({ url: nextUrl, status: 'LOOP' });
            break;
          }

          chain.push({ url: nextUrl, status: null });
          currentUrl = nextUrl;
          depth++;
        } else {
          // Not a redirect, we're done
          break;
        }
      }

      if (depth >= maxDepth) {
        chain.push({ url: 'MAX_DEPTH', status: 'TOO_MANY_REDIRECTS' });
      }

    } catch (error) {
      chain[chain.length - 1].status = 'ERROR';
    }

    this.checkedUrls.set(url, chain);
    return chain;
  }

  /**
   * Create redirect issue
   */
  createRedirectIssue(item, originalUrl, redirectChain, linkText) {
    const chainLength = redirectChain.length;
    const finalUrl = redirectChain[redirectChain.length - 1].url;
    const hasLoop = redirectChain.some(c => c.status === 'LOOP');
    const isExternal = !originalUrl.startsWith(this.siteUrl);

    // Determine severity
    let severity = 'medium';
    let riskLevel = isExternal ? 'low' : 'medium';

    if (hasLoop) {
      severity = 'critical';
    } else if (chainLength > 3) {
      severity = 'high';
    }

    // Build chain description
    const chainDesc = redirectChain
      .map((c, i) => `${i + 1}. ${c.url} (${c.status || 'pending'})`)
      .join('\n');

    const issueDescription = `Redirect chain detected (${chainLength} ${chainLength === 2 ? 'redirect' : 'redirects'}): Link points to "${originalUrl}" which redirects through ${chainLength - 1} intermediate URL(s) before reaching final destination. ${hasLoop ? 'WARNING: Redirect loop detected!' : ''} Redirect chains slow down page load, waste crawl budget, and dilute link equity. Link text: "${linkText || '(no text)'}".`;

    const fixDescription = hasLoop
      ? `Fix redirect loop: Update link from "${originalUrl}" to a working URL. The current link creates an infinite redirect loop which breaks user experience and wastes server resources.`
      : `Bypass redirect chain: Update link from "${originalUrl}" directly to final destination "${finalUrl}". This eliminates ${chainLength - 1} unnecessary HTTP request(s) and improves page load speed.`;

    const expectedBenefit = `Direct links improve: page load speed (${chainLength - 1} fewer HTTP requests), user experience (faster navigation), SEO (better crawl budget usage, preserved link equity), and server performance (fewer redirects to process).${hasLoop ? ' Fixing loops is critical for site functionality.' : ''}`;

    const verificationSteps = [
      `1. Visit page: ${item.link}`,
      `2. Find link with text: "${linkText || '(check page)'}"`,
      hasLoop
        ? `3. Verify link no longer creates infinite loop`
        : `3. Verify link now points directly to: ${finalUrl}`,
      `4. Click link and confirm it loads without redirects`,
      `5. Use browser DevTools Network tab to verify single request`
    ];

    return {
      target_type: item.type,
      target_id: item.id,
      target_title: item.title.rendered,
      target_url: item.link,
      field_name: 'content',

      before_value: originalUrl,
      after_value: hasLoop ? '[MANUAL_FIX_REQUIRED]' : finalUrl,

      issue_description: issueDescription,
      fix_description: fixDescription,
      expected_benefit: expectedBenefit,

      severity: severity,
      risk_level: riskLevel,
      category: 'technical-seo',
      impact_score: hasLoop ? 95 : chainLength > 3 ? 80 : 65,
      priority: hasLoop ? 95 : chainLength > 3 ? 85 : 70,

      reversible: true,

      metadata: {
        verificationSteps,
        redirectDetails: {
          originalUrl,
          finalUrl: hasLoop ? null : finalUrl,
          chainLength,
          redirectChain: redirectChain.map(c => `${c.url} (${c.status})`),
          hasLoop,
          isExternal,
          linkText
        }
      }
    };
  }

  /**
   * Apply fix: Replace redirect URL with final URL
   */
  async applyFix(proposal, options = {}) {
    const { target_id, target_type, before_value, after_value, metadata } = proposal;

    if (!metadata || !metadata.redirectDetails) {
      throw new Error('Proposal missing required metadata');
    }

    if (metadata.redirectDetails.hasLoop) {
      throw new Error('Redirect loops require manual intervention');
    }

    const oldUrl = before_value;
    const newUrl = after_value;

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

      // Replace the URL
      const updatedContent = content
        .replace(
          new RegExp(`href="${this.escapeRegExp(oldUrl)}"`, 'g'),
          `href="${newUrl}"`
        )
        .replace(
          new RegExp(`href='${this.escapeRegExp(oldUrl)}'`, 'g'),
          `href='${newUrl}'`
        );

      // Update WordPress
      if (target_type === 'post') {
        await this.wpClient.updatePost(target_id, { content: updatedContent });
      } else {
        await this.wpClient.updatePage(target_id, { content: updatedContent });
      }

      console.log(`      ✅ Updated ${target_type} #${target_id}: ${oldUrl} → ${newUrl}`);

      return {
        success: true,
        contentId: target_id,
        contentType: target_type,
        oldUrl,
        newUrl,
        redirectsEliminated: metadata.redirectDetails.chainLength - 1,
        message: 'Redirect chain bypassed successfully'
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

export default RedirectCheckerV2;
