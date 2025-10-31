#!/usr/bin/env node

/**
 * Test Validation System
 * 
 * Tests all validation schemas with valid and invalid inputs
 * 
 * Usage:
 *   node scripts/test-validation.js
 */

import {
  clientSchema,
  campaignSchema,
  goalSchema,
  webhookSchema,
  keywordSchema,
  optimizationSchema,
  scheduledJobSchema,
  localSEOAuditSchema,
  wordpressConnectionSchema,
  loginSchema,
  registerSchema
} from '../src/validation/schemas.js';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let passed = 0;
let failed = 0;

function testSchema(name, schema, validData, invalidData) {
  log(`\n🧪 Testing ${name}`, 'bold');
  
  // Test valid data
  const validResult = schema.validate(validData);
  if (!validResult.error) {
    log(`  ✅ Valid data accepted`, 'green');
    passed++;
  } else {
    log(`  ❌ Valid data rejected: ${validResult.error.message}`, 'red');
    failed++;
  }
  
  // Test invalid data
  const invalidResult = schema.validate(invalidData);
  if (invalidResult.error) {
    log(`  ✅ Invalid data rejected`, 'green');
    log(`     Error: ${invalidResult.error.details[0].message}`, 'yellow');
    passed++;
  } else {
    log(`  ❌ Invalid data accepted (should have been rejected)`, 'red');
    failed++;
  }
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║      Validation System Test Suite             ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');
  
  // Test Client Schema
  testSchema('Client Schema', clientSchema,
    {
      id: 'test-client',
      name: 'Test Client',
      domain: 'testclient.com',
      businessType: 'Technology',
      city: 'New York',
      country: 'USA'
    },
    {
      id: 'Invalid ID!',  // Invalid characters
      name: 'T',  // Too short
      domain: 'not-a-domain'
    }
  );
  
  // Test Campaign Schema
  testSchema('Campaign Schema', campaignSchema,
    {
      clientId: 'test-client',
      name: 'Q4 SEO Campaign',
      type: 'seo',
      status: 'active',
      startDate: '2025-10-01',
      budget: 5000
    },
    {
      clientId: '',  // Required
      name: 'Te',  // Too short
      type: 'invalid-type',
      startDate: 'not-a-date'
    }
  );
  
  // Test Goal Schema
  testSchema('Goal Schema', goalSchema,
    {
      clientId: 'test-client',
      metric: 'traffic',
      target: 10000,
      current: 5000,
      deadline: '2025-12-31',
      priority: 'high'
    },
    {
      clientId: 'test-client',
      metric: 'invalid-metric',  // Invalid enum
      target: -100,  // Negative number
      deadline: 'not-a-date'
    }
  );
  
  // Test Webhook Schema
  testSchema('Webhook Schema', webhookSchema,
    {
      url: 'https://example.com/webhook',
      events: ['audit.completed', 'rank.changed'],
      secret: 'a'.repeat(32)  // Min 32 chars
    },
    {
      url: 'not-a-url',
      events: [],  // Empty array
      secret: 'short'  // Too short
    }
  );
  
  // Test Keyword Schema
  testSchema('Keyword Schema', keywordSchema,
    {
      keyword: 'seo services',
      domain: 'example.com',
      location: 'New York',
      language: 'en',
      device: 'desktop'
    },
    {
      keyword: 's',  // Too short
      domain: 'not-a-domain',
      language: 'english',  // Should be 2 chars
      device: 'smartwatch'  // Invalid enum
    }
  );
  
  // Test Optimization Schema
  testSchema('Optimization Schema', optimizationSchema,
    {
      clientId: 'test-client',
      contentType: 'post',
      contentId: 123,
      contentTitle: 'Test Post Title'
    },
    {
      clientId: '',  // Required
      contentType: 'article',  // Invalid enum
      contentId: -5  // Negative number
    }
  );
  
  // Test Scheduled Job Schema
  testSchema('Scheduled Job Schema', scheduledJobSchema,
    {
      name: 'Daily Audit',
      type: 'audit',
      schedule: '0 2 * * *',
      clientId: 'test-client',
      enabled: true
    },
    {
      name: 'ab',  // Too short
      type: 'invalid-type',
      schedule: '',  // Required
      enabled: 'yes'  // Should be boolean
    }
  );
  
  // Test Local SEO Audit Schema
  testSchema('Local SEO Audit Schema', localSEOAuditSchema,
    {
      includeNAP: true,
      includeSchema: true,
      includeDirectories: false,
      includeReviews: true
    },
    {
      includeNAP: 'yes',  // Should be boolean
      includeSchema: 1,  // Should be boolean
      includeDirectories: null
    }
  );
  
  // Test WordPress Connection Schema
  testSchema('WordPress Connection Schema', wordpressConnectionSchema,
    {
      siteId: 'test-site',
      url: 'https://example.com',
      username: 'admin',
      appPassword: 'xxxx xxxx xxxx xxxx xxxx',  // 24+ chars
      verifySSL: true
    },
    {
      siteId: '',  // Required
      url: 'not-a-url',
      username: 'ab',  // Too short
      appPassword: 'short',  // Too short (min 20)
      verifySSL: 'yes'  // Should be boolean
    }
  );
  
  // Test Login Schema
  testSchema('Login Schema', loginSchema,
    {
      email: 'user@example.com',
      password: 'password123'
    },
    {
      email: 'not-an-email',
      password: ''  // Required
    }
  );
  
  // Test Register Schema
  testSchema('Register Schema', registerSchema,
    {
      clientId: 'test-client',
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'client'
    },
    {
      clientId: '',  // Required
      email: 'invalid-email',
      password: 'short',  // Min 8 chars
      role: 'superadmin'  // Invalid enum
    }
  );
  
  // Summary
  log('\n' + '═'.repeat(50), 'cyan');
  log('  TEST SUMMARY', 'bold');
  log('═'.repeat(50), 'cyan');
  
  log(`\n✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`📊 Total: ${passed + failed}\n`);
  
  if (failed === 0) {
    log('🎉 All validation tests passed!\n', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Review the errors above.\n', 'yellow');
    process.exit(1);
  }
}

runTests();
