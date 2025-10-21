#!/usr/bin/env node

/**
 * Deploy Schema Fixer v1.1.0 via cPanel UAPI
 * Direct deployment using cPanel API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// cPanel credentials - MUST be set in environment variables
const CPANEL_URL = process.env.CPANEL_URL || 'https://your-domain.com:2083';
const CPANEL_USER = process.env.CPANEL_USER;
const CPANEL_PASS = process.env.CPANEL_PASS;

if (!CPANEL_USER || !CPANEL_PASS) {
    console.error('❌ ERROR: CPANEL_USER and CPANEL_PASS must be set in environment variables');
    console.error('Set them in config/env/.env or export them:');
    console.error('  export CPANEL_USER=your_username');
    console.error('  export CPANEL_PASS=your_password');
    process.exit(1);
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  Deploying via cPanel API                                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const auth = Buffer.from(`${CPANEL_USER}:${CPANEL_PASS}`).toString('base64');

// Read plugin file
const pluginFile = path.join(__dirname, 'schema-fixer.php');
const pluginContent = fs.readFileSync(pluginFile, 'utf8');
const pluginPath = '/home/instanta/public_html/wp-content/plugins/instant-auto-traders-schema-fixer/schema-fixer.php';

console.log('📦 Plugin loaded:', (pluginContent.length / 1024).toFixed(2), 'KB');
console.log('📍 Target path:', pluginPath, '\n');

async function deployViaCPanelAPI() {
    try {
        console.log('🚀 Step 1: Connecting to cPanel...\n');

        // Method 1: Try cPanel UAPI Filemanager save_file_content
        console.log('📝 Method 1: Using Filemanager API to save file...\n');

        const response = await axios.get(`${CPANEL_URL}/execute/Filemanager/save_file_content`, {
            params: {
                dir: '/home/instanta/public_html/wp-content/plugins/instant-auto-traders-schema-fixer',
                file: 'schema-fixer.php',
                content: pluginContent,
                encoding: 'utf-8'
            },
            headers: {
                'Authorization': `Basic ${auth}`,
            },
            httpsAgent: new (await import('https')).Agent({
                rejectUnauthorized: false // cPanel often uses self-signed certs
            }),
            timeout: 30000
        });

        if (response.data && response.data.status === 1) {
            console.log('✅ Plugin deployed successfully via cPanel API!\n');
            console.log('📊 Response:', JSON.stringify(response.data, null, 2), '\n');
            return true;
        } else {
            console.log('⚠️  Response:', JSON.stringify(response.data, null, 2), '\n');
            return false;
        }

    } catch (error) {
        console.log('ℹ️  Method 1 failed:', error.message, '\n');
        return false;
    }
}

async function deployViaFTP() {
    console.log('📝 Method 2: Trying FTP upload...\n');

    try {
        const ftp = await import('basic-ftp');
        const client = new ftp.Client();
        client.ftp.verbose = true;

        await client.access({
            host: 'instantautotraders.com.au',
            user: CPANEL_USER,
            password: CPANEL_PASS,
            secure: false
        });

        console.log('✅ FTP connected!\n');

        // Change to plugin directory
        await client.cd('/public_html/wp-content/plugins/instant-auto-traders-schema-fixer');

        // Upload file
        await client.uploadFrom(pluginFile, 'schema-fixer.php');

        console.log('✅ Plugin uploaded via FTP!\n');

        client.close();
        return true;

    } catch (error) {
        console.log('ℹ️  FTP not available:', error.message, '\n');
        return false;
    }
}

async function backupExistingFile() {
    console.log('💾 Creating backup of existing file...\n');

    try {
        const response = await axios.get(`${CPANEL_URL}/execute/Filemanager/copy_files`, {
            params: {
                sourcefiles: JSON.stringify([{
                    path: '/home/instanta/public_html/wp-content/plugins/instant-auto-traders-schema-fixer/schema-fixer.php'
                }]),
                destdir: '/home/instanta/public_html/wp-content/plugins/instant-auto-traders-schema-fixer',
                destfile: `schema-fixer-backup-${Date.now()}.php`
            },
            headers: {
                'Authorization': `Basic ${auth}`,
            },
            httpsAgent: new (await import('https')).Agent({
                rejectUnauthorized: false
            }),
            timeout: 10000
        });

        if (response.data && response.data.status === 1) {
            console.log('✅ Backup created!\n');
            return true;
        }
    } catch (error) {
        console.log('ℹ️  Backup attempt:', error.message, '\n');
    }
    return false;
}

async function clearLiteSpeedCache() {
    console.log('🧹 Clearing LiteSpeed cache...\n');

    try {
        // Try to clear via WordPress REST API
        const response = await axios.post(
            'https://instantautotraders.com.au/wp-json/litespeed/v1/purge_all',
            {},
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USER}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
                },
                timeout: 10000
            }
        );

        console.log('✅ Cache cleared!\n');
        return true;
    } catch (error) {
        console.log('ℹ️  Cache clear via API not available\n');
        console.log('   → Please clear manually: WordPress Admin → LiteSpeed Cache → Purge All\n');
        return false;
    }
}

// Main deployment
async function main() {
    console.log('🚀 Starting cPanel deployment...\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Try backup first
    await backupExistingFile();

    // Try deployment methods
    let deployed = false;

    if (await deployViaCPanelAPI()) {
        deployed = true;
    } else if (await deployViaFTP()) {
        deployed = true;
    }

    if (deployed) {
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('✅ DEPLOYMENT SUCCESSFUL!\n');
        console.log('📍 File deployed to:', pluginPath);
        console.log('📏 Size:', (pluginContent.length / 1024).toFixed(2), 'KB\n');

        // Clear cache
        await clearLiteSpeedCache();

        console.log('🔍 VERIFICATION:\n');
        console.log('Run this command:');
        console.log('curl -s https://instantautotraders.com.au | grep "Fixed Schema"\n');
        console.log('Expected: <!-- Instant Auto Traders - Fixed Schema v1.1.0 -->\n');

        console.log('Google Test:');
        console.log('https://search.google.com/test/rich-results\n');

    } else {
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('ℹ️  AUTOMATED DEPLOYMENT NOT AVAILABLE\n');
        console.log('cPanel API methods require additional access permissions.\n');
        console.log('📋 MANUAL UPLOAD (30 seconds):\n');
        console.log('1. Login: https://instantautotraders.com.au:2083');
        console.log('2. File Manager → Navigate to plugin folder');
        console.log('3. Upload: src/deployment/schema-fixer.php');
        console.log('4. Replace old file');
        console.log('5. Clear cache\n');
    }
}

main().catch(error => {
    console.error('\n❌ Error:', error.message);
});
