#!/usr/bin/env node

/**
 * SEO Expert Database Backup Script
 * Usage: node scripts/backup-database.js
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups/database');
const DB_FILE = path.join(__dirname, '../data/seo-automation.db');
const RETENTION_DAYS = 30;
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);

console.log('🔄 Starting database backup...');

try {
  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }

  // Check if database exists
  if (!fs.existsSync(DB_FILE)) {
    console.error(`❌ Error: Database file not found at ${DB_FILE}`);
    process.exit(1);
  }

  // Backup database using better-sqlite3
  console.log('📦 Backing up database...');
  const db = new Database(DB_FILE, { readonly: true });
  const backupPath = path.join(BACKUP_DIR, `backup_${TIMESTAMP}.db`);

  db.backup(backupPath)
    .then(() => {
      console.log(`✅ Database backed up to: ${backupPath}`);
      db.close();

      // Compress backup
      console.log('🗜️  Compressing backup...');
      return execAsync(`gzip "${backupPath}"`);
    })
    .then(() => {
      const gzPath = `${backupPath}.gz`;
      const stats = fs.statSync(gzPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`✅ Backup completed: backup_${TIMESTAMP}.db.gz (${sizeInMB} MB)`);

      // Delete old backups
      console.log(`🧹 Cleaning old backups (older than ${RETENTION_DAYS} days)...`);
      const now = Date.now();
      const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

      const files = fs.readdirSync(BACKUP_DIR);
      let deletedCount = 0;

      files.forEach(file => {
        if (file.endsWith('.gz')) {
          const filePath = path.join(BACKUP_DIR, file);
          const fileStats = fs.statSync(filePath);
          const age = now - fileStats.mtimeMs;

          if (age > maxAge) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      });

      if (deletedCount > 0) {
        console.log(`🗑️  Deleted ${deletedCount} old backup(s)`);
      }

      // Count remaining backups
      const remainingBackups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.gz')).length;
      console.log(`📊 Total backups: ${remainingBackups}`);

      // Log to backup log file
      const logPath = path.join(BACKUP_DIR, 'backup.log');
      const logEntry = `${new Date().toISOString()}: Backup completed - backup_${TIMESTAMP}.db.gz (${sizeInMB} MB)\n`;
      fs.appendFileSync(logPath, logEntry);

      console.log('');
      console.log('✅ Backup complete!');
      console.log(`📁 Location: ${BACKUP_DIR}/backup_${TIMESTAMP}.db.gz`);
      console.log('');
      console.log('To restore:');
      console.log(`  gunzip ${BACKUP_DIR}/backup_${TIMESTAMP}.db.gz`);
      console.log(`  cp ${BACKUP_DIR}/backup_${TIMESTAMP}.db ${DB_FILE}`);
      console.log('');
    })
    .catch(error => {
      console.error('❌ Backup failed:', error.message);
      process.exit(1);
    });

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
