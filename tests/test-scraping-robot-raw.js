/**
 * Test ScrapingRobot API - Raw Request
 * 
 * Direct API test to debug the request format
 */

import axios from 'axios';

const API_KEY = 'c2b7240d-27e2-4b39-916e-aa7513495d2c';

async function testRawAPI() {
  console.log('🧪 Testing ScrapingRobot API (Raw Request)\n');
  
  // Test 1: Basic POST request
  console.log('Test 1: Basic Google Search');
  console.log('━'.repeat(60));
  
  const testCases = [
    {
      name: 'Format 1: Google module with query',
      payload: {
        url: 'https://www.google.com/search',
        query: 'seo tools',
        country: 'US',
        renderJs: false,
        module: 'GoogleScraper'
      }
    },
    {
      name: 'Format 2: Full URL in url field',
      payload: {
        url: 'https://www.google.com/search?q=seo+tools&gl=US',
        renderJs: false
      }
    },
    {
      name: 'Format 3: Simple scrape',
      payload: {
        url: 'https://www.google.com/search?q=seo+tools',
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 ${testCase.name}`);
    console.log('Payload:', JSON.stringify(testCase.payload, null, 2));
    
    try {
      const response = await axios.post(
        `https://api.scrapingrobot.com?token=${API_KEY}`,
        testCase.payload,
        { 
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Success!');
      console.log('Status:', response.status);
      console.log('Response keys:', Object.keys(response.data));
      
      // Check for common response formats
      if (response.data.organicResults) {
        console.log('📊 Organic results found:', response.data.organicResults.length);
        console.log('First result:', response.data.organicResults[0]);
      } else if (response.data.organic_results) {
        console.log('📊 Organic results found:', response.data.organic_results.length);
        console.log('First result:', response.data.organic_results[0]);
      } else if (response.data.html) {
        console.log('📄 HTML returned (length):', response.data.html.length);
      } else if (response.data.result) {
        console.log('📄 Result field:', typeof response.data.result);
      } else {
        console.log('📦 Full response:', JSON.stringify(response.data).substring(0, 500));
      }
      
      console.log('\n✅ This format works!');
      break; // Stop after first success
      
    } catch (error) {
      console.log('❌ Failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.message);
      if (error.response?.data) {
        console.log('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
  
  console.log('\n━'.repeat(60));
}

testRawAPI();
