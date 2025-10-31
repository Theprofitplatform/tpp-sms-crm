# Cloudflare Functions Deployment Guide

## 🎯 Goal
Deploy the dashboard APIs with real Google Search Console data.

---

## ✅ Current Status
- ✅ Functions created (`functions/api/*.js`)
- ✅ Real GSC integration implemented (`_gsc-helper.js`)
- ✅ Local testing complete
- ⏳ Need to add environment variable in Cloudflare

---

## 🚀 Step-by-Step Deployment

### 1. Get Your Service Account JSON

The same JSON you added to GitHub secrets. You can get it from:

```bash
cat config/google/service-account.json
```

Or copy from `GITHUB-SECRETS-SETUP.md` section 1.

---

### 2. Log into Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com
2. Navigate to: **Workers & Pages**
3. Find your Pages project (e.g., `seo-reports`)

---

### 3. Add Environment Variable

**Path:** Pages project → **Settings** → **Environment variables**

Click **"Add variable"**:

**Variable name:**
```
GSC_SERVICE_ACCOUNT
```

**Value:** (Paste the ENTIRE service account JSON)

```json
{
  "type": "service_account",
  "project_id": "robotic-goal-456009-r2",
  "private_key_id": "6dd460ff8327709eac4810b55e6a2d4f5a6ec17b",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com",
  ...
}
```

**Environment:** Select **"Production"** (or both Production and Preview)

Click **"Save"**

---

### 4. Trigger Redeploy

After adding the environment variable, you need to redeploy:

**Option A: From Cloudflare Dashboard**
1. Go to: **Deployments** tab
2. Find the latest deployment
3. Click the **"..."** menu → **"Retry deployment"**

**Option B: From Local Terminal**
```bash
# Install Wrangler CLI (if not already)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy public --project-name=seo-reports
```

---

### 5. Test the APIs

Once redeployed, test each API endpoint:

#### Test GSC Metrics API
```bash
curl -X POST https://seo-reports-4d9.pages.dev/api/gsc-metrics \
  -H "Content-Type: application/json" \
  -d '{"siteUrl":"https://instantautotraders.com.au","days":30}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "clicks": 24,
    "impressions": 3792,
    "ctr": 0.00633,
    "position": 25.2
  },
  "period": "Last 30 days"
}
```

**NOT Expected:** Mock data with 1,234 clicks (that means env var not set)

---

#### Test GSC Rankings API
```bash
curl -X POST https://seo-reports-4d9.pages.dev/api/gsc-rankings \
  -H "Content-Type: application/json" \
  -d '{"siteUrl":"https://instantautotraders.com.au","limit":10}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "keywords": [
      {
        "query": "instant auto traders",
        "clicks": 8,
        "impressions": 245,
        "ctr": 0.0326,
        "position": 3.2
      },
      ...
    ],
    "total": 415
  }
}
```

---

#### Test Quick Wins API
```bash
curl -X POST https://seo-reports-4d9.pages.dev/api/gsc-quick-wins \
  -H "Content-Type: application/json" \
  -d '{"siteUrl":"https://instantautotraders.com.au"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "quickWins": [
      {
        "query": "sell my car sydney",
        "position": 12.5,
        "impressions": 450,
        "clicks": 5,
        "ctr": 0.011,
        "potentialClicks": 67
      },
      ...
    ],
    "totalOpportunities": 44,
    "estimatedTrafficGain": 33
  }
}
```

---

#### Test Dashboard API
```bash
curl https://seo-reports-4d9.pages.dev/api/dashboard
```

**Expected Response:**
```json
{
  "success": true,
  "clients": [
    {
      "id": "instantautotraders",
      "name": "Instant Auto Traders",
      "domain": "instantautotraders.com.au",
      ...
    },
    {
      "id": "theprofitplatform",
      "name": "The Profit Platform",
      ...
    },
    ...
  ]
}
```

---

## 🔍 Troubleshooting

### Issue: Still Getting Mock Data

**Symptoms:**
- APIs return 1,234 clicks
- "Using mock data" in response

**Solution:**
1. Verify `GSC_SERVICE_ACCOUNT` is set in Cloudflare environment variables
2. Make sure you selected "Production" environment
3. Redeploy after adding the variable
4. Wait 1-2 minutes for deployment to complete

---

### Issue: "Invalid credentials" Error

**Symptoms:**
```json
{
  "success": false,
  "error": "Invalid service account credentials"
}
```

**Solution:**
1. Check the JSON is valid (no missing quotes, commas)
2. Verify the entire private key is included (-----BEGIN PRIVATE KEY----- to -----END PRIVATE KEY-----)
3. Make sure the service account has GSC access

---

### Issue: "Site not found" or "Permission denied"

**Symptoms:**
```json
{
  "success": false,
  "error": "Permission denied for site"
}
```

**Solution:**
1. Verify the service account email (`seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com`) is added as owner in Google Search Console for each property
2. Check the siteUrl format matches GSC (e.g., `https://instantautotraders.com.au/` with trailing slash)

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Environment variable `GSC_SERVICE_ACCOUNT` is set
- [ ] Deployment completed successfully
- [ ] `/api/gsc-metrics` returns real data (not 1,234 clicks)
- [ ] `/api/gsc-rankings` returns actual keywords
- [ ] `/api/gsc-quick-wins` returns position 11-20 keywords
- [ ] `/api/dashboard` returns all 4 clients
- [ ] No "mock data" messages in responses

---

## 📊 What Happens Next

Once deployed with real GSC credentials:

1. **Public Dashboard** at `https://seo-reports-4d9.pages.dev/` will show:
   - Real-time metrics from Google Search Console
   - Live keyword rankings
   - Quick win opportunities
   - Multiple client overview

2. **APIs** can be used by:
   - Your custom dashboards
   - Third-party integrations
   - Mobile apps
   - Client portals

3. **Data Refresh:**
   - GSC data has 2-3 day delay (Google limitation)
   - APIs fetch fresh data on each request
   - No caching (real-time queries)

---

## 🔐 Security Notes

**Environment Variables in Cloudflare:**
- ✅ Encrypted at rest
- ✅ Not visible in logs
- ✅ Only accessible to your Functions
- ✅ Never exposed to browser/client

**Service Account Permissions:**
- ✅ Read-only access to GSC
- ✅ No write permissions
- ✅ Scoped to specific properties
- ✅ Can be revoked anytime

---

## 🎯 Alternative Deployment (Wrangler CLI)

If you prefer command-line deployment:

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Set secret (interactive)
wrangler pages secret put GSC_SERVICE_ACCOUNT --project-name=seo-reports

# Paste the service account JSON when prompted

# Deploy
wrangler pages deploy public --project-name=seo-reports
```

---

## 📈 Next Level: Custom Domain

After basic deployment works, you can add a custom domain:

1. Cloudflare Dashboard → Pages → Custom domains
2. Add: `dashboard.yourdomain.com`
3. Cloudflare handles SSL automatically
4. Access APIs at: `https://dashboard.yourdomain.com/api/*`

---

*Last Updated: 2025-10-24*
*Deployment Status: Ready for production*
