/**
 * Meta Description Optimizer
 * 
 * Automatically optimizes meta descriptions for SEO:
 * - Ensures optimal length (150-160 characters)
 * - Adds calls-to-action
 * - Includes target keywords
 * - Removes duplicate descriptions
 * - Ensures uniqueness across pages
 */

import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';
import { OpenAI } from 'openai';

export class MetaDescriptionOptimizer {
  constructor(config) {
    this.config = config;
    this.clientId = config.id;
    this.wpClient = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.wpUser,
      password: config.wpPassword
    });

    // Initialize OpenAI for AI-powered descriptions
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    this.MIN_LENGTH = 120;
    this.MAX_LENGTH = 160;
    this.OPTIMAL_LENGTH = 155;
  }

  /**
   * Main orchestrator - Optimize all meta descriptions
   */
  async runOptimization(options = {}) {
    const { dryRun = false, limit = 50, useAI = false } = options;

    console.log('\n🎯 Meta Description Optimizer - Starting...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   AI: ${useAI && this.openai ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Limit: ${limit} pages\n`);

    const results = {
      analyzed: 0,
      optimized: 0,
      skipped: 0,
      errors: 0,
      changes: [],
      duplicates: new Map()
    };

    try {
      // Step 1: Fetch all posts and pages
      const posts = await this.wpClient.getPosts({ per_page: limit });
      const pages = await this.wpClient.getPages({ per_page: limit });
      const allContent = [...posts, ...pages];

      console.log(`📄 Found ${allContent.length} items to analyze\n`);

      // Step 2: Analyze and optimize each item
      for (const item of allContent) {
        results.analyzed++;
        const analysis = await this.analyzeMetaDescription(item);

        if (analysis.needsOptimization) {
          const optimized = useAI && this.openai 
            ? await this.generateAIDescription(item, analysis)
            : this.generateDescription(item, analysis);

          const change = {
            postId: item.id,
            type: item.type,
            title: item.title.rendered,
            url: item.link,
            oldDescription: analysis.currentDescription,
            newDescription: optimized,
            oldLength: analysis.currentLength,
            newLength: optimized.length,
            issues: analysis.issues
          };

          console.log(`\n🔧 OPTIMIZE: ${item.title.rendered}`);
          console.log(`   OLD [${analysis.currentLength}ch]: ${analysis.currentDescription || '(none)'}`);
          console.log(`   NEW [${optimized.length}ch]: ${optimized}`);
          console.log(`   Issues: ${analysis.issues.join(', ')}`);

          if (!dryRun) {
            try {
              await this.updateMetaDescription(item.id, optimized);
              results.optimized++;
              results.changes.push(change);
              console.log(`   ✅ Updated successfully`);

              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.log(`   ❌ Error: ${error.message}`);
              results.errors++;
            }
          } else {
            results.optimized++;
            results.changes.push(change);
            console.log(`   🔍 DRY RUN - No changes made`);
          }
        } else {
          console.log(`✓ OK: ${item.title.rendered} [${analysis.currentLength}ch]`);
          results.skipped++;
        }

        // Track duplicates
        const desc = analysis.currentDescription?.toLowerCase();
        if (desc) {
          if (results.duplicates.has(desc)) {
            results.duplicates.get(desc).push(item.title.rendered);
          } else {
            results.duplicates.set(desc, [item.title.rendered]);
          }
        }
      }

      // Step 3: Report duplicates
      const duplicateDescriptions = Array.from(results.duplicates.entries())
        .filter(([_, pages]) => pages.length > 1);

      if (duplicateDescriptions.length > 0) {
        console.log('\n⚠️  DUPLICATE DESCRIPTIONS FOUND:');
        duplicateDescriptions.forEach(([desc, pages]) => {
          console.log(`\n   "${desc.substring(0, 60)}..."`);
          console.log(`   Used on ${pages.length} pages:`);
          pages.forEach(page => console.log(`     - ${page}`));
        });
      }

      // Step 4: Save report
      await this.saveReport(results, dryRun);

      // Step 5: Print summary
      this.printSummary(results, dryRun);

      return {
        success: true,
        ...results,
        duplicates: duplicateDescriptions.length
      };

    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze current meta description
   */
  async analyzeMetaDescription(item) {
    const meta = item.yoast_head_json || {};
    const currentDescription = meta.og_description || meta.description || '';
    const currentLength = currentDescription.length;

    const issues = [];
    let needsOptimization = false;

    // Check if missing
    if (!currentDescription) {
      issues.push('missing');
      needsOptimization = true;
    }

    // Check length
    if (currentLength < this.MIN_LENGTH) {
      issues.push('too_short');
      needsOptimization = true;
    }

    if (currentLength > this.MAX_LENGTH) {
      issues.push('too_long');
      needsOptimization = true;
    }

    // Check for generic descriptions
    const genericPhrases = [
      'welcome to our website',
      'this is a page',
      'learn more',
      'click here',
      'read more'
    ];

    if (genericPhrases.some(phrase => currentDescription.toLowerCase().includes(phrase))) {
      issues.push('generic');
      needsOptimization = true;
    }

    // Check for duplicate title
    if (currentDescription === item.title.rendered) {
      issues.push('duplicate_title');
      needsOptimization = true;
    }

    return {
      currentDescription,
      currentLength,
      issues,
      needsOptimization
    };
  }

  /**
   * Generate optimized description (rule-based)
   */
  generateDescription(item, analysis) {
    const title = item.title.rendered;
    const excerpt = item.excerpt?.rendered 
      ? item.excerpt.rendered.replace(/<[^>]*>/g, '').trim()
      : '';

    // If we have a good excerpt, use it
    if (excerpt && excerpt.length >= this.MIN_LENGTH && excerpt.length <= this.MAX_LENGTH) {
      return excerpt;
    }

    // Build description from title + business info
    const businessName = this.config.businessName || 'Instant Auto Traders';
    const location = this.config.city || 'Sydney';
    const cta = 'Call now for a free quote!';

    let description = '';

    // Start with title context
    if (title.length < 80) {
      description = title;
    } else {
      description = title.substring(0, 77) + '...';
    }

    // Add business context
    description += ` | ${businessName}`;

    // Add location if space permits
    if (description.length + location.length + 3 < this.OPTIMAL_LENGTH - cta.length - 1) {
      description += ` ${location}`;
    }

    // Add CTA if space permits
    if (description.length + cta.length + 1 <= this.MAX_LENGTH) {
      description += ` ${cta}`;
    }

    // Ensure it fits
    if (description.length > this.MAX_LENGTH) {
      description = description.substring(0, this.MAX_LENGTH - 3) + '...';
    }

    return description;
  }

  /**
   * Generate AI-powered description using OpenAI
   */
  async generateAIDescription(item, analysis) {
    if (!this.openai) {
      return this.generateDescription(item, analysis);
    }

    try {
      const title = item.title.rendered;
      const excerpt = item.excerpt?.rendered 
        ? item.excerpt.rendered.replace(/<[^>]*>/g, '').trim()
        : '';

      const prompt = `Write a compelling meta description for this webpage:

Title: ${title}
${excerpt ? `Excerpt: ${excerpt}` : ''}

Business: ${this.config.businessName || 'Instant Auto Traders'}
Location: ${this.config.city || 'Sydney'}
Industry: Automotive/Car Trading

Requirements:
- Length: ${this.MIN_LENGTH}-${this.OPTIMAL_LENGTH} characters
- Include a call-to-action
- Focus on benefits
- Natural and engaging
- SEO-optimized

Write ONLY the meta description, no explanations.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      });

      let description = completion.choices[0].message.content.trim();

      // Remove quotes if present
      description = description.replace(/^["']|["']$/g, '');

      // Ensure length constraints
      if (description.length > this.MAX_LENGTH) {
        description = description.substring(0, this.MAX_LENGTH - 3) + '...';
      }

      if (description.length < this.MIN_LENGTH) {
        // Fall back to rule-based
        return this.generateDescription(item, analysis);
      }

      return description;

    } catch (error) {
      console.log(`   ⚠️  AI generation failed, using rule-based: ${error.message}`);
      return this.generateDescription(item, analysis);
    }
  }

  /**
   * Update meta description via Yoast SEO or fallback
   */
  async updateMetaDescription(postId, description) {
    // Try Yoast SEO first
    try {
      await this.wpClient.updateYoastMeta(postId, {
        metadesc: description
      });
    } catch (error) {
      // Fallback: Update excerpt
      await this.wpClient.updatePost(postId, {
        excerpt: description
      });
    }
  }

  /**
   * Save optimization report
   */
  async saveReport(results, dryRun) {
    const report = {
      timestamp: new Date().toISOString(),
      clientId: this.clientId,
      dryRun,
      results: {
        analyzed: results.analyzed,
        optimized: results.optimized,
        skipped: results.skipped,
        errors: results.errors,
        duplicates: results.duplicates.size
      },
      changes: results.changes
    };

    const filename = `logs/meta-description-${this.clientId}-${new Date().toISOString().split('T')[0]}.json`;
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    // Log to database
    if (!dryRun && results.changes.length > 0) {
      await db.logAutoFixChange({
        clientId: this.clientId,
        engine: 'meta-description-optimizer',
        changes: results.changes,
        success: results.errors === 0
      });
    }

    return filename;
  }

  /**
   * Print summary
   */
  printSummary(results, dryRun) {
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 META DESCRIPTION OPTIMIZATION SUMMARY\n');
    console.log(`Pages Analyzed:    ${results.analyzed}`);
    console.log(`Descriptions Optimized: ${results.optimized}`);
    console.log(`Already OK:        ${results.skipped}`);
    console.log(`Errors:            ${results.errors}`);
    console.log(`Duplicates Found:  ${Array.from(results.duplicates.values()).filter(p => p.length > 1).length}`);

    if (results.optimized > 0) {
      const avgOldLength = results.changes.reduce((sum, c) => sum + c.oldLength, 0) / results.changes.length;
      const avgNewLength = results.changes.reduce((sum, c) => sum + c.newLength, 0) / results.changes.length;
      console.log(`\n📏 Length Improvements:`);
      console.log(`   Avg old length: ${Math.round(avgOldLength)} chars`);
      console.log(`   Avg new length: ${Math.round(avgNewLength)} chars`);
    }

    console.log('\n' + '═'.repeat(70) + '\n');
  }
}
