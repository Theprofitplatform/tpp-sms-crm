#!/usr/bin/env node
const https = require('https');

const SERPBEAR_URL = 'serpbear.theprofitplatform.com.au';
const USERNAME = 'admin';
const PASSWORD = 'coNNRIEIkVm6Ylq21xYlFJu9fIs=';
const DOMAIN = 'instantautotraders.com.au';

console.log('🔍 Checking GSC data stored in SerpBear...\n');

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

// Get GSC data
function getGSCData(cookies) {
  return new Promise((resolve, reject) => {
    const domainSlug = DOMAIN.replace(/\./g, '-');
    
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: `/api/searchconsole?domain=${domainSlug}`,
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };

    console.log('📡 Fetching from:', `https://${SERPBEAR_URL}/api/searchconsole?domain=${domainSlug}\n`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log('📊 GSC Data Response:');
          console.log('='.repeat(60));
          
          if (result.data) {
            console.log('Last Fetched:', result.data.lastFetched || 'Never');
            console.log('Last Error:', result.data.lastFetchError || 'None');
            console.log('\n3-day data:', result.data.threeDays?.length || 0, 'entries');
            console.log('7-day data:', result.data.sevenDays?.length || 0, 'entries');
            console.log('30-day data:', result.data.thirtyDays?.length || 0, 'entries');
            console.log('Stats:', result.data.stats?.length || 0, 'entries');
            
            if (result.data.threeDays && result.data.threeDays.length > 0) {
              console.log('\n📈 Sample Keywords (first 10):');
              result.data.threeDays.slice(0, 10).forEach((kw, i) => {
                console.log(`${i + 1}. ${kw.keyword} [${kw.device}]`);
                console.log(`   Clicks: ${kw.clicks}, Impressions: ${kw.impressions}, Position: ${kw.position}`);
              });
              
              // Count devices
              const deviceCounts = {};
              result.data.threeDays.forEach(kw => {
                deviceCounts[kw.device] = (deviceCounts[kw.device] || 0) + 1;
              });
              console.log('\n📱 Device Breakdown:');
              Object.keys(deviceCounts).forEach(device => {
                console.log(`   ${device}: ${deviceCounts[device]} keywords`);
              });
            }
            
            if (result.data.lastFetchError) {
              console.log('\n⚠️ ERROR:', result.data.lastFetchError);
            } else if (result.data.threeDays?.length > 0) {
              console.log('\n✅ GSC DATA IS AVAILABLE!');
            } else {
              console.log('\n⚠️ No keyword data available yet');
            }
          } else {
            console.log('❌ No data object in response');
            console.log('Full response:', JSON.stringify(result, null, 2));
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
    await getGSCData(cookies);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
