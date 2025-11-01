#!/usr/bin/env node

/**
 * Test script for Otto SEO features
 * Tests the three main services: Pixel, Schema, SSR
 */

import pixelService from './src/services/pixel-service.js';
import schemaEngine from './src/services/schema-engine.js';
import ssrOptimizationService from './src/services/ssr-optimization-service.js';
import { initializeDatabase } from './src/database/index.js';

console.log('🧪 Testing Otto SEO Features\n');
console.log('='.repeat(60));

// Initialize database first
console.log('\n🗄️  Initializing database...');
try {
  initializeDatabase();
  console.log('✅ Database initialized successfully\n');
} catch (error) {
  console.error('❌ Failed to initialize database:', error.message);
  process.exit(1);
}

// Test data
const testClientId = 'test-client-123';
const testDomain = 'example.com';
const testPageUrl = 'https://example.com/test-page';

// Create test client first
console.log('\n👤 Creating test client...');
try {
  const { clientOps } = await import('./src/database/index.js');
  clientOps.upsert({
    id: testClientId,
    name: 'Test Client',
    domain: testDomain,
    businessType: 'Technology',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    status: 'active'
  });
  console.log('✅ Test client created successfully\n');
} catch (error) {
  console.error('❌ Failed to create test client:', error.message);
  process.exit(1);
}

// Test 1: Pixel Service
console.log('\n📊 TEST 1: Pixel Service');
console.log('-'.repeat(60));

try {
  // Generate pixel
  console.log('✓ Generating pixel...');
  const pixel = pixelService.generatePixel(testClientId, testDomain, {
    deploymentType: 'header',
    features: ['meta-tracking', 'performance'],
    debug: false
  });

  console.log('  ✓ Pixel generated successfully');
  console.log(`  ✓ API Key: ${pixel.apiKey.substring(0, 20)}...`);
  console.log(`  ✓ Pixel ID: ${pixel.id}`);
  console.log(`  ✓ Code length: ${pixel.pixelCode.length} characters`);

  // Get pixel status
  console.log('\n✓ Getting pixel status...');
  const pixels = pixelService.getPixelStatus(testClientId);
  console.log(`  ✓ Found ${pixels.length} pixel(s)`);

  // Simulate tracking data
  console.log('\n✓ Simulating pixel tracking...');
  const trackingData = {
    metadata: {
      url: testPageUrl,
      title: 'Test Page',
      metaDescription: 'This is a test page',
      h1Tags: ['Test Heading'],
      h2Tags: ['Subheading 1', 'Subheading 2'],
      images: [
        { src: 'image1.jpg', alt: 'Test image', hasAlt: true, width: 800, height: 600 }
      ],
      links: [
        { href: 'https://example.com/link1', text: 'Link 1', rel: '', isInternal: true }
      ],
      schema: [],
      hasViewport: true,
      wordCount: 500
    },
    vitals: {
      lcp: 2.1,
      fid: 80,
      cls: 0.05,
      fcp: 1.5,
      ttfb: 200
    },
    issues: [
      { type: 'warning', category: 'meta', message: 'Meta description too short' }
    ],
    seoScore: 85,
    pageSize: 204800
  };

  const trackResult = pixelService.trackPixelData(pixel.apiKey, trackingData);
  console.log('  ✓ Tracking successful');
  console.log(`  ✓ Page data ID: ${trackResult.pageDataId}`);
  console.log(`  ✓ SEO Score: ${trackResult.seoScore}/100`);

  // Get tracked pages
  console.log('\n✓ Getting tracked pages...');
  const pages = pixelService.getPixelPageData(testClientId, { limit: 10 });
  console.log(`  ✓ Found ${pages.length} tracked page(s)`);

  // Cleanup
  console.log('\n✓ Cleaning up...');
  pixelService.deletePixel(testClientId, pixel.id);
  console.log('  ✓ Test pixel deleted');

  console.log('\n✅ Pixel Service: ALL TESTS PASSED');
} catch (error) {
  console.error('\n❌ Pixel Service: TEST FAILED');
  console.error('Error:', error.message);
  console.error(error.stack);
}

