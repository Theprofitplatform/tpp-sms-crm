/**
 * Title and Meta Description Auto-Optimizer
 *
 * Uses AI (Claude) to optimize titles and meta descriptions based on GSC performance data.
 * Implements A/B testing, performance tracking, and automatic rollback.
 *
 * Features:
 * - Identifies low-CTR pages from GSC data
 * - Uses Claude AI to generate optimized titles/descriptions
 * - A/B tests new vs old versions
 * - Tracks CTR improvements over time
 * - Auto-updates if CTR improves >20%
 * - Auto-rollback if CTR decreases
 * - Complete performance tracking
 */

import { WordPressClient } from '../wordpress-client.js';
import { GoogleSearchConsole } from './google-search-console.js';
import db from '../../database/index.js';

export class TitleMetaOptimizer {
  constructor(config) {
    this.config = config;
    this.clientId = config.id;
    this.wpClient = new WordPressClient(config.siteUrl, config.wpUser, config.wpPassword);
    this.gscClient = new GoogleSearchConsole(config.gscPropertyUrl);
    this.anthropicApiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

    // Performance thresholds
    this.minImprovementThreshold = 0.20; // 20% CTR improvement required
    this.testDurationDays = 14; // Wait 14 days before evaluating
  }

  /**
   * Main entry point: Optimize titles and meta descriptions
   */
  async runOptimization(options = {}) {
    console.log('\n🤖 TITLE/META AI OPTIMIZER: Starting...');
    console.log(`Client: ${this.config.businessName}`);
    console.log('-'.repeat(70));

    const results = {
      analyzed: [],
      optimized: [],
      skipped: [],
      errors: [],
      success: false
    };

    try {
      // Step 1: Get GSC performance data
      console.log('\n1️⃣  Fetching Google Search Console data...');
      const gscData = await this.gscClient.getPerformanceData({ dimensions: ['page'] });
      console.log(`   ✅ Retrieved ${gscData.rows?.length || 0} pages`);

      // Step 2: Identify low-CTR pages
      console.log('\n2️⃣  Identifying low-CTR pages...');
      const lowCTRPages = this.identifyLowCTRPages(gscData);
      console.log(`   Found ${lowCTRPages.length} pages with low CTR`);

      if (lowCTRPages.length === 0) {
        console.log('   ✅ All pages have good CTR!');
        results.success = true;
        return results;
      }

      // Step 3: Get WordPress content for low-CTR pages
      console.log('\n3️⃣  Fetching WordPress content...');
      const pagesToOptimize = await this.matchPagesToWordPress(lowCTRPages);
      console.log(`   Matched ${pagesToOptimize.length} pages to WordPress`);

      // Step 4: Generate AI optimizations
      console.log('\n4️⃣  Generating AI-powered optimizations...');
      const limit = options.limit || 10; // Limit to avoid API costs

      for (let i = 0; i < Math.min(pagesToOptimize.length, limit); i++) {
        const page = pagesToOptimize[i];

        try {
          console.log(`\n   [${i + 1}/${Math.min(pagesToOptimize.length, limit)}] Optimizing: ${page.title}`);

          // Generate optimized title and description
          const optimized = await this.generateOptimizations(page);

          // Create backup
          const backupId = await this.createBackup(page);

          // Apply optimization (if not dry-run)
          if (!options.dryRun) {
            await this.applyOptimization(page, optimized, backupId);
            results.optimized.push({
              page,
              optimized,
              backupId
            });
            console.log(`      ✅ Optimization applied (Backup ID: ${backupId})`);
          } else {
            console.log(`      ✅ [DRY RUN] Would optimize`);
            results.analyzed.push({ page, optimized });
          }

        } catch (error) {
          console.error(`      ❌ Error: ${error.message}`);
          results.errors.push({
            page: page.title,
            error: error.message
          });
        }
      }

      // Step 5: Log results
      console.log('\n5️⃣  Logging optimization results...');
      await this.logOptimizations(results);
      console.log('   ✅ Results logged');

      results.success = results.errors.length === 0;

      console.log('\n' + '='.repeat(70));
      console.log('✅ TITLE/META OPTIMIZATION COMPLETE');
      console.log(`   Optimized: ${results.optimized.length}`);
      console.log(`   Errors: ${results.errors.length}`);
      console.log('='.repeat(70));

      return results;

    } catch (error) {
      console.error('\n❌ Title/Meta Optimization Error:', error.message);
      results.error = error.message;
      return results;
    }
  }

