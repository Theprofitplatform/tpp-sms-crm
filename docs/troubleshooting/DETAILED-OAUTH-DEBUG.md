# Detailed OAuth Debug Steps

The error persists even after adding `prompt=consent`. Let's dig deeper.

## Step 1: Check Browser Console

When you click "Authenticate Integration" and complete the OAuth flow:

1. **Open Browser DevTools:**
   - Press `F12`
   - Go to **Console** tab

2. **Also open Network tab:**
   - Go to **Network** tab
   - Make sure "Preserve log" is checked

3. **Click "Authenticate Integration"**
   - Complete the OAuth flow
   - Watch for errors in Console
   - Check the Network tab for the `/api/adwords` request

4. **Look for these in Console:**
   - Any red errors
   - Messages starting with `[Error]` or `[ERROR]`
   - Especially: "Getting Google Ads Refresh Token! Reason: ..."

5. **In Network tab:**
   - Find the request to `/api/adwords?code=...`
   - Click on it
   - Go to **Response** tab
   - Copy the exact error message

**Share what you see in Console and Network response!**

---

## Step 2: Check OAuth Client Configuration

The issue might be the OAuth client itself. Let's verify:

### In Google Cloud Console:

1. Go to: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Click on it

**Check these:**

#### Authorized redirect URIs:
```
Should have EXACTLY:
https://serpbear.theprofitplatform.com.au/api/adwords

Check for:
❌ Extra spaces
❌ Trailing slash (should NOT have /)
❌ Wrong protocol (must be https://)
❌ Typo in domain
```

#### Application type:
```
Should be: Web application
NOT: Desktop app or anything else
```

---

## Step 3: Complete Revoke and Retry

Maybe permissions are cached. Let's completely reset:

1. **Revoke ALL Google permissions:**
   - Go to: https://myaccount.google.com/permissions
   - Remove **every** app that mentions "SerpBear" or your project name
   - Also check: https://myaccount.google.com/connections
   - Remove any related apps there too

2. **Clear browser completely:**
   ```bash
   # Close ALL browser windows
   # Reopen in incognito mode
   # Or use a different browser entirely
   ```

3. **Wait 5 minutes** (Google needs time to propagate)

4. **Try OAuth again:**
   - Go to SerpBear in incognito
   - Settings → Google Ads
   - Click "Authenticate Integration"
   - Complete flow

---

## Step 4: Try Different OAuth Scope

The issue might be with the adwords scope. Let's check if the scope URL is correct.

**Current scope:**
```
https://www.googleapis.com/auth/adwords
```

**Alternative to try:**
```
https://www.googleapis.com/auth/adwords
```

Actually, this is already correct. But let's verify the scope is properly encoded in the URL.

---

## Step 5: Create New OAuth Client

The OAuth client might be corrupted. Let's create a fresh one:

### Delete Old OAuth Client:

1. Google Cloud Console → Credentials
2. Find your current OAuth client
3. Click the trash icon to delete it
4. Confirm deletion

### Create New OAuth Client:

1. Click **CREATE CREDENTIALS** → **OAuth client ID**
2. If prompted, configure consent screen (should already be done)
3. Application type: **Web application**
4. Name: `SerpBear OAuth v2`
5. **Authorized redirect URIs** - Click ADD URI:
   ```
   https://serpbear.theprofitplatform.com.au/api/adwords
   ```
   ⚠️ **Copy this EXACTLY, no trailing slash!**

6. Click **CREATE**
7. Copy the new Client ID and Client Secret
8. Go to SerpBear Settings
9. Clear old Client ID and Secret
10. Paste new ones
11. Click "Authenticate Integration"

---

## Step 6: Check Access Type in OAuth URL

Let me verify the OAuth URL is built correctly. Can you:

1. **In browser, open SerpBear**
2. **Right-click "Authenticate Integration" button**
3. **Select "Inspect Element"**
4. **Find the button in the HTML inspector**
5. **Look for the `onClick` handler**
6. **Set a breakpoint or log the URL being generated**

The URL should include:
```
access_type=offline
prompt=consent
scope=https://www.googleapis.com/auth/adwords
```

---

## Step 7: Check Terminal Output

When OAuth callback happens, the Next.js dev server logs errors:

1. **Find the terminal where `next dev` is running**
2. **Watch it when you complete OAuth**
3. **Look for messages like:**
   ```
   [Error] Getting Google Ads Refresh Token! Reason: ...
   ```

This will show the ACTUAL error from Google!

**Share what you see in the terminal!**

---

## Common Root Causes

### 1. Redirect URI Mismatch
**Google sees:** `https://serpbear.theprofitplatform.com.au/api/adwords`  
**You configured:** `https://serpbear.theprofitplatform.com.au/api/adwords/` (extra slash)

**Fix:** Remove trailing slash from OAuth client config

### 2. OAuth Client Type Wrong
**You have:** Desktop app or iOS app  
**Need:** Web application

**Fix:** Delete and recreate as Web application

### 3. Already Authorized
**Google thinks:** "They already gave permission"  
**Google doesn't send:** refresh_token

**Fix:** We added `prompt=consent` but also need to revoke access first

### 4. Scope Missing or Wrong
**Current:** `adwords` scope  
**Missing:** Proper scope format

**Fix:** Verify scope is `https://www.googleapis.com/auth/adwords`

### 5. OAuth Consent Screen Issues
**Status:** In preparation or suspended  
**Test users:** Not added

**Fix:** Complete OAuth consent screen, add yourself as test user

---

## Debugging Checklist

Do these in order:

- [ ] Check browser console for errors (F12 → Console)
- [ ] Check Network tab for `/api/adwords` response
- [ ] Verify redirect URI in Google Cloud has NO trailing slash
- [ ] Verify application type is "Web application"
- [ ] Revoke ALL permissions at https://myaccount.google.com/permissions
- [ ] Wait 5 minutes after revoking
- [ ] Try in incognito/private browser window
- [ ] Check Next.js terminal for `[Error]` messages during OAuth
- [ ] Verify OAuth URL includes `prompt=consent`
- [ ] Try creating completely new OAuth client

---

## Next Action

**Do this RIGHT NOW:**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Authenticate Integration"
4. Complete OAuth flow
5. **Screenshot the Console errors**
6. **Screenshot the Network tab response for `/api/adwords`**
7. **Share both screenshots**

This will show us the EXACT error from Google!

---

## Alternative: Use OAuth Playground

Test if your OAuth client works at all:

1. Go to: https://developers.google.com/oauthplayground/
2. Click gear icon (top right) → "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In Step 1, enter scope: `https://www.googleapis.com/auth/adwords`
5. Click "Authorize APIs"
6. Complete OAuth flow

**Does it work there?**
- If YES → Issue is with SerpBear code/config
- If NO → Issue is with OAuth client itself

---

Let me know what you find in browser console and terminal logs!
