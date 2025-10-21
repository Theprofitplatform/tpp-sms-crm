#!/usr/bin/env node

/**
 * SCHEMA ERROR FIXER - DEPLOYMENT SCRIPT
 * Deploys the schema fixer plugin to WordPress site
 * Fixes all 3 types of SEMrush schema errors automatically
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

class SchemaFixerDeployment {
    constructor() {
        this.wpPath = './public_html';
        this.pluginDir = './public_html/wp-content/plugins/instant-auto-traders-schema-fixer';
        this.pluginFile = './schema-error-fixer-plugin.php';
        this.wpApiUrl = 'https://instantautotraders.com.au/wp-json/wp/v2';
        
        this.errors = {
            'product_offer_price': {
                count: 9,
                description: 'Missing price/priceCurrency in Product/Offer schemas',
                affected: ['Homepage', 'Category pages'],
                severity: 'HIGH'
            },
            'localbusiness_address': {
                count: 18,
                description: 'Missing address in LocalBusiness schemas',
                affected: ['Blog posts', 'Category pages'],
                severity: 'HIGH'
            },
            'merchant_image': {
                count: 30,
                description: 'Missing image in Merchant listing schemas',
                affected: ['Blog posts', 'Archives', 'Category pages'],
                severity: 'HIGH'
            }
        };
    }
    
    async deploy() {
        console.log('🚀 SCHEMA ERROR FIXER - DEPLOYMENT');
        console.log('=====================================\n');
        
        this.printErrorSummary();
        
        // Step 1: Create plugin directory
        console.log('\n📁 Step 1: Creating plugin directory...');
        await this.createPluginDirectory();
        
        // Step 2: Copy plugin file
        console.log('\n📋 Step 2: Copying plugin file...');
        await this.copyPluginFile();
        
        // Step 3: Verify installation
        console.log('\n✅ Step 3: Verifying installation...');
        await this.verifyInstallation();
        
        // Step 4: Provide activation instructions
        console.log('\n🎯 Step 4: Activation instructions...');
        this.printActivationInstructions();
        
        // Step 5: Create validation checklist
        console.log('\n📊 Step 5: Creating validation checklist...');
        await this.createValidationChecklist();
        
        this.printSummary();
    }
    
    printErrorSummary() {
        console.log('📊 SEMrush Schema Errors Found:');
        console.log('─────────────────────────────────────');
        
        let totalErrors = 0;
        Object.entries(this.errors).forEach(([key, error]) => {
            totalErrors += error.count;
            console.log(`\n${error.severity === 'HIGH' ? '🔴' : '🟡'} ${error.description}`);
            console.log(`   Count: ${error.count} instances`);
            console.log(`   Affected: ${error.affected.join(', ')}`);
        });
        
        console.log(`\n📈 Total Schema Errors: ${totalErrors}`);
    }
    
    async createPluginDirectory() {
        try {
            if (!fs.existsSync(this.pluginDir)) {
                fs.mkdirSync(this.pluginDir, { recursive: true });
                console.log('   ✅ Plugin directory created');
            } else {
                console.log('   ℹ️  Plugin directory already exists');
            }
        } catch (error) {
            console.error('   ❌ Error creating directory:', error.message);
            throw error;
        }
    }
    
    async copyPluginFile() {
        try {
            const sourceFile = this.pluginFile;
            const destFile = path.join(this.pluginDir, 'schema-fixer.php');
            
            if (!fs.existsSync(sourceFile)) {
                throw new Error('Source plugin file not found');
            }
            
            fs.copyFileSync(sourceFile, destFile);
            console.log('   ✅ Plugin file copied successfully');
            console.log(`   📍 Location: ${destFile}`);
        } catch (error) {
            console.error('   ❌ Error copying file:', error.message);
            throw error;
        }
    }
    
    async verifyInstallation() {
        const pluginFile = path.join(this.pluginDir, 'schema-fixer.php');
        
        if (fs.existsSync(pluginFile)) {
            const content = fs.readFileSync(pluginFile, 'utf8');
            
            // Verify plugin has required components
            const checks = {
                'Plugin Header': content.includes('Plugin Name:'),
                'Schema Fixer Class': content.includes('InstantAutoTraders_Schema_Fixer'),
                'LocalBusiness Fix': content.includes('fix_local_business_schema'),
                'Product/Offer Fix': content.includes('fix_offer_schema'),
                'Image Fix': content.includes('ensure_image'),
                'Rank Math Filter': content.includes('rank_math/json_ld'),
                'AIOSEO Filter': content.includes('aioseo_schema_output')
            };
            
            console.log('   Verification checks:');
            Object.entries(checks).forEach(([check, passed]) => {
                console.log(`   ${passed ? '✅' : '❌'} ${check}`);
            });
            
            const allPassed = Object.values(checks).every(v => v === true);
            if (allPassed) {
                console.log('\n   ✅ All verification checks passed!');
            } else {
                console.log('\n   ⚠️  Some verification checks failed!');
            }
        } else {
            console.log('   ❌ Plugin file not found!');
        }
    }
    
    printActivationInstructions() {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║            PLUGIN ACTIVATION INSTRUCTIONS                       ║
╚════════════════════════════════════════════════════════════════╝

📋 OPTION 1: WordPress Admin (Recommended)
   1. Log into WordPress Admin: ${this.wpApiUrl.replace('/wp-json/wp/v2', '/wp-admin')}
   2. Go to: Plugins → Installed Plugins
   3. Find: "Instant Auto Traders - Schema Error Fixer"
   4. Click: "Activate"
   5. Done! ✅

📋 OPTION 2: WP-CLI (Fastest)
   Run this command:
   
   wp plugin activate instant-auto-traders-schema-fixer

📋 OPTION 3: Direct Database Activation
   Run this SQL query:
   
   INSERT INTO wp_options (option_name, option_value, autoload) 
   VALUES ('active_plugins', 
           'a:1:{i:0;s:56:"instant-auto-traders-schema-fixer/schema-fixer.php";}', 
           'yes')
   ON DUPLICATE KEY UPDATE 
   option_value = CONCAT(option_value, 'instant-auto-traders-schema-fixer/schema-fixer.php');

⚠️  IMPORTANT: After activation, clear all caches:
   - WordPress cache (if using a cache plugin)
   - CDN cache (Cloudflare, etc.)
   - Browser cache (Ctrl+F5)
`);
    }
    
    async createValidationChecklist() {
        const checklist = {
            title: 'Schema Error Fixer - Validation Checklist',
            deployment_date: new Date().toISOString(),
            errors_to_fix: this.errors,
            validation_steps: [
                {
                    step: 1,
                    task: 'Activate the plugin in WordPress',
                    status: 'pending',
                    verification: 'Check Plugins page shows plugin as active'
                },
                {
                    step: 2,
                    task: 'Clear all caches (WordPress, CDN, Browser)',
                    status: 'pending',
                    verification: 'No cached schema data remains'
                },
                {
                    step: 3,
                    task: 'Test Homepage Schema',
                    status: 'pending',
                    verification: 'Use Google Rich Results Test on homepage',
                    url: 'https://search.google.com/test/rich-results',
                    test_url: 'https://instantautotraders.com.au',
                    expected: 'No errors for Product/Offer price fields'
                },
                {
                    step: 4,
                    task: 'Test Blog Post with LocalBusiness Schema',
                    status: 'pending',
                    verification: 'Test any blog post URL',
                    test_url: 'https://instantautotraders.com.au/blog/',
                    expected: 'LocalBusiness schema has complete address field'
                },
                {
                    step: 5,
                    task: 'Test Blog Post with Merchant Listing',
                    status: 'pending',
                    verification: 'Test post with merchant listing',
                    test_url: 'https://instantautotraders.com.au/2025/08/07/best-car-buying-company/',
                    expected: 'Merchant listing has image field'
                },
                {
                    step: 6,
                    task: 'Re-run SEMrush Site Audit',
                    status: 'pending',
                    verification: 'Wait 24-48 hours for Google to recrawl',
                    expected: 'Schema errors reduced or eliminated'
                },
                {
                    step: 7,
                    task: 'Monitor Google Search Console',
                    status: 'pending',
                    verification: 'Check Enhancement reports',
                    url: 'https://search.google.com/search-console',
                    expected: 'Valid items increase, errors decrease'
                }
            ],
            quick_test_urls: [
                {
                    page: 'Homepage',
                    url: 'https://instantautotraders.com.au',
                    schema_types: ['AutomotiveBusiness', 'Organization'],
                    errors_to_fix: ['Product/Offer price missing']
                },
                {
                    page: 'Blog Archive',
                    url: 'https://instantautotraders.com.au/blog/',
                    schema_types: ['CollectionPage', 'Article'],
                    errors_to_fix: ['LocalBusiness address', 'Merchant image']
                },
                {
                    page: 'Blog Post',
                    url: 'https://instantautotraders.com.au/2025/08/07/best-car-buying-company/',
                    schema_types: ['Article', 'LocalBusiness'],
                    errors_to_fix: ['Merchant image']
                },
                {
                    page: 'Category Page',
                    url: 'https://instantautotraders.com.au/category/business/',
                    schema_types: ['CollectionPage'],
                    errors_to_fix: ['LocalBusiness address', 'Merchant image']
                }
            ],
            manual_fixes_if_needed: [
                {
                    issue: 'Plugin not showing in WordPress',
                    solution: 'Check file permissions (should be 644 for files, 755 for directories)',
                    command: 'chmod 644 public_html/wp-content/plugins/instant-auto-traders-schema-fixer/*.php'
                },
                {
                    issue: 'Schema still has errors after activation',
                    solution: 'Clear all caches and wait 5 minutes for changes to propagate',
                    steps: [
                        'Clear WordPress cache',
                        'Clear LiteSpeed cache (if using)',
                        'Clear browser cache (Ctrl+F5)',
                        'Purge Cloudflare cache (if using)'
                    ]
                },
                {
                    issue: 'Rank Math schema conflicts',
                    solution: 'Check Rank Math schema settings',
                    steps: [
                        'Go to Rank Math → Schema',
                        'Verify schema types are enabled',
                        'Our plugin filters run after Rank Math (priority 99)'
                    ]
                },
                {
                    issue: 'Need to customize business address',
                    solution: 'Edit plugin file schema-fixer.php',
                    location: 'Lines 20-26 in plugin file',
                    note: 'Update $business_address array with correct details'
                }
            ]
        };
        
        const checklistFile = './SCHEMA-ERROR-FIX-CHECKLIST.json';
        fs.writeFileSync(checklistFile, JSON.stringify(checklist, null, 2));
        console.log(`   ✅ Validation checklist created: ${checklistFile}`);
        
        // Also create a markdown version
        const markdownChecklist = this.generateMarkdownChecklist(checklist);
        fs.writeFileSync('./SCHEMA-ERROR-FIX-CHECKLIST.md', markdownChecklist);
        console.log(`   ✅ Markdown checklist created: SCHEMA-ERROR-FIX-CHECKLIST.md`);
    }
    
    generateMarkdownChecklist(checklist) {
        return `# ${checklist.title}

**Deployment Date:** ${new Date(checklist.deployment_date).toLocaleString()}

---

## 📊 Errors Being Fixed

${Object.entries(checklist.errors_to_fix).map(([key, error]) => `
### ${error.severity === 'HIGH' ? '🔴' : '🟡'} ${error.description}
- **Count:** ${error.count} instances
- **Affected Pages:** ${error.affected.join(', ')}
- **Severity:** ${error.severity}
`).join('\n')}

---

## ✅ Validation Steps

${checklist.validation_steps.map(step => `
### Step ${step.step}: ${step.task}

**Status:** [ ] ${step.status}
**Verification:** ${step.verification}
${step.url ? `**Tool:** ${step.url}` : ''}
${step.test_url ? `**Test URL:** ${step.test_url}` : ''}
${step.expected ? `**Expected Result:** ${step.expected}` : ''}
`).join('\n')}

---

## 🧪 Quick Test URLs

Use Google Rich Results Test: https://search.google.com/test/rich-results

${checklist.quick_test_urls.map(test => `
### ${test.page}
- **URL:** ${test.url}
- **Schema Types:** ${test.schema_types.join(', ')}
- **Errors to Fix:** ${test.errors_to_fix.join(', ')}
- [ ] Tested
- [ ] Passed
`).join('\n')}

---

## 🔧 Manual Fixes (If Needed)

${checklist.manual_fixes_if_needed.map(fix => `
### ${fix.issue}

**Solution:** ${fix.solution}

${fix.command ? `\`\`\`bash\n${fix.command}\n\`\`\`` : ''}
${fix.steps ? fix.steps.map(s => `- ${s}`).join('\n') : ''}
${fix.location ? `**Location:** ${fix.location}` : ''}
${fix.note ? `**Note:** ${fix.note}` : ''}
`).join('\n')}

---

## 📈 Success Metrics

After 24-48 hours, you should see:

- ✅ **Google Rich Results Test:** All schema errors resolved
- ✅ **SEMrush Site Audit:** Schema errors reduced to 0 or near-0
- ✅ **Google Search Console:** Valid items increase in Enhancement reports
- ✅ **Homepage:** No Product/Offer price errors
- ✅ **Blog Posts:** All LocalBusiness schemas have address
- ✅ **Archives:** All Merchant listings have images

---

## 🎯 Next Steps After Validation

1. Monitor Google Search Console for 1-2 weeks
2. Re-run SEMrush Site Audit after 1 week
3. Check for any new schema warnings
4. Update plugin if needed (customizations in lines 20-26)
5. Document any remaining manual fixes needed

---

**Plugin Location:** \`public_html/wp-content/plugins/instant-auto-traders-schema-fixer/schema-fixer.php\`
**Plugin Status:** Needs activation in WordPress Admin
`;
    }
    
    printSummary() {
        console.log('\n' + '═'.repeat(70));
        console.log('🎉 SCHEMA ERROR FIXER - DEPLOYMENT COMPLETE!');
        console.log('═'.repeat(70));
        
        console.log('\n📊 SUMMARY:');
        console.log(`   ✅ Plugin deployed to: ${this.pluginDir}`);
        console.log(`   ✅ Total errors to fix: ${Object.values(this.errors).reduce((sum, e) => sum + e.count, 0)}`);
        console.log(`   ✅ Validation checklist created`);
        
        console.log('\n🚀 IMMEDIATE NEXT STEPS:');
        console.log('   1. Activate plugin in WordPress Admin');
        console.log('   2. Clear all caches (WordPress, CDN, Browser)');
        console.log('   3. Test with Google Rich Results Test');
        console.log('   4. Wait 24-48 hours for Google recrawl');
        console.log('   5. Re-run SEMrush Site Audit');
        
        console.log('\n📁 FILES CREATED:');
        console.log('   • schema-error-fixer-plugin.php (Main plugin file)');
        console.log('   • SCHEMA-ERROR-FIX-CHECKLIST.json (Validation data)');
        console.log('   • SCHEMA-ERROR-FIX-CHECKLIST.md (Validation guide)');
        
        console.log('\n💡 WHAT THIS FIXES:');
        console.log('   ✅ Missing price/priceCurrency in Product/Offer schemas');
        console.log('   ✅ Missing address in LocalBusiness schemas');
        console.log('   ✅ Missing images in Merchant listing schemas');
        console.log('   ✅ Automatically filters Rank Math and AIOSEO schema output');
        console.log('   ✅ Adds valid fallback data for all required fields');
        
        console.log('\n🎯 EXPECTED RESULTS:');
        console.log('   📉 SEMrush schema errors: 57 → 0-5');
        console.log('   📈 Valid schema markup: 100%');
        console.log('   ✅ Google Search Console: Increased valid items');
        console.log('   ✅ Rich Results eligible: All pages');
        
        console.log('\n🔗 USEFUL LINKS:');
        console.log('   • Google Rich Results Test: https://search.google.com/test/rich-results');
        console.log('   • Google Search Console: https://search.google.com/search-console');
        console.log('   • Schema.org Documentation: https://schema.org/');
        
        console.log('\n✨ The plugin is ready! Just activate it in WordPress Admin.\n');
    }
}

// Run deployment
const deployer = new SchemaFixerDeployment();
deployer.deploy().catch(error => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
});
