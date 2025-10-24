# Debug Google Ads Connection Error

## The Error
```
⚠️ Failed to connect to Google Ads. Please make sure you have provided the correct API info.
```

This generic error doesn't tell us what's really wrong. Let's get detailed error messages.

---

## Solution: Run Debug Script

I've created a debug script that will:
1. ✅ Check if all credentials are saved
2. ✅ Verify credential formats
3. ✅ Test OAuth access token generation
4. ✅ Test actual Google Ads API call
5. ✅ Show specific error messages from Google

---

## How to Run the Debug Script

### Option 1: Inside Docker Container (Recommended)

```bash
# Copy the debug script into the container
docker cp test-google-ads-connection.js serpbear:/app/

# Run the script inside the container
docker exec serpbear node test-google-ads-connection.js
```

### Option 2: On Your Host (if SerpBear files are accessible)

```bash
# Navigate to serpbear directory
cd /mnt/c/Users/abhis/projects/seo\ expert/serpbear

# Copy the debug script
cp ../test-google-ads-connection.js .

# Make sure you have the SECRET env variable
export SECRET="1904bf60f77b7bde3c4f9b27ae911cb1e59b650c9a869f777c1995c9f1471745"

# Run the script
node test-google-ads-connection.js
```

### Option 3: Via Docker Compose

```bash
cd /mnt/c/Users/abhis/projects/seo\ expert/serpbear

# Copy script to serpbear directory first
cp ../test-google-ads-connection.js .

# Run via docker-compose
docker-compose -f docker-compose.prod.yml exec serpbear node test-google-ads-connection.js
```

---

## What the Script Will Check

### 1. Credentials Present
```
✅ Client ID: Present
✅ Client Secret: Present
✅ Developer Token: Present
✅ Account ID: Present
✅ Refresh Token: Present
```

If any are missing, you need to complete that step in SerpBear settings.

### 2. Credential Formats
```
Client ID: 1234567890-abc123... (72 chars)
Developer Token: 4xr6jY94kA... (22 chars)
Account ID: 123-456-7890 (format: XXX-XXX-XXXX ✅)
```

Verifies formats are correct.

### 3. OAuth Access Token
```
✅ Access token received (ya29.a0AfB_byC...)
```

If this fails, the OAuth refresh token is invalid - need to re-authenticate Step 1.

### 4. Google Ads API Call
```
✅ API call successful!
✅ Received 1 keyword idea(s)
```

If this fails, you'll see the EXACT error from Google:
- `INVALID_CUSTOMER_ID`
- `DEVELOPER_TOKEN_NOT_APPROVED`
- `AUTHENTICATION_ERROR`
- `PERMISSION_DENIED`
- etc.

---

## Common Errors and Solutions

### Error: `INVALID_CUSTOMER_ID`
**Problem:** Account ID is wrong or wrong format

**Solution:**
1. Go to Google Ads Manager Account
2. Make sure you're viewing the Manager Account (check top left)
3. Copy the ID from top right: `XXX-XXX-XXXX`
4. Enter in SerpBear with hyphens

### Error: `DEVELOPER_TOKEN_NOT_APPROVED`
**Problem:** Developer token isn't active

**Solution:**
1. Go to Google Ads Manager → Tools → API Center
2. Check token status
3. Should say "Test Account" or "Approved"
4. If "Pending" or "Rejected", re-apply

### Error: `AUTHENTICATION_ERROR` or `OAUTH_TOKEN_INVALID`
**Problem:** OAuth refresh token is invalid

**Solution:**
1. Revoke access at https://myaccount.google.com/permissions
2. Re-authenticate Step 1 in SerpBear
3. Make sure popup shows success message

### Error: `PERMISSION_DENIED`
**Problem:** Using wrong account ID (regular account instead of Manager)

**Solution:**
1. Switch to Manager Account view in Google Ads
2. Copy ID from there (top right)
3. Make sure it's the same account where you got the Developer Token

### Error: `invalid_grant` (during access token step)
**Problem:** Refresh token expired or revoked

**Solution:**
1. Go to SerpBear Settings
2. Re-do Step 1 (Authenticate Integration)
3. Complete OAuth flow again

---

## Example Output (Success)

```
=== Google Ads Connection Debug Tool ===

Step 1: Loading settings from data/settings.json...
✅ Settings file loaded

Step 2: Decrypting credentials...
Credentials Check:
  ✅ Client ID: Present
  ✅ Client Secret: Present
  ✅ Developer Token: Present
  ✅ Account ID: Present
  ✅ Refresh Token: Present

Credential Formats:
  Client ID: 1234567890-abc... (72 chars)
  Client Secret: GOCSPX-abc... (35 chars)
  Developer Token: 4xr6jY94kA... (22 chars)
  Account ID: 123-456-7890 (format: XXX-XXX-XXXX ✅)
  Refresh Token: 1//0gR7Z4u... (180 chars)

Step 3: Getting access token from Google...
✅ Access token received (ya29.a0AfB_byC...)

Step 4: Testing Google Ads API call...
  Customer ID (formatted): 1234567890
  Making API request...

✅ API call successful!
✅ Received 1 keyword idea(s)

🎉 ALL TESTS PASSED! Google Ads integration is working correctly.

=== Debug Complete ===
```

---

## Example Output (Error)

```
Step 4: Testing Google Ads API call...
  Customer ID (formatted): 1234567890
  Making API request...

❌ API Error (Status 400):
{
  "error": {
    "code": 400,
    "message": "Request contains an invalid customer ID.",
    "status": "INVALID_ARGUMENT"
  }
}

🔍 Detailed Error:
Error 1:
  Message: Request contains an invalid customer ID.
  Reason: INVALID_CUSTOMER_ID

📋 Common Error Solutions:
  INVALID_CUSTOMER_ID: Use Manager Account ID (from top right in Google Ads)
  DEVELOPER_TOKEN_NOT_APPROVED: Check token status in API Center (Test Account is OK)
  AUTHENTICATION_ERROR: Re-authenticate in SerpBear Step 1
  PERMISSION_DENIED: Make sure using Manager Account ID, not regular account
```

---

## After Running the Script

**If all tests pass but SerpBear still shows error:**
1. Restart SerpBear container:
   ```bash
   docker restart serpbear
   ```
2. Clear browser cache
3. Try again in SerpBear

**If script shows an error:**
1. Follow the solution for that specific error
2. Fix the issue in SerpBear settings
3. Run the script again to verify

**If you still need help:**
- Share the complete output of the debug script
- I can tell you exactly what's wrong and how to fix it

---

## Quick Start

**Run this now:**

```bash
# If SerpBear is running in Docker
docker cp /mnt/c/Users/abhis/projects/seo\ expert/serpbear/test-google-ads-connection.js serpbear:/app/
docker exec serpbear node test-google-ads-connection.js
```

This will show you exactly what's failing!
