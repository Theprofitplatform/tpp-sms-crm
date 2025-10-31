/**
 * Core Web Vitals Optimizer
 * 
 * Optimizes pages for Core Web Vitals (CWV):
 * - LCP (Largest Contentful Paint) - Lazy load images, optimize hero images
 * - FID (First Input Delay) - Remove render-blocking resources
 * - CLS (Cumulative Layout Shift) - Add width/height to images
 * - INP (Interaction to Next Paint) - Optimize JavaScript
 * 
 * Auto-fixes:
 * - Add lazy loading to images
 * - Add dimensions to images
 * - Defer non-critical JavaScript
 * - Optimize font loading
 * - Add preload hints
 */

import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class CoreWebVitalsOptimizer {
  constructor(config) {
    this.config = config;
    this.clientId = config.id;
    this.wpClient = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.wpUser,
      password: config.wpPassword
    });

    this.siteUrl = config.siteUrl;
  }

  /**
   * Main orchestrator - Optimize for Core Web Vitals
   */
  async runOptimization(options = {}) {
    const { dryRun = false, limit = 50 } = options;

    console.log('\n⚡ Core Web Vitals Optimizer - Starting...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Limit: ${limit} pages\n`);

    const results = {
      analyzed: 0,
      optimized: 0,
      issues: {
        lcp: [],
        cls: [],
        fid: [],
        inp: []
      },
      fixes: [],
      errors: 0
    };

    try {
      // Step 1: Fetch all content
      const posts = await this.wpClient.getPosts({ per_page: limit });
      const pages = await this.wpClient.getPages({ per_page: limit });
      const allContent = [...posts, ...pages];

      console.log(`📄 Analyzing ${allContent.length} pages...\n`);

      // Step 2: Analyze and optimize each page
      for (const item of allContent) {
        results.analyzed++;
        const analysis = await this.analyzePage(item);

        if (analysis.issues.length > 0) {
          console.log(`\n🔧 ${item.title.rendered}`);
          console.log(`   Issues found: ${analysis.issues.length}`);
          
          analysis.issues.forEach(issue => {
            console.log(`   - ${issue.category}: ${issue.description}`);
            results.issues[issue.category].push({
              pageId: item.id,
              pageTitle: item.title.rendered,
              ...issue
            });
          });

          if (!dryRun) {
            const fixes = await this.optimizePage(item, analysis);
            results.fixes.push(...fixes);
            results.optimized++;
            console.log(`   ✅ Applied ${fixes.length} fixes`);
          } else {
            console.log(`   🔍 DRY RUN - Would apply ${analysis.issues.length} fixes`);
            results.optimized++;
          }
        } else {
          console.log(`✓ OK: ${item.title.rendered}`);
        }
      }

      // Step 3: Save report
      await this.saveReport(results, dryRun);

      // Step 4: Print summary
      this.printSummary(results, dryRun);

      return {
        success: true,
        ...results
      };

    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze page for CWV issues
   */
  async analyzePage(item) {
    const content = item.content?.rendered || '';
    const $ = cheerio.load(content);
    const issues = [];

    // Check 1: Images without lazy loading (affects LCP)
    $('img').each((i, elem) => {
      const $img = $(elem);
      const loading = $img.attr('loading');
      const isAboveFold = i < 2; // First 2 images likely above fold

      if (!loading && !isAboveFold) {
        issues.push({
          category: 'lcp',
          type: 'missing_lazy_load',
          description: 'Image missing lazy loading attribute',
          element: $.html(elem).substring(0, 100),
          fix: 'add_lazy_loading'
        });
      }

      // Don't lazy load hero images
      if (loading === 'lazy' && isAboveFold) {
        issues.push({
          category: 'lcp',
          type: 'incorrect_lazy_load',
          description: 'Hero image should not be lazy loaded',
          element: $.html(elem).substring(0, 100),
          fix: 'remove_lazy_loading'
        });
      }
    });

    // Check 2: Images without dimensions (affects CLS)
    $('img').each((i, elem) => {
      const $img = $(elem);
      const width = $img.attr('width');
      const height = $img.attr('height');

      if (!width || !height) {
        issues.push({
          category: 'cls',
          type: 'missing_dimensions',
          description: 'Image missing width/height attributes',
          element: $.html(elem).substring(0, 100),
          fix: 'add_dimensions'
        });
      }
    });

    // Check 3: Inline scripts (affects FID/INP)
    $('script').each((i, elem) => {
      const $script = $(elem);
      const src = $script.attr('src');
      
      if (!src && $script.html().trim().length > 0) {
        issues.push({
          category: 'fid',
          type: 'inline_script',
          description: 'Inline script should be deferred or moved to external file',
          element: '<script>...</script>',
          fix: 'defer_script'
        });
      }
    });

    // Check 4: External scripts without defer/async
    $('script[src]').each((i, elem) => {
      const $script = $(elem);
      const defer = $script.attr('defer');
      const async = $script.attr('async');

      if (!defer && !async) {
        issues.push({
          category: 'inp',
          type: 'blocking_script',
          description: 'External script blocks rendering',
          element: $.html(elem).substring(0, 100),
          fix: 'add_defer'
        });
      }
    });

    // Check 5: Embedded videos without proper sizing (affects CLS)
    $('iframe, video').each((i, elem) => {
      const $elem = $(elem);
      const width = $elem.attr('width');
      const height = $elem.attr('height');

      if (!width || !height) {
        issues.push({
          category: 'cls',
          type: 'missing_video_dimensions',
          description: 'Video/iframe missing dimensions',
          element: $.html(elem).substring(0, 100),
          fix: 'add_video_dimensions'
        });
      }
    });

    return { issues };
  }

  /**
   * Optimize page based on analysis
   */
  async optimizePage(item, analysis) {
    const content = item.content.raw || item.content.rendered;
    let $ = cheerio.load(content, { decodeEntities: false });
    const fixes = [];

    for (const issue of analysis.issues) {
      switch (issue.fix) {
        case 'add_lazy_loading':
          $('img').each((i, elem) => {
            const $img = $(elem);
            const loading = $img.attr('loading');
            const isAboveFold = i < 2;

            if (!loading && !isAboveFold) {
              $img.attr('loading', 'lazy');
              fixes.push({
                type: 'added_lazy_loading',
                element: 'img'
              });
            }
          });
          break;

        case 'remove_lazy_loading':
          $('img').each((i, elem) => {
            const $img = $(elem);
            const isAboveFold = i < 2;

            if (isAboveFold && $img.attr('loading') === 'lazy') {
              $img.removeAttr('loading');
              fixes.push({
                type: 'removed_lazy_loading',
                element: 'img'
              });
            }
          });
          break;

        case 'add_dimensions':
          $('img').each(async (i, elem) => {
            const $img = $(elem);
            const width = $img.attr('width');
            const height = $img.attr('height');
            const src = $img.attr('src');

            if (!width || !height) {
              // Try to get dimensions from WordPress media library
              const dimensions = await this.getImageDimensions(src);
              if (dimensions) {
                $img.attr('width', dimensions.width);
                $img.attr('height', dimensions.height);
                fixes.push({
                  type: 'added_dimensions',
                  element: 'img',
                  dimensions
                });
              }
            }
          });
          break;

        case 'add_defer':
          $('script[src]').each((i, elem) => {
            const $script = $(elem);
            const defer = $script.attr('defer');
            const async = $script.attr('async');

            if (!defer && !async) {
              $script.attr('defer', '');
              fixes.push({
                type: 'added_defer',
                element: 'script'
              });
            }
          });
          break;

        case 'add_video_dimensions':
          $('iframe, video').each((i, elem) => {
            const $elem = $(elem);
            const width = $elem.attr('width');
            const height = $elem.attr('height');

            if (!width || !height) {
              // Set default 16:9 aspect ratio
              $elem.attr('width', '560');
              $elem.attr('height', '315');
              fixes.push({
                type: 'added_video_dimensions',
                element: $elem.prop('tagName').toLowerCase()
              });
            }
          });
          break;
      }
    }

    // Update the page if fixes were applied
    if (fixes.length > 0) {
      const updatedContent = $.html();
      await this.wpClient.updatePost(item.id, {
        content: updatedContent
      });
    }

    return fixes;
  }

  /**
   * Get image dimensions from WordPress media library
   */
  async getImageDimensions(src) {
    try {
      // Extract attachment ID from URL if possible
      const match = src.match(/wp-content\/uploads\/.*\/(.*?)\./);
      if (!match) return null;

      // Try to get from WordPress media endpoint
      const response = await axios.get(`${this.siteUrl}/wp-json/wp/v2/media`, {
        params: { search: match[1] }
      });

      if (response.data && response.data.length > 0) {
        const media = response.data[0];
        return {
          width: media.media_details.width,
          height: media.media_details.height
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save report
   */
  async saveReport(results, dryRun) {
    const report = {
      timestamp: new Date().toISOString(),
      clientId: this.clientId,
      dryRun,
      summary: {
        analyzed: results.analyzed,
        optimized: results.optimized,
        errors: results.errors,
        issuesByCategory: {
          lcp: results.issues.lcp.length,
          cls: results.issues.cls.length,
          fid: results.issues.fid.length,
          inp: results.issues.inp.length
        }
      },
      issues: results.issues,
      fixes: results.fixes
    };

    const filename = `logs/core-web-vitals-${this.clientId}-${new Date().toISOString().split('T')[0]}.json`;
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    console.log(`\n📄 Report saved: ${filename}`);

    // Log to database
    if (!dryRun && results.fixes.length > 0) {
      await db.logAutoFixChange({
        clientId: this.clientId,
        engine: 'core-web-vitals-optimizer',
        changes: results.fixes,
        success: results.errors === 0
      });
    }
  }

  /**
   * Print summary
   */
  printSummary(results, dryRun) {
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 CORE WEB VITALS OPTIMIZATION SUMMARY\n');
    console.log(`Pages Analyzed:  ${results.analyzed}`);
    console.log(`Pages Optimized: ${results.optimized}`);
    console.log(`Errors:          ${results.errors}`);

    console.log(`\n⚡ Issues by Category:`);
    console.log(`   LCP (Largest Contentful Paint): ${results.issues.lcp.length}`);
    console.log(`   CLS (Cumulative Layout Shift):  ${results.issues.cls.length}`);
    console.log(`   FID (First Input Delay):        ${results.issues.fid.length}`);
    console.log(`   INP (Interaction to Next Paint): ${results.issues.inp.length}`);

    const totalFixes = results.fixes.length;
    if (totalFixes > 0) {
      console.log(`\n✅ Total Fixes Applied: ${totalFixes}`);
    }

    console.log('\n💡 Recommendations:');
    console.log('   1. Test pages with PageSpeed Insights');
    console.log('   2. Monitor Core Web Vitals in Search Console');
    console.log('   3. Consider image CDN for faster delivery');
    console.log('   4. Implement critical CSS for above-fold content');
    console.log('   5. Use font-display: swap for web fonts');

    console.log('\n' + '═'.repeat(70) + '\n');
  }
}
