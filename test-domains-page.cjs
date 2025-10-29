const { chromium } = require('playwright');

async function testDomainsPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text()
    });
    console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
  });

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.error('[PAGE ERROR]:', error.message);
  });

  // Capture network requests
  page.on('response', async response => {
    if (response.url().includes('/api/domains')) {
      console.log('\n[API RESPONSE]:', response.url());
      console.log('Status:', response.status());
      try {
        const body = await response.json();
        console.log('Response Body:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    }
  });

  try {
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    
    console.log('\nWaiting 2 seconds...');
    await page.waitForTimeout(2000);

    console.log('\nNavigating to Domains page...');
    // Click on Domains in sidebar
    await page.click('text=Domains');
    
    console.log('\nWaiting for page to load...');
    await page.waitForTimeout(3000);

    // Check for error messages on the page
    const errorText = await page.textContent('body').catch(() => '');
    if (errorText.includes('Something went wrong')) {
      console.log('\n❌ ERROR FOUND ON PAGE');
      
      // Try to get the error details
      const errorElement = await page.$('text=Something went wrong');
      if (errorElement) {
        const errorContainer = await errorElement.evaluateHandle(el => el.parentElement);
        const errorDetails = await errorContainer.asElement().textContent();
        console.log('Error details:', errorDetails);
      }
    }

    // Check what data is actually being rendered
    console.log('\n[PAGE STATE CHECK]');
    const pageState = await page.evaluate(() => {
      // Try to get React component state if possible
      return {
        bodyText: document.body.innerText.substring(0, 500),
        hasTable: !!document.querySelector('table'),
        hasErrorBoundary: document.body.innerText.includes('Something went wrong'),
        tableRowCount: document.querySelectorAll('table tbody tr').length
      };
    });
    console.log('Page State:', pageState);

    // Take a screenshot
    await page.screenshot({ path: '/mnt/c/Users/abhis/projects/seo expert/domains-page-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved to domains-page-test.png');

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log('Console Logs:', consoleLogs.length);
    console.log('Page Errors:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.log('Errors:', pageErrors);
    }

    // Find the specific logs we're looking for
    const domainsResponseLog = consoleLogs.find(log => log.text.includes('Domains API Response'));
    const domainsArrayLog = consoleLogs.find(log => log.text.includes('Domains array'));
    
    if (domainsResponseLog) {
      console.log('\n[FOUND] Domains API Response log');
    }
    if (domainsArrayLog) {
      console.log('[FOUND] Domains array log');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testDomainsPage();
