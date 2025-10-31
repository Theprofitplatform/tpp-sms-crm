# Agent Quick Start Guide
## Get Testing in 5 Minutes! 🚀

**Purpose:** Get you from zero to testing dashboard pages as quickly as possible.

---

## ⚡ Super Quick Start

### Step 1: Choose Your Assignment (30 seconds)
Open `AGENT_ASSIGNMENTS_QUICK_REF.md` and find your agent ID:
- **Agent-1A** or **Agent-1B** → Team 1 (Core Business)
- **Agent-2A** or **Agent-2B** → Team 2 (SEO Intelligence)
- **Agent-3** → Team 3 (Marketing)
- **Agent-4** → Team 4 (Local SEO)

### Step 2: Start Servers (2 minutes)
```bash
# Terminal 1: Start Backend (Port 9000)
cd "/mnt/c/Users/abhis/projects/seo expert"
node dashboard-server.js

# Terminal 2: Start Dashboard (Port 5173)
cd "/mnt/c/Users/abhis/projects/seo expert/dashboard"
npm run dev

# Wait for: "Local: http://localhost:5173"
```

### Step 3: Open Browser (30 seconds)
- Navigate to: http://localhost:5173
- You should see the dashboard login/home page

### Step 4: Start Testing! (2 minutes)
1. Click on your assigned page in the sidebar
2. Open browser DevTools (F12)
3. Start filling out the test report template

**You're testing! 🎉**

---

## 📋 Testing Process (For Each Page)

### 1. Code Review (10 minutes)
```bash
# Open the page file in your editor
code "/mnt/c/Users/abhis/projects/seo expert/dashboard/src/pages/[YourPage].jsx"

# Read through and note:
# - What APIs are called (look for fetch() or api.get())
# - What components are used
# - What user interactions exist
```

### 2. Check Backend APIs (10 minutes)
```bash
# Search for your page's APIs in backend
cd "/mnt/c/Users/abhis/projects/seo expert"
grep -n "app.get.*control" dashboard-server.js
grep -n "app.post.*control" dashboard-server.js

# Test an API endpoint
curl http://localhost:9000/api/dashboard

# Or test in browser console:
# fetch('http://localhost:9000/api/dashboard').then(r => r.json()).then(console.log)
```

### 3. UI Testing (20 minutes)
Open http://localhost:5173 and:
- ✅ Click every button
- ✅ Fill out every form
- ✅ Open every modal
- ✅ Check the browser console for errors (F12)
- ✅ Try to break it (empty inputs, invalid data)

### 4. Document Findings (10 minutes)
```bash
# Copy the template
cp TEST_REPORT_TEMPLATE.md test-reports/TEST_REPORT_[YourPage].md

# Fill it out as you test
# Save frequently!
```

**Total Time per Page:** ~50 minutes (Simple) to 90 minutes (Complex)

---

## 🔍 What to Look For

### ✅ Good Signs
- Page loads without console errors
- Buttons trigger actions
- Data displays in tables/cards
- Loading spinners show during fetch
- Error messages are clear
- Forms validate input

### 🚨 Red Flags
- Console errors in red
- 404 Not Found in Network tab
- Buttons do nothing when clicked
- Forms submit but nothing happens
- Page crashes or freezes
- Data never loads

---

## 🛠️ Common Testing Commands

### Check if Backend API Exists
```bash
# List all API routes
grep "app\.\(get\|post\|put\|delete\)" dashboard-server.js | grep "/api/"

# Test a specific endpoint
curl http://localhost:9000/api/dashboard
curl http://localhost:9000/api/control/jobs/active
```

### Check Console for Errors
1. Press F12 in browser
2. Go to "Console" tab
3. Look for red errors
4. Copy error messages to your report

### Test Real-time Features (Socket.IO)
```javascript
// In browser console
const socket = io('http://localhost:9000')
socket.on('connect', () => console.log('Connected!'))
socket.on('job-started', (data) => console.log('Job:', data))
```

### Test API from Browser Console
```javascript
// GET request
fetch('http://localhost:9000/api/dashboard')
  .then(r => r.json())
  .then(data => console.log(data))

// POST request
fetch('http://localhost:9000/api/control/auto-fix/content/client1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ option: 'value' })
})
  .then(r => r.json())
  .then(data => console.log(data))
```

---

## 📝 Filling Out the Test Report

