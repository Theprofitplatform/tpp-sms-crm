/**
 * Auto-Fix History Service
 * Manages reading and parsing auto-fix log files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all auto-fix reports with optional filtering
 */
export async function getAutoFixReports(clientId = null, limit = 10, engineType = null) {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    
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
    for (const file of reportFiles.slice(0, limit)) {
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
        
        reports.push({
          id: file.replace('.json', ''),
          filename: file,
          timestamp: data.timestamp || date,
          dryRun: data.dryRun || false,
          clientId: 'instantautotraders', // Extract from data if available
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
      } catch (error) {
        console.error(`Error reading report ${file}:`, error.message);
      }
    }
    
    // Filter by client if specified
    let filteredReports = reports;
    if (clientId) {
      filteredReports = reports.filter(r => r.clientId === clientId);
    }
    
    return filteredReports;
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
    const backupPath = path.join(
      __dirname,
      '../../logs/clients',
      clientId,
      'backups',
      `${backupId}.json`
    );
    
    const content = await fs.readFile(backupPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading backup ${backupId}:`, error.message);
    throw new Error('Backup file not found');
  }
}

/**
 * Revert specific changes from auto-fix
 * This would integrate with WordPress API to restore post data
 */
export async function revertAutoFixChanges(clientId, backupId, postIds) {
  try {
    // Load backup file
    const backup = await getBackupFile(clientId, backupId);
    
    // In a real implementation, this would:
    // 1. Load the WordPress client for this client
    // 2. For each postId, find the original data in backup
    // 3. Call WordPress API to update the post back to original
    // 4. Log the reversion
    
    const reverted = [];
    
    for (const postId of postIds) {
      const originalPost = backup.posts?.find(p => p.id === postId);
      if (originalPost) {
        // TODO: Integrate with WordPress API
        // await wordpressClient.updatePost(postId, originalPost);
        reverted.push(postId);
      }
    }
    
    return {
      success: true,
      count: reverted.length,
      posts: reverted
    };
  } catch (error) {
    console.error('Error reverting changes:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getAutoFixReports,
  getAutoFixReportById,
  getBackupFile,
  revertAutoFixChanges
};
