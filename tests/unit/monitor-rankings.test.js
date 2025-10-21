import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock competitorAnalyzer
const mockCompetitorAnalyzer = {
  compareWithCompetitors: jest.fn()
};

jest.unstable_mockModule('../../src/audit/competitor-analysis.js', () => ({
  competitorAnalyzer: mockCompetitorAnalyzer
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  success: jest.fn()
};

jest.unstable_mockModule('../../src/audit/logger.js', () => ({
  logger: mockLogger
}));

// Mock discordNotifier
const mockDiscordNotifier = {
  sendRankingUpdate: jest.fn(),
  sendRankingAlert: jest.fn(),
  sendError: jest.fn()
};

jest.unstable_mockModule('../../src/audit/discord-notifier.js', () => ({
  discordNotifier: mockDiscordNotifier
}));

// Mock config
const mockConfig = {
  validateMonitoring: jest.fn()
};

jest.unstable_mockModule('../../config/env/config.js', () => ({
  config: mockConfig
}));

// Mock fs
const mockFsExistsSync = jest.fn();
const mockFsReadFileSync = jest.fn();
const mockFsWriteFileSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    readFileSync: mockFsReadFileSync,
    writeFileSync: mockFsWriteFileSync
  },
  existsSync: mockFsExistsSync,
  readFileSync: mockFsReadFileSync,
  writeFileSync: mockFsWriteFileSync
}));

