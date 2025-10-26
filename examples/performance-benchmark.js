#!/usr/bin/env node

/**
 * Performance Benchmark Script
 * Tests API performance and generates detailed report
 */

const http = require('http');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:9000';
const API_PREFIX = '/api/v2';
const NUM_REQUESTS = 100;
const CONCURRENT_REQUESTS = 10;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class PerformanceTest {
  constructor(name, url, method = 'GET', body = null) {
    this.name = name;
    this.url = url;
    this.method = method;
    this.body = body;
    this.results = [];
  }

  async execute() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const urlObj = new URL(this.url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: this.method,
        headers: this.body ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(this.body)
        } : {}
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          resolve({
            statusCode: res.statusCode,
            duration: duration,
            success: res.statusCode >= 200 && res.statusCode < 300,
            size: data.length
          });
        });
      });

      req.on('error', reject);

      if (this.body) {
        req.write(this.body);
      }

      req.end();
    });
  }

  async run(iterations = NUM_REQUESTS) {
    console.log(`${colors.blue}Running: ${this.name}${colors.reset}`);
    console.log(`  Endpoint: ${this.method} ${this.url}`);
    console.log(`  Iterations: ${iterations}`);

    this.results = [];
    const progressBar = 50;

    for (let i = 0; i < iterations; i++) {
      try {
        const result = await this.execute();
        this.results.push(result);

        // Progress bar
        if ((i + 1) % Math.ceil(iterations / progressBar) === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        this.results.push({
          statusCode: 0,
          duration: 0,
          success: false,
          error: error.message
        });
      }
    }

    console.log(' Done!\n');
    return this.analyze();
  }

  async runConcurrent(totalRequests = NUM_REQUESTS, concurrency = CONCURRENT_REQUESTS) {
    console.log(`${colors.blue}Running: ${this.name} (Concurrent)${colors.reset}`);
    console.log(`  Endpoint: ${this.method} ${this.url}`);
    console.log(`  Total Requests: ${totalRequests}`);
    console.log(`  Concurrency: ${concurrency}`);

    this.results = [];
    const batches = Math.ceil(totalRequests / concurrency);

    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrency, totalRequests - (batch * concurrency));
      const promises = [];

      for (let i = 0; i < batchSize; i++) {
        promises.push(this.execute().catch(err => ({
          statusCode: 0,
          duration: 0,
          success: false,
          error: err.message
        })));
      }

      const batchResults = await Promise.all(promises);
      this.results.push(...batchResults);

      process.stdout.write('.');
    }

    console.log(' Done!\n');
    return this.analyze();
  }

  analyze() {
    const successfulResults = this.results.filter(r => r.success);
    const failedResults = this.results.filter(r => !r.success);

    if (successfulResults.length === 0) {
      return {
        name: this.name,
        success: false,
        error: 'All requests failed'
      };
    }

    const durations = successfulResults.map(r => r.duration);
    const sizes = successfulResults.map(r => r.size);

    durations.sort((a, b) => a - b);

    const stats = {
      name: this.name,
      url: this.url,
      method: this.method,
      totalRequests: this.results.length,
      successfulRequests: successfulResults.length,
      failedRequests: failedResults.length,
      successRate: (successfulResults.length / this.results.length * 100).toFixed(2),

      // Duration stats (ms)
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],

      // Throughput
      requestsPerSecond: (1000 / (durations.reduce((a, b) => a + b, 0) / durations.length)).toFixed(2),

      // Size stats (bytes)
      avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,

      success: true
    };

    return stats;
  }

  printResults(stats) {
    if (!stats.success) {
      console.log(`${colors.red}  ✗ ${stats.error}${colors.reset}\n`);
      return;
    }

    const passColor = stats.successRate === '100.00' ? colors.green : colors.yellow;

    console.log(`  Success Rate: ${passColor}${stats.successRate}%${colors.reset}`);
    console.log(`  Requests: ${stats.successfulRequests}/${stats.totalRequests}`);
    console.log('');
    console.log('  Duration (ms):');
    console.log(`    Min:     ${stats.minDuration.toFixed(2)}ms`);
    console.log(`    Avg:     ${stats.avgDuration.toFixed(2)}ms`);
    console.log(`    Median:  ${stats.medianDuration.toFixed(2)}ms`);
    console.log(`    Max:     ${stats.maxDuration.toFixed(2)}ms`);
    console.log(`    P95:     ${stats.p95Duration.toFixed(2)}ms`);
    console.log(`    P99:     ${stats.p99Duration.toFixed(2)}ms`);
    console.log('');
    console.log(`  Throughput: ${stats.requestsPerSecond} req/s`);
    console.log(`  Avg Response Size: ${(stats.avgSize / 1024).toFixed(2)} KB`);
    console.log('');
  }
}

