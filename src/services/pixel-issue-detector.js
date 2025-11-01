/**
 * ADVANCED SEO ISSUE DETECTOR
 *
 * Analyzes page data and detects SEO issues with severity scoring
 * and actionable recommendations
 */

class SEOIssueDetector {
  constructor() {
    this.issueTypes = {
      CRITICAL: {
        weight: 100,
        color: 'red',
        priority: 1
      },
      HIGH: {
        weight: 75,
        color: 'orange',
        priority: 2
      },
      MEDIUM: {
        weight: 50,
        color: 'yellow',
        priority: 3
      },
      LOW: {
        weight: 25,
        color: 'blue',
        priority: 4
      }
    };
  }

  /**
   * Detect all SEO issues for a page
   */
  detectIssues(pageData) {
    const issues = [];

    // Meta tag issues
    issues.push(...this.checkMetaTags(pageData));

    // Heading structure issues
    issues.push(...this.checkHeadings(pageData));

    // Image optimization issues
    issues.push(...this.checkImages(pageData));

    // Performance issues
    issues.push(...this.checkPerformance(pageData));

    // Mobile issues
    issues.push(...this.checkMobile(pageData));

    // Content issues
    issues.push(...this.checkContent(pageData));

    // Link issues
    issues.push(...this.checkLinks(pageData));

    // Schema issues
    issues.push(...this.checkSchema(pageData));

    return this.prioritizeIssues(issues);
  }

  /**
   * Check meta tag issues
   */
  checkMetaTags(data) {
    const issues = [];
    const meta = data.metadata;

    // Missing title
    if (!meta.title || meta.title.trim() === '') {
      issues.push(this.createIssue({
        type: 'MISSING_TITLE',
        severity: 'CRITICAL',
        category: 'Meta Tags',
        description: 'Page is missing a title tag',
        impact: 'Title tags are crucial for SEO and appear in search results',
        recommendation: 'Add a unique, descriptive title tag between 50-60 characters',
        fix: '<title>Your Page Title Here</title>',
        estimatedTime: '5 minutes'
      }));
    }

    // Title too short
    if (meta.title && meta.title.length < 30) {
      issues.push(this.createIssue({
        type: 'TITLE_TOO_SHORT',
        severity: 'HIGH',
        category: 'Meta Tags',
        description: `Title is only ${meta.title.length} characters (recommended: 50-60)`,
        impact: 'Short titles may not fully convey page content to users and search engines',
        recommendation: 'Expand title to include relevant keywords and page description',
        currentValue: meta.title,
        estimatedTime: '5 minutes'
      }));
    }

    // Title too long
    if (meta.title && meta.title.length > 60) {
      issues.push(this.createIssue({
        type: 'TITLE_TOO_LONG',
        severity: 'MEDIUM',
        category: 'Meta Tags',
        description: `Title is ${meta.title.length} characters (will be truncated in search results)`,
        impact: 'Long titles get cut off in search results, reducing click-through rates',
        recommendation: 'Shorten title to 50-60 characters, keeping most important keywords first',
        currentValue: meta.title,
        estimatedTime: '5 minutes'
      }));
    }

    // Missing meta description
    if (!meta.metaDescription || meta.metaDescription.trim() === '') {
      issues.push(this.createIssue({
        type: 'MISSING_META_DESCRIPTION',
        severity: 'HIGH',
        category: 'Meta Tags',
        description: 'Page is missing a meta description',
        impact: 'Meta descriptions influence click-through rates from search results',
        recommendation: 'Add a compelling meta description between 150-160 characters',
        fix: '<meta name="description" content="Your description here">',
        estimatedTime: '10 minutes'
      }));
    }

    // Meta description too short
    if (meta.metaDescription && meta.metaDescription.length < 120) {
      issues.push(this.createIssue({
        type: 'META_DESCRIPTION_TOO_SHORT',
        severity: 'MEDIUM',
        category: 'Meta Tags',
        description: `Meta description is only ${meta.metaDescription.length} characters`,
        impact: 'Short descriptions don\'t fully utilize search result space',
        recommendation: 'Expand to 150-160 characters for better visibility',
        currentValue: meta.metaDescription,
        estimatedTime: '5 minutes'
      }));
    }

    // Missing Open Graph tags
    if (!meta.ogTitle) {
      const titleValue = meta.title || 'Your Title';
      const descValue = meta.metaDescription || 'Your Description';
      issues.push(this.createIssue({
        type: 'MISSING_OG_TAGS',
        severity: 'MEDIUM',
        category: 'Social Media',
        description: 'Missing Open Graph tags for social media sharing',
        impact: 'Pages won\'t display properly when shared on social media',
        recommendation: 'Add og:title, og:description, and og:image tags',
        fix: `<meta property="og:title" content="${titleValue}">\n<meta property="og:description" content="${descValue}">\n<meta property="og:image" content="https://yoursite.com/image.jpg">`,
        estimatedTime: '10 minutes'
      }));
    }

    return issues;
  }

