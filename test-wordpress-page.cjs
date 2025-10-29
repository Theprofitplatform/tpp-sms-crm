const { chromium } = require('playwright');

async function testWordPressPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]:', error.message);
  });

  // Capture network requests
  page.on('response', async response => {
    if (response.url().includes('/api/wordpress')) {
      console.log('\n[API RESPONSE]:', response.url());
      console.log('Status:', response.status());
      try {
        const body = await response.json();
        console.log('Response Body:', JSON.stringify(body, null, 2));
      } catch (e) {
        const text = await response.text();
        console.log('Response Text:', text.substring(0, 500));
      }
    }
  });

  try {
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(2000);

    console.log('\nNavigating to WordPress page...');
    await page.click('text=WordPress');
    
    await page.waitForTimeout(3000);

    // Check for error messages
    const errorText = await page.textContent('body').catch(() => '');
    if (errorText.includes('Something went wrong') || errorText.includes('invariant')) {
      console.log('\n❌ ERROR FOUND ON PAGE');
    }

    // Check page state
    const pageState = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 500),
        hasErrorBoundary: document.body.innerText.includes('Something went wrong'),
        hasTable: !!document.querySelector('table')
      };
    });
    console.log('\n[PAGE STATE]:', pageState);

    await page.screenshot({ path: '/mnt/c/Users/abhis/projects/seo expert/wordpress-page-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testWordPressPage();
