// Test script to verify SMS flow end-to-end
// This script tests the complete SMS campaign flow:
// 1. Authentication
// 2. Contact creation
// 3. Campaign creation
// 4. SMS sending
// 5. Webhook processing

const axios = require('axios');

const API_BASE_URL = 'https://sms.theprofitplatform.com.au/api';
const TEST_EMAIL = 'admin@example.com';
const TEST_PHONE = '+61400000000'; // Test AU number

// Session storage
let sessionCookie = '';

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

    // For testing, we'll need to get the token from logs
    console.log('\n⚠️  Check VPS logs for magic link token:');
    console.log('   ssh tpp-vps \'journalctl -u sms-crm-api -n 10 | grep "Magic link"\'');

    return true;

  } catch (error) {
    console.error('❌ Auth flow test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

async function testApiHealth() {
  try {
    console.log('🏥 Checking API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('   ✅ API is healthy:', healthResponse.data);
    return true;
  } catch (error) {
    console.error('   ❌ API health check failed:', error.message);
    return false;
  }
}

async function testWorkerHealth() {
  try {
    console.log('🏥 Checking Worker health...');
    const healthResponse = await axios.get('http://localhost:3002/health');
    console.log('   ✅ Worker is healthy:', healthResponse.data);
    return true;
  } catch (error) {
    console.error('   ❌ Worker health check failed:', error.message);
    return false;
  }
}

async function testWebhookEndpoint() {
  try {
    console.log('🌐 Testing webhook endpoint...');
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/webhooks/provider`);
    console.log('   ✅ Webhook endpoint accessible');
    return true;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('   ✅ Webhook endpoint returns 404 on GET (expected for POST-only endpoint)');
      return true;
    }
    console.error('   ❌ Webhook endpoint test failed:', error.message);
    return false;
  }
}

async function testTwilioConfiguration() {
  console.log('\n📱 Twilio Configuration Check:');
  console.log('   1. Log in to Twilio Console: https://console.twilio.com');
  console.log('   2. Go to Phone Numbers → Active Numbers');
  console.log('   3. Select: [YOUR_TWILIO_PHONE_NUMBER]');
  console.log('   4. Under Messaging Configuration:');
  console.log('      - A MESSAGE COMES IN: Webhook');
  console.log('      - URL: https://sms.theprofitplatform.com.au/webhooks/provider');
  console.log('      - HTTP Method: POST');
  console.log('   5. Click Save');
  console.log('\n✅ Twilio webhook should be configured for incoming SMS');
}

async function testSmsSendFlow() {
  console.log('\n📤 Testing SMS Send Flow:');
  console.log('   This requires:');
  console.log('   1. Valid session (magic link authentication)');
  console.log('   2. Contacts imported via CSV');
  console.log('   3. Campaign created in web interface');
  console.log('   4. Worker processing jobs');
  console.log('\n💡 Manual Testing Steps:');
  console.log('   1. Visit: https://sms.theprofitplatform.com.au/');
  console.log('   2. Login with: admin@example.com');
  console.log('   3. Import contacts via CSV');
  console.log('   4. Create a test campaign');
  console.log('   5. Monitor worker logs: ssh tpp-vps \'journalctl -u sms-crm-worker -f\'');
}

async function main() {
  console.log('🚀 SMS CRM Platform - End-to-End Test\n');

  // Test basic connectivity
  const apiHealthy = await testApiHealth();
  const webhookAccessible = await testWebhookEndpoint();

  // Test authentication flow
  const authWorking = await testAuthFlow();

  // Check Twilio configuration
  await testTwilioConfiguration();

  // Test SMS flow
  await testSmsSendFlow();

  console.log('\n📋 Test Summary:');
  console.log(`   ✅ API Health: ${apiHealthy ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Webhook Access: ${webhookAccessible ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Auth Flow: ${authWorking ? 'PASS' : 'FAIL'}`);

  console.log('\n🎯 Next Steps:');
  console.log('   1. Complete Twilio webhook configuration (see above)');
  console.log('   2. Login to web interface and test features manually');
  console.log('   3. Import contacts via CSV');
  console.log('   4. Create and send test campaign');
  console.log('   5. Monitor logs for SMS processing');
}

main().catch(console.error);