#!/usr/bin/env node
const { auth, searchconsole_v1 } = require('@googleapis/searchconsole');

const credentials = {
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIdIRiFmJeNTFO\nz9UwDdW4XVz6OOkgm9iv2qSpyIv7d09unL0UsVqAba8fCXcdBGWlBI3yfO38YiGt\n1jiswS1MmZJxrd28TW/GpMOej69i8ttatNS8UTw7U9o9cI5GW1ZSsNFjszVUw2JR\nyh+1oAjA348gP6tYEOWfzrmDMuuDgz+SeOaoklIy24ZlevOfQ2SE27d8vfc2hK4I\nQFApke4kwqIBzacHXZghaHsATF1BASihP8ETUOeuCZDn7e9I2q3WlfdruC3fvP8U\nZHtoPgvXaeglViL7yirXTD0tlerIJU/muaJKdwxmcUgwwQpJCzMjfVGpdJYO6nXA\n3WqiULTtAgMBAAECggEABgQxQPxpAWjZTQNB48pWgs0SkFQK8zaaP1TxokLpqKeB\nE9HSfv9/tuET43uWPqG2J0jGteN4BR4w4pXOZ6j4ohbt5UmRoSg11aF2WZj4a6Dc\nYpGQ3QIXK7StlTB+pK/zHFJARpzHWf7vQYMuhnYCLT/IfPBMRT1klvJOcRijJvRI\n4KNvRQrlPKd68wiuZbRqMUy5zFBLACBNmMg7fUEcJsrwXE+otb02/OAjlBGZF4z8\nneRNLgLTc2N3YC6va/OuiUrbQeNg3kvQ7o3uEv5+L5J3oGEPHVZ9xg7ol5aQjwCE\nmh+c2cscLWtr0G2ypY+yrhQwDeUszE9zqUkqYFGy4QKBgQDxxz3sMvS/jz5Kfs+z\nOPgoWXEURnCBjXAC/JOx6ZVc8LgBsQ8VHr21spfym33VlTvTyRAMOduin1BYOlfL\nZfvUBOEbxtYw4+5oiYlABhGgmERkt9BTcr32vg0xModiOQuEQf9rZ68GcoOxQIfV\nrULyGa7I1B8eivd0IAgN95GjBQKBgQDUPwVenGDB8PVlOJRrbZtKAJvSD2BrlaY1\ngulcl6DCrAaSW2n4rGBHJ7zSSl0mj8dkWQr+3NdXQA9o4NtMzLtjIMj1k57dI82l\nuK+uUET+TgdLGA6ICGIWF9sjmlY5vvwsY8GBiaKsu6BhukaZ1Fn83r7E8146Bc3J\nsvJMdzK+yQKBgEKgcUQB1shjJPtKbtoovNoBq9O2hZJt84wfJmRExlBSVaLBtDJR\nwl2r1YuZpdeRxGbcZXu5BfmOhYmKql72v6rxnUcWSDg4154fKJ9oDLuAung230Xf\nvNGeFeyUzBIZPj84ILbsX6MbM4dJDSWpFWW6Bhx5uAmmqgJqQU34Bz4xAoGBANBh\nG017LIfcoaECPr2GO/sYw+Mlk52srCVHZQOyHnRiXoVc2Jr76f6SJhE0T2YnrTR5\nM5FrksQnsblfYg9xxdwZ+RMaHtOwbhvxShJS3pnqU8DHWqT1zg8w1saKpXNGbeDL\nA9XBIoSCJYEtWFl5IexhaFyHL5C52APZ+4dVU+35AoGASCUkOQ1G9C3/UsA2mNmU\n2h3z5s7ZXnbafIHqXhvpM7B/AmfH7ZtTgDl/wLnggzpj9i+t4GSYo1BYSsy2/lwY\ndWr1B+qu529+KHqrlDoteYHgg8FiZYSwTqSGlwaIGP+MX/0JPWJbN0FX/hUp3L6K\nEi51QsUO8+HgPVlSYMq0QyE=\n-----END PRIVATE KEY-----',
  client_email: 'seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com'
};

const domains = [
  'instantautotraders.com.au',
  'www.hottyres.com.au',
  'theprofitplatform.com.au',
  'freedomactivewear.com.au',
  'sadcdisabilityservices.com.au'
];

console.log('🧪 Testing GSC Access for All Domains\n');
console.log('Service Account:', credentials.client_email);
console.log('='.repeat(70), '\n');

async function testDomain(domain) {
  try {
    const authClient = new auth.GoogleAuth({
      credentials: {
        private_key: credentials.private_key,
        client_email: credentials.client_email,
      },
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const client = new searchconsole_v1.Searchconsole({ auth: authClient });
    
    const today = new Date();
    const threeDaysAgo = new Date(today.setDate(today.getDate() - 3));
    const padDate = (num) => String(num).padStart(2, '0');
    const startDate = `${threeDaysAgo.getFullYear()}-${padDate(threeDaysAgo.getMonth() + 1)}-${padDate(threeDaysAgo.getDate())}`;
    const endDate = new Date().toISOString().split('T')[0];

    // Try URL property
    const siteUrl = `https://${domain}/`;
    
    const requestBody = {
      startDate,
      endDate,
      type: 'web',
      rowLimit: 5,
      dataState: 'all',
      dimensions: ['query'],
    };

    console.log(`📍 ${domain}`);
    console.log(`   Testing: ${siteUrl}`);
    
    const res = await client.searchanalytics.query({ siteUrl, requestBody });
    
    if (res.data.rows && res.data.rows.length > 0) {
      console.log(`   ✅ ACCESS GRANTED - ${res.data.rows.length} keywords found`);
      console.log(`   Sample: ${res.data.rows[0].keys[0]}`);
    } else {
      console.log(`   ✅ ACCESS GRANTED - No data yet (property might be new)`);
    }
    
    return { domain, success: true, keywords: res.data.rows?.length || 0 };
    
  } catch (err) {
    console.log(`   ❌ ACCESS DENIED`);
    console.log(`   Error: ${err.code} - ${err.message}`);
    if (err.code === 403) {
      console.log(`   → Service account NOT added to this GSC property`);
    }
    return { domain, success: false, error: err.code };
  }
}

(async () => {
  const results = [];
  
  for (const domain of domains) {
    const result = await testDomain(domain);
    results.push(result);
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('='.repeat(70));
  console.log('\n📊 Summary:\n');
  
  const accessible = results.filter(r => r.success);
  const blocked = results.filter(r => !r.success);
  
  console.log(`✅ Accessible (${accessible.length}):`);
  accessible.forEach(r => console.log(`   - ${r.domain} (${r.keywords} keywords)`));
  
  console.log(`\n❌ Not Accessible (${blocked.length}):`);
  blocked.forEach(r => console.log(`   - ${r.domain}`));
  
  if (blocked.length > 0) {
    console.log('\n💡 To grant access:');
    console.log('   1. Go to https://search.google.com/search-console');
    console.log('   2. For each blocked domain, select the URL property');
    console.log('   3. Settings → Users and permissions');
    console.log('   4. Add user:', credentials.client_email);
    console.log('   5. Permission: Owner');
  }
  
  console.log('');
})();
