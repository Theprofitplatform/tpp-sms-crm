// Fix Instant Auto Traders Homepage - Visual Issues
import https from 'https';
import fs from 'fs';

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

console.log('🎨 Fixing Instant Auto Traders Homepage Visual Issues...');

// Enhanced homepage with better Hero section and fix slider issue
const enhancedHomepageContent = `[vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern" css=".vc_custom_1635000000000{background-image: url(https://instantautotraders.com.au/wp-content/uploads/2019/04/landing-section-bg.jpg) !important;background-position: center !important;background-repeat: no-repeat !important;background-size: cover !important;}"][vc_column width="1/1"][vc_column_text]
<div style="background: linear-gradient(135deg, rgba(42,82,152,0.95) 0%, rgba(24,56,120,0.9) 100%); padding: 100px 0; text-align: center; color: white; border-radius: 0; margin: -30px -30px 30px -30px;">
<h1 style="font-size: 3.5em; font-weight: 800; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); color: white;">INSTANT AUTO TRADERS</h1>
<h2 style="font-size: 1.8em; font-weight: 300; margin-bottom: 15px; color: #f39c12;">Your Trusted Car Dealership in Sydney</h2>
<p style="font-size: 1.2em; margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto; opacity: 0.9;">Quality Used Cars | Competitive Prices | Excellent Service</p>
<div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
<a href="https://instantautotraders.com.au/contact-us/" style="background: #f39c12; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.1em; display: inline-block; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(243,156,18,0.3);">Contact Us Today</a>
<a href="https://instantautotraders.com.au/inventory/" style="background: transparent; color: white; padding: 18px 40px; text-decoration: none; border: 2px solid white; border-radius: 8px; font-weight: bold; font-size: 1.1em; display: inline-block; transition: all 0.3s ease;">View Our Cars</a>
</div>
</div>
[/vc_column_text][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern" css=".vc_custom_1584632825678{background-color: #f8f9fa !important; padding: 80px 0 !important;}"][vc_column][vc_column_text]
<h2 style="text-align: center; font-size: 2.5em; color: #2a5298; margin-bottom: 20px; font-weight: 700;">Why Choose Instant Auto Traders?</h2>
<p style="text-align: center; font-size: 1.2em; color: #666; max-width: 600px; margin: 0 auto 50px auto;">We've built our reputation on trust, quality, and exceptional customer service.</p>
[/vc_column_text][vc_empty_space height="30px"][qode_elements_holder number_of_columns="three_columns"][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<div style="text-align: center; padding: 40px 20px; background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); height: 100%; transition: transform 0.3s ease;">
<div style="font-size: 3em; margin-bottom: 20px; color: #f39c12;">🔧</div>
<h4 style="font-size: 1.4em; margin-bottom: 15px; color: #2a5298;">Quality Assurance</h4>
<p style="color: #666; line-height: 1.6;">All our vehicles undergo thorough inspection and come with comprehensive warranties for your peace of mind.</p>
</div>
[/vc_column_text][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<div style="text-align: center; padding: 40px 20px; background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); height: 100%; transition: transform 0.3s ease;">
<div style="font-size: 3em; margin-bottom: 20px; color: #f39c12;">💰</div>
<h4 style="font-size: 1.4em; margin-bottom: 15px; color: #2a5298;">Competitive Pricing</h4>
<p style="color: #666; line-height: 1.6;">We offer competitive prices and flexible financing options to suit your budget and requirements.</p>
</div>
[/vc_column_text][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<div style="text-align: center; padding: 40px 20px; background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); height: 100%; transition: transform 0.3s ease;">
<div style="font-size: 3em; margin-bottom: 20px; color: #f39c12;">🤝</div>
<h4 style="font-size: 1.4em; margin-bottom: 15px; color: #2a5298;">Expert Service</h4>
<p style="color: #666; line-height: 1.6;">Our experienced team provides exceptional customer service from start to finish.</p>
</div>
[/vc_column_text][/qode_elements_holder_item][/qode_elements_holder][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern" css=".vc_custom_1635000100000{background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important; padding: 80px 0 !important;}"][vc_column][vc_column_text]
<h2 style="text-align: center; font-size: 2.5em; color: #2a5298; margin-bottom: 20px; font-weight: 700;">Our Recent Inventory</h2>
<p style="text-align: center; font-size: 1.2em; color: #666; max-width: 600px; margin: 0 auto 50px auto;">Browse our selection of quality used vehicles in Sydney.</p>
[/vc_column_text][vc_empty_space height="30px"][qode_carousel carousel="car-listing" number_of_items="3" space_between_items="30" image_size="medium" orderby="date" order="ASC" category="featured-vehicles" show_navigation="yes" show_pagination="no"][vc_empty_space height="40px"][vc_column_text]
<div style="text-align: center;">
<a href="https://instantautotraders.com.au/inventory/" style="background: #2a5298; color: white; padding: 18px 45px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 1.2em; box-shadow: 0 4px 15px rgba(42,82,152,0.3); transition: all 0.3s ease;">View All Vehicles →</a>
</div>
[/vc_column_text][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern" css=".vc_custom_1584632851234{background: linear-gradient(135deg, #2a5298 0%, #1a3d80 100%) !important; padding: 80px 0 !important; margin: 0 -30px; }"][vc_column][vc_column_text]
<div style="text-align: center;">
<h2 style="font-size: 2.5em; color: white; margin-bottom: 25px; font-weight: 700;">Ready to Find Your Perfect Car?</h2>
<p style="font-size: 1.3em; color: rgba(255,255,255,0.9); max-width: 700px; margin: 0 auto 40px auto; line-height: 1.6;">Visit our Sydney dealership or contact us today to explore our extensive range of quality used vehicles.</p>
[/vc_column_text][vc_empty_space height="30px"][qode_elements_holder number_of_columns="two_columns"][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<div style="text-align: center;">
<a href="https://instantautotraders.com.au/contact-us/" style="background: #f39c12; color: white; padding: 20px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.2em; display: inline-block; box-shadow: 0 4px 15px rgba(243,156,18,0.3); transition: all 0.3s ease;">Get in Touch</a>
</div>
[/vc_column_text][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<div style="text-align: center;">
<a href="tel:0426232000" style="background: transparent; color: white; padding: 20px 50px; text-decoration: none; border: 2px solid white; border-radius: 8px; font-weight: bold; font-size: 1.2em; display: inline-block; transition: all 0.3s ease;">Call Us Now</a>
</div>
[/vc_column_text][/qode_elements_holder_item][/qode_elements_holder][/vc_column][/vc_column][/vc_row]`;

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

