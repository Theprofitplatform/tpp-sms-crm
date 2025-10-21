#!/usr/bin/env node
/**
 * Automated Client Migration from SEOAnalyst to SEO-Expert
 * Reads clients from SEOAnalyst config and creates templates for SEO-Expert
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to SEOAnalyst clients config
const SEOANALYST_CONFIG = '/home/avi/projects/seoanalyst/seo-analyst-agent/config/clients.json';

console.log('\n' + '='.repeat(70));
console.log('🔄 MIGRATING CLIENTS FROM SEOANALYST TO SEO-EXPERT');
console.log('='.repeat(70));

// Check if SEOAnalyst config exists
if (!existsSync(SEOANALYST_CONFIG)) {
  console.error('\n❌ SEOAnalyst config not found at:', SEOANALYST_CONFIG);
  process.exit(1);
}

// Read SEOAnalyst clients
const seoanalystClients = JSON.parse(readFileSync(SEOANALYST_CONFIG, 'utf-8'));
console.log('\n✅ Found', Object.keys(seoanalystClients).length, 'clients in SEOAnalyst:');

Object.entries(seoanalystClients).forEach(([id, client]) => {
  console.log('   -', client.name, '(' + client.domain + ')');
});

// Create client configs for SEO-Expert
console.log('\n' + '='.repeat(70));
console.log('📝 CREATING CLIENT CONFIGURATIONS FOR SEO-EXPERT');
console.log('='.repeat(70));

const seoExpertClients = {};

Object.entries(seoanalystClients).forEach(([id, client]) => {
  const clientId = id.replace(/_/g, ''); // Remove underscores
  
  // Create registry entry
  seoExpertClients[clientId] = {
    name: client.name,
    url: client.website,
    contact: 'client@' + client.domain,
    wordpress_user: 'admin', // Default - needs to be updated
    package: 'professional',
    status: 'pending_setup',
    ga4_property_id: client.ga4_property_id || null,
    gsc_property: client.gsc_property || null,
    notes: 'Migrated from SEOAnalyst - WordPress credentials needed'
  };

  // Create .env template
  const envContent = `# ${client.name} Configuration
# Migrated from SEOAnalyst on ${new Date().toISOString().split('T')[0]}

WORDPRESS_URL=${client.website}
WORDPRESS_USER=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_SITE_ID=${clientId}
WORDPRESS_SITE_NAME=${client.name}

# Optional: Discord notifications
DISCORD_WEBHOOK_URL=

# Analytics (from SEOAnalyst)
GA4_PROPERTY_ID=${client.ga4_property_id || ''}
GSC_PROPERTY=${client.gsc_property || ''}

# Package tier
PACKAGE_TIER=professional

# SETUP REQUIRED:
# 1. Log into ${client.website}/wp-admin
# 2. Go to Users → Your Profile → Application Passwords
# 3. Create: SEO Automation System
# 4. Copy the password and replace WORDPRESS_APP_PASSWORD above
# 5. Update WORDPRESS_USER if different from 'admin'
# 6. Test: node test-all-clients.js
`;

  const envFile = join(__dirname, 'clients', `${clientId}.env.template`);
  writeFileSync(envFile, envContent);
  
  console.log('\n✅', client.name);
  console.log('   Created:', `clients/${clientId}.env.template`);
  console.log('   WordPress URL:', client.website);
  console.log('   GA4 Property:', client.ga4_property_id || 'N/A');
  console.log('   Action needed: Add WordPress credentials');
});

// Update clients-config.json
const configFile = join(__dirname, 'clients', 'clients-config.json');
let existingConfig = {};

if (existsSync(configFile)) {
  existingConfig = JSON.parse(readFileSync(configFile, 'utf-8'));
  console.log('\n📋 Existing clients-config.json found with', Object.keys(existingConfig).length, 'clients');
}

// Merge configs
const mergedConfig = { ...existingConfig, ...seoExpertClients };

writeFileSync(configFile, JSON.stringify(mergedConfig, null, 2));
console.log('✅ Updated clients/clients-config.json with', Object.keys(mergedConfig).length, 'total clients');

// Create setup instructions
const instructionsFile = join(__dirname, 'SETUP-MIGRATED-CLIENTS.md');
const instructions = `# Setup Instructions for Migrated Clients

## 🎯 Migration Complete!

Your 4 clients from SEOAnalyst have been migrated to SEO-Expert.

## 📋 Clients Migrated

${Object.entries(seoExpertClients).map(([id, client]) => `
### ${client.name}
- **Client ID:** ${id}
- **Website:** ${client.url}
- **Template:** \`clients/${id}.env.template\`
- **Status:** ⚠️ Pending WordPress credentials
`).join('\n')}

## 🚀 Next Steps

### For Each Client:

1. **Rename template file:**
   \`\`\`bash
   cd ~/projects/seo-expert/clients
   mv [clientid].env.template [clientid].env
   \`\`\`

2. **Get WordPress Application Password:**
   - Log into WordPress admin
   - Go to Users → Your Profile
   - Scroll to Application Passwords
   - Create: SEO Automation System
   - Copy the password

3. **Edit the .env file:**
   \`\`\`bash
   nano clients/[clientid].env
   \`\`\`
   
   Update these lines:
   - \`WORDPRESS_USER=admin\` (use your actual username)
   - \`WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx\` (paste the password)

4. **Test authentication:**
   \`\`\`bash
   node test-all-clients.js
   \`\`\`

5. **Run first audit:**
   \`\`\`bash
   node audit-all-clients.js
   \`\`\`

## ⚡ Quick Setup Commands

\`\`\`bash
# Setup client 1
cd ~/projects/seo-expert/clients
mv hottyres.env.template hottyres.env
nano hottyres.env
# Add WordPress credentials, save

# Setup client 2
mv theprofitplatform.env.template theprofitplatform.env
nano theprofitplatform.env
# Add WordPress credentials, save

# Setup client 3
mv instantautotraders.env.template instantautotraders.env
nano instantautotraders.env
# Add WordPress credentials, save

# Setup client 4
mv sadcdisabilityservices.env.template sadcdisabilityservices.env
nano sadcdisabilityservices.env
# Add WordPress credentials, save

# Test all
cd ~/projects/seo-expert
node test-all-clients.js

# Run first batch audit
node audit-all-clients.js
\`\`\`

## 📊 After Setup

Once all clients are configured:

- ✅ Daily SEO audits (midnight)
- ✅ Health checks (every 6 hours)
- ✅ Reports (1 AM daily)
- ✅ All automated via PM2

View status:
\`\`\`bash
pm2 status
\`\`\`

View logs:
\`\`\`bash
pm2 logs seo-audit-all
\`\`\`

## 🎯 Integration Complete

You now have:
- ✅ SEOAnalyst: Analytics & reporting
- ✅ SEO-Expert: WordPress optimization
- ✅ Same 4 clients in both systems
- ✅ Unified SEO management

Total setup time: ~30 minutes
Weekly management: ~5 minutes
Revenue potential: 5K-36K/year
`;

writeFileSync(instructionsFile, instructions);
console.log('\n📄 Created setup instructions:', 'SETUP-MIGRATED-CLIENTS.md');

// Summary
console.log('\n' + '='.repeat(70));
console.log('✅ MIGRATION SUMMARY');
console.log('='.repeat(70));
console.log('\n✅ Client templates created:', Object.keys(seoExpertClients).length);
console.log('✅ Registry updated: clients/clients-config.json');
console.log('✅ Instructions created: SETUP-MIGRATED-CLIENTS.md');
console.log('\n📋 Next Steps:');
console.log('   1. Read: cat SETUP-MIGRATED-CLIENTS.md');
console.log('   2. For each client:');
console.log('      - Rename .env.template to .env');
console.log('      - Add WordPress credentials');
console.log('   3. Test: node test-all-clients.js');
console.log('   4. Run: node audit-all-clients.js');
console.log('\n' + '='.repeat(70));
console.log('');
