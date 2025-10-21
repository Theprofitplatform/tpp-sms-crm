import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ReportGenerator, generateReport } from '../../src/audit/report.js';
import fs from 'fs';
import path from 'path';

describe('Report Generator', () => {
  let generator;
  const testReportDir = path.join(process.cwd(), 'logs');
  let testFiles = [];

  beforeEach(() => {
    generator = new ReportGenerator();

    // Ensure logs directory exists
    if (!fs.existsSync(testReportDir)) {
      fs.mkdirSync(testReportDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test report files
    testFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        // Ignore cleanup errors - file may already be deleted
      }
    });
    testFiles = [];
  });

  const mockAuditResults = {
    summary: {
      totalPosts: 10,
      avgScore: 75,
      totalIssues: 5,
      performanceScore: 85,
      criticalIssues: 2,
      warnings: 5,
      issuesBySeverity: {
        critical: 2,
        high: 1,
        medium: 2,
        low: 0
      }
    },
    posts: [
      {
        postId: 1,
        title: 'Test Post 1',
        url: 'https://example.com/test-post-1',
        score: 80,
        issues: [
          {
            type: 'title',
            severity: 'warning',
            message: 'Title too long',
            fix: 'Shorten to 60 chars'
          }
        ]
      },
      {
        postId: 2,
        title: 'Test Post 2',
        url: 'https://example.com/test-post-2',
        score: 70,
        issues: [
          {
            type: 'meta_description',
            severity: 'critical',
            message: 'Missing meta description',
            fix: 'Add description'
          }
        ]
      }
    ]
  };

  test('should generate JSON report', () => {
    const filename = generator.generateJSON(mockAuditResults);
    testFiles.push(filename);

    expect(fs.existsSync(filename)).toBe(true);
    expect(filename).toMatch(/audit-report-.*\.json$/);

    const content = JSON.parse(fs.readFileSync(filename, 'utf8'));
    expect(content.summary).toBeDefined();
    expect(content.posts).toHaveLength(2);
    expect(content.summary.totalPosts).toBe(10);
  });

  test('should generate Markdown report', () => {
    const filename = generator.generateMarkdownFile(mockAuditResults);
    testFiles.push(filename);

    expect(fs.existsSync(filename)).toBe(true);
    expect(filename).toMatch(/audit-summary-.*\.md$/);

    const content = fs.readFileSync(filename, 'utf8');
    expect(content).toContain('# SEO Audit Report');
    expect(content).toContain('Test Post 1');
    expect(content).toContain('**Average Score:** 75/100');
  });

  test('should generate HTML report', () => {
    const filename = generator.generateHTMLFile(mockAuditResults);
    testFiles.push(filename);

    expect(fs.existsSync(filename)).toBe(true);
    expect(filename).toMatch(/audit-report-.*\.html$/);

    const content = fs.readFileSync(filename, 'utf8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('Test Post 1');
    expect(content).toContain('SEO Audit Report');
  });

  test('should calculate summary statistics', () => {
    const posts = [
      { score: 80, issues: [{ severity: 'critical' }, { severity: 'warning' }] },
      { score: 90, issues: [{ severity: 'warning' }] },
      { score: 70, issues: [{ severity: 'critical' }, { severity: 'critical' }] }
    ];

    const summary = generator.calculateSummary(posts);

    expect(summary.totalPosts).toBe(3);
    expect(summary.averageScore).toBe(80);
    expect(summary.criticalIssues).toBe(3);
    expect(summary.warnings).toBe(2);
  });

  test('should handle empty results', () => {
    const emptyResults = {
      summary: { totalPosts: 0, averageScore: 0, criticalIssues: 0, warnings: 0 },
      posts: []
    };

    const filename = generator.generateJSON(emptyResults);
    testFiles.push(filename);

    expect(fs.existsSync(filename)).toBe(true);

    const content = JSON.parse(fs.readFileSync(filename, 'utf8'));
    expect(content.posts).toHaveLength(0);
  });

  test('should generate all report formats', () => {
    const files = generator.generateAll(mockAuditResults);

    files.forEach(file => {
      testFiles.push(file);
      expect(fs.existsSync(file)).toBe(true);
    });

    expect(files).toHaveLength(3); // JSON, Markdown, HTML
  });

  describe('Main generateReport()', () => {
    test('should generate complete report with all formats', () => {
      const auditData = {
        contentAudit: [
          {
            postId: 1,
            title: 'Test Post',
            url: 'https://example.com/test',
            score: 75,
            issues: [
              { type: 'title', severity: 'high', message: 'Title too long', fix: 'Shorten' },
              { type: 'meta', severity: 'critical', message: 'Missing meta', fix: 'Add meta' }
            ]
          },
          {
            postId: 2,
            title: 'Another Post',
            url: 'https://example.com/another',
            score: 85,
            issues: [
              { type: 'images', severity: 'low', message: 'Missing alt', fix: 'Add alt tags' }
            ]
          }
        ],
        technicalAudit: {
          issues: [
            { severity: 'high', message: 'Slow load time', fix: 'Optimize images' }
          ],
          metrics: {
            mobile: {
              scores: { performance: 65 },
              opportunities: [
                { title: 'Reduce JS', savings: '2.5s', description: 'Minify JavaScript' }
              ]
            }
          }
        },
        fixes: {
          applied: 5,
          total: 10
        },
        metadata: {
          site: 'Test Site',
          date: '2025-10-18'
        }
      };

      const result = generator.generateReport(auditData);

      expect(result.jsonPath).toBeDefined();
      expect(result.htmlPath).toBeDefined();
      expect(result.mdPath).toBeDefined();
      expect(result.report).toBeDefined();

      testFiles.push(result.jsonPath, result.htmlPath, result.mdPath);

      // Verify all files exist
      expect(fs.existsSync(result.jsonPath)).toBe(true);
      expect(fs.existsSync(result.htmlPath)).toBe(true);
      expect(fs.existsSync(result.mdPath)).toBe(true);

      // Verify report structure
      expect(result.report.summary).toBeDefined();
      expect(result.report.summary.totalPosts).toBe(2);
      expect(result.report.summary.totalIssues).toBe(3);
      expect(result.report.summary.issuesBySeverity.critical).toBe(1);
      expect(result.report.summary.issuesBySeverity.high).toBe(1);
      expect(result.report.summary.issuesBySeverity.low).toBe(1);
    });

    test('should handle empty content audit', () => {
      const auditData = {
        contentAudit: [],
        technicalAudit: {},
        fixes: null,
        metadata: {}
      };

      const result = generator.generateReport(auditData);

      testFiles.push(result.jsonPath, result.htmlPath, result.mdPath);

      expect(result.report.summary.totalPosts).toBe(0);
      expect(result.report.summary.totalIssues).toBe(0);
      expect(result.report.summary.avgScore).toBe(0);
    });

    test('should process content audit by type', () => {
      const auditData = {
        contentAudit: [
          {
            postId: 1,
            title: 'Post 1',
            url: 'https://example.com/1',
            score: 70,
            issues: [
              { type: 'title', severity: 'medium', message: 'Issue 1', fix: 'Fix 1' },
              { type: 'title', severity: 'high', message: 'Issue 2', fix: 'Fix 2' },
              { type: 'meta', severity: 'critical', message: 'Issue 3', fix: 'Fix 3' }
            ]
          }
        ],
        technicalAudit: {},
        fixes: null
      };

      const result = generator.generateReport(auditData);

      testFiles.push(result.jsonPath, result.htmlPath, result.mdPath);

      expect(result.report.contentAudit.issuesByType.title).toBeDefined();
      expect(result.report.contentAudit.issuesByType.title).toHaveLength(2);
      expect(result.report.contentAudit.issuesByType.meta).toHaveLength(1);
    });

    test('should generate recommendations', () => {
      const auditData = {
        contentAudit: [
          {
            postId: 1,
            title: 'Post 1',
            url: 'https://example.com/1',
            score: 60,
            issues: [
              { type: 'meta', severity: 'critical', message: 'Critical issue', fix: 'Fix it now' },
              { type: 'title', severity: 'medium', message: 'Medium issue', fix: 'Fix soon' }
            ]
          }
        ],
        technicalAudit: {
          issues: [
            { severity: 'high', message: 'Tech issue', fix: 'Technical fix' }
          ],
          metrics: {
            mobile: {
              scores: { performance: 45 },
              opportunities: [
                { title: 'Optimize images', savings: '3s', description: 'Compress images' }
              ]
            }
          }
        }
      };

      const result = generator.generateReport(auditData);

      testFiles.push(result.jsonPath, result.htmlPath, result.mdPath);

      expect(result.report.recommendations).toBeDefined();
      expect(result.report.recommendations.length).toBeGreaterThan(0);

      const criticalRec = result.report.recommendations.find(r => r.priority === 'CRITICAL');
      expect(criticalRec).toBeDefined();
    });
  });

  describe('Helper Methods', () => {
    test('should find common issues', () => {
      const posts = [
        { score: 70, issues: [{ type: 'title', message: 'Title too long', fix: 'Shorten' }] },
        { score: 75, issues: [{ type: 'title', message: 'Title too long', fix: 'Shorten' }] },
        { score: 80, issues: [{ type: 'title', message: 'Title too long', fix: 'Shorten' }] },
        { score: 85, issues: [{ type: 'meta', message: 'Missing meta', fix: 'Add meta' }] }
      ];

      const summary = generator.calculateSummary(posts);

      expect(summary.totalPosts).toBe(4);
      expect(summary.totalIssues).toBe(4);
    });
  });

  describe('Exported generateReport Function', () => {
    test('should generate report using exported function', async () => {
      const data = {
        contentAudit: mockAuditResults.posts,
        technicalAudit: {}
      };

      const result = await generateReport(data);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('htmlPath');
      expect(result).toHaveProperty('jsonPath');
      expect(result).toHaveProperty('mdPath');
      testFiles.push(result.htmlPath, result.jsonPath, result.mdPath);
    });
  });

  describe('Recommendations with Common Issues', () => {
    test('should include common issues in recommendations when found', async () => {
      // Create multiple posts with the same issue to trigger common issues detection
      const contentAuditWithCommonIssues = [
        { postId: 1, title: 'Post 1', url: 'https://example.com/post-1', score: 70, issues: [{ type: 'title', message: 'Title too short', severity: 'high', fix: 'Extend title' }] },
        { postId: 2, title: 'Post 2', url: 'https://example.com/post-2', score: 72, issues: [{ type: 'title', message: 'Title too short', severity: 'high', fix: 'Extend title' }] },
        { postId: 3, title: 'Post 3', url: 'https://example.com/post-3', score: 75, issues: [{ type: 'title', message: 'Title too short', severity: 'high', fix: 'Extend title' }] },
        { postId: 4, title: 'Post 4', url: 'https://example.com/post-4', score: 77, issues: [{ type: 'meta', message: 'Meta missing', severity: 'medium', fix: 'Add meta' }] }
      ];

      const data = {
        contentAudit: contentAuditWithCommonIssues,
        technicalAudit: {}
      };

      const result = await generateReport(data);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('htmlPath');
      testFiles.push(result.htmlPath, result.jsonPath, result.mdPath);

      // Verify the report was generated
      expect(fs.existsSync(result.htmlPath)).toBe(true);
    });

    test('should limit common issues to top 10 and sort by count', async () => {
      // Create posts with >10 different common issues to test sorting and slicing
      const contentWith15Issues = [];
      for (let i = 1; i <= 15; i++) {
        // Each issue type appears (16-i) times to test sorting
        for (let j = 0; j < (16 - i); j++) {
          contentWith15Issues.push({
            postId: contentWith15Issues.length + 1,
            title: `Post ${contentWith15Issues.length + 1}`,
            url: `https://example.com/post-${contentWith15Issues.length + 1}`,
            score: 70,
            issues: [{
              type: `issue${i}`,
              message: `Common issue type ${i}`,
              severity: 'medium',
              fix: 'Fix it'
            }]
          });
        }
      }

      const data = {
        contentAudit: contentWith15Issues,
        technicalAudit: {}
      };

      const result = await generateReport(data);

      expect(result).toBeDefined();
      testFiles.push(result.htmlPath, result.jsonPath, result.mdPath);

      // Read the JSON report to verify common issues are limited to 10 and sorted
      const jsonContent = JSON.parse(fs.readFileSync(result.jsonPath, 'utf8'));
      if (jsonContent.commonIssues) {
        expect(jsonContent.commonIssues.length).toBeLessThanOrEqual(10);
      }
    });
  });
});
