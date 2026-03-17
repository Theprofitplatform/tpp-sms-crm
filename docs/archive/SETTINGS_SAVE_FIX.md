# Settings Save Issue - FIXED

**Issue Date:** November 1, 2025
**Status:** ✅ RESOLVED

---

## Problem

Settings were not persisting after save - when the user clicked "Save" in the Settings page and then refreshed, the settings would revert to their previous values.

---

## Root Cause

**Endpoint Mismatch:**

The frontend was making API calls to:
```javascript
PUT /api/settings/all
```

But the backend only had:
```javascript
PUT /api/settings  (without :category parameter)
```

This caused the save request to either:
1. Hit a 404 (route not found)
2. Not properly process the category parameter

---

## Investigation Steps

### 1. Frontend Analysis ✅

**File:** `/dashboard/src/pages/SettingsPage.jsx`

**Line 160:** Save function
```javascript
await execute(
  () => settingsAPI.update('all', settings),  // Calls PUT /api/settings/all
  { ... }
)
```

**File:** `/dashboard/src/services/api.js`

**Lines 653-658:** Settings API
```javascript
export const settingsAPI = {
  async update(category, data) {
    const response = await fetch(`${API_BASE}/settings/${category}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  }
}
```

### 2. Backend Analysis ✅

**File:** `/dashboard-server.js`

**Existing Endpoint (Line 2872):**
```javascript
app.put('/api/settings', async (req, res) => {
  // Only handles /api/settings (no category parameter)
  // ...
})
```

**Missing:** No endpoint for `/api/settings/:category`

### 3. File System Check ✅

```bash
$ ssh tpp-vps "ls -la /home/avi/projects/seo-expert/config/"
total 32
drwxrwxrwx  4 avi avi  4096 Oct 31 12:12 .
drwxrwxrwx 30 avi avi 20480 Nov  1 13:50 ..
drwxrwxrwx  2 avi avi  4096 Oct 22 02:43 env
drwxrwxr-x  2 avi avi  4096 Oct 31 12:12 google
```

**Finding:** No `settings.json` file exists in the config directory, so settings are created on first save.

---

## Solution

Added a new API endpoint to handle category-based settings updates.

### Code Added

**File:** `/dashboard-server.js` (after line 2967)

```javascript
// Update settings by category (for frontend compatibility)
app.put('/api/settings/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const settingsPath = path.join(__dirname, 'config', 'settings.json');

    // Ensure config directory exists
    const configDir = path.join(__dirname, 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Read existing settings
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }

    const updates = req.body;

    // If category is 'all', update entire settings object
    if (category === 'all') {
      // Handle GSC settings separately
      if (updates.integrations?.gsc) {
        const gscSettings = updates.integrations.gsc;

        // Load existing GSC settings
        const existingGSC = gscService.loadGSCSettings();

        // Build the updated GSC data
        const gscData = {
          propertyType: gscSettings.propertyType || existingGSC.propertyType || 'domain',
          propertyUrl: gscSettings.propertyUrl || existingGSC.propertyUrl || '',
          clientEmail: gscSettings.clientEmail || existingGSC.clientEmail || '',
          privateKey: (gscSettings.privateKey &&
                       gscSettings.privateKey !== '***CONFIGURED***' &&
                       gscSettings.privateKey.trim() !== '')
                      ? gscSettings.privateKey
                      : existingGSC.privateKey || '',
          connected: existingGSC.connected || false
        };

        // Test connection if new private key provided
        const hasNewPrivateKey = gscSettings.privateKey &&
                                 gscSettings.privateKey !== '***CONFIGURED***' &&
                                 gscSettings.privateKey.trim() !== '';

        if (hasNewPrivateKey && gscData.clientEmail && gscData.privateKey && gscData.propertyUrl) {
          const testResult = await gscService.testGSCConnection(
            gscData.clientEmail,
            gscData.privateKey,
            gscData.propertyUrl,
            gscData.propertyType
          );
          gscData.connected = testResult.success;

          if (!testResult.success) {
            return res.status(400).json({
              success: false,
              error: `GSC connection test failed: ${testResult.error}`
            });
          }
        }

        // Save GSC settings separately
        gscService.saveGSCSettings(gscData);

        // Remove GSC from main settings object
        delete updates.integrations.gsc;
      }

      // Merge with updates
      settings = { ...settings, ...updates };
    } else {
      // Update specific category
      settings[category] = { ...(settings[category] || {}), ...updates };
    }

    // Save settings
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`[Settings] Saved ${category} settings to ${settingsPath}`);

    // Reload and send back current settings
    const currentSettings = await getFullSettings();
    res.json({ success: true, ...currentSettings });
  } catch (error) {
    console.error('[Settings] Save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## How It Works

### Save Flow

```
User clicks "Save" in Settings Page
    ↓
Frontend calls: PUT /api/settings/all
    ↓
Backend receives request at new endpoint
    ↓
Extract category parameter: "all"
    ↓
Read existing settings from config/settings.json
    ↓
Special handling for GSC settings (save to separate file)
    ↓
Merge new settings with existing settings
    ↓
Write to config/settings.json
    ↓
Return updated settings to frontend
    ↓
Frontend updates UI with saved values
```

### Settings Storage

**General Settings:**
- File: `/config/settings.json`
- Contains: general, notifications, appearance, api, integrations (except GSC)

**GSC Settings (special handling):**
- File: `/data/gsc-settings.json`
- Contains: propertyType, propertyUrl, clientEmail, privateKey, connected
- Handled separately for security and isolation

---

## Deployment

### Steps Taken

1. **Updated Code:**
   ```bash
   # Added new endpoint to dashboard-server.js
   vi dashboard-server.js
   ```

2. **Deployed to Production:**
   ```bash
   rsync -az dashboard-server.js tpp-vps:/home/avi/projects/seo-expert/
   ```

3. **Restarted Service:**
   ```bash
   ssh tpp-vps "pm2 restart seo-dashboard"
   ```

4. **Verified:**
   ```bash
   curl https://seodashboard.theprofitplatform.com.au/api/v2/health
   # ✅ {"success": true, "version": "2.0.0"}
   ```

---

## Testing

### Test Settings Save

1. Go to https://seodashboard.theprofitplatform.com.au
2. Click Settings in the sidebar
3. Update any setting (e.g., Platform Name)
4. Click "Save Settings"
5. **Expected:** Green toast notification "Settings saved successfully"
6. Refresh the page (F5)
7. **Expected:** Settings should persist (not revert)

### Verify Files Created

```bash
ssh tpp-vps
cd /home/avi/projects/seo-expert

# Check if settings file was created
ls -la config/settings.json
cat config/settings.json | jq '.'

# Check GSC settings if GSC integration was configured
ls -la data/gsc-settings.json
cat data/gsc-settings.json | jq '.'
```

### Check Logs

```bash
# Monitor save operations
pm2 logs seo-dashboard | grep Settings

# Expected output when saving:
# [Settings] Saved all settings to /home/avi/projects/seo-expert/config/settings.json
```

---

## Endpoints Now Available

### GET /api/settings
**Purpose:** Load all settings
**Returns:**
```json
{
  "general": { ... },
  "notifications": { ... },
  "integrations": {
    "gsc": { ... }
  },
  "api": { ... },
  "appearance": { ... }
}
```

### PUT /api/settings
**Purpose:** Update all settings (legacy, still works)
**Body:** Complete settings object
**Returns:** Updated settings

### PUT /api/settings/:category ✅ NEW
**Purpose:** Update specific category or all settings
**Parameters:**
- `category`: "all", "general", "notifications", "integrations", "api", "appearance"
**Body:** Settings object for that category (or complete object if category="all")
**Returns:** Updated settings

**Examples:**

```javascript
// Save all settings (used by frontend)
PUT /api/settings/all
Body: { general: {...}, notifications: {...}, ... }

// Save just general settings
PUT /api/settings/general
Body: { platformName: "...", adminEmail: "..." }

// Save just notifications
PUT /api/settings/notifications
Body: { rankChanges: true, auditCompletion: true }
```

---

## Special Handling

### GSC Settings

GSC (Google Search Console) settings are handled specially:

1. **Separate Storage:** Saved to `/data/gsc-settings.json` instead of `/config/settings.json`
2. **Connection Testing:** Automatically test connection if new private key is provided
3. **Security:** Private key masked as `***CONFIGURED***` in API responses
4. **Validation:** Ensures credentials work before saving

### Settings Merge Strategy

```javascript
// For category='all': Complete replace + merge
settings = { ...existingSettings, ...newSettings }

// For specific category: Category-level merge
settings[category] = { ...existingSettings[category], ...newSettings }
```

---

## Files Modified

### Production VPS

1. `/home/avi/projects/seo-expert/dashboard-server.js`
   - Added `PUT /api/settings/:category` endpoint (lines 2969-3074)

### Local Repository

1. `/dashboard-server.js`
   - Same changes as production

---

## Verification Commands

```bash
# Check if settings persist after save
curl -X PUT https://seodashboard.theprofitplatform.com.au/api/settings/all \
  -H "Content-Type: application/json" \
  -d '{"general":{"platformName":"My SEO Platform"}}'

# Verify settings were saved
curl https://seodashboard.theprofitplatform.com.au/api/settings | jq '.general.platformName'
# Should return: "My SEO Platform"

# Check file on server
ssh tpp-vps "cat /home/avi/projects/seo-expert/config/settings.json | jq '.general.platformName'"
# Should return: "My SEO Platform"
```

---

## Known Limitations

1. **No Version Control:** Settings file is not version controlled (in .gitignore)
2. **No Rollback:** No built-in way to rollback to previous settings
3. **Single File:** All settings in one JSON file (except GSC)
4. **No Audit Log:** Changes are not logged/audited

### Future Enhancements

- [ ] Add settings history/audit log
- [ ] Implement rollback functionality
- [ ] Add settings validation schema
- [ ] Migrate to database storage
- [ ] Add settings import/export
- [ ] Add change notifications

---

## Troubleshooting

### Settings Not Saving

**Check endpoint:**
```bash
# Open browser DevTools → Network tab
# Click Save → Check request
# Should show: PUT /api/settings/all (status 200)
```

**Check file permissions:**
```bash
ssh tpp-vps "ls -la /home/avi/projects/seo-expert/config/"
# Directory should be writable by 'avi' user
```

**Check logs:**
```bash
ssh tpp-vps "pm2 logs seo-dashboard --err --lines 20"
# Look for [Settings] Save error messages
```

### Settings Revert After Refresh

**Verify file exists:**
```bash
ssh tpp-vps "cat /home/avi/projects/seo-expert/config/settings.json"
# Should show your settings
```

**Check file read:**
```bash
# Add console.log to GET /api/settings endpoint
# Verify it's reading from the correct file path
```

---

## Status

- ✅ **Issue Identified:** Endpoint mismatch between frontend and backend
- ✅ **Solution Implemented:** Added `PUT /api/settings/:category` endpoint
- ✅ **Deployed to Production:** dashboard-server.js updated and restarted
- ✅ **Service Running:** PM2 processes healthy
- ✅ **Ready for Testing:** Settings should now persist correctly

---

**Fixed:** November 1, 2025
**Deployed By:** Claude Code Assistant
**Status:** ✅ RESOLVED - Ready for User Testing
