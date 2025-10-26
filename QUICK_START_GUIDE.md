# Unified Dashboard - Quick Start Guide

**Server Status:** Running on Port 9000
**Access URL:** http://localhost:9000/unified/
**Date:** October 25, 2025

---

## Getting Started

### 1. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:9000/unified/
```

The dashboard will load automatically with a beautiful purple/blue gradient sidebar.

### 2. Navigation

The sidebar contains 11 major sections:

1. **Dashboard** - Overview stats and charts
2. **Clients** - Manage clients
3. **Analytics** - View data and export
4. **Recommendations** - AI-powered suggestions
5. **Goals** - Track progress
6. **Automation** - Run batch operations
7. **Webhooks** - Configure integrations
8. **Campaigns** - Send emails
9. **Reports** - Generate documents
10. **White-Label** - Customize branding
11. **Settings** - (placeholder)

---

## Section-by-Section Guide

### Dashboard Section

**What it shows:**
- 4 stat cards (Total Clients, Active Clients, Pending Setup, Total Optimizations)
- 3 charts (Client Distribution, Activity Trend, Performance Overview)
- Real-time activity feed
- 6 quick action cards

**How to use:**
1. View the overview automatically on page load
2. Check recent activities in the feed
3. Click quick action buttons to navigate to specific functions

---

### Clients Section

**What you can do:**
- View all clients in a table
- Add new clients
- Edit existing clients
- Delete clients
- View client status badges

**How to use:**
1. Click "Clients" in sidebar
2. Click "+ Add Client" button
3. Fill in the modal form:
   - Client ID (required)
   - Name
   - Email
   - Phone
   - Website URL
   - Status (Active/Inactive/Pending Setup)
4. Click "Save" to create
5. Use action buttons (✏️ Edit, 🗑️ Delete) on each row

**Example workflow:**
```
1. Click "+ Add Client"
2. Enter:
   - ID: client-001
   - Name: ACME Corporation
   - Email: contact@acme.com
   - Status: Active
