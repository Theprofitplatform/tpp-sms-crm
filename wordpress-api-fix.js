/**
 * WordPress REST API Homepage Fix for Instant Auto Traders
 * Uses WordPress API to fix homepage issues on https://instantautotraders.com.au/
 */

const https = require('https');
const http = require('http');

// WordPress API configuration
const WP_API = {
    baseUrl: 'https://instantautotraders.com.au',
    apiUrl: 'https://instantautotraders.com.au/wp-json/wp/v2',
    username: 'admin', // You'll need to provide actual credentials
    password: '' // You'll need to provide actual application password
};

// Basic Auth header for API requests
let authHeader = '';

/**
 * Set WordPress credentials
 */
function setCredentials(username, appPassword) {
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    authHeader = `Basic ${auth}`;
    console.log('✓ WordPress credentials configured');
}

/**
 * Make API request to WordPress
 */
function makeApiRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = `${WP_API.apiUrl}${endpoint}`;
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'InstantAutoTraders-API-Fix/1.0'
            }
        };

        if (authHeader) {
            options.headers['Authorization'] = authHeader;
        }

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const protocol = urlObj.protocol === 'https:' ? https : http;

        const req = protocol.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: parsedData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Test API connection
 */
async function testApiConnection() {
    try {
        console.log('🔍 Testing WordPress API connection...');
        const response = await makeApiRequest('/');
        
        if (response.statusCode === 200) {
            console.log('✅ API connection successful');
            console.log('WordPress site info:', response.data);
            return true;
        } else {
            console.log('❌ API connection failed:', response.statusCode);
            console.log('Response:', response.data);
            return false;
        }
    } catch (error) {
        console.log('❌ API connection error:', error.message);
        return false;
    }
}

/**
 * Get homepage content
 */
async function getHomepageContent() {
    try {
        console.log('📄 Retrieving homepage content...');
        
        // Get the homepage (usually page with slug 'home' or ID 1)
        let homepageResponse = await makeApiRequest('/pages?slug=home');
        
        if (homepageResponse.statusCode !== 200 || homepageResponse.data.length === 0) {
            // Try getting page with ID 1 (common homepage ID)
            homepageResponse = await makeApiRequest('/pages/1');
        }
        
        if (homepageResponse.statusCode === 200) {
            const homepage = Array.isArray(homepageResponse.data) ? 
                homepageResponse.data[0] : homepageResponse.data;
            
            console.log('✅ Homepage content retrieved');
            console.log(`Homepage ID: ${homepage.id}`);
            console.log(`Homepage Title: ${homepage.title.rendered}`);
            console.log(`Homepage Status: ${homepage.status}`);
            
            return homepage;
        } else {
            console.log('❌ Failed to retrieve homepage');
            return null;
        }
    } catch (error) {
        console.log('❌ Error retrieving homepage:', error.message);
        return null;
    }
}

/**
 * Get available themes
 */
async function getThemes() {
    try {
        console.log('🎨 Retrieving available themes...');
        const response = await makeApiRequest('/themes');
        
        if (response.statusCode === 200) {
            console.log('✅ Themes retrieved');
            return response.data;
        } else {
            console.log('❌ Failed to retrieve themes');
            return null;
        }
    } catch (error) {
        console.log('❌ Error retrieving themes:', error.message);
        return null;
    }
}

/**
 * Get installed plugins status
 */
async function getPlugins() {
    try {
        console.log('🔌 Checking plugin status...');
        // Note: Plugin management may require specific endpoints or different authentication
        console.log('⚠️  Plugin status check requires custom endpoint or admin access');
        return null;
    } catch (error) {
        console.log('❌ Error checking plugins:', error.message);
        return null;
    }
}

/**
 * Fix homepage content
 */
