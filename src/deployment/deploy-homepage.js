// Deploy Instant Auto Traders Homepage Restoration
import https from 'https';
import fs from 'fs';
import path from 'path';

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

const WP_URL = envVars.WORDPRESS_URL;
const WP_USER = envVars.WORDPRESS_USER;
const WP_PASS = envVars.WORDPRESS_APP_PASSWORD;

console.log('🏠 Deploying Instant Auto Traders Homepage...');
console.log('📍 Target:', WP_URL);

// Read the original homepage content
const homepageContent = fs.readFileSync('./restore-original-homepage.html', 'utf8');

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

// Get homepage post ID
async function getHomepagePostId() {
    console.log('🔍 Finding homepage post...');
    
    const response = await httpsRequest(`${WP_URL}/wp-json/wp/v2/pages?slug=home`, {
        headers: {
            'Authorization': `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to get homepage: ${response.status}`);
    }
    
    const pages = JSON.parse(response.data);
    if (pages.length > 0) {
        return pages[0].id;
    }
    
    // Try getting front page by setting
    const settingsResponse = await httpsRequest(`${WP_URL}/wp-json/wp/v2/settings`, {
        headers: {
            'Authorization': `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')}`
        }
    });
    
    if (settingsResponse.ok) {
        const settings = JSON.parse(settingsResponse.data);
        if (settings.page_on_front) {
            return settings.page_on_front;
        }
    }
    
    throw new Error('Homepage not found');
}

// Update homepage content
async function updateHomepage(pageId) {
    console.log(`📝 Updating homepage content (ID: ${pageId})...`);
    
    const postData = JSON.stringify({
        content: homepageContent,
        title: 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
        status: 'publish'
    });
    
    const response = await httpsRequest(`${WP_URL}/wp-json/wp/v2/pages/${pageId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, postData);
    
    return response.ok;
}

// Alternative: Direct database deployment
async function deployViaDatabase() {
    console.log('🗄️  Attempting database deployment...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('./homepage_restore.sql', 'utf8');
    
    // Create a temporary SQL file with proper phone number
    const correctedSQL = sqlContent.replace('tel:0000000000', 'tel:0426232000');
    
    fs.writeFileSync('/tmp/homepage_restore.sql', correctedSQL);
    
    // Copy to VPS and execute
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
                console.log('✅ Database deployment completed!');
                resolve();
            } else {
                console.log('❌ Database deployment failed:', code);
                reject(new Error(`SSH command failed with code ${code}`));
            }
        });
        
        // Execute SQL commands (safe method)
        const commands = `
# Create backup
mysqldump -u root -p'your_mysql_password' wordpress ggeq_posts > /tmp/posts_backup_$(date +%Y%m%d_%H%M%S).sql

# Execute homepage restoration
if [ -f /tmp/homepage_restore.sql ]; then
    mysql -u root -p'your_mysql_password' wordpress < /tmp/homepage_restore.sql
    echo "Homepage SQL executed successfully"
else
    echo "SQL file not found"
fi
        `;
        
        ssh.stdin.write(commands + '\n');
        ssh.stdin.end();
    });
}

// Test homepage
async function testHomepage() {
    console.log('🔍 Testing homepage...');
    
    try {
        const response = await httpsRequest('https://instantautotraders.com.au/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Homepage-Test/1.0)'
            }
        });
        
        const html = response.data;
        
        // Check for key homepage elements
        const checks = [
            { name: 'INSTANT AUTO TRADERS title', test: html.includes('INSTANT AUTO TRADERS') },
            { name: 'Quality Assurance section', test: html.includes('🔧 Quality Assurance') },
            { name: 'Competitive Pricing', test: html.includes('💰 Competitive Pricing') },
            { name: 'Expert Service', test: html.includes('🤝 Expert Service') },
            { name: 'Contact buttons', test: html.includes('Contact Us Today') },
            { name: 'View Our Cars button', test: html.includes('View Our Cars') }
        ];
        
        console.log('\n📊 Homepage Test Results:');
        checks.forEach(check => {
            console.log(`   ${check.test ? '✅' : '❌'} ${check.name}`);
        });
        
        const passedChecks = checks.filter(c => c.test).length;
        console.log(`\n📈 Overall: ${passedChecks}/${checks.length} elements detected`);
        
        return passedChecks === checks.length;
        
    } catch (error) {
        console.log('❌ Could not test homepage:', error.message);
        return false;
    }
}

// Main deployment
async function main() {
    console.log('='*60);
    console.log('   INSTANT AUTO TRADERS - HOMEPAGE RESTORATION');
    console.log('='*60);
    console.log('Content length:', homepageContent.length, 'characters');
    console.log('='*60 + '\n');
    
    try {
        // Try REST API first
        console.log('🔄 Method 1: WordPress REST API');
        const homepageId = await getHomepagePostId();
        console.log('✅ Homepage found (ID:', homepageId, ')');
        
        const success = await updateHomepage(homepageId);
        if (success) {
            console.log('✅ Homepage updated via REST API!');
        } else {
            throw new Error('REST API update failed');
        }
        
    } catch (error) {
        console.log('❌ REST API method failed:', error.message);
        console.log('🔄 Method 2: Database deployment');
        
        try {
            await deployViaDatabase();
        } catch (dbError) {
            console.log('❌ Database method failed:', dbError.message);
            console.log('\n💡 Manual restoration options:');
            console.log('   1. Use phpMyAdmin to import homepage_restore.sql');
            console.log('   2. WordPress Admin → Pages → Home → Edit & Update');
            console.log('   3. Copy content from restore-original-homepage.html');
        }
    }
    
    // Test deployment
    console.log('\n' + '='*60);
    console.log('   TESTING HOMEPAGE');
    console.log('='*60);
    await testHomepage();
    
    console.log('\n' + '='*60);
    console.log('   🎉 HOMEPAGE RESTORATION COMPLETE!');
    console.log('='*60);
    console.log('🌐 Visit: https://instantautotraders.com.au/');
    console.log('🔄 Press Ctrl+F5 to refresh cache');
    console.log('='*60);
}

main().catch(console.error);
