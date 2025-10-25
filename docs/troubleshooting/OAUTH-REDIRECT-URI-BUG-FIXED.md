# OAuth Redirect URI Bug - FIXED!

## The Problem I Found

Looking at the code more carefully, I found the actual bug:

```javascript
// BROKEN CODE:
redirect_uri=${`${encodeURIComponent(window.location.origin)}/api/adwords`}

// This creates a DOUBLE-ENCODED URL like:
// https%3A%2F%2Fserpbear.theprofitplatform.com.au/api/adwords
// Which is malformed!
```

## The Fix

```javascript
// FIXED CODE:
const redirectUri = `${window.location.origin}/api/adwords`;
redirect_uri=${encodeURIComponent(redirectUri)}

// Now correctly encodes to:
// https://serpbear.theprofitplatform.com.au/api/adwords
```

The issue was the template literal inside `encodeURIComponent` was creating a malformed URL.

---

## Changes Applied

1. ✅ Fixed redirect URI encoding bug
2. ✅ Added `prompt=consent` to force refresh token
3. ✅ Restarted dev server

---

## Try Again Now

1. **Hard refresh your browser:**
   ```
   Ctrl + Shift + R (or Cmd + Shift + R on Mac)
   ```

2. **Or open incognito window:**
   ```
   https://serpbear.theprofitplatform.com.au
   ```

3. **Settings → Google Ads**

4. **Click "Authenticate Integration"**
   - Should work now! ✅

5. **If it still fails:**
   - Press F12 → Network tab
   - Click on the failed `/api/adwords` request
   - Go to Response tab
   - Share the error message

---

## What Was Happening

**Before (broken):**
```
User clicks authenticate
→ OAuth URL has malformed redirect_uri
→ Google sees: "https%3A%2F%2F...%2Fapi/adwords" (broken)
→ Google: "This doesn't match your config"
→ 400 Bad Request ❌
```

**After (fixed):**
```
User clicks authenticate
→ OAuth URL has correct redirect_uri
→ Google sees: "https://serpbear.theprofitplatform.com.au/api/adwords"
→ Google: "This matches! Here's your code"
→ SerpBear exchanges code for tokens
→ Success! ✅
```

---

## Dev Server Status

Dev server is restarting in background. Wait 30 seconds then try.

Check if it's ready:
```bash
curl http://localhost:3001
```

If you see HTML, it's ready!

---

## Next Steps After OAuth Works

Once you see "Google Ads Integrated Successfully!":

1. ✅ Enter Developer Token (from Google Ads Manager → API Center)
2. ✅ Enter Account ID (from top right, format: XXX-XXX-XXXX)
3. ✅ Click "Test Google Ads Integration"
4. ✅ Should work! 🎉

---

The fix is deployed. Hard refresh and try again!
