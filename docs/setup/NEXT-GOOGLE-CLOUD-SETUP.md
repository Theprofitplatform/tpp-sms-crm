# Next Step: Google Cloud Console Setup

Great! You now have from Google Ads:
- ✅ Developer Token
- ✅ Manager Account ID

---

## What You Need Next

From **Google Cloud Console**, you need:
- OAuth Client ID
- OAuth Client Secret

Then you'll have all 4 credentials to configure SerpBear!

---

## Step-by-Step: Google Cloud Console

### Step 1: Go to Google Cloud Console
🔗 **https://console.cloud.google.com/**

---

### Step 2: Select or Create Project

**If you already have a project (e.g., for Google Search Console):**
- Select it from the dropdown at the top

**If you need to create a new project:**
1. Click the project dropdown at top
2. Click **"New Project"**
3. Name it: `SerpBear SEO Tracker`
4. Click **Create**
5. Wait for it to be created (takes ~30 seconds)
6. Select it from the dropdown

---

### Step 3: Configure OAuth Consent Screen

**First time only - skip if already done:**

1. In left sidebar → **APIs & Services** → **OAuth consent screen**
2. Choose user type: **External**
3. Click **Create**
4. Fill in required fields:
   ```
   App name: SerpBear
   User support email: your-email@example.com
   Developer contact: your-email@example.com
   ```
5. Click **Save and Continue**
6. On **Scopes** page → Click **Save and Continue** (skip this)
7. On **Test users** page → Click **Add Users** → Add your email
8. Click **Save and Continue**
9. Click **Back to Dashboard**

---

### Step 4: Enable Google Ads API

1. Go to **APIs & Services** → **Library**
2. In the search box, type: `Google Ads API`
3. Click on **Google Ads API** in results
4. Click **Enable**
5. Wait for confirmation (takes a few seconds)

---

### Step 5: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** (top)
3. Select **OAuth client ID**
4. Application type: **Web application**
5. Name: `SerpBear OAuth`
6. Under **Authorized redirect URIs**:
   - Click **+ ADD URI**
   - Paste exactly:
     ```
     https://serpbear.theprofitplatform.com.au/api/adwords
     ```
   - ⚠️ **Critical:** Must be exact - HTTPS, no trailing slash!
   
   *Optional - add localhost for testing:*
   - Click **+ ADD URI** again
   - Add: `http://localhost:3001/api/adwords`

7. Click **Create**

8. **A popup appears with your credentials!**
   - ✅ Copy **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - ✅ Copy **Client Secret** (random string)
   - Click **OK**

---

## Step 6: Save All Your Credentials

You should now have all 4 pieces:

```
✅ From Google Cloud Console:
   1. Client ID: xxxxx.apps.googleusercontent.com
   2. Client Secret: GOCSPX-xxxxxxxxxxxxx

✅ From Google Ads Manager Account:
   3. Developer Token: 4xr6jY94kAxtXk4rfcgc4w
   4. Manager Account ID: 123-456-7890
```

**Save these securely** - you'll enter them in SerpBear next!

---

## Step 7: Configure SerpBear

Now go to your production SerpBear:
🔗 **https://serpbear.theprofitplatform.com.au**

1. **Login** to SerpBear
2. Click **Settings** (gear icon in left sidebar)
3. Scroll down to **Google Ads** section

### Part 1: Connect Google Cloud Project

1. **Client ID:** Paste your Client ID
2. **Client Secret:** Paste your Client Secret
3. Click **"Authenticate Integration"**
4. A popup window opens → Sign in with Google
5. Grant permissions to SerpBear
6. You should see: "Google Ads Integrated Successfully!"
7. Close the popup window

### Part 2: Connect Google Ads

1. **Developer Token:** Paste your Developer Token
2. **Test Account ID:** Paste your Manager Account ID
3. Click **"Test Google Ads Integration"**
4. Wait for success message ✅

### Part 3: Update Keywords (Optional)

1. Click **"Update Keywords Volume Data"**
2. This fetches search volume for your tracked keywords
3. May take a minute depending on keyword count

---

## Step 8: Verify It Works

### Test 1: Check Keywords Volume
1. Go to **Keywords** in SerpBear sidebar
2. Your tracked keywords should now show volume data
3. Look for the "Volume" column

### Test 2: Try Keyword Research
1. Go to **Research** in SerpBear sidebar
2. Enter a seed keyword (e.g., "coffee")
3. Select country and language
4. Click **"Get Ideas"**
5. Should see keyword suggestions with search volume!

---

## Troubleshooting

### "redirect_uri_mismatch" error
**Fix:**
- Go back to Google Cloud Console → Credentials
- Edit your OAuth client
- Verify redirect URI is exactly: `https://serpbear.theprofitplatform.com.au/api/adwords`
- No spaces, no trailing slash, must be HTTPS

### OAuth popup blocked
**Fix:**
- Allow popups for your domain temporarily
- Try again
- Or use a different browser (Chrome recommended)

### "Test integration failed"
**Check:**
- All 4 credentials are correct
- No extra spaces copied
- Manager Account ID format: XXX-XXX-XXXX
- You completed Part 1 authentication first

### "Invalid grant" error
**Fix:**
- Re-authenticate Part 1 (Client ID & Secret)
- Make sure you're using the same Google account everywhere

---

## Quick Reference: Where to Find Each Piece

| Credential | Where to Get It |
|------------|-----------------|
| **Client ID** | Google Cloud Console → APIs & Services → Credentials |
| **Client Secret** | Google Cloud Console → APIs & Services → Credentials |
| **Developer Token** | Google Ads Manager → Tools → API Center |
| **Manager Account ID** | Google Ads Manager → Top right corner |

---

## Checklist

**Google Cloud Console:**
- [ ] Project created/selected
- [ ] OAuth consent screen configured
- [ ] Google Ads API enabled
- [ ] OAuth credentials created
- [ ] Redirect URI added: `https://serpbear.theprofitplatform.com.au/api/adwords`
- [ ] Client ID copied
- [ ] Client Secret copied

**Google Ads Manager:**
- [ ] Developer Token copied
- [ ] Manager Account ID copied

**SerpBear:**
- [ ] Logged into production: https://serpbear.theprofitplatform.com.au
- [ ] Settings opened
- [ ] Client ID & Secret entered
- [ ] Authentication completed (popup)
- [ ] Developer Token & Account ID entered
- [ ] Test integration successful ✅
- [ ] Keywords volume updated

---

## You're Almost Done!

Follow Steps 1-8 above and you'll have Google Ads fully integrated in about 10 minutes. The hardest part (Manager Account) is already done! 🎉

**Start with Step 1** (Google Cloud Console) and work your way through.
