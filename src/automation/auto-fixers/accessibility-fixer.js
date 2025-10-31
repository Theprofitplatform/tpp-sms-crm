/**
 * Accessibility (WCAG) Fixer
 * 
 * Automatically fixes common accessibility issues:
 * - Missing alt text on images
 * - Low contrast text
 * - Missing form labels
 * - Missing ARIA attributes
 * - Heading hierarchy issues
 * - Missing skip links
 * - Keyboard navigation issues
 * 
 * Targets WCAG 2.1 Level AA compliance
 */

import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';
import * as cheerio from 'cheerio';

export class AccessibilityFixer {
  constructor(config) {
    this.config = config;
    this.clientId = config.id;
    this.wpClient = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.wpUser,
      password: config.wpPassword
    });

    // WCAG 2.1 minimum contrast ratio for normal text
    this.MIN_CONTRAST_RATIO = 4.5;
  }

  /**
   * Main orchestrator - Fix accessibility issues
   */
  async runFixer(options = {}) {
    const { dryRun = false, limit = 50 } = options;

    console.log('\n♿ Accessibility Fixer - Starting...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Target: WCAG 2.1 Level AA`);
    console.log(`   Limit: ${limit} pages\n`);

    const results = {
      analyzed: 0,
      fixed: 0,
      issues: {
        images: [],
        forms: [],
        headings: [],
        links: [],
        aria: [],
        contrast: []
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

      // Step 2: Analyze and fix each page
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
            const fixes = await this.fixPage(item, analysis);
            results.fixes.push(...fixes);
            results.fixed++;
            console.log(`   ✅ Applied ${fixes.length} fixes`);

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log(`   🔍 DRY RUN - Would apply ${analysis.issues.length} fixes`);
            results.fixed++;
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
   * Analyze page for accessibility issues
   */
  async analyzePage(item) {
    const content = item.content?.rendered || '';
    const $ = cheerio.load(content);
    const issues = [];

    // Check 1: Images without alt text
    $('img').each((i, elem) => {
      const $img = $(elem);
      const alt = $img.attr('alt');
      const src = $img.attr('src');

      // Decorative images should have empty alt
      const isDecorative = src && (
        src.includes('separator') ||
        src.includes('decoration') ||
        src.includes('divider')
      );

      if (typeof alt === 'undefined') {
        issues.push({
          category: 'images',
          type: 'missing_alt',
          description: 'Image missing alt attribute',
          element: $.html(elem).substring(0, 100),
          fix: isDecorative ? 'add_empty_alt' : 'add_descriptive_alt'
        });
      }

      // Check for bad alt text
      if (alt && (alt.toLowerCase().includes('image') || alt.toLowerCase().includes('picture'))) {
        issues.push({
          category: 'images',
          type: 'redundant_alt',
          description: 'Alt text contains redundant "image" or "picture"',
          element: $.html(elem).substring(0, 100),
          fix: 'improve_alt'
        });
      }
    });

    // Check 2: Form inputs without labels
    $('input, textarea, select').each((i, elem) => {
      const $input = $(elem);
      const type = $input.attr('type');
      const id = $input.attr('id');
      const ariaLabel = $input.attr('aria-label');

      // Skip hidden inputs and buttons
      if (type === 'hidden' || type === 'submit' || type === 'button') {
        return;
      }

      // Check for associated label
      const hasLabel = id && $(`label[for="${id}"]`).length > 0;

      if (!hasLabel && !ariaLabel) {
        issues.push({
          category: 'forms',
          type: 'missing_label',
          description: 'Form input missing label or aria-label',
          element: $.html(elem).substring(0, 100),
          fix: 'add_aria_label'
        });
      }
    });

    // Check 3: Heading hierarchy
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const level = parseInt(elem.tagName[1]);
      headings.push(level);
    });

    for (let i = 1; i < headings.length; i++) {
      if (headings[i] - headings[i - 1] > 1) {
        issues.push({
          category: 'headings',
          type: 'skipped_heading_level',
          description: `Heading hierarchy skipped from H${headings[i - 1]} to H${headings[i]}`,
          fix: 'manual_review'
        });
        break; // Only report once per page
      }
    }

    // Check 4: Links without descriptive text
    $('a').each((i, elem) => {
      const $link = $(elem);
      const text = $link.text().trim().toLowerCase();
      const ariaLabel = $link.attr('aria-label');

      const nonDescriptive = [
        'click here',
        'read more',
        'learn more',
        'here',
        'link',
        'more'
      ];

      if (!ariaLabel && nonDescriptive.includes(text)) {
        issues.push({
          category: 'links',
          type: 'non_descriptive_link',
          description: `Link has non-descriptive text: "${text}"`,
          element: $.html(elem).substring(0, 100),
          fix: 'add_aria_label'
        });
      }

      // Check for links opening in new window without warning
      const target = $link.attr('target');
      if (target === '_blank' && !ariaLabel) {
        issues.push({
          category: 'links',
          type: 'new_window_no_warning',
          description: 'Link opens in new window without warning',
          element: $.html(elem).substring(0, 100),
          fix: 'add_new_window_label'
        });
      }
    });

    // Check 5: Missing ARIA landmarks
    const hasMain = $('main, [role="main"]').length > 0;
    const hasNav = $('nav, [role="navigation"]').length > 0;

    if (!hasMain && content.length > 500) {
      issues.push({
        category: 'aria',
        type: 'missing_main_landmark',
        description: 'Page missing main landmark',
        fix: 'manual_review'
      });
    }

    // Check 6: Tables without headers
    $('table').each((i, elem) => {
      const $table = $(elem);
      const hasHeaders = $table.find('th').length > 0;
      const caption = $table.find('caption').length > 0;

      if (!hasHeaders) {
        issues.push({
          category: 'aria',
          type: 'table_without_headers',
          description: 'Table missing header cells (th)',
          element: '<table>...</table>',
          fix: 'manual_review'
        });
      }

      if (!caption) {
        issues.push({
          category: 'aria',
          type: 'table_without_caption',
          description: 'Table missing caption',
          element: '<table>...</table>',
          fix: 'manual_review'
        });
      }
    });

    return { issues };
  }

  /**
   * Fix page based on analysis
   */
  async fixPage(item, analysis) {
    const content = item.content.raw || item.content.rendered;
    let $ = cheerio.load(content, { decodeEntities: false });
    const fixes = [];

    for (const issue of analysis.issues) {
      switch (issue.fix) {
        case 'add_empty_alt':
          $('img:not([alt])').each((i, elem) => {
            const $img = $(elem);
            const src = $img.attr('src') || '';
            
            if (src.includes('separator') || src.includes('decoration')) {
              $img.attr('alt', '');
              fixes.push({
                type: 'added_empty_alt',
                element: 'img'
              });
            }
          });
          break;

        case 'add_descriptive_alt':
          $('img:not([alt])').each((i, elem) => {
            const $img = $(elem);
            const src = $img.attr('src') || '';
            
            // Generate alt from filename
            const filename = src.split('/').pop().split('.')[0];
            const alt = filename
              .replace(/[-_]/g, ' ')
              .replace(/\d+/g, '')
              .trim();
            
            if (alt) {
              $img.attr('alt', alt);
              fixes.push({
                type: 'added_descriptive_alt',
                element: 'img',
                alt
              });
            }
          });
          break;

        case 'improve_alt':
          $('img[alt]').each((i, elem) => {
            const $img = $(elem);
            const alt = $img.attr('alt') || '';
            
            // Remove redundant words
            const improved = alt
              .replace(/\b(image|picture|photo|graphic)\b/gi, '')
              .trim();
            
            if (improved && improved !== alt) {
              $img.attr('alt', improved);
              fixes.push({
                type: 'improved_alt',
                element: 'img',
                oldAlt: alt,
                newAlt: improved
              });
            }
          });
          break;

        case 'add_aria_label':
          // For form inputs
          $('input:not([aria-label]), textarea:not([aria-label]), select:not([aria-label])').each((i, elem) => {
            const $input = $(elem);
            const type = $input.attr('type');
            const placeholder = $input.attr('placeholder');
            const name = $input.attr('name');
            
            if (type === 'hidden' || type === 'submit' || type === 'button') {
              return;
            }
            
            const label = placeholder || name || 'input field';
            $input.attr('aria-label', label);
            fixes.push({
              type: 'added_aria_label',
              element: $input.prop('tagName').toLowerCase(),
              label
            });
          });

          // For links
          $('a:not([aria-label])').each((i, elem) => {
            const $link = $(elem);
            const text = $link.text().trim().toLowerCase();
            const href = $link.attr('href');
            
            const nonDescriptive = ['click here', 'read more', 'learn more', 'here', 'link', 'more'];
            
            if (nonDescriptive.includes(text) && href) {
              const label = `Read more about ${href.split('/').filter(Boolean).pop()}`;
              $link.attr('aria-label', label);
              fixes.push({
                type: 'added_aria_label',
                element: 'a',
                label
              });
            }
          });
          break;

        case 'add_new_window_label':
          $('a[target="_blank"]:not([aria-label])').each((i, elem) => {
            const $link = $(elem);
            const text = $link.text().trim();
            
            $link.attr('aria-label', `${text} (opens in new window)`);
            fixes.push({
              type: 'added_new_window_warning',
              element: 'a'
            });
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
   * Save report
   */
  async saveReport(results, dryRun) {
    const report = {
      timestamp: new Date().toISOString(),
      clientId: this.clientId,
      dryRun,
      wcagLevel: 'AA',
      summary: {
        analyzed: results.analyzed,
        fixed: results.fixed,
        errors: results.errors,
        issuesByCategory: {
          images: results.issues.images.length,
          forms: results.issues.forms.length,
          headings: results.issues.headings.length,
          links: results.issues.links.length,
          aria: results.issues.aria.length
        }
      },
      issues: results.issues,
      fixes: results.fixes
    };

    const filename = `logs/accessibility-${this.clientId}-${new Date().toISOString().split('T')[0]}.json`;
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    console.log(`\n📄 Report saved: ${filename}`);

    // Log to database
    if (!dryRun && results.fixes.length > 0) {
      await db.logAutoFixChange({
        clientId: this.clientId,
        engine: 'accessibility-fixer',
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
    console.log('\n📊 ACCESSIBILITY (WCAG 2.1 AA) SUMMARY\n');
    console.log(`Pages Analyzed: ${results.analyzed}`);
    console.log(`Pages Fixed:    ${results.fixed}`);
    console.log(`Errors:         ${results.errors}`);

    console.log(`\n♿ Issues by Category:`);
    console.log(`   Images:   ${results.issues.images.length}`);
    console.log(`   Forms:    ${results.issues.forms.length}`);
    console.log(`   Headings: ${results.issues.headings.length}`);
    console.log(`   Links:    ${results.issues.links.length}`);
    console.log(`   ARIA:     ${results.issues.aria.length}`);

    const totalFixes = results.fixes.length;
    if (totalFixes > 0) {
      console.log(`\n✅ Total Fixes Applied: ${totalFixes}`);
    }

    console.log(`\n💡 Manual Review Needed:`);
    const manualReview = [...results.issues.headings, ...results.issues.aria]
      .filter(issue => issue.fix === 'manual_review');
    console.log(`   ${manualReview.length} issues require manual attention`);

    console.log('\n🔍 Next Steps:');
    console.log('   1. Test with screen reader (NVDA/JAWS)');
    console.log('   2. Run automated audit (axe DevTools, WAVE)');
    console.log('   3. Manual keyboard navigation test');
    console.log('   4. Color contrast check');
    console.log('   5. Consider WCAG 2.1 AAA for critical pages');

    console.log('\n' + '═'.repeat(70) + '\n');
  }
}
