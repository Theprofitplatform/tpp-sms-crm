#!/usr/bin/env node
/**
 * Health Check System Verification
 * Verifies all components are properly installed and configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('\n🔍 Health Check System - Verification\n');
console.log('='.repeat(70));

let allChecks = true;
let warnings = 0;

function checkFile(filePath, description, required = true) {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    console.log(`✅ ${description}`);
    console.log(`   📄 ${filePath}`);
    return true;
  } else {
    if (required) {
      console.log(`❌ ${description} - MISSING`);
      console.log(`   📄 ${filePath}`);
      allChecks = false;
    } else {
      console.log(`⚠️  ${description} - MISSING (optional)`);
      console.log(`   📄 ${filePath}`);
      warnings++;
    }
    return false;
  }
}

function checkNpmScript(scriptName) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.scripts && packageJson.scripts[scriptName]) {
    console.log(`✅ NPM script: ${scriptName}`);
    console.log(`   📝 ${packageJson.scripts[scriptName]}`);
    return true;
  } else {
    console.log(`❌ NPM script missing: ${scriptName}`);
    allChecks = false;
    return false;
  }
}

async function verifyHealthCheckSystem() {
  console.log('\n📦 Backend Components\n');

  checkFile(
    'src/monitoring/comprehensive-health.js',
    'Health Check Service'
  );

  checkFile(
    'src/index.js',
    'API Server (with health endpoint)'
  );

  console.log('\n🎨 Frontend Components\n');

  checkFile(
    'dashboard/src/pages/HealthCheckPage.jsx',
    'Health Check Dashboard Page'
  );

  checkFile(
    'dashboard/src/App.jsx',
    'App Router (with health route)'
  );

  checkFile(
    'dashboard/src/components/Sidebar.jsx',
    'Sidebar (with health menu)'
  );

  console.log('\n🛠️  CLI Tools\n');

  checkFile(
    'scripts/health-check.js',
    'Health Check CLI Tool'
  );

  // Check if executable
  const cliPath = path.join(projectRoot, 'scripts/health-check.js');
  if (fs.existsSync(cliPath)) {
    try {
      fs.accessSync(cliPath, fs.constants.X_OK);
      console.log('✅ CLI tool is executable');
    } catch {
      console.log('⚠️  CLI tool is not executable (use: chmod +x scripts/health-check.js)');
      warnings++;
    }
  }

  console.log('\n📚 Documentation\n');

  checkFile(
    'HEALTH_CHECK_README.md',
    'Main README'
  );

  checkFile(
    'HEALTH_CHECK_QUICK_START.md',
    'Quick Start Guide'
  );

  checkFile(
    'HEALTH_CHECK_GUIDE.md',
    'Complete Guide'
  );

  checkFile(
    'HEALTH_CHECK_IMPLEMENTATION_SUMMARY.md',
    'Implementation Summary'
  );

  console.log('\n📜 NPM Scripts\n');

  checkNpmScript('health');
  checkNpmScript('health:verbose');
  checkNpmScript('health:watch');
  checkNpmScript('health:json');

  console.log('\n🔌 API Endpoints\n');

  // Check if endpoints are defined in index.js
  const indexPath = path.join(projectRoot, 'src/index.js');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    if (indexContent.includes('/api/v2/health')) {
      console.log('✅ Comprehensive health endpoint: GET /api/v2/health');
    } else {
      console.log('❌ Missing: GET /api/v2/health');
      allChecks = false;
    }

    if (indexContent.includes("app.get('/health'")) {
      console.log('✅ Basic health endpoint: GET /health');
    } else {
      console.log('❌ Missing: GET /health');
      allChecks = false;
    }

    if (indexContent.includes('ComprehensiveHealthCheck')) {
      console.log('✅ Health check service imported');
    } else {
      console.log('❌ ComprehensiveHealthCheck not imported');
      allChecks = false;
    }
  }

  console.log('\n🎯 Dashboard Integration\n');

  // Check App.jsx for route
  const appPath = path.join(projectRoot, 'dashboard/src/App.jsx');
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');

    if (appContent.includes('HealthCheckPage')) {
      console.log('✅ HealthCheckPage imported in App.jsx');
    } else {
      console.log('❌ HealthCheckPage not imported');
      allChecks = false;
    }

    if (appContent.includes("currentSection === 'health-check'")) {
      console.log('✅ Health check route configured');
    } else {
      console.log('❌ Health check route not configured');
      allChecks = false;
    }
  }

  // Check Sidebar for menu item
  const sidebarPath = path.join(projectRoot, 'dashboard/src/components/Sidebar.jsx');
  if (fs.existsSync(sidebarPath)) {
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

    if (sidebarContent.includes('#health-check')) {
      console.log('✅ Health Check menu item in sidebar');
    } else {
      console.log('❌ Health Check menu item missing');
      allChecks = false;
    }
  }

  console.log('\n' + '='.repeat(70));

  if (allChecks && warnings === 0) {
    console.log('\n🎉 SUCCESS! All health check components verified!\n');
    console.log('✨ You can now use:');
    console.log('   • npm run health           - CLI health check');
    console.log('   • npm start                - Start API server');
    console.log('   • cd dashboard && npm run dev  - Start dashboard');
    console.log('   • Navigate to: System > Health Check\n');
    return 0;
  } else if (allChecks && warnings > 0) {
    console.log(`\n✅ All required components verified!`);
    console.log(`⚠️  ${warnings} optional warning(s)\n`);
    return 0;
  } else {
    console.log('\n❌ Some components are missing. Please review the errors above.\n');
    return 1;
  }
}

// Run verification
verifyHealthCheckSystem()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n❌ Verification error:', error.message);
    process.exit(1);
  });
