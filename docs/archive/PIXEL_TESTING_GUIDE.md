# Pixel Management Testing Guide

**Version:** Phase 3 Complete
**Date:** November 2, 2025

---

## Pre-Testing Setup

### 1. Ensure Phase 2 Backend is Deployed

Before testing the UI, ensure Phase 2 backend components are deployed:

```bash
# Run database migration
node scripts/migrate-pixel-enhancements.js

# Verify tables were created
sqlite3 data/seo-automation.db "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('seo_issues', 'pixel_analytics', 'pixel_health');"
```

Expected output:
```
seo_issues
pixel_analytics
pixel_health
```

### 2. Start the Services

```bash
# Start the dashboard (if not already running)
pm2 restart seo-dashboard

# Verify services are running
pm2 status
```

### 3. Create Test Data (Optional)

If you don't have existing pixels with data, you can create test data:

```bash
# Generate a test pixel
curl -X POST http://localhost:9000/api/v2/pixel/generate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "YOUR_CLIENT_ID",
    "domain": "test.example.com",
    "deploymentType": "header",
    "features": ["meta-tracking", "performance", "schema"]
  }'
```

---

## Testing Checklist

### Phase 1: Basic Navigation

- [ ] **Open Dashboard**
  - Navigate to: `http://localhost:9000`
  - Login if required
  - Verify dashboard loads without errors

- [ ] **Navigate to Pixel Management**
  - Click on "Pixel Management" in sidebar (under Otto SEO)
  - Verify page loads
  - Check browser console for errors (F12 → Console)

- [ ] **Select Client**
  - Select a client from dropdown
  - Verify pixels load for that client
  - Check that stats cards show correct numbers

---

### Phase 2: Overview Tab

- [ ] **Stats Cards**
  - Verify "Active Pixels" count is correct
  - Verify "Pages Tracked" shows total
  - Verify "Online Now" shows active pixels
  - Verify "Avg SEO Score" calculates correctly

- [ ] **Deployed Pixels List**
  - Verify all pixels for client are displayed
  - Check that status badges show correct state (Active/Inactive/Offline)
  - Verify deployment type, pages tracked, and last seen are correct
  - Verify features are listed correctly

- [ ] **Pixel Selection**
  - Click on a pixel in the list
  - Verify blue ring appears around selected pixel
  - Verify pixel selector dropdown updates
  - Try selecting different pixels

- [ ] **Pixel Actions**
  - Click "View Code" button → Modal should open with pixel code
  - Click "Copy Code" → Code should copy to clipboard
  - Close modal
  - Try "Deactivate" button (if pixel is active)
  - Try "Delete" button (careful - this deletes data!)

---

### Phase 3: Issues Tab

#### Summary Cards

- [ ] **Overview Cards**
  - Verify "Total Issues" count is correct
  - Verify "Critical Issues" card shows correct count
  - Verify "High Issues" card shows correct count
  - Verify "Medium + Low" card shows correct count

- [ ] **Severity Breakdown**
  - Verify progress bars display correctly
  - Verify percentages add up to 100%
  - Click on a severity (e.g., "Critical")
  - Verify issues list filters to show only critical issues

- [ ] **Category Distribution**
  - Verify all categories are listed
  - Verify issue counts per category
  - Click on a category (e.g., "Meta Tags")
  - Verify issues list filters to that category

- [ ] **Resolution Status**
  - Verify progress bar shows resolved/total ratio
  - Verify percentage is calculated correctly

#### Issue Tracker

- [ ] **Issue List**
  - Verify issues load correctly
  - Verify severity badges show correct colors
  - Verify category labels are displayed
  - Verify estimated fix times are shown

- [ ] **Filtering**
  - Test severity filter dropdown (ALL/CRITICAL/HIGH/MEDIUM/LOW)
  - Test category filter dropdown
  - Test search box (type partial text)
  - Test "Clear filters" button
  - Verify filtered count updates correctly

- [ ] **Issue Details**
  - Click "View Fix" on an issue
  - Verify recommendation displays
  - Verify fix code is shown
  - Click "Copy Code" → Verify code copies to clipboard
  - Verify "Copied!" message appears briefly
  - Click "Learn more" link → Opens in new tab

- [ ] **Issue Resolution**
  - Click "Resolve" on an issue
  - Verify issue is removed from list
  - Verify summary cards update
  - Refresh page → Issue should stay resolved

- [ ] **No Issues State**
  - If there are no issues (or filter to show none):
  - Verify "No Issues Found" message displays
  - Verify green checkmark icon shows

---

### Phase 4: Analytics Tab

#### Summary Cards

- [ ] **Average SEO Score**
  - Verify score displays (0-100)
  - Verify trend indicator shows up/down arrow
  - Verify trend percentage is correct

