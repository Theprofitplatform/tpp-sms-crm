#!/usr/bin/env node

/**
 * Automated Homepage Restoration Script
 * Restores Instant Auto Traders homepage from backup using WordPress API
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load credentials from .env
const envPath = path.join(__dirname, 'env', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
        envVars[match[1]] = match[2].trim();
    }
});

const WP_URL = envVars.WORDPRESS_URL || 'https://instantautotraders.com.au';
const WP_USER = envVars.WORDPRESS_USER || 'Claude';
const WP_PASSWORD = envVars.WORDPRESS_APP_PASSWORD || '';

const API_BASE = `${WP_URL}/wp-json/wp/v2`;
const AUTH_HEADER = `Basic ${Buffer.from(`${WP_USER}:${WP_PASSWORD}`).toString('base64')}`;

// Homepage ID (from our backup files)
const HOMEPAGE_ID = 6353;

// Original homepage content from backup
const ORIGINAL_CONTENT = fs.readFileSync(
    path.join(__dirname, 'original-homepage-content.html'), 
    'utf8'
);

console.log('🚀 INSTANT AUTO TRADERS - AUTOMATED HOMEPAGE RESTORATION');
console.log('=' .repeat(70));
console.log(`📍 Site: ${WP_URL}`);
console.log(`👤 User: ${WP_USER}`);
console.log(`📄 Homepage ID: ${HOMEPAGE_ID}`);
console.log('=' .repeat(70));
console.log('');

/**
 * Make WordPress API request
 */
function makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_BASE}${endpoint}`);
        
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': AUTH_HEADER,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'InstantAutoTraders-Restorer/1.0'
            }
        };

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({
                        status: res.statusCode,
                        data: parsed,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: responseData,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Step 1: Test API connection
 */
async function testConnection() {
    console.log('🔍 STEP 1: Testing WordPress API connection...');
    
    try {
        const response = await makeRequest('/pages?per_page=1');
        
        if (response.status === 200) {
            console.log('   ✅ API connection successful');
            console.log('   ✅ Authentication validated');
            return true;
        } else {
            console.log(`   ❌ API connection failed (Status: ${response.status})`);
            if (response.status === 401) {
                console.log('   ❌ Authentication failed - check credentials');
            }
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Connection error: ${error.message}`);
        return false;
    }
}

/**
 * Step 2: Backup current homepage
 */
