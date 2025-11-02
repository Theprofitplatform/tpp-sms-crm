/**
 * Test Database Status - Quick database query script
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'seo-automation.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('=== DATABASE STATUS CHECK ===\n');

// Issues
const issueStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open,
    SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
    SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
    SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high
  FROM seo_issues
`).get();

console.log('ISSUES:');
console.log(`  Total: ${issueStats.total}`);
console.log(`  Open: ${issueStats.open}`);
console.log(`  Resolved: ${issueStats.resolved}`);
console.log(`  Critical: ${issueStats.critical}`);
console.log(`  High: ${issueStats.high}\n`);

// Sample open issues
const openIssues = db.prepare(`
  SELECT id, pixel_id, issue_type, severity, page_url
  FROM seo_issues
  WHERE status = 'OPEN'
  LIMIT 5
`).all();

console.log('SAMPLE OPEN ISSUES:');
openIssues.forEach(issue => {
  console.log(`  [${issue.id}] ${issue.issue_type} (${issue.severity}) - Pixel ${issue.pixel_id}`);
});
console.log('');

// Notifications (notification_log table)
try {
  const notificationStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread,
      SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read
    FROM notification_log
  `).get();

  console.log('NOTIFICATIONS:');
  console.log(`  Total: ${notificationStats.total}`);
  console.log(`  Unread: ${notificationStats.unread}`);
  console.log(`  Read: ${notificationStats.read}\n`);
} catch (error) {
  console.log('NOTIFICATIONS:');
  console.log(`  ⚠️  Table does not exist (migration needed)\n`);
}

// AutoFix Proposals
try {
  const proposalStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'APPLIED' THEN 1 ELSE 0 END) as applied,
      AVG(confidence) as avg_confidence
    FROM autofix_proposals
  `).get();

  console.log('AUTOFIX PROPOSALS:');
  console.log(`  Total: ${proposalStats.total}`);
  console.log(`  Pending: ${proposalStats.pending}`);
  console.log(`  Applied: ${proposalStats.applied}`);
  console.log(`  Avg Confidence: ${proposalStats.avg_confidence || 'N/A'}\n`);
} catch (error) {
  console.log('AUTOFIX PROPOSALS:');
  console.log(`  ⚠️  Table does not exist (migration needed)\n`);
}

// Recommendations
try {
  const recommendationStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN source_type = 'PIXEL_ISSUE' THEN 1 ELSE 0 END) as from_pixel_issues
    FROM recommendations
  `).get();

  console.log('RECOMMENDATIONS:');
  console.log(`  Total: ${recommendationStats.total}`);
  console.log(`  Pending: ${recommendationStats.pending}`);
  console.log(`  Completed: ${recommendationStats.completed}`);
  console.log(`  From Pixel Issues: ${recommendationStats.from_pixel_issues}\n`);
} catch (error) {
  console.log('RECOMMENDATIONS:');
  console.log(`  ⚠️  Table does not exist (migration needed)\n`);
}

// Pixel Deployments
const pixelStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active
  FROM pixel_deployments
`).get();

console.log('PIXEL DEPLOYMENTS:');
console.log(`  Total: ${pixelStats.total}`);
console.log(`  Active: ${pixelStats.active}\n`);

db.close();
console.log('=== END DATABASE STATUS ===');
