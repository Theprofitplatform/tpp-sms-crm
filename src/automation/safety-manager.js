import fs from 'fs';
import { logger } from '../audit/logger.js';

/**
 * Safety Manager - Backup, Rollback, Dry-Run
 * Critical for production automation at scale
 */
export class SafetyManager {
  constructor(clientId) {
    this.clientId = clientId;
    this.backupDir = `logs/clients/${clientId}/backups`;
    this.changesLog = `logs/clients/${clientId}/changes.log`;
    
    // Ensure directories exist
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  /**
   * Create backup before making changes
   */
  async createBackup(posts, label = 'auto') {
    const timestamp = Date.now();
    const backupFile = `${this.backupDir}/backup-${label}-${timestamp}.json`;
    
    const backup = {
      timestamp: new Date().toISOString(),
      clientId: this.clientId,
      label: label,
      posts: posts.map(post => ({
        id: post.id,
        title: post.title.rendered,
        meta: post.meta || {},
        content: post.content.rendered,
        excerpt: post.excerpt?.rendered || ''
      }))
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    logger.success(`✅ Backup created: ${backupFile}`);
    
    return backupFile;
  }

  /**
   * Log all changes made
   */
  logChange(postId, postTitle, field, oldValue, newValue) {
    const change = {
      timestamp: new Date().toISOString(),
      postId: postId,
      postTitle: postTitle,
      field: field,
      oldValue: oldValue,
      newValue: newValue
    };
    
    const logLine = JSON.stringify(change) + '\n';
    fs.appendFileSync(this.changesLog, logLine);
  }

  /**
   * Get all changes made (for review or rollback)
   */
  getChanges(since = null) {
    if (!fs.existsSync(this.changesLog)) {
      return [];
    }
    
    const lines = fs.readFileSync(this.changesLog, 'utf8').split('\n').filter(l => l.trim());
    const changes = lines.map(line => JSON.parse(line));
    
    if (since) {
      const sinceDate = new Date(since);
      return changes.filter(c => new Date(c.timestamp) > sinceDate);
    }
    
    return changes;
  }

  /**
   * Rollback to a previous backup
   */
  async rollback(backupFile, wpClient) {
    logger.warn(`⚠️  Rolling back to: ${backupFile}`);
    
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    const results = [];
    
    for (const post of backup.posts) {
      try {
        // Restore meta fields
        await wpClient.patch(`/wp/v2/posts/${post.id}`, {
          meta: post.meta
        });
        
        results.push({ postId: post.id, success: true });
        logger.info(`✅ Restored: ${post.title}`);
        
        await this.sleep(1000);
        
      } catch (error) {
        results.push({ postId: post.id, success: false, error: error.message });
        logger.error(`❌ Failed to restore post ${post.id}:`, error.message);
      }
    }
    
    logger.success(`Rollback complete. Restored ${results.filter(r => r.success).length} posts`);
    return results;
  }

  /**
   * List available backups
   */
  listBackups() {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }
    
    const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const backup = JSON.parse(fs.readFileSync(`${this.backupDir}/${file}`, 'utf8'));
      return {
        file: file,
        path: `${this.backupDir}/${file}`,
        timestamp: backup.timestamp,
        label: backup.label,
        postCount: backup.posts.length
      };
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
