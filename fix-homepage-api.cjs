/**
 * Fix Instant Auto Traders Homepage via WordPress REST API
 */

const https = require('https');

// WordPress site configuration
const SITE_URL = 'https://instantautotraders.com.au';
const API_URL = `${SITE_URL}/wp-json/wp/v2`;
const HOMEPAGE_ID = 6353;

// Function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'InstantAutoTraders-Fixer/1.0',
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ statusCode: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// Improved homepage content with modern WordPress blocks
const newHomepageContent = `
<div class="home-hero" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 100px 0; text-align: center;">
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
        <h1 style="font-size: 3.5em; margin-bottom: 20px; font-weight: bold;">INSTANT AUTO TRADERS</h1>
        <h2 style="font-size: 1.8em; color: #f39c12; margin-bottom: 30px;">Your Trusted Car Dealership in Sydney</h2>
        <p style="font-size: 1.2em; margin-bottom: 40px;">Quality Used Cars | Competitive Prices | Excellent Service</p>
        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
            <a href="/contact-us/" style="background: #f39c12; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Contact Us Today</a>
            <a href="/inventory/" style="background: transparent; color: white; border: 2px solid white; padding: 13px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Our Cars</a>
        </div>
    </div>
</div>

<div style="padding: 80px 0; background: #f8f9fa;">
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; text-align: center;">
        <h2 style="font-size: 2.5em; margin-bottom: 20px; color: #333;">Why Choose Instant Auto Traders?</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; margin-top: 50px;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <div style="font-size: 2em; margin-bottom: 20px;">🔧</div>
                <h3 style="color: #2a5298; margin-bottom: 15px;">Quality Assurance</h3>
                <p style="color: #666; line-height: 1.6;">All our vehicles undergo thorough inspection and come with comprehensive warranties for your peace of mind.</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <div style="font-size: 2em; margin-bottom: 20px;">💰</div>
                <h3 style="color: #2a5298; margin-bottom: 15px;">Competitive Pricing</h3>
                <p style="color: #666; line-height: 1.6;">We offer competitive prices and flexible financing options to suit your budget and requirements.</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <div style="font-size: 2em; margin-bottom: 20px;">🤝</div>
                <h3 style="color: #2a5298; margin-bottom: 15px;">Expert Service</h3>
                <p style="color: #666; line-height: 1.6;">Our experienced team provides exceptional customer service from start to finish.</p>
            </div>
        </div>
    </div>
</div>

<div style="padding: 80px 0; background: white;">
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
        <h2 style="font-size: 2.5em; text-align: center; margin-bottom: 20px; color: #333;">Our Recent Inventory</h2>
        <p style="text-align: center; font-size: 1.2em; color: #666; margin-bottom: 50px;">Browse our selection of quality used vehicles in Sydney.</p>
        
        <div style="text-align: center; margin-top: 50px;">
            <a href="/inventory/" style="background: #2a5298; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 1.1em;">View All Vehicles</a>
        </div>
    </div>
</div>

<div style="background: #2a5298; color: white; padding: 60px 0;">
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; text-align: center;">
        <h2 style="font-size: 2.2em; margin-bottom: 20px;">Ready to Find Your Perfect Car?</h2>
        <p style="font-size: 1.2em; margin-bottom: 30px;">Visit our Sydney dealership or contact us today to explore our extensive range of quality used vehicles.</p>
        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
            <a href="/contact-us/" style="background: #f39c12; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Get in Touch</a>
            <a href="tel:0000000000" style="background: transparent; color: white; border: 2px solid white; padding: 13px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Call Us</a>
        </div>
    </div>
</div>

<!-- Fix for any remaining slider elements -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Remove any broken slider elements
    function removeBrokenSliders() {
        const brokenElements = document.querySelectorAll('[class*="rev_slider"], [class*="rs-module"], .vc_row, .vc_column');
        brokenElements.forEach(el => {
            if (el.innerHTML.includes('rev_slider') || el.innerHTML.includes('rs-module')) {
                el.style.display = 'none';
            }
        });
    }
    
    removeBrokenSliders();
    setTimeout(removeBrokenSliders, 1000);
    
    // Ensure proper styling
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = 'Arial, sans-serif';
});
</script>
`;

