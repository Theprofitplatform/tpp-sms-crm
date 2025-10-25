/**
 * Discord Notification Module
 * Sends SEO updates to Discord webhook
 */

import axios from 'axios';
import { config } from '../../config/env/config.js';

export class DiscordNotifier {
  constructor(webhookUrl = null) {
    this.webhookUrl = webhookUrl || config.notifications.discordWebhookUrl;

    if (!this.webhookUrl) {
      throw new Error('Discord webhook URL not configured. Set DISCORD_WEBHOOK_URL in .env file.');
    }
  }

  /**
   * Send ranking update to Discord
   */
  async sendRankingUpdate(rankingData) {
    const { date, rankings } = rankingData;

    const ranking = rankings.filter(r => r.ranking).length;
    const total = rankings.length;
    const percentage = ((ranking / total) * 100).toFixed(0);

    // Get top rankings
    const topRankings = rankings
      .filter(r => r.ranking)
      .sort((a, b) => a.position - b.position)
      .slice(0, 5);

    // Build embed
    const embed = {
      title: '📊 Daily SEO Ranking Update',
      description: `**InstantAutoTraders.com.au** - ${date}`,
      color: ranking > 0 ? 0x00ff00 : 0xff0000, // Green if ranking, red if not
      fields: [
        {
          name: '📈 Ranking Summary',
          value: `**${ranking}/${total}** keywords ranking (${percentage}%)`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'SEO Automation System'
      }
    };

    // Add top rankings
    if (topRankings.length > 0) {
      const rankingsList = topRankings
        .map(r => {
          const emoji = r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : '📍';
          const change = r.change > 0 ? ` 📈 +${r.change}` : r.change < 0 ? ` 📉 ${r.change}` : '';
          return `${emoji} **#${r.position}** - ${r.keyword}${change}`;
        })
        .join('\n');

      embed.fields.push({
        name: '🏆 Top Rankings',
        value: rankingsList,
        inline: false
      });
    }

    // Add average position
    const positions = rankings
      .filter(r => r.ranking && typeof r.position === 'number')
      .map(r => r.position);

    if (positions.length > 0) {
      const avgPosition = (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1);
      embed.fields.push({
        name: '📊 Average Position',
        value: `#${avgPosition}`,
        inline: true
      });
    }

    return await this.sendEmbed(embed);
  }

  /**
   * Send bulk fix completion notification
   */
  async sendBulkFixComplete(fixType, results) {
    const { total, fixed, skipped, errors } = results;
    const successRate = ((fixed / total) * 100).toFixed(0);

    const embed = {
      title: `✅ Bulk ${fixType} Fix Complete`,
      description: `**InstantAutoTraders.com.au**`,
      color: errors.length === 0 ? 0x00ff00 : 0xffa500, // Green if no errors, orange if errors
      fields: [
        {
          name: '📊 Results',
          value: `**${fixed}/${total}** posts updated\n**${skipped}** skipped\n**${errors.length}** errors`,
          inline: false
        },
        {
          name: '✅ Success Rate',
          value: `${successRate}%`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'SEO Automation System'
      }
    };

    // Add error details if any
    if (errors.length > 0 && errors.length <= 5) {
      const errorList = errors
        .map(e => `- ${e.title}: ${e.error}`)
        .join('\n');

      embed.fields.push({
        name: '❌ Errors',
        value: errorList.substring(0, 1024), // Discord field limit
        inline: false
      });
    }

    return await this.sendEmbed(embed);
  }

  /**
   * Send ranking change alert
   */
  async sendRankingAlert(alerts) {
    if (alerts.length === 0) return;

    const embed = {
      title: '🔔 Ranking Changes Detected!',
      description: `**InstantAutoTraders.com.au**`,
      color: 0xff9900, // Orange for alerts
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'SEO Automation System'
      }
    };

    // Group alerts by type
    const improvements = alerts.filter(a => a.type === 'improvement');
    const drops = alerts.filter(a => a.type === 'drop');
    const newRankings = alerts.filter(a => a.type === 'new');

    if (improvements.length > 0) {
      embed.fields.push({
        name: '📈 Improvements',
        value: improvements.map(a => a.message).join('\n').substring(0, 1024),
        inline: false
      });
    }

    if (drops.length > 0) {
      embed.fields.push({
        name: '📉 Drops',
        value: drops.map(a => a.message).join('\n').substring(0, 1024),
        inline: false
      });
    }

    if (newRankings.length > 0) {
      embed.fields.push({
        name: '🎉 New Rankings',
        value: newRankings.map(a => a.message).join('\n').substring(0, 1024),
        inline: false
      });
    }

    return await this.sendEmbed(embed);
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(report) {
    const { date, sections } = report;

    const embed = {
      title: '📊 Daily SEO Summary',
      description: `**InstantAutoTraders.com.au** - ${date}`,
      color: 0x0099ff, // Blue
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'SEO Automation System'
      }
    };

    // Rankings
    if (sections.rankings && !sections.rankings.error) {
      embed.fields.push({
        name: '📈 Rankings',
        value: `${sections.rankings.rankingKeywords}/${sections.rankings.totalKeywords} keywords (${sections.rankings.rankingPercentage}%)`,
        inline: true
      });
    }

    // Content
    if (sections.content && !sections.content.error) {
      embed.fields.push({
        name: '📝 Content',
        value: `Score: ${sections.content.averageScore}/100\nNeeds work: ${sections.content.needsOptimization}`,
        inline: true
      });
    }

    // Recommendations
    if (sections.recommendations && sections.recommendations.length > 0) {
      const criticalRecs = sections.recommendations
        .filter(r => r.priority === 'critical' || r.priority === 'high')
        .slice(0, 3);

      if (criticalRecs.length > 0) {
        embed.fields.push({
          name: '💡 Priority Actions',
          value: criticalRecs.map(r => `- ${r.action}`).join('\n').substring(0, 1024),
          inline: false
        });
      }
    }

    return await this.sendEmbed(embed);
  }

  /**
   * Send simple text message
   */
  async sendMessage(message) {
    try {
      const response = await axios.post(this.webhookUrl, {
        content: message
      });
      return { success: true, response: response.data };
    } catch (error) {
      console.error('Discord notification failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send rich embed
   */
  async sendEmbed(embed) {
    try {
      const response = await axios.post(this.webhookUrl, {
        embeds: [embed]
      });
      return { success: true, response: response.data };
    } catch (error) {
      console.error('Discord notification failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send error notification
   */
  async sendError(errorDetails) {
    const { script, error, timestamp } = errorDetails;

    const embed = {
      title: '❌ SEO Automation Error',
      description: `**InstantAutoTraders.com.au**`,
      color: 0xff0000, // Red
      fields: [
        {
          name: '🔧 Script',
          value: script || 'Unknown',
          inline: true
        },
        {
          name: '⏰ Time',
          value: new Date(timestamp || Date.now()).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }),
          inline: true
        },
        {
          name: '❌ Error',
          value: error?.message || error || 'Unknown error',
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'SEO Automation System - Error Alert'
      }
    };

    // Add stack trace if available (truncated)
    if (error?.stack) {
      const stackLines = error.stack.split('\n').slice(0, 5).join('\n');
      embed.fields.push({
        name: '📋 Stack Trace (first 5 lines)',
        value: `\`\`\`\n${stackLines.substring(0, 1000)}\n\`\`\``,
        inline: false
      });
    }

    return await this.sendEmbed(embed);
  }

  /**
   * Send test notification
   */
  async sendTest() {
    const embed = {
      title: '✅ SEO Automation System Active',
      description: 'Your automated SEO monitoring is now live!',
      color: 0x00ff00,
      fields: [
        {
          name: '📊 Features',
          value: '✅ Daily ranking checks\n✅ Automated reports\n✅ Change alerts\n✅ Discord notifications',
          inline: false
        },
        {
          name: '⏰ Schedule',
          value: '**9 AM:** Ranking monitor\n**5 PM:** Daily report\n**Sunday 10 AM:** Weekly optimization',
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'SEO Automation System - Test Message'
      }
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Send new lead notification
   */
  async sendNewLead(leadData) {
    const { name, businessName, email, website, industry, seoScore } = leadData;

    const scoreColor = seoScore >= 70 ? '🟢' : seoScore >= 50 ? '🟡' : '🔴';

    const embed = {
      title: '🎯 New Lead Captured!',
      description: `**${businessName}** just requested a FREE SEO audit`,
      color: 0x00ff00, // Green
      fields: [
        {
          name: '👤 Contact',
          value: `**${name}**\n${email}`,
          inline: true
        },
        {
          name: '🏢 Business',
          value: `**${businessName}**\n${industry}`,
          inline: true
        },
        {
          name: '🌐 Website',
          value: website,
          inline: false
        },
        {
          name: `${scoreColor} SEO Score`,
          value: `**${seoScore}/100**`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Lead Magnet System'
      }
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Send email campaign triggered notification
   */
  async sendEmailCampaign(campaignData) {
    const { campaignName, recipientEmail, recipientName, scheduledFor, emailType } = campaignData;

    const typeEmoji = emailType === 'welcome' ? '👋' :
                      emailType === 'follow_up' ? '📧' :
                      emailType === 'client_report' ? '📊' :
                      emailType === 'client_alert' ? '⚠️' : '📨';

    const embed = {
      title: `${typeEmoji} Email Campaign Triggered`,
      description: `**${campaignName}**`,
      color: 0x0099ff, // Blue
      fields: [
        {
          name: '📬 Recipient',
          value: `**${recipientName}**\n${recipientEmail}`,
          inline: true
        },
        {
          name: '📅 Scheduled',
          value: new Date(scheduledFor).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
          }),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Email Automation System'
      }
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Send local SEO alert
   */
  async sendLocalSEOAlert(alertData) {
    const { clientName, issueType, severity, message, score } = alertData;

    const colorMap = {
      HIGH: 0xff0000,    // Red
      MEDIUM: 0xffa500,  // Orange
      LOW: 0xffff00      // Yellow
    };

    const severityEmoji = severity === 'HIGH' ? '🔴' :
                         severity === 'MEDIUM' ? '🟡' : '🟢';

    const embed = {
      title: '🗺️ Local SEO Alert',
      description: `**${clientName}**`,
      color: colorMap[severity] || 0xffa500,
      fields: [
        {
          name: `${severityEmoji} Issue Type`,
          value: issueType,
          inline: true
        },
        {
          name: '📊 Current Score',
          value: `${score}/100`,
          inline: true
        },
        {
          name: '📝 Details',
          value: message,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Local SEO Automation'
      }
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Send client milestone notification
   */
  async sendMilestone(milestoneData) {
    const { clientName, milestone, description, achievement } = milestoneData;

    const embed = {
      title: '🎉 Client Milestone Achieved!',
      description: `**${clientName}** just hit a major goal!`,
      color: 0xffd700, // Gold
      fields: [
        {
          name: '🏆 Milestone',
          value: milestone,
          inline: false
        },
        {
          name: '📈 Achievement',
          value: achievement,
          inline: false
        },
        {
          name: '💡 What This Means',
          value: description,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Client Success Tracker'
      }
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Send optimization completed notification
   */
  async sendOptimizationComplete(optimizationData) {
    const { clientName, optimizationType, itemsFixed, beforeScore, afterScore } = optimizationData;

    const improvement = afterScore - beforeScore;
    const improvementText = improvement > 0 ? `+${improvement}` : `${improvement}`;

    const embed = {
      title: '✅ Optimization Complete',
      description: `**${clientName}**`,
      color: 0x00ff00, // Green
      fields: [
        {
          name: '🔧 Optimization Type',
          value: optimizationType,
          inline: true
        },
        {
          name: '📊 Items Fixed',
          value: `${itemsFixed}`,
          inline: true
        },
        {
          name: '📈 Score Change',
          value: `${beforeScore} → ${afterScore} (${improvementText})`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'SEO Automation System'
      }
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Send PDF report generated notification
   */
  async sendReportGenerated(reportData) {
    const { clientName, reportType, period, downloadUrl } = reportData;

    const embed = {
      title: '📊 PDF Report Generated',
      description: `**${clientName}** - ${reportType}`,
      color: 0x0099ff, // Blue
      fields: [
        {
          name: '📅 Period',
          value: period,
          inline: true
        },
        {
          name: '📥 Download',
          value: `[Click to Download](${downloadUrl})`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Report Generation System'
      }
    };

    return await this.sendEmbed(embed);
  }
}

// Export singleton
export const discordNotifier = new DiscordNotifier();
