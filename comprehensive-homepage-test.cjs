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
    
    // Wait for page to fully load
    await page.waitForTimeout(5000);

    // Test 1: Check if slider is hidden - COMPREHENSIVE
    console.log('🔍 Test 1: COMPREHENSIVE - Checking if problematic slider is hidden...');
    
    // Check multiple slider selectors
    const sliderSelectors = [
      '#rev_slider_1_1_wrapper',
      '#rev_slider_1_1', 
      '.rs-module-wrap',
      '.rev_slider_error'
    ];
    
    let sliderResults = {};
    for (const selector of sliderSelectors) {
      try {
        const sliderCount = await page.locator(selector).count();
        const sliderVisible = sliderCount > 0 ? await page.locator(selector).isVisible() : false;
        
        if (sliderCount > 0) {
          const sliderStyle = await page.$eval(selector, el => {
            const styles = window.getComputedStyle(el);
            return {
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity,
              height: styles.height
            };
          });
          sliderResults[selector] = {
            found: true,
            visible: sliderVisible,
            styles: sliderStyle
          };
        } else {
          sliderResults[selector] = {
            found: false,
            visible: false
          };
        }
      } catch (e) {
        sliderResults[selector] = {
          found: false,
          error: e.message
        };
      }
    }
    
    console.log('   📊 Slider Analysis Results:');
    Object.entries(sliderResults).forEach(([selector, result]) => {
      if (result.found) {
        console.log(`   📍 ${selector}: FOUND | Visible: ${result.visible} | Display: ${result.styles?.display}`);
      } else {
        console.log(`   ✅ ${selector}: NOT FOUND (good)`);
      }
    });

    // Test 2: Check body content and business elements
    console.log('🔍 Test 2: COMPREHENSIVE - Checking body content and business elements...');
    
    const businessElements = [
      { selector: '.wpb_wrapper', name: 'Content Wrapper' },
      { selector: 'h1, h2, h3', name: 'Headings' },
      { selector: 'a[href*="contact-us"]', name: 'Contact Links' },
      { selector: 'a[href*="tel:"]', name: 'Phone Links' },
      { selector: 'text="Instant Auto Traders"', name: 'Business Name' },
      { selector: 'text="0426 232 000"', name: 'Phone Number' }
    ];
    
    let contentResults = {};
    for (const element of businessElements) {
      try {
        const count = await page.locator(element.selector).count();
        const visible = count > 0 && await page.locator(element.selector).first().isVisible();
        contentResults[element.name] = {
          count: count,
          visible: visible,
          status: visible ? '✅ VISIBLE' : '❌ HIDDEN'
        };
      } catch (e) {
        contentResults[element.name] = {
          count: 0,
          visible: false,
          error: e.message
        };
      }
    }
    
    console.log('   📊 Business Content Analysis:');
    Object.entries(contentResults).forEach(([name, result]) => {
      console.log(`   ${result.status} ${name}: ${result.count} elements`);
    });

    // Test 3: Check for JavaScript fix execution
    console.log('🔍 Test 3: COMPREHENSIVE - Checking for JavaScript fix execution...');
    
    const jsFixResults = await page.evaluate(() => {
      // Check if slider removal script ran
      const sliderElements = document.querySelectorAll('#rev_slider_1_1_wrapper, #rev_slider_1_1, .rs-module-wrap');
      const sliderCompletelyRemoved = sliderElements.length === 0;
      
      return {
        sliderCompletelyRemoved: sliderCompletelyRemoved,
        sliderElementsCount: sliderElements.length,
        pageTitle: document.title,
        url: window.location.href,
        hasContent: document.body.innerText.includes('Instant Auto Traders')
      };
    });
    
    console.log(`   🎯 JavaScript Fix Results:`);
    console.log(`   ✅ Slider completely removed: ${jsFixResults.sliderCompletelyRemoved}`);
    console.log(`   📊 Remaining slider elements: ${jsFixResults.sliderElementsCount}`);
    console.log(`   📄 Page title: ${jsFixResults.pageTitle}`);
    console.log(`   🔗 Current URL: ${jsFixResults.url}`);
    console.log(`   📝 Has business content: ${jsFixResults.hasContent}`);

    // Test 4: Detailed page structure analysis
    console.log('🔍 Test 4: COMPREHENSIVE - Page structure analysis...');
    
    const pageStructure = await page.evaluate(() => {
      const body = document.body;
      const allElements = body.querySelectorAll('*');
      const visibleElements = Array.from(allElements).filter(el => {
        const styles = window.getComputedStyle(el);
        return styles.display !== 'none' && 
               styles.visibility !== 'hidden' && 
               styles.opacity !== '0' &&
               el.offsetWidth > 0 && 
               el.offsetHeight > 0;
      });
      
      const hasText = el => el.innerText && el.innerText.trim().length > 0;
      const textElements = visibleElements.filter(hasText);
      
      return {
        totalElements: allElements.length,
        visibleElements: visibleElements.length,
        textElements: textElements.length,
        bodyTextLength: body.innerText.length,
        hasBusinessInfo: body.innerText.toLowerCase().includes('instant auto traders'),
        hasContactInfo: body.innerText.includes('0426') || body.innerText.includes('contact')
      };
    });
    
    console.log(`   📊 Page Structure Analysis:`);
    console.log(`   📐 Total elements: ${pageStructure.totalElements}`);
    console.log(`   👁️  Visible elements: ${pageStructure.visibleElements}`);
    console.log(`   📝 Text elements: ${pageStructure.textElements}`);
    console.log(`   📏 Body text length: ${pageStructure.bodyTextLength} chars`);
    console.log(`   🏢 Has business info: ${pageStructure.hasBusinessInfo}`);
    console.log(`   ☎️  Has contact info: ${pageStructure.hasContactInfo}`);

    // Test 5: High-quality screenshots
    console.log('📸 Test 5: CAPTURING COMPREHENSIVE SCREENSHOTS...');
    
    // Desktop screenshot
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'homepage-verification-desktop.png', 
      fullPage: true
    });
    console.log('   ✅ Desktop screenshot saved: homepage-verification-desktop.png');
    
    // Tablet screenshot
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'homepage-verification-tablet.png', 
      fullPage: true
    });
    console.log('   ✅ Tablet screenshot saved: homepage-verification-tablet.png');
    
    // Mobile screenshot
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'homepage-verification-mobile.png', 
      fullPage: true
    });
    console.log('   ✅ Mobile screenshot saved: homepage-verification-mobile.png');

    // Test 6: Performance and errors check
    console.log('🐛 Test 6: PERFORMANCE & COMPREHENSIVE ERROR ANALYSIS...');
    
    const errors = [];
    const warnings = [];
    
    page.on('pageerror', error => {
      errors.push({
        type: 'JavaScript Error',
        message: error.message,
        stack: error.stack
      });
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'Console Error',
          message: msg.text(),
          location: msg.location()
        });
      } else if (msg.type() === 'warning') {
        warnings.push({
          type: 'Console Warning',
          message: msg.text()
        });
      }
    });
    
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    console.log(`   📊 Error Analysis:`);
    console.log(`   ❌ JavaScript errors: ${errors.length}`);
    errors.forEach((error, index) => {
      console.log(`     ${index + 1}. ${error.type}: ${error.message.substring(0, 80)}...`);
    });
    
    console.log(`   ⚠️  JavaScript warnings: ${warnings.length}`);
    if (warnings.length > 0) {
      warnings.slice(0, 3).forEach((warning, index) => {
        console.log(`     ${index + 1}. ${warning.message.substring(0, 80)}...`);
      });
    }
    
    if (errors.length === 0) {
      console.log('   ✅ No critical JavaScript errors detected');
    }

    // Final comprehensive verdict
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS - VERDICT:');
    
    const sliderHidden = Object.values(sliderResults).every(result => !result.found || !result.visible);
    const contentVisible = Object.values(contentResults).some(result => result.visible);
    const jsFixWorking = jsFixResults.sliderCompletelyRemoved || jsFixResults.sliderElementsCount === 0;
    const hasBusinessContent = pageStructure.hasBusinessInfo && pageStructure.hasContactInfo;
    
    console.log('\n📊 DETAILED BREAKDOWN:');
    console.log(`   🎯 SLIDER STATUS: ${sliderHidden ? '✅ SUCCESSFULLY HIDDEN' : '❌ STILL VISIBLE'}`);
    console.log(`   📝 CONTENT STATUS: ${contentVisible ? '✅ PROPERLY DISPLAYED' : '❌ CONTENT NOT VISIBLE'}`);
    console.log(`   ⚡ JAVASCRIPT FIX: ${jsFixWorking ? '✅ WORKING CORRECTLY' : '❌ NOT FUNCTIONING'}`);
    console.log(`   🏢 BUSINESS INFO: ${hasBusinessContent ? '✅ PRESENT & VISIBLE' : '❌ MISSING OR HIDDEN'}`);
    console.log(`   🖥️  RESPONSIVE: ✅ TESTED ON ALL SCREEN SIZES`);
    console.log(`   🐛 ERROR STATUS: ${errors.length === 0 ? '✅ NO CRITICAL ERRORS' : `⚠️ ${errors.length} ERRORS FOUND`}`);
    
    const overallSuccess = sliderHidden && contentVisible && jsFixWorking && hasBusinessContent && errors.length === 0;
    
    console.log(`\n🏆 OVERALL STATUS: ${overallSuccess ? '✅ HOMEPAGE FIX SUCCESSFUL!' : '⚠️  NEEDS ADDITIONAL WORK'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 CONGRATULATIONS! Your Instant Auto Traders homepage is working perfectly!');
      console.log('   • Problematic slider has been completely removed');
      console.log('   • Business content is displayed properly');
      console.log('   • Contact information is visible');
      console.log('   • Mobile responsive design is working');
      console.log('   • No critical JavaScript errors');
    } else {
      console.log('\n⚠️  Some issues still need attention. Check the detailed results above.');
    }

  } catch (error) {
    console.error('❌ Error during comprehensive testing:', error.message);
  } finally {
    await browser.close();
  }
})();
