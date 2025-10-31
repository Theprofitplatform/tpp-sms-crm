#!/usr/bin/env node

/**
 * Setup Google Search Console Integration
 * 
 * Interactive script to configure GSC service account
 * 
 * Usage:
 *   node scripts/setup-gsc.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { saveGSCSettings, testGSCConnection } from '../src/services/gsc-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGSC() {
  console.log('\n==============================================');
  console.log('  Google Search Console Setup');
  console.log('==============================================\n');

  console.log('📚 Prerequisites:\n');
  console.log('1. Go to: https://console.cloud.google.com/');
  console.log('2. Create a new project (or select existing)');
  console.log('3. Enable Google Search Console API');
  console.log('4. Create Service Account credentials');
  console.log('5. Download the JSON key file\n');

  const proceed = await question('Have you completed these steps? (yes/no): ');
  
  if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
    console.log('\n📖 Please complete the prerequisites first.');
    console.log('Visit: https://console.cloud.google.com/\n');
    rl.close();
    process.exit(0);
  }

  console.log('\n📋 Enter your service account details:\n');

  // Get service account details
  const clientEmail = await question('Service account email: ');
  
  console.log('\nPaste your private key below.');
  console.log('(Tip: It starts with -----BEGIN PRIVATE KEY----- and ends with -----END PRIVATE KEY-----)\n');
  const privateKey = await question('Private key: ');

  // Get property details
  console.log('\n🌐 Property Configuration:\n');
  console.log('Property type:');
  console.log('1. Domain property (sc-domain:example.com)');
  console.log('2. URL-prefix property (https://example.com)\n');
  
  const typeChoice = await question('Enter choice (1 or 2): ');
  const propertyType = typeChoice.trim() === '1' ? 'domain' : 'url-prefix';

  const propertyUrl = await question(`Enter your ${propertyType === 'domain' ? 'domain' : 'URL'}: `);

  // Test connection
  console.log('\n🧪 Testing connection...');
  
  try {
    const testResult = await testGSCConnection(
      clientEmail.trim(),
      privateKey.trim(),
      propertyUrl.trim(),
      propertyType
    );

    if (testResult.success) {
      console.log('✅ Successfully connected to Google Search Console!');
      console.log(`   Data available: ${testResult.dataAvailable ? 'Yes' : 'No (may need time to collect data)'}`);

      // Save settings
      const settings = {
        propertyType,
        propertyUrl: propertyUrl.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: privateKey.trim(),
        connected: true,
        lastTested: new Date().toISOString()
      };

      const saved = saveGSCSettings(settings);

      if (saved) {
        console.log('✅ Settings saved successfully!\n');
        
        // Update .env
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        if (!envContent.includes('GSC_ENABLED')) {
          envContent += '\n# Google Search Console\nGSC_ENABLED=true\n';
          fs.writeFileSync(envPath, envContent);
          console.log('✅ Updated .env with GSC_ENABLED=true\n');
        }

        console.log('📊 You can now use GSC integration in your dashboard!');
        console.log('\n📚 Next steps:');
        console.log('1. Add service account to Search Console:');
        console.log(`   https://search.google.com/search-console?resource_id=${propertyUrl}`);
        console.log(`   Add user: ${clientEmail}`);
        console.log('   Permission: Owner or Full');
        console.log('\n2. Restart dashboard: node dashboard-server.js');
        console.log('3. View GSC data in Analytics section\n');
      } else {
        console.log('❌ Failed to save settings\n');
      }

    } else {
      console.log('❌ Connection test failed');
      console.log(`   Error: ${testResult.error}\n`);
      console.log('💡 Common issues:');
      console.log('1. Private key format - make sure it includes BEGIN/END lines');
      console.log('2. Service account not added to Search Console property');
      console.log('3. Wrong property URL or type');
      console.log('4. API not enabled in Google Cloud Console\n');
    }

  } catch (error) {
    console.log('❌ Setup failed:', error.message);
    console.error(error);
  }

  rl.close();
}

setupGSC();
