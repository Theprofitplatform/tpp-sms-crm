# Create Google Ads Manager Account for API Access

## The Issue
Regular Google Ads accounts can't access the API Center. You need a **Google Ads Manager Account** (also called MCC - My Client Center) to get the Developer Token.

**Good news:** Creating a Manager Account is free and takes 5 minutes!

---

## What is a Manager Account?

A Google Ads Manager Account is:
- 🆓 **Free** - no cost, no billing required
- 👥 **Designed for agencies** - but anyone can create one
- 🔑 **Has API access** - this is what we need!
- 📊 **Can manage multiple accounts** - useful if you have multiple sites

**You don't need to run ads or spend money!**

---

## Step-by-Step: Create Manager Account

### Step 1: Go to Manager Account Signup
🔗 **https://ads.google.com/home/tools/manager-accounts/**

Or use this direct link:
🔗 **https://ads.google.com/um/GetStarted**

### Step 2: Fill in Account Information

**Account details:**
```
Account name: [Your Company Name] Manager
Example: "MyBusiness SEO Manager" or "Your Name SEO Tools"

Timezone: [Your timezone]
Example: Australia/Sydney

Currency: [Your preferred currency]
Example: AUD (Australian Dollar)
```

⚠️ **Important:** Timezone and currency cannot be changed later!

**Account usage:**
- Select: **"Manage other people's accounts"** 
  (This gives you manager-level access even if managing only your own accounts)

**Billing information:**
- **You can skip this!** API access doesn't require billing
- Click "Skip" or leave empty

### Step 3: Accept Terms and Create

1. Read and accept the Google Ads Terms & Conditions
2. Click **"Create account"** or **"Submit"**
3. ✅ Your Manager Account is created instantly!

---

## Step 4: Access API Center from Manager Account

Now that you have a Manager Account:

### Option 1: Direct Link
🔗 **https://ads.google.com/aw/apicenter**

Make sure you're viewing your **Manager Account** (not regular account)

### Option 2: Navigate
1. In Google Ads, look at top left for account selector
2. Make sure you're in your **Manager Account**
3. Click **Tools & Settings** (wrench icon)
4. Under **SETUP** → Click **API Center**

---

## Step 5: Apply for Developer Token

Now follow these steps in the Manager Account:

1. **In API Center, click "APPLY NOW"** or **"Apply for API Access"**

2. **Fill in the application:**

   **How will you use the API?**
   ```
   I will be using the Google Ads API for SEO rank tracking, keyword research, 
   and search volume analysis. The integration will be used with SerpBear 
   (an open-source rank tracking tool) to monitor keyword performance and 
   discover keyword opportunities for my website(s). This is for internal 
   business use and reporting purposes.
   ```

   **Will you be acting on behalf of third parties?**
   - Select **"No"** (if just for your sites)
   - Select **"Yes"** (if you're an agency or manage client sites)

   **Contact Information:**
   - Enter your email and name

3. **Submit the application**

4. ✅ **You'll get a Test Developer Token immediately!**
   - Status: "Test Account"
   - The token will be displayed on the screen
   - Copy it and save it securely

---

## Step 6: Get Your Manager Account ID

Your Manager Account has its own Customer ID (Account ID):

1. Look at **top right corner** of the dashboard
2. You'll see a 10-digit number: **XXX-XXX-XXXX**
3. **Copy this number** - this is your Manager Account ID
4. You'll use this in SerpBear (not your regular account ID)

---

## Important: Which Account ID to Use?

### For SerpBear, use your **Manager Account ID**

```
✅ CORRECT: Use Manager Account ID (123-456-7890)
   - The account where you got the Developer Token
   - Shows at top right when viewing Manager Account

❌ WRONG: Regular Google Ads Account ID
   - Any sub-accounts or regular accounts
   - Won't work with the API
```

---

## Linking Your Existing Account (Optional)

If you have an existing Google Ads account and want to manage it:

1. In your Manager Account, click **"Accounts"** in left sidebar
2. Click **"Link existing account"**
3. Enter your regular account Customer ID
4. Follow the linking process
5. Accept the link request in your regular account

**Note:** This is optional - not required for API access!

---

## Verification: You're Ready When...

- [ ] Manager Account created ✅
- [ ] Logged into Manager Account (check top left for "Manager Account" label)
- [ ] Applied for API access in API Center
- [ ] Developer Token received (Test Account status is fine!)
- [ ] Manager Account ID copied (10-digit number from top right)
- [ ] Both saved securely for SerpBear setup

---

## Visual Guide

```
Google Ads Homepage
  └── Create Manager Account
       https://ads.google.com/home/tools/manager-accounts/
       
       Fill form:
       ├── Account name: "My Business Manager"
       ├── Timezone: Your timezone
       ├── Currency: Your currency
       └── Usage: "Manage other people's accounts"
       
       ✓ Account Created!
       
       Navigate to API Center:
       Tools & Settings → SETUP → API Center
       
       Apply for Access:
       ├── Submit application
       └── Get Developer Token ✓
       
       Get Account ID:
       Top right corner → Copy XXX-XXX-XXXX
```

---

## Troubleshooting

### "I still see the Manager Account required message"
**Check:**
- Make sure you're viewing the Manager Account, not a regular account
- Look at top left - should say "Manager" or show manager icon
- Try the direct link: https://ads.google.com/aw/apicenter

### "I can't find where to create Manager Account"
**Use direct links:**
- Main: https://ads.google.com/home/tools/manager-accounts/
- Signup: https://ads.google.com/um/GetStarted
- Or Google: "create google ads manager account"

### "Do I need to move my existing campaigns?"
**No!**
- Your existing account stays separate
- Manager Account is just for API access
- You can link them later if you want (optional)

### "Which account ID do I use in SerpBear?"
**Use the Manager Account ID:**
- The one from the account where you got the Developer Token
- Shows at top right when viewing Manager Account
- Format: XXX-XXX-XXXX (10 digits)

---

## What You'll Have After This

From your Manager Account, you'll get:

1. ✅ **Developer Token** 
   - Format: `4xr6jY94kAxtXk4rfcgc4w`
   - From: API Center in Manager Account

2. ✅ **Manager Account ID** (Customer ID)
   - Format: `123-456-7890`
   - From: Top right corner of Manager Account dashboard

**These are 2 of the 4 credentials needed for SerpBear!**

Next steps:
- Get OAuth Client ID & Secret from Google Cloud Console
- Then enter all 4 in SerpBear Settings

---

## Additional Resources

- [Google Ads Manager Accounts Overview](https://support.google.com/google-ads/answer/6139186)
- [API Signup Guide](https://developers.google.com/google-ads/api/docs/get-started/signup)
- [Developer Token Guide](https://developers.google.com/google-ads/api/docs/get-started/dev-token)

---

## Quick Summary

1. **Create Manager Account** (5 min, free)
   - Go to: https://ads.google.com/home/tools/manager-accounts/
   - Fill form, submit

2. **Get Developer Token** (immediate)
   - Manager Account → Tools → API Center
   - Apply for access, get test token

3. **Copy Manager Account ID** (top right)
   - 10-digit number: XXX-XXX-XXXX

4. **Continue with OAuth setup** (next step)
   - Google Cloud Console for Client ID & Secret

---

**Ready?** Create your Manager Account now and you'll have API access in 5 minutes! 🚀
