#!/usr/bin/env node

/**
 * Batch Processing Script
 * Process multiple WordPress sites in sequence or parallel
 */

import { SEOAutomation } from '../index.js';
import { logger } from '../tasks/logger.js';
import fs from 'fs';
import path from 'path';

const SITES_CONFIG_FILE = process.argv[2] || './sites.json';
const PARALLEL = process.argv.includes('--parallel');
const MAX_CONCURRENT = parseInt(process.argv.find(arg => arg.startsWith('--max-concurrent='))?.split('=')[1]) || 3;

/**
 * Sites configuration format:
 * [
 *   {
 *     "name": "Site 1",
 *     "url": "https://site1.com",
 *     "user": "admin",
 *     "password": "xxxx-xxxx-xxxx-xxxx",
 *     "maxPosts": 50
 *   }
 * ]
 */

async function loadSitesConfig() {
  try {
    const configPath = path.resolve(SITES_CONFIG_FILE);
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to load sites configuration', error.message);
    console.log('\nUsage: node scripts/batch-process.js [sites.json] [--parallel] [--max-concurrent=3]');
    console.log('\nCreate sites.json with format:');
    console.log(JSON.stringify([
      {
        name: "Example Site",
        url: "https://example.com",
        user: "admin",
        password: "xxxx-xxxx-xxxx-xxxx",
        maxPosts: 50
      }
    ], null, 2));
    process.exit(1);
  }
}

async function processSite(site) {
  logger.section(`Processing: ${site.name}`);
  logger.info(`URL: ${site.url}`);

  // Override config for this site
  process.env.WORDPRESS_URL = site.url;
  process.env.WORDPRESS_USER = site.user;
  process.env.WORDPRESS_APP_PASSWORD = site.password;

  const startTime = Date.now();

  try {
    // Reload config module to pick up new env vars
    delete require.cache[require.resolve('../env/config.js')];
    const { config } = await import('../env/config.js');

    config.validate();

    const automation = new SEOAutomation({
      mode: site.mode || 'audit',
      maxPosts: site.maxPosts || 100
    });

    const report = await automation.run();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      site: site.name,
      url: site.url,
      success: true,
      duration: `${duration}s`,
      summary: report.report.summary,
      reportPath: report.htmlPath
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.error(`Failed to process ${site.name}`, error.message);

    return {
      site: site.name,
      url: site.url,
      success: false,
      duration: `${duration}s`,
      error: error.message
    };
  }
}

async function processSequential(sites) {
  const results = [];

  for (let i = 0; i < sites.length; i++) {
    logger.info(`\nProcessing site ${i + 1}/${sites.length}`);
    const result = await processSite(sites[i]);
    results.push(result);
  }

  return results;
}

async function processParallel(sites) {
  logger.info(`Processing ${sites.length} sites with max ${MAX_CONCURRENT} concurrent...`);

  const results = [];
  const queue = [...sites];
  const inProgress = new Set();

  async function processNext() {
    if (queue.length === 0) return;

    const site = queue.shift();
    const promise = processSite(site).then(result => {
      results.push(result);
      inProgress.delete(promise);
      return processNext();
    });

    inProgress.add(promise);

    if (inProgress.size < MAX_CONCURRENT && queue.length > 0) {
      await processNext();
    }

    return promise;
  }

  // Start initial batch
  const initialPromises = [];
  for (let i = 0; i < Math.min(MAX_CONCURRENT, sites.length); i++) {
    initialPromises.push(processNext());
  }

  await Promise.all(initialPromises);
  await Promise.all(inProgress);

  return results;
}

function printSummaryReport(results) {
  logger.section('Batch Processing Summary');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  logger.info(`Total Sites: ${results.length}`);
  logger.success(`Successful: ${successful}`);
  if (failed > 0) {
    logger.error(`Failed: ${failed}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('RESULTS BY SITE');
  console.log('='.repeat(80));

  results.forEach(result => {
    console.log(`\n${result.success ? '✓' : '✗'} ${result.site}`);
    console.log(`  URL: ${result.url}`);
    console.log(`  Duration: ${result.duration}`);

    if (result.success) {
      console.log(`  Score: ${result.summary.avgScore}/100`);
      console.log(`  Issues: ${result.summary.totalIssues}`);
      console.log(`  Report: ${result.reportPath}`);
    } else {
      console.log(`  Error: ${result.error}`);
    }
  });

  // Save batch report
  const reportPath = path.join(process.cwd(), 'logs', `batch-report-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: PARALLEL ? 'parallel' : 'sequential',
    results
  }, null, 2));

  logger.success(`\nBatch report saved: ${reportPath}`);
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                   Batch SEO Audit Processing                         ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  const sites = await loadSitesConfig();

  logger.info(`Loaded ${sites.length} site(s) from ${SITES_CONFIG_FILE}`);
  logger.info(`Mode: ${PARALLEL ? `Parallel (max ${MAX_CONCURRENT} concurrent)` : 'Sequential'}`);

  const startTime = Date.now();

  const results = PARALLEL
    ? await processParallel(sites)
    : await processSequential(sites);

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  printSummaryReport(results);

  logger.info(`\nTotal execution time: ${totalDuration}s`);

  const failedCount = results.filter(r => !r.success).length;
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch(error => {
  logger.error('Batch processing failed', error);
  process.exit(1);
});
