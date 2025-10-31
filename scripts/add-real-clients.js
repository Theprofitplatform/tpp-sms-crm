#!/usr/bin/env node

/**
 * Add Real Clients
 * 
 * Imports real client data into the system
 * 
 * Usage:
 *   node scripts/add-real-clients.js
 *   node scripts/add-real-clients.js --interactive
 */

import readline from 'readline';
import db from '../src/database/index.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Real clients data (update with your actual clients)
const realClients = [
  {
    id: 'instant-auto-traders',
    name: 'Instant Auto Traders',
    domain: 'instantautotraders.com',
    businessType: 'Automotive Sales',
    city: 'Johannesburg',
    state: 'Gauteng',
    country: 'South Africa',
    email: 'contact@instantautotraders.com',
    phone: '+27 XX XXX XXXX',
    url: 'https://instantautotraders.com'
  },
  {
    id: 'hot-tyres',
    name: 'Hot Tyres',
    domain: 'hottyres.co.za',
    businessType: 'Tyre Retail & Service',
    city: 'Johannesburg',
    state: 'Gauteng',
    country: 'South Africa',
    email: 'info@hottyres.co.za',
    phone: '+27 XX XXX XXXX',
    url: 'https://hottyres.co.za'
  },
  {
    id: 'sadc-disability-services',
    name: 'SADC Disability Services',
    domain: 'sadcdisabilityservices.co.za',
    businessType: 'Disability Support Services',
    city: 'Johannesburg',
    state: 'Gauteng',
    country: 'South Africa',
    email: 'info@sadcdisabilityservices.co.za',
    phone: '+27 XX XXX XXXX',
    url: 'https://sadcdisabilityservices.co.za'
  },
  {
    id: 'the-profit-platform',
    name: 'The Profit Platform',
    domain: 'theprofitplatform.com.au',
    businessType: 'Business Consulting',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    email: 'hello@theprofitplatform.com.au',
    phone: '+61 X XXXX XXXX',
    url: 'https://theprofitplatform.com.au'
  }
];

async function addClient(client) {
  try {
    console.log(`\n📝 Adding: ${client.name}...`);
    
    // Check if client already exists
    const existing = db.clientOps.getById(client.id);
    
    if (existing) {
      console.log(`⚠️  Client already exists: ${client.id}`);
      const update = await question('Update existing client? (yes/no): ');
      
      if (update.toLowerCase() !== 'yes' && update.toLowerCase() !== 'y') {
        console.log('Skipped');
        return false;
      }
    }
    
    // Upsert client
    db.clientOps.upsert({
      id: client.id,
      name: client.name,
      domain: client.domain,
      businessType: client.businessType,
      city: client.city,
      state: client.state,
      country: client.country,
      status: 'active'
    });
    
    console.log(`✅ Added: ${client.name}`);
    console.log(`   ID: ${client.id}`);
    console.log(`   Domain: ${client.domain}`);
    console.log(`   Location: ${client.city}, ${client.state}, ${client.country}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to add ${client.name}:`, error.message);
    return false;
  }
}

async function addRealClients() {
  console.log('\n==============================================');
  console.log('  Add Real Clients');
  console.log('==============================================\n');
  
  console.log(`Found ${realClients.length} clients to add:\n`);
  
  realClients.forEach((client, index) => {
    console.log(`${index + 1}. ${client.name} (${client.domain})`);
  });
  
  console.log('\n');
  
  const confirm = await question('Add these clients to the database? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('\n❌ Cancelled\n');
    rl.close();
    process.exit(0);
  }
  
  let added = 0;
  let skipped = 0;
  
  for (const client of realClients) {
    const success = await addClient(client);
    if (success) added++;
    else skipped++;
  }
  
  // Summary
  console.log('\n==============================================');
  console.log('  Summary');
  console.log('==============================================');
  console.log(`✅ Added/Updated: ${added}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`📊 Total: ${realClients.length}`);
  console.log('==============================================\n');
  
  // Next steps
  console.log('📋 Next Steps:\n');
  console.log('1. Configure WordPress credentials for each client:');
  realClients.forEach(client => {
    console.log(`   • ${client.id}: Create clients/${client.id}.env`);
  });
  console.log('\n2. Test WordPress connections:');
  console.log('   node scripts/test-wordpress-connections.js\n');
  console.log('3. Start the dashboard:');
  console.log('   npm run pm2:start\n');
  
  rl.close();
}

// Check if interactive mode
const args = process.argv.slice(2);
const interactive = args.includes('--interactive') || args.includes('-i');

if (interactive) {
  addRealClients();
} else {
  // Non-interactive mode - just add all
  console.log('\n📝 Adding real clients (non-interactive)...\n');
  
  let added = 0;
  for (const client of realClients) {
    try {
      db.clientOps.upsert({
        id: client.id,
        name: client.name,
        domain: client.domain,
        businessType: client.businessType,
        city: client.city,
        state: client.state,
        country: client.country,
        status: 'active'
      });
      console.log(`✅ ${client.name}`);
      added++;
    } catch (error) {
      console.error(`❌ ${client.name}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Added ${added}/${realClients.length} clients\n`);
}