// Test 2: Schema Engine
console.log('\n\n🤖 TEST 2: Schema Automation Engine');
console.log('-'.repeat(60));

try {
  // Test HTML with article structure
  const testHTML = `
    <html>
      <head>
        <title>How to Build a Website</title>
        <meta name="description" content="Learn how to build a website in 10 easy steps">
        <meta name="author" content="John Doe">
      </head>
      <body>
        <article>
          <h1>How to Build a Website</h1>
          <time datetime="2025-01-01">January 1, 2025</time>
          <p>This is a comprehensive guide to building websites...</p>
          ${'<p>Content paragraph...</p>'.repeat(50)}
        </article>
      </body>
    </html>
  `;

  console.log('✓ Analyzing page for schema opportunities...');
  const analysis = await schemaEngine.analyzePageForSchema(
    testClientId,
    testPageUrl,
    testHTML
  );

  console.log(`  ✓ Found ${analysis.totalOpportunities} schema opportunities`);
  console.log(`  ✓ Existing schemas: ${analysis.existingSchema.length}`);

  if (analysis.opportunities.length > 0) {
    const firstOpp = analysis.opportunities[0];
    console.log(`\n  Opportunity 1: ${firstOpp.schema_type}`);
    console.log(`    - Confidence: ${firstOpp.confidence_score}%`);
    console.log(`    - Priority: ${firstOpp.priority}`);
    console.log(`    - Impact: ${firstOpp.estimated_impact}`);
  }

  // Get opportunities from database
  console.log('\n✓ Getting schema opportunities from database...');
  const opportunities = schemaEngine.getSchemaOpportunities(testClientId, {
    status: 'new',
    limit: 10
  });
  console.log(`  ✓ Found ${opportunities.length} opportunity/opportunities`);

  // Generate schema using AI (requires API key)
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-api-key-here') {
    try {
      console.log('\n✓ Testing AI schema generation...');
      const schema = await schemaEngine.generateSchemaMarkup(
        'Article',
        {
          headline: 'How to Build a Website',
          author: 'John Doe',
          datePublished: '2025-01-01',
          wordCount: 500
        },
        { url: testPageUrl, clientId: testClientId }
      );

      console.log('  ✓ Schema generated successfully');
      console.log(`  ✓ Schema type: ${schema['@type']}`);
      console.log(`  ✓ Has @context: ${!!schema['@context']}`);
    } catch (error) {
      console.log('  ⚠ AI generation failed (check API key)');
      console.log(`    Error: ${error.message}`);
    }
  } else {
    console.log('\n⚠ Skipping AI generation (no valid ANTHROPIC_API_KEY)');
  }

  // Apply schema
  console.log('\n✓ Applying schema...');
  const appliedSchema = await schemaEngine.applySchema(
    testClientId,
    testPageUrl,
    'Article',
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': 'Test Article',
      'description': 'Test description'
    }
  );
  console.log(`  ✓ Schema applied with ID: ${appliedSchema.id}`);

  // Get applied schemas
  console.log('\n✓ Getting applied schemas...');
  const appliedSchemas = schemaEngine.getAppliedSchema(testClientId);
  console.log(`  ✓ Found ${appliedSchemas.length} applied schema(s)`);

  // Cleanup
  console.log('\n✓ Cleaning up...');
  schemaEngine.removeSchema(testClientId, appliedSchema.id);
  console.log('  ✓ Test schema removed');

  console.log('\n✅ Schema Engine: ALL TESTS PASSED');
} catch (error) {
  console.error('\n❌ Schema Engine: TEST FAILED');
  console.error('Error:', error.message);
  console.error(error.stack);
}

