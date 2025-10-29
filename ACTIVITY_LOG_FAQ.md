# Activity Log - Frequently Asked Questions

## ❓ "I see a Google Search Console Sync error. How do I fix it?"

### Answer: It's Demo Data! 

**The error you're seeing is NOT real** - it's sample data I created to demonstrate how the Activity Log displays failures.

### To Clear Demo Data:

```bash
# Option 1: Run the clear script
node clear-demo-activities.js

# Option 2: Check what's in there first
./show-activity-log-info.sh

# Option 3: Manual clear (advanced)
echo '{"activities":[],"stats":{"totalActivities":0,"successCount":0,"failureCount":0,"warningCount":0}}' > data/activity-log.json
```

### After Clearing:
- Activity Log will show "No activities found"
- As your system runs operations, new activities will be automatically logged
- All auto-fix operations will be tracked going forward

---

## ❓ "When will I see REAL activities in the log?"

Real activities will be logged automatically when:

1. **Auto-Fix Engines Run**
   - NAP Consistency fixes
   - Schema markup injections  
   - Title/Meta optimizations
   - Content optimizations

2. **API Calls Are Made**
   - Google Search Console syncs (if configured)
   - WordPress API calls
   - Position tracking updates

3. **You Manually Log Activities**
   ```javascript
   import { logAutoFix } from './src/utils/activity-logger.js';
   
   logAutoFix({
     action: 'My Custom Operation',
     description: 'What happened',
     status: 'success',
     clientId: 'client-id',
     itemsProcessed: 10,
     itemsSuccessful: 9,
     duration: 5000
   });
   ```

---

## ❓ "How do I integrate Activity Logging with my existing scripts?"

### Step 1: Import the Logger

```javascript
import { logAutoFix, logError, logAPICall } from './src/utils/activity-logger.js';
```

### Step 2: Add Logging to Your Operations

**Example - Auto-Fix Script:**
```javascript
// At the start of your operation
const startTime = Date.now();
let itemsProcessed = 0;
let itemsSuccessful = 0;
let itemsFailed = 0;

try {
  // Your auto-fix logic here
  for (const page of pages) {
    itemsProcessed++;
    try {
      await fixPage(page);
      itemsSuccessful++;
    } catch (error) {
      itemsFailed++;
    }
  }
  
  // Log success
  logAutoFix({
    action: 'NAP Consistency Fix',
    description: `Fixed NAP data across ${itemsSuccessful} pages`,
    status: 'success',
    clientId: clientId,
    clientName: clientName,
    itemsProcessed,
    itemsSuccessful,
    itemsFailed,
    duration: Date.now() - startTime,
    details: { /* any extra info */ }
  });
  
} catch (error) {
  // Log failure
  logError({
    action: 'NAP Consistency Fix',
    description: 'Failed to complete NAP fixes',
    clientId: clientId,
    error: error,
    details: { itemsProcessed, itemsSuccessful }
  });
}
```

**Example - API Call:**
```javascript
const startTime = Date.now();

try {
  const data = await fetch('https://api.example.com/data');
  
  logAPICall({
    action: 'External API Call',
    description: 'Fetched data from API',
    status: 'success',
    duration: Date.now() - startTime,
    details: { endpoint: 'https://api.example.com/data' }
  });
  
} catch (error) {
  logError({
    action: 'External API Call',
    description: 'API call failed',
    error: error,
    duration: Date.now() - startTime
  });
}
```

---

## ❓ "How do I handle REAL Google Search Console rate limits?"

If you're actually using GSC and hit rate limits, here's what to do:

### Solution 1: Add Request Delays (Simplest)
```javascript
// In your GSC sync code
async function syncAllClients(clients) {
  for (const client of clients) {
    await syncGSCData(client);
    
    // Wait 5 seconds before next client
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

### Solution 2: Implement Caching
```javascript
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map();

