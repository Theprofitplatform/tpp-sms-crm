#!/usr/bin/env node
const https = require('https');

const SERPBEAR_URL = 'serpbear.theprofitplatform.com.au';
const USERNAME = 'admin';
const PASSWORD = 'coNNRIEIkVm6Ylq21xYlFJu9fIs=';

console.log('🔍 Checking all domains in SerpBear...\n');

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
          console.log('✅ Login successful\n');
          const cookieValues = cookies ? cookies.map(c => c.split(';')[0]) : [];
          resolve(cookieValues);
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

// Get all domains
function getDomains(cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: '/api/domains',
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ cookies, domains: result.domains || [] });
        } catch (e) {
          console.error('Error parsing response:', e);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Get domain details
function getDomainDetails(cookies, domain) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: `/api/domain?domain=${domain}`,
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.domain);
        } catch (e) {
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
    const { domains } = await getDomains(cookies);
    
    console.log('📊 Found', domains.length, 'domains:\n');
    console.log('='.repeat(70));
    
    for (const domain of domains) {
      console.log(`\n📍 ${domain.domain}`);
      console.log('   Slug:', domain.slug);
      
      // Get detailed info
      const details = await getDomainDetails(cookies, domain.domain);
      
      if (details.search_console) {
        const scData = JSON.parse(details.search_console);
        
        console.log('   🔐 GSC Status:');
        console.log('      Property Type:', scData.property_type || 'NOT SET');
        console.log('      URL:', scData.url || 'NOT SET');
        console.log('      Client Email:', scData.client_email ? '✅ SET' : '❌ NOT SET');
        console.log('      Private Key:', scData.private_key ? '✅ SET' : '❌ NOT SET');
        
        if (scData.client_email && scData.private_key) {
          console.log('      Status: ✅ CONFIGURED');
        } else {
          console.log('      Status: ⚠️ INCOMPLETE');
        }
      } else {
        console.log('   🔐 GSC Status: ❌ NOT CONFIGURED');
      }
      
      console.log('   Added:', new Date(domain.added).toLocaleDateString());
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 Summary:');
    
    const configured = [];
    const notConfigured = [];
    
    for (const domain of domains) {
      const details = await getDomainDetails(cookies, domain.domain);
      if (details.search_console) {
        const scData = JSON.parse(details.search_console);
        if (scData.client_email && scData.private_key) {
          configured.push(domain.domain);
        } else {
          notConfigured.push(domain.domain);
        }
      } else {
        notConfigured.push(domain.domain);
      }
    }
    
    console.log('✅ Configured:', configured.length);
    configured.forEach(d => console.log('   -', d));
    
    console.log('\n⚠️ Not Configured:', notConfigured.length);
    notConfigured.forEach(d => console.log('   -', d));
    
    if (notConfigured.length > 0) {
      console.log('\n💡 To configure GSC for these domains:');
      console.log('   1. Make sure service account is added to each GSC property');
      console.log('   2. Run: node update-domain-gsc-settings.cjs');
      console.log('   3. Update DOMAIN variable for each domain');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
