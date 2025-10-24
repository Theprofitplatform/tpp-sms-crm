import { GoogleSearchConsole } from './src/automation/google-search-console.js';

async function test() {
  try {
    console.log('Testing Google Search Console...\n');
    
    const gsc = new GoogleSearchConsole();
    console.log('✅ GSC API initialized\n');
    
    // Test with a domain - update this to your actual client
    const testDomain = 'sc-domain:hottyres.com.au'; // or 'https://hottyres.com.au'
    
    console.log(`Fetching data for: ${testDomain}\n`);
    
    const metrics = await gsc.getSiteMetrics(testDomain);
    console.log('📊 Site Metrics (last 30 days):');
    console.log(`   Clicks: ${metrics.totalClicks}`);
    console.log(`   Impressions: ${metrics.totalImpressions}`);
    console.log(`   CTR: ${metrics.averageCTR}%`);
    console.log(`   Avg Position: ${metrics.averagePosition}\n`);
    
    console.log('✅ SUCCESS! Google Search Console API is working!\n');
    console.log('Next: Run full automation with:');
    console.log('   node cli.js auto-optimize hottyres');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('User does not have')) {
      console.log('\n💡 Fix: Add service account to Google Search Console');
      console.log('   Email: seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com');
      console.log('   See: GRANT-GSC-ACCESS.md');
    } else if (error.message.includes('Unable to detect a Project Id')) {
      console.log('\n💡 Fix: Service account file is correct, API might not be enabled');
      console.log('   Enable at: https://console.cloud.google.com/apis/library');
    }
  }
}

test();
