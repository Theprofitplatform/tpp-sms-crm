/**
 * TEST: Image Alt Text Fixer
 *
 * Tests the image-alt-fixer with sample pixel issues
 */

import ImageAltFixer from '../src/automation/auto-fixers/image-alt-fixer.js';

console.log('🧪 Testing Image Alt Text Fixer\n');

async function testFixer() {
  try {
    const fixer = new ImageAltFixer();

    // Test 1: Generate alt text from filename
    console.log('Test 1: Generate from filename\n');

    const testImages = [
      'product-image-blue-widget-2024.jpg',
      'team_photo_office.png',
      'hero-banner.jpg',
      'logo-company.svg',
      'img_12345.jpg'
    ];

    for (const imageSrc of testImages) {
      const altText = await fixer.generateAltTextFromFilename(imageSrc, {
        pageTitle: 'Our Products'
      });

      console.log(`  ${imageSrc}`);
      console.log(`  → "${altText}"\n`);
    }

    // Test 2: Fix missing alt text issue
    console.log('\nTest 2: Fix mock issue\n');

    const mockIssue = {
      issue_type: 'missing_alt_text',
      page_url: 'https://example.com/products',
      description: '3 images found without alt text',
      affected_count: 3,
      severity: 'HIGH'
    };

    console.log('Mock issue:');
    console.log(JSON.stringify(mockIssue, null, 2));
    console.log('\n🔧 Running fixer...\n');

    const result = await fixer.fixIssue(mockIssue);

    console.log('✅ Fix Result:');
    console.log(JSON.stringify(result, null, 2));

    // Test 3: Capabilities
    console.log('\n📋 Fixer Capabilities:');
    console.log(JSON.stringify(ImageAltFixer.getCapabilities(), null, 2));

    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFixer();
