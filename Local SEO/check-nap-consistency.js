#!/usr/bin/env node

/**
 * NAP CONSISTENCY CHECKER
 *
 * Automatically checks your website for NAP (Name, Address, Phone) consistency.
 * Finds all mentions of business name, address, and phone across your site.
 *
 * Usage: node check-nap-consistency.js
 */

import https from 'https';
import http from 'http';
import { JSDOM } from 'jsdom';

// ============================================================================
// CONFIGURATION - Your Official NAP
// ============================================================================

const officialNAP = {
  businessName: "Instant Auto Traders",
  address: {
    street: "[Your Street Address]",
    city: "Sydney",
    state: "NSW",
    postcode: "[Your Postcode]",
    country: "Australia"
  },
  phone: "[Your Phone Number]",
  // Alternative acceptable phone formats
  phoneFormats: [
    "[02 9XXX XXXX]",
    "[(02) 9XXX XXXX]",
    "[+61 2 9XXX XXXX]"
  ],
  website: "https://instantautotraders.com.au",
  email: "[your-email@instantautotraders.com.au]"
};

// ============================================================================
// PAGES TO CHECK
// ============================================================================

const pagesToCheck = [
  'https://instantautotraders.com.au',
  'https://instantautotraders.com.au/contact',
  'https://instantautotraders.com.au/about',
  'https://instantautotraders.com.au/services',
  // Add more pages as needed
];

