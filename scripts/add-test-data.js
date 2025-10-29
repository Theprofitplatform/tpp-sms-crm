#!/usr/bin/env node

/**
 * Add Test Data
 * Populates the dashboard with comprehensive test data
 */

import recommendationsDB from '../src/database/recommendations-db.js';
import goalsDB from '../src/database/goals-db.js';
import notificationsDB from '../src/database/notifications-db.js';
import webhooksDB from '../src/database/webhooks-db.js';
import { generateRecommendations } from '../src/services/recommendation-generator.js';

console.log('🔧 Adding comprehensive test data...\n');

// Test clients
const clients = [
  'instantautotraders',
  'theprofitplatform',
  'hottyres',
  'sadcdisabilityservices'
];

// Add recommendations for each client
console.log('📝 Adding recommendations...');
clients.forEach(clientId => {
  const recommendations = generateRecommendations(clientId, {});
  recommendationsDB.saveMany(recommendations);
  console.log(`   ✅ Added ${recommendations.length} recommendations for ${clientId}`);
});

// Add sample goals
console.log('\n🎯 Adding goals...');
const goals = [
  {
    clientId: 'instantautotraders',
    type: 'traffic',
    title: 'Increase Monthly Traffic to 50K',
    description: 'Achieve 50,000 monthly organic visitors',
    metric: 'visits',
    targetValue: 50000,
    currentValue: 32000,
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
  },
  {
    clientId: 'instantautotraders',
    type: 'ranking',
    title: 'Rank #1 for "auto traders melbourne"',
    description: 'Achieve position 1 for target keyword',
    metric: 'rank',
    targetValue: 1,
    currentValue: 5,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    clientId: 'theprofitplatform',
    type: 'conversions',
    title: 'Achieve 100 Monthly Conversions',
    description: 'Get 100 form submissions per month',
    metric: 'conversions',
    targetValue: 100,
    currentValue: 45,
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    clientId: 'hottyres',
    type: 'engagement',
    title: 'Reduce Bounce Rate to 40%',
    description: 'Improve user engagement metrics',
    metric: 'bounce_rate',
    targetValue: 40,
    currentValue: 62,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    clientId: 'sadcdisabilityservices',
    type: 'traffic',
    title: 'Double Organic Traffic',
    description: 'Increase monthly visitors from 5K to 10K',
    metric: 'visits',
    targetValue: 10000,
    currentValue: 5200,
    deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
  }
];

goals.forEach(goal => {
  const created = goalsDB.create(goal);
  console.log(`   ✅ Added goal: "${created.title}"`);
});

// Add sample notifications
console.log('\n🔔 Adding notifications...');
const notifications = [
  {
    type: 'success',
    category: 'audit',
    title: 'Audit Completed',
    message: 'SEO audit completed successfully for Instant Auto Traders',
    link: '/reports'
  },
  {
    type: 'warning',
    category: 'issue',
    title: 'Critical Issue Found',
    message: '3 broken links detected on Hot Tyres website',
    link: '/auto-fix'
  },
  {
    type: 'info',
    category: 'update',
    title: 'System Update',
    message: 'Dashboard updated to version 2.0 with new features',
    link: '/changelog'
  },
  {
    type: 'success',
    category: 'goal',
    title: '🎉 Goal Achieved!',
    message: 'Traffic goal reached for The Profit Platform',
    link: '/goals'
  },
  {
    type: 'error',
    category: 'issue',
    title: 'Optimization Failed',
    message: 'Auto-fix encountered an error. Please review.',
    link: '/auto-fix'
  }
];

notifications.forEach(notif => {
  const created = notificationsDB.create(notif);
  console.log(`   ✅ Added notification: "${created.title}"`);
});

// Add sample webhooks
console.log('\n🪝 Adding sample webhooks...');
const webhooks = [
  {
    name: 'Slack Notifications',
    url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
    events: ['audit.completed', 'goal.achieved', 'issues.critical'],
    secret: 'whsec_test123',
    active: true
  },
  {
    name: 'Discord Alerts',
    url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID',
    events: ['audit.completed', 'optimization.completed'],
    secret: null,
    active: true
  },
  {
    name: 'Custom Integration',
    url: 'https://example.com/webhooks/seo',
    events: ['rank.changed', 'goal.achieved'],
    secret: 'whsec_custom456',
    active: false
  }
];

webhooks.forEach(webhook => {
  const created = webhooksDB.create(webhook);
  console.log(`   ✅ Added webhook: "${created.name}"`);
});

console.log('\n✅ Test data added successfully!\n');
console.log('📊 Summary:');
console.log(`   - ${clients.length * 5} recommendations`);
console.log(`   - ${goals.length} goals`);
console.log(`   - ${notifications.length} notifications`);
console.log(`   - ${webhooks.length} webhooks`);
console.log('\n🚀 Dashboard is ready with test data!');
