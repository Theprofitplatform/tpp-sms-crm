/**
 * Setup ScrapingRobot API Key
 * 
 * Configures ScrapingRobot as the primary scraper
 */

import { getDB } from './src/database/index.js';

const API_KEY = 'c2b7240d-27e2-4b39-916e-aa7513495d2c';

const db = getDB();

console.log('🔧 Configuring ScrapingRobot...\n');

try {
  // Disable all scrapers first
  const disableStmt = db.prepare('UPDATE scraper_settings SET enabled = 0');
  disableStmt.run();
  console.log('✓ Disabled all scrapers');

  // Enable and configure ScrapingRobot with highest priority
  const updateStmt = db.prepare(`
    UPDATE scraper_settings 
    SET enabled = 1, 
        api_key = ?, 
        priority = 1,
        success_rate = 1.0,
        error_count = 0,
        last_error = NULL
    WHERE scraper_name = 'scrawingrobot'
  `);
  
  const result = updateStmt.run(API_KEY);
  
  if (result.changes > 0) {
    console.log('✓ ScrapingRobot enabled with API key');
    console.log('✓ Set as priority #1');
  } else {
    console.log('⚠ ScrapingRobot not found in database, inserting...');
    
    const insertStmt = db.prepare(`
      INSERT INTO scraper_settings (scraper_name, enabled, api_key, priority, success_rate)
      VALUES ('scrawingrobot', 1, ?, 1, 1.0)
    `);
    insertStmt.run(API_KEY);
    console.log('✓ ScrapingRobot inserted and enabled');
  }

  // Display active scrapers
  console.log('\n📊 Active Scrapers:\n');
  const activeStmt = db.prepare(`
    SELECT scraper_name, priority, success_rate, last_used_at
    FROM scraper_settings 
    WHERE enabled = 1
    ORDER BY priority
  `);
  
  const active = activeStmt.all();
  
  if (active.length === 0) {
    console.log('   No active scrapers!');
  } else {
    active.forEach(s => {
      console.log(`   ${s.priority}. ${s.scraper_name}`);
      console.log(`      Success Rate: ${(s.success_rate * 100).toFixed(1)}%`);
      console.log(`      Last Used: ${s.last_used_at || 'Never'}`);
      console.log('');
    });
  }

  console.log('✅ Configuration complete!\n');
  console.log('Next steps:');
  console.log('1. Start dashboard: node dashboard-server.js');
  console.log('2. Add domain at http://localhost:9000/#domains');
  console.log('3. Add keywords at http://localhost:9000/#keywords');
  console.log('4. Click "Refresh" to test ScrapingRobot\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
