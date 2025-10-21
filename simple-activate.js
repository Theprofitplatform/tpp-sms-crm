// Simple WordPress plugin activation
import https from 'https';
import fs from 'fs';
import path from 'path';

// Load environment
const envPath = './env/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const WP_URL = envVars.WORDPRESS_URL;
const WP_USER = envVars.WORDPRESS_USER;
const WP_PASS = envVars.WORDPRESS_APP_PASSWORD;

console.log('🔧 Activating WordPress plugin...');

const auth = Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64');

// Helper for HTTPS requests
function httpsRequest(url, options = {}, data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const req = https.request(requestOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    data: body
                });
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

// Get all plugins
async function getPlugins() {
    const response = await httpsRequest(`${WP_URL}/wp-json/wp/v2/plugins`, {
        headers: {
            'Authorization': `Basic ${auth}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.status}`);
    }
    
    return JSON.parse(response.data);
}

// Activate specific plugin
async function activatePlugin(pluginFile) {
    const data = JSON.stringify({
        status: 'active'
    });
    
    const response = await httpsRequest(`${WP_URL}/wp-json/wp/v2/plugins/${pluginFile}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    }, data);
    
    return response.ok;
}

// Main activation
async function main() {
    try {
        const plugins = await getPlugins();
        const targetPlugin = plugins.find(p => p.plugin === 'instant-auto-traders-blog-fix/instant-auto-traders-blog-fix.php');
        
        if (targetPlugin) {
            if (targetPlugin.status === 'active') {
                console.log('✅ Plugin is already active!');
            } else {
                console.log('🚀 Activating plugin...');
                const success = await activatePlugin(targetPlugin.plugin);
                
                if (success) {
                    console.log('✅ Plugin activated successfully!');
                } else {
                    console.log('❌ Failed to activate plugin');
                }
            }
        } else {
            console.log('❌ Plugin not found in WordPress. The file exists but WordPress may need to recognize it.');
            console.log('💡 Try manual activation in WordPress admin:');
            console.log('   1. Go to: https://instantautotraders.com.au/wp-admin');
            console.log('   2. Navigate to Plugins');
            console.log('   3. Find "Instant Auto Traders - Blog Listing Fix"');
            console.log('   4. Click Activate');
        }
        
        console.log('\n🌐 Check the results at: https://instantautotraders.com.au/blog/');
        console.log('🔄 Press Ctrl+F5 to refresh cache');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();
