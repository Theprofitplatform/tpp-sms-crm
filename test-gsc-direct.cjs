#!/usr/bin/env node
const { auth, searchconsole_v1 } = require('@googleapis/searchconsole');

const credentials = {
  "type": "service_account",
  "project_id": "robotic-goal-456009-r2",
  "private_key_id": "6dd460ff8327709eac4810b55e6a2d4f5a6ec17b",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIdIRiFmJeNTFO\nz9UwDdW4XVz6OOkgm9iv2qSpyIv7d09unL0UsVqAba8fCXcdBGWlBI3yfO38YiGt\n1jiswS1MmZJxrd28TW/GpMOej69i8ttatNS8UTw7U9o9cI5GW1ZSsNFjszVUw2JR\nyh+1oAjA348gP6tYEOWfzrmDMuuDgz+SeOaoklIy24ZlevOfQ2SE27d8vfc2hK4I\nQFApke4kwqIBzacHXZghaHsATF1BASihP8ETUOeuCZDn7e9I2q3WlfdruC3fvP8U\nZHtoPgvXaeglViL7yirXTD0tlerIJU/muaJKdwxmcUgwwQpJCzMjfVGpdJYO6nXA\n3WqiULTtAgMBAAECggEABgQxQPxpAWjZTQNB48pWgs0SkFQK8zaaP1TxokLpqKeB\nE9HSfv9/tuET43uWPqG2J0jGteN4BR4w4pXOZ6j4ohbt5UmRoSg11aF2WZj4a6Dc\nYpGQ3QIXK7StlTB+pK/zHFJARpzHWf7vQYMuhnYCLT/IfPBMRT1klvJOcRijJvRI\n4KNvRQrlPKd68wiuZbRqMUy5zFBLACBNmMg7fUEcJsrwXE+otb02/OAjlBGZF4z8\nneRNLgLTc2N3YC6va/OuiUrbQeNg3kvQ7o3uEv5+L5J3oGEPHVZ9xg7ol5aQjwCE\nmh+c2cscLWtr0G2ypY+yrhQwDeUszE9zqUkqYFGy4QKBgQDxxz3sMvS/jz5Kfs+z\nOPgoWXEURnCBjXAC/JOx6ZVc8LgBsQ8VHr21spfym33VlTvTyRAMOduin1BYOlfL\nZfvUBOEbxtYw4+5oiYlABhGgmERkt9BTcr32vg0xModiOQuEQf9rZ68GcoOxQIfV\nrULyGa7I1B8eivd0IAgN95GjBQKBgQDUPwVenGDB8PVlOJRrbZtKAJvSD2BrlaY1\ngulcl6DCrAaSW2n4rGBHJ7zSSl0mj8dkWQr+3NdXQA9o4NtMzLtjIMj1k57dI82l\nuK+uUET+TgdLGA6ICGIWF9sjmlY5vvwsY8GBiaKsu6BhukaZ1Fn83r7E8146Bc3J\nsvJMdzK+yQKBgEKgcUQB1shjJPtKbtoovNoBq9O2hZJt84wfJmRExlBSVaLBtDJR\nwl2r1YuZpdeRxGbcZXu5BfmOhYmKql72v6rxnUcWSDg4154fKJ9oDLuAung230Xf\nvNGeFeyUzBIZPj84ILbsX6MbM4dJDSWpFWW6Bhx5uAmmqgJqQU34Bz4xAoGBANBh\nG017LIfcoaECPr2GO/sYw+Mlk52srCVHZQOyHnRiXoVc2Jr76f6SJhE0T2YnrTR5\nM5FrksQnsblfYg9xxdwZ+RMaHtOwbhvxShJS3pnqU8DHWqT1zg8w1saKpXNGbeDL\nA9XBIoSCJYEtWFl5IexhaFyHL5C52APZ+4dVU+35AoGASCUkOQ1G9C3/UsA2mNmU\n2h3z5s7ZXnbafIHqXhvpM7B/AmfH7ZtTgDl/wLnggzpj9i+t4GSYo1BYSsy2/lwY\ndWr1B+qu529+KHqrlDoteYHgg8FiZYSwTqSGlwaIGP+MX/0JPWJbN0FX/hUp3L6K\nEi51QsUO8+HgPVlSYMq0QyE=\n-----END PRIVATE KEY-----\n",
  "client_email": "seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com",
  "client_id": "114167545797559757704"
};

const domainName = 'instantautotraders.com.au';

console.log('🧪 Testing Google Search Console API directly...\n');
console.log('Node version:', process.version);
console.log('Client email:', credentials.client_email);
console.log('Private key length:', credentials.private_key.length);
console.log('Domain:', domainName);
console.log('\n---\n');

async function testGSC() {
  try {
    console.log('1️⃣ Creating auth client...');
    const authClient = new auth.GoogleAuth({
      credentials: {
        private_key: credentials.private_key,
        client_email: credentials.client_email,
      },
      scopes: [
        'https://www.googleapis.com/auth/webmasters.readonly',
      ],
    });
    console.log('✅ Auth client created');

    console.log('\n2️⃣ Creating Search Console client...');
    const client = new searchconsole_v1.Searchconsole({ auth: authClient });
    console.log('✅ Client created');

    console.log('\n3️⃣ Fetching data from API...');
    const today = new Date();
    const threeDaysAgo = new Date(today.setDate(today.getDate() - 3));
    
    const padDate = (num) => String(num).padStart(2, '0');
    const startDate = `${threeDaysAgo.getFullYear()}-${padDate(threeDaysAgo.getMonth() + 1)}-${padDate(threeDaysAgo.getDate())}`;
    const endDate = new Date().toISOString().split('T')[0];

    console.log(`   Date range: ${startDate} to ${endDate}`);

    // Try URL property instead of domain property
    const siteUrl = `https://${domainName}/`;
    console.log(`   Site URL: ${siteUrl}`);

    const requestBody = {
      startDate,
      endDate,
      type: 'web',
      rowLimit: 10,
      dataState: 'all',
      dimensions: ['query'],
    };

    const res = await client.searchanalytics.query({ siteUrl, requestBody });
    
    console.log('\n✅ SUCCESS! Got response from Google Search Console:');
    console.log('   Rows returned:', res.data.rows ? res.data.rows.length : 0);
    
    if (res.data.rows && res.data.rows.length > 0) {
      console.log('\n📊 Sample data (first 5 queries):');
      res.data.rows.slice(0, 5).forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.keys[0]}`);
        console.log(`      Clicks: ${row.clicks}, Impressions: ${row.impressions}, Position: ${row.position.toFixed(1)}`);
      });
    }

    console.log('\n🎉 GSC API is working! The credentials are valid!\n');
    return true;

  } catch (err) {
    console.log('\n❌ ERROR occurred:');
    console.log('   Error code:', err.code);
    console.log('   Error message:', err.message);
    
    if (err.response) {
      console.log('   HTTP Status:', err.response.status);
      console.log('   Response:', err.response.statusText);
    }
    
    console.log('\nFull error:');
    console.log(err);
    
    return false;
  }
}

testGSC().then(success => {
  if (success) {
    console.log('✅ Test PASSED - Credentials work perfectly!');
    process.exit(0);
  } else {
    console.log('❌ Test FAILED - There is an issue with the credentials or permissions');
    process.exit(1);
  }
});
