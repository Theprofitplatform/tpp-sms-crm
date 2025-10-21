#!/usr/bin/env node

// Quick single client test
const axios = require('axios');
const dotenv = require('dotenv');

const clientId = process.argv[2] || 'hottyres';

// Load client .env file
dotenv.config({ path: `clients/${clientId}.env` });

const url = process.env.WORDPRESS_URL;
const user = process.env.WORDPRESS_USER;
const password = process.env.WORDPRESS_APP_PASSWORD;

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Testing: ${clientId}`);
console.log(`URL: ${url}`);
console.log(`User: ${user}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

if (!password || password.includes('xxxx')) {
  console.log('❌ No valid password configured');
  console.log(`   Edit: clients/${clientId}.env`);
  console.log(`   Add: WORDPRESS_APP_PASSWORD=your_real_password\n`);
  process.exit(1);
}

// Test WordPress REST API
axios.get(`${url}/wp-json/wp/v2/posts?per_page=1`, {
  auth: { username: user, password: password }
})
.then(response => {
  console.log('✅ Authentication successful!');
  console.log(`✅ WordPress REST API accessible`);
  console.log(`✅ User "${user}" has proper permissions\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ ${clientId} is ready for automation!\n`);
})
.catch(error => {
  console.log('❌ Authentication failed');

  if (error.response) {
    console.log(`   Status: ${error.response.status}`);
    console.log(`   Message: ${error.response.statusText}`);

    if (error.response.status === 401) {
      console.log('\n   Possible issues:');
      console.log('   - Password is incorrect');
      console.log('   - Username is wrong');
      console.log('   - Application Passwords not enabled');
    }
  } else if (error.code === 'ENOTFOUND') {
    console.log(`   Error: Cannot reach ${url}`);
    console.log('   Check the WORDPRESS_URL is correct');
  } else {
    console.log(`   Error: ${error.message}`);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  process.exit(1);
});
