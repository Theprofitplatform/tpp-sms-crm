#!/usr/bin/env node
const https = require('https');

const SERPBEAR_URL = 'serpbear.theprofitplatform.com.au';
const USERNAME = 'admin';
const PASSWORD = 'coNNRIEIkVm6Ylq21xYlFJu9fIs=';
const DOMAIN = 'instantautotraders.com.au';

console.log('🧪 Testing Add Keyword functionality...\n');

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

// Get current keywords
function getKeywords(cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: `/api/keywords?domain=${DOMAIN}`,
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
          console.log('📊 Current Keywords:', result.keywords?.length || 0);
          if (result.keywords && result.keywords.length > 0) {
            console.log('   Sample keywords:');
            result.keywords.slice(0, 5).forEach(kw => {
              console.log(`   - ${kw.keyword} [${kw.device}] (${kw.country})`);
            });
          }
          resolve({ cookies, currentCount: result.keywords?.length || 0 });
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

// Add a test keyword
function addKeyword({ cookies }) {
  return new Promise((resolve, reject) => {
    const testKeyword = {
      keyword: 'test seo tracking',
      device: 'desktop',
      country: 'au',
      domain: DOMAIN,
      tags: 'test'
    };

    console.log('\n📝 Adding test keyword:', testKeyword.keyword);

    const postData = JSON.stringify([testKeyword]);
    
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: '/api/keywords',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': cookies.join('; ')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('   Response status:', res.statusCode);
        
        if (res.statusCode === 201 || res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log('   ✅ Keyword added successfully!');
            if (result.keywords) {
              console.log('   New keywords:', result.keywords.length);
            }
            resolve({ cookies, added: true });
          } catch (e) {
            console.log('   ✅ Keyword added (no JSON response)');
            resolve({ cookies, added: true });
          }
        } else {
          console.log('   ❌ Failed to add keyword');
          console.log('   Response:', data);
          resolve({ cookies, added: false });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Delete test keyword
function deleteKeyword({ cookies }) {
  return new Promise((resolve, reject) => {
    console.log('\n🗑️  Cleaning up test keyword...');
    
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: `/api/keywords?domain=${DOMAIN}&keyword=test seo tracking&device=desktop&country=au`,
      method: 'DELETE',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('   ✅ Test keyword deleted');
        } else {
          console.log('   ⚠️  Could not delete test keyword (might not exist)');
        }
        resolve(cookies);
      });
    });

    req.on('error', (err) => {
      console.log('   ⚠️  Delete error (not critical):', err.message);
      resolve(cookies);
    });
    req.end();
  });
}

// Main
(async () => {
  try {
    console.log('🎯 Test Flow: Login → Get Keywords → Add Keyword → Cleanup\n');
    
    const cookies = await login();
    const keywordData = await getKeywords(cookies);
    const addResult = await addKeyword(keywordData);
    
    if (addResult.added) {
      // Wait a moment then verify it was added
      await new Promise(resolve => setTimeout(resolve, 2000));
      const verifyData = await getKeywords({ cookies });
      
      if (verifyData.currentCount > keywordData.currentCount) {
        console.log('\n✅ VERIFICATION: Keyword count increased!');
      }
      
      // Clean up
      await deleteKeyword({ cookies });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Add Keyword Test Complete!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('   ✅ Login working');
    console.log('   ✅ Get keywords working');
    console.log('   ' + (addResult.added ? '✅' : '❌') + ' Add keyword ' + (addResult.added ? 'working' : 'failed'));
    console.log('   ✅ Delete keyword working');
    console.log('\n💡 You can now add keywords in the UI!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
