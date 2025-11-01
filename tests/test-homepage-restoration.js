/**
 * Playwright Homepage Restoration Test & Debug Script
 * Tests the restored Instant Auto Traders homepage
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOMEPAGE_URL = 'https://instantautotraders.com.au/';
const RESULTS_DIR = path.join(__dirname, 'test-results');

// Create results directory
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

console.log('🎭 PLAYWRIGHT HOMEPAGE TEST & DEBUG');
console.log('=' .repeat(70));
console.log(`🌐 Testing URL: ${HOMEPAGE_URL}`);
console.log(`📁 Results Dir: ${RESULTS_DIR}`);
console.log('=' .repeat(70));
console.log('');

const testResults = {
    url: HOMEPAGE_URL,
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: [],
    errors: [],
    warnings: [],
    performance: {},
    accessibility: []
};

/**
 * Run a test and record result
 */
function recordTest(name, passed, details = '') {
    const result = { name, passed, details };
    testResults.tests.push(result);
    const icon = passed ? '✅' : '❌';
    console.log(`   ${icon} ${name}${details ? ': ' + details : ''}`);
    return passed;
}

/**
 * Test 1: Desktop View Test
 */
async function testDesktopView(browser) {
    console.log('\n🖥️  TEST 1: DESKTOP VIEW (1920x1080)');
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();
    
    try {
        // Navigate and measure load time
        const startTime = Date.now();
        await page.goto(HOMEPAGE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        const loadTime = Date.now() - startTime;
        testResults.performance.desktopLoadTime = loadTime;
        recordTest('Page loads successfully', true, `${loadTime}ms`);
        
        // Take full page screenshot
        const screenshotPath = path.join(RESULTS_DIR, 'desktop-fullpage.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        testResults.screenshots.push('desktop-fullpage.png');
        console.log(`   📸 Screenshot saved: desktop-fullpage.png`);
        
        // Check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
                testResults.errors.push({ source: 'console', message: msg.text() });
            }
        });
        
        // Wait a bit for any dynamic content
        await page.waitForTimeout(2000);
        
        // Test: Page title
        const title = await page.title();
        recordTest('Page has proper title', title.includes('Instant Auto Traders'), `"${title}"`);
        
        // Test: Main heading exists
        const h1Exists = await page.locator('h1').count() > 0;
        const h1Text = h1Exists ? await page.locator('h1').first().textContent() : '';
        recordTest('H1 heading exists', h1Exists, `"${h1Text.trim()}"`);
        recordTest('H1 contains "INSTANT AUTO TRADERS"', h1Text.includes('INSTANT AUTO TRADERS'));
        
        // Test: Key content sections
        const sections = [
            { selector: 'text=Your Trusted Car Dealership', name: 'Tagline' },
            { selector: 'text=Contact Us Today', name: 'Contact button' },
            { selector: 'text=View Our Cars', name: 'Inventory button' },
            { selector: 'text=Why Choose', name: 'Why Choose section' },
            { selector: 'text=Quality Assurance', name: 'Quality feature' },
            { selector: 'text=Competitive Pricing', name: 'Pricing feature' },
            { selector: 'text=Expert Service', name: 'Service feature' }
        ];
        
        for (const section of sections) {
            const exists = await page.locator(section.selector).count() > 0;
            recordTest(`${section.name} visible`, exists);
        }
        
        // Test: Buttons are clickable
        const contactBtn = page.locator('text=Contact Us Today').first();
        const contactVisible = await contactBtn.isVisible().catch(() => false);
        recordTest('Contact button is visible', contactVisible);
        
        if (contactVisible) {
            const contactEnabled = await contactBtn.isEnabled().catch(() => false);
            recordTest('Contact button is enabled', contactEnabled);
        }
        
        // Test: Check for any visible error messages
        const errorMessages = await page.locator('.error, .warning, [class*="error"]').count();
        recordTest('No error messages on page', errorMessages === 0, errorMessages ? `Found ${errorMessages} errors` : '');
        
        // Test: Check images load
        const images = await page.locator('img').all();
        let brokenImages = 0;
        for (const img of images) {
            const naturalWidth = await img.evaluate(el => el.naturalWidth).catch(() => 0);
            if (naturalWidth === 0) brokenImages++;
        }
        recordTest('All images load correctly', brokenImages === 0, brokenImages ? `${brokenImages} broken images` : `${images.length} images OK`);
        
        // Get performance metrics
        const metrics = await page.evaluate(() => {
            const perf = performance.getEntriesByType('navigation')[0];
            return {
                domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
                loadComplete: perf.loadEventEnd - perf.loadEventStart,
                firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
            };
        });
        testResults.performance.desktop = metrics;
        console.log(`   ⚡ DOM Content Loaded: ${Math.round(metrics.domContentLoaded)}ms`);
        console.log(`   ⚡ Load Complete: ${Math.round(metrics.loadComplete)}ms`);
        
        // Check for WPBakery/Visual Composer elements
        const vcElements = await page.locator('[class*="vc_"], [class*="wpb_"]').count();
        recordTest('WPBakery elements present', vcElements > 0, `${vcElements} elements`);
        
    } catch (error) {
        recordTest('Desktop test completed', false, error.message);
        testResults.errors.push({ source: 'desktop-test', message: error.message });
    } finally {
        await context.close();
    }
}

