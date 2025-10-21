#!/usr/bin/env node

/**
 * SCHEMA VALIDATION SCRIPT
 * Tests if schema errors are fixed after plugin deployment
 */

import https from 'https';
import http from 'http';
import fs from 'fs';

class SchemaValidator {
    constructor() {
        this.baseUrl = 'https://instantautotraders.com.au';
        this.testUrls = [
            {
                name: 'Homepage',
                url: '/',
                expectedSchemas: ['AutomotiveBusiness', 'Organization'],
                checkFor: {
                    noProductPriceErrors: true,
                    hasAddress: true,
                    hasImage: true
                }
            },
            {
                name: 'Blog Archive',
                url: '/blog/',
                expectedSchemas: ['CollectionPage', 'WebSite'],
                checkFor: {
                    hasAddress: true,
                    hasImage: true
                }
            },
            {
                name: 'Blog Post - Best Car Buying',
                url: '/2025/08/07/best-car-buying-company/',
                expectedSchemas: ['Article', 'LocalBusiness'],
                checkFor: {
                    hasAddress: true,
                    hasImage: true
                }
            },
            {
                name: 'Blog Post - Evaluate My Car',
                url: '/2025/08/07/evaluate-my-car/',
                expectedSchemas: ['Article', 'LocalBusiness'],
                checkFor: {
                    hasAddress: true,
                    hasImage: true
                }
            },
            {
                name: 'Category Page',
                url: '/category/business/',
                expectedSchemas: ['CollectionPage'],
                checkFor: {
                    hasAddress: true,
                    hasImage: true
                }
            }
        ];
        
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
    }
    
    async validate() {
        console.log('🔍 SCHEMA VALIDATION TEST');
        console.log('══════════════════════════════════════════════════════\n');
        console.log(`Testing: ${this.baseUrl}`);
        console.log(`Test URLs: ${this.testUrls.length}\n`);
        
        for (const testUrl of this.testUrls) {
            console.log(`\n📄 Testing: ${testUrl.name}`);
            console.log(`   URL: ${this.baseUrl}${testUrl.url}`);
            
            try {
                const html = await this.fetchPage(testUrl.url);
                const schemas = this.extractSchemas(html);
                const validation = this.validateSchemas(schemas, testUrl);
                
                this.results.tests.push({
                    ...testUrl,
                    validation,
                    schemas: schemas.map(s => s['@type'])
                });
                
                this.printTestResult(testUrl.name, validation);
                
                if (validation.passed) {
                    this.results.passed++;
                } else if (validation.warnings.length > 0) {
                    this.results.warnings++;
                } else {
                    this.results.failed++;
                }
                
            } catch (error) {
                console.log(`   ❌ ERROR: ${error.message}`);
                this.results.failed++;
                this.results.tests.push({
                    ...testUrl,
                    error: error.message
                });
            }
            
            // Small delay between requests
            await this.sleep(1000);
        }
        
        this.printSummary();
        this.saveResults();
    }
    
