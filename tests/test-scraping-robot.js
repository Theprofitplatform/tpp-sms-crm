/**
 * Test ScrapingRobot Integration
 * 
 * Tests the scraper with a real keyword query
 */

import { ScraperService } from './src/services/scraper-service.js';
import { getDB } from './src/database/index.js';

const db = getDB();
const scraperService = new ScraperService(db);

async function testScraper() {
  console.log('🧪 Testing ScrapingRobot Integration\n');
  console.log('━'.repeat(60));
  
  // Test keyword
  const testKeyword = 'seo tools';
  const testCountry = 'US';
  const testDevice = 'desktop';
  
  console.log(`\n📝 Test Parameters:`);
  console.log(`   Keyword: "${testKeyword}"`);
  console.log(`   Country: ${testCountry}`);
  console.log(`   Device: ${testDevice}`);
  console.log(`\n🔍 Scraping Google SERP...\n`);
  
  try {
    const startTime = Date.now();
    
    const result = await scraperService.scrape(
      testKeyword,
      testCountry,
      testDevice,
      null // No target domain for test
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ Scraping successful!\n');
    console.log('━'.repeat(60));
    console.log(`\n⏱️  Duration: ${duration}s`);
    console.log(`🤖 Scraper Used: ${result.scraper}`);
    console.log(`📊 Results Found: ${result.results.length}`);
    console.log(`\n📋 Top 10 Results:\n`);
    
    result.results.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.title}`);
      console.log(`   ${item.url}`);
      console.log(`   ${item.description?.substring(0, 80)}...`);
      console.log('');
    });
    
    console.log('━'.repeat(60));
    console.log('\n✅ Test Complete!\n');
    console.log('🎉 ScrapingRobot is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Start dashboard: node dashboard-server.js');
    console.log('2. Add your domain at http://localhost:9000/#domains');
    console.log('3. Add keywords and track positions!\n');
    
  } catch (error) {
    console.error('\n❌ Test Failed!\n');
    console.error('Error:', error.message);
    console.error('\nDetails:', error.response?.data || error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check API key is correct');
    console.error('   2. Verify API key has credits');
    console.error('   3. Check internet connection');
    console.error('   4. Review ScrapingRobot docs: https://docs.scrapingrobot.com\n');
    process.exit(1);
  }
}

// Run test
testScraper();