async function runBenchmarks() {
  console.log('\n');
  console.log(`${colors.cyan}════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  API Performance Benchmark${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════${colors.reset}`);
  console.log('');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Iterations per test: ${NUM_REQUESTS}`);
  console.log(`Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log('');

  const tests = [
    // Keywords API
    new PerformanceTest(
      'List Keywords (paginated)',
      `${BASE_URL}${API_PREFIX}/keywords?page=1&per_page=50`
    ),
    new PerformanceTest(
      'List Keywords (filtered)',
      `${BASE_URL}${API_PREFIX}/keywords?intent=commercial&opportunity_score_min=70`
    ),
    new PerformanceTest(
      'Get Keyword Stats',
      `${BASE_URL}${API_PREFIX}/keywords/stats`
    ),

    // Research API
    new PerformanceTest(
      'List Projects',
      `${BASE_URL}${API_PREFIX}/research/projects`
    ),

    // Sync API
    new PerformanceTest(
      'Get Sync Status',
      `${BASE_URL}${API_PREFIX}/sync/status`
    ),

    // Health Check
    new PerformanceTest(
      'Health Check',
      `${BASE_URL}${API_PREFIX}/health`
    )
  ];

  const results = [];

  // Run sequential tests
  console.log(`${colors.cyan}═══ Sequential Tests ═══${colors.reset}\n`);

  for (const test of tests) {
    const stats = await test.run(NUM_REQUESTS);
    test.printResults(stats);
    results.push(stats);
  }

  // Run concurrent tests
  console.log(`${colors.cyan}═══ Concurrent Tests ═══${colors.reset}\n`);

  const concurrentTest = new PerformanceTest(
    'List Keywords (concurrent)',
    `${BASE_URL}${API_PREFIX}/keywords?page=1&per_page=10`
  );

  const concurrentStats = await concurrentTest.runConcurrent(NUM_REQUESTS, CONCURRENT_REQUESTS);
  concurrentTest.printResults(concurrentStats);
  results.push(concurrentStats);

  // Summary
  printSummary(results);

  // Performance recommendations
  printRecommendations(results);
}

function printSummary(results) {
  console.log(`${colors.cyan}════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Summary${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════${colors.reset}`);
  console.log('');

  const successfulTests = results.filter(r => r.success);
  const avgDuration = successfulTests.reduce((sum, r) => sum + r.avgDuration, 0) / successfulTests.length;
  const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const successfulRequests = results.reduce((sum, r) => sum + r.successfulRequests, 0);

  console.log(`  Total Tests: ${results.length}`);
  console.log(`  Successful Tests: ${successfulTests.length}`);
  console.log(`  Total Requests: ${totalRequests}`);
  console.log(`  Successful Requests: ${successfulRequests}`);
  console.log(`  Overall Success Rate: ${(successfulRequests/totalRequests*100).toFixed(2)}%`);
  console.log(`  Average Response Time: ${avgDuration.toFixed(2)}ms`);
  console.log('');

  // Find slowest and fastest endpoints
  const sorted = successfulTests.sort((a, b) => b.avgDuration - a.avgDuration);

  console.log(`  Slowest Endpoint: ${sorted[0].name} (${sorted[0].avgDuration.toFixed(2)}ms avg)`);
  console.log(`  Fastest Endpoint: ${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].avgDuration.toFixed(2)}ms avg)`);
  console.log('');
}

function printRecommendations(results) {
  console.log(`${colors.cyan}════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Recommendations${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════${colors.reset}`);
  console.log('');

  const recommendations = [];

  results.forEach(result => {
    if (!result.success) return;

    // Check response times
    if (result.avgDuration > 500) {
      recommendations.push({
        severity: 'high',
        message: `${result.name}: Avg response time (${result.avgDuration.toFixed(0)}ms) exceeds 500ms target`
      });
    } else if (result.avgDuration > 300) {
      recommendations.push({
        severity: 'medium',
        message: `${result.name}: Consider optimizing (${result.avgDuration.toFixed(0)}ms avg)`
      });
    }

    // Check P95
    if (result.p95Duration > 1000) {
      recommendations.push({
        severity: 'high',
        message: `${result.name}: P95 latency (${result.p95Duration.toFixed(0)}ms) is high`
      });
    }

    // Check success rate
    if (parseFloat(result.successRate) < 100) {
      recommendations.push({
        severity: 'high',
        message: `${result.name}: Success rate ${result.successRate}% - investigate failures`
      });
    }
  });

  if (recommendations.length === 0) {
    console.log(`  ${colors.green}✓ All tests passed performance targets!${colors.reset}`);
    console.log('');
    console.log('  Your API is performing well:');
    console.log('  • All endpoints respond under 500ms');
    console.log('  • 100% success rate');
    console.log('  • Good concurrent request handling');
  } else {
    recommendations.forEach(rec => {
      const color = rec.severity === 'high' ? colors.red : colors.yellow;
      const icon = rec.severity === 'high' ? '✗' : '⚠';
      console.log(`  ${color}${icon} ${rec.message}${colors.reset}`);
    });
  }

  console.log('');
  console.log('  General tips:');
  console.log('  • Add database indexes for filtered columns');
  console.log('  • Implement Redis caching for frequent queries');
  console.log('  • Use pagination for large result sets');
  console.log('  • Consider CDN for static assets');
  console.log('  • Monitor with PM2 or similar tools');
  console.log('');
}

// Run benchmarks
if (require.main === module) {
  runBenchmarks().catch(err => {
    console.error(`\n${colors.red}Error running benchmarks:${colors.reset}`, err.message);
    process.exit(1);
  });
}

module.exports = { PerformanceTest, runBenchmarks };
