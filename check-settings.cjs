#!/usr/bin/env node
const https = require('https');

const SERPBEAR_URL = 'serpbear.theprofitplatform.com.au';
const USERNAME = 'admin';
const PASSWORD = 'coNNRIEIkVm6Ylq21xYlFJu9fIs=';

console.log('🔍 Checking SerpBear settings...\n');

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

// Get settings
function getSettings(cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: '/api/settings',
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
          
          console.log('⚙️ Current Settings:');
          console.log('='.repeat(60));
          console.log('Scraper Type:', result.settings?.scraper_type || 'NOT SET');
          console.log('Scraping API Key:', result.settings?.scaping_api ? '✅ SET' : '❌ NOT SET');
          console.log('Available Scrapers:', result.settings?.available_scapers?.map(s => s.value).join(', ') || 'None');
          console.log('');
          console.log('Search Console Integrated:', result.settings?.search_console_integrated ? '✅ Yes' : '❌ No');
          console.log('SMTP Server:', result.settings?.smtp_server || 'NOT SET');
          console.log('Notification Email:', result.settings?.notification_email || 'NOT SET');
          
          console.log('\n📋 Full Settings:');
          console.log(JSON.stringify(result.settings, null, 2));
          
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
    await getSettings(cookies);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
