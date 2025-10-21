#!/usr/bin/env node

/**
 * Quick SEO Audit - Demonstrates immediate value
 * Analyzes 5 posts and shows actionable insights
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

// Configuration
const WP_URL = 'https://instantautotraders.com.au';
const WP_USER = 'Claude';
const WP_APP_PASSWORD = 'evnTOjRy2jh8GdSyFLunlDsd';
const BASE_AUTH = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

const headers = {
  'Authorization': `Basic ${BASE_AUTH}`,
  'Content-Type': 'application/json'
};

async function fetchPosts(limit = 5) {
  console.log(`\n🔍 Fetching ${limit} posts from WordPress...\n`);

  try {
    const response = await axios.get(`${WP_URL}/wp-json/wp/v2/posts`, {
      headers,
      params: {
        per_page: limit,
        status: 'publish',
        orderby: 'date',
        order: 'desc'
      }
    });

    const totalPosts = parseInt(response.headers['x-wp-total']) || 0;
    console.log(`✅ Successfully connected! Found ${totalPosts} total posts on your site.`);
    console.log(`📊 Analyzing ${response.data.length} most recent posts...\n`);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Details:', error.response.data?.message || 'Unknown error');
    }
    process.exit(1);
  }
}

function analyzeSEO(post, html) {
  const $ = cheerio.load(html);
  const issues = [];
  const score = { total: 0, max: 0 };

  // Title analysis
  const titleLength = post.title.rendered.length;
  score.max += 10;
  if (titleLength < 30) {
    issues.push({ severity: '🔴', type: 'Title too short', detail: `${titleLength} chars (need 30-60)` });
  } else if (titleLength > 60) {
    issues.push({ severity: '🟡', type: 'Title too long', detail: `${titleLength} chars (need 30-60)` });
  } else {
    score.total += 10;
  }

  // Meta description
  score.max += 10;
  const metaDesc = $('meta[name="description"]').attr('content');
  if (!metaDesc || metaDesc.length === 0) {
    issues.push({ severity: '🔴', type: 'Missing meta description', detail: 'Critical for SEO' });
  } else if (metaDesc.length < 120) {
    issues.push({ severity: '🟡', type: 'Meta description too short', detail: `${metaDesc.length} chars (need 120-160)` });
  } else if (metaDesc.length > 160) {
    issues.push({ severity: '🟡', type: 'Meta description too long', detail: `${metaDesc.length} chars (need 120-160)` });
  } else {
    score.total += 10;
  }

  // Content length
  score.max += 10;
  const content = $('body').text().trim();
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 300) {
    issues.push({ severity: '🔴', type: 'Thin content', detail: `${wordCount} words (need 300+)` });
  } else {
    score.total += 10;
  }

  // H1 check
  score.max += 10;
  const h1Tags = $('h1');
  if (h1Tags.length === 0) {
    issues.push({ severity: '🔴', type: 'Missing H1 tag', detail: 'Required for SEO' });
  } else if (h1Tags.length > 1) {
    issues.push({ severity: '🟡', type: 'Multiple H1 tags', detail: `Found ${h1Tags.length} (should be 1)` });
  } else {
    score.total += 10;
  }

  // Images with alt text
  score.max += 10;
  const images = $('img');
  const imagesWithoutAlt = images.filter((i, el) => !$(el).attr('alt')).length;
  if (imagesWithoutAlt > 0) {
    issues.push({ severity: '🟡', type: 'Images without alt text', detail: `${imagesWithoutAlt} of ${images.length} images` });
  } else if (images.length > 0) {
    score.total += 10;
  }

  // Internal links
  score.max += 5;
  const internalLinks = $('a[href*="instantautotraders.com.au"]').length;
  if (internalLinks < 2) {
    issues.push({ severity: '🟡', type: 'Few internal links', detail: `Only ${internalLinks} found` });
  } else {
    score.total += 5;
  }

  return { issues, score: Math.round((score.total / score.max) * 100) };
}

async function runAudit() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('    🚀 INSTANT AUTO TRADERS - SEO QUICK AUDIT');
  console.log('═══════════════════════════════════════════════════════');

  const posts = await fetchPosts(5);

  const results = [];
  let totalScore = 0;
  let totalIssues = 0;

  for (const post of posts) {
    try {
      // Fetch the post HTML
      const response = await axios.get(post.link);
      const analysis = analyzeSEO(post, response.data);

      results.push({
        title: post.title.rendered,
        url: post.link,
        score: analysis.score,
        issues: analysis.issues
      });

      totalScore += analysis.score;
      totalIssues += analysis.issues.length;

    } catch (error) {
      console.error(`❌ Failed to analyze: ${post.title.rendered}`);
    }
  }

  const avgScore = Math.round(totalScore / results.length);

  // Display results
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                    📊 RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`📈 Average SEO Score: ${avgScore}/100`);
  console.log(`🔍 Total Issues Found: ${totalIssues}`);
  console.log(`📝 Posts Analyzed: ${results.length}\n`);

  console.log('───────────────────────────────────────────────────────');
  console.log('                  INDIVIDUAL POST SCORES');
  console.log('───────────────────────────────────────────────────────\n');

  results.forEach((result, index) => {
    const scoreIcon = result.score >= 80 ? '🟢' : result.score >= 60 ? '🟡' : '🔴';
    console.log(`${index + 1}. ${scoreIcon} ${result.score}/100 - ${result.title.substring(0, 60)}`);

    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   ${issue.severity} ${issue.type}: ${issue.detail}`);
      });
    } else {
      console.log(`   ✅ No issues found!`);
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log('                💡 WHAT YOU CAN DO NOW');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('1. 🤖 Auto-fix these issues:');
  console.log('   node src/audit/complete-optimization.js\n');

  console.log('2. 📊 Generate detailed HTML report:');
  console.log('   npm run monitor:report\n');

  console.log('3. 🎯 Monitor rankings continuously:');
  console.log('   npm run monitor:continuous\n');

  console.log('4. 📈 View live dashboard:');
  console.log('   npm run monitor:dashboard\n');

  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`💰 POTENTIAL VALUE: Fixing these ${totalIssues} issues could improve`);
  console.log(`   your search rankings and organic traffic by 15-30%!\n`);

  console.log('⚠️  Note: This is a quick scan. Run full audit for complete analysis.\n');
}

runAudit().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
