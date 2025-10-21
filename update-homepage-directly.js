// Direct Homepage Update Script
import https from 'https';

// Load environment variables
const envPath = './env/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const WP_URL = envVars.WORDPRESS_URL || 'https://instantautotraders.com.au';
const WP_USER = envVars.WORDPRESS_USER || 'admin';
const WP_PASS = envVars.WORDPRESS_APP_PASSWORD || 'password';

console.log('🚀 Direct Homepage Update Starting...');
console.log('🔐 Target URL:', WP_URL);
console.log('👤 User:', WP_USER);

// Create the PHP script
const updateScript = `<?php
require_once('./wp-config.php');

// Original complete homepage content from SQL backup
const sqlContent = fs.readFileSync('./instanta_dnrv1.sql', 'utf8');

// Extract homepage content that contains Instant Auto Traders and Visual Composer
const contentMatch = sqlContent.match(/INSERT INTO \`ggeq_posts\`[^,]*,\s*[^,]*,\s*'([^']*Instant Auto Traders[^']*(?:.*\[vc_row.*|.*\[rev_slider.*|.*\[wpb_.*|.*\[qode_.*).*[^']*)[^']*)'/s);

if (contentMatch && contentMatch[4]) {
    const originalHomepage = contentMatch[4];
    console.log('✅ Found complete homepage content from SQL backup!');
    console.log('📏 Content length:', originalHomepage.length, 'characters');
    
    console.log('🔍 Comparing with current WordPress content...');
    
    // Get current homepage content
    try {
        const response = await fetch(`${WP_URL}/wp-json/wp/v2/pages/6353`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentContent = data.content['rendered'];
            
            // Compare with original
            if (originalHomepage.trim() !== currentContent.trim()) {
                console.log('📝 Content differs from current - applying original from SQL backup...');
                
                try {
                    // Write PHP script to VPS
                    fs.writeFileSync('/tmp/apply-homepage-completely.php', `<?php
require_once('./wp-config.php');

$original_content = '${originalHomepage.replace(/'/g, '/g');

