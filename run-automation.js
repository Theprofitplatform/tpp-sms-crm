#!/usr/bin/env node
/**
 * Quick automation runner
 * Usage: node run-automation.js hottyres
 */

import { MasterSEOAutomator } from './src/automation/master-auto-optimizer.js';
import { logger } from './src/audit/logger.js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: 'config/env/.env' });

// Client configurations
const clients = {
  hottyres: {
    id: 'hottyres',
    domain: 'hottyres.com.au',
    wpUrl: 'https://www.hottyres.com.au',
    gscUrl: 'https://www.hottyres.com.au/',
    wpUser: process.env.HOTTYRES_WP_USER || 'your_username',
    wpPassword: process.env.HOTTYRES_WP_PASSWORD || 'your_app_password'
  },
  theprofitplatform: {
    id: 'theprofitplatform',
    domain: 'theprofitplatform.com.au',
    wpUrl: 'https://theprofitplatform.com.au',
    gscUrl: 'sc-domain:theprofitplatform.com.au',
    wpUser: process.env.TPP_WP_USER || 'your_username',
    wpPassword: process.env.TPP_WP_PASSWORD || 'your_app_password'
  },
  instantautotraders: {
    id: 'instantautotraders',
    domain: 'instantautotraders.com.au',
    wpUrl: 'https://instantautotraders.com.au',
    gscUrl: 'https://instantautotraders.com.au/',
    wpUser: process.env.IAT_WP_USER || 'your_username',
    wpPassword: process.env.IAT_WP_PASSWORD || 'your_app_password'
  },
  sadc: {
    id: 'sadc',
    domain: 'sadcdisabilityservices.com.au',
    wpUrl: 'https://sadcdisabilityservices.com.au',
    gscUrl: 'https://sadcdisabilityservices.com.au/',
    wpUser: process.env.SADC_WP_USER || 'your_username',
    wpPassword: process.env.SADC_WP_PASSWORD || 'your_app_password'
  }
};

async function main() {
  const clientId = process.argv[2];

  if (!clientId) {
    console.log('Usage: node run-automation.js <client-id>');
    console.log('\nAvailable clients:');
    Object.keys(clients).forEach(id => {
      console.log(`  - ${id}`);
    });
    process.exit(1);
  }

  const config = clients[clientId];
  if (!config) {
    logger.error(`Client '${clientId}' not found`);
    process.exit(1);
  }

  try {
    // Run automation
    const automator = new MasterSEOAutomator(config);
    const results = await automator.runCompleteOptimization();

    // Generate client report
    logger.section('📊 Generating Client Report');
    const { ClientReportGenerator } = await import('./src/reports/client-report-generator.js');
    const reportGenerator = new ClientReportGenerator(config, results);

    const reportPath = await reportGenerator.saveToFile();
    logger.success(`Report generated: ${reportPath}`);

    // Print text summary
    logger.info('\n' + reportGenerator.getTextSummary());

    logger.section('✅ Automation Complete!');
    process.exit(0);

  } catch (error) {
    logger.error('Automation failed:', error);
    process.exit(1);
  }
}

main();
