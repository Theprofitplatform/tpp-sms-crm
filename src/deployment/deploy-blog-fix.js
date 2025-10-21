#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Load environment variables manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually
const envPath = path.join(__dirname, 'env', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

// Set environment variables
process.env.WORDPRESS_URL = envVars.WORDPRESS_URL;
process.env.WORDPRESS_USER = envVars.WORDPRESS_USER;
process.env.WORDPRESS_APP_PASSWORD = envVars.WORDPRESS_APP_PASSWORD;

async function deployBlogFix() {
    console.log('🚀 Starting Instant Auto Traders Blog Fix Deployment...\n');
    
    try {
        // Read the plugin file
        const pluginPath = './instant-auto-traders-backup/INSTAND AUTO BLOG FIXER/one-click-plugin/instant-auto-traders-blog-fix.php';
        const pluginCode = fs.readFileSync(pluginPath, 'utf8');
        
        console.log('✅ Plugin code loaded successfully');
        console.log(`📁 Plugin file: ${pluginPath}`);
        console.log(`📏 Plugin size: ${pluginCode.length} characters\n`);
        
        // Create plugin directory via FTP/Mock upload
        const pluginDir = '/wp-content/plugins/instant-auto-traders-blog-fix';
        
        console.log('📦 Creating plugin directory...');
        
        // Step 1: Create plugin directory structure
        const createPluginDir = [
            `mkdir -p "${pluginDir}"`
        ];
        
        // Step 2: Upload plugin file
        const uploadPlugin = [
            `cat > "${pluginDir}/instant-auto-traders-blog-fix.php" << 'EOF'`,
            pluginCode,
            'EOF'
        ];
        
        // Step 3: Set proper permissions
        const setPermissions = [
            `chmod 644 "${pluginDir}/instant-auto-traders-blog-fix.php"`,
            `chmod 755 "${pluginDir}"`
        ];
        
        // Step 4: Activate plugin via WordPress CLI
        const activatePlugin = [
            `cd /var/www/html && wp plugin activate instant-auto-traders-blog-fix`
        ];
        
        // Combine all commands
        const deploymentCommands = [
            ...createPluginDir,
            ...uploadPlugin, 
            ...setPermissions,
            ...activatePlugin
        ];
        
        console.log('🔧 Deploying plugin to server...');
        console.log('📍 Target: ' + process.env.WORDPRESS_URL);
        console.log('📂 Plugin directory: ' + pluginDir);
        
        // Deploy to VPS
        
        return new Promise((resolve, reject) => {
            const ssh = spawn('ssh', ['tpp-vps'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let output = '';
            let errorOutput = '';
            
            ssh.stdout.on('data', (data) => {
                output += data.toString();
                process.stdout.write(data);
            });
            
            ssh.stderr.on('data', (data) => {
                errorOutput += data.toString();
                process.stderr.write(data);
            });
            
            ssh.on('close', (code) => {
                if (code === 0) {
                    console.log('\n✅ Plugin deployment completed successfully!');
                    console.log('🎉 Instant Auto Traders Blog Fix is now active!');
                    console.log('🌐 Visit: https://instantautotraders.com.au/blog/');
                    resolve();
                } else {
                    console.log('\n❌ Deployment failed with code:', code);
                    console.error('Error output:', errorOutput);
                    reject(new Error(`SSH command failed with code ${code}`));
                }
            });
            
            ssh.on('error', (error) => {
                console.error('SSH Error:', error);
                reject(error);
            });
            
            // Send deployment commands
            ssh.stdin.write(deploymentCommands.join('\n') + '\n');
            ssh.stdin.end();
        });
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        throw error;
    }
}

// Alternative deployment using WordPress REST API
async function deployViaRestAPI() {
    console.log('🌐 Deploying via WordPress REST API...');
    
    const pluginCode = fs.readFileSync(
        './instant-auto-traders-backup/INSTAND AUTO BLOG FIXER/one-click-plugin/instant-auto-traders-blog-fix.php', 
        'utf8'
    );
    
    const wpAPI = {
        url: process.env.WORDPRESS_URL,
        user: process.env.WORDPRESS_USER, 
        password: process.env.WORDPRESS_APP_PASSWORD
    };
    
    console.log('🔐 Using WordPress REST API credentials');
    console.log('📍 Target:', wpAPI.url);
    
    try {
        // Create base64 auth
        const auth = Buffer.from(`${wpAPI.user}:${wpAPI.password}`).toString('base64');
        
        // Note: WordPress REST API doesn't directly support plugin uploads
        // This would require custom implementation or FTP
        console.log('⚠️  REST API method requires custom implementation');
        console.log('🔄 Falling back to SSH deployment...');
        
        return await deployBlogFix();
        
    } catch (error) {
        console.error('❌ REST API deployment failed:', error);
        throw error;
    }
}

// Main execution
async function main() {
    console.log('='*50);
    console.log('   INSTANT AUTO TRADERS - BLOG FIX DEPLOYER');
    console.log('='*50);
    console.log('Target Site: ' + process.env.WORDPRESS_URL);
    console.log('Started: ' + new Date().toLocaleString());
    console.log('='*50 + '\n');
    
    try {
        // Try SSH deployment first
        await deployBlogFix();
        
        console.log('\n' + '='*50);
        console.log('   ✅ DEPLOYMENT SUCCESSFUL!');
        console.log('='*50);
        console.log('📝 What was deployed:');
        console.log('   • Blog listing excerpt fix (30 words)');
        console.log('   • Table of Contents hidden on listings');
        console.log('   • Clean blog card styling');
        console.log('   • Mobile responsive design');
        console.log('   • "Read more" buttons');
        console.log('');
        console.log('🔍 What to check:');
        console.log('   • Visit: https://instantautotraders.com.au/blog/');
        console.log('   • Press Ctrl+F5 to refresh cache');
        console.log('   • Verify short excerpts are visible');
        console.log('   • Check TOC is hidden from listings');
        console.log('   • Test individual posts (full content preserved)');
        console.log('='*50);
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        console.log('\n💡 Alternative options:');
        console.log('   1. Manual upload via WordPress admin');
        console.log('   2. FTP upload to wp-content/plugins/');
        console.log('   3. Use the provided ZIP file');
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { deployBlogFix, deployViaRestAPI };
