/**
 * Engine Performance Benchmark Script
 *
 * Measures performance metrics for all 10 auto-fix engines:
 * - Detection time
 * - Memory usage
 * - Issues per second
 * - Average fix complexity
 *
 * Usage:
 *   node scripts/benchmark-engines.js
 *   node scripts/benchmark-engines.js --engine=nap-fixer
 *   node scripts/benchmark-engines.js --iterations=10
 *   node scripts/benchmark-engines.js --save-report
 */

import fs from 'fs';
import path from 'path';

// Configuration
const ITERATIONS = parseInt(process.argv.find(arg => arg.startsWith('--iterations='))?.split('=')[1]) || 3;
const SPECIFIC_ENGINE = process.argv.find(arg => arg.startsWith('--engine='))?.split('=')[1];
const SAVE_REPORT = process.argv.includes('--save-report');

// Test client
const TEST_CLIENT = {
  id: 'benchmark-client',
  siteUrl: process.env.WORDPRESS_URL || 'https://example.com',
  wpUser: process.env.WORDPRESS_USER || 'admin',
  wpPassword: process.env.WORDPRESS_APP_PASSWORD || 'password',
  businessName: 'Benchmark Business',
  phone: '+1234567890',
  email: 'benchmark@example.com',
  address: '123 Benchmark St',
  city: 'Benchmark City',
  state: 'BC',
  country: 'Test Country'
};

// All engines
const ENGINES = [
  { id: 'nap-fixer', path: './src/automation/auto-fixers/nap-fixer.js' },
  { id: 'content-optimizer-v2', path: './src/automation/auto-fixers/content-optimizer-v2.js' },
  { id: 'schema-injector-v2', path: './src/automation/auto-fixers/schema-injector-v2.js' },
  { id: 'title-meta-optimizer-v2', path: './src/automation/auto-fixers/title-meta-optimizer-v2.js' },
  { id: 'broken-link-detector-v2', path: './src/automation/auto-fixers/broken-link-detector-v2.js' },
  { id: 'image-optimizer-v2', path: './src/automation/auto-fixers/image-optimizer-v2.js' },
  { id: 'redirect-checker-v2', path: './src/automation/auto-fixers/redirect-checker-v2.js' },
  { id: 'internal-link-builder-v2', path: './src/automation/auto-fixers/internal-link-builder-v2.js' },
  { id: 'sitemap-optimizer-v2', path: './src/automation/auto-fixers/sitemap-optimizer-v2.js' },
  { id: 'robots-txt-manager-v2', path: './src/automation/auto-fixers/robots-txt-manager-v2.js' }
];

// Benchmark results
const results = {
  timestamp: new Date().toISOString(),
  iterations: ITERATIONS,
  engines: []
};

/**
 * Logger
 */
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    highlight: '\x1b[35m',
    reset: '\x1b[0m'
  };

  console.log(`${colors[type]}${message}${colors.reset}`);
}

/**
 * Format duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format bytes
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Measure memory usage
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss
  };
}

/**
 * Load engine
 */
async function loadEngine(enginePath) {
  try {
    const modulePath = path.join(process.cwd(), enginePath);
    const engineModule = await import(modulePath);
    const EngineClass = engineModule.default || engineModule[Object.keys(engineModule)[0]];
    return new EngineClass(TEST_CLIENT);
  } catch (error) {
    throw new Error(`Failed to load engine: ${error.message}`);
  }
}

/**
 * Benchmark single engine
 */
