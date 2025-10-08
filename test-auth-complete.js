// Complete authentication flow test
// This script tests the entire auth flow including database operations

const { db, schema } = require('./packages/lib/dist/index.js');
const { eq } = require('drizzle-orm');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_TENANT_NAME = 'Test Tenant';

async function setupTestData() {
  console.log('🗄️  Setting up test data...');

  try {
    // Create test tenant
    const [tenant] = await db.insert(schema.tenants)
      .values({
        name: TEST_TENANT_NAME,
        timezone: 'Australia/Sydney'
      })
      .returning();

    console.log('   ✅ Created test tenant:', tenant.id);

    // Create test user
    const [user] = await db.insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: TEST_EMAIL,
        role: 'admin',
        isActive: true
      })
      .returning();

    console.log('   ✅ Created test user:', user.id);

    return { tenant, user };
  } catch (error) {
    console.error('   ❌ Failed to setup test data:', error.message);
    throw error;
  }
}

async function testMagicLinkRequest() {
  console.log('\n1. Testing magic link request...');

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/magic-link`, {
      email: TEST_EMAIL
    });

    console.log('   ✅ Magic link request successful');
    console.log('   Response:', response.data);

    // Check if token was created in database
    const tokens = await db.select()
      .from(schema.magicTokens)
      .where(eq(schema.magicTokens.userId, (await db.select().from(schema.users).where(eq(schema.users.email, TEST_EMAIL)).limit(1))[0].id));

    if (tokens.length > 0) {
      console.log('   ✅ Magic token created in database');
      return tokens[0];
    } else {
      console.log('   ⚠️  No magic token found in database');
      return null;
    }
  } catch (error) {
    console.error('   ❌ Magic link request failed:', error.message);
    throw error;
  }
}

async function testTokenVerification(token) {
  console.log('\n2. Testing token verification...');

  if (!token) {
    console.log('   ⚠️  No token available for verification');
    return null;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/auth/verify/${token.token}`);

    console.log('   ✅ Token verification successful');
    console.log('   Response:', response.data);

    // Check if session cookie was set
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.some(cookie => cookie.includes('session'))) {
      console.log('   ✅ Session cookie set');
    } else {
      console.log('   ⚠️  No session cookie found');
    }

    return response;
  } catch (error) {
    console.error('   ❌ Token verification failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return null;
  }
}

async function testAuthenticatedEndpoint(sessionCookie) {
  console.log('\n3. Testing authenticated endpoint...');

  if (!sessionCookie) {
    console.log('   ⚠️  No session cookie available');
    return;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/campaigns`, {
      headers: {
        Cookie: sessionCookie
      }
    });

    console.log('   ✅ Authenticated endpoint access successful');
    console.log('   Response status:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('   ❌ Authentication failed - 401 Unauthorized');
    } else {
      console.error('   ❌ Authenticated endpoint test failed:', error.message);
    }
  }
}

async function testLogout(sessionCookie) {
  console.log('\n4. Testing logout...');

  if (!sessionCookie) {
    console.log('   ⚠️  No session cookie available');
    return;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
      headers: {
        Cookie: sessionCookie
      }
    });

    console.log('   ✅ Logout successful');
    console.log('   Response:', response.data);
  } catch (error) {
    console.error('   ❌ Logout failed:', error.message);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  try {
    // Delete test user
    await db.delete(schema.users)
      .where(eq(schema.users.email, TEST_EMAIL));

    // Delete test tenant
    await db.delete(schema.tenants)
      .where(eq(schema.tenants.name, TEST_TENANT_NAME));

    console.log('   ✅ Test data cleaned up');
  } catch (error) {
    console.error('   ❌ Cleanup failed:', error.message);
  }
}

async function main() {
  console.log('🔐 SMS CRM Complete Authentication Flow Test\n');

  try {
    // Setup test data
    await setupTestData();

    // Test magic link request
    const token = await testMagicLinkRequest();

    // Test token verification
    const verifyResponse = await testTokenVerification(token);

    // Extract session cookie
    let sessionCookie = null;
    if (verifyResponse && verifyResponse.headers['set-cookie']) {
      sessionCookie = verifyResponse.headers['set-cookie'].find(cookie =>
        cookie.includes('session')
      );
    }

    // Test authenticated endpoint
    await testAuthenticatedEndpoint(sessionCookie);

    // Test logout
    await testLogout(sessionCookie);

    console.log('\n🎉 Authentication flow test completed successfully!');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  } finally {
    // Cleanup
    await cleanupTestData();
  }
}

main().catch(console.error);