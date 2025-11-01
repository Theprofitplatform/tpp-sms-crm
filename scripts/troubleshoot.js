/**
 * Manual Review System Troubleshooting Script
 *
 * Diagnoses common issues and provides solutions
 *
 * Usage: node scripts/troubleshoot.js [--verbose] [--fix]
 *
 * Options:
 *   --verbose  Show detailed debug information
 *   --fix      Attempt to automatically fix common issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const autoFix = args.includes('--fix');

let issuesFound = 0;
let issuesFixed = 0;
let criticalIssues = 0;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(level, message, details = '') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'SUCCESS': `${colors.green}✅`,
    'ERROR': `${colors.red}❌`,
    'WARNING': `${colors.yellow}⚠️ `,
    'INFO': `${colors.blue}ℹ️ `,
    'DEBUG': `${colors.gray}🔍`,
    'FIX': `${colors.green}🔧`
  }[level] || '';

  console.log(`${prefix} ${message}${colors.reset}`);

  if (details && verbose) {
    console.log(`${colors.gray}   ${details}${colors.reset}`);
  }
}

function section(title) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log('='.repeat(70) + '\n');
}

async function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);

  if (major >= 16) {
    log('SUCCESS', `Node.js version: ${version}`);
    return true;
  } else {
    log('ERROR', `Node.js version ${version} is too old. Requires 16+`);
    log('INFO', 'Solution: Install Node.js 16 or higher from https://nodejs.org/');
    criticalIssues++;
    return false;
  }
}

async function checkRequiredFiles() {
  const requiredFiles = [
    { path: 'src/automation/auto-fixers/nap-fixer.js', critical: true },
    { path: 'src/automation/auto-fixers/content-optimizer-v2.js', critical: true },
    { path: 'src/automation/auto-fixers/schema-injector-v2.js', critical: true },
    { path: 'src/services/proposal-service.js', critical: true },
    { path: 'src/api/autofix-review-routes.js', critical: true },
    { path: 'database.db', critical: false },
    { path: 'package.json', critical: true }
  ];

  let allPresent = true;

  for (const file of requiredFiles) {
    const fullPath = path.join(projectRoot, file.path);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      log('SUCCESS', `Found: ${file.path}`);

      if (verbose) {
        const stats = fs.statSync(fullPath);
        log('DEBUG', '', `Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
      }
    } else {
      if (file.critical) {
        log('ERROR', `Missing critical file: ${file.path}`);
        log('INFO', `Solution: Ensure all source files are properly installed`);
        criticalIssues++;
        allPresent = false;
      } else {
        log('WARNING', `Missing optional file: ${file.path}`);
        issuesFound++;
      }
    }
  }

  return allPresent;
}

async function checkDatabase() {
  const dbPath = path.join(projectRoot, 'database.db');

  if (!fs.existsSync(dbPath)) {
    log('WARNING', 'Database file not found');
    log('INFO', 'Solution: Database will be created on first use');
    issuesFound++;
    return false;
  }

  try {
    // Check if we can import sqlite3
    const sqlite3 = await import('sqlite3').catch(() => null);

    if (!sqlite3) {
      log('WARNING', 'sqlite3 module not installed');
      log('INFO', 'Solution: Run: npm install sqlite3');
      issuesFound++;
      return false;
    }

    log('SUCCESS', 'Database file exists');

    if (verbose) {
      const stats = fs.statSync(dbPath);
      log('DEBUG', '', `Database size: ${(stats.size / 1024).toFixed(2)} KB`);
    }

    // Try to open database
    const Database = sqlite3.default.Database;
    const db = new Database(dbPath);

    return new Promise((resolve) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='autofix_proposals'", (err, row) => {
        if (err) {
          log('ERROR', 'Failed to query database');
          log('INFO', 'Solution: Database may be corrupted. Try deleting and recreating it');
          issuesFound++;
          db.close();
          resolve(false);
          return;
        }

        if (!row) {
          log('WARNING', 'Database tables not initialized');
          log('INFO', 'Solution: Tables will be created on first API call');
          issuesFound++;
          db.close();
          resolve(false);
          return;
        }

        log('SUCCESS', 'Database tables exist');

        // Count proposals
        db.get("SELECT COUNT(*) as count FROM autofix_proposals", (err, countRow) => {
          if (!err && countRow) {
            log('INFO', `Database contains ${countRow.count} proposals`);
          }
          db.close();
          resolve(true);
        });
      });
    });

  } catch (error) {
    log('ERROR', 'Database check failed: ' + error.message);
    issuesFound++;
    return false;
  }
}

async function checkAPIServer() {
  const port = 4000; // Default port

  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/autofix/statistics`, (res) => {
      if (res.statusCode === 200) {
        log('SUCCESS', `API server is running on port ${port}`);

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (verbose) {
            try {
              const stats = JSON.parse(data);
              log('DEBUG', '', `Statistics: ${JSON.stringify(stats, null, 2)}`);
            } catch (e) {
              // Ignore parse errors
            }
          }
        });

        resolve(true);
      } else {
        log('WARNING', `API server returned status ${res.statusCode}`);
        issuesFound++;
        resolve(false);
      }
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        log('WARNING', 'API server is not running');
        log('INFO', 'Solution: Start the server with: npm start');
        log('INFO', 'Or with PM2: pm2 start npm --name "autofix-api" -- start');
        issuesFound++;
      } else {
        log('ERROR', `API server check failed: ${error.message}`);
        issuesFound++;
      }
      resolve(false);
    });

    req.end();
  });
}

async function checkClientConfiguration() {
  const clientsDir = path.join(projectRoot, 'clients');

  if (!fs.existsSync(clientsDir)) {
    log('WARNING', 'Clients directory not found');
    log('INFO', 'Solution: Create clients/ directory with client .env files');
    issuesFound++;
    return false;
  }

  const files = fs.readdirSync(clientsDir).filter(f => f.endsWith('.env'));

  if (files.length === 0) {
    log('WARNING', 'No client configurations found');
    log('INFO', 'Solution: Create at least one client .env file in clients/ directory');
    log('INFO', 'Example: clients/my-client.env');
    issuesFound++;
    return false;
  }

  log('SUCCESS', `Found ${files.length} client configuration(s)`);

  if (verbose) {
    files.forEach(file => {
      log('DEBUG', '', `Client config: ${file}`);
    });
  }

  // Check first client config for required fields
  const firstClient = path.join(clientsDir, files[0]);
  const content = fs.readFileSync(firstClient, 'utf8');

  const requiredVars = ['WORDPRESS_URL', 'WORDPRESS_USER', 'WORDPRESS_APP_PASSWORD'];
  const missingVars = requiredVars.filter(v => !content.includes(v));

  if (missingVars.length > 0) {
    log('WARNING', `Client config ${files[0]} missing variables: ${missingVars.join(', ')}`);
    log('INFO', 'Solution: Add missing environment variables to client config');
    issuesFound++;
    return false;
  }

  log('SUCCESS', 'Client configuration appears valid');
  return true;
}

async function checkWordPressConnection() {
  // This would require loading a client config and testing the WordPress API
  // For now, we'll just check if credentials are configured

  const clientsDir = path.join(projectRoot, 'clients');

  if (!fs.existsSync(clientsDir)) {
    log('INFO', 'Skipping WordPress connection test (no clients configured)');
    return null;
  }

  const files = fs.readdirSync(clientsDir).filter(f => f.endsWith('.env'));

  if (files.length === 0) {
    log('INFO', 'Skipping WordPress connection test (no clients configured)');
    return null;
  }

  log('INFO', 'WordPress connection test requires running API server');
  log('INFO', 'Test manually with: curl -X POST http://localhost:4000/api/autofix/detect');

  return null;
}

async function checkDependencies() {
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    log('ERROR', 'package.json not found');
    criticalIssues++;
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const criticalDeps = ['express', 'sqlite3', 'dotenv'];
  const missing = [];

  for (const dep of criticalDeps) {
    if (!dependencies[dep]) {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    log('WARNING', `Missing dependencies: ${missing.join(', ')}`);
    log('INFO', 'Solution: Run: npm install');
    issuesFound++;
    return false;
  }

  log('SUCCESS', 'All critical dependencies listed in package.json');

  // Check if node_modules exists
  const nodeModulesPath = path.join(projectRoot, 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    log('WARNING', 'node_modules directory not found');
    log('INFO', 'Solution: Run: npm install');

    if (autoFix) {
      log('FIX', 'Attempting to run npm install...');
      // Note: Would require child_process to actually run npm install
      log('INFO', 'Auto-fix not implemented for npm install. Please run manually.');
    }

    issuesFound++;
    return false;
  }

  log('SUCCESS', 'node_modules directory exists');
  return true;
}

async function checkPermissions() {
  const dbPath = path.join(projectRoot, 'database.db');

  if (fs.existsSync(dbPath)) {
    try {
      fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      log('SUCCESS', 'Database file is readable and writable');
    } catch (error) {
      log('ERROR', 'Database file permissions issue');
      log('INFO', 'Solution: chmod 600 database.db');

      if (autoFix) {
        try {
          fs.chmodSync(dbPath, 0o600);
          log('FIX', 'Fixed database permissions');
          issuesFixed++;
        } catch (fixError) {
          log('ERROR', 'Failed to fix permissions: ' + fixError.message);
        }
      }

      issuesFound++;
      return false;
    }
  }

  const clientsDir = path.join(projectRoot, 'clients');

  if (fs.existsSync(clientsDir)) {
    const files = fs.readdirSync(clientsDir).filter(f => f.endsWith('.env'));

    for (const file of files) {
      const filePath = path.join(clientsDir, file);
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
        // Check if it's too permissive
        const stats = fs.statSync(filePath);
        const mode = stats.mode & 0o777;

        if (mode !== 0o600 && mode !== 0o400) {
          log('WARNING', `Client config ${file} has permissive permissions: ${mode.toString(8)}`);
          log('INFO', 'Solution: chmod 600 clients/*.env');

          if (autoFix) {
            try {
              fs.chmodSync(filePath, 0o600);
              log('FIX', `Fixed permissions for ${file}`);
              issuesFixed++;
            } catch (fixError) {
              log('ERROR', 'Failed to fix permissions: ' + fixError.message);
            }
          }

          issuesFound++;
        }
      } catch (error) {
        log('WARNING', `Cannot read client config ${file}`);
        issuesFound++;
      }
    }
  }

  return true;
}

async function checkEngines() {
  const engines = [
    'src/automation/auto-fixers/nap-fixer.js',
    'src/automation/auto-fixers/content-optimizer-v2.js',
    'src/automation/auto-fixers/schema-injector-v2.js'
  ];

  for (const enginePath of engines) {
    const fullPath = path.join(projectRoot, enginePath);

    if (!fs.existsSync(fullPath)) {
      log('ERROR', `Engine not found: ${enginePath}`);
      issuesFound++;
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');

    // Check if it extends AutoFixEngineBase
    if (!content.includes('extends AutoFixEngineBase')) {
      log('WARNING', `Engine ${path.basename(enginePath)} may not extend AutoFixEngineBase`);
      issuesFound++;
    }

    // Check for required methods
    const requiredMethods = ['detectIssues', 'applyFix'];
    const missing = requiredMethods.filter(method => !content.includes(method));

    if (missing.length > 0) {
      log('WARNING', `Engine ${path.basename(enginePath)} missing methods: ${missing.join(', ')}`);
      issuesFound++;
    } else {
      log('SUCCESS', `Engine ${path.basename(enginePath)} structure looks good`);
    }
  }

  return true;
}

async function checkLogs() {
  const logsDir = path.join(projectRoot, 'logs');

  if (!fs.existsSync(logsDir)) {
    log('INFO', 'Logs directory not found (optional)');
    log('INFO', 'Tip: Create logs/ directory to enable file logging');
    return true;
  }

  try {
    fs.accessSync(logsDir, fs.constants.W_OK);
    log('SUCCESS', 'Logs directory is writable');
  } catch (error) {
    log('WARNING', 'Logs directory is not writable');
    log('INFO', 'Solution: chmod 755 logs/');
    issuesFound++;
  }

  return true;
}

async function generateReport() {
  section('TROUBLESHOOTING SUMMARY');

  console.log(`Total Issues Found: ${issuesFound}`);
  console.log(`Critical Issues: ${criticalIssues}`);

  if (autoFix) {
    console.log(`Issues Fixed: ${issuesFixed}`);
  }

  console.log('');

  if (criticalIssues > 0) {
    log('ERROR', 'System has critical issues that must be fixed before use');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Fix critical issues listed above');
    console.log('2. Run this script again to verify fixes');
    console.log('3. Run health check: node scripts/health-check.js');
    return false;
  } else if (issuesFound > 0) {
    log('WARNING', `System has ${issuesFound} non-critical issues`);
    console.log('');
    console.log('Next Steps:');
    console.log('1. Review warnings above');
    console.log('2. Fix issues if needed');
    console.log('3. System should work but may have reduced functionality');
    return true;
  } else {
    log('SUCCESS', 'No issues found! System appears healthy');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Start API server: npm start');
    console.log('2. Run test workflow: node test-manual-review-workflow.js');
    console.log('3. Check API: curl http://localhost:4000/api/autofix/statistics');
    return true;
  }
}

async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║  Manual Review System - Troubleshooting Diagnostic                ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (verbose) {
    log('INFO', 'Running in verbose mode');
  }

  if (autoFix) {
    log('INFO', 'Auto-fix mode enabled');
  }

  console.log('');

  section('ENVIRONMENT CHECKS');
  await checkNodeVersion();

  section('FILE SYSTEM CHECKS');
  await checkRequiredFiles();
  await checkPermissions();

  section('DEPENDENCY CHECKS');
  await checkDependencies();

  section('DATABASE CHECKS');
  await checkDatabase();

  section('CONFIGURATION CHECKS');
  await checkClientConfiguration();

  section('ENGINE CHECKS');
  await checkEngines();

  section('API SERVER CHECKS');
  await checkAPIServer();

  section('WORDPRESS CONNECTION');
  await checkWordPressConnection();

  section('OPTIONAL CHECKS');
  await checkLogs();

  const healthy = await generateReport();

  console.log('');
  console.log('='.repeat(70));
  console.log('');
  console.log('For more help, see:');
  console.log('- MANUAL_REVIEW_README.md - System overview');
  console.log('- GET_STARTED_CHECKLIST.md - Setup guide');
  console.log('- API_QUICK_REFERENCE.md - API examples');
  console.log('');

  process.exit(healthy && criticalIssues === 0 ? 0 : 1);
}

main();
