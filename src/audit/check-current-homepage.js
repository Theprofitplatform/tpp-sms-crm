/**
 * Check Current Homepage Content via WordPress API
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load credentials
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
const AUTH_HEADER = `Basic ${Buffer.from(`${WP_USER}:${WP_PASSWORD}`).toString('base64')}`;
const HOMEPAGE_ID = 6353;

console.log('🔍 CHECKING CURRENT HOMEPAGE CONTENT\n');

function makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${WP_URL}/wp-json/wp/v2${endpoint}`);
        
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': AUTH_HEADER,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
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

async function checkHomepage() {
    try {
        const response = await makeRequest(`/pages/${HOMEPAGE_ID}`);
        
        if (response.status === 200) {
            const page = response.data;
            
            console.log('📄 CURRENT HOMEPAGE STATUS:');
            console.log('=' .repeat(70));
            console.log(`Title: ${page.title.rendered}`);
            console.log(`Status: ${page.status}`);
            console.log(`Last Modified: ${page.modified}`);
            console.log(`Content Length: ${page.content.rendered.length} characters`);
            console.log('=' .repeat(70));
            
            // Extract first 500 chars of content
            const contentPreview = page.content.rendered
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 500);
            
            console.log('\n📝 CONTENT PREVIEW (first 500 chars):');
            console.log('-'.repeat(70));
            console.log(contentPreview);
            console.log('-'.repeat(70));
            
            // Check for key elements
            const content = page.content.rendered;
            console.log('\n✅ KEY ELEMENTS CHECK:');
            console.log(`   ${content.includes('INSTANT AUTO TRADERS') ? '✅' : '❌'} Contains "INSTANT AUTO TRADERS"`);
            console.log(`   ${content.includes('Your Trusted Car Dealership') ? '✅' : '❌'} Contains "Your Trusted Car Dealership"`);
            console.log(`   ${content.includes('Contact Us Today') ? '✅' : '❌'} Contains "Contact Us Today"`);
            console.log(`   ${content.includes('Why Choose') ? '✅' : '❌'} Contains "Why Choose"`);
            console.log(`   ${content.includes('Quality Assurance') ? '✅' : '❌'} Contains "Quality Assurance"`);
            console.log(`   ${content.includes('[vc_row') ? '✅' : '❌'} Contains WPBakery shortcodes`);
            console.log(`   ${content.includes('[rev_slider') ? '✅' : '❌'} Contains Revolution Slider`);
            
            // Save full content to file
            const outputFile = path.join(__dirname, 'current-homepage-full-content.html');
            fs.writeFileSync(outputFile, page.content.rendered);
            console.log(`\n💾 Full content saved to: current-homepage-full-content.html`);
            
            // Save metadata
            const metadata = {
                id: page.id,
                title: page.title.rendered,
                status: page.status,
                modified: page.modified,
                contentLength: page.content.rendered.length,
                excerpt: page.excerpt.rendered
            };
            
            const metaFile = path.join(__dirname, 'current-homepage-metadata.json');
            fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
            console.log(`💾 Metadata saved to: current-homepage-metadata.json`);
            
            return page;
        } else {
            console.log(`❌ Failed to get homepage (Status: ${response.status})`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return null;
    }
}

checkHomepage();
