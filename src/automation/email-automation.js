/**
 * Email Automation Engine
 *
 * Orchestrates automated email campaigns and sequences
 * Handles triggering, scheduling, sending, and tracking
 */

import db from '../database/index.js';
import { EmailTemplates } from './email-templates.js';
import { EmailSender } from './email-sender.js';

export class EmailAutomation {
  constructor(config = {}) {
    this.emailSender = new EmailSender(config.smtp);
    this.defaultFromEmail = config.fromEmail || process.env.FROM_EMAIL || 'noreply@seoexpert.com';
    this.defaultFromName = config.fromName || 'SEO Expert';
    this.replyToEmail = config.replyTo || process.env.REPLY_TO_EMAIL || this.defaultFromEmail;
  }

  /**
   * Initialize default campaigns
   */
  async initializeDefaultCampaigns() {
    console.log('📧 Initializing default email campaigns...');

    const templates = EmailTemplates.getAll();
    const campaignIds = [];

    for (const template of templates) {
      // Check if campaign already exists
      const existing = db.emailOps.getActiveCampaigns().find(c => c.name === template.name);

      if (!existing) {
        const campaignId = db.emailOps.createCampaign({
          name: template.name,
          type: template.type,
          triggerEvent: template.triggerEvent,
          delayHours: template.delayHours,
          subjectTemplate: template.subject,
          bodyTemplate: template.bodyHtml,
          fromName: this.defaultFromName,
          fromEmail: this.defaultFromEmail,
          replyTo: this.replyToEmail
        });

        campaignIds.push(campaignId);
        console.log(`   ✓ Created campaign: ${template.name}`);
      } else {
        console.log(`   - Campaign already exists: ${template.name}`);
      }
    }

    return campaignIds;
  }

  /**
   * Trigger email campaign for a lead
   */
  async triggerCampaign(leadId, eventType) {
    try {
      const lead = db.leadOps.getLeadById(leadId);
      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      // Find campaigns triggered by this event
      const campaigns = db.emailOps.getActiveCampaigns()
        .filter(c => c.trigger_event === eventType);

      if (campaigns.length === 0) {
        console.log(`No campaigns found for event: ${eventType}`);
        return [];
      }

      const queuedEmails = [];

      for (const campaign of campaigns) {
        // Check if lead already received this campaign
        const existingEmails = db.emailOps.getLeadEmails(leadId);
        const alreadySent = existingEmails.some(e => e.campaign_id === campaign.id);

        if (alreadySent) {
          console.log(`Lead ${leadId} already received campaign ${campaign.id}`);
          continue;
        }

        // Calculate scheduled time
        const scheduledFor = new Date();
        scheduledFor.setHours(scheduledFor.getHours() + campaign.delay_hours);

        // Get lead audit data for personalization
        const auditData = await this.getLeadAuditData(lead);

        // Generate personalized email
        const email = this.personalizeEmail({
          lead,
          auditData,
          subjectTemplate: campaign.subject_template,
          bodyTemplate: campaign.body_template,
          fromEmail: campaign.from_email || this.defaultFromEmail,
          fromName: campaign.from_name || this.defaultFromName,
          replyTo: campaign.reply_to || this.replyToEmail
        });

        // Queue email
        const queueId = db.emailOps.queueEmail({
          leadId,
          campaignId: campaign.id,
          sequenceId: null,
          recipientEmail: lead.email,
          recipientName: lead.name,
          subject: email.subject,
          bodyHtml: email.bodyHtml,
          bodyText: email.bodyText,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          replyTo: email.replyTo,
          scheduledFor: scheduledFor.toISOString()
        });

        queuedEmails.push({
          queueId,
          campaignId: campaign.id,
          scheduledFor: scheduledFor.toISOString()
        });

        console.log(`✓ Queued email for lead ${leadId}, campaign ${campaign.id}`);
      }

      return queuedEmails;

    } catch (error) {
      console.error('Email trigger error:', error);
      throw error;
    }
  }

  /**
   * Get lead audit data for personalization
   */
  async getLeadAuditData(lead) {
    // This would normally fetch the actual audit data
    // For now, return mock data based on lead info
    return {
      seoScore: lead.audit_score || 65,
      technicalSummary: 'We found issues with page speed, mobile optimization, and missing sitemap.',
      onPageSummary: 'Missing meta descriptions on 8 pages and suboptimal title tags.',
      competitorSummary: 'Your competitors are ranking for 47 keywords you\'re missing.',
      keywordCount: Math.floor(Math.random() * 30) + 20,
      competitorCount: Math.floor(Math.random() * 3) + 2,
      trafficIncrease: Math.floor(Math.random() * 500) + 300
    };
  }

  /**
   * Personalize email with lead data
   */
  personalizeEmail(data) {
    const { lead, auditData, subjectTemplate, bodyTemplate, fromEmail, fromName, replyTo } = data;

    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    const placeholderData = {
      // Lead info
      name: lead.name,
      email: lead.email,
      businessName: lead.business_name,
      website: lead.website,
      industry: lead.industry || 'your industry',
      phone: lead.phone || '',

      // Audit data
      seoScore: auditData.seoScore,
      technicalSummary: auditData.technicalSummary,
      onPageSummary: auditData.onPageSummary,
      competitorSummary: auditData.competitorSummary,
      keywordCount: auditData.keywordCount,
      competitorCount: auditData.competitorCount,
      trafficIncrease: auditData.trafficIncrease,

      // Case study data (would be dynamic in production)
      similarBusiness: 'Sydney Auto Repairs',

      // Contact info
      fromEmail,
      fromName,

      // Dynamic dates
      currentMonth,
      deadline: deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),

      // Links
      calendarLink: `https://calendly.com/seoexpert/strategy?email=${encodeURIComponent(lead.email)}`,
      unsubscribeLink: `https://seoexpert.com/unsubscribe?email=${encodeURIComponent(lead.email)}`
    };

