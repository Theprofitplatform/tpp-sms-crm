/**
 * Auto-Fix History Service (Upgraded)
 * Manages reading and parsing auto-fix log files with WordPress integration
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WordPressClient } from '../automation/wordpress-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load WordPress credentials from client env file
 */
async function loadWordPressCredentials(clientId) {
  try {
    const envPath = path.join(__dirname, '../../clients', `${clientId}.env`);
    const envContent = await fs.readFile(envPath, 'utf-8');
    
    const credentials = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        credentials[key] = value;
      }
    });
    
    return {
      url: credentials.WORDPRESS_URL,
      username: credentials.WORDPRESS_USER,
      password: credentials.WORDPRESS_APP_PASSWORD
    };
  } catch (error) {
    console.error(`Error loading credentials for ${clientId}:`, error.message);
    return null;
  }
}

/**
 * Get WordPress client for a specific client ID
 */
async function getWordPressClient(clientId) {
  const credentials = await loadWordPressCredentials(clientId);
  
  if (!credentials || !credentials.url || !credentials.username || !credentials.password) {
    throw new Error(`WordPress credentials not configured for ${clientId}`);
  }
  
  return new WordPressClient(
    credentials.url,
    credentials.username,
    credentials.password
  );
}

/**
 * Get all auto-fix reports with optional filtering
 */
export async function getAutoFixReports(clientId = null, limit = 10, engineType = null) {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    
    // Ensure logs directory exists
    try {
      await fs.access(logsDir);
    } catch {
      await fs.mkdir(logsDir, { recursive: true });
      return [];
    }
    
    // Read all files in logs directory
    const files = await fs.readdir(logsDir);
    
    // Filter for consolidated reports
    const reportFiles = files.filter(f => 
      f.startsWith('consolidated-report-') && f.endsWith('.json')
    );
    
    // Sort by date (newest first)
    reportFiles.sort((a, b) => {
      const dateA = a.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      const dateB = b.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      return dateB ? dateB.localeCompare(dateA || '') : 0;
    });
    
    const reports = [];
    
    // Read each report file
    for (const file of reportFiles.slice(0, limit * 2)) { // Read more initially for filtering
      try {
        const content = await fs.readFile(
          path.join(logsDir, file),
          'utf-8'
        );
        const data = JSON.parse(content);
        
        // Extract date from filename
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : new Date().toISOString();
        
        // Calculate total changes
        const titleChanges = data.individualReports?.titles?.results?.changes?.length || 0;
        const h1Changes = data.individualReports?.h1Tags?.results?.changes?.length || 0;
        const imageChanges = data.individualReports?.imageAlt?.results?.changes?.length || 0;
        const totalChanges = titleChanges + h1Changes + imageChanges;
        
        // Extract client ID from data or filename
        const reportClientId = data.clientId || 'instantautotraders';
        
        // Filter by client if specified
        if (clientId && reportClientId !== clientId) {
          continue;
        }
        
        // Filter by engine type if specified
        if (engineType) {
          const hasEngineChanges = 
            (engineType === 'title-meta-optimizer' && titleChanges > 0) ||
            (engineType === 'content-optimizer' && (h1Changes > 0 || imageChanges > 0));
          
          if (!hasEngineChanges) {
            continue;
          }
        }
        
        reports.push({
          id: file.replace('.json', ''),
          filename: file,
          timestamp: data.timestamp || date,
          dryRun: data.dryRun || false,
          clientId: reportClientId,
          backupId: data.backupId || `backup-pre-optimization-${data.timestamp || date}`,
          summary: {
            completed: data.results?.completed || [],
            failed: data.results?.failed || [],
            skipped: data.results?.skipped || [],
            analyzed: data.individualReports?.titles?.results?.analyzed || 0,
            totalChanges
          },
          details: {
            titleChanges,
            h1Changes,
            imageChanges
          },
          changes: data.individualReports || {}
        });
        
        // Stop if we have enough reports
        if (reports.length >= limit) {
          break;
        }
      } catch (error) {
        console.error(`Error reading report ${file}:`, error.message);
      }
    }
    
    return reports;
  } catch (error) {
    console.error('Error getting auto-fix reports:', error);
    return [];
  }
}

/**
 * Get specific auto-fix report by ID
 */
