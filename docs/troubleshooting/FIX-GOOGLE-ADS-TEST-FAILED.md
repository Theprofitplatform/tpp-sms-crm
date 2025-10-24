# Fix: "Failed to connect to Google Ads"

## The Error

Step 2 shows:
> "Failed to connect to Google Ads. Please make sure you have provided the correct API info."

This means the OAuth worked (Step 1 ✅), but the Developer Token or Manager Account ID is wrong or not properly formatted.

---

## Most Common Issues

### Issue 1: Using Regular Account ID Instead of Manager Account ID

**❌ WRONG:** Using your regular Google Ads account ID (like from a campaign account)

**✅ CORRECT:** Using your Manager Account ID (the MCC account where you got the Developer Token)

### How to Get the CORRECT Account ID:

1. Go to **https://ads.google.com/**
2. **Make sure you're viewing your MANAGER ACCOUNT** (check top left)
   - Look for "Manager Account" label or icon
   - Click account switcher if needed
3. Look at **top right corner**
4. Copy the **10-digit number**: `XXX-XXX-XXXX`

⚠️ **Critical:** This MUST be the Manager Account ID, not a sub-account ID!

---

### Issue 2: Developer Token Has Spaces or Typos

**Common mistakes:**
- Extra spaces before or after the token
- Copying only part of the token
- Token has line breaks

