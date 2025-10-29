# Google Search Console Rate Limit - Troubleshooting Guide

## Understanding the Current "Error"

**IMPORTANT**: The "Google Search Console Sync - Failed - API rate limit exceeded" error you're seeing in the Activity Log is **DEMO DATA** that was added to demonstrate how the Activity Log displays failures. It's not a real error!

### To Clear Demo Data

Run this command to clear the sample activities:
```bash
node clear-demo-activities.js
```

This will reset the Activity Log to empty state.

---

## If You Encounter REAL GSC Rate Limit Errors

Google Search Console API has rate limits. Here's how to handle them:

### 1. Understanding GSC Rate Limits

Google Search Console API limits:
- **200 queries per day** per project
- **Burst limit**: Not officially documented, but typically around 1-3 queries per second
- Limits are per Google Cloud project, not per user

### 2. Check Your GSC Integration

First, verify if you have GSC integration set up:

```bash
# Check for GSC credentials
ls -la clients/*.json 2>/dev/null | grep -i service

# Check GSC configuration
cat clients/clients-config.json | grep -i gsc
```

### 3. Common Causes of Rate Limits

1. **Too Frequent Sync** - Syncing every few minutes
2. **Multiple Clients** - Syncing many clients simultaneously
3. **Large Date Ranges** - Requesting too much historical data
4. **No Caching** - Re-fetching same data repeatedly

### 4. Solutions

#### Option A: Adjust Sync Frequency

Edit your GSC sync schedule to be less frequent:

```javascript
// In your GSC sync code, add delays
const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // Sync once per day instead of hourly

// Add exponential backoff
let retryDelay = 60000; // Start with 1 minute
if (error.message.includes('rate limit')) {
  console.log(`Rate limited. Waiting ${retryDelay}ms before retry...`);
  await new Promise(resolve => setTimeout(resolve, retryDelay));
  retryDelay *= 2; // Double the delay for next retry
}
```

#### Option B: Implement Request Queuing

```javascript
// Create a queue for GSC requests
import activityLogger from './src/utils/activity-logger.js';

class GSCRequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.requestDelay = 2000; // 2 seconds between requests
  }

  async add(request) {
    this.queue.push(request);
    if (!this.processing) {
      await this.process();
    }
  }

  async process() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      
      try {
        await request();
        await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      } catch (error) {
        if (error.message.includes('rate limit')) {
          // Log the rate limit error
          activityLogger.logError({
            action: 'Google Search Console Sync',
            description: 'GSC API rate limit exceeded',
            error: error,
            details: { 
              queueLength: this.queue.length,
              willRetry: true 
            }
          });
          
          // Wait longer and re-add to queue
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
          this.queue.unshift(request); // Put back at front of queue
        } else {
          throw error;
        }
      }
    }
    
    this.processing = false;
  }
}

export const gscQueue = new GSCRequestQueue();
```

#### Option C: Implement Caching

```javascript
// Cache GSC data to reduce API calls
import fs from 'fs';
import path from 'path';

const CACHE_DIR = './cache/gsc';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(clientId, startDate, endDate) {
  return `${clientId}_${startDate}_${endDate}.json`;
}

async function getCachedData(clientId, startDate, endDate) {
  const cacheFile = path.join(CACHE_DIR, getCacheKey(clientId, startDate, endDate));
  
  try {
    if (!fs.existsSync(cacheFile)) return null;
    
    const stats = fs.statSync(cacheFile);
    const age = Date.now() - stats.mtimeMs;
    
    if (age > CACHE_TTL) {
      fs.unlinkSync(cacheFile); // Delete expired cache
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log(`✅ Using cached GSC data (${Math.round(age / 1000 / 60)} minutes old)`);
    return data;
  } catch (error) {
    return null;
  }
}

async function setCachedData(clientId, startDate, endDate, data) {
  const cacheFile = path.join(CACHE_DIR, getCacheKey(clientId, startDate, endDate));
  
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}

// Use in your GSC sync
async function syncGSCData(clientId, startDate, endDate) {
  // Check cache first
  const cached = await getCachedData(clientId, startDate, endDate);
  if (cached) return cached;
  
  // Fetch from API
  try {
    const data = await fetchFromGSC(clientId, startDate, endDate);
    await setCachedData(clientId, startDate, endDate, data);
    return data;
  } catch (error) {
    if (error.message.includes('rate limit')) {
      activityLogger.logError({
        action: 'Google Search Console Sync',
        description: 'GSC API rate limit exceeded',
        error: error,
        details: { clientId, startDate, endDate }
      });
      throw error;
    }
  }
}
```