export async function getAutoFixReportById(id) {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    const reportPath = path.join(logsDir, `${id}.json`);
    
    const content = await fs.readFile(reportPath, 'utf-8');
    const data = JSON.parse(content);
    
    return {
      success: true,
      report: data
    };
  } catch (error) {
    console.error(`Error reading report ${id}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get backup file for a specific optimization run
 */
export async function getBackupFile(clientId, backupId) {
  try {
    // Try multiple backup locations
    const possiblePaths = [
      path.join(__dirname, '../../logs/clients', clientId, 'backups', `${backupId}.json`),
      path.join(__dirname, '../../logs/backups', clientId, `${backupId}.json`),
      path.join(__dirname, '../../logs', `${backupId}.json`)
    ];
    
    for (const backupPath of possiblePaths) {
      try {
        const content = await fs.readFile(backupPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        // Try next path
        continue;
      }
    }
    
    throw new Error('Backup file not found in any location');
  } catch (error) {
    console.error(`Error reading backup ${backupId}:`, error.message);
    throw new Error('Backup file not found');
  }
}

/**
 * Revert specific changes from auto-fix (WITH WordPress Integration)
 */
export async function revertAutoFixChanges(clientId, backupId, postIds) {
  try {
    console.log(`Reverting changes for client ${clientId}, backup ${backupId}`);
    
    // Load backup file
    const backup = await getBackupFile(clientId, backupId);
    
    if (!backup || !backup.posts) {
      throw new Error('Backup data is invalid or missing posts');
    }
    
    // Get WordPress client
    const wpClient = await getWordPressClient(clientId);
    
    const reverted = [];
    const failed = [];
    
    // Revert each post
    for (const postId of postIds) {
      try {
        const originalPost = backup.posts.find(p => p.id === postId);
        
        if (!originalPost) {
          console.warn(`Post ${postId} not found in backup`);
          failed.push({ postId, reason: 'Not found in backup' });
          continue;
        }
        
        // Prepare update data
        const updateData = {
          title: originalPost.title?.rendered || originalPost.title,
        };
        
        // Add content if it was backed up
        if (originalPost.content?.rendered || originalPost.content) {
          updateData.content = originalPost.content?.rendered || originalPost.content;
        }
        
        // Add meta description if available
        if (originalPost.meta_description) {
          updateData.meta = {
            _yoast_wpseo_metadesc: originalPost.meta_description
          };
        }
        
        // Update the post via WordPress API
        await wpClient.updatePost(postId, updateData);
        
        reverted.push(postId);
        console.log(`✓ Reverted post ${postId}`);
        
      } catch (error) {
        console.error(`Failed to revert post ${postId}:`, error.message);
        failed.push({ postId, reason: error.message });
      }
    }
    
    // Log the reversion
    await logReversion(clientId, backupId, reverted, failed);
    
    return {
      success: true,
      count: reverted.length,
      posts: reverted,
      failed: failed.length > 0 ? failed : undefined
    };
  } catch (error) {
    console.error('Error reverting changes:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log reversion operation
 */
async function logReversion(clientId, backupId, revertedPosts, failedPosts) {
  try {
    const logsDir = path.join(__dirname, '../../logs/reversions');
    await fs.mkdir(logsDir, { recursive: true });
    
    const reversionLog = {
      timestamp: new Date().toISOString(),
      clientId,
      backupId,
      reverted: revertedPosts,
      failed: failedPosts,
      totalReverted: revertedPosts.length,
      totalFailed: failedPosts.length
    };
    
    const logPath = path.join(
      logsDir,
      `reversion-${clientId}-${Date.now()}.json`
    );
    
    await fs.writeFile(logPath, JSON.stringify(reversionLog, null, 2));
    console.log(`Reversion logged: ${logPath}`);
  } catch (error) {
    console.error('Error logging reversion:', error.message);
  }
}

/**
 * Get reversion history
 */
export async function getReversionHistory(clientId = null, limit = 20) {
  try {
    const logsDir = path.join(__dirname, '../../logs/reversions');
    
    try {
      await fs.access(logsDir);
    } catch {
      return [];
    }
    
    const files = await fs.readdir(logsDir);
    const reversionFiles = files
      .filter(f => f.startsWith('reversion-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    const reversions = [];
    
    for (const file of reversionFiles.slice(0, limit)) {
      try {
        const content = await fs.readFile(path.join(logsDir, file), 'utf-8');
        const data = JSON.parse(content);
        
        if (clientId && data.clientId !== clientId) {
          continue;
        }
        
        reversions.push(data);
      } catch (error) {
        console.error(`Error reading reversion ${file}:`, error.message);
      }
    }
    
    return reversions;
  } catch (error) {
    console.error('Error getting reversion history:', error);
    return [];
  }
}

/**
 * Create backup before making changes
 */
export async function createBackup(clientId, posts) {
  try {
    const backupId = `backup-pre-optimization-${Date.now()}`;
    const backupDir = path.join(__dirname, '../../logs/clients', clientId, 'backups');
    
    await fs.mkdir(backupDir, { recursive: true });
    
    const backupData = {
      id: backupId,
      timestamp: new Date().toISOString(),
      clientId,
      posts: posts.map(post => ({
        id: post.id,
        title: post.title?.rendered || post.title,
        content: post.content?.rendered || post.content,
        meta_description: post.yoast_head_json?.og_description || post.meta_description,
        url: post.link || post.url
      }))
    };
    
    const backupPath = path.join(backupDir, `${backupId}.json`);
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✓ Backup created: ${backupId}`);
    return backupId;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(clientId) {
  try {
    const backupDir = path.join(__dirname, '../../logs/clients', clientId, 'backups');
    
    try {
      await fs.access(backupDir);
    } catch {
      return {
        totalBackups: 0,
        oldestBackup: null,
        newestBackup: null,
        totalSize: 0
      };
    }
    
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(f => f.endsWith('.json'));
    
    if (backupFiles.length === 0) {
      return {
        totalBackups: 0,
        oldestBackup: null,
        newestBackup: null,
        totalSize: 0
      };
    }
    
    let totalSize = 0;
    for (const file of backupFiles) {
      const stats = await fs.stat(path.join(backupDir, file));
      totalSize += stats.size;
    }
    
    const sortedFiles = backupFiles.sort();
    
    return {
      totalBackups: backupFiles.length,
      oldestBackup: sortedFiles[0],
      newestBackup: sortedFiles[sortedFiles.length - 1],
      totalSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB'
    };
  } catch (error) {
    console.error('Error getting backup stats:', error);
    return null;
  }
}

export default {
  getAutoFixReports,
  getAutoFixReportById,
  getBackupFile,
  revertAutoFixChanges,
  getReversionHistory,
  createBackup,
  getBackupStats
};
