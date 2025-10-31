/**
 * Auto-Fix Notification Service
 * Sends email and Discord notifications for auto-fix operations
 */

import { sendEmail } from './email-service.js';
import { sendDiscordMessage } from './discord-service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_PATH = path.join(__dirname, '../../config/notification-settings.json');

/**
 * Load notification settings
 */
async function loadSettings() {
  try {
    const content = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Default settings
    return {
      email: {
        enabled: false,
        recipients: [],
        events: {
          jobCompleted: true,
          jobFailed: true,
          dailySummary: false
        }
      },
      discord: {
        enabled: false,
        webhookUrl: '',
        events: {
          jobCompleted: true,
          jobFailed: true,
          dailySummary: false
        }
      }
    };
  }
}

/**
 * Save notification settings
 */
async function saveSettings(settings) {
  try {
    const configDir = path.dirname(SETTINGS_PATH);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return false;
  }
}

/**
 * Send job completion notification
 */
export async function notifyJobCompleted(job) {
  try {
    const settings = await loadSettings();

    const subject = `Auto-Fix Completed: ${job.engineName || job.type}`;
    const message = formatJobCompletedMessage(job);

    // Send email
    if (settings.email.enabled && settings.email.events.jobCompleted) {
      for (const recipient of settings.email.recipients) {
        await sendEmail({
          to: recipient,
          subject,
          text: message,
          html: formatJobCompletedHTML(job)
        });
      }
    }

    // Send Discord
    if (settings.discord.enabled && settings.discord.events.jobCompleted) {
      await sendDiscordMessage({
        webhookUrl: settings.discord.webhookUrl,
        content: message,
        embeds: [{
          title: subject,
          color: 0x00ff00, // Green
          fields: [
            {
              name: 'Client',
              value: job.clientName || job.clientId || 'All Clients',
              inline: true
            },
            {
              name: 'Fixes Applied',
              value: job.fixesApplied?.toString() || '0',
              inline: true
            },
            {
              name: 'Duration',
              value: formatDuration(job.duration),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }

    console.log(`✓ Sent completion notification for job ${job.id}`);
  } catch (error) {
    console.error('Error sending completion notification:', error);
  }
}

/**
 * Send job failure notification
 */
export async function notifyJobFailed(job) {
  try {
    const settings = await loadSettings();

    const subject = `Auto-Fix Failed: ${job.engineName || job.type}`;
    const message = formatJobFailedMessage(job);

    // Send email
    if (settings.email.enabled && settings.email.events.jobFailed) {
      for (const recipient of settings.email.recipients) {
        await sendEmail({
          to: recipient,
          subject,
          text: message,
          html: formatJobFailedHTML(job)
        });
      }
    }

    // Send Discord
    if (settings.discord.enabled && settings.discord.events.jobFailed) {
      await sendDiscordMessage({
        webhookUrl: settings.discord.webhookUrl,
        content: `@here ${message}`, // Mention everyone for failures
        embeds: [{
          title: subject,
          color: 0xff0000, // Red
          fields: [
            {
              name: 'Client',
              value: job.clientName || job.clientId || 'All Clients',
              inline: true
            },
            {
              name: 'Error',
              value: job.error || 'Unknown error',
              inline: false
            },
            {
              name: 'Duration',
              value: formatDuration(job.duration),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }

    console.log(`✓ Sent failure notification for job ${job.id}`);
  } catch (error) {
    console.error('Error sending failure notification:', error);
  }
}

/**
 * Send daily summary
 */
export async function sendDailySummary(summary) {
  try {
    const settings = await loadSettings();

    const subject = `Auto-Fix Daily Summary - ${new Date().toLocaleDateString()}`;
    const message = formatDailySummaryMessage(summary);

    // Send email
    if (settings.email.enabled && settings.email.events.dailySummary) {
      for (const recipient of settings.email.recipients) {
        await sendEmail({
          to: recipient,
          subject,
          text: message,
          html: formatDailySummaryHTML(summary)
        });
      }
    }

    // Send Discord
    if (settings.discord.enabled && settings.discord.events.dailySummary) {
      await sendDiscordMessage({
        webhookUrl: settings.discord.webhookUrl,
        embeds: [{
          title: subject,
          color: 0x0099ff, // Blue
          fields: [
            {
              name: 'Total Runs',
              value: summary.totalRuns.toString(),
              inline: true
            },
            {
              name: 'Successful',
              value: summary.successful.toString(),
              inline: true
            },
            {
              name: 'Failed',
              value: summary.failed.toString(),
              inline: true
            },
            {
              name: 'Total Fixes',
              value: summary.totalFixes.toString(),
              inline: true
            },
            {
              name: 'Avg Duration',
              value: formatDuration(summary.avgDuration),
              inline: true
            },
            {
              name: 'Success Rate',
              value: `${summary.successRate}%`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }

    console.log('✓ Sent daily summary');
  } catch (error) {
    console.error('Error sending daily summary:', error);
  }
}

/**
 * Format job completed message (plain text)
 */
function formatJobCompletedMessage(job) {
  return `
Auto-Fix Job Completed Successfully

Engine: ${job.engineName || job.type}
Client: ${job.clientName || job.clientId || 'All Clients'}
Fixes Applied: ${job.fixesApplied || 0}
Issues Found: ${job.issuesFound || 0}
Duration: ${formatDuration(job.duration)}
Completed: ${new Date(job.endTime).toLocaleString()}

The auto-fix engine has successfully completed its optimization run.
  `.trim();
}

/**
 * Format job completed message (HTML)
 */
function formatJobCompletedHTML(job) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #22c55e;">✓ Auto-Fix Job Completed</h2>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Engine:</td>
            <td style="padding: 8px;">${job.engineName || job.type}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Client:</td>
            <td style="padding: 8px;">${job.clientName || job.clientId || 'All Clients'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Fixes Applied:</td>
            <td style="padding: 8px;">${job.fixesApplied || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Issues Found:</td>
            <td style="padding: 8px;">${job.issuesFound || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Duration:</td>
            <td style="padding: 8px;">${formatDuration(job.duration)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Completed:</td>
            <td style="padding: 8px;">${new Date(job.endTime).toLocaleString()}</td>
          </tr>
        </table>
        <p style="color: #6b7280;">The auto-fix engine has successfully completed its optimization run.</p>
      </body>
    </html>
  `;
}

/**
 * Format job failed message (plain text)
 */
function formatJobFailedMessage(job) {
  return `
Auto-Fix Job Failed

Engine: ${job.engineName || job.type}
Client: ${job.clientName || job.clientId || 'All Clients'}
Error: ${job.error || 'Unknown error'}
Duration: ${formatDuration(job.duration)}
Failed: ${new Date(job.endTime).toLocaleString()}

Please check the logs for more details.
  `.trim();
}

/**
 * Format job failed message (HTML)
 */
function formatJobFailedHTML(job) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #ef4444;">✗ Auto-Fix Job Failed</h2>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Engine:</td>
            <td style="padding: 8px;">${job.engineName || job.type}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Client:</td>
            <td style="padding: 8px;">${job.clientName || job.clientId || 'All Clients'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Error:</td>
            <td style="padding: 8px; color: #ef4444;">${job.error || 'Unknown error'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Duration:</td>
            <td style="padding: 8px;">${formatDuration(job.duration)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Failed:</td>
            <td style="padding: 8px;">${new Date(job.endTime).toLocaleString()}</td>
          </tr>
        </table>
        <p style="color: #6b7280;">Please check the logs for more details.</p>
      </body>
    </html>
  `;
}

/**
 * Format daily summary message
 */
function formatDailySummaryMessage(summary) {
  return `
Auto-Fix Daily Summary - ${new Date().toLocaleDateString()}

Total Runs: ${summary.totalRuns}
Successful: ${summary.successful}
Failed: ${summary.failed}
Total Fixes Applied: ${summary.totalFixes}
Average Duration: ${formatDuration(summary.avgDuration)}
Success Rate: ${summary.successRate}%

Most Active Engine: ${summary.mostActiveEngine || 'N/A'}
  `.trim();
}

/**
 * Format daily summary (HTML)
 */
function formatDailySummaryHTML(summary) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #3b82f6;">Auto-Fix Daily Summary</h2>
        <p style="color: #6b7280;">${new Date().toLocaleDateString()}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
          <div style="padding: 15px; background: #f3f4f6; border-radius: 8px;">
            <h3 style="margin: 0; font-size: 14px; color: #6b7280;">Total Runs</h3>
            <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold;">${summary.totalRuns}</p>
          </div>
          <div style="padding: 15px; background: #f3f4f6; border-radius: 8px;">
            <h3 style="margin: 0; font-size: 14px; color: #6b7280;">Success Rate</h3>
            <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #22c55e;">${summary.successRate}%</p>
          </div>
          <div style="padding: 15px; background: #f3f4f6; border-radius: 8px;">
            <h3 style="margin: 0; font-size: 14px; color: #6b7280;">Total Fixes</h3>
            <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold;">${summary.totalFixes}</p>
          </div>
          <div style="padding: 15px; background: #f3f4f6; border-radius: 8px;">
            <h3 style="margin: 0; font-size: 14px; color: #6b7280;">Avg Duration</h3>
            <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold;">${formatDuration(summary.avgDuration)}</p>
          </div>
        </div>
        
        <p style="color: #6b7280;">Most Active Engine: <strong>${summary.mostActiveEngine || 'N/A'}</strong></p>
      </body>
    </html>
  `;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
  if (!ms) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default {
  notifyJobCompleted,
  notifyJobFailed,
  sendDailySummary,
  loadSettings,
  saveSettings
};