async function benchmarkEngine(engineInfo) {
  console.log(`\n${'═'.repeat(80)}`);
  log(`🔧 Benchmarking: ${engineInfo.id}`, 'highlight');
  console.log('═'.repeat(80));

  const engineResults = {
    id: engineInfo.id,
    iterations: ITERATIONS,
    runs: [],
    averages: {}
  };

  let totalIssues = 0;
  let totalTime = 0;
  let totalMemory = 0;

  for (let i = 1; i <= ITERATIONS; i++) {
    console.log(`\n📊 Iteration ${i}/${ITERATIONS}`);

    try {
      // Measure initial memory
      if (global.gc) global.gc();
      const memBefore = getMemoryUsage();

      // Load engine
      log('Loading engine...', 'info');
      const loadStart = Date.now();
      const engine = await loadEngine(engineInfo.path);
      const loadTime = Date.now() - loadStart;

      log(`Loaded in ${formatDuration(loadTime)}`, 'success');

      // Run detection
      log('Running detection...', 'info');
      const detectStart = Date.now();
      const result = await engine.runDetection({ limit: 50 });
      const detectTime = Date.now() - detectStart;

      // Measure final memory
      const memAfter = getMemoryUsage();
      const memDelta = memAfter.heapUsed - memBefore.heapUsed;

      // Calculate metrics
      const issuesFound = result.issuesDetected || 0;
      const issuesPerSecond = detectTime > 0 ? (issuesFound / (detectTime / 1000)).toFixed(2) : 0;

      totalIssues += issuesFound;
      totalTime += detectTime;
      totalMemory += Math.max(0, memDelta);

      log(`Found ${issuesFound} issues in ${formatDuration(detectTime)}`, 'success');
      log(`Performance: ${issuesPerSecond} issues/sec`, 'info');
      log(`Memory: ${formatBytes(memDelta)}`, 'info');

      // Store run data
      engineResults.runs.push({
        iteration: i,
        loadTime,
        detectTime,
        issuesFound,
        issuesPerSecond: parseFloat(issuesPerSecond),
        memoryDelta: memDelta,
        groupId: result.groupId
      });

    } catch (error) {
      log(`ERROR in iteration ${i}: ${error.message}`, 'error');
      engineResults.runs.push({
        iteration: i,
        error: error.message
      });
    }
  }

  // Calculate averages
  const successfulRuns = engineResults.runs.filter(r => !r.error);

  if (successfulRuns.length > 0) {
    engineResults.averages = {
      loadTime: (successfulRuns.reduce((sum, r) => sum + r.loadTime, 0) / successfulRuns.length).toFixed(2),
      detectTime: (successfulRuns.reduce((sum, r) => sum + r.detectTime, 0) / successfulRuns.length).toFixed(2),
      issuesFound: (successfulRuns.reduce((sum, r) => sum + r.issuesFound, 0) / successfulRuns.length).toFixed(2),
      issuesPerSecond: (successfulRuns.reduce((sum, r) => sum + r.issuesPerSecond, 0) / successfulRuns.length).toFixed(2),
      memoryDelta: Math.round(successfulRuns.reduce((sum, r) => sum + r.memoryDelta, 0) / successfulRuns.length)
    };

    console.log(`\n${'─'.repeat(80)}`);
    log('📈 AVERAGES:', 'highlight');
    console.log(`   Load Time: ${formatDuration(parseFloat(engineResults.averages.loadTime))}`);
    console.log(`   Detect Time: ${formatDuration(parseFloat(engineResults.averages.detectTime))}`);
    console.log(`   Issues Found: ${engineResults.averages.issuesFound}`);
    console.log(`   Performance: ${engineResults.averages.issuesPerSecond} issues/sec`);
    console.log(`   Memory Usage: ${formatBytes(engineResults.averages.memoryDelta)}`);
    console.log('─'.repeat(80));
  } else {
    log('⚠️  All iterations failed', 'error');
  }

  results.engines.push(engineResults);
}

/**
 * Generate comparison report
 */