// ============================================================================
// NAP FINDER
// ============================================================================

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function extractNAP(html, url) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const found = {
    url,
    businessName: [],
    addresses: [],
    phones: [],
    emails: []
  };

  // Get all text content
  const bodyText = document.body.textContent || '';

  // Find business name
  const nameRegex = new RegExp(officialNAP.businessName, 'gi');
  const nameMatches = bodyText.match(nameRegex);
  if (nameMatches) {
    found.businessName = [...new Set(nameMatches)];
  }

  // Find phone numbers (various formats)
  const phoneRegex = /(\+?61[\s-]?)?(\(0?2\)|0?2)[\s-]?\d{4}[\s-]?\d{4}/g;
  const phoneMatches = bodyText.match(phoneRegex);
  if (phoneMatches) {
    found.phones = [...new Set(phoneMatches.map(p => p.trim()))];
  }

  // Find email addresses
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emailMatches = bodyText.match(emailRegex);
  if (emailMatches) {
    found.emails = [...new Set(emailMatches)];
  }

  // Find addresses (look for city/state mentions)
  const addressRegex = /Sydney\s*,?\s*NSW\s*\d{4}/gi;
  const addressMatches = bodyText.match(addressRegex);
  if (addressMatches) {
    found.addresses = [...new Set(addressMatches)];
  }

  // Check footer specifically
  const footer = document.querySelector('footer');
  if (footer) {
    found.footer = {
      text: footer.textContent.substring(0, 500) // First 500 chars
    };
  }

  // Check schema markup
  const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
  found.schemas = [];
  schemaScripts.forEach(script => {
    try {
      const schema = JSON.parse(script.textContent);
      if (schema.address || schema.telephone) {
        found.schemas.push({
          type: schema['@type'],
          name: schema.name,
          address: schema.address,
          telephone: schema.telephone,
          email: schema.email
        });
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  });

  return found;
}

// ============================================================================
// CONSISTENCY ANALYZER
// ============================================================================

function analyzeConsistency(results) {
  console.log('\n📊 NAP CONSISTENCY ANALYSIS');
  console.log('='.repeat(70));

  const issues = [];
  const warnings = [];

  // Check phone consistency
  const allPhones = new Set();
  results.forEach(result => {
    result.phones.forEach(phone => allPhones.add(phone));
  });

  if (allPhones.size > 1) {
    issues.push({
      type: 'PHONE',
      severity: 'HIGH',
      message: `Found ${allPhones.size} different phone number formats`,
      details: Array.from(allPhones)
    });
  }

  // Check email consistency
  const allEmails = new Set();
  results.forEach(result => {
    result.emails.forEach(email => {
      if (email.includes('instantautotraders')) {
        allEmails.add(email);
      }
    });
  });

  if (allEmails.size > 1) {
    warnings.push({
      type: 'EMAIL',
      severity: 'MEDIUM',
      message: `Found ${allEmails.size} different email addresses`,
      details: Array.from(allEmails)
    });
  }

  // Check schema consistency
  const schemasWithPhone = [];
  results.forEach(result => {
    if (result.schemas) {
      result.schemas.forEach(schema => {
        if (schema.telephone) {
          schemasWithPhone.push({
            url: result.url,
            type: schema.type,
            phone: schema.telephone,
            address: schema.address
          });
        }
      });
    }
  });

  if (schemasWithPhone.length > 0) {
    const schemaPhones = new Set(schemasWithPhone.map(s => s.phone));
    if (schemaPhones.size > 1) {
      issues.push({
        type: 'SCHEMA_PHONE',
        severity: 'HIGH',
        message: 'Schema markup has inconsistent phone numbers',
        details: schemasWithPhone
      });
    }
  }

  return { issues, warnings };
}

// ============================================================================
// REPORTER
// ============================================================================

function generateReport(results, analysis) {
  console.log('\n\n📋 NAP CONSISTENCY REPORT');
  console.log('='.repeat(70));
  console.log(`\nChecked ${results.length} pages on ${officialNAP.website}\n`);

  // Summary
  let score = 100;
  const { issues, warnings } = analysis;

  issues.forEach(issue => {
    score -= issue.severity === 'HIGH' ? 20 : 10;
  });

  warnings.forEach(warning => {
    score -= 5;
  });

  score = Math.max(0, score);

  console.log(`\n🎯 NAP CONSISTENCY SCORE: ${score}/100`);

  if (score === 100) {
    console.log('   ✅ PERFECT - No inconsistencies found!\n');
  } else if (score >= 80) {
    console.log('   ✅ GOOD - Minor inconsistencies only\n');
  } else if (score >= 60) {
    console.log('   ⚠️  NEEDS ATTENTION - Some inconsistencies found\n');
  } else {
    console.log('   ❌ CRITICAL - Major inconsistencies need fixing\n');
  }

  // Issues
  if (issues.length > 0) {
    console.log(`\n❌ ISSUES FOUND (${issues.length}):\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.severity}] ${issue.message}`);
      if (issue.details) {
        console.log(`   Found:`);
        if (Array.isArray(issue.details)) {
          issue.details.forEach(detail => {
            console.log(`     - ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
          });
        }
      }
      console.log('');
    });
  }

  // Warnings
  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):\n`);
    warnings.forEach((warning, i) => {
      console.log(`${i + 1}. ${warning.message}`);
      if (warning.details) {
        console.log(`   Found:`);
        warning.details.forEach(detail => {
          console.log(`     - ${detail}`);
        });
      }
      console.log('');
    });
  }

  // Detailed findings
  console.log(`\n📄 DETAILED FINDINGS:\n`);
  results.forEach(result => {
    console.log(`\n${result.url}`);
    console.log(`   Business Names: ${result.businessName.length > 0 ? result.businessName[0] : 'Not found'}`);
    console.log(`   Phone Numbers: ${result.phones.length > 0 ? result.phones.join(', ') : 'Not found'}`);
    console.log(`   Emails: ${result.emails.length > 0 ? result.emails.filter(e => e.includes('instantauto')).join(', ') : 'Not found'}`);

    if (result.schemas && result.schemas.length > 0) {
      console.log(`   Schema Markup:`);
      result.schemas.forEach(schema => {
        console.log(`     - Type: ${schema.type}`);
        console.log(`       Name: ${schema.name}`);
        console.log(`       Phone: ${schema.telephone || 'Not specified'}`);
      });
    }
  });

  // Recommendations
  console.log(`\n\n💡 RECOMMENDATIONS:\n`);

  if (issues.length === 0 && warnings.length === 0) {
    console.log('   ✅ Your NAP is consistent across your website!');
    console.log('   ✅ Next: Check consistency on external directories');
  } else {
    console.log('   1. Fix the high-priority issues first');
    console.log('   2. Choose ONE phone format and use it everywhere');
    console.log('   3. Update schema markup to match your chosen format');
    console.log('   4. Use copy-paste (don\'t retype) to ensure consistency');
    console.log('   5. Re-run this checker after making changes');
  }

  console.log(`\n📚 NEXT STEPS:\n`);
  console.log('   1. Fix any issues found above');
  console.log('   2. Save your official NAP format in NAP-CONSISTENCY-CHECKLIST.md');
  console.log('   3. Use that exact format for all directory submissions');
  console.log('   4. Re-run this checker monthly to maintain consistency');

  return { score, issues, warnings };
}

// ============================================================================
// MAIN
// ============================================================================

async function checkNAPConsistency() {
  console.log('\n🔍 NAP CONSISTENCY CHECKER');
  console.log('='.repeat(70));
  console.log(`\nChecking ${pagesToCheck.length} pages...\n`);

  try {
    const results = [];

    for (const url of pagesToCheck) {
      try {
        console.log(`   → Fetching: ${url}`);
        const html = await fetchPage(url);
        const napData = extractNAP(html, url);
        results.push(napData);
      } catch (error) {
        console.log(`   ✗ Error fetching ${url}: ${error.message}`);
      }
    }

    console.log(`\n   ✓ Fetched ${results.length} pages successfully`);

    // Analyze
    const analysis = analyzeConsistency(results);

    // Generate report
    const report = generateReport(results, analysis);

    return report;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n🚀 Starting NAP Consistency Check...\n');

  checkNAPConsistency()
    .then((report) => {
      console.log('\n✅ Check complete!\n');
      process.exit(report.score >= 80 ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

export { checkNAPConsistency };
