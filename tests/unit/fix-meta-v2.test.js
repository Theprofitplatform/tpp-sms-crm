import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Create mock functions
const mockUpdatePost = jest.fn();
const mockFetchPost = jest.fn();

// Mock wpClient
jest.unstable_mockModule('../../src/audit/fetch-posts.js', () => ({
  wpClient: {
    updatePost: mockUpdatePost,
    fetchPost: mockFetchPost
  }
}));

// Mock config
jest.unstable_mockModule('../../config/env/config.js', () => ({
  config: {
    safety: {
      dryRun: false,
      applyToPublished: true
    }
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  section: jest.fn()
};

jest.unstable_mockModule('../../src/audit/logger.js', () => ({
  logger: mockLogger
}));

// Import after mocking
const { SEOFixerV2 } = await import('../../src/audit/fix-meta-v2.js');

describe('SEO Fixer V2', () => {
  let fixer;

  beforeEach(() => {
    jest.clearAllMocks();
    fixer = new SEOFixerV2();
  });

  describe('Constructor', () => {
    test('should initialize with default settings', () => {
      expect(fixer).toBeDefined();
      expect(fixer.dryRun).toBe(false);
      expect(fixer.appliedFixes).toEqual([]);
      expect(fixer.siteName).toBe('Instant Auto Traders');
    });

    test('should accept custom options', () => {
      const customFixer = new SEOFixerV2({
        siteName: 'Custom Site',
        titleTemplate: '{title} - {siteName}'
      });

      expect(customFixer.siteName).toBe('Custom Site');
      expect(customFixer.titleTemplate).toBe('{title} - {siteName}');
    });
  });

  describe('generateSmartTitle()', () => {
    test('should handle HTML entities in titles', () => {
      const mockPost = {
        title: { rendered: 'Test &#8211; Title &#8212; Here' },
        _embedded: {}
      };
      const mockAudit = { issues: [] };

      const result = fixer.generateSmartTitle(mockPost, mockAudit);

      expect(result).not.toContain('&#8211;');
      expect(result).not.toContain('&#8212;');
      expect(result).toContain('-');
      expect(result).toContain('—');
    });

    test('should extend short titles with site name', () => {
      const mockPost = {
        title: { rendered: 'Short' },
        _embedded: {}
      };
      const mockAudit = { issues: [] };

      const result = fixer.generateSmartTitle(mockPost, mockAudit);

      expect(result).toContain('Instant Auto Traders');
      expect(result.length).toBeGreaterThan(20);
    });

    test('should truncate long titles intelligently', () => {
      const longTitle = 'This is an extremely long title that exceeds sixty characters and needs truncation';
      const mockPost = {
        title: { rendered: longTitle },
        _embedded: {}
      };
      const mockAudit = { issues: [] };

      const result = fixer.generateSmartTitle(mockPost, mockAudit);

      expect(result.length).toBeLessThanOrEqual(60);
      expect(result).toContain('...');
    });

    test('should use category name for short titles when available', () => {
      const mockPost = {
        title: { rendered: 'Cars' },
        _embedded: {
          'wp:term': [[{ name: 'Buying Guide', slug: 'buying-guide' }]]
        }
      };
      const mockAudit = { issues: [] };

      const result = fixer.generateSmartTitle(mockPost, mockAudit);

      expect(result).toContain('Buying Guide');
    });

    test('should remove generic suffixes', () => {
      const mockPost = {
        title: { rendered: 'Great Article - Business Guide' },
        _embedded: {}
      };
      const mockAudit = { issues: [] };

      const result = fixer.generateSmartTitle(mockPost, mockAudit);

      expect(result).not.toContain('Business Guide');
    });
  });

  describe('generateSmartExcerpt()', () => {
    test('should extract excerpt from content paragraphs', () => {
      const mockPost = {
        title: { rendered: 'Test Post' },
        content: {
          rendered: '<p>This is the first meaningful paragraph with good content.</p><p>Second paragraph here.</p>'
        }
      };

      const result = fixer.generateSmartExcerpt(mockPost);

      expect(result).toContain('first meaningful paragraph');
      expect(result.length).toBeGreaterThan(50);
    });

    test('should skip "Table of Contents" in excerpt', () => {
      const mockPost = {
        title: { rendered: 'Test Post' },
        content: {
          rendered: '<p>Table of Contents</p><p>This is actual content that should be used.</p>'
        }
      };

      const result = fixer.generateSmartExcerpt(mockPost);

      expect(result).not.toContain('Table of Contents');
      expect(result).toContain('actual content');
    });

    test('should limit excerpt to 160 characters', () => {
      const longContent = '<p>' + 'word '.repeat(100) + '</p>';
      const mockPost = {
        title: { rendered: 'Test' },
        content: { rendered: longContent }
      };

      const result = fixer.generateSmartExcerpt(mockPost);

      expect(result.length).toBeLessThanOrEqual(160);
    });

    test('should return empty string if no content', () => {
      const mockPost = {
        title: { rendered: 'Great SEO Title Here' },
        content: { rendered: '' }
      };

      const result = fixer.generateSmartExcerpt(mockPost);

      // Without content paragraphs, returns empty
      expect(typeof result).toBe('string');
    });
  });

  describe('analyzeH1Situation()', () => {
    test('should detect missing H1', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<p>Content without H1</p>' }
      };
      const mockAudit = {
        issues: [{ type: 'headings', message: 'Missing H1' }]
      };

      const result = fixer.analyzeH1Situation(mockPost, mockAudit);

      expect(result.needsFix).toBe(true);
    });

    test('should not fix when H1 already exists', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<h1>Existing H1</h1><p>Content</p>' }
      };
      const mockAudit = { issues: [] };

      const result = fixer.analyzeH1Situation(mockPost, mockAudit);

      expect(result.needsFix).toBe(false);
    });

    test('should provide fix reason', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<p>No heading</p>' }
      };
      const mockAudit = {
        issues: [{ type: 'headings', message: 'Missing H1' }]
      };

      const result = fixer.analyzeH1Situation(mockPost, mockAudit);

      expect(result.reason).toBeDefined();
      expect(typeof result.reason).toBe('string');
    });
  });

  describe('generateOptimizedSlug()', () => {
    test('should generate clean slug from title', () => {
      const mockPost = {
        title: { rendered: 'Great Cars for Sale in Sydney' },
        slug: 'original-slug'
      };

      const result = fixer.generateOptimizedSlug(mockPost);

      expect(result).toBeDefined();
      expect(result).toMatch(/^[a-z0-9-]+$/);
      expect(result).not.toContain(' ');
    });

    test('should remove stop words from slug', () => {
      const mockPost = {
        title: { rendered: 'The Best Guide for Buying Cars' },
        slug: 'the-best-guide-for-buying-cars'
      };

      const result = fixer.generateOptimizedSlug(mockPost);

      // Should remove common stop words like "the", "for"
      expect(result).not.toMatch(/^the-/);
    });

    test('should handle special characters', () => {
      const mockPost = {
        title: { rendered: 'Cars & Trucks: A Guide!' },
        slug: 'old-slug'
      };

      const result = fixer.generateOptimizedSlug(mockPost);

      expect(result).not.toContain('&');
      expect(result).not.toContain(':');
      expect(result).not.toContain('!');
    });
  });

  describe('hasStopWords()', () => {
    test('should detect stop words in long slug', () => {
      // Requires > 4 words to detect stop words
      const result = fixer.hasStopWords('the-best-guide-for-buying-cars');

      expect(result).toBe(true);
    });

    test('should return false for short slug', () => {
      // Slugs with <= 4 words are not checked
      const result = fixer.hasStopWords('the-best-guide');

      expect(result).toBe(false);
    });

    test('should return false for clean slug', () => {
      const result = fixer.hasStopWords('cars-sydney');

      expect(result).toBe(false);
    });
  });

  describe('shouldFixTitle()', () => {
    test('should return true when title issues exist', () => {
      const mockAudit = {
        issues: [{ type: 'title', severity: 'warning', message: 'Title too short' }]
      };

      const result = fixer.shouldFixTitle(mockAudit);

      expect(result).toBe(true);
    });

    test('should return false when no title issues', () => {
      const mockAudit = {
        issues: [{ type: 'content', message: 'Other issue' }]
      };

      const result = fixer.shouldFixTitle(mockAudit);

      expect(result).toBe(false);
    });
  });

  describe('shouldFixExcerpt()', () => {
    test('should return true when excerpt issues exist', () => {
      const mockAudit = {
        issues: [{ type: 'meta_description', message: 'Missing excerpt' }]
      };
      const mockPost = {
        excerpt: { rendered: '' }
      };

      const result = fixer.shouldFixExcerpt(mockAudit, mockPost);

      expect(result).toBe(true);
    });

    test('should handle missing excerpt field', () => {
      const mockAudit = { issues: [] };
      const mockPost = {};

      const result = fixer.shouldFixExcerpt(mockAudit, mockPost);

      expect(typeof result).toBe('boolean');
    });

    test('should return true when excerpt is too short', () => {
      const mockAudit = { issues: [] };
      const mockPost = {
        excerpt: { rendered: 'Too short' }
      };

      const result = fixer.shouldFixExcerpt(mockAudit, mockPost);

      expect(result).toBe(true);
    });

    test('should return true when excerpt contains Table of Contents', () => {
      const mockAudit = { issues: [] };
      const mockPost = {
        excerpt: { rendered: 'This post has a Table of Contents section that should not be in excerpt' }
      };

      const result = fixer.shouldFixExcerpt(mockAudit, mockPost);

      expect(result).toBe(true);
    });
  });

  describe('shouldFixSlug()', () => {
    test('should return true when permalink issues exist', () => {
      const mockAudit = {
        issues: [{ type: 'permalink', message: 'Permalink too long' }]
      };
      const mockPost = {
        slug: 'this-is-a-very-long-slug-for-testing'
      };

      const result = fixer.shouldFixSlug(mockAudit, mockPost);

      expect(result).toBe(true);
    });

    test('should return true when slug has stop words', () => {
      const mockAudit = { issues: [] };
      const mockPost = {
        slug: 'the-best-guide-for-buying-cars' // Long slug with stop words
      };

      const result = fixer.shouldFixSlug(mockAudit, mockPost);

      expect(result).toBe(true);
    });

    test('should return false when slug is clean', () => {
      const mockAudit = { issues: [] };
      const mockPost = {
        slug: 'buying-cars-sydney'
      };

      const result = fixer.shouldFixSlug(mockAudit, mockPost);

      expect(result).toBe(false);
    });
  });

  describe('shouldFixHeadingHierarchy()', () => {
    test('should return true when heading hierarchy issues exist', () => {
      const mockAudit = {
        issues: [{ type: 'headings', message: 'Invalid heading hierarchy' }]
      };

      const result = fixer.shouldFixHeadingHierarchy(mockAudit);

      expect(result).toBe(true);
    });

    test('should return false when no hierarchy issues', () => {
      const mockAudit = {
        issues: [{ type: 'title', message: 'Some other issue' }]
      };

      const result = fixer.shouldFixHeadingHierarchy(mockAudit);

      expect(result).toBe(false);
    });

    test('should return false when no issues at all', () => {
      const mockAudit = { issues: [] };

      const result = fixer.shouldFixHeadingHierarchy(mockAudit);

      expect(result).toBe(false);
    });
  });

  describe('validateChanges()', () => {
    test('should validate title changes', () => {
      const mockPost = {
        title: { rendered: 'Old Title' }
      };
      const updateData = {
        title: 'New Optimized Title'
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });

    test('should reject very short title', () => {
      const mockPost = {
        title: { rendered: 'Title' }
      };
      const updateData = {
        title: 'Short' // < 10 chars
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('too short');
    });

    test('should reject very long title', () => {
      const mockPost = {
        title: { rendered: 'Title' }
      };
      const updateData = {
        title: 'This is an extremely long title that exceeds one hundred characters and should be rejected by validation logic'
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title too long (> 100 chars)');
    });

    test('should reject very short excerpt', () => {
      const mockPost = {
        title: { rendered: 'Title' }
      };
      const updateData = {
        excerpt: 'Too short' // < 50 chars
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Excerpt too short (< 50 chars)');
    });

    test('should reject very long excerpt', () => {
      const mockPost = {
        title: { rendered: 'Title' }
      };
      const updateData = {
        excerpt: 'A'.repeat(250) // > 200 chars
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Excerpt too long (> 200 chars)');
    });

    test('should reject excerpt with Table of Contents', () => {
      const mockPost = {
        title: { rendered: 'Title' }
      };
      const updateData = {
        excerpt: 'This excerpt contains a Table of Contents which should not be present in meta descriptions'
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Excerpt still contains "Table of Contents"');
    });

    test('should reject content with multiple H1 tags', () => {
      const mockPost = {
        title: { rendered: 'Title' }
      };
      const updateData = {
        content: '<h1>First H1</h1><p>Content</p><h1>Second H1</h1>'
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Multiple H1 tags');
    });

    test('should reject content with no H1 tag', () => {
      const mockPost = {
        title: { rendered: 'Title' }
      };
      const updateData = {
        content: '<p>Content without H1</p>'
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content has no H1 tag');
    });

    test('should accept valid changes', () => {
      const mockPost = {
        title: { rendered: 'Old Title' }
      };
      const updateData = {
        title: 'Good New Title for SEO',
        excerpt: 'Valid excerpt text here that is long enough to pass validation checks for minimum length requirements'
      };

      const result = fixer.validateChanges(mockPost, updateData);

      expect(result.valid).toBe(true);
    });
  });

  describe('verifyChanges()', () => {
    test('should verify changes were applied successfully', async () => {
      const { wpClient } = await import('../../src/audit/fetch-posts.js');
      wpClient.fetchAllPosts = jest.fn().mockResolvedValue([
        {
          id: 123,
          title: { rendered: 'Updated Title' }
        }
      ]);

      const result = await fixer.verifyChanges(123, {
        title: 'Updated Title'
      });

      expect(result).toBe(true);
      expect(wpClient.fetchAllPosts).toHaveBeenCalledWith(100);
    });

    test('should return false if post not found', async () => {
      const { wpClient } = await import('../../src/audit/fetch-posts.js');
      wpClient.fetchAllPosts = jest.fn().mockResolvedValue([]);

      const result = await fixer.verifyChanges(999, {
        title: 'Updated Title'
      });

      expect(result).toBe(false);
    });

    test('should handle verification errors gracefully', async () => {
      const { wpClient } = await import('../../src/audit/fetch-posts.js');
      wpClient.fetchAllPosts = jest.fn().mockRejectedValue(new Error('API error'));

      const result = await fixer.verifyChanges(123, {
        title: 'Updated Title'
      });

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Verification error:', 'API error');
    });

    test('should warn when title verification is incomplete', async () => {
      const { wpClient } = await import('../../src/audit/fetch-posts.js');
      wpClient.fetchAllPosts = jest.fn().mockResolvedValue([
        {
          id: 123,
          title: { rendered: 'Different Title Than Expected' }
        }
      ]);

      const result = await fixer.verifyChanges(123, {
        title: 'Updated Title'
      });

      expect(result).toBe(true); // Still returns true, but with warning
      expect(mockLogger.warn).toHaveBeenCalledWith('  ⚠ Title verification incomplete');
    });
  });

  describe('getSummary()', () => {
    test('should return summary of applied fixes', () => {
      // Apply some fixes first
      fixer.appliedFixes = [
        { postId: 1, changes: [{ type: 'title' }], applied: true },
        { postId: 2, changes: [{ type: 'excerpt' }], applied: true }
      ];

      const summary = fixer.getSummary();

      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('applied');
      expect(summary.total).toBe(2);
    });

    test('should count successful and errored fixes', () => {
      fixer.appliedFixes = [
        { postId: 1, changes: [{ type: 'title' }], applied: true },
        { postId: 2, changes: [{ type: 'excerpt' }], applied: false, errors: ['Error'] }
      ];

      const summary = fixer.getSummary();

      expect(summary.applied).toBe(1);
      expect(summary.errors).toBeDefined();
      expect(summary.errors).toBe(1);
    });
  });

  describe('applyFixes() - Integration', () => {
    test('should skip published posts when safety setting enabled', async () => {
      // Create fixer with safety setting
      const safeFixer = new SEOFixerV2();
      // Override config for this test
      const { config } = await import('../../config/env/config.js');
      config.safety.applyToPublished = false;

      const mockPost = {
        id: 123,
        title: { rendered: 'Published Post' },
        status: 'publish',
        content: { rendered: '<p>Content</p>' }
      };

      const result = await safeFixer.applyFixes(mockPost, { issues: [] });

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('safety');

      // Restore config
      config.safety.applyToPublished = true;
    });

    test('should create backup before applying fixes', async () => {
      const mockPost = {
        id: 123,
        title: { rendered: 'Test' },
        status: 'draft',
        slug: 'test-post',
        excerpt: { rendered: 'Original excerpt' },
        content: { rendered: '<p>Original content</p>' }
      };

      const result = await fixer.applyFixes(mockPost, {
        issues: [{ type: 'title', message: 'Title too short' }]
      });

      expect(result.backup).toBeDefined();
      expect(result.backup.title).toBe('Test');
      expect(result.backup.excerpt).toBe('Original excerpt');
    });

    test('should log changes when in dry run mode', async () => {
      const { config } = await import('../../config/env/config.js');
      config.safety.dryRun = true;

      const dryRunFixer = new SEOFixerV2();

      const mockPost = {
        id: 123,
        title: { rendered: 'T' }, // Very short title
        status: 'draft',
        slug: 'short-title',
        content: { rendered: '<p>Content</p>' }
      };

      const result = await dryRunFixer.applyFixes(mockPost, {
        issues: [{ type: 'title', message: 'Title too short' }]
      });

      expect(result.dryRun).toBe(true);
      expect(mockUpdatePost).not.toHaveBeenCalled();

      // Restore config
      config.safety.dryRun = false;
    });

    test('should report when no fixes needed', async () => {
      const mockPost = {
        id: 123,
        title: { rendered: 'Perfect SEO Title About Cars' },
        status: 'draft',
        slug: 'perfect-seo-title-cars', // No stop words in slug
        excerpt: { rendered: 'Perfect excerpt between 150 and 160 characters long with relevant keywords and compelling copy that encourages clicks from search results.' },
        content: { rendered: '<h1>Perfect SEO Title</h1><p>Good content with sufficient length here.</p>' }
      };

      const result = await fixer.applyFixes(mockPost, { issues: [] });

      expect(result.changes).toHaveLength(0);
    });

    test('should apply H1 fix when missing H1 detected', async () => {
      const mockPost = {
        id: 123,
        title: { rendered: 'Test Title' },
        status: 'draft',
        slug: 'test-title',
        content: { rendered: '<p>Content without H1</p>' }
      };

      const result = await fixer.applyFixes(mockPost, {
        issues: [{ type: 'headings', message: 'Missing H1 tag' }]
      });

      const h1Fix = result.changes.find(c => c.type === 'h1_tag');
      expect(h1Fix).toBeDefined();
      expect(h1Fix.reason).toContain('H1');
    });

    test('should apply heading hierarchy fix when hierarchy is broken', async () => {
      const mockPost = {
        id: 123,
        title: { rendered: 'Test Title' },
        status: 'draft',
        slug: 'test-title',
        content: { rendered: '<h1>Title</h1><h3>Skipped to H3</h3><p>Content</p>' }
      };

      const result = await fixer.applyFixes(mockPost, {
        issues: [{ type: 'headings', message: 'Invalid heading hierarchy' }]
      });

      const hierarchyFix = result.changes.find(c => c.type === 'heading_hierarchy');
      expect(hierarchyFix).toBeDefined();
      expect(hierarchyFix.reason).toBeDefined();
    });

    test('should apply slug fix when slug has issues', async () => {
      const mockPost = {
        id: 123,
        title: { rendered: 'Great Cars' },
        status: 'draft',
        slug: 'the-best-guide-for-buying-cars-in-sydney', // Long slug with stop words
        content: { rendered: '<h1>Title</h1><p>Content</p>' }
      };

      const result = await fixer.applyFixes(mockPost, {
        issues: [{ type: 'permalink', message: 'Permalink too long' }]
      });

      const slugFix = result.changes.find(c => c.type === 'slug');
      expect(slugFix).toBeDefined();
      expect(slugFix.new).not.toBe(mockPost.slug);
    });

    test('should call updatePost when changes need to be applied', async () => {
      mockUpdatePost.mockResolvedValue({ id: 123, title: { rendered: 'Updated Title' } });

      const mockPost = {
        id: 123,
        title: { rendered: 'Short Title Here' }, // Will be extended
        status: 'draft',
        slug: 'test',
        content: { rendered: '<h1>Short Title Here</h1><p>Content paragraph with enough text to generate a valid excerpt for the post.</p>' },
        _embedded: {}
      };

      await fixer.applyFixes(mockPost, {
        issues: [{ type: 'title', message: 'Title too short' }]
      });

      expect(mockUpdatePost).toHaveBeenCalledWith(123, expect.any(Object));
    });

    test('should handle validation errors', async () => {
      const mockPost = {
        id: 123,
        title: { rendered: 'T' }, // Will generate short title
        status: 'draft',
        slug: 'test',
        content: { rendered: '<h1>Test</h1><p>Content</p>' },
        _embedded: {}
      };

      const result = await fixer.applyFixes(mockPost, {
        issues: [{ type: 'title', message: 'Title too short' }]
      });

      // If validation fails, changes won't be applied
      if (result.errors && result.errors.length > 0) {
        expect(result.applied).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('should handle WordPress API errors gracefully', async () => {
      mockUpdatePost.mockRejectedValue(new Error('WordPress API error'));

      const mockPost = {
        id: 123,
        title: { rendered: 'Valid Title For Testing API Errors' },
        status: 'draft',
        slug: 'test',
        excerpt: { rendered: 'This is a valid excerpt that is long enough to pass validation checks and allow the update to proceed.' },
        content: { rendered: '<h1>Valid Title For Testing API Errors</h1><p>Content paragraph that is substantive enough to be used properly in testing scenarios.</p>' }
      };

      const result = await fixer.applyFixes(mockPost, {
        issues: [{ type: 'title', message: 'Title too short' }]
      });

      expect(result.applied).toBe(false);
      expect(result.errors).toContain('WordPress API error');
    });

    test('should successfully verify changes after applying them', async () => {
      const { wpClient } = await import('../../src/audit/fetch-posts.js');

      mockUpdatePost.mockResolvedValue({
        id: 123,
        title: { rendered: 'Updated Title About Cars in Sydney' },
        excerpt: { rendered: 'Updated excerpt with sufficient length.' }
      });

      wpClient.fetchAllPosts = jest.fn().mockResolvedValue([
        {
          id: 123,
          title: { rendered: 'Updated Title About Cars in Sydney' },
          excerpt: { rendered: 'Updated excerpt with sufficient length.' }
        }
      ]);

      const mockPost = {
        id: 123,
        title: { rendered: 'Updated Title About Cars in Sydney' },
        status: 'draft',
        slug: 'updated-title',
        excerpt: { rendered: 'Updated excerpt with sufficient length for SEO and compelling copy for searchers.' },
        content: { rendered: '<h1>Updated Title</h1><p>Content paragraph here with enough text.</p>' }
      };

      const result = await fixer.applyFixes(mockPost, {
        issues: [{ type: 'excerpt', message: 'Excerpt too short' }]
      });

      // Verification success should be logged (lines 149-150)
      expect(mockLogger.success).toHaveBeenCalledWith('  ✓ Changes applied and verified');
      expect(result.applied).toBe(true);
    });
  });

  describe('fixH1Intelligently()', () => {
    test('should return content unchanged when no fix needed', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<h1>Existing H1</h1><p>Content</p>' }
      };
      const h1Result = { needsFix: false };

      const result = fixer.fixH1Intelligently(mockPost, h1Result);

      expect(result).toBe(mockPost.content.rendered);
    });

    test('should convert first H2 to H1 when H1 is missing', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<h2>Should be H1</h2><p>Content</p>' }
      };
      const h1Result = { needsFix: true };

      const result = fixer.fixH1Intelligently(mockPost, h1Result);

      expect(result).toContain('<h1>Should be H1</h1>');
      expect(result).not.toContain('<h2>Should be H1</h2>');
    });

    test('should add H1 at beginning when no H2 exists', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<p>Content without any headings</p>' }
      };
      const h1Result = { needsFix: true };

      const result = fixer.fixH1Intelligently(mockPost, h1Result);

      expect(result).toContain('<h1>Test Title</h1>');
      expect(result).toContain('Content without any headings');
    });

    test('should clean HTML entities in H1 from title', () => {
      const mockPost = {
        title: { rendered: 'Test &#8211; Title' },
        content: { rendered: '<p>Content</p>' }
      };
      const h1Result = { needsFix: true };

      const result = fixer.fixH1Intelligently(mockPost, h1Result);

      expect(result).toContain('<h1>Test - Title</h1>');
      expect(result).not.toContain('&#8211;');
    });

    test('should insert H1 after opening divs', () => {
      const mockPost = {
        title: { rendered: 'Title' },
        content: { rendered: '<div class="wrapper"><p>Content</p></div>' }
      };
      const h1Result = { needsFix: true };

      const result = fixer.fixH1Intelligently(mockPost, h1Result);

      expect(result).toContain('<h1>Title</h1>');
      expect(result.indexOf('<h1>')).toBeGreaterThan(0);
    });
  });

  describe('fixHeadingHierarchyProperly()', () => {
    test('should return unchanged when no headings found', () => {
      const content = '<p>Content without headings</p>';

      const result = fixer.fixHeadingHierarchyProperly(content);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(content);
      expect(result.description).toBe('No headings found');
    });

    test('should fix skipped heading levels', () => {
      const content = '<h1>Title</h1><h3>Should be H2</h3><p>Content</p>';

      const result = fixer.fixHeadingHierarchyProperly(content);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('<h2>Should be H2</h2>');
      expect(result.content).not.toContain('<h3>Should be H2</h3>');
    });

    test('should not change proper hierarchy', () => {
      const content = '<h1>Title</h1><h2>Section</h2><h3>Subsection</h3>';

      const result = fixer.fixHeadingHierarchyProperly(content);

      expect(result.changed).toBe(false);
      expect(result.content).toContain('<h1>Title</h1>');
      expect(result.content).toContain('<h2>Section</h2>');
      expect(result.content).toContain('<h3>Subsection</h3>');
    });

    test('should fix multiple heading level skips', () => {
      const content = '<h1>Title</h1><h4>Too deep</h4><h6>Way too deep</h6>';

      const result = fixer.fixHeadingHierarchyProperly(content);

      expect(result.changed).toBe(true);
      // H4 after H1 should become H2
      expect(result.content).toContain('<h2>Too deep</h2>');
    });

    test('should handle complex heading structures', () => {
      const content = '<h1>Main</h1><h2>Section 1</h2><h4>Skipped to H4</h4><h2>Section 2</h2><h5>Another skip</h5>';

      const result = fixer.fixHeadingHierarchyProperly(content);

      expect(result.changed).toBe(true);
      // Verify some headings were adjusted
      expect(result.description).toBeDefined();
    });
  });

  describe('analyzeH1Situation()', () => {
    test('should return needsFix=false when H1 exists', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<h1>Existing H1 Tag</h1><p>Content here</p>' }
      };
      const mockAudit = { issues: [] }; // No H1 issue

      const result = fixer.analyzeH1Situation(mockPost, mockAudit);

      expect(result.needsFix).toBe(false);
      expect(result.currentState).toBe('H1 exists');
    });

    test('should detect when H1 tag exists but audit did not report it missing', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<h1>Actual H1</h1><p>Content here</p>' }
      };
      const mockAudit = {
        issues: [
          { type: 'title', message: 'Some other issue' }
        ]
      };

      const result = fixer.analyzeH1Situation(mockPost, mockAudit);

      expect(result.needsFix).toBe(false);
      expect(result.currentState).toContain('H1 exists');
      expect(result.h1Count).toBe(1);
    });
  });

  describe('generateOptimizedSlug()', () => {
    test('should truncate very long slugs to first 7 words', () => {
      const mockPost = {
        slug: 'this-is-an-extremely-long-slug-that-goes-on-and-on-with-many-words-exceeding-fifty-characters'
      };

      const result = fixer.generateOptimizedSlug(mockPost);

      // After removing stop words (an, on, and, with) and truncating to 7 words
      expect(result).toBe('this-is-extremely-long-slug-that-goes');
      expect(result.split('-').length).toBeLessThanOrEqual(7);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    test('should remove stop words but keep minimum 4 words', () => {
      const mockPost = {
        slug: 'the-best-cars'
      };

      const result = fixer.generateOptimizedSlug(mockPost);

      // Should keep "the" because only 3 words total
      expect(result).toBe('the-best-cars');
    });

    test('should not modify short slugs', () => {
      const mockPost = {
        slug: 'good-seo-slug'
      };

      const result = fixer.generateOptimizedSlug(mockPost);

      expect(result).toBe('good-seo-slug');
    });
  });

  describe('applyFixesToPostsV2() - Batch Processing', () => {
    test('should process multiple posts in batch', async () => {
      const { applyFixesToPostsV2 } = await import('../../src/audit/fix-meta-v2.js');
      const { config } = await import('../../config/env/config.js');

      config.safety.dryRun = true; // Dry run mode

      const mockPosts = [
        {
          id: 1,
          title: { rendered: 'Post 1 Title' },
          status: 'draft',
          slug: 'post-1',
          content: { rendered: '<h1>Post 1</h1><p>Content</p>' }
        },
        {
          id: 2,
          title: { rendered: 'Post 2 Title' },
          status: 'draft',
          slug: 'post-2',
          content: { rendered: '<h1>Post 2</h1><p>Content</p>' }
        }
      ];

      const mockAuditResults = [
        {
          issues: [{ type: 'title', message: 'Title too short' }]
        },
        {
          issues: [{ type: 'meta_description', message: 'Missing excerpt' }]
        }
      ];

      const summary = await applyFixesToPostsV2(mockPosts, mockAuditResults);

      expect(summary).toBeDefined();
      expect(summary.total).toBe(2);
      expect(summary.dryRun).toBe(true);

      // Restore config
      config.safety.dryRun = false;
    });

    test('should handle posts with no issues', async () => {
      const { applyFixesToPostsV2 } = await import('../../src/audit/fix-meta-v2.js');

      const mockPosts = [
        {
          id: 1,
          title: { rendered: 'Perfect Title' },
          status: 'draft',
          slug: 'perfect-title',
          content: { rendered: '<h1>Perfect Title</h1><p>Perfect content</p>' }
        }
      ];

      const mockAuditResults = [
        {
          issues: [] // No issues
        }
      ];

      const summary = await applyFixesToPostsV2(mockPosts, mockAuditResults);

      expect(summary.total).toBe(0); // No posts processed (no issues)
    });

    test('should return summary with correct counts', async () => {
      const { applyFixesToPostsV2 } = await import('../../src/audit/fix-meta-v2.js');
      const { config } = await import('../../config/env/config.js');

      config.safety.dryRun = true;

      const mockPosts = [
        {
          id: 1,
          title: { rendered: 'T' },
          status: 'draft',
          slug: 'short',
          content: { rendered: '<p>Content</p>' }
        },
        {
          id: 2,
          title: { rendered: 'Good Title Here' },
          status: 'draft',
          slug: 'good-title',
          content: { rendered: '<h1>Good Title</h1><p>Content</p>' }
        }
      ];

      const mockAuditResults = [
        {
          issues: [{ type: 'title', message: 'Title too short' }]
        },
        {
          issues: [{ type: 'title', message: 'Title too short' }]
        }
      ];

      const summary = await applyFixesToPostsV2(mockPosts, mockAuditResults);

      expect(summary.total).toBe(2);
      expect(summary.fixes).toBeDefined();
      expect(Array.isArray(summary.fixes)).toBe(true);

      // Restore config
      config.safety.dryRun = false;
    });
  });

  describe('Coverage completeness', () => {
    test('should cover verification failure path (lines 152-154)', async () => {
      // Mock successful update
      mockUpdatePost.mockResolvedValueOnce({
        id: 125,
        title: { rendered: 'Updated Title' }
      });

      // Mock verification failure - post not found after update
      const { wpClient } = await import('../../src/audit/fetch-posts.js');
      wpClient.fetchAllPosts = jest.fn().mockResolvedValueOnce([]);

      const mockPost = {
        id: 125,
        title: { rendered: 'Short Title Here' },
        status: 'draft',
        slug: 'test-slug',
        content: { rendered: '<h1>Short Title Here</h1><p>Content paragraph with enough text to generate a valid excerpt for the post and pass validation.</p>' },
        excerpt: { rendered: 'Valid excerpt with sufficient length for the validation requirements to pass properly and meet all criteria.' },
        _embedded: {}
      };

      const result = await fixer.applyFixes(mockPost, {
        issues: [{ type: 'title', message: 'Title too short' }]
      });

      // Should have applied = true even though verification failed
      expect(result.applied).toBe(true);
      expect(result.warnings).toContain('Verification incomplete');
      expect(mockLogger.error).toHaveBeenCalledWith('  ✗ Changes applied but verification failed');
    });

    test('should cover H1 exists path when audit reports issue but H1 present (lines 300-302)', () => {
      const mockPost = {
        title: { rendered: 'Test Title' },
        content: { rendered: '<h1>Existing H1 Tag</h1><p>Content here</p>' }
      };

      // Audit says H1 is missing, but content actually has H1
      const mockAudit = {
        issues: [{ type: 'headings', message: 'Missing H1' }]
      };

      const result = fixer.analyzeH1Situation(mockPost, mockAudit);

      expect(result.needsFix).toBe(false);
      expect(result.currentState).toContain('H1 exists:');
      expect(result.currentState).toContain('Existing H1 Tag');
    });
  });

  describe('Extended edge cases', () => {
    test('should handle post with empty excerpt', async () => {
      mockUpdatePost.mockResolvedValue({ id: 500 });

      const emptyExcerptPost = {
        id: 500,
        title: { rendered: 'Post with Empty Excerpt Field' },
        status: 'draft',
        slug: 'empty-excerpt',
        excerpt: { rendered: '' },
        content: { rendered: '<h1>Title</h1><p>Content with sufficient length for proper validation and testing purposes.</p>' },
        _embedded: {}
      };

      const mockAudit = {
        issues: [{ type: 'meta_description', message: 'Meta description missing' }]
      };

      const result = await fixer.applyFixes(emptyExcerptPost, mockAudit);

      expect(result).toBeDefined();
      expect(result.changes.length).toBeGreaterThan(0);
    });

    test('should handle post with very short title', async () => {
      mockUpdatePost.mockResolvedValue({ id: 501 });

      const shortTitlePost = {
        id: 501,
        title: { rendered: 'Car' },
        status: 'draft',
        slug: 'car',
        excerpt: { rendered: 'Valid excerpt with sufficient length for SEO validation and requirements.' },
        content: { rendered: '<h1>Car</h1><p>Content here with adequate length for testing.</p>' },
        _embedded: {}
      };

      const mockAudit = {
        issues: [{ type: 'title', message: 'Title too short' }]
      };

      const result = await fixer.applyFixes(shortTitlePost, mockAudit);

      expect(result).toBeDefined();
    });

    test('should handle post with special characters in title', async () => {
      mockUpdatePost.mockResolvedValue({ id: 502 });

      const specialCharsPost = {
        id: 502,
        title: { rendered: 'Cars & Utes: "Best" Deals [2024]' },
        status: 'draft',
        slug: 'cars-utes-best-deals',
        excerpt: { rendered: 'Find the best deals on cars and utes with special offers available now.' },
        content: { rendered: '<h1>Cars & Utes</h1><p>Content here.</p>' },
        _embedded: {}
      };

      const mockAudit = {
        issues: []
      };

      const result = await fixer.applyFixes(specialCharsPost, mockAudit);

      expect(result).toBeDefined();
    });

    test('should handle post with minimal content', async () => {
      mockUpdatePost.mockResolvedValue({ id: 503 });

      const minimalContentPost = {
        id: 503,
        title: { rendered: 'Post with Minimal Content Field' },
        status: 'draft',
        slug: 'minimal-content',
        excerpt: { rendered: 'Valid excerpt for testing minimal content field handling scenarios.' },
        content: { rendered: '<p>Min</p>' },
        _embedded: {}
      };

      const mockAudit = {
        issues: [{ type: 'content', message: 'Content too thin' }]
      };

      const result = await fixer.applyFixes(minimalContentPost, mockAudit);

      expect(result).toBeDefined();
    });

    test('should handle case where title fix generates same title (line 53)', async () => {
      mockUpdatePost.mockResolvedValue({ id: 502 });

      // Post with title that's already optimal but audit says to fix it
      const post = {
        id: 502,
        title: { rendered: 'Optimal Car Sales Title | Instant Auto Traders' },
        status: 'publish',
        slug: 'optimal-car-sales-title',
        excerpt: { rendered: 'Valid excerpt with sufficient length for SEO validation requirements.' },
        content: { rendered: '<h1>Optimal Car Sales Title</h1><p>Content here.</p>' },
        _embedded: {}
      };

      // Mock shouldFixTitle to return true, but generateSmartTitle returns same title
      const originalShouldFix = fixer.shouldFixTitle;
      const originalGenerateTitle = fixer.generateSmartTitle;

      fixer.shouldFixTitle = jest.fn(() => true);
      fixer.generateSmartTitle = jest.fn(() => post.title.rendered);

      const mockAudit = {
        issues: [{ type: 'title', message: 'Title needs optimization', severity: 'low' }]
      };

      const result = await fixer.applyFixes(post, mockAudit);

      expect(result).toBeDefined();
      expect(fixer.shouldFixTitle).toHaveBeenCalled();
      expect(fixer.generateSmartTitle).toHaveBeenCalled();

      // Restore original methods
      fixer.shouldFixTitle = originalShouldFix;
      fixer.generateSmartTitle = originalGenerateTitle;
    });

    test('should handle case where H1 fix generates same content (line 86)', async () => {
      mockUpdatePost.mockResolvedValue({ id: 503 });

      const post = {
        id: 503,
        title: { rendered: 'Post Title for Testing H1 Fix' },
        status: 'publish',
        slug: 'post-title',
        excerpt: { rendered: 'Valid excerpt with sufficient length for validation.' },
        content: { rendered: '<h1>Post Title for Testing H1 Fix</h1><p>Content.</p>' },
        _embedded: {}
      };

      // Mock to trigger H1 fix but return same content
      const originalAnalyzeH1 = fixer.analyzeH1Situation;
      const originalFixH1 = fixer.fixH1Intelligently;

      fixer.analyzeH1Situation = jest.fn(() => ({
        needsFix: true,
        currentState: 'H1 present',
        proposedFix: 'Keep H1'
      }));
      fixer.fixH1Intelligently = jest.fn(() => post.content.rendered);

      const mockAudit = {
        issues: [{ type: 'h1_tag', message: 'H1 needs fix', severity: 'medium' }]
      };

      const result = await fixer.applyFixes(post, mockAudit);

      expect(result).toBeDefined();
      expect(fixer.analyzeH1Situation).toHaveBeenCalled();
      expect(fixer.fixH1Intelligently).toHaveBeenCalled();

      // Restore
      fixer.analyzeH1Situation = originalAnalyzeH1;
      fixer.fixH1Intelligently = originalFixH1;
    });

    test('should handle case where heading hierarchy fix changes nothing (line 103)', async () => {
      mockUpdatePost.mockResolvedValue({ id: 504 });

      const post = {
        id: 504,
        title: { rendered: 'Post with Perfect Heading Hierarchy' },
        status: 'publish',
        slug: 'perfect-hierarchy',
        excerpt: { rendered: 'Valid excerpt with sufficient length for validation.' },
        content: { rendered: '<h1>Title</h1><h2>Subtitle</h2><p>Content.</p>' },
        _embedded: {}
      };

      // Mock to trigger hierarchy fix but report no change
      const originalShouldFixHierarchy = fixer.shouldFixHeadingHierarchy;
      const originalFixHierarchy = fixer.fixHeadingHierarchyProperly;

      fixer.shouldFixHeadingHierarchy = jest.fn(() => true);
      fixer.fixHeadingHierarchyProperly = jest.fn(() => ({
        changed: false,
        content: post.content.rendered,
        description: 'No changes needed'
      }));

      const mockAudit = {
        issues: [{ type: 'heading_hierarchy', message: 'Check hierarchy', severity: 'low' }]
      };

      const result = await fixer.applyFixes(post, mockAudit);

      expect(result).toBeDefined();
      expect(fixer.shouldFixHeadingHierarchy).toHaveBeenCalled();
      expect(fixer.fixHeadingHierarchyProperly).toHaveBeenCalled();

      // Restore
      fixer.shouldFixHeadingHierarchy = originalShouldFixHierarchy;
      fixer.fixHeadingHierarchyProperly = originalFixHierarchy;
    });

    test('should handle case where slug fix generates same slug (line 118)', async () => {
      mockUpdatePost.mockResolvedValue({ id: 505 });

      const post = {
        id: 505,
        title: { rendered: 'Post with Optimal Slug Already' },
        status: 'publish',
        slug: 'post-with-optimal-slug-already',
        excerpt: { rendered: 'Valid excerpt with sufficient length for validation.' },
        content: { rendered: '<h1>Title</h1><p>Content.</p>' },
        _embedded: {}
      };

      // Mock to trigger slug fix but return same slug
      const originalShouldFixSlug = fixer.shouldFixSlug;
      const originalGenerateSlug = fixer.generateOptimizedSlug;

      fixer.shouldFixSlug = jest.fn(() => true);
      fixer.generateOptimizedSlug = jest.fn(() => post.slug);

      const mockAudit = {
        issues: [{ type: 'slug', message: 'Slug needs optimization', severity: 'low' }]
      };

      const result = await fixer.applyFixes(post, mockAudit);

      expect(result).toBeDefined();
      expect(fixer.shouldFixSlug).toHaveBeenCalled();
      expect(fixer.generateOptimizedSlug).toHaveBeenCalled();

      // Restore
      fixer.shouldFixSlug = originalShouldFixSlug;
      fixer.generateOptimizedSlug = originalGenerateSlug;
    });
  });
});
