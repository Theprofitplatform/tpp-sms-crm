import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Create mock functions
const mockPost = jest.fn();

// Mock axios using unstable_mockModule for ES modules
jest.unstable_mockModule('axios', () => ({
  default: {
    post: mockPost
  }
}));

// Mock config
jest.unstable_mockModule('../../config/env/config.js', () => ({
  config: {
    notifications: {
      discordWebhookUrl: 'https://discord.com/api/webhooks/test/webhook'
    }
  }
}));

// Import after mocking
const { DiscordNotifier } = await import('../../src/audit/discord-notifier.js');

describe('Discord Notifier', () => {
  let notifier;

  beforeEach(() => {
    jest.clearAllMocks();
    notifier = new DiscordNotifier('https://discord.com/api/webhooks/test/webhook');
  });

  describe('Constructor', () => {
    test('should initialize with webhook URL from constructor', () => {
      const customNotifier = new DiscordNotifier('https://custom.webhook.url');
      expect(customNotifier.webhookUrl).toBe('https://custom.webhook.url');
    });

    test('should use webhook URL from config when not provided', () => {
      // The mocked config provides a webhook URL, so constructor won't throw
      const configNotifier = new DiscordNotifier();
      expect(configNotifier.webhookUrl).toBeTruthy();
    });

    test('should throw error when webhook URL not configured (line 14)', async () => {
      // Import config to modify it
      const { config } = await import('../../config/env/config.js');
      const originalUrl = config.notifications.discordWebhookUrl;

      // Temporarily set to null
      config.notifications.discordWebhookUrl = null;

      // Should throw error when no URL provided
      expect(() => {
        new DiscordNotifier();
      }).toThrow('Discord webhook URL not configured');

      // Restore original URL
      config.notifications.discordWebhookUrl = originalUrl;
    });
  });

  describe('sendMessage()', () => {
    test('should send simple text message', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const result = await notifier.sendMessage('Test message');

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test/webhook',
        { content: 'Test message' }
      );
    });

    test('should handle message sending failure', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      const result = await notifier.sendMessage('Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('sendEmbed()', () => {
    test('should send rich embed', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const embed = {
        title: 'Test Embed',
        description: 'Test Description',
        color: 0x00ff00
      };

      const result = await notifier.sendEmbed(embed);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test/webhook',
        { embeds: [embed] }
      );
    });

    test('should handle embed sending failure', async () => {
      mockPost.mockRejectedValue(new Error('API error'));

      const result = await notifier.sendEmbed({ title: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });

  describe('sendRankingUpdate()', () => {
    test('should send ranking update with rankings', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const rankingData = {
        date: '2025-10-18',
        rankings: [
          { keyword: 'keyword1', ranking: true, position: 1, change: 2 },
          { keyword: 'keyword2', ranking: true, position: 3, change: -1 },
          { keyword: 'keyword3', ranking: false }
        ]
      };

      const result = await notifier.sendRankingUpdate(rankingData);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalled();

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Ranking Update');
      expect(embedSent.fields[0].value).toContain('2/3');
      expect(embedSent.fields[0].value).toContain('67%');
    });

    test('should include top rankings in update', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const rankingData = {
        date: '2025-10-18',
        rankings: [
          { keyword: 'best keyword', ranking: true, position: 1, change: 0 },
          { keyword: 'second keyword', ranking: true, position: 2, change: 1 },
          { keyword: 'third keyword', ranking: true, position: 3, change: -2 }
        ]
      };

      await notifier.sendRankingUpdate(rankingData);

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      const topRankingsField = embedSent.fields.find(f => f.name.includes('Top Rankings'));

      expect(topRankingsField).toBeDefined();
      expect(topRankingsField.value).toContain('best keyword');
      expect(topRankingsField.value).toContain('🥇');
    });

    test('should calculate average position', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const rankingData = {
        date: '2025-10-18',
        rankings: [
          { keyword: 'kw1', ranking: true, position: 2 },
          { keyword: 'kw2', ranking: true, position: 4 },
          { keyword: 'kw3', ranking: true, position: 6 }
        ]
      };

      await notifier.sendRankingUpdate(rankingData);

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      const avgField = embedSent.fields.find(f => f.name.includes('Average Position'));

      expect(avgField).toBeDefined();
      expect(avgField.value).toContain('#4.0'); // (2+4+6)/3 = 4
    });

    test('should handle no rankings', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const rankingData = {
        date: '2025-10-18',
        rankings: [
          { keyword: 'kw1', ranking: false },
          { keyword: 'kw2', ranking: false }
        ]
      };

      const result = await notifier.sendRankingUpdate(rankingData);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.color).toBe(0xff0000); // Red for no rankings
    });
  });

  describe('sendBulkFixComplete()', () => {
    test('should send bulk fix completion notification', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const results = {
        total: 100,
        fixed: 85,
        skipped: 10,
        errors: ['Error 1', 'Error 2', 'Error 3']
      };

      const result = await notifier.sendBulkFixComplete('Meta Tags', results);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Meta Tags');
      expect(embedSent.fields[0].value).toContain('85/100');
    });

    test('should show green color when no errors', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const results = {
        total: 50,
        fixed: 50,
        skipped: 0,
        errors: []
      };

      await notifier.sendBulkFixComplete('Images', results);

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.color).toBe(0x00ff00); // Green
    });

    test('should show orange color when errors exist', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const results = {
        total: 50,
        fixed: 45,
        skipped: 0,
        errors: ['Error 1', 'Error 2']
      };

      await notifier.sendBulkFixComplete('Links', results);

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.color).toBe(0xffa500); // Orange
    });

    test('should include error list when errors exist', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const results = {
        total: 10,
        fixed: 8,
        skipped: 0,
        errors: [
          { title: 'Post 1', error: 'Failed to update' },
          { title: 'Post 2', error: 'Network error' }
        ]
      };

      await notifier.sendBulkFixComplete('Headings', results);

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      const errorField = embedSent.fields.find(f => f.name.includes('Errors'));

      expect(errorField).toBeDefined();
      expect(errorField.value).toContain('Post 1');
      expect(errorField.value).toContain('Failed to update');
    });
  });

  describe('sendRankingAlert()', () => {
    test('should send ranking alerts', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const alerts = [
        { type: 'improvement', message: 'Keyword X improved to position 5' },
        { type: 'drop', message: 'Keyword Y dropped to position 15' },
        { type: 'new', message: 'Keyword Z entered top 10' }
      ];

      const result = await notifier.sendRankingAlert(alerts);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Ranking Changes Detected');
    });

    test('should not send if no alerts', async () => {
      const result = await notifier.sendRankingAlert([]);

      expect(result).toBeUndefined();
      expect(mockPost).not.toHaveBeenCalled();
    });

    test('should separate improvements, drops, and new rankings', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const alerts = [
        { type: 'improvement', message: 'Improved 1' },
        { type: 'improvement', message: 'Improved 2' },
        { type: 'drop', message: 'Dropped 1' },
        { type: 'new', message: 'New 1' }
      ];

      await notifier.sendRankingAlert(alerts);

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      const improvementField = embedSent.fields.find(f => f.name.includes('Improvements'));
      const dropField = embedSent.fields.find(f => f.name.includes('Drops'));
      const newField = embedSent.fields.find(f => f.name.includes('New'));

      expect(improvementField).toBeDefined();
      expect(dropField).toBeDefined();
      expect(newField).toBeDefined();
    });
  });

  describe('sendDailySummary()', () => {
    test('should send daily summary report', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const report = {
        date: '2025-10-18',
        sections: {
          rankings: {
            rankingKeywords: 25,
            totalKeywords: 50,
            rankingPercentage: '50'
          },
          content: {
            averageScore: 75,
            needsOptimization: 10
          },
          recommendations: [
            { priority: 'critical', action: 'Fix broken links' },
            { priority: 'high', action: 'Update meta descriptions' }
          ]
        }
      };

      const result = await notifier.sendDailySummary(report);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Daily SEO Summary');
      expect(embedSent.description).toContain('2025-10-18');
    });

    test('should handle missing sections gracefully', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const report = {
        date: '2025-10-18',
        sections: {}
      };

      const result = await notifier.sendDailySummary(report);

      expect(result.success).toBe(true);
    });

    test('should include priority actions when available', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const report = {
        date: '2025-10-18',
        sections: {
          recommendations: [
            { priority: 'critical', action: 'Critical action' },
            { priority: 'high', action: 'High priority action' },
            { priority: 'low', action: 'Low priority action' }
          ]
        }
      };

      await notifier.sendDailySummary(report);

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      const actionsField = embedSent.fields.find(f => f.name.includes('Priority Actions'));

      expect(actionsField).toBeDefined();
      expect(actionsField.value).toContain('Critical action');
      expect(actionsField.value).not.toContain('Low priority action');
    });
  });

  describe('sendError()', () => {
    test('should send error notification', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const errorDetails = {
        script: 'test-script.js',
        error: new Error('Test error'),
        timestamp: new Date('2025-10-18T10:00:00Z')
      };

      const result = await notifier.sendError(errorDetails);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Error');
      expect(embedSent.color).toBe(0xff0000); // Red
    });

    test('should include stack trace if available', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const error = new Error('Test error with stack');
      const errorDetails = {
        script: 'test.js',
        error: error,
        timestamp: Date.now()
      };

      await notifier.sendError(errorDetails);

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      const stackField = embedSent.fields.find(f => f.name.includes('Stack Trace'));

      expect(stackField).toBeDefined();
      expect(stackField.value).toContain('```');
    });

    test('should handle error without stack trace', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const errorDetails = {
        script: 'test.js',
        error: 'String error message',
        timestamp: Date.now()
      };

      const result = await notifier.sendError(errorDetails);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.fields.some(f => f.value.includes('String error message'))).toBe(true);
    });
  });

  describe('sendTest()', () => {
    test('should send test notification', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const result = await notifier.sendTest();

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Active');
      expect(embedSent.color).toBe(0x00ff00); // Green
      expect(embedSent.fields.some(f => f.name.includes('Features'))).toBe(true);
      expect(embedSent.fields.some(f => f.name.includes('Schedule'))).toBe(true);
    });
  });

  describe('sendNewLead()', () => {
    test('should send new lead notification', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const leadData = {
        name: 'John Doe',
        businessName: 'Acme Corp',
        email: 'john@acme.com',
        website: 'https://acme.com',
        industry: 'Technology',
        seoScore: 75
      };

      const result = await notifier.sendNewLead(leadData);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('New Lead');
      expect(embedSent.description).toContain('Acme Corp');
      expect(embedSent.color).toBe(0x00ff00);
    });

    test('should show correct score color indicator', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const highScoreLead = {
        name: 'Test',
        businessName: 'Test Co',
        email: 'test@test.com',
        website: 'https://test.com',
        industry: 'Tech',
        seoScore: 85
      };

      await notifier.sendNewLead(highScoreLead);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      const scoreField = embedSent.fields.find(f => f.name.includes('SEO Score'));
      expect(scoreField.name).toContain('🟢');
    });
  });

  describe('sendEmailCampaign()', () => {
    test('should send email campaign notification', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const campaignData = {
        campaignName: 'Welcome Email',
        recipientEmail: 'test@test.com',
        recipientName: 'Test User',
        scheduledFor: new Date('2025-10-25T10:00:00Z'),
        emailType: 'welcome'
      };

      const result = await notifier.sendEmailCampaign(campaignData);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Email Campaign');
      expect(embedSent.description).toContain('Welcome Email');
    });
  });

  describe('sendLocalSEOAlert()', () => {
    test('should send local SEO alert', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const alertData = {
        clientName: 'Test Client',
        issueType: 'NAP Inconsistency',
        severity: 'HIGH',
        message: 'Business address mismatch detected',
        score: 65
      };

      const result = await notifier.sendLocalSEOAlert(alertData);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Local SEO Alert');
      expect(embedSent.color).toBe(0xff0000); // Red for HIGH severity
    });

    test('should use correct colors for different severities', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      await notifier.sendLocalSEOAlert({
        clientName: 'Test',
        issueType: 'Minor Issue',
        severity: 'MEDIUM',
        message: 'Test',
        score: 75
      });

      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.color).toBe(0xffa500); // Orange for MEDIUM
    });
  });

  describe('sendMilestone()', () => {
    test('should send milestone notification', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const milestoneData = {
        clientName: 'Acme Corp',
        milestone: '100 Keywords Ranking',
        description: 'Your site now ranks for 100+ keywords',
        achievement: '100 keywords in top 10'
      };

      const result = await notifier.sendMilestone(milestoneData);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Milestone');
      expect(embedSent.color).toBe(0xffd700); // Gold
    });
  });

  describe('sendOptimizationComplete()', () => {
    test('should send optimization complete notification', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const optimizationData = {
        clientName: 'Test Client',
        optimizationType: 'Meta Tags',
        itemsFixed: 25,
        beforeScore: 65,
        afterScore: 85
      };

      const result = await notifier.sendOptimizationComplete(optimizationData);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('Optimization Complete');
      expect(embedSent.fields.some(f => f.value.includes('+20'))).toBe(true);
    });
  });

  describe('sendReportGenerated()', () => {
    test('should send PDF report generated notification', async () => {
      mockPost.mockResolvedValue({ data: { id: '12345' } });

      const reportData = {
        clientName: 'Acme Corp',
        reportType: 'Monthly SEO Report',
        period: 'October 2025',
        downloadUrl: 'https://example.com/reports/october.pdf'
      };

      const result = await notifier.sendReportGenerated(reportData);

      expect(result.success).toBe(true);
      const embedSent = mockPost.mock.calls[0][1].embeds[0];
      expect(embedSent.title).toContain('PDF Report');
      expect(embedSent.fields.some(f => f.value.includes('Download'))).toBe(true);
    });
  });
});
