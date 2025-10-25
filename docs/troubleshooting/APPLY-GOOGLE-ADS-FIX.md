# Apply Google Ads OAuth Fix

## What I Fixed

I found the root cause! The OAuth URL was missing `prompt=consent`, which meant Google wouldn't issue a new refresh token when you already authorized before.

**Fixed code:**
```javascript
// BEFORE (missing prompt=consent):
access_type=offline&scope=...

// AFTER (added prompt=consent):
access_type=offline&prompt=consent&scope=...
```

This forces Google to always show the consent screen and issue a new refresh token.

---

## How to Apply the Fix

### Option 1: Update on VPS (Recommended for Production)

```bash
# From your local machine, run:
cd "/mnt/c/Users/abhis/projects/seo expert"

# Sync and rebuild on VPS
./manage-serpbear.sh update
```

This will:
1. Upload the fixed code to VPS
2. Rebuild the Docker container
3. Restart SerpBear with the fix

**Time:** ~5 minutes

---

### Option 2: Test Locally First (If local dev is active)

If your local `next dev` server is serving the production URL via tunnel:

```bash
cd "/mnt/c/Users/abhis/projects/seo expert/serpbear"

# The dev server should auto-reload, but you can restart it:
# 1. Stop the current dev server (Ctrl+C in its terminal)
# 2. Restart it:
npm run dev
```

Then **refresh your browser** at https://serpbear.theprofitplatform.com.au

---

## After Applying the Fix

### Test the OAuth Flow:

1. **Go to SerpBear:** https://serpbear.theprofitplatform.com.au

2. **Settings → Google Ads**

3. **Click "Authenticate Integration"**
   - Popup will open
   - You'll see the Google consent screen (even if you authorized before!)
   - Grant ALL permissions
   - Should now say: **"Google Ads Integrated Successfully!"** ✅
   - Close popup

4. **Verify refresh token is saved:**
   ```bash
   cd "/mnt/c/Users/abhis/projects/seo expert/serpbear"
   node check-settings.js
   ```
   
   Should show:
   ```
   ✅ adwords_refresh_token: Present
   ```

5. **Complete Step 2:**
   - Enter Developer Token
   - Enter Manager Account ID
   - Click "Test Google Ads Integration"
   - Should work! 🎉

---

## Which Deployment Are You Using?

**Check which one is serving production:**

### Is it the VPS?
```bash
# Check VPS status
./manage-serpbear.sh status

# If container is running on VPS, that's your production
```

### Is it local dev via tunnel?
```bash
# Check for cloudflare tunnel
ps aux | grep cloudflare

# Check what's on port 3001
netstat -tulpn | grep 3001

# If local dev is tunneled to production URL, use Option 2
```

---

## Quick Decision Tree

**Where is production running?**

```
├─ VPS Docker (port 3006)
│  └─ Use: ./manage-serpbear.sh update
│  └─ Time: 5 minutes
│  └─ Safe for production
│
└─ Local dev via tunnel (port 3001)
   └─ Already applied! Just refresh browser
   └─ Time: 10 seconds
   └─ For testing only
```

---

## Verification Steps

After applying (either method):

1. ✅ **Browser:** Open SerpBear and check Settings → Google Ads
2. ✅ **Click:** "Authenticate Integration"
3. ✅ **See:** Google consent screen appears
4. ✅ **Result:** "Google Ads Integrated Successfully!"
5. ✅ **Check:** `node check-settings.js` shows refresh_token present
6. ✅ **Test:** Step 2 works without error

---

## The Fix is Already Applied Locally

The code change is done in:
```
/mnt/c/Users/abhis/projects/seo expert/serpbear/components/settings/AdWordsSettings.tsx
```

**Just need to deploy it!**

---

## Recommended: Update on VPS

Since you have a management script, the safest approach:

```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
./manage-serpbear.sh update
```

Wait 5 minutes, then try OAuth authentication again. It will work!

---

## What This Fix Does

**Before fix:**
1. User clicks "Authenticate Integration"
2. Google sees they already authorized
3. Google: "You already gave permission, skipping..."
4. Google sends code but NO refresh token
5. SerpBear: "Error Getting the Google Ads Refresh Token" ❌

**After fix:**
1. User clicks "Authenticate Integration"
2. OAuth URL includes `prompt=consent`
3. Google: "Showing consent screen anyway..."
4. User grants permissions
5. Google sends code AND refresh token ✅
6. SerpBear: "Google Ads Integrated Successfully!" ✅

---

## Next Steps

1. **Deploy the fix** (choose Option 1 or 2 above)
2. **Try OAuth again** - should work now!
3. **Complete Step 2** with Developer Token and Account ID
4. **Success!** 🎉

Let me know if you need help deploying or if you want me to do it!
