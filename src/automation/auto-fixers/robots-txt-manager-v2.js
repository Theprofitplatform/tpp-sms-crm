/**
 * Robots.txt Manager v2
 *
 * Manages and optimizes robots.txt file
 *
 * Features:
 * - Verifies robots.txt exists
 * - Checks for common issues
 * - Validates syntax
 * - Suggests best practices
 * - Prevents accidental blocking
 * - Manual review workflow
 *
 * @extends AutoFixEngineBase
 */

import { AutoFixEngineBase } from './engine-base.js';
import axios from 'axios';

export class RobotsTxtManagerV2 extends AutoFixEngineBase {
  constructor(config) {
    super(config);

    this.siteUrl = config.siteUrl;
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'technical-seo';
  }

  /**
   * Detect issues: Check robots.txt configuration
   */
  async detectIssues(options = {}) {
    const issues = [];

    try {
      console.log('   🤖 Checking robots.txt...');

      const robotsUrl = `${this.siteUrl}/robots.txt`;
      let robotsTxt = '';

      try {
        const response = await axios.get(robotsUrl, { timeout: 5000 });
        robotsTxt = response.data;
        console.log(`   ✅ Found robots.txt (${robotsTxt.length} characters)`);
      } catch (error) {
        if (error.response?.status === 404) {
          issues.push(this.createMissingRobotsIssue());
          return issues;
        }
        throw error;
      }

      // Parse robots.txt
      const lines = robotsTxt.split('\n').map(l => l.trim());

      // Check 1: Blocking all robots
      if (this.isBlockingAllRobots(lines)) {
        issues.push(this.createBlockingAllRobotsIssue(robotsTxt));
      }

      // Check 2: Missing sitemap reference
      if (!this.hasSitemapReference(lines)) {
        issues.push(this.createMissingSitemapRefIssue(robotsTxt));
      }

      // Check 3: Blocking important resources
      const blockedResources = this.findBlockedResources(lines);
      if (blockedResources.length > 0) {
        issues.push(this.createBlockedResourcesIssue(robotsTxt, blockedResources));
      }

      // Check 4: Syntax errors
      const syntaxErrors = this.findSyntaxErrors(lines);
      if (syntaxErrors.length > 0) {
        issues.push(this.createSyntaxErrorIssue(robotsTxt, syntaxErrors));
      }

      if (issues.length === 0) {
        console.log(`   ✅ robots.txt looks good!`);
      }

    } catch (error) {
      console.error(`   ❌ Detection error: ${error.message}`);
    }

    return issues;
  }

  /**
   * Check if blocking all robots
   */
  isBlockingAllRobots(lines) {
    let userAgentAll = false;
    let disallowAll = false;

    for (const line of lines) {
      if (line.toLowerCase() === 'user-agent: *') {
        userAgentAll = true;
      }
      if (userAgentAll && line.toLowerCase() === 'disallow: /') {
        disallowAll = true;
        break;
      }
      // Reset if we hit another user-agent
      if (line.toLowerCase().startsWith('user-agent:') && !line.toLowerCase().includes('*')) {
        userAgentAll = false;
      }
    }

    return disallowAll;
  }

  /**
   * Check for sitemap reference
   */
  hasSitemapReference(lines) {
    return lines.some(line => line.toLowerCase().startsWith('sitemap:'));
  }

  /**
   * Find blocked important resources
   */
  findBlockedResources(lines) {
    const blocked = [];
    const importantPaths = ['/wp-content/', '/wp-includes/', '/*.css', '/*.js'];

    for (const line of lines) {
      if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.substring(9).trim();
        for (const important of importantPaths) {
          if (path === important || path.includes(important.replace('*', ''))) {
            blocked.push(path);
          }
        }
      }
    }