/**
 * Test 2: Mobile View Test
 */
async function testMobileView(browser) {
    console.log('\n📱 TEST 2: MOBILE VIEW (375x667 - iPhone SE)');
    const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        isMobile: true,
        hasTouch: true
    });
    const page = await context.newPage();
    
    try {
        const startTime = Date.now();
        await page.goto(HOMEPAGE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        const loadTime = Date.now() - startTime;
        testResults.performance.mobileLoadTime = loadTime;
        recordTest('Mobile page loads', true, `${loadTime}ms`);
        
        // Screenshot
        const screenshotPath = path.join(RESULTS_DIR, 'mobile-fullpage.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        testResults.screenshots.push('mobile-fullpage.png');
        console.log(`   📸 Screenshot saved: mobile-fullpage.png`);
        
        await page.waitForTimeout(2000);
        
        // Test mobile-specific elements
        const h1Visible = await page.locator('h1').first().isVisible();
        recordTest('H1 visible on mobile', h1Visible);
        
        // Test tap targets
        const buttons = await page.locator('a[href*="contact"], a[href*="inventory"]').all();
        recordTest('Call-to-action buttons present', buttons.length >= 2, `${buttons.length} buttons`);
        
        // Check for horizontal scrolling (bad for mobile)
        const hasHorizontalScroll = await page.evaluate(() => {
            return document.body.scrollWidth > window.innerWidth;
        });
        recordTest('No horizontal scroll', !hasHorizontalScroll);
        
        // Test text is readable (not too small)
        const fontSizes = await page.evaluate(() => {
            const elements = document.querySelectorAll('p, span, div, a');
            const sizes = [];
            elements.forEach(el => {
                const size = parseFloat(window.getComputedStyle(el).fontSize);
                if (size > 0) sizes.push(size);
            });
            return sizes;
        });
        const minFontSize = Math.min(...fontSizes);
        recordTest('Font size readable', minFontSize >= 12, `Min: ${minFontSize}px`);
        
        // Check viewport meta tag
        const viewportMeta = await page.locator('meta[name="viewport"]').count();
        recordTest('Viewport meta tag present', viewportMeta > 0);
        
    } catch (error) {
        recordTest('Mobile test completed', false, error.message);
        testResults.errors.push({ source: 'mobile-test', message: error.message });
    } finally {
        await context.close();
    }
}

/**
 * Test 3: Tablet View Test
 */
async function testTabletView(browser) {
    console.log('\n📲 TEST 3: TABLET VIEW (768x1024 - iPad)');
    const context = await browser.newContext({
        viewport: { width: 768, height: 1024 },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        isMobile: true,
        hasTouch: true
    });
    const page = await context.newPage();
    
    try {
        await page.goto(HOMEPAGE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Screenshot
        const screenshotPath = path.join(RESULTS_DIR, 'tablet-fullpage.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        testResults.screenshots.push('tablet-fullpage.png');
        console.log(`   📸 Screenshot saved: tablet-fullpage.png`);
        
        await page.waitForTimeout(2000);
        
        const h1Visible = await page.locator('h1').first().isVisible();
        recordTest('Content visible on tablet', h1Visible);
        
        const layout = await page.evaluate(() => {
            return {
                width: document.body.scrollWidth,
                height: document.body.scrollHeight
            };
        });
        recordTest('Layout fits tablet viewport', layout.width <= 768);
        
    } catch (error) {
        recordTest('Tablet test completed', false, error.message);
        testResults.errors.push({ source: 'tablet-test', message: error.message });
    } finally {
        await context.close();
    }
}

/**
 * Test 4: Link & Button Functionality
 */
async function testInteractivity(browser) {
    console.log('\n🔗 TEST 4: LINKS & BUTTONS');
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    try {
        await page.goto(HOMEPAGE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Get all links
        const links = await page.locator('a[href]').all();
        const linkCount = links.length;
        recordTest('Links found on page', linkCount > 0, `${linkCount} links`);
        
        // Check for broken links (just check href attributes exist)
        let emptyHrefs = 0;
        for (const link of links) {
            const href = await link.getAttribute('href');
            if (!href || href === '#' || href === '') emptyHrefs++;
        }
        recordTest('Links have valid hrefs', emptyHrefs === 0, emptyHrefs ? `${emptyHrefs} empty hrefs` : 'All valid');
        
        // Test specific important buttons
        const importantLinks = [
            { text: 'Contact Us', href: 'contact' },
            { text: 'Inventory', href: 'inventory' }
        ];
        
        for (const link of importantLinks) {
            const element = page.locator(`a:has-text("${link.text}")`).first();
            const exists = await element.count() > 0;
            if (exists) {
                const href = await element.getAttribute('href');
                const valid = href && href.includes(link.href);
                recordTest(`${link.text} button links correctly`, valid, `href="${href}"`);
            } else {
                recordTest(`${link.text} button exists`, false);
            }
        }
        
    } catch (error) {
        recordTest('Interactivity test completed', false, error.message);
        testResults.errors.push({ source: 'interactivity-test', message: error.message });
    } finally {
        await context.close();
    }
}

/**
 * Test 5: SEO Elements
 */
async function testSEO(browser) {
    console.log('\n🔍 TEST 5: SEO ELEMENTS');
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        await page.goto(HOMEPAGE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Check meta tags
        const metaDescription = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '');
        recordTest('Meta description exists', metaDescription.length > 0, metaDescription ? `${metaDescription.length} chars` : '');
        
        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => '');
        recordTest('Open Graph title exists', ogTitle.length > 0);
        
        // Check structured data
        const schemaScripts = await page.locator('script[type="application/ld+json"]').count();
        recordTest('Structured data (Schema) present', schemaScripts > 0, `${schemaScripts} scripts`);
        
        // Check heading hierarchy
        const h1Count = await page.locator('h1').count();
        recordTest('Single H1 tag', h1Count === 1, `Found ${h1Count} H1 tags`);
        
        const h2Count = await page.locator('h2').count();
        recordTest('H2 tags present', h2Count > 0, `${h2Count} H2 tags`);
        
        // Check alt tags on images
        const images = await page.locator('img').all();
        let missingAlts = 0;
        for (const img of images) {
            const alt = await img.getAttribute('alt');
            if (!alt) missingAlts++;
        }
        recordTest('Images have alt tags', missingAlts === 0, missingAlts ? `${missingAlts}/${images.length} missing` : 'All images OK');
        
    } catch (error) {
        recordTest('SEO test completed', false, error.message);
        testResults.errors.push({ source: 'seo-test', message: error.message });
    } finally {
        await context.close();
    }
}

/**
 * Generate HTML report
 */
function generateReport() {
    console.log('\n📊 GENERATING TEST REPORT...');
    
    const passedTests = testResults.tests.filter(t => t.passed).length;
    const totalTests = testResults.tests.length;
    const passRate = Math.round((passedTests / totalTests) * 100);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Homepage Restoration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2a5298; border-bottom: 3px solid #f39c12; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .summary { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary-stat { display: inline-block; margin: 10px 20px 10px 0; }
        .summary-stat strong { font-size: 24px; color: #2a5298; }
        .test-result { padding: 10px; margin: 5px 0; border-left: 4px solid #ddd; background: #fafafa; }
        .test-result.passed { border-left-color: #4caf50; }
        .test-result.failed { border-left-color: #f44336; background: #ffebee; }
        .error { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .screenshot { border: 2px solid #ddd; border-radius: 8px; overflow: hidden; }
        .screenshot img { width: 100%; height: auto; }
        .screenshot-label { background: #2a5298; color: white; padding: 10px; text-align: center; font-weight: bold; }
        .performance { background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .performance-metric { margin: 8px 0; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .badge-success { background: #4caf50; color: white; }
        .badge-warning { background: #ff9800; color: white; }
        .badge-error { background: #f44336; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎭 Homepage Restoration Test Report</h1>
        <p><strong>URL:</strong> ${testResults.url}</p>
        <p><strong>Tested:</strong> ${new Date(testResults.timestamp).toLocaleString()}</p>
        
        <div class="summary">
            <h2>📊 Test Summary</h2>
            <div class="summary-stat">
                <strong>${passedTests}/${totalTests}</strong><br>Tests Passed
            </div>
            <div class="summary-stat">
                <strong>${passRate}%</strong><br>Pass Rate
            </div>
            <div class="summary-stat">
                <strong>${testResults.errors.length}</strong><br>Errors
            </div>
            <div class="summary-stat">
                <strong>${testResults.screenshots.length}</strong><br>Screenshots
            </div>
        </div>
        
        <div class="performance">
            <h2>⚡ Performance Metrics</h2>
            <div class="performance-metric">
                <strong>Desktop Load Time:</strong> ${testResults.performance.desktopLoadTime || 'N/A'}ms
                ${testResults.performance.desktopLoadTime < 3000 ? '<span class="badge badge-success">GOOD</span>' : '<span class="badge badge-warning">SLOW</span>'}
            </div>
            <div class="performance-metric">
                <strong>Mobile Load Time:</strong> ${testResults.performance.mobileLoadTime || 'N/A'}ms
                ${testResults.performance.mobileLoadTime < 4000 ? '<span class="badge badge-success">GOOD</span>' : '<span class="badge badge-warning">SLOW</span>'}
            </div>
        </div>
        
        <h2>✅ Test Results</h2>
        ${testResults.tests.map(test => `
            <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                <strong>${test.passed ? '✅' : '❌'} ${test.name}</strong>
                ${test.details ? `<br><small>${test.details}</small>` : ''}
            </div>
        `).join('')}
        
        ${testResults.errors.length > 0 ? `
            <h2>⚠️ Errors & Warnings</h2>
            ${testResults.errors.map(err => `
                <div class="error">
                    <strong>${err.source}:</strong> ${err.message}
                </div>
            `).join('')}
        ` : ''}
        
        <h2>📸 Screenshots</h2>
        <div class="screenshots">
            ${testResults.screenshots.map(screenshot => `
                <div class="screenshot">
                    <div class="screenshot-label">${screenshot.replace('.png', '').replace(/-/g, ' ').toUpperCase()}</div>
                    <img src="${screenshot}" alt="${screenshot}" loading="lazy">
                </div>
            `).join('')}
        </div>
        
        <hr style="margin: 40px 0;">
        <p style="text-align: center; color: #666;">
            Generated by Playwright Automated Testing System<br>
            Instant Auto Traders Homepage Restoration Project
        </p>
    </div>
</body>
</html>
    `;
    
    const reportPath = path.join(RESULTS_DIR, 'test-report.html');
    fs.writeFileSync(reportPath, html);
    console.log(`   ✅ HTML report saved: test-report.html`);
    
    // Save JSON results
    const jsonPath = path.join(RESULTS_DIR, 'test-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
    console.log(`   ✅ JSON results saved: test-results.json`);
}

/**
 * Main test execution
 */
async function runTests() {
    let browser;
    
    try {
        console.log('🚀 Launching browser...\n');
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        await testDesktopView(browser);
        await testMobileView(browser);
        await testTabletView(browser);
        await testInteractivity(browser);
        await testSEO(browser);
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(70));
        
        const passed = testResults.tests.filter(t => t.passed).length;
        const total = testResults.tests.length;
        const passRate = Math.round((passed / total) * 100);
        
        console.log(`✅ Tests Passed: ${passed}/${total} (${passRate}%)`);
        console.log(`❌ Tests Failed: ${total - passed}`);
        console.log(`⚠️  Errors: ${testResults.errors.length}`);
        console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
        console.log('='.repeat(70));
        
        generateReport();
        
        console.log('\n🎯 NEXT STEPS:');
        console.log(`   1. Open test-results/test-report.html in your browser`);
        console.log(`   2. Review screenshots in test-results/ directory`);
        console.log(`   3. Address any failed tests or errors`);
        console.log(`   4. Visit ${HOMEPAGE_URL} to verify manually`);
        
        if (passRate === 100) {
            console.log('\n🎉 ALL TESTS PASSED! Homepage restoration is successful!');
        } else if (passRate >= 80) {
            console.log('\n✅ Most tests passed. Minor issues may need attention.');
        } else {
            console.log('\n⚠️  Several tests failed. Please review the report.');
        }
        
    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the tests
runTests();
