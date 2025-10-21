/**
 * Restore homepage with COMPATIBLE shortcodes (no Bridge/Qode dependency)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const HOMEPAGE_ID = 6353;

// Load compatible content
const COMPATIBLE_CONTENT = fs.readFileSync(
    path.join(__dirname, 'homepage-content-COMPATIBLE.html'), 
    'utf8'
);

console.log('🔧 RESTORING HOMEPAGE WITH COMPATIBLE SHORTCODES\n');
console.log('This version uses ONLY standard WPBakery shortcodes');
console.log('No Bridge theme or Qode plugins required!\n');

function makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${WP_URL}/wp-json/wp/v2${endpoint}`);
        
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': AUTH_HEADER,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(responseData) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function restoreHomepage() {
    try {
        console.log('📄 Creating backup of current homepage...');
        const currentResponse = await makeRequest(`/pages/${HOMEPAGE_ID}`);
        
        if (currentResponse.status === 200) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(__dirname, `homepage-backup-before-compatible-${timestamp}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(currentResponse.data, null, 2));
            console.log(`✅ Backup saved: ${path.basename(backupFile)}\n`);
        }
        
        console.log('🔧 Updating homepage with compatible shortcodes...');
        
        const updateData = {
            content: COMPATIBLE_CONTENT,
            status: 'publish'
        };
        
        const response = await makeRequest(`/pages/${HOMEPAGE_ID}`, 'POST', updateData);
        
        if (response.status === 200) {
            console.log('✅ Homepage updated successfully!\n');
            console.log('═'.repeat(70));
            console.log('WHAT WAS CHANGED:');
            console.log('═'.repeat(70));
            console.log('❌ REMOVED: [qode_elements_holder] shortcodes (Bridge theme only)');
            console.log('❌ REMOVED: [qode_carousel] shortcodes (Bridge theme only)');
            console.log('❌ REMOVED: [rev_slider] shortcode (replaced with fallback)');
            console.log('✅ ADDED: Standard WPBakery [vc_row] and [vc_column] shortcodes');
            console.log('✅ ADDED: WPBakery [vc_btn] buttons');
            console.log('✅ ADDED: Fallback hero section with styled HTML');
            console.log('═'.repeat(70));
            console.log('\n🎯 NEXT STEPS:');
            console.log('   1. Clear WordPress cache');
            console.log('   2. Clear browser cache (Ctrl+F5)');
            console.log('   3. Visit: https://instantautotraders.com.au/');
            console.log('   4. Verify NO shortcode text is visible');
            console.log('\n✨ This version works with your current conceptseven theme!\n');
            
            return true;
        } else {
            console.log(`❌ Failed to update (Status: ${response.status})`);
            console.log('Response:', response.data);
            return false;
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

restoreHomepage();
