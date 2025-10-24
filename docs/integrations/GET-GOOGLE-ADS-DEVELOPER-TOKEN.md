# How to Get Google Ads Developer Token

## ⚠️ IMPORTANT: You Need a Manager Account

**Regular Google Ads accounts can't access the Developer Token!**

If you see this message:
> "The API Center is only available to manager accounts"

**You need to create a Google Ads Manager Account first.**

📖 **Follow the guide:** `CREATE-GOOGLE-ADS-MANAGER-ACCOUNT.md`

**Quick link to create Manager Account:**
🔗 https://ads.google.com/home/tools/manager-accounts/

*This takes 5 minutes, is completely free, and gives you API access.*

---

## Step-by-Step Guide

### Step 1: Access Google Ads Manager Account
1. Go to **https://ads.google.com/**
2. Make sure you're viewing your **Manager Account** (check top left)
3. If you don't have a Manager Account yet:
   - **STOP HERE** and create one first (see note above)
   - Regular accounts won't work for API access

---

### Step 2: Navigate to API Center

1. Once logged into Google Ads dashboard, look at the **top navigation bar**
2. Click the **Tools & Settings** icon (wrench/tool icon)
3. Under the **SETUP** section, click **API Center**

**Visual guide:**
```
Tools & Settings (wrench icon)
  └── SETUP
       └── API Center ← Click here
```

---

### Step 3: Apply for API Access

On the API Center page, you'll see:

**If you don't have access yet:**
- A button that says **"APPLY NOW"** or **"Apply for API Access"**
- Click it

**Fill in the application form:**

1. **API Usage Description:**
   ```
   I will be using the Google Ads API for SEO rank tracking, keyword research, 
   and search volume analysis for my website(s). The integration will be used 
   with SerpBear (open-source rank tracking tool) to monitor keyword performance 
   and discover new keyword opportunities.
   ```

2. **Will you be acting on behalf of third parties?**
   - Select **"No"** (if just for your own sites)
   - Select **"Yes"** (if managing client sites)

3. **Purpose of API Usage:**
   - Check: "Reporting"
   - Check: "Keyword Research" (if available)

4. **Contact Information:**
   - Your email
   - Your name

5. Click **"Submit Application"**

---

### Step 4: Get Your Token

**After submission, one of two things happens:**

#### Option A: Test Account Token (Immediate - Most Common)
✅ **You'll get a Test Developer Token immediately!**

- Status shows: **"Test Account"** or **"Pending Approval"**
- You'll see your Developer Token displayed on the page
- Format: `4xr6jY94kAxtXk4rfcgc4w` (random alphanumeric string)
- **This is perfect for SerpBear!** Copy it immediately

**Test Account Token:**
- ✅ Works for keyword research
- ✅ Works for search volume data
- ✅ No Google Ads spending required
- ✅ Sufficient for most SEO tools
- ⚠️ Has lower API quota limits (but usually enough)

#### Option B: Production Token (Takes Time)
⏳ **May take several days to weeks for approval**

- Status shows: **"Under Review"**
- Google will review your application
- You'll get notified via email
- Production token has higher quotas

**For SerpBear, Test Account Token is perfectly fine!**

---

### Step 5: Copy Your Developer Token

1. On the API Center page, look for **"Developer token"** section
2. You'll see:
   ```
   Developer token: **********************
   Status: Test Account
   ```
3. Click the **eye icon** or **"Show"** to reveal the token
4. Click the **copy icon** to copy it
5. **Save it somewhere safe!** You'll need it for SerpBear

**Token format example:**
```
4xr6jY94kAxtXk4rfcgc4w
```

---

### Step 6: Get Your Account ID (While You're Here)

1. Look at the **top right corner** of Google Ads dashboard
2. You'll see a number like: **123-456-7890** (10 digits with hyphens)
3. This is your **Google Ads Account ID** (also called Customer ID)
4. **Copy this too!** You need both for SerpBear

