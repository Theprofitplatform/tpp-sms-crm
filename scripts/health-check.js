#!/usr/bin/env node

/**
 * Health Check Script
 * Verify system is operational and all dependencies are available
 */

import { config } from '../env/config.js';
import { wpClient } from '../tasks/fetch-posts.js';
import { logger } from '../tasks/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXIT_OK = 0;
const EXIT_WARNING = 1;
const EXIT_ERROR = 2;

let exitCode = EXIT_OK;
const checks = {
  passed: [],
  warnings: [],
  errors: []
};

async function checkEnvironment() {
  console.log('🔍 Checking Environment...');

  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      checks.passed.push(`Node.js version: ${nodeVersion} ✓`);
    } else {
      checks.errors.push(`Node.js version too old: ${nodeVersion} (require 18+)`);
      exitCode = Math.max(exitCode, EXIT_ERROR);
    }

    // Check required directories
    const dirs = ['logs', 'env', 'tasks', 'tests'];
    for (const dir of dirs) {
      const dirPath = path.join(__dirname, '..', dir);
      if (fs.existsSync(dirPath)) {
        checks.passed.push(`Directory exists: ${dir}/ ✓`);
      } else {
        checks.errors.push(`Missing directory: ${dir}/`);
        exitCode = Math.max(exitCode, EXIT_ERROR);
      }
    }

    // Check package.json
    const packagePath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packagePath)) {
      checks.passed.push('package.json exists ✓');
    } else {
      checks.errors.push('package.json not found');
      exitCode = Math.max(exitCode, EXIT_ERROR);
    }

  } catch (error) {
    checks.errors.push(`Environment check failed: ${error.message}`);
    exitCode = Math.max(exitCode, EXIT_ERROR);
  }
}

async function checkDependencies() {
  console.log('\n📦 Checking Dependencies...');

  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    const requiredDeps = Object.keys(pkg.dependencies || {});

    for (const dep of requiredDeps) {
      try {
        await import(dep);
        checks.passed.push(`Dependency available: ${dep} ✓`);
      } catch (error) {
        checks.errors.push(`Missing dependency: ${dep}`);
        exitCode = Math.max(exitCode, EXIT_ERROR);
      }
    }

  } catch (error) {
    checks.errors.push(`Dependency check failed: ${error.message}`);
    exitCode = Math.max(exitCode, EXIT_ERROR);
  }
}

async function checkConfiguration() {
  console.log('\n⚙️  Checking Configuration...');

  try {
    // Check .env file
    const envPath = path.join(__dirname, '..', 'env', '.env');
    if (fs.existsSync(envPath)) {
      checks.passed.push('.env file exists ✓');

      // Try to validate
      try {
        config.validate();
        checks.passed.push('Configuration valid ✓');
      } catch (error) {
        checks.warnings.push(`Configuration validation: ${error.message}`);
        exitCode = Math.max(exitCode, EXIT_WARNING);
      }

    } else {
      checks.warnings.push('.env file not found (required for WordPress connection)');
      exitCode = Math.max(exitCode, EXIT_WARNING);
    }

    // Check optional configurations
    if (config.google.pagespeedApiKey) {
      checks.passed.push('PageSpeed API key configured ✓');
    } else {
      checks.warnings.push('PageSpeed API key not configured (optional)');
    }

  } catch (error) {
    checks.errors.push(`Configuration check failed: ${error.message}`);
    exitCode = Math.max(exitCode, EXIT_ERROR);
  }
}

async function checkWordPressConnection() {
  console.log('\n🔌 Checking WordPress Connection...');

  try {
    if (!config.wordpress.url) {
      checks.warnings.push('WordPress URL not configured');
      exitCode = Math.max(exitCode, EXIT_WARNING);
      return;
    }

    const result = await wpClient.testConnection();

    if (result.success) {
      checks.passed.push(`WordPress API reachable: ${config.wordpress.url} ✓`);

      // Try to fetch one post
      try {
        const { posts } = await wpClient.fetchPosts({ perPage: 1 });
        checks.passed.push(`Successfully fetched posts (count: ${posts.length}) ✓`);
      } catch (error) {
        checks.warnings.push(`Could not fetch posts: ${error.message}`);
        exitCode = Math.max(exitCode, EXIT_WARNING);
      }

    } else {
      checks.errors.push('WordPress API connection failed');
      exitCode = Math.max(exitCode, EXIT_ERROR);
    }

  } catch (error) {
    checks.warnings.push(`WordPress connection check failed: ${error.message}`);
    exitCode = Math.max(exitCode, EXIT_WARNING);
  }
}

async function checkWritePermissions() {
  console.log('\n📝 Checking Write Permissions...');

  try {
    const logsDir = path.join(__dirname, '..', 'logs');

    // Try to write a test file
    const testFile = path.join(logsDir, '.health-check-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    checks.passed.push('Logs directory writable ✓');

  } catch (error) {
    checks.errors.push(`Cannot write to logs directory: ${error.message}`);
    exitCode = Math.max(exitCode, EXIT_ERROR);
  }
}

async function checkSystemResources() {
  console.log('\n💾 Checking System Resources...');

  try {
    const used = process.memoryUsage();
    const heapUsedMB = (used.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (used.heapTotal / 1024 / 1024).toFixed(2);

    checks.passed.push(`Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB ✓`);

    // Check disk space in logs directory
    const logsDir = path.join(__dirname, '..', 'logs');
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      const totalSize = files.reduce((acc, file) => {
        const stats = fs.statSync(path.join(logsDir, file));
        return acc + stats.size;
      }, 0);
      const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
      checks.passed.push(`Logs directory size: ${sizeMB}MB ✓`);
    }

  } catch (error) {
    checks.warnings.push(`Resource check incomplete: ${error.message}`);
  }
}

function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log('HEALTH CHECK RESULTS');
  console.log('='.repeat(70));

  if (checks.passed.length > 0) {
    console.log('\n✅ PASSED:');
    checks.passed.forEach(msg => console.log(`  ${msg}`));
  }

  if (checks.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    checks.warnings.forEach(msg => console.log(`  ${msg}`));
  }

  if (checks.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    checks.errors.forEach(msg => console.log(`  ${msg}`));
  }

  console.log('\n' + '='.repeat(70));

  const total = checks.passed.length + checks.warnings.length + checks.errors.length;
  console.log(`Total checks: ${total}`);
  console.log(`Passed: ${checks.passed.length}`);
  console.log(`Warnings: ${checks.warnings.length}`);
  console.log(`Errors: ${checks.errors.length}`);

  console.log('\n' + '='.repeat(70));

  if (exitCode === EXIT_OK) {
    console.log('✅ STATUS: HEALTHY - All systems operational');
  } else if (exitCode === EXIT_WARNING) {
    console.log('⚠️  STATUS: WARNING - Some issues detected but system functional');
  } else {
    console.log('❌ STATUS: UNHEALTHY - Critical issues detected');
  }

  console.log('='.repeat(70) + '\n');
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                      System Health Check                             ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  await checkEnvironment();
  await checkDependencies();
  await checkConfiguration();
  await checkWordPressConnection();
  await checkWritePermissions();
  await checkSystemResources();

  printResults();

  process.exit(exitCode);
}

main().catch(error => {
  console.error('Health check failed:', error);
  process.exit(EXIT_ERROR);
});
