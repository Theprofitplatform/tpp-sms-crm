/**
 * Duplicate Content Detector
 * 
 * Detects and helps fix duplicate content issues:
 * - Identifies identical or near-duplicate pages
 * - Detects thin content
 * - Suggests canonical URLs
 * - Identifies pages to consolidate or noindex
 * - Calculates content similarity scores
 */

import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';
import * as cheerio from 'cheerio';

export class DuplicateContentDetector {
  constructor(config) {
    this.config = config;
    this.clientId = config.id;
    this.wpClient = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.wpUser,
      password: config.wpPassword
    });

    this.MIN_CONTENT_LENGTH = 300; // Words
    this.SIMILARITY_THRESHOLD = 0.85; // 85% similar = duplicate
  }

  /**
   * Main orchestrator - Detect duplicate content
   */
  async runDetection(options = {}) {
    const { dryRun = false, limit = 100 } = options;

    console.log('\n📋 Duplicate Content Detector - Starting...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Limit: ${limit} pages\n`);

    const results = {
      analyzed: 0,
      thinContent: [],
      duplicates: [],
      nearDuplicates: [],
      recommendations: []
    };

    try {
      // Step 1: Fetch all content
      const posts = await this.wpClient.getPosts({ per_page: limit });
      const pages = await this.wpClient.getPages({ per_page: limit });
      const allContent = [...posts, ...pages];

      console.log(`📄 Analyzing ${allContent.length} pages...\n`);

      // Step 2: Extract and analyze content
      const contentData = [];
      for (const item of allContent) {
        results.analyzed++;
        const data = this.extractContent(item);
        contentData.push(data);

        // Check for thin content
        if (data.wordCount < this.MIN_CONTENT_LENGTH) {
          results.thinContent.push({
            id: item.id,
            title: item.title.rendered,
            url: item.link,
            wordCount: data.wordCount,
            type: item.type
          });
          console.log(`⚠️  THIN: ${item.title.rendered} (${data.wordCount} words)`);
        } else {
          console.log(`✓ OK: ${item.title.rendered} (${data.wordCount} words)`);
        }
      }

      // Step 3: Compare content for duplicates
      console.log('\n🔍 Checking for duplicates...\n');
      for (let i = 0; i < contentData.length; i++) {
        for (let j = i + 1; j < contentData.length; j++) {
          const similarity = this.calculateSimilarity(
            contentData[i].content,
            contentData[j].content
          );

          if (similarity >= this.SIMILARITY_THRESHOLD) {
            const duplicate = {
              page1: {
                id: contentData[i].id,
                title: contentData[i].title,
                url: contentData[i].url,
                wordCount: contentData[i].wordCount
              },
              page2: {
                id: contentData[j].id,
                title: contentData[j].title,
                url: contentData[j].url,
                wordCount: contentData[j].wordCount
              },
              similarity: Math.round(similarity * 100),
              type: similarity >= 0.95 ? 'exact' : 'near'
            };

            if (similarity >= 0.95) {
              results.duplicates.push(duplicate);
              console.log(`🔴 DUPLICATE (${duplicate.similarity}%):`);
            } else {
              results.nearDuplicates.push(duplicate);
              console.log(`🟡 SIMILAR (${duplicate.similarity}%):`);
            }

            console.log(`   1. ${contentData[i].title}`);
            console.log(`   2. ${contentData[j].title}\n`);
          }
        }
      }

      // Step 4: Generate recommendations
      results.recommendations = this.generateRecommendations(results);

      // Step 5: Apply fixes if not dry run
      if (!dryRun && results.recommendations.length > 0) {
        console.log('\n🔧 Applying recommendations...\n');
        await this.applyRecommendations(results.recommendations);
      }

      // Step 6: Save report
      await this.saveReport(results, dryRun);

      // Step 7: Print summary
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
   * Extract content from WordPress item
   */
  extractContent(item) {
    const content = item.content?.rendered || '';
    const $ = cheerio.load(content);

    // Remove script and style tags
    $('script, style').remove();

    // Get text content
    const text = $.text()
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Calculate word count
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    // Create content fingerprint (first 1000 chars for comparison)
    const fingerprint = text.substring(0, 1000);

    return {
      id: item.id,
      title: item.title.rendered,
      url: item.link,
      type: item.type,
      content: text,
      fingerprint,
      wordCount,
      excerpt: text.substring(0, 200)
    };
  }

  /**
   * Calculate similarity between two texts
   * Uses Jaccard similarity on word sets
   */
  calculateSimilarity(text1, text2) {
    // Convert to word sets
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Generate recommendations for fixing duplicates
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Handle exact duplicates
    for (const dup of results.duplicates) {
      // Recommend canonical on the newer/less important page
      const primary = dup.page1.wordCount >= dup.page2.wordCount ? dup.page1 : dup.page2;
      const secondary = primary === dup.page1 ? dup.page2 : dup.page1;

      recommendations.push({
        type: 'canonical',
        action: 'set_canonical',
        pageId: secondary.id,
        pageTitle: secondary.title,
        canonicalUrl: primary.url,
        reason: `Exact duplicate of "${primary.title}" (${dup.similarity}% similar)`,
        severity: 'high'
      });
    }

    // Handle near duplicates
    for (const dup of results.nearDuplicates) {
      recommendations.push({
        type: 'consolidate',
        action: 'manual_review',
        page1: dup.page1,
        page2: dup.page2,
        similarity: dup.similarity,
        reason: `Pages are ${dup.similarity}% similar - consider consolidating`,
        severity: 'medium'
      });
    }

    // Handle thin content
    for (const thin of results.thinContent) {
      if (thin.wordCount < 100) {
        recommendations.push({
          type: 'noindex',
          action: 'set_noindex',
          pageId: thin.id,
          pageTitle: thin.title,
          reason: `Very thin content (${thin.wordCount} words) - consider noindex or expand`,
          severity: 'medium'
        });
      } else {
        recommendations.push({
          type: 'expand',
          action: 'manual_review',
          pageId: thin.id,
          pageTitle: thin.title,
          wordCount: thin.wordCount,
          reason: `Thin content (${thin.wordCount} words) - should be expanded to 300+ words`,
          severity: 'low'
        });
      }
    }

    return recommendations;
  }

  /**
   * Apply recommendations
   */
  async applyRecommendations(recommendations) {
    const autoFixable = recommendations.filter(r => 
      r.action === 'set_canonical' || r.action === 'set_noindex'
    );

    for (const rec of autoFixable) {
      try {
        if (rec.action === 'set_canonical') {
          await this.setCanonical(rec.pageId, rec.canonicalUrl);
          console.log(`✅ Set canonical on "${rec.pageTitle}" → ${rec.canonicalUrl}`);
        } else if (rec.action === 'set_noindex') {
          await this.setNoIndex(rec.pageId);
          console.log(`✅ Set noindex on "${rec.pageTitle}"`);
        }
      } catch (error) {
        console.log(`❌ Failed to apply recommendation: ${error.message}`);
      }
    }

    const manualReview = recommendations.filter(r => r.action === 'manual_review');
    if (manualReview.length > 0) {
      console.log(`\n⚠️  ${manualReview.length} items require manual review`);
    }
  }

  /**
   * Set canonical URL via Yoast SEO
   */
  async setCanonical(pageId, canonicalUrl) {
    try {
      await this.wpClient.updateYoastMeta(pageId, {
        canonical: canonicalUrl
      });
    } catch (error) {
      console.log(`   ⚠️  Could not set canonical via Yoast, trying custom field...`);
      await this.wpClient.updatePostMeta(pageId, '_yoast_wpseo_canonical', canonicalUrl);
    }
  }

  /**
   * Set noindex via Yoast SEO
   */
  async setNoIndex(pageId) {
    try {
      await this.wpClient.updateYoastMeta(pageId, {
        'meta-robots-noindex': 1
      });
    } catch (error) {
      console.log(`   ⚠️  Could not set noindex via Yoast, trying custom field...`);
      await this.wpClient.updatePostMeta(pageId, '_yoast_wpseo_meta-robots-noindex', '1');
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
        duplicates: results.duplicates.length,
        nearDuplicates: results.nearDuplicates.length,
        thinContent: results.thinContent.length,
        recommendations: results.recommendations.length
      },
      details: {
        duplicates: results.duplicates,
        nearDuplicates: results.nearDuplicates,
        thinContent: results.thinContent,
        recommendations: results.recommendations
      }
    };

    const filename = `logs/duplicate-content-${this.clientId}-${new Date().toISOString().split('T')[0]}.json`;
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    console.log(`\n📄 Report saved: ${filename}`);
  }

  /**
   * Print summary
   */
  printSummary(results, dryRun) {
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 DUPLICATE CONTENT DETECTION SUMMARY\n');
    console.log(`Pages Analyzed:       ${results.analyzed}`);
    console.log(`Exact Duplicates:     ${results.duplicates.length}`);
    console.log(`Near Duplicates:      ${results.nearDuplicates.length}`);
    console.log(`Thin Content:         ${results.thinContent.length}`);
    console.log(`Recommendations:      ${results.recommendations.length}`);

    const highSeverity = results.recommendations.filter(r => r.severity === 'high').length;
    const mediumSeverity = results.recommendations.filter(r => r.severity === 'medium').length;
    const lowSeverity = results.recommendations.filter(r => r.severity === 'low').length;

    if (results.recommendations.length > 0) {
      console.log(`\n📋 Recommendations by Severity:`);
      console.log(`   🔴 High:   ${highSeverity}`);
      console.log(`   🟡 Medium: ${mediumSeverity}`);
      console.log(`   🟢 Low:    ${lowSeverity}`);
    }

    console.log('\n' + '═'.repeat(70) + '\n');
  }
}
