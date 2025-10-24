#!/usr/bin/env node
/**
 * Setup Verification Script
 * Checks if everything is configured correctly before running automation
 */

import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { google } from 'googleapis';

// Try loading from both possible .env locations
dotenv.config({ path: 'config/env/.env' });
dotenv.config(); // Also try root .env

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function pass(message) {
  checks.passed.push(message);
  console.log('✅', message);
}

function fail(message) {
  checks.failed.push(message);
  console.log('❌', message);
}

function warn(message) {
  checks.warnings.push(message);
  console.log('⚠️ ', message);
}

console.log('\n🔍 Verifying SEO Automation Setup\n');
console.log('=' .repeat(60));

// Check Node version
console.log('\n📦 Environment Checks:');
const nodeVersion = process.version;
const requiredMajor = 18;
const currentMajor = parseInt(nodeVersion.slice(1).split('.')[0]);

if (currentMajor >= requiredMajor) {
  pass(`Node.js version ${nodeVersion} (>= 18.0.0 required)`);
} else {
  fail(`Node.js version ${nodeVersion} is too old. Need >= 18.0.0`);
}

// Check .env file
console.log('\n🔐 Credentials Checks:');
const envPaths = ['.env', 'config/env/.env'];
const envExists = envPaths.some(path => existsSync(path));

if (envExists) {
  const envPath = envPaths.find(path => existsSync(path));
  pass(`.env file exists at ${envPath}`);
} else {
  fail('.env file not found. Copy .env.example to .env and fill in values');
}

// Check API keys
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (anthropicKey && anthropicKey !== 'sk-ant-your-key-here') {
  pass('ANTHROPIC_API_KEY is set');
} else {
  fail('ANTHROPIC_API_KEY not configured in .env');
}

if (openaiKey && openaiKey !== 'sk-your-openai-key-here') {
  pass('OPENAI_API_KEY is set');
} else {
  warn('OPENAI_API_KEY not configured (optional, falls back to Claude)');
}

// Check WordPress credentials
const wpCreds = [
  { name: 'Instant Auto Traders', user: 'IAT_WP_USER', password: 'IAT_WP_PASSWORD' },
  { name: 'Hot Tyres', user: 'HOTTYRES_WP_USER', password: 'HOTTYRES_WP_PASSWORD' },
  { name: 'SADC', user: 'SADC_WP_USER', password: 'SADC_WP_PASSWORD' }
];

console.log('\n🌐 WordPress Credentials:');
wpCreds.forEach(({ name, user, password }) => {
  const hasUser = process.env[user];
  const hasPass = process.env[password] && process.env[password] !== 'your-wordpress-app-password-here';

  if (hasUser && hasPass) {
    pass(`${name}: Configured`);
  } else if (!hasUser && !hasPass) {
    warn(`${name}: Not configured (will fail on post updates)`);
  } else {
    fail(`${name}: Partially configured (both user and password needed)`);
  }
});

// Check Google Service Account
console.log('\n🔍 Google Search Console:');
const serviceAccountPath = 'config/google/service-account.json';

if (existsSync(serviceAccountPath)) {
  try {
    const keyFile = readFileSync(serviceAccountPath, 'utf8');
    const credentials = JSON.parse(keyFile);

    if (credentials.client_email && credentials.private_key) {
      pass('Service account JSON is valid');
      console.log(`   Email: ${credentials.client_email}`);
    } else {
      fail('Service account JSON is missing required fields');
    }
  } catch (error) {
    fail(`Service account JSON is invalid: ${error.message}`);
  }
} else {
  fail('Service account file not found at config/google/service-account.json');
}

// Check clients config
console.log('\n👥 Client Configuration:');
const clientsConfigPath = 'clients/clients-config.json';

if (existsSync(clientsConfigPath)) {
  try {
    const config = JSON.parse(readFileSync(clientsConfigPath, 'utf8'));
    const clientCount = Object.keys(config).length;
    pass(`${clientCount} clients configured in clients-config.json`);

    Object.entries(config).forEach(([id, client]) => {
      console.log(`   - ${client.name || id} (${client.status || 'unknown'})`);
    });
  } catch (error) {
    fail(`clients-config.json is invalid: ${error.message}`);
  }
} else {
  fail('clients-config.json not found');
}

// Check dependencies
console.log('\n📚 Dependencies:');
try {
  await import('googleapis');
  pass('googleapis package installed');
} catch {
  fail('googleapis not installed. Run: npm install');
}

try {
  await import('@anthropic-ai/sdk');
  pass('@anthropic-ai/sdk package installed');
} catch {
  fail('@anthropic-ai/sdk not installed. Run: npm install');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:\n');
console.log(`✅ Passed: ${checks.passed.length}`);
console.log(`⚠️  Warnings: ${checks.warnings.length}`);
console.log(`❌ Failed: ${checks.failed.length}`);

if (checks.failed.length === 0 && checks.warnings.length === 0) {
  console.log('\n🎉 Perfect! Everything is configured correctly.');
  console.log('\nNext step: Run automation for a client:');
  console.log('   node run-automation.js instantautotraders\n');
  process.exit(0);
} else if (checks.failed.length === 0) {
  console.log('\n✅ Setup is functional but has warnings.');
  console.log('You can run automation, but some features may not work.\n');
  console.log('Next step: Run automation for a client:');
  console.log('   node run-automation.js instantautotraders\n');
  process.exit(0);
} else {
  console.log('\n❌ Setup has issues that must be fixed.\n');
  console.log('Fix the failed checks above, then run this script again.');
  console.log('\nQuick fixes:');
  console.log('   - Copy .env.example to .env and fill in values');
  console.log('   - Run: npm install');
  console.log('   - Ensure config/google/service-account.json exists\n');
  process.exit(1);
}
