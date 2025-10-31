#!/usr/bin/env node

/**
 * Auto-Fix Engine Upgrade Verification Script
 * 
 * Verifies that all upgrade components are properly installed and configured
 */

import fs from 'fs';
import path from 'path';

class UpgradeVerifier {
  constructor() {
    this.checks = [];
    this.warnings = [];
    this.errors = [];
  }

  check(name, condition, errorMsg = null, warningMsg = null) {
    if (condition) {
      this.checks.push({ name, status: '✅', type: 'pass' });
      return true;
    } else {
      if (errorMsg) {
        this.checks.push({ name, status: '❌', type: 'error', message: errorMsg });
        this.errors.push({ name, message: errorMsg });
      } else if (warningMsg) {
        this.checks.push({ name, status: '⚠️', type: 'warning', message: warningMsg });
        this.warnings.push({ name, message: warningMsg });
      } else {
        this.checks.push({ name, status: '❌', type: 'error' });
        this.errors.push({ name });
      }
      return false;
    }
  }

  fileExists(filepath) {
    try {
      return fs.existsSync(filepath);
    } catch {
      return false;
    }
  }

  async run() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║        🔍 AUTO-FIX UPGRADE VERIFICATION 🔍                   ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Verifying upgrade components...\n');

    // 1. Check new auto-fix engines
    console.log('1️⃣  Checking Auto-Fix Engines...');
    this.check(
      'Meta Description Optimizer',
      this.fileExists('src/automation/auto-fixers/meta-description-optimizer.js'),
      'Missing: src/automation/auto-fixers/meta-description-optimizer.js'
    );
    this.check(
      'Broken Link Detector',
      this.fileExists('src/automation/auto-fixers/broken-link-detector.js'),
      'Missing: src/automation/auto-fixers/broken-link-detector.js'
    );
    this.check(
      'Duplicate Content Detector',
      this.fileExists('src/automation/auto-fixers/duplicate-content-detector.js'),
      'Missing: src/automation/auto-fixers/duplicate-content-detector.js'
    );
    this.check(
      'Core Web Vitals Optimizer',
      this.fileExists('src/automation/auto-fixers/core-web-vitals-optimizer.js'),
      'Missing: src/automation/auto-fixers/core-web-vitals-optimizer.js'
    );
    this.check(
      'Accessibility Fixer',
      this.fileExists('src/automation/auto-fixers/accessibility-fixer.js'),
      'Missing: src/automation/auto-fixers/accessibility-fixer.js'
    );

    // 2. Check services
    console.log('\n2️⃣  Checking Services...');
    this.check(
      'AI Content Suggestions',
      this.fileExists('src/services/ai-content-suggestions.js'),
      'Missing: src/services/ai-content-suggestions.js'
    );
    this.check(
      'Auto-Fix Queue',
      this.fileExists('src/services/autofix-queue.js'),
      'Missing: src/services/autofix-queue.js'
    );
    this.check(
      'Redis Cache',
      this.fileExists('src/services/redis-cache.js'),
      'Missing: src/services/redis-cache.js'
    );

    // 3. Check orchestrator
    console.log('\n3️⃣  Checking Orchestrator...');
    this.check(
      'Master Orchestrator v2.0',
      this.fileExists('auto-fix-all-upgraded.js'),
      'Missing: auto-fix-all-upgraded.js'
    );
    this.check(
      'Orchestrator Executable',
      this.fileExists('auto-fix-all-upgraded.js') && 
      (fs.statSync('auto-fix-all-upgraded.js').mode & 0o111) !== 0,
      null,
      'auto-fix-all-upgraded.js not executable (run: chmod +x auto-fix-all-upgraded.js)'
    );

    // 4. Check testing
    console.log('\n4️⃣  Checking Testing Tools...');
    this.check(
      'Test Suite',
      this.fileExists('test-autofix-upgrade.js'),
      'Missing: test-autofix-upgrade.js'
    );
    this.check(
      'Performance Monitor',
      this.fileExists('monitor-autofix-performance.js'),
      'Missing: monitor-autofix-performance.js'
    );
    this.check(
      'Verification Script',
      this.fileExists('verify-upgrade.js'),
      'Missing: verify-upgrade.js'
    );

