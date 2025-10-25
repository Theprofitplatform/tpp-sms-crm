#!/usr/bin/env node
/**
 * Client Onboarding Script
 * Interactive CLI to add new SEO automation clients
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🚀 SEO Automation - New Client Onboarding\n');
  console.log('This wizard will help you add a new client to the automation system.\n');

  // Gather client information
  const clientId = await question('Client ID (lowercase, no spaces, e.g., "newclient"): ');
  const clientName = await question('Client Name (e.g., "New Client LLC"): ');
  const url = await question('Website URL (e.g., "https://newclient.com"): ');
  const wpUrl = await question('WordPress URL (usually same as website): ') || url;
  const gscUrl = await question('GSC Property URL (from Search Console, e.g., "https://newclient.com/" or "sc-domain:newclient.com"): ');
  const wpUser = await question('WordPress Admin Username (default: admin): ') || 'admin';
  const wpPassword = await question('WordPress Application Password (generate from WP admin): ');
  const packageType = await question('Package Type (professional/premium/basic): ') || 'professional';
  const contact = await question('Client Contact Email: ');

  console.log('\n📋 Client Summary:\n');
  console.log(`ID: ${clientId}`);
  console.log(`Name: ${clientName}`);
  console.log(`URL: ${url}`);
  console.log(`WordPress: ${wpUrl}`);
  console.log(`GSC Property: ${gscUrl}`);
  console.log(`Package: ${packageType}`);
  console.log(`Contact: ${contact}\n`);

  const confirm = await question('Does this look correct? (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Cancelled. Please run again.');
    rl.close();
    return;
  }

  // Update clients-config.json
  const configPath = './clients/clients-config.json';
  let config = {};

  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  }

  config[clientId] = {
    name: clientName,
    url: url.replace(/\/$/, ''),
    contact: contact,
    wordpress_user: wpUser,
    package: packageType,
    status: 'active',
    gsc_property: gscUrl,
    notes: `Added on ${new Date().toISOString().split('T')[0]}`
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`✅ Added to ${configPath}`);

  // Update run-automation.js
  console.log('\n📝 Next Steps:\n');

  console.log('1. Add to run-automation.js:');
  console.log(`\nAdd this to the clients object in run-automation.js:\n`);
  console.log(`  ${clientId}: {
    id: '${clientId}',
    domain: '${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}',
    wpUrl: '${wpUrl}',
    gscUrl: '${gscUrl}',
    wpUser: process.env.${clientId.toUpperCase()}_WP_USER || '${wpUser}',
    wpPassword: process.env.${clientId.toUpperCase()}_WP_PASSWORD || 'your_app_password'
  }`);

  console.log('\n2. Add environment variables to .env:');
  console.log(`\n${clientId.toUpperCase()}_WP_USER=${wpUser}`);
  console.log(`${clientId.toUpperCase()}_WP_PASSWORD=${wpPassword}`);

  console.log('\n3. Add GitHub secrets (for automation):');
  console.log(`   Go to: Repository → Settings → Secrets`);
  console.log(`   Add: ${clientId.toUpperCase()}_WP_USER = ${wpUser}`);
  console.log(`   Add: ${clientId.toUpperCase()}_WP_PASSWORD = ${wpPassword}`);

  console.log('\n4. Update GitHub Actions workflow:');
  console.log(`   Edit: .github/workflows/weekly-seo-automation.yml`);
  console.log(`   Add '${clientId}' to the matrix.client array`);

  console.log('\n5. Test the setup:');
  console.log(`   node run-automation.js ${clientId}`);

  console.log('\n✅ Client onboarding complete!\n');

  rl.close();
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
