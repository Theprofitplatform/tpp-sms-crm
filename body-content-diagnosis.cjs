const { chromium } = require('@playwright/test');

(async () => {
  console.log('🔍 DIAGNOSING MISSING BODY CONTENT - Instant Auto Traders');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    await page.goto('https://instantautotraders.com.au/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log('\n📋 COMPREHENSIVE BODY CONTENT ANALYSIS:');

    // 1. Check main content containers
    console.log('\n🎯 1. MAIN CONTENT CONTAINERS:');
    const mainContainers = [
      '#main',
      '#content', 
      '.main-content',
      '#primary',
      '.main',
      '.content-area',
      'main'
    ];
    
    let containerResults = {};
    for (const selector of mainContainers) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          const visible = await page.locator(selector).first().isVisible();
          const content = await page.locator(selector).first().innerHTML();
          
          containerResults[selector] = {
            count: count,
            visible: visible,
            hasContent: content.length > 0,
            contentLength: content.length,
            hasText: content.length > 0 && await page.locator(selector).first().innerText().trim().length > 0
          };
          
          console.log(`   📦 ${selector}: ${count} found | Visible: ${visible} | Has content: ${content.length > 0} chars`);
        } else {
          console.log(`   ❌ ${selector}: Not found`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${selector}: Error - ${e.message}`);
      }
    }

    // 2. Check WPBakery content specifically
    console.log('\n🏗️  2. WPBAKERY CONTENT ANALYSIS:');
    const wpbakeryContent = await page.evaluate(() => {
      const results = {
        vcRows: [],
        vcColumns: [],
        wpbWrappers: [],
        textColumns: [],
        hiddenElements: []
      };
      
      // Check VC Rows
      const vcRows = document.querySelectorAll('.vc_row');
      vcRows.forEach((row, index) => {
        results.vcRows.push({
          index: index,
          visible: row.offsetParent !== null,
          hasContent: row.innerText.trim().length > 0,
          textLength: row.innerText.length,
          className: row.className,
          styles: row.getAttribute('style'),
          content: row.innerText.substring(0, 100)
        });
      });
      
      // Check VC Columns
      const vcColumns = document.querySelectorAll('.vc_column, .vc_column_container');
      vcColumns.forEach((col, index) => {
        results.vcColumns.push({
          index: index,
          visible: col.offsetParent !== null,
          hasContent: col.innerText.trim().length > 0,
          textLength: col.innerText.length,
          className: col.className
        });
      });
      
      // Check WPB Wrappers
      const wpbWrappers = document.querySelectorAll('.wpb_wrapper');
      wpbWrappers.forEach((wrapper, index) => {
        results.wpbWrappers.push({
          index: index,
          visible: wrapper.offsetParent !== null,
          hasContent: wrapper.innerText.trim().length > 0,
          textLength: wrapper.innerText.length,
          html: wrapper.innerHTML.substring(0, 200)
        });
      });
      
      // Check text columns
      const textColumns = document.querySelectorAll('.wpb_text_column');
      textColumns.forEach((col, index) => {
        results.textColumns.push({
          index: index,
          visible: col.offsetParent !== null,
          hasContent: col.innerText.trim().length > 0,
          textLength: col.innerText.length,
          content: col.innerText.substring(0, 100)
        });
      });
      
      // Check for hidden elements
      const allElements = document.querySelectorAll('*');
      allElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
          results.hiddenElements.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity
          });
        }
      });
      
      return results;
    });
    
    console.log(`   📊 VC Rows: ${wpbakeryContent.vcRows.length}`);
    wpbakeryContent.vcRows.forEach((row, index) => {
      console.log(`      Row ${index}: Visible=${row.visible} | Has Content=${row.hasContent} (${row.textLength} chars)`);
    });
    
    console.log(`   📊 VC Columns: ${wpbakeryContent.vcColumns.length}`);
    const visibleColumns = wpbakeryContent.vcColumns.filter(col => col.visible);
    console.log(`      Visible columns: ${visibleColumns.length}`);
    
    console.log(`   📊 WPB Wrappers: ${wpbakeryContent.wpbWrappers.length}`);
    const visibleWrappers = wpbakeryContent.wpbWrappers.filter(wrapper => wrapper.visible);
    console.log(`      Visible wrappers: ${visibleWrappers.length}`);
    
    console.log(`   📊 Text Columns: ${wpbakeryContent.textColumns.length}`);
    wpbakeryContent.textColumns.forEach((col, index) => {
      console.log(`      Text Column ${index}: Visible=${col.visible} | Content="${col.content}"`);
    });
    
    console.log(`   📊 Hidden Elements: ${wpbakeryContent.hiddenElements.length}`);
    const importantHidden = wpbakeryContent.hiddenElements.filter(el => 
      el.className.includes('vc_') || el.className.includes('wpb_') || el.id.includes('content')
    );
    console.log(`      Important hidden elements: ${importantHidden.length}`);
    importantHidden.forEach((el, index) => {
      console.log(`      - ${el.tagName}.${el.className}: ${el.display}/${el.visibility}/${el.opacity}`);
    });

    // 3. Check page structure and layout
    console.log('\n🏗️  3. PAGE STRUCTURE ANALYSIS:');
    const pageStructure = await page.evaluate(() => {
      const body = document.body;
      const children = Array.from(body.children);
      
      return {
        bodyChildren: children.map(child => ({
          tagName: child.tagName,
          className: child.className,
          id: child.id,
          visible: child.offsetParent !== null,
          hasText: child.innerText.trim().length > 0,
          textLength: child.innerText.length,
          innerHTML: child.innerHTML.substring(0, 200)
        })),
        bodyText: body.innerText.substring(0, 500),
        bodyHTML: body.innerHTML.substring(0, 1000)
      };
    });
    
    console.log(`   👶 Body children: ${pageStructure.bodyChildren.length}`);
    pageStructure.bodyChildren.forEach((child, index) => {
      console.log(`      ${index + 1}. ${child.tagName} (${child.className || child.id}): Visible=${child.visible} | Text=${child.textLength} chars`);
    });
    
    console.log(`   📝 Body text preview: "${pageStructure.bodyText}..."`);
    
    // 4. Check CSS that might be hiding content
    console.log('\n🎨 4. CSS HIDDEN CONTENT ANALYSIS:');
    const cssAnalysis = await page.evaluate(() => {
      const issues = [];
      
      // Check for problematic styles
      const elements = document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [style*="opacity: 0"]');
      elements.forEach((el, index) => {
        issues.push({
          index: index,
          element: el.tagName + (el.className ? '.' + el.className : '') + (el.id ? '#' + el.id : ''),
          style: el.getAttribute('style'),
          text: el.innerText.substring(0, 50)
        });
      });
      
      // Check computed styles
      const allElements = document.querySelectorAll('*');
      const hiddenByCSS = [];
      allElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
          if (el.className.includes('vc_') || el.className.includes('wpb_')) {
            hiddenByCSS.push({
              element: el.tagName + (el.className ? '.' + el.className : ''),
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity
            });
          }
        }
      });
      
      return {
        inlineHides: issues,
        cssHides: hiddenByCSS
      };
    });
    
    console.log(`   ⚠️  Inline hidden elements: ${cssAnalysis.inlineHides.length}`);
    cssAnalysis.inlineHides.forEach((issue, index) => {
      console.log(`      ${index + 1}. ${issue.element}: "${issue.style}"`);
    });
    
    console.log(`   ⚠️  CSS hidden WPBakery elements: ${cssAnalysis.cssHides.length}`);
    cssAnalysis.cssHides.forEach((issue, index) => {
      console.log(`      ${index + 1}. ${issue.element}: display=${issue.display}, visibility=${issue.visibility}, opacity=${issue.opacity}`);
    });

    // 5. Take diagnostic screenshot
    console.log('\n📸 5. CAPTURING DIAGNOSTIC SCREENSHOT:');
    await page.screenshot({ 
      path: 'body-content-diagnosis.png', 
      fullPage: true 
    });
    console.log('   ✅ Diagnostic screenshot saved: body-content-diagnosis.png');

    console.log('\n🔍 DIAGNOSIS SUMMARY:');
    
    const hasVisibleVC = wpbakeryContent.vcRows.some(row => row.visible);
    const hasVisibleContent = pageStructure.bodyChildren.some(child => child.visible && child.textLength > 10);
    const hasCSSIssues = cssAnalysis.cssHides.length > 0;
    
    console.log(`   - Has visible VC Rows: ${hasVisibleVC}`);
    console.log(`   - Has visible body content: ${hasVisibleContent}`);
    console.log(`   - CSS hiding issues: ${hasCSSIssues}`);
    
    if (!hasVisibleContent && hasCSSIssues) {
      console.log('\n💡 LIKELY ISSUE: CSS styles are hiding WPBakery content');
      console.log('   The JavaScript fix might be over-aggressive in hiding content');
    } else if (!hasVisibleVC) {
      console.log('\n💡 LIKELY ISSUE: WPBakery content not loading properly');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  } finally {
    await browser.close();
  }
})();
