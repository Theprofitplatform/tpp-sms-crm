# Fix: "Error Getting the Google Ads Refresh Token"

This error happens during OAuth authentication when SerpBear can't get a refresh token from Google. Let's fix it step by step.

---

## Most Common Cause: Redirect URI Mismatch

The redirect URI in Google Cloud Console must **exactly match** what SerpBear is using.

### Check Your Redirect URI

**Your production URL is:**
```
https://serpbear.theprofitplatform.com.au/api/adwords
```

⚠️ **Must be EXACT:**
- ✅ `https://` (not `http://`)
- ✅ No trailing slash
- ✅ Correct domain
- ✅ `/api/adwords` at the end

---

## Step-by-Step Fix

### Step 1: Verify Google Cloud Console Settings

1. Go to **https://console.cloud.google.com/**
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (should be named "SerpBear OAuth" or similar)
5. Click on it to edit

### Step 2: Check Redirect URI

In the **Authorized redirect URIs** section:

**Should show exactly:**
```
https://serpbear.theprofitplatform.com.au/api/adwords
```

**Common mistakes to avoid:**
```
❌ http://serpbear.theprofitplatform.com.au/api/adwords  (http instead of https)
❌ https://serpbear.theprofitplatform.com.au/api/adwords/  (trailing slash)
❌ https://www.serpbear.theprofitplatform.com.au/api/adwords  (www subdomain)
❌ https://serpbear.theprofitplatform.com.au  (missing /api/adwords)
```

**If it's wrong:**
1. Delete the wrong URI
2. Click **+ ADD URI**
3. Paste exactly: `https://serpbear.theprofitplatform.com.au/api/adwords`
4. Click **Save**
5. Wait 1-2 minutes for changes to propagate

---

### Step 3: Verify OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Check the status:
   - Should show "Testing" or "Published"
   - If "In preparation" → complete the setup

3. **Add yourself as test user:**
   - Scroll to **Test users** section
   - Click **+ ADD USERS**
   - Add the Gmail address you're using to authenticate
   - Click **Save**

---

### Step 4: Verify API is Enabled

1. Go to **APIs & Services** → **Library**
2. Search: `Google Ads API`
3. Make sure it shows **"API enabled"** with a green checkmark
4. If not enabled, click **Enable**

---

### Step 5: Check Client ID & Secret

**Verify you have the correct credentials:**

1. In Google Cloud Console → **Credentials**
2. Find your OAuth client
3. You should see:
   - **Client ID**: looks like `123456789-abc123xyz.apps.googleusercontent.com`
   - **Client Secret**: click "Show" to reveal

**If you're unsure:**
1. Delete the old OAuth client
2. Create a new one (following Step 5 from NEXT-GOOGLE-CLOUD-SETUP.md)
3. Use the new Client ID & Secret in SerpBear

---

### Step 6: Clear and Retry in SerpBear

1. Go to SerpBear: **https://serpbear.theprofitplatform.com.au**
2. Go to **Settings**
3. In the Google Ads section:
   - Clear the **Client ID** field
   - Clear the **Client Secret** field
4. Paste the credentials again carefully (no extra spaces)
5. Click **"Authenticate Integration"**
6. When popup opens, **use the same Google account** that:
   - Created the Manager Account
   - Has the Developer Token
   - Is added as a test user in OAuth consent screen

---

### Step 7: Check Browser Console for Details

The error message might have more details:

1. When you click "Authenticate Integration"
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. Look for error messages (often shows the actual redirect URI being used)
5. Take a screenshot and check if the URI matches

---

## Alternative Method: Use Desktop App Flow

If web application OAuth keeps failing, try Desktop app:

### Option A: Desktop App OAuth (Simpler)

1. **In Google Cloud Console:**
   - APIs & Services → Credentials
   - CREATE CREDENTIALS → OAuth client ID
   - Application type: **Desktop app**
   - Name: "SerpBear Desktop"
   - Click Create
   - Copy Client ID & Secret

2. **In SerpBear:**
   - This might not work as SerpBear expects web flow
   - Worth trying if web flow keeps failing

---

## Check SerpBear Logs

