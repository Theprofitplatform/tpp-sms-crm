#!/usr/bin/env node
const https = require('https');

const SERPBEAR_URL = 'serpbear.theprofitplatform.com.au';
const USERNAME = 'admin';
const PASSWORD = 'coNNRIEIkVm6Ylq21xYlFJu9fIs=';
const DOMAIN = 'instantautotraders.com.au';

console.log('🔍 Checking domain settings in SerpBear...\n');

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

// Get domain details
function getDomainDetails(cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: `/api/domain?domain=${DOMAIN}`,
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
          
          console.log('📋 Domain Details:');
          console.log('==================');
          console.log('Domain:', result.domain?.domain);
          console.log('Slug:', result.domain?.slug);
          console.log('Added:', result.domain?.added);
          console.log('Last Updated:', result.domain?.lastUpdated);
          console.log('\n🔐 Search Console Settings:');
          
          if (result.domain?.search_console) {
            const scData = JSON.parse(result.domain.search_console);
            console.log('Property Type:', scData.property_type || 'NOT SET');
            console.log('URL:', scData.url || 'NOT SET');
            console.log('Client Email:', scData.client_email ? '✅ SET' : '❌ NOT SET');
            console.log('Private Key:', scData.private_key ? '✅ SET' : '❌ NOT SET');
            
            console.log('\n📊 Full SC Settings:');
            console.log(JSON.stringify(scData, null, 2));
          } else {
            console.log('❌ No Search Console settings found!');
          }
          
          resolve(result);
        } catch (e) {
          console.error('Error parsing response:', e);
          console.error('Raw response:', data);
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
    const domainDetails = await getDomainDetails(cookies);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
