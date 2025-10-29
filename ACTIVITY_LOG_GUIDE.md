# Activity Log - User Guide

## Overview

The **Activity Log** feature provides a comprehensive audit trail of all system activities, allowing you to track what's been done, monitor system operations, and identify any issues that occurred.

## Features

### 📊 Dashboard View
- **Real-time statistics** - Success rate, total activities, failures
- **Items processed** - Track how many items were successfully processed
- **Time-based filtering** - View activities from last hour, 24h, 7 days, or 30 days
- **Status indicators** - Visual indicators for success, failed, warning, in-progress

### 🔍 Advanced Filtering
- **Search** - Search by action, description, or client name
- **Type Filter** - Filter by activity type (Auto-Fix, API Call, User Action, System Event, Error)
- **Status Filter** - Filter by status (Success, Failed, Warning, In Progress)
- **Time Range** - Select specific time ranges

### 📝 Detailed Activity Information
- **What changed** - See before/after values for auto-fix operations
- **Duration tracking** - Know how long each operation took
- **Error details** - Full error messages and stack traces for failed operations
- **Metadata** - Additional context and technical details

## Activity Types

### 1. **Auto-Fix** 
Tracks all automatic SEO fix operations:
- NAP Consistency Fixes
- Schema Markup Injections
- Title/Meta Optimizations
- Content Optimizations
- Image Alt Text Fixes

### 2. **API Call**
Logs external API interactions:
- Google Search Console syncs
- WordPress API calls
- Position tracking updates
- Keyword research requests

### 3. **User Action**
Records user interactions:
- Manual optimizations
- Settings changes
- Client configurations

### 4. **System Event**
System-level operations:
- Scheduled jobs
- Background processes
- Data migrations

### 5. **Error**
Critical errors and failures requiring attention.

## How to Use

### Accessing Activity Log

1. Open the SEO Automation Dashboard
2. Navigate to **Automation > Activity Log** in the sidebar
3. The main view shows recent activities with statistics

### Viewing Activity Details

1. Click the **details icon** (📄) next to any activity
2. A dialog opens showing:
   - Complete description
   - Items processed (success/failed counts)
   - Duration
   - Error details (if any)
   - Full metadata and technical details

### Filtering Activities

**By Search:**
```
Type keywords in the search box to find specific activities
```

**By Type:**
- Select from dropdown: All Types, Auto-Fix, API Call, User Action, System Event, Error

**By Status:**
- Select from dropdown: All Status, Success, Failed, Warning, In Progress

**By Time Range:**
- Last Hour - Recent activities
- Last 24 Hours - Today's activities (default)
- Last 7 Days - This week
- Last 30 Days - This month
- All Time - Complete history

### Understanding Statistics

**Total Activities**
- Count of all activities in selected time range

**Successful**
- Activities that completed without errors
- Shows success rate percentage

**Failed**
- Activities that encountered errors
- These require attention

**Items Processed**
- Total items/pages/records processed
- Shows successful count

## API Integration

### Backend API Endpoints

```javascript
// Get activities with filters
GET /api/activity-log?type=autofix&status=success&timeRange=24h

// Get recent activities (last 24 hours)
GET /api/activity-log/recent?limit=50

// Get failed activities
GET /api/activity-log/failed?limit=50

// Get activities for specific client
GET /api/activity-log/client/:clientId

// Get activity statistics
GET /api/activity-log/stats?timeRange=24h

// Get activity timeline
GET /api/activity-log/timeline?timeRange=7d&groupBy=day

// Get specific activity details
GET /api/activity-log/:activityId

// Log a new activity (programmatic)
POST /api/activity-log
```

### Programmatic Logging

Use the activity logger utility in your code:

```javascript
import { logAutoFix, logError, logAPICall } from './src/utils/activity-logger.js';

// Log an auto-fix operation
logAutoFix({
  action: 'NAP Consistency Fix',
  description: 'Fixed NAP data across all pages',
  status: 'success',
  clientId: 'client1',
  clientName: 'Acme Corp',
  itemsProcessed: 25,
  itemsSuccessful: 23,
  itemsFailed: 2,
  duration: 45000, // milliseconds
  details: { pagesFixed: 23 },
  metadata: { engineId: 'nap-fixer' }
});

// Log an error
logError({
  action: 'Google Search Console Sync',
  description: 'Failed to fetch GSC data',
  clientId: 'client1',
  clientName: 'Acme Corp',
  error: new Error('API rate limit exceeded'),
  details: { endpoint: '/api/gsc/sync' }
});

// Log an API call
logAPICall({
  action: 'WordPress Update',
  description: 'Updated post content via WP API',
  status: 'success',
  clientId: 'client1',
  duration: 1200,
  details: { postId: 123, method: 'PUT' },
  metadata: { endpoint: '/wp-json/wp/v2/posts/123' }
});
```

## Integration with Auto-Fix System

The Activity Log automatically tracks all auto-fix operations:

1. **When an auto-fix engine runs**, it logs:
   - Engine name and ID
   - Client being processed
   - Number of fixes applied
   - Duration
   - Success/failure status
   - Detailed changes (before/after values)

2. **View from Activity Log page** to see:
   - Which engines ran
   - When they ran
   - What they changed
   - Any errors that occurred

3. **Troubleshoot issues**:
   - Filter by `status=failed` to see what went wrong
   - View error details and stack traces
   - Check timing patterns

## Best Practices

### 1. **Regular Monitoring**
- Check the Activity Log daily
- Review failed activities immediately
- Monitor success rates

### 2. **Issue Resolution**
- When you see failed activities, click for details
- Read the error message
- Check if it's a temporary issue (API rate limit) or permanent
- Address systematic failures

### 3. **Performance Tracking**
- Monitor duration of operations
- Identify slow operations
- Optimize based on patterns

### 4. **Audit Trail**
- Use search to find specific operations
- Filter by client to see their history
- Export data if needed for compliance

## Data Retention

- **Default retention**: 5,000 most recent activities
- **Cleanup**: Can manually clean up old activities (90+ days)
- **API endpoint**: `DELETE /api/activity-log/cleanup?days=90`

## Troubleshooting

### No Activities Showing
- Check time range filter (expand to "All Time")
- Verify backend server is running
- Check browser console for errors

### Activities Not Being Logged
- Ensure activity logger is imported and called
- Check database permissions
- Verify `data/activity-log.json` file exists

### Performance Issues
- Reduce time range (use 24h instead of "All Time")
- Clear old activities using cleanup API
- Use more specific filters

## Technical Details

### Storage
- Activities stored in: `data/activity-log.json`
- JSON file database for simplicity
- Can be migrated to SQL database if needed

### Performance
- Indexed by timestamp for fast queries
- Automatic cleanup keeps data manageable
- Pagination support (50 items per page)

### Security
- No sensitive data logged by default
- Error stack traces for debugging
- Can be extended with user authentication tracking

## Next Steps

- **Set up automated monitoring**: Create alerts for failed activities
- **Integrate with notifications**: Get notified of critical errors
- **Export capabilities**: Add CSV/JSON export for compliance
- **Dashboard widgets**: Add activity summary to main dashboard

---

## Quick Reference

**Access**: Automation > Activity Log

**Filters**:
- Search: Keywords in action/description
- Type: autofix, api_call, user_action, system_event, error
- Status: success, failed, warning, in_progress
- Time: 1h, 24h, 7d, 30d, all

**Key Metrics**:
- Total, Success, Failed, Items Processed

**Details View**: Click 📄 icon for full information

**Refresh**: Click refresh button to update data

---

For questions or issues, refer to the main documentation or contact support.