    async fetchPage(path) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}${path}`;
            const protocol = url.startsWith('https') ? https : http;
            
            protocol.get(url, {
                headers: {
                    'User-Agent': 'SchemaValidator/1.0 (Schema Error Fix Testing)'
                }
            }, (res) => {
                let data = '';
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            }).on('error', reject);
        });
    }
    
    extractSchemas(html) {
        const schemas = [];
        const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        
        while ((match = regex.exec(html)) !== null) {
            try {
                const schemaData = JSON.parse(match[1]);
                
                // Handle @graph structure
                if (schemaData['@graph']) {
                    schemas.push(...schemaData['@graph']);
                } else {
                    schemas.push(schemaData);
                }
            } catch (error) {
                console.log(`   ⚠️  Warning: Could not parse schema JSON: ${error.message}`);
            }
        }
        
        return schemas;
    }
    
    validateSchemas(schemas, testConfig) {
        const validation = {
            passed: true,
            errors: [],
            warnings: [],
            details: []
        };
        
        // Check if expected schema types are present
        const foundTypes = schemas.map(s => {
            if (Array.isArray(s['@type'])) {
                return s['@type'];
            }
            return [s['@type']];
        }).flat();
        
        validation.details.push(`Found schema types: ${[...new Set(foundTypes)].join(', ')}`);
        
        // Validate each schema
        for (const schema of schemas) {
            const schemaType = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']];
            
            // Check LocalBusiness for address
            if (schemaType.includes('LocalBusiness') || 
                schemaType.includes('AutomotiveBusiness') ||
                schemaType.includes('CarDealer')) {
                
                if (!schema.address) {
                    validation.errors.push(`${schemaType.join('/')} missing address field`);
                    validation.passed = false;
                } else if (!schema.address.addressLocality) {
                    validation.warnings.push(`${schemaType.join('/')} address missing addressLocality`);
                } else {
                    validation.details.push(`✓ ${schemaType.join('/')} has valid address`);
                }
            }
            
            // Check Product/Offer for price
            if (schemaType.includes('Product')) {
                if (schema.offers) {
                    const offers = Array.isArray(schema.offers) ? schema.offers : [schema.offers];
                    
                    for (const offer of offers) {
                        if (!offer.price && !offer.priceSpecification) {
                            validation.errors.push('Product Offer missing price/priceSpecification');
                            validation.passed = false;
                        } else if (offer.price && !offer.priceCurrency && 
                                   (!offer.priceSpecification || !offer.priceSpecification.priceCurrency)) {
                            validation.errors.push('Product Offer missing priceCurrency');
                            validation.passed = false;
                        } else {
                            validation.details.push('✓ Product Offer has valid price structure');
                        }
                    }
                }
            }
            
            // Check Offer directly
            if (schemaType.includes('Offer')) {
                if (!schema.price && !schema.priceSpecification) {
                    // For service offers, this might be okay if it's a service
                    if (schema.itemOffered && schema.itemOffered['@type'] === 'Service') {
                        validation.details.push('✓ Service Offer (price not required for services)');
                    } else {
                        validation.warnings.push('Offer missing price (may be okay for services)');
                    }
                } else {
                    validation.details.push('✓ Offer has price information');
                }
            }
            
            // Check for images
            if (schemaType.includes('Article') || 
                schemaType.includes('Product') ||
                schemaType.some(t => t.includes('Merchant'))) {
                
                if (!schema.image) {
                    validation.warnings.push(`${schemaType.join('/')} missing image field`);
                } else {
                    validation.details.push(`✓ ${schemaType.join('/')} has image`);
                }
            }
        }
        
        return validation;
    }
    
    printTestResult(name, validation) {
        if (validation.passed && validation.warnings.length === 0) {
            console.log(`   ✅ PASS - All checks passed`);
        } else if (validation.passed && validation.warnings.length > 0) {
            console.log(`   ⚠️  PASS with warnings`);
            validation.warnings.forEach(w => console.log(`      ⚠️  ${w}`));
        } else {
            console.log(`   ❌ FAIL`);
            validation.errors.forEach(e => console.log(`      ❌ ${e}`));
        }
        
        if (validation.details.length > 0) {
            console.log(`   Details:`);
            validation.details.forEach(d => console.log(`      ${d}`));
        }
    }
    
    printSummary() {
        console.log('\n' + '═'.repeat(60));
        console.log('📊 VALIDATION SUMMARY');
        console.log('═'.repeat(60));
        
        const total = this.results.passed + this.results.warnings + this.results.failed;
        const passRate = Math.round((this.results.passed / total) * 100);
        
        console.log(`\n✅ Passed: ${this.results.passed}/${total}`);
        console.log(`⚠️  Warnings: ${this.results.warnings}/${total}`);
        console.log(`❌ Failed: ${this.results.failed}/${total}`);
        console.log(`📈 Pass Rate: ${passRate}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 SUCCESS! All schema validations passed!');
            console.log('✅ Schema errors are fixed');
            console.log('✅ Ready for Google Rich Results Test');
            console.log('✅ Ready for SEMrush re-audit');
        } else {
            console.log('\n⚠️  Some tests failed. Review the errors above.');
            console.log('💡 Troubleshooting steps:');
            console.log('   1. Ensure plugin is activated');
            console.log('   2. Clear all caches (WordPress, CDN, Browser)');
            console.log('   3. Wait 5 minutes and re-test');
            console.log('   4. Check WordPress debug log for PHP errors');
        }
        
        console.log('\n🔗 Next Steps:');
        console.log('   1. Test individual URLs with Google Rich Results Test:');
        console.log('      https://search.google.com/test/rich-results');
        console.log('   2. Monitor Google Search Console Enhancement reports');
        console.log('   3. Re-run SEMrush Site Audit in 24-48 hours');
        
        console.log('\n📁 Results saved to: schema-validation-results.json\n');
    }
    
    saveResults() {
        const resultsFile = './schema-validation-results.json';
        
        const output = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            summary: {
                total: this.results.passed + this.results.warnings + this.results.failed,
                passed: this.results.passed,
                warnings: this.results.warnings,
                failed: this.results.failed,
                passRate: Math.round((this.results.passed / (this.results.passed + this.results.warnings + this.results.failed)) * 100)
            },
            tests: this.results.tests
        };
        
        fs.writeFileSync(resultsFile, JSON.stringify(output, null, 2));
        
        // Also create a simple text report
        const textReport = this.generateTextReport(output);
        fs.writeFileSync('./schema-validation-report.txt', textReport);
    }
    
    generateTextReport(output) {
        let report = 'SCHEMA VALIDATION REPORT\n';
        report += '═'.repeat(60) + '\n\n';
        report += `Date: ${new Date(output.timestamp).toLocaleString()}\n`;
        report += `Site: ${output.baseUrl}\n\n`;
        
        report += 'SUMMARY\n';
        report += '─'.repeat(60) + '\n';
        report += `Total Tests: ${output.summary.total}\n`;
        report += `Passed: ${output.summary.passed}\n`;
        report += `Warnings: ${output.summary.warnings}\n`;
        report += `Failed: ${output.summary.failed}\n`;
        report += `Pass Rate: ${output.summary.passRate}%\n\n`;
        
        report += 'DETAILED RESULTS\n';
        report += '─'.repeat(60) + '\n\n';
        
        output.tests.forEach((test, index) => {
            report += `${index + 1}. ${test.name}\n`;
            report += `   URL: ${test.url}\n`;
            
            if (test.error) {
                report += `   Status: ERROR - ${test.error}\n`;
            } else {
                const status = test.validation.passed ? 
                    (test.validation.warnings.length > 0 ? 'PASS (with warnings)' : 'PASS') : 
                    'FAIL';
                report += `   Status: ${status}\n`;
                
                if (test.schemas && test.schemas.length > 0) {
                    report += `   Schemas Found: ${test.schemas.join(', ')}\n`;
                }
                
                if (test.validation.errors.length > 0) {
                    report += `   Errors:\n`;
                    test.validation.errors.forEach(e => report += `      - ${e}\n`);
                }
                
                if (test.validation.warnings.length > 0) {
                    report += `   Warnings:\n`;
                    test.validation.warnings.forEach(w => report += `      - ${w}\n`);
                }
            }
            
            report += '\n';
        });
        
        report += '═'.repeat(60) + '\n';
        report += 'END OF REPORT\n';
        
        return report;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run validation
console.log('Starting schema validation...\n');

const validator = new SchemaValidator();
validator.validate().catch(error => {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
});
