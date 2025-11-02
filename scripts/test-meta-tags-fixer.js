/**
 * TEST: Meta Tags Fixer
 *
 * Tests the meta-tags-fixer with sample pixel issues
 */

import MetaTagsFixer from '../src/automation/auto-fixers/meta-tags-fixer.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'seo-automation.db');

console.log('🧪 Testing Meta Tags Fixer\n');

async function testFixer() {
  try {
    const db = new Database(DB_PATH);
    const fixer = new MetaTagsFixer();

    // Get a sample issue from database
    const issue = db.prepare(`
      SELECT * FROM seo_issues
      WHERE issue_type IN ('missing_meta_description', 'missing_title', 'title_too_short')
      LIMIT 1
    `).get();

    if (!issue) {
      console.log('⚠️  No suitable issues found in database');
      console.log('Creating mock issue for testing...\n');

      // Create mock issue
      const mockIssue = {
        issue_type: 'missing_meta_description',
        page_url: 'https://example.com/test-page',
        description: 'Page is missing meta description tag',
        recommendation: 'Add a meta description between 120-160 characters describing the page content',
        severity: 'HIGH'
      };

      console.log('Testing with mock issue:');
      console.log(JSON.stringify(mockIssue, null, 2));
      console.log('\n🔧 Running fixer...\n');

      const result = await fixer.fixIssue(mockIssue);

      console.log('✅ Fix Result:');
      console.log(JSON.stringify(result, null, 2));

      // Test capabilities
      console.log('\n📋 Fixer Capabilities:');
      console.log(JSON.stringify(MetaTagsFixer.getCapabilities(), null, 2));
    } else {
      console.log('Found issue in database:');
      console.log(`  ID: ${issue.id}`);
      console.log(`  Type: ${issue.issue_type}`);
      console.log(`  Page: ${issue.page_url}`);
      console.log(`  Severity: ${issue.severity}`);
      console.log('\n🔧 Running fixer...\n');

      const result = await fixer.fixIssue(issue);

      console.log('✅ Fix Result:');
      console.log(JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('\n📝 Fix Code to Apply:');
        console.log('─'.repeat(60));
        console.log(result.fixCode);
        console.log('─'.repeat(60));

        if (result.instructions) {
          console.log('\n📋 Instructions:');
          result.instructions.forEach((instruction, i) => {
            console.log(`  ${i + 1}. ${instruction}`);
          });
        }
      }
    }

    db.close();
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFixer();
