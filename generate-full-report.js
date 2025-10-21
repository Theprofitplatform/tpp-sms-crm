#!/usr/bin/env node

/**
 * Comprehensive SEO Report Generator
 * Creates detailed HTML report with actionable insights
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from config/env/.env
dotenv.config({ path: 'config/env/.env' });

// Support both WORDPRESS_* and WP_* variable naming conventions
const WP_URL = process.env.WORDPRESS_URL || process.env.WP_URL;
const WP_USER = process.env.WORDPRESS_USER || process.env.WP_USER;
const WP_APP_PASSWORD = (process.env.WORDPRESS_APP_PASSWORD || process.env.WP_APP_PASSWORD || '').replace(/\s+/g, '');
const SITE_NAME = process.env.WORDPRESS_SITE_NAME || process.env.SITE_NAME || 'Client';

// Validate required environment variables
if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required: WORDPRESS_URL, WORDPRESS_USER, WORDPRESS_APP_PASSWORD');
  console.error('   (or WP_URL, WP_USER, WP_APP_PASSWORD)');
  console.error('   Check config/env/.env file');
  process.exit(1);
}

const BASE_AUTH = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

// Extract domain from WP_URL for link detection
const SITE_DOMAIN = new URL(WP_URL).hostname;

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
      order: 'desc',
      _embed: true  // Include embedded media data
    }
  });

  return response.data;
}

async function getFeaturedImage(post) {
  try {
    // Check if embedded media is available
    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
      const media = post._embedded['wp:featuredmedia'][0];
      return {
        url: media.media_details?.sizes?.medium?.source_url || media.source_url,
        alt: media.alt_text || post.title.rendered
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

function getContentExcerpt(content, maxLength = 200) {
  // Remove HTML tags and get plain text
  const text = content.replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
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
  const titleText = post.title.rendered.replace(/<[^>]*>/g, '');
  const titleLength = titleText.length;
  if (titleLength >= 30 && titleLength <= 60) {
    score += 20;
    passed.push({ type: 'Title Length', detail: `${titleLength} characters - Perfect!` });
  } else if (titleLength < 30) {
    issues.push({
      severity: 'critical',
      type: 'Title Too Short',
      detail: `${titleLength} chars (need 30-60)`,
      fix: 'Add location or brand name to title',
      context: titleText,
      suggestion: titleLength < 20 ? 'Title is very short - add descriptive keywords and location' : 'Add a few more descriptive words'
    });
  } else {
    score += 10;
    issues.push({
      severity: 'medium',
      type: 'Title Too Long',
      detail: `${titleLength} chars (need 30-60, ${titleLength - 60} chars over)`,
      fix: 'Shorten title, remove unnecessary words',
      context: titleText,
      suggestion: 'Google may truncate this title in search results'
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
      fix: 'Write 120-160 character description',
      context: 'No meta description tag present',
      suggestion: 'Add a compelling description that includes your main keyword and a call-to-action'
    });
  } else {
    score += 10;
    const charDiff = metaDesc.length < 120 ? 120 - metaDesc.length : metaDesc.length - 160;
    issues.push({
      severity: 'medium',
      type: 'Meta Description Length',
      detail: `${metaDesc.length} chars (need 120-160, ${metaDesc.length < 120 ? 'add' : 'remove'} ${charDiff} chars)`,
      fix: metaDesc.length < 120 ? 'Expand description' : 'Shorten description',
      context: metaDesc.length > 100 ? metaDesc : `"${metaDesc}"`,
      suggestion: metaDesc.length < 120 ? 'Add more compelling details about your service/product' : 'Remove less important words while keeping the main message'
    });
  }

  // Content length (15 points)
  const content = $('body').text().trim();
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 300) {
    score += 15;
    passed.push({ type: 'Content Length', detail: `${wordCount} words` });
  } else {
    const wordsNeeded = 300 - wordCount;
    issues.push({
      severity: 'critical',
      type: 'Thin Content',
      detail: `Only ${wordCount} words (need 300+, add ${wordsNeeded} words)`,
      fix: 'Add more detailed, valuable content',
      context: `Current word count: ${wordCount}`,
      suggestion: wordCount < 100 ? 'Very thin content - add substantial sections with FAQs, benefits, features' : 'Add more details, examples, or FAQs to reach 300+ words'
    });
  }

  // H1 tag (15 points)
  const h1Tags = $('h1');
  const h1Texts = h1Tags.map((i, el) => $(el).text().trim()).get();
  if (h1Tags.length === 1) {
    score += 15;
    passed.push({ type: 'H1 Tag', detail: 'Single H1 found - Perfect!' });
  } else if (h1Tags.length === 0) {
    issues.push({
      severity: 'critical',
      type: 'Missing H1',
      detail: 'No H1 tag found',
      fix: 'Add one H1 tag with main keyword',
      context: 'Page has no H1 heading',
      suggestion: 'Add a single H1 that describes the main topic and includes your target keyword'
    });
  } else {
    score += 5;
    issues.push({
      severity: 'medium',
      type: 'Multiple H1 Tags',
      detail: `Found ${h1Tags.length} H1 tags (should be 1)`,
      fix: 'Convert extra H1s to H2 or H3',
      context: `H1 tags found: ${h1Texts.slice(0, 3).map((t, i) => `"${t}"`).join(', ')}${h1Tags.length > 3 ? '...' : ''}`,
      suggestion: `Keep the most important H1 (usually the title) and convert ${h1Tags.length - 1} others to H2 or H3`
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
  const internalLinks = $(`a[href*="${SITE_DOMAIN}"]`).length;
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
  const externalLinks = $('a[href^="http"]').not(`[href*="${SITE_DOMAIN}"]`).length;
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

  // Calculate bulk actions - group similar issues
  const bulkActions = {};
  results.forEach(post => {
    post.issues.forEach(issue => {
      if (!bulkActions[issue.type]) {
        bulkActions[issue.type] = {
          type: issue.type,
          severity: issue.severity,
          count: 0,
          posts: [],
          fix: issue.fix,
          estimatedTime: 0
        };
      }
      bulkActions[issue.type].count++;
      bulkActions[issue.type].posts.push({ id: post.id, title: post.title, url: post.url });
      // Estimate 2-5 minutes per issue based on severity
      bulkActions[issue.type].estimatedTime += issue.severity === 'critical' ? 5 : issue.severity === 'medium' ? 3 : 2;
    });
  });

  const sortedBulkActions = Object.values(bulkActions).sort((a, b) => b.count - a.count);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - ${SITE_NAME}</title>
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

    /* Collapsible Sections */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      padding: 10px 0;
      transition: all 0.3s;
    }
    .section-header:hover {
      opacity: 0.8;
    }
    .collapse-toggle {
      background: #667eea;
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.2em;
      transition: all 0.3s;
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
    }
    .collapse-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5);
    }
    .section-content {
      max-height: 5000px;
      overflow: hidden;
      transition: max-height 0.4s ease-out, opacity 0.3s;
      opacity: 1;
    }
    .section-content.collapsed {
      max-height: 0;
      opacity: 0;
      transition: max-height 0.3s ease-in, opacity 0.2s;
    }
    .section-badge {
      display: inline-block;
      background: #f3f4f6;
      color: #667eea;
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 0.85em;
      font-weight: bold;
      margin-left: 10px;
    }
    .wp-edit-link {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.85em;
      font-weight: 600;
      margin-top: 10px;
      transition: opacity 0.3s, transform 0.2s;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }
    .wp-edit-link:hover {
      opacity: 0.9;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
    }
    .post-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    }

    /* Search and Filter */
    .search-container {
      position: sticky;
      top: 0;
      background: white;
      padding: 20px;
      border-bottom: 2px solid #e5e7eb;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .search-controls {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: center;
    }
    .search-input {
      flex: 1;
      min-width: 250px;
      padding: 12px 20px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 1em;
      transition: all 0.3s;
    }
    .search-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .filter-select {
      padding: 12px 20px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 1em;
      background: white;
      cursor: pointer;
      transition: all 0.3s;
    }
    .filter-select:focus {
      outline: none;
      border-color: #667eea;
    }
    .filter-badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .hidden {
      display: none !important;
    }
    .score-tooltip {
      position: relative;
      cursor: help;
    }
    .score-tooltip:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      white-space: nowrap;
      font-size: 0.85em;
      z-index: 1000;
      margin-bottom: 5px;
    }
    .pagination {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 30px 0;
      flex-wrap: wrap;
    }
    .page-btn {
      padding: 10px 15px;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
    }
    .page-btn:hover {
      background: #f3f4f6;
    }
    .page-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #back-to-top {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s;
      z-index: 1000;
      font-weight: 600;
      border: none;
      font-size: 1em;
    }
    #back-to-top.show {
      opacity: 1;
      visibility: visible;
    }
    #back-to-top:hover {
      transform: translateY(-5px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }

    /* Pagination Styles */
    .paginated-hidden {
      display: none !important;
    }
    .load-more-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 15px 40px;
      border-radius: 30px;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      display: block;
      margin: 30px auto;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
    }
    .load-more-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .pagination-counter {
      text-align: center;
      color: #666;
      font-size: 0.9em;
      margin: 10px 0;
      font-weight: 600;
    }
    .loading-spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    img[data-src] {
      background: #f0f0f0;
      min-height: 80px;
    }

    /* Mobile Responsive Styles */
    @media (max-width: 768px) {
      body {
        padding: 10px;
        font-size: 14px;
      }

      .container {
        border-radius: 15px;
        padding: 0;
      }

      .header {
        padding: 20px 15px;
        border-radius: 15px 15px 0 0;
      }

      h1 {
        font-size: 24px;
      }

      .subtitle {
        font-size: 13px;
      }

      .timestamp {
        font-size: 11px;
      }

      .content {
        padding: 15px;
      }

      .summary-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .summary-card {
        padding: 15px;
      }

      .summary-value {
        font-size: 32px;
      }

      .summary-label {
        font-size: 12px;
      }

      .search-container {
        padding: 15px;
      }

      .search-container input {
        font-size: 14px;
        padding: 10px 15px;
      }

      .filters {
        flex-direction: column;
        gap: 10px;
      }

      .filter-btn {
        font-size: 12px;
        padding: 8px 15px;
      }

      .stats-row {
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
      }

      .stat-item {
        width: 100%;
      }

      .post-card {
        padding: 15px;
      }

      .post-card h3 {
        font-size: 16px;
      }

      .post-card img {
        width: 100% !important;
        height: auto !important;
        max-height: 200px;
        object-fit: cover;
      }

      .issue {
        padding: 12px;
      }

      .issue-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .issue-type {
        font-size: 13px;
      }

      .issue-detail {
        font-size: 13px;
      }

      .issue-fix {
        font-size: 12px;
      }

      .badge {
        font-size: 10px;
        padding: 3px 8px;
      }

      .score-badge {
        font-size: 14px !important;
        padding: 4px 10px;
      }

      .post-actions {
        flex-direction: column;
        gap: 8px;
      }

      .wp-edit-link {
        width: 100%;
        text-align: center;
        padding: 10px 15px;
        font-size: 13px;
      }

      .cta {
        padding: 30px 15px;
      }

      .cta h2 {
        font-size: 22px;
      }

      .cta-buttons {
        flex-direction: column;
        gap: 10px;
      }

      .cta-button {
        width: 100%;
        padding: 15px 20px;
        font-size: 14px;
      }

      #back-to-top {
        width: 45px;
        height: 45px;
        bottom: 15px;
        right: 15px;
        font-size: 18px;
      }

      .section-header h2 {
        font-size: 18px;
      }

      .section-badge {
        font-size: 11px;
        padding: 3px 8px;
      }

      .bulk-actions-section {
        padding: 15px;
      }

      .bulk-group {
        padding: 12px;
      }

      .bulk-group h4 {
        font-size: 14px;
      }

      .time-estimate {
        font-size: 11px;
      }

      .load-more-btn {
        padding: 12px 30px;
        font-size: 14px;
      }

      .pagination-counter {
        font-size: 12px;
      }

      /* Hide less important elements on mobile to save space */
      .export-buttons {
        display: none;
      }

      /* Improve touch targets */
      .collapse-toggle {
        min-width: 44px;
        min-height: 44px;
        padding: 10px;
      }

      /* Stack flex layouts vertically */
      .section-header {
        padding: 15px;
      }

      /* Adjust grid layouts */
      .recommendations-grid {
        grid-template-columns: 1fr;
      }

      /* Improve readability */
      .issue-context {
        font-size: 12px;
        padding: 8px !important;
      }

      .issue-suggestion {
        font-size: 12px;
        padding: 8px !important;
      }

      /* Make tables scrollable */
      table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
      }
    }

    /* Small mobile devices */
    @media (max-width: 480px) {
      body {
        padding: 5px;
        font-size: 13px;
      }

      .header {
        padding: 15px 10px;
      }

      h1 {
        font-size: 20px;
      }

      .content {
        padding: 10px;
      }

      .summary-card {
        padding: 12px;
      }

      .summary-value {
        font-size: 28px;
      }

      .post-card {
        padding: 12px;
      }

      .post-card h3 {
        font-size: 15px;
      }

      .issue {
        padding: 10px;
      }

      .cta {
        padding: 20px 10px;
      }

      .cta h2 {
        font-size: 18px;
      }
    }

    /* Print Styles */
    @media print {
      body {
        background: white !important;
        padding: 0 !important;
      }
      .container {
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        page-break-after: avoid !important;
      }
      .search-container,
      #back-to-top,
      .cta-buttons,
      .collapse-toggle {
        display: none !important;
      }
      .section-content {
        display: block !important;
        max-height: none !important;
      }
      .section-content.collapsed {
        max-height: none !important;
      }
      .post-card,
      .issue,
      .summary-card {
        page-break-inside: avoid !important;
      }
      .section {
        page-break-inside: avoid !important;
      }
      details {
        page-break-inside: avoid !important;
      }
      details summary {
        display: none !important;
      }
      details[open] > *:not(summary) {
        display: block !important;
      }
      a[href]:after {
        content: none !important;
      }
      .wp-edit-link,
      .cta-button {
        display: none !important;
      }
      img {
        max-width: 100% !important;
        page-break-inside: avoid !important;
      }
      .badge,
      .score-badge {
        border: 1px solid #ddd !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <script>
    function toggleSection(button) {
      const content = button.closest('.section').querySelector('.section-content');
      const isCollapsed = content.classList.contains('collapsed');

      if (isCollapsed) {
        content.classList.remove('collapsed');
        button.textContent = '▼';
      } else {
        content.classList.add('collapsed');
        button.textContent = '▶';
      }
    }

    // CSV Export functionality
    function exportToCSV() {
      const reportData = ${JSON.stringify(results)};

      // CSV header
      let csv = 'Post Title,URL,Score,Issues Count,Issue Types,Severity Levels,Edit Link\\n';

      // Add each post's data
      reportData.forEach(post => {
        const title = '"' + (post.title || '').replace(/"/g, '""') + '"';
        const url = post.url || '';
        const score = post.score || 0;
        const issuesCount = post.issues.length;

        // Collect issue types and severities
        const issueTypes = post.issues.map(i => i.type).join('; ');
        const severities = [...new Set(post.issues.map(i => i.severity))].join(', ');
        const editLink = '${WP_URL}/wp-admin/post.php?post=' + post.id + '&action=edit';

        csv += title + ',' + url + ',' + score + ',' + issuesCount + ',"' + issueTypes + '","' + severities + '",' + editLink + '\\n';
      });

      // Create download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const filename = 'seo-audit-report-${new Date().toISOString().split('T')[0]}.csv';

      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
      } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Show success message
      alert('✅ CSV exported successfully!\\n\\nFile: ' + filename + '\\nRows: ' + reportData.length);
    }

    // Pagination functionality
    function loadMore(sectionId, increment = 10) {
      const section = document.getElementById(sectionId);
      if (!section) return;

      const hiddenCards = section.querySelectorAll('.post-card.paginated-hidden');
      let shown = 0;

      hiddenCards.forEach(card => {
        if (shown < increment) {
          card.classList.remove('paginated-hidden');
          shown++;
        }
      });

      // Hide "Load More" button if no more cards
      const remaining = section.querySelectorAll('.post-card.paginated-hidden').length;
      const loadMoreBtn = section.querySelector('.load-more-btn');
      if (loadMoreBtn && remaining === 0) {
        loadMoreBtn.style.display = 'none';
      }

      // Update counter
      const counter = section.querySelector('.pagination-counter');
      if (counter) {
        const total = section.querySelectorAll('.post-card').length;
        const visible = section.querySelectorAll('.post-card:not(.paginated-hidden)').length;
        counter.textContent = \`Showing \${visible} of \${total} posts\`;
      }
    }

    // Lazy load images
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      }, { rootMargin: '50px' });

      // Observe all lazy images after DOM load
      window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
      });
    }

    // Search and filter functionality
    function filterPosts() {
      const searchTerm = document.getElementById('search-input').value.toLowerCase();
      const scoreFilter = document.getElementById('score-filter').value;
      const issueFilter = document.getElementById('issue-filter').value;

      const postCards = document.querySelectorAll('.post-card');
      let visibleCount = 0;

      postCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const scoreText = card.querySelector('.score-badge')?.textContent || '';
        const score = parseInt(scoreText.match(/\\d+/)?.[0] || '0');
        const issuesText = card.textContent.toLowerCase();

        // Check search term
        const matchesSearch = !searchTerm || title.includes(searchTerm);

        // Check score filter
        let matchesScore = true;
        if (scoreFilter === 'excellent') matchesScore = score >= 90;
        else if (scoreFilter === 'good') matchesScore = score >= 70 && score < 90;
        else if (scoreFilter === 'fair') matchesScore = score >= 50 && score < 70;
        else if (scoreFilter === 'poor') matchesScore = score < 50;

        // Check issue filter
        let matchesIssue = true;
        if (issueFilter !== 'all') {
          matchesIssue = issuesText.includes(issueFilter.toLowerCase());
        }

        // Show/hide card
        if (matchesSearch && matchesScore && matchesIssue) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      // Update result count
      const resultCount = document.getElementById('result-count');
      if (resultCount) {
        resultCount.textContent = visibleCount + ' of ' + postCards.length + ' posts';
      }
    }

    // Collapse all sections by default except the first one
    window.addEventListener('DOMContentLoaded', function() {
      const sections = document.querySelectorAll('.section');
      sections.forEach((section, index) => {
        if (index > 0) { // Keep first section open
          const content = section.querySelector('.section-content');
          const button = section.querySelector('.collapse-toggle');
          if (content && button) {
            content.classList.add('collapsed');
            button.textContent = '▶';
          }
        }
      });

      // Add event listeners for search/filter
      const searchInput = document.getElementById('search-input');
      const scoreFilter = document.getElementById('score-filter');
      const issueFilter = document.getElementById('issue-filter');

      if (searchInput) searchInput.addEventListener('input', filterPosts);
      if (scoreFilter) scoreFilter.addEventListener('change', filterPosts);
      if (issueFilter) issueFilter.addEventListener('change', filterPosts);

      // Back to top button
      const backToTop = document.getElementById('back-to-top');
      window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
          backToTop.classList.add('show');
        } else {
          backToTop.classList.remove('show');
        }
      });

      backToTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  </script>
  <button id="back-to-top">↑ Top</button>
  <div class="container">
    <div class="header">
      <h1>🚀 SEO Audit Report</h1>
      <p>${SITE_NAME} - ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="summary">
      <div class="summary-card score-tooltip" data-tooltip="Score = Title(20) + Meta(20) + Content(20) + Headers(15) + Images(15) + Links(10)">
        <h3>${summary.avgScore}</h3>
        <p>Average Score</p>
        <span class="score-badge ${summary.avgScore >= 80 ? 'score-excellent' : summary.avgScore >= 60 ? 'score-good' : summary.avgScore >= 40 ? 'score-fair' : 'score-poor'}">
          ${summary.avgScore >= 80 ? 'Excellent' : summary.avgScore >= 60 ? 'Good' : summary.avgScore >= 40 ? 'Fair' : 'Needs Work'}
        </span>
        <p style="font-size: 0.75em; color: #999; margin-top: 10px;">💡 Hover for breakdown</p>
      </div>
      <div class="summary-card">
        <h3>${summary.totalPosts}</h3>
        <p>Posts Analyzed</p>
        <p style="font-size: 0.8em; color: #666; margin-top: 10px;">
          ${results.filter(r => r.score >= 90).length} excellent,
          ${results.filter(r => r.score >= 70 && r.score < 90).length} good
        </p>
      </div>
      <div class="summary-card">
        <h3>${summary.totalIssues}</h3>
        <p>Total Issues</p>
        <p style="font-size: 0.8em; color: #666; margin-top: 10px;">
          ${issuesByType.medium.length} medium,
          ${issuesByType.low.length} low
        </p>
      </div>
      <div class="summary-card">
        <h3>${issuesByType.critical.length}</h3>
        <p>Critical Issues</p>
        <p style="font-size: 0.8em; color: ${issuesByType.critical.length > 0 ? '#ef4444' : '#10b981'}; margin-top: 10px; font-weight: 600;">
          ${issuesByType.critical.length > 0 ? '⚠️ Fix immediately!' : '✅ All clear!'}
        </p>
      </div>
    </div>

    <div class="search-container">
      <div class="search-controls">
        <input
          type="text"
          id="search-input"
          class="search-input"
          placeholder="🔍 Search posts by title..."
        />
        <select id="score-filter" class="filter-select">
          <option value="all">All Scores</option>
          <option value="excellent">90-100 (Excellent)</option>
          <option value="good">70-89 (Good)</option>
          <option value="fair">50-69 (Fair)</option>
          <option value="poor">0-49 (Poor)</option>
        </select>
        <select id="issue-filter" class="filter-select">
          <option value="all">All Issue Types</option>
          <option value="title">Title Issues</option>
          <option value="meta">Meta Description</option>
          <option value="h1">H1 Tags</option>
          <option value="image">Images</option>
          <option value="content">Content</option>
        </select>
        <span class="filter-badge" id="result-count">All posts</span>
      </div>
    </div>

    <div class="content">
      ${sortedBulkActions.length > 0 ? `
      <div class="section">
        <div class="section-header" onclick="toggleSection(this.querySelector('.collapse-toggle'))">
          <h2>⚡ Bulk Action Recommendations<span class="section-badge">${sortedBulkActions.length} action types</span></h2>
          <button class="collapse-toggle" onclick="event.stopPropagation(); toggleSection(this)">▼</button>
        </div>
        <div class="section-content">
          <p style="margin-bottom: 20px; color: #666; font-size: 0.95em;">
            💡 These are the most common issues across your posts. Fix them in bulk to maximize impact!
          </p>
          ${sortedBulkActions.slice(0, 10).map((action, idx) => {
            const severityColor = action.severity === 'critical' ? '#ef4444' : action.severity === 'medium' ? '#f59e0b' : '#3b82f6';
            const severityIcon = action.severity === 'critical' ? '🔴' : action.severity === 'medium' ? '🟡' : '🔵';
            const priority = idx < 3 ? '🔥 HIGH PRIORITY' : idx < 7 ? '⚡ MEDIUM' : '📋 LOW';

            return `
            <div class="bulk-action-card" style="
              background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
              border-left: 4px solid ${severityColor};
              padding: 20px;
              margin-bottom: 15px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div style="flex: 1;">
                  <h3 style="color: ${severityColor}; margin-bottom: 8px; font-size: 1.1em;">
                    ${severityIcon} ${action.type}
                  </h3>
                  <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                    <span class="badge" style="background: ${severityColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em;">
                      ${action.severity.toUpperCase()}
                    </span>
                    <span class="badge" style="background: #667eea; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em;">
                      ${action.count} posts affected
                    </span>
                    <span class="badge" style="background: #10b981; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em;">
                      ~${action.estimatedTime} min to fix all
                    </span>
                    <span class="badge" style="background: #f59e0b; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em;">
                      ${priority}
                    </span>
                  </div>
                  <div style="background: #fff; padding: 12px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e5e7eb;">
                    <strong style="color: #667eea;">💡 Recommended Fix:</strong> ${action.fix}
                  </div>
                </div>
              </div>

              <details style="margin-top: 10px;">
                <summary style="cursor: pointer; color: #667eea; font-weight: 600; padding: 8px; background: #f3f4f6; border-radius: 6px;">
                  📋 View all ${action.count} affected posts
                </summary>
                <div style="padding: 15px; margin-top: 10px; background: #f9fafb; border-radius: 6px; max-height: 300px; overflow-y: auto;">
                  ${action.posts.slice(0, 30).map((post, postIdx) => `
                    <div style="padding: 10px; margin-bottom: 8px; background: white; border-radius: 4px; border-left: 3px solid ${severityColor};">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                          <strong>${postIdx + 1}.</strong> ${post.title}
                        </div>
                        <a href="${WP_URL}/wp-admin/post.php?post=${post.id}&action=edit"
                           target="_blank"
                           style="background: #667eea; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 0.85em; white-space: nowrap; margin-left: 10px;">
                          ✏️ Edit
                        </a>
                      </div>
                    </div>
                  `).join('')}
                  ${action.posts.length > 30 ? `
                    <p style="margin-top: 10px; color: #666; font-style: italic;">
                      + ${action.posts.length - 30} more posts...
                    </p>
                  ` : ''}
                </div>
              </details>

              <div style="margin-top: 15px; padding: 12px; background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%); border-radius: 6px;">
                <strong style="color: #667eea;">⚡ Quick Action:</strong>
                <span style="color: #666;"> Fix top ${Math.min(5, action.count)} posts first for quick wins (estimated ${Math.min(5, action.count) * (action.severity === 'critical' ? 5 : action.severity === 'medium' ? 3 : 2)} minutes)</span>
              </div>
            </div>
            `;
          }).join('')}

          ${sortedBulkActions.length > 10 ? `
            <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: center; color: #666;">
              <p>+ ${sortedBulkActions.length - 10} more issue types not shown</p>
              <p style="font-size: 0.9em; margin-top: 5px;">Focus on the high-priority items above first</p>
            </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-header" onclick="toggleSection(this.querySelector('.collapse-toggle'))">
          <h2>📊 Issues by Type<span class="section-badge">${issuesByType.critical.length + issuesByType.medium.length + issuesByType.low.length} total</span></h2>
          <button class="collapse-toggle" onclick="event.stopPropagation(); toggleSection(this)">▼</button>
        </div>
        <div class="section-content">
        ${issuesByType.critical.length > 0 ? `
          <h3 style="color: #ef4444; margin: 20px 0 10px 0;">🔴 Critical Issues (${issuesByType.critical.length})</h3>
          ${[...new Set(issuesByType.critical.map(i => i.type))].map(type => {
            const typeIssues = issuesByType.critical.filter(i => i.type === type);
            return `
            <div class="issue" style="margin-bottom: 20px;">
              <div class="issue-header">
                <span class="issue-type">${type}</span>
                <span class="badge badge-critical">CRITICAL × ${typeIssues.length}</span>
              </div>
              <div class="issue-detail">${typeIssues[0].detail}</div>
              <div class="issue-fix">💡 ${typeIssues[0].fix}</div>
              ${typeIssues.length > 1 ? `
                <details style="margin-top: 10px;">
                  <summary style="cursor: pointer; color: #667eea; font-weight: 600;">
                    📋 View all ${typeIssues.length} occurrences
                  </summary>
                  <div style="padding: 10px; margin-top: 10px; background: #f9fafb; border-radius: 5px;">
                    ${typeIssues.slice(0, 20).map((issue, idx) => `
                      <div style="padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                        ${idx + 1}. ${issue.detail}
                      </div>
                    `).join('')}
                    ${typeIssues.length > 20 ? `<p style="margin-top: 10px; color: #666;">+ ${typeIssues.length - 20} more...</p>` : ''}
                  </div>
                </details>
              ` : ''}
            </div>
            `;
          }).join('')}
        ` : '<p style="color: #10b981;">✅ No critical issues found!</p>'}

        ${issuesByType.medium.length > 0 ? `
          <h3 style="color: #f59e0b; margin: 20px 0 10px 0;">🟡 Medium Priority Issues (${issuesByType.medium.length})</h3>
          ${[...new Set(issuesByType.medium.map(i => i.type))].map(type => {
            const typeIssues = issuesByType.medium.filter(i => i.type === type);
            return `
            <div class="issue medium" style="margin-bottom: 20px;">
              <div class="issue-header">
                <span class="issue-type">${type}</span>
                <span class="badge badge-medium">MEDIUM × ${typeIssues.length}</span>
              </div>
              <div class="issue-detail">${typeIssues[0].detail}</div>
              <div class="issue-fix">💡 ${typeIssues[0].fix}</div>
              ${typeIssues.length > 1 ? `
                <details style="margin-top: 10px;">
                  <summary style="cursor: pointer; color: #667eea; font-weight: 600;">
                    📋 View all ${typeIssues.length} occurrences
                  </summary>
                  <div style="padding: 10px; margin-top: 10px; background: #f9fafb; border-radius: 5px;">
                    ${typeIssues.slice(0, 20).map((issue, idx) => `
                      <div style="padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                        ${idx + 1}. ${issue.detail}
                      </div>
                    `).join('')}
                    ${typeIssues.length > 20 ? `<p style="margin-top: 10px; color: #666;">+ ${typeIssues.length - 20} more...</p>` : ''}
                  </div>
                </details>
              ` : ''}
            </div>
            `;
          }).join('')}
        ` : ''}

        ${issuesByType.low.length > 0 ? `
          <h3 style="color: #3b82f6; margin: 20px 0 10px 0;">🔵 Low Priority Issues (${issuesByType.low.length})</h3>
          ${[...new Set(issuesByType.low.map(i => i.type))].map(type => {
            const typeIssues = issuesByType.low.filter(i => i.type === type);
            return `
            <div class="issue low" style="margin-bottom: 20px;">
              <div class="issue-header">
                <span class="issue-type">${type}</span>
                <span class="badge badge-low">LOW × ${typeIssues.length}</span>
              </div>
              <div class="issue-detail">${typeIssues[0].detail}</div>
              <div class="issue-fix">💡 ${typeIssues[0].fix}</div>
              ${typeIssues.length > 1 ? `
                <details style="margin-top: 10px;">
                  <summary style="cursor: pointer; color: #667eea; font-weight: 600;">
                    📋 View all ${typeIssues.length} occurrences
                  </summary>
                  <div style="padding: 10px; margin-top: 10px; background: #f9fafb; border-radius: 5px;">
                    ${typeIssues.slice(0, 20).map((issue, idx) => `
                      <div style="padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                        ${idx + 1}. ${issue.detail}
                      </div>
                    `).join('')}
                    ${typeIssues.length > 20 ? `<p style="margin-top: 10px; color: #666;">+ ${typeIssues.length - 20} more...</p>` : ''}
                  </div>
                </details>
              ` : ''}
            </div>
            `;
          }).join('')}
        ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-header" onclick="toggleSection(this.querySelector('.collapse-toggle'))">
          <h2>📝 Issues by Post<span class="section-badge">${results.filter(r => r.issues.length > 0).length} posts with issues</span></h2>
          <button class="collapse-toggle" onclick="event.stopPropagation(); toggleSection(this)">▼</button>
        </div>
        <div class="section-content" id="issues-by-post-section">
        ${results.filter(r => r.issues.length > 0).slice(0, 15).map((result, index) => {
          const scoreClass = result.score >= 85 ? 'good' : result.score >= 70 ? 'fair' : 'poor';
          const paginatedClass = index >= 10 ? ' paginated-hidden' : '';
          const imgAttr = result.featuredImage ? (index >= 10 ? 'data-src' : 'src') : '';
          return `
          <div class="post-card${paginatedClass}" style="margin-bottom: 25px;">
            ${result.featuredImage ? `
              <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                <img ${imgAttr}="${result.featuredImage.url}" alt="${result.featuredImage.alt}"
                     style="width: 120px; height: 80px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                <div style="flex: 1; min-width: 250px;">
                  <h3 style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin: 0 0 10px 0;">
                    <span style="flex: 1; min-width: 200px;">${result.title}</span>
                    <span class="score-badge score-${scoreClass}">${result.score}/100</span>
                  </h3>
                  ${result.excerpt ? `
                    <p style="color: #6b7280; font-size: 0.9em; line-height: 1.5; margin: 0;">
                      ${result.excerpt}
                    </p>
                  ` : ''}
                </div>
              </div>
            ` : `
              <h3 style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <span style="flex: 1; min-width: 200px;">${result.title}</span>
                <span class="score-badge score-${scoreClass}">${result.score}/100</span>
              </h3>
              ${result.excerpt ? `
                <p style="color: #6b7280; font-size: 0.9em; line-height: 1.5; margin: 10px 0;">
                  ${result.excerpt}
                </p>
              ` : ''}
            `}
            <div style="color: #666; font-size: 0.9em; margin: 10px 0;">
              <strong>${result.issues.length} issue${result.issues.length !== 1 ? 's' : ''}</strong> found
            </div>
            ${result.issues.map(issue => `
              <div class="issue ${issue.severity}" style="margin: 10px 0;">
                <div class="issue-header">
                  <span class="issue-type">${issue.type}</span>
                  <span class="badge badge-${issue.severity}">${issue.severity.toUpperCase()}</span>
                </div>
                <div class="issue-detail">${issue.detail}</div>
                ${issue.context ? `
                  <div class="issue-context" style="background: #f9fafb; padding: 10px; margin: 8px 0; border-radius: 4px; border-left: 3px solid #e5e7eb; font-size: 0.9em;">
                    <strong style="color: #6b7280;">Current:</strong> ${issue.context.length > 150 ? issue.context.substring(0, 150) + '...' : issue.context}
                  </div>
                ` : ''}
                <div class="issue-fix">💡 ${issue.fix}</div>
                ${issue.suggestion ? `
                  <div class="issue-suggestion" style="background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%); padding: 10px; margin-top: 8px; border-radius: 4px; font-size: 0.9em; color: #4b5563;">
                    <strong style="color: #667eea;">💬 Tip:</strong> ${issue.suggestion}
                  </div>
                ` : ''}
              </div>
            `).join('')}
            <div class="post-actions">
              <a href="${WP_URL}/wp-admin/post.php?post=${result.id}&action=edit" target="_blank" class="wp-edit-link">
                ✏️ Edit in WordPress
              </a>
              <a href="${result.url}" target="_blank" class="wp-edit-link" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                🔍 View Post
              </a>
            </div>
          </div>
          `;
        }).join('')}
        ${results.filter(r => r.issues.length > 0).length > 10 ? `
          <div class="pagination-counter">Showing 10 of ${results.filter(r => r.issues.length > 0).length} posts</div>
          <button class="load-more-btn" onclick="loadMore('issues-by-post-section', 10)">
            📄 Load More Posts (${results.filter(r => r.issues.length > 0).length - 10} remaining)
          </button>
        ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-header" onclick="toggleSection(this.querySelector('.collapse-toggle'))">
          <h2>📈 Top Performing Posts<span class="section-badge">${results.filter(r => r.score >= 90).length} posts</span></h2>
          <button class="collapse-toggle" onclick="event.stopPropagation(); toggleSection(this)">▼</button>
        </div>
        <div class="section-content">
        ${results.filter(r => r.score >= 90).slice(0, 15).map(result => `
          <div class="post-card">
            ${result.featuredImage ? `
              <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                <img src="${result.featuredImage.url}" alt="${result.featuredImage.alt}"
                     style="width: 120px; height: 80px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                <div style="flex: 1; min-width: 250px;">
                  <h3 style="margin: 0 0 10px 0;">
                    <span>🟢</span>
                    <span>${result.title}</span>
                    <span class="score-badge score-good">${result.score}/100</span>
                  </h3>
                  ${result.excerpt ? `
                    <p style="color: #6b7280; font-size: 0.9em; line-height: 1.5; margin: 0 0 10px 0;">
                      ${result.excerpt}
                    </p>
                  ` : ''}
                </div>
              </div>
            ` : `
              <h3>
                <span>🟢</span>
                <span>${result.title}</span>
                <span class="score-badge score-good">${result.score}/100</span>
              </h3>
              ${result.excerpt ? `
                <p style="color: #6b7280; font-size: 0.9em; line-height: 1.5; margin: 10px 0;">
                  ${result.excerpt}
                </p>
              ` : ''}
            `}
            ${result.passed.slice(0, 3).map(p => `
              <div class="passed">
                <span>✅</span>
                <span><strong>${p.type}:</strong> ${p.detail}</span>
              </div>
            `).join('')}
            <div class="post-actions">
              <a href="${WP_URL}/wp-admin/post.php?post=${result.id}&action=edit" target="_blank" class="wp-edit-link">
                ✏️ Edit in WordPress
              </a>
              <a href="${result.url}" target="_blank" class="wp-edit-link" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                🔍 View Post
              </a>
            </div>
          </div>
        `).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-header" onclick="toggleSection(this.querySelector('.collapse-toggle'))">
          <h2>⚠️ Posts Needing Attention<span class="section-badge">${results.filter(r => r.score < 85).length} posts</span></h2>
          <button class="collapse-toggle" onclick="event.stopPropagation(); toggleSection(this)">▼</button>
        </div>
        <div class="section-content" id="posts-needing-attention-section">
        ${results.filter(r => r.score < 85).slice(0, 15).map((result, index) => {
          const paginatedClass = index >= 10 ? ' paginated-hidden' : '';
          const imgAttr = result.featuredImage ? (index >= 10 ? 'data-src' : 'src') : '';
          return `
          <div class="post-card${paginatedClass}">
            ${result.featuredImage ? `
              <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                <img ${imgAttr}="${result.featuredImage.url}" alt="${result.featuredImage.alt}"
                     style="width: 120px; height: 80px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                <div style="flex: 1; min-width: 250px;">
                  <h3 style="margin: 0 0 10px 0;">
                    <span>🔴</span>
                    <span>${result.title}</span>
                    <span class="score-badge score-fair">${result.score}/100</span>
                  </h3>
                  ${result.excerpt ? `
                    <p style="color: #6b7280; font-size: 0.9em; line-height: 1.5; margin: 0;">
                      ${result.excerpt}
                    </p>
                  ` : ''}
                </div>
              </div>
            ` : `
              <h3>
                <span>🔴</span>
                <span>${result.title}</span>
                <span class="score-badge score-fair">${result.score}/100</span>
              </h3>
              ${result.excerpt ? `
                <p style="color: #6b7280; font-size: 0.9em; line-height: 1.5; margin: 10px 0;">
                  ${result.excerpt}
                </p>
              ` : ''}
            `}
            ${result.issues.slice(0, 3).map(issue => `
              <div class="issue ${issue.severity}">
                <div class="issue-header">
                  <span class="issue-type">${issue.type}</span>
                  <span class="badge badge-${issue.severity}">${issue.severity.toUpperCase()}</span>
                </div>
                <div class="issue-detail">${issue.detail}</div>
                ${issue.context ? `
                  <div class="issue-context" style="background: #f9fafb; padding: 10px; margin: 8px 0; border-radius: 4px; border-left: 3px solid #e5e7eb; font-size: 0.9em;">
                    <strong style="color: #6b7280;">Current:</strong> ${issue.context.length > 150 ? issue.context.substring(0, 150) + '...' : issue.context}
                  </div>
                ` : ''}
                <div class="issue-fix">💡 ${issue.fix}</div>
                ${issue.suggestion ? `
                  <div class="issue-suggestion" style="background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%); padding: 10px; margin-top: 8px; border-radius: 4px; font-size: 0.9em; color: #4b5563;">
                    <strong style="color: #667eea;">💬 Tip:</strong> ${issue.suggestion}
                  </div>
                ` : ''}
              </div>
            `).join('')}
            <div class="post-actions">
              <a href="${WP_URL}/wp-admin/post.php?post=${result.id}&action=edit" target="_blank" class="wp-edit-link">
                ✏️ Edit in WordPress
              </a>
              <a href="${result.url}" target="_blank" class="wp-edit-link" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                🔍 View Post
              </a>
            </div>
          </div>
          `;
        }).join('')}
        ${results.filter(r => r.score < 85).length > 10 ? `
          <div class="pagination-counter">Showing 10 of ${results.filter(r => r.score < 85).length} posts</div>
          <button class="load-more-btn" onclick="loadMore('posts-needing-attention-section', 10)">
            📄 Load More Posts (${results.filter(r => r.score < 85).length - 10} remaining)
          </button>
        ` : ''}
        </div>
      </div>
    </div>

    <div class="cta">
      <h2>🎯 Next Steps</h2>
      <p style="margin-bottom: 20px; font-size: 1.1em;">
        ${summary.totalIssues} issues found across ${summary.totalPosts} posts. Use the sections above to review and fix each issue.
      </p>
      <div class="cta-buttons">
        <a href="/" class="cta-button">🏠 Back to Dashboard</a>
        <a href="${WP_URL}/wp-admin" target="_blank" class="cta-button">🔧 WordPress Admin</a>
        <button onclick="exportToCSV()" class="cta-button" style="border: none; cursor: pointer;">📊 Export to CSV</button>
        <a href="javascript:window.print()" class="cta-button">🖨️ Print Report</a>
      </div>
      <p style="margin-top: 20px; opacity: 0.9;">
        💡 Focus on critical and medium issues first for maximum impact
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function generateReport() {
  try {
    console.log('\n📊 Generating Comprehensive SEO Report...\n');
    console.log('This will take a few minutes...\n');

    // Validate WordPress configuration
    if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
      throw new Error('Missing WordPress configuration. Please check your .env file.');
    }

    const posts = await fetchPosts(69);

    if (!posts || posts.length === 0) {
      throw new Error('No posts found. Please check WordPress connection and credentials.');
    }

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
      const featuredImage = await getFeaturedImage(post);
      const excerpt = post.excerpt?.rendered
        ? getContentExcerpt(post.excerpt.rendered, 150)
        : getContentExcerpt(post.content?.rendered || '', 150);

      results.push({
        id: post.id,
        title: post.title.rendered,
        url: post.link,
        score: analysis.score,
        issues: analysis.issues,
        passed: analysis.passed,
        metrics: analysis.metrics,
        featuredImage,
        excerpt
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

    // Ensure logs directory exists
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }

    const html = generateHTML(results, summary);
    const reportPath = `logs/seo-audit-report-${new Date().toISOString().split('T')[0]}.html`;

    try {
      fs.writeFileSync(reportPath, html);
    } catch (error) {
      throw new Error(`Failed to write HTML report: ${error.message}`);
    }

    // Also save JSON
    try {
      fs.writeFileSync(
        reportPath.replace('.html', '.json'),
        JSON.stringify({ summary, results }, null, 2)
      );
    } catch (error) {
      console.warn(`⚠️  Warning: Failed to save JSON data: ${error.message}`);
    }

    console.log(`\n✅ Report generated successfully!\n`);
    console.log(`📄 HTML Report: ${reportPath}`);
    console.log(`📄 JSON Data: ${reportPath.replace('.html', '.json')}`);
    console.log(`\n🎯 Summary:`);
    console.log(`   Average Score: ${summary.avgScore}/100`);
    console.log(`   Total Issues: ${summary.totalIssues}`);
    console.log(`   Posts Analyzed: ${summary.totalPosts}`);
    console.log(`\n💡 Open the HTML file in your browser to view the full report!\n`);

    return { success: true, reportPath, summary };

  } catch (error) {
    console.error(`\n❌ Error generating report: ${error.message}\n`);

    // Provide helpful troubleshooting tips
    if (error.message.includes('WordPress configuration')) {
      console.log('💡 Troubleshooting:');
      console.log('   1. Check that config/env/.env file exists');
      console.log('   2. Verify WORDPRESS_URL, WORDPRESS_USER, and WORDPRESS_APP_PASSWORD are set');
      console.log('   3. Make sure WordPress credentials are correct\n');
    } else if (error.message.includes('No posts found')) {
      console.log('💡 Troubleshooting:');
      console.log('   1. Verify WordPress site is accessible');
      console.log('   2. Check WordPress credentials are correct');
      console.log('   3. Ensure the site has published posts');
      console.log('   4. Test connection: curl ' + WP_URL + '/wp-json/wp/v2/posts\n');
    } else if (error.message.includes('write')) {
      console.log('💡 Troubleshooting:');
      console.log('   1. Check that you have write permissions for the logs directory');
      console.log('   2. Ensure there is enough disk space');
      console.log('   3. Try running with sudo (if on Linux/Mac)\n');
    }

    process.exit(1);
  }
}

generateReport().catch(console.error);