    return blocked;
  }

  /**
   * Find syntax errors
   */
  findSyntaxErrors(lines) {
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('#')) continue;

      // Check valid directives
      const validDirectives = ['user-agent:', 'disallow:', 'allow:', 'sitemap:', 'crawl-delay:'];
      const lower = line.toLowerCase();

      if (!validDirectives.some(d => lower.startsWith(d))) {
        errors.push(`Line ${i + 1}: Invalid directive "${line}"`);
      }
    }

    return errors;
  }

  /**
   * Create missing robots.txt issue
   */
  createMissingRobotsIssue() {
    return {
      target_type: 'site',
      target_id: 0,
      target_title: 'Site Configuration',
      target_url: this.siteUrl,
      field_name: 'robots_txt',

      before_value: 'No robots.txt file',
      after_value: 'Create robots.txt with basic configuration',

      issue_description: `robots.txt file not found at ${this.siteUrl}/robots.txt. While not strictly required, robots.txt is a best practice for controlling search engine crawling. Without it, you cannot specify crawl rules or reference your sitemap.`,

      fix_description: `Create a basic robots.txt file with:
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Sitemap: ${this.siteUrl}/sitemap.xml

This allows all crawlers, blocks WordPress admin area, and references your sitemap.`,

      expected_benefit: `robots.txt provides control over: what search engines can crawl, crawl budget optimization, sitemap location reference, and preventing indexing of sensitive areas. Best practice for all websites.`,

      severity: 'medium',
      risk_level: 'low',
      category: 'technical-seo',
      impact_score: 65,
      priority: 70,

      reversible: false,

      metadata: {
        verificationSteps: [
          `1. Create file at: ${this.siteUrl}/robots.txt`,
          `2. Add recommended directives (see fix description)`,
          `3. Visit ${this.siteUrl}/robots.txt to verify`,
          `4. Test with Google's robots.txt Tester in Search Console`,
          `5. Ensure you're not accidentally blocking important pages`
        ],
        requiresManualFix: true
      }
    };
  }

  /**
   * Create blocking all robots issue
   */
  createBlockingAllRobotsIssue(currentContent) {
    return {
      target_type: 'site',
      target_id: 0,
      target_title: 'robots.txt',
      target_url: `${this.siteUrl}/robots.txt`,
      field_name: 'robots_txt',

      before_value: currentContent,
      after_value: 'Remove "Disallow: /" or change to specific paths',

      issue_description: `🚨 CRITICAL: robots.txt is blocking ALL search engine crawlers with "User-agent: * / Disallow: /". This prevents Google and other search engines from indexing your entire site. Your site will not appear in search results!`,

      fix_description: `URGENT: Remove or modify the "Disallow: /" directive. This is likely left over from development/staging. Change to:
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Sitemap: ${this.siteUrl}/sitemap.xml

This allows search engines to index your site while still blocking admin areas.`,

      expected_benefit: `Fixing this allows your site to be indexed by search engines, appear in search results, receive organic traffic, and be discoverable by users. This is CRITICAL for SEO - your site is currently invisible to search engines!`,

      severity: 'critical',
      risk_level: 'high',
      category: 'technical-seo',
      impact_score: 100,
      priority: 100,

      reversible: true,

      metadata: {
        verificationSteps: [
          `1. IMMEDIATELY edit robots.txt`,
          `2. Remove "Disallow: /" line`,
          `3. Add specific disallow rules for admin areas only`,
          `4. Verify at ${this.siteUrl}/robots.txt`,
          `5. Request re-indexing in Google Search Console`
        ],
        criticalIssue: true
      }
    };
  }

  /**
   * Create missing sitemap reference issue
   */
  createMissingSitemapRefIssue(currentContent) {
    return {
      target_type: 'site',
      target_id: 0,
      target_title: 'robots.txt',
      target_url: `${this.siteUrl}/robots.txt`,
      field_name: 'robots_txt',

      before_value: currentContent,
      after_value: `${currentContent}\n\nSitemap: ${this.siteUrl}/sitemap.xml`,

      issue_description: `robots.txt does not reference sitemap location. Adding sitemap reference helps search engines quickly locate your XML sitemap for efficient crawling.`,

      fix_description: `Add to robots.txt: "Sitemap: ${this.siteUrl}/sitemap.xml". This tells search engines where to find your sitemap, improving discoverability.`,

      expected_benefit: `Sitemap reference improves content discovery, crawl efficiency, and ensures search engines can find your sitemap even without manual submission.`,

      severity: 'low',
      risk_level: 'low',
      category: 'technical-seo',
      impact_score: 50,
      priority: 60,

      reversible: true,

      metadata: {
        verificationSteps: [
          `1. Edit robots.txt`,
          `2. Add: Sitemap: ${this.siteUrl}/sitemap.xml`,
          `3. Verify at ${this.siteUrl}/robots.txt`,
          `4. Test with: curl ${this.siteUrl}/robots.txt | grep Sitemap`
        ]
      }
    };
  }

  /**
   * Create blocked resources issue
   */
  createBlockedResourcesIssue(currentContent, blockedResources) {
    return {
      target_type: 'site',
      target_id: 0,
      target_title: 'robots.txt',
      target_url: `${this.siteUrl}/robots.txt`,
      field_name: 'robots_txt',

      before_value: currentContent,
      after_value: `Remove: ${blockedResources.join(', ')}`,

      issue_description: `robots.txt is blocking important resources: ${blockedResources.join(', ')}. Blocking CSS and JS files prevents Google from rendering pages correctly, which can hurt SEO. Google needs to see your site as users do.`,

      fix_description: `Remove or modify disallow rules for: ${blockedResources.join(', ')}. Google recommends allowing crawlers to access CSS, JavaScript, and images for proper page rendering and indexing.`,

      expected_benefit: `Allowing CSS/JS crawling enables Google to: render pages correctly, evaluate mobile-friendliness, assess user experience, improve ranking signals, and index content accurately.`,

      severity: 'high',
      risk_level: 'medium',
      category: 'technical-seo',
      impact_score: 80,
      priority: 85,

      reversible: true,

      metadata: {
        verificationSteps: [
          `1. Edit robots.txt`,
          `2. Remove disallow rules for CSS/JS: ${blockedResources.join(', ')}`,
          `3. Test with Google's robots.txt Tester`,
          `4. Verify Googlebot can access resources`,
          `5. Check "URL Inspection" in Search Console`
        ],
        blockedResources
      }
    };
  }

  /**
   * Create syntax error issue
   */
  createSyntaxErrorIssue(currentContent, errors) {
    return {
      target_type: 'site',
      target_id: 0,
      target_title: 'robots.txt',
      target_url: `${this.siteUrl}/robots.txt`,
      field_name: 'robots_txt',

      before_value: currentContent,
      after_value: `Fix syntax errors: ${errors.join('; ')}`,

      issue_description: `robots.txt contains syntax errors: ${errors.join('; ')}. Invalid directives are ignored by search engines, potentially causing unexpected crawling behavior.`,

      fix_description: `Correct syntax errors in robots.txt. Valid directives: User-agent, Disallow, Allow, Sitemap, Crawl-delay. Remove or fix invalid lines.`,

      expected_benefit: `Fixing syntax ensures robots.txt works as intended, prevents unexpected crawler behavior, and maintains proper crawl control.`,

      severity: 'medium',
      risk_level: 'low',
      category: 'technical-seo',
      impact_score: 60,
      priority: 70,

      reversible: true,

      metadata: {
        verificationSteps: [
          `1. Edit robots.txt`,
          `2. Fix errors: ${errors.slice(0, 3).join('; ')}`,
          `3. Validate with Google's robots.txt Tester`,
          `4. Ensure all directives are valid`
        ],
        errors
      }
    };
  }

  /**
   * Apply fix - robots.txt fixes require manual file editing
   */
  async applyFix(proposal, options = {}) {
    throw new Error('robots.txt fixes require manual file editing - cannot auto-apply. Edit via FTP or hosting control panel.');
  }
}

export default RobotsTxtManagerV2;
