#!/usr/bin/env node
/**
 * Test Cloudflare Functions Deployment
 * Verifies all APIs are working with real GSC data
 */

const baseUrl = process.argv[2] || 'https://seo-reports-4d9.pages.dev';
const testSite = 'https://instantautotraders.com.au';

console.log('\n🧪 Testing Cloudflare Functions Deployment\n');
console.log(`Base URL: ${baseUrl}\n`);
console.log('=' .repeat(60));

const tests = [];
let passed = 0;
let failed = 0;

async function testEndpoint(name, url, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : undefined;

  console.log(`\n📝 Testing: ${name}`);
  console.log(`   ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`   ❌ HTTP ${response.status}`);
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      failed++;
      tests.push({ name, status: 'failed', error: data.error });
      return;
    }

    if (!data.success) {
      console.log(`   ❌ API returned success: false`);
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      failed++;
      tests.push({ name, status: 'failed', error: data.error });
      return;
    }

    // Check for mock data
    if (options.checkMock && options.checkMock(data)) {
      console.log(`   ⚠️  Warning: Receiving mock data!`);
      console.log(`   This means GSC_SERVICE_ACCOUNT env var is not set`);
      failed++;
      tests.push({ name, status: 'mock', warning: 'Mock data returned' });
      return;
    }

    // Validate expected fields
    if (options.validate) {
      const validation = options.validate(data);
      if (!validation.valid) {
        console.log(`   ❌ Validation failed: ${validation.error}`);
        failed++;
        tests.push({ name, status: 'failed', error: validation.error });
        return;
      }
    }

    console.log(`   ✅ Success`);
    if (options.showData) {
      console.log(`   ${options.showData(data)}`);
    }

    passed++;
    tests.push({ name, status: 'passed', data });

  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    failed++;
    tests.push({ name, status: 'failed', error: error.message });
  }
}

async function runTests() {
  // Test 1: Dashboard API
  await testEndpoint(
    'Dashboard API',
    `${baseUrl}/api/dashboard`,
    {
      validate: (data) => {
        if (!data.clients || !Array.isArray(data.clients)) {
          return { valid: false, error: 'No clients array in response' };
        }
        if (data.clients.length < 3) {
          return { valid: false, error: `Expected 3+ clients, got ${data.clients.length}` };
        }
        return { valid: true };
      },
      showData: (data) => `Found ${data.clients.length} clients`
    }
  );

  // Test 2: GSC Metrics API
  await testEndpoint(
    'GSC Metrics API',
    `${baseUrl}/api/gsc-metrics`,
    {
      method: 'POST',
      body: { siteUrl: testSite, days: 30 },
      checkMock: (data) => {
        // Check if it's mock data (1,234 clicks is the mock value)
        return data.data?.clicks === 1234;
      },
      validate: (data) => {
        if (!data.data) {
          return { valid: false, error: 'No data object in response' };
        }
        // Check for either format (clicks/totalClicks)
        const hasClicks = data.data.clicks !== undefined || data.data.totalClicks !== undefined;
        const hasImpressions = data.data.impressions !== undefined || data.data.totalImpressions !== undefined;

        if (!hasClicks || !hasImpressions) {
          return { valid: false, error: 'Missing clicks or impressions data' };
        }
        return { valid: true };
      },
      showData: (data) => {
        const clicks = data.data.clicks || data.data.totalClicks;
        const impressions = data.data.impressions || data.data.totalImpressions;
        return `Clicks: ${clicks}, Impressions: ${impressions}`;
      }
    }
  );

  // Test 3: GSC Rankings API
  await testEndpoint(
    'GSC Rankings API',
    `${baseUrl}/api/gsc-rankings`,
    {
      method: 'POST',
      body: { siteUrl: testSite, limit: 10 },
      checkMock: (data) => {
        // Check if it's mock data
        return data.data?.keywords?.[0]?.query === 'example keyword';
      },
      validate: (data) => {
        const keywords = data.data?.keywords || data.data?.rankings;
        if (!keywords || !Array.isArray(keywords)) {
          return { valid: false, error: 'No keywords/rankings array in response' };
        }
        if (keywords.length === 0) {
          return { valid: false, error: 'No keywords returned' };
        }
        return { valid: true };
      },
      showData: (data) => {
        const keywords = data.data?.keywords || data.data?.rankings || [];
        return `Found ${keywords.length} keywords, Total: ${data.data.total || keywords.length}`;
      }
    }
  );

  // Test 4: Quick Wins API
  await testEndpoint(
    'Quick Wins API',
    `${baseUrl}/api/gsc-quick-wins`,
    {
      method: 'POST',
      body: { siteUrl: testSite },
      checkMock: (data) => {
        // Check if it's mock data
        return data.data?.quickWins?.[0]?.query === 'example keyword ranking 15';
      },
      validate: (data) => {
        const quickWins = data.data?.quickWins || data.data?.opportunities;
        if (!quickWins) {
          return { valid: false, error: 'No quickWins/opportunities in response' };
        }
        return { valid: true };
      },
      showData: (data) => {
        const quickWins = data.data?.quickWins || data.data?.opportunities || [];
        const total = data.data?.total || quickWins.length;
        const gain = data.data?.estimatedTrafficGain || 'N/A';
        return `Found ${quickWins.length} quick wins (Total: ${total}), Potential: +${gain} clicks/month`;
      }
    }
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total:  ${tests.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Cloudflare Functions are working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check the errors above.\n');

    // Check if it's a mock data issue
    const hasMockData = tests.some(t => t.status === 'mock');
    if (hasMockData) {
      console.log('⚠️  MOCK DATA DETECTED\n');
      console.log('This means the GSC_SERVICE_ACCOUNT environment variable is not set in Cloudflare.\n');
      console.log('To fix:');
      console.log('1. Go to Cloudflare Dashboard → Your Pages project → Settings → Environment variables');
      console.log('2. Add variable: GSC_SERVICE_ACCOUNT');
      console.log('3. Paste the service account JSON from config/google/service-account.json');
      console.log('4. Redeploy the project');
      console.log('5. Run this test again\n');
    }

    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
