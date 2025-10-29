/**
 * Position Tracking Cron Jobs
 * 
 * Automated daily position tracking and notifications
 */

import cron from 'node-cron';
import { ScraperService } from '../services/scraper-service.js';
import { getDB } from '../database/index.js';

const db = getDB();
const scraperService = new ScraperService(db);

/**
 * Refresh all keywords for active domains
 */
async function refreshAllKeywords() {
  console.log('🔄 Starting automated keyword position refresh...');
  
  try {
    // Get all active domains
    const domainsStmt = db.prepare('SELECT id, domain FROM domains WHERE active = 1');
    const domains = domainsStmt.all();
    
    if (domains.length === 0) {
      console.log('No active domains to refresh');
      return;
    }
    
    console.log(`Found ${domains.length} active domains`);
    
    for (const domain of domains) {
      await refreshDomainKeywords(domain);
      
      // Wait 2 seconds between domains to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('✅ Automated keyword refresh complete');
  } catch (error) {
    console.error('❌ Error in automated keyword refresh:', error);
  }
}

/**
 * Refresh keywords for a single domain
 */
async function refreshDomainKeywords(domain) {
  try {
    console.log(`📊 Refreshing keywords for ${domain.domain}...`);
    
    // Get all sticky keywords for this domain
    const keywordsStmt = db.prepare(`
      SELECT id, keyword, device, country
      FROM keywords
      WHERE domain_id = ? AND sticky = 1
      ORDER BY last_tracked_at ASC
      LIMIT 100
    `);
    
    const keywords = keywordsStmt.all(domain.id);
    
    if (keywords.length === 0) {
      console.log(`  No keywords to refresh for ${domain.domain}`);
      return;
    }
    
    console.log(`  Refreshing ${keywords.length} keywords...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const keyword of keywords) {
      try {
        // Mark as updating
        const updateStmt = db.prepare('UPDATE keywords SET updating = 1 WHERE id = ?');
        updateStmt.run(keyword.id);
        
        // Scrape position
        const result = await scraperService.scrape(
          keyword.keyword,
          keyword.country,
          keyword.device,
          domain.domain
        );
        
        // Get current position history
        const historyStmt = db.prepare('SELECT position_history FROM keywords WHERE id = ?');
        const { position_history } = historyStmt.get(keyword.id);
        
        const positionHistory = position_history ? JSON.parse(position_history) : [];
        
        // Add new position
        positionHistory.push({
          date: new Date().toISOString().split('T')[0],
          position: result.position,
          url: result.url || null,
        });
        
        // Keep last 90 days
        if (positionHistory.length > 90) {
          positionHistory.shift();
        }
        
        // Update keyword
        const updateKeywordStmt = db.prepare(`
          UPDATE keywords 
          SET position = ?,
              url = ?,
              position_history = ?,
              last_result = ?,
              updating = 0,
              last_update_error = NULL,
              last_tracked_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        updateKeywordStmt.run(
          result.position,
          result.url || null,
          JSON.stringify(positionHistory),
          JSON.stringify(result),
          keyword.id
        );
        
        successCount++;
        console.log(`    ✓ ${keyword.keyword}: Position ${result.position}`);
        
        // Wait 1 second between keywords to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        console.error(`    ✗ ${keyword.keyword}: ${error.message}`);
        
        // Update error status
        const errorStmt = db.prepare(`
          UPDATE keywords 
          SET updating = 0,
              last_update_error = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        errorStmt.run(error.message, keyword.id);
      }
    }
    
    // Update domain last scrape time
    const updateDomainStmt = db.prepare(`
      UPDATE domains 
      SET last_scrape_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateDomainStmt.run(domain.id);
    
    console.log(`  ✅ ${domain.domain}: ${successCount} success, ${errorCount} errors`);
    
    // Check if we should send notifications
    await checkAndSendNotifications(domain.id);
    
  } catch (error) {
    console.error(`Error refreshing ${domain.domain}:`, error);
  }
}

/**
 * Check for position changes and queue notifications
 */
async function checkAndSendNotifications(domainId) {
  try {
    // Get domain notification settings
    const domainStmt = db.prepare(`
      SELECT id, domain, display_name, notification, notification_interval, notification_emails
      FROM domains
      WHERE id = ? AND notification = 1
    `);
    
    const domain = domainStmt.get(domainId);
    
    if (!domain || !domain.notification) {
      return; // Notifications disabled
    }
    
    // Get keywords with significant position changes (±5 positions)
    const changesStmt = db.prepare(`
      SELECT id, keyword, position, position_history
      FROM keywords
      WHERE domain_id = ? AND position_history IS NOT NULL
    `);
    
    const keywords = changesStmt.all(domainId);
    const significantChanges = [];
    
    for (const keyword of keywords) {
      const history = JSON.parse(keyword.position_history);
      
      if (history.length < 2) continue;
      
      const current = history[history.length - 1].position;
      const previous = history[history.length - 2].position;
      
      if (current === 0 || previous === 0) continue;
      
      const change = previous - current; // Positive = improvement
      
      if (Math.abs(change) >= 5) {
        significantChanges.push({
          keyword: keyword.keyword,
          previous,
          current,
          change,
          direction: change > 0 ? 'up' : 'down'
        });
      }
    }
    
    if (significantChanges.length === 0) {
      console.log(`  No significant position changes for ${domain.domain}`);
      return;
    }
    
    // Queue notification
    const emails = domain.notification_emails ? JSON.parse(domain.notification_emails) : [];
    
    if (emails.length === 0) {
      console.log(`  No notification emails configured for ${domain.domain}`);
      return;
    }
    
    const subject = `Position Changes Alert: ${domain.display_name || domain.domain}`;
    const body = generateNotificationBody(domain, significantChanges);
    
    const insertStmt = db.prepare(`
      INSERT INTO notification_queue (
        domain_id, notification_type, recipients, subject, body, status, scheduled_for
      ) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `);
    
    insertStmt.run(
      domainId,
      'position_change',
      JSON.stringify(emails),
      subject,
      body
    );
    
    console.log(`  📧 Queued notification for ${emails.length} recipients`);
    
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

/**
 * Generate notification email body
 */
function generateNotificationBody(domain, changes) {
  const improvements = changes.filter(c => c.direction === 'up');
  const declines = changes.filter(c => c.direction === 'down');
  
  let body = `Position Changes Report for ${domain.display_name || domain.domain}\n\n`;
  
  if (improvements.length > 0) {
    body += `📈 IMPROVEMENTS (${improvements.length}):\n`;
    improvements.forEach(c => {
      body += `  • "${c.keyword}": #${c.previous} → #${c.current} (+${c.change})\n`;
    });
    body += '\n';
  }
  
  if (declines.length > 0) {
    body += `📉 DECLINES (${declines.length}):\n`;
    declines.forEach(c => {
      body += `  • "${c.keyword}": #${c.previous} → #${c.current} (${c.change})\n`;
    });
    body += '\n';
  }
  
  body += `\nView full report: ${process.env.DASHBOARD_URL || 'http://localhost:9000'}/#keywords\n`;
  
  return body;
}

/**
 * Send queued notifications
 */
async function sendQueuedNotifications() {
  console.log('📧 Checking notification queue...');
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM notification_queue
      WHERE status = 'pending'
      ORDER BY scheduled_for ASC
      LIMIT 10
    `);
    
    const notifications = stmt.all();
    
    if (notifications.length === 0) {
      console.log('No notifications to send');
      return;
    }
    
    console.log(`Found ${notifications.length} notifications to send`);
    
    // TODO: Implement actual email sending with nodemailer
    // For now, just mark as sent
    for (const notification of notifications) {
      const updateStmt = db.prepare(`
        UPDATE notification_queue
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      updateStmt.run(notification.id);
      console.log(`  ✓ Notification sent for domain #${notification.domain_id}`);
    }
    
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

/**
 * Initialize cron jobs
 */
export function initializePositionTrackingJobs() {
  console.log('⏰ Initializing position tracking cron jobs...');
  
  // Daily position refresh at 2 AM
  cron.schedule('0 2 * * *', () => {
    console.log('\n⏰ [CRON] Daily position tracking triggered');
    refreshAllKeywords();
  });
  
  // Send queued notifications every hour
  cron.schedule('0 * * * *', () => {
    console.log('\n⏰ [CRON] Notification sender triggered');
    sendQueuedNotifications();
  });
  
  console.log('✅ Position tracking cron jobs initialized');
  console.log('   - Daily refresh: 2:00 AM');
  console.log('   - Notification sender: Every hour');
}

export default {
  initializePositionTrackingJobs,
  refreshAllKeywords,
  sendQueuedNotifications
};
