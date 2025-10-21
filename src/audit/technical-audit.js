import axios from 'axios';
import { config } from '../../config/env/config.js';
import { logger } from './logger.js';
import { wpClient } from './fetch-posts.js';

/**
 * Technical SEO Auditor
 */
export class TechnicalAuditor {
  constructor() {
    this.baseUrl = config.wordpress.url.replace(/\/$/, '');
  }

  /**
   * Run full technical audit
   */
  async runAudit() {
    logger.section('Starting Technical SEO Audit');

    const results = {
      timestamp: new Date().toISOString(),
      siteUrl: this.baseUrl,
      issues: [],
      recommendations: [],
      metrics: {}
    };

    // Run all technical checks
    await this.checkCoreWebVitals(results);
    await this.checkRobotsTxt(results);
    await this.checkSitemap(results);
    await this.checkHTTPS(results);
    await this.checkSchema(results);

    return results;
  }

  /**
   * Check Core Web Vitals using PageSpeed API
   */
  async checkCoreWebVitals(results) {
    if (!config.google.pagespeedApiKey) {
      logger.warn('PageSpeed API key not configured, skipping Core Web Vitals check');
      return;
    }

    try {
      logger.info('Checking Core Web Vitals...');

      const strategies = ['mobile', 'desktop'];

      for (const strategy of strategies) {
        const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
          params: {
            url: this.baseUrl,
            key: config.google.pagespeedApiKey,
            strategy,
            category: ['performance', 'accessibility', 'best-practices', 'seo']
          },
          timeout: 60000
        });

        const { lighthouseResult } = response.data;
        const { categories, audits } = lighthouseResult;

        // Extract Core Web Vitals
        const metrics = {
          strategy,
          scores: {
            performance: categories.performance.score * 100,
            accessibility: categories.accessibility.score * 100,
            bestPractices: categories['best-practices'].score * 100,
            seo: categories.seo.score * 100
          },
          coreWebVitals: {
            lcp: audits['largest-contentful-paint']?.numericValue,
            fid: audits['max-potential-fid']?.numericValue,
            cls: audits['cumulative-layout-shift']?.numericValue,
            fcp: audits['first-contentful-paint']?.numericValue,
            ttfb: audits['server-response-time']?.numericValue
          },
          opportunities: []
        };

        // Collect optimization opportunities
        Object.entries(audits).forEach(([key, audit]) => {
          if (audit.details?.overallSavingsMs > 1000) {
            metrics.opportunities.push({
              title: audit.title,
              savings: `${(audit.details.overallSavingsMs / 1000).toFixed(2)}s`,
              description: audit.description
            });
          }
        });

        results.metrics[strategy] = metrics;

        // Flag issues
        if (metrics.scores.performance < 50) {
          results.issues.push({
            type: 'performance',
            severity: 'critical',
            message: `Poor ${strategy} performance score: ${metrics.scores.performance}/100`,
            fix: 'Optimize images, reduce JavaScript, enable caching'
          });
        }

        // Check Core Web Vitals thresholds
        if (metrics.coreWebVitals.lcp > 2500) {
          results.issues.push({
            type: 'performance',
            severity: 'high',
            message: `LCP too slow on ${strategy}: ${(metrics.coreWebVitals.lcp / 1000).toFixed(2)}s`,
            fix: 'Target LCP under 2.5s - optimize largest content element'
          });
        }

        if (metrics.coreWebVitals.cls > 0.1) {
          results.issues.push({
            type: 'performance',
            severity: 'high',
            message: `High CLS on ${strategy}: ${metrics.coreWebVitals.cls.toFixed(3)}`,
            fix: 'Target CLS under 0.1 - add size attributes to images/videos'
          });
        }

        logger.info(`${strategy} Performance: ${metrics.scores.performance}/100`);
      }

