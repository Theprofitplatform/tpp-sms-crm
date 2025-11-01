/**
 * Broken Link Detector v2
 *
 * Refactored to use manual review workflow
 *
 * Features:
 * - Scans all internal and external links
 * - Detects 404s, redirects, timeouts, and DNS errors
 * - Suggests automatic fixes for common issues
 * - Creates detailed proposals for review
 * - Manual approval before changes are applied
 * - Rich descriptions and verification steps
 * - Automatic risk assessment
 *
 * @extends AutoFixEngineBase
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class BrokenLinkDetectorV2 extends AutoFixEngineBase {
  constructor(config) {
    super(config);

    this.wpClient = new WordPressClient(
      config.siteUrl,
      config.wpUser,
      config.wpPassword
    );

    this.siteUrl = config.siteUrl;
    this.checkedUrls = new Map(); // Cache to avoid re-checking same URL
    this.linkTimeout = config.linkTimeout || 5000; // 5 seconds default
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'technical-seo';
  }

  /**
   * Detect issues: Find all broken links and suggest fixes
   */
  async detectIssues(options = {}) {
    const issues = [];
    const limit = options.limit || 50;
    const checkExternal = options.checkExternal !== false; // Default true
    const timeout = options.timeout || this.linkTimeout;

    try {
      console.log('   🔗 Fetching WordPress content...');

      // Fetch all content
      const [posts, pages] = await Promise.all([
        this.wpClient.getPosts({ per_page: limit }),
        this.wpClient.getPages({ per_page: limit })
      ]);

      const allContent = [...posts, ...pages];
      console.log(`   ✅ Found ${allContent.length} pages to scan`);
      console.log(`   🔍 Scanning for broken links...`);

      let totalLinks = 0;
      let brokenLinksFound = 0;

      // Scan each piece of content
      for (const item of allContent) {
        const brokenLinks = await this.scanContentForBrokenLinks(
          item,
          checkExternal,
          timeout
        );

        totalLinks += brokenLinks.totalLinks;
        brokenLinksFound += brokenLinks.broken.length;

        // Create issues from broken links
        for (const broken of brokenLinks.broken) {
          const issue = await this.createIssueFromBrokenLink(item, broken);
          issues.push(issue);
        }
      }

      console.log(`   ✅ Scan complete: Checked ${totalLinks} links, found ${brokenLinksFound} broken`);

    } catch (error) {
      console.error(`   ❌ Detection error: ${error.message}`);
      throw error;
    }

    return issues;
  }

  /**
   * Scan content for broken links
   */
  async scanContentForBrokenLinks(item, checkExternal, timeout) {
    const content = item.content?.rendered || '';
    const broken = [];
    let totalLinks = 0;

    if (!content) {
      return { totalLinks: 0, broken: [] };
    }

    const $ = cheerio.load(content);
    const links = $('a[href]');

    for (let i = 0; i < links.length; i++) {
      const link = $(links[i]);
      const href = link.attr('href');
      const text = link.text().trim();

      // Skip anchors and javascript
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        continue;
      }

      totalLinks++;

      // Normalize URL
      let url = href;
      if (url.startsWith('/')) {
        url = new URL(url, this.siteUrl).href;
      } else if (!url.startsWith('http')) {
        url = new URL(url, this.siteUrl).href;
      }

      // Determine if external
      const isExternal = !url.startsWith(this.siteUrl);

      // Skip external links if disabled
      if (isExternal && !checkExternal) {
        continue;
      }

      // Check if already tested (use cache)
      let status;
      if (this.checkedUrls.has(url)) {
        status = this.checkedUrls.get(url);
      } else {
        status = await this.checkLink(url, timeout);
        this.checkedUrls.set(url, status);
      }

      // If link is broken, try to find a fix
      if (status !== 200 && status < 300) {
        const suggestedFix = await this.suggestFix(url, status);

        broken.push({
          url,
          text,
          status,
          isExternal,
          suggestedFix
        });
      }
    }

    return { totalLinks, broken };
  }

  /**
   * Check if a link is working
   */
  async checkLink(url, timeout) {
    try {
      const response = await axios.head(url, {
        timeout,
        maxRedirects: 5, // Follow redirects
        validateStatus: (status) => status < 500, // Don't throw on 4xx
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Link-Checker/2.0)'
        }
      });

      return response.status;

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        return 'TIMEOUT';
      } else if (error.code === 'ENOTFOUND') {
        return 'DNS_ERROR';
      } else if (error.code === 'ECONNREFUSED') {
        return 'CONNECTION_REFUSED';
      } else if (error.response) {
        return error.response.status;
      } else {
        return 'ERROR';
      }
    }
  }

  /**
   * Suggest a fix for a broken link
   */
  async suggestFix(url, currentStatus) {
    // Try 1: HTTPS upgrade if HTTP failed
    if (url.startsWith('http://')) {
      const httpsUrl = url.replace('http://', 'https://');
      const status = await this.checkLink(httpsUrl, 3000);
      if (status === 200) {
        return {
          newUrl: httpsUrl,
          type: 'protocol_upgrade',
          confidence: 'high'
        };
      }
    }

    // Try 2: Add trailing slash
    if (!url.endsWith('/') && !url.includes('?') && !this.hasFileExtension(url)) {
      const withSlash = url + '/';
      const status = await this.checkLink(withSlash, 3000);
      if (status === 200) {
        return {
          newUrl: withSlash,
          type: 'add_trailing_slash',
          confidence: 'high'
        };
      }
    }

    // Try 3: Remove trailing slash
    if (url.endsWith('/') && url.split('/').length > 4) {
      const withoutSlash = url.slice(0, -1);
      const status = await this.checkLink(withoutSlash, 3000);
      if (status === 200) {
        return {
          newUrl: withoutSlash,
          type: 'remove_trailing_slash',
          confidence: 'high'
        };
      }
    }

    // Try 4: HTTP downgrade (if HTTPS failed - some old sites)
    if (url.startsWith('https://')) {
      const httpUrl = url.replace('https://', 'http://');
      const status = await this.checkLink(httpUrl, 3000);
      if (status === 200) {
        return {
          newUrl: httpUrl,
          type: 'protocol_downgrade',
          confidence: 'medium'
        };
      }
    }

    // No automatic fix found
    return null;
  }

  /**
   * Check if URL has file extension
   */
  hasFileExtension(url) {
    const path = new URL(url).pathname;
    const lastSegment = path.split('/').pop();
    return lastSegment.includes('.') && !lastSegment.endsWith('.');
  }

  /**
   * Create issue proposal from broken link
   */
  async createIssueFromBrokenLink(item, broken) {
    const { url, text, status, isExternal, suggestedFix } = broken;

    // Determine severity based on status
    let severity = 'medium';
    let riskLevel = 'low';

    if (status === 404 || status === 410) {
      severity = 'high'; // Dead link
    } else if (status === 'TIMEOUT' || status === 'DNS_ERROR') {
      severity = 'high';
    } else if (status >= 500) {
      severity = 'medium'; // Server error, might be temporary
    }

    // External links are lower risk to fix
    if (isExternal) {
      riskLevel = 'low';
    } else {
      riskLevel = 'medium'; // Internal links are more critical
    }

    // Build issue description
    const statusDescription = this.getStatusDescription(status);

    const issueDescription = `Broken ${isExternal ? 'external' : 'internal'} link detected: "${url}" returns ${statusDescription}. ${isExternal ? 'This external link is not accessible' : 'This internal link may indicate a missing or moved page'}. Link text: "${text || '(no text)'}". Broken links harm user experience and SEO rankings.`;

    // Build fix description
    let fixDescription;
    let afterValue;

    if (suggestedFix) {
      const fixTypeDesc = this.getFixTypeDescription(suggestedFix.type);
      fixDescription = `Replace broken link "${url}" with working alternative "${suggestedFix.newUrl}". Fix type: ${fixTypeDesc}. The new URL was verified as working (HTTP 200).`;
      afterValue = suggestedFix.newUrl;
    } else {
      fixDescription = `Remove or replace broken link "${url}". No automatic fix available - manual intervention required. Consider: updating to correct URL, removing the link, or linking to archive.org version.`;
      afterValue = `[MANUAL_FIX_REQUIRED] ${url}`;
    }

    // Build expected benefit
    const expectedBenefit = `Fixing broken links improves user experience and SEO. ${isExternal ? 'External links' : 'Internal links'} should always work. Benefits: better user trust, improved crawlability${!isExternal ? ', restored internal link equity' : ''}, and compliance with web standards. ${suggestedFix ? 'Automatic fix available' : 'Manual review needed to find replacement'}.`;

    // Build verification steps
    const verificationSteps = [
      `1. Visit the page at: ${item.link}`,
      `2. Find the link with text: "${text || '(check page content)'}"`,
      suggestedFix
        ? `3. Verify the link now points to: ${suggestedFix.newUrl}`
        : `3. Verify the link has been updated or removed`,
      suggestedFix
        ? `4. Click the link and confirm it loads successfully (HTTP 200)`
        : `4. If updated, test the new link works correctly`,
      `5. Check that link is still contextually relevant to surrounding content`
    ];

    return {
      target_type: item.type,
      target_id: item.id,
      target_title: item.title.rendered,
      target_url: item.link,
      field_name: 'content',

      before_value: url,
      after_value: afterValue,

      issue_description: issueDescription,
      fix_description: fixDescription,
      expected_benefit: expectedBenefit,

      severity: severity,
      risk_level: riskLevel,
      category: 'technical-seo',

      impact_score: severity === 'high' ? 80 : severity === 'medium' ? 60 : 40,
      priority: severity === 'high' ? 85 : severity === 'medium' ? 70 : 55,

      reversible: true,

      metadata: {
        verificationSteps,
        linkDetails: {
          originalUrl: url,
          linkText: text,
          status: status,
          statusDescription: statusDescription,
          isExternal: isExternal,
          suggestedFix: suggestedFix || null
        }
      }
    };
  }

  /**
   * Get human-readable status description
   */
  getStatusDescription(status) {
    const descriptions = {
      404: 'HTTP 404 Not Found',
      410: 'HTTP 410 Gone (permanently deleted)',
      403: 'HTTP 403 Forbidden (access denied)',
      500: 'HTTP 500 Server Error',
      502: 'HTTP 502 Bad Gateway',
      503: 'HTTP 503 Service Unavailable',
      'TIMEOUT': 'Connection Timeout (server not responding)',
      'DNS_ERROR': 'DNS Error (domain does not exist)',
      'CONNECTION_REFUSED': 'Connection Refused',
      'ERROR': 'Unknown Error'
    };

    return descriptions[status] || `HTTP ${status}`;
  }

  /**
   * Get human-readable fix type description
   */
  getFixTypeDescription(type) {
    const descriptions = {
      'protocol_upgrade': 'Upgrade HTTP to HTTPS',
      'protocol_downgrade': 'Downgrade HTTPS to HTTP (less secure)',
      'add_trailing_slash': 'Add trailing slash to URL',
      'remove_trailing_slash': 'Remove trailing slash from URL'
    };

    return descriptions[type] || type;
  }

  /**
   * Apply fix: Replace broken link in content
   */
  async applyFix(proposal, options = {}) {
    const { target_id, target_type, metadata, before_value, after_value } = proposal;

    if (!metadata || !metadata.linkDetails) {
      throw new Error('Proposal missing required metadata');
    }

    // Check if manual fix is required
    if (after_value.startsWith('[MANUAL_FIX_REQUIRED]')) {
      throw new Error('This link requires manual intervention - no automatic fix available');
    }

    const oldUrl = metadata.linkDetails.originalUrl;
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

      // Replace the link (handle both quote styles)
      let updatedContent = content
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
        oldUrl: oldUrl,
        newUrl: newUrl,
        fixType: metadata.linkDetails.suggestedFix?.type || 'manual',
        message: 'Broken link replaced successfully'
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

  /**
   * Get broken link statistics
   */
  async getBrokenLinkStats(options = {}) {
    const issues = await this.detectIssues(options);

    const stats = {
      total: issues.length,
      byStatus: {},
      byType: { internal: 0, external: 0 },
      fixable: 0,
      manualReview: 0
    };

    issues.forEach(issue => {
      const status = issue.metadata.linkDetails.status;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      if (issue.metadata.linkDetails.isExternal) {
        stats.byType.external++;
      } else {
        stats.byType.internal++;
      }

      if (issue.metadata.linkDetails.suggestedFix) {
        stats.fixable++;
      } else {
        stats.manualReview++;
      }
    });

    return stats;
  }
}

export default BrokenLinkDetectorV2;
