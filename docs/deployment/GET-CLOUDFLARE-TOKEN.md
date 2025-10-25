# 🔐 Get Cloudflare API Token for Automated Deployment

**Issue:** Server has no browser for `wrangler login`
**Solution:** Use Cloudflare API Token instead

---

## 📋 Quick Steps (2 Minutes)

### Step 1: Create API Token
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Edit Cloudflare Workers**
4. OR create custom token with these permissions:
   - Account → Cloudflare Pages → Edit
   - Zone → Zone → Read
   - Zone → DNS → Edit (if using custom domain)

### Step 2: Copy the Token
After creating, Cloudflare shows your token ONCE.
Copy it immediately!

### Step 3: Set Environment Variable
On your VPS, run:

```bash
# Add to .bashrc for persistence
echo 'export CLOUDFLARE_API_TOKEN="your-token-here"' >> ~/.bashrc
source ~/.bashrc

# Or set temporarily for this session
export CLOUDFLARE_API_TOKEN="your-token-here"
```

### Step 4: Deploy!
```bash
cd /home/avi/projects/seo-expert
./deploy-to-cloudflare.sh --production
```

---

## 🔄 Alternative: Quick Manual Method

If you prefer, you can also:

1. **On your local computer:**
   ```bash
   wrangler login
   wrangler pages deploy web-dist --project-name=seo-reports --branch=main
   ```

2. **Or use Cloudflare Dashboard:**
   - Go to: https://dash.cloudflare.com
   - Pages → **Create a project**
   - Upload the `web-dist` folder
   - Connect domain: `seo.theprofitplatform.com.au`

---

## ✅ Recommended: API Token Method

This allows PM2 to deploy automatically without manual intervention!

**After setting the token:**
```bash
# Test deployment
./deploy-to-cloudflare.sh --production

# PM2 will use the same token for nightly automation
pm2 restart seo-audit-all
```

---

*Choose your preferred method and we can continue!*
