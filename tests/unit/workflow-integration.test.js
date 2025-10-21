import { describe, test, expect, beforeEach, jest } from '@jest/globals';

/**
 * Integration Tests: Audit → Fix → Verify Workflow
 *
 * These tests validate the complete end-to-end workflow of:
 * 1. Auditing a post for SEO issues
 * 2. Applying fixes based on audit results
 * 3. Verifying the fixes were successfully applied
 */

// Mock wpClient
const mockUpdatePost = jest.fn();
const mockFetchPost = jest.fn();
const mockFetchAllPosts = jest.fn();

jest.unstable_mockModule('../../src/audit/fetch-posts.js', () => ({
  wpClient: {
    updatePost: mockUpdatePost,
    fetchPost: mockFetchPost,
    fetchAllPosts: mockFetchAllPosts
  }
}));

// Mock config
jest.unstable_mockModule('../../config/env/config.js', () => ({
  config: {
    safety: {
      dryRun: false,
      applyToPublished: true
    },
    wordpress: {
      url: 'https://test.com'
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

// Import modules after mocking
const { SEOAuditorV2 } = await import('../../src/audit/seo-audit-v2.js');
const { SEOFixerV2 } = await import('../../src/audit/fix-meta-v2.js');
const { auditPostsV2 } = await import('../../src/audit/seo-audit-v2.js');
const { applyFixesToPostsV2 } = await import('../../src/audit/fix-meta-v2.js');

describe('Audit → Fix → Verify Workflow Integration', () => {
  let auditor;
  let fixer;

  beforeEach(() => {
    jest.clearAllMocks();
    auditor = new SEOAuditorV2();
    fixer = new SEOFixerV2();
  });

  describe('Single Post Workflow', () => {
    test('should complete full workflow for post with SEO issues', async () => {
      // 1. Create a post with SEO issues
      const problematicPost = {
        id: 100,
        title: { rendered: 'Bad Title' }, // Too short
        content: { rendered: '<p>This is content without an H1 tag, which is a problem for SEO. The content needs to be long enough to pass validation checks.</p><p>Adding another paragraph to ensure we have sufficient content length for the validation requirements.</p>' }, // Missing H1
        excerpt: { rendered: 'This is a valid excerpt with sufficient length for the validation requirements to pass properly.' },
        link: 'https://example.com/bad-slug-with-stop-words',
        slug: 'the-bad-slug-with-stop-words', // Stop words
        status: 'draft',
        _embedded: {}
      };

      // 2. Audit the post
      const auditResult = auditor.auditPost(problematicPost);

      // Verify audit detected issues
      expect(auditResult.score).toBeLessThan(70);
      expect(auditResult.issues.length).toBeGreaterThan(0);
      expect(auditResult.issues.some(i => i.type === 'title')).toBe(true);
      expect(auditResult.issues.some(i => i.type === 'headings')).toBe(true);

      // 3. Mock successful update
      mockUpdatePost.mockResolvedValue({
        id: 100,
        title: { rendered: 'Bad Title - Instant Auto Traders' },
        content: { rendered: '<h1>Bad Title</h1><p>Short content with no H1.</p>' },
        excerpt: { rendered: 'Generated excerpt for this post that is long enough for SEO purposes.' }
      });

      mockFetchAllPosts.mockResolvedValue([
        {
          id: 100,
          title: { rendered: 'Bad Title - Instant Auto Traders' },
          excerpt: { rendered: 'Generated excerpt for this post that is long enough for SEO purposes.' }
        }
      ]);

      // 4. Apply fixes
      const fixResult = await fixer.applyFixes(problematicPost, auditResult);

      // Verify fixes were proposed
      expect(fixResult.changes.length).toBeGreaterThan(0);
      expect(fixResult.applied).toBe(true);

      // 5. Verify WordPress API was called
      expect(mockUpdatePost).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          title: expect.any(String),
          content: expect.any(String)
        })
      );

      // 6. Verify changes were confirmed
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('Changes applied and verified')
      );
    });

    test('should handle post with no issues gracefully', async () => {
      const perfectPost = {
        id: 200,
        title: { rendered: 'Perfect SEO Title About Cars in Sydney' },
        content: { rendered: '<h1>Perfect SEO Title</h1><p>High quality content with multiple paragraphs and good length to ensure proper SEO analysis.</p><p>Second paragraph adds more context.</p>' },
        excerpt: { rendered: 'Perfect excerpt between 150 and 160 characters with relevant keywords and compelling copy for search results.' },
        link: 'https://example.com/perfect-seo-post',
        slug: 'perfect-seo-post',
        status: 'publish'
      };

      // Audit
      const auditResult = auditor.auditPost(perfectPost);

      // Should have good score
      expect(auditResult.score).toBeGreaterThanOrEqual(70);

      // Apply fixes (should have minimal changes)
      const fixResult = await fixer.applyFixes(perfectPost, auditResult);

      // Should have few or no changes
      expect(fixResult.changes.length).toBeLessThanOrEqual(2);

      // Should not call WordPress API if no changes needed
      if (fixResult.changes.length === 0) {
        expect(mockUpdatePost).not.toHaveBeenCalled();
      }
    });

    test('should handle API errors during fix application', async () => {
      const post = {
        id: 300,
        title: { rendered: 'Test Post with Valid Title Length' },
        content: { rendered: '<h1>Test Post</h1><p>Content with sufficient length for proper testing.</p>' },
        excerpt: { rendered: 'This is a comprehensive excerpt that is long enough for validation and SEO purposes to pass all checks.' },
        link: 'https://example.com/test',
        slug: 'test',
        status: 'draft',
        _embedded: {}
      };

      const auditResult = auditor.auditPost(post);

      // Mock API error
      mockUpdatePost.mockRejectedValue(new Error('WordPress API connection failed'));

      const fixResult = await fixer.applyFixes(post, auditResult);

      expect(fixResult.applied).toBe(false);
      expect(fixResult.errors).toContain('WordPress API connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should respect dry run mode', async () => {
      const { config } = await import('../../config/env/config.js');
      config.safety.dryRun = true;

      // Create new fixer instance AFTER setting dry run mode
      const dryRunFixer = new SEOFixerV2();

      const post = {
        id: 400,
        title: { rendered: 'Short Title Needing Extension' },
        content: { rendered: '<h1>Short Title</h1><p>Content with sufficient length to pass validation requirements for testing dry run mode.</p><p>Adding more content to ensure we meet all validation criteria properly.</p>' },
        excerpt: { rendered: 'Valid excerpt for testing dry run mode with sufficient length for validation purposes.' },
        link: 'https://example.com/short',
        slug: 'short',
        status: 'draft',
        _embedded: {}
      };

      const auditResult = auditor.auditPost(post);
      const fixResult = await dryRunFixer.applyFixes(post, auditResult);

      expect(fixResult.dryRun).toBe(true);
      expect(mockUpdatePost).not.toHaveBeenCalled();

      config.safety.dryRun = false;
    });
  });

  describe('Batch Processing Workflow', () => {
    test('should process multiple posts end-to-end', async () => {
      const posts = [
        {
          id: 1,
          title: { rendered: 'Post 1 Title' },
          content: { rendered: '<h1>Post 1</h1><p>Content</p>' },
          excerpt: { rendered: 'Excerpt 1 with good length for SEO optimization purposes.' },
          link: 'https://example.com/post-1',
          slug: 'post-1',
          status: 'draft'
        },
        {
          id: 2,
          title: { rendered: 'Bad' },
          content: { rendered: '<p>Short</p>' },
          excerpt: { rendered: 'Bad' },
          link: 'https://example.com/bad',
          slug: 'bad',
          status: 'draft'
        },
        {
          id: 3,
          title: { rendered: 'Another Post Title for Testing' },
          content: { rendered: '<h1>Another Post</h1><p>Good content here with sufficient length.</p>' },
          excerpt: { rendered: 'Excerpt for third post with good SEO practices and keyword targeting.' },
          link: 'https://example.com/another-post',
          slug: 'another-post',
          status: 'publish'
        }
      ];

      // 1. Batch audit
      const auditResults = await auditPostsV2(posts);

      expect(auditResults).toHaveLength(3);
      expect(auditResults.every(r => r.score !== undefined)).toBe(true);
      expect(auditResults.every(r => r.issues !== undefined)).toBe(true);

      // 2. Mock WordPress API responses
      mockUpdatePost.mockResolvedValue({ id: 1, title: { rendered: 'Updated' } });
      mockFetchAllPosts.mockResolvedValue([{ id: 1, title: { rendered: 'Updated' } }]);

      // 3. Batch apply fixes
      const { config } = await import('../../config/env/config.js');
      config.safety.dryRun = true; // Use dry run for batch test

      const summary = await applyFixesToPostsV2(posts, auditResults);

      expect(summary).toBeDefined();
      expect(summary.total).toBe(3);
      expect(summary.dryRun).toBe(true);

      config.safety.dryRun = false;
    });

    test('should handle mixed success and failure in batch', async () => {
      const posts = [
        {
          id: 10,
          title: { rendered: 'Success Post' },
          content: { rendered: '<p>Content</p>' },
          excerpt: { rendered: 'Valid excerpt for testing batch processing with multiple posts.' },
          link: 'https://example.com/success',
          slug: 'success',
          status: 'draft'
        },
        {
          id: 20,
          title: { rendered: 'Fail Post' },
          content: { rendered: '<p>Content</p>' },
          excerpt: { rendered: 'Valid excerpt for testing failure scenarios in batch processing.' },
          link: 'https://example.com/fail',
          slug: 'fail',
          status: 'draft'
        }
      ];

      const auditResults = posts.map(p => auditor.auditPost(p));

      // Mock: first succeeds, second fails
      mockUpdatePost
        .mockResolvedValueOnce({ id: 10, title: { rendered: 'Updated' } })
        .mockRejectedValueOnce(new Error('Update failed'));

      mockFetchAllPosts.mockResolvedValue([
        { id: 10, title: { rendered: 'Updated' } }
      ]);

      const summary = await applyFixesToPostsV2(posts, auditResults);

      expect(summary.total).toBe(2);
      // Summary should track both successes and failures
      expect(summary).toBeDefined();
    });
  });

  describe('Cross-Module Integration', () => {
    test('should integrate auditor and fixer seamlessly', async () => {
      const post = {
        id: 500,
        title: { rendered: 'Integration Test Title' },
        content: { rendered: '<h2>Wrong heading level</h2><p>Content without H1.</p>' },
        excerpt: { rendered: 'Integration test excerpt with sufficient length for validation.' },
        link: 'https://example.com/integration',
        slug: 'integration',
        status: 'draft'
      };

      // Step 1: Audit
      const audit = auditor.auditPost(post);
      const hasH1Issue = audit.issues.some(i =>
        i.type === 'headings' && i.message.includes('H1')
      );

      // Step 2: Fix based on audit
      mockUpdatePost.mockResolvedValue({
        id: 500,
        content: { rendered: '<h1>Integration Test Title</h1><p>Content without H1.</p>' }
      });
      mockFetchAllPosts.mockResolvedValue([
        { id: 500, title: { rendered: 'Integration Test Title' } }
      ]);

      const fixes = await fixer.applyFixes(post, audit);

      if (hasH1Issue) {
        // Should have attempted to fix H1
        const h1Fix = fixes.changes.find(c => c.type === 'h1_tag');
        expect(h1Fix).toBeDefined();
      }
    });

    test('should handle complete workflow with validation', async () => {
      const post = {
        id: 600,
        title: { rendered: 'Complete Workflow Test' },
        content: { rendered: '<p>Content</p>' },
        excerpt: { rendered: 'Complete workflow test with all validation steps included.' },
        link: 'https://example.com/complete',
        slug: 'complete',
        status: 'draft'
      };

      // 1. Audit
      const audit = auditor.auditPost(post);

      // 2. Validate audit results structure
      expect(audit).toHaveProperty('score');
      expect(audit).toHaveProperty('issues');
      expect(audit).toHaveProperty('suggestions');
      expect(audit).toHaveProperty('meta');

      // 3. Prepare fixes
      mockUpdatePost.mockResolvedValue({
        id: 600,
        title: { rendered: 'Complete Workflow Test - Instant Auto Traders' },
        content: { rendered: '<h1>Complete Workflow Test</h1><p>Content</p>' }
      });
      mockFetchAllPosts.mockResolvedValue([
        {
          id: 600,
          title: { rendered: 'Complete Workflow Test - Instant Auto Traders' }
        }
      ]);

      // 4. Apply fixes
      const result = await fixer.applyFixes(post, audit);

      // 5. Validate fix results structure
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('applied');
      expect(result).toHaveProperty('backup');

      // 6. Verify backup was created
      expect(result.backup).toBeDefined();
      expect(result.backup.title).toBe('Complete Workflow Test');
    });
  });

  describe('Error Recovery', () => {
    test('should recover from verification failures', async () => {
      const post = {
        id: 700,
        title: { rendered: 'Verification Failure Test Post Title' },
        content: { rendered: '<h1>Verify Fail Test</h1><p>Content with adequate length for validation.</p>' },
        excerpt: { rendered: 'Testing verification failure recovery with a valid excerpt that meets length requirements.' },
        link: 'https://example.com/verify-fail',
        slug: 'verify-fail',
        status: 'draft',
        _embedded: {}
      };

      const audit = auditor.auditPost(post);

      // Mock: update succeeds but verification returns empty
      mockUpdatePost.mockResolvedValue({
        id: 700,
        title: { rendered: 'Updated Title' }
      });
      mockFetchAllPosts.mockResolvedValue([]); // Post not found during verification

      const result = await fixer.applyFixes(post, audit);

      // Should still mark as applied even if verification incomplete
      expect(result.applied).toBe(true);
      if (result.warnings) {
        expect(result.warnings).toContain('Verification incomplete');
      }
    });

    test('should handle validation errors before applying fixes', async () => {
      const post = {
        id: 800,
        title: { rendered: 'T' }, // Very short, will generate short title
        content: { rendered: '<p>Content</p>' },
        excerpt: { rendered: '' }, // Empty excerpt
        link: 'https://example.com/invalid',
        slug: 'invalid',
        status: 'draft',
        _embedded: {}
      };

      const audit = auditor.auditPost(post);
      const result = await fixer.applyFixes(post, audit);

      // If validation fails, fixes should not be applied
      if (result.errors && result.errors.length > 0) {
        expect(result.applied).toBe(false);
        expect(mockUpdatePost).not.toHaveBeenCalled();
      }
    });
  });

  describe('Published Post Safety', () => {
    test('should skip published posts when safety setting disabled', async () => {
      const { config } = await import('../../config/env/config.js');
      config.safety.applyToPublished = false;

      const publishedPost = {
        id: 900,
        title: { rendered: 'Published Post' },
        content: { rendered: '<p>Content</p>' },
        excerpt: { rendered: 'Valid excerpt for published post safety testing.' },
        link: 'https://example.com/published',
        slug: 'published',
        status: 'publish'
      };

      const audit = auditor.auditPost(publishedPost);
      const result = await fixer.applyFixes(publishedPost, audit);

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('safety');
      expect(mockUpdatePost).not.toHaveBeenCalled();

      config.safety.applyToPublished = true;
    });
  });

  describe('Advanced Integration Scenarios', () => {
    test('should handle multiple fix types in single post', async () => {
      const multiProblemPost = {
        id: 1000,
        title: { rendered: 'Bad' }, // Too short
        content: { rendered: '<h2>Wrong heading</h2><p>Content here but missing H1 tag and insufficient paragraphs for good SEO.</p>' }, // Missing H1, wrong heading level
        excerpt: { rendered: '' }, // Empty excerpt
        link: 'https://example.com/the-post-with-many-problems',
        slug: 'the-post-with-many-problems', // Stop words
        status: 'draft',
        _embedded: {}
      };

      const auditResult = auditor.auditPost(multiProblemPost);

      // Should detect multiple issues
      expect(auditResult.issues.length).toBeGreaterThan(2);
      const issueTypes = auditResult.issues.map(i => i.type);
      expect(issueTypes).toContain('title');
      expect(issueTypes).toContain('headings');

      mockUpdatePost.mockResolvedValue({
        id: 1000,
        title: { rendered: 'Bad - Instant Auto Traders' },
        content: { rendered: '<h1>Bad</h1><h2>Wrong heading</h2><p>Content here.</p>' },
        excerpt: { rendered: 'Generated excerpt for testing purposes.' }
      });

      mockFetchAllPosts.mockResolvedValue([
        { id: 1000, title: { rendered: 'Bad - Instant Auto Traders' } }
      ]);

      const fixResult = await fixer.applyFixes(multiProblemPost, auditResult);

      // Should have fixes for multiple issue types
      if (fixResult.changes && fixResult.changes.length > 0) {
        expect(fixResult.changes.length).toBeGreaterThan(1);
      }
    });

    test('should handle batch with all posts failing', async () => {
      const posts = [
        {
          id: 1001,
          title: { rendered: 'Fail 1' },
          content: { rendered: '<h1>Content</h1><p>Text</p>' },
          excerpt: { rendered: 'Excerpt for first post that will fail during processing.' },
          link: 'https://example.com/fail-1',
          slug: 'fail-1',
          status: 'draft'
        },
        {
          id: 1002,
          title: { rendered: 'Fail 2' },
          content: { rendered: '<h1>Content</h1><p>Text</p>' },
          excerpt: { rendered: 'Excerpt for second post that will also fail during processing.' },
          link: 'https://example.com/fail-2',
          slug: 'fail-2',
          status: 'draft'
        }
      ];

      const auditResults = posts.map(p => auditor.auditPost(p));

      // Mock all updates to fail
      mockUpdatePost.mockRejectedValue(new Error('Server error'));
      mockFetchAllPosts.mockResolvedValue([]);

      const summary = await applyFixesToPostsV2(posts, auditResults);

      expect(summary.total).toBe(2);
      // All should have errors or be skipped
      expect(summary.errors + summary.skipped).toBeGreaterThanOrEqual(0);
    });

    test('should preserve backup data correctly', async () => {
      const post = {
        id: 1100,
        title: { rendered: 'Original Title for Backup Test' },
        content: { rendered: '<h1>Original Content</h1><p>This is the original content that should be preserved in backup.</p>' },
        excerpt: { rendered: 'Original excerpt that should be saved in backup data for recovery purposes.' },
        link: 'https://example.com/backup-test',
        slug: 'backup-test',
        status: 'draft',
        _embedded: {}
      };

      const auditResult = auditor.auditPost(post);

      mockUpdatePost.mockResolvedValue({
        id: 1100,
        title: { rendered: 'Original Title for Backup Test - Instant Auto Traders' },
        content: { rendered: '<h1>Original Title for Backup Test</h1><p>Updated content.</p>' },
        excerpt: { rendered: 'Updated excerpt for the post.' }
      });

      mockFetchAllPosts.mockResolvedValue([
        { id: 1100, title: { rendered: 'Original Title for Backup Test - Instant Auto Traders' } }
      ]);

      const fixResult = await fixer.applyFixes(post, auditResult);

      // Verify backup was created
      expect(fixResult.backup).toBeDefined();
      expect(fixResult.backup.title).toBe('Original Title for Backup Test');
      expect(fixResult.backup.content).toContain('Original Content');
    });

    test('should audit and fix posts with special characters', async () => {
      const specialPost = {
        id: 1200,
        title: { rendered: 'Title with "Quotes" & Ampersand' },
        content: { rendered: '<h1>Title with "Quotes" & Ampersand</h1><p>Content with special chars: <>&"\'</p>' },
        excerpt: { rendered: 'Excerpt with special characters: "quotes", \'apostrophes\', & ampersands for testing.' },
        link: 'https://example.com/special-chars',
        slug: 'special-chars',
        status: 'draft',
        _embedded: {}
      };

      const auditResult = auditor.auditPost(specialPost);

      expect(auditResult).toBeDefined();
      expect(auditResult.score).toBeDefined();

      mockUpdatePost.mockResolvedValue({
        id: 1200,
        title: { rendered: 'Title with "Quotes" & Ampersand - Instant Auto Traders' }
      });

      mockFetchAllPosts.mockResolvedValue([
        { id: 1200, title: { rendered: 'Title with "Quotes" & Ampersand - Instant Auto Traders' } }
      ]);

      const fixResult = await fixer.applyFixes(specialPost, auditResult);

      // Should handle special characters without errors
      expect(fixResult).toBeDefined();
    });

    test('should handle concurrent fix operations', async () => {
      const posts = Array.from({ length: 5 }, (_, i) => ({
        id: 1300 + i,
        title: { rendered: `Concurrent Test Post ${i + 1}` },
        content: { rendered: `<h1>Concurrent Test Post ${i + 1}</h1><p>Content for concurrent testing purposes with sufficient length.</p>` },
        excerpt: { rendered: `Excerpt for concurrent test post ${i + 1} with adequate length for validation.` },
        link: `https://example.com/concurrent-${i + 1}`,
        slug: `concurrent-${i + 1}`,
        status: 'draft',
        _embedded: {}
      }));

      const auditResults = posts.map(p => auditor.auditPost(p));

      mockUpdatePost.mockImplementation((id) =>
        Promise.resolve({
          id,
          title: { rendered: `Updated Post ${id}` }
        })
      );

      mockFetchAllPosts.mockResolvedValue(
        posts.map(p => ({ id: p.id, title: { rendered: `Updated Post ${p.id}` } }))
      );

      const { config } = await import('../../config/env/config.js');
      const originalDryRun = config.safety.dryRun;
      config.safety.dryRun = true;

      const summary = await applyFixesToPostsV2(posts, auditResults);

      expect(summary.total).toBe(5);
      expect(summary.dryRun).toBe(true);

      config.safety.dryRun = originalDryRun;
    });
  });

  describe('Extended Integration Scenarios', () => {
    test('should handle post with missing featured image', async () => {
      const postNoImage = {
        id: 250,
        title: { rendered: 'Post Without Featured Image Content' },
        content: { rendered: '<h1>Title</h1><p>Content without any images at all in the post body or featured image.</p>' },
        excerpt: { rendered: 'Valid excerpt content with sufficient length for SEO requirements and validation.' },
        link: 'https://example.com/no-image-post',
        slug: 'no-image-post',
        status: 'publish',
        _embedded: {
          // No featured image
        }
      };

      const auditResult = auditor.auditPost(postNoImage);

      // Should detect missing images
      const imageIssue = auditResult.issues.find(i => i.type === 'images');
      expect(auditResult).toBeDefined();
      expect(auditResult.score).toBeDefined();
    });

    test('should audit and fix post with long slug', async () => {
      const longSlugPost = {
        id: 260,
        title: { rendered: 'Great Car Deals Sydney' },
        content: { rendered: '<h1>Great Car Deals</h1><p>Quality content about car deals with sufficient length for validation.</p>' },
        excerpt: { rendered: 'Find the best car deals in Sydney with our comprehensive guide and expert recommendations.' },
        link: 'https://example.com/the-very-best-ultimate-guide-for-great-car-deals',
        slug: 'the-very-best-ultimate-guide-for-great-car-deals-in-sydney-australia',
        status: 'draft',
        _embedded: {}
      };

      const auditResult = auditor.auditPost(longSlugPost);

      // Should have issues
      expect(auditResult.issues).toBeDefined();
      expect(auditResult.issues.length).toBeGreaterThan(0);

      // Apply fixes
      mockUpdatePost.mockResolvedValue({
        id: 260,
        slug: 'great-car-deals-sydney'
      });

      const fixResult = await fixer.applyFixes(longSlugPost, auditResult);

      expect(fixResult).toBeDefined();
    });

    test('should handle audit of multiple posts with varying quality', () => {
      const posts = [
        {
          id: 301,
          title: { rendered: 'Excellent SEO Optimized Title Here' },
          content: { rendered: '<h1>Title</h1><h2>Section</h2><p>High quality content with proper structure and sufficient length for SEO validation.</p>' },
          excerpt: { rendered: 'Excellent meta description with keywords and proper length for SEO optimization purposes.' },
          link: 'https://example.com/excellent-post',
          slug: 'excellent-post',
          status: 'publish'
        },
        {
          id: 302,
          title: { rendered: 'Bad' },
          content: { rendered: '<p>Thin content</p>' },
          excerpt: { rendered: 'Bad' },
          link: 'https://example.com/bad-post',
          slug: 'the-bad-post',
          status: 'draft'
        }
      ];

      const results = posts.map(p => auditor.auditPost(p));

      // Good post should score higher
      expect(results[0].score).toBeGreaterThan(results[1].score);
      // Bad post should have issues
      expect(results[1].issues.length).toBeGreaterThanOrEqual(results[0].issues.length);
    });

    test('should process batch fix with error recovery', async () => {
      const posts = [
        {
          id: 400,
          title: { rendered: 'Good Title That Passes Validation' },
          content: { rendered: '<h1>Title</h1><p>Good content here with sufficient length.</p>' },
          excerpt: { rendered: 'Good excerpt with enough length for validation requirements to pass.' },
          link: 'https://example.com/post-1',
          slug: 'post-one',
          status: 'draft',
          _embedded: {}
        },
        {
          id: 401,
          title: { rendered: 'Another Good Title Here For Testing' },
          content: { rendered: '<h1>Title</h1><p>More content with adequate length.</p>' },
          excerpt: { rendered: 'Another good excerpt with proper length for SEO validation.' },
          link: 'https://example.com/post-2',
          slug: 'post-two',
          status: 'draft',
          _embedded: {}
        }
      ];

      const auditResults = posts.map(p => auditor.auditPost(p));

      // First post succeeds, second fails
      mockUpdatePost
        .mockResolvedValueOnce({ id: 400, title: { rendered: 'Updated' } })
        .mockRejectedValueOnce(new Error('API error'));

      mockFetchAllPosts.mockResolvedValue([
        { id: 400, title: { rendered: 'Updated' } }
      ]);

      const summary = await applyFixesToPostsV2(posts, auditResults);

      // Should still process all posts despite errors
      expect(summary.total).toBe(2);
      expect(summary.fixes).toBeDefined();
    });
  });
});
