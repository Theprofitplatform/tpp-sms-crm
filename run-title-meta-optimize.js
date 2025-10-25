#!/usr/bin/env node

/**
 * Title/Meta AI Optimizer CLI
 *
 * Command-line tool for AI-powered title and meta description optimization
 *
 * Usage:
 *   node run-title-meta-optimize.js <clientId>              # Run optimization
 *   node run-title-meta-optimize.js <clientId> --dry-run    # Analyze only
 *   node run-title-meta-optimize.js <clientId> --limit 5    # Limit pages
 *   node run-title-meta-optimize.js <clientId> --evaluate <id>  # Check performance
 */

import { TitleMetaOptimizer } from './src/automation/auto-fixers/title-meta-optimizer.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Client configurations
const clientConfigs = {
  instantautotraders: {
    id: 'instantautotraders',
    businessName: 'Instant Auto Traders',
    siteUrl: 'https://instantautotraders.com.au',
    gscPropertyUrl: 'sc-domain:instantautotraders.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
  },
  hottyres: {
    id: 'hottyres',
    businessName: 'Hot Tyres',
    siteUrl: 'https://hottyres.com.au',
    gscPropertyUrl: 'sc-domain:hottyres.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
  },
  sadc: {
    id: 'sadc',
    businessName: 'SADC Disability Services',
    siteUrl: 'https://sadcdisabilityservices.com.au',
    gscPropertyUrl: 'sc-domain:sadcdisabilityservices.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
  }
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('');
    console.log('TITLE/META AI OPTIMIZER CLI');
    console.log('='.repeat(70));
    console.log('');
    console.log('Usage:');
    console.log('  node run-title-meta-optimize.js <clientId>           # Run optimization');
    console.log('  node run-title-meta-optimize.js <clientId> --dry-run # Analyze only');
    console.log('  node run-title-meta-optimize.js <clientId> --limit 5 # Limit pages');
    console.log('  node run-title-meta-optimize.js <clientId> --evaluate <id>  # Evaluate');
    console.log('');
    console.log('Available clients:');
    Object.keys(clientConfigs).forEach(id => {
      console.log(`  - ${id}`);
    });
    console.log('');
    console.log('Environment variables:');
    console.log('  WP_USER           WordPress username');
    console.log('  WP_APP_PASSWORD   WordPress application password');
    console.log('  ANTHROPIC_API_KEY Claude API key for AI optimization');
    console.log('');
    console.log('Get your Anthropic API key at: https://console.anthropic.com/');
    console.log('');
    process.exit(0);
  }

  const clientId = args[0];

  // Parse options
  const options = {
    dryRun: args.includes('--dry-run'),
    limit: 10
  };

  // Check for limit
  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    options.limit = parseInt(args[limitIndex + 1]);
  }

  // Check for evaluate
  const evaluateIndex = args.indexOf('--evaluate');
  let evaluateId = null;
  if (evaluateIndex !== -1 && args[evaluateIndex + 1]) {
    evaluateId = parseInt(args[evaluateIndex + 1]);
  }

  // Validate client
  if (!clientConfigs[clientId]) {
    console.error(`❌ Error: Client '${clientId}' not found`);
    console.log(`Available clients: ${Object.keys(clientConfigs).join(', ')}`);
    process.exit(1);
  }

  const config = clientConfigs[clientId];

  // Check credentials
  if (!config.wpPassword) {
    console.error('❌ Error: WordPress credentials not configured');
    console.log('');
    console.log('Please set environment variables:');
    console.log('  export WP_USER="your-username"');
    console.log('  export WP_APP_PASSWORD="xxxx xxxx xxxx xxxx"');
    console.log('');
    process.exit(1);
  }

  if (!config.anthropicApiKey) {
    console.error('❌ Error: Anthropic API key not configured');
    console.log('');
    console.log('Please set environment variable:');
    console.log('  export ANTHROPIC_API_KEY="sk-ant-..."');
    console.log('');
    console.log('Get your API key at: https://console.anthropic.com/');
    console.log('');
    process.exit(1);
  }

  const optimizer = new TitleMetaOptimizer(config);

  try {
    if (evaluateId) {
      // Evaluate performance of a previous optimization
      console.log('');
      console.log('📊 EVALUATING OPTIMIZATION PERFORMANCE');
      console.log('='.repeat(70));

      const result = await optimizer.evaluatePerformance(evaluateId);

      console.log('');
      console.log('Evaluation Result:');
      console.log(`  Status: ${result.status}`);
      if (result.improvement !== undefined) {
        console.log(`  CTR Change: ${(result.improvement * 100).toFixed(2)}%`);
      }
      if (result.daysRemaining !== undefined) {
        console.log(`  Days Remaining: ${result.daysRemaining.toFixed(1)}`);
      }
      console.log('');

    } else {
      // Run optimization
      if (options.dryRun) {
        console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
      }

      const results = await optimizer.runOptimization(options);

      // Save results
      const outputDir = path.join(__dirname, 'logs', 'title-meta-optimize', clientId);
      await fs.mkdir(outputDir, { recursive: true });

      const outputFile = path.join(
        outputDir,
        `title-meta-${new Date().toISOString().split('T')[0]}.json`
      );

      await fs.writeFile(
        outputFile,
        JSON.stringify(results, null, 2),
        'utf8'
      );

      console.log('');
      console.log(`📄 Full results saved to: ${outputFile}`);
      console.log('');

      if (options.dryRun) {
        console.log('ℹ️  This was a dry run. To apply optimizations, remove --dry-run flag');
        console.log('');
      } else if (results.optimized.length > 0) {
        console.log('⏳ Optimizations applied! Performance evaluation in 14 days.');
        console.log('');
        console.log('To check performance later, run:');
        results.optimized.forEach(opt => {
          console.log(`  node run-title-meta-optimize.js ${clientId} --evaluate ${opt.optimizationId || 'ID'}`);
        });
        console.log('');
      }

      if (results.success) {
        console.log('✅ Title/Meta optimization completed successfully!');
        process.exit(0);
      } else {
        console.log('⚠️  Optimization completed with errors. Check log file.');
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