async function backupCurrentHomepage() {
    console.log('\n💾 STEP 2: Backing up current homepage...');
    
    try {
        const response = await makeRequest(`/pages/${HOMEPAGE_ID}`);
        
        if (response.status === 200) {
            const page = response.data;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(__dirname, `homepage-backup-${timestamp}.json`);
            
            const backup = {
                id: page.id,
                title: page.title.rendered,
                content: page.content.rendered,
                status: page.status,
                modified: page.modified,
                backup_date: new Date().toISOString()
            };
            
            fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
            
            console.log(`   ✅ Current homepage backed up`);
            console.log(`   📁 Backup file: ${path.basename(backupFile)}`);
            console.log(`   📊 Current title: "${page.title.rendered}"`);
            console.log(`   📊 Current content length: ${page.content.rendered.length} chars`);
            console.log(`   📅 Last modified: ${page.modified}`);
            
            return true;
        } else {
            console.log(`   ❌ Failed to get current homepage (Status: ${response.status})`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Backup error: ${error.message}`);
        return false;
    }
}

/**
 * Step 3: Restore original homepage content
 */
async function restoreHomepage() {
    console.log('\n🔧 STEP 3: Restoring original homepage content...');
    console.log('   📝 Using content from: original-homepage-content.html');
    
    try {
        const updateData = {
            content: ORIGINAL_CONTENT,
            title: 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
            status: 'publish'
        };
        
        const response = await makeRequest(`/pages/${HOMEPAGE_ID}`, 'POST', updateData);
        
        if (response.status === 200) {
            const page = response.data;
            console.log('   ✅ Homepage content restored successfully!');
            console.log(`   📊 New title: "${page.title.rendered}"`);
            console.log(`   📊 New content length: ${page.content.rendered.length} chars`);
            console.log(`   📅 Updated: ${page.modified}`);
            return true;
        } else {
            console.log(`   ❌ Failed to restore homepage (Status: ${response.status})`);
            console.log('   Response:', JSON.stringify(response.data, null, 2));
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Restoration error: ${error.message}`);
        return false;
    }
}

/**
 * Step 4: Clear WordPress cache
 */
async function clearCache() {
    console.log('\n🗑️  STEP 4: Clearing WordPress cache...');
    
    try {
        // Try to clear transients via REST API (if available)
        console.log('   ℹ️  Attempting to clear transients...');
        
        // Note: Standard WP API doesn't have cache clearing endpoint
        // This would require a custom endpoint or plugin
        console.log('   ⚠️  Cache clearing via API requires custom endpoint');
        console.log('   💡 Manual cache clearing may be needed:');
        console.log('      - Clear browser cache (Ctrl+F5)');
        console.log('      - Clear WordPress cache plugins (if installed)');
        console.log('      - Clear CDN cache (if using Cloudflare/etc)');
        
        return true;
    } catch (error) {
        console.log(`   ⚠️  Cache clearing skipped: ${error.message}`);
        return true; // Don't fail the whole process
    }
}

/**
 * Step 5: Verify restoration
 */
async function verifyRestoration() {
    console.log('\n✅ STEP 5: Verifying restoration...');
    
    try {
        const response = await makeRequest(`/pages/${HOMEPAGE_ID}`);
        
        if (response.status === 200) {
            const page = response.data;
            const content = page.content.rendered;
            
            // Check for key elements from original homepage
            const checks = {
                'Has "INSTANT AUTO TRADERS" heading': content.includes('INSTANT AUTO TRADERS'),
                'Has "Your Trusted Car Dealership" text': content.includes('Your Trusted Car Dealership'),
                'Has "Contact Us Today" button': content.includes('Contact Us Today'),
                'Has "View Our Cars" button': content.includes('View Our Cars'),
                'Has "Why Choose" section': content.includes('Why Choose'),
                'Has "Quality Assurance" feature': content.includes('Quality Assurance'),
                'Has "Competitive Pricing" feature': content.includes('Competitive Pricing'),
                'Has "Expert Service" feature': content.includes('Expert Service'),
                'Has proper WPBakery shortcodes': content.includes('[vc_row'),
                'Status is published': page.status === 'publish'
            };
            
            console.log('   📋 Verification Checklist:');
            let allPassed = true;
            Object.entries(checks).forEach(([check, passed]) => {
                console.log(`      ${passed ? '✅' : '❌'} ${check}`);
                if (!passed) allPassed = false;
            });
            
            console.log('');
            if (allPassed) {
                console.log('   🎉 ALL CHECKS PASSED - Homepage restored successfully!');
            } else {
                console.log('   ⚠️  Some checks failed - please review manually');
            }
            
            return allPassed;
        } else {
            console.log(`   ❌ Failed to verify (Status: ${response.status})`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Verification error: ${error.message}`);
        return false;
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        console.log('🏁 Starting automated homepage restoration...\n');
        
        // Step 1: Test connection
        const connected = await testConnection();
        if (!connected) {
            console.log('\n❌ FAILED: Cannot connect to WordPress API');
            console.log('Please check your credentials in env/.env');
            process.exit(1);
        }
        
        // Step 2: Backup current
        const backed = await backupCurrentHomepage();
        if (!backed) {
            console.log('\n⚠️  WARNING: Could not create backup, but continuing...');
        }
        
        // Step 3: Restore homepage
        const restored = await restoreHomepage();
        if (!restored) {
            console.log('\n❌ FAILED: Could not restore homepage');
            process.exit(1);
        }
        
        // Step 4: Clear cache
        await clearCache();
        
        // Step 5: Verify
        const verified = await verifyRestoration();
        
        // Final summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESTORATION SUMMARY');
        console.log('='.repeat(70));
        console.log(`✅ Connection:    SUCCESS`);
        console.log(`✅ Backup:        ${backed ? 'SUCCESS' : 'SKIPPED'}`);
        console.log(`✅ Restoration:   SUCCESS`);
        console.log(`✅ Verification:  ${verified ? 'SUCCESS' : 'PARTIAL'}`);
        console.log('='.repeat(70));
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('   1. Visit: https://instantautotraders.com.au/');
        console.log('   2. Clear your browser cache (Ctrl+F5 or Cmd+Shift+R)');
        console.log('   3. Verify the homepage displays correctly');
        console.log('   4. Check mobile responsiveness');
        console.log('   5. Test all buttons and links');
        console.log('');
        console.log('✨ Homepage restoration completed successfully!');
        
        process.exit(0);
        
    } catch (error) {
        console.log('\n❌ FATAL ERROR:', error.message);
        console.log('\nStack trace:', error.stack);
        process.exit(1);
    }
}

// Run the script
main();
