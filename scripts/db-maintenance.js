/**
 * Database Maintenance Utilities
 *
 * Provides tools for maintaining the manual review database
 *
 * Usage:
 *   node scripts/db-maintenance.js cleanup [--days=7] [--dry-run]
 *   node scripts/db-maintenance.js optimize
 *   node scripts/db-maintenance.js backup [--output=path]
 *   node scripts/db-maintenance.js stats
 *   node scripts/db-maintenance.js archive [--days=30]
 *   node scripts/db-maintenance.js reset [--confirm]
 *
 * Examples:
 *   node scripts/db-maintenance.js cleanup --days=14
 *   node scripts/db-maintenance.js backup --output=./backups/
 *   node scripts/db-maintenance.js stats
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'database.db');

const args = process.argv.slice(2);
const command = args[0];
const options = {};

// Parse options
args.slice(1).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    options[key] = value || true;
  }
});

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(level, message) {
  const prefix = {
    'success': `${colors.green}✅`,
    'error': `${colors.red}❌`,
    'warning': `${colors.yellow}⚠️ `,
    'info': `${colors.blue}ℹ️ `,
    'data': `${colors.cyan}📊`
  }[level] || '';

  console.log(`${prefix} ${message}${colors.reset}`);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dbPath)) {
      reject(new Error(`Database not found at ${dbPath}`));
      return;
    }

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

async function cleanupOldProposals(db, daysOld = 7, dryRun = false) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}Cleanup Old Proposals${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoffTimestamp = cutoffDate.toISOString();

  log('info', `Looking for proposals older than ${daysOld} days (before ${cutoffDate.toLocaleDateString()})`);

  if (dryRun) {
    log('warning', 'DRY RUN MODE - No changes will be made');
  }

  // Find old proposals by status
  const byStatus = await query(db, `
    SELECT status, COUNT(*) as count
    FROM autofix_proposals
    WHERE created_at < ?
    GROUP BY status
  `, [cutoffTimestamp]);

  if (byStatus.length === 0) {
    log('success', 'No old proposals found');
    return;
  }

  console.log('\nOld proposals by status:');
  let totalCount = 0;
  byStatus.forEach(row => {
    console.log(`  ${row.status.padEnd(15)}: ${row.count}`);
    totalCount += row.count;
  });

  console.log(`  ${'-'.repeat(25)}`);
  console.log(`  ${'Total'.padEnd(15)}: ${totalCount}\n`);

  // Strategy: Delete 'applied' and 'rejected' proposals, keep 'pending' and 'approved'
  const toDelete = await query(db, `
    SELECT id, status, created_at
    FROM autofix_proposals
    WHERE created_at < ?
    AND status IN ('applied', 'rejected', 'failed')
  `, [cutoffTimestamp]);

  if (toDelete.length === 0) {
    log('info', 'No proposals eligible for cleanup (keeping pending and approved)');
    return;
  }

  log('info', `Found ${toDelete.length} proposals eligible for deletion`);
  log('info', 'Criteria: status in (applied, rejected, failed) and older than cutoff');

  if (!dryRun) {
    const result = await run(db, `
      DELETE FROM autofix_proposals
      WHERE created_at < ?
      AND status IN ('applied', 'rejected', 'failed')
    `, [cutoffTimestamp]);

    log('success', `Deleted ${result.changes} old proposals`);

    // Cleanup orphaned sessions
    const sessionResult = await run(db, `
      DELETE FROM autofix_review_sessions
      WHERE id NOT IN (SELECT DISTINCT session_id FROM autofix_proposals WHERE session_id IS NOT NULL)
    `);

    if (sessionResult.changes > 0) {
      log('success', `Cleaned up ${sessionResult.changes} orphaned sessions`);
    }
  } else {
    log('info', `Would delete ${toDelete.length} proposals (dry run)`);
  }

  console.log('');
}

async function optimizeDatabase(db) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}Optimize Database${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

  // Get database size before
  const statsBefore = fs.statSync(dbPath);
  const sizeBefore = statsBefore.size;

  log('info', `Database size before: ${(sizeBefore / 1024).toFixed(2)} KB`);

  // Run VACUUM to reclaim space
  log('info', 'Running VACUUM...');
  await run(db, 'VACUUM');
  log('success', 'VACUUM completed');

  // Run ANALYZE to update statistics
  log('info', 'Running ANALYZE...');
  await run(db, 'ANALYZE');
  log('success', 'ANALYZE completed');

  // Rebuild indexes
  log('info', 'Rebuilding indexes...');
  await run(db, 'REINDEX');
  log('success', 'REINDEX completed');

  // Get database size after
  const statsAfter = fs.statSync(dbPath);
  const sizeAfter = statsAfter.size;

  const saved = sizeBefore - sizeAfter;
  const percentSaved = ((saved / sizeBefore) * 100).toFixed(2);

  log('data', `Database size after: ${(sizeAfter / 1024).toFixed(2)} KB`);

  if (saved > 0) {
    log('success', `Reclaimed ${(saved / 1024).toFixed(2)} KB (${percentSaved}%)`);
  } else {
    log('info', 'No space reclaimed (database already optimized)');
  }

  console.log('');
}

async function backupDatabase(outputDir = null) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}Backup Database${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const defaultBackupDir = path.join(projectRoot, 'backups');

  const backupDir = outputDir || defaultBackupDir;

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    log('info', `Created backup directory: ${backupDir}`);
  }

  const backupPath = path.join(backupDir, `database-backup-${timestamp}.db`);

  log('info', `Backing up database to: ${backupPath}`);

  // Copy database file
  fs.copyFileSync(dbPath, backupPath);

  const stats = fs.statSync(backupPath);
  log('success', `Backup created: ${(stats.size / 1024).toFixed(2)} KB`);

  // Create a backup manifest
  const manifestPath = path.join(backupDir, `backup-${timestamp}.json`);
  const db = await openDatabase();

  const proposalCount = await query(db, 'SELECT COUNT(*) as count FROM autofix_proposals');
  const sessionCount = await query(db, 'SELECT COUNT(*) as count FROM autofix_review_sessions');

  const manifest = {
    timestamp: new Date().toISOString(),
    dbFile: backupPath,
    dbSize: stats.size,
    proposalCount: proposalCount[0].count,
    sessionCount: sessionCount[0].count,
    nodeVersion: process.version
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log('info', `Backup manifest created: ${manifestPath}`);

  db.close();

  // Cleanup old backups (keep last 10)
  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('database-backup-') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      mtime: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (backupFiles.length > 10) {
    const toDelete = backupFiles.slice(10);
    log('info', `Cleaning up ${toDelete.length} old backups (keeping 10 most recent)`);

    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
      // Also delete corresponding manifest
      const manifestFile = file.path.replace('database-backup-', 'backup-').replace('.db', '.json');
      if (fs.existsSync(manifestFile)) {
        fs.unlinkSync(manifestFile);
      }
    });

    log('success', 'Old backups cleaned up');
  }

  console.log('');
}

async function showStatistics(db) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}Database Statistics${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

  // Database file info
  const stats = fs.statSync(dbPath);
  log('data', `Database size: ${(stats.size / 1024).toFixed(2)} KB`);
  log('data', `Last modified: ${stats.mtime.toISOString()}`);

  console.log('');

  // Proposal statistics
  const totalProposals = await query(db, 'SELECT COUNT(*) as count FROM autofix_proposals');
  log('data', `Total proposals: ${totalProposals[0].count}`);

  const byStatus = await query(db, `
    SELECT status, COUNT(*) as count
    FROM autofix_proposals
    GROUP BY status
    ORDER BY count DESC
  `);

  console.log('\nProposals by status:');
  byStatus.forEach(row => {
    console.log(`  ${row.status.padEnd(15)}: ${row.count}`);
  });

  const byRisk = await query(db, `
    SELECT risk_level, COUNT(*) as count
    FROM autofix_proposals
    GROUP BY risk_level
    ORDER BY count DESC
  `);

  console.log('\nProposals by risk level:');
  byRisk.forEach(row => {
    const risk = row.risk_level || 'unknown';
    console.log(`  ${risk.padEnd(15)}: ${row.count}`);
  });

  const bySeverity = await query(db, `
    SELECT severity, COUNT(*) as count
    FROM autofix_proposals
    GROUP BY severity
    ORDER BY count DESC
  `);

  console.log('\nProposals by severity:');
  bySeverity.forEach(row => {
    const severity = row.severity || 'unknown';
    console.log(`  ${severity.padEnd(15)}: ${row.count}`);
  });

  // Session statistics
  const totalSessions = await query(db, 'SELECT COUNT(*) as count FROM autofix_review_sessions');
  log('data', `\nTotal sessions: ${totalSessions[0].count}`);

  const sessionStats = await query(db, `
    SELECT
      AVG(total_proposals) as avg_proposals,
      AVG(approved_count) as avg_approved,
      AVG(rejected_count) as avg_rejected
    FROM autofix_review_sessions
  `);

  if (sessionStats[0].avg_proposals) {
    console.log('\nSession averages:');
    console.log(`  Proposals per session: ${Math.round(sessionStats[0].avg_proposals)}`);
    console.log(`  Approved per session:  ${Math.round(sessionStats[0].avg_approved)}`);
    console.log(`  Rejected per session:  ${Math.round(sessionStats[0].avg_rejected)}`);
  }

  // Age statistics
  const oldestProposal = await query(db, `
    SELECT created_at FROM autofix_proposals ORDER BY created_at ASC LIMIT 1
  `);

  const newestProposal = await query(db, `
    SELECT created_at FROM autofix_proposals ORDER BY created_at DESC LIMIT 1
  `);

  if (oldestProposal.length > 0) {
    const oldest = new Date(oldestProposal[0].created_at);
    const newest = new Date(newestProposal[0].created_at);
    const ageInDays = Math.round((newest - oldest) / (1000 * 60 * 60 * 24));

    console.log('\nData range:');
    console.log(`  Oldest proposal: ${oldest.toLocaleDateString()}`);
    console.log(`  Newest proposal: ${newest.toLocaleDateString()}`);
    console.log(`  Span: ${ageInDays} days`);
  }

  // Storage efficiency
  const avgProposalSize = stats.size / totalProposals[0].count;
  console.log('\nStorage:');
  console.log(`  Avg proposal size: ${(avgProposalSize / 1024).toFixed(2)} KB`);

  console.log('');
}

async function archiveOldData(db, daysOld = 30) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}Archive Old Data${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoffTimestamp = cutoffDate.toISOString();

  log('info', `Archiving proposals older than ${daysOld} days (before ${cutoffDate.toLocaleDateString()})`);

  // Find proposals to archive
  const toArchive = await query(db, `
    SELECT * FROM autofix_proposals
    WHERE created_at < ?
    AND status IN ('applied', 'rejected')
  `, [cutoffTimestamp]);

  if (toArchive.length === 0) {
    log('success', 'No proposals to archive');
    return;
  }

  log('info', `Found ${toArchive.length} proposals to archive`);

  // Create archive directory
  const archiveDir = path.join(projectRoot, 'archives');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const archivePath = path.join(archiveDir, `archive-${timestamp}.json`);

  // Export to JSON
  const archive = {
    timestamp: new Date().toISOString(),
    cutoffDate: cutoffTimestamp,
    proposalCount: toArchive.length,
    proposals: toArchive
  };

  fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
  log('success', `Archive created: ${archivePath}`);

  // Delete archived proposals
  const result = await run(db, `
    DELETE FROM autofix_proposals
    WHERE created_at < ?
    AND status IN ('applied', 'rejected')
  `, [cutoffTimestamp]);

  log('success', `Deleted ${result.changes} archived proposals from database`);

  const stats = fs.statSync(archivePath);
  log('data', `Archive size: ${(stats.size / 1024).toFixed(2)} KB`);

  console.log('');
}

async function resetDatabase(confirm = false) {
  console.log(`\n${colors.red}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.red}⚠️  RESET DATABASE ⚠️${colors.reset}`);
  console.log(`${colors.red}${'='.repeat(70)}${colors.reset}\n`);

  if (!confirm) {
    log('error', 'This will DELETE ALL DATA in the database!');
    log('warning', 'To confirm, run: node scripts/db-maintenance.js reset --confirm');
    console.log('');
    return;
  }

  // Create a backup first
  log('info', 'Creating backup before reset...');
  await backupDatabase();

  const db = await openDatabase();

  // Drop all tables
  log('warning', 'Dropping all tables...');

  await run(db, 'DROP TABLE IF EXISTS autofix_proposals');
  await run(db, 'DROP TABLE IF EXISTS autofix_review_sessions');

  log('success', 'All tables dropped');

  db.close();

  log('success', 'Database reset complete');
  log('info', 'Tables will be recreated on next API call');

  console.log('');
}

async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║  Database Maintenance Utilities                                   ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (!command) {
    console.log('Usage: node scripts/db-maintenance.js <command> [options]\n');
    console.log('Commands:');
    console.log('  cleanup [--days=7] [--dry-run]   Clean up old proposals');
    console.log('  optimize                          Optimize database (VACUUM, ANALYZE)');
    console.log('  backup [--output=path]            Backup database');
    console.log('  stats                             Show database statistics');
    console.log('  archive [--days=30]               Archive old data to JSON');
    console.log('  reset [--confirm]                 Reset database (DELETE ALL DATA)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/db-maintenance.js cleanup --days=14');
    console.log('  node scripts/db-maintenance.js backup --output=./backups/');
    console.log('  node scripts/db-maintenance.js stats');
    console.log('');
    process.exit(1);
  }

  try {
    const db = await openDatabase();

    switch (command) {
      case 'cleanup':
        await cleanupOldProposals(db, parseInt(options.days) || 7, options['dry-run'] || false);
        break;

      case 'optimize':
        await optimizeDatabase(db);
        break;

      case 'backup':
        db.close();
        await backupDatabase(options.output);
        return;

      case 'stats':
        await showStatistics(db);
        break;

      case 'archive':
        await archiveOldData(db, parseInt(options.days) || 30);
        break;

      case 'reset':
        db.close();
        await resetDatabase(options.confirm || false);
        return;

      default:
        log('error', `Unknown command: ${command}`);
        log('info', 'Run without arguments to see usage');
        process.exit(1);
    }

    db.close();
    log('success', 'Maintenance task completed');

  } catch (error) {
    log('error', `Error: ${error.message}`);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
