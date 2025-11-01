/**
 * Database Seed Script v2
 * Using correct column names from actual schema
 */

import database from '../src/database/index.js';
const db = database.db;

console.log('🌱 Database Seeding Script v2\n');
console.log('='.repeat(70));

let seeded = 0;
let totalRecords = 0;

function seed(tableName, seedFn) {
  try {
    console.log(`\n📝 ${tableName}`);
    const count = seedFn();
    console.log(`   ✅ ${count} records inserted`);
    seeded++;
    totalRecords += count;
    return count;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return 0;
  }
}

// Get existing clients
const clients = db.prepare('SELECT * FROM clients LIMIT 3').all();
if (clients.length === 0) {
  console.log('\n❌ No clients found. Please create clients first.');
  process.exit(1);
}

console.log(`\n✅ Using ${clients.length} test clients`);

// ==================================================
// 1. LOCAL SEO SCORES
// ==================================================
seed('local_seo_scores', () => {
  const stmt = db.prepare(`
    INSERT INTO local_seo_scores (client_id, date, nap_score, has_schema, directories_submitted, reviews_count, issues_found, warnings_found)
    VALUES (?, date('now', ?), ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (let i = 30; i >= 0; i--) {
    clients.forEach(client => {
      stmt.run(
        client.id,
        `-${i} days`,
        70 + Math.floor(Math.random() * 25),
        Math.random() > 0.3 ? 1 : 0,
        10 + Math.floor(Math.random() * 15),
        5 + Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 5),
        Math.floor(Math.random() * 8)
      );
      count++;
    });
  }
  return count;
});

// ==================================================
// 2. AUTO FIX ACTIONS
// ==================================================
seed('auto_fix_actions', () => {
  const stmt = db.prepare(`
    INSERT INTO auto_fix_actions (client_id, fix_type, target, action_taken, before_state, after_state, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const fixTypes = ['nap_fix', 'schema_markup', 'title_optimization', 'meta_description', 'internal_linking'];
  const targets = ['homepage', 'contact-page', 'services-page', 'about-page'];
  let count = 0;

  clients.forEach(client => {
    for (let i = 0; i < 10; i++) {
      const fixType = fixTypes[Math.floor(Math.random() * fixTypes.length)];
      const target = targets[Math.floor(Math.random() * targets.length)];
      stmt.run(
        client.id,
        fixType,
        target,
        `Applied ${fixType} fix`,
        'old_value',
        'new_value',
        Math.random() > 0.1 ? 'completed' : 'failed'
      );
      count++;
    }
  });
  return count;
});

// ==================================================
// 3. CLIENT GOALS
// ==================================================
seed('client_goals', () => {
  const stmt = db.prepare(`
    INSERT INTO client_goals (client_id, type, metric, target_value, current_value, deadline, status)
    VALUES (?, ?, ?, ?, ?, date('now', '+90 days'), ?)
  `);

  const goals = [
    { type: 'ranking', metric: 'avg_position', target: 3, current: 8.5 },
    { type: 'traffic', metric: 'monthly_visitors', target: 10000, current: 5500 },
    { type: 'local', metric: 'gmb_views', target: 2000, current: 1200 },
    { type: 'engagement', metric: 'avg_time_on_site', target: 180, current: 120 }
  ];

  let count = 0;
  clients.forEach(client => {
    goals.forEach(goal => {
      stmt.run(client.id, goal.type, goal.metric, goal.target, goal.current, 'active');
      count++;
    });
  });
  return count;
});

// ==================================================
// 4. COMPETITOR RANKINGS
// ==================================================
seed('competitor_rankings', () => {
  const stmt = db.prepare(`
    INSERT INTO competitor_rankings (client_id, competitor_domain, competitor_name, keyword, your_position, their_position, search_volume, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, date('now', ?))
  `);

  const competitors = [
    { domain: 'competitor1.com.au', name: 'Competitor 1 Pty Ltd' },
    { domain: 'competitor2.com.au', name: 'Competitor 2 Services' },
    { domain: 'competitor3.com', name: 'Big Competitor Corp' }
  ];

  const keywords = [
    { kw: 'seo services sydney', vol: 1200 },
    { kw: 'local seo sydney', vol: 890 },
    { kw: 'digital marketing sydney', vol: 2100 }
  ];

  let count = 0;
  for (let day = 14; day >= 0; day--) {
    clients.forEach(client => {
      competitors.forEach(comp => {
        keywords.forEach(k => {
          stmt.run(
            client.id,
            comp.domain,
            comp.name,
            k.kw,
            5 + Math.floor(Math.random() * 10),
            3 + Math.floor(Math.random() * 12),
            k.vol,
            `-${day} days`
          );
          count++;
        });
      });
    });
  }
  return count;
});

// ==================================================
// 5. COMPETITOR ALERTS
// ==================================================
seed('competitor_alerts', () => {
  const stmt = db.prepare(`
    INSERT INTO competitor_alerts (client_id, competitor_domain, alert_type, severity, keyword, message, recommendation, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const alerts = [
    { domain: 'competitor1.com.au', type: 'ranking_drop', severity: 'high', kw: 'seo services sydney', msg: 'You dropped 3 positions', rec: 'Improve content quality' },
    { domain: 'competitor2.com.au', type: 'new_content', severity: 'medium', kw: 'local seo', msg: 'Competitor published new guide', rec: 'Create similar content' },
    { domain: 'competitor3.com', type: 'backlink_gain', severity: 'low', kw: null, msg: 'Gained high-authority backlink', rec: 'Reach out to same source' }
  ];

  let count = 0;
  clients.forEach(client => {
    alerts.forEach(alert => {
      stmt.run(
        client.id,
        alert.domain,
        alert.type,
        alert.severity,
        alert.kw,
        alert.msg,
        alert.rec,
        'open'
      );
      count++;
    });
  });
  return count;
});

// ==================================================
// 6. KEYWORD PERFORMANCE
// ==================================================
seed('keyword_performance', () => {
  const stmt = db.prepare(`
    INSERT INTO keyword_performance (client_id, keyword, position, impressions, clicks, ctr, date)
    VALUES (?, ?, ?, ?, ?, ?, date('now', ?))
  `);

  const keywords = [
    'seo services sydney',
    'local seo sydney',
    'digital marketing sydney',
    'google business profile',
    'seo expert sydney'
  ];

  let count = 0;
  for (let day = 30; day >= 0; day--) {
    clients.forEach(client => {
      keywords.forEach(kw => {
        const position = 3 + Math.floor(Math.random() * 12);
        const impressions = 100 + Math.floor(Math.random() * 500);
        const ctr = (20 - position) / 100;
        const clicks = Math.floor(impressions * ctr);

        stmt.run(client.id, kw, position, impressions, clicks, ctr.toFixed(4), `-${day} days`);
        count++;
      });
    });
  }
  return count;
});

// ==================================================
// 7. PAGE PERFORMANCE
// ==================================================
seed('page_performance', () => {
  const stmt = db.prepare(`
    INSERT INTO page_performance (client_id, page_url, source, lcp, fid, cls, fcp, ttfb, performance_score, device_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const pages = ['/', '/services', '/contact', '/about', '/blog'];
  const devices = ['desktop', 'mobile', 'tablet'];

  let count = 0;
  clients.forEach(client => {
    pages.forEach(page => {
      devices.forEach(device => {
        stmt.run(
          client.id,
          page,
          'pixel',
          1.2 + Math.random() * 1.5,  // LCP
          50 + Math.random() * 50,    // FID
          0.05 + Math.random() * 0.15, // CLS
          0.8 + Math.random() * 0.7,  // FCP
          200 + Math.random() * 300,  // TTFB
          70 + Math.floor(Math.random() * 25),  // Score
          device
        );
        count++;
      });
    });
  });
  return count;
});

// ==================================================
// 8. RECOMMENDATIONS
// ==================================================
seed('recommendations', () => {
  const stmt = db.prepare(`
    INSERT INTO recommendations (client_id, type, category, title, description, impact, effort, status, estimated_impact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const recommendations = [
    { type: 'technical', cat: 'performance', title: 'Optimize Images', desc: 'Compress images to improve load time', impact: 'high', effort: 'low', est: '+15% speed' },
    { type: 'content', cat: 'seo', title: 'Update Meta Descriptions', desc: 'Rewrite meta descriptions for better CTR', impact: 'medium', effort: 'medium', est: '+8% CTR' },
    { type: 'local', cat: 'gmb', title: 'Complete GMB Profile', desc: 'Add missing business hours and photos', impact: 'high', effort: 'low', est: '+20% visibility' },
    { type: 'technical', cat: 'schema', title: 'Add FAQ Schema', desc: 'Implement FAQ markup', impact: 'medium', effort: 'low', est: '+10% CTR' },
    { type: 'backlinks', cat: 'seo', title: 'Build Local Citations', desc: 'Submit to 10 local directories', impact: 'high', effort: 'high', est: '+5 positions' }
  ];

  let count = 0;
  clients.forEach(client => {
    recommendations.forEach(rec => {
      stmt.run(
        client.id,
        rec.type,
        rec.cat,
        rec.title,
        rec.desc,
        rec.impact,
        rec.effort,
        'pending',
        rec.est
      );
      count++;
    });
  });
  return count;
});

// ==================================================
// 9. OPTIMIZATION HISTORY
// ==================================================
seed('optimization_history', () => {
  const stmt = db.prepare(`
    INSERT INTO optimization_history (client_id, date, type, target, before_value, after_value, impact_score, status)
    VALUES (?, date('now', ?), ?, ?, ?, ?, ?, ?)
  `);

  const optimizations = [
    { type: 'title', target: 'homepage', before: 'Old Title', after: 'SEO Optimized Title', impact: 85 },
    { type: 'meta', target: 'services', before: 'Generic description', after: 'Keyword-rich description', impact: 75 },
    { type: 'schema', target: 'contact', before: 'none', after: 'LocalBusiness schema', impact: 90 },
    { type: 'content', target: 'about', before: '200 words', after: '800 words', impact: 80 }
  ];

  let count = 0;
  for (let day = 20; day >= 0; day--) {
    clients.forEach(client => {
      const opt = optimizations[Math.floor(Math.random() * optimizations.length)];
      stmt.run(
        client.id,
        `-${day} days`,
        opt.type,
        opt.target,
        opt.before,
        opt.after,
        opt.impact,
        'completed'
      );
      count++;
    });
  }
  return count;
});

// ==================================================
// 10. ANALYTICS CACHE
// ==================================================
seed('analytics_cache', () => {
  const stmt = db.prepare(`
    INSERT INTO analytics_cache (client_id, timeframe, data, expires_at)
    VALUES (?, ?, ?, datetime('now', '+1 hour'))
  `);

  const timeframes = ['24h', '7d', '30d'];
  let count = 0;

  clients.forEach(client => {
    timeframes.forEach(tf => {
      const data = JSON.stringify({
        visits: 5000 + Math.floor(Math.random() * 10000),
        pageviews: 12000 + Math.floor(Math.random() * 20000),
        bounceRate: (30 + Math.random() * 20).toFixed(2),
        avgTime: 120 + Math.floor(Math.random() * 180)
      });

      stmt.run(client.id, tf, data);
      count++;
    });
  });
  return count;
});

// ==================================================
// 11. WEBHOOKS
// ==================================================
seed('webhooks', () => {
  const stmt = db.prepare(`
    INSERT INTO webhooks (url, events, secret, active)
    VALUES (?, ?, ?, ?)
  `);

  const webhooks = [
    { url: 'https://example.com/webhook/reports', events: ['report_generated'] },
    { url: 'https://example.com/webhook/rankings', events: ['ranking_change', 'alert_triggered'] },
    { url: 'https://example.com/webhook/all', events: ['report_generated', 'ranking_change', 'optimization_complete'] }
  ];

  let count = 0;
  webhooks.forEach(hook => {
    stmt.run(hook.url, JSON.stringify(hook.events), 'webhook_secret_' + Math.random().toString(36).substr(2, 9), 1);
    count++;
  });
  return count;
});

// Summary
console.log('\n' + '='.repeat(70));
console.log('\n📊 SEEDING COMPLETE\n');
console.log(`   Tables seeded: ${seeded}/11`);
console.log(`   Total records: ${totalRecords}`);
console.log(`   Success rate: ${Math.round((seeded / 11) * 100)}%`);

if (seeded === 11) {
  console.log('\n✅ Database fully seeded!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  Some tables failed to seed\n`);
  process.exit(1);
}
