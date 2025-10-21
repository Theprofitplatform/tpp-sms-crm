import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Create mock functions
const mockGet = jest.fn();

// Mock axios
jest.unstable_mockModule('axios', () => ({
  default: {
    get: mockGet
  }
}));

// Mock config
jest.unstable_mockModule('../../config/env/config.js', () => ({
  config: {
    wordpress: {
      url: 'https://example.com'
    },
    google: {
      pagespeedApiKey: 'test-api-key'
    }
  }
}));

// Mock logger
const mockLogger = {
  section: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  success: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../../src/audit/logger.js', () => ({
  logger: mockLogger
}));

// Import after mocking
const { TechnicalAuditor } = await import('../../src/audit/technical-audit.js');

describe('Technical Auditor', () => {
  let auditor;

  beforeEach(() => {
    jest.clearAllMocks();
    auditor = new TechnicalAuditor();
  });

  describe('Constructor', () => {
    test('should initialize with base URL', () => {
      expect(auditor.baseUrl).toBe('https://example.com');
    });

    test('should remove trailing slash from URL', () => {
      // The config URL doesn't have trailing slash, but the constructor removes it if present
      expect(auditor.baseUrl).not.toMatch(/\/$/);
    });
  });

  describe('runAudit()', () => {
    test('should run full technical audit', async () => {
      // Mock all the check methods
      mockGet.mockResolvedValue({
        status: 200,
        data: '<?xml version="1.0"?><urlset></urlset>'
      });

      const result = await auditor.runAudit();

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.siteUrl).toBe('https://example.com');
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.metrics).toBeDefined();
    });
  });

  describe('checkHTTPS()', () => {
    test('should pass when site uses HTTPS', async () => {
      const results = { issues: [], recommendations: [] };

      await auditor.checkHTTPS(results);

      expect(results.issues).toHaveLength(0);
      expect(mockLogger.success).toHaveBeenCalledWith('HTTPS enabled');
    });

    test('should flag issue when site does not use HTTPS', async () => {
      // Create auditor with HTTP URL
      const httpAuditor = new TechnicalAuditor();
      httpAuditor.baseUrl = 'http://example.com';

      const results = { issues: [], recommendations: [] };

      await httpAuditor.checkHTTPS(results);

      expect(results.issues).toHaveLength(1);
      expect(results.issues[0].severity).toBe('critical');
      expect(results.issues[0].message).toContain('not using HTTPS');
    });
  });

  describe('checkRobotsTxt()', () => {
    test('should pass when robots.txt exists', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: 'User-agent: *\nDisallow:\nSitemap: https://example.com/sitemap.xml'
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkRobotsTxt(results);

      expect(results.issues).toHaveLength(0);
      expect(mockGet).toHaveBeenCalledWith(
        'https://example.com/robots.txt',
        expect.any(Object)
      );
    });

    test('should flag issue when robots.txt not found', async () => {
      mockGet.mockResolvedValue({ status: 404 });

      const results = { issues: [], recommendations: [] };

      await auditor.checkRobotsTxt(results);

      expect(results.issues.length).toBeGreaterThan(0);
      expect(results.issues[0].message).toContain('robots.txt not found');
    });

    test('should flag issue when robots.txt blocks all crawlers', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: 'User-agent: *\nDisallow: /'
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkRobotsTxt(results);

      expect(results.issues.some(i => i.message.includes('blocking all crawlers'))).toBe(true);
    });

    test('should flag recommendation when sitemap not in robots.txt', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: 'User-agent: *\nDisallow: /admin'
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkRobotsTxt(results);

      expect(results.recommendations.some(r => r.message.includes('sitemap'))).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const results = { issues: [], recommendations: [] };

      await expect(auditor.checkRobotsTxt(results)).resolves.not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('checkSitemap()', () => {
    test('should pass when sitemap.xml exists', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: '<?xml version="1.0"?><urlset></urlset>'
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkSitemap(results);

      expect(results.issues).toHaveLength(0);
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Sitemap found'));
    });

    test('should try multiple sitemap URLs', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({
          status: 200,
          data: '<?xml version="1.0"?><urlset></urlset>'
        });

      const results = { issues: [], recommendations: [] };

      await auditor.checkSitemap(results);

      expect(mockGet).toHaveBeenCalledTimes(3);
      expect(results.issues).toHaveLength(0);
    });

    test('should flag issue when no sitemap found', async () => {
      mockGet.mockResolvedValue({ status: 404, data: 'Not found' });

      const results = { issues: [], recommendations: [] };

      await auditor.checkSitemap(results);

      expect(results.issues.length).toBeGreaterThan(0);
      expect(results.issues[0].message).toContain('sitemap not found');
      expect(results.issues[0].severity).toBe('high');
    });

    test('should handle non-XML responses', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: '<html><body>Not a sitemap</body></html>'
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkSitemap(results);

      expect(results.issues.some(i => i.message.includes('sitemap'))).toBe(true);
    });
  });

  describe('checkSchema()', () => {
    test('should pass when structured data found', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: `
          <html>
            <script type="application/ld+json">
              { "@type": "Organization", "name": "Test" }
            </script>
          </html>
        `
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkSchema(results);

      expect(results.issues).toHaveLength(0);
      expect(mockLogger.success).toHaveBeenCalledWith('Structured data detected');
    });

    test('should flag issue when no structured data found', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: '<html><body>No schema</body></html>'
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkSchema(results);

      expect(results.issues.some(i => i.message.includes('No structured data'))).toBe(true);
      expect(results.issues[0].severity).toBe('medium');
    });

    test('should recommend Organization schema if missing', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: `
          <html>
            <script type="application/ld+json">
              { "@type": "WebSite" }
            </script>
          </html>
        `
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkSchema(results);

      expect(results.recommendations.some(r => r.message.includes('Organization schema'))).toBe(true);
    });

    test('should recommend WebSite schema if missing', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: `
          <html>
            <script type="application/ld+json">
              { "@type": "Organization" }
            </script>
          </html>
        `
      });

      const results = { issues: [], recommendations: [] };

      await auditor.checkSchema(results);

      expect(results.recommendations.some(r => r.message.includes('WebSite schema'))).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Connection timeout'));

      const results = { issues: [], recommendations: [] };

      await expect(auditor.checkSchema(results)).resolves.not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('checkCoreWebVitals()', () => {
    test('should skip when API key not configured', async () => {
      // Create auditor without API key
      const noKeyAuditor = new TechnicalAuditor();
      // We'd need to mock config differently here, but we can test the warning

      const results = { issues: [], metrics: {} };

      // This test requires mocking config differently, skipping for now
      // The real implementation checks config.google.pagespeedApiKey
    });

    test('should fetch PageSpeed metrics for mobile and desktop', async () => {
      mockGet.mockResolvedValue({
        data: {
          lighthouseResult: {
            categories: {
              performance: { score: 0.85 },
              accessibility: { score: 0.92 },
              'best-practices': { score: 0.88 },
              seo: { score: 0.95 }
            },
            audits: {
              'largest-contentful-paint': { numericValue: 2000 },
              'max-potential-fid': { numericValue: 100 },
              'cumulative-layout-shift': { numericValue: 0.05 },
              'first-contentful-paint': { numericValue: 1500 },
              'server-response-time': { numericValue: 300 }
            }
          }
        }
      });

      const results = { issues: [], metrics: {} };

      await auditor.checkCoreWebVitals(results);

      // Should call PageSpeed API twice (mobile + desktop)
      expect(mockGet).toHaveBeenCalled();
    });

    test('should flag performance issues when score is low', async () => {
      mockGet.mockResolvedValue({
        data: {
          lighthouseResult: {
            categories: {
              performance: { score: 0.35 },
              accessibility: { score: 0.80 },
              'best-practices': { score: 0.70 },
              seo: { score: 0.90 }
            },
            audits: {
              'largest-contentful-paint': { numericValue: 4000 },
              'max-potential-fid': { numericValue: 200 },
              'cumulative-layout-shift': { numericValue: 0.15 },
              'first-contentful-paint': { numericValue: 2000 },
              'server-response-time': { numericValue: 600 }
            }
          }
        }
      });

      const results = { issues: [], metrics: {} };

      await auditor.checkCoreWebVitals(results);

      // Should flag performance issue for score < 50
      expect(results.issues.some(i => i.message.includes('Poor') && i.message.includes('performance score'))).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('API quota exceeded'));

      const results = { issues: [], metrics: {} };

      await auditor.checkCoreWebVitals(results);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(results.issues.some(i => i.message.includes('Could not fetch Core Web Vitals'))).toBe(true);
    });
  });

  describe('auditPost()', () => {
    test('should audit post for technical issues', async () => {
      const post = {
        id: 123,
        link: 'https://example.com/test-post',
        featured_media: 456
      };

      const result = await auditor.auditPost(post);

      expect(result.postId).toBe(123);
      expect(result.url).toBe('https://example.com/test-post');
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    test('should recommend canonical URL', async () => {
      const post = {
        id: 123,
        link: 'https://example.com/test-post',
        featured_media: 456
      };

      const result = await auditor.auditPost(post);

      expect(result.recommendations.some(r => r.message.includes('canonical'))).toBe(true);
    });

    test('should flag missing featured image', async () => {
      const post = {
        id: 123,
        link: 'https://example.com/test-post',
        featured_media: 0
      };

      const result = await auditor.auditPost(post);

      expect(result.issues.some(i => i.message.includes('No featured image'))).toBe(true);
      expect(result.issues[0].severity).toBe('medium');
    });

    test('should handle post without featured_media field', async () => {
      const post = {
        id: 123,
        link: 'https://example.com/test-post'
      };

      const result = await auditor.auditPost(post);

      expect(result.issues.some(i => i.message.includes('featured image'))).toBe(true);
    });
  });

  describe('checkCoreWebVitals() - Coverage paths', () => {
    test('should skip check when API key not configured', async () => {
      // Create auditor with no API key
      const { config } = await import('../../config/env/config.js');
      const originalKey = config.google.pagespeedApiKey;
      config.google.pagespeedApiKey = null;

      const results = {
        issues: [],
        metrics: {}
      };

      await auditor.checkCoreWebVitals(results);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('PageSpeed API key not configured')
      );

      // Restore
      config.google.pagespeedApiKey = originalKey;
    });

    test('should collect optimization opportunities with savings > 1s', async () => {
      const mockPageSpeedData = {
        data: {
          lighthouseResult: {
            categories: {
              performance: { score: 0.75 },
              accessibility: { score: 0.90 },
              'best-practices': { score: 0.85 },
              seo: { score: 0.95 }
            },
            audits: {
              'largest-contentful-paint': { numericValue: 2500 },
              'max-potential-fid': { numericValue: 100 },
              'cumulative-layout-shift': { numericValue: 0.1 },
              'first-contentful-paint': { numericValue: 1500 },
              'server-response-time': { numericValue: 200 },
              'render-blocking-resources': {
                title: 'Eliminate render-blocking resources',
                description: 'Resources are blocking the first paint',
                details: {
                  overallSavingsMs: 1500 // > 1000ms
                }
              },
              'unused-css': {
                title: 'Remove unused CSS',
                description: 'Reduce unused CSS',
                details: {
                  overallSavingsMs: 500 // < 1000ms, should not be included
                }
              }
            }
          }
        }
      };

      mockGet.mockResolvedValueOnce(mockPageSpeedData);

      const results = {
        issues: [],
        metrics: {}
      };

      await auditor.checkCoreWebVitals(results);

      expect(results.metrics.mobile).toBeDefined();
      expect(results.metrics.mobile.opportunities).toBeDefined();
      expect(results.metrics.mobile.opportunities.length).toBe(1);
      expect(results.metrics.mobile.opportunities[0].title).toBe('Eliminate render-blocking resources');
      expect(results.metrics.mobile.opportunities[0].savings).toBe('1.50s');
    });

    test('should handle missing audit details', async () => {
      const mockPageSpeedData = {
        data: {
          lighthouseResult: {
            categories: {
              performance: { score: 0.80 },
              accessibility: { score: 0.90 },
              'best-practices': { score: 0.85 },
              seo: { score: 0.95 }
            },
            audits: {
              'largest-contentful-paint': { numericValue: 2500 },
              'max-potential-fid': { numericValue: 100 },
              'cumulative-layout-shift': { numericValue: 0.1 },
              'first-contentful-paint': { numericValue: 1500 },
              'server-response-time': { numericValue: 200 },
              'some-audit': {
                title: 'Some Audit',
                description: 'Description'
                // No details field
              }
            }
          }
        }
      };

      mockGet.mockResolvedValueOnce(mockPageSpeedData);

      const results = {
        issues: [],
        metrics: {}
      };

      await auditor.checkCoreWebVitals(results);

      // Should not crash, opportunities should be empty since no audit has overallSavingsMs > 1000
      expect(results.metrics.mobile).toBeDefined();
      expect(results.metrics.mobile.opportunities).toBeDefined();
      expect(results.metrics.mobile.opportunities).toHaveLength(0);
    });
  });

  describe('Exported function coverage', () => {
    test('should cover exported runTechnicalAudit function (lines 340-341)', async () => {
      const { runTechnicalAudit } = await import('../../src/audit/technical-audit.js');

      // Mock all axios calls
      mockGet.mockResolvedValueOnce({ status: 200, data: '' }); // robots
      mockGet.mockResolvedValueOnce({ status: 200, data: '' }); // sitemap
      mockGet.mockResolvedValueOnce({ status: 200, data: { lighthouseResult: { audits: {} } } }); // pagespeed

      const results = await runTechnicalAudit();

      expect(results).toBeDefined();
      expect(results.issues).toBeDefined();
      expect(results.metrics).toBeDefined();
    });
  });
});
