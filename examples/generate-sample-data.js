#!/usr/bin/env node

/**
 * Sample Data Generator
 * Generates realistic test data for the unified keyword tracking system
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuration
const DB_PATH = process.env.DATABASE_URL?.replace('sqlite:', '') || './database/unified.db';
const NUM_DOMAINS = 5;
const NUM_PROJECTS = 3;
const NUM_KEYWORDS_PER_PROJECT = 30;

// Sample data pools
const DOMAINS = [
  'example.com',
  'myblog.com',
  'techstartup.io',
  'ecommerce-store.com',
  'consulting-firm.com'
];

const SEO_KEYWORDS = [
  // Tools
  'seo tools', 'keyword research tool', 'rank tracker', 'backlink checker',
  'site audit tool', 'competitor analysis', 'content optimizer',

  // How-to
  'how to do seo', 'how to rank higher', 'how to build backlinks',
  'how to optimize content', 'how to improve rankings',

  // Best
  'best seo software', 'best keyword tools', 'best rank tracking',
  'best seo plugins', 'best content tools',

  // Comparison
  'ahrefs vs semrush', 'moz vs semrush', 'rank tracker comparison',
  'seo tools comparison', 'keyword tools review',

  // Specific
  'technical seo', 'on-page seo', 'off-page seo', 'local seo',
  'mobile seo', 'ecommerce seo', 'wordpress seo',

  // Long-tail
  'best seo tools for small business', 'how to track keyword rankings',
  'keyword research for beginners', 'free seo audit tools',
  'seo checklist 2025', 'google ranking factors'
];

const INTENTS = ['informational', 'commercial', 'transactional', 'navigational'];
const DEVICES = ['desktop', 'mobile'];
const COUNTRIES = ['US', 'UK', 'CA', 'AU'];

// Utility functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBoolean(probability = 0.5) {
  return Math.random() < probability;
}

function calculateOpportunityScore(volume, difficulty, cpc) {
  // Higher volume = better
  // Lower difficulty = better
  // Higher CPC = better
  const volumeScore = Math.min(volume / 100, 100);
  const difficultyScore = 100 - difficulty;
  const cpcScore = Math.min(cpc * 10, 100);

  return Math.round((volumeScore * 0.4 + difficultyScore * 0.4 + cpcScore * 0.2));
}

function generatePositionHistory() {
  const history = [];
  const basePosition = randomInt(1, 100);

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const variation = randomInt(-5, 5);
    const position = Math.max(1, Math.min(100, basePosition + variation));

    history.push({
      date: date.toISOString().split('T')[0],
      position: position,
      url: i === 0 ? `https://${randomChoice(DOMAINS)}/blog/${generateSlug()}` : null
    });
  }

  return JSON.stringify(history);
}

function generateSlug() {
  return SEO_KEYWORDS[Math.floor(Math.random() * SEO_KEYWORDS.length)]
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function generateSerpFeatures() {
  const allFeatures = [
    'featured_snippet',
    'people_also_ask',
    'local_pack',
    'knowledge_panel',
    'site_links',
    'images',
    'videos',
    'top_stories',
    'related_searches'
  ];

  const numFeatures = randomInt(0, 4);
  const features = [];

  for (let i = 0; i < numFeatures; i++) {
    const feature = randomChoice(allFeatures);
    if (!features.includes(feature)) {
      features.push(feature);
    }
  }

  return JSON.stringify(features);
}

// Database operations
async function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

async function generateData() {
  console.log('🚀 Generating sample data...\n');

  const db = new sqlite3.Database(DB_PATH);

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await runQuery(db, 'DELETE FROM unified_keywords');
    await runQuery(db, 'DELETE FROM research_projects');
    await runQuery(db, 'DELETE FROM domains');
    await runQuery(db, 'DELETE FROM topics');
    console.log('✓ Cleared\n');

    // Generate domains
    console.log(`Generating ${NUM_DOMAINS} domains...`);
    const domainIds = [];
    for (let i = 0; i < NUM_DOMAINS; i++) {
      const domainId = await runQuery(db, `
        INSERT INTO domains (domain, created_at)
        VALUES (?, datetime('now'))
      `, [DOMAINS[i]]);
      domainIds.push(domainId);
      console.log(`  ✓ ${DOMAINS[i]}`);
    }
    console.log('');

    // Generate research projects
    console.log(`Generating ${NUM_PROJECTS} research projects...`);
    const projectIds = [];
    const projectNames = [
      'Q1 2025 Blog Content Strategy',
      'Product Pages Optimization',
      'Competitor Gap Analysis'
    ];

    for (let i = 0; i < NUM_PROJECTS; i++) {
      const seeds = [];
      for (let j = 0; j < 3; j++) {
        seeds.push(randomChoice(SEO_KEYWORDS));
      }

      const projectId = await runQuery(db, `
        INSERT INTO research_projects (
          name, seed_terms, geo, language, content_focus, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        projectNames[i],
        JSON.stringify(seeds),
        randomChoice(COUNTRIES),
        'en',
        randomChoice(['informational', 'commercial']),
        i === 0 ? 'in_progress' : 'completed'
      ]);

      projectIds.push(projectId);
      console.log(`  ✓ ${projectNames[i]}`);
    }
    console.log('');

    // Generate topics
    console.log('Generating topics...');
    const topicIds = [];
    const topicNames = [
      'SEO Tools Reviews',
      'Keyword Research Guides',
      'Ranking Strategies',
      'Content Optimization'
    ];

    for (let i = 0; i < topicNames.length; i++) {
      const topicId = await runQuery(db, `
        INSERT INTO topics (
          name, research_project_id, created_at
        ) VALUES (?, ?, datetime('now'))
      `, [
        topicNames[i],
        randomChoice(projectIds)
      ]);

      topicIds.push(topicId);
      console.log(`  ✓ ${topicNames[i]}`);
    }
    console.log('');

    // Generate keywords
    console.log(`Generating ${NUM_PROJECTS * NUM_KEYWORDS_PER_PROJECT} keywords...`);
    let totalKeywords = 0;

    for (let projectIdx = 0; projectIdx < NUM_PROJECTS; projectIdx++) {
      const projectId = projectIds[projectIdx];
      const domainId = domainIds[projectIdx % NUM_DOMAINS];

      console.log(`\n  Project: ${projectNames[projectIdx]}`);

      for (let i = 0; i < NUM_KEYWORDS_PER_PROJECT; i++) {
        const keyword = randomChoice(SEO_KEYWORDS);
        const searchVolume = randomInt(100, 50000);
        const cpc = randomFloat(0.5, 15.0);
        const difficulty = randomInt(10, 90);
        const opportunityScore = calculateOpportunityScore(searchVolume, difficulty, cpc);
        const isTracking = randomBoolean(0.4); // 40% are being tracked

        await runQuery(db, `
          INSERT INTO unified_keywords (
            keyword,
            lemma,
            language,
            domain_id,
            research_project_id,
            topic_id,
            device,
            country,
            position,
            position_history,
            url,
            last_tracked_at,
            search_volume,
            cpc,
            intent,
            difficulty,
            opportunity_score,
            traffic_potential,
            serp_features,
            is_tracking,
            sticky,
            tags,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          keyword,
          keyword.toLowerCase(),
          'en',
          domainId,
          projectId,
          randomChoice(topicIds),
          randomChoice(DEVICES),
          randomChoice(COUNTRIES),
          isTracking ? randomInt(1, 100) : null,
          isTracking ? generatePositionHistory() : JSON.stringify([]),
          isTracking ? `https://${DOMAINS[domainId - 1]}/blog/${generateSlug()}` : null,
          isTracking ? new Date().toISOString() : null,
          searchVolume,
          cpc,
          randomChoice(INTENTS),
          difficulty,
          opportunityScore,
          Math.round(searchVolume * (randomFloat(0.1, 0.3))),
          generateSerpFeatures(),
          isTracking,
          randomBoolean(0.1), // 10% are sticky
          JSON.stringify(randomBoolean(0.3) ? ['important'] : []),
        ]);

        totalKeywords++;
        if (totalKeywords % 10 === 0) {
          process.stdout.write('.');
        }
      }
    }

    console.log('\n\n✅ Sample data generation complete!\n');

    // Print statistics
    console.log('Statistics:');
    console.log(`  • Domains: ${NUM_DOMAINS}`);
    console.log(`  • Research Projects: ${NUM_PROJECTS}`);
    console.log(`  • Topics: ${topicIds.length}`);
    console.log(`  • Keywords: ${totalKeywords}`);

    // Get breakdown
    db.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_tracking = 1 THEN 1 ELSE 0 END) as tracking,
        SUM(CASE WHEN opportunity_score >= 70 THEN 1 ELSE 0 END) as high_opportunity
      FROM unified_keywords
    `, [], (err, row) => {
      if (!err) {
        console.log(`  • Tracking: ${row.tracking} (${Math.round(row.tracking/row.total*100)}%)`);
        console.log(`  • High Opportunity (≥70): ${row.high_opportunity} (${Math.round(row.high_opportunity/row.total*100)}%)`);
      }

      console.log('\n📊 View the data:');
      console.log('  • Dashboard: http://localhost:9000');
      console.log('  • API: http://localhost:9000/api/v2/keywords');
      console.log('  • Database: sqlite3 database/unified.db');
      console.log('\n');

      db.close();
    });

  } catch (error) {
    console.error('❌ Error generating data:', error);
    db.close();
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  generateData().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { generateData };