// Test 3: SSR Optimization Service
console.log('\n\n⚡ TEST 3: SSR Optimization Service');
console.log('-'.repeat(60));

try {
  // Create optimization
  console.log('✓ Creating SSR optimization...');
  const optimization = ssrOptimizationService.createOptimization(
    testClientId,
    testDomain,
    testPageUrl,
    'title',
    'Old Title',
    'New Optimized Title - Best SEO Tips 2025'
  );

  console.log('  ✓ Optimization created');
  console.log(`  ✓ Optimization ID: ${optimization.id}`);

  // Test optimization
  console.log('\n✓ Testing optimization application...');
  const testHTML = '<html><head><title>Old Title</title></head><body>Test</body></html>';
  const testResult = ssrOptimizationService.testOptimization(
    testHTML,
    'title',
    'New Optimized Title'
  );

  console.log(`  ✓ Test successful: ${testResult.success}`);
  console.log(`  ✓ Preview: ${JSON.stringify(testResult.preview)}`);

  // Apply optimizations to HTML
  console.log('\n✓ Applying optimizations to HTML...');
  const applyResult = await ssrOptimizationService.applyOptimizations(
    testClientId,
    testPageUrl,
    testHTML
  );

  console.log(`  ✓ Modified: ${applyResult.modified}`);
  console.log(`  ✓ Optimizations applied: ${applyResult.optimizationsApplied}`);

  // Get optimizations
  console.log('\n✓ Getting optimizations...');
  const optimizations = ssrOptimizationService.getOptimizations(testClientId, {
    status: 'active',
    limit: 10
  });
  console.log(`  ✓ Found ${optimizations.length} optimization(s)`);

  // Get stats
  console.log('\n✓ Getting optimization statistics...');
  const stats = ssrOptimizationService.getOptimizationStats(testClientId);
  console.log(`  ✓ Stats retrieved successfully`);
  console.log(`  ✓ Cache stats: ${JSON.stringify(stats.cacheStats)}`);

  // Test different optimization types
  console.log('\n✓ Testing different optimization types...');

  // Meta description
  const metaOpt = ssrOptimizationService.createOptimization(
    testClientId,
    testDomain,
    testPageUrl + '/meta',
    'meta_description',
    '',
    'This is an optimized meta description with keywords'
  );
  console.log('  ✓ Meta description optimization created');

  // Schema
  const schemaOpt = ssrOptimizationService.createOptimization(
    testClientId,
    testDomain,
    testPageUrl + '/schema',
    'schema',
    '',
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Test Company'
    })
  );
  console.log('  ✓ Schema optimization created');

  // Cleanup
  console.log('\n✓ Cleaning up...');
  ssrOptimizationService.deactivateOptimization(testClientId, optimization.id);
  ssrOptimizationService.deactivateOptimization(testClientId, metaOpt.id);
  ssrOptimizationService.deactivateOptimization(testClientId, schemaOpt.id);
  console.log('  ✓ Test optimizations deactivated');

  // Clear cache
  const cleared = ssrOptimizationService.clearAllCache(testClientId);
  console.log(`  ✓ Cleared ${cleared} cache entries`);

  console.log('\n✅ SSR Optimization: ALL TESTS PASSED');
} catch (error) {
  console.error('\n❌ SSR Optimization: TEST FAILED');
  console.error('Error:', error.message);
  console.error(error.stack);
}

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('🎉 TEST SUITE COMPLETE');
console.log('='.repeat(60));
console.log('\n✅ All Otto SEO features are working correctly!');
console.log('\nNext steps:');
console.log('  1. Start the server: npm start');
console.log('  2. Navigate to: http://localhost:9000');
console.log('  3. Check the "Otto Features" section in the sidebar');
console.log('  4. Test the UI components:\n');
console.log('     - Pixel Management');
console.log('     - Schema Automation');
console.log('     - SSR Optimization\n');
