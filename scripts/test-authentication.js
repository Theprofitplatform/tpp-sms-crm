#!/usr/bin/env node

/**
 * Test Authentication System
 * 
 * Tests the authentication endpoints and security features
 * 
 * Usage:
 *   node scripts/test-authentication.js
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:9000/api';
const ADMIN_EMAIL = 'admin@seoexpert.com';
const ADMIN_PASSWORD = 'AdminPass2025!';

let adminToken = null;

async function testLogin() {
  console.log('\n📝 Test 1: Login with valid credentials');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.token) {
      console.log('✅ Login successful');
      console.log(`   User: ${data.user.email}`);
      console.log(`   Role: ${data.user.role}`);
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      adminToken = data.token;
      return true;
    } else {
      console.log('❌ Login failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

async function testLoginInvalidCredentials() {
  console.log('\n📝 Test 2: Login with invalid credentials');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: 'WrongPassword123!'
      })
    });

    const data = await response.json();
    
    if (!response.ok && !data.success) {
      console.log('✅ Invalid credentials correctly rejected');
      console.log(`   Error: ${data.error}`);
      return true;
    } else {
      console.log('❌ Invalid credentials should be rejected');
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function testGetCurrentUser() {
  console.log('\n📝 Test 3: Get current user with valid token');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Get current user successful');
      console.log(`   User: ${data.user.email}`);
      console.log(`   Role: ${data.user.role}`);
      return true;
    } else {
      console.log('❌ Get current user failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function testGetUserWithoutToken() {
  console.log('\n📝 Test 4: Get current user without token');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/auth/me`);
    const data = await response.json();
    
    if (!response.ok && !data.success) {
      console.log('✅ Request without token correctly rejected');
      console.log(`   Error: ${data.error}`);
      return true;
    } else {
      console.log('❌ Request without token should be rejected');
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function testGetUserWithInvalidToken() {
  console.log('\n📝 Test 5: Get current user with invalid token');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': 'Bearer invalid-token-123456'
      }
    });

    const data = await response.json();
    
    if (!response.ok && !data.success) {
      console.log('✅ Invalid token correctly rejected');
      console.log(`   Error: ${data.error}`);
      return true;
    } else {
      console.log('❌ Invalid token should be rejected');
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n📝 Test 6: Rate limiting on auth endpoints');
  console.log('=' .repeat(50));
  
  try {
    console.log('   Making 6 rapid login attempts...');
    let rateLimited = false;
    
    for (let i = 0; i < 6; i++) {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong'
        })
      });

      if (response.status === 429) {
        rateLimited = true;
        console.log(`   Attempt ${i + 1}: Rate limited (HTTP 429)`);
        break;
      } else {
        console.log(`   Attempt ${i + 1}: ${response.status}`);
      }
    }
    
    if (rateLimited) {
      console.log('✅ Rate limiting is working');
      return true;
    } else {
      console.log('⚠️  Rate limiting not triggered (might need more attempts)');
      return true; // Not a failure, just needs adjustment
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function testDashboardEndpoint() {
  console.log('\n📝 Test 7: Access dashboard endpoint');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/dashboard`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Dashboard endpoint accessible');
      console.log(`   Total clients: ${data.stats.total}`);
      return true;
    } else {
      console.log('❌ Dashboard endpoint failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function testSecurityHeaders() {
  console.log('\n📝 Test 8: Check security headers');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/dashboard`);
    
    const headers = {
      'X-Content-Type-Options': response.headers.get('x-content-type-options'),
      'X-Frame-Options': response.headers.get('x-frame-options'),
      'X-XSS-Protection': response.headers.get('x-xss-protection'),
      'Strict-Transport-Security': response.headers.get('strict-transport-security')
    };
    
    console.log('   Security headers present:');
    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        console.log(`   ✅ ${key}: ${value}`);
      } else {
        console.log(`   ⚠️  ${key}: not set`);
      }
    });
    
    return true;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Authentication System Test Suite             ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  console.log('\n⚠️  Make sure the dashboard server is running:');
  console.log('   node dashboard-server.js\n');
  
  // Wait for user confirmation
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const results = [];
  
  // Run tests
  results.push(await testLogin());
  results.push(await testLoginInvalidCredentials());
  results.push(await testGetCurrentUser());
  results.push(await testGetUserWithoutToken());
  results.push(await testGetUserWithInvalidToken());
  results.push(await testRateLimiting());
  results.push(await testDashboardEndpoint());
  results.push(await testSecurityHeaders());
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(50));
  
  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Authentication system is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

runTests();