**Example:**
```
Account ID: 590-948-9101
```

---

## Visual Location Guide

```
Google Ads Dashboard
├── Top Right Corner: Account ID (123-456-7890)
└── Tools & Settings (wrench icon)
    └── SETUP Section
        └── API Center
            ├── Developer Token: abc123xyz... (copy this!)
            └── Status: Test Account ✓
```

---

## What If I Can't Find API Center?

### Option 1: Direct URL
Try this direct link (must be logged in):
```
https://ads.google.com/aw/apicenter
```

### Option 2: Alternative Navigation
1. Click your profile icon (top right)
2. Look for **"Setup"** or **"Admin"** options
3. Find **"API Access"** or **"API Center"**

### Option 3: Search
1. Use the search bar in Google Ads
2. Type: "API Center"
3. Click the result

---

## Common Issues & Solutions

### "I don't see API Center option"
**Solutions:**
- Make sure you have admin access to the Google Ads account
- Try the direct URL: https://ads.google.com/aw/apicenter
- Ensure your Google Ads account is fully set up (not brand new)
- Wait 24 hours after creating account, then try again

### "My application is pending"
**What to do:**
- **Use the Test Token** that's shown (if available)
- Test tokens work immediately for SerpBear
- No need to wait for production approval

### "I don't want to create campaigns or spend money"
**No problem!**
- You can skip campaign creation
- Click "Skip this step" or "Expert Mode" during setup
- Google Ads account is free to create
- API access doesn't require active campaigns or spending

### "Do I need a billing method?"
**No!**
- API access doesn't require billing setup
- Test tokens work without payment methods
- You only need billing if running actual ads

---

## Token Types Comparison

| Feature | Test Token | Production Token |
|---------|------------|------------------|
| **Approval Time** | Immediate ⚡ | Days/Weeks ⏳ |
| **Cost** | Free | Free |
| **Works with SerpBear** | ✅ Yes | ✅ Yes |
| **Keyword Research** | ✅ Yes | ✅ Yes |
| **Search Volume** | ✅ Yes | ✅ Yes |
| **API Quota** | Lower | Higher |
| **Requires Campaigns** | ❌ No | ❌ No |
| **Requires Spending** | ❌ No | ❌ No |

**Recommendation:** Start with Test Token immediately!

---

## After Getting the Token

**You now have both pieces needed from Google Ads:**
1. ✅ Developer Token (e.g., `4xr6jY94kAxtXk4rfcgc4w`)
2. ✅ Account ID (e.g., `590-948-9101`)

**Next steps:**
1. Go back to Google Cloud Console
2. Complete the OAuth setup (Client ID & Secret)
3. Then enter all 4 credentials in SerpBear Settings

---

## Security Notes

🔒 **Keep your Developer Token private!**
- Don't share it publicly
- Don't commit it to Git
- SerpBear encrypts it in settings.json

⚠️ **If token is compromised:**
1. Go to API Center
2. Click "Reset Token"
3. Copy the new token
4. Update in SerpBear settings

---

## Quick Checklist

- [ ] Logged into Google Ads (ads.google.com)
- [ ] Navigated to Tools & Settings → API Center
- [ ] Clicked "Apply for API Access"
- [ ] Filled in application form (reason: rank tracking/keyword research)
- [ ] Submitted application
- [ ] Copied Developer Token (visible immediately for test account)
- [ ] Copied Account ID from top right corner (10-digit number)
- [ ] Saved both securely for SerpBear setup

---

## Still Having Issues?

**Try these:**
1. Use a different browser (Chrome recommended)
2. Clear browser cache and cookies
3. Ensure you're using the correct Google account
4. Try the direct link: https://ads.google.com/aw/apicenter
5. Wait 24-48 hours if account is brand new

**Need more help?**
- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/get-started/dev-token)
- [Google Ads Support](https://support.google.com/google-ads/)

---

**That's it!** Once you have the Developer Token and Account ID, return to the main setup guide to complete the integration.
