const { chromium } = require('@playwright/test');

(async () => {
  console.log('🚀 COMPREHENSIVE TESTING - Instant Auto Traders Homepage Fix Verification...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for better visibility
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  try {
    // Navigate to homepage
    console.log('📍 Navigating to homepage...');
    await page.goto('https://instantautotraders.com.au/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Test 1: Check if slider is hidden
    console.log('🔍 Test 1: Checking if problematic slider is hidden...');
    const sliderWrapper = await page.locator('#rev_slider_1_1_wrapper').count();
    if (sliderWrapper > 0) {
      const sliderVisible = await page.locator('#rev_slider_1_1_wrapper').isVisible();
      console.log(`   Slider element found: ${sliderWrapper}`);
      console.log(`   Slider visibility: ${sliderVisible}`);
      
      // Check if our CSS is applied
      const sliderStyle = await page.$eval('#rev_slider_1_1_wrapper', el => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          visibility: styles.visibility
        };
      });
      console.log(`   Slider CSS - Display: ${sliderStyle.display}, Visibility: ${sliderStyle.visibility}`);
    } else {
      console.log('   ✅ Slider element not found (good)');
    }

    // Test 2: Check if body content is displayed
    console.log('🔍 Test 2: Checking body content visibility...');
    const bodyContent = await page.locator('.wpb_wrapper').first().isVisible();
    console.log(`   Body content visible: ${bodyContent}`);
    
    // Test 3: Check for our injected CSS
    console.log('🔍 Test 3: Checking for injected CSS fix...');
    const cssInjected = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      return styles.some(style => {
        try {
          const rules = Array.from(style.cssRules || style.rules || []);
          return rules.some(rule => 
            rule.cssText && 
            rule.cssText.includes('.iat-hero-section') || 
            rule.cssText.includes('#rev_slider_1_1_wrapper')
          );
        } catch (e) {
          return false;
        }
      });
    });
    console.log(`   CSS injection detected: ${cssInjected}`);

    // Test 4: Check page title and content
    console.log('🔍 Test 4: Checking page content...');
    const title = await page.title();
    console.log(`   Page title: ${title}`);
    
    const mainContent = await page.locator('body').textContent();
    const hasContent = mainContent && mainContent.includes('Instant Auto Traders');
    console.log(`   Main content contains business name: ${hasContent}`);

    // Test 5: Capture screenshot
    console.log('📸 Test 5: Taking screenshot...');
    await page.screenshot({ 
      path: 'homepage-test.png', 
      fullPage: true 
    });
    console.log('   ✅ Screenshot saved as homepage-test.png');

    // Test 6: Mobile responsiveness
    console.log('📱 Test 6: Testing mobile responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'homepage-test-mobile.png', 
      fullPage: true 
    });
    console.log('   ✅ Mobile screenshot saved as homepage-test-mobile.png');

    // Test 7: Check for any JavaScript errors
    console.log('🐛 Test 7: Checking for JavaScript errors...');
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    await page.reload({ waitUntil: 'networkidle' });
    
    if (errors.length > 0) {
      console.log(`   ⚠️  JavaScript errors found: ${errors.length}`);
      errors.forEach(error => console.log(`     - ${error.substring(0, 100)}...`));
    } else {
      console.log('   ✅ No JavaScript errors detected');
    }

    console.log('\n🎉 Homepage testing completed!');
    console.log('📊 Summary:');
    console.log(`   - Slider hidden: ${sliderWrapper === 0 || !await page.locator('#rev_slider_1_1_wrapper').isVisible()}`);
    console.log(`   - Body content visible: ${bodyContent}`);
    console.log(`   - CSS injected: ${cssInjected}`);
    console.log(`   - Page has content: ${hasContent}`);
    console.log('   - Screenshots captured for visual verification');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await browser.close();
  }
})();
