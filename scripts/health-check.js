/**
 * Manual Review System Health Check
 * Run with: node scripts/health-check.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🏥 Manual Review System Health Check\n');
console.log('='.repeat(70));

let allPassed = true;
let warnings = 0;

function checkFile(filePath, required = true) {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(\`✅ \${filePath}\`);
    return true;
  } else {
    if (required) {
      console.log(\`❌ \${filePath} - MISSING\`);
      allPassed = false;
    } else {
      console.log(\`⚠️  \${filePath} - MISSING (optional)\`);
      warnings++;
    }
    return false;
  }
}

async function runHealthCheck() {
  console.log('\n📋 Checking Core Files\n');
  checkFile('src/automation/auto-fixers/nap-fixer.js');
  checkFile('src/automation/auto-fixers/content-optimizer-v2.js');
  checkFile('src/automation/auto-fixers/schema-injector-v2.js');
  checkFile('src/services/proposal-service.js');
  checkFile('src/api/autofix-review-routes.js');
  
  console.log('\n📋 Checking Documentation\n');
  checkFile('GET_STARTED_CHECKLIST.md');
  checkFile('MANUAL_REVIEW_README.md');
  
  console.log('\n='.repeat(70));
  if (allPassed) {
    console.log('✅ All required files present!\n');
  } else {
    console.log('❌ Some files missing. See above.\n');
  }
  console.log('='.repeat(70));
}

runHealthCheck();
