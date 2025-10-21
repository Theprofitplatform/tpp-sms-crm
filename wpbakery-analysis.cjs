const { chromium } = require('@playwright/test');

(async () => {
  console.log('🔧 WPBAKERY PAGE BUILDER ANALYSIS - Instant Auto Traders');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    await page.goto('https://instantautotraders.com.au/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('\n📋 WPBakery Structure Analysis:');

    // Test WPBakery elements
    const wpbakeryElements = [
      '.vc_row',
      '.vc_column',
      '.vc_column_container',
      '.vc_column_inner',
      '.wpb_wrapper',
      '.wpb_raw_code',
      '.vc_raw_html',
      '.wpb_text_column',
      '.vc_row:has(.wpb_raw_code)',
      '.wpb_wrapper:has(.rs-module-wrap)',
      '.wpb_raw_code:contains("rev_slider")'
    ];

    let structureInfo = {};
    for (const selector of wpbakeryElements) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          const visible = await page.locator(selector).first().isVisible();
          const content = await page.locator(selector).first().innerHTML();
          
          structureInfo[selector] = {
            count: count,
            visible: visible,
            hasContent: content.length > 50,
            containsSlider: content.includes('rev_slider') || content.includes('Slider'),
            contentPreview: content.substring(0, 100).replace(/\n/g, ' ')
          };
          
          console.log(`   📦 ${selector}: ${count} elements | Visible: ${visible} | Has Slider: ${content.includes('rev_slider')}`);
        }
      } catch (e) {
        console.log(`   ❌ ${selector}: Error - ${e.message}`);
      }
    }

    console.log('\n🎯 Slider Location Analysis:');
    
    // Find which WPBakery element contains the slider
    const sliderContainer = await page.evaluate(() => {
      const results = [];
      
      // Check all wpb_raw_code elements
      const rawCodes = document.querySelectorAll('.wpb_raw_code');
      rawCodes.forEach((el, index) => {
        const html = el.innerHTML;
        if (html.includes('rev_slider') || html.includes('Slider') || html.includes('rs-module')) {
          results.push({
            type: 'wpb_raw_code',
            index: index,
            html: html.substring(0, 200),
            visible: el.offsetParent !== null
          });
        }
      });
      
      // Check all vc_row elements
      const rows = document.querySelectorAll('.vc_row');
      rows.forEach((el, index) => {
        const html = el.innerHTML;
        if (html.includes('rev_slider') || html.includes('Slider') || html.includes('rs-module')) {
          results.push({
            type: 'vc_row',
            index: index,
            html: html.substring(0, 200),
            visible: el.offsetParent !== null
          });
        }
      });
      
      // Check all wpb_wrapper elements
      const wrappers = document.querySelectorAll('.wpb_wrapper');
      wrappers.forEach((el, index) => {
        const html = el.innerHTML;
        if (html.includes('rev_slider') || html.includes('Slider') || html.includes('rs-module')) {
          results.push({
            type: 'wpb_wrapper',
            index: index,
            html: html.substring(0, 200),
            visible: el.offsetParent !== null
          });
        }
      });
      
      return results;
    });

    console.log('   📍 Slider Container Analysis:');
    if (sliderContainer.length === 0) {
      console.log('   ✅ No slider elements found in WPBakery structure (good!)');
    } else {
      sliderContainer.forEach((container, index) => {
        console.log(`   🔍 Container ${index + 1}: ${container.type} | Visible: ${container.visible}`);
        console.log(`      Preview: ${container.html}...`);
      });
    }

    console.log('\n🎨 Page Content Sections:');
    
    // Analyze page sections
    const contentAnalysis = await page.evaluate(() => {
      const sections = [];
      
      // Get all vc_row elements
      const rows = document.querySelectorAll('.vc_row');
      rows.forEach((row, index) => {
        const text = row.innerText;
        const hasButton = row.querySelector('a') !== null;
        const hasHeading = row.querySelector('h1, h2, h3, h4, h5, h6') !== null;
        const visible = row.offsetParent !== null;
        
        if (text.trim().length > 10) {
          sections.push({
            index: index,
            visible: visible,
            hasButton: hasButton,
            hasHeading: hasHeading,
            textLength: text.length,
            textPreview: text.substring(0, 100).replace(/\n/g, ' '),
            classes: row.className
          });
        }
      });
      
      return sections;
    });

    console.log('   📑 Content Sections:');
    contentAnalysis.forEach((section, index) => {
      console.log(`   📄 Section ${section.index}: Visible ${section.visible} | Length: ${section.textLength} chars | Classes: ${section.classes}`);
      console.log(`      Preview: ${section.textPreview}...`);
    });

    console.log('\n🛠️ WPBakery-Friendly Solution:');
    
    if (sliderContainer.length > 0) {
      console.log('   💡 RECOMMENDED APPROACH:');
      console.log('   1. Hide the specific WPBakey element containing the slider');
      console.log('   2. Add new WPBakery-compatible hero content');
      console.log('   3. Use WPBakery-safe JavaScript targeting');
      
      // Show specific CSS selectors to target
      console.log('\n   🎯 SPECIFIC TARGETS:');
      sliderContainer.forEach((container, index) => {
        console.log(`   📍 Hide: .${container.type}:nth-child(${container.index + 1})`);
      });
    } else {
      console.log('   ✅ Slider already removed or hidden!');
      console.log('   🎯 WPBakery elements are functioning properly');
    }

    // Final screenshot with WPBakery annotations
    await page.screenshot({ 
      path: 'wpbakery-analysis.png', 
      fullPage: true 
    });
    console.log('\n📸 WPBakery analysis screenshot saved: wpbakery-analysis.png');

  } catch (error) {
    console.error('❌ Error during WPBakery analysis:', error.message);
  } finally {
    await browser.close();
  }
})();
