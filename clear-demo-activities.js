#!/usr/bin/env node

/**
 * Clear Demo Activity Log Data
 * 
 * This script clears the sample/demo activity log entries
 * and resets the activity log to empty state.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'data', 'activity-log.json');

console.log('🧹 Clearing demo activity log data...\n');

// Create empty/reset database
const resetData = {
  activities: [],
  stats: {
    totalActivities: 0,
    successCount: 0,
    failureCount: 0,
    warningCount: 0
  }
};

try {
  fs.writeFileSync(DB_PATH, JSON.stringify(resetData, null, 2));
  console.log('✅ Activity log cleared successfully!');
  console.log('📊 Stats reset to zero');
  console.log('\nThe Activity Log page will now show "No activities found".');
  console.log('New activities will be logged as your system operates.\n');
} catch (error) {
  console.error('❌ Error clearing activity log:', error.message);
  process.exit(1);
}
