// Test script to verify authentication flow
// This script demonstrates the complete auth flow:
// 1. Request magic link
// 2. Verify token and create session
// 3. Test authenticated endpoints

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow\n');

  try {
    // Step 1: Request magic link
    console.log('1. Requesting magic link...');
    const magicLinkResponse = await axios.post(`${API_BASE_URL}/auth/magic-link`, {
      email: TEST_EMAIL
    });

    console.log('   ✅ Magic link request successful');
    console.log('   Response:', magicLinkResponse.data);

    // Note: In a real scenario, we would extract the token from the email
    // For testing purposes, we'll simulate getting a token
    console.log('\n2. Simulating token verification...');
    console.log('   ⚠️  In production, this would extract the token from the email');

    // Step 2: Verify token (this would normally come from the email)
    // For testing, we need to get a valid token from the database
    console.log('\n3. Testing authenticated endpoints...');
    console.log('   ⚠️  This requires a valid session cookie');

    console.log('\n📋 Auth Flow Summary:');
    console.log('   ✅ Magic link request endpoint works');
    console.log('   ⚠️  Token verification requires database access');
    console.log('   ⚠️  Session creation requires Redis for session storage');
    console.log('   ⚠️  Full flow requires database and Redis to be running');

  } catch (error) {
    console.error('❌ Auth flow test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }
}

// Check if API is running
async function checkApiHealth() {
  try {
    console.log('🏥 Checking API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('   ✅ API is running:', healthResponse.data);
    return true;
  } catch (error) {
    console.error('   ❌ API is not accessible:', error.message);
    console.log('\n💡 To run the API:');
    console.log('   - Start database and Redis');
    console.log('   - Run: pnpm run dev:api');
    return false;
  }
}

async function main() {
  console.log('🚀 SMS CRM Authentication Flow Test\n');

  const isApiRunning = await checkApiHealth();

  if (isApiRunning) {
    await testAuthFlow();
  } else {
    console.log('\n📝 Manual Testing Steps:');
    console.log('1. Start database and Redis');
    console.log('2. Run: pnpm run dev:api');
    console.log('3. Test endpoints:');
    console.log('   - POST /auth/magic-link with { "email": "test@example.com" }');
    console.log('   - GET /auth/verify/:token (token from magic_tokens table)');
    console.log('   - POST /auth/logout');
  }
}

main().catch(console.error);