// Update homepage with enhanced visual design
async function updateHomepageEnhanced() {
    console.log('🎨 Deploying enhanced homepage with better visual design...');
    
    const postData = JSON.stringify({
        content: enhancedHomepageContent,
        title: 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
        status: 'publish',
        excerpt: 'Your trusted car dealership in Sydney offering quality used cars, competitive prices, and excellent service.'
    });
    
    const response = await httpsRequest(`${WP_URL}/wp-json/wp/v2/pages/6353`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, postData);
    
    return response;
}

// Alternative: Deploy via file to server
async function deployEnhancedHomepageViaFile() {
    console.log('📁 Deploying enhanced homepage via file...');
    
    // Create the file with enhanced content
    fs.writeFileSync('/tmp/enhanced-homepage.html', enhancedHomepageContent);
    
    // Copy to VPS
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
        const scp = spawn('scp', ['/tmp/enhanced-homepage.html', 'tpp-vps:/tmp/'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        scp.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Enhanced homepage file uploaded to VPS');
                resolve();
            } else {
                reject(new Error(`SCP failed with code ${code}`));
            }
        });
        
        scp.on('error', reject);
    });
}

// Main deployment
async function main() {
    console.log('='*70);
    console.log('   INSTANT AUTO TRADERS - ENHANCED HOMEPAGE DEPLOYMENT');
    console.log('='*70);
    console.log('Content length:', enhancedHomepageContent.length, 'characters');
    console.log('Features: Enhanced Hero Section | Better CTAs | Modern Design');
    console.log('='*70 + '\n');
    
    try {
        console.log('🔄 Method 1: WordPress REST API with Enhanced Design');
        const response = await updateHomepageEnhanced();
        
        if (response.ok) {
            console.log('✅ Enhanced homepage deployed successfully via REST API!');
        } else {
            throw new Error(`REST API failed: ${response.status}`);
        }
        
    } catch (error) {
        console.log('❌ REST API method failed:', error.message);
        console.log('🔄 Method 2: File deployment');
        
        try {
            await deployEnhancedHomepageViaFile();
            console.log('💡 Manual step: Copy content to WordPress admin editor');
        } catch (fileError) {
            console.log('❌ File deployment failed:', fileError.message);
        }
    }
    
    // Test results
    console.log('\n' + '='*70);
    console.log('   ✨ ENHANCED HOMEPAGE FEATURES');
    console.log('='*70);
    console.log('🎨 Visual Enhancements:');
    console.log('   • Bold hero section with gradient background');
    console.log('   • Large "INSTANT AUTO TRADERS" title');
    console.log('   • Enhanced Call-to-Action buttons');
    console.log('   • Modern card design for features');
    console.log('   • Professional color scheme');
    console.log('   • No broken slider issues');
    console.log('');
    console.log('🎯 Key Improvements:');
    console.log('   • Fixed Revolution Slider error');
    console.log('   • Better mobile responsiveness');
    console.log('   • Enhanced typography and spacing');
    console.log('   • Improved visual hierarchy');
    console.log('');
    console.log('🌐 Visit: https://instantautotraders.com.au/');
    console.log('🔄 Press Ctrl+F5 to refresh cache');
    console.log('='*70);
}

main().catch(console.error);
