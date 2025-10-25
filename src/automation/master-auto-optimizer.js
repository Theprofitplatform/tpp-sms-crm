import { GoogleSearchConsole } from './google-search-console.js';
import { RankMathAutomator } from './rankmath-automator.js';
import { AIOptimizer } from './ai-optimizer.js';
import { SafetyManager } from './safety-manager.js';
import { logger } from '../audit/logger.js';
import fs from 'fs';

/**
 * Master SEO Automation Orchestrator
 * Production-ready with safety features
 */
export class MasterSEOAutomator {
  constructor(clientConfig) {
    this.clientId = clientConfig.id;
    this.domain = clientConfig.domain;
    this.wpUrl = clientConfig.wpUrl;
    this.gscUrl = clientConfig.gscUrl;
    
    // Initialize all modules
    this.gsc = new GoogleSearchConsole();
    this.rankMath = new RankMathAutomator(
      clientConfig.wpUrl,
      clientConfig.wpUser,
      clientConfig.wpPassword
    );
    this.ai = new AIOptimizer(process.env.ANTHROPIC_API_KEY);
    this.safety = new SafetyManager(clientConfig.id);
  }

  /**
   * THE MAGIC BUTTON - Run complete optimization
   * Now with safety features for production scale
   */
  async runCompleteOptimization(options = {}) {
    const {
      skipAI = false,
      limit = 10,
      dryRun = false,
      maxPosts = null,
      skipBackup = false
    } = options;

    const results = {
      clientId: this.clientId,
      domain: this.domain,
      timestamp: new Date().toISOString(),
      phases: {},
      summary: {}
    };

    try {
      logger.section(`🚀 Starting complete SEO automation for ${this.domain}`);
      logger.info(`Time started: ${new Date().toLocaleString()}\n`);

      // PHASE 1: Get Rankings & Opportunities
      logger.section('📊 PHASE 1: Google Search Console Analysis');
      try {
        // Get overall metrics
        results.phases.metrics = await this.gsc.getSiteMetrics(this.gscUrl);
        logger.info(`Total clicks: ${results.phases.metrics.totalClicks}`);
        logger.info(`Total impressions: ${results.phases.metrics.totalImpressions}`);
        
        // Find quick wins
        results.phases.quickWins = await this.gsc.findQuickWins(this.gscUrl);
        logger.success(`Found ${results.phases.quickWins.total} quick win opportunities`);
        logger.info(`Estimated traffic gain: +${results.phases.quickWins.estimatedTrafficGain} clicks/month`);
        
        // Find low CTR pages
        results.phases.lowCTR = await this.gsc.findLowCTRPages(this.gscUrl);
        logger.success(`Found ${results.phases.lowCTR.total} low CTR pages`);
        logger.info(`Potential clicks gain: +${results.phases.lowCTR.potentialClicks} clicks/month\n`);
        
      } catch (error) {
        logger.error('GSC analysis failed:', error.message);
        results.phases.gscError = error.message;
      }

      // PHASE 2: Bulk Rank Math Optimization
      logger.section('🔧 PHASE 2: Bulk Post Optimization');
      try {
        // Create backup before making changes
        if (!dryRun && !skipBackup) {
          logger.info('Creating backup...');
          const posts = await this.rankMath.getAllPosts();
          const backupFile = await this.safety.createBackup(posts, 'pre-optimization');
          results.backupFile = backupFile;
        }
        
        results.phases.bulkOptimization = await this.rankMath.bulkOptimizeAll({
          dryRun: dryRun,
          maxPosts: maxPosts
        });
        
        if (dryRun) {
          logger.warn('🔍 DRY RUN - No changes applied');
          logger.info(`Would optimize ${results.phases.bulkOptimization.wouldOptimize} posts\n`);
        } else {
          logger.success(`Optimized ${results.phases.bulkOptimization.optimized} posts`);
          logger.info(`Failed: ${results.phases.bulkOptimization.failed}`);
          logger.info(`Skipped (already optimized): ${results.phases.bulkOptimization.skipped}\n`);
        }
        
      } catch (error) {
        logger.error('Bulk optimization failed:', error.message);
        results.phases.bulkOptimizationError = error.message;
      }

      // PHASE 3: Add Schema Markup
      logger.section('📋 PHASE 3: Schema Markup');
      try {
        results.phases.schema = await this.rankMath.bulkAddSchema();
        logger.success(`Added schema to ${results.phases.schema.added} posts`);
        logger.info(`Skipped (already has schema): ${results.phases.schema.skipped}\n`);
        
      } catch (error) {
        logger.error('Schema addition failed:', error.message);
        results.phases.schemaError = error.message;
      }

      // PHASE 4: AI Content Enhancement (Optional)
      if (!skipAI && this.ai.enabled) {
        logger.section('🤖 PHASE 4: AI Content Enhancement');
        try {
          const posts = await this.rankMath.getAllPosts();
          const topPosts = posts.slice(0, limit);
          
          results.phases.aiOptimization = await this.ai.bulkOptimize(topPosts);
          const successful = results.phases.aiOptimization.filter(r => r.success).length;
          logger.success(`AI enhanced ${successful} posts`);
          logger.info(`Estimated cost: $${(successful * 0.02).toFixed(2)}\n`);
          
        } catch (error) {
          logger.error('AI optimization failed:', error.message);
          results.phases.aiError = error.message;
        }
      } else if (!this.ai.enabled) {
        logger.info('⏭️  PHASE 4: AI optimization skipped (no API key)\n');
      }

      // Generate Summary
      results.summary = this.generateSummary(results);

      // Save results
      const resultFile = `logs/clients/${this.clientId}/auto-optimize-${Date.now()}.json`;
      fs.mkdirSync(`logs/clients/${this.clientId}`, { recursive: true });
      fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));

      // Display Summary
      this.displaySummary(results);

      logger.section('✅ Complete automation finished!');
      logger.info(`Results saved to: ${resultFile}`);
      logger.info(`Time completed: ${new Date().toLocaleString()}`);

      return results;

    } catch (error) {
      logger.error('Complete optimization failed:', error);
      throw error;
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary(results) {
    return {
      keywordOpportunities: results.phases.quickWins?.total || 0,
      postsOptimized: results.phases.bulkOptimization?.optimized || 0,
      schemaAdded: results.phases.schema?.added || 0,
      aiEnhanced: results.phases.aiOptimization?.filter(r => r.success).length || 0,
      estimatedTrafficGain: results.phases.quickWins?.estimatedTrafficGain || 0,
      estimatedCost: ((results.phases.aiOptimization?.filter(r => r.success).length || 0) * 0.02).toFixed(2)
    };
  }

  /**
   * Display summary in console
   */
  displaySummary(results) {
    const s = results.summary;

    logger.section('📊 OPTIMIZATION SUMMARY');
    console.log('');
    console.log('  🔍 SEO Opportunities Found:');
    console.log(`     Quick Wins: ${s.keywordOpportunities} keywords (position 11-20)`);
    console.log(`     Traffic Gain: +${s.estimatedTrafficGain} clicks/month`);
    console.log('');
    console.log('  ✅ Optimizations Applied:');
    console.log(`     Posts Optimized: ${s.postsOptimized}`);
    console.log(`     Schema Added: ${s.schemaAdded}`);
    console.log(`     AI Enhanced: ${s.aiEnhanced}`);
    console.log('');
    console.log('  💰 Cost:');
    console.log(`     Total: $${s.estimatedCost}`);
    console.log('');
  }
}