  /**
   * Check heading structure
   */
  checkHeadings(data) {
    const issues = [];
    const { h1Tags, h2Tags } = data.metadata;

    // Missing H1
    if (!h1Tags || h1Tags.length === 0) {
      issues.push(this.createIssue({
        type: 'MISSING_H1',
        severity: 'CRITICAL',
        category: 'Headings',
        description: 'Page is missing an H1 heading',
        impact: 'H1 tags help search engines understand page hierarchy and main topic',
        recommendation: 'Add one clear H1 heading that describes the page content',
        fix: '<h1>Your Main Heading</h1>',
        estimatedTime: '5 minutes'
      }));
    }

    // Multiple H1s
    if (h1Tags && h1Tags.length > 1) {
      issues.push(this.createIssue({
        type: 'MULTIPLE_H1',
        severity: 'MEDIUM',
        category: 'Headings',
        description: `Page has ${h1Tags.length} H1 headings (should have exactly 1)`,
        impact: 'Multiple H1s can confuse search engines about page focus',
        recommendation: 'Use only one H1 for the main heading, convert others to H2-H6',
        currentValue: h1Tags.join(', '),
        estimatedTime: '10 minutes'
      }));
    }

    // No H2 tags
    if (!h2Tags || h2Tags.length === 0) {
      issues.push(this.createIssue({
        type: 'MISSING_H2',
        severity: 'LOW',
        category: 'Headings',
        description: 'Page has no H2 headings for content structure',
        impact: 'Lack of heading hierarchy makes content harder to scan',
        recommendation: 'Add H2 tags to break content into logical sections',
        estimatedTime: '15 minutes'
      }));
    }

    return issues;
  }

  /**
   * Check image optimization
   */
  checkImages(data) {
    const issues = [];
    const images = data.metadata.images || [];

    let imagesWithoutAlt = 0;
    let largeImages = 0;
    let imagesWithoutLazyLoading = 0;

    images.forEach(img => {
      if (!img.hasAlt) imagesWithoutAlt++;
      if (img.width > 2000 || img.height > 2000) largeImages++;
      if (!img.loading || img.loading !== 'lazy') imagesWithoutLazyLoading++;
    });

    // Images without alt text
    if (imagesWithoutAlt > 0) {
      issues.push(this.createIssue({
        type: 'IMAGES_WITHOUT_ALT',
        severity: 'HIGH',
        category: 'Images',
        description: `${imagesWithoutAlt} images are missing alt text`,
        impact: 'Missing alt text hurts accessibility and image SEO',
        recommendation: 'Add descriptive alt text to all images',
        fix: '<img src="image.jpg" alt="Descriptive text here">',
        estimatedTime: `${imagesWithoutAlt * 2} minutes`,
        affectedCount: imagesWithoutAlt
      }));
    }

    // Large unoptimized images
    if (largeImages > 0) {
      issues.push(this.createIssue({
        type: 'LARGE_IMAGES',
        severity: 'MEDIUM',
        category: 'Performance',
        description: `${largeImages} images are oversized (>2000px)`,
        impact: 'Large images slow down page load time',
        recommendation: 'Resize images to appropriate dimensions and compress',
        estimatedTime: `${largeImages * 5} minutes`,
        affectedCount: largeImages
      }));
    }

    // Images without lazy loading
    if (imagesWithoutLazyLoading > 3) {
      issues.push(this.createIssue({
        type: 'NO_LAZY_LOADING',
        severity: 'LOW',
        category: 'Performance',
        description: `${imagesWithoutLazyLoading} images not using lazy loading`,
        impact: 'All images load immediately, slowing initial page load',
        recommendation: 'Add loading="lazy" attribute to below-the-fold images',
        fix: '<img src="image.jpg" loading="lazy" alt="...">',
        estimatedTime: '10 minutes',
        affectedCount: imagesWithoutLazyLoading
      }));
    }

    return issues;
  }

  /**
   * Check performance issues
   */
  checkPerformance(data) {
    const issues = [];
    const vitals = data.performanceMetrics || data.vitals || {};

    // Poor LCP
    if (vitals.lcp && vitals.lcp > 2500) {
      const severity = vitals.lcp > 4000 ? 'CRITICAL' : 'HIGH';
      issues.push(this.createIssue({
        type: 'POOR_LCP',
        severity,
        category: 'Performance',
        description: `Largest Contentful Paint is ${(vitals.lcp / 1000).toFixed(2)}s (should be <2.5s)`,
        impact: 'Slow LCP affects user experience and Core Web Vitals score',
        recommendation: 'Optimize images, reduce server response time, use CDN',
        currentValue: `${(vitals.lcp / 1000).toFixed(2)}s`,
        targetValue: '<2.5s',
        estimatedTime: '30 minutes'
      }));
    }

    // Poor FID
    if (vitals.fid && vitals.fid > 100) {
      const severity = vitals.fid > 300 ? 'CRITICAL' : 'HIGH';
      issues.push(this.createIssue({
        type: 'POOR_FID',
        severity,
        category: 'Performance',
        description: `First Input Delay is ${vitals.fid}ms (should be <100ms)`,
        impact: 'High FID means page is not responsive to user interactions',
        recommendation: 'Reduce JavaScript execution time, split large bundles',
        currentValue: `${vitals.fid}ms`,
        targetValue: '<100ms',
        estimatedTime: '1 hour'
      }));
    }

    // Poor CLS
    if (vitals.cls && vitals.cls > 0.1) {
      const severity = vitals.cls > 0.25 ? 'HIGH' : 'MEDIUM';
      issues.push(this.createIssue({
        type: 'POOR_CLS',
        severity,
        category: 'Performance',
        description: `Cumulative Layout Shift is ${vitals.cls.toFixed(3)} (should be <0.1)`,
        impact: 'Layout shifts cause poor user experience and accidental clicks',
        recommendation: 'Reserve space for images, avoid inserting content above existing content',
        currentValue: vitals.cls.toFixed(3),
        targetValue: '<0.1',
        estimatedTime: '45 minutes'
      }));
    }

    return issues;
  }

