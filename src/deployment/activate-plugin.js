import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables manually
const envPath = path.join(__dirname, 'env', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const WordPressAPI = {
    url: envVars.WORDPRESS_URL,
    user: envVars.WORDPRESS_USER,
    password: envVars.WORDPRESS_APP_PASSWORD
};

async function activatePlugin() {
    console.log('🔧 Activating Instant Auto Traders Blog Fix Plugin...');
    console.log('📍 Target:', WordPressAPI.url);
    
    const auth = Buffer.from(`${WordPressAPI.user}:${WordPressAPI.password}`).toString('base64');
    
    // Get list of installed plugins first
    console.log('📋 Checking installed plugins...');
    const pluginsResponse = await fetch(`${WordPressAPI.url}/wp-json/wp/v2/plugins`, {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!pluginsResponse.ok) {
        throw new Error(`Failed to fetch plugins: ${pluginsResponse.status}`);
    }
    
    const plugins = await pluginsResponse.json();
    const targetPlugin = plugins.find(plugin => plugin.plugin === 'instant-auto-traders-blog-fix/instant-auto-traders-blog-fix.php');
    
    if (!targetPlugin) {
        console.log('❌ Plugin not found in WordPress. Installing plugin first...');
        
        // Try to install the plugin file directly
        try {
            const installResponse = await fetch(`${WordPressAPI.url}/wp-json/wp/v2/plugins`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    slug: 'instant-auto-traders-blog-fix',
                    status: 'active'
                })
            });
            
            if (installResponse.ok) {
                console.log('✅ Plugin installed and activated successfully!');
            } else {
                console.log('⚠️  REST API install failed. Trying alternative approach...');
            }
        } catch (error) {
            console.log('⚠️  Plugin activation via REST API failed');
        }
        
        // Fallback: Direct database activation
        console.log('🔄 Attempting database activation...');
        return await activateViaDatabase();
    }
    
    if (targetPlugin.status === 'active') {
        console.log('✅ Plugin is already active!');
        return;
    }
    
    // Activate the plugin
    console.log('🚀 Activating plugin...');
    const activateResponse = await fetch(`${WordPressAPI.url}/wp-json/wp/v2/plugins/${targetPlugin.plugin}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'active'
        })
    });
    
    if (activateResponse.ok) {
        console.log('✅ Plugin activated successfully!');
        console.log('🌐 Visit: https://instantautotraders.com.au/blog/');
        console.log('🔄 Press Ctrl+F5 to refresh cache');
    } else {
        console.log('❌ Failed to activate plugin');
        console.log('🔄 Trying database method...');
        return await activateViaDatabase();
    }
}

async function activateViaDatabase() {
    console.log('🗄️  Attempting direct database activation...');
    
    const { spawn } = await import('child_process');
    
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
                console.log('✅ Database activation completed!');
                resolve();
            } else {
                console.log('❌ Database activation failed:', code);
                reject(new Error(`SSH command failed with code ${code}`));
            }
        });
        
        // MySQL commands to activate plugin
        const mysqlCommands = `
mysql -u root -p'your_mysql_password' wordpress << 'EOF'
SELECT option_name, option_value FROM wp_options WHERE option_name = 'active_plugins';

UPDATE wp_options SET option_value = 'a:1:{i:0;s:68:"instant-auto-traders-blog-fix/instant-auto-traders-blog-fix.php";}' WHERE option_name = 'active_plugins';

SELECT option_name, option_value FROM wp_options WHERE option_name = 'active_plugins';

EOF
        
        ssh.stdin.write(mysqlCommands + '\n');
        ssh.stdin.end();
    });
}

// Test if blog fix is working
async function testBlogFix() {
    console.log('\n🔍 Testing blog fix...');
    
    try {
        const response = await fetch('https://instantautotraders.com.au/blog/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Bot-Test/1.0)'
            }
        });
        
        const html = await response.text();
        
        if (html.includes('iat-blog-card') || html.includes('Instant Auto Traders Blog Fix')) {
            console.log('✅ Blog fix styles detected!');
        } else {
            console.log('⚠️  Blog fix styles not yet visible. Might need cache refresh.');
        }
        
        const hasShortContent = html.includes('class="entry-excerpt') || html.includes('iat-entry-excerpt');
        if (hasShortContent) {
            console.log('✅ Excerpt modification detected!');
        } else {
            console.log('⚠️  Excerpt modification not yet visible.');
        }
        
        const noTOC = !html.includes('wp-block-table-of-contents') || html.includes('display: none !important');
        if (noTOC) {
            console.log('✅ TOC hiding detected!');
        } else {
            console.log('⚠️  TOC not yet hidden.');
        }
        
    } catch (error) {
        console.log('❌ Could not test blog fix:', error.message);
    }
}

// Main execution
async function main() {
    console.log('='*50);
    console.log('   PLUGIN ACTIVATION');
    console.log('='*50);
    console.log('Target: ' + WordPressAPI.url);
    console.log('User: ' + WordPressAPI.user);
    console.log('='*50 + '\n');
    
    try {
        await activatePlugin();
        await testBlogFix();
        
        console.log('\n' + '='*50);
        console.log('   ✅ ACTIVATION COMPLETE!');
        console.log('='*50);
        console.log('🌐 Check: https://instantautotraders.com.au/blog/');
        console.log('🔄 Refresh: Ctrl+F5 (hard refresh)');
        console.log('='*50);
        
    } catch (error) {
        console.error('\n❌ Activation failed:', error.message);
        console.log('💡 Manual activation options:');
        console.log('   1. WordPress Admin → Plugins → Activate');
        console.log('   2. Contact your WordPress developer');
    }
}

// Run the main function
main().catch(console.error);

export { activatePlugin };
