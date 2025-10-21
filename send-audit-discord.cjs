#!/usr/bin/env node

/**
 * Send Audit Reports to Discord
 *
 * Sends SEO audit summaries to Discord webhook with report details
 *
 * Usage:
 *   node send-audit-discord.js <webhook_url> [date]
 *
 * Examples:
 *   node send-audit-discord.js "https://discord.com/api/webhooks/..."
 *   node send-audit-discord.js "https://discord.com/api/webhooks/..." 2025-10-21
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const webhookUrl = process.argv[2];
const auditDate = process.argv[3] || new Date().toISOString().split('T')[0];

if (!webhookUrl) {
  console.log('❌ Usage: node send-audit-discord.js <webhook_url> [date]');
  console.log('   Example: node send-audit-discord.js "https://discord.com/api/webhooks/..." 2025-10-21');
  process.exit(1);
}

// Load client configuration
const configPath = path.join(__dirname, 'clients', 'clients-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Get all active WordPress clients
const activeClients = Object.entries(config)
  .filter(([id, client]) => client.status === 'active')
  .map(([id, client]) => ({ id, ...client }));

console.log(`\n📤 Sending audit reports to Discord...`);
console.log(`📅 Audit Date: ${auditDate}`);
console.log(`📊 Clients: ${activeClients.length}\n`);

// Collect audit results
const results = [];

for (const client of activeClients) {
  const reportPath = path.join(__dirname, 'logs', 'clients', client.id, `audit-${auditDate}.html`);
  const jsonPath = path.join(__dirname, 'logs', 'clients', client.id, `audit-${auditDate}.json`);

  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    results.push({
      client: client.name,
      url: client.url,
      score: data.summary?.averageScore || 0,
      issues: data.summary?.totalIssues || 0,
      posts: data.summary?.postsAnalyzed || 0,
      reportPath: reportPath
    });
  }
}

if (results.length === 0) {
  console.log(`❌ No audit reports found for ${auditDate}`);
  process.exit(1);
}

// Calculate overall statistics
const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
const totalIssues = results.reduce((sum, r) => sum + r.issues, 0);
const totalPosts = results.reduce((sum, r) => sum + r.posts, 0);

// Build Discord embed
const embed = {
  title: '📊 SEO Audit Report Complete',
  description: `Daily SEO audit completed for ${results.length} client(s)`,
  color: avgScore >= 90 ? 0x2ecc71 : avgScore >= 70 ? 0xf39c12 : 0xe74c3c,
  fields: [
    {
      name: '📈 Overall Statistics',
      value: `**Average Score:** ${avgScore}/100\n**Total Posts Analyzed:** ${totalPosts}\n**Total Issues Found:** ${totalIssues}`,
      inline: false
    }
  ],
  timestamp: new Date().toISOString(),
  footer: {
    text: 'SEO Expert Automation System'
  }
};

// Add each client's results
results.forEach((result, index) => {
  const scoreEmoji = result.score >= 90 ? '🟢' : result.score >= 70 ? '🟡' : '🔴';

  embed.fields.push({
    name: `${scoreEmoji} ${result.client}`,
    value: `**Score:** ${result.score}/100\n**Posts:** ${result.posts}\n**Issues:** ${result.issues}\n**URL:** ${result.url}`,
    inline: true
  });
});

// Send to Discord
const payload = {
  username: 'SEO Audit Bot',
  avatar_url: 'https://cdn-icons-png.flaticon.com/512/2103/2103633.png',
  embeds: [embed]
};

axios.post(webhookUrl, payload)
  .then(response => {
    console.log('✅ Successfully sent audit report to Discord!\n');
    console.log(`📊 Summary:`);
    results.forEach(r => {
      const scoreEmoji = r.score >= 90 ? '🟢' : r.score >= 70 ? '🟡' : '🔴';
      console.log(`   ${scoreEmoji} ${r.client}: ${r.score}/100 (${r.issues} issues, ${r.posts} posts)`);
    });
    console.log(`\n💡 Detailed HTML reports saved in: logs/clients/*/audit-${auditDate}.html\n`);
  })
  .catch(error => {
    console.log('❌ Failed to send to Discord');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.statusText}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    process.exit(1);
  });