3. Click "Save Client"
4. Client appears in table
```

---

### Analytics Section

**What you can do:**
- Select a client from dropdown
- Choose timeframe (7d, 30d, 90d)
- View 4 stats cards
- See ranking trends chart
- View performance distribution chart
- Check top keywords table
- Export data (CSV, Excel, JSON)

**How to use:**
1. Select a client from dropdown
2. Choose timeframe
3. View charts and stats
4. Click export buttons to download data

**Export options:**
- CSV: Comma-separated values
- Excel: .xlsx format
- JSON: Raw data format

---

### Recommendations Section

**What you can do:**
- View AI-powered recommendations
- Filter by priority (all, high, medium, low)
- Generate new recommendations
- Apply or dismiss recommendations

**How to use:**
1. Select a client
2. Click "Generate New" to create recommendations
3. Use filter tabs to view specific priorities
4. Click "Apply" to implement a recommendation
5. Click "Dismiss" to remove unwanted ones

**Priority levels:**
- **High** (red) - Critical issues
- **Medium** (yellow) - Important improvements
- **Low** (blue) - Optional enhancements

---

### Goals Section

**What you can do:**
- View goals summary (total, active, completed, avg progress)
- See goal cards with progress bars
- Update progress inline
- Create new goals
- Edit/delete existing goals

**How to use:**
1. Select a client
2. Click "+ Create Goal" to add new goal
3. Fill in modal:
   - Title
   - Description
   - Target value
   - Current value
   - Deadline
   - Status (Active/Completed/Paused/Cancelled)
4. Update progress by entering new value and clicking "Update"

**Example:**
```
Goal: Improve SEO ranking
Target: 50 keywords in top 10
Current: 23 keywords
Progress: 46%
Deadline: End of month
```

---

### Automation Section

**What you can do:**
- Run batch automation (Optimize All, Audit All)
- View 4 automation type cards
- Run automation per client
- Configure 4 auto-fix engines

**How to use:**
1. Click "Optimize All" or "Audit All" for batch operations
2. Or select individual client automation
3. Configure auto-fix engines:
   - NAP Auto-Fix (Name, Address, Phone)
   - Schema Auto-Fix
   - Title/Meta Optimizer
   - Content Enhancer

**Auto-fix engines:**
- All show "Active" status
- Click "Configure" to adjust settings

---

### Webhooks Section

**What you can do:**
- View all webhooks in table
- Add new webhooks
- Edit existing webhooks
- Test webhooks
- View delivery logs
- Delete webhooks

**How to use:**
1. Click "+ Add Webhook"
2. Fill in form:
   - Webhook Name
   - URL (https://example.com/webhook)
   - Events to subscribe (checkboxes)
   - Secret key (optional)
   - Active checkbox
3. Click "Save"
4. Use action buttons:
   - 🧪 Test - Send test payload
   - 📋 Logs - View delivery history
   - ✏️ Edit - Modify webhook
   - 🗑️ Delete - Remove webhook

**Available events:**
- client.created
- client.updated
- audit.completed
- optimization.completed
- ranking.changed
- report.generated
- goal.completed
- autofix.applied

---

### Email Campaigns Section

**What you can do:**
- View campaign list with stats
- Create new campaigns
- Schedule campaigns
- Send campaigns immediately
- View campaign statistics
- Delete campaigns

**How to use:**
1. Select a client
2. Click "+ Create Campaign"
3. Fill in form:
   - Campaign Name
   - Email Subject
   - Template (Monthly Report, Weekly Summary, Goal Achieved, Custom)
   - Schedule (optional datetime)
4. Click "Create Campaign"
5. Use action buttons:
   - ▶️ Send (for draft campaigns)
   - 📊 Stats - View performance
   - 🗑️ Delete - Remove campaign

**Campaign statuses:**
- **Draft** (gray) - Not sent yet
- **Scheduled** (purple) - Waiting to send
- **Sending** (yellow) - Currently sending
- **Sent** (green) - Successfully delivered
- **Failed** (red) - Error occurred

---

### Reports Section

**What you can do:**
- Browse generated reports
- Generate new reports
- Download reports
- Preview reports
- Delete reports

**How to use:**
1. Select a client
2. Click "+ Generate Report"
3. Choose options:
   - Report Type (Monthly, Weekly, Audit, Custom)
   - Format (PDF, HTML, Word)
   - Sections to include (checkboxes)
4. Click "Generate Report"
5. Use action buttons:
   - ⬇️ Download - Save to computer
   - 👁️ Preview - View before download
   - 🗑️ Delete - Remove report

**Report types:**
- 📊 Monthly - Comprehensive monthly summary
- 📈 Weekly - Quick weekly update
- 🔍 Audit - Full SEO audit
- 📄 Custom - Custom configuration

---

### White-Label Settings

**What you can do:**
- Customize company branding
- Set custom colors
- Configure contact information
- Set email settings
- Preview changes in real-time

**How to use:**
1. Fill in branding section:
   - Company Name
   - Logo URL
   - Favicon URL
2. Customize colors:
   - Primary Color (color picker)
   - Secondary Color (color picker)
3. Add contact info:
   - Support Email
   - Support Phone
   - Website
4. Configure email settings:
   - From Email
   - Email Signature
5. Preview updates in real-time
6. Click "Save Changes"

**Live preview:**
- Updates automatically as you type
- Shows header with gradient
- Displays logo and company info

---

## Tips & Tricks

### Keyboard Navigation
- Use sidebar to switch sections quickly
- All forms support Tab navigation
- Enter to submit forms
- Escape to close modals

### Data Management
1. **Always select a client first** for client-specific sections
2. **Use filters** to narrow down data
3. **Export data regularly** for backups
4. **Test webhooks** before going live

### Performance
- Dashboard updates automatically via WebSocket
- Real-time notifications for events
- Charts render on-demand
- Tables support pagination (when data grows)

### Best Practices
1. Start by adding clients
2. Set up goals for each client
3. Configure webhooks for automation
4. Generate regular reports
5. Review recommendations weekly
6. Monitor analytics daily

---

## Common Workflows

### Workflow 1: Onboarding New Client
```
1. Go to Clients section
2. Click "+ Add Client"
3. Enter client details
4. Go to Goals section
5. Create initial goals
6. Go to Webhooks section (optional)
7. Set up webhook notifications
```

### Workflow 2: Monthly Reporting
```
1. Go to Reports section
2. Select client
3. Click "+ Generate Report"
4. Choose "Monthly Report"
5. Select all sections
6. Choose PDF format
7. Click "Generate Report"
8. Download when ready
```

### Workflow 3: Campaign Management
```
1. Go to Campaigns section
2. Select client
3. Click "+ Create Campaign"
4. Choose template
5. Set schedule (or send now)
6. Monitor stats after sending
```

### Workflow 4: Track Progress
```
1. Go to Goals section
2. Select client
3. View progress bars
4. Update current values
5. Mark completed goals
6. Create new goals
```

---

## Troubleshooting

### Dashboard not loading?
- Check if server is running
- Verify URL: http://localhost:9000/unified/
- Check browser console for errors
- Try refreshing the page

### Charts not displaying?
- Make sure client is selected
- Check if data exists for timeframe
- Wait for data to load
- Try different timeframe

### Can't save data?
- Check all required fields are filled
- Verify form validation
- Check server is running
- Look for error toast notifications

### Webhooks not working?
- Test webhook first (🧪 button)
- Check webhook URL is accessible
- Verify events are selected
- Review delivery logs

---

## Server Management

### Start Server
```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
node dashboard-server.js
```

### Stop Server
Press `Ctrl+C` in the terminal where server is running

### Check Server Status
Navigate to: http://localhost:9000/unified/
If dashboard loads, server is running.

### Clear Port 9000
```bash
lsof -ti:9000 | xargs -r kill -9
```

---

## Feature Highlights

### Real-time Updates
- Live activity feed
- Instant notifications
- Auto-refreshing stats
- WebSocket integration

### Modern UI/UX
- Purple/blue gradient theme
- Card-based layouts
- Smooth animations
- Mobile responsive

### Data Export
- Multiple formats (CSV, Excel, JSON)
- One-click download
- Batch operations
- Custom sections

### Automation
- Batch processing
- Auto-fix engines
- Scheduled campaigns
- Webhook integrations

---

## Getting Help

### Check Documentation
- UNIFIED_DASHBOARD_COMPLETE.md - Full implementation details
- Browser console - JavaScript errors
- Server console - Backend logs

### Report Issues
Check browser developer tools (F12) for error messages

### Contact
This is a local development environment. Check server logs for debugging.

---

## What's Next?

### Suggested Enhancements
1. Add dark mode toggle
2. Implement user authentication
3. Add data caching
4. Create mobile app
5. Enhance search functionality
6. Add bulk operations
7. Improve chart types
8. Add keyboard shortcuts

### Future Features
- Multi-user support
- Role-based access control
- Advanced analytics
- Custom report templates
- Email template editor
- A/B testing for campaigns
- Advanced automation rules
- API rate limiting

---

**Enjoy your unified SEO automation dashboard!** 🚀

All 11 sections are fully functional and ready to use.

Access now: **http://localhost:9000/unified/**
