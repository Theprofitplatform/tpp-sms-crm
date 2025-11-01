/**
 * TEST: Pixel Recommendations Sync Service
 *
 * Tests the sync service with real pixel issues
 */

import { PixelRecommendationsSync } from '../src/services/pixel-recommendations-sync.js';

console.log('🧪 Testing Pixel Recommendations Sync Service\n');

async function testSync() {
  try {
    const sync = new PixelRecommendationsSync();

    // Get stats before sync
    console.log('📊 Statistics BEFORE sync:');
    const statsBefore = sync.getStats();
    console.log(JSON.stringify(statsBefore, null, 2));

    // Run sync
    console.log('\n🔄 Running sync...\n');
    const result = await sync.syncIssues();

    console.log('\n✅ Sync Results:');
    console.log(JSON.stringify(result, null, 2));

    // Get stats after sync
    console.log('\n📊 Statistics AFTER sync:');
    const statsAfter = sync.getStats();
    console.log(JSON.stringify(statsAfter, null, 2));

    // Close database
    sync.close();

    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSync();
