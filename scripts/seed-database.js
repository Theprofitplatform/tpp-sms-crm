/**
 * Database Seed Script
 *
 * Populates empty tables with realistic test data
 * for development, testing, and demonstration purposes
 */

import database from '../src/database/index.js';
const db = database.db;

console.log('🌱 Database Seeding Script\n');
console.log('='.repeat(70));

let seeded = 0;
let errors = 0;

function seed(tableName, seedFn) {
  try {
    console.log(`\n📝 Seeding: ${tableName}`);
    const count = seedFn();
    console.log(`   ✅ ${count} records inserted`);
    seeded++;
    return count;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errors++;
    return 0;
  }
}

// Get existing clients
const clients = db.prepare('SELECT * FROM clients LIMIT 5').all();
const client1 = clients[0];
const client2 = clients[1];

if (!client1) {
  console.log('\n❌ No clients found in database. Please create clients first.');
  process.exit(1);
}

console.log(`\nUsing test clients: ${client1?.name}, ${client2?.name || 'N/A'}`);

// ==================================================
// LOCAL SEO SCORES
// ==================================================
seed('local_seo_scores', () => {
  const stmt = db.prepare(`
    INSERT INTO local_seo_scores (client_id, overall_score, nap_score, schema_score, citation_score, review_score, competitive_position, audit_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  let count = 0;

  // Generate historical data for past 30 days
  for (let i = 30; i >= 0; i--) {
    const dayOffset = `-${i} days`;
    const baseScore = 65 + Math.random() * 15; // 65-80 range

    if (client1) {
      stmt.run(
        client1.id,
        Math.round(baseScore),
        Math.round(baseScore + 5 + Math.random() * 10),
        Math.round(baseScore - 5 + Math.random() * 15),
        Math.round(baseScore + Math.random() * 10),
        Math.round(baseScore - 10 + Math.random() * 20),
        Math.floor(Math.random() * 5) + 1,
        dayOffset
      );
      count++;
    }

    if (client2) {
      stmt.run(
        client2.id,
        Math.round(baseScore - 10),
        Math.round(baseScore - 5 + Math.random() * 10),
        Math.round(baseScore - 10 + Math.random() * 15),
        Math.round(baseScore - 5 + Math.random() * 10),
        Math.round(baseScore - 15 + Math.random() * 20),
        Math.floor(Math.random() * 5) + 1,
        dayOffset
      );
      count++;
    }
  }

  return count;
});

// ==================================================
// AUTO FIX ACTIONS
// ==================================================
seed('auto_fix_actions', () => {
  const stmt = db.prepare(`
    INSERT INTO auto_fix_actions (client_id, fix_type, status, description, confidence_score, auto_applied, result, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const fixTypes = ['nap_consistency', 'schema_markup', 'title_meta', 'content_optimization', 'internal_linking'];
  const statuses = ['completed', 'completed', 'completed', 'pending', 'failed'];
  let count = 0;

  for (let i = 10; i >= 0; i--) {
    const dayOffset = `-${i} days`;
    const fixType = fixTypes[Math.floor(Math.random() * fixTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    if (client1) {
      stmt.run(
        client1.id,
        fixType,
        status,
        `Auto-fix ${fixType.replace(/_/g, ' ')} for ${client1.name}`,
        75 + Math.random() * 20,
        Math.random() > 0.5 ? 1 : 0,
        status === 'completed' ? 'success' : (status === 'failed' ? 'error' : null),
        dayOffset
      );
      count++;
    }
  }

  return count;
});

// ==================================================
// CLIENT GOALS
// ==================================================
seed('client_goals', () => {
  const stmt = db.prepare(`
    INSERT INTO client_goals (client_id, goal_type, target_value, current_value, deadline, priority, status)
    VALUES (?, ?, ?, ?, date('now', '+90 days'), ?, ?)
  `);

  const goals = [
    { type: 'ranking', target: 3, current: 8 },
    { type: 'traffic', target: 10000, current: 5500 },
    { type: 'local_visibility', target: 90, current: 72 },
    { type: 'citation_score', target: 95, current: 78 },
    { type: 'review_rating', target: 4.5, current: 4.2 }
  ];

  let count = 0;

  goals.forEach(goal => {
    if (client1) {
      stmt.run(client1.id, goal.type, goal.target, goal.current, 'high', 'active');
      count++;
    }
  });

  return count;
});

// ==================================================
// COMPETITOR RANKINGS
// ==================================================
seed('competitor_rankings', () => {
  const stmt = db.prepare(`
    INSERT INTO competitor_rankings (domain_id, keyword, competitor_domain, our_position, competitor_position, check_date)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const keywords = ['seo services sydney', 'local seo', 'digital marketing sydney'];
  const competitors = ['competitor1.com', 'competitor2.com', 'competitor3.com'];
  let count = 0;

  // Get domain
  const domain = db.prepare('SELECT id FROM domains LIMIT 1').get();
  if (!domain) return 0;

  for (let i = 30; i >= 0; i--) {
    const dayOffset = `-${i} days`;

    keywords.forEach(keyword => {
      competitors.forEach(comp => {
        stmt.run(
          domain.id,
          keyword,
          comp,
          Math.floor(Math.random() * 10) + 1,
          Math.floor(Math.random() * 10) + 1,
          dayOffset
        );
        count++;
      });
    });
  }

  return count;
});

// ==================================================
// COMPETITOR ALERTS
// ==================================================
seed('competitor_alerts', () => {
  const stmt = db.prepare(`
    INSERT INTO competitor_alerts (domain_id, competitor_domain, alert_type, severity, message, triggered_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const domain = db.prepare('SELECT id FROM domains LIMIT 1').get();
  if (!domain) return 0;

  const alerts = [
    { comp: 'competitor1.com', type: 'ranking_improvement', severity: 'medium', msg: 'Competitor improved ranking for "seo services"' },
    { comp: 'competitor2.com', type: 'new_content', severity: 'low', msg: 'Competitor published new blog post' },
    { comp: 'competitor3.com', type: 'backlink_gain', severity: 'high', msg: 'Competitor gained high-authority backlink' }
  ];

  let count = 0;

  alerts.forEach(alert => {
    stmt.run(domain.id, alert.comp, alert.type, alert.severity, alert.msg, '-1 day');
    count++;
  });

  return count;
});

// ==================================================
// KEYWORD PERFORMANCE
// ==================================================
seed('keyword_performance', () => {
  const stmt = db.prepare(`
    INSERT INTO keyword_performance (domain_id, keyword, position, search_volume, clicks, impressions, ctr, check_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const domain = db.prepare('SELECT id FROM domains LIMIT 1').get();
  if (!domain) return 0;

  const keywords = [
    { kw: 'seo services sydney', vol: 1200 },
    { kw: 'local seo sydney', vol: 890 },
    { kw: 'digital marketing sydney', vol: 2100 },
    { kw: 'seo expert sydney', vol: 670 },
    { kw: 'google business profile optimization', vol: 450 }
  ];

  let count = 0;

  for (let i = 30; i >= 0; i--) {
    const dayOffset = `-${i} days`;

    keywords.forEach(k => {
      const position = 5 + Math.floor(Math.random() * 10);
      const impressions = k.vol * (Math.random() * 0.5 + 0.5);
      const ctr = (20 - position) / 100 + Math.random() * 0.05;
      const clicks = impressions * ctr;

      stmt.run(
        domain.id,
        k.kw,
        position,
        k.vol,
        Math.round(clicks),
        Math.round(impressions),
        ctr.toFixed(4),
        dayOffset
      );
      count++;
    });
  }

  return count;
});

// ==================================================
// PAGE PERFORMANCE
// ==================================================
seed('page_performance', () => {
  const stmt = db.prepare(`
    INSERT INTO page_performance (domain_id, page_url, page_title, impressions, clicks, ctr, avg_position, check_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const domain = db.prepare('SELECT id FROM domains LIMIT 1').get();
  if (!domain) return 0;

  const pages = [
    { url: '/', title: 'Home - SEO Services Sydney' },
    { url: '/services', title: 'Our SEO Services' },
    { url: '/local-seo', title: 'Local SEO Sydney' },
    { url: '/blog/seo-tips', title: 'Top 10 SEO Tips for 2025' },
    { url: '/contact', title: 'Contact Us' }
  ];

  let count = 0;

  for (let i = 7; i >= 0; i--) {
    const dayOffset = `-${i} days`;

    pages.forEach(page => {
      const impressions = 500 + Math.floor(Math.random() * 1500);
      const avgPosition = 5 + Math.random() * 10;
      const ctr = (20 - avgPosition) / 100 + Math.random() * 0.05;
      const clicks = impressions * ctr;

      stmt.run(
        domain.id,
        page.url,
        page.title,
        impressions,
        Math.round(clicks),
        ctr.toFixed(4),
        avgPosition.toFixed(1),
        dayOffset
      );
      count++;
    });
  }

  return count;
});

// ==================================================
// RECOMMENDATIONS
// ==================================================
seed('recommendations', () => {
  const stmt = db.prepare(`
    INSERT INTO recommendations (client_id, category, priority, title, description, impact_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const recommendations = [
    { cat: 'technical', pri: 'high', title: 'Improve Page Speed', desc: 'Optimize images and enable compression', impact: 85 },
    { cat: 'content', pri: 'medium', title: 'Update Old Blog Posts', desc: 'Refresh content from 2023', impact: 70 },
    { cat: 'local', pri: 'high', title: 'Complete GMB Profile', desc: 'Add missing business hours and photos', impact: 90 },
    { cat: 'backlinks', pri: 'medium', title: 'Reach Out for Backlinks', desc: 'Contact local directories', impact: 75 },
    { cat: 'schema', pri: 'high', title: 'Add FAQ Schema', desc: 'Implement FAQ markup on service pages', impact: 80 }
  ];

  let count = 0;

  recommendations.forEach(rec => {
    if (client1) {
      stmt.run(client1.id, rec.cat, rec.pri, rec.title, rec.desc, rec.impact, 'pending');
      count++;
    }
  });

  return count;
});

// ==================================================
// OPTIMIZATION HISTORY
// ==================================================
seed('optimization_history', () => {
  const stmt = db.prepare(`
    INSERT INTO optimization_history (client_id, optimization_type, description, impact, status, applied_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const optimizations = [
    { type: 'meta_tags', desc: 'Updated title tags on 5 pages', impact: 'positive' },
    { type: 'schema', desc: 'Added LocalBusiness schema', impact: 'positive' },
    { type: 'content', desc: 'Optimized homepage content', impact: 'positive' },
    { type: 'internal_links', desc: 'Added contextual internal links', impact: 'neutral' },
    { type: 'nap', desc: 'Fixed NAP inconsistencies', impact: 'positive' }
  ];

  let count = 0;

  for (let i = 20; i >= 0; i--) {
    const dayOffset = `-${i} days`;
    const opt = optimizations[Math.floor(Math.random() * optimizations.length)];

    if (client1) {
      stmt.run(client1.id, opt.type, opt.desc, opt.impact, 'completed', dayOffset);
      count++;
    }
  }

  return count;
});

// ==================================================
// ANALYTICS CACHE
// ==================================================
seed('analytics_cache', () => {
  const stmt = db.prepare(`
    INSERT INTO analytics_cache (cache_key, data, expires_at)
    VALUES (?, ?, datetime('now', '+1 hour'))
  `);

  const cacheEntries = [
    { key: 'dashboard_metrics_client1', data: { visits: 12540, bounceRate: 0.42, avgTime: 204 } },
    { key: 'rankings_summary_client1', data: { top3: 12, top10: 45, avgPosition: 8.5 } },
    { key: 'competitor_data_client1', data: { tracked: 5, alerts: 3 } }
  ];

  let count = 0;

  cacheEntries.forEach(entry => {
    stmt.run(entry.key, JSON.stringify(entry.data));
    count++;
  });

  return count;
});

// ==================================================
// WEBHOOKS
// ==================================================
seed('webhooks', () => {
  const stmt = db.prepare(`
    INSERT INTO webhooks (client_id, url, events, secret, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  if (client1) {
    stmt.run(
      client1.id,
      'https://example.com/webhook',
      JSON.stringify(['report_generated', 'ranking_change']),
      'webhook_secret_123',
      'active'
    );
    return 1;
  }

  return 0;
});

// Summary
console.log('\n' + '='.repeat(70));
console.log('\n📊 SEEDING SUMMARY\n');
console.log(`   Tables seeded: ${seeded}`);
console.log(`   Errors: ${errors}`);
console.log(`   Success rate: ${Math.round((seeded / (seeded + errors)) * 100)}%`);

if (errors === 0) {
  console.log('\n✅ Database seeding completed successfully!\n');
} else {
  console.log(`\n⚠️  Completed with ${errors} errors\n`);
}
