import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function testAllFormats() {
  try {
    console.log('Testing Google Search Console access...\n');
    
    // Initialize
    const keyFile = readFileSync('config/google/service-account.json', 'utf8');
    const credentials = JSON.parse(keyFile);
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    });
    
    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: auth
    });
    
    // First, list all sites this service account has access to
    console.log('🔍 Checking which properties you have access to...\n');
    
    const sitesList = await searchconsole.sites.list();
    
    if (sitesList.data.siteEntry && sitesList.data.siteEntry.length > 0) {
      console.log('✅ Found', sitesList.data.siteEntry.length, 'properties:\n');
      
      sitesList.data.siteEntry.forEach((site, i) => {
        console.log(`${i + 1}. ${site.siteUrl}`);
        console.log(`   Permission: ${site.permissionLevel}`);
        console.log('');
      });
      
      // Now try to fetch data from each one
      console.log('📊 Testing data fetch from each property:\n');
      
      for (const site of sitesList.data.siteEntry) {
        try {
          console.log(`Testing: ${site.siteUrl}`);
          
          const response = await searchconsole.searchanalytics.query({
            siteUrl: site.siteUrl,
            requestBody: {
              startDate: getDateDaysAgo(30),
              endDate: getDateDaysAgo(0),
              dimensions: [],
              rowLimit: 1
            }
          });
          
          if (response.data.rows && response.data.rows.length > 0) {
            const data = response.data.rows[0];
            console.log(`   ✅ Clicks: ${data.clicks}, Impressions: ${data.impressions}`);
          } else {
            console.log(`   ⚠️  No data available (might be new property)`);
          }
          console.log('');
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          console.log('');
        }
      }
      
      console.log('\n✅ Use one of the URLs above in your automation!');
      
    } else {
      console.log('❌ No properties found!');
      console.log('\nThis means the service account has NOT been added to any Search Console properties.');
      console.log('\nService account email:');
      console.log('seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com');
      console.log('\nAdd it to Google Search Console:');
      console.log('https://search.google.com/search-console → Settings → Users and permissions');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API has not been used')) {
      console.log('\n💡 Enable Google Search Console API:');
      console.log('https://console.cloud.google.com/apis/library/searchconsole.googleapis.com?project=robotic-goal-456009-r2');
    }
  }
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

testAllFormats();
