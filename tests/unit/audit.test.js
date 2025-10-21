import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SEOAuditor } from '../../src/audit/seo-audit.js';

describe('SEO Audit Tests', () => {
  const auditor = new SEOAuditor();

  const mockPost = {
    id: 1,
    title: { rendered: 'Test Post Title' },
    content: {
      rendered: `
        <h1>Main Heading</h1>
        <p>This is a test paragraph with some content.</p>
        <h2>Subheading</h2>
        <p>More content here with additional information.</p>
        <img src="test.jpg" alt="Test image" />
      `
    },
    excerpt: { rendered: 'Test excerpt' },
    link: 'https://example.com/test-post',
    slug: 'test-post',
    status: 'publish'
  };

  it('should audit a post and return results', async () => {
    const result = await auditor.auditPost(mockPost);

    assert.ok(result, 'Should return audit result');
    assert.strictEqual(result.postId, 1, 'Should have correct post ID');
    assert.ok(result.issues, 'Should have issues array');
    assert.ok(result.suggestions, 'Should have suggestions array');
    assert.ok(typeof result.score === 'number', 'Should have numeric score');
  });

  it('should detect missing H1 tags', async () => {
    const postNoH1 = {
      ...mockPost,
      content: {
        rendered: '<p>Content without H1</p>'
      }
    };

    const result = await auditor.auditPost(postNoH1);
    const h1Issue = result.issues.find(i => i.type === 'headings' && i.message.includes('H1'));

    assert.ok(h1Issue, 'Should detect missing H1');
    assert.strictEqual(h1Issue.severity, 'critical', 'Missing H1 should be critical');
  });

  it('should detect short title', async () => {
    const postShortTitle = {
      ...mockPost,
      title: { rendered: 'Short' }
    };

    const result = await auditor.auditPost(postShortTitle);
    const titleIssue = result.issues.find(i => i.type === 'title');

    assert.ok(titleIssue, 'Should detect short title');
    assert.ok(titleIssue.message.includes('too short'), 'Should identify as too short');
  });

  it('should detect long title', async () => {
    const postLongTitle = {
      ...mockPost,
      title: { rendered: 'This is a very long title that exceeds the recommended length for SEO purposes' }
    };

    const result = await auditor.auditPost(postLongTitle);
    const titleIssue = result.issues.find(i => i.type === 'title');

    assert.ok(titleIssue, 'Should detect long title');
    assert.ok(titleIssue.message.includes('too long'), 'Should identify as too long');
  });

  it('should detect missing alt text on images', async () => {
    const postNoAlt = {
      ...mockPost,
      content: {
        rendered: '<p>Test content</p><img src="test.jpg" />'
      }
    };

    const result = await auditor.auditPost(postNoAlt);
    const imageIssue = result.issues.find(i => i.type === 'images');

    assert.ok(imageIssue, 'Should detect missing alt text');
    assert.ok(imageIssue.message.includes('alt text'), 'Should mention alt text');
  });

  it('should detect thin content', async () => {
    const postThinContent = {
      ...mockPost,
      content: {
        rendered: '<p>Short content.</p>'
      }
    };

    const result = await auditor.auditPost(postThinContent);
    const contentIssue = result.issues.find(i => i.type === 'content' && i.message.includes('Thin'));

    assert.ok(contentIssue, 'Should detect thin content');
  });

  it('should count words correctly', async () => {
    const result = await auditor.auditPost(mockPost);

    assert.ok(result.meta, 'Should have metadata');
    assert.ok(result.meta.wordCount > 0, 'Should count words');
  });

  it('should check heading hierarchy', async () => {
    const postBadHierarchy = {
      ...mockPost,
      content: {
        rendered: '<h1>Title</h1><h4>Skipped to H4</h4>'
      }
    };

    const result = await auditor.auditPost(postBadHierarchy);
    const hierarchyIssue = result.issues.find(
      i => i.type === 'headings' && i.message.includes('hierarchy')
    );

    assert.ok(hierarchyIssue, 'Should detect broken heading hierarchy');
  });

  it('should provide fix suggestions', async () => {
    const result = await auditor.auditPost(mockPost);

    result.issues.forEach(issue => {
      assert.ok(issue.fix, `Issue "${issue.message}" should have fix suggestion`);
    });
  });

  it('should calculate score based on issues', async () => {
    const perfectPost = {
      ...mockPost,
      title: { rendered: 'Perfect SEO Title Between 50 and 60 Characters Long' },
      content: {
        rendered: `
          <h1>Main Title</h1>
          <p>${'Lorem ipsum '.repeat(50)}</p>
          <h2>Section</h2>
          <p>${'More content '.repeat(50)}</p>
          <img src="test.jpg" alt="Descriptive alt text" />
        `
      }
    };

    const result = await auditor.auditPost(perfectPost);

    assert.ok(result.score >= 80, 'Well-optimized post should have high score');
  });
});