If still failing, check the server logs:

1. SSH into your server or check Docker logs
2. Look for detailed error messages
3. Common issues logged:
   - `redirect_uri_mismatch` - URI doesn't match
   - `invalid_client` - Wrong Client ID/Secret
   - `invalid_grant` - Token exchange failed
   - `access_denied` - User didn't grant permissions

### To check Docker logs:
```bash
docker logs serpbear
```

Or if using docker-compose:
```bash
cd /mnt/c/Users/abhis/projects/seo\ expert/serpbear
docker-compose -f docker-compose.prod.yml logs serpbear
```

---

## Verify NEXT_PUBLIC_APP_URL

Check your SerpBear environment:

1. Look at `/mnt/c/Users/abhis/projects/seo expert/serpbear/.env.production`
2. Should have:
   ```
   NEXT_PUBLIC_APP_URL=https://serpbear.theprofitplatform.com.au
   ```
3. No trailing slash!
4. If you edit this, restart SerpBear

---

## Complete Reset (Last Resort)

If nothing works, start fresh:

### 1. Delete Old OAuth Client
- Google Cloud Console → Credentials
- Delete the current OAuth client

### 2. Create New OAuth Client
- Follow Step 5 from NEXT-GOOGLE-CLOUD-SETUP.md
- Double-check redirect URI
- Copy new Client ID & Secret

### 3. Clear SerpBear Settings
- In SerpBear, delete the old credentials
- Enter new ones
- Try authentication again

### 4. Use Same Google Account
- **Critical:** Use the SAME Google account for:
  - Google Cloud Console
  - Google Ads Manager Account
  - OAuth authentication popup

---

## Debugging Checklist

Go through each item:

- [ ] Redirect URI in Google Cloud is **exactly**: `https://serpbear.theprofitplatform.com.au/api/adwords`
- [ ] No trailing slash in redirect URI
- [ ] Using HTTPS (not HTTP)
- [ ] Google Ads API is enabled in Google Cloud project
- [ ] OAuth consent screen is configured (Testing or Published status)
- [ ] Your email is added as test user in OAuth consent screen
- [ ] Client ID & Secret are correct (no typos, no extra spaces)
- [ ] Using the same Google account everywhere
- [ ] NEXT_PUBLIC_APP_URL in .env.production is correct
- [ ] Waited 1-2 minutes after changing redirect URI
- [ ] Tried in an incognito/private browser window
- [ ] Popup blockers are disabled
- [ ] No browser extensions interfering

---

## Still Not Working?

### Share These Details:

1. **Exact error message** (any additional text?)
2. **Browser console errors** (F12 → Console tab)
3. **SerpBear logs** (from Docker/server)
4. **Redirect URI** you configured in Google Cloud
5. **OAuth consent screen status** (Testing/Published/In preparation)
6. **Which Google account** you're using to authenticate

### Try These:

1. **Different browser** - try Chrome if using Firefox, etc.
2. **Incognito mode** - clears any cached OAuth data
3. **Different device** - rule out local issues
4. **Wait 5 minutes** - sometimes Google takes time to propagate changes
5. **Revoke access** - Go to https://myaccount.google.com/permissions and revoke SerpBear, then try again

---

## Common Error Messages Decoded

| Error | Cause | Fix |
|-------|-------|-----|
| `redirect_uri_mismatch` | URI doesn't match | Fix redirect URI in Google Cloud |
| `invalid_client` | Wrong Client ID/Secret | Re-check credentials |
| `invalid_grant` | Token exchange failed | Re-authenticate, check same Google account |
| `access_denied` | User denied permissions | Grant all permissions in popup |
| `unauthorized_client` | Client not authorized | Check OAuth consent screen configured |

---

## Expected Successful Flow

When it works correctly:

1. Click "Authenticate Integration" in SerpBear
2. Popup opens to Google login
3. Select your Google account
4. See permissions screen (allow access to Google Ads)
5. Click "Allow"
6. Popup shows: "Google Ads Integrated Successfully!"
7. Close popup
8. Back in SerpBear, proceed to Step 2

---

Let me know which step is failing and I can help debug further!
