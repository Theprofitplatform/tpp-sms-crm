/**
 * DATABASE MIGRATION: Phase 4B - Recommendations & AutoFix Integration
 *
 * Adds columns for:
 * - Linking pixel issues to recommendations
 * - AutoFix engine detection
 * - Processing status tracking
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'seo-automation.db');

console.log('🔄 Starting Phase 4B Migration...\n');

try {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Start transaction
  db.prepare('BEGIN').run();

  // Check what columns exist
  console.log('Checking existing schema...');
  const seoIssuesInfo = db.pragma('table_info(seo_issues)');
  const recommendationsInfo = db.pragma('table_info(recommendations)');

  // 1. Add columns to seo_issues table
  console.log('\n1. Updating seo_issues table...');

  const hasProcessedForRecommendation = seoIssuesInfo.some(col => col.name === 'processed_for_recommendation');
  const hasRecommendationId = seoIssuesInfo.some(col => col.name === 'recommendation_id');

  if (!hasProcessedForRecommendation) {
    db.exec(`ALTER TABLE seo_issues ADD COLUMN processed_for_recommendation INTEGER DEFAULT 0`);
    console.log('✅ Added processed_for_recommendation column');
  } else {
    console.log('⏭️  processed_for_recommendation column already exists');
  }

  if (!hasRecommendationId) {
    db.exec(`ALTER TABLE seo_issues ADD COLUMN recommendation_id INTEGER`);
    console.log('✅ Added recommendation_id column');
  } else {
    console.log('⏭️  recommendation_id column already exists');
  }

  // 2. Add columns to recommendations table
  console.log('\n2. Updating recommendations table...');

  const hasPixelIssueId = recommendationsInfo.some(col => col.name === 'pixel_issue_id');
  const hasAutoFixAvailable = recommendationsInfo.some(col => col.name === 'auto_fix_available');
  const hasAutoFixEngine = recommendationsInfo.some(col => col.name === 'auto_fix_engine');

  if (!hasPixelIssueId) {
    db.exec(`ALTER TABLE recommendations ADD COLUMN pixel_issue_id INTEGER`);
    console.log('✅ Added pixel_issue_id column');
  } else {
    console.log('⏭️  pixel_issue_id column already exists');
  }

  if (!hasAutoFixAvailable) {
    db.exec(`ALTER TABLE recommendations ADD COLUMN auto_fix_available INTEGER DEFAULT 0`);
    console.log('✅ Added auto_fix_available column');
  } else {
    console.log('⏭️  auto_fix_available column already exists');
  }

  if (!hasAutoFixEngine) {
    db.exec(`ALTER TABLE recommendations ADD COLUMN auto_fix_engine TEXT`);
    console.log('✅ Added auto_fix_engine column');
  } else {
    console.log('⏭️  auto_fix_engine column already exists');
  }

  // 3. Create indexes for better performance
  console.log('\n3. Creating performance indexes...');

  const createIndexSafe = (indexName, sql) => {
    try {
      db.exec(sql);
      console.log(`✅ Created index: ${indexName}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⏭️  Index ${indexName} already exists`);
      } else {
        throw error;
      }
    }
  };

  createIndexSafe('idx_seo_issues_processed',
    'CREATE INDEX IF NOT EXISTS idx_seo_issues_processed ON seo_issues(processed_for_recommendation)');

  createIndexSafe('idx_seo_issues_recommendation',
    'CREATE INDEX IF NOT EXISTS idx_seo_issues_recommendation ON seo_issues(recommendation_id)');

  createIndexSafe('idx_recommendations_pixel_issue',
    'CREATE INDEX IF NOT EXISTS idx_recommendations_pixel_issue ON recommendations(pixel_issue_id)');

  createIndexSafe('idx_recommendations_autofix',
    'CREATE INDEX IF NOT EXISTS idx_recommendations_autofix ON recommendations(auto_fix_available)');

  // Commit transaction
  db.prepare('COMMIT').run();

  // Verify migration
  console.log('\n4. Verifying migration...');
  const updatedSeoIssuesInfo = db.pragma('table_info(seo_issues)');
  const updatedRecommendationsInfo = db.pragma('table_info(recommendations)');

  console.log(`\nseo_issues columns (${updatedSeoIssuesInfo.length} total):`);
  updatedSeoIssuesInfo.forEach(col => {
    const isNew = ['processed_for_recommendation', 'recommendation_id'].includes(col.name);
    console.log(`   ${isNew ? '🆕' : '  '} ${col.name}: ${col.type}`);
  });

  console.log(`\nrecommendations columns (${updatedRecommendationsInfo.length} total):`);
  updatedRecommendationsInfo.forEach(col => {
    const isNew = ['pixel_issue_id', 'auto_fix_available', 'auto_fix_engine'].includes(col.name);
    console.log(`   ${isNew ? '🆕' : '  '} ${col.name}: ${col.type}`);
  });

  // Get statistics
  console.log('\n5. Database statistics:');
  const seoIssuesCount = db.prepare('SELECT COUNT(*) as count FROM seo_issues').get();
  const recommendationsCount = db.prepare('SELECT COUNT(*) as count FROM recommendations').get();
  const criticalHighIssues = db.prepare(`
    SELECT COUNT(*) as count FROM seo_issues
    WHERE severity IN ('CRITICAL', 'HIGH') AND status = 'OPEN'
  `).get();

  console.log(`   - Total SEO issues: ${seoIssuesCount.count}`);
  console.log(`   - Critical/High open issues: ${criticalHighIssues.count}`);
  console.log(`   - Total recommendations: ${recommendationsCount.count}`);

  db.close();

  console.log('\n✅ Phase 4B migration completed successfully!\n');

  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
