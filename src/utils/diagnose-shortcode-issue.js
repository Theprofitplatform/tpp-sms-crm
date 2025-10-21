/**
 * Diagnose why shortcodes aren't rendering
 */

import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'https://instantautotraders.com.au/';

// Load credentials
const envPath = path.join(__dirname, 'env', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) envVars[match[1]] = match[2].trim();
});

const WP_URL = envVars.WORDPRESS_URL;
const WP_USER = envVars.WORDPRESS_USER;
const WP_PASSWORD = envVars.WORDPRESS_APP_PASSWORD;
const AUTH_HEADER = `Basic ${Buffer.from(`${WP_USER}:${WP_PASSWORD}`).toString('base64')}`;

console.log('🔍 DIAGNOSING SHORTCODE RENDERING ISSUE\n');

function makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${WP_URL}/wp-json/wp/v2${endpoint}`);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Authorization': AUTH_HEADER,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function diagnose() {
    console.log('📊 STEP 1: Check page raw content from database\n');
    
    try {
        const pageResponse = await makeRequest('/pages/6353');
        
        if (pageResponse.status === 200) {
            const page = pageResponse.data;
            
            // Get raw content (not rendered)
            const rawContent = page.content?.raw || '';
            
            console.log('Database Content Analysis:');
            console.log('─'.repeat(70));
            console.log(`Total length: ${rawContent.length} chars`);
            console.log(`Contains [vc_row]: ${rawContent.includes('[vc_row') ? '✅ YES' : '❌ NO'}`);
            console.log(`Contains [rev_slider: ${rawContent.includes('[rev_slider') ? '✅ YES' : '❌ NO'}`);
            console.log(`Contains [qode_: ${rawContent.includes('[qode_') ? '✅ YES' : '❌ NO'}`);
            console.log(`Contains HTML entities: ${rawContent.includes('&lt;') || rawContent.includes('&#') ? '⚠️  YES - ENCODED!' : '✅ NO'}`);
            console.log('─'.repeat(70));
            
            // Check for HTML encoding
            if (rawContent.includes('&lt;') || rawContent.includes('&#91;')) {
                console.log('\n⚠️  PROBLEM FOUND: Shortcodes are HTML-encoded!');
                console.log('   Shortcodes like [vc_row] are stored as &lt;vc_row&gt; or &#91;vc_row&#93;');
                console.log('   This prevents them from rendering.\n');
            }
            
            // Show first 500 chars
            console.log('\nFirst 500 characters of raw content:');
            console.log('─'.repeat(70));
            console.log(rawContent.substring(0, 500));
            console.log('─'.repeat(70));
            
            // Save full raw content
            fs.writeFileSync('homepage-raw-content.txt', rawContent);
            console.log('\n💾 Full raw content saved to: homepage-raw-content.txt\n');
            
            // Check page metadata
            const meta = page.meta || {};
            console.log('Page Metadata:');
            console.log('─'.repeat(70));
            console.log(`_wpb_vc_js_status: ${meta._wpb_vc_js_status || 'not set'}`);
            console.log(`_wpb_shortcodes_custom_css: ${meta._wpb_shortcodes_custom_css ? 'present' : 'not set'}`);
            console.log(`_wp_page_template: ${meta._wp_page_template || 'default'}`);
            console.log('─'.repeat(70));
            
        } else {
            console.log(`❌ Could not fetch page (Status: ${pageResponse.status})`);
        }
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
    
    console.log('\n🌐 STEP 2: Check what browser actually sees\n');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check for shortcode text in visible content
    const bodyHTML = await page.content();
    const bodyText = await page.locator('body').textContent();
    
    console.log('Browser View Analysis:');
    console.log('─'.repeat(70));
    console.log(`Page title: ${await page.title()}`);
    console.log(`Body text contains [vc_: ${bodyText.includes('[vc_') ? '❌ YES - NOT RENDERING' : '✅ NO'}`);
    console.log(`Body text contains [qode_: ${bodyText.includes('[qode_') ? '❌ YES - NOT RENDERING' : '✅ NO'}`);
    console.log(`HTML contains vc_row class: ${bodyHTML.includes('class="vc_row') ? '✅ YES - RENDERING' : '❌ NO'}`);
    console.log(`HTML contains wpb- classes: ${bodyHTML.includes('class="wpb_') ? '✅ YES' : '❌ NO'}`);
    console.log('─'.repeat(70));
    
    // Check for WPBakery CSS
    const wpbCSS = await page.locator('link[href*="js_composer"]').count();
    const vcCSS = await page.locator('link[href*="visual-composer"]').count();
    
    console.log('\nPlugin Assets Loading:');
    console.log('─'.repeat(70));
    console.log(`WPBakery CSS files: ${wpbCSS}`);
    console.log(`Visual Composer CSS files: ${vcCSS}`);
    console.log('─'.repeat(70));
    
    // Check active theme
    const themeInfo = await page.evaluate(() => {
        const bodyClasses = document.body.className;
        const themeLinks = Array.from(document.querySelectorAll('link[href*="/themes/"]'));
        return {
            bodyClasses,
            themeStylesheets: themeLinks.map(l => l.href)
        };
    });
    
    console.log('\nActive Theme:');
    console.log('─'.repeat(70));
    console.log(`Body classes: ${themeInfo.bodyClasses}`);
    console.log(`Theme stylesheets:`);
    themeInfo.themeStylesheets.slice(0, 3).forEach(s => {
        const themeName = s.match(/\/themes\/([^\/]+)\//)?.[1];
        console.log(`   - ${themeName}`);
    });
    console.log('─'.repeat(70));
    
    // Save HTML
    fs.writeFileSync('homepage-rendered-html.html', bodyHTML);
    console.log('\n💾 Full rendered HTML saved to: homepage-rendered-html.html\n');
    
    await browser.close();
    
    console.log('\n' + '═'.repeat(70));
    console.log('📋 DIAGNOSIS SUMMARY');
    console.log('═'.repeat(70));
    
    console.log('\n🔍 Check these files to identify the issue:');
    console.log('   1. homepage-raw-content.txt - What\'s in the database');
    console.log('   2. homepage-rendered-html.html - What the browser receives');
    console.log('   3. Compare with: original-homepage-content.html\n');
}

diagnose();
