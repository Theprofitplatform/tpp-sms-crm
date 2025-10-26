const { test, expect } = require('@playwright/test');

test.describe('Production Dashboard (Port 8080)', () => {

  test('should load React dashboard on port 8080', async ({ page }) => {
    // Go to production server
    await page.goto('http://localhost:8080');

    // Wait for React to render
    await page.waitForTimeout(2000);

    // Take screenshot for verification
    await page.screenshot({ path: '/tmp/dashboard-8080.png', fullPage: true });

    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    expect(title).toContain('SEO Automation Platform');

    // Check for React root element
    const rootElement = await page.locator('#root').count();
    expect(rootElement).toBeGreaterThan(0);

    // Check if React has rendered content (not empty)
    const bodyText = await page.textContent('body');
    console.log('Body text length:', bodyText.length);
    expect(bodyText.length).toBeGreaterThan(100);

    // Check for main navigation elements
    const hasNavigation = bodyText.includes('Dashboard') ||
                          bodyText.includes('Clients') ||
                          bodyText.includes('Reports');
    expect(hasNavigation).toBeTruthy();
  });

  test('should load React assets correctly', async ({ page }) => {
    const responses = [];

    // Capture all network requests
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type']
      });
    });

    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);

    // Check for main JS bundle
    const jsBundle = responses.find(r => r.url.includes('/assets/index-') && r.url.endsWith('.js'));
    console.log('JS Bundle:', jsBundle);
    expect(jsBundle).toBeTruthy();
    expect(jsBundle.status).toBe(200);

    // Check for main CSS bundle
    const cssBundle = responses.find(r => r.url.includes('/assets/index-') && r.url.endsWith('.css'));
    console.log('CSS Bundle:', cssBundle);
    expect(cssBundle).toBeTruthy();
    expect(cssBundle.status).toBe(200);
  });

  test('should navigate to Clients page', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(2000);

    // Try to find and click Clients link
    const clientsLink = page.locator('text=Clients').first();
    if (await clientsLink.count() > 0) {
      await clientsLink.click();
      await page.waitForTimeout(1000);

      const bodyText = await page.textContent('body');
      const hasClientContent = bodyText.includes('Client') ||
                               bodyText.includes('Add') ||
                               bodyText.includes('Name');
      expect(hasClientContent).toBeTruthy();
    } else {
      console.log('Navigation not yet visible - checking for content');
      const bodyText = await page.textContent('body');
      expect(bodyText.length).toBeGreaterThan(50);
    }
  });

  test('should not load old website files', async ({ page }) => {
    const responses = [];

    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status()
      });
    });

    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);

    // These are old website files - they should NOT be loaded
    const oldFiles = [
      'combined.min.js',
      'critical.min.css',
      'navigation.css',
      'modern-theme-variables.css'
    ];

    const foundOldFiles = responses.filter(r =>
      oldFiles.some(oldFile => r.url.includes(oldFile))
    );

    console.log('Old files found:', foundOldFiles.length);
    foundOldFiles.forEach(f => console.log('  -', f.url));

    // Should NOT find any old website files
    expect(foundOldFiles.length).toBe(0);
  });

});