async function getGSCData(clientId) {
  const cacheKey = `gsc_${clientId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached GSC data');
    return cached.data;
  }
  
  const data = await fetchFromGSC(clientId);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

### Solution 3: Add Retry Logic
```javascript
async function fetchWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('rate limit') && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 60000; // 1min, 2min, 4min
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

**Full guide:** See `GSC_RATE_LIMIT_GUIDE.md`

---

## ❓ "Can I export activity logs?"

### Currently Available: API Export
```bash
# Export as JSON
curl "http://localhost:9000/api/activity-log?limit=1000" > activities-export.json

# Export failed activities only
curl "http://localhost:9000/api/activity-log/failed?limit=100" > failed-activities.json

# Export for specific client
curl "http://localhost:9000/api/activity-log/client/instantautotraders" > client-activities.json
```

### Future Enhancement: CSV Export
Add this to your roadmap:
- Export button in UI
- CSV format for Excel
- Date range selection
- Filter before export

---

## ❓ "How long are activities kept?"

### Current Retention
- **Auto-cleanup**: Keeps last 5,000 activities
- **Oldest activities are removed automatically** when limit is reached

### Manual Cleanup
```bash
# Clear activities older than 90 days
curl -X DELETE "http://localhost:9000/api/activity-log/cleanup?days=90"

# Clear all activities
node clear-demo-activities.js
```

### Change Retention
Edit `src/database/activity-log-db.js`:
```javascript
// Change this line (currently 5000)
if (db.activities.length > 5000) {
  db.activities = db.activities.slice(-5000);
}

// To keep more:
if (db.activities.length > 10000) {
  db.activities = db.activities.slice(-10000);
}
```

---

## ❓ "Can I get notifications for failed activities?"

Yes! Here's how to set it up:

### Option 1: Check Activity Log API Periodically
```javascript
// check-failures.js
import fetch from 'node-fetch';

async function checkForFailures() {
  const response = await fetch('http://localhost:9000/api/activity-log/failed?limit=10');
  const { data } = await response.json();
  
  if (data && data.length > 0) {
    console.log(`⚠️  Found ${data.length} failed activities!`);
    
    // Send notification (email, Discord, Slack, etc.)
    for (const activity of data) {
      console.log(`- ${activity.action}: ${activity.error}`);
      // sendNotification(activity);
    }
  }
}

// Run every hour
setInterval(checkForFailures, 60 * 60 * 1000);
```

### Option 2: Integrate with Existing Notification System
```javascript
import { logError } from './src/utils/activity-logger.js';
import { sendNotification } from './your-notification-system.js';

// Wrap logError to also send notifications
function logErrorWithNotification(data) {
  // Log to activity log
  const activity = logError(data);
  
  // Send notification for critical errors
  if (data.critical) {
    sendNotification({
      title: `❌ ${data.action} Failed`,
      message: data.description,
      details: data.error?.message
    });
  }
  
  return activity;
}
```

---

## ❓ "Where are activities stored?"

### Storage Location
```
data/activity-log.json
```

### Backup Recommendation
```bash
# Add to your backup script
cp data/activity-log.json backups/activity-log-$(date +%Y%m%d).json

# Or create automated backup cron job
# Edit crontab: crontab -e
# Add: 0 0 * * * cd /path/to/project && cp data/activity-log.json backups/activity-log-$(date +\%Y\%m\%d).json
```

### Database Structure
```json
{
  "activities": [
    {
      "id": "unique_id",
      "type": "autofix|api_call|error|etc",
      "action": "What happened",
      "status": "success|failed|warning",
      "clientId": "client-id",
      "duration": 5000,
      "itemsProcessed": 10,
      "itemsSuccessful": 9,
      "itemsFailed": 1,
      "error": "Error message if failed",
      "createdAt": "2025-10-29T00:00:00.000Z",
      "timestamp": 1761697975115
    }
  ],
  "stats": {
    "totalActivities": 100,
    "successCount": 85,
    "failureCount": 15
  }
}
```

---

## ❓ "How do I migrate to SQL database instead of JSON?"

For high-volume operations, you may want SQL:

### Quick Migration Script
```javascript
// migrate-to-sqlite.js
import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('data/activity-log.db');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    type TEXT,
    action TEXT,
    description TEXT,
    status TEXT,
    clientId TEXT,
    duration INTEGER,
    itemsProcessed INTEGER,
    itemsSuccessful INTEGER,
    itemsFailed INTEGER,
    error TEXT,
    createdAt TEXT,
    timestamp INTEGER
  )
`);

// Import existing data
const jsonData = JSON.parse(fs.readFileSync('data/activity-log.json', 'utf8'));
const insert = db.prepare(`
  INSERT INTO activities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const activity of jsonData.activities) {
  insert.run(
    activity.id,
    activity.type,
    activity.action,
    activity.description,
    activity.status,
    activity.clientId,
    activity.duration,
    activity.itemsProcessed,
    activity.itemsSuccessful,
    activity.itemsFailed,
    activity.error,
    activity.createdAt,
    activity.timestamp
  );
}

console.log(`✅ Migrated ${jsonData.activities.length} activities to SQLite`);
```

---

## Quick Commands Reference

```bash
# View activity log info
./show-activity-log-info.sh

# Clear demo data
node clear-demo-activities.js

# Check API status
curl http://localhost:9000/api/activity-log/stats

# Get recent activities
curl http://localhost:9000/api/activity-log/recent

# Get failed activities
curl http://localhost:9000/api/activity-log/failed

# Access in browser
open http://localhost:9000
# Navigate to: Automation → Activity Log
```

---

**Need more help? Check the other documentation files:**
- `ACTIVITY_LOG_QUICK_START.md` - Get started in 3 steps
- `ACTIVITY_LOG_GUIDE.md` - Complete user guide
- `GSC_RATE_LIMIT_GUIDE.md` - GSC rate limit solutions
- `ACTIVITY_LOG_IMPLEMENTATION_SUMMARY.md` - Technical details