// Function to update the homepage
async function updateHomepage() {
    try {
        console.log('🚀 Fixing Instant Auto Traders Homepage...');
        
        const updateData = {
            content: newHomepageContent,
            title: {
                rendered: 'Instant Auto Traders - Sydney\'s Premier Car Dealership'
            },
            excerpt: {
                rendered: 'Quality used cars in Sydney. Instant Auto Traders offers competitive prices, excellent service, and a wide selection of quality vehicles.'
            },
            status: 'publish'
        };

        console.log(`📝 Updating page ID: ${HOMEPAGE_ID}`);
        
        const response = await makeRequest(`${API_URL}/pages/${HOMEPAGE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: updateData
        });

        if (response.statusCode === 200) {
            console.log('✅ Homepage updated successfully!');
            console.log(`📄 Title: ${response.data.title.rendered}`);
            console.log(`🔗 URL: ${response.data.link}`);
            console.log(`⏰ Updated: ${response.data.modified}`);
            return true;
        } else {
            console.log('❌ Failed to update homepage');
            console.log(`Status: ${response.statusCode}`);
            console.log('Response:', response.data);
            return false;
        }
    } catch (error) {
        console.log('❌ Error updating homepage:', error.message);
        return false;
    }
}

// Function to verify the homepage
async function verifyHomepage() {
    try {
        console.log('\n🔍 Verifying homepage changes...');
        
        const response = await makeRequest(`${API_URL}/pages/${HOMEPAGE_ID}`);
        
        if (response.statusCode === 200) {
            const page = response.data;
            console.log('✅ Homepage verification successful');
            console.log(`📄 Title: ${page.title.rendered}`);
            console.log(`📝 Status: ${page.status}`);
            console.log(`🔗 Link: ${page.link}`);
            console.log(`⏰ Modified: ${page.modified}`);
            console.log(`📄 Content contains: ${page.content.rendered.includes('INSTANT AUTO TRADERS') ? '✅ New content' : '❌ Old content'}`);
            return true;
        } else {
            console.log('❌ Verification failed');
            console.log(`Status: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Verification error:', error.message);
        return false;
    }
}

// Function to test site accessibility
async function testSiteAccessibility() {
    try {
        console.log('\n🌐 Testing site accessibility...');
        
        const response = await makeRequest(`${SITE_URL}/`, {
            method: 'HEAD'
        });
        
        if (response.statusCode === 200 || response.statusCode === 302) {
            console.log('✅ Site is accessible');
            console.log(`🌐 URL: ${SITE_URL}`);
            return true;
        } else {
            console.log('⚠️  Site returned status:', response.statusCode);
            return false;
        }
    } catch (error) {
        console.log('❌ Accessibility test failed:', error.message);
        return false;
    }
}

// Main execution
async function main() {
    console.log('🏠 WordPress Homepage Fix for Instant Auto Traders');
    console.log(`📍 Target: ${SITE_URL}`);
    console.log(`🆔 Homepage ID: ${HOMEPAGE_ID}`);
    console.log('━'.repeat(50));
    
    // Update homepage
    const updated = await updateHomepage();
    
    if (updated) {
        // Verify changes
        const verified = await verifyHomepage();
        
        // Test accessibility
        const accessible = await testSiteAccessibility();
        
        console.log('\n📊 SUMMARY:');
        console.log(`✅ Homepage Update: ${updated ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Verification: ${verified ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Site Access: ${accessible ? 'SUCCESS' : 'FAILED'}`);
        
        if (updated && verified) {
            console.log('\n🎉 HOMEPAGE FIX COMPLETE!');
            console.log(`🌐 Visit: ${SITE_URL}`);
            console.log('💡 Clear browser cache if needed');
        }
    }
}

// Run the fix
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { updateHomepage, verifyHomepage, testSiteAccessibility };