#### Option D: Batch Client Syncs with Delays

```javascript
// Sync multiple clients with delays
async function syncAllClients(clientIds) {
  const results = [];
  const delay = 5000; // 5 seconds between clients
  
  for (const clientId of clientIds) {
    try {
      console.log(`Syncing GSC data for ${clientId}...`);
      const data = await syncGSCData(clientId);
      results.push({ clientId, success: true, data });
      
      // Log success
      activityLogger.logAPICall({
        action: 'Google Search Console Sync',
        description: `Successfully synced GSC data for ${clientId}`,
        status: 'success',
        clientId: clientId,
        duration: data.duration
      });
      
    } catch (error) {
      results.push({ clientId, success: false, error: error.message });
      
      // Log failure
      activityLogger.logError({
        action: 'Google Search Console Sync',
        description: `Failed to sync GSC data for ${clientId}`,
        clientId: clientId,
        error: error
      });
    }
    
    // Wait before next client
    if (clientIds.indexOf(clientId) < clientIds.length - 1) {
      console.log(`Waiting ${delay}ms before next client...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}
```

### 5. Monitor with Activity Log

Once you implement any of these solutions, the Activity Log will show:
- ✅ Successful syncs
- ❌ Failed syncs with error details
- ⏱️ Duration of each sync
- 📊 Success rate over time

### 6. Check Current GSC Configuration

```bash
# Check if GSC is configured
cd "/mnt/c/Users/abhis/projects/seo expert"

# Look for GSC-related files
find . -name "*gsc*" -o -name "*search-console*" 2>/dev/null

# Check for service account credentials
ls -la clients/*.json 2>/dev/null
```

### 7. Testing GSC Integration

Create a test script to verify GSC connection:

```javascript
// test-gsc-connection.js
import { getDB } from './src/database/index.js';
import activityLogger from './src/utils/activity-logger.js';

async function testGSCConnection(clientId) {
  const startTime = Date.now();
  
  try {
    console.log(`Testing GSC connection for ${clientId}...`);
    
    // Your GSC fetch code here
    // const data = await gscClient.fetchData(...);
    
    const duration = Date.now() - startTime;
    
    activityLogger.logAPICall({
      action: 'GSC Connection Test',
      description: 'Successfully connected to Google Search Console',
      status: 'success',
      clientId: clientId,
      duration: duration
    });
    
    console.log(`✅ GSC connection successful (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    
    activityLogger.logError({
      action: 'GSC Connection Test',
      description: 'Failed to connect to Google Search Console',
      clientId: clientId,
      error: error,
      duration: duration
    });
    
    console.error(`❌ GSC connection failed:`, error.message);
  }
}

// Run test
testGSCConnection('your-client-id');
```

### 8. Best Practices

1. **Sync Once Daily** - GSC data doesn't update in real-time
2. **Use Rolling 7-Day Window** - Don't request large date ranges
3. **Cache Aggressively** - Cache for at least 12-24 hours
4. **Monitor Rate Limits** - Track your API usage
5. **Implement Backoff** - Use exponential backoff on rate limit errors
6. **Queue Requests** - Process requests sequentially with delays
7. **Log Everything** - Use Activity Log to track all GSC operations

### 9. Quick Fix Script

Create this script to implement basic rate limit handling:

```bash
cat > gsc-sync-with-limits.js << 'EOF'
#!/usr/bin/env node
import activityLogger from './src/utils/activity-logger.js';

const RATE_LIMIT_DELAY = 60000; // 1 minute
const REQUEST_DELAY = 2000; // 2 seconds between requests

async function syncWithRateLimit(clients) {
  for (const client of clients) {
    let retries = 0;
    let success = false;
    
    while (!success && retries < 3) {
      try {
        await syncClient(client);
        success = true;
      } catch (error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          retries++;
          console.log(`⏳ Rate limited. Retry ${retries}/3 after ${RATE_LIMIT_DELAY}ms...`);
          await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
        } else {
          throw error;
        }
      }
    }
    
    // Delay between clients
    await new Promise(r => setTimeout(r, REQUEST_DELAY));
  }
}
EOF
```

---

## Summary

1. **Current Error is Demo Data** - Run `node clear-demo-activities.js` to clear it
2. **Real Rate Limits** - Implement caching, queuing, and delays
3. **Monitor with Activity Log** - All GSC operations will be logged automatically
4. **Best Practice** - Sync once daily with 2-5 second delays between requests

**Need help implementing any of these solutions? Let me know which approach you'd like to use!**
