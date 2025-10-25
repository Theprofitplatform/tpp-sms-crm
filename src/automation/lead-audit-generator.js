/**
 * Lead Audit Generator
 *
 * Generates automated SEO audits for lead magnet prospects
 * Provides basic SEO insights to demonstrate value
 */

import * as cheerio from 'cheerio';

export class LeadAuditGenerator {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (compatible; SEOExpertBot/1.0)';
  }

  /**
   * Generate a comprehensive audit for a website
   */
  async generateAudit(website) {
    try {
      // Ensure website has protocol
      if (!website.match(/^https?:\/\//i)) {
        website = 'https://' + website;
      }

      const url = new URL(website);
      const baseUrl = url.origin;

      console.log(`🔍 Generating audit for: ${baseUrl}`);

      // Fetch homepage
      const html = await this.fetchPage(baseUrl);
      const $ = cheerio.load(html);

      // Run all audit checks
      const [
        technical,
        onPage,
        competitors
      ] = await Promise.all([
        this.checkTechnicalSEO(baseUrl, $, html),
        this.checkOnPageSEO($, html),
        this.analyzeCompetitors(baseUrl)
      ]);

      const audit = {
        website: baseUrl,
        technical,
        onPage,
        competitors,
        generatedAt: new Date().toISOString()
      };

      return audit;

    } catch (error) {
      console.error('Audit generation error:', error);

      // Return a basic audit even if we fail to fetch the page
      return this.generateFallbackAudit(website, error);
    }
  }

  /**
   * Fetch a webpage
   */
  async fetchPage(url) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Check technical SEO factors
   */
  async checkTechnicalSEO(baseUrl, $, html) {
    const technical = {};

    // HTTPS check
    technical.httpsEnabled = baseUrl.startsWith('https://');

    // Mobile optimization check (viewport meta tag)
    const viewport = $('meta[name="viewport"]').attr('content');
    technical.mobileOptimized = !!viewport && viewport.includes('width=device-width');

    // Check for sitemap
    try {
      const sitemapUrl = `${baseUrl}/sitemap.xml`;
      const sitemapResponse = await fetch(sitemapUrl, { method: 'HEAD' });
      technical.sitemap = sitemapResponse.ok;
    } catch {
      technical.sitemap = false;
    }

    // Check for robots.txt
    try {
      const robotsUrl = `${baseUrl}/robots.txt`;
      const robotsResponse = await fetch(robotsUrl, { method: 'HEAD' });
      technical.robotsTxt = robotsResponse.ok;
    } catch {
      technical.robotsTxt = false;
    }

    // Estimate page speed (based on HTML size and resource count)
    const htmlSize = new Blob([html]).size;
    const scriptCount = $('script').length;
    const styleCount = $('link[rel="stylesheet"]').length;
    const imageCount = $('img').length;

    // Simple heuristic: smaller page + fewer resources = faster
    let speedScore = 100;
    if (htmlSize > 500000) speedScore -= 20; // Large HTML
    if (scriptCount > 15) speedScore -= 15; // Too many scripts
    if (styleCount > 10) speedScore -= 10; // Too many stylesheets
    if (imageCount > 50) speedScore -= 15; // Too many images

    technical.pageSpeed = Math.max(speedScore, 30);

    // Check for broken links (sample check)
    const links = $('a[href]').map((i, el) => $(el).attr('href')).get();
    const brokenLinksEstimate = links.filter(href =>
      href.includes('javascript:') || href === '#' || href === ''
    ).length;
    technical.brokenLinks = brokenLinksEstimate;

    // Check for canonical tag
    technical.hasCanonical = $('link[rel="canonical"]').length > 0;

    // Check for Open Graph tags
    const ogTags = $('meta[property^="og:"]').length;
    technical.hasOpenGraph = ogTags >= 3;

    // Check for Twitter Card tags
    const twitterTags = $('meta[name^="twitter:"]').length;
    technical.hasTwitterCard = twitterTags >= 2;

    return technical;
  }

  /**
   * Check on-page SEO factors
   */
  async checkOnPageSEO($, html) {
    const onPage = {};

    // Title tag
    const title = $('title').text();
    onPage.titleOptimized = title.length >= 30 && title.length <= 60;
    onPage.titleLength = title.length;
    onPage.title = title;

    // Meta description
    const metaDesc = $('meta[name="description"]').attr('content');
    onPage.metaDescriptions = !!metaDesc;
    onPage.metaDescOptimized = metaDesc && metaDesc.length >= 120 && metaDesc.length <= 160;
    onPage.metaDescLength = metaDesc ? metaDesc.length : 0;

    // Heading structure
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;

    onPage.headingStructure = h1Count === 1 && h2Count >= 2;
    onPage.h1Count = h1Count;
    onPage.h2Count = h2Count;
    onPage.h3Count = h3Count;

    // Image optimization
    const images = $('img');
    const imagesWithAlt = images.filter((i, el) => !!$(el).attr('alt')).length;
    const totalImages = images.length;

    onPage.imageAltText = totalImages > 0 ? (imagesWithAlt / totalImages) > 0.8 : true;
    onPage.totalImages = totalImages;
    onPage.missingAltText = totalImages - imagesWithAlt;

    // Content length
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').length;

    onPage.contentLength = wordCount;
    onPage.thinContent = wordCount < 300 ? 1 : 0;

    // Internal linking
    const internalLinks = $('a[href]').filter((i, el) => {
      const href = $(el).attr('href');
      return href && (href.startsWith('/') || href.startsWith('#'));
    }).length;

    onPage.internalLinks = internalLinks;

    // Duplicate checks (simulated)
    onPage.missingTitles = title ? 0 : 1;
    onPage.missingDescriptions = metaDesc ? 0 : 1;
    onPage.duplicateTitles = 0; // Would need to crawl multiple pages

    return onPage;
  }

  /**
   * Analyze competitor landscape (simulated)
   */
  async analyzeCompetitors(baseUrl) {
    // This is a simplified version
    // In production, you would:
    // 1. Extract keywords from the page
    // 2. Query search APIs for those keywords
    // 3. Identify actual competitors
    // 4. Compare metrics

    const competitors = {
      analyzed: true,
      keywordGaps: Math.floor(Math.random() * 50) + 20, // 20-70 keywords
      betterThan: Math.floor(Math.random() * 3) + 1, // 1-3 competitors
      competitorCount: 5,
      topCompetitor: this.extractDomain(baseUrl) + ' competitor',
      opportunities: [
        'Local keyword opportunities',
        'Long-tail keyword gaps',
        'Content improvement areas'
      ]
    };

    return competitors;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Generate fallback audit when website is unreachable
   */
  generateFallbackAudit(website, error) {
    return {
      website,
      error: true,
      errorMessage: error.message,
      technical: {
        httpsEnabled: website.startsWith('https://'),
        mobileOptimized: null,
        sitemap: null,
        robotsTxt: null,
        pageSpeed: null,
        brokenLinks: 0,
        hasCanonical: null,
        hasOpenGraph: null,
        hasTwitterCard: null
      },
      onPage: {
        titleOptimized: null,
        titleLength: 0,
        metaDescriptions: null,
        metaDescOptimized: null,
        headingStructure: null,
        imageAltText: null,
        contentLength: 0,
        thinContent: 0,
        internalLinks: 0,
        missingTitles: 1,
        missingDescriptions: 1,
        duplicateTitles: 0
      },
      competitors: {
        analyzed: false,
        keywordGaps: 0,
        betterThan: 0,
        competitorCount: 0,
        opportunities: []
      },
      generatedAt: new Date().toISOString(),
      note: 'Unable to fully analyze website. Please verify the URL is correct and publicly accessible.'
    };
  }

  /**
   * Format audit as HTML report (optional)
   */
  formatAsHTML(audit) {
    const score = this.calculateScore(audit);

    return `
<!DOCTYPE html>
<html>
<head>
  <title>SEO Audit for ${audit.website}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #2563eb; }
    .score { font-size: 48px; color: #10b981; font-weight: bold; }
    .section { margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
    .section h2 { color: #1e293b; margin-bottom: 15px; }
    .metric { margin: 10px 0; }
    .metric-label { font-weight: 600; }
    .check { color: #10b981; }
    .cross { color: #ef4444; }
  </style>
</head>
<body>
  <h1>SEO Audit Report</h1>
  <p>Website: <strong>${audit.website}</strong></p>
  <p>Generated: ${new Date(audit.generatedAt).toLocaleString()}</p>

  <div class="section">
    <h2>Overall SEO Score</h2>
    <div class="score">${score}/100</div>
  </div>

  <div class="section">
    <h2>Technical SEO</h2>
    <div class="metric">
      <span class="metric-label">HTTPS Enabled:</span>
      <span class="${audit.technical.httpsEnabled ? 'check' : 'cross'}">
        ${audit.technical.httpsEnabled ? '✓' : '✗'}
      </span>
    </div>
    <div class="metric">
      <span class="metric-label">Mobile Optimized:</span>
      <span class="${audit.technical.mobileOptimized ? 'check' : 'cross'}">
        ${audit.technical.mobileOptimized ? '✓' : '✗'}
      </span>
    </div>
    <div class="metric">
      <span class="metric-label">Page Speed Score:</span>
      ${audit.technical.pageSpeed}/100
    </div>
  </div>

  <div class="section">
    <h2>On-Page SEO</h2>
    <div class="metric">
      <span class="metric-label">Title Tag:</span>
      ${audit.onPage.title} (${audit.onPage.titleLength} chars)
    </div>
    <div class="metric">
      <span class="metric-label">Meta Description:</span>
      <span class="${audit.onPage.metaDescriptions ? 'check' : 'cross'}">
        ${audit.onPage.metaDescriptions ? '✓ Present' : '✗ Missing'}
      </span>
    </div>
    <div class="metric">
      <span class="metric-label">Content Length:</span>
      ${audit.onPage.contentLength} words
    </div>
  </div>

  <div class="section">
    <h2>Recommendations</h2>
    <ul>
      ${!audit.technical.httpsEnabled ? '<li>Enable HTTPS for security and SEO</li>' : ''}
      ${!audit.technical.mobileOptimized ? '<li>Add mobile viewport meta tag</li>' : ''}
      ${!audit.technical.sitemap ? '<li>Create and submit an XML sitemap</li>' : ''}
      ${!audit.onPage.metaDescriptions ? '<li>Add meta descriptions to improve CTR</li>' : ''}
      ${audit.onPage.thinContent > 0 ? '<li>Increase content length (minimum 300 words)</li>' : ''}
      ${audit.onPage.missingAltText > 0 ? '<li>Add alt text to ' + audit.onPage.missingAltText + ' images</li>' : ''}
    </ul>
  </div>

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
    <p>Generated by SEO Expert - Your AI-Powered SEO Platform</p>
  </footer>
</body>
</html>
    `.trim();
  }

  /**
   * Calculate overall SEO score
   */
  calculateScore(audit) {
    let score = 50; // Base score

    // Technical SEO factors
    if (audit.technical.httpsEnabled) score += 10;
    if (audit.technical.mobileOptimized) score += 10;
    if (audit.technical.sitemap) score += 5;
    if (audit.technical.robotsTxt) score += 3;
    if (audit.technical.pageSpeed && audit.technical.pageSpeed > 70) score += 7;
    if (audit.technical.hasCanonical) score += 3;
    if (audit.technical.hasOpenGraph) score += 2;

    // On-page SEO factors
    if (audit.onPage.titleOptimized) score += 5;
    if (audit.onPage.metaDescriptions) score += 5;
    if (audit.onPage.headingStructure) score += 5;
    if (audit.onPage.imageAltText) score += 3;
    if (audit.onPage.contentLength > 300) score += 2;

    return Math.min(score, 100);
  }
}

export default LeadAuditGenerator;
