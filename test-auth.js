#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './config/env/.env' });

const WP_URL = process.env.WORDPRESS_URL;
const WP_USER = process.env.WORDPRESS_USER;
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;
const BASE_AUTH = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

console.log('\n🔐 Testing WordPress API Authentication...\n');
console.log(`URL: ${WP_URL}`);
console.log(`User: ${WP_USER}`);
console.log(`Password: ${WP_APP_PASSWORD ? '***' + WP_APP_PASSWORD.slice(-4) : 'NOT SET'}\n`);

async function testAuth() {
  try {
    // Test 1: Read access
    console.log('Test 1: Read Access (GET /wp-json/wp/v2/posts)');
    const readResponse = await axios.get(`${WP_URL}/wp-json/wp/v2/posts`, {
      headers: {
        'Authorization': `Basic ${BASE_AUTH}`
      },
      params: { per_page: 1 }
    });
    console.log(`✅ READ Access: Success (Status ${readResponse.status})\n`);

    // Test 2: Write access - try to get a post with edit context
    console.log('Test 2: Edit Context Access (GET /wp-json/wp/v2/posts?context=edit)');
    const editContextResponse = await axios.get(`${WP_URL}/wp-json/wp/v2/posts`, {
      headers: {
        'Authorization': `Basic ${BASE_AUTH}`
      },
      params: { per_page: 1, context: 'edit' }
    });
    console.log(`✅ EDIT Context: Success (Status ${editContextResponse.status})\n`);

    // Test 3: Get current user info
    console.log('Test 3: Current User Info (GET /wp-json/wp/v2/users/me)');
    const userResponse = await axios.get(`${WP_URL}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Basic ${BASE_AUTH}`
      }
    });
    console.log(`✅ User Info Retrieved:`);
    console.log(`   Name: ${userResponse.data.name}`);
    console.log(`   Username: ${userResponse.data.slug}`);
    console.log(`   Roles: ${userResponse.data.roles.join(', ')}`);
    console.log(`   Capabilities: ${Object.keys(userResponse.data.capabilities || {}).slice(0, 5).join(', ')}...\n`);

    // Check if user can edit posts
    const canEdit = userResponse.data.capabilities?.edit_posts ||
                    userResponse.data.capabilities?.edit_published_posts;

    if (canEdit) {
      console.log('✅ User HAS edit permissions\n');

      // Test 4: Try actual update
      console.log('Test 4: Try to Update a Post');
      const postId = readResponse.data[0].id;
      const currentTitle = readResponse.data[0].title.rendered;
      console.log(`   Post ID: ${postId}`);
      console.log(`   Current Title: ${currentTitle}`);

      // Try to update (just change title slightly)
      try {
        await axios.put(
          `${WP_URL}/wp-json/wp/v2/posts/${postId}`,
          { title: currentTitle }, // Same title, no actual change
          {
            headers: {
              'Authorization': `Basic ${BASE_AUTH}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`✅ UPDATE Test: Success!\n`);
        console.log('═══════════════════════════════════════');
        console.log('🎉 ALL TESTS PASSED!');
        console.log('   Your automation scripts should work now.');
        console.log('═══════════════════════════════════════\n');
      } catch (updateError) {
        console.log(`❌ UPDATE Test Failed: ${updateError.response?.status} ${updateError.message}\n`);
        console.log('⚠️  You can READ but cannot WRITE');
        console.log('   User permissions may still need adjustment');
      }
    } else {
      console.log('❌ User DOES NOT have edit permissions\n');
      console.log('📝 ACTION REQUIRED:');
      console.log('   1. Go to WordPress Admin → Users');
      console.log('   2. Edit user "Claude"');
      console.log('   3. Change role to "Editor" or "Administrator"');
      console.log('   4. Save and re-run this test\n');
    }

  } catch (error) {
    console.error('❌ Authentication Test Failed:\n');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.message}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.error('\n📝 Possible Issues:');
    console.error('   1. App password is incorrect or expired');
    console.error("   2. User account doesn't exist or is disabled");
    console.error('   3. WordPress REST API is disabled');
    console.error('   4. Special characters in password not properly escaped\n');
  }
}

testAuth();