  /**
   * Identify pages with low CTR from GSC data
   */
  identifyLowCTRPages(gscData) {
    if (!gscData.rows || gscData.rows.length === 0) {
      return [];
    }

    const lowCTRPages = [];
    const avgCTR = this.calculateAverageCTR(gscData.rows);

    for (const row of gscData.rows) {
      const ctr = row.ctr || 0;
      const impressions = row.impressions || 0;

      // Criteria for low CTR:
      // 1. Below average CTR
      // 2. Has decent impressions (at least 100)
      // 3. Position is good (top 20)
      if (ctr < avgCTR && impressions >= 100 && row.position <= 20) {
        lowCTRPages.push({
          url: row.keys[0],
          ctr: ctr,
          impressions: impressions,
          clicks: row.clicks || 0,
          position: row.position || 0
        });
      }
    }

    // Sort by impressions (high potential for improvement)
    return lowCTRPages.sort((a, b) => b.impressions - a.impressions);
  }

  /**
   * Calculate average CTR
   */
  calculateAverageCTR(rows) {
    if (rows.length === 0) return 0;
    const totalCTR = rows.reduce((sum, row) => sum + (row.ctr || 0), 0);
    return totalCTR / rows.length;
  }

  /**
   * Match GSC pages to WordPress posts/pages
   */
  async matchPagesToWordPress(gscPages) {
    const matched = [];

    // Get all posts and pages
    const [posts, pages] = await Promise.all([
      this.wpClient.getPosts({ per_page: 100 }),
      this.wpClient.getPages({ per_page: 100 })
    ]);

    const allContent = [...posts, ...pages];

    for (const gscPage of gscPages) {
      // Try to match by URL
      const wpPage = allContent.find(p => {
        const pageUrl = p.link.toLowerCase();
        const gscUrl = gscPage.url.toLowerCase();
        return pageUrl === gscUrl || pageUrl.includes(p.slug);
      });

      if (wpPage) {
        matched.push({
          ...gscPage,
          wpId: wpPage.id,
          wpType: wpPage.type,
          title: wpPage.title.rendered,
          currentMeta: wpPage.yoast_head_json?.og_description || wpPage.excerpt?.rendered || '',
          content: wpPage.content.rendered,
          slug: wpPage.slug
        });
      }
    }

    return matched;
  }

