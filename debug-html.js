/**
 * Debug HTML Response
 */

import axios from 'axios';
import fs from 'fs';

const API_KEY = 'c2b7240d-27e2-4b39-916e-aa7513495d2c';

async function debugHTML() {
  console.log('🔍 Fetching HTML from ScrapingRobot...\n');
  
  try {
    const response = await axios.post(
      `https://api.scrapingrobot.com?token=${API_KEY}`,
      {
        url: 'https://www.google.com/search?q=seo+tools&gl=US&num=10',
        renderJs: false
      },
      { timeout: 60000 }
    );
    
    if (response.data && response.data.result) {
      const html = response.data.result;
      
      // Save to file
      fs.writeFileSync('google-serp-debug.html', html);
      console.log('✅ HTML saved to: google-serp-debug.html');
      console.log(`📏 HTML length: ${html.length} characters`);
      
      // Show preview
      console.log('\n📄 HTML Preview (first 500 chars):');
      console.log('━'.repeat(60));
      console.log(html.substring(0, 500));
      console.log('━'.repeat(60));
      
      // Look for common patterns
      console.log('\n🔍 Looking for result containers:');
      const patterns = [
        { name: 'div.g', regex: /<div class="g"/g },
        { name: 'div data-sokoban', regex: /<div data-sokoban-container/g },
        { name: 'div.Gx5Zad', regex: /<div class="Gx5Zad"/g },
        { name: 'h3 tags', regex: /<h3/g },
        { name: 'href links', regex: /href="http/g },
      ];
      
      patterns.forEach(p => {
        const matches = html.match(p.regex);
        console.log(`   ${p.name}: ${matches ? matches.length : 0} found`);
      });
      
      console.log('\n✅ Check google-serp-debug.html for full HTML\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugHTML();