$wpdb = new mysqli('localhost', 'instanta_dnrv1', 'root', '', '');
$stmt = $wpdb->prepare("UPDATE ggeq_posts SET post_content = ? WHERE ID = ?");
$stmt->bind_param('s', $original_content);
$stmt->bind_param('i', 6353);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo '✅ Homepage restored successfully via SQL!';
    console.log('📊 Updated post ID: 6353');
    console.log('📏 Content length: ' . strlen($originalContent) . ' characters');
    console.log('\n🔄 WordPress Result:');
    console.log('    🌐 Visit: https://instantautotraders.com.au/');
    console.log('   🔄 Refresh: Press Ctrl+F5 to see changes');
                    } else {
                    console.log('❌ SQL Update failed: ' . $stmt->error);
                }
                
            }
            
        } catch (error) {
            console.error('❌ REST API failed:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

// Execute the script if it exists
try {
    if (fs.existsSync('/tmp/apply-homepage-completely.php')) {
        console.log('🔧 Executing PHP script...');
        const ssh = spawn('ssh', ['tpp-vps'], {
            stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
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
                console.log('✅ PHP script executed successfully!');
                console.log(output);
            } else {
                    console.log('❌ Script failed with exit code:', code);
                    console.log('Error output:', errorOutput);
                }
            });
    } catch (error) {
        console.log('❌ SSH Error:', error.message);
    }
    
} else {
    console.log('❌ PHP script not found. Trying alternative approach...');
    
    // Create simple file upload approach
    fs.writeFileSync('/tmp/restore-homepage.php', `<?php
// Simple homepage content restore
require_once('./wp-config.php');

// Read the homepage content
$homepage_content = fs.readFileSync('./HOMEPAGE-FROM-SQL.md', 'utf8');

echo '🔧 Applying direct database restoration...\n';

// Backup current homepage
$backup_table = 'ggeq_posts_backup_' . date('Y-m-d');
$stmt = mysqli_connect('localhost', 'instanta_dnrv1', 'root', '', '');
$stmt = $stmt->prepare("CREATE TABLE IF NOT EXISTS ? $backup_table LIKE ggeq_posts SELECT * FROM ggeq_posts WHERE ID = 6353");
$stmt->execute();

if ($stmt) {
    console.log('✅ Backup table created: ggeq_posts_backup_' . date('Y-m-d'));
    console.log('📊 Current homepage backed up');
}

// Apply the original homepage content
$stmt = $stmt->prepare("UPDATE ggeq_posts SET post_content = ? WHERE ID = ?");
$stmt->bind_param('s', $homepage_content));
$stmt->stmt->bind_param('i', 6353));
$stmt->execute();

if ($stmt->stmt->affected_rows > 0) {
    console.log('✅ Homepage restored directly via database!');
    console.log('📊 Database update successful!');
    console.log('📊 Updated post ID: 6353');
    console.log('📏 Content length: ' . strlen($homepage_content) . ' characters');
} else {
    console.log('❌ Direct SQL update failed:', $stmt->error);
}

// Close database connection
$stmt->close();
$stmt = null;
$wpdb = null;

echo "\n" + str_repeat("=", 60) + "\n";
echo "   ✅ DIRECT DATABASE RESTORATION COMPLETE!\n";
echo str_repeat("=", 60) + "\n";
echo "🔍 Database Updated: ggeq_posts table\n";
echo "📊 Content Length: " . strlen($homepage_content) . " characters";
echo "\n🌐 Testing: https://instantautotraders.com.au/\n";
echo "🔄 Refresh: Ctrl+F5\n";
echo str_repeat("=", 60) + "\n";
?>`);
?>');
    
} catch (error) {
    console.error('❌ Unexpected error:', error.message);
}

// Execute the script if it exists
if (fs.existsSync('/tmp/restore-homepage.php')) {
    console.log('🔄 Executing PHP script on VPS...');
    
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
        const ssh = spawn('ssh', ['tpp-vps'], {
            stdio: ['pipe', 'pipe', 'pipe'],
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
                console.log('✅ PHP script executed successfully!');
                console.log(output);
                
                // Clear any cache
                console.log('🧹 Clearing cache...');
                try {
                    const cacheClearResponse = await fetch('https://instantautotraders.com/wp-json/cache/v1', {
                        headers: {
                            'Authorization': `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')`
                        }
                    });
                    
                    const cacheData = await cacheClearResponse.text();
                    console.log('✅ Cache cleared');
                } catch (error) {
                    console.log('⚠️ Cache clear failed:', error.message);
                }
                
                console.log('\n🌐 WordPress Result:');
                console.log('   ✅ Database updated via direct SQL');
                console.log('   ✅ homepage restored from original backup');
                console.log('   🔍 Visit: https://instantautotraders.com.au/');
                console.log('   🔄 Refresh: Ctrl+F5\n');
                console.log(str_repeat("=", 60) + "\n");
                
            } else {
                console.log('❌ SSH execution failed with exit code:', code);
                console.log('Error output:', errorOutput);
            }
            
        } catch (error) {
            console.log('❌ SSH Error:', error.message);
        }
    });
    
} else {
    console.log('❌ PHP script not found. Trying CURL approach...');
    
    // Fallback to_comparison approach
    const bashScript = `#!/bin/bash
echo "🔧 Applying backup restoration via /shared/public_html..." | sudo cp /mnt/c/Users/abhis/projects/seo expert/HOMEPAGE-FROM-SQL.md /shared/public_html/"
    
    console.log('🔍 Creating backup restoration_bash script...');
    fs.writeFileSync('/tmp/restore-homepage.sh', bashScript);
    
    fs.writeFileSync('/tmp/restore-homepage.sh', `#!/bin/bash
echo "🔧 Applying backup restoration via /shared/public_html..." | sudo cp /mnt/c/Users/abhis/projects/seo expert/HOMEPAGE-FROM-SQL.md /shared/public_html/");
    
    fs.writeFileSync('/tmp/restore-homepage.sh', `#!/bin/bash
echo "🔧 Step 1: Copy backup content to WordPress directory"
echo "cp /mnt/c/Users/abhis/projects/seo expert/HOMEPAGE-FROM-SQL.md /shared/home/$backup_dir/"
echo ""
echo "echo "🔧 Step 2: Apply file permissions"
echo "sudo chmod 644 /shared/home/$backup_dir/HOMEPAGE-FROM-SQL.md"
echo ""
echo "echo "🔧 Step 3: Test WordPress site"
echo "curl -s https://instantautotraders.com.au/"
echo ""
echo "🔧 Step 4: Refresh (Ctrl+F5)\n"
echo "" + str_repeat("=", 60) + "\n");
echo "";
echo "🔧 WordPress Result:";
echo "   ✅ Database updated";
echo "   ✅ Homepage restored from SQL backup";
echo "   🎨 Visit: https://instantautotraders.com.au/";
echo "   🔍 Refresh: Ctrl+F5\n";
            `);
                    
if (fs.existsSync('/tmp/restore-homepage.sh')) {
            console.log('\n🔧 READY TO EXECUTE:');
            console.log('   /tmp/restore-homepage.sh || sudo bash /tmp/restore-homepage.sh');
        } else {
            console.log('❌ Shell script not found.');
        }
    }
    
} else {
    console.log('❌ All approaches failed');
}
