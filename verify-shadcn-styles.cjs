const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Verifying shadcn styles on dashboard...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:9000/unified/', { waitUntil: 'networkidle', timeout: 10000 });

    // Check card styles
    const cardStyles = await page.evaluate(() => {
      const card = document.querySelector('.card');
      if (!card) return { error: 'No card found' };

      const styles = window.getComputedStyle(card);
      return {
        borderRadius: styles.borderRadius,
        backgroundColor: styles.backgroundColor,
        boxShadow: styles.boxShadow,
        borderColor: styles.borderColor,
        padding: styles.padding
      };
    });

    console.log('📦 Card Styles:');
    console.log('  Border Radius:', cardStyles.borderRadius);
    console.log('  Background:', cardStyles.backgroundColor);
    console.log('  Box Shadow:', cardStyles.boxShadow);
    console.log('  Border:', cardStyles.borderColor);
    console.log();

    // Check main-content padding
    const contentStyles = await page.evaluate(() => {
      const main = document.querySelector('.main-content');
      if (!main) return { error: 'No main-content found' };

      const styles = window.getComputedStyle(main);
      return {
        padding: styles.padding,
        background: styles.backgroundColor
      };
    });

    console.log('📄 Main Content Styles:');
    console.log('  Padding:', contentStyles.padding);
    console.log('  Background:', contentStyles.background);
    console.log();

    // Check header styles
    const headerStyles = await page.evaluate(() => {
      const header = document.querySelector('.content-header');
      if (!header) return { error: 'No header found' };

      const styles = window.getComputedStyle(header);
      return {
        padding: styles.padding,
        marginBottom: styles.marginBottom,
        borderBottom: styles.borderBottom,
        background: styles.backgroundColor
      };
    });

    console.log('🎯 Header Styles:');
    console.log('  Padding:', headerStyles.padding);
    console.log('  Margin Bottom:', headerStyles.marginBottom);
    console.log('  Border Bottom:', headerStyles.borderBottom);
    console.log('  Background:', headerStyles.background);
    console.log();

    // Check stats-grid spacing
    const gridStyles = await page.evaluate(() => {
      const grid = document.querySelector('.stats-grid');
      if (!grid) return { error: 'No stats-grid found' };

      const styles = window.getComputedStyle(grid);
      return {
        gap: styles.gap,
        marginBottom: styles.marginBottom,
        gridTemplateColumns: styles.gridTemplateColumns
      };
    });

    console.log('📊 Stats Grid:');
    console.log('  Gap:', gridStyles.gap);
    console.log('  Margin Bottom:', gridStyles.marginBottom);
    console.log('  Columns:', gridStyles.gridTemplateColumns);
    console.log();

    // Take screenshot
    await page.screenshot({
      path: 'dashboard-shadcn-final.png',
      fullPage: true
    });

    console.log('✅ Screenshot saved as dashboard-shadcn-final.png');
    console.log('✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
