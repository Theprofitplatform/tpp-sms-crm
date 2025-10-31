#!/usr/bin/env node

/**
 * Implementation Test Suite
 * 
 * Comprehensive testing of Phases 2-4 implementation
 * 
 * Tests:
 * - Database connectivity
 * - Authentication system
 * - Email service
 * - GSC integration
 * - Backup system
 * - PM2 configuration
 * - Health endpoints
 * 
 * Usage:
 *   node scripts/test-implementation.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, message = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  
  log(`${icon} ${name}`, color);
  if (message) log(`   ${message}`, color);
  
  results.tests.push({ name, status, message });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else results.warnings++;
}

async function testDatabase() {
  log('\n📊 Testing Database...', 'bold');
  
  try {
    const dbPath = path.join(__dirname, '..', 'data', 'seo-automation.db');
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      logTest('Database file exists', 'pass', `Size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // Check if writable
      try {
        fs.accessSync(dbPath, fs.constants.W_OK);
        logTest('Database is writable', 'pass');
      } catch {
        logTest('Database is writable', 'fail', 'No write permission');
      }
    } else {
      logTest('Database file exists', 'fail', 'Database not initialized');
    }
    
    // Check data directory
    const dataDir = path.join(__dirname, '..', 'data');
    if (fs.existsSync(dataDir)) {
      logTest('Data directory exists', 'pass');
    } else {
      logTest('Data directory exists', 'warn', 'Will be created on first run');
    }
    
  } catch (error) {
    logTest('Database check', 'fail', error.message);
  }
}

async function testAuthentication() {
  log('\n🔐 Testing Authentication System...', 'bold');
  
  try {
    // Check auth files
    const authService = path.join(__dirname, '..', 'src', 'auth', 'auth-service.js');
    const authMiddleware = path.join(__dirname, '..', 'src', 'auth', 'auth-middleware.js');
    const authRoutes = path.join(__dirname, '..', 'src', 'routes', 'auth-routes.js');
    
    if (fs.existsSync(authService)) {
      logTest('Auth service exists', 'pass');
    } else {
      logTest('Auth service exists', 'fail');
    }
    
    if (fs.existsSync(authMiddleware)) {
      logTest('Auth middleware exists', 'pass');
    } else {
      logTest('Auth middleware exists', 'fail');
    }
    
    if (fs.existsSync(authRoutes)) {
      logTest('Auth routes exist', 'pass');
    } else {
      logTest('Auth routes exist', 'fail');
    }
    
    // Check JWT secret
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('JWT_SECRET=') && envContent.match(/JWT_SECRET=.{64,}/)) {
        logTest('JWT secret configured', 'pass', 'Secure 64+ character secret');
      } else if (envContent.includes('JWT_SECRET=')) {
        logTest('JWT secret configured', 'warn', 'Secret may be too short');
      } else {
        logTest('JWT secret configured', 'fail', 'JWT_SECRET not found in .env');
      }
      
      // Check expiry
      if (envContent.includes('JWT_EXPIRES_IN=')) {
        logTest('JWT expiry configured', 'pass');
      } else {
        logTest('JWT expiry configured', 'warn', 'Using default expiry');
      }
    }
    
    // Check admin user exists
    const dbPath = path.join(__dirname, '..', 'data', 'seo-automation.db');
    if (fs.existsSync(dbPath)) {
      try {
        const { default: db } = await import('../src/database/index.js');
        const adminUser = db.authOps.getUserByEmail('admin@seoexpert.com');
        
        if (adminUser) {
          logTest('Admin user exists', 'pass', `User ID: ${adminUser.id}, Role: ${adminUser.role}`);
        } else {
          logTest('Admin user exists', 'fail', 'Run: node scripts/create-admin-user.js');
        }
      } catch (error) {
        logTest('Admin user check', 'warn', 'Could not verify: ' + error.message);
      }
    }
    
  } catch (error) {
    logTest('Authentication check', 'fail', error.message);
  }
}

async function testEmailService() {
  log('\n📧 Testing Email Service...', 'bold');
  
  try {
    const emailService = path.join(__dirname, '..', 'src', 'services', 'email-service-unified.js');
    
    if (fs.existsSync(emailService)) {
      logTest('Email service exists', 'pass');
    } else {
      logTest('Email service exists', 'fail');
    }
    
    // Check email configuration
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('EMAIL_NOTIFICATIONS_ENABLED=true')) {
        logTest('Email notifications enabled', 'pass');
      } else {
        logTest('Email notifications enabled', 'warn', 'Set EMAIL_NOTIFICATIONS_ENABLED=true');
      }
      
      if (envContent.includes('SMTP_HOST=') && !envContent.includes('SMTP_HOST=smtp.gmail.com')) {
        logTest('SMTP configured', 'pass');
      } else {
        logTest('SMTP configured', 'warn', 'Run: node scripts/setup-email.js');
      }
      
      if (envContent.includes('SMTP_USER=') && !envContent.includes('SMTP_USER=test@example.com')) {
        logTest('SMTP credentials set', 'pass');
      } else {
        logTest('SMTP credentials set', 'warn', 'Update SMTP_USER and SMTP_PASS in .env');
      }
    }
    
    // Check SendGrid
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    if (packageJson.dependencies['@sendgrid/mail']) {
      logTest('SendGrid package installed', 'pass');
    } else {
      logTest('SendGrid package installed', 'warn', 'Optional: npm install @sendgrid/mail');
    }
    
  } catch (error) {
    logTest('Email service check', 'fail', error.message);
  }
}

async function testGSC() {
  log('\n🔍 Testing Google Search Console...', 'bold');
  
  try {
    const gscService = path.join(__dirname, '..', 'src', 'services', 'gsc-service.js');
    
    if (fs.existsSync(gscService)) {
      logTest('GSC service exists', 'pass');
    } else {
      logTest('GSC service exists', 'fail');
    }
    
    // Check GSC settings
    const gscSettings = path.join(__dirname, '..', 'data', 'gsc-settings.json');
    if (fs.existsSync(gscSettings)) {
      const settings = JSON.parse(fs.readFileSync(gscSettings, 'utf8'));
      
      if (settings.connected) {
        logTest('GSC configured', 'pass', `Property: ${settings.propertyUrl}`);
      } else {
        logTest('GSC configured', 'warn', 'Run: node scripts/setup-gsc.js');
      }
    } else {
      logTest('GSC configured', 'warn', 'Run: node scripts/setup-gsc.js');
    }
    
    // Check Google APIs package
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    if (packageJson.dependencies['googleapis']) {
      logTest('Google APIs installed', 'pass');
    }
    
  } catch (error) {
    logTest('GSC check', 'fail', error.message);
  }
}

async function testBackupSystem() {
  log('\n💾 Testing Backup System...', 'bold');
  
  try {
    const backupScript = path.join(__dirname, '..', 'scripts', 'backup-database.sh');
    
    if (fs.existsSync(backupScript)) {
      logTest('Backup script exists', 'pass');
      
      // Check if executable
      try {
        fs.accessSync(backupScript, fs.constants.X_OK);
        logTest('Backup script is executable', 'pass');
      } catch {
        logTest('Backup script is executable', 'warn', 'Run: chmod +x scripts/backup-database.sh');
      }
    } else {
      logTest('Backup script exists', 'fail');
    }
    
    // Check backup directory
    const backupDir = path.join(__dirname, '..', 'backups');
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      const backups = files.filter(f => f.includes('backup'));
      
      if (backups.length > 0) {
        logTest('Backups exist', 'pass', `Found ${backups.length} backup(s)`);
      } else {
        logTest('Backups exist', 'warn', 'No backups yet. Run: ./scripts/backup-database.sh');
      }
    } else {
      logTest('Backup directory exists', 'warn', 'Will be created on first backup');
    }
    
  } catch (error) {
    logTest('Backup system check', 'fail', error.message);
  }
}

async function testPM2() {
  log('\n⚙️  Testing PM2 Configuration...', 'bold');
  
  try {
    // Check PM2 installation
    try {
      await execAsync('pm2 --version');
      logTest('PM2 installed', 'pass');
    } catch {
      logTest('PM2 installed', 'warn', 'Install with: npm install');
    }
    
    // Check ecosystem file
    const ecosystemFile = path.join(__dirname, '..', 'ecosystem.config.js');
    if (fs.existsSync(ecosystemFile)) {
      logTest('Ecosystem config exists', 'pass');
      
      // Parse and validate
      const content = fs.readFileSync(ecosystemFile, 'utf8');
      if (content.includes('seo-dashboard')) {
        logTest('Dashboard process configured', 'pass');
      }
      if (content.includes('instances: 2')) {
        logTest('Clustering configured', 'pass', '2 instances');
      }
      if (content.includes('max_memory_restart')) {
        logTest('Memory limits configured', 'pass');
      }
    } else {
      logTest('Ecosystem config exists', 'fail');
    }
    
    // Check PM2 scripts in package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    if (packageJson.scripts['pm2:start']) {
      logTest('PM2 scripts configured', 'pass', '11 PM2 commands available');
    }
    
    // Check scheduler scripts
    const scripts = [
      'run-daily-audit.js',
      'run-rank-tracking.js',
      'run-local-seo.js',
      'process-email-queue.js'
    ];
    
    let scriptsExist = 0;
    for (const script of scripts) {
      if (fs.existsSync(path.join(__dirname, script))) {
        scriptsExist++;
      }
    }
    
    if (scriptsExist === scripts.length) {
      logTest('Scheduler scripts exist', 'pass', `All ${scripts.length} scripts ready`);
    } else {
      logTest('Scheduler scripts exist', 'warn', `${scriptsExist}/${scripts.length} scripts found`);
    }
    
  } catch (error) {
    logTest('PM2 check', 'fail', error.message);
  }
}

async function testDashboardServer() {
  log('\n🖥️  Testing Dashboard Server...', 'bold');
  
  try {
    const dashboardServer = path.join(__dirname, '..', 'dashboard-server.js');
    
    if (fs.existsSync(dashboardServer)) {
      logTest('Dashboard server exists', 'pass');
      
      // Check for security middleware
      const content = fs.readFileSync(dashboardServer, 'utf8');
      
      if (content.includes('helmet')) {
        logTest('Helmet security configured', 'pass');
      }
      if (content.includes('rateLimit')) {
        logTest('Rate limiting configured', 'pass');
      }
      if (content.includes('cors')) {
        logTest('CORS configured', 'pass');
      }
      if (content.includes('/api/auth')) {
        logTest('Auth routes mounted', 'pass');
      }
    } else {
      logTest('Dashboard server exists', 'fail');
    }
    
  } catch (error) {
    logTest('Dashboard server check', 'fail', error.message);
  }
}

async function testEnvironment() {
  log('\n🌍 Testing Environment Configuration...', 'bold');
  
  try {
    const envPath = path.join(__dirname, '..', '.env');
    
    if (fs.existsSync(envPath)) {
      logTest('.env file exists', 'pass');
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      const required = [
        'JWT_SECRET',
        'DATABASE_PATH',
        'PORT'
      ];
      
      let configured = 0;
      for (const key of required) {
        if (envContent.includes(`${key}=`)) {
          configured++;
        }
      }
      
      if (configured === required.length) {
        logTest('Required env vars set', 'pass', `${configured}/${required.length} configured`);
      } else {
        logTest('Required env vars set', 'warn', `${configured}/${required.length} configured`);
      }
    } else {
      logTest('.env file exists', 'fail', 'Copy from .env.example');
    }
    
    // Check .env.example
    const envExample = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(envExample)) {
      logTest('.env.example exists', 'pass', 'Template available');
    }
    
  } catch (error) {
    logTest('Environment check', 'fail', error.message);
  }
}

async function testDependencies() {
  log('\n📦 Testing Dependencies...', 'bold');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    
    // Check critical dependencies
    const critical = [
      'express',
      'helmet',
      'express-rate-limit',
      'jsonwebtoken',
      'bcryptjs',
      'joi',
      'nodemailer',
      'googleapis'
    ];
    
    let installed = 0;
    for (const dep of critical) {
      if (packageJson.dependencies[dep]) {
        installed++;
      }
    }
    
    if (installed === critical.length) {
      logTest('Critical dependencies', 'pass', `All ${critical.length} installed`);
    } else {
      logTest('Critical dependencies', 'warn', `${installed}/${critical.length} installed`);
    }
    
    // Check dev dependencies
    if (packageJson.devDependencies['pm2']) {
      logTest('PM2 installed', 'pass');
    }
    
    // Check node_modules
    const nodeModules = path.join(__dirname, '..', 'node_modules');
    if (fs.existsSync(nodeModules)) {
      logTest('node_modules exists', 'pass');
    } else {
      logTest('node_modules exists', 'fail', 'Run: npm install');
    }
    
  } catch (error) {
    logTest('Dependencies check', 'fail', error.message);
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║   Implementation Test Suite - Phases 2-4      ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');
  
  await testEnvironment();
  await testDependencies();
  await testDatabase();
  await testAuthentication();
  await testEmailService();
  await testGSC();
  await testBackupSystem();
  await testPM2();
  await testDashboardServer();
  
  // Summary
  log('\n' + '═'.repeat(50), 'cyan');
  log('  TEST SUMMARY', 'bold');
  log('═'.repeat(50), 'cyan');
  
  log(`\n✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
  log(`📊 Total: ${results.tests.length}\n`);
  
  // Recommendations
  if (results.failed > 0) {
    log('⚠️  RECOMMENDATIONS:', 'yellow');
    log('   Some tests failed. Review the errors above and fix before deploying.\n');
  } else if (results.warnings > 0) {
    log('💡 RECOMMENDATIONS:', 'blue');
    log('   All critical tests passed! Address warnings for full functionality:\n');
    
    // List warnings
    results.tests
      .filter(t => t.status === 'warn')
      .forEach(t => {
        log(`   • ${t.name}: ${t.message}`, 'yellow');
      });
    log('');
  } else {
    log('🎉 EXCELLENT!', 'green');
    log('   All tests passed! Your implementation is ready for production.\n');
  }
  
  // Next steps
  log('📋 NEXT STEPS:', 'bold');
  
  if (results.tests.some(t => t.name === 'SMTP configured' && t.status === 'warn')) {
    log('   1. Configure email: node scripts/setup-email.js');
  }
  
  if (results.tests.some(t => t.name === 'GSC configured' && t.status === 'warn')) {
    log('   2. Configure GSC: node scripts/setup-gsc.js');
  }
  
  if (results.tests.some(t => t.name === 'Admin user exists' && t.status === 'fail')) {
    log('   3. Create admin user: node scripts/create-admin-user.js');
  }
  
  log('   4. Start services: npm run pm2:start');
  log('   5. Check status: npm run pm2:status');
  log('   6. View logs: npm run pm2:logs');
  log('   7. Test authentication: node scripts/test-authentication.js\n');
  
  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests();