    // 5. Check documentation
    console.log('\n5️⃣  Checking Documentation...');
    this.check(
      'Start Here Guide',
      this.fileExists('START_HERE_AUTOFIX_UPGRADE.md'),
      'Missing: START_HERE_AUTOFIX_UPGRADE.md'
    );
    this.check(
      'Quick Start Guide',
      this.fileExists('AUTOFIX_QUICK_START.md'),
      'Missing: AUTOFIX_QUICK_START.md'
    );
    this.check(
      'Complete Documentation',
      this.fileExists('AUTOFIX_ENGINE_COMPLETE_UPGRADE.md'),
      'Missing: AUTOFIX_ENGINE_COMPLETE_UPGRADE.md'
    );
    this.check(
      'Migration Guide',
      this.fileExists('MIGRATION_GUIDE.md'),
      'Missing: MIGRATION_GUIDE.md'
    );
    this.check(
      'NPM Scripts Guide',
      this.fileExists('npm-scripts-guide.md'),
      'Missing: npm-scripts-guide.md'
    );
    this.check(
      'README',
      this.fileExists('README_AUTOFIX_UPGRADE.md'),
      'Missing: README_AUTOFIX_UPGRADE.md'
    );

    // 6. Check package.json
    console.log('\n6️⃣  Checking NPM Configuration...');
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      this.check(
        'autofix:test script',
        packageJson.scripts && packageJson.scripts['autofix:test'],
        'Missing npm script: autofix:test'
      );
      this.check(
        'autofix:parallel script',
        packageJson.scripts && packageJson.scripts['autofix:parallel'],
        'Missing npm script: autofix:parallel'
      );
      this.check(
        'autofix:ai script',
        packageJson.scripts && packageJson.scripts['autofix:ai'],
        'Missing npm script: autofix:ai'
      );
      this.check(
        'bullmq dependency',
        packageJson.dependencies && packageJson.dependencies['bullmq'],
        'Missing dependency: bullmq'
      );
      this.check(
        'ioredis dependency',
        packageJson.dependencies && packageJson.dependencies['ioredis'],
        'Missing dependency: ioredis'
      );
    } catch (error) {
      this.check('package.json', false, `Error reading package.json: ${error.message}`);
    }

    // 7. Check optional components
    console.log('\n7️⃣  Checking Optional Components...');
    
    // Check Redis
    try {
      const { execSync } = await import('child_process');
      execSync('redis-cli ping', { stdio: 'ignore' });
      this.check('Redis Server', true);
    } catch {
      this.check(
        'Redis Server',
        false,
        null,
        'Redis not running (optional - install: sudo apt-get install redis-server)'
      );
    }

    // Check OpenAI key
    this.check(
      'OpenAI API Key',
      !!process.env.OPENAI_API_KEY,
      null,
      'OPENAI_API_KEY not set (optional - for AI features)'
    );

    // 8. Check directories
    console.log('\n8️⃣  Checking Directories...');
    this.check(
      'Logs Directory',
      this.fileExists('logs'),
      null,
      'logs/ directory missing (will be created on first run)'
    );
    this.check(
      'Clients Directory',
      this.fileExists('clients'),
      'Missing: clients/ directory'
    );

    // Print results
    this.printResults();

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }

  printResults() {
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 VERIFICATION RESULTS\n');

    // Print all checks
    this.checks.forEach(check => {
      console.log(`${check.status} ${check.name}`);
      if (check.message) {
        console.log(`   ${check.message}`);
      }
    });

    // Summary
    console.log('\n' + '─'.repeat(70));
    console.log('\n📈 SUMMARY\n');
    
    const passed = this.checks.filter(c => c.type === 'pass').length;
    const warnings = this.warnings.length;
    const errors = this.errors.length;
    const total = this.checks.length;

    console.log(`✅ Passed:   ${passed}/${total}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Errors:   ${errors}`);

    if (errors === 0 && warnings === 0) {
      console.log('\n🎉 ALL CHECKS PASSED!\n');
      console.log('Your auto-fix upgrade is complete and ready to use.\n');
      console.log('Next steps:');
      console.log('  1. Run tests: npm run autofix:test');
      console.log('  2. Preview: npm run autofix:dry-run');
      console.log('  3. Execute: npm run autofix:parallel');
    } else if (errors === 0) {
      console.log('\n✅ CORE COMPONENTS VERIFIED\n');
      console.log(`${warnings} optional component(s) missing (see warnings above).\n`);
      console.log('System will work, but with reduced features.\n');
      console.log('Next steps:');
      console.log('  1. Review warnings above');
      console.log('  2. Run tests: npm run autofix:test');
      console.log('  3. Execute: npm run autofix:parallel');
    } else {
      console.log('\n❌ VERIFICATION FAILED\n');
      console.log(`${errors} critical component(s) missing.\n`);
      console.log('Please review errors above and ensure all files are created.\n');
    }

    console.log('═'.repeat(70) + '\n');
  }
}

// Run verification
const verifier = new UpgradeVerifier();
verifier.run().catch(error => {
  console.error('\n❌ Verification error:', error.message);
  process.exit(1);
});