### Use This Order
1. **Page Information** - File path, lines of code (from earlier analysis)
2. **Code Review Summary** - List components, APIs, state management
3. **API Verification** - Test each API, mark ✅ or ❌
4. **UI Testing Results** - Document what works and what doesn't
5. **User Interaction Testing** - Test buttons, forms, modals
6. **Issues Found** - List every bug with steps to reproduce
7. **Missing APIs** - List APIs that don't exist yet
8. **Overall Assessment** - Final status and recommendations

### Markdown Quick Reference
```markdown
# Heading 1
## Heading 2
### Heading 3

- Bullet point
- [ ] Unchecked checkbox
- [x] Checked checkbox

**Bold text**
*Italic text*

`inline code`

\`\`\`javascript
// Code block
const example = 'value'
\`\`\`

[Link text](https://example.com)

![Image alt](path/to/image.png)

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
```

---

## 🐛 How to Report Bugs

### Good Bug Report Format
```markdown
### Bug: [Short descriptive title]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. Go to [Page Name]
2. Click on [Button Name]
3. Enter [Data] in [Field]
4. Click [Submit]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Console Error:**
```
[Paste exact error message]
```

**Screenshot:**
[Attach if helpful]

**Impact:**
[Who is affected? What breaks?]
```

### Bug Severity Guide
- **Critical:** Page won't load, crashes, data loss
- **High:** Major feature doesn't work, API missing
- **Medium:** Feature partially works, workaround exists
- **Low:** UI glitch, typo, minor annoyance

---

## 🔄 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ START: Pick Your Page Assignment                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ CODE REVIEW (10 min)                                        │
│ • Read page source code                                     │
│ • Identify APIs, components, state                          │
│ • Document data flow                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ API VERIFICATION (10 min)                                   │
│ • Check dashboard-server.js for routes                      │
│ • Test APIs with curl or browser                            │
│ • Document ✅ working or ❌ missing                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ UI TESTING (20 min)                                         │
│ • Navigate to page in browser                               │
│ • Click all buttons                                         │
│ • Fill all forms                                            │
│ • Check console for errors                                  │
│ • Test edge cases                                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ INTEGRATION TESTING (10 min)                                │
│ • Test with real data                                       │
│ • Test navigation between pages                             │
│ • Test Socket.IO (if applicable)                            │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ DOCUMENT FINDINGS (10 min)                                  │
│ • Fill out test report                                      │
│ • List all bugs found                                       │
│ • List missing APIs                                         │
│ • Assign final status: ✅ ⚠️ ❌                              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ NEXT PAGE or DONE                                           │
│ • Move to next assigned page                                │
│ • Or create consolidated summary                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Agent-Specific Shortcuts

### Agent Team 1 (Core Business)
```bash
# Your focus pages
cd "/mnt/c/Users/abhis/projects/seo expert/dashboard/src/pages"
ls -lh ControlCenterPage.jsx ClientDetailPage.jsx ReportsPage.jsx AutoFixPage.jsx BulkOperationsPage.jsx

# Key APIs to test
curl http://localhost:9000/api/control/jobs/active
curl http://localhost:9000/api/dashboard
curl http://localhost:9000/api/reports/instantautotraders
```

### Agent Team 2 (SEO Intelligence)
```bash
# Your focus pages
cd "/mnt/c/Users/abhis/projects/seo expert/dashboard/src/pages"
ls -lh KeywordResearchPage.jsx UnifiedKeywordsPage.jsx RecommendationsPage.jsx GoalsPage.jsx GoogleSearchConsolePage.jsx

# Key APIs to test
curl http://localhost:9000/api/v2/keywords
curl http://localhost:9000/api/control/gsc/sync/instantautotraders
```

### Agent Team 3 (Marketing)
```bash
# Your focus pages
cd "/mnt/c/Users/abhis/projects/seo expert/dashboard/src/pages"
ls -lh EmailCampaignsPage.jsx WebhooksPage.jsx WhiteLabelPage.jsx

# Key APIs to test
curl http://localhost:9000/api/control/email/campaign/instantautotraders
# Note: Webhooks API likely doesn't exist yet
```

### Agent Team 4 (Local SEO & Operations)
```bash
# Your focus pages
cd "/mnt/c/Users/abhis/projects/seo expert/dashboard/src/pages"
ls -lh LocalSEOPage.jsx WordPressManagerPage.jsx ExportBackupPage.jsx NotificationCenterPage.jsx SettingsPage.jsx APIDocumentationPage.jsx

# Key APIs to test
curl http://localhost:9000/api/control/local-seo/sync/instantautotraders
# Note: Several APIs likely don't exist yet
```