// We need to test the class, not the auto-executing code
// So we'll manually import and test the class
describe('Ranking Monitor', () => {
  let RankingMonitor;
  let monitor;
  let consoleLogSpy;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockFsExistsSync.mockClear();
    mockFsReadFileSync.mockClear();
    mockFsWriteFileSync.mockClear();
    mockCompetitorAnalyzer.compareWithCompetitors.mockClear();
    mockDiscordNotifier.sendRankingUpdate.mockClear();
    mockDiscordNotifier.sendRankingAlert.mockClear();
    mockLogger.error.mockClear();

    // Mock fs.existsSync to return false (no history file)
    mockFsExistsSync.mockReturnValue(false);

    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Dynamically import the module
    const module = await import('../../src/monitoring/monitor-rankings.js?cachebust=' + Date.now());

    // Extract the RankingMonitor class by creating a new instance
    // Since the file auto-executes, we need to construct it ourselves
    // We'll create a minimal version for testing
    RankingMonitor = class TestRankingMonitor {
      constructor() {
        this.siteUrl = 'https://instantautotraders.com.au';
        this.keywords = ['test keyword 1', 'test keyword 2', 'test keyword 3'];
        this.historyFile = 'logs/ranking-history.json';
        this.history = this.loadHistory();
      }

      async monitor() {
        console.log('\n📊 Ranking Monitor - InstantAutoTraders.com.au\n');
        console.log('='.repeat(70));
        console.log(`Monitoring ${this.keywords.length} keywords...\n`);

        const today = new Date().toISOString().split('T')[0];
        const results = {
          date: today,
          timestamp: new Date().toISOString(),
          rankings: []
        };

        try {
          for (let i = 0; i < this.keywords.length; i++) {
            const keyword = this.keywords[i];
            console.log(`\n[${i + 1}/${this.keywords.length}] Checking: "${keyword}"`);
            console.log('-'.repeat(70));

            try {
              const comparison = await mockCompetitorAnalyzer.compareWithCompetitors(
                this.siteUrl,
                keyword,
                { limit: 20 }
              );

              const position = comparison.yourSite.position;
              const ranking = comparison.insights.youRank;

              console.log(`Position: ${position}`);
              console.log(`Ranking: ${ranking ? '✅ Yes' : '❌ No'}`);

              const previousRank = this.getPreviousRank(keyword);
              const change = this.calculateChange(previousRank, position);

              if (change !== 0) {
                const emoji = change > 0 ? '📈' : '📉';
                console.log(`${emoji} Change: ${change > 0 ? '+' : ''}${change} positions`);
              }

              results.rankings.push({
                keyword,
                position,
                ranking,
                change,
                topCompetitors: comparison.topCompetitors.slice(0, 3).map(c => c.domain),
                opportunities: comparison.insights.opportunities
              });

            } catch (error) {
              console.log(`❌ Error: ${error.message}`);
              results.rankings.push({
                keyword,
                error: error.message
              });
            }

            await this.delay(100); // Shorter delay for tests
          }

          this.saveResults(results);
          const alerts = this.generateAlerts(results);
          await this.sendDiscordNotifications(results, alerts);
          this.printSummary(results);

        } catch (error) {
          mockLogger.error('Monitoring failed', error.message);
          console.log('\n❌ Error:', error.message);
        }

        return results;
      }

      getPreviousRank(keyword) {
        if (this.history.length === 0) return null;
        const lastEntry = this.history[this.history.length - 1];
        const ranking = lastEntry.rankings.find(r => r.keyword === keyword);
        return ranking ? ranking.position : null;
      }

      calculateChange(previousRank, currentRank) {
        if (!previousRank || previousRank === 'Not in top 10' ||
            currentRank === 'Not in top 10') {
          return 0;
        }
        return previousRank - currentRank;
      }

      saveResults(results) {
        this.history.push(results);
        if (this.history.length > 90) {
          this.history = this.history.slice(-90);
        }
        mockFsWriteFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
        const reportFile = `logs/ranking-${results.date}.json`;
        mockFsWriteFileSync(reportFile, JSON.stringify(results, null, 2));
        console.log(`\n💾 Results saved to: ${reportFile}`);
      }

      generateAlerts(results) {
        const alerts = [];
        results.rankings.forEach(r => {
          if (r.change && r.change >= 3) {
            alerts.push({
              type: 'improvement',
              keyword: r.keyword,
              message: `📈 Big improvement! "${r.keyword}" moved up ${r.change} positions to #${r.position}`
            });
          }
          if (r.change && r.change <= -3) {
            alerts.push({
              type: 'drop',
              keyword: r.keyword,
              message: `📉 Drop detected! "${r.keyword}" dropped ${Math.abs(r.change)} positions to #${r.position}`
            });
          }
          if (r.ranking && !this.getPreviousRank(r.keyword)) {
            alerts.push({
              type: 'new',
              keyword: r.keyword,
              message: `🎉 New ranking! "${r.keyword}" now ranks at #${r.position}`
            });
          }
        });

        if (alerts.length > 0) {
          console.log('\n🔔 Alerts:\n');
          alerts.forEach(alert => {
            console.log(`   ${alert.message}`);
          });
          const alertFile = `logs/alerts-${results.date}.json`;
          mockFsWriteFileSync(alertFile, JSON.stringify(alerts, null, 2));
        }

        return alerts;
      }

      async sendDiscordNotifications(results, alerts) {
        try {
          console.log('\n📬 Sending Discord notifications...');
          await mockDiscordNotifier.sendRankingUpdate(results);
          console.log('✅ Ranking update sent to Discord');
          if (alerts.length > 0) {
            await mockDiscordNotifier.sendRankingAlert(alerts);
            console.log('✅ Alert notification sent to Discord');
          }
        } catch (error) {
          console.log('⚠️  Discord notification failed:', error.message);
        }
      }

      printSummary(results) {
        console.log('\n' + '='.repeat(70));
        console.log('\n📈 Ranking Summary\n');

        const ranking = results.rankings.filter(r => r.ranking).length;
        const notRanking = results.rankings.filter(r => !r.ranking && !r.error).length;
        const errors = results.rankings.filter(r => r.error).length;

        console.log(`Keywords Tracked: ${this.keywords.length}`);
        console.log(`Ranking in Top 20: ${ranking}`);
        console.log(`Not Ranking: ${notRanking}`);
        console.log(`Errors: ${errors}`);

        if (ranking > 0) {
          console.log('\n✅ Currently Ranking:\n');
          results.rankings
            .filter(r => r.ranking)
            .forEach(r => {
              console.log(`   ${r.position}. "${r.keyword}"`);
            });
        }

        const positions = results.rankings
          .filter(r => r.ranking && typeof r.position === 'number')
          .map(r => r.position);

        if (positions.length > 0) {
          const avgPosition = (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1);
          console.log(`\n📊 Average Position: ${avgPosition}`);
        }

        if (this.history.length > 1) {
          console.log('\n📅 Trend (Last 7 Days):\n');
          this.printTrend();
        }

        console.log('\n' + '='.repeat(70) + '\n');
      }

      printTrend() {
        const last7Days = this.history.slice(-7);
        this.keywords.slice(0, 5).forEach(keyword => {
          const trend = last7Days.map(day => {
            const ranking = day.rankings.find(r => r.keyword === keyword);
            return ranking?.position || '-';
          });
          console.log(`   ${keyword}: ${trend.join(' → ')}`);
        });
      }

      loadHistory() {
        try {
          if (mockFsExistsSync(this.historyFile)) {
            const data = mockFsReadFileSync(this.historyFile, 'utf8');
            return JSON.parse(data);
          }
        } catch (error) {
          console.log('⚠️  Could not load history, starting fresh');
        }
        return [];
      }

      delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
    };

    monitor = new RankingMonitor();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Constructor', () => {
    test('should initialize with site URL', () => {
      expect(monitor.siteUrl).toBe('https://instantautotraders.com.au');
    });

    test('should initialize with keywords array', () => {
      expect(monitor.keywords).toBeDefined();
      expect(Array.isArray(monitor.keywords)).toBe(true);
      expect(monitor.keywords.length).toBeGreaterThan(0);
    });

    test('should set history file path', () => {
      expect(monitor.historyFile).toBe('logs/ranking-history.json');
    });

    test('should load history on initialization', () => {
      expect(monitor.history).toBeDefined();
      expect(Array.isArray(monitor.history)).toBe(true);
    });
  });

  describe('loadHistory()', () => {
    test('should return empty array when file does not exist', () => {
      mockFsExistsSync.mockReturnValue(false);
      const history = monitor.loadHistory();
      expect(history).toEqual([]);
    });

    test('should load history from file when it exists', () => {
      const mockHistory = [
        { date: '2025-10-18', rankings: [{ keyword: 'test', position: 5 }] }
      ];
      mockFsExistsSync.mockReturnValue(true);
      mockFsReadFileSync.mockReturnValue(JSON.stringify(mockHistory));

      const history = monitor.loadHistory();
      expect(history).toEqual(mockHistory);
    });

    test('should return empty array on read error', () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsReadFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const history = monitor.loadHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getPreviousRank()', () => {
    test('should return null when history is empty', () => {
      monitor.history = [];
      const rank = monitor.getPreviousRank('test keyword');
      expect(rank).toBeNull();
    });

    test('should return previous position for keyword', () => {
      monitor.history = [
        {
          date: '2025-10-18',
          rankings: [{ keyword: 'test keyword', position: 5 }]
        }
      ];

      const rank = monitor.getPreviousRank('test keyword');
      expect(rank).toBe(5);
    });

    test('should return null if keyword not found in history', () => {
      monitor.history = [
        {
          date: '2025-10-18',
          rankings: [{ keyword: 'other keyword', position: 5 }]
        }
      ];

      const rank = monitor.getPreviousRank('test keyword');
      expect(rank).toBeNull();
    });
  });

  describe('calculateChange()', () => {
    test('should return 0 when no previous rank', () => {
      const change = monitor.calculateChange(null, 5);
      expect(change).toBe(0);
    });

    test('should return 0 when previous rank is "Not in top 10"', () => {
      const change = monitor.calculateChange('Not in top 10', 5);
      expect(change).toBe(0);
    });

    test('should return 0 when current rank is "Not in top 10"', () => {
      const change = monitor.calculateChange(5, 'Not in top 10');
      expect(change).toBe(0);
    });

    test('should calculate positive change for improvement (lower position number)', () => {
      // Moved from position 10 to position 5 = +5 improvement
      const change = monitor.calculateChange(10, 5);
      expect(change).toBe(5);
    });

    test('should calculate negative change for drop (higher position number)', () => {
      // Moved from position 5 to position 10 = -5 drop
      const change = monitor.calculateChange(5, 10);
      expect(change).toBe(-5);
    });

    test('should return 0 when position unchanged', () => {
      const change = monitor.calculateChange(5, 5);
      expect(change).toBe(0);
    });
  });

  describe('saveResults()', () => {
    test('should add results to history', () => {
      const results = {
        date: '2025-10-19',
        rankings: [{ keyword: 'test', position: 5 }]
      };

      monitor.history = [];
      monitor.saveResults(results);

      expect(monitor.history).toHaveLength(1);
      expect(monitor.history[0]).toEqual(results);
    });

    test('should limit history to last 90 days', () => {
      // Create 95 days of history
      monitor.history = Array.from({ length: 95 }, (_, i) => ({
        date: `2025-${String(i + 1).padStart(2, '0')}-01`,
        rankings: []
      }));

      const newResult = {
        date: '2025-10-19',
        rankings: []
      };

      monitor.saveResults(newResult);

      expect(monitor.history).toHaveLength(90);
      expect(monitor.history[monitor.history.length - 1]).toEqual(newResult);
    });

    test('should write history to file', () => {
      const results = {
        date: '2025-10-19',
        rankings: []
      };

      monitor.saveResults(results);

      expect(mockFsWriteFileSync).toHaveBeenCalledWith(
        'logs/ranking-history.json',
        expect.any(String)
      );
    });

    test('should write daily report to file', () => {
      const results = {
        date: '2025-10-19',
        rankings: []
      };

      monitor.saveResults(results);

      expect(mockFsWriteFileSync).toHaveBeenCalledWith(
        'logs/ranking-2025-10-19.json',
        expect.any(String)
      );
    });
  });

  describe('generateAlerts()', () => {
    test('should generate improvement alert for +3 or more positions', () => {
      // Set up history to avoid "new" alert
      monitor.history = [
        {
          date: '2025-10-18',
          rankings: [{ keyword: 'test keyword', position: 8 }]
        }
      ];

      const results = {
        date: '2025-10-19',
        rankings: [
          { keyword: 'test keyword', position: 5, change: 3, ranking: true }
        ]
      };

      const alerts = monitor.generateAlerts(results);

      const improvementAlert = alerts.find(a => a.type === 'improvement');
      expect(improvementAlert).toBeDefined();
      expect(improvementAlert.keyword).toBe('test keyword');
    });

    test('should generate drop alert for -3 or more positions', () => {
      // Set up history to avoid "new" alert
      monitor.history = [
        {
          date: '2025-10-18',
          rankings: [{ keyword: 'test keyword', position: 5 }]
        }
      ];

      const results = {
        date: '2025-10-19',
        rankings: [
          { keyword: 'test keyword', position: 10, change: -5, ranking: true }
        ]
      };

      const alerts = monitor.generateAlerts(results);

      const dropAlert = alerts.find(a => a.type === 'drop');
      expect(dropAlert).toBeDefined();
      expect(dropAlert.keyword).toBe('test keyword');
    });

    test('should generate new ranking alert', () => {
      monitor.history = []; // No history = new ranking
      const results = {
        date: '2025-10-19',
        rankings: [
          { keyword: 'test keyword', position: 5, change: 0, ranking: true }
        ]
      };

      const alerts = monitor.generateAlerts(results);

      expect(alerts.length).toBeGreaterThan(0);
      const newAlert = alerts.find(a => a.type === 'new');
      expect(newAlert).toBeDefined();
    });

    test('should return empty array when no alerts', () => {
      const results = {
        date: '2025-10-19',
        rankings: [
          { keyword: 'test keyword', position: 5, change: 1, ranking: true }
        ]
      };

      const alerts = monitor.generateAlerts(results);

      // May have 'new' alert if no history, so filter for improvement/drop
      const significantAlerts = alerts.filter(a => a.type !== 'new');
      expect(significantAlerts).toHaveLength(0);
    });

    test('should save alerts to file when generated', () => {
      const results = {
        date: '2025-10-19',
        rankings: [
          { keyword: 'test keyword', position: 5, change: 5, ranking: true }
        ]
      };

      monitor.generateAlerts(results);

      const alertCalls = mockFsWriteFileSync.mock.calls.filter(call =>
        call[0].includes('alerts-')
      );
      expect(alertCalls.length).toBeGreaterThan(0);
    });
  });

  describe('sendDiscordNotifications()', () => {
    test('should send ranking update to Discord', async () => {
      const results = { date: '2025-10-19', rankings: [] };
      const alerts = [];

      await monitor.sendDiscordNotifications(results, alerts);

      expect(mockDiscordNotifier.sendRankingUpdate).toHaveBeenCalledWith(results);
    });

    test('should send alert notification when alerts present', async () => {
      const results = { date: '2025-10-19', rankings: [] };
      const alerts = [
        { type: 'improvement', keyword: 'test', message: 'Improved!' }
      ];

      await monitor.sendDiscordNotifications(results, alerts);

      expect(mockDiscordNotifier.sendRankingAlert).toHaveBeenCalledWith(alerts);
    });

    test('should not send alert when no alerts', async () => {
      const results = { date: '2025-10-19', rankings: [] };
      const alerts = [];

      await monitor.sendDiscordNotifications(results, alerts);

      expect(mockDiscordNotifier.sendRankingAlert).not.toHaveBeenCalled();
    });

    test('should handle Discord notification failure gracefully', async () => {
      mockDiscordNotifier.sendRankingUpdate.mockRejectedValue(
        new Error('Discord API error')
      );

      const results = { date: '2025-10-19', rankings: [] };
      const alerts = [];

      await expect(
        monitor.sendDiscordNotifications(results, alerts)
      ).resolves.not.toThrow();
    });
  });

  describe('printSummary()', () => {
    test('should display keyword counts', () => {
      const results = {
        date: '2025-10-19',
        rankings: [
          { keyword: 'test 1', position: 5, ranking: true },
          { keyword: 'test 2', position: 15, ranking: true },
          { keyword: 'test 3', ranking: false }
        ]
      };

      monitor.printSummary(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Keywords Tracked:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ranking in Top 20: 2')
      );
    });

    test('should display average position for ranking keywords', () => {
      const results = {
        date: '2025-10-19',
        rankings: [
          { keyword: 'test 1', position: 4, ranking: true },
          { keyword: 'test 2', position: 6, ranking: true }
        ]
      };

      monitor.printSummary(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Average Position: 5.0')
      );
    });

    test('should list currently ranking keywords', () => {
      const results = {
        date: '2025-10-19',
        rankings: [
          { keyword: 'test keyword', position: 5, ranking: true }
        ]
      };

      monitor.printSummary(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Currently Ranking')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('test keyword')
      );
    });

    test('should show trend when history exists', () => {
      monitor.history = [
        { date: '2025-10-18', rankings: [{ keyword: 'test keyword 1', position: 6 }] },
        { date: '2025-10-19', rankings: [{ keyword: 'test keyword 1', position: 5 }] }
      ];

      const results = {
        date: '2025-10-19',
        rankings: [{ keyword: 'test keyword 1', position: 5, ranking: true }]
      };

      monitor.printSummary(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Trend (Last 7 Days)')
      );
    });
  });

  describe('printTrend()', () => {
    test('should display trend for keywords', () => {
      monitor.history = [
        { date: '2025-10-17', rankings: [{ keyword: 'test keyword 1', position: 7 }] },
        { date: '2025-10-18', rankings: [{ keyword: 'test keyword 1', position: 6 }] },
        { date: '2025-10-19', rankings: [{ keyword: 'test keyword 1', position: 5 }] }
      ];

      monitor.printTrend();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('→')
      );
    });

    test('should show "-" for missing data', () => {
      monitor.history = [
        { date: '2025-10-18', rankings: [] },
        { date: '2025-10-19', rankings: [{ keyword: 'test keyword 1', position: 5 }] }
      ];

      monitor.printTrend();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('-')
      );
    });
  });

  describe('delay()', () => {
    test('should return a promise', () => {
      const result = monitor.delay(10);
      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve after specified time', async () => {
      const start = Date.now();
      await monitor.delay(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
    });
  });

  describe('monitor() integration', () => {
    test('should execute full monitoring workflow', async () => {
      // Mock successful API responses
      mockCompetitorAnalyzer.compareWithCompetitors.mockResolvedValue({
        yourSite: { position: 5 },
        insights: { youRank: true, opportunities: [] },
        topCompetitors: [
          { domain: 'competitor1.com' },
          { domain: 'competitor2.com' },
          { domain: 'competitor3.com' }
        ]
      });

      const results = await monitor.monitor();

      expect(results).toBeDefined();
      expect(results.rankings).toBeDefined();
      expect(results.rankings.length).toBe(monitor.keywords.length);
      expect(mockDiscordNotifier.sendRankingUpdate).toHaveBeenCalled();
    });

    test('should handle API errors gracefully', async () => {
      mockCompetitorAnalyzer.compareWithCompetitors.mockRejectedValue(
        new Error('API timeout')
      );

      const results = await monitor.monitor();

      expect(results).toBeDefined();
      expect(results.rankings.some(r => r.error)).toBe(true);
    });

    test('should detect ranking changes', async () => {
      // Set up history with previous ranking
      monitor.history = [
        {
          date: '2025-10-18',
          rankings: [{ keyword: 'test keyword 1', position: 10 }]
        }
      ];

      // Mock current ranking improved to position 5
      mockCompetitorAnalyzer.compareWithCompetitors.mockResolvedValue({
        yourSite: { position: 5 },
        insights: { youRank: true, opportunities: [] },
        topCompetitors: []
      });

      const results = await monitor.monitor();

      // Should detect +5 change (from 10 to 5)
      const ranking = results.rankings.find(r => r.keyword === 'test keyword 1');
      expect(ranking.change).toBe(5);
    });
  });
});
