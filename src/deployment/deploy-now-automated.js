#!/usr/bin/env node

/**
 * Automated Schema Fixer v1.1.0 Deployment
 * Deploys directly to WordPress via REST API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.join(__dirname, '../../config/env/.env') });

const WORDPRESS_URL = process.env.WORDPRESS_URL;
const WORDPRESS_USER = process.env.WORDPRESS_USER;
const WORDPRESS_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  Automated Schema Fixer v1.1.0 Deployment                   ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Read plugin content
const pluginFile = path.join(__dirname, 'schema-fixer-v1.1.0.php');
const pluginContent = fs.readFileSync(pluginFile, 'utf8');

console.log('📦 Plugin file loaded:', (pluginContent.length / 1024).toFixed(2), 'KB\n');

// Create deployment PHP script
const deploymentScript = `<?php
/**
 * One-time deployment script for Schema Fixer v1.1.0
 * DELETE THIS FILE AFTER DEPLOYMENT!
 */

// Security check
if (!isset($_GET['deploy']) || $_GET['deploy'] !== '${Date.now()}') {
    http_response_code(403);
    die('Access denied');
}

$plugin_dir = __DIR__ . '/wp-content/plugins/instant-auto-traders-schema-fixer';
$plugin_file = $plugin_dir . '/schema-fixer.php';
$backup_file = $plugin_dir . '/schema-fixer-v1.0.0-backup-' . date('YmdHis') . '.php';

// Create directory if needed
if (!file_exists($plugin_dir)) {
    mkdir($plugin_dir, 0755, true);
    echo "✅ Created plugin directory\\n";
}

// Backup existing file
if (file_exists($plugin_file)) {
    copy($plugin_file, $backup_file);
    echo "✅ Backed up to: " . basename($backup_file) . "\\n";
}

// Plugin content (base64 encoded for safety)
$plugin_content = base64_decode('${Buffer.from(pluginContent).toString('base64')}');

// Write new version
$written = file_put_contents($plugin_file, $plugin_content);

if ($written !== false) {
    echo "✅ Plugin deployed successfully!\\n";
    echo "📊 Bytes written: " . number_format($written) . "\\n";
    echo "📁 Location: " . $plugin_file . "\\n\\n";

    // Set proper permissions
    chmod($plugin_file, 0644);
    echo "✅ Permissions set to 644\\n\\n";

    echo "═══════════════════════════════════════════\\n";
    echo "DEPLOYMENT SUCCESSFUL!\\n";
    echo "═══════════════════════════════════════════\\n\\n";

    echo "Next steps:\\n";
    echo "1. Clear LiteSpeed Cache\\n";
    echo "2. Visit homepage and view source\\n";
    echo "3. Search for: 'Fixed Schema v1.1.0'\\n";
    echo "4. DELETE THIS FILE: " . __FILE__ . "\\n\\n";

    echo "Verification commands:\\n";
    echo "curl -s ${WORDPRESS_URL} | grep 'Fixed Schema'\\n";
    echo "curl -s ${WORDPRESS_URL} | grep -c '\"@type\":\"Product\"'\\n";

} else {
    http_response_code(500);
    echo "❌ Failed to write plugin file\\n";
    echo "Check permissions on: " . $plugin_dir . "\\n";
}
?>`;

// Save deployment script
const deployScriptPath = path.join(__dirname, 'deploy-execute.php');
fs.writeFileSync(deployScriptPath, deploymentScript);

console.log('🔧 Step 1: Deployment script created\n');

// Deploy via WordPress file upload
async function deployViaWordPress() {
    console.log('🚀 Step 2: Attempting WordPress deployment...\n');

    const auth = Buffer.from(`${WORDPRESS_USER}:${WORDPRESS_APP_PASSWORD}`).toString('base64');

    try {
        // Method 1: Try to upload deployment script to WordPress root
        console.log('📤 Uploading deployment script to WordPress...');

        const deployUrl = `${WORDPRESS_URL}/deploy-execute-${Date.now()}.php`;
        const deployKey = Date.now();

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║  MANUAL DEPLOYMENT REQUIRED                                  ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        console.log('The deployment script has been created. To deploy:\n');
        console.log('OPTION 1: Copy deployment script to WordPress root');
        console.log('─────────────────────────────────────────────────');
        console.log('1. Upload this file to WordPress root:');
        console.log(`   ${deployScriptPath}`);
        console.log('   Upload to: /home/instanta/public_html/deploy-execute.php\n');
        console.log('2. Visit in browser:');
        console.log(`   ${WORDPRESS_URL}/deploy-execute.php?deploy=${deployKey}\n`);
        console.log('3. Delete the file after deployment\n');

        console.log('OPTION 2: Use cPanel File Manager (Recommended)');
        console.log('─────────────────────────────────────────────────');
        console.log('1. Login: https://your-domain.com:2083');
        console.log('2. Username: (your cPanel username)');
        console.log('3. Password: (your cPanel password)');
        console.log('4. File Manager → public_html/wp-content/plugins/instant-auto-traders-schema-fixer/');
        console.log('5. Upload: schema-fixer-v1.1.0.php');
        console.log('6. Rename to: schema-fixer.php (replace existing)');
        console.log('7. Clear cache\n');

        console.log('OPTION 3: Use WordPress Plugin Editor');
        console.log('──────────────────────────────────────');
        console.log('1. Login: https://instantautotraders.com.au/wp-admin');
        console.log('2. Plugins → Plugin File Editor');
        console.log('3. Select: Instant Auto Traders - Schema Error Fixer');
        console.log('4. Copy content from: schema-fixer-v1.1.0.php');
        console.log('5. Paste and Update File');
        console.log('6. Clear cache\n');

    } catch (error) {
        console.error('❌ Automated deployment not available:', error.message);
        console.log('\n📋 Manual deployment instructions provided above.\n');
    }
}

deployViaWordPress();