      logger.success('Core Web Vitals check completed');
    } catch (error) {
      logger.error('Failed to check Core Web Vitals', error.message);
      results.issues.push({
        type: 'technical',
        severity: 'low',
        message: 'Could not fetch Core Web Vitals',
        fix: 'Verify PageSpeed API key and connectivity'
      });
    }
  }

  /**
   * Check robots.txt
   */
  async checkRobotsTxt(results) {
    try {
      logger.info('Checking robots.txt...');

      const response = await axios.get(`${this.baseUrl}/robots.txt`, {
        timeout: 10000,
        validateStatus: /* istanbul ignore next */ status => status < 500
      });

      if (response.status === 404) {
        results.issues.push({
          type: 'technical',
          severity: 'medium',
          message: 'robots.txt not found',
          fix: 'Create a robots.txt file'
        });
      } else if (response.status === 200) {
        const content = response.data;

        // Check if it disallows all
        if (content.includes('Disallow: /')) {
          results.issues.push({
            type: 'technical',
            severity: 'critical',
            message: 'robots.txt is blocking all crawlers',
            fix: 'Review robots.txt configuration'
          });
        }

        // Check for sitemap reference
        if (!content.includes('Sitemap:')) {
          results.recommendations.push({
            type: 'technical',
            message: 'Add sitemap reference to robots.txt'
          });
        }

        logger.success('robots.txt found and accessible');
      }
    } catch (error) {
      logger.warn('Could not fetch robots.txt', error.message);
    }
  }

  /**
   * Check XML sitemap
   */
  async checkSitemap(results) {
    try {
      logger.info('Checking sitemap...');

      const sitemapUrls = [
        `${this.baseUrl}/sitemap.xml`,
        `${this.baseUrl}/sitemap_index.xml`,
        `${this.baseUrl}/wp-sitemap.xml`
      ];

      let sitemapFound = false;

      for (const url of sitemapUrls) {
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            validateStatus: /* istanbul ignore next */ status => status < 500
          });

          if (response.status === 200 && response.data.includes('<?xml')) {
            logger.success(`Sitemap found: ${url}`);
            sitemapFound = true;
            break;
          }
        } catch (err) {
          // Try next URL
        }
      }

      if (!sitemapFound) {
        results.issues.push({
          type: 'technical',
          severity: 'high',
          message: 'XML sitemap not found',
          fix: 'Install and configure an SEO plugin (Yoast/Rank Math) to generate sitemap'
        });
      }
    } catch (error) {
      /* istanbul ignore next */
      logger.warn('Could not check sitemap', error.message);
    }
  }

  /**
   * Check HTTPS
   */
  async checkHTTPS(results) {
    logger.info('Checking HTTPS...');

    if (!this.baseUrl.startsWith('https://')) {
      results.issues.push({
        type: 'security',
        severity: 'critical',
        message: 'Site not using HTTPS',
        fix: 'Install SSL certificate and force HTTPS'
      });
    } else {
      logger.success('HTTPS enabled');
    }
  }

  /**
   * Check structured data (Schema.org)
   */
  async checkSchema(results) {
    try {
      logger.info('Checking structured data...');

      const response = await axios.get(this.baseUrl, {
        timeout: 10000
      });

      const html = response.data;

      // Check for JSON-LD
      const hasJsonLd = html.includes('application/ld+json');

      // Check for common schema types
      const hasOrganization = html.includes('"@type":"Organization"') ||
                              html.includes('"@type": "Organization"');
      const hasWebsite = html.includes('"@type":"WebSite"') ||
                         html.includes('"@type": "WebSite"');

      if (!hasJsonLd) {
        results.issues.push({
          type: 'schema',
          severity: 'medium',
          message: 'No structured data found',
          fix: 'Add Schema.org JSON-LD markup'
        });
      } else {
        logger.success('Structured data detected');

        if (!hasOrganization) {
          results.recommendations.push({
            type: 'schema',
            message: 'Consider adding Organization schema'
          });
        }

        if (!hasWebsite) {
          results.recommendations.push({
            type: 'schema',
            message: 'Consider adding WebSite schema with search action'
          });
        }
      }
    } catch (error) {
      logger.warn('Could not check structured data', error.message);
    }
  }

  /**
   * Audit individual post for technical issues
   */
  async auditPost(post) {
    const results = {
      postId: post.id,
      url: post.link,
      issues: [],
      recommendations: []
    };

    // Check canonical URL
    if (post.link) {
      results.recommendations.push({
        type: 'technical',
        message: 'Ensure canonical tag points to: ' + post.link
      });
    }

    // Check if post has featured image
    if (!post.featured_media || post.featured_media === 0) {
      results.issues.push({
        type: 'technical',
        severity: 'medium',
        message: 'No featured image',
        fix: 'Add featured image for social sharing'
      });
    }

    return results;
  }
}

/**
 * Run technical audit
 */
export async function runTechnicalAudit() {
  const auditor = new TechnicalAuditor();
  return await auditor.runAudit();
}
