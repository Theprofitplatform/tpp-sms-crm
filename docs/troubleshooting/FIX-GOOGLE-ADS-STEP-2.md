# ✅ Google Ads Integration - Complete Step 2

## Current Status

✅ **Step 1: COMPLETE** - OAuth Already Done!
- Client ID: Saved ✅
- Client Secret: Saved ✅
- Refresh Token: Saved ✅

❌ **Step 2: INCOMPLETE** - Need These:
- Developer Token: Missing
- Account ID: Missing

---

## What You Need to Do

**You DON'T need to redo Step 1!** Just complete Step 2:

### Step 2A: Get Developer Token

1. **Go to Google Ads Manager Account:**
   - Visit: https://ads.google.com/
   - Make sure you're in your MANAGER account (not a client account)

2. **Navigate to API Center:**
   - Click "Tools & Settings" (wrench icon top right)
   - Under "Setup", click "API Center"

3. **Get Your Developer Token:**
   - You'll see your Developer Token
   - **Status must be "Approved" or "Test account"**
   - Copy the token (looks like: `4xr6jY94kAxtXk4rfcgc4w`)

4. **If you don't have a Developer Token:**
   - Click "Get your developer token"
   - Fill out the form
   - For testing, you'll get instant access with "Test account" status
   - For production, Google will review (takes 1-2 days)

---

### Step 2B: Get Manager Account ID

**While still in Google Ads Manager:**

1. Look at the **top right corner** of the screen
2. You'll see a number like: `590-948-9101`
3. This is your Manager Account ID (also called Customer ID or MCC ID)
4. Copy this number WITH the dashes

**Important:** Use the MANAGER account ID, not a client account ID!

---

### Step 2C: Enter in SerpBear

1. **Go to:** https://serpbear.theprofitplatform.com.au
2. **Login** with your credentials
3. **Go to Settings** (gear icon)
4. **Scroll to Google Ads section**
5. **In Step 2:**
   - Paste **Developer Token**
   - Paste **Account ID** (XXX-XXX-XXXX format)
6. **Click "Test Google Ads Integration"**
7. **Should now work!** ✅

---

## If You Still See the Error Message

If you're getting "Error Getting the Google Ads Refresh Token" when trying to RE-AUTHENTICATE in Step 1:

### Why It Happens
- You already have a valid refresh token
- Google won't give you a new one unless you revoke the old authorization first
- Even with `prompt=consent`, if the authorization exists, Google may not return a refresh token

### Solution: Don't Re-Authenticate!
**You don't need to!** Your Step 1 is already complete. Just do Step 2.

### But If You Really Want to Re-Authenticate

If you absolutely need to redo Step 1 (e.g., to use a different Google account):

1. **Revoke Existing Access:**
   - Go to: https://myaccount.google.com/permissions
   - Find "SerpBear" or your app name
   - Click "Remove Access"
   - Confirm

2. **Wait 2-3 minutes**

3. **Clear SerpBear Settings:**
   - In SerpBear Settings, clear the Client ID and Client Secret fields
   - Re-enter them
   - Click "Authenticate Integration"

4. **This time it will work** because you revoked the old authorization

---

## Quick Verification

To confirm Step 1 is complete, you should see in SerpBear Settings:

**Step 1 Section:**
- Client ID field: Has value (shows encrypted text)
- Client Secret field: Has value (shows encrypted text)
- Button says: "Re-Authenticate Integration" (not "Authenticate")

**If it says "Re-Authenticate"**, that means OAuth was already completed successfully!

---

## Expected Flow

**After completing Step 2, you should be able to:**

1. ✅ Get keyword ideas and suggestions
2. ✅ See monthly search volumes for keywords
3. ✅ Use Google Ads data for SEO research
4. ✅ Update volume data for tracked keywords

---

## Test the Integration

After entering Developer Token and Account ID:

1. Click "Test Google Ads Integration"
2. **Success message:** Integration is working ✅
3. Go to any domain in SerpBear
4. Click "Keyword Ideas" tab
5. Enter a seed keyword
6. You should see keyword suggestions with search volumes

---

## Troubleshooting

### Error: "Invalid Developer Token"
- Make sure you copied the full token
- Check for extra spaces
- Verify it's from your MANAGER account, not a client account
- If token status is "Pending", wait for Google approval

### Error: "Invalid Account ID"  
- Must be in format: XXX-XXX-XXXX (with dashes)
- Must be MANAGER account ID, not a client account
- Find it at top right of Google Ads interface

### Error: "Failed to connect to Google Ads"
- This means Step 1 refresh token might be invalid
- In this case, you DO need to re-authenticate
- Follow the "Revoke and Re-Authenticate" steps above

---

## Summary

**Current State:**
- ✅ OAuth completed (refresh token exists)
- ❌ Developer Token needed
- ❌ Account ID needed

**Action Required:**
1. Get Developer Token from Google Ads API Center
2. Get Account ID from top right of Google Ads Manager
3. Enter both in SerpBear Settings → Step 2
4. Click "Test Google Ads Integration"
5. Done! ✅

**Total time needed:** 5 minutes

---

## Still Having Issues?

Run this diagnostic command to check status:

```bash
ssh tpp-vps "docker exec serpbear-production node /app/debug-oauth-flow.js"
```

This will show:
- Which credentials are saved
- Which are missing
- What the redirect URI should be
- Next steps

---

Let me know once you've entered the Developer Token and Account ID, and we'll test it!
