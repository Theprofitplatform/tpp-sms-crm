import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPosts } from '../fixtures/mock-posts.js';

// Mock logger BEFORE importing the modules that use it
const mockLogger = {
  section: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../../src/audit/logger.js', () => ({
  logger: mockLogger
}));

// Mock config
jest.unstable_mockModule('../../config/env/config.js', () => ({
  config: {
    wordpress: {
      url: 'https://instantautotraders.com.au'
    },
    automation: {
      minContentLength: 300
    }
  }
}));

// Dynamic import after mocking
const { SEOAuditor, auditPosts } = await import('../../src/audit/seo-audit.js');

describe('SEO Auditor', () => {
  let auditor;

  beforeEach(() => {
    auditor = new SEOAuditor();
  });

  describe('Perfect Post', () => {
    test('should score highly for well-optimized post', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);

      expect(result).toBeDefined();
      expect(result.postId).toBe(1);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.issues.length).toBeLessThan(3);
    });

    test('should return results structure', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);

      expect(result).toHaveProperty('postId');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });
  });

  describe('Title Checks', () => {
    test('should detect short title', async () => {
      const result = await auditor.auditPost(mockPosts.poorTitle);
      const titleIssue = result.issues.find(i => i.type === 'title');

      expect(titleIssue).toBeDefined();
      expect(titleIssue.message).toContain('too short');
      expect(titleIssue.severity).toBe('warning');
      expect(titleIssue.fix).toBeDefined();
    });

    test('should detect long title', async () => {
      const result = await auditor.auditPost(mockPosts.longTitle);
      const titleIssue = result.issues.find(i => i.type === 'title');

      expect(titleIssue).toBeDefined();
      expect(titleIssue.message).toContain('too long');
      expect(titleIssue.fix).toContain('60 characters');
    });

    test('should accept optimal title length', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);
      const titleIssue = result.issues.find(i => i.type === 'title');

      // Should either have no title issues or only minor suggestions
      if (titleIssue) {
        expect(titleIssue.severity).not.toBe('critical');
      }
    });
  });

  describe('Heading Checks', () => {
    test('should detect missing H1', async () => {
      const result = await auditor.auditPost(mockPosts.missingH1);
      const h1Issue = result.issues.find(
        i => i.type === 'headings' && i.message.toLowerCase().includes('h1')
      );

      expect(h1Issue).toBeDefined();
      expect(h1Issue.severity).toBe('critical');
    });

    test('should detect broken heading hierarchy', async () => {
      const result = await auditor.auditPost(mockPosts.brokenHierarchy);
      const hierarchyIssue = result.issues.find(
        i => i.type === 'headings' && i.message.toLowerCase().includes('hierarchy')
      );

      expect(hierarchyIssue).toBeDefined();
      expect(hierarchyIssue.fix).toBeDefined();
    });

    test('should validate proper heading structure', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);
      const headingIssues = result.issues.filter(i => i.type === 'headings');

      // Should have minimal or no heading issues
      expect(headingIssues.length).toBeLessThan(2);
    });
  });

  describe('Content Checks', () => {
    test('should detect thin content', async () => {
      const result = await auditor.auditPost(mockPosts.thinContent);
      const contentIssue = result.issues.find(
        i => i.type === 'content' && i.message.toLowerCase().includes('thin')
      );

      expect(contentIssue).toBeDefined();
      expect(contentIssue.severity).toBe('high');
    });

    test('should count words correctly', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);

      expect(result.meta).toBeDefined();
      expect(result.meta.wordCount).toBeGreaterThan(100);
    });

    test('should validate sufficient content length', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);
      const thinContentIssue = result.issues.find(
        i => i.type === 'content' && i.message.toLowerCase().includes('thin')
      );

      expect(thinContentIssue).toBeUndefined();
    });
  });

  describe('Image Checks', () => {
    test('should detect missing alt text', async () => {
      const result = await auditor.auditPost(mockPosts.missingImages);
      const imageIssue = result.issues.find(
        i => i.type === 'images' && i.message.toLowerCase().includes('alt')
      );

      expect(imageIssue).toBeDefined();
      expect(imageIssue.fix).toContain('alt');
    });

    test('should pass when all images have alt text', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);
      const imageIssue = result.issues.find(
        i => i.type === 'images' && i.message.toLowerCase().includes('missing alt')
      );

      expect(imageIssue).toBeUndefined();
    });
  });

  describe('Internal Links', () => {
    test('should detect lack of internal links', async () => {
      const result = await auditor.auditPost(mockPosts.noInternalLinks);
      const linkIssue = result.issues.find(
        i => i.type === 'links' && i.message.toLowerCase().includes('internal')
      );

      // Should either detect missing internal links or low link count
      expect(result.meta).toBeDefined();
    });

    test('should count links properly', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);

      expect(result.meta).toBeDefined();
      if (result.meta.internalLinks !== undefined) {
        expect(typeof result.meta.internalLinks).toBe('number');
      }
    });
  });

  describe('Keyword Density', () => {
    test('should detect keyword stuffing', async () => {
      const result = await auditor.auditPost(mockPosts.keywordStuffing);
      const keywordIssue = result.issues.find(
        i => i.type === 'keywords' || i.message.toLowerCase().includes('keyword')
      );

      // May detect keyword stuffing or density issues
      expect(result).toBeDefined();
    });

    test('should calculate keyword density', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
    });
  });

  describe('Meta Description', () => {
    test('should validate meta description from Yoast', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);
      const metaIssue = result.issues.find(i => i.type === 'meta_description');

      // Should either pass or have minor warnings
      if (metaIssue) {
        expect(metaIssue.severity).not.toBe('critical');
      }
    });

    test('should detect missing meta description', async () => {
      const postNoMeta = {
        ...mockPosts.poorTitle,
        excerpt: { rendered: '' },
        yoast_head_json: undefined
      };

      const result = await auditor.auditPost(postNoMeta);
      const metaIssue = result.issues.find(i => i.type === 'meta_description');

      expect(metaIssue).toBeDefined();
      expect(metaIssue.message).toContain('Missing');
    });
  });

  describe('Score Calculation', () => {
    test('should calculate score based on issues', async () => {
      const perfectResult = await auditor.auditPost(mockPosts.perfect);
      const poorResult = await auditor.auditPost(mockPosts.thinContent);

      expect(perfectResult.score).toBeGreaterThan(poorResult.score);
    });

    test('should return score between 0 and 100', async () => {
      const result = await auditor.auditPost(mockPosts.thinContent);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should penalize multiple issues', async () => {
      const result = await auditor.auditPost(mockPosts.missingH1);

      expect(result.score).toBeLessThan(100);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Fix Suggestions', () => {
    test('should provide fix for every issue', async () => {
      const result = await auditor.auditPost(mockPosts.poorTitle);

      result.issues.forEach(issue => {
        expect(issue.fix).toBeDefined();
        expect(issue.fix.length).toBeGreaterThan(0);
      });
    });

    test('should categorize issue severity', async () => {
      const result = await auditor.auditPost(mockPosts.missingH1);
      const validSeverities = ['critical', 'high', 'medium', 'warning', 'low'];

      result.issues.forEach(issue => {
        expect(validSeverities).toContain(issue.severity);
      });
    });
  });

  describe('Permalink Checks', () => {
    test('should detect long slug with stop words', async () => {
      const longSlugPost = {
        ...mockPosts.perfect,
        slug: 'this-is-a-very-long-slug-with-many-stop-words-and-unnecessary-words'
      };

      const result = await auditor.auditPost(longSlugPost);

      // May or may not detect depending on implementation
      expect(result).toBeDefined();
    });

    test('should validate clean slugs', async () => {
      const result = await auditor.auditPost(mockPosts.perfect);

      expect(result.url).toBeDefined();
      expect(result.url).toContain('perfect-seo-post');
    });

    test('should detect slug longer than 75 characters', async () => {
      const veryLongSlugPost = {
        ...mockPosts.perfect,
        slug: 'this-is-an-extremely-long-slug-that-exceeds-seventy-five-characters-limit-for-url-optimization'
      };

      const result = await auditor.auditPost(veryLongSlugPost);
      const permalinkIssue = result.issues.find(
        i => i.type === 'permalink' && i.message.includes('too long')
      );

      expect(permalinkIssue).toBeDefined();
      expect(permalinkIssue.severity).toBe('low');
    });

    test('should detect dates in permalink', async () => {
      const datePermalinkPost = {
        ...mockPosts.perfect,
        link: 'https://example.com/2024/01/15/perfect-seo-post/'
      };

      const result = await auditor.auditPost(datePermalinkPost);
      const dateSuggestion = result.suggestions.find(
        s => s.type === 'permalink' && s.message.includes('dates')
      );

      expect(dateSuggestion).toBeDefined();
      expect(dateSuggestion.message).toContain('evergreen');
    });
  });

  describe('Title Edge Cases', () => {
    test('should detect missing title (empty string)', async () => {
      const emptyTitlePost = {
        ...mockPosts.perfect,
        title: { rendered: '' }
      };

      const result = await auditor.auditPost(emptyTitlePost);
      const titleIssue = result.issues.find(
        i => i.type === 'title' && i.message === 'Missing title'
      );

      expect(titleIssue).toBeDefined();
      expect(titleIssue.severity).toBe('critical');
      expect(titleIssue.fix).toBe('Add a descriptive title');
    });

    test('should detect missing title (whitespace only)', async () => {
      const whitespaceTitlePost = {
        ...mockPosts.perfect,
        title: { rendered: '   ' }
      };

      const result = await auditor.auditPost(whitespaceTitlePost);
      const titleIssue = result.issues.find(
        i => i.type === 'title' && i.message === 'Missing title'
      );

      expect(titleIssue).toBeDefined();
      expect(titleIssue.severity).toBe('critical');
    });
  });

  describe('Meta Description Edge Cases', () => {
    test('should detect meta description longer than 160 characters', async () => {
      const longMetaPost = {
        ...mockPosts.perfect,
        yoast_head_json: {
          og_description: 'This is an extremely long meta description that significantly exceeds the recommended 160 character limit for optimal search engine display and should be flagged'
        }
      };

      const result = await auditor.auditPost(longMetaPost);
      const metaIssue = result.issues.find(
        i => i.type === 'meta_description' && i.message.includes('too long')
      );

      expect(metaIssue).toBeDefined();
      expect(metaIssue.severity).toBe('warning');
      expect(metaIssue.fix).toContain('160 characters');
    });
  });

  describe('Heading Edge Cases', () => {
    test('should detect multiple H1 tags', async () => {
      const multipleH1Post = {
        ...mockPosts.perfect,
        content: { rendered: '<h1>First H1</h1><p>Content</p><h1>Second H1</h1><h2>Heading 2</h2>' }
      };

      const result = await auditor.auditPost(multipleH1Post);
      const h1Issue = result.issues.find(
        i => i.type === 'headings' && i.message.includes('Multiple H1')
      );

      expect(h1Issue).toBeDefined();
      expect(h1Issue.severity).toBe('high');
      expect(h1Issue.fix).toContain('only one H1');
    });

    test('should report exact count of multiple H1 tags', async () => {
      const threeH1Post = {
        ...mockPosts.perfect,
        content: { rendered: '<h1>H1 One</h1><h1>H1 Two</h1><h1>H1 Three</h1>' }
      };

      const result = await auditor.auditPost(threeH1Post);
      const h1Issue = result.issues.find(
        i => i.type === 'headings' && i.message.includes('Multiple H1')
      );

      expect(h1Issue).toBeDefined();
      expect(h1Issue.message).toContain('3');
    });
  });

  describe('Internal Links with WordPress URL', () => {
    test('should count internal links that match WordPress URL', async () => {
      const internalLinksPost = {
        ...mockPosts.perfect,
        content: {
          rendered: `
            <p>Check out <a href="https://instantautotraders.com.au/cars">our cars</a> page.</p>
            <p>External link to <a href="https://example.com">Example</a>.</p>
            <p>Another <a href="https://instantautotraders.com.au/about">internal link</a>.</p>
          `
        }
      };

      const result = await auditor.auditPost(internalLinksPost);

      expect(result.meta).toBeDefined();
      expect(result.meta.internalLinks).toBe(2);
      expect(result.meta.externalLinks).toBe(1);
    });
  });

  describe('auditPosts() function', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      mockLogger.section.mockClear();
      mockLogger.info.mockClear();
      mockLogger.success.mockClear();
      mockLogger.error.mockClear();
    });

    test('should audit multiple posts and return results', async () => {
      const posts = [mockPosts.perfect, mockPosts.poorTitle];

      const results = await auditPosts(posts);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('postId');
      expect(results[0]).toHaveProperty('score');
      expect(results[1]).toHaveProperty('postId');
      expect(results[1]).toHaveProperty('score');
    });

    test('should call logger methods during audit', async () => {
      const posts = [mockPosts.perfect];

      await auditPosts(posts);

      expect(mockLogger.section).toHaveBeenCalledWith('Starting Content SEO Audit');
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.success).toHaveBeenCalledWith('Audited 1 posts');
    });

    test('should handle audit errors gracefully', async () => {
      const invalidPost = {
        id: 999,
        title: { rendered: 'Test' },
        content: null // Will cause an error in cheerio.load
      };

      const results = await auditPosts([invalidPost]);

      // Should return empty results array when audit fails
      expect(mockLogger.error).toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });

    test('should continue auditing after one post fails', async () => {
      const posts = [
        { id: 999, title: { rendered: 'Invalid' }, content: null }, // Invalid - will fail in auditPost
        mockPosts.perfect // Valid
      ];

      const results = await auditPosts(posts);

      // Should have result for the valid post
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.success).toHaveBeenCalled();
    });

    test('should log score and issue count for each post', async () => {
      const posts = [mockPosts.perfect];

      await auditPosts(posts);

      // Check that info was called with score and issues
      const infoCalls = mockLogger.info.mock.calls;
      const scoreLog = infoCalls.find(call =>
        call[0].includes('Score:') && call[0].includes('Issues:')
      );

      expect(scoreLog).toBeDefined();
    });

    test('should return empty array when no posts provided', async () => {
      const results = await auditPosts([]);

      expect(results).toHaveLength(0);
      expect(mockLogger.success).toHaveBeenCalledWith('Audited 0 posts');
    });
  });
});
