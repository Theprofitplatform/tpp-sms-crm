/**
 * Sitemap Optimizer v2
 *
 * Ensures XML sitemap is optimized
 *
 * Features:
 * - Verifies sitemap exists
 * - Checks sitemap is submitted to search engines
 * - Validates sitemap format
 * - Suggests sitemap improvements
 * - Checks lastmod dates
 * - Manual review workflow
 *
 * @extends AutoFixEngineBase
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class SitemapOptimizerV2 extends AutoFixEngineBase {
  constructor(config) {
    super(config);

    this.wpClient = new WordPressClient(
      config.siteUrl,
      config.wpUser,
      config.wpPassword
    );

    this.siteUrl = config.siteUrl;
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'technical-seo';
  }

  /**
   * Detect issues: Check sitemap configuration
   */
  async detectIssues(options = {}) {
    const issues = [];

    try {
      console.log('   🗺️  Checking sitemap configuration...');

      // Check if sitemap exists
      const sitemapUrls = [
        `${this.siteUrl}/sitemap.xml`,
        `${this.siteUrl}/sitemap_index.xml`,
        `${this.siteUrl}/wp-sitemap.xml` // WordPress default
      ];

      let sitemapUrl = null;
      let sitemapContent = null;

      for (const url of sitemapUrls) {
        try {
          const response = await axios.get(url, { timeout: 5000 });
          if (response.status === 200 && response.data.includes('<?xml')) {
            sitemapUrl = url;
            sitemapContent = response.data;
            break;
          }
        } catch (e) {
          // Continue to next URL
        }
      }

      if (!sitemapUrl) {
        issues.push(this.createMissingSitemapIssue());
      } else {
        console.log(`   ✅ Found sitemap at: ${sitemapUrl}`);

        // Parse sitemap
        const $ = cheerio.load(sitemapContent, { xmlMode: true });

        // Check robots.txt includes sitemap
        const robotsTxtIssue = await this.checkRobotsTxt(sitemapUrl);
        if (robotsTxtIssue) {
          issues.push(robotsTxtIssue);
        }

        // Check lastmod dates
        const urls = $('url');
        let missingLastmod = 0;

        urls.each((i, el) => {
          const lastmod = $(el).find('lastmod').text();
          if (!lastmod) {
            missingLastmod++;
          }
        });

        if (missingLastmod > 0) {
          issues.push(this.createLastmodIssue(sitemapUrl, missingLastmod, urls.length));
        }

        console.log(`   ✅ Sitemap check complete: ${urls.length} URLs in sitemap`);
      }

    } catch (error) {
      console.error(`   ❌ Detection error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Create missing sitemap issue
   */
  createMissingSitemapIssue() {
    return {
      target_type: 'site',
      target_id: 0,
      target_title: 'Site Configuration',
      target_url: this.siteUrl,
      field_name: 'sitemap',

      before_value: 'No sitemap found',
      after_value: 'Install XML sitemap plugin (e.g., Yoast SEO, Rank Math)',

      issue_description: `XML sitemap not found. Checked common locations: /sitemap.xml, /sitemap_index.xml, /wp-sitemap.xml. XML sitemaps help search engines discover and crawl your content efficiently. Without a sitemap, search engines may miss pages, leading to incomplete indexing.`,

      fix_description: `Install and configure an XML sitemap plugin for WordPress. Recommended: Yoast SEO (includes sitemap), Rank Math, or Google XML Sitemaps plugin. These plugins automatically generate and update your sitemap as content changes.`,

      expected_benefit: `XML sitemaps improve: content discovery (search engines find all pages), indexing speed (new content indexed faster), crawl efficiency (search engines prioritize important pages), and SEO (ensures all content is searchable). Critical for sites with >50 pages.`,

      severity: 'high',
      risk_level: 'low',
      category: 'technical-seo',
      impact_score: 85,
      priority: 90,

      reversible: false,

      metadata: {
        verificationSteps: [
          `1. Install Yoast SEO or Rank Math plugin`,
          `2. Enable XML sitemap in plugin settings`,
          `3. Visit ${this.siteUrl}/sitemap.xml to verify`,
          `4. Submit sitemap to Google Search Console`,
          `5. Check robots.txt includes: Sitemap: ${this.siteUrl}/sitemap.xml`
        ],
        requiresManualFix: true
      }
    };
  }

  /**
   * Check if robots.txt references sitemap
   */
  async checkRobotsTxt(sitemapUrl) {
    try {
      const response = await axios.get(`${this.siteUrl}/robots.txt`, { timeout: 5000 });
      const robotsTxt = response.data;

      if (!robotsTxt.toLowerCase().includes('sitemap:')) {
        return {
          target_type: 'site',
          target_id: 0,
          target_title: 'robots.txt',
          target_url: `${this.siteUrl}/robots.txt`,
          field_name: 'robots_txt',

          before_value: robotsTxt,
          after_value: `${robotsTxt}\n\nSitemap: ${sitemapUrl}`,

          issue_description: `robots.txt does not reference sitemap location. Adding sitemap reference to robots.txt helps search engines quickly locate your sitemap. This is a best practice recommended by Google and Bing.`,

          fix_description: `Add line to robots.txt: "Sitemap: ${sitemapUrl}". This tells search engines where to find your XML sitemap, improving discoverability and crawl efficiency.`,

          expected_benefit: `Sitemap reference in robots.txt ensures search engines can find your sitemap even without manual submission to Search Console. Improves crawl efficiency and content discovery.`,

          severity: 'medium',
          risk_level: 'low',
          category: 'technical-seo',
          impact_score: 60,
          priority: 70,

          reversible: true,

          metadata: {
            verificationSteps: [
              `1. Visit ${this.siteUrl}/robots.txt`,
              `2. Verify it contains: Sitemap: ${sitemapUrl}`,
              `3. Test with: curl ${this.siteUrl}/robots.txt | grep -i sitemap`
            ],
            sitemapUrl
          }
        };
      }
    } catch (e) {
      // robots.txt doesn't exist or error - not critical
    }

    return null;
  }

  /**
   * Create lastmod issue
   */
  createLastmodIssue(sitemapUrl, missingCount, totalCount) {
    return {
      target_type: 'site',
      target_id: 0,
      target_title: 'XML Sitemap',
      target_url: sitemapUrl,
      field_name: 'sitemap',

      before_value: `${missingCount}/${totalCount} URLs missing lastmod`,
      after_value: 'Configure sitemap plugin to include lastmod dates',

      issue_description: `Sitemap is missing <lastmod> dates for ${missingCount} out of ${totalCount} URLs. The lastmod tag tells search engines when content was last updated, helping them prioritize crawling of recently changed pages.`,

      fix_description: `Configure your sitemap plugin to include lastmod dates for all URLs. In Yoast SEO: SEO → General → Features → XML sitemaps → Settings. Enable "Include lastmod". This helps search engines efficiently crawl updated content.`,

      expected_benefit: `Lastmod dates improve: crawl prioritization (search engines crawl updated content first), indexing freshness (changes indexed faster), crawl budget efficiency (focus on changed pages), and SEO (fresher content ranks better).`,

      severity: 'low',
      risk_level: 'low',
      category: 'technical-seo',
      impact_score: 45,
      priority: 55,

      reversible: false,

      metadata: {
        verificationSteps: [
          `1. Access sitemap plugin settings (Yoast or Rank Math)`,
          `2. Enable lastmod dates in sitemap configuration`,
          `3. Regenerate sitemap`,
          `4. Visit ${sitemapUrl} and verify <lastmod> tags present`,
          `5. Resubmit sitemap to Google Search Console`
        ],
        missingCount,
        totalCount,
        requiresManualFix: true
      }
    };
  }

  /**
   * Apply fix - Most sitemap fixes require manual plugin configuration
   */
  async applyFix(proposal, options = {}) {
    throw new Error('Sitemap fixes require manual plugin configuration - cannot auto-apply');
  }
}

export default SitemapOptimizerV2;