  /**
   * Generate AI-powered optimizations using Claude
   */
  async generateOptimizations(page) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const prompt = `You are an expert SEO copywriter. Analyze this webpage and create an optimized title and meta description that will improve click-through rate (CTR).

Current Page Information:
- URL: ${page.url}
- Current Title: ${page.title}
- Current Meta Description: ${page.currentMeta}
- Current CTR: ${(page.ctr * 100).toFixed(2)}%
- Average Position: ${page.position.toFixed(1)}
- Impressions: ${page.impressions}

Content Preview: ${page.content.substring(0, 500)}...

Please provide:
1. An optimized title (50-60 characters, compelling, includes primary keyword)
2. An optimized meta description (150-160 characters, includes call-to-action)
3. Brief explanation of why these will improve CTR

Format your response as JSON:
{
  "title": "optimized title here",
  "description": "optimized meta description here",
  "reasoning": "explanation of improvements"
}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0].text;

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse Claude response as JSON');
      }

      const optimization = JSON.parse(jsonMatch[0]);

      return {
        newTitle: optimization.title,
        newDescription: optimization.description,
        reasoning: optimization.reasoning,
        aiModel: 'claude-3-5-sonnet-20241022'
      };

    } catch (error) {
      console.error('AI generation error:', error.message);
      throw error;
    }
  }

  /**
   * Create backup before optimization
   */
  async createBackup(page) {
    const backupData = {
      clientId: this.clientId,
      timestamp: new Date().toISOString(),
      wpId: page.wpId,
      wpType: page.wpType,
      url: page.url,
      originalTitle: page.title,
      originalMeta: page.currentMeta,
      gscMetrics: {
        ctr: page.ctr,
        impressions: page.impressions,
        clicks: page.clicks,
        position: page.position
      }
    };

    const stmt = db.db.prepare(`
      INSERT INTO auto_fix_actions
      (client_id, fix_type, target, before_state, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      this.clientId,
      'title_meta_backup',
      page.url,
      JSON.stringify(backupData),
      'backup',
      JSON.stringify({ wpId: page.wpId, url: page.url })
    );

