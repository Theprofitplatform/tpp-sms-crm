/**
 * Check and Activate Required Plugins
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

console.log('🔌 CHECKING & FIXING PLUGINS\n');

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

async function checkPlugins() {
    console.log('📋 Checking installed plugins...\n');
    
    const response = await makeRequest('/plugins');
    
    if (response.status === 200) {
        const plugins = response.data;
        
        console.log(`Found ${plugins.length} plugins:\n`);
        
        const criticalPlugins = [
            'js_composer',
            'revslider',
            'wpbakery',
            'visual-composer',
            'qode',
            'bridge'
        ];
        
        plugins.forEach(plugin => {
            const icon = plugin.status === 'active' ? '✅' : '❌';
            console.log(`${icon} ${plugin.name}`);
            console.log(`   Plugin: ${plugin.plugin}`);
            console.log(`   Status: ${plugin.status}`);
            
            const isCritical = criticalPlugins.some(key => 
                plugin.plugin.toLowerCase().includes(key) || 
                plugin.name.toLowerCase().includes(key)
            );
            
            if (isCritical && plugin.status !== 'active') {
                console.log(`   ⚠️  CRITICAL: This plugin should be active!`);
            }
            console.log('');
        });
        
        // Find inactive critical plugins
        const inactivePlugins = plugins.filter(p => 
            p.status !== 'active' && 
            criticalPlugins.some(key => 
                p.plugin.toLowerCase().includes(key) || 
                p.name.toLowerCase().includes(key)
            )
        );
        
        if (inactivePlugins.length > 0) {
            console.log('\n🔧 ATTEMPTING TO ACTIVATE CRITICAL PLUGINS...\n');
            
            for (const plugin of inactivePlugins) {
                console.log(`Activating: ${plugin.name}...`);
                
                const activateResponse = await makeRequest(
                    `/plugins/${encodeURIComponent(plugin.plugin)}`,
                    'POST',
                    { status: 'active' }
                );
                
                if (activateResponse.status === 200) {
                    console.log(`✅ Successfully activated ${plugin.name}`);
                } else {
                    console.log(`❌ Failed to activate ${plugin.name} (Status: ${activateResponse.status})`);
                    console.log(`   Response:`, activateResponse.data);
                }
            }
        } else {
            console.log('\n✅ All critical plugins are already active!');
        }
        
        return plugins;
    } else {
        console.log(`❌ Failed to get plugins (Status: ${response.status})`);
        console.log('Response:', response.data);
        return null;
    }
}

checkPlugins();