  /**
   * Check mobile optimization
   */
  checkMobile(data) {
    const issues = [];
    const meta = data.metadata;

    // Missing viewport meta tag
    if (!meta.hasViewport) {
      issues.push(this.createIssue({
        type: 'MISSING_VIEWPORT',
        severity: 'CRITICAL',
        category: 'Mobile',
        description: 'Page is missing viewport meta tag',
        impact: 'Page won\'t be mobile-responsive without viewport tag',
        recommendation: 'Add viewport meta tag to <head>',
        fix: '<meta name="viewport" content="width=device-width, initial-scale=1">',
        estimatedTime: '2 minutes'
      }));
    }

    return issues;
  }

  /**
   * Check content issues
   */
  checkContent(data) {
    const issues = [];
    const { wordCount } = data.metadata;

    // Thin content
    if (wordCount && wordCount < 300) {
      issues.push(this.createIssue({
        type: 'THIN_CONTENT',
        severity: 'MEDIUM',
        category: 'Content',
        description: `Page has only ${wordCount} words (recommended: 300+)`,
        impact: 'Thin content may not rank well for competitive keywords',
        recommendation: 'Add more valuable, relevant content to the page',
        currentValue: `${wordCount} words`,
        targetValue: '300+ words',
        estimatedTime: '1 hour'
      }));
    }

    return issues;
  }

  /**
   * Check link issues
   */
  checkLinks(data) {
    const issues = [];
    const links = data.metadata.links || [];

    let externalLinksWithoutRel = 0;
    links.forEach(link => {
      if (!link.isInternal && !link.rel) {
        externalLinksWithoutRel++;
      }
    });

    // External links without rel attributes
    if (externalLinksWithoutRel > 5) {
      issues.push(this.createIssue({
        type: 'EXTERNAL_LINKS_NO_REL',
        severity: 'LOW',
        category: 'Links',
        description: `${externalLinksWithoutRel} external links missing rel attributes`,
        impact: 'May pass PageRank to external sites unnecessarily',
        recommendation: 'Add rel="nofollow" or rel="noopener" to external links as appropriate',
        estimatedTime: '15 minutes',
        affectedCount: externalLinksWithoutRel
      }));
    }

    return issues;
  }

  /**
   * Check schema markup
   */
  checkSchema(data) {
    const issues = [];
    const schema = data.metadata.schema || [];

    // No schema markup
    if (schema.length === 0) {
      issues.push(this.createIssue({
        type: 'MISSING_SCHEMA',
        severity: 'MEDIUM',
        category: 'Structured Data',
        description: 'Page has no schema markup',
        impact: 'Missing schema reduces rich snippet opportunities in search results',
        recommendation: 'Add relevant schema markup (Article, Product, LocalBusiness, etc.)',
        estimatedTime: '20 minutes'
      }));
    }

    return issues;
  }

  /**
   * Create a formatted issue object
   */
  createIssue(issueData) {
    return {
      id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...issueData,
      severityWeight: this.issueTypes[issueData.severity].weight,
      severityColor: this.issueTypes[issueData.severity].color,
      priority: this.issueTypes[issueData.severity].priority,
      detectedAt: new Date().toISOString(),
      status: 'OPEN'
    };
  }

  /**
   * Prioritize issues by severity
   */
  prioritizeIssues(issues) {
    return issues.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.severityWeight - a.severityWeight;
    });
  }

  /**
   * Calculate overall SEO score
   */
  calculateSEOScore(issues) {
    if (issues.length === 0) return 100;

    const totalPenalty = issues.reduce((sum, issue) => {
      return sum + (issue.severityWeight / 10);
    }, 0);

    const score = Math.max(0, 100 - totalPenalty);
    return Math.round(score);
  }

  /**
   * Get issue summary
   */
  getIssueSummary(issues) {
    const summary = {
      total: issues.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCategory: {}
    };

    issues.forEach(issue => {
      // Count by severity
      summary[issue.severity.toLowerCase()]++;

      // Count by category
      if (!summary.byCategory[issue.category]) {
        summary.byCategory[issue.category] = 0;
      }
      summary.byCategory[issue.category]++;
    });

    return summary;
  }
}

export default new SEOIssueDetector();