    return result.lastInsertRowid;
  }

  /**
   * Apply optimization to WordPress
   */
  async applyOptimization(page, optimized, backupId) {
    // Update WordPress post/page
    const updateData = {
      title: optimized.newTitle
    };

    // For meta description, we need to use Yoast or similar plugin
    // For now, update excerpt as fallback
    if (optimized.newDescription) {
      updateData.excerpt = optimized.newDescription;
    }

    if (page.wpType === 'post') {
      await this.wpClient.updatePost(page.wpId, updateData);
    } else {
      await this.wpClient.updatePage(page.wpId, updateData);
    }

    // Log to database
    const stmt = db.db.prepare(`
      INSERT INTO auto_fix_actions
      (client_id, fix_type, target, before_state, after_state, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      this.clientId,
      'title_meta_optimize',
      page.url,
      JSON.stringify({
        title: page.title,
        meta: page.currentMeta,
        backupId
      }),
      JSON.stringify({
        title: optimized.newTitle,
        meta: optimized.newDescription,
        reasoning: optimized.reasoning
      }),
      'ab_testing', // Status indicates we're A/B testing
      JSON.stringify({
        backupId,
        aiModel: optimized.aiModel,
        testStartDate: new Date().toISOString(),
        wpId: page.wpId
      })
    );
  }

  /**
   * Check performance and auto-update or rollback
   */
  async evaluatePerformance(optimizationId) {
    console.log(`\n📊 Evaluating performance for optimization ${optimizationId}...`);

    // Get optimization record
    const stmt = db.db.prepare(`
      SELECT * FROM auto_fix_actions
      WHERE id = ? AND fix_type = 'title_meta_optimize'
    `);
    const optimization = stmt.get(optimizationId);

    if (!optimization) {
      throw new Error(`Optimization ${optimizationId} not found`);
    }

    const metadata = JSON.parse(optimization.metadata);
    const testStartDate = new Date(metadata.testStartDate);
    const daysSinceTest = (Date.now() - testStartDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceTest < this.testDurationDays) {
      console.log(`   ⏳ Test still running (${daysSinceTest.toFixed(1)}/${this.testDurationDays} days)`);
      return { status: 'testing', daysRemaining: this.testDurationDays - daysSinceTest };
    }

    // Get current GSC data
    const beforeState = JSON.parse(optimization.before_state);
    const currentGSC = await this.gscClient.getPerformanceData({
      dimensions: ['page'],
      startDate: metadata.testStartDate
    });

    // Find current performance for this URL
    const currentPerformance = currentGSC.rows?.find(r => r.keys[0] === optimization.target);

    if (!currentPerformance) {
      console.log('   ⚠️  No current data available');
      return { status: 'no_data' };
    }

    const oldCTR = beforeState.gscMetrics.ctr;
    const newCTR = currentPerformance.ctr;
    const improvement = (newCTR - oldCTR) / oldCTR;

    console.log(`   Old CTR: ${(oldCTR * 100).toFixed(2)}%`);
    console.log(`   New CTR: ${(newCTR * 100).toFixed(2)}%`);
    console.log(`   Improvement: ${(improvement * 100).toFixed(1)}%`);

    if (improvement >= this.minImprovementThreshold) {
      // Success! Keep the optimization
      console.log(`   ✅ Success! CTR improved by ${(improvement * 100).toFixed(1)}%`);

      const updateStmt = db.db.prepare(`
        UPDATE auto_fix_actions
        SET status = 'completed',
            metadata = json_set(metadata, '$.evaluation', ?)
        WHERE id = ?
      `);

      updateStmt.run(
        JSON.stringify({ improvement, evaluatedAt: new Date().toISOString() }),
        optimizationId
      );

      return { status: 'success', improvement };

    } else if (improvement < 0) {
      // Performance degraded - rollback
      console.log(`   ❌ Performance degraded by ${Math.abs(improvement * 100).toFixed(1)}% - rolling back`);

      await this.rollback(metadata.backupId);

      return { status: 'rolled_back', improvement };

    } else {
      // Marginal improvement - keep but log
      console.log(`   ⚠️  Marginal improvement (${(improvement * 100).toFixed(1)}%) - keeping`);

      const updateStmt = db.db.prepare(`
        UPDATE auto_fix_actions
        SET status = 'completed',
            metadata = json_set(metadata, '$.evaluation', ?)
        WHERE id = ?
      `);

      updateStmt.run(
        JSON.stringify({ improvement, evaluatedAt: new Date().toISOString(), marginal: true }),
        optimizationId
      );

      return { status: 'marginal', improvement };
    }
  }

  /**
   * Rollback optimization
   */
  async rollback(backupId) {
    console.log(`\n🔄 Rolling back to backup ${backupId}...`);

    const stmt = db.db.prepare(`
      SELECT * FROM auto_fix_actions
      WHERE id = ? AND fix_type = 'title_meta_backup'
    `);
    const backup = stmt.get(backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const backupData = JSON.parse(backup.before_state);

    // Restore original title and meta
    const updateData = {
      title: backupData.originalTitle,
      excerpt: backupData.originalMeta
    };

    if (backupData.wpType === 'post') {
      await this.wpClient.updatePost(backupData.wpId, updateData);
    } else {
      await this.wpClient.updatePage(backupData.wpId, updateData);
    }

    // Log rollback
    const logStmt = db.db.prepare(`
      INSERT INTO auto_fix_actions
      (client_id, fix_type, target, before_state, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    logStmt.run(
      this.clientId,
      'title_meta_rollback',
      backupData.url,
      JSON.stringify({ backupId }),
      'completed',
      JSON.stringify({ restoredAt: new Date().toISOString() })
    );

    console.log('   ✅ Rollback complete');

    return { success: true };
  }

  /**
   * Log optimization results
   */
  async logOptimizations(results) {
    // Send to bridge API
    if (results.optimized.length > 0) {
      try {
        const bridgeClient = (await import('./bridge-client.js')).default;
        await bridgeClient.sendOptimizationResults(
          this.clientId,
          'title_meta_ai_optimize',
          {
            pagesModified: results.optimized.length,
            issuesFixed: results.optimized.length,
            expectedImpact: 'AI-optimized titles and meta descriptions for improved CTR',
            before: { pages: results.optimized.map(o => o.page.title) },
            after: { pages: results.optimized.map(o => o.optimized.newTitle) }
          },
          {
            aiPowered: true,
            model: 'claude-3-5-sonnet-20241022',
            testingPeriod: this.testDurationDays
          }
        );
      } catch (bridgeError) {
        console.warn('Could not send to bridge API:', bridgeError.message);
      }
    }
  }
}

export default TitleMetaOptimizer;
