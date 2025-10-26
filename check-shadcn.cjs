const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🔍 Navigating to dashboard...');
    await page.goto('http://localhost:9000/unified/', { waitUntil: 'networkidle' });

    console.log('\n📊 Checking shadcn components...\n');

    // Check if CSS files are loaded
    const cssFiles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map(link => ({
        href: link.href,
        loaded: link.sheet !== null
      }));
    });

    console.log('CSS Files Status:');
    cssFiles.forEach(file => {
      const name = file.href.split('/').pop();
      console.log(`  ${file.loaded ? '✅' : '❌'} ${name}`);
    });

    // Check button styles
    console.log('\n🔘 Button Styles:');
    const buttonStyles = await page.evaluate(() => {
      const btn = document.querySelector('.btn.btn-outline');
      if (!btn) return { error: 'No button found' };
      const styles = window.getComputedStyle(btn);
      return {
        borderRadius: styles.borderRadius,
        fontWeight: styles.fontWeight,
        boxShadow: styles.boxShadow,
        backgroundColor: styles.backgroundColor,
        border: styles.border,
        padding: styles.padding
      };
    });

    console.log('  Border Radius:', buttonStyles.borderRadius);
    console.log('  Font Weight:', buttonStyles.fontWeight);
    console.log('  Box Shadow:', buttonStyles.boxShadow);
    console.log('  Background:', buttonStyles.backgroundColor);
    console.log('  Border:', buttonStyles.border);
    console.log('  Padding:', buttonStyles.padding);

    // Check card styles
    console.log('\n📦 Card Styles:');
    const cardStyles = await page.evaluate(() => {
      const card = document.querySelector('.card');
      if (!card) return { error: 'No card found' };
      const styles = window.getComputedStyle(card);
      return {
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        border: styles.border,
        backgroundColor: styles.backgroundColor,
        padding: styles.padding
      };
    });

    console.log('  Border Radius:', cardStyles.borderRadius);
    console.log('  Box Shadow:', cardStyles.boxShadow);
    console.log('  Border:', cardStyles.border);
    console.log('  Background:', cardStyles.backgroundColor);
    console.log('  Padding:', cardStyles.padding);

    // Check badge styles
    console.log('\n🏷️  Badge Styles:');
    const badgeStyles = await page.evaluate(() => {
      const badge = document.querySelector('.badge.badge-success');
      if (!badge) return { error: 'No badge found' };
      const styles = window.getComputedStyle(badge);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight
      };
    });

    console.log('  Background:', badgeStyles.backgroundColor);
    console.log('  Color:', badgeStyles.color);
    console.log('  Border Radius:', badgeStyles.borderRadius);
    console.log('  Padding:', badgeStyles.padding);
    console.log('  Font Size:', badgeStyles.fontSize);
    console.log('  Font Weight:', badgeStyles.fontWeight);

    // Take a screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({
      path: 'dashboard-shadcn-check.png',
      fullPage: false
    });
    console.log('  ✅ Screenshot saved: dashboard-shadcn-check.png');

    // Check which CSS classes are present
    console.log('\n🏷️  shadcn Classes Present:');
    const classes = await page.evaluate(() => {
      const elements = {
        buttons: document.querySelectorAll('.btn').length,
        btnOutline: document.querySelectorAll('.btn-outline').length,
        btnPrimary: document.querySelectorAll('.btn-primary').length,
        cards: document.querySelectorAll('.card').length,
        cardHeader: document.querySelectorAll('.card-header').length,
        cardContent: document.querySelectorAll('.card-content').length,
        cardTitle: document.querySelectorAll('.card-title').length,
        badges: document.querySelectorAll('.badge').length,
        badgeSuccess: document.querySelectorAll('.badge-success').length,
        badgePrimary: document.querySelectorAll('.badge-primary').length,
        badgeOutline: document.querySelectorAll('.badge-outline').length
      };
      return elements;
    });

    Object.entries(classes).forEach(([key, count]) => {
      console.log(`  ${count > 0 ? '✅' : '❌'} .${key}: ${count} element(s)`);
    });

    console.log('\n✨ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
