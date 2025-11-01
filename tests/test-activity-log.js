#!/usr/bin/env node

/**
 * Test Activity Log
 * 
 * This script logs a test activity to verify the Activity Log is working
 */

import activityLogger from './src/utils/activity-logger.js';

console.log('🧪 Testing Activity Log...\n');

// Log a test success
activityLogger.logAutoFix({
  action: 'Test Auto-Fix',
  description: 'Testing activity log system - this is a test entry',
  status: 'success',
  clientId: 'test-client',
  clientName: 'Test Client',
  itemsProcessed: 5,
  itemsSuccessful: 5,
  itemsFailed: 0,
  duration: 2500,
  details: {
    testMode: true,
    timestamp: new Date().toISOString()
  },
  metadata: {
    engineId: 'test-engine',
    engineName: 'Test Engine'
  }
});

console.log('✅ Test activity logged successfully!\n');
console.log('📊 Check the Activity Log at: http://localhost:9000');
console.log('   Navigate to: Automation → Activity Log\n');
console.log('You should see:');
console.log('  - Total Activities: 1');
console.log('  - Successful: 1');
console.log('  - Action: "Test Auto-Fix"');
console.log('  - Status: Success ✅\n');
