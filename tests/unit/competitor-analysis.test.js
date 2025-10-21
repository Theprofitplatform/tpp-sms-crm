import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Create mock functions
const mockAxiosGet = jest.fn();

// Mock axios
jest.unstable_mockModule('axios', () => ({
  default: {
    get: mockAxiosGet
  }
}));

// Mock config
jest.unstable_mockModule('../../config/env/config.js', () => ({
  config: {
    competitor: {
      serpApiKey: 'test-serp-api-key',
      bingWebmasterApiKey: 'test-bing-api-key',
      valueSerpApiKey: 'test-valueserp-api-key'
    }
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn()
};

jest.unstable_mockModule('../../src/audit/logger.js', () => ({
  logger: mockLogger
}));

// Import after mocking
const { CompetitorAnalyzer } = await import('../../src/audit/competitor-analysis.js');

describe('Competitor Analysis Module', () => {
  let analyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    analyzer = new CompetitorAnalyzer();
  });

  describe('Constructor', () => {
    test('should initialize with API keys from config', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer.serpApiKey).toBe('test-serp-api-key');
      expect(analyzer.bingApiKey).toBe('test-bing-api-key');
      expect(analyzer.valueSerpApiKey).toBe('test-valueserp-api-key');
    });
  });

  describe('extractDomain()', () => {
    test('should extract domain from valid URL', () => {
      const result = analyzer.extractDomain('https://example.com/page');

      expect(result).toBe('example.com');
    });

    test('should remove www prefix', () => {
      const result = analyzer.extractDomain('https://www.example.com/page');

      expect(result).toBe('example.com');
    });

    test('should handle invalid URLs gracefully', () => {
      const result = analyzer.extractDomain('not-a-valid-url');

      expect(result).toBe('not-a-valid-url');
    });

    test('should handle URLs with subdomains', () => {
      const result = analyzer.extractDomain('https://blog.example.com/post');

      expect(result).toBe('blog.example.com');
    });
  });

  describe('delay()', () => {
    test('should return a promise', () => {
      const result = analyzer.delay(100);

      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve after specified time', async () => {
      const start = Date.now();
      await analyzer.delay(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some margin
    });
  });

  describe('generateInsights()', () => {
    test('should generate insights from competitor data', () => {
      const competitors = [
        { domain: 'example.com', richSnippet: { type: 'review' }, sitelinks: null },
        { domain: 'example2.com', richSnippet: null, sitelinks: ['link1'] },
        { domain: 'example.com', richSnippet: null, sitelinks: null }
      ];

      const insights = analyzer.generateInsights(competitors);

      expect(insights).toHaveProperty('totalCompetitors', 3);
      expect(insights).toHaveProperty('uniqueDomains', 2);
      expect(insights).toHaveProperty('domainDiversity', '66.7%');
      expect(insights).toHaveProperty('richSnippetUsage', 1);
      expect(insights).toHaveProperty('sitelinkUsage', 1);
      expect(insights).toHaveProperty('recommendations');
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    test('should recommend structured data when competitors use it', () => {
      const competitors = [
        { domain: 'example.com', richSnippet: { type: 'review' }, sitelinks: null }
      ];

      const insights = analyzer.generateInsights(competitors);

      expect(insights.recommendations).toContain('Competitors are using structured data (schema.org)');
    });

    test('should recommend sitelinks when competitors have them', () => {
      const competitors = [
        { domain: 'example.com', richSnippet: null, sitelinks: ['link1'] }
      ];

      const insights = analyzer.generateInsights(competitors);

      expect(insights.recommendations).toContain('Top competitors have sitelinks');
    });

    test('should note domain dominance when applicable', () => {
      const competitors = [
        { domain: 'example.com', richSnippet: null, sitelinks: null },
        { domain: 'example.com', richSnippet: null, sitelinks: null },
        { domain: 'example.com', richSnippet: null, sitelinks: null },
        { domain: 'other.com', richSnippet: null, sitelinks: null }
      ];

      const insights = analyzer.generateInsights(competitors);

      expect(insights.recommendations).toContain('Some domains dominate multiple positions');
    });

    test('should handle empty competitors array', () => {
      const insights = analyzer.generateInsights([]);

      expect(insights.totalCompetitors).toBe(0);
      expect(insights.uniqueDomains).toBe(0);
    });
  });

  describe('identifyOpportunities()', () => {
    test('should identify opportunity when not ranking', () => {
      const competitors = [
        { domain: 'example.com', richSnippet: null, sitelinks: null }
      ];

      const opportunities = analyzer.identifyOpportunities(competitors, -1);

      expect(opportunities).toContain('You are not ranking in top 10 - significant opportunity for improvement');
    });

    test('should suggest improvement when ranking below 5', () => {
      const competitors = [
        { domain: 'a.com', richSnippet: null, sitelinks: null },
        { domain: 'b.com', richSnippet: null, sitelinks: null },
        { domain: 'c.com', richSnippet: null, sitelinks: null },
        { domain: 'd.com', richSnippet: null, sitelinks: null },
        { domain: 'e.com', richSnippet: null, sitelinks: null },
        { domain: 'f.com', richSnippet: null, sitelinks: null }
      ];

      const opportunities = analyzer.identifyOpportunities(competitors, 5);

      expect(opportunities).toContain('You can improve from position 6 to top 5');
    });

    test('should recommend structured data when competitors use it', () => {
      const competitors = [
        { domain: 'example.com', richSnippet: { type: 'review' }, sitelinks: null }
      ];

      const opportunities = analyzer.identifyOpportunities(competitors, 0);

      expect(opportunities).toContain('Add structured data to compete with rich snippets');
    });

    test('should recommend sitelinks when competitors have them', () => {
      const competitors = [
        { domain: 'example.com', richSnippet: null, sitelinks: ['link1'] }
      ];

      const opportunities = analyzer.identifyOpportunities(competitors, 0);

      expect(opportunities).toContain('Improve site structure to earn sitelinks');
    });

    test('should not suggest position improvement when in top 5', () => {
      const competitors = [];
      const opportunities = analyzer.identifyOpportunities(competitors, 2);

      const hasPositionImprovement = opportunities.some(o => o.includes('improve from position'));
      expect(hasPositionImprovement).toBe(false);
    });
  });

  describe('analyzeBySerpApi()', () => {
    test('should fetch and format SerpApi results', async () => {
      const mockResponse = {
        data: {
          organic_results: [
            {
              position: 1,
              title: 'Test Title 1',
              link: 'https://example.com/page1',
              snippet: 'Test snippet 1',
              rich_snippet: { type: 'review' },
              sitelinks: ['link1']
            },
            {
              position: 2,
              title: 'Test Title 2',
              link: 'https://example2.com/page2',
              snippet: 'Test snippet 2'
            }
          ],
          search_information: {
            total_results: 10000
          },
          related_searches: [{ query: 'related 1' }],
          related_questions: [{ question: 'What is?' }]
        }
      };

      mockAxiosGet.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyzeBySerpApi('test keyword', {
        location: 'United States',
        device: 'desktop',
        limit: 10
      });

      expect(result).toHaveProperty('keyword', 'test keyword');
      expect(result).toHaveProperty('source', 'SerpApi');
      expect(result).toHaveProperty('totalResults', 10000);
      expect(result.competitors).toHaveLength(2);
      expect(result.competitors[0]).toHaveProperty('position', 1);
      expect(result.competitors[0]).toHaveProperty('title', 'Test Title 1');
      expect(result.competitors[0]).toHaveProperty('domain', 'example.com');
      expect(result).toHaveProperty('relatedSearches');
      expect(result).toHaveProperty('peopleAlsoAsk');
      expect(result).toHaveProperty('insights');
    });

    test('should call SerpApi with correct parameters', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { organic_results: [] }
      });

      await analyzer.analyzeBySerpApi('test keyword', {
        location: 'United States',
        device: 'mobile',
        limit: 5
      });

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://serpapi.com/search',
        {
          params: {
            q: 'test keyword',
            api_key: 'test-serp-api-key',
            location: 'United States',
            device: 'mobile',
            num: 5,
            gl: 'us',
            hl: 'en'
          }
        }
      );
    });

    test('should handle missing optional fields', async () => {
      const mockResponse = {
        data: {
          organic_results: [
            {
              title: 'Test Title',
              link: 'https://example.com/page'
            }
          ]
        }
      };

      mockAxiosGet.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyzeBySerpApi('test keyword', {});

      expect(result.competitors[0].position).toBe(1); // Falls back to index + 1
      expect(result.competitors[0].richSnippet).toBeNull();
      expect(result.competitors[0].sitelinks).toBeNull();
      expect(result.totalResults).toBe(0);
    });

    test('should throw error on API failure', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        analyzer.analyzeBySerpApi('test keyword', {})
      ).rejects.toThrow('API Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'SerpApi request failed',
        'API Error'
      );
    });
  });

  describe('analyzeByValueSerp()', () => {
    test('should fetch and format ValueSerp results', async () => {
      const mockResponse = {
        data: {
          organic_results: [
            {
              position: 1,
              title: 'Test Title 1',
              link: 'https://example.com/page1',
              snippet: 'Test snippet 1'
            }
          ],
          search_information: {
            total_results: 5000
          }
        }
      };

      mockAxiosGet.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyzeByValueSerp('test keyword', {
        location: 'United States',
        device: 'desktop',
        limit: 10
      });

      expect(result).toHaveProperty('keyword', 'test keyword');
      expect(result).toHaveProperty('source', 'ValueSerp');
      expect(result).toHaveProperty('totalResults', 5000);
      expect(result.competitors).toHaveLength(1);
    });

    test('should call ValueSerp API with correct parameters', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { organic_results: [] }
      });

      await analyzer.analyzeByValueSerp('test keyword', {
        location: 'Canada',
        device: 'mobile',
        limit: 20
      });

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.valueserp.com/search',
        {
          params: {
            q: 'test keyword',
            api_key: 'test-valueserp-api-key',
            location: 'Canada',
            device: 'mobile',
            num: 20,
            gl: 'us',
            hl: 'en'
          }
        }
      );
    });

    test('should throw error on API failure', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('ValueSerp Error'));

      await expect(
        analyzer.analyzeByValueSerp('test keyword', {})
      ).rejects.toThrow('ValueSerp Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ValueSerp request failed',
        'ValueSerp Error'
      );
    });
  });

  describe('analyzeKeyword()', () => {
    test('should use SerpApi when key is available', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { organic_results: [] }
      });

      const result = await analyzer.analyzeKeyword('test keyword');

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://serpapi.com/search',
        expect.any(Object)
      );
      expect(result).toHaveProperty('source', 'SerpApi');
    });

    test('should use ValueSerp when SerpApi key not available', async () => {
      const noSerpAnalyzer = new CompetitorAnalyzer();
      noSerpAnalyzer.serpApiKey = null;

      mockAxiosGet.mockResolvedValueOnce({
        data: { organic_results: [] }
      });

      const result = await noSerpAnalyzer.analyzeKeyword('test keyword');

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.valueserp.com/search',
        expect.any(Object)
      );
      expect(result).toHaveProperty('source', 'ValueSerp');
    });

    test('should return message when no API keys configured', async () => {
      const noKeysAnalyzer = new CompetitorAnalyzer();
      noKeysAnalyzer.serpApiKey = null;
      noKeysAnalyzer.valueSerpApiKey = null;

      const result = await noKeysAnalyzer.analyzeKeyword('test keyword');

      expect(result).toHaveProperty('keyword', 'test keyword');
      expect(result).toHaveProperty('competitors', []);
      expect(result.message).toContain('No API keys configured');
      expect(mockLogger.warn).toHaveBeenCalledWith('No competitor analysis API keys configured');
    });

    test('should apply default options', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { organic_results: [] }
      });

      await analyzer.analyzeKeyword('test keyword');

      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            location: 'United States',
            device: 'desktop',
            num: 10
          })
        })
      );
    });

    test('should accept custom options', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { organic_results: [] }
      });

      await analyzer.analyzeKeyword('test keyword', {
        location: 'Canada',
        device: 'mobile',
        limit: 5
      });

      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            location: 'Canada',
            device: 'mobile',
            num: 5
          })
        })
      );
    });

    test('should throw error on failure', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('Network Error'));

      await expect(
        analyzer.analyzeKeyword('test keyword')
      ).rejects.toThrow('Network Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Competitor analysis failed',
        'Network Error'
      );
    });
  });

  describe('getBacklinks()', () => {
    test('should fetch backlinks from Bing Webmaster API', async () => {
      const mockResponse = {
        data: {
          d: [
            {
              SourceUrl: 'https://source1.com/page',
              TargetUrl: 'https://example.com/target',
              AnchorText: 'link text',
              FoundDate: '2024-01-01'
            },
            {
              SourceUrl: 'https://source2.com/page',
              TargetUrl: 'https://example.com/target2',
              AnchorText: 'another link',
              FoundDate: '2024-01-02'
            }
          ]
        }
      };

      mockAxiosGet.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.getBacklinks('https://example.com');

      expect(result).toHaveProperty('siteUrl', 'https://example.com');
      expect(result).toHaveProperty('totalBacklinks', 2);
      expect(result.backlinks).toHaveLength(2);
      expect(result.backlinks[0]).toHaveProperty('sourceUrl', 'https://source1.com/page');
      expect(result.backlinks[0]).toHaveProperty('anchorText', 'link text');
      expect(result.insights).toHaveProperty('uniqueDomains', 2);
      expect(result.insights).toHaveProperty('totalLinks', 2);
    });

    test('should call Bing API with correct parameters', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { d: [] }
      });

      await analyzer.getBacklinks('https://example.com');

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://ssl.bing.com/webmaster/api.svc/json/GetInboundLinks',
        {
          params: {
            apikey: 'test-bing-api-key',
            siteUrl: 'https://example.com',
            top: 100
          }
        }
      );
    });

    test('should return null when API key not configured', async () => {
      const noKeyAnalyzer = new CompetitorAnalyzer();
      noKeyAnalyzer.bingApiKey = null;

      const result = await noKeyAnalyzer.getBacklinks('https://example.com');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Bing Webmaster API key not configured');
    });

    test('should return null on API error', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('Bing API Error'));

      const result = await analyzer.getBacklinks('https://example.com');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Bing Webmaster API failed',
        'Bing API Error'
      );
    });

    test('should count unique domains correctly', async () => {
      const mockResponse = {
        data: {
          d: [
            { SourceUrl: 'https://source.com/page1', TargetUrl: '', AnchorText: '', FoundDate: '' },
            { SourceUrl: 'https://source.com/page2', TargetUrl: '', AnchorText: '', FoundDate: '' },
            { SourceUrl: 'https://other.com/page', TargetUrl: '', AnchorText: '', FoundDate: '' }
          ]
        }
      };

      mockAxiosGet.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.getBacklinks('https://example.com');

      expect(result.insights.uniqueDomains).toBe(2);
      expect(result.insights.totalLinks).toBe(3);
    });
  });

  describe('compareWithCompetitors()', () => {
    test('should compare your site with competitors', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: {
          organic_results: [
            { position: 1, title: 'Title 1', link: 'https://other.com/page', snippet: 'snippet 1' },
            { position: 2, title: 'Title 2', link: 'https://example.com/page', snippet: 'snippet 2' },
            { position: 3, title: 'Title 3', link: 'https://another.com/page', snippet: 'snippet 3' }
          ]
        }
      });

      const result = await analyzer.compareWithCompetitors(
        'https://example.com',
        'test keyword'
      );

      expect(result).toHaveProperty('keyword', 'test keyword');
      expect(result.yourSite).toHaveProperty('url', 'https://example.com');
      expect(result.yourSite).toHaveProperty('domain', 'example.com');
      expect(result.yourSite).toHaveProperty('position', 2);
      expect(result.yourSite).toHaveProperty('ranking', true);
      expect(result.topCompetitors).toHaveLength(3);
      expect(result.insights).toHaveProperty('youRank', true);
      expect(result.insights).toHaveProperty('positionFromTop', 2);
      expect(result.insights).toHaveProperty('competitorsAbove', 1);
    });

    test('should handle when site is not ranking', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: {
          organic_results: [
            { position: 1, title: 'Title 1', link: 'https://other.com/page', snippet: 'snippet 1' }
          ]
        }
      });

      const result = await analyzer.compareWithCompetitors(
        'https://example.com',
        'test keyword'
      );

      expect(result.yourSite.position).toBe('Not in top 10');
      expect(result.yourSite.ranking).toBe(false);
      expect(result.insights.youRank).toBe(false);
      expect(result.insights.positionFromTop).toBeNull();
      expect(result.insights.competitorsAbove).toBe(1);
    });

    test('should limit top competitors to 5', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: {
          organic_results: Array(10).fill(null).map((_, i) => ({
            position: i + 1,
            title: `Title ${i + 1}`,
            link: `https://site${i}.com/page`,
            snippet: `snippet ${i + 1}`
          }))
        }
      });

      const result = await analyzer.compareWithCompetitors(
        'https://example.com',
        'test keyword'
      );

      expect(result.topCompetitors).toHaveLength(5);
    });

    test('should throw error on failure', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('Comparison Error'));

      await expect(
        analyzer.compareWithCompetitors('https://example.com', 'test keyword')
      ).rejects.toThrow('Comparison Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Competitor comparison failed',
        'Comparison Error'
      );
    });
  });

  describe('analyzeMultipleKeywords()', () => {
    test('should analyze multiple keywords', async () => {
      mockAxiosGet
        .mockResolvedValueOnce({ data: { organic_results: [] } })
        .mockResolvedValueOnce({ data: { organic_results: [] } });

      const result = await analyzer.analyzeMultipleKeywords([
        'keyword 1',
        'keyword 2'
      ]);

      expect(result).toHaveProperty('totalKeywords', 2);
      expect(result).toHaveProperty('successful', 2);
      expect(result).toHaveProperty('failed', 0);
      expect(result.results).toHaveLength(2);
    });

    test('should handle individual keyword failures', async () => {
      mockAxiosGet
        .mockResolvedValueOnce({ data: { organic_results: [] } })
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await analyzer.analyzeMultipleKeywords([
        'keyword 1',
        'keyword 2'
      ]);

      expect(result.totalKeywords).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[1]).toHaveProperty('error', 'API Error');
    });

    test('should apply rate limiting between requests', async () => {
      jest.spyOn(analyzer, 'delay');

      mockAxiosGet
        .mockResolvedValueOnce({ data: { organic_results: [] } })
        .mockResolvedValueOnce({ data: { organic_results: [] } });

      await analyzer.analyzeMultipleKeywords(['keyword 1', 'keyword 2']);

      expect(analyzer.delay).toHaveBeenCalledWith(1000);
      expect(analyzer.delay).toHaveBeenCalledTimes(2);
    });

    test('should handle empty keywords array', async () => {
      const result = await analyzer.analyzeMultipleKeywords([]);

      expect(result.totalKeywords).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
});
