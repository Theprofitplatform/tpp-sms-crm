# Google Search Console - Quick Start Guide 🚀

## ✅ Integration Complete!

Your dashboard now has **real Google Search Console integration**, just like SerpBear!

---

## 🎯 Quick Setup (5 Minutes)

### Step 1: Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable "Search Console API"
3. Create Service Account → Download JSON key
4. Copy two values from JSON:
   - `client_email`
   - `private_key`

### Step 2: Add to Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Settings → Users and permissions → Add user
4. Paste service account email → Grant "Full" permission

### Step 3: Configure Dashboard

1. Start dashboard: `node dashboard-server.js`
2. Open: http://localhost:9000
3. Go to: **Settings → Integrations**
4. Fill in:
   - Property URL: `example.com`
   - Service Account Email: `(from JSON)`
   - Private Key: `(from JSON - include BEGIN/END lines)`
5. Click **"Save Changes"**

### Step 4: View Real Data!

1. Navigate to **Google Search Console** page
2. See your real queries, clicks, impressions!
3. Click **"Sync Now"** to refresh anytime

---

## 📊 What You Get

- ✅ Real search queries from your site
- ✅ Actual clicks and impressions
- ✅ Click-through rates (CTR)
- ✅ Average search positions
- ✅ Manual sync anytime
- ✅ CSV export
- ✅ Secure credential storage

---

## 🔧 Features

### Settings-Based Configuration
- Configure once in Settings → Integrations
- Works across entire dashboard
- No per-page configuration needed
- **Exactly like SerpBear!**

### Real API Integration
- Connects to Google Search Console API
- Fetches your actual data
- Uses service account authentication
- Supports domain and URL properties

### Smart Fallback
- Shows mock data if not configured
- Clear indication of configuration status
- Easy to see when credentials needed

---

## 🛠️ Troubleshooting

### "No data available"
- Wait 48-72 hours after adding site to GSC
- Verify service account added in GSC
- Check property URL matches exactly

### "Connection test failed"
- Verify API is enabled in Google Cloud
- Check service account has GSC permissions
- Ensure private key includes BEGIN/END lines
- Copy credentials directly from JSON file

### Still stuck?
Check `GSC_INTEGRATION_COMPLETE.md` for detailed troubleshooting

---

## 📁 Files

### Created:
- `src/services/gsc-service.js` - GSC integration service
- `data/gsc-settings.json` - Your credentials (created when you save)
- `GSC_INTEGRATION_COMPLETE.md` - Full documentation

### Modified:
- `dashboard-server.js` - Added GSC endpoints
- `dashboard/src/services/api.js` - Added GSC API methods
- `dashboard/src/pages/SettingsPage.jsx` - Added configuration UI

---

## 🎉 You're Ready!

The Google Search Console integration is **production-ready** and tested.

Just configure your credentials and start seeing real data from Google!

**Next:** Go to http://localhost:9000 → Settings → Integrations
