#!/usr/bin/env node
const https = require('https');

const SERPBEAR_URL = 'serpbear.theprofitplatform.com.au';
const USERNAME = 'admin';
const PASSWORD = 'coNNRIEIkVm6Ylq21xYlFJu9fIs=';
const DOMAIN = 'instantautotraders.com.au';

console.log('🔄 Triggering Search Console data refresh...\n');

// Login
function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username: USERNAME, password: PASSWORD });
    
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'];
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Login successful');
          resolve(cookies);
        } else {
          reject(new Error(`Login failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Trigger refresh
function triggerRefresh(cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: `/api/searchconsole?domain=${DOMAIN.replace('.', '-')}`,
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };

    console.log(`\n📊 Fetching Search Console data for ${DOMAIN}...`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('\n📥 Response received:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.error) {
            console.log(`\n❌ Error: ${result.error}`);
          } else if (result.data) {
            console.log('\n✅ Data fetched successfully!');
            if (result.data.stats && result.data.stats.length > 0) {
              console.log(`   📊 Stats available: ${result.data.stats.length} entries`);
            }
            if (result.data.thirtyDays && result.data.thirtyDays.length > 0) {
              console.log(`   📈 30-day data: ${result.data.thirtyDays.length} entries`);
            }
          }
          resolve();
        } catch (e) {
          console.error('\n❌ Failed to parse response:', data);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main
(async () => {
  try {
    const cookies = await login();
    await triggerRefresh(cookies);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Refresh triggered!');
    console.log('='.repeat(60));
    console.log('\n📋 Check your domain in SerpBear UI now');
    console.log('   https://serpbear.theprofitplatform.com.au');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
