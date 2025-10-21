import { chromium } from 'playwright';

const URL = 'https://instantautotraders.com.au/';

console.log('📸 Taking fresh screenshot of homepage...\n');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
        path: 'current-homepage-NOW.png', 
        fullPage: true 
    });
    
    console.log('✅ Screenshot saved: current-homepage-NOW.png');
    
    // Get page content
    const title = await page.title();
    const h1 = await page.locator('h1').first().textContent().catch(() => 'Not found');
    const bodyText = await page.locator('body').textContent();
    
    console.log('\n📄 PAGE INFO:');
    console.log(`Title: ${title}`);
    console.log(`H1: ${h1}`);
    console.log(`Body text length: ${bodyText.length} chars`);
    console.log(`First 300 chars: ${bodyText.substring(0, 300).trim()}`);
    
    await browser.close();
})();
