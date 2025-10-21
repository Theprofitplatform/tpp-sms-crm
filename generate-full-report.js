#!/usr/bin/env node

/**
 * Comprehensive SEO Report Generator
 * Creates detailed HTML report with actionable insights
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const WP_URL = 'https://instantautotraders.com.au';
const WP_USER = 'Claude';
const WP_APP_PASSWORD = 'evnTOjRy2jh8GdSyFLunlDsd';
const BASE_AUTH = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

const headers = {
  'Authorization': `Basic ${BASE_AUTH}`,
  'Content-Type': 'application/json'
};

async function fetchPosts(limit = 100) {
  const response = await axios.get(`${WP_URL}/wp-json/wp/v2/posts`, {
    headers,
    params: {
      per_page: limit,
      status: 'publish',
      orderby: 'date',
      order: 'desc'
    }
  });

  return response.data;
}

async function analyzePage(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    return null;
  }
}

function auditSEO(post, html) {
  const $ = cheerio.load(html);
  const issues = [];
  const passed = [];
  let score = 0;
  const maxScore = 100;

  // Title analysis (20 points)
  const titleLength = post.title.rendered.length;
  if (titleLength >= 30 && titleLength <= 60) {
    score += 20;
    passed.push({ type: 'Title Length', detail: `${titleLength} characters - Perfect!` });
  } else if (titleLength < 30) {
    issues.push({
      severity: 'critical',
      type: 'Title Too Short',
      detail: `${titleLength} chars (need 30-60)`,
      fix: 'Add location or brand name to title'
    });
  } else {
    score += 10;
    issues.push({
      severity: 'medium',
      type: 'Title Too Long',
      detail: `${titleLength} chars (need 30-60)`,
      fix: 'Shorten title, remove unnecessary words'
    });
  }

  // Meta description (20 points)
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  if (metaDesc.length >= 120 && metaDesc.length <= 160) {
    score += 20;
    passed.push({ type: 'Meta Description', detail: `${metaDesc.length} characters - Perfect!` });
  } else if (metaDesc.length === 0) {
    issues.push({
      severity: 'critical',
      type: 'Missing Meta Description',
      detail: 'No meta description found',
      fix: 'Write 120-160 character description'
    });
  } else {
    score += 10;
    issues.push({
      severity: 'medium',
      type: 'Meta Description Length',
      detail: `${metaDesc.length} chars (need 120-160)`,
      fix: metaDesc.length < 120 ? 'Expand description' : 'Shorten description'
    });
  }

  // Content length (15 points)
  const content = $('body').text().trim();
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 300) {
    score += 15;
    passed.push({ type: 'Content Length', detail: `${wordCount} words` });
  } else {
    issues.push({
      severity: 'critical',
      type: 'Thin Content',
      detail: `Only ${wordCount} words (need 300+)`,
      fix: 'Add more detailed, valuable content'
    });
  }

  // H1 tag (15 points)
  const h1Tags = $('h1');
  if (h1Tags.length === 1) {
    score += 15;
    passed.push({ type: 'H1 Tag', detail: 'Single H1 found - Perfect!' });
  } else if (h1Tags.length === 0) {
    issues.push({
      severity: 'critical',
      type: 'Missing H1',
      detail: 'No H1 tag found',
      fix: 'Add one H1 tag with main keyword'
    });
  } else {
    score += 5;
    issues.push({
      severity: 'medium',
      type: 'Multiple H1 Tags',
      detail: `Found ${h1Tags.length} H1 tags (should be 1)`,
      fix: 'Convert extra H1s to H2 or H3'
    });
  }

  // Heading hierarchy (10 points)
  const h2Tags = $('h2').length;
  const h3Tags = $('h3').length;
  if (h2Tags > 0) {
    score += 10;
    passed.push({ type: 'Heading Structure', detail: `H1(${h1Tags.length}), H2(${h2Tags}), H3(${h3Tags})` });
  } else {
    issues.push({
      severity: 'medium',
      type: 'No H2 Headings',
      detail: 'No subheadings found',
      fix: 'Add H2 headings to structure content'
    });
  }

  // Image alt text (10 points)
  const images = $('img');
  const imagesWithAlt = images.filter((i, el) => $(el).attr('alt')).length;
  const altTextPercent = images.length > 0 ? Math.round((imagesWithAlt / images.length) * 100) : 100;

  if (altTextPercent === 100 || images.length === 0) {
    score += 10;
    if (images.length > 0) {
      passed.push({ type: 'Image Alt Text', detail: `${imagesWithAlt}/${images.length} images have alt text` });
    }
  } else {
    score += Math.round(altTextPercent / 10);
    issues.push({
      severity: 'medium',
      type: 'Images Without Alt Text',
      detail: `${images.length - imagesWithAlt} of ${images.length} images missing alt text`,
      fix: 'Add descriptive alt text to all images'
    });
  }

  // Internal links (5 points)
  const internalLinks = $('a[href*="instantautotraders.com.au"]').length;
  if (internalLinks >= 3) {
    score += 5;
    passed.push({ type: 'Internal Links', detail: `${internalLinks} internal links found` });
  } else {
    issues.push({
      severity: 'low',
      type: 'Few Internal Links',
      detail: `Only ${internalLinks} internal links`,
      fix: 'Add 3-5 relevant internal links'
    });
  }

  // External links (5 points)
  const externalLinks = $('a[href^="http"]').not('[href*="instantautotraders.com.au"]').length;
  if (externalLinks >= 1) {
    score += 5;
    passed.push({ type: 'External Links', detail: `${externalLinks} external links found` });
  }

  return {
    score: Math.min(score, maxScore),
    issues,
    passed,
    metrics: {
      titleLength,
      metaDescLength: metaDesc.length,
      wordCount,
      h1Count: h1Tags.length,
      h2Count: h2Tags,
      imagesTotal: images.length,
      imagesWithAlt,
      internalLinks,
      externalLinks
    }
  };
}

function generateHTML(results, summary) {
  const issuesByType = {
    critical: results.flatMap(r => r.issues.filter(i => i.severity === 'critical')),
    medium: results.flatMap(r => r.issues.filter(i => i.severity === 'medium')),
    low: results.flatMap(r => r.issues.filter(i => i.severity === 'low'))
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - Instant Auto Traders</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { font-size: 1.2em; opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f8f9fa;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .summary-card h3 { color: #667eea; font-size: 2.5em; margin-bottom: 5px; }
    .summary-card p { color: #666; font-size: 0.9em; }
    .score-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      margin-top: 10px;
    }
    .score-excellent { background: #10b981; color: white; }
    .score-good { background: #3b82f6; color: white; }
    .score-fair { background: #f59e0b; color: white; }
    .score-poor { background: #ef4444; color: white; }
    .content { padding: 40px; }
    .section { margin-bottom: 40px; }
    .section h2 {
      color: #667eea;
      font-size: 1.8em;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    .post-card {
      background: #f8f9fa;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 10px;
      border-left: 5px solid #667eea;
    }
    .post-card h3 {
      color: #333;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .issue {
      background: white;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid #ef4444;
    }
    .issue.medium { border-left-color: #f59e0b; }
    .issue.low { border-left-color: #3b82f6; }
    .issue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .issue-type { font-weight: bold; color: #333; }
    .issue-detail { color: #666; margin-bottom: 5px; }
    .issue-fix {
      background: #f0f9ff;
      padding: 8px;
      border-radius: 5px;
      font-size: 0.9em;
      color: #0369a1;
    }
    .passed {
      background: #f0fdf4;
      padding: 10px 15px;
      margin: 5px 0;
      border-radius: 8px;
      border-left: 4px solid #10b981;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: bold;
    }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #dbeafe; color: #1e40af; }
    .cta {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 40px;
      text-align: center;
      margin-top: 40px;
    }
    .cta h2 { margin-bottom: 20px; }
    .cta-buttons {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    .cta-button {
      background: white;
      color: #059669;
      padding: 15px 30px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: bold;
      transition: transform 0.2s;
    }
    .cta-button:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 SEO Audit Report</h1>
      <p>Instant Auto Traders - ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h3>${summary.avgScore}</h3>
        <p>Average Score</p>
        <span class="score-badge ${summary.avgScore >= 80 ? 'score-excellent' : summary.avgScore >= 60 ? 'score-good' : summary.avgScore >= 40 ? 'score-fair' : 'score-poor'}">
          ${summary.avgScore >= 80 ? 'Excellent' : summary.avgScore >= 60 ? 'Good' : summary.avgScore >= 40 ? 'Fair' : 'Needs Work'}
        </span>
      </div>
      <div class="summary-card">
        <h3>${summary.totalPosts}</h3>
        <p>Posts Analyzed</p>
      </div>
      <div class="summary-card">
        <h3>${summary.totalIssues}</h3>
        <p>Total Issues</p>
      </div>
      <div class="summary-card">
        <h3>${issuesByType.critical.length}</h3>
        <p>Critical Issues</p>
      </div>
    </div>

    <div class="content">
      <div class="section">
        <h2>📊 Issues by Severity</h2>
        ${issuesByType.critical.length > 0 ? `
          <h3 style="color: #ef4444; margin: 20px 0 10px 0;">🔴 Critical (${issuesByType.critical.length})</h3>
          ${[...new Set(issuesByType.critical.map(i => i.type))].slice(0, 5).map(type => `
            <div class="issue">
              <div class="issue-header">
                <span class="issue-type">${type}</span>
                <span class="badge badge-critical">CRITICAL</span>
              </div>
              <div class="issue-detail">${issuesByType.critical.find(i => i.type === type).detail}</div>
              <div class="issue-fix">💡 ${issuesByType.critical.find(i => i.type === type).fix}</div>
            </div>
          `).join('')}
        ` : '<p style="color: #10b981;">✅ No critical issues found!</p>'}

        ${issuesByType.medium.length > 0 ? `
          <h3 style="color: #f59e0b; margin: 20px 0 10px 0;">🟡 Medium Priority (${issuesByType.medium.length})</h3>
          ${[...new Set(issuesByType.medium.map(i => i.type))].slice(0, 5).map(type => `
            <div class="issue medium">
              <div class="issue-header">
                <span class="issue-type">${type}</span>
                <span class="badge badge-medium">MEDIUM</span>
              </div>
              <div class="issue-detail">${issuesByType.medium.find(i => i.type === type).detail}</div>
              <div class="issue-fix">💡 ${issuesByType.medium.find(i => i.type === type).fix}</div>
            </div>
          `).join('')}
        ` : ''}
      </div>

      <div class="section">
        <h2>📈 Top Performing Posts</h2>
        ${results.filter(r => r.score >= 70).slice(0, 5).map(result => `
          <div class="post-card">
            <h3>
              <span>🟢</span>
              <span>${result.title}</span>
              <span class="score-badge score-good">${result.score}/100</span>
            </h3>
            ${result.passed.slice(0, 3).map(p => `
              <div class="passed">
                <span>✅</span>
                <span><strong>${p.type}:</strong> ${p.detail}</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>⚠️ Posts Needing Attention</h2>
        ${results.filter(r => r.score < 60).slice(0, 10).map(result => `
          <div class="post-card">
            <h3>
              <span>🔴</span>
              <span>${result.title}</span>
              <span class="score-badge score-fair">${result.score}/100</span>
            </h3>
            ${result.issues.slice(0, 3).map(issue => `
              <div class="issue ${issue.severity}">
                <div class="issue-header">
                  <span class="issue-type">${issue.type}</span>
                  <span class="badge badge-${issue.severity}">${issue.severity.toUpperCase()}</span>
                </div>
                <div class="issue-detail">${issue.detail}</div>
                <div class="issue-fix">💡 ${issue.fix}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="cta">
      <h2>🎯 Ready to Fix These Issues?</h2>
      <p style="margin-bottom: 20px; font-size: 1.1em;">
        Your tool can automatically optimize ${summary.totalIssues} issues across ${summary.totalPosts} posts.
      </p>
      <div class="cta-buttons">
        <a href="#" class="cta-button">🤖 Auto-Fix All Issues</a>
        <a href="#" class="cta-button">📊 Monitor Rankings</a>
        <a href="#" class="cta-button">🔍 Deep Analysis</a>
      </div>
      <p style="margin-top: 20px; opacity: 0.9;">
        💰 Potential Impact: 15-30% improvement in organic traffic
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function generateReport() {
  console.log('\n📊 Generating Comprehensive SEO Report...\n');
  console.log('This will take a few minutes...\n');

  const posts = await fetchPosts(69);
  console.log(`✅ Fetched ${posts.length} posts`);

  const results = [];
  let totalScore = 0;
  let totalIssues = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    process.stdout.write(`\rAnalyzing: ${i + 1}/${posts.length} - ${post.title.rendered.substring(0, 40)}...`);

    const html = await analyzePage(post.link);
    if (html) {
      const analysis = auditSEO(post, html);
      results.push({
        title: post.title.rendered,
        url: post.link,
        score: analysis.score,
        issues: analysis.issues,
        passed: analysis.passed,
        metrics: analysis.metrics
      });

      totalScore += analysis.score;
      totalIssues += analysis.issues.length;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n✅ Analysis complete!\n');

  const summary = {
    totalPosts: results.length,
    avgScore: Math.round(totalScore / results.length),
    totalIssues,
    timestamp: new Date().toISOString()
  };

  const html = generateHTML(results, summary);
  const reportPath = `logs/seo-audit-report-${new Date().toISOString().split('T')[0]}.html`;
  fs.writeFileSync(reportPath, html);

  // Also save JSON
  fs.writeFileSync(
    reportPath.replace('.html', '.json'),
    JSON.stringify({ summary, results }, null, 2)
  );

  console.log(`📄 HTML Report: ${reportPath}`);
  console.log(`📄 JSON Data: ${reportPath.replace('.html', '.json')}`);
  console.log(`\n🎯 Summary:`);
  console.log(`   Average Score: ${summary.avgScore}/100`);
  console.log(`   Total Issues: ${summary.totalIssues}`);
  console.log(`   Posts Analyzed: ${summary.totalPosts}`);
  console.log(`\n💡 Open the HTML file in your browser to view the full report!\n`);
}

generateReport().catch(console.error);
