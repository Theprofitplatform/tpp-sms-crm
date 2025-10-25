#!/usr/bin/env node
const https = require('https');

const SERPBEAR_URL = 'serpbear.theprofitplatform.com.au';
const USERNAME = 'admin';
const PASSWORD = 'coNNRIEIkVm6Ylq21xYlFJu9fIs=';

// Same credentials for all domains
const GSC_CREDENTIALS = {
  property_type: 'url',
  client_email: 'seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIdIRiFmJeNTFO\nz9UwDdW4XVz6OOkgm9iv2qSpyIv7d09unL0UsVqAba8fCXcdBGWlBI3yfO38YiGt\n1jiswS1MmZJxrd28TW/GpMOej69i8ttatNS8UTw7U9o9cI5GW1ZSsNFjszVUw2JR\nyh+1oAjA348gP6tYEOWfzrmDMuuDgz+SeOaoklIy24ZlevOfQ2SE27d8vfc2hK4I\nQFApke4kwqIBzacHXZghaHsATF1BASihP8ETUOeuCZDn7e9I2q3WlfdruC3fvP8U\nZHtoPgvXaeglViL7yirXTD0tlerIJU/muaJKdwxmcUgwwQpJCzMjfVGpdJYO6nXA\n3WqiULTtAgMBAAECggEABgQxQPxpAWjZTQNB48pWgs0SkFQK8zaaP1TxokLpqKeB\nE9HSfv9/tuET43uWPqG2J0jGteN4BR4w4pXOZ6j4ohbt5UmRoSg11aF2WZj4a6Dc\nYpGQ3QIXK7StlTB+pK/zHFJARpzHWf7vQYMuhnYCLT/IfPBMRT1klvJOcRijJvRI\n4KNvRQrlPKd68wiuZbRqMUy5zFBLACBNmMg7fUEcJsrwXE+otb02/OAjlBGZF4z8\nneRNLgLTc2N3YC6va/OuiUrbQeNg3kvQ7o3uEv5+L5J3oGEPHVZ9xg7ol5aQjwCE\nmh+c2cscLWtr0G2ypY+yrhQwDeUszE9zqUkqYFGy4QKBgQDxxz3sMvS/jz5Kfs+z\nOPgoWXEURnCBjXAC/JOx6ZVc8LgBsQ8VHr21spfym33VlTvTyRAMOduin1BYOlfL\nZfvUBOEbxtYw4+5oiYlABhGgmERkt9BTcr32vg0xModiOQuEQf9rZ68GcoOxQIfV\nrULyGa7I1B8eivd0IAgN95GjBQKBgQDUPwVenGDB8PVlOJRrbZtKAJvSD2BrlaY1\ngulcl6DCrAaSW2n4rGBHJ7zSSl0mj8dkWQr+3NdXQA9o4NtMzLtjIMj1k57dI82l\nuK+uUET+TgdLGA6ICGIWF9sjmlY5vvwsY8GBiaKsu6BhukaZ1Fn83r7E8146Bc3J\nsvJMdzK+yQKBgEKgcUQB1shjJPtKbtoovNoBq9O2hZJt84wfJmRExlBSVaLBtDJR\nwl2r1YuZpdeRxGbcZXu5BfmOhYmKql72v6rxnUcWSDg4154fKJ9oDLuAung230Xf\nvNGeFeyUzBIZPj84ILbsX6MbM4dJDSWpFWW6Bhx5uAmmqgJqQU34Bz4xAoGBANBh\nG017LIfcoaECPr2GO/sYw+Mlk52srCVHZQOyHnRiXoVc2Jr76f6SJhE0T2YnrTR5\nM5FrksQnsblfYg9xxdwZ+RMaHtOwbhvxShJS3pnqU8DHWqT1zg8w1saKpXNGbeDL\nA9XBIoSCJYEtWFl5IexhaFyHL5C52APZ+4dVU+35AoGASCUkOQ1G9C3/UsA2mNmU\n2h3z5s7ZXnbafIHqXhvpM7B/AmfH7ZtTgDl/wLnggzpj9i+t4GSYo1BYSsy2/lwY\ndWr1B+qu529+KHqrlDoteYHgg8FiZYSwTqSGlwaIGP+MX/0JPWJbN0FX/hUp3L6K\nEi51QsUO8+HgPVlSYMq0QyE=\n-----END PRIVATE KEY-----'
};

// Domains to configure
const DOMAINS_TO_CONFIGURE = [
  'www.hottyres.com.au',
  'theprofitplatform.com.au',
  'freedomactivewear.com.au',
  'sadcdisabilityservices.com.au'
];

console.log('🔧 Configuring GSC for all domains...\n');

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

// Update domain with GSC settings
function updateDomain(cookies, domain) {
  return new Promise((resolve, reject) => {
    const domainUrl = domain.startsWith('www.') ? 
      `https://${domain}/` : 
      `https://${domain}/`;
    
    const searchConsoleSettings = {
      ...GSC_CREDENTIALS,
      url: domainUrl
    };

    const updateData = {
      search_console: searchConsoleSettings
    };

    console.log(`📝 Configuring ${domain}...`);
    console.log(`   URL: ${domainUrl}`);

    const postData = JSON.stringify(updateData);
    
    const options = {
      hostname: SERPBEAR_URL,
      port: 443,
      path: `/api/domains?domain=${domain}`,
      method: 'PUT',
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
        if (res.statusCode === 200) {
          console.log(`   ✅ ${domain} configured!\n`);
          resolve({ domain, success: true });
        } else {
          console.log(`   ❌ ${domain} failed: ${res.statusCode}`);
          console.log(`   Response: ${data}\n`);
          resolve({ domain, success: false, error: data });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ ${domain} error: ${err.message}\n`);
      resolve({ domain, success: false, error: err.message });
    });
    req.write(postData);
    req.end();
  });
}

// Main
(async () => {
  try {
    console.log('🔑 Logging in...');
    const cookies = await login();
    console.log('✅ Logged in\n');
    
    console.log('📋 Will configure', DOMAINS_TO_CONFIGURE.length, 'domains\n');
    console.log('='.repeat(70));
    
    const results = [];
    
    for (const domain of DOMAINS_TO_CONFIGURE) {
      const result = await updateDomain(cookies, domain);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    }
    
    console.log('='.repeat(70));
    console.log('\n📊 Configuration Summary:\n');
    
    const success = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Configured: ${success.length}`);
    success.forEach(r => console.log(`   - ${r.domain}`));
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}`);
      failed.forEach(r => console.log(`   - ${r.domain}`));
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n⚠️ IMPORTANT: Make sure to add the service account to each GSC property!');
    console.log('\nService Account Email:');
    console.log('   seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com');
    console.log('\nFor each domain:');
    console.log('   1. Go to Google Search Console');
    console.log('   2. Select the URL property (https://domain.com/)');
    console.log('   3. Settings → Users and permissions');
    console.log('   4. Add user with Owner permission');
    console.log('\n💡 Then run: node trigger-gsc-refresh-all.cjs');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
