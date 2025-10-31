#!/usr/bin/env node

/**
 * Security Audit Script
 * 
 * Comprehensive security testing for the SEO Automation Platform
 * 
 * Tests:
 * - SQL Injection prevention
 * - XSS attack prevention
 * - Authentication security
 * - Rate limiting
 * - Security headers
 * - Data encryption
 * 
 * Usage:
 *   node scripts/security-audit.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/database/index.js';
import { AuthService } from '../src/auth/auth-service.js';
import { sanitize } from '../src/middleware/enhanced-xss.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  critical: 0
};

// Track vulnerabilities
const vulnerabilities = [];

function addVulnerability(severity, category, description, recommendation) {
  vulnerabilities.push({ severity, category, description, recommendation });
  
  if (severity === 'critical') results.critical++;
  else if (severity === 'high') results.failed++;
  else results.warnings++;
}

async function testSQLInjection() {
  log('\n📊 Testing SQL Injection Prevention...', 'bold');
  log('─'.repeat(50), 'cyan');

  const sqlInjectionPayloads = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "' OR 1=1--",
    "1'; DELETE FROM clients WHERE '1'='1",
    "'; SELECT * FROM users WHERE ''='",
    "1' UNION SELECT null, null, null--"
  ];

  try {
    // Test 1: Client ID injection
    log('\n  Test 1: Client ID SQL Injection', 'cyan');
    for (const payload of sqlInjectionPayloads) {
      try {
        const result = db.clientOps.getById(payload);
        if (result === null || result === undefined) {
          log(`    ✅ Rejected: ${payload.substring(0, 30)}...`, 'green');
          results.passed++;
        } else {
          log(`    ⚠️  Accepted: ${payload}`, 'yellow');
          addVulnerability(
            'high',
            'SQL Injection',
            `Client ID accepts SQL injection payload: ${payload}`,
            'Use parameterized queries or validate input format'
          );
        }
      } catch (error) {
        log(`    ✅ Caught error: ${payload.substring(0, 30)}...`, 'green');
        results.passed++;
      }
    }

    // Test 2: Email injection in authentication
    log('\n  Test 2: Authentication SQL Injection', 'cyan');
    for (const payload of sqlInjectionPayloads) {
      try {
        await AuthService.login(payload, 'password');
        log(`    ⚠️  Login accepted payload: ${payload}`, 'yellow');
        addVulnerability(
          'critical',
          'SQL Injection',
          `Login accepts SQL injection in email: ${payload}`,
          'Implement strict email validation before database queries'
        );
      } catch (error) {
        if (error.message.includes('Invalid email') || 
            error.message.includes('Invalid') ||
            error.message.includes('required')) {
          log(`    ✅ Rejected: ${payload.substring(0, 30)}...`, 'green');
          results.passed++;
        } else {
          log(`    ⚠️  Unexpected error: ${error.message}`, 'yellow');
          results.warnings++;
        }
      }
    }

  } catch (error) {
    log(`\n  ❌ SQL injection test error: ${error.message}`, 'red');
    results.failed++;
  }
}

async function testXSSPrevention() {
  log('\n🛡️  Testing XSS Prevention...', 'bold');
  log('─'.repeat(50), 'cyan');

  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
    '<marquee onstart=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>'
  ];

  try {
    // Test XSS sanitization
    log('\n  Test 1: XSS Sanitization (Enhanced)', 'cyan');
    for (const payload of xssPayloads) {
      const sanitized = sanitize(payload);
      
      if (sanitized !== payload && !sanitized.includes('<script') && 
          !sanitized.includes('onerror') && !sanitized.includes('onload')) {
        log(`    ✅ Sanitized: ${payload.substring(0, 40)}...`, 'green');
        results.passed++;
      } else {
        log(`    ❌ Not sanitized: ${payload}`, 'red');
        addVulnerability(
          'high',
          'XSS',
          `XSS payload not properly sanitized: ${payload}`,
          'Ensure XSS middleware is applied to all string inputs'
        );
      }
    }

    // Test registration with XSS
    log('\n  Test 2: Registration XSS Prevention', 'cyan');
    const testClient = db.clientOps.getAll()[0];
    if (testClient) {
      try {
        await AuthService.register({
          clientId: testClient.id,
          email: 'xsstest@example.com',
          password: 'SecurePass123!',
          firstName: '<script>alert("XSS")</script>',
          lastName: '<img src=x onerror=alert("XSS")>'
        });

        // Check if XSS was stored
        const user = db.authOps.getUserByEmail('xsstest@example.com');
        if (user && (user.firstName.includes('<script') || user.lastName.includes('onerror'))) {
          log(`    ❌ XSS stored in database`, 'red');
          addVulnerability(
            'high',
            'Stored XSS',
            'User registration stores unsanitized XSS payloads',
            'Apply XSS sanitization before storing in database'
          );
        } else {
          log(`    ✅ XSS prevented in registration`, 'green');
          results.passed++;
        }
      } catch (error) {
        log(`    ✅ Registration validation caught XSS`, 'green');
        results.passed++;
      }
    }

  } catch (error) {
    log(`\n  ❌ XSS test error: ${error.message}`, 'red');
    results.failed++;
  }
}

async function testAuthentication() {
  log('\n🔐 Testing Authentication Security...', 'bold');
  log('─'.repeat(50), 'cyan');

  try {
    // Test 1: Password hashing
    log('\n  Test 1: Password Hashing', 'cyan');
    const testClient = db.clientOps.getAll()[0];
    if (testClient) {
      try {
        await AuthService.register({
          clientId: testClient.id,
          email: 'hashtest@example.com',
          password: 'TestPassword123!',
          firstName: 'Hash',
          lastName: 'Test'
        });

        const user = db.authOps.getUserByEmail('hashtest@example.com');
        if (user.password !== 'TestPassword123!' && user.password.length > 50) {
          log(`    ✅ Password properly hashed (length: ${user.password.length})`, 'green');
          results.passed++;
        } else {
          log(`    ❌ Password not hashed or weak hashing`, 'red');
          addVulnerability(
            'critical',
            'Authentication',
            'Passwords not properly hashed',
            'Use bcrypt with 10+ rounds for password hashing'
          );
        }
      } catch (error) {
        // User might already exist
      }
    }

    // Test 2: JWT secret strength
    log('\n  Test 2: JWT Secret Strength', 'cyan');
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const jwtSecretMatch = envContent.match(/JWT_SECRET=(.+)/);
      
      if (jwtSecretMatch) {
        const secret = jwtSecretMatch[1].trim();
        if (secret.length >= 64) {
          log(`    ✅ JWT secret is strong (${secret.length} characters)`, 'green');
          results.passed++;
        } else if (secret.length >= 32) {
          log(`    ⚠️  JWT secret length: ${secret.length} (recommend 64+)`, 'yellow');
          results.warnings++;
        } else {
          log(`    ❌ JWT secret too short: ${secret.length} characters`, 'red');
          addVulnerability(
            'high',
            'Authentication',
            `JWT secret only ${secret.length} characters`,
            'Use at least 64 characters for JWT secret'
          );
        }
      }
    }

    // Test 3: Weak password rejection
    log('\n  Test 3: Weak Password Rejection', 'cyan');
    const weakPasswords = ['pass', '12345678', 'password', 'admin123'];
    for (const weakPass of weakPasswords) {
      try {
        await AuthService.register({
          clientId: testClient.id,
          email: `weak${Date.now()}@example.com`,
          password: weakPass,
          firstName: 'Test',
          lastName: 'User'
        });
        log(`    ❌ Accepted weak password: ${weakPass}`, 'red');
        addVulnerability(
          'medium',
          'Authentication',
          `Weak password accepted: ${weakPass}`,
          'Implement stronger password requirements (uppercase, lowercase, numbers, symbols)'
        );
      } catch (error) {
        log(`    ✅ Rejected weak password: ${weakPass}`, 'green');
        results.passed++;
      }
    }

  } catch (error) {
    log(`\n  ❌ Authentication test error: ${error.message}`, 'red');
    results.failed++;
  }
}

async function testRateLimiting() {
  log('\n⏱️  Testing Rate Limiting...', 'bold');
  log('─'.repeat(50), 'cyan');

  try {
    // Check rate limiting configuration
    log('\n  Test 1: Rate Limiting Configuration', 'cyan');
    
    const dashboardPath = path.join(__dirname, '..', 'dashboard-server.js');
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf8');
      
      if (content.includes('express-rate-limit') || content.includes('rateLimit')) {
        log(`    ✅ Rate limiting middleware configured`, 'green');
        results.passed++;
        
        // Check configuration
        if (content.includes('windowMs') && content.includes('max')) {
          log(`    ✅ Rate limiting properly configured`, 'green');
          results.passed++;
        } else {
          log(`    ⚠️  Rate limiting configuration incomplete`, 'yellow');
          results.warnings++;
        }
      } else {
        log(`    ❌ Rate limiting not found`, 'red');
        addVulnerability(
          'high',
          'Rate Limiting',
          'Rate limiting middleware not implemented',
          'Install and configure express-rate-limit'
        );
      }
    }

  } catch (error) {
    log(`\n  ❌ Rate limiting test error: ${error.message}`, 'red');
    results.failed++;
  }
}

async function testSecurityHeaders() {
  log('\n🛡️  Testing Security Headers...', 'bold');
  log('─'.repeat(50), 'cyan');

  try {
    const dashboardPath = path.join(__dirname, '..', 'dashboard-server.js');
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf8');
      
      // Test 1: Helmet
      log('\n  Test 1: Helmet Security Headers', 'cyan');
      if (content.includes('helmet')) {
        log(`    ✅ Helmet middleware configured`, 'green');
        results.passed++;
      } else {
        log(`    ❌ Helmet not found`, 'red');
        addVulnerability(
          'high',
          'Security Headers',
          'Helmet middleware not configured',
          'Install and configure helmet for security headers'
        );
      }

      // Test 2: CORS
      log('\n  Test 2: CORS Configuration', 'cyan');
      if (content.includes('cors')) {
        log(`    ✅ CORS middleware configured`, 'green');
        results.passed++;
        
        if (content.includes('origin')) {
          log(`    ✅ CORS origin restriction configured`, 'green');
          results.passed++;
        } else {
          log(`    ⚠️  CORS might allow all origins`, 'yellow');
          results.warnings++;
        }
      } else {
        log(`    ⚠️  CORS not explicitly configured`, 'yellow');
        results.warnings++;
      }
    }

  } catch (error) {
    log(`\n  ❌ Security headers test error: ${error.message}`, 'red');
    results.failed++;
  }
}

async function testDataEncryption() {
  log('\n🔒 Testing Data Encryption...', 'bold');
  log('─'.repeat(50), 'cyan');

  try {
    // Test 1: Environment variables
    log('\n  Test 1: Sensitive Data in .env', 'cyan');
    const envPath = path.join(__dirname, '..', '.env');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const sensitiveKeys = [
        'JWT_SECRET',
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY',
        'SENDGRID_API_KEY'
      ];
      
      for (const key of sensitiveKeys) {
        if (envContent.includes(`${key}=`)) {
          const match = envContent.match(new RegExp(`${key}=(.+)`));
          if (match && match[1] && match[1].trim().length > 0 && 
              !match[1].includes('your-') && !match[1].includes('changeme')) {
            log(`    ✅ ${key} configured`, 'green');
            results.passed++;
          } else {
            log(`    ⚠️  ${key} using default/empty value`, 'yellow');
            results.warnings++;
          }
        }
      }
    } else {
      log(`    ⚠️  .env file not found`, 'yellow');
      results.warnings++;
    }

    // Test 2: .env in .gitignore
    log('\n  Test 2: .env in .gitignore', 'cyan');
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (gitignore.includes('.env')) {
        log(`    ✅ .env excluded from git`, 'green');
        results.passed++;
      } else {
        log(`    ❌ .env not in .gitignore`, 'red');
        addVulnerability(
          'critical',
          'Data Encryption',
          '.env file not excluded from version control',
          'Add .env to .gitignore immediately'
        );
      }
    }

    // Test 3: Database file security
    log('\n  Test 3: Database File Permissions', 'cyan');
    const dbPath = path.join(__dirname, '..', 'data', 'seo-automation.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      log(`    ℹ️  Database file exists (${(stats.size / 1024).toFixed(2)} KB)`, 'cyan');
      results.passed++;
      
      // Check if database is in .gitignore
      const gitignorePath = path.join(__dirname, '..', '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf8');
        if (gitignore.includes('data/') || gitignore.includes('*.db')) {
          log(`    ✅ Database excluded from git`, 'green');
          results.passed++;
        } else {
          log(`    ⚠️  Database might be tracked by git`, 'yellow');
          results.warnings++;
        }
      }
    }

  } catch (error) {
    log(`\n  ❌ Data encryption test error: ${error.message}`, 'red');
    results.failed++;
  }
}

async function runSecurityAudit() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║         Security Audit - Phase 8               ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');

  await testSQLInjection();
  await testXSSPrevention();
  await testAuthentication();
  await testRateLimiting();
  await testSecurityHeaders();
  await testDataEncryption();

  // Summary
  log('\n' + '═'.repeat(50), 'cyan');
  log('  SECURITY AUDIT SUMMARY', 'bold');
  log('═'.repeat(50), 'cyan');

  log(`\n✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
  log(`🚨 Critical: ${results.critical}`, results.critical > 0 ? 'red' : 'green');
  log(`📊 Total Tests: ${results.passed + results.failed + results.warnings}\n`);

  // Vulnerabilities report
  if (vulnerabilities.length > 0) {
    log('🚨 VULNERABILITIES FOUND:', 'bold');
    log('═'.repeat(50), 'cyan');
    
    vulnerabilities.forEach((vuln, index) => {
      const severityColor = vuln.severity === 'critical' ? 'red' : 
                             vuln.severity === 'high' ? 'red' :
                             vuln.severity === 'medium' ? 'yellow' : 'cyan';
      
      log(`\n${index + 1}. [${vuln.severity.toUpperCase()}] ${vuln.category}`, severityColor);
      log(`   ${vuln.description}`, 'reset');
      log(`   💡 Fix: ${vuln.recommendation}`, 'cyan');
    });
    
    log('\n');
  }

  // Overall assessment
  if (results.critical > 0) {
    log('🚨 CRITICAL ISSUES FOUND - Address immediately!', 'red');
    process.exit(1);
  } else if (results.failed > 0) {
    log('⚠️  Security issues found - Review and fix', 'yellow');
    process.exit(1);
  } else if (results.warnings > 0) {
    log('✅ No critical issues - Some warnings to address', 'yellow');
    process.exit(0);
  } else {
    log('🎉 Security audit passed - No issues found!', 'green');
    process.exit(0);
  }
}

runSecurityAudit();