- [ ] **Page Views**
  - Verify total page views for selected period
  - Verify count is accurate

- [ ] **Average LCP**
  - Verify LCP displays in seconds
  - Verify trend indicator (lower is better - inverse)
  - Verify target (<2.5s) is shown

- [ ] **Total Issues**
  - Verify total issues detected in period
  - Verify trend indicator (lower is better - inverse)

#### Time Period Selector

- [ ] **Change Time Period**
  - Click time period dropdown
  - Select "7 Days" → Verify data updates
  - Select "14 Days" → Verify data updates
  - Select "30 Days" → Verify data updates
  - Select "90 Days" → Verify data updates
  - Verify charts re-render with new data

#### Charts

- [ ] **SEO Score Trend Chart**
  - Verify line chart renders
  - Verify all data points are visible
  - Verify latest value is displayed
  - Hover over points (if interactive)

- [ ] **Core Web Vitals Charts**
  - Verify LCP chart shows (ms → seconds)
  - Verify FID chart shows (ms)
  - Verify CLS chart shows (decimal)
  - Verify all three charts render correctly

- [ ] **Issue Breakdown Chart**
  - Verify stacked bar chart renders
  - Verify colors match severity (red/orange/yellow/blue)
  - Verify dates are labeled correctly
  - Verify issue counts are displayed on bars
  - Verify legend shows all severities

#### Data Table

- [ ] **Table Display**
  - Verify all columns show correct data
  - Verify dates are formatted properly
  - Verify SEO scores have color coding (green/yellow/red)
  - Verify LCP/FID/CLS values display correctly
  - Verify issue breakdown shows (Critical/High/Medium/Low)

#### Export Functionality

- [ ] **Export JSON**
  - Click "Export" → Hover to see dropdown
  - Click "Export as JSON"
  - Verify file downloads
  - Open file → Verify JSON is valid
  - Verify data matches displayed data

- [ ] **Export CSV**
  - Click "Export" → Hover to see dropdown
  - Click "Export as CSV"
  - Verify file downloads
  - Open in Excel/Sheets → Verify data is readable
  - Verify headers are correct

- [ ] **No Data State**
  - If no analytics data exists:
  - Verify "No Analytics Data" message displays
  - Verify activity icon shows

---

### Phase 5: Health Tab

#### Status Display

- [ ] **Status Badge**
  - Verify status shows (UP/DOWN/DEGRADED/UNKNOWN)
  - Verify correct color (green/red/yellow/gray)
  - Verify correct icon displays

- [ ] **Last Ping**
  - Verify last ping timestamp is displayed
  - Verify relative time is correct (e.g., "5m ago")
  - Verify "Just now" shows for recent pings

- [ ] **Refresh Button**
  - Click refresh button
  - Verify spinner animation appears
  - Verify data updates after refresh

#### Uptime Statistics

- [ ] **24 Hours Uptime**
  - Verify percentage displays (0-100%)
  - Verify status label (Excellent/Good/Fair/Poor)
  - Verify progress bar renders correctly
  - Verify color matches status

- [ ] **7 Days Uptime**
  - Verify percentage displays
  - Verify status label
  - Verify progress bar renders correctly

- [ ] **30 Days Uptime**
  - Verify percentage displays
  - Verify status label
  - Verify progress bar renders correctly

#### Health History Chart

- [ ] **Chart Display**
  - Verify hourly bars render for 24 hours
  - Verify hour labels (0-23) display
  - Verify bar heights reflect uptime percentage
  - Verify colors (green/yellow/red) match uptime
  - Verify legend shows (Up/Degraded/Down)

- [ ] **Statistics**
  - Verify "Total Checks" count is correct
  - Verify "Average Uptime" percentage is correct

---

### Phase 6: Pages Tab

- [ ] **Pages Table**
  - Verify all tracked pages are listed
  - Verify page titles display
  - Verify URLs are clickable (open in new tab)
  - Verify SEO scores show with color coding
  - Verify issues are listed (with icons)
  - Verify "Last Tracked" dates are correct

- [ ] **No Pages State**
  - If no pages tracked:
  - Verify "No pages tracked yet" message displays

---

### Phase 7: Pixel Creation Flow

- [ ] **Create New Pixel**
  - Click "Generate New Pixel" button
  - Modal opens
  - Enter domain name
  - Select deployment type
  - Select features
  - Toggle debug mode
  - Click "Generate Pixel"
  - Verify loading state shows
  - Verify success message appears
  - Verify pixel code is displayed
  - Verify installation instructions show
  - Copy code and close modal
  - Verify new pixel appears in list

---

### Phase 8: Error Handling

- [ ] **No Pixel Selected**
  - Go to Issues/Analytics/Health tab without selecting pixel
  - Verify "No Pixel Selected" message displays
  - Verify helpful text shows

