/**
 * TEST: Pixel Management Enhancements
 *
 * Tests the new pixel enhancement features:
 * - Advanced issue detection
 * - Analytics tracking
 * - Health monitoring
 * - Issue management endpoints
 */

import http from 'http';

const BASE_URL = 'http://localhost:9000';
const API_URL = `${BASE_URL}/api/v2`;

// Test counter
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Helper to make HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test helper
function test(name, fn) {
  testsRun++;
  return fn()
    .then(() => {
      testsPassed++;
      console.log(`✅ ${testsRun}. ${name}`);
    })
    .catch((error) => {
      testsFailed++;
      console.error(`❌ ${testsRun}. ${name}`);
      console.error(`   Error: ${error.message}`);
    });
}

// Shared test data
let testPixelId;
let testClientId = 'test-client-001'; // Make sure this client exists in DB
let testApiKey;

console.log('🧪 Testing Pixel Management Enhancements\n');
console.log('=' .repeat(60));

(async () => {
  try {
    // Test 1: Create a pixel deployment
    await test('Create pixel deployment', async () => {
      const response = await request('POST', '/pixel/generate', {
        clientId: testClientId,
        domain: 'test.example.com',
        options: {
          deploymentType: 'header',
          features: ['meta-tracking', 'performance', 'schema'],
          debug: true
        }
      });

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to create pixel');
      }

      testPixelId = response.data.data.id;
      testApiKey = response.data.data.apiKey;
      console.log(`   Pixel ID: ${testPixelId}`);
      console.log(`   API Key: ${testApiKey.substring(0, 20)}...`);
    });

    // Test 2: Track pixel data with issues
    await test('Track pixel data (with SEO issues)', async () => {
      const pixelData = {
        apiKey: testApiKey,
        metadata: {
          url: 'https://test.example.com/page1',
          title: 'Short', // Too short - will trigger warning
          metaDescription: '', // Missing - will trigger error
          h1Tags: [], // Missing H1 - will trigger error
          h2Tags: ['Subheading 1', 'Subheading 2'],
          canonicalUrl: '',
          ogTitle: '',
          ogDescription: '',
          ogImage: '',
          hasViewport: false, // Missing viewport - will trigger error
          wordCount: 150, // Too short - will trigger warning
          images: [
            { src: 'img1.jpg', alt: '', hasAlt: false, width: 800, height: 600 },
            { src: 'img2.jpg', alt: 'Alt text', hasAlt: true, width: 1200, height: 800 }
          ],
          links: [
            { href: 'https://external.com', isInternal: false, rel: '' }
          ],
          schema: []
        },
        vitals: {
          lcp: 3500, // Poor LCP - will trigger warning
          fid: 150,  // Poor FID - will trigger warning
          cls: 0.15, // Poor CLS - will trigger warning
          fcp: 1800,
          ttfb: 600
        }
      };

      const response = await request('POST', '/pixel/track', pixelData);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to track pixel data');
      }

      console.log(`   SEO Score: ${response.data.data.seoScore}/100`);
      console.log(`   Issues Detected: ${response.data.data.issuesDetected}`);
      console.log(`   Top Issues: ${response.data.data.topIssues.map(i => i.type).join(', ')}`);
    });

    // Test 3: Get pixel issues
    await test('Get pixel issues', async () => {
      const response = await request('GET', `/pixel/issues/${testPixelId}`);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to get issues');
      }

      const issues = response.data.data;
      console.log(`   Total Issues: ${issues.length}`);
      if (issues.length > 0) {
        console.log(`   First Issue: ${issues[0].type} (${issues[0].severity})`);
      }
    });

    // Test 4: Get issue summary
    await test('Get issue summary', async () => {
      const response = await request('GET', `/pixel/issues/${testPixelId}/summary`);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to get issue summary');
      }

      const summary = response.data.data;
      console.log(`   Critical: ${summary.critical}`);
      console.log(`   High: ${summary.high}`);
      console.log(`   Medium: ${summary.medium}`);
      console.log(`   Low: ${summary.low}`);
    });

    // Test 5: Get pixel analytics
    await test('Get pixel analytics', async () => {
      const response = await request('GET', `/pixel/analytics/${testPixelId}?days=7`);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to get analytics');
      }

      console.log(`   Analytics entries: ${response.data.data.length}`);
    });

    // Test 6: Get pixel health
    await test('Get pixel health', async () => {
      const response = await request('GET', `/pixel/health/${testPixelId}`);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to get health');
      }

      console.log(`   Current Status: ${response.data.data.currentStatus}`);
      console.log(`   Uptime: ${response.data.data.uptime}%`);
    });

    // Test 7: Get pixel uptime
    await test('Get pixel uptime statistics', async () => {
      const response = await request('GET', `/pixel/uptime/${testPixelId}`);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to get uptime');
      }

      console.log(`   Last 24h: ${response.data.data.last24Hours}%`);
      console.log(`   Last 7d: ${response.data.data.last7Days}%`);
    });

    // Test 8: Track more pixel data for trends
    await test('Track additional pixel data', async () => {
      const pixelData = {
        apiKey: testApiKey,
        metadata: {
          url: 'https://test.example.com/page2',
          title: 'This is a well-optimized page title that is just right',
          metaDescription: 'This is a comprehensive meta description that provides clear information about the page content and is optimized for search engines',
          h1Tags: ['Main Heading'],
          h2Tags: ['Subheading 1', 'Subheading 2'],
          canonicalUrl: 'https://test.example.com/page2',
          ogTitle: 'Social Media Title',
          ogDescription: 'Social media description',
          ogImage: 'https://test.example.com/og-image.jpg',
          hasViewport: true,
          wordCount: 850,
          images: [
            { src: 'img1.jpg', alt: 'Descriptive alt text', hasAlt: true, width: 800, height: 600, loading: 'lazy' }
          ],
          links: [
            { href: 'https://external.com', isInternal: false, rel: 'noopener' }
          ],
          schema: [{ '@type': 'Article', headline: 'Test Article' }]
        },
        vitals: {
          lcp: 1800, // Good LCP
          fid: 50,   // Good FID
          cls: 0.05, // Good CLS
          fcp: 1200,
          ttfb: 200
        }
      };

      const response = await request('POST', '/pixel/track', pixelData);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to track pixel data');
      }

      console.log(`   SEO Score: ${response.data.data.seoScore}/100`);
      console.log(`   Issues Detected: ${response.data.data.issuesDetected}`);
    });

    // Test 9: Get analytics trends
    await test('Get analytics trends', async () => {
      const response = await request('GET', `/pixel/analytics/${testPixelId}/trends`);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to get trends');
      }

      console.log(`   7-day SEO score trend: ${response.data.data.last7Days.seoScore}%`);
      console.log(`   7-day LCP trend: ${response.data.data.last7Days.lcp}%`);
    });

    // Test 10: Resolve an issue
    await test('Resolve an issue', async () => {
      // First, get an issue to resolve
      const issuesResponse = await request('GET', `/pixel/issues/${testPixelId}?limit=1`);
      if (issuesResponse.data.data.length === 0) {
        console.log('   No issues to resolve (skipping)');
        return;
      }

      const issueId = issuesResponse.data.data[0].issue_id;
      const response = await request('POST', `/pixel/issues/${issueId}/resolve`);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to resolve issue');
      }

      console.log(`   Issue ${issueId} resolved`);
    });

    // Test 11: Export analytics
    await test('Export analytics as JSON', async () => {
      const response = await request('POST', `/pixel/analytics/${testPixelId}/export`, {
        days: 7,
        format: 'json'
      });

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to export analytics');
      }

      console.log(`   Exported ${response.data.data.length} analytics entries`);
    });

    // Test 12: Filter issues by severity
    await test('Filter issues by severity (CRITICAL)', async () => {
      const response = await request('GET', `/pixel/issues/${testPixelId}?severity=CRITICAL`);

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to filter issues');
      }

      console.log(`   Critical Issues: ${response.data.data.length}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Results:');
    console.log(`   Total Tests: ${testsRun}`);
    console.log(`   ✅ Passed: ${testsPassed}`);
    console.log(`   ❌ Failed: ${testsFailed}`);
    console.log(`   Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

    if (testsFailed === 0) {
      console.log('\n🎉 All tests passed! Pixel enhancements are working correctly.\n');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