function generateComparisonReport() {
  console.log(`\n${'═'.repeat(80)}`);
  log('📊 ENGINE COMPARISON', 'highlight');
  console.log('═'.repeat(80));

  // Sort by performance (issues per second)
  const sorted = [...results.engines]
    .filter(e => e.averages.issuesPerSecond)
    .sort((a, b) => parseFloat(b.averages.issuesPerSecond) - parseFloat(a.averages.issuesPerSecond));

  console.log('\n🏆 Performance Ranking (by issues/sec):');
  sorted.forEach((engine, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
    console.log(`   ${medal} ${idx + 1}. ${engine.id.padEnd(30)} ${engine.averages.issuesPerSecond} issues/sec`);
  });

  // Sort by speed (detection time)
  const sortedBySpeed = [...results.engines]
    .filter(e => e.averages.detectTime)
    .sort((a, b) => parseFloat(a.averages.detectTime) - parseFloat(b.averages.detectTime));

  console.log('\n⚡ Speed Ranking (by detection time):');
  sortedBySpeed.forEach((engine, idx) => {
    const time = formatDuration(parseFloat(engine.averages.detectTime));
    console.log(`   ${idx + 1}. ${engine.id.padEnd(30)} ${time}`);
  });

  // Sort by memory efficiency
  const sortedByMemory = [...results.engines]
    .filter(e => e.averages.memoryDelta)
    .sort((a, b) => a.averages.memoryDelta - b.averages.memoryDelta);

  console.log('\n💾 Memory Efficiency Ranking:');
  sortedByMemory.forEach((engine, idx) => {
    const mem = formatBytes(engine.averages.memoryDelta);
    console.log(`   ${idx + 1}. ${engine.id.padEnd(30)} ${mem}`);
  });

  // Overall statistics
  console.log('\n📈 Overall Statistics:');
  const totalIssues = results.engines.reduce((sum, e) => sum + (parseFloat(e.averages.issuesFound) || 0), 0);
  const avgDetectTime = results.engines.reduce((sum, e) => sum + (parseFloat(e.averages.detectTime) || 0), 0) / results.engines.length;
  const avgMemory = results.engines.reduce((sum, e) => sum + (e.averages.memoryDelta || 0), 0) / results.engines.length;

  console.log(`   Engines Tested: ${results.engines.length}`);
  console.log(`   Total Issues Found: ${totalIssues.toFixed(0)}`);
  console.log(`   Average Detect Time: ${formatDuration(avgDetectTime)}`);
  console.log(`   Average Memory Usage: ${formatBytes(avgMemory)}`);

  console.log('═'.repeat(80));
}

/**
 * Save report to file
 */
function saveReport() {
  if (!SAVE_REPORT) return;

  const reportPath = path.join(process.cwd(), 'reports', `benchmark-${Date.now()}.json`);
  const reportsDir = path.join(process.cwd(), 'reports');

  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`\n💾 Report saved to: ${reportPath}`, 'success');
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('\n' + '═'.repeat(80));
  log('⚡ ENGINE PERFORMANCE BENCHMARK', 'highlight');
  console.log('═'.repeat(80));
  console.log(`   Iterations per engine: ${ITERATIONS}`);
  console.log(`   Client: ${TEST_CLIENT.id}`);
  if (SPECIFIC_ENGINE) {
    console.log(`   Testing: ${SPECIFIC_ENGINE} only`);
  }
  console.log('═'.repeat(80));

  // Enable garbage collection if available
  if (global.gc) {
    log('✅ Manual GC enabled (--expose-gc)', 'success');
  } else {
    log('⚠️  Manual GC not available. Run with: node --expose-gc scripts/benchmark-engines.js', 'warn');
  }

  // Filter engines if specific one requested
  const enginesToTest = SPECIFIC_ENGINE
    ? ENGINES.filter(e => e.id === SPECIFIC_ENGINE)
    : ENGINES;

  if (enginesToTest.length === 0) {
    log(`❌ Engine "${SPECIFIC_ENGINE}" not found`, 'error');
    process.exit(1);
  }

  // Run benchmarks
  for (const engineInfo of enginesToTest) {
    await benchmarkEngine(engineInfo);

    // Garbage collect between engines
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate comparison report
  if (enginesToTest.length > 1) {
    generateComparisonReport();
  }

  // Save report
  saveReport();

  log('\n✅ Benchmark complete!', 'success');
  console.log('');
}

// Run benchmark
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.error(error.stack);
  process.exit(1);
});