---

## 💾 Saving Your Work

### Create Your Report File
```bash
# Create test-reports directory if it doesn't exist
mkdir -p "/mnt/c/Users/abhis/projects/seo expert/test-reports"

# Copy template for your page
cp "/mnt/c/Users/abhis/projects/seo expert/TEST_REPORT_TEMPLATE.md" \
   "/mnt/c/Users/abhis/projects/seo expert/test-reports/TEST_REPORT_[YourPage].md"

# Edit the report
code "/mnt/c/Users/abhis/projects/seo expert/test-reports/TEST_REPORT_[YourPage].md"
```

### Save Frequently!
- **Every 10 minutes** - Save your progress
- **After each section** - Save before moving on
- **Before testing** - Save notes about the code
- **After testing** - Save all findings immediately

---

## 🆘 Troubleshooting

### Backend Server Won't Start
```bash
# Check if port 9000 is already in use
lsof -i :9000
# Kill the process if needed
kill -9 [PID]

# Try starting again
node dashboard-server.js
```

### Dashboard Dev Server Won't Start
```bash
cd "/mnt/c/Users/abhis/projects/seo expert/dashboard"

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try again
npm run dev
```

### Page Won't Load in Browser
1. Check browser console (F12) for errors
2. Check Network tab for failed requests
3. Check if backend server is running
4. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### API Returns 404
- The API endpoint doesn't exist yet
- Document it in "Missing APIs" section
- This is expected for many pages!

### Can't Find a File
```bash
# Search for files
find "/mnt/c/Users/abhis/projects/seo expert" -name "*[filename]*" -type f

# Search for text in files
grep -r "search text" "/mnt/c/Users/abhis/projects/seo expert/dashboard/src"
```

---

## 📊 Progress Tracking

### Mark Your Progress
Use this checklist format in your daily standup:

```markdown
## Daily Progress - [Date]

### Completed ✅
- [x] ControlCenterPage - ⚠️ Partially Working (Socket.IO works, batch ops broken)
- [x] ClientDetailPage - ✅ Fully Functional

### In Progress 🔄
- [ ] ReportsPage - 60% complete

### Blocked 🚫
- None

### Issues Found: 8
- Critical: 1
- High: 3
- Medium: 3
- Low: 1

### Missing APIs: 3
- POST /api/control/batch/test
- GET /api/reports/export
- PUT /api/client/:id/settings
```

---

## 🎓 Tips for Efficient Testing

### Do's ✅
- **Test quickly, document thoroughly** - Speed through testing, detail in reports
- **Focus on functionality first** - Does it work? Then worry about edge cases
- **Use browser DevTools** - Network tab and Console are your friends
- **Copy error messages exactly** - Don't paraphrase, paste the full error
- **Take screenshots** - Visual evidence is helpful
- **Test with real data** - Use actual client IDs from clients-config.json

### Don'ts ❌
- **Don't skip documentation** - Future you will thank present you
- **Don't ignore warnings** - They might become errors later
- **Don't test UI perfection** - Focus on functionality, not pixel-perfect design
- **Don't spend too long on one issue** - Document and move on
- **Don't forget to save** - Save your report frequently!

---

## 🚀 Ready to Go!

### Your Checklist Before Starting
- [ ] I know my Agent ID (1A, 1B, 2A, 2B, 3, or 4)
- [ ] I've read my assigned pages in AGENT_ASSIGNMENTS_QUICK_REF.md
- [ ] Backend server is running on port 9000
- [ ] Dashboard dev server is running on port 5173
- [ ] Browser is open to http://localhost:5173
- [ ] I have TEST_REPORT_TEMPLATE.md ready
- [ ] I know how to check the browser console (F12)
- [ ] I know where to save my reports (test-reports/ folder)

**If all checked, YOU'RE READY! Start with your first assigned page!** 🎉

---

## 📞 Need Help?

### Quick Questions
- Check AGENT_ASSIGNMENTS_QUICK_REF.md
- Check MULTI_AGENT_TESTING_PLAN.md
- Ask in #dashboard-testing Slack channel

### Technical Blockers
- Post in #dashboard-testing with:
  - Your agent ID
  - Page you're testing
  - Specific error or issue
  - What you've already tried

### Urgent Issues
- Tag @tech-lead in Slack
- Include: Agent ID, page, blocker description

---

**Now go forth and test! 🚀**
**May your pages be functional and your bugs be few!**