- [ ] **API Errors**
  - Stop the backend server (for testing)
  - Try to load issues/analytics/health
  - Verify error messages display (not crashes)
  - Verify loading states end properly
  - Start backend again

- [ ] **Invalid Data**
  - Test with pixel that has no data
  - Verify empty states display correctly
  - Verify no JavaScript errors in console

---

### Phase 9: Responsive Design

#### Desktop (1920x1080)

- [ ] All tabs display correctly
- [ ] Charts are readable
- [ ] Tables show all columns
- [ ] No horizontal scrolling

#### Laptop (1366x768)

- [ ] Layout adjusts properly
- [ ] Tabs remain visible
- [ ] Cards stack if needed
- [ ] Charts remain readable

#### Tablet (768x1024)

- [ ] Grid layouts stack to 1-2 columns
- [ ] Navigation remains usable
- [ ] Charts resize appropriately
- [ ] Touch targets are large enough

#### Mobile (375x667)

- [ ] All content is readable
- [ ] Tabs are accessible (may scroll)
- [ ] Forms are usable
- [ ] No text cutoff

---

### Phase 10: Performance

- [ ] **Initial Load**
  - Page loads in < 3 seconds
  - No flash of unstyled content
  - Loading states display smoothly

- [ ] **Tab Switching**
  - Tabs switch instantly
  - No lag when changing tabs
  - Data loads smoothly

- [ ] **Filtering**
  - Filters apply instantly (client-side)
  - No flickering
  - Smooth animations

- [ ] **Chart Rendering**
  - Charts render in < 1 second
  - No layout shifts
  - Responsive to window resize

---

## Known Issues & Limitations

### Expected Behavior

1. **Charts are basic**: SVG-based charts without zoom/pan functionality
2. **No real-time updates**: Manual refresh required to see new data
3. **No undo for resolution**: Once resolved, must be manually re-added
4. **CSV export naming**: Fixed filename pattern (not customizable)

### Browser Compatibility

Tested and supported:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Not supported:
- ❌ Internet Explorer (any version)
- ❌ Older mobile browsers

---

## Troubleshooting

### Issue: Components not rendering

**Solution:**
```bash
# Clear build cache
cd dashboard
rm -rf dist node_modules/.vite
npm run build
pm2 restart seo-dashboard
```

### Issue: API endpoints returning 404

**Solution:**
```bash
# Verify Phase 2 routes are mounted
# Check src/api/v2/index.js includes:
# import pixelEnhancementsRoutes from './pixel-enhancements-routes.js';
# app.use('/api/v2', pixelEnhancementsRoutes);

# Restart backend
pm2 restart seo-dashboard
```

### Issue: No data in analytics/issues

**Solution:**
```bash
# Verify database migration ran
sqlite3 data/seo-automation.db "SELECT COUNT(*) FROM seo_issues;"
sqlite3 data/seo-automation.db "SELECT COUNT(*) FROM pixel_analytics;"

# If tables don't exist, run migration
node scripts/migrate-pixel-enhancements.js
```

### Issue: Charts not displaying

**Solution:**
- Check browser console for errors
- Verify data is being fetched (Network tab)
- Ensure analytics data exists for selected pixel
- Try changing time period

---

## Reporting Issues

If you find bugs or issues during testing:

1. **Check browser console** (F12 → Console) for errors
2. **Note the exact steps** to reproduce
3. **Take screenshots** if visual issue
4. **Check Network tab** (F12 → Network) for failed API calls
5. **Document the error message** if any

### Issue Template

```markdown
**Component:** [IssueTracker / AnalyticsDashboard / etc.]
**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**

**Actual Behavior:**

**Screenshots:**

**Console Errors:**

**Browser:** [Chrome/Firefox/Safari] [Version]
```

---

## Success Criteria

Testing is complete when:

- ✅ All 5 tabs load without errors
- ✅ All interactive elements work (buttons, filters, dropdowns)
- ✅ Charts display correctly with real data
- ✅ API calls succeed (check Network tab)
- ✅ Responsive design works on all screen sizes
- ✅ No console errors during normal use
- ✅ Export functionality works
- ✅ Issue resolution works
- ✅ Performance is acceptable (< 3s initial load)

---

## Post-Testing Actions

Once testing is complete and successful:

1. **Document any issues found** (and fixed)
2. **Update PIXEL_PHASE3_COMPLETE.md** with test results
3. **Take screenshots** of working features for documentation
4. **Plan Phase 4 enhancements** based on user feedback
5. **Monitor production** for first week after deployment

---

**Testing Complete? Next Steps:**

→ Deploy to production
→ Monitor for issues
→ Gather user feedback
→ Plan Phase 4 features