**How to fix:**
1. Go to Google Ads Manager Account
2. Tools & Settings → API Center
3. Click the **eye icon** to show the token
4. Click **copy icon** (don't manually select)
5. Paste into a text editor first to verify
6. Remove any spaces or line breaks
7. Then paste into SerpBear

**Token format example:**
```
4xr6jY94kAxtXk4rfcgc4w
```
(Should be one continuous string)

---

### Issue 3: Account ID Format Wrong

**The format MUST be:**
```
XXX-XXX-XXXX
```

**Examples of CORRECT format:**
- `123-456-7890`
- `590-948-9101`
- `987-654-3210`

**Examples of WRONG format:**
```
❌ 1234567890 (no hyphens)
❌ 123-456-78-90 (wrong hyphen placement)
❌ 123456-7890 (wrong hyphen placement)
❌ XXX-XXX-XXXX (the placeholder text itself)
```

**How to fix:**
- Make sure you have exactly 10 digits
- With 2 hyphens in format: XXX-XXX-XXXX
- Copy directly from Google Ads dashboard (top right)

---

### Issue 4: Developer Token Not Approved/Active

**Check the token status:**
1. Google Ads Manager Account
2. Tools & Settings → API Center
3. Look at **Status** field

**Should show:**
- ✅ "Test Account" (this is fine! Works for SerpBear)
- ✅ "Approved" (even better)

**If it shows:**
- ❌ "Pending" - Wait for approval or use test token
- ❌ "Rejected" - Re-apply with better description
- ❌ "Revoked" - Re-apply for new token

---

### Issue 5: Wrong OAuth Scope

The OAuth scope needs to include Google Ads API access.

**Check the authentication URL includes:**
```
https://www.googleapis.com/auth/adwords
```

This should be automatic in SerpBear, but if you modified anything, verify this scope is included.

---

## Step-by-Step Verification

### Step 1: Verify Manager Account

1. Go to https://ads.google.com/
2. **Click account selector** at top left
3. Look for an account with:
   - "Manager Account" label
   - Or an account that says "MCC" or has manager icon
4. Select it
5. **Verify you're in Manager Account:**
   - URL should show: `https://ads.google.com/aw/overview?ocid=XXXXXXXXXX`
   - Top left should show manager account name

### Step 2: Get Manager Account ID

1. While in Manager Account view
2. Look at **top right corner**
3. You'll see: `XXX-XXX-XXXX`
4. Copy this EXACT number

### Step 3: Get Developer Token

1. Still in Manager Account
2. Tools & Settings (wrench icon)
3. Under SETUP → API Center
4. Developer Token section:
   - Status: "Test Account" or "Approved"
   - Token: Click eye icon to reveal
   - Click copy icon
5. Paste into text editor to verify (no spaces)

### Step 4: Re-enter in SerpBear

1. SerpBear Settings → Google Ads
2. **Clear both fields first**
3. Paste **Developer Token** (verify no spaces)
4. Paste **Manager Account ID** (format: XXX-XXX-XXXX)
5. Click **"Test Google Ads Integration"**

---

## Advanced Debugging

### Check SerpBear Logs

If still failing, check the server logs for detailed error:

```bash
# If using Docker
docker logs serpbear

# Or docker-compose
cd /path/to/serpbear
docker-compose -f docker-compose.prod.yml logs serpbear
```

**Look for error messages like:**
- `INVALID_CUSTOMER_ID` - Account ID is wrong format
- `INVALID_DEVELOPER_TOKEN` - Token is wrong
- `AUTHENTICATION_ERROR` - OAuth refresh token issue
- `PERMISSION_DENIED` - Token doesn't have access to that account

### Common Error Codes:

| Error Code | Meaning | Fix |
|------------|---------|-----|
| `INVALID_CUSTOMER_ID` | Account ID wrong format | Use XXX-XXX-XXXX format |
| `DEVELOPER_TOKEN_NOT_APPROVED` | Token pending approval | Use test token or wait |
| `AUTHENTICATION_ERROR` | OAuth issue | Re-do Step 1 authentication |
| `PERMISSION_DENIED` | Token can't access account | Use Manager Account ID |
| `INVALID_DEVELOPER_TOKEN` | Token is wrong | Re-copy from API Center |

---

## Test Connection Manually

You can test if your credentials work outside SerpBear:

### Using Google's API Explorer

1. Go to: https://developers.google.com/google-ads/api/rest/reference
2. Try a simple API call with your credentials
3. This verifies the token and account ID work

---

## Checklist - Verify Each Item

- [ ] You're viewing MANAGER ACCOUNT in Google Ads (not regular account)
- [ ] Manager Account shows at top left
- [ ] Copied Account ID from top right while in Manager Account view
- [ ] Account ID format is XXX-XXX-XXXX (10 digits with 2 hyphens)
- [ ] Went to Tools & Settings → API Center in Manager Account
- [ ] Developer Token status shows "Test Account" or "Approved"
- [ ] Copied token using the copy icon (not manual selection)
- [ ] Token is one continuous string with no spaces or line breaks
- [ ] Pasted both into text editor first to verify
- [ ] Cleared fields in SerpBear before re-pasting
- [ ] Used same Google account for OAuth as Manager Account

---

## Visual Guide

```
Google Ads Dashboard
└── Top Left: Click Account Selector
    └── Select "Manager Account" (has manager icon/label)
        ├── Top Right Corner: XXX-XXX-XXXX ← This is Account ID
        └── Tools & Settings (wrench icon)
            └── SETUP → API Center
                ├── Status: "Test Account" ✓
                └── Developer Token: abc123xyz ← Copy this
```

---

## Still Not Working?

### Provide These Details:

1. **What shows in API Center?**
   - Developer Token status?
   - "Test Account" or "Pending" or "Approved"?

2. **What's your Account ID format?**
   - Count the digits (should be 10)
   - Verify hyphen placement

3. **Are you in Manager Account?**
   - Screenshot of top left corner (account selector)
   - Screenshot of top right corner (account ID)

4. **Any error in browser console?**
   - Press F12 → Console tab
   - Look for detailed errors

5. **SerpBear logs show what?**
   - Check Docker logs for specific error codes

---

## Most Likely Solutions

### Solution A: Wrong Account ID

**You used a regular account ID instead of Manager Account ID**

Fix:
1. Switch to Manager Account view in Google Ads
2. Copy the account ID from there
3. Re-enter in SerpBear

### Solution B: Spaces in Token

**Token has spaces or is incomplete**

Fix:
1. Go to API Center
2. Use the copy icon (don't select manually)
3. Paste in text editor to verify
4. Re-enter in SerpBear

### Solution C: Test Account Not Active

**Token status is pending or not ready**

Fix:
1. Check API Center status
2. If "Pending", wait for approval
3. Or verify you can see the actual token string
4. If you see the token, status doesn't matter

---

## What Success Looks Like

When it works:
1. Click "Test Google Ads Integration"
2. Button shows loading state briefly
3. You see: **"Google Ads Integration Successful!"** or similar success message
4. Can now proceed to Step 3
5. Can use Research features
6. Can update keyword volumes

---

## Next Steps After Success

Once the test passes:
1. ✅ Step 1 complete (OAuth authenticated)
2. ✅ Step 2 complete (Google Ads connected)
3. Go to Step 3: Update keyword volume data
4. Try the Research feature
5. Add keywords and see volume data

---

**Try these fixes and let me know which one worked!**