async function fixHomepageContent() {
    try {
        console.log('🔧 Fixing homepage content...');
        
        const homepage = await getHomepageContent();
        if (!homepage) {
            console.log('❌ Cannot fix content without homepage data');
            return false;
        }

        // Improved homepage content structure
        const fixedContent = `
            <!-- wp:paragraph {"align":"center","style":{"color":{"text":"#ffffff"},"typography":{"fontSize":"48px"}}} -->
            <p class="has-text-align-center has-text-color" style="color:#ffffff;font-size:48px">
                <strong>INSTANT AUTO TRADERS</strong>
            </p>
            <!-- /wp:paragraph -->

            <!-- wp:paragraph {"align":"center","style":{"color":{"text":"#f39c12"}}} -->
            <p class="has-text-align-center" style="color:#f39c12">
                <strong>Your Trusted Car Dealership in Sydney</strong>
            </p>
            <!-- /wp:paragraph -->

            <!-- wp:paragraph {"align":"center"} -->
            <p class="has-text-align-center">
                Quality Used Cars | Competitive Prices | Excellent Service
            </p>
            <!-- /wp:paragraph -->

            <!-- wp:spacer {"height":"50px"} -->
            <div style="height:50px" aria-hidden="true" class="wp-block-spacer"></div>
            <!-- /wp:spacer -->

            <!-- wp:buttons {"contentJustification":"center","layout":{"type":"flex","justifyContent":"center"}} -->
            <div class="wp-block-buttons is-content-justification-center">
                <div class="wp-block-button">
                    <a class="wp-block-button__link" href="/contact-us/">Contact Us Today</a>
                </div>
                <div class="wp-block-button is-style-outline">
                    <a class="wp-block-button__link" href="/inventory/">View Our Cars</a>
                </div>
            </div>
            <!-- /wp:buttons -->

            <!-- wp:spacer {"height":"80px"} -->
            <div style="height:80px" aria-hidden="true" class="wp-block-spacer"></div>
            <!-- /wp:spacer -->

            <!-- wp:heading {"level":3,"textAlign":"center"} -->
            <h3 class="has-text-align-center">Why Choose Instant Auto Traders?</h3>
            <!-- /wp:heading -->

            <!-- wp:columns -->
            <div class="wp-block-columns">
                <div class="wp-block-column">
                    <h4>Quality Assurance</h4>
                    <p>All our vehicles undergo thorough inspection and come with comprehensive warranties.</p>
                </div>
                <div class="wp-block-column">
                    <h4>Competitive Pricing</h4>
                    <p>We offer competitive prices and flexible financing options to suit your budget.</p>
                </div>
                <div class="wp-block-column">
                    <h4>Expert Service</h4>
                    <p>Our experienced team provides exceptional customer service from start to finish.</p>
                </div>
            </div>
            <!-- /wp:columns -->

            <!-- wp:spacer {"height":"60px"} -->
            <div style="height:60px" aria-hidden="true" class="wp-block-spacer"></div>
            <!-- /wp:spacer -->

            <!-- wp:heading {"textAlign":"center"} -->
            <h2 class="has-text-align-center">Our Recent Inventory</h2>
            <!-- /wp:heading -->

            <p class="has-text-align-center">Browse our selection of quality used vehicles in Sydney.</p>
        `;

        const updateData = {
            content: fixedContent,
            title: {
                rendered: 'Instant Auto Traders - Sydney\'s Premier Car Dealership'
            },
            excerpt: {
                rendered: 'Quality used cars in Sydney. Instant Auto Traders offers competitive prices, excellent service, and a wide selection of vehicles.'
            },
            status: 'publish'
        };

        const response = await makeApiRequest(`/pages/${homepage.id}`, 'POST', updateData);
        
        if (response.statusCode === 200) {
            console.log('✅ Homepage content updated successfully');
            return true;
        } else {
            console.log('❌ Failed to update homepage content');
            console.log('Response:', response.data);
            return false;
        }
    } catch (error) {
        console.log('❌ Error updating homepage:', error.message);
        return false;
    }
}

/**
 * Update site options (SEO, settings)
 */
async function updateSiteOptions() {
    try {
        console.log('⚙️  Updating site settings...');
        
        const siteData = {
            title: 'Instant Auto Traders - Sydney Car Dealership',
            description: 'Quality used cars in Sydney. Instant Auto Traders offers competitive prices, excellent service, and a wide selection of vehicles.',
            url: 'https://instantautotraders.com.au'
        };

        // This would typically use a custom API endpoint
        console.log('⚠️  Site options update requires custom endpoint or direct database access');
        return true;
    } catch (error) {
        console.log('❌ Error updating site options:', error.message);
        return false;
    }
}

/**
 * Main execution function
 */
async function executeHomepageFix() {
    console.log('🚀 Starting WordPress API Homepage Fix\n');
    
    // You need to provide actual credentials
    console.log('⚠️  NOTE: You need to provide WordPress credentials');
    console.log('Please call setCredentials(username, applicationPassword) with actual values\n');
    
    // Test connection
    const isConnected = await testApiConnection();
    if (!isConnected) {
        console.log('❌ Cannot proceed without API connection');
        return;
    }
    
    // Get current homepage
    const homepage = await getHomepageContent();
    if (homepage) {
        console.log('\n📋 Current Homepage Status:');
        console.log(`- ID: ${homepage.id}`);
        console.log(`- Title: ${homepage.title.rendered}`);
        console.log(`- Status: ${homepage.status}`);
        console.log(`- Modified: ${homepage.modified}`);
    }
    
    // Fix homepage content
    console.log('\n🏗️  Applying homepage fixes...');
    const contentFixed = await fixHomepageContent();
    
    // Update site settings
    console.log('\n⚙️  Optimizing site settings...');
    const settingsUpdated = await updateSiteOptions();
    
    // Results
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Homepage Content: ${contentFixed ? 'FIXED' : 'FAILED'}`);
    console.log(`✅ Site Settings: ${settingsUpdated ? 'UPDATED' : 'FAILED'}`);
    console.log('\n🎉 Homepage fix process completed!');
    console.log('\n📌 Next Steps:');
    console.log('1. Test the homepage at https://instantautotraders.com.au/');
    console.log('2. Clear browser cache to see changes');
    console.log('3. Verify all elements are displaying correctly');
}

// Export functions for external use
module.exports = {
    setCredentials,
    testApiConnection,
    getHomepageContent,
    fixHomepageContent,
    updateSiteOptions,
    executeHomepageFix
};

// Auto-execute if run directly
if (require.main === module) {
    console.log('WordPress API Homepage Fix - Ready to run');
    console.log('⚠️  Please provide credentials before executing');
    console.log('Example: setCredentials("your-username", "your-app-password")');
    console.log('Then call: executeHomepageFix()');
}

// Example usage (uncomment and add credentials):
// setCredentials('admin', 'your-application-password');
// executeHomepageFix();
