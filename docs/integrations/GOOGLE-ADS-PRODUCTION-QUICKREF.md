# Google Ads Production Setup - Quick Reference

## Your Production URLs

**SerpBear Production URL:**
```
https://serpbear.theprofitplatform.com.au
```

**OAuth Redirect URI (use this in Google Cloud Console):**
```
https://serpbear.theprofitplatform.com.au/api/adwords
```

---

## Quick Setup Steps

### 1. Google Cloud Console
🔗 https://console.cloud.google.com/

**Create OAuth 2.0 Client:**
- Go to: APIs & Services → Credentials
- Create OAuth client ID (Web application)
- **Authorized redirect URI:** `https://serpbear.theprofitplatform.com.au/api/adwords`
- Copy: Client ID & Client Secret

**Enable API:**
- APIs & Services → Library
- Search: "Google Ads API"
- Click Enable

---

### 2. Google Ads
🔗 https://ads.google.com/

**Get Developer Token:**
- Tools & Settings → Setup → API Center
- Apply for API Access
- Copy: Developer Token

**Get Account ID:**
- Top right corner (10-digit number: XXX-XXX-XXXX)
- Copy this number

---

### 3. SerpBear Production
🔗 https://serpbear.theprofitplatform.com.au

**Settings → Google Ads Section:**

**Step 1:** Connect Google Cloud Project
- Paste Client ID
- Paste Client Secret  
- Click "Authenticate Integration"
- Complete OAuth in popup

**Step 2:** Connect Google Ads
- Paste Developer Token
- Paste Test Account ID
- Click "Test Google Ads Integration"

**Step 3:** Update Keywords (optional)
- Click "Update Keywords Volume Data"

---

## ⚠️ Important Notes

✅ **Must use HTTPS** in redirect URI (not HTTP)  
✅ **No trailing slash** in redirect URI  
✅ **Test account is fine** - no spending required  
✅ **Use same Google account** for all services  

---

## Troubleshooting

**"redirect_uri_mismatch" error?**
→ Check Google Cloud Console has exact URI: `https://serpbear.theprofitplatform.com.au/api/adwords`

**Popup blocked?**
→ Temporarily allow popups for your domain

**Test integration fails?**
→ Verify all 4 credentials are entered correctly with no extra spaces

---

## Credentials Checklist

- [ ] Client ID (from Google Cloud)
- [ ] Client Secret (from Google Cloud)  
- [ ] Developer Token (from Google Ads)
- [ ] Account ID (from Google Ads, format: XXX-XXX-XXXX)

---

Ready to start? Follow the full guide in **GOOGLE-ADS-SETUP-INSTRUCTIONS.md** for detailed steps!
