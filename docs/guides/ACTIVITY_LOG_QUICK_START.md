# Activity Log - Quick Start 🚀

## Start Using in 3 Steps

### Step 1: Start the Server
```bash
node dashboard-server.js
```

### Step 2: Open Dashboard
Navigate to: `http://localhost:9000`

### Step 3: View Activity Log
Click: **Automation** → **Activity Log**

---

## What You'll See

### 📊 Statistics
- **Total Activities** - All logged operations
- **Successful** - Operations that completed successfully
- **Failed** - Operations with errors (need attention!)
- **Items Processed** - Total items handled by operations

### 📋 Activity List
Each activity shows:
- **Status** - ✅ Success, ❌ Failed, ⚠️ Warning, ⏳ In Progress
- **Type** - Auto-Fix, API Call, User Action, System Event, Error
- **Action** - What was done
- **Client** - Which client it affected
- **Items** - How many items were processed
- **Duration** - How long it took
- **Timestamp** - When it happened
- **Details** - Click 📄 to see full information

---

## Quick Filters

### Search
Type keywords to find specific activities:
- "NAP" - Find NAP consistency fixes
- "schema" - Find schema injections
- "failed" - Find anything with "failed" in description

### Type Filter
- **All Types** - Show everything
- **Auto-Fix** - Only auto-fix operations
- **API Call** - External API interactions
- **User Action** - Manual user operations
- **System Event** - Background processes
- **Error** - Only errors

### Status Filter
- **All Status** - Everything
- **Success** - Only successful operations
- **Failed** - Only failures (troubleshoot here!)
- **Warning** - Operations with warnings
- **In Progress** - Currently running

### Time Range
- **Last Hour** - Very recent
- **Last 24 Hours** - Today (default)
- **Last 7 Days** - This week
- **Last 30 Days** - This month
- **All Time** - Everything ever logged

---

## View Details

1. Find the activity you want to inspect
2. Click the **📄 icon** in the Details column
3. Dialog opens showing:
   - Full description
   - Status and category
   - Duration
   - Items processed (success/failed breakdown)
   - Error details (if failed)
   - Complete metadata and technical info

---

## Common Use Cases

### ✅ Check if Auto-Fix Ran Successfully
1. Set Type filter to "Auto-Fix"
2. Set Status filter to "Success"
3. Look for recent entries

### ❌ Troubleshoot Failures
1. Set Status filter to "Failed"
2. Review error messages
3. Click details for full stack trace

### 🔍 Track Client Operations
1. Search for client name
2. Or use Type = "Auto-Fix" and look for client in results
3. See all operations for that client

### 📈 Monitor Performance
1. Look at Duration column
2. Identify slow operations
3. Investigate if duration is unusually high

### 📊 View Daily Summary
1. Set Time Range to "Last 24 Hours"
2. Check statistics at top
3. Review success rate

---

## Need More Help?

- **Full Guide**: See `ACTIVITY_LOG_GUIDE.md`
- **API Docs**: See `ACTIVITY_LOG_IMPLEMENTATION_SUMMARY.md`
- **Code Examples**: Check `src/utils/activity-logger.js`

---

## Pro Tips 💡

1. **Check daily** - Make it a habit to review failed activities
2. **Use search** - Fastest way to find specific operations
3. **Time range matters** - Start with 24h, expand if needed
4. **Details view** - Always check details for failures
5. **Refresh** - Click refresh button to update data

---

**That's it! You're ready to track your SEO automation activities! 🎉**