    const subject = EmailTemplates.replacePlaceholders(subjectTemplate, placeholderData);
    const bodyHtml = EmailTemplates.replacePlaceholders(bodyTemplate, placeholderData);

    // Generate plain text version
    const bodyText = bodyHtml
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return {
      subject,
      bodyHtml,
      bodyText,
      fromEmail,
      fromName,
      replyTo
    };
  }

  /**
   * Process email queue (send pending emails)
   */
  async processQueue(options = {}) {
    const { limit = 50, dryRun = false } = options;

    console.log(`📬 Processing email queue (limit: ${limit}, dryRun: ${dryRun})`);

    // Get pending emails
    const pendingEmails = db.emailOps.getPendingEmails(limit);

    if (pendingEmails.length === 0) {
      console.log('   No pending emails');
      return { sent: 0, failed: 0, results: [] };
    }

    console.log(`   Found ${pendingEmails.length} pending emails`);

    const results = [];
    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      try {
        console.log(`   Sending email ${email.id} to ${email.recipient_email}...`);

        if (dryRun) {
          console.log(`   [DRY RUN] Would send: ${email.subject}`);
          results.push({
            emailId: email.id,
            success: true,
            dryRun: true
          });
          continue;
        }

        // Update status to 'sending'
        db.emailOps.updateEmailStatus(email.id, 'sending');

        // Send email
        const result = await this.emailSender.send({
          to: email.recipient_email,
          toName: email.recipient_name,
          from: email.from_email,
          fromName: email.from_name,
          replyTo: email.reply_to,
          subject: email.subject,
          html: email.body_html,
          text: email.body_text
        });

        if (result.success) {
          // Update status to 'sent'
          db.emailOps.updateEmailStatus(email.id, 'sent');

          // Track send event
          db.emailOps.trackEvent({
            queueId: email.id,
            leadId: email.lead_id,
            eventType: 'sent',
            eventData: { messageId: result.messageId }
          });

          // Track in lead events
          db.leadOps.trackEvent(email.lead_id, 'email_sent', {
            queueId: email.id,
            subject: email.subject
          });

          sent++;
          results.push({
            emailId: email.id,
            success: true,
            messageId: result.messageId,
            preview: result.preview
          });

          console.log(`   ✓ Sent email ${email.id}`);
        } else {
          // Handle failure
          db.emailOps.incrementRetryCount(email.id);

          const retryCount = email.retry_count + 1;
          const maxRetries = 3;

          if (retryCount >= maxRetries) {
            // Mark as failed after max retries
            db.emailOps.updateEmailStatus(email.id, 'failed', result.error);
            failed++;
            console.error(`   ✗ Email ${email.id} failed (max retries): ${result.error}`);
          } else {
            // Reschedule for retry (exponential backoff)
            const retryDelay = Math.pow(2, retryCount) * 60; // 2min, 4min, 8min
            const newScheduledFor = new Date();
            newScheduledFor.setMinutes(newScheduledFor.getMinutes() + retryDelay);

            db.emailOps.updateEmailStatus(email.id, 'pending');

            console.warn(`   ⚠ Email ${email.id} failed, retry ${retryCount}/${maxRetries} in ${retryDelay}min`);
          }

          results.push({
            emailId: email.id,
            success: false,
            error: result.error,
            retries: retryCount
          });
        }

      } catch (error) {
        console.error(`   ✗ Error processing email ${email.id}:`, error);
        db.emailOps.updateEmailStatus(email.id, 'failed', error.message);
        failed++;

        results.push({
          emailId: email.id,
          success: false,
          error: error.message
        });
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📨 Queue processed: ${sent} sent, ${failed} failed`);

    return { sent, failed, results };
  }

  /**
   * Start automated email processing (runs continuously)
   */
  startAutomation(intervalMinutes = 5) {
    console.log(`🤖 Starting email automation (checking every ${intervalMinutes} minutes)`);

    // Process queue immediately
    this.processQueue();

    // Then process every N minutes
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, intervalMinutes * 60 * 1000);

    return this.intervalId;
  }

  /**
   * Stop automated email processing
   */
  stopAutomation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️  Email automation stopped');
    }
  }

  /**
   * Get campaign analytics
   */
  getCampaignAnalytics(campaignId) {
    const campaign = db.emailOps.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const stats = db.emailOps.getCampaignStats(campaignId);

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status
      },
      stats
    };
  }

  /**
   * Get lead email engagement
   */
  getLeadEngagement(leadId) {
    const stats = db.emailOps.getLeadEmailStats(leadId);
    const emails = db.emailOps.getLeadEmails(leadId);

    return {
      leadId,
      stats,
      emails,
      engagementScore: this.calculateEngagementScore(stats)
    };
  }

  /**
   * Calculate lead engagement score (0-100)
   */
  calculateEngagementScore(stats) {
    if (stats.sent === 0) return 0;

    const openRate = stats.opened / stats.sent;
    const clickRate = stats.clicked / stats.sent;

    // Weight: opens 60%, clicks 40%
    const score = (openRate * 60) + (clickRate * 40);

    return Math.round(score * 100);
  }
}

export default EmailAutomation;
