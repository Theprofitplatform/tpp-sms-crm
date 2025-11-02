/**
 * TEST: Schema Fixer
 *
 * Tests the schema-fixer with sample pixel issues
 */

import SchemaFixer from '../src/automation/auto-fixers/schema-fixer.js';

console.log('🧪 Testing Schema Fixer\n');

async function testFixer() {
  try {
    const fixer = new SchemaFixer();

    // Test client data
    const clientData = {
      name: 'ACME Local Business',
      description: 'Your trusted local service provider',
      url: 'https://acme-local.com',
      phone: '(555) 123-4567',
      email: 'info@acme-local.com',
      street: '123 Main Street',
      city: 'Anytown',
      state: 'CA',
      zip: '12345',
      latitude: 34.0522,
      longitude: -118.2437
    };

    // Test 1: LocalBusiness schema
    console.log('Test 1: Generate LocalBusiness Schema\n');

    const businessIssue = {
      issue_type: 'missing_local_business_schema',
      page_url: 'https://acme-local.com',
      severity: 'HIGH'
    };

    let result = await fixer.fixIssue(businessIssue, clientData);

    console.log('✅ Fix Result:');
    console.log(`  Schema Type: ${result.schemaType}`);
    console.log(`  Action: ${result.action}`);
    console.log(`  Priority: ${result.priority}`);
    console.log('\n📝 Generated Schema:');
    console.log('─'.repeat(60));
    console.log(result.fixCode);
    console.log('─'.repeat(60));

    // Test 2: Product schema
    console.log('\n\nTest 2: Generate Product Schema\n');

    const productData = {
      productName: 'Premium Widget',
      productDescription: 'The best widget on the market',
      productImage: 'https://example.com/widget.jpg',
      brand: 'ACME',
      price: '99.99',
      currency: 'USD',
      sku: 'WIDGET-001'
    };

    const productIssue = {
      issue_type: 'missing_product_schema',
      page_url: 'https://acme-local.com/products/widget',
      severity: 'MEDIUM'
    };

    result = await fixer.fixIssue(productIssue, productData);

    console.log('✅ Fix Result:');
    console.log(`  Schema Type: ${result.schemaType}`);
    console.log('\n📝 Generated Schema:');
    console.log('─'.repeat(60));
    console.log(result.fixCode.substring(0, 500) + '...');
    console.log('─'.repeat(60));

    // Test 3: Article schema
    console.log('\n\nTest 3: Generate Article Schema\n');

    const articleData = {
      title: 'How to Choose the Right Widget',
      description: 'A comprehensive guide to widget selection',
      author: 'John Doe',
      publisher: 'ACME Blog',
      publishDate: '2025-01-15',
      image: 'https://example.com/article-image.jpg',
      logo: 'https://example.com/logo.png'
    };

    const articleIssue = {
      issue_type: 'missing_article_schema',
      page_url: 'https://acme-local.com/blog/widget-guide',
      severity: 'LOW'
    };

    result = await fixer.fixIssue(articleIssue, articleData);

    console.log('✅ Fix Result:');
    console.log(`  Schema Type: ${result.schemaType}`);
    console.log('\n📝 Generated Schema:');
    console.log('─'.repeat(60));
    console.log(result.fixCode.substring(0, 500) + '...');
    console.log('─'.repeat(60));

    // Test 4: Capabilities
    console.log('\n\n📋 Fixer Capabilities:');
    console.log(JSON.stringify(SchemaFixer.getCapabilities(), null, 2));

    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFixer();
