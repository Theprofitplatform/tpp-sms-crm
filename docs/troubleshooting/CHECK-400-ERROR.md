# 400 Bad Request - What to Check

Good! We can see the request URL. Now we need the actual error message.

## Step 1: Check Response Body in Network Tab

1. **In browser DevTools (F12) → Network tab**
2. **Find the failed request:** `/api/adwords?code=4%2F0AVG...`
3. **Click on it**
4. **Go to "Response" tab** (or "Preview" tab)
5. **Read the error message**

**It should show something like:**
```
Error Saving the Google Ads Refresh Token. Details: redirect_uri_mismatch
```
OR
```
Error Getting the Google Ads Refresh Token. Please Try Again!
```

**Copy the EXACT error message and share it!**

---

## Step 2: Check Terminal Output

The Next.js dev server logs the actual error from Google.

**Find the terminal running `next dev` and look for:**
```
[Error] Getting Google Ads Refresh Token! Reason: <actual error>
```

**Share what it says after "Reason:"**

---

## Common 400 Errors and Fixes

### Error: "redirect_uri_mismatch"

**Problem:** The redirect URI doesn't match what's in Google Cloud Console

**Check:**
1. Go to Google Cloud Console → Credentials → Your OAuth client
2. The redirect URI should be EXACTLY:
   ```
   https://serpbear.theprofitplatform.com.au/api/adwords
   ```
3. Check for:
   - ❌ Trailing slash: `.../api/adwords/`
   - ❌ Extra spaces
   - ❌ Wrong protocol (http vs https)
   - ❌ Typo in domain

**Fix:** Update in Google Cloud Console, wait 2 minutes, try again

---

### Error: "invalid_client"

**Problem:** Client ID or Client Secret is wrong

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client
3. Verify the Client ID matches what you entered in SerpBear
4. Show the Client Secret and verify it matches
5. If not matching, re-enter correct credentials in SerpBear

---

### Error: "invalid_grant"

**Problem:** Authorization code expired or already used

**Fix:**
1. This happens if you try multiple times with the same code
2. Just try the authentication again from the beginning
3. Each attempt gets a new code

---

## Quick Actions

**Right now, do these:**

1. ✅ **Network Tab → Response:**
   - Click on the failed `/api/adwords` request
   - Go to Response tab
   - Copy the error message

2. ✅ **Terminal Output:**
   - Find terminal with `next dev`
   - Look for `[Error] Getting Google Ads Refresh Token! Reason:`
   - Copy what it says

3. ✅ **Google Cloud Console:**
   - Go to Credentials → OAuth client
   - Screenshot the "Authorized redirect URIs" section
   - Verify it's exactly: `https://serpbear.theprofitplatform.com.au/api/adwords`

---

## Share These 3 Things:

1. **Network Response body text**
2. **Terminal error message**
3. **Screenshot of redirect URI in Google Cloud**

This will tell us exactly what's wrong!
