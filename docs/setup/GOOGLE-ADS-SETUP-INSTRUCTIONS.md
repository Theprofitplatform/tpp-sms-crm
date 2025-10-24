# Google Ads Integration Setup for SerpBear

## Overview
This guide will help you integrate Google Ads with your SerpBear installation to get keyword search volume data and research capabilities.

## What You'll Get
- ✅ Keyword research and idea generation
- ✅ Monthly search volume data for tracked keywords
- ✅ Keyword suggestions from your website content
- ✅ Competition and trend data

---

## Prerequisites
- [ ] Google Cloud Account (free)
- [ ] Google Ads Account (test account is fine - no spending required)
- [ ] SerpBear live in production at `https://serpbear.theprofitplatform.com.au`

---

## Step 1: Create OAuth 2.0 Credentials

### 1.1 Go to Google Cloud Console
🔗 https://console.cloud.google.com/

### 1.2 Select or Create Project
- Use your existing SerpBear project OR create a new one
- Name suggestion: "SerpBear SEO Tracker"

### 1.3 Configure OAuth Consent Screen (if not done)
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - App name: `SerpBear`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue** through all steps
5. Add yourself as a test user (if in testing mode)

### 1.4 Create OAuth Client ID
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `SerpBear OAuth`
5. **Authorized redirect URIs** - Add:
   ```
   https://serpbear.theprofitplatform.com.au/api/adwords
   ```
   ⚠️ **Important:** This is your production URL. Must match exactly with HTTPS!
   
   *Optional:* Also add localhost for testing:
   ```
   http://localhost:3001/api/adwords
   ```
   
6. Click **Create**
7. **COPY THESE** (you'll need them):
   - Client ID (looks like: `xxxxx.apps.googleusercontent.com`)
   - Client Secret (random string)

---

## Step 2: Enable Google Ads API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for: `Google Ads API`
3. Click on it and click **Enable**
4. Wait for confirmation

---

## Step 3: Get Google Ads Developer Token

### 3.1 Create/Access Google Ads Account
🔗 https://ads.google.com/

1. Sign in with the same Google account
2. Create an account if you don't have one
3. **Don't worry** - you can use a test account without spending money!

### 3.2 Apply for API Access
1. In Google Ads, click **Tools & Settings** (wrench icon)
2. Under **Setup**, click **API Center**
3. Click **Apply for API Access**
4. Fill in the form:
   - **API Usage**: "Rank tracking, keyword research, and SEO analysis"
   - **Purpose**: "Personal/Internal use for website rank tracking"
5. Submit application

### 3.3 Get Your Developer Token
- **Test Account Token**: Usually granted immediately (perfect for SerpBear!)
- **Production Token**: May take days/weeks for approval (not needed initially)

**Copy your Developer Token** - looks like: `4xr6jY94kAxtXk4rfcgc4w`

### 3.4 Get Your Account ID
1. In Google Ads dashboard, look at top right
2. Copy the 10-digit number (format: `XXX-XXX-XXXX`)
3. This is your **Test Account ID**

---

## Step 4: Configure SerpBear

### 4.1 Access SerpBear Settings
1. Open SerpBear: https://serpbear.theprofitplatform.com.au
2. Click **Settings** (gear icon in sidebar)
3. Scroll to **Google Ads Integration** section

### 4.2 Step 1: Connect Google Cloud Project
1. Paste your **Client ID**
2. Paste your **Client Secret**
3. Click **Authenticate Integration**
4. A new browser window opens
5. Sign in with Google and grant permissions
6. You should see: "Google Ads Integrated Successfully!"
7. Close the popup window

### 4.3 Step 2: Connect Google Ads
1. Paste your **Developer Token**
2. Paste your **Test Account ID** (the 10-digit number)
3. Click **Test Google Ads Integration**
4. Wait for success message ✅

### 4.4 Step 3: Update Keyword Volume (Optional)
1. Click **Update Keywords Volume Data**
2. This fetches search volume for all your tracked keywords
3. May take a few minutes depending on how many keywords you have

---

## Verification Checklist

Run through this checklist to ensure everything is working:

- [ ] OAuth credentials created in Google Cloud Console
- [ ] Google Ads API enabled
- [ ] Redirect URI matches: `https://serpbear.theprofitplatform.com.au/api/adwords`
- [ ] Developer Token obtained from Google Ads
- [ ] Account ID copied (10-digit format)
- [ ] Client ID & Secret added to SerpBear
- [ ] Authentication popup completed successfully
- [ ] Developer Token & Account ID added to SerpBear
- [ ] Test integration successful ✅
- [ ] Can access **Research** page in SerpBear
- [ ] Keyword ideas show search volume data

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Solution:** 
1. Check the redirect URI in Google Cloud Console
2. Must exactly match: `https://serpbear.theprofitplatform.com.au/api/adwords`
3. No trailing slash, must use HTTPS
4. Check NEXT_PUBLIC_APP_URL in .env.production matches

### Error: "Test integration failed"
**Check:**
- All 4 credentials are correct (Client ID, Secret, Developer Token, Account ID)
- Account ID format is correct (XXX-XXX-XXXX)
- Developer Token doesn't have extra spaces
- You completed OAuth authentication first (Step 1)

### No volume data showing
**Reasons:**
- Test accounts have limited API access
- Some keywords may not return data
- Try common keywords like "shoes" or "hotels" to verify

### Authentication popup doesn't work
**Solutions:**
- Disable popup blockers temporarily
- Try a different browser
- Check browser console for errors
- Verify NEXT_PUBLIC_APP_URL in .env matches your actual URL

---

## Testing the Integration

### Test Keyword Research
1. Go to **Research** in SerpBear sidebar
2. Enter a seed keyword (e.g., "coffee")
3. Select country and language
4. Click **Get Ideas**
5. Should see keyword suggestions with:
   - Monthly search volume
   - Competition level
   - Trend data

### Test Volume Update
1. Add some keywords to track if you haven't
2. Go to Settings → Google Ads
3. Click **Update Keywords Volume Data**
4. Return to Keywords view
5. Should see volume numbers next to keywords

---

## Important Notes

⚠️ **Test Account Limitations:**
- Test accounts work perfectly for keyword research
- Some advanced features may be limited
- No money needs to be spent
- Sufficient for SerpBear's needs

💡 **Security:**
- All credentials are encrypted in `data/settings.json`
- Don't share your credentials
- Keep your SECRET key secure in .env

🔄 **Refresh Token:**
- OAuth grants a refresh token automatically
- Valid indefinitely unless revoked
- Re-authenticate if you see auth errors

📊 **Data Freshness:**
- Search volume data is typically monthly averages
- Updates when you click "Update Keywords Volume Data"
- Not real-time, but sufficient for SEO tracking

---

## Next Steps After Setup

1. **Add Keywords**: Track keywords relevant to your business
2. **Research**: Use the Research tool to find new keyword opportunities
3. **Monitor Volume**: Update volume data monthly
4. **Export**: Export keyword ideas as CSV for analysis

---

## Useful Links

- [SerpBear Google Ads Docs](https://docs.serpbear.com/miscellaneous/integrate-google-ads)
- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Ads](https://ads.google.com/)

---

## Support

If you run into issues:
1. Check SerpBear logs for detailed error messages
2. Verify all credentials are correct
3. Ensure API is enabled in Google Cloud
4. Make sure test user is added in OAuth consent screen
5. Try re-authenticating from Step 1

---

**Ready?** Start with Step 1 and work your way through! 🚀
