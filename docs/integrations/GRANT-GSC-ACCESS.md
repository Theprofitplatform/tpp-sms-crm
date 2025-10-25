# Grant Google Search Console Access
**Add service account to your client properties**

---

## YOUR SERVICE ACCOUNT EMAIL:
```
seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com
```

---

## ADD TO EACH CLIENT (2 minutes per client):

### For Hot Tyres:
1. Go to: https://search.google.com/search-console
2. Select property: **hottyres.com.au** (or sc-domain:hottyres.com.au)
3. Click **Settings** (left sidebar)
4. Click **Users and permissions**
5. Click **Add user**
6. Paste: `seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com`
7. Permission: **Owner**
8. Click **Add**

### For The Profit Platform:
Repeat above for: **theprofitplatform.com** (or your domain)

### For Instant Auto Traders:
Repeat above for: **instantautotraders.com.au** (or your domain)

---

## VERIFY ACCESS:

After adding to all properties, test:

```bash
node test-gsc-setup.js
```

---

## TROUBLESHOOTING:

**"User does not have sufficient permissions"**
→ Make sure you added the service account email as "Owner" (not Viewer)

**"Property not found"**
→ Check the exact URL format in Search Console (might be sc-domain:example.com instead of https://example.com)

**"API has not been used"**
→ The API is already enabled in your project (robotic-goal-456009-r2), so this should work
